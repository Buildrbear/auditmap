#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

const intake = readJson("data/research-intake/nc-major-public-parks-2026-08-13.json");
const campaign = readJson("data/asheville-azalea-research-completion-campaign.json");
const photos = readJson("data/asheville-azalea-photo-research.json");
const audit = readJson("data/asheville-azalea-research-completion-audit.json");
const spatial = readJson("data/spatial-source-registry.json");
const claims = readJson("data/national-work-packet-claims.json");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

const azalea = intake.records.find((record) => record.slug === "asheville-azalea-park");
assert.ok(azalea, "Azalea Park inventory record is missing");
assert.equal(azalea.name, "Azalea Park");
assert.equal(azalea.address, "498 Azalea Road, Asheville, NC 28805");
assert.equal(azalea.latitude, 35.5754035067782);
assert.equal(azalea.longitude, -82.48586281337646);
assert.equal(azalea.position_quality, "reviewed-official-location-pin");
assert.match(azalea.coordinate_source, /WordPress location 72725/);
assert.equal(azalea.source_checked_at, "2026-08-20");
assert.ok(azalea.sources.length >= 5);
assert.equal(azalea.current_access_review.status, "unresolved-current-closure-conflict");
assert.ok(
  intake.reviewQueue.some((item) => item.park_slug === "asheville-azalea-park"),
  "Azalea Park access conflict must remain in the source review queue",
);

const dogPark = azalea.related_destinations.find((item) => item.name === "Azalea Dog Park");
assert.ok(dogPark, "Azalea Dog Park relationship is missing");
assert.equal(dogPark.existing_record_id, "basic-osm-way-265685650");

assert.equal(campaign.packetId, "research-completion-nc-asheville-01");
assert.equal(campaign.contributionTier, "inventory");
assert.equal(campaign.places.length, 1);
assert.equal(audit.outcome, "inventory-source-complete-access-and-photo-gated");
assert.deepEqual(audit.acceptedRecordIds, ["/us/nc/asheville/parks/azalea-park"]);
assert.equal(audit.publication.generatedPages, 0);
assert.equal(audit.imageRightsReview.openverse.reusableCandidates, 0);
assert.equal(audit.reviewQueue.length, 3);

const photoResult = photos.places["research-nc-asheville-azalea-park"];
assert.ok(photoResult, "Missing Azalea Park photo research");
assert.equal(photoResult.reusableCandidateCount, 0);
assert.deepEqual(photoResult.candidates, []);

for (const sourceId of ["asheville-location-directory", "asheville-park-info-points"]) {
  assert.ok(spatial.sources.some((source) => source.id === sourceId), `Missing ${sourceId}`);
}

const claim = claims.claims.find(
  (entry) => entry.packetId === "research-completion-nc-asheville-01",
);
assert.ok(claim, "Asheville packet claim is missing");
assert.ok(["claimed", "submitted"].includes(claim.status));
assert.equal(claim.issueUrl, "https://github.com/Buildrbear/auditmap/issues/39");

const route = "/us/nc/asheville/parks/azalea-park";
assert.ok(!sitemap.includes(`<loc>https://www.auditmap.org${route}</loc>`), `${route} must remain unpublished`);

console.log("Asheville Azalea Park research-completion verification passed.");
