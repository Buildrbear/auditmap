#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/southeast-atlantic-super-enrichment-campaign.json");
const places = require("../data/generated/launch-map-places.json");
const failures = [];
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const need = (condition, message) => { if (!condition) failures.push(message); };

for (const scope of campaign.places) {
  const place = places.find((item) => item.id === scope.id);
  const directory = path.join(root, "us", scope.state.toLowerCase(), slug(scope.city), "parks", slug(scope.name));
  need(place, `${scope.name}: launch record missing`);
  if (!place) continue;
  const images = [place.image, ...(place.images || [])].filter(Boolean);
  need(images.length >= 4, `${scope.name}: fewer than four photos`);
  need(new Set(images.map((image) => image.url)).size >= 4, `${scope.name}: duplicate gallery photos`);
  for (const image of images) {
    need(image.url && fs.existsSync(path.join(root, image.url.replace(/^\//, ""))), `${scope.name}: image file missing ${image.url}`);
    need(image.source && image.author && image.license && image.alt, `${scope.name}: image attribution incomplete`);
  }
  need((place.features || []).length === scope.subsites.length, `${scope.name}: subsite count does not match reviewed campaign`);
  need((place.searchAnswers || []).length >= 11, `${scope.name}: parent answers missing`);
  need((place.sources || []).length >= 1, `${scope.name}: source list missing`);
  const parentFile = path.join(directory, "index.html");
  need(fs.existsSync(parentFile), `${scope.name}: parent page missing`);
  if (fs.existsSync(parentFile)) {
    const html = fs.readFileSync(parentFile, "utf8");
    for (const value of [place.name, place.address, 'rel="canonical"', "What people ask", "Sources"]) {
      need(value && html.includes(value), `${scope.name}: raw HTML missing ${value}`);
    }
  }
  for (const feature of place.features || []) {
    need(Number.isFinite(feature.latitude) && Number.isFinite(feature.longitude), `${scope.name}/${feature.name}: coordinate missing`);
    need(feature.details?.coordinateSource && feature.details?.positionQuality === "reviewed-public-map-placement", `${scope.name}/${feature.name}: reviewed coordinate provenance missing`);
    need((feature.details?.images || []).length >= 1, `${scope.name}/${feature.name}: image missing`);
    need((feature.details?.searchAnswers || []).length >= 9, `${scope.name}/${feature.name}: visitor answers missing`);
    const featureFile = path.join(directory, feature.slug, "index.html");
    need(fs.existsSync(featureFile), `${scope.name}/${feature.name}: page missing`);
    if (fs.existsSync(featureFile)) {
      const html = fs.readFileSync(featureFile, "utf8").toLowerCase();
      for (const value of [feature.name, place.name, "parking", "restroom", "dogs", "sources", 'rel="canonical"']) {
        need(html.includes(value.toLowerCase()), `${scope.name}/${feature.name}: raw HTML missing ${value}`);
      }
      need(html.includes(encodeURIComponent(`${feature.latitude},${feature.longitude}`).toLowerCase()), `${scope.name}/${feature.name}: exact-coordinate navigation missing`);
    }
  }
}

const joined = campaign.places.map((scope) => JSON.stringify(places.find((place) => place.id === scope.id) || {})).join("\n");
for (const phrase of [
  "Pineapple Fountain and splash fountain are different destinations",
  "Mary Murray Drive changes from vehicle circulation to a car-free exercise loop",
  "non-fenced off-leash area only dawn-9:00 a.m. and 5:00-11:00 p.m.",
  "active civic and event space, not one uniform park experience",
  "Avian Trail or observation tower until Georgia State Parks removes the current closure notice",
  "Ghost, paranormal, treasure-hunt, scavenger-hunt, loud, athletic, or disruptive activities are prohibited",
  "Swimming is prohibited in the freshwater lake",
  "Treaty Oak name comes from a 1930s newspaper story"
]) need(joined.includes(phrase), `Missing practical guidance: ${phrase}`);

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
for (const scope of campaign.places) {
  const route = `/us/${scope.state.toLowerCase()}/${slug(scope.city)}/parks/${slug(scope.name)}/`;
  need(sitemap.includes(route.replace(/\/$/, "")), `${scope.name}: sitemap route missing`);
}
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
need(app.includes("daylightSavingHoursMatch"), "Seasonal daylight-saving hours support missing");
need(app.includes("placeTimeZone(place)"), "Place-local time-zone support missing");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Verified ${campaign.places.length} Southeast Atlantic guides, 32 licensed photos, 50 reviewed subsite pins, raw HTML, and sitemap routes.`);
