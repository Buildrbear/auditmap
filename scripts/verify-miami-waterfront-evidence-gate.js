#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/miami-waterfront-evidence-gate-campaign.json");
const selections = require("../data/miami-waterfront-photo-selections.json");
const places = require("../data/generated/launch-map-places.json");
const ready = require("../data/generated/all-subsites-ready.json").parks;
const vercel = require("../vercel.json");
const failures = [];
const expectedFeatures = {
  "launch-fl-miami-maurice-a-ferre-park": 3,
  "launch-fl-miami-bayfront-park": 3,
  "launch-fl-miami-matheson-hammock-park": 2,
  "launch-fl-miami-beach-south-pointe-park": 3,
  "launch-fl-miami-beach-lummus-park": 0,
  "launch-fl-key-biscayne-crandon-park": 2,
  "launch-fl-key-biscayne-bill-baggs-cape-florida-state-park": 3,
  "launch-fl-miami-historic-virginia-key-beach-park": 3
};
const need = (condition, message) => { if (!condition) failures.push(message); };
let imageCount = 0;
let featureCount = 0;

for (const scope of campaign.places) {
  const place = places.find((item) => item.id === scope.id);
  const sourcePlace = ready.find((item) => item.id === scope.id);
  need(place, `${scope.name}: launch record missing`);
  need(sourcePlace, `${scope.name}: source record missing`);
  if (!place || !sourcePlace) continue;
  const images = [place.image, ...(place.images || [])].filter(Boolean);
  const reviewed = selections.places[scope.id]?.candidates || [];
  need(images.length === 4, `${scope.name}: expected four parent images`);
  need(reviewed.length === 4, `${scope.name}: expected four reviewed selections`);
  need(new Set(images.map((item) => item.url)).size === 4, `${scope.name}: duplicate parent image`);
  need(new Set(reviewed.map((item) => item.source)).size === 4, `${scope.name}: duplicate reviewed source`);
  imageCount += images.length;
  for (const image of images) {
    need(image.url.startsWith("/assets/parks/miami-waterfront-evidence/"), `${scope.name}: inherited or unreviewed image remained ${image.url}`);
    need(fs.existsSync(path.join(root, image.url.replace(/^\//, ""))), `${scope.name}: image file missing ${image.url}`);
    need(image.source && image.author && image.license && image.alt, `${scope.name}: image attribution incomplete`);
    need(!/^Official\b|See source page|Florida Hikes/i.test(image.license || ""), `${scope.name}: unclear image license remained`);
  }
  need(place.features.length === expectedFeatures[scope.id], `${scope.name}: retained destination count mismatch`);
  need((place.searchAnswers || []).length === 11, `${scope.name}: expected eleven parent answers`);
  need((place.researchQueue || []).length === 1, `${scope.name}: retired-feature review queue missing`);
  need(place.verifiedAt === campaign.checkedAt, `${scope.name}: parent checked date stale`);
  for (const answer of place.searchAnswers || []) {
    need(answer.source && answer.sourceLabel, `${scope.name}/${answer.intentKey}: source missing`);
    need(answer.verifiedAt === campaign.checkedAt, `${scope.name}/${answer.intentKey}: checked date stale`);
  }
  const directory = path.join(root, "us", "fl", String(place.city).toLowerCase().replace(/[^a-z0-9]+/g, "-"), "parks", place.slug);
  const parentFile = path.join(directory, "index.html");
  need(fs.existsSync(parentFile), `${scope.name}: generated parent page missing`);
  if (fs.existsSync(parentFile)) {
    const html = fs.readFileSync(parentFile, "utf8");
    for (const value of [place.name, place.address, 'rel="canonical"', "Where should I park", "Sources"]) need(html.includes(value), `${scope.name}: raw HTML missing ${value}`);
  }
  for (const feature of place.features) {
    featureCount += 1;
    need(Number.isFinite(feature.latitude) && Number.isFinite(feature.longitude), `${scope.name}/${feature.name}: exact coordinates missing`);
    need(feature.details?.coordinateSource?.includes("openstreetmap.org"), `${scope.name}/${feature.name}: coordinate provenance missing`);
    need(feature.details?.positionQuality === "reviewed-official-destination-and-open-map-position", `${scope.name}/${feature.name}: position quality missing`);
    need((feature.details?.images || []).length === 1, `${scope.name}/${feature.name}: destination-specific image missing`);
    need((feature.details?.searchAnswers || []).length === 9, `${scope.name}/${feature.name}: destination answer set incomplete`);
    need(feature.source_url && feature.verified_at === campaign.checkedAt, `${scope.name}/${feature.name}: source or date missing`);
    const file = path.join(directory, feature.slug, "index.html");
    need(fs.existsSync(file), `${scope.name}/${feature.name}: generated page missing`);
    if (fs.existsSync(file)) {
      const html = fs.readFileSync(file, "utf8").toLowerCase();
      for (const value of [feature.name, place.name, "parking", "restroom", "dogs", "sources", 'rel="canonical"']) need(html.includes(value.toLowerCase()), `${scope.name}/${feature.name}: raw HTML missing ${value}`);
      need(html.includes(encodeURIComponent(`${feature.latitude},${feature.longitude}`).toLowerCase()), `${scope.name}/${feature.name}: exact navigation missing`);
    }
  }
}

need(imageCount === 32, `Expected 32 reviewed parent images, found ${imageCount}`);
need(featureCount === 19, `Expected 19 retained destinations, found ${featureCount}`);
const joined = campaign.places.map((scope) => JSON.stringify(places.find((item) => item.id === scope.id) || {})).join("\n");
for (const phrase of ["West Matheson is closed", "sunrise to sunset", "no lifeguards", "109 spiral steps", "free rides noon-5 p.m.", "former park trust was abolished"]) need(joined.includes(phrase), `Current practical guidance missing: ${phrase}`);
for (const rejected of ["bayfrontparkmiami.com/parks", "floridahikes.com/matheson", "Official City of Miami Beach photograph", "Entrance_to_the_Ringling_Mansion"]) need(!joined.includes(rejected), `Rejected source or mismatched image remained: ${rejected}`);

const requiredRedirects = [
  "/us/fl/miami/parks/maurice-a-ferr-park",
  "/us/fl/miami/parks/bayfront-park/tina-hills-pavilion",
  "/us/fl/miami/parks/matheson-hammock-park/west-matheson-dog-area",
  "/us/fl/miami-beach/parks/south-pointe-park/splash-pad-playground",
  "/us/fl/miami-beach/parks/lummus-park/lummus-playground",
  "/us/fl/key-biscayne/parks/crandon-park/visitor-nature-center",
  "/us/fl/key-biscayne/parks/bill-baggs-cape-florida-state-park/no-name-harbor",
  "/us/fl/miami/parks/historic-virginia-key-beach-park/wetland-nature-areas"
];
for (const source of requiredRedirects) need(vercel.redirects.some((item) => item.source === source && item.permanent), `Permanent retirement redirect missing: ${source}`);

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
for (const scope of campaign.places) {
  const place = places.find((item) => item.id === scope.id);
  need(sitemap.includes(`/us/fl/${String(place.city).toLowerCase().replace(/[^a-z0-9]+/g, "-")}/parks/${place.slug}`), `${scope.name}: sitemap route missing`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Verified 8 Miami waterfront guides, 32 licensed parent images, 19 evidence-complete destinations, retired-route redirects, current source-backed answers, exact navigation, raw HTML, and sitemap routes.");
