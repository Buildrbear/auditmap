#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/cleveland-super-enrichment-campaign.json");
const places = require("../data/generated/launch-map-places.json");
const vercel = require("../vercel.json");
const fail = [];
const slug = value => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const need = (ok, message) => { if (!ok) fail.push(message); };

for (const scope of campaign.places) {
  const place = places.find(candidate => candidate.id === scope.id);
  const directory = path.join(root, "us/oh/cleveland/parks", slug(scope.name));
  need(place, `${scope.name}: missing record`);
  if (!place) continue;
  need(place.image?.url, `${scope.name}: hero missing`);
  need(1 + (place.images?.length || 0) >= (scope.minImages || 4), `${scope.name}: gallery below release minimum`);
  need(place.features?.length === scope.subsites.length, `${scope.name}: expected ${scope.subsites.length} evidence-cleared destinations`);
  need(place.searchAnswers?.length >= 11, `${scope.name}: parent answers missing`);
  const parentFile = path.join(directory, "index.html");
  need(fs.existsSync(parentFile), `${scope.name}: parent page missing`);
  if (fs.existsSync(parentFile)) {
    const html = fs.readFileSync(parentFile, "utf8");
    for (const value of [place.name, place.address, "rel=\"canonical\"", "What people ask", "Sources"]) {
      need(value && html.includes(value), `${scope.name}: raw HTML missing ${value}`);
    }
  }
  for (const feature of place.features || []) {
    need(Number.isFinite(feature.latitude) && Number.isFinite(feature.longitude), `${scope.name}/${feature.name}: coordinates missing`);
    need(feature.details?.images?.length >= 1, `${scope.name}/${feature.name}: image missing`);
    need(feature.details?.searchAnswers?.length >= 9, `${scope.name}/${feature.name}: answers missing`);
    need(feature.details?.coordinateSource && feature.details?.positionQuality, `${scope.name}/${feature.name}: coordinate provenance missing`);
    const featureFile = path.join(directory, feature.slug, "index.html");
    need(fs.existsSync(featureFile), `${scope.name}/${feature.name}: page missing`);
    if (fs.existsSync(featureFile)) {
      const html = fs.readFileSync(featureFile, "utf8").toLowerCase();
      for (const value of [feature.name, place.name, "parking", "restroom", "dogs", "sources", "rel=\"canonical\""]) {
        need(html.includes(value.toLowerCase()), `${scope.name}/${feature.name}: raw HTML missing ${value}`);
      }
    }
  }
}

const edgewater = places.find(place => place.id === "launch-oh-cleveland-edgewater-park");
const wendy = places.find(place => place.id === "launch-oh-cleveland-wendy-park");
for (const place of [edgewater, wendy]) {
  for (const feature of place?.features || []) {
    need(!/approximate|official-map placement/i.test(`${feature.details?.coordinateSource} ${feature.details?.positionQuality}`), `${place.name}/${feature.name}: approximate position escaped lakefront release gate`);
  }
}
need(edgewater?.features.map(feature => feature.slug).join("|") === "edgewater-beach|cleveland-script-sign", "Edgewater Park: destination release set drifted");
need(wendy?.features.map(feature => feature.slug).join("|") === "wendy-park-bridge|wendy-park-volleyball-courts|old-cleveland-coast-guard-station", "Wendy Park: destination release set drifted");
need(edgewater?.features.find(feature => feature.slug === "edgewater-beach")?.details?.imageUrl?.includes("edgewater-park-beach"), "Edgewater Beach: destination-specific photo missing");
need(edgewater?.features.find(feature => feature.slug === "cleveland-script-sign")?.details?.imageUrl?.includes("cle-edgewater"), "Cleveland Script Sign: destination-specific photo missing");
need(wendy?.features.find(feature => feature.slug === "wendy-park-bridge")?.details?.imageUrl?.includes("wendy-park-bridge"), "Wendy Park Bridge: destination-specific photo missing");
need(wendy?.features.find(feature => feature.slug === "wendy-park-volleyball-courts")?.details?.imageUrl?.includes("51268866800"), "Wendy Park Volleyball Courts: destination-specific photo missing");
need(wendy?.features.find(feature => feature.slug === "old-cleveland-coast-guard-station")?.details?.imageUrl?.includes("old-cleveland-coast-guard-station"), "Old Cleveland Coast Guard Station: destination-specific photo missing");
for (const place of [edgewater, wendy]) {
  for (const image of [place?.image, ...(place?.images || [])]) {
    need(image && !/official source image/i.test(image.license || ""), `${place?.name}: image without documented reuse license`);
    need(image?.source?.includes("commons.wikimedia.org/wiki/File"), `${place?.name}: image source is not a reusable file page`);
  }
}

const retired = [
  "edgewater-park/edgewater-beach-house", "edgewater-park/edgewater-dog-beach", "edgewater-park/edgewater-fishing-pier",
  "edgewater-park/lower-edgewater-park", "edgewater-park/upper-edgewater-park", "edgewater-park/edgewater-boat-ramps",
  "wendy-park/whiskey-island-trail", "wendy-park/wendy-park-fishing-pier", "wendy-park/wendy-park-paddling-access",
  "wendy-park/old-coast-guard-station-overlook", "wendy-park/wendy-park-picnic-area", "wendy-park/whiskey-island-marina"
];
const redirects = new Set(vercel.redirects.map(redirect => redirect.source));
for (const route of retired) {
  need(!fs.existsSync(path.join(root, "us/oh/cleveland/parks", route, "index.html")), `${route}: retired page still generated`);
  need(redirects.has(`/us/oh/cleveland/parks/${route}`), `${route}: retired route missing redirect`);
}

const cvnp = places.find(place => place.id === "launch-oh-cleveland-cuyahoga-valley-national-park");
need(cvnp?.features.find(feature => feature.slug === "brandywine-falls")?.details?.imageUrl?.includes("brandywine-falls"), "Brandywine Falls: destination-specific photo missing");
need(cvnp?.features.find(feature => feature.slug === "ledges-trail")?.details?.imageUrl?.includes("illuminating-the-ledges"), "Ledges Trail: destination-specific photo missing");

const joined = campaign.places.map(scope => JSON.stringify(places.find(place => place.id === scope.id) || {})).join("\n");
for (const phrase of ["live swimming status", "dog-friendly area", "55/55B/55C", "does not list public restrooms", "Sunday through Thursday", "reopened to anglers", "river level and trail alerts", "seven gorges", "2026 Towpath repairs"]) {
  need(joined.includes(phrase), `Missing Cleveland guidance: ${phrase}`);
}

if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log(`Verified ${campaign.places.length} Cleveland guides with evidence-cleared destination counts, licensed images, current visitor answers, retired-route cleanup and redirects.`);
