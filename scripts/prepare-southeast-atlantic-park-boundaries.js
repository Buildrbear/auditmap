#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const reviewed = {
  "launch-sc-charleston-waterfront-park": "W1429068584",
  "launch-sc-charleston-hampton-park": "W1475410292",
  "launch-sc-charleston-white-point-garden": "W489833060",
  "launch-ga-savannah-forsyth-park": "W130173066",
  "launch-ga-savannah-skidaway-island-state-park": "W306626685",
  "launch-ga-savannah-bonaventure-cemetery": "W491501116",
  "launch-fl-jacksonville-kathryn-abbey-hanna-park": "R6756420",
  "launch-fl-jacksonville-jessie-ball-dupont-park": "W348722368",
};

(async () => {
  const params = new URLSearchParams({
    format: "jsonv2",
    polygon_geojson: "1",
    osm_ids: Object.values(reviewed).join(","),
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/lookup?${params}`, {
    headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org" },
  });
  if (!response.ok) throw new Error(`Nominatim returned ${response.status}`);
  const results = await response.json();
  const byId = new Map(results.map((item) => [`${item.osm_type[0].toUpperCase()}${item.osm_id}`, item]));
  const output = { checkedAt: "2026-08-08", places: {} };
  for (const [id, osmId] of Object.entries(reviewed)) {
    const item = byId.get(osmId);
    if (!item?.geojson || !["Polygon", "MultiPolygon"].includes(item.geojson.type)) {
      throw new Error(`${id}: reviewed boundary ${osmId} did not return a polygon`);
    }
    output.places[id] = {
      displayName: item.display_name,
      osmId,
      source: "OpenStreetMap reviewed park boundary",
      sourceUrl: `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`,
      reviewStatus: "approved-name-and-location-match",
      reviewedAt: "2026-08-08",
      geojson: item.geojson,
    };
  }
  fs.writeFileSync(
    path.join(root, "data/generated/southeast-atlantic-park-boundaries.json"),
    `${JSON.stringify(output, null, 2)}\n`,
  );
  console.log(`Approved ${Object.keys(output.places).length} park boundaries.`);
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
