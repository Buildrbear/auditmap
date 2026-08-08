const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.resolve(process.env.AUDITMAP_DAILY_PREVIEW_DIR || path.join(os.tmpdir(), "auditmap-national-daily-release-preview"));
const queue = JSON.parse(fs.readFileSync(path.join(root, "data/generated/marketing/national-daily-discovery.json"), "utf8"));
const routes = queue.posts.map((post) => `${new URL(post.url).pathname.replace(/^\//, "").replace(/\/$/, "")}/index.html`);
const placeIds = new Set(queue.posts.map((post) => post.placeId));
const files = ["app.js", "config.js", "index.html", "logo.svg", "package.json", "styles.css", "vercel.json", ...routes];

function copy(relative) {
  const source = path.join(root, relative);
  const destination = path.join(output, relative);
  if (!fs.existsSync(source)) throw new Error(`Missing release input: ${relative}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function localAssets(value, found = new Set()) {
  if (typeof value === "string") {
    for (const match of value.match(/\/assets\/[A-Za-z0-9_./%+-]+/g) || []) found.add(decodeURIComponent(match).replace(/^\//, ""));
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

const sourceFiles = ["data/institutions.json", "data/generated/launch-map-places.json"];
const merged = new Map();
for (const file of sourceFiles) {
  for (const place of JSON.parse(fs.readFileSync(path.join(root, file), "utf8"))) merged.set(place.id, place);
}
const selected = [...placeIds].map((id) => merged.get(id)).filter(Boolean);
if (selected.length !== placeIds.size) throw new Error(`Expected ${placeIds.size} preview places, found ${selected.length}`);
const institutionsOutput = path.join(output, "data/institutions.json");
fs.mkdirSync(path.dirname(institutionsOutput), { recursive: true });
fs.writeFileSync(institutionsOutput, `${JSON.stringify(selected)}\n`);

const assets = localAssets(selected);
for (const route of routes) localAssets(fs.readFileSync(path.join(root, route), "utf8"), assets);
for (const asset of assets) copy(asset);
if (fs.existsSync(path.join(root, ".vercel/project.json"))) copy(".vercel/project.json");

const bytes = fs.readdirSync(output, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .reduce((total, entry) => total + fs.statSync(path.join(entry.parentPath, entry.name)).size, 0);
const manifest = {
  generatedAt: new Date().toISOString(),
  scope: "National daily discovery rotation, 14 exact destination pages, and interaction runtime",
  placeIds: [...placeIds],
  routes,
  localAssets: assets.size,
  bytes,
  limitations: ["No Preview-scoped database credentials are added", "Only campaign destinations are included"],
};
fs.writeFileSync(path.join(output, "release-preview-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ output, ...manifest }, null, 2));
