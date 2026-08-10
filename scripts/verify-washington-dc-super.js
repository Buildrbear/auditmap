#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const expectedFeatures = {
  "launch-dc-washington-national-mall": 8,
  "launch-dc-washington-rock-creek-park": 8,
  "launch-dc-washington-anacostia-park": 8,
  "launch-dc-washington-kenilworth-park-aquatic-gardens": 8,
  "launch-dc-washington-theodore-roosevelt-island": 8,
  "launch-dc-washington-meridian-hill-park-malcolm-x-park": 8,
  "launch-dc-washington-georgetown-waterfront-park": 8,
  "launch-dc-washington-u-s-national-arboretum": 8,
  "launch-dc-washington-east-potomac-park-hains-point": 4,
  "launch-va-arlington-gravelly-point": 1,
  "launch-va-mclean-great-falls-park": 4,
  "launch-md-glen-echo-glen-echo-park": 4,
  "launch-md-potomac-great-falls-tavern-olmsted-island": 4,
  "launch-va-alexandria-huntley-meadows-park": 2,
};
const ids = Object.keys(expectedFeatures);
const places = JSON.parse(
  fs.readFileSync(path.join(root, "data/generated/launch-map-places.json"), "utf8"),
);
const failures = [];
const slugify = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

for (const id of ids) {
  const park = places.find((candidate) => candidate.id === id);
  if (!park) {
    failures.push(`${id}: missing from launch map`);
    continue;
  }

  const images = [park.image, ...(park.images || [])].filter((image) => image?.url);
  if (images.length < 4)
    failures.push(`${park.name}: expected at least 4 images, found ${images.length}`);
  if ((park.features || []).length !== expectedFeatures[id])
    failures.push(`${park.name}: expected ${expectedFeatures[id]} evidence-complete subsites, found ${(park.features || []).length}`);
  if ((park.searchAnswers || []).length < 11)
    failures.push(`${park.name}: expected at least 11 visitor answers, found ${(park.searchAnswers || []).length}`);

  const parentDir = path.join(root, "us", park.state.toLowerCase(), slugify(park.city), "parks", park.slug);
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
  "Hains Point is low and flood-prone",
  "the sound is extremely loud and sudden",
  "Swimming, wading, and rock hopping are prohibited",
  "Use 5801 Oxford Road",
  "Section A of Billy Goat Trail frequently closes",
  "Pets are prohibited on the Restoration and Heron Trails",
]) {
  if (!joined.includes(phrase)) failures.push(`Missing Potomac-area guidance: ${phrase}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(
  `Verified ${ids.length} Potomac-area guides with four photos, evidence-complete mapped subsites, raw visitor answers, sources, and canonical pages.`,
);
