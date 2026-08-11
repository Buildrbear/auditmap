#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  root = path.resolve(__dirname, ".."),
  campaign = require("../data/tampa-bay-evidence-gate-campaign.json"),
  facts = require("../data/tampa-bay-visitor-facts.json").places,
  galleries = require("../data/generated/tampa-bay-evidence-gate-images.json"),
  checkedAt = campaign.checkedAt;
const vercelPath = path.join(root, "vercel.json");
const originalVercelText = fs.readFileSync(vercelPath, "utf8");
const originalVercel = JSON.parse(originalVercelText);
const slug = (v) =>
    String(v)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
  days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ],
  daily = (a, b) => Object.fromEntries(days.map((d) => [d, [[a, b]]])),
  stable = (p, s) => {
    const b = crypto
      .createHash("sha256")
      .update(`auditmap:${p}:${s}`)
      .digest()
      .subarray(0, 16);
    b[6] = (b[6] & 15) | 64;
    b[8] = (b[8] & 63) | 128;
    const h = b.toString("hex");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  },
  read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8")),
  write = (f, v) =>
    fs.writeFileSync(path.join(root, f), `${JSON.stringify(v, null, 2)}\n`),
  upsert = (d, p) => {
    const i = d.parks.findIndex((x) => x.id === p.id);
    i >= 0 ? (d.parks[i] = p) : d.parks.push(p);
  };
