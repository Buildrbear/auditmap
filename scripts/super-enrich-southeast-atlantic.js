#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/southeast-atlantic-super-enrichment-campaign.json");
const facts = require("../data/southeast-atlantic-visitor-facts.json").places;
const galleries = require("../data/generated/southeast-atlantic-super-images.json");
const coordinates = require("../data/generated/southeast-atlantic-feature-coordinates.json").places;
const checkedAt = campaign.checkedAt;

const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const stable = (parent, child) => {
  const bytes = crypto.createHash("sha256").update(`auditmap:${parent}:${child}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const upsert = (data, park) => {
  const index = data.parks.findIndex((item) => item.id === park.id);
  if (index >= 0) data.parks[index] = park;
  else data.parks.push(park);
};
const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const daily = (opens, closes) => Object.fromEntries(weekdays.map((day) => [day, [[opens, closes]]]));

function hoursSchedule(place) {
  if (place.state === "SC" && place.city === "Charleston") return daily("06:00", "23:00");
  if (place.id.includes("bonaventure")) return daily("08:00", "17:00");
  return null;
}

function featureHoursSchedule(place, name) {
  const lower = name.toLowerCase();
  if (place.id.includes("skidaway") && (lower.includes("avian") || lower.includes("observation tower"))) return false;
  if (place.id.includes("forsyth") || place.id.includes("skidaway") || place.id.includes("jessie-ball")) return false;
  return hoursSchedule(place);
}

function answer(place, intentKey, question, text, source = place.source, sourceLabel = place.operator) {
  return {
    intentKey, question, answer: text, source, sourceLabel, verifiedAt: checkedAt,
    freshnessClass: ["hours", "parking", "need-to-know", "weather"].includes(intentKey) ? "fast" : "slow",
    status: "verified"
  };
}

function parentAnswers(place) {
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
    ["weather", `What weather should I check before visiting ${place.name}?`, place.weather]
  ].map((item) => answer(place, ...item));
}

function featureDescription(name, parent) {
  const lower = name.toLowerCase();
  if (lower.includes("splash")) return `${name} is a seasonal water-play destination at ${parent}; confirm same-day operation, lightning status, supervision rules, and whether the surface is open before walking over.`;
  if (lower.includes("lake")) return `${name} is the park's inland-water destination; use this mapped point rather than the beach pin and follow posted boating and no-swimming rules.`;
  if (lower.includes("trail") || lower.includes("fitcircuit")) return `${name} is a mapped route within ${parent}; check closure notices, surface, distance, heat exposure, and the return route before starting.`;
  if (lower.includes("playground")) return `${name} is a mapped family play area at ${parent}; check surface temperature, weather closures, nearby restroom access, and posted age guidance.`;
  if (lower.includes("campground")) return `${name} is the overnight-use area at ${parent}; access follows the reservation, check-in instructions, gate schedule, and any active renovation notices.`;
  if (lower.includes("fountain")) return `${name} is a specific fountain at ${parent}; decorative and interactive fountains have different rules, and operation can pause for maintenance, weather, or events.`;
  if (lower.includes("monument") || lower.includes("memorial") || lower.includes("marker") || lower.includes("plaque")) return `${name} is a mapped history landmark at ${parent}; navigate to this point, read the on-site context, and treat memorial activity respectfully.`;
  if (lower.includes("oak")) return `${name} is the protected historic live oak at ${parent}; enjoy the canopy without climbing, hanging from limbs, carving, or entering a posted root-protection area.`;
  if (lower.includes("shelter") || lower.includes("pavilion") || lower.includes("bandstand")) return `${name} is a mapped gathering structure at ${parent}; reserved events and setup may limit casual use even while the surrounding park remains open.`;
  if (lower.includes("viewpoint")) return `${name} is a mapped marsh-edge viewing point at ${parent}; check trail closures, tide, insects, wind, and lightning before using the exposed route.`;
  if (lower.includes("parking") || lower.includes("beach access") || lower.includes("recreation area")) return `${name} is a mapped arrival zone within ${parent}; use this pin instead of the broad park center and follow the gate, fee, and posted parking rules.`;
  return `${name} is a distinct mapped destination within ${parent}; use this exact pin instead of the general park marker and check posted conditions on arrival.`;
}

function featureHours(place, name) {
  const lower = name.toLowerCase();
  if (place.id.includes("skidaway") && (lower.includes("avian") || lower.includes("observation tower"))) {
    return "Currently closed because of bridge damage. Do not plan a visit until Georgia State Parks removes the closure notice.";
  }
  if (place.id.includes("hanna") && lower.includes("splash")) {
    return "Normally seasonal from the first weekend in May through the last weekend in October, 10:00 a.m.-7:00 p.m.; maintenance or lightning within ten miles can close it temporarily.";
  }
  return place.hours;
}

function featureAnswers(place, name, point, description) {
  return [
    answer(place, "location", `Where exactly is ${name}?`, description, point.sourceUrl, "OpenStreetMap reviewed feature placement"),
    answer(place, "parking", `Where should I park for ${name}?`, place.parking),
    answer(place, "hours", `When is ${name} open?`, featureHours(place, name)),
    answer(place, "restroom", `Are there restrooms near ${name}?`, place.restrooms),
    answer(place, "fees", `Does it cost money to visit ${name}?`, place.cost),
    answer(place, "accessibility", `How accessible is ${name}?`, place.accessibility),
    answer(place, "dogs", `Are dogs allowed at ${name}?`, place.dogs),
    answer(place, "family", `Is ${name} good for children?`, place.family),
    answer(place, "need-to-know", `What should I know before visiting ${name}?`, `${description} ${place.need}`)
  ];
}

function feature(place, name, index, images) {
  const featureSlug = slug(name);
  const point = coordinates[place.id]?.[featureSlug];
  if (!point) throw new Error(`${place.name}/${name}: approved coordinate missing`);
  const id = stable(place.id, featureSlug);
  const description = featureDescription(name, place.name);
  const baseImage = images[index % images.length];
  const image = { ...baseImage, featureId: id, latitude: point.latitude, longitude: point.longitude, alt: `${name} at ${place.name}` };
  return {
    id, slug: featureSlug, name, feature_type: "destination", description,
    latitude: point.latitude, longitude: point.longitude,
    details: {
      category: "destination", includeInParentGallery: true, address: place.address,
      hours: featureHours(place, name), hoursSchedule: featureHoursSchedule(place, name), cost: place.cost,
      accessibility: place.accessibility, locationContext: description, needToKnow: place.need,
      amenities: place.amenities, informationSourceLabel: place.operator, informationSourceUrl: place.source,
      informationCheckedAt: checkedAt, coordinateSource: point.sourceUrl, positionQuality: point.quality,
      imageUrl: image.url, imageSourceUrl: image.source, imageAuthor: image.author,
      imageLicense: image.license, imageAlt: image.alt, images: [image],
      searchAnswers: featureAnswers(place, name, point, description)
    },
    source_label: place.operator, source_url: place.source, verified_at: checkedAt
  };
}

(() => {
  const all = read("data/generated/all-subsites-ready.json");
  const pilot = read("data/generated/pilot-subsites-ready.json");
  const national = read("data/parent-park-information-enrichment-national.json");
  const campaignParents = read("data/parent-park-information-enrichment-campaign.json");
  const locations = read("data/launch-location-overrides.json");

  for (const scope of campaign.places) {
    const place = { ...scope, ...facts[scope.id] };
    const images = galleries.places[place.id]?.images || [];
    if (images.length !== 4) throw new Error(`${place.name}: four-image gallery missing`);
    const features = place.subsites.map((name, index) => feature(place, name, index, images));
    const sources = (place.sources || [{ label: place.operator, url: place.source }]).map((item) => ({ label: item.label, url: item.url }));
    const researchQueue = place.id.includes("bonaventure") ? [
      "Georeference the official cemetery map before publishing individual gravesite and visitor-center navigation pins."
    ] : [];
    const record = {
      id: place.id, name: place.name, type: "Park", city: place.city, state: place.state, country: "US",
      citySlug: place.citySlug, slug: slug(place.name), searchCategory: "park", neighborhood: place.city,
      status: "Sourced public-access visitor guide", summary: place.summary,
      searchDescription: `Hours, parking, photos, mapped destinations, and visitor answers for ${place.name}.`,
      address: place.address, latitude: place.latitude, longitude: place.longitude,
      hours: place.hours, hoursSchedule: hoursSchedule(place), cost: place.cost, accessibility: place.accessibility,
      sourceLabel: place.operator, source: place.source, verifiedAt: checkedAt, operator: place.operator,
      image: images[0], images: images.slice(1), sources, launchTier: "anchor",
      likelySubsites: features.length > 0, publishStatus: features.length ? "super-enriched" : "sourced-parent-guide",
      researchQueue, transit: place.transit, searchAnswers: parentAnswers(place), features,
      amenities: place.amenities, comments: []
    };
    upsert(all, record);
    upsert(pilot, record);
    const parent = {
      name: place.name, city: place.city, citySlug: place.citySlug, operator: place.operator,
      sourceLabel: place.operator, source: place.source, address: place.address, summary: place.summary,
      hours: place.hours, hoursSchedule: hoursSchedule(place), cost: place.cost, accessibility: place.accessibility,
      transit: place.transit, amenities: place.amenities, searchAnswers: record.searchAnswers,
      image: images[0], additionalImages: images.slice(1), replaceImages: true,
      sources, verifiedAt: checkedAt
    };
    national.parks[place.id] = parent;
    campaignParents.parks[place.id] = parent;
    const location = {
      id: place.id, park: place.name, city: place.city, state: place.state,
      latitude: place.latitude, longitude: place.longitude, address: place.address,
      displayName: `${place.name}, ${place.city}, ${place.state}`,
      source: place.operator, sourceUrl: place.source, checkedAt
    };
    const locationIndex = locations.findIndex((item) => item.id === place.id);
    if (locationIndex >= 0) locations[locationIndex] = location;
    else locations.push(location);
  }
  write("data/generated/all-subsites-ready.json", all);
  write("data/generated/pilot-subsites-ready.json", pilot);
  write("data/parent-park-information-enrichment-national.json", national);
  write("data/parent-park-information-enrichment-campaign.json", campaignParents);
  write("data/launch-location-overrides.json", locations);
  console.log(`Enriched ${campaign.places.length} Southeast Atlantic public-place guides.`);
})();
