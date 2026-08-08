const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(path.join(root, file), "utf8")); }
  catch { return fallback; }
};
const slugify = (value) => String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const csvRows = fs.readFileSync(path.join(root, "data/nationwide-major-parks-launch.csv"), "utf8").trim().split(/\r?\n/);
const headers = csvRows.shift().split(",");
const launchRows = csvRows.map((line) => Object.fromEntries(line.split(",").map((value, index) => [headers[index], value])));
const institutions = readJson("data/institutions.json", []);
const enrichments = readJson("data/generated/launch-park-enrichment.json", { parks: [] }).parks;
const campaign = readJson("data/parent-park-information-enrichment-campaign.json", { parks: {} }).parks;
const subsites = readJson("data/generated/all-subsites-ready.json", { parks: [] }).parks;
const enrichmentById = new Map(enrichments.map((place) => [place.id, place]));
const subsitesById = new Map(subsites.map((place) => [place.id, place]));
const existingKeys = new Set(institutions.map((place) => [place.state, place.city, place.name].map(slugify).join("|")));

function isPublishablePlace(place) {
  if (["excluded", "deferred", "research"].includes(place.publishStatus)) return false;
  const identity = `${place.name || ""} ${place.type || ""} ${place.searchCategory || ""}`;
  const ordinaryMunicipalBuilding = /\b(city|town|municipal|county)\s+(hall|office|offices|building|administration|administrative center)|\bgovernment\s+(center|office|offices|building)\b/i.test(identity);
  const administrativeType = /\b(city office|municipal office|government office|civic resource)\b/i.test(identity);
  const publicDestination = /\b(park|plaza|garden|museum|gallery|historic|landmark|memorial|trail|greenway|library|playground|recreation)\b/i.test(identity);
  return (!ordinaryMunicipalBuilding && !administrativeType) || publicDestination || place.publicDestination === true;
}

const records = institutions
  .filter((place) => place.state === "NC" && place.searchCategory === "park" && isPublishablePlace(place))
  .map((place) => ({ ...place, origin: "established" }));

for (const row of launchRows.filter((item) => item.state === "NC")) {
  if (existingKeys.has([row.state, row.city, row.park].map(slugify).join("|"))) continue;
  const id = `launch-${slugify(row.state)}-${slugify(row.city)}-${slugify(row.park)}`;
  const base = enrichmentById.get(id) || {};
  const parent = campaign[id] || {};
  records.push({
    id,
    name: row.park,
    city: row.city,
    state: row.state,
    searchCategory: "park",
    image: base.images?.[0],
    images: [...(base.images?.slice(1) || []), ...(parent.additionalImages || [])],
    hours: parent.hours || base.facts?.hours,
    searchAnswers: parent.searchAnswers || [],
    source: parent.source || base.facts?.officialWebsite,
    publishStatus: parent.searchAnswers?.length ? "enriched" : "basic",
    origin: "launch"
  });
}

const audit = records.map((place) => {
  const featureImages = (subsitesById.get(place.id)?.features || []).map((feature) => feature.details?.imageUrl).filter(Boolean);
  const imageUrls = [place.image?.url, ...(place.images || []).map((image) => image?.url), ...featureImages].filter(Boolean);
  const uniqueImages = [...new Set(imageUrls)];
  const answers = place.searchAnswers || [];
  const sourcedAnswers = answers.filter((answer) => answer.answer && answer.source).length;
  const hasHours = Boolean(
    place.hours &&
    String(place.hours).trim().length >= 20 &&
    !/not yet documented|hours unknown|hours unavailable/i.test(place.hours)
  );
  const score = Number(uniqueImages.length > 0) * 25 + Math.min(uniqueImages.length, 3) / 3 * 25 + Number(hasHours) * 20 + Math.min(sourcedAnswers, 10) / 10 * 30;
  const needs = [
    ...(!uniqueImages.length ? ["hero-image"] : []),
    ...(uniqueImages.length < 3 ? [`${3 - uniqueImages.length}-more-images`] : []),
    ...(!hasHours ? ["hours"] : []),
    ...(sourcedAnswers < 10 ? [`${10 - sourcedAnswers}-more-sourced-answers`] : [])
  ];
  return {
    id: place.id,
    name: place.name,
    city: place.city,
    origin: place.origin,
    publishStatus: place.publishStatus || "established",
    imageCount: uniqueImages.length,
    hasHero: uniqueImages.length > 0,
    hasHours,
    sourcedAnswerCount: sourcedAnswers,
    score: Math.round(score),
    needs
  };
}).sort((left, right) => left.score - right.score || left.city.localeCompare(right.city) || left.name.localeCompare(right.name));

const summary = {
  generatedAt: new Date().toISOString(),
  scope: "Visible published and launch-catalog North Carolina park destinations through Wave 2; research, deferred, excluded, library, and municipal-building records excluded",
  total: audit.length,
  complete: audit.filter((place) => place.needs.length === 0).length,
  missingHero: audit.filter((place) => !place.hasHero).length,
  fewerThanThreeImages: audit.filter((place) => place.imageCount < 3).length,
  missingHours: audit.filter((place) => !place.hasHours).length,
  fewerThanTenAnswers: audit.filter((place) => place.sourcedAnswerCount < 10).length
};
const output = { summary, places: audit };
fs.writeFileSync(path.join(root, "data/nc-enrichment-backlog.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
