#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const ids = [
  "launch-dc-washington-national-mall",
  "launch-dc-washington-rock-creek-park",
  "launch-dc-washington-anacostia-park",
  "launch-dc-washington-kenilworth-park-aquatic-gardens",
  "launch-dc-washington-theodore-roosevelt-island",
  "launch-dc-washington-meridian-hill-park-malcolm-x-park",
  "launch-dc-washington-georgetown-waterfront-park",
  "launch-dc-washington-u-s-national-arboretum",
];
const places = JSON.parse(
  fs.readFileSync(path.join(root, "data/generated/launch-map-places.json"), "utf8"),
);
const failures = [];

for (const id of ids) {
  const park = places.find((candidate) => candidate.id === id);
  if (!park) {
    failures.push(`${id}: missing from launch map`);
    continue;
  }

  const images = [park.image, ...(park.images || [])].filter((image) => image?.url);
  if (images.length < 4)
    failures.push(`${park.name}: expected at least 4 images, found ${images.length}`);
  if ((park.features || []).length !== 8)
    failures.push(`${park.name}: expected 8 subsites, found ${(park.features || []).length}`);
  if ((park.searchAnswers || []).length < 11)
    failures.push(`${park.name}: expected at least 11 visitor answers, found ${(park.searchAnswers || []).length}`);

  const parentDir = path.join(root, "us/dc/washington/parks", park.slug);
  const htmlPath = path.join(parentDir, "index.html");
  if (!fs.existsSync(htmlPath)) {
    failures.push(`${park.name}: static page missing`);
    continue;
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  for (const required of [
    park.name,
    'rel="canonical"',
    "Where should I park",
    "Are there restrooms",
    "Sources",
  ]) {
    if (!html.includes(required))
      failures.push(`${park.name}: raw HTML missing ${required}`);
  }

  for (const feature of park.features || []) {
    if (!Number.isFinite(feature.latitude) || !Number.isFinite(feature.longitude))
      failures.push(`${park.name}/${feature.name}: coordinates missing`);
    if (!feature.details?.images?.[0]?.url)
      failures.push(`${park.name}/${feature.name}: image missing`);
    if ((feature.details?.searchAnswers || []).length < 8)
      failures.push(`${park.name}/${feature.name}: expected at least 8 visitor answers`);

    const featurePath = path.join(parentDir, feature.slug, "index.html");
    if (!fs.existsSync(featurePath)) {
      failures.push(`${park.name}/${feature.name}: static page missing`);
      continue;
    }
    const featureHtml = fs.readFileSync(featurePath, "utf8");
    for (const required of [feature.name, 'rel="canonical"', "Where should I park", "Sources"]) {
      if (!featureHtml.includes(required))
        failures.push(`${park.name}/${feature.name}: raw HTML missing ${required}`);
    }
  }
}

const joined = ids
  .map((id) => JSON.stringify(places.find((park) => park.id === id) || {}))
  .join("\n");
for (const phrase of [
  "The Mall is more than two miles long",
  "Swimming and wading in Rock Creek are prohibited",
  "Roller-skate loans are offered free during posted summer sessions",
  "Water lilies usually begin blooming in June",
  "The parking lot is accessible only from northbound George Washington Memorial Parkway",
  "A major rehabilitation has reopened key lower-park features",
  "Bring water shoes, dry clothes, sun protection",
  "The grounds are too large to cover casually on foot",
]) {
  if (!joined.includes(phrase)) failures.push(`Missing Washington guidance: ${phrase}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(
  `Verified ${ids.length} Washington guides with four photos, eight mapped subsites, raw visitor answers, sources, and canonical pages.`,
);
