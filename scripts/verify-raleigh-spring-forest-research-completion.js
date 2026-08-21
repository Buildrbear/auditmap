#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

const intake = readJson("data/research-intake/nc-major-public-parks-2026-08-13.json");
const external = readJson("data/research-intake/opentask-external-sources.json");
const campaign = readJson("data/raleigh-spring-forest-research-completion-campaign.json");
const photos = readJson("data/raleigh-spring-forest-photo-research.json");
const audit = readJson("data/raleigh-spring-forest-research-completion-audit.json");
const spatial = readJson("data/spatial-source-registry.json");
const claims = readJson("data/national-work-packet-claims.json");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

const springForest = intake.records.find(
  (record) => record.slug === "raleigh-spring-forest-road-park",
);
assert.ok(springForest, "Spring Forest Road Park inventory record is missing");
assert.equal(springForest.name, "Spring Forest Road Park");
assert.ok(springForest.aliases.includes("Spring Forest Park"));
assert.equal(springForest.address, "4203 Spring Forest Road, Raleigh, NC 27616");
assert.equal(springForest.latitude, 35.8580681274815);
assert.equal(springForest.longitude, -78.5713910990543);
assert.equal(springForest.position_quality, "reviewed-official-vehicle-entrance");
assert.match(springForest.coordinate_source, /Spring Forest Road - 004/);
assert.equal(springForest.source_checked_at, "2026-08-20");
assert.ok(springForest.sources.length >= 7);
assert.equal(springForest.identity_reconciliation.status, "resolved-distinct-parent");
assert.equal(springForest.current_access_review.status, "verified-current-public-use");

const staleOverride =
  external.recordOverrides[
    "opentask-nc-50-detailed-parks-2026-08-13::raleigh-spring-forest-road-park"
  ];
assert.equal(staleOverride, undefined, "Resolved Millbrook duplicate override must be removed");

assert.equal(campaign.packetId, "research-completion-nc-raleigh-01");
assert.equal(campaign.contributionTier, "inventory");
assert.equal(campaign.places.length, 1);
assert.equal(audit.outcome, "inventory-identity-and-access-complete-photo-gated");
assert.deepEqual(audit.acceptedRecordIds, [
  "/us/nc/raleigh/parks/spring-forest-road-park",
]);
assert.equal(audit.publication.generatedPages, 0);
assert.equal(audit.imageRightsReview.openverse.reusableCandidates, 0);
assert.equal(audit.reviewQueue.length, 2);
assert.equal(audit.records[0].duplicateStatus, "resolved-distinct-from-millbrook-exchange-park");
assert.equal(audit.records[0].coordinateProvenance.objectId, 202);
assert.equal(audit.records[0].coordinateProvenance.accessType, "Vehicle");
assert.equal(audit.records[0].otherOfficialAccessPoints.length, 3);

const photoResult = photos.places["research-nc-raleigh-spring-forest-road-park"];
assert.ok(photoResult, "Missing Spring Forest Road Park photo research");
assert.equal(photoResult.reusableCandidateCount, 0);
assert.deepEqual(photoResult.candidates, []);

assert.ok(
  spatial.sources.some((source) => source.id === "raleigh-park-access-points"),
  "Missing Raleigh park-access GIS source",
);

const claim = claims.claims.find(
  (entry) => entry.packetId === "research-completion-nc-raleigh-01",
);
assert.ok(claim, "Raleigh packet claim is missing");
assert.ok(["claimed", "submitted"].includes(claim.status));
assert.equal(claim.issueUrl, "https://github.com/Buildrbear/auditmap/issues/45");

const route = "/us/nc/raleigh/parks/spring-forest-road-park";
assert.ok(!sitemap.includes(`<loc>https://www.auditmap.org${route}</loc>`), `${route} must remain unpublished`);

console.log("Raleigh Spring Forest Road Park research-completion verification passed.");
