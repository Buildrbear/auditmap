#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

const intake = readJson("data/research-intake/nc-major-public-parks-2026-08-13.json");
const campaign = readJson("data/boone-research-completion-campaign.json");
const photos = readJson("data/boone-photo-research.json");
const audit = readJson("data/boone-research-completion-audit.json");
const spatial = readJson("data/spatial-source-registry.json");
const claims = readJson("data/national-work-packet-claims.json");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

const bySlug = new Map(intake.records.map((record) => [record.slug, record]));
const clawson = bySlug.get("boone-clawson-burnley-park");
const daniel = bySlug.get("boone-daniel-boone-park");
const junaluska = bySlug.get("boone-junaluska-park");

assert.ok(clawson, "Clawson-Burnley Park inventory record is missing");
assert.equal(clawson.latitude, 36.2048775699029);
assert.equal(clawson.longitude, -81.6507230115573);
assert.equal(clawson.position_quality, "reviewed-official-facility-map-pin");
assert.equal(clawson.coordinate_reconciliation.status, "resolved-town-map-and-gis-match");
assert.equal(clawson.current_access_review.status, "verified-active-public-use-current-hours-unresolved");
assert.ok(clawson.sources.length >= 6);

assert.ok(daniel, "Daniel Boone Park inventory record is missing");
assert.equal(daniel.latitude, 36.2095879885407);
assert.equal(daniel.longitude, -81.669921000333);
assert.equal(daniel.position_quality, "reviewed-official-facility-map-pin");
assert.equal(daniel.relationship_reconciliation.status, "resolved-parent-child");
assert.match(daniel.relationship_reconciliation.finding, /Boone Jaycee Park/);
assert.ok(daniel.sources.length >= 5);

assert.ok(junaluska, "Junaluska Park inventory record is missing");
assert.equal(junaluska.address, "135 Bear Trail, Boone, NC 28607");
assert.equal(junaluska.latitude, 36.2224624);
assert.equal(junaluska.longitude, -81.6809793);
assert.equal(junaluska.position_quality, "reviewed-current-address-building-match");
assert.equal(
  junaluska.address_reconciliation.status,
  "resolved-current-address-legacy-pin-conflict-retained",
);
assert.match(junaluska.address_reconciliation.publication_rule, /not a current public entrance/);
assert.ok(junaluska.sources.length >= 5);

const booneQueue = intake.reviewQueue.filter((item) => item.park_slug.startsWith("boone-"));
assert.equal(booneQueue.length, 3);
assert.ok(booneQueue.some((item) => /embedded map pin/.test(item.issue)));

assert.equal(campaign.packetId, "research-completion-nc-boone-01");
assert.equal(campaign.contributionTier, "inventory");
assert.equal(campaign.places.length, 3);
assert.equal(audit.outcome, "inventory-source-complete-hours-and-photo-gated");
assert.equal(audit.records.length, 3);
assert.equal(audit.publication.generatedPages, 0);
assert.equal(audit.imageRightsReview.openverse.acceptedCandidates, 0);
assert.equal(audit.reviewQueue.length, 3);

const clawsonPhotos = photos.places["research-nc-boone-clawson-burnley-park"];
const danielPhotos = photos.places["research-nc-boone-daniel-boone-park"];
const junaluskaPhotos = photos.places["research-nc-boone-junaluska-park"];
assert.equal(clawsonPhotos.reusableCandidateCount, 0);
assert.equal(junaluskaPhotos.reusableCandidateCount, 0);
assert.equal(danielPhotos.reusableCandidateCount, 12);
assert.equal(danielPhotos.reviewedCandidateCount, 12);
assert.equal(danielPhotos.acceptedCandidateCount, 0);
assert.ok(
  danielPhotos.candidates.every(
    (candidate) => candidate.reviewStatus === "rejected-not-representative-parent",
  ),
  "Every nominal Daniel Boone candidate must have an explicit rejection decision",
);

assert.ok(
  spatial.sources.some((source) => source.id === "boone-facilities-structures-and-parcels"),
  "Missing Boone facilities and GIS source",
);

const claim = claims.claims.find(
  (entry) => entry.packetId === "research-completion-nc-boone-01",
);
assert.ok(claim, "Boone packet claim is missing");
assert.ok(["claimed", "submitted"].includes(claim.status));
assert.equal(claim.issueUrl, "https://github.com/Buildrbear/auditmap/issues/47");

for (const route of audit.acceptedRecordIds) {
  assert.ok(
    !sitemap.includes(`<loc>https://www.auditmap.org${route}</loc>`),
    `${route} must remain unpublished`,
  );
}

console.log("Boone public parks research-completion verification passed.");
