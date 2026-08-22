const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { hasDocumentedReuseRights } = require("./lib/image-rights");

const root = path.resolve(__dirname, "..");
const institutions = JSON.parse(fs.readFileSync(path.join(root, "data", "institutions.json"), "utf8"));
const campaign = JSON.parse(fs.readFileSync(path.join(root, "data", "carteret-coast-enrichment-campaign.json"), "utf8"));
const archive = JSON.parse(fs.readFileSync(path.join(root, "data", "photo-research", "carteret-provisional-official-media.json"), "utf8"));
const places = institutions.filter((place) => place.id.startsWith("carteret-"));

assert.equal(places.length, 22, "Expected the complete 22-place Carteret campaign.");
assert.equal(campaign.recordCount, 22);
assert.equal(archive.places.length, 21, "Expected archived provisional media for the 21 previously illustrated places.");
assert.equal(
  archive.places.reduce((total, place) => total + place.media.length, 0),
  30,
  "Expected all 30 provisional media references to remain recoverable.",
);

for (const place of places) {
  assert.ok(place.image?.url, `${place.name}: reviewed hero image missing`);
  assert.ok(hasDocumentedReuseRights(place.image), `${place.name}: image rights are incomplete`);
  assert.equal(place.image.kind, "aerial-overview-fallback", `${place.name}: aerial fallback label missing`);
  assert.ok(place.coordinateSource, `${place.name}: coordinate source missing`);
  assert.ok(place.positionQuality, `${place.name}: position quality missing`);
  assert.equal((place.images || []).length, 0, `${place.name}: provisional gallery media still rendered`);
  assert.ok(fs.existsSync(path.join(root, place.image.url.replace(/^\//, ""))), `${place.name}: local image asset missing`);

  const campaignRecord = campaign.records.find((record) => record.id === place.id);
  assert.ok(campaignRecord, `${place.name}: campaign record missing`);
  assert.equal(campaignRecord.imageCount, 1, `${place.name}: campaign image count is stale`);
  assert.equal(campaignRecord.completenessScore, 100, `${place.name}: campaign completeness is stale`);
  assert.deepEqual(campaignRecord.unresolvedIntentKeys, [], `${place.name}: stale campaign image gap`);
}

const sugarloaf = places.find((place) => place.id === "carteret-morehead-city-sugarloaf-island");
assert.equal(sugarloaf.latitude, 34.717462);
assert.equal(sugarloaf.longitude, -76.7096734);

const boatRamps = places.find((place) => place.id === "carteret-morehead-city-newport-river-boat-ramps");
assert.equal(boatRamps.latitude, 34.72265);
assert.equal(boatRamps.longitude, -76.6868);

console.log("Verified 22 Carteret destinations with public-domain local images and archived provisional media.");
