const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data/generated/search-page-manifest.json"), "utf8"),
);
const sitemap = fs.readFileSync(path.join(projectRoot, "sitemap.xml"), "utf8");
const institutions = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data/institutions.json"), "utf8"),
);
const launchPlaces = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data/generated/launch-map-places.json"), "utf8"),
);
const places = [...institutions, ...launchPlaces].filter(
  (place) => place.searchCategory === "park" && place.features?.length,
);
const issues = [];
let checked = 0;

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

for (const place of places) {
  const parentPath = `/us/${slugify(place.state)}/${slugify(place.city)}/parks/${place.slug || slugify(place.name)}`;
  for (const feature of place.features) {
    checked += 1;
    const featurePath = `${parentPath}/${feature.slug || slugify(feature.name)}`;
    const filePath = path.join(projectRoot, featurePath.slice(1), "index.html");
    if (!fs.existsSync(filePath)) {
      issues.push(`${featurePath}: page missing`);
      continue;
    }
    const html = fs.readFileSync(filePath, "utf8");
    const checks = [
      [`<link rel="canonical" href="https://www.auditmap.org${featurePath}"`, "canonical"],
      [`<h1 id="place-name">${escapeHtml(feature.name)}</h1>`, "heading"],
      [`href="${parentPath}"`, "parent link"],
      ["id=\"gallery-image\" src=", "hero image"],
      ["class=\"knowledge-item\"", "visitor answers"],
      ["id=\"search-place-data\"", "embedded record"],
      ["\"isPartOf\"", "parent schema"],
    ];
    for (const [needle, label] of checks) {
      if (!html.includes(needle)) issues.push(`${featurePath}: missing ${label}`);
    }
    if (!sitemap.includes(`<loc>https://www.auditmap.org${featurePath}</loc>`)) {
      issues.push(`${featurePath}: missing from sitemap`);
    }
  }
}

if (checked !== manifest.subsitePages) {
  issues.push(`manifest count ${manifest.subsitePages} does not match ${checked} checked pages`);
}

console.log(JSON.stringify({ checked, manifest: manifest.subsitePages, issues }, null, 2));
if (issues.length) process.exit(1);
