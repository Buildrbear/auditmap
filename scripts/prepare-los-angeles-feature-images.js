#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const places = require("../data/generated/launch-map-places.json");
const ids = new Set([
  "launch-ca-los-angeles-griffith-park",
  "launch-ca-los-angeles-elysian-park",
  "launch-ca-los-angeles-exposition-park",
  "launch-ca-los-angeles-gloria-molina-grand-park",
  "launch-ca-los-angeles-echo-park-lake",
  "launch-ca-los-angeles-venice-beach-ocean-front-walk",
  "launch-ca-los-angeles-runyon-canyon-park",
  "launch-ca-los-angeles-los-angeles-state-historic-park",
  "launch-ca-los-angeles-kenneth-hahn-state-recreation-area",
]);
const keepCurrent = new Set([
  "launch-ca-los-angeles-griffith-park:griffith-observatory",
  "launch-ca-los-angeles-griffith-park:mount-hollywood-trails",
  "launch-ca-los-angeles-exposition-park:exposition-park-rose-garden",
  "launch-ca-los-angeles-gloria-molina-grand-park:arthur-j-will-fountain-splash-pad",
  "launch-ca-los-angeles-gloria-molina-grand-park:grand-park-playground",
  "launch-ca-los-angeles-echo-park-lake:lake-loop-lotus-beds",
  "launch-ca-los-angeles-venice-beach-ocean-front-walk:venice-skatepark",
  "launch-ca-los-angeles-kenneth-hahn-state-recreation-area:blue-lagoon-picnic-area",
  "launch-ca-los-angeles-kenneth-hahn-state-recreation-area:playgrounds-picnic-areas",
]);
const rejectedMatches = new Set([
  "launch-ca-los-angeles-exposition-park:california-science-center",
  "launch-ca-los-angeles-echo-park-lake:echo-park-pedal-boats",
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
    return { url: new URL(decode(match[1]), feature.source_url).href, source: feature.source_url, author: parent.sourceLabel, license: `Official ${parent.sourceLabel} photograph; source attribution retained`, matchMethod: "official feature page" };
  } catch {
    return null;
  }
}

async function commons(feature) {
  const params = new URLSearchParams({ action: "query", generator: "search", gsrsearch: `"${feature.name}" Los Angeles`, gsrnamespace: "6", gsrlimit: "8", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "1800", format: "json", origin: "*" });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org" } });
  if (!response.ok) return null;
  const payload = await response.json();
  const ignored = new Set(["los", "angeles", "park", "trail", "area", "center", "avenue", "street", "entrance", "public", "grand", "echo", "venice", "runyon", "kenneth", "hahn"]);
  const words = slug(feature.name).split("-").filter((word) => word.length > 3 && !ignored.has(word));
  const candidates = Object.values(payload.query?.pages || {}).map((page) => {
    const info = page.imageinfo?.[0];
    const haystack = slug(`${page.title} ${info?.extmetadata?.ImageDescription?.value || ""}`);
    const score = words.reduce((total, word) => total + (haystack.includes(word) ? 2 : 0), haystack.includes("los-angeles") ? 2 : 0);
    return { info, score };
  }).sort((left, right) => right.score - left.score);
  const hit = candidates.find(({ info, score }) => info?.thumburl && words.length && score >= Math.max(5, words.length * 2));
  if (!hit) return null;
  return { url: hit.info.thumburl || hit.info.url, source: hit.info.descriptionurl, author: plain(hit.info.extmetadata?.Artist?.value) || "Wikimedia Commons contributor", license: plain(hit.info.extmetadata?.LicenseShortName?.value) || "Wikimedia Commons source license", matchMethod: "strict title match on Wikimedia Commons" };
}

async function download(record, target, label) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(record.url, { headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org", Referer: record.source } });
    if (response.ok) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize(1600, 1000, { fit: "cover", position: "attention", withoutEnlargement: true }).webp({ quality: 83 }).toFile(target);
      return;
    }
    if (response.status !== 429 && response.status < 500) throw new Error(`${label}: image HTTP ${response.status}`);
    if (attempt === 5) throw new Error(`${label}: image HTTP ${response.status}`);
    await wait(attempt * 1200);
  }
}

(async () => {
  const output = { checkedAt: "2026-08-06", places: {} };
  for (const parent of places.filter((place) => ids.has(place.id))) {
    output.places[parent.id] = {};
    for (const feature of parent.features || []) {
      if (keepCurrent.has(`${parent.id}:${feature.slug}`)) continue;
      let record = await official(feature, parent);
      const usedOfficial = Boolean(record);
      if (!record) {
        await wait(200);
        record = await commons(feature);
      }
      if (!record) {
        console.log(`${parent.name}/${feature.name}: no exact replacement; retaining current image`);
        continue;
      }
      if (rejectedMatches.has(`${parent.id}:${feature.slug}`)) {
        console.log(`${parent.name}/${feature.name}: rejected after visual review; retaining current image`);
        continue;
      }
      const target = path.join(root, "assets/parks/los-angeles-super/features", slug(parent.name), `${feature.slug}.webp`);
      try {
        await download(record, target, `${parent.name}/${feature.name}`);
      } catch (error) {
        if (!usedOfficial) throw error;
        await wait(200);
        record = await commons(feature);
        if (!record) {
          console.log(`${parent.name}/${feature.name}: official image unavailable; retaining current image`);
          continue;
        }
        await download(record, target, `${parent.name}/${feature.name}`);
      }
      const metadata = await sharp(target).metadata();
      output.places[parent.id][feature.slug] = { ...record, url: `/${path.relative(root, target)}`, alt: `${feature.name} at ${parent.name}`, width: metadata.width, height: metadata.height };
      console.log(`${parent.name}/${feature.name}: ${record.matchMethod} (${metadata.width}x${metadata.height})`);
      await wait(200);
    }
  }
  fs.writeFileSync(path.join(root, "data/generated/los-angeles-feature-images.json"), `${JSON.stringify(output, null, 2)}\n`);
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
