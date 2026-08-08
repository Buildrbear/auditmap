#!/usr/bin/env node

const fs = require("node:fs");

const origin = (process.env.AUDITMAP_ORIGIN || "https://www.auditmap.org").replace(/\/$/, "");
const parkId = "launch-ny-new-york-city-central-park";
const basePath = "/us/ny/new-york-city/parks/central-park";
const source = JSON.parse(fs.readFileSync("data/generated/all-subsites-ready.json", "utf8"));
const park = source.parks.find((candidate) => candidate.id === parkId);
const slugs = (park?.features || []).map((feature) => feature.slug);
const legacySlugs = [
  "107th-infantry-memorial", "alexander-hamilton", "alice-in-wonderland", "belvedere-castle",
  "blockhouse-no-1", "cleopatra-s-needle", "shakespeare-garden",
];
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function fetchPage(pagePath, expectedAnswers) {
  const response = await fetch(`${origin}${pagePath}`, { headers: { "User-Agent": "AuditMap production verification/1.0" } });
  check(response.ok, `${pagePath} returned ${response.status}`);
  if (!response.ok) return;
  const html = await response.text();
  check(html.includes(`<link rel="canonical" href="${origin}${pagePath}"`), `${pagePath} canonical is incorrect`);
  check(html.includes("/app.js?v=20260805-8"), `${pagePath} does not use the current app asset`);
  check(html.includes(`${expectedAnswers} answers`), `${pagePath} does not expose ${expectedAnswers} answers in raw HTML`);
  check(html.includes("Photo source"), `${pagePath} has no raw photo attribution`);
  const hero = html.match(/<img id="gallery-image" src="([^"]+)"/i)?.[1]?.replaceAll("&amp;", "&");
  check(Boolean(hero), `${pagePath} has no server-rendered hero`);
  if (hero) {
    const image = await fetch(new URL(hero, origin), { headers: { "User-Agent": "AuditMap production verification/1.0" } });
    check(image.ok, `${pagePath} optimized hero returned ${image.status}`);
    check(/^image\//.test(image.headers.get("content-type") || ""), `${pagePath} hero is not an image response`);
  }
}

async function main() {
  check(slugs.length === 27, `Production source has ${slugs.length} Central Park destinations instead of 27`);
  await fetchPage(basePath, 15);
  for (const slug of slugs) await fetchPage(`${basePath}/${slug}`, 7);

  const sitemapResponse = await fetch(`${origin}/sitemap.xml`);
  check(sitemapResponse.ok, `Production sitemap returned ${sitemapResponse.status}`);
  const sitemap = sitemapResponse.ok ? await sitemapResponse.text() : "";
  check(sitemap.includes(`<loc>${origin}${basePath}</loc>`), "Central Park parent is missing from production sitemap");
  for (const slug of slugs) {
    check(sitemap.includes(`<loc>${origin}${basePath}/${slug}</loc>`), `${slug} is missing from production sitemap`);
  }
  for (const slug of legacySlugs) {
    check(!sitemap.includes(`<loc>${origin}${basePath}/${slug}</loc>`), `${slug} remains in production sitemap`);
    const redirect = await fetch(`${origin}${basePath}/${slug}`, { redirect: "manual" });
    check(redirect.status === 308, `${slug} returns ${redirect.status} instead of 308`);
    check(Boolean(redirect.headers.get("location")), `${slug} redirect has no destination`);
  }

  const mapResponse = await fetch(`${origin}/data/generated/launch-map-places.json`);
  check(mapResponse.ok, `Production map catalog returned ${mapResponse.status}`);
  if (mapResponse.ok) {
    const records = await mapResponse.json();
    const centralPark = records.find((record) => record.id === parkId);
    check(Boolean(centralPark), "Central Park is missing from the production map catalog");
    check((centralPark?.features || []).length === 27, "Production map catalog does not contain 27 Central Park destinations");
  }

  const liveResponse = await fetch(`${origin}/api/place-live?lat=40.78277&lon=-73.96536&placeId=${parkId}&feature=${encodeURIComponent("The Ramble")}`);
  check(liveResponse.ok, `Central Park live API returned ${liveResponse.status}`);
  if (liveResponse.ok) {
    const live = await liveResponse.json();
    check(Boolean(live.weather?.shortForecast), "Central Park production weather is missing");
    check((live.events || []).length >= 1, "Central Park production events are missing");
    check(live.events?.[0]?.location === "The Ramble", "Ramble event is not prioritized on its subsite");
    check(live.eventsSource === "https://www.centralparknyc.org/events", "Central Park event source is incorrect");
  }

  if (failures.length) {
    console.error(`Central Park production verification failed (${failures.length}):`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`Central Park production verification passed at ${origin}: 28 pages, 28 optimized heroes, 27 map destinations, live weather/events, sitemap, and redirects.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
