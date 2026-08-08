const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { evaluateResults, validateResults } = require("./lib/passport-distribution-experiment");
const { taggedUrl, xLength } = require("./generate-passport-campaign-brief");

const root = path.resolve(__dirname, "..");
const campaign = JSON.parse(fs.readFileSync(path.join(root, "data/discovery-campaigns/raleigh-passport-pilot.json"), "utf8"));
const emptyResults = JSON.parse(fs.readFileSync(path.join(root, "data/discovery-campaigns/raleigh-passport-pilot-results.json"), "utf8"));
validateResults(campaign, emptyResults);
assert.equal(evaluateResults(campaign, emptyResults).complete, false);
assert.equal(new Set(campaign.variants.map(({ motivation }) => motivation)).size, 3);

const checkpoint = (overrides = {}) => ({
  socialImpressions: 100,
  socialEngagements: 8,
  passportOpens: 20,
  placesMarked: 4,
  progressShares: 0,
  sharedPassportOpens: 0,
  contributionIntents: 0,
  crumbSubmissions: 0,
  nonTeamResponses: 0,
  ...overrides,
});
const measuredResults = {
  ...emptyResults,
  variants: [
    { id: "progress-challenge", checkpoints: { "24h": null, "7d": checkpoint({ progressShares: 2, sharedPassportOpens: 1 }) } },
    { id: "exploring-person", checkpoints: { "24h": null, "7d": checkpoint({ passportOpens: 2, placesMarked: 1 }) } },
    { id: "leave-a-breadcrumb", checkpoints: { "24h": null, "7d": checkpoint({ contributionIntents: 2, crumbSubmissions: 1 }) } },
  ],
};
const evaluation = evaluateResults(campaign, measuredResults);
assert.equal(evaluation.complete, true);
assert.equal(evaluation.variants.find(({ id }) => id === "progress-challenge").decision, "repeat");
assert.equal(evaluation.variants.find(({ id }) => id === "exploring-person").decision, "insufficient-reach");
assert.equal(evaluation.variants.find(({ id }) => id === "leave-a-breadcrumb").decision, "repeat-and-expand");
assert.doesNotThrow(() => validateResults(campaign, {
  ...measuredResults,
  variants: measuredResults.variants.map((variant) => variant.id === "progress-challenge"
    ? { ...variant, checkpoints: { ...variant.checkpoints, "7d": checkpoint({ passportOpens: 2, placesMarked: 7, progressShares: 3, sharedPassportOpens: 8 }) } }
    : variant),
}), "One passport can produce several marks and one share can produce several referral opens");
assert.throws(() => validateResults(campaign, {
  ...measuredResults,
  variants: measuredResults.variants.map((variant) => variant.id === "leave-a-breadcrumb"
    ? { ...variant, checkpoints: { ...variant.checkpoints, "7d": checkpoint({ contributionIntents: 0, crumbSubmissions: 1 }) } }
    : variant),
}), /cannot exceed/);

for (const variant of campaign.variants) {
  const url = new URL(taggedUrl(variant));
  assert.equal(url.hostname, "www.auditmap.org");
  assert.ok(xLength(variant.copy) <= 280, `${variant.id} must fit X with its link`);
  assert.match(variant.copy, /Find your way\. Share what you find\.$/);
}

console.log("Passport distribution variants, honest unknowns, attribution URLs, and decision rules passed.");
