#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

const intake = readJson("data/research-intake/nc-major-public-parks-2026-08-13.json");
const campaign = readJson("data/greensboro-research-completion-campaign.json");
const photos = readJson("data/greensboro-photo-research.json");
const audit = readJson("data/greensboro-research-completion-audit.json");
const spatial = readJson("data/spatial-source-registry.json");
const claims = readJson("data/national-work-packet-claims.json");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

const records = new Map(
  intake.records
    .filter((record) => record.city === "Greensboro")
    .map((record) => [record.slug, record]),
);
const barber = records.get("greensboro-jimmie-i-barber-park");
const hester = records.get("greensboro-oka-t-hester-park");

assert.ok(barber, "Jimmie I. Barber Park inventory record is missing");
assert.ok(hester, "Oka T. Hester Park inventory record is missing");
assert.deepEqual(barber.aliases, ["Barber Park"]);
assert.deepEqual(hester.aliases, ["Hester Park"]);

assert.equal(barber.address, "1500 Barber Park Drive, Greensboro, NC 27401");
assert.equal(barber.latitude, 36.05127041);
assert.equal(barber.longitude, -79.75142641);
assert.equal(barber.position_quality, "reviewed-official-address-point");
assert.match(barber.coordinate_source, /OBJECTID 47795/);

assert.equal(hester.address, "3615 Deutzia Street, Greensboro, NC 27407");
assert.equal(hester.latitude, 36.0170663);
assert.equal(hester.longitude, -79.85690298);
assert.equal(hester.position_quality, "reviewed-official-address-point");
assert.match(hester.coordinate_source, /OBJECTID 10915/);
assert.equal(hester.secondary_entrances.length, 1);
assert.equal(
  hester.secondary_entrances[0].address,
  "800 Ailanthus Street, Greensboro, NC 27407",
);
assert.equal(hester.secondary_entrances[0].name, "Athletic fields entrance");

for (const record of [barber, hester]) {
  assert.equal(record.source_checked_at, "2026-08-20");
  assert.ok(record.official_source_url.startsWith("https://www.greensboro-nc.gov/"));
  assert.ok(record.coordinate_source_url.startsWith("https://gis.greensboro-nc.gov/"));
  assert.ok(record.sources.length >= 3);
}

assert.ok(
  !intake.reviewQueue.some((item) => item.park_slug === "greensboro-oka-t-hester-park"),
  "The resolved Hester entrance question must not remain in the intake review queue",
);

assert.equal(campaign.packetId, "research-completion-nc-greensboro-01");
assert.equal(campaign.places.length, 2);
assert.equal(audit.outcome, "source-records-complete-launch-guides-photo-gated");
assert.equal(audit.acceptedRecordIds.length, 2);
assert.equal(audit.publication.generatedPages, 0);
assert.equal(audit.imageRightsReview.openverse.reusableCandidates, 0);
assert.equal(audit.reviewQueue.length, 3);

for (const place of campaign.places) {
  const result = photos.places[place.id];
  assert.ok(result, `Missing photo research for ${place.name}`);
  assert.equal(result.reusableCandidateCount, 0);
  assert.deepEqual(result.candidates, []);
}

for (const sourceId of [
  "greensboro-piedmont-discovery-parks",
  "greensboro-address-points-near-me",
]) {
  assert.ok(spatial.sources.some((source) => source.id === sourceId), `Missing ${sourceId}`);
}

const claim = claims.claims.find(
  (entry) => entry.packetId === "research-completion-nc-greensboro-01",
);
assert.ok(claim, "Greensboro packet claim is missing");
assert.ok(["claimed", "submitted"].includes(claim.status));
assert.equal(claim.issueUrl, "https://github.com/Buildrbear/auditmap/issues/37");

for (const route of audit.acceptedRecordIds) {
  assert.ok(!sitemap.includes(`<loc>https://www.auditmap.org${route}</loc>`), `${route} must remain unpublished`);
}

console.log("Greensboro research-completion verification passed.");
