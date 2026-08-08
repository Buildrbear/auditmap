const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const csvPath = path.join(projectRoot, "data", "nationwide-major-parks-launch.csv");
const outputPath = path.join(projectRoot, "data", "generated", "launch-park-locations.json");
const endpoint = "https://nominatim.openstreetmap.org/search";
const searchAliases = {
  "Boston Common and Public Garden": "Boston Common",
  "Outer Harbor and Lakeside Complex": "Outer Harbor",
  "James River Park System": "James River Park",
  "Reedy Creek Park and Nature Center": "Reedy Creek Park",
  "Lettuce Lake Park": "6920 East Fletcher Avenue",
  "Shelby Bottoms and Shelby Park": "Shelby Park",
  "Louisville Waterfront Park": "Waterfront Park",
  "Chain of Lakes Regional Park": "Bde Maka Ska Park",
  "Theodore Wirth Regional Park": "Theodore Wirth Park",
  "Rockefeller Park and Cultural Gardens": "Rockefeller Park",
  "Elena Gallegos Open Space": "7100 Tramway Boulevard Northeast",
  "Tingley Beach and Bosque": "Tingley Beach",
  "Rillito River Park": "Rillito River Park North 1st Avenue",
  "William Land Regional Park": "William Land Park",
  "Ala Moana Regional Park": "Ala Moana Beach Park",
  "McAlpine Creek Community Park": "McAlpine Creek Park",
  "Bog Garden at Benjamin Park": "The Bog Garden",
  "Tanger Family Bicentennial Garden": "Tanger Bicentennial Garden",
  "Atlantic and Yadkin Greenway": "Atlantic & Yadkin Greenway",
  "Greensboro Downtown Greenway": "Downtown Greenway",
};

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function searchPlace(row) {
  const query = `${searchAliases[row.park] || row.park}, ${row.city}, ${row.state}, USA`;
  const parameters = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "3",
    countrycodes: "us",
  });
  const response = await fetch(`${endpoint}?${parameters}`, {
    headers: {
      "User-Agent": "AuditMap park research/1.0 (https://www.auditmap.org)",
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
  const results = await response.json();
  const match =
    results.find((result) => ["park", "nature_reserve", "recreation_ground"].includes(result.type)) ||
    results[0];
  if (!match) return null;

  const address = match.address || {};
  return {
    id: `launch-${slugify(row.state)}-${slugify(row.city)}-${slugify(row.park)}`,
    park: row.park,
    city: row.city,
    state: row.state,
    latitude: Number(match.lat),
    longitude: Number(match.lon),
    address:
      [address.house_number, address.road].filter(Boolean).join(" ") ||
      address.suburb ||
      address.city ||
      row.city,
    displayName: match.display_name,
    osmType: match.osm_type,
    osmId: match.osm_id,
    source: "OpenStreetMap contributors",
    sourceUrl: `https://www.openstreetmap.org/${match.osm_type}/${match.osm_id}`,
    checkedAt: new Date().toISOString().slice(0, 10),
  };
}

async function main() {
  const lines = fs.readFileSync(csvPath, "utf8").trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift());
  const rows = lines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
  const existing = fs.existsSync(outputPath)
    ? JSON.parse(fs.readFileSync(outputPath, "utf8"))
    : { locations: [] };
  const locations = new Map(existing.locations.map((location) => [location.id, location]));
  const unresolved = [];

  for (const [index, row] of rows.entries()) {
    const id = `launch-${slugify(row.state)}-${slugify(row.city)}-${slugify(row.park)}`;
    if (locations.has(id)) continue;
    try {
      const location = await searchPlace(row);
      if (location) locations.set(id, location);
      else unresolved.push({ id, park: row.park, city: row.city, state: row.state });
    } catch (error) {
      unresolved.push({ id, park: row.park, city: row.city, state: row.state, error: error.message });
    }
    process.stdout.write(`\rResolved ${locations.size}/${rows.length}; checked ${index + 1}/${rows.length}`);
    await sleep(1100);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        attribution: "OpenStreetMap contributors",
        attributionUrl: "https://www.openstreetmap.org/copyright",
        locations: [...locations.values()],
        unresolved,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`\nSaved ${locations.size} locations; ${unresolved.length} unresolved.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
