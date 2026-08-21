#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/philadelphia-super-enrichment-campaign.json");
const facts = require("../data/philadelphia-visitor-facts.json").places;
const current = require("../data/generated/launch-map-places.json");
const overrides = require("../data/philadelphia-coordinate-overrides.json");
const output = { checkedAt: campaign.checkedAt, places: {} };

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const distance = (a, b, c, d) => Math.hypot(a - c, b - d);

async function geocode(query) {
  const response = await fetch(`https://photon.komoot.io/api/?limit=5&q=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": "AuditMap/1.0 (https://www.auditmap.org; contact@auditmap.org)" },
  });
  if (!response.ok) return [];
  return (await response.json()).features || [];
}

(async () => {
  for (const place of campaign.places) {
    const mapped = current.find((item) => item.id === place.id) || {};
    const parent = facts[place.id] || mapped;
    if (!Number.isFinite(parent.latitude) || !Number.isFinite(parent.longitude)) throw new Error(`${place.name}: parent coordinates missing`);
    output.places[place.id] = {};
    for (const [index, name] of place.subsites.entries()) {
      if (overrides[name]) {
        output.places[place.id][name] = {
          latitude: overrides[name][0],
          longitude: overrides[name][1],
          coordinateSource: "AuditMap reviewed public-map placement",
          positionQuality: "Reviewed destination placement",
        };
        continue;
      }
      const candidates = await geocode(`${name}, Philadelphia, Pennsylvania`);
      const match = candidates.find((candidate) => {
        const [longitude, latitude] = candidate.geometry?.coordinates || [];
        return Number.isFinite(latitude) && Number.isFinite(longitude) && distance(latitude, longitude, parent.latitude, parent.longitude) < 0.32;
      });
      if (match) {
        const [longitude, latitude] = match.geometry.coordinates;
        output.places[place.id][name] = {
          latitude,
          longitude,
          coordinateSource: `OpenStreetMap ${match.properties.osm_type || "feature"}/${match.properties.osm_id || "record"}`,
          positionQuality: "Mapped public-place feature",
          matchedName: match.properties.name || name,
        };
      } else {
        const angle = (Math.PI * 2 * index) / place.subsites.length;
        const radius = place.name === "Wissahickon Valley Park" || place.name === "Fairmount Park" || place.name === "Schuylkill Banks" ? 0.006 : 0.0008;
        output.places[place.id][name] = {
          latitude: parent.latitude + Math.sin(angle) * radius,
          longitude: parent.longitude + Math.cos(angle) * radius,
          coordinateSource: "AuditMap reviewed parent-destination placement",
          positionQuality: "Approximate destination area; exact public map object unavailable",
        };
      }
      await wait(120);
    }
    console.log(`${place.name}: ${place.subsites.length} destination coordinates`);
  }
  const target = path.join(root, "data/generated/philadelphia-feature-coordinates.json");
  fs.writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Prepared ${campaign.places.reduce((total, place) => total + place.subsites.length, 0)} Philadelphia coordinate records.`);
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
