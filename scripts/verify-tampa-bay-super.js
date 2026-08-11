#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const campaign = require("../data/tampa-bay-evidence-gate-campaign.json");
const places = require("../data/generated/all-subsites-ready.json").parks;
const vercel = require("../vercel.json");
const fail = [];
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const need = (ok, message) => { if (!ok) fail.push(message); };
const expectedFeatures = {
  "launch-fl-st-petersburg-st-pete-pier": ["tampa-bay-watch-discovery-center"],
  "launch-fl-tierra-verde-fort-de-soto-park": ["historic-fort-de-soto", "fort-de-soto-gulf-pier"]
};
for (const scope of campaign.places) {
  const parent = places.find((item) => item.id === scope.id);
  const parentRoute = `/us/fl/${slug(scope.city)}/parks/${slug(scope.name)}`;
  const directory = path.join(root, parentRoute.slice(1));
  need(parent, `${scope.name}: missing record`);
  if (!parent) continue;
  const images = [parent.image, ...(parent.images || [])].filter(Boolean);
  need(parent.searchAnswers?.length >= 11, `${scope.name}: parent answers missing`);
  need(parent.verifiedAt === campaign.checkedAt, `${scope.name}: checked date stale`);
  for (const image of images) {
    need(image.url && fs.existsSync(path.join(root, image.url.slice(1))), `${scope.name}: image file missing`);
    need(image.source?.startsWith("https://"), `${scope.name}: image source missing`);
    need(image.author && image.license && !/official .*website/i.test(image.license), `${scope.name}: reuse basis missing`);
  }
  if (scope.deferRelease) {
    need(images.length >= 1 && images.length < 4, `${scope.name}: deferred gallery must remain below gate`);
    need(parent.publishStatus === "photo-gated-deferred", `${scope.name}: deferred status missing`);
    need(parent.features?.length === 0, `${scope.name}: deferred legacy destinations survived`);
    need(parent.researchQueue?.length === 1, `${scope.name}: deferral queue missing`);
  } else {
    need(images.length === 4, `${scope.name}: expected four reviewed images`);
    need(parent.publishStatus === "super-enriched", `${scope.name}: release status missing`);
    const expected = expectedFeatures[scope.id] || [];
    need(JSON.stringify((parent.features || []).map((item) => item.slug)) === JSON.stringify(expected), `${scope.name}: retained destination set mismatch`);
  }
  const parentFile = path.join(directory, "index.html");
  need(fs.existsSync(parentFile), `${scope.name}: parent page missing`);
  if (fs.existsSync(parentFile)) {
    const html = fs.readFileSync(parentFile, "utf8");
    for (const value of [parent.name, parent.address, 'rel="canonical"', "What people ask", "Sources"])
      need(value && html.includes(value), `${scope.name}: raw HTML missing ${value}`);
  }
  const retained = new Set((parent.features || []).map((item) => item.slug));
  for (const retiredSlug of scope.legacyCandidates.map(slug).filter((item) => !retained.has(item))) {
    need(!fs.existsSync(path.join(directory, retiredSlug, "index.html")), `${scope.name}/${retiredSlug}: retired page survived`);
    need(vercel.redirects.some((item) => item.source === `${parentRoute}/${retiredSlug}` && item.destination === parentRoute && item.permanent), `${scope.name}/${retiredSlug}: retirement redirect missing`);
  }
  for (const feature of parent.features || []) {
    need(Number.isFinite(feature.latitude) && Number.isFinite(feature.longitude), `${scope.name}/${feature.name}: coordinates missing`);
    need(feature.details?.positionQuality === "exact-geotag-or-named-open-map-object", `${scope.name}/${feature.name}: exact position review missing`);
    need(feature.details?.coordinateSource?.startsWith("https://"), `${scope.name}/${feature.name}: coordinate provenance missing`);
    need(feature.details?.images?.length === 1, `${scope.name}/${feature.name}: exact image missing`);
    need(feature.details?.searchAnswers?.length >= 9, `${scope.name}/${feature.name}: profile incomplete`);
    const featureFile = path.join(directory, feature.slug, "index.html");
    need(fs.existsSync(featureFile), `${scope.name}/${feature.name}: page missing`);
    if (fs.existsSync(featureFile)) {
      const html = fs.readFileSync(featureFile, "utf8").toLowerCase();
      for (const value of [feature.name, parent.name, "parking", "restroom", "dogs", "sources", 'rel="canonical"'])
        need(html.includes(value.toLowerCase()), `${scope.name}/${feature.name}: raw HTML missing ${value}`);
      need(html.includes(encodeURIComponent(`${feature.latitude},${feature.longitude}`).toLowerCase()), `${scope.name}/${feature.name}: exact navigation missing`);
    }
  }
}
const joined = campaign.places.map((scope) => JSON.stringify(places.find((item) => item.id === scope.id) || {})).join("\n");
for (const phrase of ["observation tower are closed", "fishing pier remains closed", "parking is limited to six hours", "burn ban has been in effect", "Bending Arc is presently listed as temporarily closed"])
  need(joined.includes(phrase), `Missing current Tampa Bay guidance: ${phrase}`);
if (fail.length) { console.error(fail.join("\n")); process.exit(1); }
const retainedCount = campaign.places.reduce((total, scope) => total + (expectedFeatures[scope.id]?.length || 0), 0);
console.log(`Verified 6 released Tampa Bay parents, 2 photo-gated parents, ${retainedCount} exact destinations, and 61 retirement redirects.`);
