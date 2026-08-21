#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const records = JSON.parse(fs.readFileSync(path.join(root, "data", "institutions.json"), "utf8"));
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

const requirements = [
  {
    id: "downtown-cary-park",
    count: 11,
    answers: 16,
    slugs: [
      "the-nest", "academy-plaza", "barkyard", "great-lawn-pavilion",
      "gathering-house-garden", "park-street-courts", "skywalk-light-passage",
      "frantz-square", "market-317", "bark-bar", "tiered-water-feature-willow-isle",
    ],
    requiredText: ["Market 317", "The Bark Bar", "Willow Isle", "cashless"],
  },
  {
    id: "pullen-park",
    count: 16,
    answers: 20,
    slugs: [
      "welcome-center", "historic-carousel", "miniature-train", "kiddie-boats",
      "lake-howell-pedal-boats", "playgrounds", "pullen-place-cafe",
      "amusement-landmarks", "petanque-bocce", "upper-shelter-area",
      "carousel-pavilion-shelter-6", "event-lawn-stage", "aquatic-center",
      "community-center", "arts-center", "theatre-in-the-park",
    ],
    requiredText: ["spring 2027", "919-996-6472", "$2", "Lake Howell"],
  },
];

for (const requirement of requirements) {
  const park = records.find((record) => record.id === requirement.id);
  check(Boolean(park), `${requirement.id} record is missing`);
  if (!park) continue;
  const features = park.features || [];
  const bySlug = new Map(features.map((feature) => [feature.slug, feature]));
  check(features.length === requirement.count, `${requirement.id} has ${features.length} features instead of ${requirement.count}`);
  check((park.searchAnswers || []).length >= requirement.answers, `${requirement.id} has too few parent answers`);
  check((park.images || []).length >= 3, `${requirement.id} parent gallery has fewer than three photos`);
  check(new Set(features.map((feature) => feature.id)).size === features.length, `${requirement.id} has duplicate feature IDs`);
  requirement.slugs.forEach((slug) => check(bySlug.has(slug), `${requirement.id} is missing ${slug}`));

  for (const feature of features) {
    check(Number.isFinite(Number(feature.latitude)), `${requirement.id}/${feature.slug} is missing latitude`);
    check(Number.isFinite(Number(feature.longitude)), `${requirement.id}/${feature.slug} is missing longitude`);
    check((feature.details?.searchAnswers || []).length >= 6, `${requirement.id}/${feature.slug} has fewer than six answers`);
    check(Boolean(feature.details?.locationContext), `${requirement.id}/${feature.slug} is missing location guidance`);
    check(Boolean(feature.details?.needToKnow), `${requirement.id}/${feature.slug} is missing need-to-know guidance`);
    check(Boolean(feature.source_url), `${requirement.id}/${feature.slug} is missing a source`);
    check(Boolean(feature.details?.imageUrl), `${requirement.id}/${feature.slug} is missing a hero photo`);
    const images = [
      feature.details?.imageUrl
        ? {
            url: feature.details.imageUrl,
            latitude: feature.latitude,
            longitude: feature.longitude,
          }
        : null,
      ...(feature.details?.images || []),
    ].filter(Boolean);
    for (const image of images) {
      if (image.url.startsWith("/")) {
        check(fs.existsSync(path.join(root, image.url.slice(1))), `${requirement.id}/${feature.slug} references missing ${image.url}`);
      }
      check(Number.isFinite(Number(image.latitude)), `${requirement.id}/${feature.slug} photo is missing latitude`);
      check(Number.isFinite(Number(image.longitude)), `${requirement.id}/${feature.slug} photo is missing longitude`);
    }
  }

  const city = park.city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const generatedPath = path.join(root, "us", "nc", city, "parks", park.slug || requirement.id, "index.html");
  check(fs.existsSync(generatedPath), `${requirement.id} parent page is not generated`);
  if (fs.existsSync(generatedPath)) {
    const html = fs.readFileSync(generatedPath, "utf8");
    check(html.includes('id="place-live"'), `${requirement.id} is missing the live information module`);
    requirement.requiredText.forEach((text) => check(html.includes(text), `${requirement.id} generated page is missing ${text}`));
  }

  for (const slug of requirement.slugs) {
    const page = path.join(root, "us", "nc", city, "parks", park.slug || requirement.id, slug, "index.html");
    check(fs.existsSync(page), `${requirement.id}/${slug} page is not generated`);
  }
}

if (failures.length) {
  console.error(`Triangle flagship verification failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Downtown Cary Park and Pullen Park flagship verification passed.");
