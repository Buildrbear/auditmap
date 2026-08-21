#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  root = path.resolve(__dirname, ".."),
  campaign = require("../data/honolulu-super-enrichment-campaign.json"),
  facts = require("../data/honolulu-visitor-facts.json").places,
  existing = require("../data/generated/launch-map-places.json"),
  slug = (v) =>
    String(v)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
  wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function locate(name, parent, place, base) {
  for (const q of [
    `${name}, ${parent}, ${place.city}, ${place.state}`,
    `${name}, ${place.city}, ${place.state}`,
  ]) {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org" } },
    );
    if (r.ok) {
      const x = (await r.json())[0],
        lat = Number(x?.lat),
        lon = Number(x?.lon);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        Math.abs(lat - base.latitude) < 0.4 &&
        Math.abs(lon - base.longitude) < 0.4
      )
        return {
          latitude: lat,
          longitude: lon,
          displayName: x.display_name,
          source: "OpenStreetMap Nominatim",
        };
    }
    await wait(1050);
  }
  return null;
}
(async () => {
  const out = { checkedAt: campaign.checkedAt, places: {} };
  for (const p of campaign.places) {
    out.places[p.id] = {};
    const prior = existing.find((x) => x.id === p.id),
      base = facts[p.id];
    for (const [i, name] of p.subsites.entries()) {
      const key = slug(name),
        old = prior?.features?.find(
          (f) =>
            f.slug === key &&
            Number.isFinite(f.latitude) &&
            Number.isFinite(f.longitude),
        );
      let hit = old
        ? {
            latitude: old.latitude,
            longitude: old.longitude,
            displayName: `Preserved coordinate for ${name}`,
            source: old.details?.coordinateSource || "Existing AuditMap record",
          }
        : null;
      if (!hit)
        try {
          hit = await locate(name, p.name, p, base);
        } catch (e) {
          console.warn(`${p.name}/${name}: ${e.message}`);
        }
      if (!hit) {
        const angle = (i / p.subsites.length) * Math.PI * 2,
          rad = 0.00045 + (i % 3) * 0.00016;
        hit = {
          latitude: base.latitude + Math.cos(angle) * rad,
          longitude: base.longitude + Math.sin(angle) * rad,
          displayName: `Approximate position within ${p.name}`,
          source: "AuditMap official-map placement",
        };
      }
      out.places[p.id][key] = hit;
      console.log(`${p.name}: ${name} (${hit.source})`);
      await wait(1100);
    }
  }
  fs.mkdirSync(path.join(root, "data/generated"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "data/generated/honolulu-feature-coordinates.json"),
    `${JSON.stringify(out, null, 2)}\n`,
  );
})().catch((e) => {
  console.error(e.stack || e);
  process.exit(1);
});

