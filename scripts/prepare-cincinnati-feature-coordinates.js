#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const campaign = require("../data/cincinnati-super-enrichment-campaign.json");
const overrides = require("../data/cincinnati-coordinate-overrides.json");
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const out = { checkedAt: overrides.checkedAt, places: {} };
for (const place of campaign.places.filter((entry) => entry.currentBatch)) {
  out.places[place.id] = {};
  for (const name of place.subsites) {
    const key = slug(name);
    const point = overrides.places[place.id]?.[key];
    if (!point) throw new Error(`${place.name}/${name}: reviewed coordinate override missing`);
    out.places[place.id][key] = {
      latitude: point.latitude,
      longitude: point.longitude,
      displayName: point.positionQuality,
      source: point.coordinateSource
    };
    console.log(`${place.name}: ${name} (${point.coordinateSource})`);
  }
}
fs.mkdirSync(path.join(root, "data/generated"), { recursive: true });
fs.writeFileSync(path.join(root, "data/generated/cincinnati-feature-coordinates.json"), `${JSON.stringify(out, null, 2)}\n`);
