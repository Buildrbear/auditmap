const assert = require("node:assert/strict");
const { aggregateNationalDiscovery } = require("./lib/national-discovery-scorecard-sync");

const metrics = (overrides = {}) => ({
  socialImpressions: 100,
  socialEngagements: 4,
  attributedVisits: 10,
  saves: 1,
  directions: 2,
  shares: 1,
  crumbStarts: 1,
  crumbSubmissions: 1,
  returnPromptShown: 0,
  returnPromptAccepted: 0,
  returnPromptDismissed: 0,
  returnPromptVariants: {},
  nonTeamResponses: 0,
  ...overrides,
});
const campaign = {
  posts: [
    { id: "one", checkpoints: { "24h": metrics(), "7d": null } },
    { id: "two", checkpoints: { "24h": metrics({ socialImpressions: 50, attributedVisits: 5, crumbSubmissions: 0 }), "7d": null } },
    { id: "three", checkpoints: { "24h": null, "7d": null } },
  ],
};
assert.equal(aggregateNationalDiscovery(campaign, "7d"), null);
assert.deepEqual(aggregateNationalDiscovery(campaign, "24h"), {
  exposures: 150,
  landings: 15,
  usefulActions: 9,
  contributions: 1,
  collectedPosts: 2,
  totalPosts: 3,
});
console.log("National campaign results aggregate honestly into the shared place-discovery loop.");
