const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const queue = JSON.parse(fs.readFileSync(path.join(root, "data", "generated", "nc-first-photo-queue.json"), "utf8"));
const tight = process.argv.includes("--tight");
const outputPath = path.join(
  root,
  "data",
  "photo-research",
  tight ? "nc-geotagged-commons-tight-candidates.json" : "nc-geotagged-commons-candidates.json",
);
const radiusMeters = tight ? 350 : 1500;
const concurrency = 4;
const strip = (value = "") => String(value).replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
const allowed = /^(CC0|CC BY|CC BY-SA|Public domain|PDM)/i;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchJson(url) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(url, {
      headers: { "User-Agent": "AuditMap image research/1.0 (https://www.auditmap.org)" },
    });
    if (response.ok) return response.json();
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 4) {
      throw new Error(`HTTP ${response.status}`);
    }
    await delay(attempt * 1_500);
  }
  throw new Error("Wikimedia Commons request failed");
}

function distanceMeters(left, right) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const earthRadius = 6_371_000;
  const latitudeDelta = radians(right.latitude - left.latitude);
  const longitudeDelta = radians(right.longitude - left.longitude);
  const latitude1 = radians(left.latitude);
  const latitude2 = radians(right.latitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function candidates(place, location) {
  const parameters = new URLSearchParams({
    action: "query", generator: "geosearch", ggsprimary: "all", ggsnamespace: "6",
    ggscoord: `${location.latitude}|${location.longitude}`, ggsradius: String(radiusMeters), ggslimit: "60",
    prop: "imageinfo|coordinates", iiprop: "url|extmetadata|mime", iiurlwidth: "1600",
    format: "json", origin: "*"
  });
  const payload = await fetchJson(`https://commons.wikimedia.org/w/api.php?${parameters}`);
  const placeWords = place.name.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3 && !["park", "greenway", "community"].includes(word));
  return Object.values(payload.query?.pages || {}).map((page) => {
    const info = page.imageinfo?.[0] || {};
    const metadata = info.extmetadata || {};
    const license = strip(metadata.LicenseShortName?.value);
    const identity = `${page.title} ${strip(metadata.ImageDescription?.value)} ${strip(metadata.Categories?.value)}`.toLowerCase();
    if (!info.thumburl || info.mime === "image/svg+xml" || !allowed.test(license) || /map|diagram|logo|seal|sign only|historical marker/.test(identity)) return null;
    const exactMatches = placeWords.filter((word) => identity.includes(word)).length;
    const amenityMatches = (identity.match(/playground|splash|trail|lake|marina|field|court|garden|dog|river|bridge|nature|water|boat|forest/g) || []).length;
    const score = exactMatches * 12 + Math.min(amenityMatches, 4) * 3;
    const latitude = page.coordinates?.[0]?.lat;
    const longitude = page.coordinates?.[0]?.lon;
    return {
      title: page.title,
      url: info.thumburl,
      source: info.descriptionurl,
      author: strip(metadata.Artist?.value) || "Wikimedia Commons contributor",
      license,
      description: strip(metadata.ImageDescription?.value),
      latitude,
      longitude,
      distanceMeters: Number.isFinite(latitude) && Number.isFinite(longitude)
        ? distanceMeters(location, { latitude, longitude })
        : null,
      score
    };
  }).filter(Boolean).sort((left, right) => right.score - left.score
    || (left.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (right.distanceMeters ?? Number.MAX_SAFE_INTEGER)).slice(0, 20);
}

async function main() {
  const places = queue.places;
  const previous = fs.existsSync(outputPath)
    ? JSON.parse(fs.readFileSync(outputPath, "utf8")).places || []
    : [];
  const previousById = new Map(previous
    .filter((place) => place.status !== "error")
    .map((place) => [place.id, place]));
  const results = places.map((place) => previousById.get(place.id) || null);
  let nextIndex = 0;

  function writeResults() {
    fs.writeFileSync(outputPath, `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      complete: results.every(Boolean),
      searchRadiusMeters: radiusMeters,
      places: results.filter(Boolean),
    }, null, 2)}\n`);
  }

  async function worker() {
    while (nextIndex < places.length) {
      const index = nextIndex;
      nextIndex += 1;
      const place = places[index];
      if (results[index]) continue;
      if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
        results[index] = { ...place, status: "no-location", candidates: [] };
        writeResults();
        continue;
      }
      try {
        const images = await candidates(place, place);
        results[index] = {
          id: place.id,
          name: place.name,
          city: place.city,
          latitude: place.latitude,
          longitude: place.longitude,
          gapType: place.gapType,
          status: images.length ? "candidates" : "none",
          candidates: images,
        };
        console.log(`${place.city}: ${place.name} - ${images.length}`);
      } catch (error) {
        results[index] = { id: place.id, name: place.name, city: place.city, status: "error", error: error.message, candidates: [] };
      }
      writeResults();
      await delay(250);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  writeResults();
  console.log(JSON.stringify({
    places: results.length,
    withCandidates: results.filter((item) => item.candidates.length).length,
    totalCandidates: results.reduce((total, item) => total + item.candidates.length, 0),
    errors: results.filter((item) => item.status === "error").length,
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
