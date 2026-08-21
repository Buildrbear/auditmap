const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const template = fs.readFileSync(path.join(root, "place.html"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const places = JSON.parse(fs.readFileSync(path.join(root, "data/institutions.json"), "utf8"));

function distanceMiles(from, to) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const latitude1 = radians(from.latitude);
  const latitude2 = radians(to.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

assert.match(template, /id="nearby-discovery"[^>]*hidden/);
assert.match(template, /data-nearby-mode="nearby"/);
assert.match(template, /data-nearby-mode="similar"/);
assert.match(template, /Based on this place's location and public details, not your activity/);

assert.match(app, /function placeDiscoveryRecommendations\(/);
assert.match(app, /function renderNearbyDiscovery\(/);
assert.match(app, /renderNearbyDiscovery\(place, places\)/);
assert.match(app, /externalCandidates\.length >= 3/);
assert.match(app, /localSimilarCandidates/);
assert.match(app, /canonicalFeaturePath\(parent, feature\)/);

assert.match(styles, /scroll-snap-type:\s*x mandatory/);
assert.match(styles, /\.nearby-place-card\s*\{/);
assert.match(styles, /flex:\s*0 0 min\(78vw, 278px\)/);
assert.match(styles, /\.nearby-place-track:focus-visible/);

const dix = places.find((place) => place.id === "dix-park");
assert.ok(dix, "Dix Park should exist in the shared place catalog");
const nearbyDixPlaces = places.filter(
  (place) =>
    place.id !== dix.id &&
    Number.isFinite(Number(place.latitude)) &&
    Number.isFinite(Number(place.longitude)) &&
    distanceMiles(dix, place) <= 5,
);
assert.ok(nearbyDixPlaces.length >= 3, "Dix Park should have enough external nearby places");

const grandCanyon = places.find((place) => place.id === "grand-canyon-national-park");
assert.ok(grandCanyon, "Grand Canyon National Park should exist in the shared place catalog");
assert.ok(
  (grandCanyon.features || []).some(
    (feature) => Number.isFinite(Number(feature.latitude)) && Number.isFinite(Number(feature.longitude)),
  ),
  "Sparse-area listings should retain mapped destination fallbacks",
);

console.log("Nearby and similar place discovery checks passed.");
