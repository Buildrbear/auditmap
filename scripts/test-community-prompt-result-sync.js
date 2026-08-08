const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { evaluateResults } = require("./lib/community-prompt-experiment");

const root = path.resolve(__dirname, "..");
const queuePath = path.join(root, "data/growth-loops/raleigh-community-question-queue.json");
const resultsPath = path.join(root, "data/discovery-campaigns/raleigh-community-prompt-pilot-results.json");
const campaign = JSON.parse(fs.readFileSync(path.join(root, "data/discovery-campaigns/raleigh-community-prompt-pilot.json"), "utf8"));
const priorQueue = fs.readFileSync(queuePath, "utf8");
const priorResults = fs.readFileSync(resultsPath, "utf8");
try {
  fs.writeFileSync(queuePath, JSON.stringify({ promptMetrics: {
    "missing-detail": { nonTeamReplies: 3, qualifiedNeeds: 2, resolvedNeeds: 1 },
    "overlooked-place": { nonTeamReplies: 1, qualifiedNeeds: 1, resolvedNeeds: 0 },
    "family-friction": { nonTeamReplies: 0, qualifiedNeeds: 0, resolvedNeeds: 0 },
  } }));
  const results = JSON.parse(priorResults);
  results.prompts[0].checkpoints["24h"] = { impressions: 100, engagements: 10, replies: 4, nonTeamReplies: 0, qualifiedNeeds: 0, resolvedNeeds: 0, recordImprovements: 0, publicReplyBacks: 0, respondentShares: 0 };
  fs.writeFileSync(resultsPath, JSON.stringify(results));
  execFileSync(process.execPath, [path.join(root, "scripts/sync-community-prompt-results.js"), "24h"]);
  const synced = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
  const first = synced.prompts[0].checkpoints["24h"];
  assert.equal(first.impressions, 100, "Authoritative social metrics must be preserved");
  assert.equal(first.nonTeamReplies, 3);
  assert.equal(first.qualifiedNeeds, 2);
  assert.equal(first.resolvedNeeds, 1);
  assert.equal(synced.prompts[1].checkpoints["24h"].impressions, null, "Unknown social metrics must remain null");
  const evaluation = evaluateResults(campaign, synced, "24h");
  assert.equal(evaluation.prompts.find(({ id }) => id === "missing-detail").decision, "close-loop");
  assert.equal(evaluation.prompts.find(({ id }) => id === "overlooked-place").decision, "collect");
} finally {
  fs.writeFileSync(queuePath, priorQueue);
  fs.writeFileSync(resultsPath, priorResults);
}
console.log("Community result sync preserves authoritative metrics, derived counts, and honest unknowns.");
