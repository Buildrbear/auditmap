const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const backlog = JSON.parse(fs.readFileSync(path.join(root, "data", "nc-enrichment-backlog.json"), "utf8"));
const generated = JSON.parse(fs.readFileSync(path.join(root, "data", "generated", "launch-park-locations.json"), "utf8")).locations;
const overrides = JSON.parse(fs.readFileSync(path.join(root, "data", "launch-location-overrides.json"), "utf8"));
const locations = new Map([...generated, ...overrides].map((place) => [place.id, place]));
const outputPath = path.join(root, "data", "photo-research", "nc-geotagged-commons-candidates.json");
const strip = (value = "") => String(value).replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
const allowed = /^(CC0|CC BY|CC BY-SA|Public domain|PDM)/i;

async function candidates(place, location) {
  const parameters = new URLSearchParams({
    action: "query", generator: "geosearch", ggsprimary: "all", ggsnamespace: "6",
    ggscoord: `${location.latitude}|${location.longitude}`, ggsradius: "1500", ggslimit: "60",
    prop: "imageinfo|coordinates", iiprop: "url|extmetadata|mime", iiurlwidth: "1600",
    format: "json", origin: "*"
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${parameters}`, { headers: { "User-Agent": "AuditMap image research/1.0 (https://www.auditmap.org)" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
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
    return {
      title: page.title,
      url: info.thumburl,
      source: info.descriptionurl,
      author: strip(metadata.Artist?.value) || "Wikimedia Commons contributor",
      license,
      description: strip(metadata.ImageDescription?.value),
      latitude: page.coordinates?.[0]?.lat,
      longitude: page.coordinates?.[0]?.lon,
      score
    };
  }).filter(Boolean).sort((left, right) => right.score - left.score).slice(0, 20);
}

async function main() {
  const results = [];
  for (const place of backlog.places.filter((item) => !item.hasHero)) {
    const location = locations.get(place.id);
    if (!location) { results.push({ ...place, status: "no-location", candidates: [] }); continue; }
    try {
      const images = await candidates(place, location);
      results.push({ id: place.id, name: place.name, city: place.city, latitude: location.latitude, longitude: location.longitude, status: images.length ? "candidates" : "none", candidates: images });
      console.log(`${place.city}: ${place.name} - ${images.length}`);
    } catch (error) {
      results.push({ id: place.id, name: place.name, city: place.city, status: "error", error: error.message, candidates: [] });
    }
  }
  fs.writeFileSync(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), places: results }, null, 2)}\n`);
  console.log(JSON.stringify({ places: results.length, withCandidates: results.filter((item) => item.candidates.length).length }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
