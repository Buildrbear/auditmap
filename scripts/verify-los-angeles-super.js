#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const places = JSON.parse(fs.readFileSync(path.join(root, "data/generated/launch-map-places.json"), "utf8"));
const ids = [
  "launch-ca-los-angeles-griffith-park",
  "launch-ca-los-angeles-elysian-park",
  "launch-ca-los-angeles-exposition-park",
  "launch-ca-los-angeles-gloria-molina-grand-park",
  "launch-ca-los-angeles-echo-park-lake",
  "launch-ca-los-angeles-venice-beach-ocean-front-walk",
  "launch-ca-los-angeles-runyon-canyon-park",
  "launch-ca-los-angeles-los-angeles-state-historic-park",
  "launch-ca-los-angeles-kenneth-hahn-state-recreation-area",
];
const guidanceChecks = {
  "launch-ca-los-angeles-griffith-park": "Pick a named destination",
  "launch-ca-los-angeles-elysian-park": "Dodger games",
  "launch-ca-los-angeles-exposition-park": "Metro E Line",
  "launch-ca-los-angeles-gloria-molina-grand-park": "splash pad",
  "launch-ca-los-angeles-echo-park-lake": "Park Avenue",
  "launch-ca-los-angeles-venice-beach-ocean-front-walk": "Ocean Front Walk",
  "launch-ca-los-angeles-runyon-canyon-park": "West Trail closure",
  "launch-ca-los-angeles-los-angeles-state-historic-park": "$2 per hour",
  "launch-ca-los-angeles-kenneth-hahn-state-recreation-area": "closed Monday and Tuesday",
};
const failures = [];

function checkHtml(file, label, required) {
  if (!fs.existsSync(file)) {
    failures.push(`${label}: static page missing`);
    return;
  }
  const html = fs.readFileSync(file, "utf8");
  for (const phrase of required) if (!html.includes(phrase)) failures.push(`${label}: raw HTML missing ${phrase}`);
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

for (const id of ids) {
  const place = places.find((entry) => entry.id === id);
  if (!place) {
    failures.push(`${id}: record missing`);
    continue;
  }
  const photos = [place.image, ...(place.images || [])].filter((image) => image?.url);
  if (photos.length < 4) failures.push(`${place.name}: only ${photos.length} parent photos`);
  if ((place.features || []).length !== 8) failures.push(`${place.name}: expected 8 subsites, found ${(place.features || []).length}`);
  if ((place.searchAnswers || []).length < 11) failures.push(`${place.name}: fewer than 11 visitor answers`);
  if (!place.source || !place.sourceLabel) failures.push(`${place.name}: parent source missing`);

  const parentFile = path.join(root, "us/ca/los-angeles/parks", place.slug, "index.html");
  checkHtml(parentFile, place.name, ["rel=\"canonical\"", "Where should I park", "Are there restrooms", "Sources", guidanceChecks[id]]);

  for (const feature of place.features || []) {
    const label = `${place.name}/${feature.name}`;
    if (!Number.isFinite(feature.latitude) || !Number.isFinite(feature.longitude)) failures.push(`${label}: coordinates missing`);
    if (!feature.details?.images?.[0]?.url) failures.push(`${label}: image missing`);
    if ((feature.details?.searchAnswers || []).length < 8) failures.push(`${label}: fewer than 8 visitor answers`);
    if (!feature.source_url || !feature.source_label) failures.push(`${label}: source missing`);
    const featureFile = path.join(root, "us/ca/los-angeles/parks", place.slug, feature.slug, "index.html");
    checkHtml(featureFile, label, ["rel=\"canonical\"", `Back to ${escapeHtml(place.name)}`, "Where should I park", "Are there restrooms", "Sources"]);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log(`Verified ${ids.length} Los Angeles guides, 72 subsites, visitor answers, sources, coordinates, and raw static pages.`);
