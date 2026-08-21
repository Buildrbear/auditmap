#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const records = JSON.parse(fs.readFileSync(path.join(root, "data", "institutions.json"), "utf8"));
const park = records.find((record) => record.id === "dix-park");
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

check(Boolean(park), "Dix Park record is missing");
if (park) {
  const features = park.features || [];
  const bySlug = new Map(features.map((feature) => [feature.slug, feature]));
  const required = [
    "big-field", "dog-park", "gipson-play-plaza", "house-of-many-porches",
    "slide-valley", "watermill-mountain", "sand-bowl", "fountain-plaza",
    "picnic-grove", "sensory-maze", "swing-terrace", "woodland-garden",
    "stone-houses-visitor-center", "the-chapel", "the-grove", "harvey-hill",
    "flowers-field", "pine-loop-trail", "flowers-cottage", "sunflower-field",
    "historic-cemetery", "magnolia-room", "oak-room", "outdoor-classroom",
    "adams-field", "hammock-grove", "rocky-branch-greenway-trailhead",
    "trolls-pine-loop", "trolls-big-field", "troll-grove", "attun",
    "sunflower-power-poles", "get-well-soon", "pollinator-hotel",
    "public-art-apiary", "meadow-of-the-deer", "another-day-in-the-life",
    "sophia-fortuna", "praise-song", "memory-is-a-hearth-vestora",
    "memory-is-a-hearth-the-lamp", "memory-is-a-hearth-a-wildening",
    "stitching-stories-reimagined",
  ];
  check(features.length >= 48, `Expected at least 48 mapped destinations, found ${features.length}`);
  required.forEach((slug) => check(bySlug.has(slug), `Missing required destination: ${slug}`));
  check(new Set(features.map((feature) => feature.id)).size === features.length, "Feature IDs are not unique");
  check(new Set(features.map((feature) => feature.slug)).size === features.length, "Feature slugs are not unique");

  for (const feature of features) {
    check(Number.isFinite(Number(feature.latitude)), `${feature.slug} is missing latitude`);
    check(Number.isFinite(Number(feature.longitude)), `${feature.slug} is missing longitude`);
    check((feature.details?.searchAnswers || []).length >= 6, `${feature.slug} has fewer than six visitor answers`);
    check(Boolean(feature.details?.locationContext), `${feature.slug} is missing location guidance`);
    check(Boolean(feature.details?.needToKnow), `${feature.slug} is missing need-to-know guidance`);
    check(Boolean(feature.source_url), `${feature.slug} is missing an official source`);
    const images = [
      feature.details?.imageUrl ? { url: feature.details.imageUrl, latitude: feature.latitude, longitude: feature.longitude } : null,
      ...(feature.details?.images || []),
    ].filter(Boolean);
    for (const image of images) {
      if (image.url.startsWith("/")) {
        check(fs.existsSync(path.join(root, image.url.slice(1))), `${feature.slug} references missing image ${image.url}`);
      }
      check(Number.isFinite(Number(image.latitude)), `${feature.slug} photo is missing latitude`);
      check(Number.isFinite(Number(image.longitude)), `${feature.slug} photo is missing longitude`);
    }
  }

  const imageCount = features.reduce(
    (total, feature) => total + Number(Boolean(feature.details?.imageUrl)) + (feature.details?.images || []).length,
    0,
  );
  const missingImageCount = features.filter((feature) => !feature.details?.imageUrl).length;
  check(imageCount >= 70, `Expected at least 70 location-aware subsite photos, found ${imageCount}`);
  check(missingImageCount === 0, `${missingImageCount} mapped destinations still lack a photo`);
  check((park.searchAnswers || []).length >= 25, "Parent page has fewer than 25 visitor answers");
  check(
    (park.hiddenFeatureIds || []).includes("ff2dce52-a86e-4886-bdb1-8bf68f89646c"),
    "Legacy Big Field Restrooms feature is not suppressed",
  );

  const homp = bySlug.get("house-of-many-porches");
  check(/draft beer/i.test(homp?.details?.needToKnow || ""), "House of Many Porches is missing draft beer detail");
  check(/sandwiches/i.test(homp?.details?.needToKnow || ""), "House of Many Porches is missing food detail");
  const cottage = bySlug.get("flowers-cottage");
  check(/not yet confirmed open/i.test(cottage?.details?.hours || ""), "Flowers Cottage does not clearly retain coming-soon status");

  const exactTrollCoordinates = [
    [35.7745093343812, -78.6628817739719],
    [35.7737259203586, -78.6626242832267],
    [35.7698957823595, -78.6618839926375],
    [35.7695475792411, -78.6615299406283],
    [35.7694822909258, -78.6525820913545],
  ];
  const trollPhotos = features
    .filter((feature) => feature.slug.startsWith("troll"))
    .flatMap((feature) => feature.details?.images || []);
  exactTrollCoordinates.forEach(([latitude, longitude]) => {
    check(
      trollPhotos.some(
        (image) =>
          Math.abs(Number(image.latitude) - latitude) < 1e-8 &&
          Math.abs(Number(image.longitude) - longitude) < 1e-8,
      ),
      `No troll photo uses exact coordinate ${latitude}, ${longitude}`,
    );
  });
}

const duplicateDogPark = records.find((record) => record.id === "dix-park-dog-park");
check(duplicateDogPark?.publishStatus === "excluded", "Duplicate Dix Park Dog Park listing is not excluded");

const generatedParent = path.join(root, "us", "nc", "raleigh", "parks", "dix-park", "index.html");
if (fs.existsSync(generatedParent)) {
  const html = fs.readFileSync(generatedParent, "utf8");
  check(html.includes('id="place-live"'), "Generated parent page is missing the live weather/events module");
  check(html.includes("House of Many Porches"), "Generated parent page is missing House of Many Porches");
  check(html.includes("Pine Loop Trail"), "Generated parent page is missing Pine Loop Trail");
  check(html.includes("Kirby Derby"), "Generated parent page is missing Kirby Derby guidance");
  check(html.includes("Rocky Branch Greenway"), "Generated parent page is missing greenway guidance");
  check(!html.includes("Big Field Restrooms"), "Generated parent page includes the retired restroom subsite");
}

if (failures.length) {
  console.error(`Dix flagship verification failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Dix flagship verification passed.");
