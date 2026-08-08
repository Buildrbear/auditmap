#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/southeast-atlantic-super-enrichment-campaign.json");
const facts = require("../data/southeast-atlantic-visitor-facts.json").places;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function overpass(latitude, longitude, radius) {
  const query = `[out:json][timeout:90];(nwr(around:${radius},${latitude},${longitude})[amenity];nwr(around:${radius},${latitude},${longitude})[leisure];nwr(around:${radius},${latitude},${longitude})[tourism];nwr(around:${radius},${latitude},${longitude})[historic];nwr(around:${radius},${latitude},${longitude})[natural];nwr(around:${radius},${latitude},${longitude})[man_made];nwr(around:${radius},${latitude},${longitude})[highway][name];nwr(around:${radius},${latitude},${longitude})[waterway][name];);out center tags;`;
  const endpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(endpoints[attempt % endpoints.length], {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "AuditMap/1.0 contact@auditmap.org",
      },
      body: new URLSearchParams({ data: query }),
    });
    if (response.ok) return (await response.json()).elements;
    if (attempt === 5 || ![429, 500, 502, 503, 504].includes(response.status)) {
      throw new Error(`Overpass returned ${response.status}`);
    }
    await wait(5000 * (attempt + 1));
  }
}

(async () => {
  const output = { checkedAt: campaign.checkedAt, source: "OpenStreetMap Overpass API", places: {} };
  for (const place of campaign.places) {
    const base = facts[place.id];
    const radius = place.id.includes("skidaway") ? 3200 : place.id.includes("hanna") ? 4200 : place.id.includes("bonaventure") ? 1500 : 900;
    const elements = await overpass(base.latitude, base.longitude, radius);
    output.places[place.id] = {
      name: place.name,
      parent: { latitude: base.latitude, longitude: base.longitude },
      candidates: elements.map((element) => ({
        name: element.tags?.name || null,
        latitude: Number(element.lat ?? element.center?.lat),
        longitude: Number(element.lon ?? element.center?.lon),
        osmType: element.type,
        osmId: element.id,
        sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
        tags: element.tags || {},
        reviewStatus: "pending-park-boundary-and-purpose-review",
      })).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)),
    };
    console.log(`${place.name}: ${output.places[place.id].candidates.length} nearby map objects`);
    await wait(5000);
  }
  fs.writeFileSync(
    path.join(root, "data/generated/southeast-atlantic-nearby-map-features.json"),
    `${JSON.stringify(output, null, 2)}\n`,
  );
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
