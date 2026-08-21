const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
execFileSync(process.execPath, [path.join(root, "scripts/generate-explorer-passport.js")]);
const html = fs.readFileSync(path.join(root, "discover/raleigh/passport/index.html"), "utf8");
const script = fs.readFileSync(path.join(root, "explorer-passport.js"), "utf8");
const campaign = require("../data/discovery-campaigns/raleigh-explorer-passport.json");

assert.equal(campaign.placeIds.length, 5);
assert.equal(new Set(campaign.placeIds).size, 5);
for (const id of campaign.placeIds) assert(html.includes(`data-passport-place="${id}"`), `Missing passport card: ${id}`);
assert.equal((html.match(/data-passport-place=/g) || []).length, 5);
assert(!html.includes("Official museum source; attribution retained"), "Passport must not rely on unclear museum image reuse rights.");
assert(!html.includes("Official municipal park source; attribution retained"), "Passport must not rely on unclear municipal image reuse rights.");
assert(!/visitors commonly|people appreciate|people praise/i.test(html), "Passport cards must use factual visitor framing rather than review-style synthesis.");
assert(html.includes("CC BY-SA 3.0"), "Pullen passport image must retain its Wikimedia license.");
assert(html.includes("rel=\"canonical\""));
assert(html.includes("Leave a breadcrumb from this place"));
assert(script.includes("localStorage.setItem(storageKey"), "Own progress must stay local by default.");
assert(script.includes("if (sharedMode) return"), "Shared progress must not overwrite recipient history.");
assert(script.includes("allowed.has(id)"), "Shared place IDs must be allowlisted.");
assert(script.includes("slice(0, places.length)"), "Shared progress must be capped.");
for (const event of ["Explorer passport opened", "Explorer place marked", "Explorer progress shared", "Shared passport opened", "Explorer contribution opened"]) assert(script.includes(event), `Missing event: ${event}`);
assert(!/geolocation|watchPosition|getCurrentPosition/.test(script), "Passport must not collect location.");
console.log("Explorer passport generation, image rights, privacy, sharing, and contribution contracts passed.");
