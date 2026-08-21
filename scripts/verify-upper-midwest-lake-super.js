#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/upper-midwest-lake-super-enrichment-campaign.json");
const selections = require("../data/upper-midwest-lake-feature-selections.json");
const photoSelections = require("../data/upper-midwest-lake-photo-selections.json");
const places = require("../data/generated/launch-map-places.json");
const ready = require("../data/generated/all-subsites-ready.json").parks;
const failures = [];
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const need = (condition, message) => { if (!condition) failures.push(message); };
let featureCount = 0;
let imageCount = 0;
let deferredImageCount = 0;
let acceptedCount = 0;
let deferredCount = 0;

for (const scope of campaign.places) {
  const place = places.find((item) => item.id === scope.id);
  const sourcePlace = ready.find((item) => item.id === scope.id);
  const directory = path.join(root, "us", scope.state.toLowerCase(), slug(scope.city), "parks", slug(scope.name));
  need(place, `${scope.name}: launch record missing`);
  need(sourcePlace, `${scope.name}: source enrichment record missing`);
  if (!place || !sourcePlace) continue;
  const approved = selections.places[scope.id] || [];
  const reviewedPhotos = photoSelections.places[scope.id]?.candidates || [];
  const parentFile = path.join(directory, "index.html");
  need(fs.existsSync(parentFile), `${scope.name}: parent page missing`);
  if (scope.photoGateStatus?.startsWith("deferred-")) {
    deferredCount += 1;
    need(scope.releaseTier === "photo-gated-deferred", `${scope.name}: release tier must remain deferred`);
    need(reviewedPhotos.length === 2, `${scope.name}: expected two reviewed park-specific photos below the four-photo release gate`);
    const deferredImages = [place.image, ...(place.images || [])].filter(Boolean);
    deferredImageCount += deferredImages.length;
    need(deferredImages.length === 2, `${scope.name}: deferred gallery did not replace the inherited imagery`);
    for (const image of deferredImages) {
      need(image.url && fs.existsSync(path.join(root, image.url.replace(/^\//, ""))), `${scope.name}: retained image file missing ${image.url}`);
      need(image.source && image.author && image.license && image.alt, `${scope.name}: retained image attribution incomplete`);
      need(!/Botanical_Gardens|8064157493|31002507471/.test(`${image.source} ${image.url}`), `${scope.name}: adjacent or insufficiently matched image remained in the gallery`);
    }
    need(approved.length === 0, `${scope.name}: deferred parent still claims approved subsites`);
    need((sourcePlace.features || []).length === 0, `${scope.name}: legacy subsites were not retired`);
    need(sourcePlace.publishStatus === "photo-gated-deferred", `${scope.name}: source record is not marked deferred`);
    need((sourcePlace.researchQueue || []).some((item) => item.includes("Botanical Gardens")), `${scope.name}: deferral reason missing`);
    const retiredFeatureFile = path.join(directory, "olbrich-botanical-gardens", "index.html");
    need(!fs.existsSync(retiredFeatureFile), `${scope.name}: adjacent Botanical Gardens route still exists as a subsite`);
    continue;
  }
  acceptedCount += 1;
  need(scope.photoGateStatus === "accepted-four-varied-reusable-views", `${scope.name}: accepted photo gate missing`);
  need(reviewedPhotos.length === 4, `${scope.name}: expected four visually reviewed photo selections`);
  need(new Set(reviewedPhotos.map((image) => image.source)).size === 4, `${scope.name}: reviewed photo sources are not unique`);
  const images = [place.image, ...(place.images || [])].filter(Boolean);
  need(images.length === 4, `${scope.name}: expected four photos`);
  imageCount += images.length;
  need(new Set(images.map((image) => image.url)).size === 4, `${scope.name}: duplicate gallery photos`);
  for (const image of images) {
    need(image.url && fs.existsSync(path.join(root, image.url.replace(/^\//, ""))), `${scope.name}: image file missing ${image.url}`);
    need(image.source && image.author && image.license && image.alt, `${scope.name}: image attribution incomplete`);
  }
  need((place.features || []).length === approved.length, `${scope.name}: publishable subsite count differs from reviewed selections`);
  need((sourcePlace.searchAnswers || []).length >= 14, `${scope.name}: official parent answer set was lost`);
  for (const item of sourcePlace.searchAnswers || []) {
    need(item.source && item.sourceLabel, `${scope.name}/${item.intentKey}: answer source missing`);
    need((item.verifiedAt || item.checkedAt) === campaign.checkedAt, `${scope.name}/${item.intentKey}: answer freshness date is stale`);
  }
  need(place.address?.includes(`, ${scope.state} `), `${scope.name}: full street address missing`);
  need((place.researchQueue || []).includes(selections.researchQueue[scope.id]), `${scope.name}: unresolved photo queue missing`);
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

need(acceptedCount === 5, `Expected 5 accepted parent guides, found ${acceptedCount}`);
need(deferredCount === 1, `Expected 1 photo-gated deferral, found ${deferredCount}`);
need(imageCount === 20, `Expected 20 accepted reusable photos, found ${imageCount}`);
need(deferredImageCount === 2, `Expected 2 retained Olbrich Park photos, found ${deferredImageCount}`);
need(featureCount === 6, `Expected 6 evidence-complete subsites, found ${featureCount}`);
const joined = campaign.places.map((scope) => JSON.stringify(ready.find((place) => place.id === scope.id) || {})).join("\n");
for (const phrase of [
  "84 steps and a ladder",
  "seasonal boat-rental operation",
  "The beach has no lifeguard",
  "protected burial site",
  "Beach and splashpad admission is charged",
  "Fridays 4:00-8:00 p.m."
]) need(joined.includes(phrase), `Missing practical guidance: ${phrase}`);

const rejectedSources = [
  "Colonial_Revival_-_Milwaukee,_WI_-_Lake_Park_Pavilion_(2).jpg",
  "Milwaukee_February_2025_26",
  "Milwaukee_February_2026_46",
  "14458194387",
  "39899795360",
];
const acceptedPhotoJson = campaign.places
  .filter((scope) => !scope.photoGateStatus?.startsWith("deferred-"))
  .map((scope) => JSON.stringify(photoSelections.places[scope.id]?.candidates || []))
  .join("\n");
for (const source of rejectedSources) need(!acceptedPhotoJson.includes(source), `Rejected or unrepresentative photo remained selected: ${source}`);

const vercel = fs.readFileSync(path.join(root, "vercel.json"), "utf8");
need(
  vercel.includes('"source": "/us/wi/madison/parks/olbrich-park/olbrich-botanical-gardens"')
    && vercel.includes('"destination": "/us/wi/madison/parks/olbrich-park"'),
  "Olbrich Botanical Gardens retirement redirect missing",
);

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
for (const scope of campaign.places) {
  const route = `/us/${scope.state.toLowerCase()}/${slug(scope.city)}/parks/${slug(scope.name)}`;
  need(sitemap.includes(route), `${scope.name}: sitemap route missing`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Verified 5 Upper Midwest lake guides, 1 photo-gated deferral, 22 licensed photos, 6 evidence-complete subsite pages, 1 retired-route redirect, raw HTML, exact navigation, and sitemap routes.");
