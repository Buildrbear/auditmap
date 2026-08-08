const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const pilotPath = path.join(projectRoot, "data", "generated", "pilot-subsites.json");
const parkLocations = new Map(
  JSON.parse(
    fs.readFileSync(
      path.join(projectRoot, "data", "generated", "launch-park-locations.json"),
      "utf8",
    ),
  ).locations.map((location) => [location.id, location]),
);
const checkedAt = new Date().toISOString().slice(0, 10);

const officialSeeds = {
  "launch-tx-houston-memorial-park": {
    officialMapUrl:
      "https://www.memorialparkconservancy.org/wp-content/uploads/2020/03/Memorial-Park-Map.pdf",
    sourceLabel: "Memorial Park Conservancy",
    features: [
      ["Clay Family Eastern Glades", "garden"],
      ["Kinder Land Bridge and Prairie", "nature"],
      ["Cullen Running Trails Center", "visitor-center"],
      ["Seymour Lieberman Trail", "trailhead"],
      ["Memorial Park Golf Course", "sports"],
      ["Memorial Park Tennis Center", "sports"],
      ["Houston Arboretum and Nature Center", "nature"],
      ["Memorial Park Fitness Center", "sports"],
      ["Picnic Loop", "picnic"],
      ["Memorial Park Running Complex", "sports"],
    ],
  },
  "launch-ga-atlanta-piedmont-park": {
    officialMapUrl: "https://piedmontpark.org/maps/",
    sourceLabel: "Piedmont Park Conservancy",
    features: [
      ["Active Oval", "sports"],
      ["Piedmont Park Aquatic Center and Pool", "sports"],
      ["Legacy Fountain Splash Pad", "splash-pad"],
      ["Lake Clara Meer", "water"],
      ["Noguchi Playscape", "playground"],
      ["Mayor's Grove Playground", "playground"],
      ["Piedmont Park Dog Park", "dog-area"],
      ["Six Springs Wetlands", "nature"],
      ["Piedmont Park Tennis Center", "sports"],
      ["Clara Meer Gazebo", "landmark"],
      ["Skyline Picture Point", "landmark"],
      ["Welcome Plaza", "entrance"],
    ],
  },
  "launch-mo-st-louis-forest-park": {
    officialMapUrl: "https://www.forestparkforever.org/park-attractions",
    sourceLabel: "Forest Park Forever",
    features: [
      ["Saint Louis Zoo", "museum"],
      ["Saint Louis Art Museum", "museum"],
      ["Missouri History Museum", "museum"],
      ["Saint Louis Science Center and Planetarium", "museum"],
      ["The Muny", "event-space"],
      ["Dennis and Judith Jones Visitor and Education Center", "visitor-center"],
      ["Boathouse at Forest Park", "landmark"],
      ["The Jewel Box", "garden"],
      ["World's Fair Pavilion", "landmark"],
      ["Emerson Grand Basin", "water"],
      ["Kennedy Forest", "nature"],
      ["The Cascades", "water"],
    ],
  },
};

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function tokens(value) {
  return new Set(
    String(value)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !["the", "and", "park"].includes(token)),
  );
}

function matchScore(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  const overlap = [...a].filter((token) => b.has(token)).length;
  return overlap / Math.max(a.size, b.size, 1);
}

function overpassPattern(features) {
  return features
    .map(([name]) =>
      [...tokens(name)]
        .slice(0, 2)
        .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*"),
    )
    .filter(Boolean)
    .join("|");
}

async function mappedPlaces(park, features) {
  const pattern = overpassPattern(features);
  const query = `[out:json][timeout:120];
(
  nwr(around:3500,${park.latitude},${park.longitude})["name"~"${pattern}",i];
);
out center tags;`;
  let payload;
  let lastError;
  for (const endpoint of [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ]) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal: AbortSignal.timeout(70000),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "AuditMap official subsite research/1.0 (https://www.auditmap.org)",
          Accept: "application/json",
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
  if (!payload) throw lastError;
  return (payload.elements || []).map((element) => ({
    name: element.tags?.name,
    latitude: Number(element.lat ?? element.center?.lat),
    longitude: Number(element.lon ?? element.center?.lon),
    osmType: element.type,
    osmId: element.id,
  }));
}

async function geocodeOfficialName(name, park) {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", `${name} ${park.city} ${park.state}`);
  url.searchParams.set("limit", "5");
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    headers: {
      "User-Agent": "AuditMap official subsite research/1.0 (https://www.auditmap.org)",
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`Photon returned ${response.status}`);
  const payload = await response.json();
  const results = (payload.features || []).filter((result) => {
    const [longitude, latitude] = result.geometry?.coordinates || [];
    return (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Math.abs(latitude - park.latitude) < 0.08 &&
      Math.abs(longitude - park.longitude) < 0.08
    );
  });
  return results[0]
    ? {
        name: results[0].properties?.name,
        latitude: Number(results[0].geometry.coordinates[1]),
        longitude: Number(results[0].geometry.coordinates[0]),
        osmType: { N: "node", W: "way", R: "relation" }[results[0].properties?.osm_type],
        osmId: results[0].properties?.osm_id,
        score: matchScore(name, results[0].properties?.name),
      }
    : null;
}

async function main() {
  const document = JSON.parse(fs.readFileSync(pilotPath, "utf8"));
  for (const park of document.parks) {
    const seed = officialSeeds[park.id];
    if (!seed || (park.features || []).length) continue;
    const location = parkLocations.get(park.id);
    if (!location) throw new Error(`Missing launch location for ${park.id}`);
    const mappedPark = {
      ...park,
      latitude: location.latitude,
      longitude: location.longitude,
    };
    park.features = [];
    park.reviewCandidates = [];
    for (const [name, featureType] of seed.features) {
      let featureLocation;
      let lookupError;
      try {
        featureLocation = await geocodeOfficialName(name, mappedPark);
      } catch (error) {
        lookupError = error.message;
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (!featureLocation || featureLocation.score < 0.5) {
        park.reviewCandidates.push({
          name,
          feature_type: featureType,
          reason: "Officially named destination did not resolve to a within-park mapped coordinate.",
          closestMappedName: featureLocation?.name,
          matchScore: featureLocation?.score,
          error: lookupError,
        });
        continue;
      }
      const slug = slugify(name);
      park.features.push({
        id: `${park.id}-${slug}`,
        slug,
        name,
        feature_type: featureType,
        description: `${name} is a visitor destination identified by ${seed.sourceLabel} within ${park.name}.`,
        latitude: featureLocation.latitude,
        longitude: featureLocation.longitude,
        details: {
          positionQuality: "mapped-place",
          officialMapUrl: seed.officialMapUrl,
        },
        source_label: seed.sourceLabel,
        source_url: seed.officialMapUrl,
        verified_at: checkedAt,
        discovery: {
          method: "official-map-name-plus-openstreetmap-coordinate",
          coordinateSource: `https://www.openstreetmap.org/${featureLocation.osmType}/${featureLocation.osmId}`,
          mappedName: featureLocation.name,
          matchScore: featureLocation.score,
        },
      });
      console.log(`Seeded: ${park.name} / ${name}`);
    }
  }
  document.generatedAt = new Date().toISOString();
  fs.writeFileSync(pilotPath, `${JSON.stringify(document, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
