const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const output = path.join(os.tmpdir(), "auditmap-passport-release-preview-test");
execFileSync(process.execPath, [path.join(root, "scripts/build-passport-release-preview.js")], {
  env: { ...process.env, AUDITMAP_PASSPORT_PREVIEW_DIR: output },
});
const manifest = JSON.parse(fs.readFileSync(path.join(output, "release-preview-manifest.json"), "utf8"));
assert.equal(manifest.placeIds.length, 5);
assert.equal(manifest.routes.length, 6);
assert.ok(manifest.localAssets >= 1);
assert.ok(manifest.bytes < 50 * 1024 * 1024, "Release candidate should remain below 50 MB");
for (const route of manifest.routes) assert.ok(fs.existsSync(path.join(output, route)), `Missing route: ${route}`);
for (const file of ["app.js", "explorer-passport.js", "api/feed.js", "api/knowledge.js", "data/institutions.json"]) {
  assert.ok(fs.existsSync(path.join(output, file)), `Missing runtime file: ${file}`);
}
const places = JSON.parse(fs.readFileSync(path.join(output, "data/institutions.json"), "utf8"));
assert.equal(places.length, 5, "Release candidate must not carry the nationwide data payload");
const passport = fs.readFileSync(path.join(output, "discover/raleigh/passport/index.html"), "utf8");
assert.equal((passport.match(/data-passport-place=/g) || []).length, 5);
const script = fs.readFileSync(path.join(output, "explorer-passport.js"), "utf8");
assert.match(script, /trackOncePerSession/);
assert.match(script, /destination\.searchParams\.set\("utm_content", attributionContent\)/);
assert.match(script, /destination\.searchParams\.set\("utm_term", place\)/);
fs.rmSync(output, { recursive: true, force: true });
console.log("Integrated passport release-candidate routes, assets, runtime, scope, and size passed.");
