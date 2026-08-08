const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const resultsPath = path.join(root, "data/discovery-campaigns/raleigh-passport-pilot-results.json");
const original = fs.readFileSync(resultsPath, "utf8");
const fixture = path.join(root, "data/discovery-campaigns/test-passport-events.json");
const event = (name, content, properties = {}) => ({ name, properties: { content, loop: "explorer-passport", ...properties } });
const events = [
  event("Explorer passport opened", "progress_challenge"),
  event("Explorer place marked", "progress_challenge", { marked: true }),
  event("Explorer place marked", "progress_challenge", { marked: false }),
  event("Explorer progress shared", "progress_challenge"),
  event("Shared passport opened", "progress_challenge_share"),
  event("Explorer passport opened", "leave_a_breadcrumb"),
  event("Explorer contribution opened", "leave_a_breadcrumb"),
  event("Crumb submitted", "leave_a_breadcrumb"),
];

try {
  fs.writeFileSync(fixture, JSON.stringify({ events }));
  execFileSync(process.execPath, [path.join(root, "scripts/import-passport-campaign-events.js"), path.relative(root, fixture), "24h"]);
  const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
  const progress = results.variants.find(({ id }) => id === "progress-challenge").checkpoints["24h"];
  const stewardship = results.variants.find(({ id }) => id === "leave-a-breadcrumb").checkpoints["24h"];
  assert.equal(progress.passportOpens, 1);
  assert.equal(progress.placesMarked, 1, "Unmarking must not inflate activation");
  assert.equal(progress.sharedPassportOpens, 1);
  assert.equal(stewardship.crumbSubmissions, 1);
  assert.equal(progress.socialImpressions, null, "The importer must not turn unknown X metrics into zero");
  assert.equal(progress.nonTeamResponses, null, "Manual community evidence must remain unknown until entered");
} finally {
  fs.writeFileSync(resultsPath, original);
  fs.rmSync(fixture, { force: true });
}

const passport = fs.readFileSync(path.join(root, "explorer-passport.js"), "utf8");
assert.match(passport, /campaignContents/);
assert.match(passport, /attributionContent/);
assert.match(passport, /trackOncePerSession/);
assert.match(passport, /card\.querySelectorAll\('a\[href\^="\/us\/"\]'\)/);
assert.match(passport, /destination\.searchParams\.set\("utm_content", attributionContent\)/);
assert.match(passport, /destination\.searchParams\.set\("utm_term", place\)/);
assert(!passport.includes("userId"));
console.log("Passport message attribution, referral continuity, contribution handoff, and unknown preservation passed.");
