#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  root = path.resolve(__dirname, ".."),
  places = JSON.parse(
    fs.readFileSync(path.join(root, "data/generated/launch-map-places.json")),
  ),
  ids = [
    "launch-il-chicago-lincoln-park",
    "launch-il-chicago-millennium-park",
    "launch-il-chicago-grant-park",
    "launch-il-chicago-maggie-daley-park",
    "launch-il-chicago-chicago-riverwalk",
    "launch-il-chicago-jackson-park",
    "launch-il-chicago-garfield-park-conservatory",
    "launch-il-chicago-chicago-lakefront-trail",
  ],
  fail = [];

for (const id of ids) {
  const p = places.find((x) => x.id === id);
  if (!p) {
    fail.push(`${id}: missing`);
    continue;
  }
  const pics = [p.image, ...(p.images || [])].filter((x) => x?.url);
  if (pics.length < 4) fail.push(`${p.name}: ${pics.length} images`);
  if ((p.features || []).length !== 8)
    fail.push(`${p.name}: ${(p.features || []).length} features`);
  if ((p.searchAnswers || []).length < 11)
    fail.push(`${p.name}: ${(p.searchAnswers || []).length} answers`);

  const parentDir = path.join(root, "us/il/chicago/parks", p.slug);
  const html = path.join(parentDir, "index.html");
  if (!fs.existsSync(html)) {
    fail.push(`${p.name}: page missing`);
    continue;
  }
  const source = fs.readFileSync(html, "utf8");
  for (const q of [
    "Where should I park",
    "Are there restrooms",
    'rel="canonical"',
  ])
    if (!source.includes(q)) fail.push(`${p.name}: raw HTML missing ${q}`);

  for (const f of p.features || []) {
    if (!Number.isFinite(f.latitude) || !Number.isFinite(f.longitude))
      fail.push(`${p.name}/${f.name}: coordinates missing`);
    if (!f.details?.images?.[0]?.url)
      fail.push(`${p.name}/${f.name}: image missing`);
    if ((f.details?.searchAnswers || []).length < 8)
      fail.push(`${p.name}/${f.name}: answers missing`);
    if (!fs.existsSync(path.join(parentDir, f.slug, "index.html")))
      fail.push(`${p.name}/${f.name}: page missing`);
  }
}

const joined = ids
  .map((id) => JSON.stringify(places.find((p) => p.id === id) || {}))
  .join("\n");
for (const phrase of [
  "Do not treat Lincoln Park as a single pin",
  "Cloud Gate is commonly called The Bean",
  "Grant Park hosts some of Chicago's largest events",
  "The skating ribbon changes by season",
  "entrances are not interchangeable for accessibility",
  "Obama Presidential Center work is changing circulation",
  "separate children's-garden slot",
  "Bikes belong on the bike trail",
])
  if (!joined.includes(phrase)) fail.push(`Missing Chicago guidance: ${phrase}`);

if (fail.length) {
  console.error(fail.map((x) => `- ${x}`).join("\n"));
  process.exit(1);
}
console.log(
  `Verified ${ids.length} Chicago guides with four photos, eight mapped subsites, raw visitor answers, and canonical pages.`,
);
