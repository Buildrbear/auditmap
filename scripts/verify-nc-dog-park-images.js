const fs = require("node:fs");
const path = require("node:path");

const sitemap = fs.readFileSync("sitemap.xml", "utf8");
const pagePaths = [...sitemap.matchAll(/<loc>https:\/\/www\.auditmap\.org(\/us\/nc\/[^<]+)<\/loc>/g)]
  .map((match) => match[1]);

const failures = [];
const dogParkPages = [];
const dogAreaFeatures = [];

function isDogAreaFeature(feature) {
  const type = String(feature.feature_type || "").replace(/[_-]/g, " ");
  const name = feature.name || "";
  return /\bdog area\b/i.test(type) || /\b(dog park|dog run|barkyard|bark park|off-leash)\b/i.test(name);
}

function validateImage(imageUrl, context) {
  if (!imageUrl) {
    failures.push({ ...context, reason: "primary image missing" });
    return;
  }
  if (imageUrl.startsWith("/") && !fs.existsSync(path.join(`.${imageUrl}`))) {
    failures.push({ ...context, imageUrl, reason: "local image file missing" });
  }
}

for (const pagePath of pagePaths) {
  const filePath = path.join(`.${pagePath}`, "index.html");
  if (!fs.existsSync(filePath)) continue;
  const html = fs.readFileSync(filePath, "utf8");
  const match = html.match(/<script id="search-place-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) continue;
  const place = JSON.parse(match[1]);

  const identity = `${place.name || ""} ${place.type || ""}`;
  if (/\b(dog park|dog run|bark park|barkyard|off-leash)\b/i.test(identity)) {
    const primary = place.image || place.images?.[0];
    const record = { pagePath, id: place.id, name: place.name, imageUrl: primary?.url || null };
    dogParkPages.push(record);
    validateImage(primary?.url, { pagePath, id: place.id, name: place.name });
    if (primary && !/\b(dog|bark|canine|off-leash)\b/i.test(`${primary.alt || ""} ${primary.url || ""}`)) {
      failures.push({ ...record, reason: "primary image is not identified as dog-park-specific" });
    }
  }

}

const featureSources = [
  ...JSON.parse(fs.readFileSync("data/institutions.json", "utf8")).filter((place) => place.state === "NC"),
  ...(JSON.parse(fs.readFileSync("data/generated/all-subsites-ready.json", "utf8")).parks || [])
    .filter((place) => place.state === "NC"),
];

for (const place of featureSources) {
  for (const feature of (place.features || []).filter(isDogAreaFeature)) {
    const imageUrl = feature.details?.imageUrl || null;
    const record = { parkId: place.id, parkName: place.name, featureId: feature.id, name: feature.name, imageUrl };
    dogAreaFeatures.push(record);
    validateImage(imageUrl, record);
  }
}

const report = {
  valid: failures.length === 0,
  dogParkPagesChecked: dogParkPages.length,
  dogAreaFeaturesChecked: dogAreaFeatures.length,
  localPrimaryImages: dogParkPages.filter((place) => place.imageUrl?.startsWith("/")).length,
  dogParkPages,
  dogAreaFeatures,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (!report.valid) process.exitCode = 1;
