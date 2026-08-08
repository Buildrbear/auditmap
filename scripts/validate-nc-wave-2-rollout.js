const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const rollout = JSON.parse(fs.readFileSync(path.join(root, "data", "nc-wave-2-rollout.json"), "utf8"));
const expectedCities = ["Asheville", "Greenville", "Gastonia", "Apex", "Jacksonville", "Huntersville", "Chapel Hill", "Burlington", "Mooresville", "Wake Forest"];
const errors = [];

if (rollout.cities.length !== expectedCities.length) errors.push(`Expected ${expectedCities.length} cities`);
for (const name of expectedCities) if (!rollout.cities.some((city) => city.name === name)) errors.push(`Missing city: ${name}`);

const seen = new Set();
for (const city of rollout.cities) {
  if (!/^https:\/\//.test(city.officialInventory || "")) errors.push(`${city.name} lacks an official inventory URL`);
  if (!city.destinations.some((place) => place.tier === "anchor")) errors.push(`${city.name} lacks an anchor`);
  for (const place of city.destinations) {
    const key = `${city.name}|${place.name}`.toLowerCase();
    if (seen.has(key)) errors.push(`Duplicate destination: ${key}`);
    seen.add(key);
    if (!['anchor', 'supporting'].includes(place.tier)) errors.push(`Invalid tier: ${key}`);
    if (!['not-started', 'seeded', 'full-page', 'live'].includes(place.status)) errors.push(`Invalid status: ${key}`);
    if (/\b(city|town|municipal)\s+(hall|office|building)\b/i.test(place.name)) errors.push(`Administrative listing included: ${key}`);
  }
}

const destinations = rollout.cities.flatMap((city) => city.destinations);
const anchors = destinations.filter((place) => place.tier === "anchor");
const seededOrLive = anchors.filter((place) => ['seeded', 'full-page', 'live'].includes(place.status));
const result = { valid: errors.length === 0, cities: rollout.cities.length, destinations: destinations.length, anchors: anchors.length, seededOrLive: seededOrLive.length, errors };
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
