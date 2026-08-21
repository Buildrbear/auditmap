#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const args = Object.fromEntries(process.argv.slice(2).map((value, index, list) => value.startsWith("--") ? [value.slice(2), list[index + 1]] : null).filter(Boolean));
for (const key of ["campaign", "selections", "output", "asset-dir"]) if (!args[key]) throw new Error(`Missing --${key}`);
const campaign = JSON.parse(fs.readFileSync(path.join(root, args.campaign), "utf8"));
const selections = JSON.parse(fs.readFileSync(path.join(root, args.selections), "utf8"));
const names = new Map(campaign.places.map((place) => [place.id, place.name]));
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const imageSlug = (value) => slug(value).slice(0, 96).replace(/-+$/g, "") || "park-view";
const maxReviewedImages = 12;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function commonsUrl(candidate) {
  if (!candidate.source.includes("commons.wikimedia.org")) return candidate.url;
  const source = new URL(candidate.source);
  const params = new URLSearchParams({ action: "query", prop: "imageinfo", iiprop: "url", iiurlwidth: "2000", format: "json", origin: "*" });
  const pageId = source.searchParams.get("curid");
  if (pageId) params.set("pageids", pageId);
  else if (decodeURIComponent(source.pathname).includes("/wiki/File:")) params.set("titles", decodeURIComponent(source.pathname).split("/wiki/")[1].replaceAll("_", " "));
  else return candidate.url;
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org" } });
  const payload = await response.json();
  const page = Object.values(payload.query?.pages || {})[0];
  return page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url || candidate.url;
}
async function download(url, label) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org", Accept: "image/avif,image/webp,image/*,*/*;q=0.8" } });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    if (attempt === 5 || ![429, 500, 502, 503, 504].includes(response.status)) throw new Error(`${label}: ${response.status}`);
    await wait(1500 * (attempt + 1));
  }
}

(async () => {
  const output = { checkedAt: selections.reviewedAt, places: {} };
  for (const [id, place] of Object.entries(selections.places)) {
    const name = names.get(id);
    const directory = path.join(root, args["asset-dir"], slug(name));
    fs.mkdirSync(directory, { recursive: true });
    const images = [];
    for (let index = 0; index < place.candidates.length; index += 1) {
      const candidate = place.candidates[index];
      const target = path.join(directory, `${String(index + 1).padStart(2, "0")}-${imageSlug(candidate.title)}.webp`);
      if (!fs.existsSync(target)) {
        const input = await download(await commonsUrl(candidate), `${name}/${candidate.title}`);
        await sharp(input).rotate().resize(1600, 1000, { fit: "cover", position: "attention", withoutEnlargement: true }).webp({ quality: 83 }).toFile(target);
        await wait(300);
      }
      const metadata = await sharp(target).metadata();
      images.push({ url: `/${path.relative(root, target)}`, source: candidate.source, author: candidate.creator, license: `${candidate.license}${candidate.licenseVersion ? ` ${candidate.licenseVersion}` : ""}`, licenseUrl: candidate.licenseUrl, alt: candidate.alt, width: metadata.width, height: metadata.height });
    }
    if (images.length < 1 || images.length > maxReviewedImages) throw new Error(`${name}: expected one to ${maxReviewedImages} reviewed images`);
    output.places[id] = { name, images };
    console.log(`${name}: ${images.length} reviewed images`);
  }
  fs.mkdirSync(path.dirname(path.join(root, args.output)), { recursive: true });
  fs.writeFileSync(path.join(root, args.output), `${JSON.stringify(output, null, 2)}\n`);
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
