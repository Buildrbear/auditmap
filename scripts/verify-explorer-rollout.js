const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const catalogFiles = [
  "data/institutions.json",
  "data/generated/launch-map-places.json",
];

function featureImage(feature) {
  return feature?.details?.imageUrl ||
    feature?.details?.photoUrl ||
    feature?.image_url ||
    feature?.details?.images?.[0]?.url ||
    feature?.images?.[0]?.url ||
    "";
}

function validMappedFeature(feature) {
  const latitude = Number(feature?.latitude);
  const longitude = Number(feature?.longitude);
  return Boolean(
    String(feature?.id || "").trim() &&
    String(feature?.name || "").trim() &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

function explorerReadyFeature(feature) {
  const details = feature?.details || {};
  return validMappedFeature(feature) && Boolean(
    featureImage(feature) &&
    (feature.source_url || details.informationSourceUrl || details.officialMapUrl) &&
    (feature.verified_at || details.informationCheckedAt || details.verifiedAt) &&
    (details.positionQuality || details.coordinateSource)
  );
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generatedParkPage(place) {
  return path.join(
    root,
    "us",
    slugify(place.state),
    slugify(place.city),
    "parks",
    place.slug || slugify(place.name),
    "index.html",
  );
}

const places = catalogFiles.flatMap((file) =>
  JSON.parse(fs.readFileSync(path.join(root, file), "utf8")),
);
const mappedParents = places.filter(
  (place) => (place.features || []).filter(validMappedFeature).length >= 2,
);
const explorerParents = places.filter(
  (place) => (place.features || []).filter(explorerReadyFeature).length >= 2,
);

assert.ok(explorerParents.length >= 300, "Explorer rollout should cover the nationwide enriched park catalogue.");
assert.equal(
  explorerParents.length,
  mappedParents.length,
  "Every currently mapped multi-subsite park should meet the Explorer publication gate.",
);

for (const place of explorerParents) {
  assert.match(
    `${place.type || ""} ${place.searchCategory || ""}`,
    /park/i,
    `${place.name} must be a park record before Explorer is enabled.`,
  );
  const readyFeatures = (place.features || []).filter(explorerReadyFeature);
  const ids = new Set();
  for (const feature of readyFeatures) {
    assert.ok(!ids.has(feature.id), `${place.name} has a duplicate Explorer subsite ID: ${feature.id}`);
    ids.add(feature.id);
    const image = featureImage(feature);
    if (image.startsWith("/")) {
      const imagePath = path.join(root, image.replace(/^\/+/, ""));
      assert.ok(fs.existsSync(imagePath), `${place.name} is missing Explorer image ${image}`);
    } else {
      assert.match(image, /^https:\/\//, `${place.name} has an unsafe Explorer image URL.`);
    }
  }
  const pagePath = generatedParkPage(place);
  assert.ok(fs.existsSync(pagePath), `${place.name} is missing its generated canonical park page.`);
  const html = fs.readFileSync(pagePath, "utf8");
  assert.ok(html.includes('id="launch-place-explorer"'), `${place.name} is missing its site-map Explorer handoff.`);
  assert.ok(html.includes(`"id":"${readyFeatures[0].id}"`), `${place.name} omits Explorer-ready subsites from its page payload.`);
  assert.ok(html.includes('"positionQuality"') || html.includes('"coordinateSource"'), `${place.name} omits coordinate provenance from its page payload.`);
  assert.ok(html.includes('"source_url"'), `${place.name} omits source URLs from its page payload.`);
  assert.ok(html.includes('"verified_at"'), `${place.name} omits checked dates from its page payload.`);
  assert.ok(html.includes('/app.js?v=20260808-61'), `${place.name} uses a stale Explorer asset version.`);
}

for (const [name, minimum] of [
  ["Dix Park", 12],
  ["Central Park", 20],
  ["Golden Gate Park", 8],
  ["Balboa Park", 8],
  ["Boston Common", 8],
  ["Prospect Park", 8],
]) {
  const place = explorerParents.find((candidate) => candidate.name === name);
  assert.ok(place, `${name} must remain in the representative Explorer rollout set.`);
  assert.ok(
    place.features.filter(explorerReadyFeature).length >= minimum,
    `${name} must retain at least ${minimum} Explorer-ready subsites.`,
  );
}

const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
for (const contract of [
  "function explorerFeatureReady(feature)",
  "function explorerPlaceFeatures(place)",
  "return explorerPlaceFeatures(place).length >= 2",
  "const mappedDestinationCount = explorerPlaceFeatures(place).length",
  "return explorerPlaceFeatures(place);",
  "const explorerAvailable = explorerEligible({ ...place, features })",
]) {
  assert.ok(app.includes(contract), `Shared Explorer rollout contract is missing: ${contract}`);
}

const generator = fs.readFileSync(path.join(root, "scripts/generate-search-pages.js"), "utf8");
for (const trustField of [
  "source_url: feature.source_url",
  "verified_at: feature.verified_at",
  "positionQuality: feature.details?.positionQuality",
  "coordinateSource: feature.details?.coordinateSource",
  "informationSourceUrl: feature.details?.informationSourceUrl",
  "informationCheckedAt: feature.details?.informationCheckedAt",
  "imageLicense: feature.details?.imageLicense",
]) {
  assert.ok(generator.includes(trustField), `Generated park pages omit Explorer trust field: ${trustField}`);
}

for (const pagePath of [
  "us/nc/raleigh/parks/dix-park/index.html",
  "us/ny/new-york-city/parks/central-park/index.html",
  "us/ca/san-francisco/parks/golden-gate-park/index.html",
  "us/ca/san-diego/parks/balboa-park/index.html",
  "us/ma/boston/parks/boston-common/index.html",
  "us/ny/new-york-city/parks/prospect-park/index.html",
]) {
  const html = fs.readFileSync(path.join(root, pagePath), "utf8");
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.auditmap\.org\//, `${pagePath} needs a canonical URL.`);
  assert.ok(html.includes('id="launch-place-explorer"'), `${pagePath} needs the site-map Explorer handoff.`);
  assert.ok(html.includes('"positionQuality"'), `${pagePath} omits subsite coordinate provenance.`);
  assert.ok(html.includes('"source_url"'), `${pagePath} omits subsite source URLs.`);
  assert.ok(html.includes('"verified_at"'), `${pagePath} omits subsite checked dates.`);
  assert.ok(html.includes('/app.js?v=20260808-61'), `${pagePath} uses a stale Explorer asset version.`);
}

const completeFixture = explorerParents[0].features.find(explorerReadyFeature);
for (const mutate of [
  (feature) => { feature.id = ""; },
  (feature) => { feature.latitude = 0; feature.longitude = 0; },
  (feature) => { feature.details.imageUrl = ""; feature.details.photoUrl = ""; feature.details.images = []; feature.image_url = ""; feature.images = []; },
  (feature) => { feature.source_url = ""; feature.details.informationSourceUrl = ""; feature.details.officialMapUrl = ""; },
  (feature) => { feature.verified_at = ""; feature.details.informationCheckedAt = ""; feature.details.verifiedAt = ""; },
  (feature) => { feature.details.positionQuality = ""; feature.details.coordinateSource = ""; },
]) {
  const incomplete = JSON.parse(JSON.stringify(completeFixture));
  mutate(incomplete);
  assert.equal(explorerReadyFeature(incomplete), false, "Incomplete subsites must not pass the Explorer gate.");
}

console.log(
  `Explorer rollout gate passed for ${explorerParents.length} park records across ${new Set(explorerParents.map((place) => place.state)).size} states and districts.`,
);
