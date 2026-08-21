const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const locations = JSON.parse(
  fs.readFileSync(
    path.join(projectRoot, "data", "generated", "launch-park-locations.json"),
    "utf8",
  ),
).locations;
function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

const tier = argumentValue("tier");
const region = argumentValue("region");
const batchLimit = Number(argumentValue("limit") || 0);
const batchOffset = Number(argumentValue("offset") || 0);
const outputName =
  argumentValue("output") || (tier ? `${tier}-subsites.json` : "pilot-subsites.json");
const outputPath = path.join(projectRoot, "data", "generated", outputName);
const overpassEndpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const pilotDefaults = [
  ["Central Park", "New York City", "NY"],
  ["Prospect Park", "New York City", "NY"],
  ["Griffith Park", "Los Angeles", "CA"],
  ["Balboa Park", "San Diego", "CA"],
  ["Golden Gate Park", "San Francisco", "CA"],
  ["Zilker Metropolitan Park", "Austin", "TX"],
  ["Memorial Park", "Houston", "TX"],
  ["Piedmont Park", "Atlanta", "GA"],
  ["Forest Park", "St. Louis", "MO"],
  ["Lake Eola Park", "Orlando", "FL"],
];

function readLaunchRows() {
  const [header, ...lines] = fs
    .readFileSync(path.join(projectRoot, "data", "nationwide-major-parks-launch.csv"), "utf8")
    .trim()
    .split(/\r?\n/);
  const keys = header.split(",");
  return lines.map((line) =>
    Object.fromEntries(line.split(",").map((value, index) => [keys[index], value])),
  );
}

function batchTargets() {
  if (!tier) return pilotDefaults;
  const completedPilotIds = new Set(
    fs.existsSync(path.join(projectRoot, "data", "generated", "pilot-subsites-ready.json"))
      ? JSON.parse(
          fs.readFileSync(
            path.join(projectRoot, "data", "generated", "pilot-subsites-ready.json"),
            "utf8",
          ),
        ).parks.map((park) => park.id)
      : [],
  );
  const rows = readLaunchRows().filter(
    (row) =>
      row.launch_tier === tier &&
      (!region || row.region.toLowerCase() === region.toLowerCase()),
  );
  const targets = rows
    .map((row) => {
      const location = locations.find(
        (candidate) =>
          candidate.park === row.park &&
          candidate.city === row.city &&
          candidate.state === row.state,
      );
      if (!location || completedPilotIds.has(location.id)) return null;
      return [row.park, row.city, row.state];
    })
    .filter(Boolean);
  return targets.slice(batchOffset, batchLimit ? batchOffset + batchLimit : undefined);
}
const knownDiscoveryFailures = new Map([
  [
    "launch-tx-houston-memorial-park",
    "OpenStreetMap boundary query timed out; use the official Memorial Park map.",
  ],
]);

const typeRules = [
  ["playground", (tags) => tags.leisure === "playground"],
  ["splash-pad", (tags) => tags.leisure === "water_park" || tags.playground === "splash_pad"],
  ["dog-area", (tags) => tags.leisure === "dog_park"],
  ["restroom", (tags) => tags.amenity === "toilets"],
  [
    "visitor-center",
    (tags) =>
      tags.information === "visitor_centre" ||
      tags.information === "office" ||
      tags.tourism === "visitor_centre",
  ],
  ["trailhead", (tags) => tags.information === "route_marker" || tags.highway === "trailhead"],
  ["garden", (tags) => tags.leisure === "garden"],
  ["nature", (tags) => tags.leisure === "nature_reserve" || tags.natural === "wood"],
  ["water", (tags) => ["water", "bay", "beach"].includes(tags.natural) || tags.leisure === "marina"],
  ["sports", (tags) => ["sports_centre", "stadium", "pitch", "swimming_pool"].includes(tags.leisure)],
  ["museum", (tags) => ["museum", "gallery", "zoo", "aquarium"].includes(tags.tourism)],
  ["art", (tags) => tags.tourism === "artwork" || Boolean(tags.artwork_type)],
  ["landmark", (tags) => Boolean(tags.historic) || tags.tourism === "viewpoint"],
  ["event-space", (tags) => ["theatre", "community_centre"].includes(tags.amenity) || tags.leisure === "bandstand"],
  ["picnic", (tags) => tags.tourism === "picnic_site" || tags.leisure === "picnic_table"],
  ["parking", (tags) => tags.amenity === "parking"],
];

