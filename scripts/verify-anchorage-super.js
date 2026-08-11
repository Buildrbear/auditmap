#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const campaign = require("../data/anchorage-evidence-gate-campaign.json");
const all = require("../data/generated/all-subsites-ready.json").parks;
const pilot = require("../data/generated/pilot-subsites-ready.json").parks;
const launch = require("../data/generated/launch-map-places.json");
const national = require("../data/parent-park-information-enrichment-national.json").parks;
const campaignParents = require("../data/parent-park-information-enrichment-campaign.json").parks;
const failures = [];
const need = (condition, message) => { if (!condition) failures.push(message); };
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const expectedFeatures = {
  "launch-ak-anchorage-kincaid-park": ["kincaid-beach"],
  "launch-ak-anchorage-delaney-park-strip": ["centennial-rose-garden", "alaska-railroad-no-556"],
};

for (const scope of campaign.places) {
  const record = all.find((item) => item.id === scope.id);
  need(record, `${scope.name}: all-subsites record missing`);
  if (!record) continue;
  const copies = [
    ["pilot", pilot.find((item) => item.id === scope.id)],
    ["launch", launch.find((item) => item.id === scope.id)],
  ];
  for (const [label, copy] of copies) {
    need(copy, `${scope.name}: ${label} record missing`);
    need(copy?.source === scope.officialSource, `${scope.name}: ${label} source did not persist`);
    need(copy?.verifiedAt === campaign.checkedAt, `${scope.name}: ${label} checked date stale`);
  }
  for (const [label, copy] of [["national parent", national[scope.id]], ["campaign parent", campaignParents[scope.id]]]) {
    need(copy?.source === scope.officialSource, `${scope.name}: ${label} source did not persist`);
    need(copy?.verifiedAt === campaign.checkedAt, `${scope.name}: ${label} checked date stale`);
    need(copy?.additionalImages?.length === (scope.deferRelease ? 1 : 3), `${scope.name}: ${label} gallery did not persist`);
  }
  const images = [record.image, ...(record.images || [])].filter(Boolean);
  need(record.searchAnswers?.length >= 11, `${scope.name}: parent answers missing`);
  need(record.source === scope.officialSource, `${scope.name}: authoritative source mismatch`);
  need(record.verifiedAt === campaign.checkedAt, `${scope.name}: checked date stale`);
  for (const image of images) {
    need(image.url && fs.existsSync(path.join(root, image.url.slice(1))), `${scope.name}: image file missing`);
    need(image.source?.startsWith("https://commons.wikimedia.org/wiki/File:"), `${scope.name}: image source page missing`);
    need(image.author && image.license && image.licenseUrl?.startsWith("https://"), `${scope.name}: reuse basis incomplete`);
  }
  if (scope.deferRelease) {
    need(images.length === 2, `${scope.name}: deferred gallery must retain two reviewed images`);
    need(record.publishStatus === "photo-gated-deferred", `${scope.name}: deferred status missing`);
    need(record.features?.length === 0, `${scope.name}: unverified destination survived`);
    need(record.researchQueue?.length === 1, `${scope.name}: deferral queue missing`);
  } else {
    need(images.length === 4, `${scope.name}: expected four reviewed images`);
    need(record.publishStatus === "super-enriched", `${scope.name}: release status missing`);
    need(JSON.stringify((record.features || []).map((item) => item.slug)) === JSON.stringify(expectedFeatures[scope.id] || []), `${scope.name}: exact destination set mismatch`);
  }
  const parentRoute = `/us/ak/anchorage/parks/${slug(scope.name)}`;
  const parentFile = path.join(root, parentRoute.slice(1), "index.html");
  need(fs.existsSync(parentFile), `${scope.name}: parent page missing`);
  if (fs.existsSync(parentFile)) {
    const html = fs.readFileSync(parentFile, "utf8");
    for (const value of [record.name, record.address, 'rel="canonical"', "What people ask", "Sources"])
      need(value && html.includes(value), `${scope.name}: raw HTML missing ${value}`);
  }
  for (const feature of record.features || []) {
    need(Number.isFinite(feature.latitude) && Number.isFinite(feature.longitude), `${scope.name}/${feature.name}: coordinates missing`);
    need(feature.details?.positionQuality === "exact-geotag-or-named-open-map-object", `${scope.name}/${feature.name}: exact position review missing`);
    need(feature.details?.coordinateSource?.startsWith("https://"), `${scope.name}/${feature.name}: coordinate provenance missing`);
    need(feature.details?.images?.length === 1, `${scope.name}/${feature.name}: destination photograph missing`);
    need(feature.details?.searchAnswers?.length >= 9, `${scope.name}/${feature.name}: profile incomplete`);
    const featureFile = path.join(root, parentRoute.slice(1), feature.slug, "index.html");
    need(fs.existsSync(featureFile), `${scope.name}/${feature.name}: page missing`);
    if (fs.existsSync(featureFile)) {
      const html = fs.readFileSync(featureFile, "utf8").toLowerCase();
      for (const value of [feature.name, record.name, "parking", "restroom", "dogs", "sources", 'rel="canonical"'])
        need(html.includes(value.toLowerCase()), `${scope.name}/${feature.name}: raw HTML missing ${value}`);
      need(html.includes(encodeURIComponent(`${feature.latitude},${feature.longitude}`).toLowerCase()), `${scope.name}/${feature.name}: exact navigation missing`);
    }
  }
}

const joined = campaign.places.map((scope) => JSON.stringify(all.find((item) => item.id === scope.id) || {})).join("\n");
for (const phrase of ["12:30 to 8:00 p.m.", "North Gasline Trail", "tidal mudflats", "temporary fencing in 2011", "seasonal garden"])
  need(joined.includes(phrase), `Missing Anchorage guidance: ${phrase}`);

if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("Verified 2 released Anchorage parents, 1 photo-gated parent, 3 exact destinations, and four persisted source layers.");
