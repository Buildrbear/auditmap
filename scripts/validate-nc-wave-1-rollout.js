const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const campaign = JSON.parse(
  fs.readFileSync(path.join(root, "data", "nc-wave-1-rollout.json"), "utf8")
);
const statewide = JSON.parse(
  fs.readFileSync(path.join(root, "data", "nc-expansion-punchlist.json"), "utf8")
);
const expectedCities = [
  "Charlotte", "Greensboro", "Durham", "Winston-Salem", "Fayetteville",
  "Cary", "Wilmington", "Concord", "High Point"
];
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };

expect(campaign.cities.length === expectedCities.length, "Wave 1 must contain nine cities");
for (const name of expectedCities) {
  const city = campaign.cities.find((candidate) => candidate.name === name);
  expect(city, `${name} is missing from Wave 1`);
  if (!city) continue;
  expect(/^https:\/\//.test(city.officialInventory), `${name} lacks an official inventory source`);
  expect(city.destinations.length >= 8, `${name} has fewer than eight initial destinations`);
  expect(city.destinations.some((place) => place.tier === "anchor"), `${name} lacks an anchor destination`);
  expect(
    new Set(city.destinations.map((place) => place.name)).size === city.destinations.length,
    `${name} contains duplicate destination names`
  );
  const statewideCity = statewide.municipalities.find((place) => place.name === name);
  expect(statewideCity?.rolloutWave === 1, `${name} is not classified in statewide Wave 1`);
  expect(statewideCity?.inventoryStatus === "complete", `${name} inventory progress was not synchronized`);
  expect(
    statewideCity?.candidateDestinationCount === city.destinations.length,
    `${name} destination count was not synchronized`
  );
}

const destinations = campaign.cities.flatMap((city) => city.destinations);
console.log(JSON.stringify({
  valid: errors.length === 0,
  cities: campaign.cities.length,
  destinations: destinations.length,
  anchors: destinations.filter((place) => place.tier === "anchor").length,
  seededOrLive: destinations.filter((place) => ["seeded", "full-page"].includes(place.status)).length,
  errors
}, null, 2));
if (errors.length) process.exitCode = 1;
