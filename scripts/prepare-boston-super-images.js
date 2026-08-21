#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/boston-super-enrichment-campaign.json");
const research = require("../data/boston-photo-research.json");
const names = new Map(campaign.places.map((place) => [place.id, place.name]));

const slugify = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function download(file) {
  const encoded = encodeURIComponent(file.replaceAll(" ", "_"));
  const page = `https://commons.wikimedia.org/wiki/File:${encoded}`;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://commons.wikimedia.org/wiki/Special:Redirect/file/${encoded}?width=1920`, {
      headers: { "User-Agent": "AuditMap/1.0 (https://www.auditmap.org; contact@auditmap.org)" },
    });
    if (response.ok) return { buffer: Buffer.from(await response.arrayBuffer()), page };
    if (response.status !== 429 || attempt === 3) throw new Error(`${file}: Wikimedia returned ${response.status} (${page})`);
    await wait(2500 * (attempt + 1));
  }
}

(async () => {
  const manifest = { checkedAt: research.checkedAt, places: {} };
  for (const [id, entry] of Object.entries(research.places)) {
    const name = names.get(id);
    if (!name) throw new Error(`Photo record has no campaign place: ${id}`);
    const directory = path.join(root, "assets/parks/boston-super", slugify(name));
    fs.mkdirSync(directory, { recursive: true });
    const images = [];
    for (let index = 0; index < entry.images.length; index += 1) {
      const item = entry.images[index];
      const label = item.file || item.name || new URL(item.url).pathname.split("/").pop();
      const target = path.join(directory, `${String(index + 1).padStart(2, "0")}-${slugify(label)}.webp`);
      const source = item.source || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(item.file.replaceAll(" ", "_"))}`;
      if (!fs.existsSync(target)) {
        const buffer = item.url
          ? Buffer.from(await (async () => {
              const response = await fetch(item.url, { headers: { "User-Agent": "AuditMap/1.0 (https://www.auditmap.org)" } });
              if (!response.ok) throw new Error(`${label}: source returned ${response.status}`);
              return response.arrayBuffer();
            })())
          : (await download(item.file)).buffer;
        await sharp(buffer).rotate().resize(1600, 1000, { fit: "cover", position: "attention", withoutEnlargement: true }).webp({ quality: 83 }).toFile(target);
        await wait(700);
      }
      const metadata = await sharp(target).metadata();
      images.push({
        url: `/${path.relative(root, target)}`,
        source,
        author: item.author,
        license: item.license,
        alt: `${name} in Boston`,
        width: metadata.width,
        height: metadata.height,
        hero: item.hero === true,
      });
    }
    images.sort((left, right) => Number(right.hero) - Number(left.hero));
    for (const image of images) delete image.hero;
    manifest.places[id] = { name, images };
    console.log(`${name}: ${images.length} images`);
  }
  const output = path.join(root, "data/generated/boston-super-images.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Prepared ${Object.keys(manifest.places).length} Boston galleries.`);
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
