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

function localFile(url) {
  return path.join(root, url.replace(/^\//, ""));
}

const places = JSON.parse(
  fs.readFileSync(path.join(root, "data", "generated", "launch-map-places.json"), "utf8"),
);

let galleryPhotos = 0;
for (const [city, slug] of expected) {
  const place = places.find((candidate) => candidate.city === city && candidate.slug === slug);
  assert(place, `${city}/${slug}: generated place is missing`);
  const photos = [place.image, ...(place.images || [])].filter(Boolean);
  const unique = [...new Map(photos.map((photo) => [photo.url, photo])).values()];
  assert(unique.length >= 3, `${place.name}: expected at least 3 distinct photographs, found ${unique.length}`);

  const page = path.join(root, "us", "ca", city.toLowerCase(), "parks", slug, "index.html");
  const html = fs.readFileSync(page, "utf8");
  for (const photo of unique) {
    assert(photo.url?.startsWith("/assets/parks/"), `${place.name}: photograph is not stored locally`);
    assert(fs.existsSync(localFile(photo.url)), `${place.name}: missing local photograph ${photo.url}`);
    assert(photo.source?.startsWith("http"), `${place.name}: photograph is missing its source`);
    assert(photo.author, `${place.name}: photograph is missing its credit`);
    assert(photo.license, `${place.name}: photograph is missing its usage note`);
    assert(photo.alt, `${place.name}: photograph is missing descriptive alternative text`);
    assert(html.includes(photo.url), `${place.name}: ${photo.url} is absent from raw page HTML`);
  }
  galleryPhotos += unique.length;
}

const agua = places.find((place) => place.id === "launch-ca-carlsbad-agua-hedionda-lagoon-discovery-center");
assert(agua.hours.includes("9 a.m.-5 p.m."), "Agua Hedionda: current daily hours are missing");
assert(agua.cost.includes("$15"), "Agua Hedionda: suggested group donation is missing");
assert(agua.images.some((image) => /Pine Tree Play Zone/.test(image.alt)), "Agua Hedionda: play-zone photo is missing");
assert(agua.images.some((image) => /touch pool/.test(image.alt)), "Agua Hedionda: touch-pool photo is missing");
assert(!agua.images.some((image) => /6803|6805/.test(`${image.source} ${image.url}`)), "Agua Hedionda: technical graphics remain in the gallery");

const poinsettia = places.find((place) => place.id === "launch-ca-carlsbad-poinsettia-community-park");
assert(poinsettia.images.some((image) => /natural-grass dog park/.test(image.alt)), "Poinsettia: dog-park photo is missing");

const heritage = places.find((place) => place.id === "launch-ca-oceanside-heritage-park-village-and-museum");
assert(heritage.images.some((image) => /train depot/i.test(image.alt)), "Heritage Park: train-depot photo is missing");
assert(heritage.images.some((image) => /Libby Schoolhouse/i.test(image.alt)), "Heritage Park: schoolhouse photo is missing");
assert(!heritage.images.some((image) => /village-gazebo|historic-village/.test(image.url)), "Heritage Park: redundant gallery images remain");

const audubon = places.find((place) => place.id === "launch-ca-oceanside-buena-vista-audubon-nature-center");
assert(audubon.hours.includes("10 a.m.-4 p.m."), "Buena Vista Audubon: current center hours are missing");

console.log(`San Diego coast galleries verified: ${expected.length} guides and ${galleryPhotos} distinct sourced photographs.`);
