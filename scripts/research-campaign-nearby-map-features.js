#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const args = Object.fromEntries(process.argv.slice(2).map((value, index, list) => value.startsWith("--") ? [value.slice(2), list[index + 1]] : null).filter(Boolean));
for (const key of ["campaign", "output"]) if (!args[key]) throw new Error(`Missing --${key}`);
const campaign = JSON.parse(fs.readFileSync(path.join(root, args.campaign), "utf8"));
const launch = JSON.parse(fs.readFileSync(path.join(root, "data/generated/launch-map-places.json"), "utf8"));
const places = new Map(launch.map((place) => [place.id, place]));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function overpass(latitude, longitude, radius) {
  const query = `[out:json][timeout:90];(nwr(around:${radius},${latitude},${longitude})[amenity][name];nwr(around:${radius},${latitude},${longitude})[leisure][name];nwr(around:${radius},${latitude},${longitude})[tourism][name];nwr(around:${radius},${latitude},${longitude})[historic][name];nwr(around:${radius},${latitude},${longitude})[natural][name];nwr(around:${radius},${latitude},${longitude})[man_made][name];nwr(around:${radius},${latitude},${longitude})[highway][name];nwr(around:${radius},${latitude},${longitude})[waterway][name];);out center tags;`;
  const endpoints = ["https://overpass.kumi.systems/api/interpreter", "https://overpass-api.de/api/interpreter"];
  let lastError;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const response = await fetch(endpoints[attempt % endpoints.length], { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "User-Agent": "AuditMap/1.0 contact@auditmap.org" }, body: new URLSearchParams({ data: query }) });
      if (response.ok) return (await response.json()).elements;
      lastError = new Error(`Overpass returned ${response.status}`);
      if (![429, 500, 502, 503, 504].includes(response.status)) throw lastError;
    } catch (error) {
      lastError = error;
    }
    if (attempt === 5) throw lastError;
    await wait(5000 * (attempt + 1));
  }
}

(async () => {
  const outputPath = path.join(root, args.output);
  const existing = fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, "utf8")) : null;
  const output = existing?.campaign === campaign.campaign ? existing : { campaign: campaign.campaign, checkedAt: campaign.checkedAt, source: "OpenStreetMap Overpass API", places: {} };
  for (const scope of campaign.places) {
    if (scope.deferRelease) {
      delete output.places[scope.id];
      console.log(`${scope.name}: skipped deferred release`);
      continue;
    }
    if (output.places[scope.id]) {
      console.log(`${scope.name}: retained ${output.places[scope.id].candidates.length} saved map objects`);
      continue;
    }
    const base = places.get(scope.id);
    if (!base || !Number.isFinite(base.latitude) || !Number.isFinite(base.longitude)) throw new Error(`${scope.name}: launch coordinates missing`);
    const radius = scope.featureResearchRadiusMeters || 2200;
    const elements = await overpass(base.latitude, base.longitude, radius);
    output.places[scope.id] = {
      name: scope.name, parent: { latitude: base.latitude, longitude: base.longitude }, radiusMeters: radius,
      candidates: elements.map((element) => ({
        name: element.tags?.name || null, latitude: Number(element.lat ?? element.center?.lat), longitude: Number(element.lon ?? element.center?.lon),
        osmType: element.type, osmId: element.id, sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
        tags: element.tags || {}, reviewStatus: "pending-park-boundary-and-purpose-review",
      })).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)),
    };
    console.log(`${scope.name}: ${output.places[scope.id].candidates.length} nearby map objects`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
    await wait(5000);
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
