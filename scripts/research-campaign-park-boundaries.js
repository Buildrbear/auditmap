#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const args = Object.fromEntries(process.argv.slice(2).map((value, index, list) => value.startsWith("--") ? [value.slice(2), list[index + 1]] : null).filter(Boolean));
for (const key of ["campaign", "output"]) if (!args[key]) throw new Error(`Missing --${key}`);
const campaign = JSON.parse(fs.readFileSync(path.join(root, args.campaign), "utf8"));
const launch = JSON.parse(fs.readFileSync(path.join(root, "data/generated/launch-map-places.json"), "utf8"));
const places = new Map(launch.map((place) => [place.id, place]));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function locate(scope) {
  const query = `${scope.name}, ${scope.city}, ${scope.state}`;
  const params = new URLSearchParams({ format: "jsonv2", limit: "8", polygon_geojson: "1", addressdetails: "1", q: query });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org" } });
  if (!response.ok) throw new Error(`Nominatim returned ${response.status}`);
  return { query, results: await response.json() };
}

(async () => {
  const output = { campaign: campaign.campaign, checkedAt: campaign.checkedAt, source: "OpenStreetMap Nominatim", places: {} };
  for (const scope of campaign.places) {
    const base = places.get(scope.id);
    if (!base || !Number.isFinite(base.latitude) || !Number.isFinite(base.longitude)) throw new Error(`${scope.name}: launch coordinates missing`);
    const { query, results } = await locate(scope);
    output.places[scope.id] = {
      name: scope.name,
      candidates: results.map((result) => ({
        displayName: result.display_name, latitude: Number(result.lat), longitude: Number(result.lon),
        distanceFromSeed: Math.hypot(Number(result.lat) - base.latitude, Number(result.lon) - base.longitude),
        osmType: result.osm_type, osmId: result.osm_id,
        sourceUrl: `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}`,
        geojson: result.geojson, query, reviewStatus: "pending-name-and-location-review",
      })),
    };
    console.log(`${scope.name}: ${results.length} boundary candidates`);
    await wait(1200);
  }
  fs.mkdirSync(path.dirname(path.join(root, args.output)), { recursive: true });
  fs.writeFileSync(path.join(root, args.output), `${JSON.stringify(output, null, 2)}\n`);
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
