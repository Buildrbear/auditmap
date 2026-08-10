#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const args = Object.fromEntries(process.argv.slice(2).map((value, index, list) => value.startsWith("--") ? [value.slice(2), list[index + 1]] : null).filter(Boolean));
for (const key of ["campaign", "selections"]) if (!args[key]) throw new Error(`Missing --${key}`);
const campaign = require(path.join(root, args.campaign));
const selections = require(path.join(root, args.selections));
const places = require(path.join(root, "data/generated/launch-map-places.json"));
const ready = require(path.join(root, "data/generated/all-subsites-ready.json")).parks;
const failures = [];
// Keep verification routes identical to the canonical generator's slugify rule.
const slug = (value) => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const need = (condition, message) => { if (!condition) failures.push(message); };
const expectedFeatures = Object.values(selections.places).reduce((sum, features) => sum + features.length, 0);
const minAnswers = Number(args["min-answers"] || 12);
let featureCount = 0;
let imageCount = 0;
let parentCount = 0;

for (const scope of campaign.places) {
  if (scope.deferRelease) continue;
  const place = places.find((item) => item.id === scope.id);
  const sourcePlace = ready.find((item) => item.id === scope.id);
  const directory = path.join(root, "us", scope.state.toLowerCase(), slug(scope.city), "parks", slug(scope.name));
  need(place, `${scope.name}: launch record missing`);
  need(sourcePlace, `${scope.name}: source enrichment record missing`);
  if (!place || !sourcePlace) continue;
  parentCount += 1;
  const images = [place.image, ...(place.images || [])].filter(Boolean);
  const minimumImages = Number(scope.minimumImages || 4);
  imageCount += images.length;
  need(images.length >= minimumImages && images.length <= 4, `${scope.name}: expected ${minimumImages}-4 photos`);
  need(new Set(images.map((image) => image.url)).size === images.length, `${scope.name}: duplicate gallery photos`);
  for (const image of images) {
    need(image.url && fs.existsSync(path.join(root, image.url.replace(/^\//, ""))), `${scope.name}: image file missing ${image.url}`);
    need(image.source && image.author && image.license && image.alt, `${scope.name}: image attribution incomplete`);
  }
  const approved = selections.places[scope.id] || [];
  need((place.features || []).length === approved.length, `${scope.name}: publishable subsite count differs from reviewed selections`);
  need((sourcePlace.searchAnswers || []).length >= minAnswers, `${scope.name}: official parent answer set was lost`);
  need((place.searchAnswers || []).length >= minAnswers, `${scope.name}: public parent answer set was lost during generation`);
  need(place.address?.includes(`, ${scope.state} `), `${scope.name}: full reviewed address missing`);
  need((place.researchQueue || []).includes(selections.researchQueue[scope.id]), `${scope.name}: unresolved research queue missing`);
  const parentFile = path.join(directory, "index.html");
  need(fs.existsSync(parentFile), `${scope.name}: parent page missing`);
  if (fs.existsSync(parentFile)) {
    const html = fs.readFileSync(parentFile, "utf8");
    for (const value of [place.name, place.address, 'rel="canonical"', "What people ask", "Sources"]) need(html.includes(value), `${scope.name}: raw HTML missing ${value}`);
  }
  for (const selected of approved) {
    const feature = (place.features || []).find((item) => item.name === selected.name);
    const sourceFeature = (sourcePlace.features || []).find((item) => item.name === selected.name);
    featureCount += 1;
    need(feature, `${scope.name}/${selected.name}: generated feature missing`);
    need(sourceFeature, `${scope.name}/${selected.name}: source feature missing`);
    if (!feature || !sourceFeature) continue;
    need(Number.isFinite(feature.latitude) && Number.isFinite(feature.longitude), `${scope.name}/${feature.name}: coordinate missing`);
    need(feature.details?.coordinateSource && feature.details?.positionQuality?.startsWith("reviewed-"), `${scope.name}/${feature.name}: coordinate provenance missing`);
    if (selected.allowOutsideBoundary) need(feature.details?.boundaryExceptionReason, `${scope.name}/${feature.name}: boundary exception reason missing`);
    const featureImages = sourceFeature.details?.images || [];
    need(featureImages.length === 1, `${scope.name}/${feature.name}: expected one destination-specific photo`);
    need(featureImages[0]?.source && featureImages[0]?.author && featureImages[0]?.license, `${scope.name}/${feature.name}: feature image attribution missing`);
    need((sourceFeature.details?.searchAnswers || []).length >= 9, `${scope.name}/${feature.name}: visitor answers missing`);
    const serialized = JSON.stringify(sourceFeature);
    for (const value of [selected.summary, selected.hours, selected.needToKnow, selected.source]) need(serialized.includes(value), `${scope.name}/${feature.name}: reviewed guidance or source missing`);
    const featureFile = path.join(directory, feature.slug, "index.html");
    need(fs.existsSync(featureFile), `${scope.name}/${feature.name}: page missing`);
    if (fs.existsSync(featureFile)) {
      const html = fs.readFileSync(featureFile, "utf8").toLowerCase();
      for (const value of [feature.name, place.name, "parking", "restroom", "dogs", "sources", 'rel="canonical"']) need(html.includes(value.toLowerCase()), `${scope.name}/${feature.name}: raw HTML missing ${value}`);
      need(html.includes(encodeURIComponent(`${feature.latitude},${feature.longitude}`).toLowerCase()), `${scope.name}/${feature.name}: exact-coordinate navigation missing`);
    }
  }
}

need(featureCount === expectedFeatures, `Expected ${expectedFeatures} evidence-complete subsites, found ${featureCount}`);
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
for (const scope of campaign.places) {
  const route = `/us/${scope.state.toLowerCase()}/${slug(scope.city)}/parks/${slug(scope.name)}`;
  need(sitemap.includes(route), `${scope.name}: sitemap route missing`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Verified ${parentCount} ${campaign.campaign} guides, ${imageCount} licensed photos, ${featureCount} evidence-complete subsite pages, raw HTML, exact navigation, and sitemap routes.`);
