const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { evaluateResults, validateResults } = require("./lib/community-prompt-experiment");

const root = path.resolve(__dirname, "..");
const campaign = JSON.parse(fs.readFileSync(path.join(root, "data/discovery-campaigns/raleigh-community-prompt-pilot.json"), "utf8"));
const empty = JSON.parse(fs.readFileSync(path.join(root, "data/discovery-campaigns/raleigh-community-prompt-pilot-results.json"), "utf8"));
validateResults(campaign, empty);
assert.equal(evaluateResults(campaign, empty).complete, false);
const metrics = (overrides = {}) => ({ impressions: 100, engagements: 10, replies: 4, nonTeamReplies: 3, qualifiedNeeds: 2, resolvedNeeds: 1, recordImprovements: 1, publicReplyBacks: 1, respondentShares: 0, ...overrides });
const measured = {
  ...empty,
  prompts: [
    { id: "missing-detail", checkpoints: { "24h": null, "7d": metrics({ respondentShares: 1 }) } },
    { id: "overlooked-place", checkpoints: { "24h": null, "7d": metrics({ qualifiedNeeds: 0, resolvedNeeds: 0, recordImprovements: 0, publicReplyBacks: 0 }) } },
    { id: "family-friction", checkpoints: { "24h": null, "7d": metrics({ resolvedNeeds: 0, recordImprovements: 0, publicReplyBacks: 0 }) } },
  ],
};
const evaluation = evaluateResults(campaign, measured);
assert.equal(evaluation.prompts.find(({ id }) => id === "missing-detail").decision, "repeat-and-expand");
assert.equal(evaluation.prompts.find(({ id }) => id === "overlooked-place").decision, "narrow-question");
assert.equal(evaluation.prompts.find(({ id }) => id === "family-friction").decision, "finish-enrichment");
assert.equal(evaluateResults(campaign, { ...measured, prompts: measured.prompts.map((prompt) => prompt.id === "missing-detail" ? { ...prompt, checkpoints: { ...prompt.checkpoints, "7d": metrics({ recordImprovements: 0, respondentShares: 1 }) } } : prompt) }).prompts.find(({ id }) => id === "missing-detail").decision, "repeat");
assert.throws(() => validateResults(campaign, { ...measured, prompts: measured.prompts.map((prompt) => prompt.id === "missing-detail" ? { ...prompt, checkpoints: { ...prompt.checkpoints, "7d": metrics({ qualifiedNeeds: 4, nonTeamReplies: 3 }) } } : prompt) }), /cannot exceed/);
for (const prompt of campaign.prompts) assert.ok([...prompt.copy].length <= 280, `${prompt.id} must fit X`);
console.log("Community-question privacy, qualification, answer-closure, and decision contracts passed.");
