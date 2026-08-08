#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const args = Object.fromEntries(process.argv.slice(2).map((value, index, list) => value.startsWith("--") ? [value.slice(2), list[index + 1]] : null).filter(Boolean));
for (const key of ["selections", "output"]) if (!args[key]) throw new Error(`Missing --${key}`);
const selections = JSON.parse(fs.readFileSync(path.join(root, args.selections), "utf8"));

(async () => {
  const params = new URLSearchParams({ format: "jsonv2", polygon_geojson: "1", osm_ids: Object.values(selections.places).join(",") });
  const response = await fetch(`https://nominatim.openstreetmap.org/lookup?${params}`, { headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org" } });
  if (!response.ok) throw new Error(`Nominatim returned ${response.status}`);
  const results = await response.json();
  const byId = new Map(results.map((item) => [`${item.osm_type[0].toUpperCase()}${item.osm_id}`, item]));
  const output = { checkedAt: selections.checkedAt, reviewMethod: selections.reviewMethod, places: {} };
  for (const [id, osmId] of Object.entries(selections.places)) {
    const item = byId.get(osmId);
    if (!item?.geojson || !["Polygon", "MultiPolygon"].includes(item.geojson.type)) throw new Error(`${id}: reviewed boundary ${osmId} did not return a polygon`);
    output.places[id] = {
      displayName: item.display_name, osmId, source: "OpenStreetMap reviewed park boundary",
      sourceUrl: `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`,
      reviewStatus: "approved-name-and-location-match", reviewedAt: selections.checkedAt, geojson: item.geojson,
    };
  }
  fs.mkdirSync(path.dirname(path.join(root, args.output)), { recursive: true });
  fs.writeFileSync(path.join(root, args.output), `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Approved ${Object.keys(output.places).length} park boundaries.`);
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
