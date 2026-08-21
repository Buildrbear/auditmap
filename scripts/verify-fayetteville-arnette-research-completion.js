#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

const intake = readJson("data/research-intake/nc-major-public-parks-2026-08-13.json");
const campaign = readJson("data/fayetteville-arnette-research-completion-campaign.json");
const photos = readJson("data/fayetteville-arnette-photo-research.json");
const audit = readJson("data/fayetteville-arnette-research-completion-audit.json");
const spatial = readJson("data/spatial-source-registry.json");
const claims = readJson("data/national-work-packet-claims.json");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

const arnette = intake.records.find(
  (record) => record.slug === "fayetteville-arnette-park",
);
assert.ok(arnette, "Arnette Park inventory record is missing");
assert.equal(arnette.name, "Arnette Park");
assert.equal(arnette.address, "2165 Wilmington Highway, Fayetteville, NC 28306");
assert.equal(arnette.latitude, 35.00498326957595);
assert.equal(arnette.longitude, -78.85757840132553);
assert.equal(arnette.position_quality, "reviewed-official-park-point");
assert.match(arnette.coordinate_source, /City of Fayetteville Park Points GIS/);
assert.equal(arnette.source_checked_at, "2026-08-20");
assert.ok(arnette.sources.length >= 6);
assert.equal(
  arnette.address_reconciliation.status,
  "resolved-current-visitor-address",
);
assert.equal(
  arnette.current_access_review.status,
  "verified-active-public-use-current-hours-unresolved",
);
assert.ok(
  intake.reviewQueue.some((item) => item.park_slug === "fayetteville-arnette-park"),
  "Arnette Park hours question must remain in the source review queue",
);

assert.equal(campaign.packetId, "research-completion-nc-fayetteville-01");
assert.equal(campaign.contributionTier, "inventory");
assert.equal(campaign.places.length, 1);
assert.equal(audit.outcome, "inventory-source-complete-hours-and-photo-gated");
assert.deepEqual(audit.acceptedRecordIds, [
  "/us/nc/fayetteville/parks/arnette-park",
]);
assert.equal(audit.publication.generatedPages, 0);
assert.equal(audit.imageRightsReview.openverse.reusableCandidates, 0);
assert.equal(audit.reviewQueue.length, 3);

const photoResult = photos.places["research-nc-fayetteville-arnette-park"];
assert.ok(photoResult, "Missing Arnette Park photo research");
assert.equal(photoResult.reusableCandidateCount, 0);
assert.deepEqual(photoResult.candidates, []);

assert.ok(
  spatial.sources.some(
    (source) => source.id === "fayetteville-park-points-and-boundaries",
  ),
  "Missing Fayetteville park GIS source",
);

const claim = claims.claims.find(
  (entry) => entry.packetId === "research-completion-nc-fayetteville-01",
);
assert.ok(claim, "Fayetteville packet claim is missing");
assert.ok(["claimed", "submitted"].includes(claim.status));
assert.equal(claim.issueUrl, "https://github.com/Buildrbear/auditmap/issues/43");

const route = "/us/nc/fayetteville/parks/arnette-park";
assert.ok(!sitemap.includes(`<loc>https://www.auditmap.org${route}</loc>`), `${route} must remain unpublished`);

console.log("Fayetteville Arnette Park research-completion verification passed.");
