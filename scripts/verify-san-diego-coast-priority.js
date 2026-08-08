#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const targets = [
  {
    id: "launch-ca-san-diego-mission-bay-park",
    route: "us/ca/san-diego/parks/mission-bay-park",
    featureCount: 5,
    requiredFeature: "mission-beach",
  },
  {
    id: "launch-ca-oceanside-oceanside-city-beach-and-pier",
    route: "us/ca/oceanside/parks/oceanside-city-beach-and-pier",
    featureCount: 7,
    requiredFeature: "oceanside-pier",
  },
  {
    id: "launch-ca-carlsbad-carlsbad-state-beach",
    route: "us/ca/carlsbad/parks/carlsbad-state-beach",
    featureCount: 6,
    requiredFeature: "tamarack-surf-beach",
  },
];

const launch = readJson("data/generated/launch-map-places.json");
const all = readJson("data/generated/all-subsites-ready.json");
const pilot = readJson("data/generated/pilot-subsites-ready.json");
const campaign = readJson("data/parent-park-information-enrichment-campaign.json");
const queue = readJson("data/us-priority-enrichment-queue.json");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

let featureTotal = 0;
const imagePaths = new Set();

for (const target of targets) {
  const matches = launch.filter((place) => place.id === target.id);
  assert(matches.length === 1, `${target.id}: expected one launch-map record, found ${matches.length}`);
  const place = matches[0];
  assert(place.features?.length >= target.featureCount, `${place.name}: expected at least ${target.featureCount} destinations`);
  assert(place.searchAnswers?.length >= 10, `${place.name}: expected at least 10 parent visitor answers`);
  assert(place.source?.startsWith("https://"), `${place.name}: missing official parent source`);

  const parentHtmlPath = path.join(root, target.route, "index.html");
  assert(fs.existsSync(parentHtmlPath), `${place.name}: missing parent HTML`);
  const parentHtml = fs.readFileSync(parentHtmlPath, "utf8");
  assert(parentHtml.includes("What people ask"), `${place.name}: answers are not visible in raw HTML`);
  assert(parentHtml.includes('rel="canonical"'), `${place.name}: missing canonical metadata`);
  assert(parentHtml.includes('application/ld+json'), `${place.name}: missing structured data`);

  for (const feature of place.features) {
    featureTotal += 1;
    const details = feature.details || {};
    assert(Number.isFinite(feature.latitude) && Number.isFinite(feature.longitude), `${feature.name}: missing map coordinates`);
    assert(details.imageUrl, `${feature.name}: missing image`);
    assert(details.imageSourceUrl?.startsWith("https://"), `${feature.name}: missing image source`);
    assert(details.searchAnswers?.length >= 6, `${feature.name}: expected six destination answers`);
    for (const intent of ["location", "parking", "restroom", "accessibility", "safety", "need-to-know"]) {
      assert(details.searchAnswers.some((answer) => answer.intentKey === intent), `${feature.name}: missing ${intent} answer`);
    }

    const imagePath = path.join(root, details.imageUrl.replace(/^\//, ""));
    assert(fs.existsSync(imagePath), `${feature.name}: image file is missing`);
    assert(fs.statSync(imagePath).size > 4_000, `${feature.name}: image file is unexpectedly small`);
    assert(!imagePaths.has(details.imageUrl), `${feature.name}: duplicate destination image path`);
    imagePaths.add(details.imageUrl);

    const featureRoute = `${target.route}/${feature.slug}`;
    const featureHtmlPath = path.join(root, featureRoute, "index.html");
    assert(fs.existsSync(featureHtmlPath), `${feature.name}: missing destination HTML`);
    const featureHtml = fs.readFileSync(featureHtmlPath, "utf8");
    assert(featureHtml.includes(feature.name.replaceAll("&", "&amp;")), `${feature.name}: name missing from raw HTML`);
    assert(featureHtml.includes("Where should I park"), `${feature.name}: parking answer missing from raw HTML`);
    assert(featureHtml.includes("Are there restrooms"), `${feature.name}: restroom answer missing from raw HTML`);
    assert(featureHtml.includes("Ask a follow-up"), `${feature.name}: contribution controls missing`);
    assert(featureHtml.includes("Photo source"), `${feature.name}: photo attribution missing`);
    assert(sitemap.includes(`https://www.auditmap.org/${featureRoute}`), `${feature.name}: missing from sitemap`);
  }

  for (const document of [all, pilot]) {
    assert(document.parks.filter((candidate) => candidate.id === target.id).length === 1, `${place.name}: duplicate prepared record`);
  }
  const gallery = [campaign.parks[target.id]?.image, ...(campaign.parks[target.id]?.additionalImages || [])].filter(Boolean);
  assert(new Set(gallery.map((image) => image.url)).size === gallery.length, `${place.name}: duplicate gallery images`);
  assert(sitemap.includes(`https://www.auditmap.org/${target.route}`), `${place.name}: parent missing from sitemap`);
}

assert(featureTotal >= 18, `Expected at least 18 mapped destinations, found ${featureTotal}`);
assert(queue.active?.length >= 3, "Priority queue must list active coastal guides");
assert(!JSON.stringify(all).includes("oceanside-city-beach-pier"), "Retired Oceanside slug remains in prepared data");

console.log(`San Diego coast priority release verified: ${targets.length} guides, ${featureTotal} destinations, ${imagePaths.size} sourced photos.`);
