#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  root = path.resolve(__dirname, ".."),
  campaign = require("../data/honolulu-super-enrichment-campaign.json"),
  facts = require("../data/honolulu-visitor-facts.json").places,
  galleries = require("../data/generated/honolulu-super-images.json"),
  coordinates =
    require("../data/generated/honolulu-feature-coordinates.json").places,
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
  if (p.id.endsWith("ala-moana-regional-park")) return daily("04:00", "22:00");
  if (p.id.endsWith("diamond-head-state-monument")) return daily("06:00", "18:00");
  if (p.id.endsWith("hoomaluhia-botanical-garden"))
    return {
      sunday: [["09:00", "16:00"]], monday: [["09:00", "16:00"]],
      tuesday: [["09:00", "16:00"]], wednesday: [["09:00", "16:00"]],
      thursday: [], friday: [["09:00", "16:00"]], saturday: [["09:00", "16:00"]],
    };
  if (p.id.endsWith("pearl-harbor-national-memorial")) return daily("07:00", "17:00");
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
      `Check current Oahu weather, ocean conditions and operator alerts. Extreme UV, heat, heavy rain, flash flooding, high surf, wind, currents, jellyfish and water-quality notices can close trails, beaches, boats or facilities independently.`,
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
  if (p.id.endsWith("kapiolani-regional-park") && (n.includes("bandstand") || n.includes("garden"))) return 1;
  if (p.id.endsWith("kapiolani-regional-park") && n.includes("shell")) return 3;
  if (p.id.endsWith("ala-moana-regional-park") && (n.includes("magic") || n.includes("promenade"))) return 1;
  if (p.id.endsWith("ala-moana-regional-park") && n.includes("beach")) return 2;
  if (p.id.endsWith("diamond-head-state-monument") && (n.includes("tunnel") || n.includes("stair"))) return 2;
  if (p.id.endsWith("diamond-head-state-monument") && (n.includes("summit") || n.includes("station"))) return 3;
  if (p.id.endsWith("hanauma-bay-nature-preserve") && n.includes("beach")) return 2;
  if (p.id.endsWith("hoomaluhia-botanical-garden") && (n.includes("lake") || n.includes("loko") || n.includes("fishing"))) return 1;
  if (p.id.endsWith("pearl-harbor-national-memorial") && n.includes("wall")) return 3;
  if (p.id.endsWith("kualoa-regional-park") && (n.includes("mokolii") || n.includes("beach"))) return 0;
  return i % 4;
}
function hasSeparateHours(name) {
  return /(shell|zoo|garden|tennis|athletic|fountain|installation|magic island|lagoon|beach|promenade|pavilion|court|restroom|shower|concession|bathhouse|trail|parking|tunnel|lookout|stair|station|summit|check-in|theater|tram|keyhole|bridge|bunker|visitor center|lake|fishing|collection|campground|museum|gallery|boat|memorial|circle|bus tour|canoe|fishpond)/i.test(
    name,
  );
}
function featureHours(p, name) {
  const n = name.toLowerCase();
  if (p.id.endsWith("hanauma-bay-nature-preserve"))
    return "The preserve is temporarily closed August 3-18, 2026. Normal operations are Wednesday-Sunday, entry 6:45 a.m.-1:30 p.m., beach clearance at 3:30 p.m. and full closure at 4:00 p.m.";
  if (n.includes("diamond head") && (n.includes("trail") || n.includes("summit") || n.includes("station") || n.includes("stair") || n.includes("tunnel") || n.includes("lookout")))
    return "The monument is open 6:00 a.m.-6:00 p.m., but the last entrance to hike is 4:00 p.m. Non-Hawaii residents need a timed reservation.";
  if (n.includes("waikiki shell"))
    return "The Shell opens for scheduled events only; gates, performance times, admission and prohibited-item rules vary by event.";
  if (n.includes("honolulu zoo"))
    return "The zoo is separately ticketed and keeps its own operating hours; confirm the zoo schedule rather than relying on park hours.";
  if (n.includes("uss arizona memorial") || n.includes("boat dock"))
    return "Access follows the reserved Navy boat program and can stop for high wind, mechanical or security conditions even while the visitor center remains open.";
  if (n.includes("ford island bus"))
    return "The NPS-facilitated Ford Island bus tour requires a separate reservation and follows scheduled departure times.";
  if (n.includes("road to war") || n.includes("attack gallery"))
    return "The museum follows the visitor center's 7:00 a.m.-5:00 p.m. schedule, except Thanksgiving, Christmas Day and New Year's Day.";
  if (n.includes("fishing") && p.id.endsWith("hoomaluhia-botanical-garden"))
    return "Catch-and-release fishing is offered only in reserved Wednesday and Saturday sessions; it is not an all-day drop-in activity.";
  if (n.includes("campground"))
    return "Camping requires an advance permit and follows campground gate, check-in and closure rules separate from ordinary day use.";
  if (hasSeparateHours(name))
    return `${p.hours} ${name} may keep shorter, reserved, staffed, event-dependent, ocean-dependent or daylight-only hours; verify the current feature status before relying on parent hours.`;
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
  console.log(`Super-enriched ${campaign.places.length} Honolulu and Oahu guides.`);
})();
