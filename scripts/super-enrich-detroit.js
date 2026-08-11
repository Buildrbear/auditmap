#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const campaign = require("../data/detroit-super-enrichment-campaign.json");
const factsDocument = require("../data/detroit-visitor-facts.json");
const facts = factsDocument.places;
const featureFactsDocument = require("../data/detroit-feature-visitor-facts.json");
const featureFacts = featureFactsDocument.places;
const galleries = require("../data/generated/detroit-super-images.json");
const coordinates = require("../data/generated/detroit-feature-coordinates.json").places;

const slug = value => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const daily = (start, end) => Object.fromEntries(days.map(day => [day, [[start, end]]]));
const stable = (parentId, featureSlug) => {
  const bytes = crypto.createHash("sha256").update(`auditmap:${parentId}:${featureSlug}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const upsert = (document, place) => {
  const index = document.parks.findIndex(item => item.id === place.id);
  if (index >= 0) document.parks[index] = place;
  else document.parks.push(place);
};

function schedule(place) {
  if (place.id.endsWith("campus-martius-park") || place.id.endsWith("belle-isle-park") || place.id.endsWith("hart-plaza")) return false;
  return daily("06:00", "22:00");
}

function answer(place, intentKey, question, value, metadata = {}) {
  return {
    intentKey,
    question,
    answer: value,
    sourceLabel: metadata.sourceLabel || place.operator,
    source: metadata.source || place.source,
    verifiedAt: metadata.verifiedAt || place.checkedAt || factsDocument.checkedAt,
    freshnessClass: ["hours", "parking", "need-to-know", "weather"].includes(intentKey) ? "fast" : "slow",
    status: "verified"
  };
}

function parentAnswers(place) {
  const sourceFor = intentKey => place.answerSources?.[intentKey] ? { source: place.answerSources[intentKey] } : {};
  return [
    ["hours", `When is ${place.name} open?`, place.hours],
    ["parking", `Where should I park for ${place.name}?`, place.parking],
    ["entrance", `What is the best entrance for ${place.name}?`, place.arrival],
    ["restroom", `Are there restrooms at ${place.name}?`, place.restrooms],
    ["fees", `Is ${place.name} free?`, place.cost],
    ["accessibility", `How accessible is ${place.name}?`, place.accessibility],
    ["dogs", `Are dogs allowed at ${place.name}?`, place.dogs],
    ["family", `Is ${place.name} good for children?`, place.family],
    ["transit", `How do I reach ${place.name} without a car?`, place.transit],
    ["need-to-know", `What should I know before visiting ${place.name}?`, place.need],
    ["weather", `What weather should I check before visiting ${place.name}?`, "Check Detroit weather, air quality, river conditions and operator alerts. Heat, snow, ice, storms, high water and seasonal operations can close paths or facilities independently."]
  ].map(values => answer(place, ...values, sourceFor(values[0])));
}

function genericNote(name, parent) {
  const lower = name.toLowerCase();
  if (lower.includes("playground")) return `${name} is the mapped children's play destination at ${parent}; confirm surface, shade, restroom and seasonal conditions before settling in.`;
  if (lower.includes("pool") || lower.includes("spray") || lower.includes("water steps")) return `${name} is a seasonal or weather-dependent water destination at ${parent}; verify same-day operation and supervision rules.`;
  if (lower.includes("trail") || lower.includes("greenway") || lower.includes("loop")) return `${name} is a named route within ${parent}; confirm the trailhead, grade, surface and weather conditions rather than navigating to the parent pin.`;
  if (lower.includes("garden")) return `${name} is a distinct garden area within ${parent}, with its own entrance, paths and seasonal character.`;
  if (lower.includes("museum") || lower.includes("conservatory") || lower.includes("zoo") || lower.includes("observatory") || lower.includes("science center")) return `${name} is a separately operated attraction associated with ${parent}; admission, tickets, parking and building hours differ from park grounds.`;
  if (lower.includes("overlook") || lower.includes("hill")) return `${name} is a specific viewpoint within ${parent}; use this mapped point for the shortest practical approach.`;
  if (lower.includes("dog") || lower.includes("off-leash")) return `${name} is the designated dog-use area at ${parent}; obey posted boundaries, leash transitions and current surface conditions.`;
  return `${name} is a distinct mapped destination within ${parent}; use this point instead of the general park pin and check posted conditions on arrival.`;
}

function feature(place, name, index, images, placeCheckedAt) {
  const featureSlug = slug(name);
  const id = stable(place.id, featureSlug);
  const point = coordinates[place.id]?.[featureSlug];
  const specific = featureFacts[place.id]?.[featureSlug];
  if (!point) throw new Error(`${place.name}/${name}: coordinate missing`);
  if (featureFacts[place.id] && !specific) throw new Error(`${place.name}/${name}: destination-specific facts missing`);
  const description = specific?.description || genericNote(name, place.name);
  const baseImage = images[specific?.imageIndex ?? (index % images.length)];
  const image = { ...baseImage, featureId: id, latitude: point.latitude, longitude: point.longitude, alt: `${name} at ${place.name}` };
  const hasSeparateHours = Boolean(specific) || /(aquarium|conservatory|nature center|museum|fountain|beach|slide|garden|state park|harbor|plaza|play|water|sport house|stage|freight yard|rink|shop|pool|recreation facility|golf|camp|cabin|bandshell|dog park|splash|amphitheater)/i.test(name);
  const featureHours = specific?.hours || (hasSeparateHours ? `${name} keeps its own operating, seasonal, event, construction, maintenance or weather schedule. Check the cited official source before leaving.` : place.hours);
  const sourceFor = intentKey => ({
    sourceLabel: specific?.sourceLabel || place.operator,
    source: specific?.answerSources?.[intentKey] || specific?.source || place.source,
    verifiedAt: specific ? featureFactsDocument.checkedAt : placeCheckedAt
  });
  const answers = [
    ["location", `Where exactly is ${name}?`, specific?.location || description],
    ["parking", `Where should I park for ${name}?`, specific?.parking || place.parking],
    ["hours", `When is ${name} open?`, featureHours],
    ["restroom", `Are there restrooms near ${name}?`, specific?.restrooms || place.restrooms],
    ["fees", `Is ${name} free?`, specific?.fees || place.cost],
    ["accessibility", `How accessible is ${name}?`, specific?.accessibility || place.accessibility],
    ["dogs", `Are dogs allowed at ${name}?`, specific?.dogs || place.dogs],
    ["family", `Is ${name} good for children?`, specific?.family || place.family],
    ["need-to-know", `What should I know before visiting ${name}?`, specific?.need || `${description} ${place.need}`]
  ].map(values => answer(place, ...values, sourceFor(values[0])));
  return {
    id,
    slug: featureSlug,
    name,
    feature_type: "destination",
    description,
    latitude: point.latitude,
    longitude: point.longitude,
    details: {
      category: "destination",
      includeInParentGallery: true,
      address: specific?.address || place.address,
      hours: featureHours,
      hoursSchedule: hasSeparateHours ? false : schedule(place),
      cost: specific?.fees || place.cost,
      accessibility: specific?.accessibility || place.accessibility,
      locationContext: description,
      needToKnow: specific?.need || place.need,
      informationSourceLabel: specific?.sourceLabel || place.operator,
      informationSourceUrl: specific?.source || place.source,
      informationCheckedAt: specific ? featureFactsDocument.checkedAt : placeCheckedAt,
      coordinateSource: point.source,
      positionQuality: point.displayName || `Reviewed placement within ${place.name}`,
      imageUrl: image.url,
      imageSourceUrl: image.source,
      imageAuthor: image.author,
      imageLicense: image.license,
      imageAlt: image.alt,
      images: [image],
      searchAnswers: answers
    },
    source_label: specific?.sourceLabel || place.operator,
    source_url: specific?.source || place.source,
    verified_at: specific ? featureFactsDocument.checkedAt : placeCheckedAt
  };
}

function researchQueue(place) {
  if (place.id.endsWith("belle-isle-park")) return [
    "James Scott Memorial Fountain remains documented on the parent page while its plaza and Fountain Drive are closed through 2026.",
    "Belle Isle Nature Center, beach, Giant Slide and Oudolf Garden remain parent guidance until each has a reviewed destination photograph and exact current visitor profile."
  ];
  if (place.id.endsWith("detroit-riverwalk")) return [
    "Named RiverWalk parks and connections remain parent guidance until destination-specific reusable photographs and exact arrival evidence clear review."
  ];
  if (place.id.endsWith("ralph-c-wilson-jr-centennial-park")) return [
    "Delta Dental Play Garden, Water Wonderland and DTE Foundation Summit remain parent guidance until exact reusable destination photographs clear review."
  ];
  if (place.id.endsWith("dequindre-cut")) return [
    "Freight Yard, Campbell Terrace, murals, play elements, Fit Park and individual ramps remain parent guidance until each has an exact reviewed pin and a destination-specific reusable photograph."
  ];
  if (place.id.endsWith("campus-martius-park")) return [
    "The Beach, lawn, fountain and Shop remain parent guidance until each has current destination-specific evidence and reusable photography.",
    "Cadillac Square and Woodward Esplanade are adjacent public spaces, not Campus Martius subsites; the Soldiers and Sailors Monument requires its own evidence review."
  ];
  if (place.id.endsWith("hart-plaza")) return [
    "Gateway to Freedom remains parent guidance until a destination-specific reusable photograph clears review.",
    "Michigan Labor Legacy Monument is an alias for Transcending, while Spirit of Detroit and Monument to Joe Louis are separate landmarks outside Hart Plaza; approximate amphitheater and terrace routes were retired."
  ];
  return [];
}

(() => {
  const all = read("data/generated/all-subsites-ready.json");
  const pilot = read("data/generated/pilot-subsites-ready.json");
  const launchPlaces = read("data/generated/launch-map-places.json");
  const national = read("data/parent-park-information-enrichment-national.json");
  const campaignParents = read("data/parent-park-information-enrichment-campaign.json");
  const locations = read("data/launch-location-overrides.json");
  for (const scope of campaign.places.filter(place => place.currentBatch)) {
    const place = { ...scope, ...facts[scope.id] };
    const placeCheckedAt = scope.checkedAt || factsDocument.checkedAt || campaign.checkedAt;
    const images = galleries.places[place.id]?.images || [];
    if (images.length < (scope.minImages || 4)) throw new Error(`${place.name}: gallery missing`);
    const searchAnswers = parentAnswers(place);
    const record = {
      id: place.id,
      name: place.name,
      type: "Park",
      city: place.city,
      state: "MI",
      country: "US",
      citySlug: place.citySlug,
      slug: slug(place.name),
      searchCategory: "park",
      neighborhood: place.city,
      status: "Sourced public-access visitor guide",
      summary: place.summary,
      searchDescription: `Hours, parking, photos, mapped destinations and visitor answers for ${place.name}.`,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      hours: place.hours,
      hoursSchedule: schedule(place),
      cost: place.cost,
      accessibility: place.accessibility,
      sourceLabel: place.operator,
      source: place.source,
      verifiedAt: placeCheckedAt,
      operator: place.operator,
      image: images[0],
      images: images.slice(1),
      sources: [{ label: place.operator, url: place.source }],
      launchTier: "anchor",
      likelySubsites: place.subsites.length > 0,
      publishStatus: scope.releaseTier === "launch-guide" ? "launch-guide" : "super-enriched",
      researchQueue: researchQueue(place),
      transit: place.transit,
      searchAnswers,
      features: place.subsites.map((name, index) => feature(place, name, index, images, placeCheckedAt)),
      amenities: [],
      comments: []
    };
    upsert(all, record);
    upsert(pilot, record);
    const launchIndex = launchPlaces.findIndex(item => item.id === record.id);
    if (launchIndex >= 0) launchPlaces[launchIndex] = { ...launchPlaces[launchIndex], ...record };
    else launchPlaces.push(record);
    const parent = {
      name: place.name,
      city: place.city,
      citySlug: place.citySlug,
      operator: place.operator,
      sourceLabel: place.operator,
      source: place.source,
      address: place.address,
      summary: place.summary,
      hours: place.hours,
      hoursSchedule: schedule(place),
      cost: place.cost,
      accessibility: place.accessibility,
      transit: place.transit,
      searchAnswers,
      image: images[0],
      additionalImages: images.slice(1),
      replaceImages: true,
      verifiedAt: placeCheckedAt
    };
    national.parks[place.id] = parent;
    campaignParents.parks[place.id] = parent;
    const location = {
      id: place.id,
      park: place.name,
      city: place.city,
      state: "MI",
      latitude: place.latitude,
      longitude: place.longitude,
      address: place.address,
      displayName: `${place.name}, Detroit, MI`,
      source: place.operator,
      sourceUrl: place.source,
      checkedAt: placeCheckedAt
    };
    const locationIndex = locations.findIndex(item => item.id === place.id);
    if (locationIndex >= 0) locations[locationIndex] = location;
    else locations.push(location);
  }
  write("data/generated/all-subsites-ready.json", all);
  write("data/generated/pilot-subsites-ready.json", pilot);
  write("data/generated/launch-map-places.json", launchPlaces);
  write("data/parent-park-information-enrichment-national.json", national);
  write("data/parent-park-information-enrichment-campaign.json", campaignParents);
  write("data/launch-location-overrides.json", locations);
  console.log(`Super-enriched ${campaign.places.filter(place => place.currentBatch).length} Detroit guides.`);
})();
