#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const campaign = require("../data/chesapeake-bay-evidence-gate-campaign.json");
const all = require("../data/generated/all-subsites-ready.json").parks;
const pilot = require("../data/generated/pilot-subsites-ready.json").parks;
const launch = require("../data/generated/launch-map-places.json");
const national = require("../data/parent-park-information-enrichment-national.json").parks;
const campaignParents = require("../data/parent-park-information-enrichment-campaign.json").parks;
const locations = require("../data/launch-location-overrides.json");
const failures = [];
const need = (condition, message) => { if (!condition) failures.push(message); };
const allowedLicenses = new Set([
  "https://creativecommons.org/licenses/by-sa/4.0/",
  "https://creativecommons.org/licenses/by-sa/3.0/",
  "https://creativecommons.org/licenses/by-sa/2.0/",
  "https://creativecommons.org/licenses/by/2.0/",
  "https://creativecommons.org/publicdomain/mark/1.0/"
]);

for (const scope of campaign.places) {
  const record = all.find((item) => item.id === scope.id);
  need(record, `${scope.name}: all-subsites record missing`);
  if (!record) continue;
  for (const [label, copy] of [
    ["pilot", pilot.find((item) => item.id === scope.id)],
    ["launch", launch.find((item) => item.id === scope.id)]
  ]) {
    need(copy, `${scope.name}: ${label} record missing`);
    need(copy?.source === scope.officialSource, `${scope.name}: ${label} source did not persist`);
    need(copy?.verifiedAt === campaign.checkedAt, `${scope.name}: ${label} checked date stale`);
  }
  for (const [label, copy] of [["national parent", national[scope.id]], ["campaign parent", campaignParents[scope.id]]]) {
    need(copy?.source === scope.officialSource, `${scope.name}: ${label} source did not persist`);
    need(copy?.verifiedAt === campaign.checkedAt, `${scope.name}: ${label} checked date stale`);
    need(copy?.additionalImages?.length === 3, `${scope.name}: ${label} gallery did not persist`);
    need(copy?.searchAnswers?.length === 11, `${scope.name}: ${label} answers did not persist`);
  }
  const location = locations.find((item) => item.id === scope.id);
  need(location?.latitude === scope.latitude && location?.longitude === scope.longitude, `${scope.name}: coordinates did not persist`);
  need(location?.sourceUrl === scope.coordinateSource, `${scope.name}: coordinate provenance missing`);
  const images = [record.image, ...(record.images || [])].filter(Boolean);
  need(images.length === 4, `${scope.name}: expected four reviewed images`);
  need(record.searchAnswers?.length === 11, `${scope.name}: expected 11 visitor answers`);
  need(record.source === scope.officialSource, `${scope.name}: authoritative source mismatch`);
  need(record.verifiedAt === campaign.checkedAt, `${scope.name}: checked date stale`);
  need(record.publishStatus === "super-enriched", `${scope.name}: release status missing`);
  need(record.likelySubsites === false && record.features?.length === 0, `${scope.name}: evidence-gated destination survived`);
  need(record.researchQueue?.length >= 3, `${scope.name}: unresolved review queue missing`);
  need(!String(record.hours).includes("research pending"), `${scope.name}: unresolved hours survived`);
  need(!String(record.transit).includes("research pending"), `${scope.name}: unresolved transit survived`);
  for (const answer of record.searchAnswers || []) {
    need(answer.source?.startsWith("https://"), `${scope.name}/${answer.intentKey}: public source missing`);
    need(answer.sourceLabel && answer.checkedAt === campaign.checkedAt, `${scope.name}/${answer.intentKey}: evidence metadata incomplete`);
    need(["fast", "slow"].includes(answer.freshnessClass), `${scope.name}/${answer.intentKey}: freshness missing`);
    need(answer.status === "verified", `${scope.name}/${answer.intentKey}: verification status missing`);
  }
  for (const image of images) {
    need(image.url && fs.existsSync(path.join(root, image.url.slice(1))), `${scope.name}: image file missing`);
    need(image.source?.startsWith("https://commons.wikimedia.org/wiki/File:"), `${scope.name}: Commons source page missing`);
    need(image.author && image.license && allowedLicenses.has(image.licenseUrl), `${scope.name}: reuse basis incomplete`);
    need(image.alt && image.width > 0 && image.height > 0, `${scope.name}: image presentation metadata incomplete`);
  }
  const state = scope.state.toLowerCase();
  const city = scope.citySlug.replace(`-${state}`, "");
  const parentRoute = `/us/${state}/${city}/parks/${record.slug}`;
  const parentFile = path.join(root, parentRoute.slice(1), "index.html");
  need(fs.existsSync(parentFile), `${scope.name}: parent page missing`);
  if (fs.existsSync(parentFile)) {
    const html = fs.readFileSync(parentFile, "utf8");
    for (const value of [record.name, record.address, 'rel="canonical"', "What people ask", "Sources", "breadcrumb"])
      need(value && html.toLowerCase().includes(value.toLowerCase()), `${scope.name}: raw HTML missing ${value}`);
  }
}

const joined = campaign.places.map((scope) => JSON.stringify(all.find((item) => item.id === scope.id) || {})).join("\n");
for (const phrase of ["7 a.m. to sunset", "22-ramp", "10 a.m. to 6 p.m.", "Memorial Day weekend", "official sources conflict", "Crystal Pier", "Trolley Station Pavilion", "Francis Scott Key Bridge", "no lifeguards"])
  need(joined.includes(phrase), `Missing Chesapeake Bay guidance: ${phrase}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Verified 2 Chesapeake Bay parents, 8 local licensed images, 22 source-backed parent answers, and four persisted source layers.");