const priority = {
  playground: 100,
  "splash-pad": 100,
  "dog-area": 98,
  "visitor-center": 96,
  museum: 94,
  garden: 92,
  art: 90,
  landmark: 88,
  "event-space": 86,
  trailhead: 84,
  sports: 82,
  water: 80,
  nature: 78,
  restroom: 76,
  picnic: 70,
  parking: 60,
};
const typeCaps = {
  playground: 4,
  "splash-pad": 2,
  "dog-area": 2,
  restroom: 2,
  "visitor-center": 2,
  trailhead: 3,
  garden: 4,
  nature: 3,
  water: 3,
  sports: 4,
  museum: 8,
  art: 3,
  landmark: 4,
  "event-space": 3,
  picnic: 2,
  parking: 2,
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function classify(tags) {
  return typeRules.find(([, matches]) => matches(tags))?.[0] || null;
}

function usefulName(name) {
  return (
    name &&
    name.length >= 3 &&
    !/^(parking|car park|restroom|toilets|playground|field|court|picnic area)$/i.test(name)
  );
}

function usefulSubsiteName(name, featureType, location) {
  if (!usefulName(name)) return false;
  const normalized = slugify(name);
  if (normalized === slugify(location.park)) return false;
  if (featureType === "landmark" && /(historic district|memorial park)$/i.test(name)) {
    return false;
  }
  if (featureType === "landmark" && /^abandoned .*quarry/i.test(name)) return false;
  return true;
}

function elementUrl(element) {
  return `https://www.openstreetmap.org/${element.type}/${element.id}`;
}

function joinWaySegments(segments) {
  const remaining = segments.map((segment) => [...segment]).filter((segment) => segment.length > 1);
  const rings = [];
  while (remaining.length) {
    const ring = remaining.shift();
    let joined = true;
    while (joined && ring[0] !== ring[ring.length - 1]) {
      joined = false;
      for (let index = 0; index < remaining.length; index += 1) {
        const segment = remaining[index];
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (last === segment[0]) ring.push(...segment.slice(1));
        else if (last === segment[segment.length - 1]) ring.push(...segment.slice(0, -1).reverse());
        else if (first === segment[segment.length - 1]) ring.unshift(...segment.slice(0, -1));
        else if (first === segment[0]) ring.unshift(...segment.slice(1).reverse());
        else continue;
        remaining.splice(index, 1);
        joined = true;
        break;
      }
    }
    if (ring.length >= 4 && ring[0] === ring[ring.length - 1]) rings.push(ring);
  }
  return rings;
}

function pointInRing(latitude, longitude, ring) {
  let inside = false;
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
    const [currentLon, currentLat] = ring[current];
    const [previousLon, previousLat] = ring[previous];
    const crosses =
      currentLat > latitude !== previousLat > latitude &&
      longitude <
        ((previousLon - currentLon) * (latitude - currentLat)) /
          (previousLat - currentLat || Number.EPSILON) +
          currentLon;
    if (crosses) inside = !inside;
  }
  return inside;
}

async function boundaryPolygons(location) {
  const objectType = location.osmType === "relation" ? "relation" : "way";
  const response = await fetch(
    `https://api.openstreetmap.org/api/0.6/${objectType}/${location.osmId}/full.json`,
    {
      signal: AbortSignal.timeout(30000),
      headers: {
        "User-Agent": "AuditMap boundary verification/1.0 (https://www.auditmap.org)",
        Accept: "application/json",
      },
    },
  );
  if (!response.ok) throw new Error(`OpenStreetMap boundary returned ${response.status}`);
  const payload = await response.json();
  const nodes = new Map(
    payload.elements
      .filter((element) => element.type === "node")
      .map((node) => [node.id, [Number(node.lon), Number(node.lat)]]),
  );
  const ways = new Map(
    payload.elements
      .filter((element) => element.type === "way")
      .map((way) => [way.id, way.nodes]),
  );
  let rings;
  if (objectType === "way") {
    rings = [ways.get(location.osmId)];
  } else {
    const relation = payload.elements.find(
      (element) => element.type === "relation" && element.id === location.osmId,
    );
    const outerSegments = (relation?.members || [])
      .filter((member) => member.type === "way" && member.role !== "inner")
      .map((member) => ways.get(member.ref))
      .filter(Boolean);
    rings = joinWaySegments(outerSegments);
  }
  const polygons = (rings || [])
    .map((ring) => ring?.map((nodeId) => nodes.get(nodeId)).filter(Boolean))
    .filter((ring) => ring.length >= 4);
  if (!polygons.length) throw new Error("Park boundary geometry could not be assembled.");
  return polygons;
}

