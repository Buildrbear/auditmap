#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const campaign = require("../data/boston-super-enrichment-campaign.json");
const root = path.resolve(__dirname, "..");
const mapPlaces = require("../data/generated/launch-map-places.json");
const failures = [];
const slugify = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

for (const expected of campaign.places) {
  const place = mapPlaces.find((item) => item.id === expected.id);
  if (!place) { failures.push(`${expected.name}: missing from map data`); continue; }
  const images = [place.image, ...(place.images || [])].filter((image) => image?.url);
  if (images.length < 4) failures.push(`${place.name}: only ${images.length} images`);
  if ((place.features || []).length !== 8) failures.push(`${place.name}: expected 8 subsites, found ${(place.features || []).length}`);
  if ((place.searchAnswers || []).length < 11) failures.push(`${place.name}: fewer than 11 parent answers`);
  for (const feature of place.features || []) {
    if (!feature.details?.images?.[0]?.url) failures.push(`${place.name}/${feature.name}: missing image`);
    if ((feature.details?.searchAnswers || []).length < 9) failures.push(`${place.name}/${feature.name}: fewer than 9 answers`);
    if (!feature.description || feature.description.length < 80) failures.push(`${place.name}/${feature.name}: guidance too thin`);
    if (!Number.isFinite(feature.latitude) || !Number.isFinite(feature.longitude)) failures.push(`${place.name}/${feature.name}: invalid coordinates`);
    if (!feature.details?.coordinateSource || !feature.details?.positionQuality) failures.push(`${place.name}/${feature.name}: missing coordinate provenance`);
    if (!feature.source_url || !feature.details?.informationSourceUrl) failures.push(`${place.name}/${feature.name}: missing information source`);
    const featureHtml = path.join(root, "us/ma/boston/parks", place.slug, feature.slug, "index.html");
    if (!fs.existsSync(featureHtml)) failures.push(`${place.name}/${feature.name}: page missing`);
    else {
      const featurePage = fs.readFileSync(featureHtml, "utf8");
      for (const text of [feature.name, place.name, "Where should I park", "Are there restrooms", "Are dogs allowed", "Sources", "rel=\"canonical\""]) {
        if (!featurePage.includes(text)) failures.push(`${place.name}/${feature.name}: raw HTML missing ${text}`);
      }
    }
  }
  const htmlPath = path.join(root, "us/ma/boston/parks", slugify(place.name), "index.html");
  if (!fs.existsSync(htmlPath)) { failures.push(`${place.name}: parent page missing`); continue; }
  const html = fs.readFileSync(htmlPath, "utf8");
  for (const text of [place.name, place.address, "Where should I park", "Are there restrooms", "rel=\"canonical\""]) {
    if (!html.includes(text)) failures.push(`${place.name}: raw HTML missing ${text}`);
  }
}

if (mapPlaces.some((place) => place.id === "launch-ma-boston-boston-common-and-public-garden")) failures.push("Retired combined Boston Common/Public Garden record remains on map");
if (failures.length) { console.error(failures.map((failure) => `- ${failure}`).join("\n")); process.exit(1); }
const featureCount = campaign.places.reduce((total, place) => total + place.subsites.length, 0);
console.log(`Verified ${campaign.places.length} Boston guides, ${featureCount} sourced destinations, raw visitor answers, and no duplicate combined listing.`);
