const fs = require("node:fs");

const origin = process.env.AUDITMAP_ORIGIN || "https://www.auditmap.org";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function citySlug(place) {
  return place.citySlug || slugify(`${place.city}-${place.state}`);
}

function placeKey(place) {
  return `${citySlug(place)}:${place.id}`;
}

function mergePlaceRecords(currentPlaces, incomingPlaces) {
  const records = new Map();
  for (const place of [...currentPlaces, ...incomingPlaces]) {
    const key = placeKey(place);
    const current = records.get(key);
    if (!current) {
      records.set(key, place);
      continue;
    }
    records.set(key, {
      ...current,
      ...place,
      image: place.image || current.image,
      images: place.images?.length ? place.images : current.images,
      searchAnswers: place.searchAnswers?.length ? place.searchAnswers : current.searchAnswers,
      source: current.source || place.source,
      sourceLabel: current.sourceLabel || place.sourceLabel,
    });
  }
  return [...records.values()];
}

function isPublishablePlace(place) {
  if (["excluded", "deferred", "research"].includes(place.publishStatus)) return false;
  const identity = `${place.name || ""} ${place.type || ""} ${place.searchCategory || ""}`;
  const ordinaryMunicipalBuilding = /\b(city|town|municipal|county)\s+(hall|office|offices|building|administration|administrative center)|\bgovernment\s+(center|office|offices|building)\b/i.test(identity);
  const administrativeType = /\b(city office|municipal office|government office|civic resource)\b/i.test(identity);
  const publicDestination = /\b(park|plaza|garden|museum|gallery|historic|landmark|memorial|trail|greenway|library|playground|recreation)\b/i.test(identity);
  return (!ordinaryMunicipalBuilding && !administrativeType) || publicDestination || place.publicDestination === true;
}

function hasUsefulInformation(place) {
  const sourcedAnswers = (place.searchAnswers || []).filter((item) => item?.answer && item?.source);
  const hasSubstantiveSummary = String(place.summary || "").trim().length >= 80;
  const hasUsableHours = place.hours && !/not yet documented|unknown|unavailable/i.test(place.hours);
  const hasAmenities = Array.isArray(place.amenities) && place.amenities.length > 0;
  return sourcedAnswers.length > 0 || (hasSubstantiveSummary && (hasUsableHours || hasAmenities));
}

async function fetchJson(path, required = true) {
  try {
    const response = await fetch(`${origin}${path}`, { redirect: "follow" });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return JSON.parse(await response.text());
  } catch (error) {
    if (required) throw error;
    return { places: [], warning: error.message };
  }
}

async function main() {
  const [curated, launch, sharedPayload] = await Promise.all([
    fetchJson("/data/institutions.json"),
    fetchJson("/data/generated/launch-map-places.json"),
    fetchJson("/api/places?limit=250", false),
  ]);
  const shared = sharedPayload.places || [];
  const visible = mergePlaceRecords(mergePlaceRecords(curated, launch), shared)
    .filter((place) => place.state === "NC" && isPublishablePlace(place));
  const missingImages = visible.filter((place) => !place.image?.url);
  const missingInformation = visible.filter((place) => !hasUsefulInformation(place));
  const whiteDots = visible.filter((place) => !place.image?.url || !hasUsefulInformation(place));
  const report = {
    generatedAt: new Date().toISOString(),
    origin,
    visibleNcMapRecords: visible.length,
    withImages: visible.length - missingImages.length,
    withUsefulInformation: visible.length - missingInformation.length,
    missingImages: missingImages.length,
    missingUsefulInformation: missingInformation.length,
    whiteDots: whiteDots.length,
    records: whiteDots.map((place) => ({
      id: place.id,
      name: place.name,
      city: place.city,
      missingImage: !place.image?.url,
      missingUsefulInformation: !hasUsefulInformation(place),
      publishStatus: place.publishStatus || "published",
      source: place.source || "",
    })),
    sharedApiWarning: sharedPayload.warning || null,
  };
  fs.writeFileSync("data/nc-visible-white-dot-audit.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (whiteDots.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