function description(name, featureType, tags) {
  const detail =
    tags.description ||
    tags["description:en"] ||
    tags.sport ||
    tags.artwork_type ||
    tags.historic ||
    tags.tourism ||
    tags.leisure ||
    tags.amenity;
  return `${name} is a mapped ${featureType.replaceAll("-", " ")}${detail ? ` (${String(detail).replaceAll("_", " ")})` : ""} within the park. Visitor details still require official-source review.`;
}

function deduplicate(features) {
  const records = new Map();
  for (const feature of features) {
    const key = slugify(feature.name);
    const current = records.get(key);
    if (!current || feature.score > current.score) records.set(key, feature);
  }
  return [...records.values()];
}

function selectDiverse(features, limit = 12) {
  const counts = new Map();
  const selected = [];
  for (const feature of features) {
    const count = counts.get(feature.feature_type) || 0;
    if (count >= (typeCaps[feature.feature_type] || 2)) continue;
    counts.set(feature.feature_type, count + 1);
    selected.push(feature);
    if (selected.length >= limit) break;
  }
  return selected;
}

async function discover(location, { allowFallback = true } = {}) {
  const polygons = await boundaryPolygons(location);
  const objectType =
    location.osmType === "relation" ? "relation" : location.osmType === "node" ? "node" : "way";
  const query = `
[out:json][timeout:180];
${objectType}(id:${location.osmId});
map_to_area->.park;
(
  nwr(area.park)["name"]["leisure"~"^(playground|water_park|dog_park|garden|nature_reserve|sports_centre|stadium|pitch|swimming_pool|marina)$"];
  nwr(area.park)["name"]["amenity"~"^(toilets|theatre|community_centre|parking)$"];
  nwr(area.park)["name"]["tourism"~"^(museum|gallery|zoo|aquarium|artwork|picnic_site|viewpoint)$"];
  nwr(area.park)["name"]["historic"];
  nwr(area.park)["name"]["natural"~"^(water|bay|beach|wood)$"];
  nwr(area.park)["name"]["information"~"^(visitor_centre|office|route_marker)$"];
  nwr(area.park)["name"]["artwork_type"];
);
out center tags;
`;
  let payload = null;
  let boundaryContained = true;
  let lastError = null;
  for (const endpoint of overpassEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal: AbortSignal.timeout(70000),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "AuditMap subsite research/1.0 (https://www.auditmap.org)",
        },
        body: new URLSearchParams({ data: query }),
      });
      if (!response.ok) throw new Error(`Overpass returned ${response.status}`);
      payload = await response.json();
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!payload && allowFallback) {
    boundaryContained = false;
    const fallbackQuery = `
[out:json][timeout:120];
(
  nwr(around:3000,${location.latitude},${location.longitude})["name"]["leisure"~"^(playground|water_park|dog_park|garden|nature_reserve|sports_centre|stadium|pitch|swimming_pool|marina)$"];
  nwr(around:3000,${location.latitude},${location.longitude})["name"]["amenity"~"^(toilets|theatre|community_centre|parking)$"];
  nwr(around:3000,${location.latitude},${location.longitude})["name"]["tourism"~"^(museum|gallery|zoo|aquarium|artwork|picnic_site|viewpoint)$"];
  nwr(around:3000,${location.latitude},${location.longitude})["name"]["historic"];
  nwr(around:3000,${location.latitude},${location.longitude})["name"]["natural"~"^(water|bay|beach|wood)$"];
  nwr(around:3000,${location.latitude},${location.longitude})["name"]["information"~"^(visitor_centre|office|route_marker)$"];
  nwr(around:3000,${location.latitude},${location.longitude})["name"]["artwork_type"];
);
out center tags;
`;
    for (const endpoint of [...overpassEndpoints].reverse()) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          signal: AbortSignal.timeout(70000),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "AuditMap subsite research/1.0 (https://www.auditmap.org)",
          },
          body: new URLSearchParams({ data: fallbackQuery }),
        });
        if (!response.ok) throw new Error(`Overpass fallback returned ${response.status}`);
        payload = await response.json();
        break;
      } catch (error) {
        lastError = error;
      }
    }
  }
  if (!payload) throw lastError || new Error("Subsite discovery failed.");
  const candidates = (payload.elements || [])
    .map((element) => {
      const tags = element.tags || {};
      const featureType = classify(tags);
      const name = tags.name || tags["name:en"];
      const latitude = Number(element.lat ?? element.center?.lat);
      const longitude = Number(element.lon ?? element.center?.lon);
      if (
        !featureType ||
        !usefulSubsiteName(name, featureType, location) ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        !polygons.some((polygon) => pointInRing(latitude, longitude, polygon))
      ) return null;
      return {
        id: `${location.id}-${slugify(name)}`,
        slug: slugify(name),
        name,
        feature_type: featureType,
        description: description(name, featureType, tags),
        latitude,
        longitude,
        details: {
          positionQuality: boundaryContained
            ? "Mapped inside verified park boundary"
            : "Mapped near park center; boundary review required",
          officialMapUrl: location.sourceUrl,
          imageUrl: null,
          imageSourceUrl: null,
          imageAuthor: null,
          imageLicense: null,
          imageAlt: null,
        },
        source_label: "OpenStreetMap contributors",
        source_url: elementUrl(element),
        verified_at: new Date().toISOString().slice(0, 10),
        score: priority[featureType] + (tags.wikidata ? 8 : 0) + (tags.wikipedia ? 6 : 0),
        discovery: {
          osmType: element.type,
          osmId: element.id,
          wikidata: tags.wikidata || null,
          wikipedia: tags.wikipedia || null,
          boundaryContained,
        },
      };
    })
    .filter(Boolean);
  const ranked = deduplicate(candidates).sort(
    (left, right) => right.score - left.score || left.name.localeCompare(right.name),
  );
  return {
    features: boundaryContained ? selectDiverse(ranked) : [],
    reviewCandidates: boundaryContained ? [] : selectDiverse(ranked, 16),
  };
}

