const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
execFileSync(process.execPath, [path.join(root, "scripts/generate-national-daily-day1-card.js")]);
const card = JSON.parse(fs.readFileSync(path.join(root, "preview/national-daily-day1-approval.json"), "utf8"));
const report = fs.readFileSync(path.join(root, "preview/national-daily-day1-approval.md"), "utf8");
assert.equal(card.placeId, "dix-park");
assert.equal(card.postId, "daily_dix-park");
assert.equal(card.checks.sourceRecorded, true);
assert.equal(card.checks.factCurrentThroughPost, true);
assert.equal(card.checks.reusableImageRecorded, true);
assert.equal(card.checks.productionContentReady, true);
assert.equal(card.checks.productionMeasurementReady, false);
assert.equal(card.status, "HOLD");
for (const phrase of ["Dix Park", "Mother Strong Tail", "CC BY-SA 4.0", "HOLD", "productionMeasurementReady"]) assert.ok(report.includes(phrase));
console.log("Day 1 card combines post, image rights, source freshness, production readiness, and fail-closed publication status.");
