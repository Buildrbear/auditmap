#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const selections = require("../data/southeast-atlantic-photo-selections.json");
const campaign = require("../data/southeast-atlantic-super-enrichment-campaign.json");
const names = new Map(campaign.places.map((place) => [place.id, place.name]));
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function resolveCommonsUrl(candidate) {
  if (!candidate.source.includes("commons.wikimedia.org")) return candidate.url;
  const sourceUrl = new URL(candidate.source);
  const pageId = sourceUrl.searchParams.get("curid");
  if (!pageId) return candidate.url;
  const query = new URLSearchParams({
    action: "query",
    pageids: pageId,
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "2000",
    format: "json",
    origin: "*",
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${query}`, {
    headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org" },
  });
  const payload = await response.json();
  const page = Object.values(payload.query?.pages || {})[0];
  return page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url || candidate.url;
}

async function download(url, label) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AuditMap/1.0 contact@auditmap.org",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    if (attempt === 5 || ![429, 500, 502, 503, 504].includes(response.status)) {
      throw new Error(`${label}: download returned ${response.status}`);
    }
    await wait(1200 * (attempt + 1));
  }
}

(async () => {
  const output = { checkedAt: selections.reviewedAt, places: {} };
  for (const [id, place] of Object.entries(selections.places)) {
    const name = names.get(id);
    if (!name) throw new Error(`${id}: campaign place missing`);
    const directory = path.join(root, "assets/parks/southeast-atlantic-super", slug(name));
    fs.mkdirSync(directory, { recursive: true });
    const images = [];
    for (let index = 0; index < place.candidates.length; index += 1) {
      const candidate = place.candidates[index];
      const target = path.join(directory, `${String(index + 1).padStart(2, "0")}-${slug(candidate.title)}.webp`);
      if (!fs.existsSync(target)) {
        const imageUrl = await resolveCommonsUrl(candidate);
        const input = await download(imageUrl, `${name}/${candidate.title}`);
        await sharp(input)
          .rotate()
          .resize(1600, 1000, { fit: "cover", position: "attention", withoutEnlargement: true })
          .webp({ quality: 83 })
          .toFile(target);
        await wait(300);
      }
      const metadata = await sharp(target).metadata();
      images.push({
        url: `/${path.relative(root, target)}`,
        source: candidate.source,
        author: candidate.creator || "Source contributor",
        license: `${candidate.license}${candidate.licenseVersion ? ` ${candidate.licenseVersion}` : ""}`,
        licenseUrl: candidate.licenseUrl,
        alt: candidate.alt,
        width: metadata.width,
        height: metadata.height,
      });
    }
    if (images.length !== 4) throw new Error(`${name}: expected four prepared images`);
    output.places[id] = { name, images };
    console.log(`${name}: ${images.length} reviewed images`);
  }
  fs.mkdirSync(path.join(root, "data/generated"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "data/generated/southeast-atlantic-super-images.json"),
    `${JSON.stringify(output, null, 2)}\n`,
  );
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
