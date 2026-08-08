#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const args = Object.fromEntries(process.argv.slice(2).map((value, index, list) => value.startsWith("--") ? [value.slice(2), list[index + 1]] : null).filter(Boolean));
for (const key of ["selections", "nearby", "inside", "output"]) if (!args[key]) throw new Error(`Missing --${key}`);
const selections = JSON.parse(fs.readFileSync(path.join(root, args.selections), "utf8"));
const nearby = JSON.parse(fs.readFileSync(path.join(root, args.nearby), "utf8"));
const inside = JSON.parse(fs.readFileSync(path.join(root, args.inside), "utf8"));
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const output = { checkedAt: selections.checkedAt, reviewMethod: selections.reviewMethod, places: {} };
for (const [id, features] of Object.entries(selections.places)) {
  if (!nearby.places[id]) {
    if (features.length) throw new Error(`${id}: selected features require nearby map research`);
    output.places[id] = {};
    console.log(`${id}: skipped empty deferred feature selection`);
    continue;
  }
  const pool = nearby.places[id]?.candidates || [];
  const inBoundary = new Set((inside.places[id]?.candidates || []).map((item) => `${item.osmType}/${item.osmId}`));
  output.places[id] = {};
  for (const feature of features) {
    const candidate = pool.find((item) => `${item.osmType}/${item.osmId}` === feature.osm);
    if (!candidate) throw new Error(`${id}/${feature.name}: selected map object missing`);
    const officialCampusException = (id === "launch-ca-san-jose-guadalupe-river-park" && feature.name === "Heritage Rose Garden") || feature.allowOutsideBoundary === true;
    if (!inBoundary.has(feature.osm) && !officialCampusException) throw new Error(`${id}/${feature.name}: selected map object is outside the reviewed park boundary`);
    output.places[id][slug(feature.name)] = {
      ...feature, latitude: candidate.latitude, longitude: candidate.longitude, displayName: candidate.name,
      coordinateSource: candidate.sourceUrl,
      boundarySource: inside.places[id]?.boundarySource,
      positionQuality: officialCampusException ? "reviewed-official-campus-placement" : "reviewed-public-map-placement",
      reviewStatus: officialCampusException ? "approved-official-campus-extension" : "approved-feature-and-boundary-match",
      boundaryExceptionReason: officialCampusException ? feature.boundaryExceptionReason || "Official destination extends beyond the mapped parent boundary." : undefined,
      reviewedAt: selections.checkedAt,
    };
  }
  console.log(`${nearby.places[id].name}: ${features.length} publishable feature coordinates`);
}
fs.mkdirSync(path.dirname(path.join(root, args.output)), { recursive: true });
fs.writeFileSync(path.join(root, args.output), `${JSON.stringify(output, null, 2)}\n`);
