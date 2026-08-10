#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  root = path.resolve(__dirname, ".."),
  campaign = require("../data/baltimore-super-enrichment-campaign.json"),
  places = require("../data/generated/all-subsites-ready.json").parks,
  expectedFeatureCounts = {
    "launch-md-baltimore-druid-hill-park": 5,
    "launch-md-baltimore-patterson-park": 5,
    "launch-md-baltimore-federal-hill-park": 1,
    "launch-md-baltimore-fort-mchenry-national-monument-and-historic-shrine": 4,
    "launch-md-baltimore-cylburn-arboretum": 1,
    "launch-md-baltimore-gwynns-falls-leakin-park": 5,
  },
  fail = [],
  slug = (v) =>
    String(v)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
const need = (ok, msg) => {
  if (!ok) fail.push(msg);
};
for (const scope of campaign.places) {
  const p = places.find((x) => x.id === scope.id),
    dir = path.join(
      root,
      "us",
      scope.state.toLowerCase(),
      slug(scope.city),
      "parks",
      slug(scope.name),
    );
  need(p, `${scope.name}: missing record`);
  if (!p) continue;
  need(p.image?.url, `${scope.name}: hero missing`);
  need(
    1 + (p.images?.length || 0) >= 4,
    `${scope.name}: fewer than four photos`,
  );
  const expectedFeatures = expectedFeatureCounts[scope.id] || 8;
  need(
    p.features?.length === expectedFeatures,
    `${scope.name}: expected ${expectedFeatures} evidence-complete subsites`,
  );
  need(p.searchAnswers?.length >= 11, `${scope.name}: parent answers missing`);
  const parentFile = path.join(dir, "index.html");
  need(fs.existsSync(parentFile), `${scope.name}: parent page missing`);
  if (fs.existsSync(parentFile)) {
    const html = fs.readFileSync(parentFile, "utf8");
    for (const value of [p.name, p.address, 'rel="canonical"', "What people ask"])
      need(value && html.includes(value), `${scope.name}: raw HTML missing ${value}`);
  }
  for (const f of p.features || []) {
    need(
      Number.isFinite(f.latitude) && Number.isFinite(f.longitude),
      `${scope.name}/${f.name}: coordinates missing`,
    );
    need(
      f.details?.images?.length >= 1,
      `${scope.name}/${f.name}: image missing`,
    );
    need(
      f.details?.searchAnswers?.length >= 9,
      `${scope.name}/${f.name}: answers missing`,
    );
    need(f.details?.coordinateSource && f.details?.positionQuality, `${scope.name}/${f.name}: coordinate provenance missing`);
    const dy = (f.latitude - p.latitude) * 111;
    const dx = (f.longitude - p.longitude) * 87;
    need(Math.hypot(dx, dy) < 8, `${scope.name}/${f.name}: implausibly distant coordinate`);
    const featureFile = path.join(dir, f.slug, "index.html");
    need(fs.existsSync(featureFile), `${scope.name}/${f.name}: page missing`);
    if (fs.existsSync(featureFile)) {
      const html = fs.readFileSync(featureFile, "utf8").toLowerCase();
      for (const value of [f.name, p.name, "parking", "restroom", "dogs", "sources", 'rel="canonical"'])
        need(html.includes(value.toLowerCase()), `${scope.name}/${f.name}: raw HTML missing ${value}`);
      need(
        html.includes(encodeURIComponent(`${f.latitude},${f.longitude}`).toLowerCase()),
        `${scope.name}/${f.name}: exact-coordinate navigation missing`,
      );
    }
  }
}
const joined = campaign.places
  .map((s) => JSON.stringify(places.find((p) => p.id === s.id) || {}))
  .join("\n");
for (const phrase of [
  "modified continuous loop in May 2025",
  "AFRAM June 19-21, 2026",
  "proposed greenway toward Lake Montebello is still a design project",
  "closed for maintenance indefinitely",
  "near Linwood Avenue and East Pratt Street",
  "south of the tennis courts on Linwood Avenue",
  "148 South Linwood Avenue",
  "no general visitor parking inside the park",
  "There is no dependable public restroom in the park",
  "historic zone and Star Fort is $15",
  "last park entry is 4:45 p.m. weekdays",
  "There is no food service onsite",
  "Download a map",
  "expected to open by the end of summer 2026",
  "Paw Point is a fenced membership-only",
])
  need(joined.includes(phrase), `Missing Baltimore guidance: ${phrase}`);
