#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const all = JSON.parse(fs.readFileSync(path.join(root, "data", "generated", "all-subsites-ready.json"), "utf8"));
const campaign = JSON.parse(fs.readFileSync(path.join(root, "data", "parent-park-information-enrichment-campaign.json"), "utf8"));
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pagePath(park, feature) {
  const base = path.join(root, "us", "ca", park.city.toLowerCase().replace(/[^a-z0-9]+/g, "-"), "parks", park.slug);
  return path.join(base, ...(feature ? [feature.slug] : []), "index.html");
}

const expanded = all.parks.filter((park) => park.state === "CA" && park.image?.url?.includes("san-diego-coast-expansion"));
assert(expanded.length === 21, `Expected 21 expansion guides; found ${expanded.length}`);
for (const park of expanded) {
  const intents = new Set((park.searchAnswers || []).map((item) => item.intentKey));
  assert(park.searchAnswers.length >= 18, `${park.name}: expected at least 18 visitor answers`);
  for (const intent of ["shade", "picnic", "trail-surface", "food", "weather", "events", "field-check"]) {
    assert(intents.has(intent), `${park.name}: missing ${intent}`);
  }
  const htmlPath = pagePath(park);
  assert(fs.existsSync(htmlPath), `${park.name}: page missing`);
  const html = fs.readFileSync(htmlPath, "utf8");
  assert(html.includes("How much shade"), `${park.name}: deeper questions not present in raw HTML`);
  assert(html.includes("What local detail would help"), `${park.name}: tester prompt not present in raw HTML`);
  assert(sitemap.includes(`/us/ca/${park.city.toLowerCase()}/parks/${park.slug}</loc>`), `${park.name}: sitemap entry missing`);
}

const expectedFeatures = {
  "launch-ca-carlsbad-alga-norte-community-park": ["alga-norte-aquatic-center", "alga-norte-dog-park", "alga-norte-skate-park"],
  "launch-ca-carlsbad-batiquitos-lagoon": ["batiquitos-lagoon-nature-center", "batiquitos-north-shore-trail"],
  "launch-ca-carlsbad-lake-calavera-preserve": ["lake-calavera-loop-trail", "mount-calavera-volcanic-trail"],
  "launch-ca-carlsbad-south-carlsbad-state-beach": ["north-ponto-pelican-point", "south-ponto-beach", "south-ponto-compass-stairs"],
  "launch-ca-carlsbad-leo-carrillo-ranch-historic-park": ["leo-carrillo-visitor-center", "leo-carrillo-adobes-and-gardens"],
  "launch-ca-oceanside-el-corazon-park-and-trails": ["garrison-creek-nature-trail", "william-wagner-aquatic-center"],
  "launch-ca-oceanside-guajome-regional-park": ["guajome-ponds-and-wildlife", "guajome-day-use-and-playgrounds"],
};

let featureCount = 0;
const featureImages = new Set();
for (const [parentId, slugs] of Object.entries(expectedFeatures)) {
  const parent = all.parks.find((park) => park.id === parentId);
  assert(parent, `Missing parent ${parentId}`);
  const campaignPark = campaign.parks[parentId];
  assert(campaignPark, `${parent.name}: campaign record missing`);
  for (const slug of slugs) {
    const feature = (parent.features || []).find((candidate) => candidate.slug === slug);
    assert(feature, `${parent.name}: missing ${slug}`);
    featureCount += 1;
    assert(feature.details?.searchAnswers?.length >= 8, `${feature.name}: expected at least 8 answers`);
    assert(feature.details?.images?.length === 1, `${feature.name}: must have one focused gallery image`);
    const image = feature.details.images[0];
    assert(image.source && image.author && image.license, `${feature.name}: image attribution incomplete`);
    assert(!featureImages.has(image.url), `${feature.name}: duplicate subsite hero ${image.url}`);
    featureImages.add(image.url);
    assert(fs.existsSync(path.join(root, image.url.replace(/^\//, ""))), `${feature.name}: local image missing`);
    const htmlPath = pagePath(parent, feature);
    assert(fs.existsSync(htmlPath), `${feature.name}: generated page missing`);
    const html = fs.readFileSync(htmlPath, "utf8");
    assert(html.includes(feature.name), `${feature.name}: name missing from raw HTML`);
    assert(html.includes("Where should I park"), `${feature.name}: parking answer missing from raw HTML`);
    assert(html.includes(image.url), `${feature.name}: focused image missing from raw HTML`);
    assert(sitemap.includes(`/us/ca/${parent.city.toLowerCase()}/parks/${parent.slug}/${feature.slug}</loc>`), `${feature.name}: sitemap entry missing`);
  }
  const parentImages = new Set((campaignPark.additionalImages || []).map((image) => image.url));
  for (const feature of parent.features.filter((candidate) => slugs.includes(candidate.slug))) {
    assert(parentImages.has(feature.details.imageUrl), `${parent.name}: ${feature.name} missing from parent gallery`);
  }
}

const carlsbadNoDogs = ["aviara-community-park", "calavera-hills-community-park", "pine-avenue-community-park", "stagecoach-community-park", "magee-park"];
for (const slug of carlsbadNoDogs) {
  const park = all.parks.find((candidate) => candidate.city === "Carlsbad" && candidate.slug === slug);
  const dogAnswer = park?.searchAnswers?.find((item) => item.intentKey === "dogs")?.answer || "";
  assert(dogAnswer.includes("not allowed"), `${slug}: Carlsbad dog policy correction missing`);
}

const requiredFacts = [
  ["launch-ca-carlsbad-alga-norte-community-park", "$5", "$3"],
  ["launch-ca-carlsbad-batiquitos-lagoon", "2.7 miles", "9 a.m.-3 p.m."],
  ["launch-ca-carlsbad-south-carlsbad-state-beach", "$10", "Camp Store"],
  ["launch-ca-oceanside-guajome-regional-park", "$5", "4.5 miles"],
  ["launch-ca-oceanside-el-corazon-park-and-trails", "free", "aquatic"],
];
for (const [id, ...phrases] of requiredFacts) {
  const park = all.parks.find((candidate) => candidate.id === id);
  const text = JSON.stringify(park.searchAnswers);
  for (const phrase of phrases) assert(text.includes(phrase), `${park.name}: missing key fact ${phrase}`);
}

assert(featureCount === 16, `Expected 16 new internal destinations; found ${featureCount}`);
console.log(`San Diego coast super enrichment verified: ${expanded.length} deep guides and ${featureCount} focused internal destinations with unique sourced photos.`);
