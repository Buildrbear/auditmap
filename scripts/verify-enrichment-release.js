#!/usr/bin/env node
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const packageDocument = require(path.join(root, "package.json"));
const verifierNames = Object.keys(packageDocument.scripts)
  .filter((name) => /^verify:.+:super$/.test(name))
  .sort();

if (!verifierNames.length) throw new Error("No super-enrichment verifier scripts found");

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const startedAt = Date.now();
for (const [index, verifierName] of verifierNames.entries()) {
  console.log(`[${index + 1}/${verifierNames.length}] ${verifierName}`);
  const result = spawnSync(npm, ["run", verifierName], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`Verified ${verifierNames.length} enrichment campaigns in ${Math.round((Date.now() - startedAt) / 1000)}s.`);
