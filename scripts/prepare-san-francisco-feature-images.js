#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/san-francisco-super-enrichment-campaign.json");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const plain = (value) => String(value || "").replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
const ignored = new Set(["and", "area", "park", "san", "francisco", "street", "field", "garden", "beach", "lawn", "entrance", "public", "center", "trail", "overlook"]);
const rejectedMatches = new Set([
  "launch-ca-san-francisco-golden-gate-park:japanese-tea-garden",
  "launch-ca-san-francisco-crissy-field:crissy-field-center",
]);

async function commons(name, parent) {
  const params = new URLSearchParams({ action: "query", generator: "search", gsrsearch: `"${name}" "${parent}"`, gsrnamespace: "6", gsrlimit: "10", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "1800", format: "json", origin: "*" });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org" } });
  if (!response.ok) throw new Error(`Commons HTTP ${response.status}`);
  const payload = await response.json();
  const words = slug(name).split("-").filter((word) => word.length > 3 && !ignored.has(word));
  const candidates = Object.values(payload.query?.pages || {}).map((page) => {
    const info = page.imageinfo?.[0];
    const haystack = slug(`${page.title} ${info?.extmetadata?.ImageDescription?.value || ""}`);
    const hits = words.filter((word) => haystack.includes(word)).length;
    return { info, hits, score: hits * 3 + (haystack.includes(slug(parent)) ? 3 : 0) };
  }).sort((a, b) => b.score - a.score);
  const hit = candidates.find((candidate) => candidate.info?.thumburl && candidate.hits >= Math.max(1, Math.ceil(words.length * 0.75)) && candidate.score >= 6);
  if (!hit) return null;
  return {
    downloadUrl: hit.info.thumburl || hit.info.url,
    source: hit.info.descriptionurl,
    author: plain(hit.info.extmetadata?.Artist?.value) || "Wikimedia Commons contributor",
    license: plain(hit.info.extmetadata?.LicenseShortName?.value) || "Wikimedia Commons source license",
    matchMethod: "strict destination match on Wikimedia Commons",
  };
}

async function download(record, target, label) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(record.downloadUrl, { headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org" } });
    if (response.ok) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize(1600, 1000, { fit: "cover", position: "attention", withoutEnlargement: true }).webp({ quality: 83 }).toFile(target);
      return;
    }
    if (attempt === 5 || (response.status !== 429 && response.status < 500)) throw new Error(`${label}: image HTTP ${response.status}`);
    await wait(attempt * 1200);
  }
}

(async () => {
  const output = { checkedAt: campaign.checkedAt, places: {} };
  for (const parent of campaign.places) {
    output.places[parent.id] = {};
    for (const name of parent.subsites) {
      const key = slug(name);
      let record = null;
      try {
        record = await commons(name, parent.name);
      } catch (error) {
        console.warn(`${parent.name}/${name}: ${error.message}`);
      }
      if (!record) {
        console.log(`${parent.name}/${name}: retaining reviewed parent image`);
        await wait(250);
        continue;
      }
      if (rejectedMatches.has(`${parent.id}:${key}`)) {
        console.log(`${parent.name}/${name}: rejected after visual review; retaining reviewed parent image`);
        await wait(250);
        continue;
      }
      const target = path.join(root, "assets/parks/san-francisco-super/features", slug(parent.name), `${key}.webp`);
      await download(record, target, `${parent.name}/${name}`);
      const metadata = await sharp(target).metadata();
      output.places[parent.id][key] = { url: `/${path.relative(root, target)}`, source: record.source, author: record.author, license: record.license, matchMethod: record.matchMethod, alt: `${name} at ${parent.name}`, width: metadata.width, height: metadata.height };
      console.log(`${parent.name}/${name}: exact photo (${metadata.width}x${metadata.height})`);
      await wait(450);
    }
  }
  fs.mkdirSync(path.join(root, "data/generated"), { recursive: true });
  fs.writeFileSync(path.join(root, "data/generated/san-francisco-feature-images.json"), `${JSON.stringify(output, null, 2)}\n`);
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
