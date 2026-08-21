#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const nearby = require("../data/generated/southeast-atlantic-nearby-map-features.json");
const boundaries = require("../data/generated/southeast-atlantic-park-boundaries.json");

function inRing(longitude, latitude, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > latitude !== yj > latitude && longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
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

const output = { checkedAt: nearby.checkedAt, places: {} };
for (const [id, place] of Object.entries(nearby.places)) {
  const boundary = boundaries.places[id];
  if (!boundary) throw new Error(`${place.name}: boundary missing`);
  const candidates = place.candidates.filter((candidate) => contains(boundary.geojson, candidate.longitude, candidate.latitude));
  output.places[id] = {
    name: place.name,
    boundarySource: boundary.sourceUrl,
    candidates: candidates.map((candidate) => ({ ...candidate, reviewStatus: "inside-reviewed-park-boundary" })),
  };
  console.log(`${place.name}: ${candidates.length} in-boundary map objects`);
}
fs.writeFileSync(
  path.join(root, "data/generated/southeast-atlantic-in-boundary-map-features.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
