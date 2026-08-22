const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { hasDocumentedReuseRights } = require("./lib/image-rights");

const root = path.resolve(__dirname, "..");
const institutions = JSON.parse(fs.readFileSync(path.join(root, "data", "institutions.json"), "utf8"));
const queue = JSON.parse(fs.readFileSync(path.join(root, "data", "generated", "nc-first-photo-queue.json"), "utf8"));
const expected = institutions.filter((place) => {
  const images = [place.image, ...(place.images || [])].filter(Boolean);
  return place.state === "NC"
    && place.publishStatus === "enriched-basic"
    && !images.some(hasDocumentedReuseRights);
});

assert.equal(queue.schemaVersion, 1);
assert.equal(queue.summary.needsReviewedImage, expected.length);
assert.equal(
  queue.summary.noImageReference + queue.summary.unverifiedReuseRights,
  expected.length,
);
assert.equal(
  queue.summary.withCandidateLeads,
  queue.places.filter((place) => place.candidateCount > 0).length,
);
assert.equal(
  queue.summary.candidateReviewNeeded,
  queue.places.filter((place) => place.candidateStatus === "candidate-review").length,
);
assert.equal(
  queue.summary.fieldPhotoNeeded,
  queue.places.filter((place) => place.candidateStatus === "field-photo-needed").length,
);
assert.equal(
  queue.summary.rightsClearanceNeeded,
  queue.places.filter((place) => place.candidateStatus === "rights-clearance-needed").length,
);
assert.equal(
  queue.summary.dataCorrectionNeeded,
  queue.places.filter((place) => place.candidateStatus === "data-correction-needed").length,
);
assert.equal(queue.places.length, expected.length);
assert.equal(new Set(queue.places.map((place) => place.id)).size, queue.places.length);
assert.deepEqual(
  new Set(queue.places.map((place) => place.id)),
  new Set(expected.map((place) => place.id)),
  "The first-photo queue must exactly match the published NC basic records without reusable images.",
);
assert.ok(queue.packets.every((packet) => packet.recordCount <= queue.summary.packetSize));
assert.equal(
  queue.packets.reduce((total, packet) => total + packet.recordCount, 0),
  queue.places.length,
);
assert.ok(queue.places.every((place) => place.officialSource && place.latitude && place.longitude));
assert.ok(queue.places.every((place) => [
  "candidate-review",
  "field-photo-needed",
  "rights-review",
  "rights-clearance-needed",
  "data-correction-needed",
  "research-error",
  "unresearched",
].includes(place.candidateStatus)));
assert.ok(queue.places.every((place) => !place.reviewOutcome || (
  place.reviewOutcome.checkedAt
  && place.reviewOutcome.note
  && place.reviewOutcome.source === "data/nc-first-photo-review-outcomes.json"
)));

console.log(`Verified ${queue.places.length} first-photo records across ${queue.packets.length} internal packets.`);