function schedule(p) {
  if (p.id.endsWith("curtis-hixon-waterfront-park"))
    return daily("07:00", "22:00");
  if (p.id.endsWith("ballast-point-park"))
    return daily("06:00", "20:00");
  return false;
}
function ans(p, k, q, a) {
  return {
    intentKey: k,
    question: q,
    answer: a,
    sourceLabel: p.operator,
    source: p.source,
    verifiedAt: checkedAt,
    freshnessClass: ["hours", "parking", "need-to-know", "weather"].includes(k)
      ? "fast"
      : "slow",
    status: "verified",
  };
}
function answers(p) {
  return [
    ["hours", `When is ${p.name} open?`, p.hours],
    ["parking", `Where should I park for ${p.name}?`, p.parking],
    ["entrance", `What is the best entrance for ${p.name}?`, p.arrival],
    ["restroom", `Are there restrooms at ${p.name}?`, p.restrooms],
    ["fees", `Is ${p.name} free?`, p.cost],
    ["accessibility", `How accessible is ${p.name}?`, p.accessibility],
    ["dogs", `Are dogs allowed at ${p.name}?`, p.dogs],
    ["family", `Is ${p.name} good for children?`, p.family],
    ["transit", `How do I reach ${p.name} without a car?`, p.transit],
    ["need-to-know", `What should I know before visiting ${p.name}?`, p.need],
    [
      "weather",
      `What weather should I check before visiting ${p.name}?`,
      `Check current Tampa Bay weather and operator alerts. Heat, lightning, tropical weather, heavy rain, wind, tides, rip currents and water-quality notices can close trails, beaches, splash pads, boat access or facilities independently.`,
    ],
  ].map((v) => ans(p, ...v));
}
const featureDefinitions = {
  "launch-fl-st-petersburg-st-pete-pier": [{
    name: "Tampa Bay Watch Discovery Center", imageIndex: 3, latitude: 27.7736117, longitude: -82.6248673,
    source: "https://stpetepier.org/explore/", sourceLabel: "St. Pete Pier",
    coordinateSource: "https://www.openstreetmap.org/way/887065366",
    summary: "The staffed marine-education center and wet classroom on the Pier's bay-facing walkway.",
    hours: "Open daily 10:00 a.m.-5:00 p.m.; programs and admission operate separately from general Pier access.",
    cost: "Current admission is $8 adults, $6 seniors, $3 children ages 4-12, and free for children 3 and under with an adult; listed discounts apply.",
    need: "Confirm same-day hours and program availability. The exposed walk from the entrance is long; the accessible tram can reduce the distance."
  }],
  "launch-fl-tierra-verde-fort-de-soto-park": [
    {name:"Historic Fort De Soto",imageIndex:3,latitude:27.615814,longitude:-82.735948,source:"https://pinellas.gov/parks/fort-de-soto-park/",sourceLabel:"Pinellas County Parks",coordinateSource:"https://commons.wikimedia.org/wiki/File:2018_Fort_De_Soto_-_12-inch_steel_coastal_defense_mortars.jpg",summary:"Battery Laidley and the surviving 12-inch coastal-defense mortars in the park's historic fort area.",hours:"The park is open daily 7:00 a.m. to sunset; the fort area can close independently for storm repairs or maintenance.",cost:"Historic-fort access is included after the $6 vehicle parking fee.",need:"Pets are not allowed in the historic fort. Portions of the nearby seawall remain closed for storm damage, so follow barriers and current County notices."},
    {name:"Fort De Soto Gulf Pier",imageIndex:2,latitude:27.613573,longitude:-82.739014,source:"https://pinellas.gov/parks/fort-de-soto-park/",sourceLabel:"Pinellas County Parks",coordinateSource:"https://commons.wikimedia.org/wiki/File:2018_Fort_De_Soto_-_Gulf_Pier_2.jpg",summary:"The Gulf-facing fishing pier and concession area west of the historic fort.",hours:"The County lists Gulf Pier hours as 7:00 a.m. to sunset; cleaning, storms, repairs, and wildlife conditions can close it independently.",cost:"Pier access is included after the $6 vehicle parking fee; fishing licenses, food, bait, and rentals cost separately.",need:"The photograph predates the 2024 hurricane repairs. Verify the live County notice before making the pier the purpose of the trip and keep clear of fishing gear."
    }
  ]
};
function feature(p, definition, images) {
  const name = definition.name,
    s = slug(name),
    id = stable(p.id, s),
    description = definition.summary,
    hours = definition.hours;
  const base = images[definition.imageIndex],
    image = {
      ...base,
      featureId: id,
      latitude: definition.latitude,
      longitude: definition.longitude,
      alt: `${name} at ${p.name}`,
    },
    qs = [
      ["location", `Where exactly is ${name}?`, description],
      ["parking", `Where should I park for ${name}?`, `${p.parking} Navigate to the exact destination pin rather than the general park marker.`],
      [
        "hours",
        `When is ${name} open?`,
        hours,
      ],
      ["restroom", `Are there restrooms near ${name}?`, p.restrooms],
      ["fees", `Is ${name} free?`, definition.cost],
      ["accessibility", `How accessible is ${name}?`, p.accessibility],
      ["dogs", `Are dogs allowed at ${name}?`, p.dogs],
      ["family", `Is ${name} good for children?`, p.family],
      [
        "need-to-know",
        `What should I know before visiting ${name}?`,
        definition.need,
      ],
    ].map((v) => ans(p, ...v));
  return {
    id,
    slug: s,
    name,
    feature_type: "destination",
    description,
    latitude: definition.latitude,
    longitude: definition.longitude,
    details: {
      category: "destination",
      includeInParentGallery: true,
      address: p.address,
      hours,
      hoursSchedule: false,
      cost: definition.cost,
      accessibility: p.accessibility,
      locationContext: description,
      needToKnow: definition.need,
      informationSourceLabel: definition.sourceLabel,
      informationSourceUrl: definition.source,
      informationCheckedAt: checkedAt,
      coordinateSource: definition.coordinateSource,
      positionQuality: "exact-geotag-or-named-open-map-object",
      imageUrl: image.url,
      imageSourceUrl: image.source,
      imageAuthor: image.author,
      imageLicense: image.license,
      imageAlt: image.alt,
      images: [image],
      searchAnswers: qs,
    },
    source_label: definition.sourceLabel,
    source_url: definition.source,
    verified_at: checkedAt,
  };
}
(() => {
  const all = read("data/generated/all-subsites-ready.json"),
    pilot = read("data/generated/pilot-subsites-ready.json"),
    launch = read("data/generated/launch-map-places.json"),
    national = read("data/parent-park-information-enrichment-national.json"),
    campaignParents = read(
      "data/parent-park-information-enrichment-campaign.json",
    ),
    locations = read("data/launch-location-overrides.json"),
    vercel = read("vercel.json");
  if (!Array.isArray(vercel.redirects)) vercel.redirects = [];
  for (const scope of campaign.places) {
    const p = { ...scope, ...facts[scope.id] },
      images = galleries.places[p.id]?.images || [];
    const deferred = Boolean(scope.deferRelease);
    if (deferred ? images.length < 1 || images.length >= 4 : images.length !== 4)
      throw new Error(`${p.name}: evidence-gate gallery mismatch`);
    const definitions = featureDefinitions[p.id] || [];
    const features = deferred ? [] : definitions.map((definition) => feature(p, definition, images));
    const recordSources = [{ label: p.operator, url: p.source }, ...definitions.map((item) => ({ label: item.sourceLabel, url: item.source }))]
      .filter((item, index, list) => list.findIndex((other) => other.url === item.url) === index);
    const record = {
      id: p.id,
      name: p.name,
      type: "Park",
      city: p.city,
      state: p.state,
      country: "US",
      citySlug: p.citySlug,
      slug: slug(p.name),
      searchCategory: "park",
      neighborhood: p.city,
      status: "Sourced public-access visitor guide",
      summary: p.summary,
      searchDescription: `Hours, parking, photos, mapped destinations and visitor answers for ${p.name}.`,
      address: p.address,
      latitude: p.latitude,
      longitude: p.longitude,
      hours: p.hours,
      hoursSchedule: schedule(p),
      cost: p.cost,
      accessibility: p.accessibility,
      sourceLabel: p.operator,
      source: p.source,
      verifiedAt: checkedAt,
      operator: p.operator,
      image: images[0],
      images: images.slice(1),
      sources: recordSources,
      launchTier: "anchor",
      likelySubsites: !deferred && features.length > 0,
      publishStatus: deferred ? "photo-gated-deferred" : "super-enriched",
      researchQueue: deferred ? [scope.reviewNote] : [],
      transit: p.transit,
      searchAnswers: answers(p),
      features,
      amenities: [],
      comments: [],
    };
    const parentRoute = `/us/fl/${slug(p.city)}/parks/${slug(p.name)}`;
    const retainedSlugs = new Set(features.map((item) => item.slug));
    for (const retiredSlug of scope.legacyCandidates.map(slug).filter((item) => !retainedSlugs.has(item))) {
      const retiredDirectory = path.join(root, parentRoute.slice(1), retiredSlug);
      if (fs.existsSync(retiredDirectory)) fs.rmSync(retiredDirectory, { recursive: true, force: true });
      const source = `${parentRoute}/${retiredSlug}`;
      if (!vercel.redirects.some((item) => item.source === source))
        vercel.redirects.push({ source, destination: parentRoute, permanent: true });
    }
    upsert(all, record);
    upsert(pilot, record);
    const launchIndex = launch.findIndex((item) => item.id === record.id);
    launchIndex >= 0 ? (launch[launchIndex] = record) : launch.push(record);
    const parent = {
      name: p.name,
      city: p.city,
      citySlug: p.citySlug,
      operator: p.operator,
      sourceLabel: p.operator,
      source: p.source,
      address: p.address,
      summary: p.summary,
      hours: p.hours,
      hoursSchedule: schedule(p),
      cost: p.cost,
      accessibility: p.accessibility,
      transit: p.transit,
      searchAnswers: record.searchAnswers,
      image: images[0],
      additionalImages: images.slice(1),
      replaceImages: true,
      verifiedAt: checkedAt,
    };
    national.parks[p.id] = parent;
    campaignParents.parks[p.id] = parent;
    const loc = {
      id: p.id,
      park: p.name,
      city: p.city,
      state: p.state,
      latitude: p.latitude,
      longitude: p.longitude,
      address: p.address,
      displayName: `${p.name}, ${p.city}, ${p.state}`,
      source: p.operator,
      sourceUrl: p.source,
      checkedAt,
    };
    const li = locations.findIndex((x) => x.id === p.id);
    li >= 0 ? (locations[li] = loc) : locations.push(loc);
  }
  write("data/generated/all-subsites-ready.json", all);
  write("data/generated/pilot-subsites-ready.json", pilot);
  write("data/generated/launch-map-places.json", launch);
  write("data/parent-park-information-enrichment-national.json", national);
  write(
    "data/parent-park-information-enrichment-campaign.json",
    campaignParents,
  );
  write("data/launch-location-overrides.json", locations);
  const originalRedirectSources = new Set((originalVercel.redirects || []).map((item) => item.source));
  const addedRedirects = vercel.redirects.filter((item) => !originalRedirectSources.has(item.source));
  if (addedRedirects.length) {
    const redirectLines = addedRedirects.map((item) =>
      `    { "source": ${JSON.stringify(item.source)}, "destination": ${JSON.stringify(item.destination)}, "permanent": true },`,
    ).join("\n");
    fs.writeFileSync(vercelPath, originalVercelText.replace('  "redirects": [\n', `  "redirects": [\n${redirectLines}\n`));
  }
  const deferredCount = campaign.places.filter((place) => place.deferRelease).length;
  console.log(`Rebuilt ${campaign.places.length - deferredCount} Tampa Bay guides and retained ${deferredCount} photo-gated parents.`);
})();
