#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/upper-midwest-lake-super-enrichment-campaign.json");
const selections = require("../data/upper-midwest-lake-feature-selections.json");
const places = require("../data/generated/launch-map-places.json");
const ready = require("../data/generated/all-subsites-ready.json").parks;
const failures = [];
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const need = (condition, message) => { if (!condition) failures.push(message); };
let featureCount = 0;

for (const scope of campaign.places) {
  const place = places.find((item) => item.id === scope.id);
  const sourcePlace = ready.find((item) => item.id === scope.id);
  const directory = path.join(root, "us", scope.state.toLowerCase(), slug(scope.city), "parks", slug(scope.name));
  need(place, `${scope.name}: launch record missing`);
  need(sourcePlace, `${scope.name}: source enrichment record missing`);
  if (!place || !sourcePlace) continue;
  const images = [place.image, ...(place.images || [])].filter(Boolean);
  need(images.length === 4, `${scope.name}: expected four photos`);
  need(new Set(images.map((image) => image.url)).size === 4, `${scope.name}: duplicate gallery photos`);
  for (const image of images) {
    need(image.url && fs.existsSync(path.join(root, image.url.replace(/^\//, ""))), `${scope.name}: image file missing ${image.url}`);
    need(image.source && image.author && image.license && image.alt, `${scope.name}: image attribution incomplete`);
  }
  const approved = selections.places[scope.id] || [];
  need((place.features || []).length === approved.length, `${scope.name}: publishable subsite count differs from reviewed selections`);
  need((sourcePlace.searchAnswers || []).length >= 14, `${scope.name}: official parent answer set was lost`);
  need(place.address?.includes(`, ${scope.state} `), `${scope.name}: full street address missing`);
  need((place.researchQueue || []).includes(selections.researchQueue[scope.id]), `${scope.name}: unresolved photo queue missing`);
  const parentFile = path.join(directory, "index.html");
  need(fs.existsSync(parentFile), `${scope.name}: parent page missing`);
  if (fs.existsSync(parentFile)) {
    const html = fs.readFileSync(parentFile, "utf8");
    for (const value of [place.name, place.address, 'rel="canonical"', "What people ask", "Sources"]) need(html.includes(value), `${scope.name}: raw HTML missing ${value}`);
  }
  for (const feature of place.features || []) {
    const sourceFeature = (sourcePlace.features || []).find((item) => item.id === feature.id);
    featureCount += 1;
    need(Number.isFinite(feature.latitude) && Number.isFinite(feature.longitude), `${scope.name}/${feature.name}: coordinate missing`);
    need(feature.details?.coordinateSource && feature.details?.positionQuality?.startsWith("reviewed-"), `${scope.name}/${feature.name}: coordinate provenance missing`);
    need(sourceFeature, `${scope.name}/${feature.name}: source feature missing`);
    const featureImages = sourceFeature?.details?.images || [];
    need(featureImages.length === 1, `${scope.name}/${feature.name}: expected one destination-specific photo`);
    need(featureImages[0]?.source && featureImages[0]?.author && featureImages[0]?.license, `${scope.name}/${feature.name}: feature image attribution missing`);
    need((sourceFeature?.details?.searchAnswers || []).length >= 9, `${scope.name}/${feature.name}: visitor answers missing`);
    const featureFile = path.join(directory, feature.slug, "index.html");
    need(fs.existsSync(featureFile), `${scope.name}/${feature.name}: page missing`);
    if (fs.existsSync(featureFile)) {
      const html = fs.readFileSync(featureFile, "utf8").toLowerCase();
      for (const value of [feature.name, place.name, "parking", "restroom", "dogs", "sources", 'rel="canonical"']) need(html.includes(value.toLowerCase()), `${scope.name}/${feature.name}: raw HTML missing ${value}`);
      need(html.includes(encodeURIComponent(`${feature.latitude},${feature.longitude}`).toLowerCase()), `${scope.name}/${feature.name}: exact-coordinate navigation missing`);
    }
  }
}

need(featureCount === 7, `Expected 7 evidence-complete subsites, found ${featureCount}`);
const joined = campaign.places.map((scope) => JSON.stringify(ready.find((place) => place.id === scope.id) || {})).join("\n");
for (const phrase of [
  "84 steps and a ladder",
  "seasonal boat-rental operation",
  "free outdoor gardens and the ticketed Bolz Conservatory",
  "The beach has no lifeguard",
  "protected burial site",
  "Beach and splashpad admission is charged"
]) need(joined.includes(phrase), `Missing practical guidance: ${phrase}`);

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
for (const scope of campaign.places) {
  const route = `/us/${scope.state.toLowerCase()}/${slug(scope.city)}/parks/${slug(scope.name)}`;
  need(sitemap.includes(route), `${scope.name}: sitemap route missing`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Verified 6 Upper Midwest lake guides, 24 licensed photos, 7 evidence-complete subsite pages, raw HTML, exact navigation, and sitemap routes.");
