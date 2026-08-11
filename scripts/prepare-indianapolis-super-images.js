#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  sharp = require("sharp"),
  root = path.resolve(__dirname, ".."),
  campaign = require("../data/indianapolis-super-enrichment-campaign.json"),
  research = require("../data/indianapolis-photo-research.json"),
  currentIds = new Set(
    campaign.places.filter((place) => place.currentBatch).map((place) => place.id),
  ),
  names = new Map(campaign.places.map((p) => [p.id, p.name])),
  slug = (v) =>
    String(v)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
  wait = (ms) => new Promise((r) => setTimeout(r, ms));
const altText = (name, label) => {
  const key = `${name}/${label}`;
  const reviewed = {
    "Eagle Creek Park/Eagle Creek Park and Reservoir 2022 aerial.jpg": "Aerial view of Eagle Creek Reservoir surrounded by forest in autumn",
    "Eagle Creek Park/Eagle Creek Park nature center.jpg": "Snow-covered stone exterior of the Eagle Creek Park Ornithology Center among mature trees",
    "Eagle Creek Park/Eagle Creek Park 02.jpg": "Wooded shoreline and water at Eagle Creek Park",
    "Eagle Creek Park/Eagle Creek Park in the Fall 03.jpg": "Autumn trees and trail scenery at Eagle Creek Park",
    "Monon Trail/Monon Rail-Trail Indianapolis.jpg": "Monon Rail-Trail sign beside the paved, tree-lined trail in Indianapolis",
    "Monon Trail/Monon Trail bridge in Indianapolis.jpg": "Monon Trail bridge crossing an Indianapolis street",
    "Monon Trail/Indianapolis Monon Trail Trestle over White River.jpg": "Red-railed Monon Trail trestle crossing the White River",
    "Monon Trail/Shaded Indianapolis Monon Trail.jpg": "Shaded paved section of the Monon Trail beneath mature trees",
    "Garfield Park/Garfield Park Conservatory and Sunken Gardens (1).jpg": "Formal path through Garfield Park's Sunken Garden toward the Conservatory",
    "Garfield Park/Garfield Conservatory 046-20.jpg": "Orange and white koi swimming in the Garfield Park Conservatory pond",
    "Garfield Park/Garfield Park Sunken Gardens (4).jpg": "Restored fountains, flower planters and formal lawns in Garfield Park's Sunken Garden",
    "Garfield Park/Garfield Parks Arts Center.jpg": "Eastern exterior and colorful entrance of the Garfield Park Arts Center",
    "Holliday Park/\"The Ruins\" at Holliday Park, Indianapolis, Indiana.jpg": "Brick, stone columns and carved figures of the Holliday Park Ruins surrounded by summer gardens",
    "Holliday Park/Holliday Park Nature Center - 30363038234.jpg": "Interactive Cricket Frog Call exhibit inside Habitat Hall at the Holliday Park Nature Center",
    "Holliday Park/Take the path to the roots (3527135076).jpg": "Wooden footbridge and exposed tree roots on a wooded Holliday Park trail",
    "Holliday Park/Holliday Park and Nature Center - July 2017 - Bart Everson 05.jpg": "High water along the wooded White River edge at Holliday Park",
    "Fort Harrison State Park/Fall Creek at Fort Harrison.jpg": "Fall Creek flowing through wooded Fort Harrison State Park",
    "Fort Harrison State Park/Fort Ben - Fall Creek Boardwalk.jpg": "Wooden boardwalk descending through forest beside Fall Creek in Fort Harrison State Park",
    "Fort Harrison State Park/Fort Ben - bike entrance.jpg": "Signed bicycle and pedestrian entrance to Fort Harrison State Park",
    "Fort Harrison State Park/Trail at Fort Harrison SP.jpg": "Wooded natural-surface trail at Fort Harrison State Park",
    "White River State Park/White River State Park Indianapolis Skyline 2020.jpg": "Celebration Plaza lawn, park trees and the downtown Indianapolis skyline at White River State Park",
    "White River State Park/Celebration Plaza Amphitheater and Canal Headwaters White River State Park Indianapolis.jpg": "Celebration Plaza Amphitheater beside the canal headwaters and lawn at White River State Park",
    "White River State Park/White River at Washington Street Bridge Indianapolis.jpg": "White River and vegetated shoreline beside the old Washington Street bridge at White River State Park",
    "White River State Park/Central Indiana Canal - Indianapolis, Indiana, USA - October 7, 2023 01.jpg": "Canal Walk paths and water along the Indiana Central Canal in downtown Indianapolis"
  };
  return reviewed[key] || `${name} in Indianapolis`;
};
async function commons(file) {
  if (typeof file === "object") return file;
  const q = new URLSearchParams({
      action: "query",
      titles: `File:${file}`,
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "2000",
      format: "json",
      origin: "*",
    }),
    r = await fetch(`https://commons.wikimedia.org/w/api.php?${q}`, {
      headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org" },
    }),
    payload = await r.json(),
    p = Object.values(payload.query?.pages || {})[0],
    i = p?.imageinfo?.[0];
  if (!r.ok || !i) throw new Error(`${file}: not found`);
  const strip = (v) =>
    String(v || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[^;]+;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return {
    url: i.thumburl || i.url,
    source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title.replaceAll(" ", "_"))}`,
    author:
      strip(i.extmetadata?.Artist?.value) || "Wikimedia Commons contributor",
    license:
      strip(i.extmetadata?.LicenseShortName?.value) ||
      "Wikimedia Commons source license",
    label: file,
  };
}
async function bytes(url, label) {
  for (let n = 0; n < 6; n++) {
    const official = url.includes("portofindianapolis.com"),
      r = await fetch(url, {
        headers: {
          "User-Agent": official
            ? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/537.36"
            : "AuditMap/1.0 contact@auditmap.org",
          ...(official ? { Referer: "https://www.portofindianapolis.com/" } : {}),
        },
      });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    if ((r.status !== 429 && r.status !== 404) || n === 5)
      throw new Error(`${label}: ${r.status}`);
    await wait(1500 * (n + 1));
  }
}
(async () => {
  const out = { checkedAt: research.checkedAt, places: {} };
  for (const [id, e] of Object.entries(research.places).filter(([id]) => currentIds.has(id))) {
    const name = names.get(id),
      dir = path.join(root, "assets/parks/indianapolis-super", slug(name));
    fs.mkdirSync(dir, { recursive: true });
    const images = [];
    for (const [candidate, index] of e.candidates.map((x, i) => [x, i])) {
      const rec = await commons(candidate),
        target = path.join(
          dir,
          `${String(index + 1).padStart(2, "0")}-${slug(rec.label)}.webp`,
        );
      if (!fs.existsSync(target)) {
        await sharp(await bytes(rec.url, rec.label))
          .rotate()
          .resize(1600, 1000, {
            fit: "cover",
            position: "attention",
            withoutEnlargement: true,
          })
          .webp({ quality: 83 })
          .toFile(target);
        await wait(400);
      }
      const m = await sharp(target).metadata();
      images.push({
        url: `/${path.relative(root, target)}`,
        source: rec.source,
        author: rec.author,
        license: rec.license,
        alt: altText(name, rec.label),
        width: m.width,
        height: m.height,
      });
    }
    if (images.length < 4) throw new Error(`${name}: fewer than 4 images`);
    out.places[id] = { name, images };
    console.log(`${name}: ${images.length} images`);
  }
  fs.mkdirSync(path.join(root, "data/generated"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "data/generated/indianapolis-super-images.json"),
    `${JSON.stringify(out, null, 2)}\n`,
  );
})().catch((e) => {
  console.error(e.stack || e);
  process.exit(1);
});
