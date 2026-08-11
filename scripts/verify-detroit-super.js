#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const campaign = require("../data/detroit-super-enrichment-campaign.json");
const places = require("../data/generated/launch-map-places.json");
const featureFacts = require("../data/detroit-feature-visitor-facts.json").places;
const redirects = require("../vercel.json").redirects;
const fail = [];
const slug = value => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const need = (condition, message) => { if (!condition) fail.push(message); };
const scopedIds = new Set([
  "launch-mi-detroit-belle-isle-park",
  "launch-mi-detroit-detroit-riverwalk",
  "launch-mi-detroit-ralph-c-wilson-jr-centennial-park"
]);
const expected = {
  "launch-mi-detroit-belle-isle-park": ["belle-isle-aquarium", "anna-scripps-whitcomb-conservatory", "dossin-great-lakes-museum"],
  "launch-mi-detroit-detroit-riverwalk": [],
  "launch-mi-detroit-ralph-c-wilson-jr-centennial-park": ["huron-clinton-metroparks-water-garden", "william-davidson-sport-house"]
};
const retired = {
  "belle-isle-park": ["belle-isle-nature-center", "james-scott-memorial-fountain", "belle-isle-beach", "belle-isle-giant-slide", "oudolf-garden-detroit"],
  "detroit-riverwalk": ["cullen-plaza", "william-g-milliken-state-park-and-harbor", "robert-c-valade-park", "mt-elliott-park", "gabriel-richard-park", "gm-plaza", "renaissance-center-riverfront-plaza", "southwest-greenway-connection"],
  "ralph-c-wilson-jr-centennial-park": ["delta-dental-play-garden", "dte-foundation-summit", "community-lawn", "river-edge-garden", "ralph-wilson-park-basketball-courts", "ralph-wilson-park-riverwalk"]
};

for (const scope of campaign.places) {
  const place = places.find(item => item.id === scope.id);
  const parentSlug = slug(scope.name);
  const directory = path.join(root, "us/mi/detroit/parks", parentSlug);
  need(place, `${scope.name}: missing record`);
  if (!place) continue;
  need(place.verifiedAt === scope.checkedAt, `${scope.name}: expected checked date ${scope.checkedAt}`);
  need(place.image?.url, `${scope.name}: hero missing`);
  need(1 + (place.images?.length || 0) >= (scope.minImages || 4), `${scope.name}: photo minimum not met`);
  need((place.features?.length || 0) === scope.subsites.length, `${scope.name}: expected ${scope.subsites.length} destinations`);
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
    for (const value of [place.name, place.address, 'rel="canonical"', "What people ask"]) need(value && html.includes(value), `${scope.name}: raw HTML missing ${value}`);
  }
  for (const feature of place.features || []) {
    need(Number.isFinite(feature.latitude) && Number.isFinite(feature.longitude), `${scope.name}/${feature.name}: coordinates missing`);
    need(feature.details?.images?.length >= 1, `${scope.name}/${feature.name}: image missing`);
    need(fs.existsSync(path.join(root, String(feature.details?.imageUrl || "").replace(/^\//, ""))), `${scope.name}/${feature.name}: image file missing`);
    need(feature.details?.searchAnswers?.length >= 9, `${scope.name}/${feature.name}: answers missing`);
    need(feature.details?.coordinateSource && feature.details?.positionQuality, `${scope.name}/${feature.name}: coordinate provenance missing`);
    const featureFile = path.join(directory, feature.slug, "index.html");
    need(fs.existsSync(featureFile), `${scope.name}/${feature.name}: page missing`);
    if (fs.existsSync(featureFile)) {
      const html = fs.readFileSync(featureFile, "utf8").toLowerCase();
      for (const value of [feature.name, place.name, "parking", "restroom", "dogs", "sources", 'rel="canonical"', String(feature.latitude), String(feature.longitude)]) need(html.includes(value.toLowerCase()), `${scope.name}/${feature.name}: raw HTML missing ${value}`);
    }
  }
  if (!scopedIds.has(scope.id)) continue;
  need(JSON.stringify((place.features || []).map(item => item.slug)) === JSON.stringify(expected[scope.id]), `${scope.name}: release set drifted`);
  for (const feature of place.features || []) {
    need(!/approximate|official-map placement/i.test(`${feature.details.coordinateSource} ${feature.details.positionQuality}`), `${scope.name}/${feature.name}: approximate position survived`);
    need(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(decodeURIComponent(feature.details.imageSourceUrl || "")), `${scope.name}/${feature.name}: destination image is not a Commons file page`);
    need(feature.details.informationCheckedAt === "2026-08-10", `${scope.name}/${feature.name}: destination checked date mismatch`);
    const exact = featureFacts[scope.id]?.[feature.slug];
    need(Boolean(exact), `${scope.name}/${feature.name}: destination-specific profile missing`);
    need(feature.details.hours === exact?.hours, `${scope.name}/${feature.name}: destination-specific hours missing`);
    for (const answer of feature.details.searchAnswers || []) {
      need(/^https:\/\//.test(answer.source || ""), `${scope.name}/${feature.name}/${answer.intentKey}: public answer source missing`);
      need(answer.verifiedAt === "2026-08-10", `${scope.name}/${feature.name}/${answer.intentKey}: checked date mismatch`);
    }
  }
  for (const oldSlug of retired[parentSlug] || []) {
    need(!fs.existsSync(path.join(directory, oldSlug, "index.html")), `${scope.name}/${oldSlug}: retired page still exists`);
    const source = `/us/mi/detroit/parks/${parentSlug}/${oldSlug}`;
    need(redirects.some(item => item.source === source && item.destination === `/us/mi/detroit/parks/${parentSlug}` && item.permanent), `${scope.name}/${oldSlug}: permanent parent redirect missing`);
  }
}

const scoped = campaign.places.filter(scope => scopedIds.has(scope.id)).map(scope => JSON.stringify(places.find(place => place.id === scope.id) || {})).join("\n");
for (const phrase of ["official sources conflict", "visitors under 18", "150 free on-street spaces", "Pilot House is not wheelchair", "fishing is prohibited", "closes at 8:00 p.m."]) need(scoped.includes(phrase), `Missing Detroit guidance: ${phrase}`);
need(!scoped.includes("Official source image"), "Unlicensed official-source image attribution survived");
if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log("Verified the Detroit riverfront evidence batch: three parent guides, five exact photo-backed destinations, source-specific answers and retired-route redirects.");