async function main() {
  const refresh = process.argv.includes("--refresh");
  const existing = !refresh && fs.existsSync(outputPath)
    ? JSON.parse(fs.readFileSync(outputPath, "utf8"))
    : { parks: [] };
  const parks = [...existing.parks];
  const targets = batchTargets();
  for (const [name, city, state] of targets) {
    const location = locations.find(
      (candidate) =>
        candidate.park === name &&
        candidate.city === city &&
        candidate.state === state,
    );
    if (!location) throw new Error(`Missing location for ${name}, ${city}`);
    if (parks.some((park) => park.id === location.id)) continue;
    let features = [];
    let reviewCandidates = [];
    let discoveryError = knownDiscoveryFailures.get(location.id) || null;
    if (!discoveryError) {
      try {
        const discovery = await discover(location, { allowFallback: !tier });
        features = discovery.features;
        reviewCandidates = discovery.reviewCandidates;
      } catch (error) {
        discoveryError = error.message;
      }
    }
    parks.push({
      id: location.id,
      name,
      city,
      state,
      sourceBoundary: location.sourceUrl,
      features,
      reviewCandidates,
      discoveryError,
    });
    fs.writeFileSync(
      outputPath,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), parks }, null, 2)}\n`,
    );
    console.log(
      discoveryError
        ? `${name}: discovery failed (${discoveryError})`
        : `${name}: ${features.length} candidates`,
    );
  }
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), parks }, null, 2)}\n`,
  );
  console.log(
    `Saved ${parks.reduce((total, park) => total + park.features.length, 0)} candidates across ${parks.length} parks.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
