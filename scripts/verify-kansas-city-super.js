#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  root = path.resolve(__dirname, ".."),
  campaign = require("../data/kansas-city-super-enrichment-campaign.json"),
  places = require("../data/generated/launch-map-places.json"),
  fail = [],
  slug = (v) =>
    String(v)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
const need = (ok, msg) => {
  if (!ok) fail.push(msg);
};
for (const scope of campaign.places) {
  const p = places.find((x) => x.id === scope.id),
    dir = path.join(
      root,
      "us",
      scope.state.toLowerCase(),
      slug(scope.city),
      "parks",
      slug(scope.name),
    );
  need(p, `${scope.name}: missing record`);
  if (!p) continue;
  need(p.image?.url, `${scope.name}: hero missing`);
  need(
    1 + (p.images?.length || 0) >= 4,
    `${scope.name}: fewer than four photos`,
  );
  need(p.features?.length === 8, `${scope.name}: expected eight subsites`);
  need(p.searchAnswers?.length >= 11, `${scope.name}: parent answers missing`);
  const parentFile = path.join(dir, "index.html");
  need(fs.existsSync(parentFile), `${scope.name}: parent page missing`);
  if (fs.existsSync(parentFile)) {
    const html = fs.readFileSync(parentFile, "utf8");
    for (const value of [p.name, p.address, 'rel="canonical"', "What people ask"])
      need(value && html.includes(value), `${scope.name}: raw HTML missing ${value}`);
  }
  for (const f of p.features || []) {
    need(
      Number.isFinite(f.latitude) && Number.isFinite(f.longitude),
      `${scope.name}/${f.name}: coordinates missing`,
    );
    need(
      f.details?.images?.length >= 1,
      `${scope.name}/${f.name}: image missing`,
    );
    need(
      f.details?.searchAnswers?.length >= 9,
      `${scope.name}/${f.name}: answers missing`,
    );
    need(f.details?.coordinateSource && f.details?.positionQuality, `${scope.name}/${f.name}: coordinate provenance missing`);
    const featureFile = path.join(dir, f.slug, "index.html");
    need(fs.existsSync(featureFile), `${scope.name}/${f.name}: page missing`);
    if (fs.existsSync(featureFile)) {
      const html = fs.readFileSync(featureFile, "utf8").toLowerCase();
      for (const value of [f.name, p.name, "parking", "restroom", "dogs", "sources", 'rel="canonical"'])
        need(html.includes(value.toLowerCase()), `${scope.name}/${f.name}: raw HTML missing ${value}`);
    }
  }
}
const joined = campaign.places
  .map((s) => JSON.stringify(places.find((p) => p.id === s.id) || {}))
  .join("\n");
for (const phrase of [
  "district of destinations",
  "restricted in the Rose Garden",
  "free memorial grounds",
  "closed to motorized vehicles every day",
  "paid and enforced around the clock",
  "Tuesday and Thursday 5:00-9:00 a.m.",
  "May 23-August 9",
  "first Tuesday of each month",
  "lake access 6:00 a.m.-midnight",
])
  need(joined.includes(phrase), `Missing Kansas City guidance: ${phrase}`);
const shawnee = places.find((p) => p.id === "launch-ks-shawnee-shawnee-mission-park");
need(shawnee?.features.find((f) => f.slug === "shawnee-mission-park-beach")?.details?.hours?.includes("May 23-August 9"), "Shawnee Mission Park Beach: exact 2026 season missing");
const loose = places.find((p) => p.id === "launch-mo-kansas-city-jacob-l-loose-park");
need(loose?.features.find((f) => f.slug === "loose-park-sprayground")?.details?.hours?.includes("May 23-September 7"), "Loose Park Sprayground: exact 2026 season missing");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
need(app.includes("daylightMatch"), "Opening-to-dark hours support missing");
need(app.includes('label: "Hours vary"'), "Independent-hours support missing");
if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log(
  `Verified ${campaign.places.length} Kansas City guides with four photos, eight mapped subsites and practical visitor answers.`,
);
