#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const args = Object.fromEntries(process.argv.slice(2).map((value, index, list) => value.startsWith("--") ? [value.slice(2), list[index + 1]] : null).filter(Boolean));
for (const key of ["nearby", "boundaries", "output"]) if (!args[key]) throw new Error(`Missing --${key}`);
const nearby = JSON.parse(fs.readFileSync(path.join(root, args.nearby), "utf8"));
const boundaries = JSON.parse(fs.readFileSync(path.join(root, args.boundaries), "utf8"));

function inRing(longitude, latitude, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > latitude !== yj > latitude && longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inPolygon(longitude, latitude, coordinates) {
  if (!inRing(longitude, latitude, coordinates[0])) return false;
  return !coordinates.slice(1).some((hole) => inRing(longitude, latitude, hole));
}
function contains(geometry, longitude, latitude) {
  if (geometry.type === "Polygon") return inPolygon(longitude, latitude, geometry.coordinates);
  return geometry.coordinates.some((polygon) => inPolygon(longitude, latitude, polygon));
}

const output = { campaign: nearby.campaign, checkedAt: nearby.checkedAt, places: {} };
for (const [id, place] of Object.entries(nearby.places)) {
  const boundary = boundaries.places[id];
  if (!boundary) {
    console.log(`${place.name}: skipped because no reviewed release boundary was selected`);
    continue;
  }
  const candidates = place.candidates.filter((candidate) => contains(boundary.geojson, candidate.longitude, candidate.latitude));
  output.places[id] = { name: place.name, boundarySource: boundary.sourceUrl, candidates: candidates.map((candidate) => ({ ...candidate, reviewStatus: "inside-reviewed-park-boundary" })) };
  console.log(`${place.name}: ${candidates.length} in-boundary map objects`);
}
fs.mkdirSync(path.dirname(path.join(root, args.output)), { recursive: true });
fs.writeFileSync(path.join(root, args.output), `${JSON.stringify(output, null, 2)}\n`);
