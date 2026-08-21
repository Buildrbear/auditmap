const assert = require("node:assert/strict");
const { importDiscoveryEvents } = require("./lib/discovery-event-import");
const { validateResults } = require("./lib/discovery-experiment");

const campaign = {
  id: "national-daily-discovery-v1",
  campaign: "national_daily_discovery",
  posts: [
    { id: "day_01_alpha", series: "Daily public place", hook: "Daily reminder" },
    { id: "day_02_beta", series: "Daily public place", hook: "Daily reminder" },
  ],
};
const blank = () => ({
  socialImpressions: 100,
  socialEngagements: 7,
  attributedVisits: 0,
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
  nonTeamResponses: 1,
});
const results = {
  campaignId: campaign.id,
  round: 1,
  posts: campaign.posts.map(({ id }) => ({ id, checkpoints: { "24h": blank(), "7d": null } })),
};
const event = (name, content, extra = {}) => ({ name, properties: { campaign: campaign.campaign, content, ...extra } });
const events = [
  event("Campaign landing", "day_01_alpha"),
  event("Campaign landing", "day_01_alpha"),
  event("Place saved", "day_01_alpha", { saved: true }),
  event("Place saved", "day_01_alpha", { saved: false }),
  event("Directions opened", "day_01_alpha"),
  event("Place shared", "day_01_alpha"),
  event("Crumb started", "day_01_alpha"),
  event("Crumb submitted", "day_01_alpha"),
  event("Return contribution prompt shown", "day_01_alpha", { variant: "leave-breadcrumb" }),
  event("Return contribution prompt accepted", "day_01_alpha", { variant: "leave-breadcrumb" }),
  event("Campaign landing", "day_02_beta"),
  event("Campaign landing", "day_01_alpha", { campaign: "another_campaign" }),
  event("Campaign landing", "unknown_post"),
];

const updated = importDiscoveryEvents(campaign, results, events, "24h");
validateResults(campaign, updated);
const alpha = updated.posts[0].checkpoints["24h"];
const beta = updated.posts[1].checkpoints["24h"];
assert.equal(alpha.socialImpressions, 100);
assert.equal(alpha.nonTeamResponses, 1);
assert.equal(alpha.attributedVisits, 2);
assert.equal(alpha.saves, 1);
assert.equal(alpha.directions, 1);
assert.equal(alpha.shares, 1);
assert.equal(alpha.crumbSubmissions, 1);
assert.equal(alpha.returnPromptVariants["leave-breadcrumb"].accepted, 1);
assert.equal(beta.attributedVisits, 1);
assert.throws(() => importDiscoveryEvents(campaign, {
  ...results,
  posts: results.posts.map((post) => ({ ...post, checkpoints: { ...post.checkpoints, "24h": null } })),
}, events, "24h"), /needs non-negative socialImpressions/);
const initialized = importDiscoveryEvents(campaign, {
  ...results,
  posts: results.posts.map((post) => ({ ...post, checkpoints: { ...post.checkpoints, "24h": null } })),
}, events, "24h", campaign.posts.map(({ id }) => ({
  id,
  socialImpressions: 50,
  socialEngagements: 3,
  nonTeamResponses: 0,
})));
assert.equal(initialized.posts[0].checkpoints["24h"].socialImpressions, 50);
assert.equal(initialized.posts[0].checkpoints["24h"].attributedVisits, 2);
console.log("National discovery event import attribution, counting, and unknown-social safeguards passed.");
