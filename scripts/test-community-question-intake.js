const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const queuePath = path.join(root, "data/growth-loops/raleigh-community-question-queue.json");
const priorQueue = fs.existsSync(queuePath) ? fs.readFileSync(queuePath, "utf8") : null;
const fixture = path.join(os.tmpdir(), "auditmap-community-intake-test.json");
const run = (intake) => {
  fs.writeFileSync(fixture, JSON.stringify(intake));
  return spawnSync(process.execPath, [path.join(root, "scripts/triage-community-question-intake.js"), fixture], { encoding: "utf8" });
};
const base = {
  campaignId: "raleigh-community-prompt-pilot",
  reviewedAt: "2026-08-07",
  responses: [
    { id: "response-001", promptId: "missing-detail", placeId: "dix-park", questionParaphrase: "Where should a first-time visitor park at Dix Park?", intentKey: "parking", disposition: "qualified" },
    { id: "response-002", promptId: "family-friction", placeId: "dix-park", questionParaphrase: "Which parking area is best before visiting Dix Park with children?", intentKey: "parking", disposition: "qualified" },
    { id: "response-003", promptId: "family-friction", placeId: "john-chavis-memorial-park", questionParaphrase: "Where can a family park at John Chavis Memorial Park?", intentKey: "parking", disposition: "qualified" },
    { id: "response-004", promptId: "overlooked-place", placeId: "moore-square", questionParaphrase: "This response did not contain a concrete visitor question.", disposition: "out-of-scope" }
  ],
};

try {
  const valid = run(base);
  assert.equal(valid.status, 0, valid.stderr);
  const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
  assert.equal(queue.metrics.reviewedResponses, 4);
  assert.equal(queue.metrics.qualifiedNeeds, 2);
  assert.equal(queue.metrics.duplicateNeeds, 1);
  assert.equal(queue.metrics.answerReady, 1, "Current Dix parking guidance should be ready");
  assert.equal(queue.metrics.recheckRequired, 1, "Expired Chavis parking guidance should require recheck");
  assert.equal(queue.needs.find(({ placeId }) => placeId === "dix-park").occurrences, 2);
  assert.ok(queue.needs.find(({ placeId }) => placeId === "dix-park").source);
  assert.equal(queue.needs.find(({ placeId }) => placeId === "john-chavis-memorial-park").answer, undefined);
  assert.doesNotMatch(JSON.stringify(queue), /response-00|username|handle/i);

  const unsafe = run({ ...base, responses: [{ ...base.responses[0], username: "do-not-store" }] });
  assert.notEqual(unsafe.status, 0);
  assert.match(unsafe.stderr, /social identity or copied reply fields are forbidden/);
} finally {
  fs.rmSync(fixture, { force: true });
  if (priorQueue === null) fs.rmSync(queuePath, { force: true });
  else fs.writeFileSync(queuePath, priorQueue);
}
console.log("Community intake privacy, place resolution, intent normalization, deduplication, and freshness passed.");
