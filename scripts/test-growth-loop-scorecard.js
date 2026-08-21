const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { definitions, evaluate, nationalLaunchGate, rate } = require("./evaluate-growth-loops");

const root = path.resolve(__dirname, "..");
assert.equal(Object.keys(definitions).length, 7);
assert.equal(rate(2, 4), 0.5);
assert.equal(rate(0, 4), 0);
assert.equal(rate(1, 0), null);
assert.equal(evaluate("verified-answer-sharing", null).decision, "COLLECT");
assert.equal(evaluate("verified-answer-sharing", { shares: 10, opens: 5, followups: 1, contributions: 1 }).decision, "SCALE CAREFULLY");
assert.equal(evaluate("directions-return", { shown: 10, accepted: 0, dismissed: 10, contributions: 0 }).decision, "FIX PROMISE");
assert.equal(evaluate("explorer-passport", { opens: 10, placesMarked: 3, shares: 1, sharedOpens: 1, contributionIntents: 1, contributions: 0 }).decision, "KEEP TESTING");
assert.equal(evaluate("explorer-passport", { opens: 10, placesMarked: 3, shares: 1, sharedOpens: 1, contributionIntents: 1, contributions: 1 }).decision, "SCALE CAREFULLY");
assert.equal(evaluate("community-question", { impressions: 100, qualifiedNeeds: 3, resolvedNeeds: 1, recordImprovements: 1, replyBacks: 0, respondentShares: 0 }).decision, "KEEP TESTING");
assert.equal(evaluate("community-question", { impressions: 100, qualifiedNeeds: 3, resolvedNeeds: 1, recordImprovements: 1, replyBacks: 1, respondentShares: 0 }).decision, "SCALE CAREFULLY");
assert.equal(evaluate("community-question", { impressions: 100, qualifiedNeeds: 3, resolvedNeeds: 1, recordImprovements: 0, replyBacks: 1, respondentShares: 1 }).decision, "KEEP TESTING");
assert.equal(nationalLaunchGate({ contentReady: true, measurementReady: false }).decision, "RELEASE TRACKING");
assert.equal(nationalLaunchGate({ contentReady: true, measurementReady: true }).decision, "RUN DAY 1");
assert.throws(() => evaluate("shared-planning-list", { shares: 1 }), /missing or invalid fields/);

const report = fs.readFileSync(path.join(root, "preview/growth-loop-scorecard.md"), "utf8");
for (const phrase of ["AuditMap Growth-loop Scorecard", "Never replace an unknown with zero", "Verified answer sharing", "Directions return invitation", "Community question to sourced answer", "National daily discovery", "RELEASE TRACKING"]) {
  assert(report.includes(phrase), `Report missing: ${phrase}`);
}
console.log("Cross-loop scorecard schema, honest unknowns, rates, and decision rules passed.");
