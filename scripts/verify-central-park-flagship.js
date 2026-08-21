#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const parkId = "launch-ny-new-york-city-central-park";
const basePath = path.join(root, "us", "ny", "new-york-city", "parks", "central-park");
const source = JSON.parse(fs.readFileSync(path.join(root, "data", "generated", "all-subsites-ready.json"), "utf8"));
const campaign = JSON.parse(fs.readFileSync(path.join(root, "data", "parent-park-information-enrichment-campaign.json"), "utf8"));
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
const failures = [];

const expectedSlugs = [
  "pond-gapstow-bridge", "hallett-nature-sanctuary", "central-park-zoo", "wollman-rink",
  "heckscher-playground", "dairy-carousel", "sheep-meadow-tavern-on-the-green", "mall-literary-walk",
  "bethesda-terrace-fountain", "lake-bow-bridge-loeb-boathouse", "strawberry-fields",
  "conservatory-water-alice", "ramble", "belvedere-shakespeare-turtle-pond", "delacorte-theater",
  "great-lawn-pinetum", "obelisk-metropolitan-museum", "reservoir-running-track", "east-meadow-cedar-hill",
  "rumsey-playfield-summerstage", "north-meadow-recreation-center", "pool-loch-ravine",
  "north-woods-blockhouse", "great-hill", "conservatory-garden", "harlem-meer-dana-center", "davis-center",
];
const legacySlugs = [
  "107th-infantry-memorial", "alexander-hamilton", "alice-in-wonderland", "belvedere-castle",
  "blockhouse-no-1", "cleopatra-s-needle", "shakespeare-garden",
];

function check(condition, message) {
  if (!condition) failures.push(message);
}

const park = source.parks.find((candidate) => candidate.id === parkId);
const parent = campaign.parks[parkId];
check(Boolean(park), "Central Park subsite source is missing");
check(Boolean(parent), "Central Park parent enrichment is missing");

if (park && parent) {
  const features = park.features || [];
  const bySlug = new Map(features.map((feature) => [feature.slug, feature]));
  check(features.length === 27, `Central Park has ${features.length} destinations instead of 27`);
  check(new Set(features.map((feature) => feature.id)).size === features.length, "Central Park has duplicate feature IDs");
  check((parent.searchAnswers || []).length >= 14, "Central Park has fewer than 14 parent answers");
  check(Boolean(parent.image?.url), "Central Park parent hero is missing");
  check((parent.additionalImages || []).length >= 26, "Central Park parent gallery does not include the destination photos");
  check(Boolean(parent.hoursSchedule), "Central Park parent weekly schedule is missing");
  expectedSlugs.forEach((slug) => check(bySlug.has(slug), `Central Park is missing ${slug}`));

  for (const feature of features) {
    const details = feature.details || {};
    const answers = details.searchAnswers || [];
    check(Number.isFinite(Number(feature.latitude)), `${feature.slug} is missing latitude`);
    check(Number.isFinite(Number(feature.longitude)), `${feature.slug} is missing longitude`);
    check(answers.length >= 6, `${feature.slug} has fewer than six visitor answers`);
    check(new Set(answers.map((item) => item.intentKey)).size >= 6, `${feature.slug} answers are not intent-diverse`);
    check(Boolean(details.locationContext), `${feature.slug} is missing arrival guidance`);
    check(Boolean(details.needToKnow), `${feature.slug} is missing need-to-know guidance`);
    check(Boolean(details.accessibility), `${feature.slug} is missing accessibility guidance`);
    check(Boolean(details.informationSourceUrl), `${feature.slug} is missing an official source`);
    check(/^https:\/\/www\.centralparknyc\.org\//.test(details.informationSourceUrl), `${feature.slug} does not use the Conservancy as its primary source`);
    check(Boolean(details.imageUrl), `${feature.slug} is missing a hero image`);
    if (details.imageUrl?.startsWith("/")) {
      check(fs.existsSync(path.join(root, details.imageUrl.slice(1))), `${feature.slug} hero file is missing`);
    }
    const images = details.images || [];
    check(images.length >= 1, `${feature.slug} is missing photo metadata`);
    for (const image of images) {
      check(Number.isFinite(Number(image.latitude)), `${feature.slug} photo is missing latitude`);
      check(Number.isFinite(Number(image.longitude)), `${feature.slug} photo is missing longitude`);
      check(image.featureId === feature.id, `${feature.slug} photo is not linked to its map destination`);
      check(Boolean(image.source), `${feature.slug} photo source is missing`);
      check(Boolean(image.alt), `${feature.slug} photo alt text is missing`);
    }

    const filePath = path.join(basePath, feature.slug, "index.html");
    const canonical = `https://www.auditmap.org/us/ny/new-york-city/parks/central-park/${feature.slug}`;
    check(fs.existsSync(filePath), `${feature.slug} static page is not generated`);
    check(sitemap.includes(`<loc>${canonical}</loc>`), `${feature.slug} is missing from sitemap.xml`);
    if (fs.existsSync(filePath)) {
      const html = fs.readFileSync(filePath, "utf8");
      check(html.includes(`<link rel="canonical" href="${canonical}"`), `${feature.slug} canonical is incorrect`);
      check(html.includes(feature.name.replaceAll("&", "&amp;")) || html.includes(feature.name), `${feature.slug} raw HTML is missing its name`);
      check(html.includes("7 answers"), `${feature.slug} raw HTML is missing its answer count`);
      check(html.includes("Photo source"), `${feature.slug} raw HTML is missing photo attribution`);
      check(html.includes('id="place-live"'), `${feature.slug} is missing live weather and events`);
    }
  }
}

const parentPath = path.join(basePath, "index.html");
check(fs.existsSync(parentPath), "Central Park parent page is not generated");
if (fs.existsSync(parentPath)) {
  const html = fs.readFileSync(parentPath, "utf8");
  ["All 27 mapped places", "15 answers", "Bethesda Terrace", "Davis Center", "Gottesman Pool", "6 a.m. to 1 a.m."].forEach((text) =>
    check(html.includes(text), `Central Park parent raw HTML is missing ${text}`),
  );
  check(Buffer.byteLength(html) <= 153600, "Central Park parent page exceeds the performance limit");
}

for (const slug of legacySlugs) {
  const canonical = `https://www.auditmap.org/us/ny/new-york-city/parks/central-park/${slug}`;
  check(!sitemap.includes(`<loc>${canonical}</loc>`), `${slug} legacy page remains indexed`);
  check((vercel.redirects || []).some((redirect) => redirect.source.endsWith(`/${slug}`) && redirect.permanent), `${slug} has no permanent redirect`);
}

if (failures.length) {
  console.error(`Central Park flagship verification failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Central Park flagship verification passed: 27 destinations, 27 official photos, 162 subsite answers, and 14 parent answers.");
