#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const places = require("../data/generated/launch-map-places.json");
const ids = new Set([
  "launch-dc-washington-national-mall",
  "launch-dc-washington-rock-creek-park",
  "launch-dc-washington-anacostia-park",
  "launch-dc-washington-kenilworth-park-aquatic-gardens",
  "launch-dc-washington-theodore-roosevelt-island",
  "launch-dc-washington-meridian-hill-park-malcolm-x-park",
  "launch-dc-washington-georgetown-waterfront-park",
  "launch-dc-washington-u-s-national-arboretum",
]);
const targetSlugs = new Set([
  "korean-war-veterans-memorial", "franklin-delano-roosevelt-memorial",
  "rock-creek-horse-center", "old-stone-house", "dumbarton-oaks-park", "fort-derussy", "western-ridge-trail",
  "anacostia-park-pirate-ship-playground", "anacostia-park-boat-ramp", "anacostia-park-section-f", "river-terrace-recreation-area", "langston-golf-course", "anacostia-pool-and-recreation-center",
  "kenilworth-aquatic-gardens-visitor-center", "kenilworth-pond-loop", "kenilworth-marsh-trail", "anacostia-river-trail-connection-at-kenilworth", "kenilworth-marsh-overlook", "kenilworth-park-fields",
  "theodore-roosevelt-island-footbridge", "woods-trail", "upland-trail", "theodore-roosevelt-island-potomac-overlook", "theodore-roosevelt-island-comfort-station", "theodore-roosevelt-island-tidal-marsh",
  "meridian-hill-upper-lawn", "meridian-hill-lower-plaza", "meridian-hill-sunday-drum-circle", "dante-statue", "james-buchanan-memorial",
  "georgetown-waterfront-labyrinth", "river-steps-and-pergola", "georgetown-potomac-overlook", "georgetown-waterfront-pergola-garden", "capital-crescent-trail-connection", "rock-creek-trail-connection", "key-bridge-waterfront-access",
  "national-herb-garden", "asian-collections", "gotelli-conifer-collection", "friendship-garden", "fern-valley-native-plant-collections",
]);
const rejectedMatches = new Set([
  "launch-dc-washington-rock-creek-park:rock-creek-horse-center",
  "launch-dc-washington-rock-creek-park:old-stone-house",
  "launch-dc-washington-rock-creek-park:dumbarton-oaks-park",
  "launch-dc-washington-kenilworth-park-aquatic-gardens:kenilworth-park-fields",
  "launch-dc-washington-u-s-national-arboretum:national-herb-garden",
  "launch-dc-washington-u-s-national-arboretum:gotelli-conifer-collection",
]);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const plain = (value) => String(value || "").replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
const decode = (value) => String(value || "").replaceAll("&amp;", "&").replaceAll("&#039;", "'").replaceAll("&quot;", '"');

async function official(feature, parent) {
  if (!feature.source_url || feature.source_url === parent.source) return null;
  try {
    const response = await fetch(feature.source_url, { headers: { "User-Agent": "Mozilla/5.0 AuditMap/1.0" } });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
    if (!match?.[1]) return null;
    return {
      url: new URL(decode(match[1]), feature.source_url).href,
      source: feature.source_url,
      author: parent.sourceLabel,
      license: `Official ${parent.sourceLabel} photograph; source attribution retained`,
      matchMethod: "official feature page",
    };
  } catch {
    return null;
  }
}

async function commons(feature, parent) {
  const params = new URLSearchParams({
    action: "query", generator: "search", gsrsearch: `"${feature.name}" Washington DC`,
    gsrnamespace: "6", gsrlimit: "8", prop: "imageinfo", iiprop: "url|extmetadata",
    iiurlwidth: "1800", format: "json", origin: "*",
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org" } });
  if (!response.ok) return null;
  const payload = await response.json();
  const ignored = new Set(["washington", "park", "trail", "access", "area", "center", "national", "theodore", "roosevelt", "island", "georgetown", "kenilworth", "anacostia"]);
  const words = slug(feature.name).split("-").filter((word) => word.length > 3 && !ignored.has(word));
  const candidates = Object.values(payload.query?.pages || {}).map((page) => {
    const info = page.imageinfo?.[0];
    const haystack = slug(`${page.title} ${info?.extmetadata?.ImageDescription?.value || ""}`);
    const score = words.reduce((total, word) => total + (haystack.includes(word) ? 2 : 0), haystack.includes("washington") ? 1 : 0);
    return { info, score };
  }).sort((left, right) => right.score - left.score);
  const hit = candidates.find(({ info, score }) => info?.thumburl && words.length && score >= Math.max(5, words.length * 2));
  if (!hit) return null;
  return {
    url: hit.info.thumburl || hit.info.url,
    source: hit.info.descriptionurl,
    author: plain(hit.info.extmetadata?.Artist?.value) || "Wikimedia Commons contributor",
    license: plain(hit.info.extmetadata?.LicenseShortName?.value) || "Wikimedia Commons source license",
    matchMethod: "strict title match on Wikimedia Commons",
  };
}

async function download(record, target, label) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(record.url, { headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org", Referer: record.source } });
    if (response.ok) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize(1600, 1000, { fit: "cover", position: "attention", withoutEnlargement: true }).webp({ quality: 83 }).toFile(target);
      return;
    }
    if (response.status !== 429 && response.status < 500)
      throw new Error(`${label}: image HTTP ${response.status}`);
    if (attempt === 5) throw new Error(`${label}: image HTTP ${response.status}`);
    await wait(attempt * 1200);
  }
}

(async () => {
  const output = { checkedAt: "2026-08-06", places: {} };
  for (const parent of places.filter((place) => ids.has(place.id))) {
    output.places[parent.id] = {};
    for (const feature of parent.features || []) {
      if (!targetSlugs.has(feature.slug)) continue;
      if (rejectedMatches.has(`${parent.id}:${feature.slug}`)) {
        console.log(`${parent.name}/${feature.name}: rejected after visual review; retaining current image`);
        continue;
      }
      let record = await official(feature, parent);
      const usedOfficial = Boolean(record);
      if (!record) {
        await wait(250);
        record = await commons(feature, parent);
      }
      if (!record) {
        console.log(`${parent.name}/${feature.name}: no exact replacement; retaining current image`);
        continue;
      }
      const target = path.join(root, "assets/parks/washington-dc-super/features", slug(parent.name), `${feature.slug}.webp`);
      try {
        await download(record, target, `${parent.name}/${feature.name}`);
      } catch (error) {
        if (!usedOfficial) throw error;
        await wait(250);
        record = await commons(feature, parent);
        if (!record) {
          console.log(`${parent.name}/${feature.name}: official image unavailable; retaining current image`);
          continue;
        }
        await download(record, target, `${parent.name}/${feature.name}`);
      }
      const metadata = await sharp(target).metadata();
      output.places[parent.id][feature.slug] = { ...record, url: `/${path.relative(root, target)}`, alt: `${feature.name} at ${parent.name}`, width: metadata.width, height: metadata.height };
      console.log(`${parent.name}/${feature.name}: ${record.matchMethod} (${metadata.width}x${metadata.height})`);
      await wait(250);
    }
  }
  fs.writeFileSync(path.join(root, "data/generated/dc-feature-images.json"), `${JSON.stringify(output, null, 2)}\n`);
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
