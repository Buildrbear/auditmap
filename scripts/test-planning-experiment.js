const assert = require("node:assert/strict");
const { evaluatePlanningResults, validatePlanningResults } = require("./lib/planning-experiment");

const campaign = { id: "planning-test", lists: [{ id: "repeat" }, { id: "rewrite-hook" }, { id: "rewrite-list" }] };
const checkpoint = (overrides = {}) => ({
  socialImpressions: 100,
  socialEngagements: 5,
  listOpens: 10,
  guideOpens: 0,
  listSaves: 0,
  directions: 0,
  reshares: 0,
  crumbSubmissions: 0,
  nonTeamResponses: 0,
  ...overrides,
});
const results = {
  campaignId: campaign.id,
  round: 1,
  lists: [
    { id: "repeat", checkpoints: { "24h": null, "7d": checkpoint({ guideOpens: 2, reshares: 1 }) } },
    { id: "rewrite-hook", checkpoints: { "24h": null, "7d": checkpoint({ listOpens: 0 }) } },
    { id: "rewrite-list", checkpoints: { "24h": null, "7d": checkpoint() } },
  ],
};

validatePlanningResults(campaign, results);
const evaluation = evaluatePlanningResults(campaign, results);
assert.equal(evaluation.complete, true);
assert.equal(evaluation.items.find((item) => item.id === "repeat").decision, "repeat");
assert.equal(evaluation.items.find((item) => item.id === "rewrite-hook").decision, "rewrite-hook");
assert.equal(evaluation.items.find((item) => item.id === "rewrite-list").decision, "rewrite-list");
assert.throws(() => validatePlanningResults(campaign, {
  ...results,
  lists: results.lists.map((item) => item.id === "repeat"
    ? { ...item, checkpoints: { ...item.checkpoints, "7d": checkpoint({ listOpens: 1, guideOpens: 2 }) } }
    : item),
}), /guideOpens cannot exceed/);

console.log("Planning campaign validation and decision checks passed.");
