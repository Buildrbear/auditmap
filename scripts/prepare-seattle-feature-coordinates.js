#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  root = path.resolve(__dirname, ".."),
  campaign = require("../data/seattle-super-enrichment-campaign.json"),
  facts = require("../data/seattle-visitor-facts.json").places,
  overrides = require("../data/seattle-coordinate-overrides.json"),
  slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const distance = (a, b) => {
  const radians = Math.PI / 180,
    dLat = (a.latitude - b.latitude) * radians,
    dLon = (a.longitude - b.longitude) * radians,
    value = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

async function locate(name, parent, base) {
  const parts = name.split(/\s+and\s+/i),
    queries = [name, ...parts, `${parts[0]}, ${parent}`, parent].filter((value, index, values) => value && values.indexOf(value) === index);
  for (const term of queries) {
    const query = new URLSearchParams({ q: `${term}, Seattle, WA`, format: "jsonv2", limit: "5", countrycodes: "us" }),
      response = await fetch(`https://nominatim.openstreetmap.org/search?${query}`, { headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org", "Accept-Language": "en" } });
    if (!response.ok) throw new Error(`Nominatim ${response.status}`);
    const hits = (await response.json()).map((hit) => ({ latitude: Number(hit.lat), longitude: Number(hit.lon), displayName: hit.display_name, source: "OpenStreetMap Nominatim" })),
      nearby = hits.find((hit) => distance(hit, base) < 20);
    if (nearby) return nearby;
    await wait(1050);
  }
  return null;
}

(async () => {
  const file = path.join(root, "data/generated/seattle-feature-coordinates.json"),
    previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { places: {} },
    out = { checkedAt: campaign.checkedAt, places: {} };
  for (const parent of campaign.places) {
    out.places[parent.id] = {};
    for (const [index, name] of parent.subsites.entries()) {
      const base = facts[parent.id], key = slug(name), override = overrides[parent.id]?.[key], saved = previous.places?.[parent.id]?.[key];
      if (override) {
        out.places[parent.id][key] = override;
        console.log(`${parent.name}: ${name} (reviewed override)`);
        continue;
      }
      if (saved) {
        out.places[parent.id][key] = saved;
        console.log(`${parent.name}: ${name} (preserved)`);
        continue;
      }
      let hit = null;
      try { hit = await locate(name, parent.name, base); } catch (error) { console.warn(`${parent.name}/${name}: ${error.message}`); }
      if (!hit) hit = { latitude: base.latitude + (index + 1) * 0.00011, longitude: base.longitude + (index + 1) * 0.00011, displayName: `Approximate position within ${parent.name}`, source: "AuditMap parent-location fallback" };
      out.places[parent.id][key] = hit;
      console.log(`${parent.name}: ${name} (${hit.source})`);
      await wait(1100);
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
