const assert = require("node:assert/strict");
const { inspectProductionHtml } = require("./verify-national-daily-discovery-production");

const post = {
  placeName: "Example Park",
  url: "https://www.auditmap.org/us/nc/example/parks/example-park?utm_campaign=test",
  answerEvidence: { source: "https://example.gov/park?a=1&b=2" },
};
const response = { ok: true, status: 200 };
const valid = '<html><head><link rel="canonical" href="https://www.auditmap.org/us/nc/example/parks/example-park"></head><body><h1>Example Park</h1><a href="https://example.gov/park?a=1&amp;b=2">Source</a></body></html>';
assert.deepEqual(inspectProductionHtml(post, response, valid), []);
assert.match(inspectProductionHtml(post, { ok: false, status: 404 }, "not found").join(" "), /HTTP 404/);
assert.match(inspectProductionHtml(post, response, valid.replace('rel="canonical"', 'name="robots" content="noindex"')).join(" "), /canonical tag missing|noindex/);
const verifier = require("node:fs").readFileSync(require("node:path").join(__dirname, "verify-national-daily-discovery-production.js"), "utf8");
for (const marker of ["contentReady", "measurementReady", "trackAuditMapEvent", "Campaign landing", "Crumb submitted", "Directions opened", "Place saved", "Place shared", "if (!output.ready) process.exitCode = 1"]) assert.ok(verifier.includes(marker), `Missing measurement gate: ${marker}`);
console.log("National daily production name, canonical, source, status, and indexability gates passed.");
