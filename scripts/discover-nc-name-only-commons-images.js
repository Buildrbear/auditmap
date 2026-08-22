const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const queue = JSON.parse(fs.readFileSync(path.join(root, "data", "generated", "nc-first-photo-queue.json"), "utf8"));
const outputPath = path.join(root, "data", "photo-research", "nc-name-only-commons-candidates.json");
const concurrency = 2;
const strip = (value = "") => String(value)
  .replace(/<[^>]+>/g, " ")
  .replace(/&[^;]+;/g, " ")
  .replace(/\s+/g, " ")
  .trim();
const normalize = (value = "") => strip(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();
const allowedLicense = /^(CC0|CC BY|CC BY-SA|Public domain|PDM)/i;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function distanceMeters(left, right) {
  if (![left.latitude, left.longitude, right.latitude, right.longitude].every(Number.isFinite)) return null;
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitude = radians(right.latitude - left.latitude);
  const longitude = radians(right.longitude - left.longitude);
  const a = Math.sin(latitude / 2) ** 2
    + Math.cos(radians(left.latitude)) * Math.cos(radians(right.latitude)) * Math.sin(longitude / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchJson(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, {
      headers: { "User-Agent": "AuditMap exact-name image research/1.0 (https://www.auditmap.org)" },
    });
    if (response.ok) return response.json();
    if (response.status !== 429 || attempt === 3) throw new Error(`HTTP ${response.status}`);
    await delay(attempt * 2_000);
  }
  throw new Error("Wikimedia request failed");
}

async function candidates(place) {
  const parameters = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `\"${place.name}\"`,
    gsrnamespace: "6",
    gsrlimit: "30",
    prop: "imageinfo|coordinates",
    iiprop: "url|extmetadata|mime",
    iiurlwidth: "1600",
    format: "json",
    origin: "*",
  });
  const payload = await fetchJson(`https://commons.wikimedia.org/w/api.php?${parameters}`);
  const normalizedName = normalize(place.name);
  const city = normalize(place.city);

  return Object.values(payload.query?.pages || {})
    .map((page) => {
      const info = page.imageinfo?.[0] || {};
      const metadata = info.extmetadata || {};
      const license = strip(metadata.LicenseShortName?.value);
      const description = strip(metadata.ImageDescription?.value);
      const categories = strip(metadata.Categories?.value);
      const identity = normalize(`${page.title} ${description} ${categories}`);
      if (!info.thumburl
        || !info.mime?.startsWith("image/")
        || info.mime === "image/svg+xml"
        || !allowedLicense.test(license)
        || !identity.includes(normalizedName)
        || /\b(map|diagram|logo|seal|historical marker|aerial imagery)\b/.test(identity)) return null;

      const latitude = page.coordinates?.[0]?.lat;
      const longitude = page.coordinates?.[0]?.lon;
      const distance = distanceMeters(place, { latitude, longitude });
      const cityMatch = city && identity.includes(city);
      const proximityScore = distance === null
        ? 0
        : distance <= 500
          ? 30
          : distance <= 5_000
            ? 18
            : distance <= 25_000
              ? 6
              : -10;

      return {
        title: page.title,
        url: info.thumburl,
        source: info.descriptionurl,
        author: strip(metadata.Artist?.value) || "Wikimedia Commons contributor",
        license,
        description,
        latitude,
        longitude,
        distanceMeters: distance === null ? null : Math.round(distance),
        score: 30 + (cityMatch ? 20 : 0) + proximityScore,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score)
    .slice(0, 15);
}

async function main() {
  const places = queue.places;
  const results = new Array(places.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < places.length) {
      const index = nextIndex;
      nextIndex += 1;
      const place = places[index];
      try {
        const images = await candidates(place);
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
        results[index] = {
          id: place.id,
          name: place.name,
          city: place.city,
          status: "error",
          error: error.message,
          candidates: [],
        };
      }
      await delay(350);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  fs.writeFileSync(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), places: results }, null, 2)}\n`);
  console.log(JSON.stringify({
    places: results.length,
    withCandidates: results.filter((item) => item.candidates.length).length,
    totalCandidates: results.reduce((total, item) => total + item.candidates.length, 0),
    errors: results.filter((item) => item.status === "error").length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
