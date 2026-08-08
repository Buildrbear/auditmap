#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const campaign = require("../data/san-francisco-super-enrichment-campaign.json");
const places = require("../data/generated/launch-map-places.json");
const root = path.resolve(__dirname, "..");
const failures = [];

const evidence = {
  "launch-ca-san-francisco-golden-gate-park": "park three miles long",
  "launch-ca-san-francisco-the-presidio": "winter 2027",
  "launch-ca-san-francisco-mission-dolores-park": "seasonal hours",
  "launch-ca-san-francisco-lands-end": "Stay on marked trails",
  "launch-ca-san-francisco-crissy-field": "Bay water is cold",
  "launch-ca-san-francisco-yerba-buena-gardens": "restroom hours differ",
  "launch-ca-san-francisco-salesforce-park": "nearly four blocks",
  "launch-ca-san-francisco-alamo-square": "respect residential stoops",
  "launch-ca-san-francisco-ocean-beach": "no glass or alcohol",
  "launch-ca-san-francisco-sunset-dunes": "not yet guaranteed open",
};

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function checkHtml(file, label, phrases) {
  if (!fs.existsSync(file)) {
    failures.push(`${label}: static page missing`);
    return;
  }
  const html = fs.readFileSync(file, "utf8");
  for (const phrase of phrases) if (!html.includes(phrase)) failures.push(`${label}: raw HTML missing ${phrase}`);
}

for (const expected of campaign.places) {
  const place = places.find((entry) => entry.id === expected.id);
  if (!place) {
    failures.push(`${expected.name}: record missing`);
    continue;
  }
  const images = [place.image, ...(place.images || [])].filter((image) => image?.url);
  if (images.length < 4) failures.push(`${place.name}: fewer than 4 parent images`);
  if ((place.features || []).length !== 8) failures.push(`${place.name}: expected 8 subsites, found ${(place.features || []).length}`);
  if ((place.searchAnswers || []).length < 11) failures.push(`${place.name}: fewer than 11 parent answers`);
  if (!place.source || !place.sourceLabel) failures.push(`${place.name}: parent source missing`);

  const parentFile = path.join(root, "us/ca/san-francisco/parks", place.slug, "index.html");
  checkHtml(parentFile, place.name, ["rel=\"canonical\"", "Where should I park", "Are there restrooms", "Sources", evidence[place.id]]);

  for (const feature of place.features || []) {
    const label = `${place.name}/${feature.name}`;
    if (!Number.isFinite(feature.latitude) || !Number.isFinite(feature.longitude)) failures.push(`${label}: coordinates missing`);
    if (!feature.details?.coordinateSource || !feature.details?.positionQuality) failures.push(`${label}: coordinate provenance missing`);
    if (!feature.details?.images?.[0]?.url) failures.push(`${label}: image missing`);
    if ((feature.details?.searchAnswers || []).length < 9) failures.push(`${label}: fewer than 9 visitor answers`);
    if (!feature.source_url || !feature.source_label) failures.push(`${label}: source missing`);
    const featureFile = path.join(root, "us/ca/san-francisco/parks", place.slug, feature.slug, "index.html");
    checkHtml(featureFile, label, ["rel=\"canonical\"", `Back to ${escapeHtml(place.name)}`, "Where should I park", "Are there restrooms", "Sources"]);
  }
}

const sunset = places.find((place) => place.id === "launch-ca-san-francisco-sunset-dunes");
const ocean = places.find((place) => place.id === "launch-ca-san-francisco-ocean-beach");
for (const phrase of ["November through February", "stairwells 15 to 20", "no glass or alcohol"]) {
  if (!JSON.stringify(ocean).toLowerCase().includes(phrase.toLowerCase())) failures.push(`Ocean Beach: ${phrase} missing`);
}
if (!JSON.stringify(sunset).includes("not yet guaranteed open")) failures.push("Sunset Dunes: Shipwreck Cove status missing");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log("Verified 10 San Francisco guides, 80 subsites, reviewed coordinates, visitor answers, sources, and raw static pages.");
