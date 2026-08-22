const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const queue = JSON.parse(fs.readFileSync(path.join(root, "data", "generated", "nc-first-photo-queue.json"), "utf8"));
const nameOnly = process.argv.includes("--name-only");
const reusableOnly = process.argv.includes("--reusable-only");
const outputName = nameOnly
  ? (reusableOnly ? "nc-openverse-name-only-reusable-candidates.json" : "nc-openverse-name-only-candidates.json")
  : (reusableOnly ? "nc-openverse-reusable-candidates.json" : "nc-openverse-candidates.json");
const outputPath = path.join(
  root,
  "data",
  "photo-research",
  outputName,
);
const concurrency = 4;
const reusableLicenses = new Set(["by", "by-sa", "cc0", "pdm"]);
const genericTerms = new Set(["park", "trail", "greenway", "beach", "recreation", "center", "memorial"]);

const normalize = (value = "") => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchJson(url) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "AuditMap Openverse image research/1.0 (https://www.auditmap.org)" },
        signal: controller.signal,
      });
      if (response.ok) return response.json();
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 4) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      if (attempt === 4) throw error;
    } finally {
      clearTimeout(timeout);
    }
    await delay(attempt * 2_000);
  }
  throw new Error("Openverse request failed");
}

function scoreCandidate(place, candidate) {
  const name = normalize(place.name);
  const city = normalize(place.city);
  const identity = normalize([
    candidate.title,
    candidate.creator,
    ...(candidate.tags || []).map((tag) => tag.name),
  ].join(" "));
  const distinctiveTerms = name.split(" ").filter((term) => term.length > 3 && !genericTerms.has(term));
  const matchedDistinctiveTerms = distinctiveTerms.filter((term) => identity.includes(term));
  const exactName = identity.includes(name);
  const cityMatch = city && identity.includes(city);
  const stateMatch = identity.includes("north carolina");

  return {
    exactName,
    cityMatch: Boolean(cityMatch),
    stateMatch,
    matchedDistinctiveTerms,
    score: (exactName ? 40 : 0)
      + (cityMatch ? 20 : 0)
      + (stateMatch ? 8 : 0)
      + matchedDistinctiveTerms.length * 5,
  };
}

async function candidates(place) {
  const query = nameOnly
    ? `"${place.name}"`
    : `${place.name} ${place.city} North Carolina`;
  const parameters = new URLSearchParams({
    q: query,
    page_size: "20",
    mature: "false",
  });
  if (reusableOnly) parameters.set("license", [...reusableLicenses].join(","));
  const payload = await fetchJson(`https://api.openverse.org/v1/images/?${parameters}`);

  return (payload.results || [])
    .filter((candidate) => reusableLicenses.has(candidate.license))
    .filter((candidate) => candidate.url && candidate.foreign_landing_url)
    .map((candidate) => ({ candidate, match: scoreCandidate(place, candidate) }))
    .filter(({ match }) => match.exactName || match.cityMatch || match.matchedDistinctiveTerms.length)
    .sort((left, right) => right.match.score - left.match.score
      || (right.candidate.width || 0) * (right.candidate.height || 0)
        - (left.candidate.width || 0) * (left.candidate.height || 0))
    .slice(0, 12)
    .map(({ candidate, match }) => ({
      title: candidate.title || `${place.name} photograph`,
      url: candidate.url,
      thumbnail: candidate.thumbnail || "",
      source: candidate.foreign_landing_url,
      author: candidate.creator || "Unknown creator",
      authorUrl: candidate.creator_url || "",
      license: String(candidate.license || "").toUpperCase(),
      licenseVersion: candidate.license_version || "",
      licenseUrl: candidate.license_url || "",
      provider: candidate.provider || candidate.source || "Openverse",
      width: candidate.width || null,
      height: candidate.height || null,
      query,
      ...match,
    }));
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
      queryMode: nameOnly ? "exact-name-only" : "name-city-state",
      reusableLicenseFilter: reusableOnly,
      places: results.filter(Boolean),
    }, null, 2)}\n`);
  }

  async function worker() {
    while (nextIndex < places.length) {
      const index = nextIndex;
      nextIndex += 1;
      const place = places[index];
      if (results[index]) continue;
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
      writeResults();
      await delay(400);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  writeResults();
  console.log(JSON.stringify({
    places: results.length,
    withCandidates: results.filter((item) => item.candidates.length).length,
    totalCandidates: results.reduce((total, item) => total + item.candidates.length, 0),
    highConfidenceCandidates: results.reduce(
      (total, item) => total + item.candidates.filter((candidate) => candidate.score >= 60).length,
      0,
    ),
    errors: results.filter((item) => item.status === "error").length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
