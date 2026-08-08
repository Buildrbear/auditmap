const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const input = path.join(os.tmpdir(), "auditmap-community-reply-queue.json");
const output = path.join(os.tmpdir(), "auditmap-community-reply-drafts.md");
const queue = {
  needs: [
    { key: "dix-park:parking", placeName: "Dix Park", intentLabel: "Parking", status: "answer-ready", answer: "Use marked paved or gravel lots rather than grass or roadside parking.", source: "https://dixpark.org/visit", sourceLabel: "Dix Park", checkedAt: "2026-08-01", expiresAt: "2026-08-13", answerUrl: "https://www.auditmap.org/us/nc/raleigh/parks/dix-park/" },
    { key: "chavis:parking", placeName: "John Chavis Memorial Park", intentLabel: "Parking", status: "recheck-required", answerUrl: "https://www.auditmap.org/us/nc/raleigh/parks/john-chavis-memorial-park/" },
  ],
};
try {
  fs.writeFileSync(input, JSON.stringify(queue));
  const result = spawnSync(process.execPath, [path.join(root, "scripts/generate-community-reply-drafts.js"), input, output], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const report = fs.readFileSync(output, "utf8");
  assert.match(report, /Dix Park: Parking/);
  assert.match(report, /Full guide and source/);
  assert.doesNotMatch(report, /John Chavis Memorial Park/);
  assert.doesNotMatch(report, /username|handle|authorName/i);
  const length = Number(report.match(/Approximate X length:\*\* (\d+)\/280/)?.[1]);
  assert.ok(length > 0 && length <= 280);
} finally {
  fs.rmSync(input, { force: true });
  fs.rmSync(output, { force: true });
}
console.log("Community reply evidence, freshness, privacy, and X-length contracts passed.");
