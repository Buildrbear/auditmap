#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  root = path.resolve(__dirname, ".."),
  campaign = require("../data/indianapolis-super-enrichment-campaign.json"),
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
    dir = path.join(root, "us/in/indianapolis/parks", slug(scope.name));
  need(p, `${scope.name}: missing record`);
  if (!p) continue;
  need(
    1 + (p.images?.length || 0) >= 4,
    `${scope.name}: fewer than four photos`,
  );
  need(p.image?.url, `${scope.name}: hero missing`);
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
const holliday = places.find((place) => place.id === "launch-in-indianapolis-holliday-park");
need(holliday?.features.find((feature) => feature.slug === "holliday-park-playground")?.details?.imageUrl?.includes("holliday-park-nature"), "Holliday playground: family-oriented photo missing");
const broadRipple = places.find((place) => place.id === "launch-in-indianapolis-broad-ripple-park");
need(broadRipple?.image?.url?.includes("family-center"), "Broad Ripple: current Family Center hero missing");
for (const phrase of [
  "beginning at $10",
  "$6 per resident vehicle",
  "Conservatory and Sunken Garden are closed Monday",
  "opened in November 2025",
  "restored Sunken Garden fountains reopened in June 2026",
  "$9 for out-of-state plates",
  "Saddle Barn is temporarily closed for the 2026 recreation season",
  "multi-phase redevelopment",
  "two-story indoor play structure",
  "announce passes",
])
  need(joined.includes(phrase), `Missing Indianapolis guidance: ${phrase}`);
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
need(app.includes("daylightMatch"), "Opening-to-dark hours support missing");
need(app.includes('label: "Hours vary"'), "Independent-hours support missing");
if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log(
  `Verified ${campaign.places.length} Indianapolis guides with four photos, eight mapped subsites and practical visitor answers.`,
);
