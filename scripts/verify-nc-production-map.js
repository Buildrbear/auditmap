const fs = require("node:fs");

const origin = process.env.AUDITMAP_ORIGIN || "https://www.auditmap.org";
const sitemap = fs.readFileSync("sitemap.xml", "utf8");
const pagePaths = [...sitemap.matchAll(/<loc>https:\/\/www\.auditmap\.org(\/us\/nc\/[^<]+)<\/loc>/g)]
  .map((match) => match[1])
  .filter((pagePath) => /^\/us\/nc\/[^/]+\/parks\/[^/]+$/.test(pagePath));

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function citySlug(place) {
  return place.citySlug || slugify(`${place.city}-${place.state}`);
}

function placeKey(place) {
  return `${citySlug(place)}:${place.id}`;
}

function mergePlaceRecords(currentPlaces, incomingPlaces) {
  const records = new Map();
  for (const place of [...currentPlaces, ...incomingPlaces]) {
    const key = placeKey(place);
    const current = records.get(key);
    if (!current) {
      records.set(key, place);
      continue;
    }
    records.set(key, {
      ...current,
      ...place,
      image: place.image || current.image,
      images: place.images?.length ? place.images : current.images,
      sources: place.sources?.length ? place.sources : current.sources,
      comments: place.comments?.length ? place.comments : current.comments,
      source: current.source || place.source,
      sourceLabel: current.sourceLabel || place.sourceLabel,
    });
  }
  return [...records.values()];
}

function isPublishablePlace(place) {
  if (["excluded", "deferred"].includes(place.publishStatus)) return false;
  const identity = `${place.name || ""} ${place.type || ""} ${place.searchCategory || ""}`;
  const ordinaryMunicipalBuilding = /\b(city|town|municipal|county)\s+(hall|office|offices|building|administration|administrative center)|\bgovernment\s+(center|office|offices|building)\b/i.test(identity);
  const administrativeType = /\b(city office|municipal office|government office|civic resource)\b/i.test(identity);
  const publicDestination = /\b(park|plaza|garden|museum|gallery|historic|landmark|memorial|trail|greenway|library|playground|recreation)\b/i.test(identity);
  return (!ordinaryMunicipalBuilding && !administrativeType) || publicDestination || place.publicDestination === true;
}

function canonicalPageRecords() {
  return pagePaths.map((pagePath) => {
    const html = fs.readFileSync(`.${pagePath}/index.html`, "utf8");
    const match = html.match(/<script id="search-place-data" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) return { pagePath, invalid: "place data missing" };
    const place = JSON.parse(match[1]);
    return { pagePath, id: place.id, citySlug: place.citySlug || slugify(`${place.city}-${place.state}`) };
  });
}

async function fetchJson(path, attempts = 3, timeoutMs = 15000) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error(`${path}: timed out`)), timeoutMs);
    try {
      const response = await fetch(`${origin}${path}`, {
        redirect: "follow",
        signal: controller.signal,
      });
      if (response.ok) return JSON.parse(await response.text());
      lastError = new Error(`${path}: HTTP ${response.status}`);
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
  throw lastError;
}

async function main() {
  const [curated, launch, sharedResult] = await Promise.all([
    fetchJson("/data/institutions.json"),
    fetchJson("/data/generated/launch-map-places.json"),
    fetchJson("/api/places?limit=250", 1, 5000)
      .then((payload) => ({ payload, warning: null }))
      .catch((error) => ({ payload: { places: [] }, warning: error.message })),
  ]);
  const sharedPayload = sharedResult.payload;
  const shared = sharedPayload.places || [];
  const merged = mergePlaceRecords(mergePlaceRecords(curated, launch), shared).filter(isPublishablePlace);
  const ncMap = new Map(merged.filter((place) => place.state === "NC").map((place) => [placeKey(place), place]));
  const pages = canonicalPageRecords();
  const missing = [];
  const invalidCoordinates = [];

  for (const page of pages) {
    if (page.invalid) {
      missing.push(page);
      continue;
    }
    const key = `${page.citySlug}:${page.id}`;
    const place = ncMap.get(key);
    if (!place) {
      missing.push({ ...page, key });
      continue;
    }
    if (!Number.isFinite(Number(place.latitude)) || !Number.isFinite(Number(place.longitude))) {
      invalidCoordinates.push({ ...page, key, latitude: place.latitude, longitude: place.longitude });
    }
  }

  const hiddenAdministrativeRecords = [...curated, ...launch, ...shared]
    .filter((place) => place.state === "NC" && !isPublishablePlace(place))
    .map((place) => ({ id: place.id, name: place.name, type: place.type }));
  const visibleAdministrativeRecords = [...ncMap.values()]
    .filter((place) => /\b(city|town|municipal|county)\s+(hall|office|offices|building|administration|administrative center)|\bgovernment\s+(center|office|offices|building)\b/i.test(`${place.name || ""} ${place.type || ""}`))
    .map((place) => ({ id: place.id, name: place.name, type: place.type }));

  const report = {
    valid: missing.length === 0 && invalidCoordinates.length === 0 && visibleAdministrativeRecords.length === 0,
    origin,
    canonicalNcPages: pages.length,
    visibleNcMapRecords: ncMap.size,
    canonicalPagesOnMap: pages.length - missing.length,
    missing,
    invalidCoordinates,
    hiddenAdministrativeRecords,
    visibleAdministrativeRecords,
    communityApiWarning: sharedResult.warning,
  };

  console.log(JSON.stringify(report, null, 2));
  if (!report.valid) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
