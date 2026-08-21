const assert = require("node:assert/strict");
const { evaluateResults, validateResults } = require("./lib/discovery-experiment");

const campaign = {
  id: "test-campaign",
  posts: [
    { id: "repeat", series: "Discovery", hook: "Repeat" },
    { id: "rewrite", series: "Arrival", hook: "Rewrite" },
    { id: "low-reach", series: "Discovery", hook: "Low reach" },
  ],
};
const checkpoint = (overrides = {}) => ({
  socialImpressions: 100,
  socialEngagements: 5,
  attributedVisits: 20,
  saves: 0,
  directions: 0,
  shares: 0,
  crumbStarts: 0,
  crumbSubmissions: 0,
  returnPromptShown: 0,
  returnPromptAccepted: 0,
  returnPromptDismissed: 0,
  returnPromptVariants: {
    "help-next-person": { shown: 0, accepted: 0, dismissed: 0 },
    "leave-breadcrumb": { shown: 0, accepted: 0, dismissed: 0 },
  },
  nonTeamResponses: 0,
  ...overrides,
});
const results = {
  campaignId: "test-campaign",
  round: 1,
  posts: [
    { id: "repeat", checkpoints: { "24h": null, "7d": checkpoint({ saves: 2, directions: 2, crumbStarts: 1, crumbSubmissions: 1, nonTeamResponses: 1 }) } },
    { id: "rewrite", checkpoints: { "24h": null, "7d": checkpoint() } },
    { id: "low-reach", checkpoints: { "24h": null, "7d": checkpoint({ attributedVisits: 2, saves: 1 }) } },
  ],
};

validateResults(campaign, results);
const evaluation = evaluateResults(campaign, results);
assert.equal(evaluation.complete, true);
assert.equal(evaluation.posts.find((post) => post.id === "repeat").decision, "repeat");
assert.equal(evaluation.posts.find((post) => post.id === "rewrite").decision, "rewrite");
assert.equal(evaluation.posts.find((post) => post.id === "low-reach").decision, "insufficient-reach");
assert.equal(
  evaluateResults(campaign, {
    ...results,
    posts: results.posts.map((post) => post.id === "repeat"
      ? { ...post, checkpoints: { ...post.checkpoints, "7d": checkpoint({
        returnPromptShown: 10,
        returnPromptAccepted: 3,
        returnPromptDismissed: 4,
        returnPromptVariants: {
          "help-next-person": { shown: 5, accepted: 1, dismissed: 2 },
          "leave-breadcrumb": { shown: 5, accepted: 2, dismissed: 2 },
        },
      }) } }
      : post),
  }).posts.find((post) => post.id === "repeat").metrics.returnPromptAcceptanceRate,
  0.3,
);
assert.equal(
  evaluateResults(campaign, {
    ...results,
    posts: results.posts.map((post) => post.id === "repeat"
      ? { ...post, checkpoints: { ...post.checkpoints, "7d": checkpoint({
        returnPromptShown: 10,
        returnPromptAccepted: 3,
        returnPromptDismissed: 4,
        returnPromptVariants: {
          "help-next-person": { shown: 5, accepted: 1, dismissed: 2 },
          "leave-breadcrumb": { shown: 5, accepted: 2, dismissed: 2 },
        },
      }) } }
      : post),
  }).returnPromptVariants["leave-breadcrumb"].acceptanceRate,
  0.4,
);
assert.throws(() => validateResults(campaign, {
  ...results,
  posts: results.posts.map((post) => post.id === "repeat"
    ? { ...post, checkpoints: { ...post.checkpoints, "7d": checkpoint({ crumbStarts: 0, crumbSubmissions: 1 }) } }
    : post),
}), /cannot exceed/);
assert.throws(() => validateResults(campaign, {
  ...results,
  posts: results.posts.map((post) => post.id === "repeat"
    ? { ...post, checkpoints: { ...post.checkpoints, "7d": checkpoint({
      returnPromptShown: 1,
      returnPromptAccepted: 2,
      returnPromptVariants: {
        "help-next-person": { shown: 1, accepted: 2, dismissed: 0 },
        "leave-breadcrumb": { shown: 0, accepted: 0, dismissed: 0 },
      },
    }) } }
    : post),
}), /returnPromptAccepted cannot exceed/);

console.log("Discovery experiment validation and decision checks passed.");
