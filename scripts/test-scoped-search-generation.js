#!/usr/bin/env node
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "auditmap-scoped-generate-"));
const generator = path.join(root, "scripts/generate-search-pages.js");
const deferredCampaign = path.join(outputRoot, "deferred-campaign.json");

function run(args) {
  return spawnSync(process.execPath, [generator, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, AUDITMAP_OUTPUT_ROOT: outputRoot },
  });
}

try {
  const staleSubsite = path.join(
    outputRoot,
    "us/md/baltimore/parks/druid-hill-park/obsolete-subsite/index.html",
  );
  fs.mkdirSync(path.dirname(staleSubsite), { recursive: true });
  fs.writeFileSync(staleSubsite, "stale generated page");

  const result = run(["--parks", "launch-md-baltimore-druid-hill-park"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Scoped generation complete: 1 parent place/);

  const expected = [
    "us/md/index.html",
    "us/md/baltimore/parks/index.html",
    "us/md/baltimore/parks/druid-hill-park/index.html",
    "us/md/baltimore/parks/druid-hill-park/features.json",
    "us/md/baltimore/parks/druid-hill-park/druid-lake/index.html",
  ];
  for (const relativePath of expected) {
    assert.equal(fs.existsSync(path.join(outputRoot, relativePath)), true, `${relativePath} was not generated`);
  }

  const forbidden = [
    "sitemap.xml",
    "us/index.html",
    "us/ca/index.html",
    "data/generated/official-catalog.json",
    "data/generated/launch-map-places.json",
  ];
  for (const relativePath of forbidden) {
    assert.equal(fs.existsSync(path.join(outputRoot, relativePath)), false, `${relativePath} should not be generated in scoped mode`);
  }
  assert.equal(fs.existsSync(staleSubsite), false, "obsolete scoped subsite page was not removed");

  const invalid = run(["--parks", "not-a-real-auditmap-place"]);
  assert.notEqual(invalid.status, 0, "unknown IDs must fail closed");
  assert.match(invalid.stderr, /Unknown park IDs/);

  fs.writeFileSync(deferredCampaign, JSON.stringify({ places: [{ id: "unused", deferRelease: true }] }));
  const empty = run(["--campaign", deferredCampaign]);
  assert.notEqual(empty.status, 0, "an empty publishable campaign must fail closed");
  assert.match(empty.stderr, /did not select any publishable places/);
  console.log("Scoped search generation verified.");
} finally {
  fs.rmSync(outputRoot, { recursive: true, force: true });
}
