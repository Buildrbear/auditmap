const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const punchlist = JSON.parse(
  fs.readFileSync(path.join(rootDir, "data", "nc-expansion-punchlist.json"), "utf8")
);
const errors = [];

function expect(condition, message) {
  if (!condition) errors.push(message);
}

function checkUnique(items, field, label) {
  const values = items.map((item) => item[field]);
  expect(new Set(values).size === values.length, `${label} contains duplicate ${field} values`);
}

expect(punchlist.municipalities.length === 553, "Expected 553 incorporated municipalities");
expect(punchlist.censusDesignatedPlaces.length === 224, "Expected 224 census-designated places");
expect(punchlist.counties.length === 100, "Expected 100 counties");
expect(
  punchlist.summary.waves.reduce((sum, wave) => sum + wave.municipalityCount, 0) === 553,
  "Municipality wave totals do not equal 553"
);

checkUnique(punchlist.municipalities, "id", "Municipalities");
checkUnique(punchlist.censusDesignatedPlaces, "id", "Census-designated places");
checkUnique(punchlist.counties, "id", "Counties");

for (const place of punchlist.municipalities) {
  expect(place.name && place.primaryCounty, `Municipality ${place.id} lacks a name or county`);
  expect(Number.isFinite(place.latitude) && Number.isFinite(place.longitude), `${place.name} lacks coordinates`);
  expect(Number.isInteger(place.rolloutWave), `${place.name} lacks a rollout wave`);
  expect(place.targetDepth && place.status, `${place.name} lacks target depth or status`);
  expect(
    [place.discoveryStatus, place.inventoryStatus, place.enrichmentStatus, place.imageStatus,
      place.subsiteStatus, place.livePageStatus].every(Boolean),
    `${place.name} lacks progress tracking`
  );
}

for (const place of punchlist.censusDesignatedPlaces) {
  expect(place.name, `CDP ${place.id} lacks a name`);
  expect(Number.isFinite(place.latitude) && Number.isFinite(place.longitude), `${place.name} lacks coordinates`);
  expect(place.status && place.discoveryStatus && place.inventoryStatus && place.enrichmentStatus && place.livePageStatus,
    `${place.name} lacks status tracking`);
}

for (const county of punchlist.counties) {
  expect(Number.isInteger(county.leagueDistrict), `${county.name} lacks a district assignment`);
  expect(
    [county.unincorporatedPlacesStatus, county.countyParksStatus, county.stateAndFederalLandsStatus,
      county.greenwaysAndTrailsStatus, county.publicWaterAccessStatus].every(Boolean),
    `${county.name} lacks progress tracking`
  );
}

const result = {
  valid: errors.length === 0,
  municipalities: punchlist.municipalities.length,
  censusDesignatedPlaces: punchlist.censusDesignatedPlaces.length,
  counties: punchlist.counties.length,
  errors
};
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