const featureRequirements = {
  "launch-md-baltimore-druid-hill-park": {
    "Druid Lake": "Druid_Hill_Park_Lake",
    "Howard Peters Rawlings Conservatory": "Baltimore_Conservatory_Druid_Hill_Park",
    "Maryland Zoo in Baltimore": "Penguin_Coast",
    "Chinese Pavilion": "Chinese_Pavilion",
    "Mansion House Lawn": "Mansion_House_Lawn",
  },
  "launch-md-baltimore-patterson-park": {
    "Patterson Park Observatory": "Patterson_Park_Observatory",
    "Boat Lake": "Patterson_Park_October_Aerial",
    "Marble Fountain": "Fountain%2C_Patterson_Park",
    "War of 1812 Memorial Cannons": "War_of_1812_Memorial_Cannons",
    "Virginia S. Baker Recreation Center": "Virginia_S._Baker_Recreation_Center",
  },
  "launch-md-baltimore-federal-hill-park": {
    "Federal Hill Harbor Overlook": "Baltimore's_Inner_Harbor",
  },
  "launch-md-baltimore-fort-mchenry-national-monument-and-historic-shrine": {
    "Fort McHenry Visitor Center": "nps.gov/fomc/planyourvisit/visitorcenters",
    "Star Fort": "Fort_McHenry_Interior",
    "Fort McHenry Seawall Trail": "nps.gov/places/sea-wall-trail",
    "Orpheus Statue": "FortMcHenryOrpheus1",
  },
  "launch-md-baltimore-cylburn-arboretum": {
    "Cylburn Mansion": "Clear_Skies_and_Mansion",
  },
  "launch-md-baltimore-gwynns-falls-leakin-park": {
    "Carrie Murray Nature Center": "Carrie_Murray_Nature_Center",
    "Orianda Mansion": "Orianda-Mansion",
    "Gwynns Falls Trail": "People_walking_the_Gwynns_Falls_Trail",
    "Magnolia Grove": "Magnolia_Grove",
    "I-70 Park and Ride Trailhead": "I-70_Park_%26_Ride",
  },
};
for (const [placeId, requirements] of Object.entries(featureRequirements)) {
  const place = places.find((candidate) => candidate.id === placeId);
  for (const [name, sourceFragment] of Object.entries(requirements)) {
    const feature = place?.features?.find((candidate) => candidate.name === name);
    need(feature, `${placeId}: missing evidence-complete ${name}`);
    if (!feature) continue;
    need(
      feature.details?.imageSourceUrl?.includes(sourceFragment),
      `${placeId}/${name}: destination image is not specific`,
    );
    need(
      !/Approximate position/i.test(feature.details?.positionQuality || ""),
      `${placeId}/${name}: approximate position still published`,
    );
  }
}
for (const name of [
  "Druid Hill Park Pool",
  "Disc Golf Course",
  "Jones Falls Trail Connection",
  "Patterson Park Playground",
  "Patterson Park Dog Park",
  "Patterson Park Pool",
  "Patterson Park Ice Rink",
  "Patterson Park Athletic Fields",
  "Federal Hill Park Playground",
  "Federalist Ship Play Structure",
  "Signal Hill Tower Play Structure",
  "Flag Staff Plaza",
  "Colonel George Armistead Monument",
  "General Samuel Smith Monument",
  "Federal Hill Basketball Court",
  "Flag Change Program",
  "Fort McHenry Wetland",
  "Water Battery",
  "Fort McHenry Picnic Area",
  "Vollmer Center",
  "Nature Education Center",
  "Japanese Maple Collection",
  "Dahlia Garden",
  "Cylburn Woodland Trails",
  "Cylburn Arboretum Greenhouses",
  "Cylburn Children's Garden",
  "Winans Meadow",
  "Crimea Estate",
  "Thomas Jefferson Grove of Trees",
  "Dead Run Trailhead",
  "Leakin Park Eagle Drive Entrance",
])
  need(
    !campaign.places
      .flatMap((scope) => places.find((place) => place.id === scope.id)?.features || [])
      .some((feature) => feature.name === name),
    `${name}: unsupported standalone page still published`,
  );
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
need(app.includes("daylightMatch"), "Opening-to-dark hours support missing");
need(app.includes('label: "Hours vary"'), "Independent-hours support missing");
if (fail.length) {
  console.error(fail.join("\n"));
  process.exit(1);
}
console.log(
  `Verified ${campaign.places.length} Baltimore guides with four or more photos, evidence-complete mapped destinations and practical visitor answers.`,
);
