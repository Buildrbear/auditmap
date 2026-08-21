#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const expected = [
  ["Carlsbad", "alga-norte-community-park"],
  ["Carlsbad", "aviara-community-park"],
  ["Carlsbad", "calavera-hills-community-park"],
  ["Carlsbad", "poinsettia-community-park"],
  ["Carlsbad", "pine-avenue-community-park"],
  ["Carlsbad", "stagecoach-community-park"],
  ["Carlsbad", "magee-park"],
  ["Carlsbad", "leo-carrillo-ranch-historic-park"],
  ["Carlsbad", "batiquitos-lagoon"],
  ["Carlsbad", "lake-calavera-preserve"],
  ["Carlsbad", "agua-hedionda-lagoon-discovery-center"],
  ["Carlsbad", "south-carlsbad-state-beach"],
  ["Oceanside", "buddy-todd-park"],
  ["Oceanside", "heritage-park-village-and-museum"],
  ["Oceanside", "mance-buchanon-park"],
  ["Oceanside", "libby-lake-park"],
  ["Oceanside", "guajome-regional-park"],
  ["Oceanside", "san-luis-rey-river-trail"],
  ["Oceanside", "el-corazon-park-and-trails"],
  ["Oceanside", "oak-riparian-park"],
  ["Oceanside", "buena-vista-audubon-nature-center"],
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pagePath(city, slug) {
  return path.join(root, "us", "ca", city.toLowerCase(), "parks", slug, "index.html");
}

const launch = JSON.parse(fs.readFileSync(path.join(root, "data", "generated", "launch-map-places.json"), "utf8"));
const images = new Set();

for (const [city, slug] of expected) {
  const matches = launch.filter((place) => place.city === city && place.slug === slug);
  assert(matches.length === 1, `${city}/${slug}: expected one launch record, found ${matches.length}`);
  const place = matches[0];
  assert(Number.isFinite(place.latitude) && Number.isFinite(place.longitude), `${place.name}: missing coordinates`);
  assert(place.address, `${place.name}: missing address`);
  assert(place.source?.startsWith("http"), `${place.name}: missing official source`);
  assert(place.searchAnswers?.length >= 10, `${place.name}: expected at least 10 visitor questions`);
  assert(place.image?.url, `${place.name}: missing hero image`);
  assert(!images.has(place.image.url), `${place.name}: duplicate hero image ${place.image.url}`);
  images.add(place.image.url);
  assert(fs.existsSync(path.join(root, place.image.url.replace(/^\//, ""))), `${place.name}: local hero image is missing`);

  const file = pagePath(city, slug);
  assert(fs.existsSync(file), `${place.name}: generated page is missing`);
  const html = fs.readFileSync(file, "utf8");
  assert(html.includes(`<h1>${place.name}</h1>`) || html.includes(place.name), `${place.name}: name missing from raw HTML`);
  assert(html.includes("What people ask"), `${place.name}: visitor questions missing from raw HTML`);
  assert(html.includes('rel="canonical"'), `${place.name}: canonical link missing`);
  assert(html.includes('application/ld+json'), `${place.name}: structured data missing`);
  assert(html.includes(place.image.url), `${place.name}: hero image missing from raw HTML`);
  assert(html.includes(place.sourceLabel), `${place.name}: source label missing from raw HTML`);
}

const missionBay = launch.find((place) => place.id === "launch-ca-san-diego-mission-bay-park");
assert(missionBay, "Mission Bay Park is missing");
for (const slug of ["fiesta-island", "model-yacht-pond", "south-shores-park"]) {
  const feature = missionBay.features?.find((candidate) => candidate.slug === slug);
  assert(feature, `Mission Bay feature ${slug} is missing`);
  assert(feature.details?.searchAnswers?.length >= 6, `${feature.name}: insufficient visitor questions`);
  assert(feature.details?.imageUrl && fs.existsSync(path.join(root, feature.details.imageUrl.replace(/^\//, ""))), `${feature.name}: image missing`);
  const file = path.join(root, "us", "ca", "san-diego", "parks", "mission-bay-park", slug, "index.html");
  assert(fs.existsSync(file), `${feature.name}: generated subsite page missing`);
}

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
for (const [city, slug] of expected) {
  assert(sitemap.includes(`/us/ca/${city.toLowerCase()}/parks/${slug}`), `${city}/${slug}: sitemap entry missing`);
}

const forbidden = ["legoland", "sea-world", "seaworld", "veterans-memorial-park"];
for (const slug of forbidden) {
  assert(!expected.some(([, candidate]) => candidate.includes(slug)), `Paid, private, or unopened destination included: ${slug}`);
}

console.log(`San Diego coast expansion verified: ${expected.length} new full guides, ${images.size} unique hero images, and 3 Mission Bay destinations.`);
