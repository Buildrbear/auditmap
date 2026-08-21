#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const campaign = require("../data/houston-super-enrichment-campaign.json");
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
    const file = path.join(root, "us/tx/houston/parks", place.slug, feature.slug, "index.html");
    if (!fs.existsSync(file)) failures.push(`${place.name}/${feature.name}: page missing`);
    else {
      const html = fs.readFileSync(file, "utf8");
      for (const text of [feature.name, place.name, "Where should I park", "Are there restrooms", "Are dogs allowed", "Sources", "rel=\"canonical\""]) if (!html.includes(text)) failures.push(`${place.name}/${feature.name}: raw HTML missing ${text}`);
    }
  }
  const file = path.join(root, "us/tx/houston/parks", place.slug, "index.html");
  if (!fs.existsSync(file)) failures.push(`${place.name}: page missing`);
  else {
    const html = fs.readFileSync(file, "utf8");
    for (const text of [place.name, place.address, "rel=\"canonical\"", "What people ask"]) if (text && !html.includes(text)) failures.push(`${place.name}: raw HTML missing ${text}`);
  }
}

const recordText = (id) => JSON.stringify(places.find((place) => place.id === id) || {}).toLowerCase();
for (const phrase of ["first tuesday", "flat shoes", "swim diaper"]) if (!recordText("launch-tx-houston-levy-park").includes(phrase)) failures.push(`Levy Park: ${phrase} missing`);
for (const phrase of ["high water", "not a swimming", "8:00 a.m.-11:00 p.m."]) if (!recordText("launch-tx-houston-buffalo-bayou-park").includes(phrase)) failures.push(`Buffalo Bayou: ${phrase} missing`);
for (const phrase of ["three sprayground", "55-space", "cultural center"]) if (!recordText("launch-tx-houston-emancipation-park").includes(phrase)) failures.push(`Emancipation Park: ${phrase} missing`);
for (const phrase of ["400-foot", "more than 300", "dawn until dusk"]) if (!recordText("launch-tx-houston-smither-park").includes(phrase)) failures.push(`Smither Park: ${phrase} missing`);

if (failures.length) { console.error(failures.map((failure) => `- ${failure}`).join("\n")); process.exit(1); }
console.log(`Verified ${campaign.places.length} Houston guides with 64 sourced destinations, mapped subsites, and practical visitor answers.`);
