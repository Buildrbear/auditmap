const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const result = spawnSync(process.execPath, [path.join(root, "scripts/verify-passport-launch-readiness.js")], { encoding: "utf8" });
assert.equal(result.status, 0, result.stderr);
const report = JSON.parse(result.stdout);
assert.equal(report.ready, true);
assert.equal(report.remote, false);
assert.equal(report.variants, 3);

const campaign = JSON.parse(fs.readFileSync(path.join(root, "data/discovery-campaigns/raleigh-passport-pilot.json"), "utf8"));
const brief = fs.readFileSync(path.join(root, "preview/raleigh-passport-pilot-launch.md"), "utf8");
if (campaign.status === "awaiting-production") {
  assert.match(brief, /Status:\*\* Awaiting production/);
  assert.match(brief, /Do not publish/);
} else {
  assert.equal(campaign.status, "ready");
  assert.match(brief, /Status:\*\* Ready for approved distribution/);
  assert.doesNotMatch(brief, /Do not publish/);
}
console.log("Passport local release contract and production launch guard passed.");
