#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

const intake = readJson("data/research-intake/nc-major-public-parks-2026-08-13.json");
const campaign = readJson("data/concord-marvin-caldwell-research-completion-campaign.json");
const photos = readJson("data/concord-marvin-caldwell-photo-research.json");
const audit = readJson("data/concord-marvin-caldwell-research-completion-audit.json");
const spatial = readJson("data/spatial-source-registry.json");
const claims = readJson("data/national-work-packet-claims.json");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

const caldwell = intake.records.find(
  (record) => record.slug === "concord-marvin-caldwell-park",
);
assert.ok(caldwell, "Marvin Caldwell Park inventory record is missing");
assert.equal(caldwell.name, "Marvin Caldwell Park");
assert.deepEqual(caldwell.alternate_names, ["Caldwell Park"]);
assert.equal(caldwell.address, "362 Georgia Avenue SW, Concord, NC 28025");
assert.equal(caldwell.latitude, 35.394773);
assert.equal(caldwell.longitude, -80.583631);
assert.equal(caldwell.position_quality, "reviewed-official-address-map-pin");
assert.match(caldwell.coordinate_source, /City of Concord/);
assert.equal(caldwell.source_checked_at, "2026-08-20");
assert.ok(caldwell.sources.length >= 5);
assert.equal(
  caldwell.current_access_review.status,
  "verified-open-fast-changing-splash-schedule",
);
assert.equal(
  caldwell.source_reconciliation.status,
  "legacy-directory-amenities-not-currently-controlling",
);
assert.ok(
  intake.reviewQueue.some((item) => item.park_slug === "concord-marvin-caldwell-park"),
  "Marvin Caldwell Park amenity reconciliation must remain in the source review queue",
);

assert.equal(campaign.packetId, "research-completion-nc-concord-01");
assert.equal(campaign.contributionTier, "inventory");
assert.equal(campaign.places.length, 1);
assert.equal(audit.outcome, "inventory-source-complete-photo-and-as-built-gated");
assert.deepEqual(audit.acceptedRecordIds, [
  "/us/nc/concord/parks/marvin-caldwell-park",
]);
assert.equal(audit.publication.generatedPages, 0);
assert.equal(audit.imageRightsReview.openverse.reusableCandidates, 0);
assert.equal(audit.reviewQueue.length, 3);

const photoResult = photos.places["research-nc-concord-marvin-caldwell-park"];
assert.ok(photoResult, "Missing Marvin Caldwell Park photo research");
assert.equal(photoResult.reusableCandidateCount, 0);
assert.deepEqual(photoResult.candidates, []);

assert.ok(
  spatial.sources.some((source) => source.id === "concord-parks-directory-map-links"),
  "Missing Concord parks-directory coordinate source",
);

const claim = claims.claims.find(
  (entry) => entry.packetId === "research-completion-nc-concord-01",
);
assert.ok(claim, "Concord packet claim is missing");
assert.ok(["claimed", "submitted"].includes(claim.status));
assert.equal(claim.issueUrl, "https://github.com/Buildrbear/auditmap/issues/41");

const route = "/us/nc/concord/parks/marvin-caldwell-park";
assert.ok(!sitemap.includes(`<loc>https://www.auditmap.org${route}</loc>`), `${route} must remain unpublished`);

console.log("Concord Marvin Caldwell Park research-completion verification passed.");
