#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const campaign = require("../data/columbus-super-enrichment-campaign.json");
const overridesDocument = require("../data/columbus-coordinate-overrides.json");
const previous = require("../data/generated/columbus-feature-coordinates.json");

const slug = (value) =>
  String(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const output = {
  checkedAt: overridesDocument.checkedAt || campaign.checkedAt,
  places: { ...previous.places },
};

for (const place of campaign.places.filter((entry) => entry.currentBatch)) {
  output.places[place.id] = {};
  for (const name of place.subsites) {
    const featureSlug = slug(name);
    const reviewed = overridesDocument.places[place.id]?.[featureSlug];
    if (!reviewed) {
      throw new Error(`${place.name}/${name}: reviewed coordinate override missing`);
    }
    if (!/^https:\/\//.test(reviewed.coordinateSource || "")) {
      throw new Error(`${place.name}/${name}: public coordinate source missing`);
    }
    output.places[place.id][featureSlug] = {
      latitude: reviewed.latitude,
      longitude: reviewed.longitude,
      displayName: reviewed.positionQuality,
      source: reviewed.coordinateSource,
    };
    console.log(`${place.name}: ${name} (${reviewed.coordinateSource})`);
  }
}

fs.mkdirSync(path.join(root, "data/generated"), { recursive: true });
fs.writeFileSync(
  path.join(root, "data/generated/columbus-feature-coordinates.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
