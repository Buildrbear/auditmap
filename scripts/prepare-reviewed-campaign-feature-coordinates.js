#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const args = Object.fromEntries(process.argv.slice(2).map((value, index, list) => value.startsWith("--") ? [value.slice(2), list[index + 1]] : null).filter(Boolean));
for (const key of ["selections", "nearby", "inside", "output"]) if (!args[key]) throw new Error(`Missing --${key}`);
const selections = JSON.parse(fs.readFileSync(path.join(root, args.selections), "utf8"));
const nearby = JSON.parse(fs.readFileSync(path.join(root, args.nearby), "utf8"));
const inside = JSON.parse(fs.readFileSync(path.join(root, args.inside), "utf8"));
const campaign = args.campaign
  ? JSON.parse(fs.readFileSync(path.join(root, args.campaign), "utf8"))
  : { places: [] };
const launchPlaces = JSON.parse(fs.readFileSync(path.join(root, "data/generated/launch-map-places.json"), "utf8"));
const campaignById = new Map(campaign.places.map((place) => [place.id, place]));
const launchById = new Map(launchPlaces.map((place) => [place.id, place]));
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const distanceMeters = (aLat, aLon, bLat, bLon) => {
  const toRadians = (value) => value * Math.PI / 180;
  const earthRadius = 6371000;
  const latitudeDelta = toRadians(bLat - aLat);
  const longitudeDelta = toRadians(bLon - aLon);
  const latitudeA = toRadians(aLat);
  const latitudeB = toRadians(bLat);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const output = { checkedAt: selections.checkedAt, reviewMethod: selections.reviewMethod, places: {} };
for (const [id, features] of Object.entries(selections.places)) {
  if (!nearby.places[id]) {
    const allHaveReviewedPlacement = features.every((feature) => Number.isFinite(feature.latitude) && Number.isFinite(feature.longitude));
    if (!features.length) {
      output.places[id] = {};
      console.log(`${id}: skipped empty deferred feature selection`);
      continue;
    }
    if (!allHaveReviewedPlacement || !campaignById.has(id) || !launchById.has(id)) {
      throw new Error(`${id}: selected map objects require nearby research; exact reviewed placements require campaign and launch records`);
    }
  }
  const nearbyPlace = nearby.places[id];
  const pool = nearbyPlace?.candidates || [];
  const inBoundary = new Set((inside.places[id]?.candidates || []).map((item) => `${item.osmType}/${item.osmId}`));
  output.places[id] = {};
  for (const feature of features) {
    const hasReviewedPlacement = Number.isFinite(feature.latitude) && Number.isFinite(feature.longitude);
    if (hasReviewedPlacement) {
      if (!feature.coordinateSource || !feature.officialMapSource) {
        throw new Error(`${id}/${feature.name}: reviewed placement requires coordinateSource and officialMapSource`);
      }
      const parent = nearbyPlace?.parent || launchById.get(id);
      const radiusMeters = nearbyPlace?.radiusMeters || Number(campaignById.get(id)?.featureResearchRadiusMeters);
      if (!parent || !Number.isFinite(radiusMeters)) {
        throw new Error(`${id}/${feature.name}: reviewed placement requires a canonical parent and research radius`);
      }
      const distance = distanceMeters(parent.latitude, parent.longitude, feature.latitude, feature.longitude);
      if (distance > radiusMeters) {
        throw new Error(`${id}/${feature.name}: reviewed placement is ${Math.round(distance)}m from the parent, outside the research radius`);
      }
      output.places[id][slug(feature.name)] = {
        ...feature,
        displayName: feature.name,
        boundarySource: inside.places[id]?.boundarySource,
        positionQuality: feature.positionQuality || "reviewed-geotagged-destination-photo",
        reviewStatus: "approved-official-map-and-geotag-match",
        reviewedAt: selections.checkedAt,
      };
      continue;
    }
    const candidate = pool.find((item) => `${item.osmType}/${item.osmId}` === feature.osm);
    if (!candidate) throw new Error(`${id}/${feature.name}: selected map object missing`);
    const officialCampusException = (id === "launch-ca-san-jose-guadalupe-river-park" && feature.name === "Heritage Rose Garden") || feature.allowOutsideBoundary === true;
    if (!inBoundary.has(feature.osm) && !officialCampusException) throw new Error(`${id}/${feature.name}: selected map object is outside the reviewed park boundary`);
    output.places[id][slug(feature.name)] = {
      ...feature, latitude: candidate.latitude, longitude: candidate.longitude, displayName: candidate.name,
      coordinateSource: candidate.sourceUrl,
      boundarySource: inside.places[id]?.boundarySource,
      positionQuality: officialCampusException ? "reviewed-official-campus-placement" : "reviewed-public-map-placement",
      reviewStatus: officialCampusException ? "approved-official-campus-extension" : "approved-feature-and-boundary-match",
      boundaryExceptionReason: officialCampusException ? feature.boundaryExceptionReason || "Official destination extends beyond the mapped parent boundary." : undefined,
      reviewedAt: selections.checkedAt,
    };
  }
  console.log(`${nearbyPlace?.name || launchById.get(id)?.name || id}: ${features.length} publishable feature coordinates`);
}
fs.mkdirSync(path.dirname(path.join(root, args.output)), { recursive: true });
fs.writeFileSync(path.join(root, args.output), `${JSON.stringify(output, null, 2)}\n`);
