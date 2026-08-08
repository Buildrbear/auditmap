#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/philadelphia-super-enrichment-campaign.json");
const research = require("../data/philadelphia-photo-research.json");
const names = new Map(campaign.places.map((place) => [place.id, place.name]));
const slugify = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function commonsRecord(file) {
  const params = new URLSearchParams({ action: "query", titles: `File:${file}`, prop: "imageinfo", iiprop: "url|extmetadata", format: "json", origin: "*" });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { "User-Agent": "AuditMap/1.0 (https://www.auditmap.org; contact@auditmap.org)" } });
  if (!response.ok) throw new Error(`${file}: Commons API returned ${response.status}`);
  const page = Object.values((await response.json()).query?.pages || {})[0];
  if (!page || page.missing !== undefined || !page.imageinfo?.[0]?.thumburl && !page.imageinfo?.[0]?.url) throw new Error(`${file}: Commons file not found`);
  const info = page.imageinfo[0];
  const metadata = info.extmetadata || {};
  const strip = (value) => String(value || "").replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
  return {
    url: info.thumburl || info.url,
    source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,
    author: strip(metadata.Artist?.value) || "Wikimedia Commons contributor",
    license: strip(metadata.LicenseShortName?.value) || "Wikimedia Commons source license",
  };
}

async function fetchBuffer(url, label) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": "AuditMap/1.0 (https://www.auditmap.org; contact@auditmap.org)" } });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    if (response.status !== 429 || attempt === 3) throw new Error(`${label}: image returned ${response.status}`);
    await wait(2000 * (attempt + 1));
  }
}

(async () => {
  const manifest = { checkedAt: research.checkedAt, places: {} };
  for (const [id, entry] of Object.entries(research.places)) {
    const name = names.get(id);
    if (!name) throw new Error(`Unknown Philadelphia photo record: ${id}`);
    const candidates = entry.candidates || [];
    const directory = path.join(root, "assets/parks/philadelphia-super", slugify(name));
    fs.mkdirSync(directory, { recursive: true });
    const images = [];
    for (const [index, raw] of candidates.entries()) {
      const item = typeof raw === "string" ? { file: raw } : raw;
      const record = item.url ? item : { ...item, ...(await commonsRecord(item.file)) };
      const label = item.file || new URL(item.url).pathname.split("/").pop();
      const target = path.join(directory, `${String(index + 1).padStart(2, "0")}-${slugify(label)}.webp`);
      if (!fs.existsSync(target)) {
        const buffer = await fetchBuffer(record.url, label);
        await sharp(buffer).rotate().resize(1600, 1000, { fit: "cover", position: "attention", withoutEnlargement: true }).webp({ quality: 83 }).toFile(target);
        await wait(500);
      }
      const metadata = await sharp(target).metadata();
      images.push({ url: `/${path.relative(root, target)}`, source: record.source, author: record.author || "Source", license: record.license || "Source terms apply", alt: `${name} in Philadelphia`, width: metadata.width, height: metadata.height });
    }
    if (images.length < 3) throw new Error(`${name}: only ${images.length} image candidates`);
    manifest.places[id] = { name, images };
    console.log(`${name}: ${images.length} images`);
  }
  const output = path.join(root, "data/generated/philadelphia-super-images.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Prepared ${Object.keys(manifest.places).length} Philadelphia galleries.`);
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
