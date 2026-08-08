const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const ask = read("api/ask.js");
const feed = read("api/feed.js");
const knowledge = read("api/knowledge.js");
const moderation = read("api/moderation.js");
const schema = read("supabase/schema.sql");
const admin = read("admin.js");
const adminHtml = read("admin.html");

for (const source of [ask, feed]) {
  assert.match(source, /answer_status:\s*"needs_verification"/);
  assert.match(source, /status:\s*"open"/);
  assert.match(source, /aiDraft/);
}
assert.match(knowledge, /answer_status=in\.\(answered,partial\)/);
assert.match(knowledge, /status=eq\.answered/);
assert.match(schema, /answer_status in \('answered', 'partial'\)/);
assert.match(moderation, /Approve sourced answer|queued for a visitor follow-up/);
assert.match(moderation, /followUpStatus:\s*"queued"/);
assert.match(moderation, /request\.query\.status === "followups"/);
assert.match(adminHtml, /data-review-filter="followups"/);
assert.match(admin, /data-copy-followup/);
assert.match(admin, /followup_prepared/);
assert.match(feed, /answerStatus:\s*stored \? stored\.status : "needs_verification"/);
assert.match(read("app.js"), /AI answer · needs review/);

console.log("Question capture, review boundary, reusable knowledge, and follow-up queue contracts passed.");
