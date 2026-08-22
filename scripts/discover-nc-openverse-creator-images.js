const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const queue = JSON.parse(fs.readFileSync(path.join(root, "data", "generated", "nc-first-photo-queue.json"), "utf8"));
const creator = process.argv[2] || "ncwetlands.org";
const includeSourcePages = process.argv.includes("--source-pages");
const creatorSlug = creator.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const outputPath = path.join(root, "data", "photo-research", `nc-openverse-${creatorSlug}-collection.json`);
const reusableLicenses = new Set(["by", "by-sa", "cc0", "pdm"]);
const genericTerms = new Set([
  "and", "at", "center", "community", "dog", "east", "end", "greenway", "memorial", "nature",
  "north", "park", "playground", "recreation", "river", "school", "south", "state", "the", "trail",
  "veterans", "west",
]);

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bntr\b/g, "nature")
    .replace(/\bnat\b/g, "nature")
    .replace(/\bpk\b/g, "park")
    .replace(/\bsp\b/g, "state park")
    .replace(/\bsch\b/g, "school")
    .replace(/\s+/g, " ")
    .trim();
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchJson(url) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "AuditMap Openverse creator research/1.0 (https://www.auditmap.org)" },
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

async function fetchText(url) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "AuditMap licensed source research/1.0 (https://www.auditmap.org)" },
        signal: controller.signal,
      });
      if (response.ok) return response.text();
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
  throw new Error("Source-page request failed");
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function sourceDescription(html = "") {
  const match = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)
    || html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
  return decodeHtml(match?.[1] || "").trim();
}

async function enrichFromSourcePages(media) {
  const batchSize = 4;
  for (let index = 0; index < media.length; index += batchSize) {
    const batch = media.slice(index, index + batchSize);
    await Promise.all(batch.map(async (candidate) => {
      if (!candidate.foreign_landing_url) return;
      try {
        const html = await fetchText(candidate.foreign_landing_url);
        candidate.sourceDescription = sourceDescription(html);
      } catch (error) {
        candidate.sourceDescriptionError = error.message;
      }
    }));
    console.log(`${creator}: source pages ${Math.min(index + batch.length, media.length)}/${media.length}`);
    await delay(250);
  }
}

function match(place, media) {
  const name = normalize(place.name);
  const city = normalize(place.city);
  const title = normalize(`${media.title || ""} ${media.sourceDescription || ""}`);
  const titleTerms = new Set(title.split(" ").filter(Boolean));
  const nameTerms = [...new Set(name.split(" ").filter(Boolean))];
  const distinctiveTerms = nameTerms.filter((term) => term.length > 3 && !genericTerms.has(term));
  const matchedNameTerms = nameTerms.filter((term) => titleTerms.has(term));
  const matchedDistinctiveTerms = distinctiveTerms.filter((term) => titleTerms.has(term));
  const exactName = title.includes(name);
  const cityMatch = city ? title.includes(city) : false;
  const distinctiveThreshold = Math.max(1, Math.ceil(distinctiveTerms.length * 0.7));
  const accepted = (exactName && (cityMatch || distinctiveTerms.length > 0))
    || (cityMatch && matchedDistinctiveTerms.length >= distinctiveThreshold && matchedNameTerms.length >= 2);
  if (!accepted) return null;

  return {
    exactName,
    cityMatch,
    matchedNameTerms,
    matchedDistinctiveTerms,
    score: (exactName ? 50 : 0)
      + matchedDistinctiveTerms.length * 12
      + matchedNameTerms.length * 3,
  };
}

async function main() {
  const media = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount) {
    const parameters = new URLSearchParams({
      creator,
      source: "flickr",
      page: String(page),
      page_size: "20",
      mature: "false",
    });
    const payload = await fetchJson(`https://api.openverse.org/v1/images/?${parameters}`);
    pageCount = payload.page_count || 1;
    media.push(...(payload.results || []).filter((candidate) => reusableLicenses.has(candidate.license)));
    console.log(`${creator}: page ${page}/${pageCount}`);
    page += 1;
    await delay(350);
  }

  if (includeSourcePages) await enrichFromSourcePages(media);

  const places = [];
  for (const place of queue.places) {
    const candidates = media
      .map((candidate) => ({ candidate, match: match(place, candidate) }))
      .filter(({ match: candidateMatch }) => candidateMatch)
      .sort((left, right) => right.match.score - left.match.score)
      .map(({ candidate, match: candidateMatch }) => ({
        title: candidate.title || `${place.name} photograph`,
        description: candidate.sourceDescription || "",
        url: candidate.url,
        thumbnail: candidate.thumbnail || "",
        source: candidate.foreign_landing_url,
        author: candidate.creator || creator,
        authorUrl: candidate.creator_url || "",
        license: String(candidate.license || "").toUpperCase(),
        licenseVersion: candidate.license_version || "",
        licenseUrl: candidate.license_url || "",
        provider: candidate.provider || candidate.source || "Openverse",
        width: candidate.width || null,
        height: candidate.height || null,
        ...candidateMatch,
      }));
    if (!candidates.length) continue;
    places.push({
      id: place.id,
      name: place.name,
      city: place.city,
      latitude: place.latitude,
      longitude: place.longitude,
      status: "candidates",
      candidates,
    });
  }

  fs.writeFileSync(outputPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    creator,
    source: "flickr",
    includeSourcePages,
    mediaCount: media.length,
    places,
  }, null, 2)}\n`);
  console.log(JSON.stringify({
    creator,
    media: media.length,
    places: places.length,
    candidates: places.reduce((total, place) => total + place.candidates.length, 0),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
