#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/southeast-atlantic-super-enrichment-campaign.json");
const facts = require("../data/southeast-atlantic-visitor-facts.json").places;
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function search(query) {
  const params = new URLSearchParams({ format: "jsonv2", limit: "5", addressdetails: "1", q: query });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org" },
  });
  if (!response.ok) throw new Error(`Nominatim returned ${response.status}`);
  return response.json();
}

function eligible(result, base) {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return Math.abs(latitude - base.latitude) < 0.12 && Math.abs(longitude - base.longitude) < 0.12;
}

(async () => {
  const output = { checkedAt: campaign.checkedAt, source: "OpenStreetMap Nominatim", places: {} };
  for (const place of campaign.places) {
    const base = facts[place.id];
    if (!base) throw new Error(`${place.name}: visitor facts missing`);
    const records = {};
    for (const name of place.subsites) {
      const queries = [
        `${name}, ${place.name}, ${place.city}, ${place.state}`,
        `${name}, ${place.city}, ${place.state}`,
      ];
      const candidates = [];
      for (const query of queries) {
        const results = await search(query);
        for (const result of results.filter((item) => eligible(item, base))) {
          if (!candidates.some((item) => item.osmType === result.osm_type && item.osmId === result.osm_id)) {
            candidates.push({
              latitude: Number(result.lat),
              longitude: Number(result.lon),
              displayName: result.display_name,
              osmType: result.osm_type,
              osmId: result.osm_id,
              category: result.category,
              type: result.type,
              source: "OpenStreetMap Nominatim",
              sourceUrl: `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}`,
              query,
              reviewStatus: "pending-name-and-boundary-review",
            });
          }
        }
        await wait(1100);
      }
      records[slug(name)] = { name, candidates };
      console.log(`${place.name}: ${name} (${candidates.length} candidates)`);
    }
    output.places[place.id] = records;
  }
  fs.mkdirSync(path.join(root, "data/generated"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "data/generated/southeast-atlantic-feature-coordinate-research.json"),
    `${JSON.stringify(output, null, 2)}\n`,
  );
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
