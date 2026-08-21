const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const punchlist = require(path.join(root, "data", "nc-expansion-punchlist.json"));
const curated = require(path.join(root, "data", "institutions.json"));
const launch = require(path.join(root, "data", "generated", "launch-map-places.json"));
const outputPath = path.join(root, "data", "nc-white-dot-inventory.json");
const previousInventory = fs.existsSync(outputPath)
  ? JSON.parse(fs.readFileSync(outputPath, "utf8"))
  : { places: [] };

function normalized(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(the|city of|town of)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function identity(place) {
  return `${normalized(place.name)}:${normalized(place.city)}`;
}

function distanceMiles(left, right) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const lat = radians(Number(right.latitude) - Number(left.latitude));
  const lon = radians(Number(right.longitude) - Number(left.longitude));
  const lat1 = radians(Number(left.latitude));
  const lat2 = radians(Number(right.latitude));
  const a = Math.sin(lat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(lon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isCurated(place, catalog) {
  const name = normalized(place.name);
  return catalog.some((candidate) => {
    if (identity(candidate) === identity(place)) return true;
    return normalized(candidate.name) === name && distanceMiles(candidate, place) < 1;
  });
}

function classification(place) {
  const name = normalized(place.name);
  const privateSource = /storyuniversitynorth\.com|apartments?|homeowners?|\bhoa\b/i.test(`${place.source || ""} ${place.summary || ""}`);
  const tooGeneric = ["park", "dog park", "playground"].includes(name);
  if ((place.type === "Park" || place.type === "Dog park") && !privateSource && !tooGeneric) return "park-candidate";
  return "deferred-non-park";
}

function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const catalog = [...curated, ...launch].filter((place) => place.state === "NC");
  if (process.argv.includes("--reclassify-only")) {
    const places = (previousInventory.places || []).map((place) => ({
      ...place,
      inventoryStatus: isCurated(place, catalog) ? "already-curated" : classification(place),
    }));
    const counts = places.reduce((result, place) => {
      result[place.inventoryStatus] = (result[place.inventoryStatus] || 0) + 1;
      if (!place.image?.url) result.withoutImage += 1;
      if (!place.searchAnswers?.length) result.withoutAnswers += 1;
      return result;
    }, { "already-curated": 0, "park-candidate": 0, "deferred-non-park": 0, withoutImage: 0, withoutAnswers: 0 });
    fs.writeFileSync(outputPath, `${JSON.stringify({ ...previousInventory, counts, places }, null, 2)}\n`);
    console.log(JSON.stringify({ uniqueDiscoveryRecords: places.length, counts }, null, 2));
    return;
  }
  const allAreas = [...punchlist.municipalities, ...punchlist.censusDesignatedPlaces]
    .filter((area) => Number(area.rolloutWave) <= 2)
    .sort((left, right) => left.rolloutWave - right.rolloutWave || right.population2024 - left.population2024);
  const failedOnly = process.argv.includes("--failed-only");
  const priorFailures = new Set((previousInventory.failures || []).map((failure) => failure.area));
  const areas = failedOnly ? allAreas.filter((area) => priorFailures.has(area.name)) : allAreas;
  const records = new Map();
  const previousRecords = new Map((previousInventory.places || []).map((place) => [place.id || identity(place), place]));
  const failures = [];

  const batchSize = failedOnly ? 1 : 6;
  for (let start = 0; start < areas.length; start += batchSize) {
    const batch = areas.slice(start, start + batchSize);
    const results = await Promise.all(batch.map(async (area) => {
      const params = new URLSearchParams({
        lat: String(area.latitude),
        lon: String(area.longitude),
        radius: "20000",
        city: area.name,
        scope: "parks",
      });
      try {
        const response = await fetch(`https://www.auditmap.org/api/nc-places?${params}`, {
          signal: AbortSignal.timeout(20000),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
        return { area, places: payload.places || [] };
      } catch (error) {
        return { area, error: error.message };
      }
    }));
    for (const result of results) {
      if (result.error) {
        failures.push({ area: result.area.name, error: result.error });
        console.log(`${result.area.name}: FAILED (${result.error})`);
        continue;
      }
      for (const place of result.places) {
        const key = place.id || identity(place);
        const current = records.get(key) || previousRecords.get(key);
        records.set(key, {
          ...(current || place),
          ...place,
          discoveredFrom: [...new Set([...(current?.discoveredFrom || []), result.area.name])],
        });
      }
      console.log(`${result.area.name}: ${result.places.length} records`);
    }
    if (failedOnly && start + batchSize < areas.length) await pause(1500);
  }

  if (failures.length) {
    const failedAreas = new Set(failures.map((failure) => failure.area));
    for (const place of previousInventory.places || []) {
      if (!(place.discoveredFrom || []).some((area) => failedAreas.has(area))) continue;
      const key = place.id || identity(place);
      if (!records.has(key)) records.set(key, place);
    }
  }

  if (!records.size && failures.length) {
    throw new Error(`Inventory refresh returned no records (${failures.length}/${areas.length} areas failed); preserving the previous inventory`);
  }

  if (failedOnly) {
    for (const place of previousInventory.places || []) {
      const key = place.id || identity(place);
      if (!records.has(key)) records.set(key, place);
    }
  }

  const discoveries = [...records.values()].map((place) => ({
    ...place,
    inventoryStatus: isCurated(place, catalog) ? "already-curated" : classification(place),
  }));
  const counts = discoveries.reduce((result, place) => {
    result[place.inventoryStatus] = (result[place.inventoryStatus] || 0) + 1;
    if (!place.image?.url) result.withoutImage += 1;
    if (!place.searchAnswers?.length) result.withoutAnswers += 1;
    return result;
  }, { "already-curated": 0, "park-candidate": 0, "deferred-non-park": 0, withoutImage: 0, withoutAnswers: 0 });

  const document = {
    generatedAt: new Date().toISOString(),
    scope: "North Carolina rollout Waves 0-2 (new-site expansion paused after Wave 2)",
    areasQueried: allAreas.length,
    failures,
    uniqueDiscoveryRecords: discoveries.length,
    counts,
    places: discoveries.sort((left, right) => left.inventoryStatus.localeCompare(right.inventoryStatus) || left.city.localeCompare(right.city) || left.name.localeCompare(right.name)),
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);
  console.log(JSON.stringify({ areasQueried: allAreas.length, refreshedAreas: areas.length, failures: failures.length, uniqueDiscoveryRecords: discoveries.length, counts }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
