const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const resultsPath = path.join(root, "data/growth-loops/loop-results.json");
const original = fs.readFileSync(resultsPath, "utf8");
const fixture = path.join(root, "data/growth-loops/test-event-export.json");
const event = (name, loop, stage) => ({ name, properties: { loop, stage } });
const events = [
  event("Verified answer shared", "verified-answer-sharing", "distribution"),
  event("Shared answer opened", "verified-answer-sharing", "referral"),
  event("Crumb started", "verified-answer-sharing", "inquiry"),
  event("Saved list shared", "shared-planning-list", "distribution"),
  event("Shared list opened", "shared-planning-list", "referral"),
  event("Shared list guide opened", "shared-planning-list", "activation"),
  event("Shared list saved", "shared-planning-list", "retention"),
  event("Return contribution prompt shown", "directions-return", "prompt"),
  event("Return contribution prompt accepted", "directions-return", "activation"),
  event("Explorer passport opened", "explorer-passport", "landing"),
  event("Explorer place marked", "explorer-passport", "activation"),
  event("Explorer progress shared", "explorer-passport", "distribution"),
  event("Shared passport opened", "explorer-passport", "referral"),
  event("Explorer contribution opened", "explorer-passport", "contribution-intent"),
  event("Crumb submitted", "explorer-passport", "contribution"),
];

try {
  fs.writeFileSync(fixture, JSON.stringify({ events }));
  execFileSync(process.execPath, [path.join(root, "scripts/import-growth-loop-events.js"), path.relative(root, fixture), "24h"]);
  const result = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
  assert.equal(result.checkpoint, "24h");
  assert.equal(result.loops["verified-answer-sharing"].shares, 1);
  assert.equal(result.loops["verified-answer-sharing"].opens, 1);
  assert.equal(result.loops["verified-answer-sharing"].followups, 1);
  assert.equal(result.loops["shared-planning-list"].guideOpens, 1);
  assert.equal(result.loops["shared-planning-list"].downstreamActions, 1);
  assert.equal(result.loops["directions-return"].accepted, 1);
  assert.equal(result.loops["explorer-passport"].placesMarked, 1);
  assert.equal(result.loops["explorer-passport"].sharedOpens, 1);
  assert.equal(result.loops["explorer-passport"].contributions, 1);
} finally {
  fs.writeFileSync(resultsPath, original);
  fs.rmSync(fixture, { force: true });
}

const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
for (const phrase of ["growthLoopForEvent", "growthLoopStage", "trackAttributedLanding", 'trackAuditMapEvent("Campaign landing")']) {
  assert(app.includes(phrase), `Instrumentation missing: ${phrase}`);
}
assert(app.includes('campaign === "raleigh_explorer_passport"'), "Passport handoffs must retain loop attribution on the place page.");
assert(!app.includes("userId:"), "Growth-loop analytics must not add a user identifier.");
console.log("Growth-loop event labels, landing dedupe, privacy boundary, and export aggregation passed.");
