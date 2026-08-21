const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const seed = fs.readFileSync(path.join(root, "scripts/seed-demo-community.js"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const feed = fs.readFileSync(path.join(root, "api/feed.js"), "utf8");
const moderation = fs.readFileSync(path.join(root, "api/moderation.js"), "utf8");
const profile = fs.readFileSync(path.join(root, "api/profile.js"), "utf8");
const accountAuth = fs.readFileSync(path.join(root, "api/_lib/account-auth.js"), "utf8");

assert.doesNotMatch(seed, /role: "super_admin"/);
assert.equal((seed.match(/email: ".+@demo\.auditmap\.org"/g) || []).length, 6);
assert.match(seed, /profile_status: "private"/);
assert.equal((seed.match(/avatarUrl: "\/assets\/demo-avatars\//g) || []).length, 6);
assert.match(seed, /demoSeed: true/);
assert.match(seed, /\.auditmap-demo-credentials\.json/);
assert.match(feed, /item\.metadata\?\.demoSeed !== true/);
assert.match(profile, /auditmap_demo === true/);
assert.match(profile, /recentCrumbs/);
assert.match(moderation, /\["moderator", "super_admin"\]/);
assert.match(accountAuth, /auditmap_demo === true/);
assert.match(accountAuth, /return "member"/);
assert.match(moderation, /async function contributionInbox/);
assert.match(app, /Sign in with a password/);
assert.match(app, /Demo member/);
assert.match(app, /demoSessionId/);
assert.match(app, /sessionStorage\.getItem\(accountStorageKey\)/);

console.log("Demo account, privacy, role, and sign-in checks passed.");
