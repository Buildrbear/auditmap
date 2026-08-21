const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = JSON.parse(fs.readFileSync(path.join(root, "data/discovery-campaigns/raleigh-pilot.json"), "utf8"));
const output = JSON.parse(fs.readFileSync(path.join(root, "data/generated/discovery-campaigns/raleigh-discovery-pilot.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "discover/raleigh/index.html"), "utf8");
const queue = fs.readFileSync(path.join(root, "preview/raleigh-discovery-pilot-social-queue.md"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

assert.equal(campaign.status, "review", "The pilot must remain review-only");
assert.equal(output.posts.length, 7, "The first experiment should contain seven daily drafts");
assert.equal(new Set(output.posts.map((post) => post.id)).size, output.posts.length, "Post IDs must be unique");

for (const post of output.posts) {
  assert.equal(post.place.path.startsWith("/us/nc/raleigh/"), true, `${post.id} must stay in Raleigh`);
  assert.match(post.url, /utm_campaign=raleigh_discovery_pilot/);
  assert.match(post.url, new RegExp(`utm_content=${post.id}`));
  assert.ok(post.answer.source.startsWith("http"), `${post.id} needs a public source`);
  assert.ok(post.answer.sourceLabel, `${post.id} needs a source label`);
  assert.match(post.answer.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(post.image.license, /public domain|cc0|cc by|cc-by|creative commons/i);
  assert.ok(post.image.author && post.image.source && post.image.alt, `${post.id} image attribution is incomplete`);
  assert.ok(post.visualMatch && post.visualMatch.length >= 24, `${post.id} needs a visual-subject match review`);
  assert.ok(post.estimatedXLength <= 280, `${post.id} exceeds a standard X post`);
  assert.ok(queue.includes(`## Day ${post.day}: ${post.id}`));
}

for (const contract of [
  '<link rel="canonical" href="https://www.auditmap.org/discover/raleigh/"',
  "There’s more around Raleigh than you know.",
  "Share what you find",
  "data-discovery-link",
  "/_vercel/insights/script.js",
]) assert.ok(html.includes(contract), `Raleigh discovery page is missing: ${contract}`);

for (const contract of ["trackAuditMapEvent", "utm_campaign", "contribute", "openAuditMapCrumb"]) {
  assert.ok(app.includes(contract), `Destination loop is missing: ${contract}`);
}

console.log("Raleigh discovery landing, seven-day social queue, evidence gates, and contribution loop checks passed.");
