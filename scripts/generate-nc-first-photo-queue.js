const fs = require("node:fs");
const path = require("node:path");
const { hasDocumentedReuseRights } = require("./lib/image-rights");

const root = path.resolve(__dirname, "..");
const institutionsPath = path.join(root, "data", "institutions.json");
const outputPath = path.join(root, "data", "generated", "nc-first-photo-queue.json");
const candidatesPath = path.join(root, "data", "photo-research", "nc-geotagged-commons-candidates.json");
const reviewOutcomesPath = path.join(root, "data", "nc-first-photo-review-outcomes.json");
const packetSize = 12;

const places = JSON.parse(fs.readFileSync(institutionsPath, "utf8"));
const candidateDocument = fs.existsSync(candidatesPath)
  ? JSON.parse(fs.readFileSync(candidatesPath, "utf8"))
  : { generatedAt: null, places: [] };
const candidatesById = new Map(candidateDocument.places.map((place) => [place.id, place]));
const reviewOutcomesDocument = fs.existsSync(reviewOutcomesPath)
  ? JSON.parse(fs.readFileSync(reviewOutcomesPath, "utf8"))
  : { checkedAt: null, places: [] };
const reviewOutcomesById = new Map(reviewOutcomesDocument.places.map((place) => [place.placeId, place]));

function hasReusableImage(place) {
  return [place.image, ...(place.images || [])].filter(Boolean).some(hasDocumentedReuseRights);
}

function sortPlaces(left, right) {
  return left.city.localeCompare(right.city)
    || left.name.localeCompare(right.name)
    || left.id.localeCompare(right.id);
}

const queue = places
  .filter((place) => place.state === "NC")
  .filter((place) => place.publishStatus === "enriched-basic")
  .filter((place) => !hasReusableImage(place))
  .sort(sortPlaces)
  .map((place) => {
    const currentReferences = [place.image, ...(place.images || [])].filter((image) => image?.url);
    const gapType = currentReferences.length ? "unverified-reuse-rights" : "no-image-reference";
    const research = candidatesById.get(place.id)
      || candidateDocument.places.find((candidate) => candidate.name === place.name && candidate.city === place.city);
    const candidateCount = research?.candidates?.length || 0;
    const reviewOutcome = reviewOutcomesById.get(place.id);
    const candidateStatus = reviewOutcome?.status || (gapType === "unverified-reuse-rights"
      ? "rights-review"
      : candidateCount
        ? "candidate-review"
        : research?.status === "none"
          ? "field-photo-needed"
          : research?.status === "error"
            ? "research-error"
            : "unresearched");
    return {
      id: place.id,
      name: place.name,
      slug: place.slug,
      type: place.type,
      city: place.city,
      state: place.state,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      officialSource: place.source,
      sourceLabel: place.sourceLabel,
      lastPlaceCheck: place.verifiedAt,
      status: "needs-licensed-media",
      gapType,
      candidateStatus,
      candidateCount,
      candidateResearchFile: "data/photo-research/nc-geotagged-commons-candidates.json",
      reviewOutcome: reviewOutcome
        ? {
          checkedAt: reviewOutcomesDocument.checkedAt,
          status: reviewOutcome.status,
          note: reviewOutcome.reviewNote,
          source: "data/nc-first-photo-review-outcomes.json",
        }
        : null,
      currentReferences,
      researchQuestion: `Which real, destination-specific photos of ${place.name} have documented reuse rights?`,
    };
  });

const byCity = new Map();
for (const place of queue) {
  const key = `${place.state}:${place.city}`;
  if (!byCity.has(key)) byCity.set(key, []);
  byCity.get(key).push(place);
}

const packets = [];
for (const [, cityPlaces] of [...byCity.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  for (let index = 0; index < cityPlaces.length; index += packetSize) {
    const records = cityPlaces.slice(index, index + packetSize);
    const sequence = String(Math.floor(index / packetSize) + 1).padStart(2, "0");
    const citySlug = records[0].city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    packets.push({
      id: `photo-nc-${citySlug}-${sequence}`,
      status: "open",
      city: records[0].city,
      state: records[0].state,
      recordCount: records.length,
      placeIds: records.map((place) => place.id),
    });
  }
}

const cities = [...byCity.values()]
  .map((records) => ({ city: records[0].city, state: records[0].state, missing: records.length }))
  .sort((left, right) => right.missing - left.missing || left.city.localeCompare(right.city));

const document = {
  schemaVersion: 1,
  campaignId: "nc-first-photo-coverage",
  source: "data/institutions.json",
  candidateResearchGeneratedAt: candidateDocument.generatedAt,
  purpose: "Internal queue for giving every published NC basic place one reviewed, destination-specific image.",
  acceptance: {
    destinationSpecific: true,
    realPhotoRequired: true,
    requiredFields: ["url", "source", "author", "license", "alt"],
    acceptedRights: ["Public domain", "CC0", "CC BY", "CC BY-SA", "documented permission"],
    reviewRequired: true,
    prohibitedSources: ["Google Maps", "Yelp", "proprietary listings", "unlicensed social media", "unlicensed official-site media"],
  },
  summary: {
    needsReviewedImage: queue.length,
    noImageReference: queue.filter((place) => place.gapType === "no-image-reference").length,
    unverifiedReuseRights: queue.filter((place) => place.gapType === "unverified-reuse-rights").length,
    withCandidateLeads: queue.filter((place) => place.candidateCount > 0).length,
    candidateReviewNeeded: queue.filter((place) => place.candidateStatus === "candidate-review").length,
    fieldPhotoNeeded: queue.filter((place) => place.candidateStatus === "field-photo-needed").length,
    rightsClearanceNeeded: queue.filter((place) => place.candidateStatus === "rights-clearance-needed").length,
    dataCorrectionNeeded: queue.filter((place) => place.candidateStatus === "data-correction-needed").length,
    researchErrors: queue.filter((place) => place.candidateStatus === "research-error").length,
    unresearched: queue.filter((place) => place.candidateStatus === "unresearched").length,
    cities: cities.length,
    packets: packets.length,
    packetSize,
  },
  cities,
  packets,
  places: queue,
};

fs.writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify(document.summary, null, 2));
