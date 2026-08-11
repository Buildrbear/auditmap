#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/boise-evidence-gate-campaign.json");
const selections = require("../data/boise-evidence-gate-photo-selections.json");
const existing = require("../data/generated/intermountain-super-images.json");
const names = new Map(campaign.places.map((place) => [place.id, place.name]));
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const strip = (value) => String(value || "").replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function commons(file) {
  const query = new URLSearchParams({
    action: "query", titles: `File:${file}`, prop: "imageinfo", iiprop: "url|extmetadata",
    iiurlwidth: "2000", format: "json", origin: "*",
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${query}`, {
    headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org" },
  });
  const payload = await response.json();
  const page = Object.values(payload.query?.pages || {})[0];
  const image = page?.imageinfo?.[0];
  if (!response.ok || !image) throw new Error(`${file}: Commons record not found`);
  return {
    url: image.thumburl || image.url,
    source: image.descriptionurl,
    author: strip(image.extmetadata?.Artist?.value),
    license: strip(image.extmetadata?.LicenseShortName?.value),
  };
}

async function download(url, label) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org" } });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    if (attempt === 5 || ![429, 503].includes(response.status)) throw new Error(`${label}: download failed (${response.status})`);
    await wait(1200 * (attempt + 1));
  }
}

(async () => {
  const output = { checkedAt: selections.reviewedAt, places: {} };
  const annId = "launch-id-boise-ann-morrison-park";
  const annImages = existing.places?.[annId]?.images || [];
  if (annImages.length !== 4) throw new Error("Ann Morrison Park: expected four existing reviewed images");
  for (const image of annImages) {
    if (!image.url || !fs.existsSync(path.join(root, image.url.slice(1)))) throw new Error(`Ann Morrison Park: missing ${image.url}`);
  }
  output.places[annId] = { name: names.get(annId), images: annImages };
  console.log(`Ann Morrison Park: ${annImages.length} existing reviewed images reused`);

  for (const [id, entry] of Object.entries(selections.places)) {
    const name = names.get(id);
    if (!name) throw new Error(`${id}: missing campaign scope`);
    const directory = path.join(root, "assets/parks/boise-evidence-gate", slug(name));
    fs.mkdirSync(directory, { recursive: true });
    const images = [];
    for (const [index, candidate] of entry.candidates.entries()) {
      const record = await commons(candidate.file);
      if (record.license !== candidate.license || !record.author.includes(candidate.creator)) throw new Error(`${candidate.file}: live rights metadata changed`);
      const target = path.join(directory, `${String(index + 1).padStart(2, "0")}-${slug(candidate.file.replace(/\.[^.]+$/, ""))}.webp`);
      if (!fs.existsSync(target)) {
        const payload = await download(record.url, candidate.file);
        await sharp(payload).rotate().resize(1600, 1000, {
          fit: "cover", position: "attention", withoutEnlargement: true,
        }).webp({ quality: 83 }).toFile(target);
        await wait(350);
      }
      const metadata = await sharp(target).metadata();
      images.push({
        url: `/${path.relative(root, target)}`, source: record.source, author: candidate.creator,
        license: candidate.license, licenseUrl: candidate.licenseUrl, alt: candidate.alt,
        width: metadata.width, height: metadata.height,
      });
    }
    output.places[id] = { name, images };
    console.log(`${name}: ${images.length} reviewed images`);
  }
  fs.mkdirSync(path.join(root, "data/generated"), { recursive: true });
  fs.writeFileSync(path.join(root, "data/generated/boise-evidence-gate-images.json"), `${JSON.stringify(output, null, 2)}\n`);
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
