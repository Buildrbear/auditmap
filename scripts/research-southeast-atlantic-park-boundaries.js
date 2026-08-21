#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/southeast-atlantic-super-enrichment-campaign.json");
const facts = require("../data/southeast-atlantic-visitor-facts.json").places;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function locate(place) {
  const query = `${place.name}, ${place.city}, ${place.state}`;
  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "5",
    polygon_geojson: "1",
    addressdetails: "1",
    q: query,
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org" },
  });
  if (!response.ok) throw new Error(`Nominatim returned ${response.status}`);
  return { query, results: await response.json() };
}

(async () => {
  const output = { checkedAt: campaign.checkedAt, source: "OpenStreetMap Nominatim", places: {} };
  for (const place of campaign.places) {
    const base = facts[place.id];
    const { query, results } = await locate(place);
    const candidates = results.map((result) => ({
      displayName: result.display_name,
      latitude: Number(result.lat),
      longitude: Number(result.lon),
      distanceFromSeed: Math.hypot(Number(result.lat) - base.latitude, Number(result.lon) - base.longitude),
      osmType: result.osm_type,
      osmId: result.osm_id,
      sourceUrl: `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}`,
      geojson: result.geojson,
      query,
      reviewStatus: "pending-name-and-location-review",
    }));
    output.places[place.id] = { name: place.name, candidates };
    console.log(`${place.name}: ${candidates.length} boundary candidates`);
    await wait(1200);
  }
  fs.writeFileSync(
    path.join(root, "data/generated/southeast-atlantic-park-boundary-research.json"),
    `${JSON.stringify(output, null, 2)}\n`,
  );
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
