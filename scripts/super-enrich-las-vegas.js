#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  root = path.resolve(__dirname, ".."),
  campaign = require("../data/las-vegas-super-enrichment-campaign.json"),
  facts = require("../data/las-vegas-visitor-facts.json").places,
  galleries = require("../data/generated/las-vegas-super-images.json"),
  coordinates =
    require("../data/generated/las-vegas-feature-coordinates.json").places,
  checkedAt = campaign.checkedAt;
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
  if (p.id.endsWith("springs-preserve"))
    return {
      sunday: [["09:00", "16:00"]],
      monday: [["09:00", "16:00"]],
      tuesday: [],
      wednesday: [],
      thursday: [["09:00", "16:00"]],
      friday: [["09:00", "16:00"]],
      saturday: [["09:00", "16:00"]],
    };
  if (p.id.endsWith("sunset-park")) return daily("06:00", "23:00");
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
      `Check current Southern Nevada weather and operator alerts. Extreme heat, UV, flash flooding, lightning, high wind, wildfire smoke and fire restrictions can close trails, roads, water access or outdoor facilities independently.`,
    ],
  ].map((v) => ans(p, ...v));
}
function note(name, parent) {
  const n = name.toLowerCase();
  if (n.includes("splash") || n.includes("fountain"))
    return `${name} is a seasonal, weather-dependent water feature at ${parent}; verify same-day operation and supervision rules.`;
  if (n.includes("beach"))
    return `${name} is a named shoreline destination at ${parent}; check water status, lifeguard coverage, wind and posted beach rules before entering.`;
  if (n.includes("summit") || n.includes("ascent") || n.includes("steps"))
    return `${name} is an exposed climbing destination at ${parent}; carry water, avoid peak heat and leave enough strength and daylight for the descent.`;
  if (n.includes("memorial") || n.includes("remembrance"))
    return `${name} is a place of remembrance within ${parent}; use a quiet voice, follow security direction and allow time for reflection.`;
  if (n.includes("trail") || n.includes("towpath") || n.includes("loop"))
    return `${name} is a named route within ${parent}; use this mapped trailhead and confirm grade, surface, closures and return distance.`;
  if (n.includes("garden") || n.includes("meadow") || n.includes("wetland"))
    return `${name} is a distinct landscaped or habitat area within ${parent}; stay on established routes and respect plantings and wildlife.`;
  if (
    n.includes("center") ||
    n.includes("greenhouse") ||
    n.includes("cafe") ||
    n.includes("kiosk")
  )
    return `${name} is a staffed or separately operated facility associated with ${parent}; building hours may be shorter than the surrounding grounds.`;
  if (
    n.includes("overlook") ||
    n.includes("sign") ||
    n.includes("monument") ||
    n.includes("bridge") ||
    n.includes("falls")
  )
    return `${name} is a specific landmark within ${parent}; use this mapped point for the shortest practical approach and follow edge or crossing warnings.`;
  if (
    n.includes("marina") ||
    n.includes("paddling") ||
    n.includes("pier") ||
    n.includes("boat")
  )
    return `${name} is a water-access destination at ${parent}; check wind, waves, current, traffic and seasonal facility status before visiting.`;
  if (n.includes("play") || n.includes("rink"))
    return `${name} is a family or recreation destination at ${parent}; confirm seasonal operation, surface conditions and nearby restroom access.`;
  return `${name} is a distinct mapped destination within ${parent}; navigate to this point instead of the general park pin and check posted conditions on arrival.`;
}
function featureImageIndex(p, name, i) {
  const n = name.toLowerCase();
  if (p.id.endsWith("red-rock-canyon-national-conservation-area") && (n.includes("calico") || n.includes("sandstone"))) return 0;
  if (p.id.endsWith("springs-preserve") && n.includes("garden")) return 3;
  if (p.id.endsWith("springs-preserve") && n.includes("desert")) return 2;
  if (p.id.endsWith("springs-preserve") && n.includes("trail")) return 1;
  if (p.id.endsWith("clark-county-wetlands-park") && (n.includes("nature") || n.includes("bird"))) return 3;
  if (p.id.endsWith("clark-county-wetlands-park") && n.includes("trail")) return 2;
  if (p.id.endsWith("sunset-park") && n.includes("pond")) return 1;
  if (p.id.endsWith("floyd-lamb-park-at-tule-springs") && n.includes("peacock")) return 1;
  if (p.id.endsWith("floyd-lamb-park-at-tule-springs") && (n.includes("ranch") || n.includes("barn"))) return 0;
  if (p.id.endsWith("tule-springs-fossil-beds-national-monument") && n.includes("arch")) return 1;
  if (p.id.endsWith("lake-mead-national-recreation-area") && n.includes("beach")) return 2;
  if (p.id.endsWith("lake-mead-national-recreation-area") && n.includes("campground")) return 3;
  if (p.id.endsWith("valley-of-fire-state-park") && n.includes("white domes")) return 2;
  return i % 4;
}
function hasSeparateHours(name) {
  return /(visitor center|calico|quarry|overlook|picnic|trail|museum|garden|boomtown|desert living|butterfly|playground|nature|trailhead|bridge|loop|pond|splash|dog park|disc golf|dunes|fitness|court|ranch|barn|fishing|peacock|pump track|horse|big dig|fossil|beach|campground|harbor|railroad|marina|rock|beehive|elephant|mouse|fire wave|white domes)/i.test(
    name,
  );
}
function featureHours(p, name) {
  const n = name.toLowerCase();
  if (n.includes("red rock canyon visitor center"))
    return "Open daily 8:00 a.m.-4:30 p.m.; Thanksgiving and Christmas hours are 8:00 a.m.-noon. Timed entry and the Scenic Drive fee apply October-May during controlled hours.";
  if (p.id.endsWith("red-rock-canyon-national-conservation-area"))
    return `${p.hours} This stop is reached from the one-way Scenic Drive and closes with its gate; seasonal timed entry applies October 1-May 31 from 8:00 a.m.-5:00 p.m.`;
  if (n.includes("butterfly habitat"))
    return "The Butterfly Habitat is seasonal and may close for heat, weather or exhibit transitions even when Springs Preserve is open.";
  if (n.includes("wetlands park nature center"))
    return "Open Tuesday-Sunday from 9:00 a.m.-3:00 p.m.; surrounding trails remain dawn to dusk.";
  if (n.includes("sunrise trailhead"))
    return "Sunrise parking and restrooms are currently closed because of damage. Use another official Wetlands Park trailhead.";
  if (n.includes("sunset park splash"))
    return "The splash pad is seasonal and can close for maintenance, weather or water restrictions; verify same-day operation before relying on it.";
  if (n.includes("ice age fossils state park visitor center"))
    return "This is a separately operated Nevada State Park facility with its own $3 day-use admission and posted building hours.";
  if (n.includes("lake mead visitor center"))
    return "Open daily 9:00 a.m.-4:30 p.m., subject to federal holiday and operational notices.";
  if (n.includes("boulder beach campground"))
    return "The campground follows reservation, quiet-hour, check-in and seasonal service rules separate from day-use beach access.";
  if (n.includes("hemenway harbor"))
    return "Marina, launch, concession and fuel operations keep separate hours from the 24-hour national recreation area.";
  if (p.id.endsWith("valley-of-fire-state-park") && (n.includes("fire wave") || n.includes("white domes")))
    return "Closed May 15-September 30 for heat safety. Do not enter the trail during the seasonal closure.";
  if (n.includes("valley of fire visitor center"))
    return "Generally open 9:00 a.m.-4:00 p.m.; the park itself is day use from sunrise to sunset and closes December 1-14 annually.";
  if (hasSeparateHours(name))
    return `${p.hours} ${name} may keep shorter, seasonal, staffed, reserved, heat-dependent or daylight-only hours; verify its current status before relying on parent hours.`;
  return p.hours;
}
function feature(p, name, i, images) {
  const s = slug(name),
    id = stable(p.id, s),
    point = coordinates[p.id]?.[s],
    description = note(name, p.name),
    separateHours = hasSeparateHours(name),
    hours = featureHours(p, name);
  if (!point) throw new Error(`${p.name}/${name}: coordinate missing`);
  const base = images[featureImageIndex(p, name, i) % images.length],
    image = {
      ...base,
      featureId: id,
      latitude: point.latitude,
      longitude: point.longitude,
      alt: `${name} at ${p.name}`,
    },
    qs = [
      ["location", `Where exactly is ${name}?`, description],
      ["parking", `Where should I park for ${name}?`, p.parking],
      [
        "hours",
        `When is ${name} open?`,
        hours,
      ],
      ["restroom", `Are there restrooms near ${name}?`, p.restrooms],
      ["fees", `Is ${name} free?`, p.cost],
      ["accessibility", `How accessible is ${name}?`, p.accessibility],
      ["dogs", `Are dogs allowed at ${name}?`, p.dogs],
      ["family", `Is ${name} good for children?`, p.family],
      [
        "need-to-know",
        `What should I know before visiting ${name}?`,
        `${description} ${p.need}`,
      ],
    ].map((v) => ans(p, ...v));
  return {
    id,
    slug: s,
    name,
    feature_type: "destination",
    description,
    latitude: point.latitude,
    longitude: point.longitude,
    details: {
      category: "destination",
      includeInParentGallery: true,
      address: p.address,
      hours,
      hoursSchedule: separateHours ? false : schedule(p),
      cost: p.cost,
      accessibility: p.accessibility,
      locationContext: description,
      needToKnow: p.need,
      informationSourceLabel: p.operator,
      informationSourceUrl: p.source,
      informationCheckedAt: checkedAt,
      coordinateSource: point.source,
      positionQuality: point.quality || "official-map-reviewed",
      imageUrl: image.url,
      imageSourceUrl: image.source,
      imageAuthor: image.author,
      imageLicense: image.license,
      imageAlt: image.alt,
      images: [image],
      searchAnswers: qs,
    },
    source_label: p.operator,
    source_url: p.source,
    verified_at: checkedAt,
  };
}
(() => {
  const all = read("data/generated/all-subsites-ready.json"),
    pilot = read("data/generated/pilot-subsites-ready.json"),
    national = read("data/parent-park-information-enrichment-national.json"),
    campaignParents = read(
      "data/parent-park-information-enrichment-campaign.json",
    ),
    locations = read("data/launch-location-overrides.json");
  for (const scope of campaign.places) {
    const p = { ...scope, ...facts[scope.id] },
      images = galleries.places[p.id]?.images || [];
    if (images.length < 4) throw new Error(`${p.name}: gallery missing`);
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
      sources: [{ label: p.operator, url: p.source }],
      launchTier: "anchor",
      likelySubsites: true,
      publishStatus: "super-enriched",
      researchQueue: [],
      transit: p.transit,
      searchAnswers: answers(p),
      features: p.subsites.map((n, i) => feature(p, n, i, images)),
      amenities: [],
      comments: [],
    };
    upsert(all, record);
    upsert(pilot, record);
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
  write("data/parent-park-information-enrichment-national.json", national);
  write(
    "data/parent-park-information-enrichment-campaign.json",
    campaignParents,
  );
  write("data/launch-location-overrides.json", locations);
  console.log(`Super-enriched ${campaign.places.length} Las Vegas and Southern Nevada guides.`);
})();
