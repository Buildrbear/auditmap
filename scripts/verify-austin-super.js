#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const campaign = require("../data/austin-super-enrichment-campaign.json");
const places = require("../data/generated/launch-map-places.json");
const root = path.resolve(__dirname, "..");
const failures = [];

for (const expected of campaign.places) {
  const place = places.find((item) => item.id === expected.id);
  if (!place) { failures.push(`${expected.name}: missing`); continue; }
  if ([place.image, ...(place.images || [])].filter((image) => image?.url).length < 4) failures.push(`${place.name}: fewer than 4 photos`);
  if ((place.features || []).length !== 8) failures.push(`${place.name}: expected 8 subsites`);
  if ((place.searchAnswers || []).length < 11) failures.push(`${place.name}: parent answers missing`);
  for (const feature of place.features || []) {
    if (!feature.details?.imageUrl) failures.push(`${place.name}/${feature.name}: image missing`);
    if ((feature.details?.searchAnswers || []).length < 9) failures.push(`${place.name}/${feature.name}: fewer than 9 answers`);
    if (!Number.isFinite(feature.latitude) || !Number.isFinite(feature.longitude)) failures.push(`${place.name}/${feature.name}: coordinate missing`);
    if (!feature.details?.coordinateSource || !feature.details?.positionQuality) failures.push(`${place.name}/${feature.name}: coordinate provenance missing`);
    const featureFile = path.join(root, "us/tx/austin/parks", place.slug, feature.slug, "index.html");
    if (!fs.existsSync(featureFile)) failures.push(`${place.name}/${feature.name}: page missing`);
    else {
      const html = fs.readFileSync(featureFile, "utf8");
      for (const text of [feature.name, place.name, "Where should I park", "Are there restrooms", "Are dogs allowed", "Sources", "rel=\"canonical\""]) {
        if (!html.includes(text)) failures.push(`${place.name}/${feature.name}: raw HTML missing ${text}`);
      }
    }
  }
  const parentFile = path.join(root, "us/tx/austin/parks", place.slug, "index.html");
  if (!fs.existsSync(parentFile)) failures.push(`${place.name}: page missing`);
  else {
    const html = fs.readFileSync(parentFile, "utf8");
    for (const text of [place.name, place.address, "rel=\"canonical\"", "What people ask"]) if (text && !html.includes(text)) failures.push(`${place.name}: raw HTML missing ${text}`);
  }
}

const recordText = (id) => JSON.stringify(places.find((place) => place.id === id) || {}).toLowerCase();
for (const phrase of ["advance passes", "no in/out", "water utilities"]) if (!recordText("launch-tx-austin-emma-long-metropolitan-park").includes(phrase)) failures.push(`Emma Long: ${phrase} missing`);
for (const phrase of ["often reaches capacity", "onion creek can flood", "$6 daily"]) if (!recordText("launch-tx-austin-mckinney-falls-state-park").includes(phrase)) failures.push(`McKinney Falls: ${phrase} missing`);
for (const phrase of ["extremely limited", "plumbing break", "treehouse"]) if (!recordText("launch-tx-austin-pease-district-park").includes(phrase)) failures.push(`Pease Park: ${phrase} missing`);
for (const phrase of ["i-35 reconstruction", "10-mile", "midnight-5:00 a.m."]) if (!recordText("launch-tx-austin-ann-and-roy-butler-hike-and-bike-trail").includes(phrase)) failures.push(`Butler Trail: ${phrase} missing`);

if (failures.length) { console.error(failures.map((failure) => `- ${failure}`).join("\n")); process.exit(1); }
console.log(`Verified ${campaign.places.length} Austin guides with 64 sourced destinations, mapped subsites, and practical visitor answers.`);
