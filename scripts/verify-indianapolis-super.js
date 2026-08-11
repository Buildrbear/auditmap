#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  root = path.resolve(__dirname, ".."),
  campaign = require("../data/indianapolis-super-enrichment-campaign.json"),
  places = require("../data/generated/launch-map-places.json"),
  redirects = require("../vercel.json").redirects || [],
  expected = {
    "launch-in-indianapolis-garfield-park": [
      "garfield-park-conservatory",
      "sunken-garden",
      "garfield-park-arts-center",
    ],
    "launch-in-indianapolis-holliday-park": [
      "holliday-park-ruins",
      "holliday-park-nature-center",
    ],
  },
  expectedIds = {
    "garfield-park-conservatory": "9392a85e-e918-44bc-a430-62be03315249",
    "sunken-garden": "0db69cbf-2877-448a-8318-7bc9e5be2645",
    "garfield-park-arts-center": "0e48a97e-759a-4cea-99a8-013d51f300ca",
    "holliday-park-ruins": "2fa4a148-b725-4b43-b890-4742887343a9",
    "holliday-park-nature-center": "2e91c8d3-2494-41ca-9e07-a7eeeb18cbf3",
  },
  retired = {
    "garfield-park": [
      "garfield-park-pagoda",
      "garfield-park-aquatic-center",
      "macallister-amphitheater",
      "burrello-family-center",
      "pleasant-run-trail",
    ],
    "holliday-park": [
      "holliday-park-playground",
      "holliday-park-trails",
      "white-river-overlook",
      "holliday-park-arboretum",
      "holliday-park-prairie",
      "holliday-park-rock-garden",
    ],
  },
  fail = [];

const need = (ok, message) => {
    if (!ok) fail.push(message);
  },
  isCommonsFilePage = (url) =>
    typeof url === "string" &&
    decodeURIComponent(url).includes("commons.wikimedia.org/wiki/File:"),
  currentBatch = campaign.places.filter((place) => place.currentBatch),
  htmlIncludes = (file, values, label) => {
    need(fs.existsSync(file), `${label}: page missing`);
    if (!fs.existsSync(file)) return;
    const html = fs.readFileSync(file, "utf8").toLowerCase();
    for (const value of values)
      need(
        value && html.includes(String(value).toLowerCase()),
        `${label}: raw HTML missing ${value}`,
      );
  };

need(currentBatch.length === 2, "Expected exactly two current-batch guides");
for (const scope of currentBatch) {
  const place = places.find((item) => item.id === scope.id),
    parkSlug = scope.id.replace("launch-in-indianapolis-", ""),
    directory = path.join(root, "us/in/indianapolis/parks", parkSlug),
    expectedFeatures = expected[scope.id];
  need(place, `${scope.name}: missing record`);
  if (!place) continue;
  need(place.verifiedAt === campaign.checkedAt, `${scope.name}: stale checked date`);
  need(place.source?.startsWith("https://"), `${scope.name}: source missing`);
  need(place.sourceLabel, `${scope.name}: source label missing`);
  const images = [place.image, ...(place.images || [])];
  need(images.length >= (scope.minImages || 4), `${scope.name}: gallery incomplete`);
  for (const image of images) {
    need(isCommonsFilePage(image?.source), `${scope.name}: image source is not a Commons file page`);
    need(image?.author && image?.license && image?.alt, `${scope.name}: image rights metadata incomplete`);
    need(image?.url && fs.existsSync(path.join(root, image.url.replace(/^\//, ""))), `${scope.name}: image file missing`);
  }
  need(place.searchAnswers?.length >= 11, `${scope.name}: parent answers incomplete`);
  for (const answer of place.searchAnswers || []) {
    need(answer.source?.startsWith("https://"), `${scope.name}/${answer.intentKey}: answer source missing`);
    need(answer.sourceLabel, `${scope.name}/${answer.intentKey}: answer source label missing`);
    need(answer.verifiedAt === campaign.checkedAt, `${scope.name}/${answer.intentKey}: answer checked date stale`);
    need(["fast", "slow"].includes(answer.freshnessClass), `${scope.name}/${answer.intentKey}: freshness missing`);
  }
  const actualFeatures = (place.features || []).map((feature) => feature.slug);
  need(JSON.stringify(actualFeatures) === JSON.stringify(expectedFeatures), `${scope.name}: destination set differs from reviewed scope`);
  need(place.researchQueue?.length >= 3, `${scope.name}: review queue incomplete`);
  htmlIncludes(
    path.join(directory, "index.html"),
    [place.name, place.address, 'rel="canonical"', "breadcrumbs", "what people ask"],
    scope.name,
  );
  for (const feature of place.features || []) {
    need(feature.id === expectedIds[feature.slug], `${scope.name}/${feature.name}: stable ID changed`);
    need(Number.isFinite(feature.latitude) && Number.isFinite(feature.longitude), `${scope.name}/${feature.name}: coordinates missing`);
    need(!/approximate/i.test(feature.details?.positionQuality || ""), `${scope.name}/${feature.name}: approximate coordinate retained`);
    need(feature.details?.coordinateSource?.startsWith("https://"), `${scope.name}/${feature.name}: coordinate source missing`);
    need(feature.details?.images?.length === 1, `${scope.name}/${feature.name}: destination image missing`);
    need(isCommonsFilePage(feature.details?.imageSourceUrl), `${scope.name}/${feature.name}: image source missing`);
    need(feature.details?.searchAnswers?.length === 9, `${scope.name}/${feature.name}: expected nine destination answers`);
    for (const answer of feature.details?.searchAnswers || []) {
      need(answer.source?.startsWith("https://"), `${scope.name}/${feature.name}/${answer.intentKey}: source missing`);
      need(answer.sourceLabel, `${scope.name}/${feature.name}/${answer.intentKey}: source label missing`);
      need(answer.verifiedAt === campaign.checkedAt, `${scope.name}/${feature.name}/${answer.intentKey}: checked date stale`);
    }
    htmlIncludes(
      path.join(directory, feature.slug, "index.html"),
      [feature.name, place.name, feature.details.address, String(feature.latitude), String(feature.longitude), 'rel="canonical"', "breadcrumbs", "parking", "restroom", "dogs", "sources"],
      `${scope.name}/${feature.name}`,
    );
  }
  for (const retiredSlug of retired[parkSlug]) {
    const source = `/us/in/indianapolis/parks/${parkSlug}/${retiredSlug}`,
      destination = `/us/in/indianapolis/parks/${parkSlug}`;
    need(
      redirects.some((redirect) => redirect.source === source && redirect.destination === destination && redirect.permanent === true),
      `${source}: permanent parent redirect missing`,
    );
  }
}

if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log(
  "Verified 2 Indianapolis guides, 5 evidence-cleared destinations, 8 reusable photos and 11 retired-route redirects.",
);
