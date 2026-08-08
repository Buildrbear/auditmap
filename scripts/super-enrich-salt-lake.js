#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  root = path.resolve(__dirname, ".."),
  campaign = require("../data/salt-lake-super-enrichment-campaign.json"),
  facts = require("../data/salt-lake-visitor-facts.json").places,
  galleries = require("../data/generated/salt-lake-super-images.json"),
  coordinates =
    require("../data/generated/salt-lake-feature-coordinates.json").places,
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
  if (p.id.endsWith("liberty-park")) return daily("05:00", "23:00");
  if (p.id.endsWith("antelope-island-state-park")) return daily("06:00", "22:00");
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
      `Check current Wasatch Front weather, air quality, road status and operator alerts. Heat, cold, snow, avalanche control, lightning, flash flooding, high wind, wildfire smoke and fire restrictions can independently close roads, trails or facilities.`,
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
  if (p.id.endsWith("liberty-park") && n.includes("chase")) return 3;
  if (p.id.endsWith("sugar-house-park") && (n.includes("pond") || n.includes("lakeside"))) return 2;
  if (p.id.endsWith("memory-grove-park") && n.includes("memorial house")) return 0;
  if (p.id.endsWith("millcreek-canyon") && (n.includes("winter") || n.includes("gate"))) return 2;
  if (p.id.endsWith("millcreek-canyon") && n.includes("yurt")) return 3;
  if (p.id.endsWith("big-cottonwood-canyon") && n.includes("silver lake")) return 3;
  if (p.id.endsWith("great-salt-lake-state-park") && n.includes("marina")) return 0;
  return i % 4;
}
function hasSeparateHours(name) {
  return /(play|aviary|museum|pond|pool|tennis|refuge|loop|pavilion|draw|trail|garden|field|chapel|pagoda|harbor|gate|park|trailhead|picnic|winter|yurt|falls|lake|visitor center|snowbird|alta|albion|cecret|marina|beach|ranch|campground|boat ramp|deck|saltair)/i.test(
    name,
  );
}
function featureHours(p, name) {
  const n = name.toLowerCase();
  if (n.includes("rotary play park"))
    return "Closed for reconstruction. Salt Lake City has announced a September 2026 grand opening; use Rice Pavilion Playground until the City confirms reopening.";
  if (n.includes("tracy aviary") || n.includes("chase home") || n.includes("liberty park pool") || n.includes("tennis center"))
    return `${name} is separately operated and keeps admission, program and seasonal hours independent of Liberty Park's 5:00 a.m.-11:00 p.m. grounds schedule.`;
  if (n.includes("big field"))
    return "Big Field remains open and hosts permitted events. Do not confuse it with the separate Backstop Field, which is closed for 2026 construction.";
  if (n.includes("city creek canyon gate"))
    return "Private vehicles remain prohibited during the treatment-plant construction project. Pedestrian and bicycle access follows posted canyon hours and construction controls.";
  if (n.includes("maple grove winter gate"))
    return "The upper Millcreek Canyon gate closes every November 1; the road beyond becomes a groomed winter recreation route.";
  if (n.includes("big water yurt"))
    return "The yurt is a reservable winter facility 4.5 miles beyond the winter gate and does not follow ordinary drive-up trailhead access.";
  if (n.includes("silver lake visitor center"))
    return "The staffed visitor center is seasonal and keeps shorter hours than the canyon road; verify Forest Service operations before relying on the building.";
  if (n.includes("snowbird center"))
    return "Snowbird is separately operated; lifts, parking, food and activity hours vary by season and weather.";
  if (n.includes("albion basin") || n.includes("cecret lake"))
    return "Summer road, shuttle and parking access is seasonal and can be controlled or closed; winter access follows Alta operations and snow conditions.";
  if (n.includes("antelope island marina visitor"))
    return "Temporary visitor information and gifts operate at the marina from 9:00 a.m.-5:00 p.m. while the main Visitor Center is closed for renovation.";
  if (n.includes("fielding garr ranch"))
    return "Ranch museum and exhibit facilities are open daily 10:00 a.m.-5:00 p.m.; exterior self-guided areas may remain available outside building hours.";
  if (n.includes("great salt lake visitor center"))
    return "Summer hours are Monday-Thursday 11:00 a.m.-7:00 p.m. and Friday-Sunday 9:00 a.m.-8:00 p.m.; seasonal hours can change.";
  if (n.includes("public boat ramp"))
    return "The ramp is currently open but shallow and recommended only for shallow-draft boats at the operator's risk; lake and wind conditions can stop launching independently.";
  if (n.includes("great salt lake campground"))
    return "The campground is open year-round and follows reservation, check-in and quiet-hour rules separate from sunrise-to-sunset day use.";
  if (hasSeparateHours(name))
    return `${p.hours} ${name} may keep shorter, seasonal, staffed, reserved, road-controlled, weather-dependent or daylight-only hours; verify its current status before relying on parent hours.`;
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
  console.log(`Super-enriched ${campaign.places.length} Salt Lake City and Wasatch Front guides.`);
})();
