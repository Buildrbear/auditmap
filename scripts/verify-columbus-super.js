#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const campaign = require("../data/columbus-super-enrichment-campaign.json");
const places = require("../data/generated/launch-map-places.json");
const featureFacts = require("../data/columbus-feature-visitor-facts.json").places;
const redirects = require("../vercel.json").redirects;
const failures = [];
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const need = (condition, message) => { if (!condition) failures.push(message); };
const expected = {
  "launch-oh-columbus-quarry-trails-metro-park": ["millikin-falls"]
};
const retired = {
  "quarry-trails-metro-park": ["quarry-trails-via-ferrata", "sport-climbing-area", "quarry-trails-mountain-bike-trail", "quarry-trails-dog-park", "swan-lake", "quarry-trails-observation-trail", "quarry-trails-lake-area"]
};

for (const scope of campaign.places.filter((entry) => entry.currentBatch)) {
  const place = places.find((entry) => entry.id === scope.id);
  const parentSlug = slug(scope.name);
  const directory = path.join(root, "us/oh/columbus/parks", parentSlug);
  need(place, `${scope.name}: missing record`);
  if (!place) continue;
  need(place.verifiedAt === scope.checkedAt, `${scope.name}: expected checked date ${scope.checkedAt}`);
  need(place.image?.url, `${scope.name}: hero missing`);
  need(1 + (place.images?.length || 0) >= (scope.minImages || 4), `${scope.name}: photo minimum not met`);
  need(JSON.stringify((place.features || []).map((entry) => entry.slug)) === JSON.stringify(expected[scope.id]), `${scope.name}: release set drifted`);
  need(place.searchAnswers?.length >= 11, `${scope.name}: parent answers missing`);
  for (const answer of place.searchAnswers || []) {
    need(/^https:\/\//.test(answer.source || ""), `${scope.name}/${answer.intentKey}: public answer source missing`);
    need(Boolean(answer.sourceLabel), `${scope.name}/${answer.intentKey}: source label missing`);
    need(answer.verifiedAt === scope.checkedAt, `${scope.name}/${answer.intentKey}: checked date mismatch`);
    need(Boolean(answer.freshnessClass), `${scope.name}/${answer.intentKey}: freshness class missing`);
  }
  const parentFile = path.join(directory, "index.html");
  need(fs.existsSync(parentFile), `${scope.name}: parent page missing`);
  if (fs.existsSync(parentFile)) {
    const html = fs.readFileSync(parentFile, "utf8");
    for (const value of [place.name, place.address, 'rel="canonical"', "What people ask", "BreadcrumbList"])
      need(value && html.includes(value), `${scope.name}: raw HTML missing ${value}`);
  }
  for (const feature of place.features || []) {
    const exact = featureFacts[scope.id]?.[feature.slug];
    need(Boolean(exact), `${scope.name}/${feature.name}: destination-specific profile missing`);
    need(Number.isFinite(feature.latitude) && Number.isFinite(feature.longitude), `${scope.name}/${feature.name}: coordinates missing`);
    need(!/approximate|official-map placement|existing auditmap/i.test(`${feature.details?.coordinateSource} ${feature.details?.positionQuality}`), `${scope.name}/${feature.name}: unreviewed coordinate survived`);
    need(/^https:\/\//.test(feature.details?.coordinateSource || ""), `${scope.name}/${feature.name}: public coordinate source missing`);
    need(feature.details?.images?.length >= 1, `${scope.name}/${feature.name}: image missing`);
    need(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(decodeURIComponent(feature.details?.imageSourceUrl || "")), `${scope.name}/${feature.name}: destination image is not a Commons file page`);
    need(fs.existsSync(path.join(root, String(feature.details?.imageUrl || "").replace(/^\//, ""))), `${scope.name}/${feature.name}: image file missing`);
    need(feature.details?.hours === exact?.hours, `${scope.name}/${feature.name}: destination-specific hours missing`);
    need(feature.details?.informationCheckedAt === scope.checkedAt, `${scope.name}/${feature.name}: destination checked date mismatch`);
    need(feature.details?.searchAnswers?.length >= 9, `${scope.name}/${feature.name}: answers missing`);
    for (const answer of feature.details?.searchAnswers || []) {
      need(/^https:\/\//.test(answer.source || ""), `${scope.name}/${feature.name}/${answer.intentKey}: public source missing`);
      need(Boolean(answer.sourceLabel), `${scope.name}/${feature.name}/${answer.intentKey}: source label missing`);
      need(answer.verifiedAt === scope.checkedAt, `${scope.name}/${feature.name}/${answer.intentKey}: checked date mismatch`);
      need(Boolean(answer.freshnessClass), `${scope.name}/${feature.name}/${answer.intentKey}: freshness class missing`);
    }
    const featureFile = path.join(directory, feature.slug, "index.html");
    need(fs.existsSync(featureFile), `${scope.name}/${feature.name}: page missing`);
    if (fs.existsSync(featureFile)) {
      const html = fs.readFileSync(featureFile, "utf8").toLowerCase();
      for (const value of [feature.name, place.name, "parking", "restroom", "dogs", "sources", 'rel="canonical"', "breadcrumblist", String(feature.latitude), String(feature.longitude)])
        need(html.includes(value.toLowerCase()), `${scope.name}/${feature.name}: raw HTML missing ${value}`);
    }
  }
  for (const oldSlug of retired[parentSlug] || []) {
    need(!fs.existsSync(path.join(directory, oldSlug, "index.html")), `${scope.name}/${oldSlug}: retired page still exists`);
    const source = `/us/oh/columbus/parks/${parentSlug}/${oldSlug}`;
    need(redirects.some((entry) => entry.source === source && entry.destination === `/us/oh/columbus/parks/${parentSlug}` && entry.permanent), `${scope.name}/${oldSlug}: permanent redirect missing`);
  }
}

const scoped = campaign.places.filter((entry) => entry.currentBatch).map((scope) => JSON.stringify(places.find((place) => place.id === scope.id) || {})).join("\n");
for (const phrase of ["6:30 a.m. until dark", "Waterfall Entrance, Northern Area or Lake Area", "25-foot waterfall", "steep steps", "active construction", "guided and reservation-only", "does not establish a publication license"])
  need(scoped.includes(phrase), `Missing Columbus guidance: ${phrase}`);
need(!scoped.includes("Official source image"), "Unlicensed official-source image attribution survived current batch");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Verified Columbus Quarry Trails: one parent guide, one exact photo-backed destination, source-specific answers and seven retired-route redirects.");
