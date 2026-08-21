const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.resolve(process.env.AUDITMAP_PASSPORT_PREVIEW_DIR || path.join(os.tmpdir(), "auditmap-passport-release-preview"));
const placeRoutes = [
  "us/nc/raleigh/parks/dix-park/index.html",
  "us/nc/raleigh/parks/pullen-park/index.html",
  "us/nc/raleigh/parks/john-chavis-memorial-park/index.html",
  "us/nc/raleigh/parks/moore-square/index.html",
  "us/nc/raleigh/parks/john-winters-park/index.html",
];
const placeIds = new Set(["dix-park", "pullen-park", "john-chavis-memorial-park", "moore-square", "basic-osm-way-33106145"]);
const files = [
  "app.js",
  "config.js",
  "explorer-passport.css",
  "explorer-passport.js",
  "index.html",
  "logo.svg",
  "package.json",
  "styles.css",
  "vercel.json",
  "discover/raleigh/passport/index.html",
  ...placeRoutes,
];

function copy(relative) {
  const source = path.join(root, relative);
  const destination = path.join(output, relative);
  if (!fs.existsSync(source)) throw new Error(`Missing release input: ${relative}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function localAssets(value, found = new Set()) {
  if (typeof value === "string") {
    const matches = value.match(/\/assets\/[A-Za-z0-9_./%+-]+/g) || [];
    for (const match of matches) found.add(decodeURIComponent(match).replace(/^\//, ""));
  } else if (Array.isArray(value)) {
    for (const item of value) localAssets(item, found);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) localAssets(item, found);
  }
  return found;
}

if (!output.startsWith(os.tmpdir())) throw new Error("Release preview output must stay in the system temporary directory");
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const file of files) copy(file);
fs.cpSync(path.join(root, "api"), path.join(output, "api"), { recursive: true });
for (const file of ["data/generated/official-catalog.json", "data/generated/enrichment-queue.json"]) copy(file);

const places = JSON.parse(fs.readFileSync(path.join(root, "data/institutions.json"), "utf8"));
const selected = places.filter(({ id }) => placeIds.has(id));
if (selected.length !== placeIds.size) throw new Error(`Expected ${placeIds.size} preview places, found ${selected.length}`);
const institutionsOutput = path.join(output, "data/institutions.json");
fs.mkdirSync(path.dirname(institutionsOutput), { recursive: true });
fs.writeFileSync(institutionsOutput, `${JSON.stringify(selected)}\n`);

const assets = localAssets(selected);
for (const file of ["discover/raleigh/passport/index.html", ...placeRoutes]) {
  localAssets(fs.readFileSync(path.join(root, file), "utf8"), assets);
}
for (const asset of assets) copy(asset);

const vercelLink = ".vercel/project.json";
if (fs.existsSync(path.join(root, vercelLink))) copy(vercelLink);

const bytes = fs.readdirSync(output, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .reduce((total, entry) => total + fs.statSync(path.join(entry.parentPath, entry.name)).size, 0);
const manifest = {
  generatedAt: new Date().toISOString(),
  scope: "Raleigh passport plus five parent park pages and contribution runtime",
  placeIds: [...placeIds],
  routes: ["discover/raleigh/passport/index.html", ...placeRoutes],
  localAssets: assets.size,
  bytes,
  limitations: ["No Preview-scoped database credentials are added", "Nationwide pages are intentionally excluded"],
};
fs.writeFileSync(path.join(output, "release-preview-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ output, ...manifest }, null, 2));
