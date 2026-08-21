#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  root = path.resolve(__dirname, ".."),
  campaign = require("../data/indianapolis-super-enrichment-campaign.json"),
  legacyFacts = require("../data/indianapolis-visitor-facts.json").places,
  factsDocument = require("../data/indianapolis-evidence-visitor-facts.json"),
  facts = { ...legacyFacts, ...factsDocument.places },
  featureFactsDocument = require("../data/indianapolis-feature-visitor-facts.json"),
  featureFacts = featureFactsDocument.places,
  galleries = require("../data/generated/indianapolis-super-images.json"),
  coordinates =
    require("../data/generated/indianapolis-feature-coordinates.json").places,
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
  if (!p.id.endsWith("white-river-state-park")) return false;
  if (p.id.endsWith("white-river-state-park")) return daily("05:00", "23:00");
  return false;
}
function ans(p, k, q, a, metadata = {}) {
  return {
    intentKey: k,
    question: q,
    answer: a,
    sourceLabel: metadata.sourceLabel || p.operator,
    source: metadata.source || p.source,
    verifiedAt: metadata.verifiedAt || p.checkedAt || factsDocument.checkedAt,
    freshnessClass: ["hours", "parking", "need-to-know", "weather"].includes(k)
      ? "fast"
      : "slow",
    status: "verified",
  };
}
function answers(p) {
  const sourceFor = (key) => ({
    ...(p.answerSources?.[key] ? { source: p.answerSources[key] } : {}),
    ...(p.answerSourceLabels?.[key] ? { sourceLabel: p.answerSourceLabels[key] } : {}),
  });
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
      p.weather || `Check current Indianapolis-area weather and operator alerts. White River and Fall Creek flooding, reservoir conditions, heat, storms, snow, ice and high winds can close trails or facilities independently.`,
    ],
  ].map((v) => ans(p, ...v, sourceFor(v[0])));
}
function note(name, parent) {
  const n = name.toLowerCase();
  if (n.includes("splash") || n.includes("fountain"))
    return `${name} is a seasonal, weather-dependent water feature at ${parent}; verify same-day operation and supervision rules.`;
  if (n.includes("beach"))
    return `${name} is a named shoreline destination at ${parent}; check water status, lifeguard coverage, wind and posted beach rules before entering.`;
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
  if (p.id.endsWith("white-river-state-park")) { if (n.includes("canal")) return 3; if (n.includes("amphitheater")||n.includes("celebration")) return 1; return i%4; }
  if (p.id.endsWith("eagle-creek-park")) { if (n.includes("center")) return 1; if (n.includes("beach")||n.includes("marina")||n.includes("lake")) return 0; return i%4; }
  if (p.id.endsWith("garfield-park")) { if (n.includes("interior")||n.includes("conservatory")) return 1; return i%4; }
  if (p.id.endsWith("holliday-park")) { if (n.includes("ruins")) return 0; if (n.includes("playground")||n.includes("nature center")) return 1; if (n.includes("garden")||n.includes("fountain")) return 3; return i%4; }
  if (p.id.endsWith("riverside-regional-park")) { if (n.includes("adventure")||n.includes("playground")) return 2; if (n.includes("promenade")||n.includes("trail")) return i%2; return 3; }
  if (p.id.endsWith("broad-ripple-park")) { if (n.includes("family center")||n.includes("indoor")) return 0; if (n.includes("pool")) return 1; if (n.includes("woods")||n.includes("picnic")) return 2; return i%4; }
  return i;
}
function feature(p, name, i, images) {
  const s = slug(name),
    id = stable(p.id, s),
    point = coordinates[p.id]?.[s],
    specific = featureFacts[p.id]?.[s],
    displayName = specific?.name || name,
    description = specific?.description || note(name, p.name);
  if (!point) throw new Error(`${p.name}/${name}: coordinate missing`);
  if (featureFacts[p.id] && !specific) throw new Error(`${p.name}/${name}: destination-specific facts missing`);
  const base = images[specific?.imageIndex ?? featureImageIndex(p, name, i) % images.length],
    image = {
      ...base,
      featureId: id,
      latitude: point.latitude,
      longitude: point.longitude,
      alt: specific?.imageAlt || `${displayName} at ${p.name}`,
    },
    featureHours = specific?.hours || p.hours,
    sourceFor = (key) => ({
      sourceLabel: specific?.answerSourceLabels?.[key] || specific?.sourceLabel || p.operator,
      source: specific?.answerSources?.[key] || specific?.source || p.source,
      verifiedAt: specific ? specific.checkedAt || featureFactsDocument.checkedAt : p.checkedAt || checkedAt,
    }),
    qs = [
      ["location", `Where exactly is ${displayName}?`, specific?.location || description],
      ["parking", `Where should I park for ${displayName}?`, specific?.parking || p.parking],
      ["hours", `When is ${displayName} open?`, featureHours],
      ["restroom", `Are there restrooms near ${displayName}?`, specific?.restrooms || p.restrooms],
      ["fees", `Is ${displayName} free?`, specific?.fees || p.cost],
      ["accessibility", `How accessible is ${displayName}?`, specific?.accessibility || p.accessibility],
      ["dogs", `Are dogs allowed at ${displayName}?`, specific?.dogs || p.dogs],
      ["family", `Is ${displayName} good for children?`, specific?.family || p.family],
      [
        "need-to-know",
        `What should I know before visiting ${displayName}?`,
        specific?.need || `${description} ${p.need}`,
      ],
    ].map((v) => ans(p, ...v, sourceFor(v[0])));
  return {
    id,
    slug: s,
    name: displayName,
    feature_type: "destination",
    description,
    latitude: point.latitude,
    longitude: point.longitude,
    details: {
      category: "destination",
      includeInParentGallery: true,
      address: specific?.address || p.address,
      hours: featureHours,
      hoursSchedule: false,
      cost: specific?.fees || p.cost,
      accessibility: specific?.accessibility || p.accessibility,
      locationContext: description,
      needToKnow: specific?.need || p.need,
      informationSourceLabel: specific?.sourceLabel || p.operator,
      informationSourceUrl: specific?.source || p.source,
      informationCheckedAt: specific ? specific.checkedAt || featureFactsDocument.checkedAt : p.checkedAt || checkedAt,
      coordinateSource: point.source,
      positionQuality: point.displayName || `Reviewed placement within ${p.name}`,
      imageUrl: image.url,
      imageSourceUrl: image.source,
      imageAuthor: image.author,
      imageLicense: image.license,
      imageAlt: image.alt,
      images: [image],
      searchAnswers: qs,
    },
    source_label: specific?.sourceLabel || p.operator,
    source_url: specific?.source || p.source,
    verified_at: specific ? specific.checkedAt || featureFactsDocument.checkedAt : p.checkedAt || checkedAt,
  };
}
function researchQueue(p) {
  if (p.id.endsWith("eagle-creek-park")) return [
    "Earth Discovery Center, beach, marina, Lilly Lake, Pin Oak Trail, Canine Companion Zone and Go Ape remain parent guidance until each has a complete current profile, an exact reviewed arrival point and destination-specific reusable photography.",
    "The Commons file titled Eagle Creek Park nature center is retained only for the Ornithology Center because its description, camera geotag and official address identify that building; it must not be reused for the Earth Discovery Center.",
    "Swimming, rentals, dog-zone access and commercial attractions keep seasonal or separate operating rules; parent hours must not be inherited by those facilities."
  ];
  if (p.id.endsWith("monon-trail")) return [
    "The former 10th Street, Fall Creek, State Fairgrounds, Broad Ripple and 96th Street cards describe access segments rather than independently profiled destinations and are retired to the parent guide.",
    "Frank and Judy O'Bannon Park, Canterbury Park and Marott Park remain separate parks linked from parent guidance; they require their own complete parent records rather than Monon Trail subsites.",
    "Canterbury Park construction is expected through late 2026, so the guide avoids promising that adjacent facilities or access conditions are available."
  ];
  if (p.id.endsWith("garfield-park")) return [
    "The Pagoda, aquatic center, MacAllister Amphitheater, Burrello Family Center and Pleasant Run Trail remain parent guidance until each has exact reviewed coordinates, a complete destination profile and matching reusable photography.",
    "The Burrello Family Center facility page and parent park page publish conflicting schedules; the parent page's temporary weekday-only guidance is retained as the safer current note, and no destination page is published.",
    "The new playground near the Pagoda is scheduled for fall 2026 completion, so the guide does not publish a playground destination or promise construction is complete."
  ];
  if (p.id.endsWith("holliday-park")) return [
    "The playground, generic trails, White River overlook, arboretum, prairie and rock garden remain parent guidance until each has exact reviewed coordinates, a complete destination profile and matching reusable photography.",
    "The replacement playground opened in November 2025; older Commons playground photography is deliberately excluded because it depicts the former structure.",
    "The Nature Center destination uses the reviewed building centroid rather than the interior photograph's inconsistent camera GPS; the image remains valid only as destination-matched interior evidence."
  ];
  if (p.id.endsWith("fort-harrison-state-park")) return [
    "The Visitor Center, Harrison Trace Trail, Delaware Lake, Duck Pond, Lawrence Creek Trail, Museum of 20th Century Warfare, sledding hill and dog park remain parent guidance until each has exact reviewed coordinates, a complete destination-specific profile and matching current reusable photography.",
    "The four reviewed Commons photographs document the parent park only. The broad trail and boardwalk views must not be assigned to Harrison Trace, Lawrence Creek or another named route without destination-specific evidence.",
    "The bicycle and pedestrian entrance photograph dates to 2008 and is retained as stable parent arrival context, not proof of current fees or a standalone entrance destination.",
    "The Saddle Barn is temporarily closed in 2026 while Indiana DNR seeks a concessionaire; verify the current alert before restoring horseback-riding guidance."
  ];
  if (p.id.endsWith("white-river-state-park")) return [
    "Old Washington Street Bridge, Celebration Plaza lawn, Military Park, State Museum Lawn, NCAA Hall of Champions, Eiteljorg Museum and Indianapolis Zoo remain parent guidance until each has an exact reviewed arrival point, a complete destination-specific profile and matching reusable photography.",
    "Only the exact Celebration Plaza Amphitheater and Central Indiana Canal photographs are assigned to destinations. The skyline and White River views remain parent-only evidence and must not be reassigned to another venue or landmark.",
    "The operator's visit page still displays an August 15 closure notice that explicitly says affected spaces reopened August 16. Treat that notice as expired, and recheck alerts and event detours on the day of a visit.",
    "Museums, the zoo, rentals, concerts and events keep separate schedules, admission rules and animal policies; the park's 5:00 a.m.-11:00 p.m. grounds schedule must not be inherited by those venues."
  ];
  return [];
}
(() => {
  const all = read("data/generated/all-subsites-ready.json"),
    pilot = read("data/generated/pilot-subsites-ready.json"),
    launchPlaces = read("data/generated/launch-map-places.json"),
    national = read("data/parent-park-information-enrichment-national.json"),
    campaignParents = read(
      "data/parent-park-information-enrichment-campaign.json",
    ),
    locations = read("data/launch-location-overrides.json");
  for (const scope of campaign.places.filter((place) => place.currentBatch)) {
    const p = { ...scope, ...facts[scope.id] },
      placeCheckedAt = scope.checkedAt || factsDocument.checkedAt || checkedAt,
      images = galleries.places[p.id]?.images || [];
    if (images.length < (scope.minImages || 4)) throw new Error(`${p.name}: gallery missing`);
    const record = {
      id: p.id,
      name: p.name,
      type: "Park",
      city: p.city,
      state: "IN",
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
      verifiedAt: placeCheckedAt,
      operator: p.operator,
      image: images[0],
      images: images.slice(1),
      sources: [{ label: p.operator, url: p.source }],
      launchTier: "anchor",
      likelySubsites: true,
      publishStatus: "super-enriched",
      researchQueue: researchQueue(p),
      transit: p.transit,
      searchAnswers: answers(p),
      features: p.subsites.map((n, i) => feature(p, n, i, images)),
      amenities: [],
      comments: [],
    };
    upsert(all, record);
    upsert(pilot, record);
    const launchIndex = launchPlaces.findIndex((item) => item.id === record.id);
    if (launchIndex >= 0) launchPlaces[launchIndex] = { ...launchPlaces[launchIndex], ...record };
    else launchPlaces.push(record);
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
      verifiedAt: placeCheckedAt,
    };
    national.parks[p.id] = parent;
    campaignParents.parks[p.id] = parent;
    const loc = {
      id: p.id,
      park: p.name,
      city: p.city,
      state: "IN",
      latitude: p.latitude,
      longitude: p.longitude,
      address: p.address,
      displayName: `${p.name}, Indianapolis area, IN`,
      source: p.operator,
      sourceUrl: p.source,
      checkedAt: placeCheckedAt,
    };
    const li = locations.findIndex((x) => x.id === p.id);
    li >= 0 ? (locations[li] = loc) : locations.push(loc);
  }
  write("data/generated/all-subsites-ready.json", all);
  write("data/generated/pilot-subsites-ready.json", pilot);
  write("data/generated/launch-map-places.json", launchPlaces);
  write("data/parent-park-information-enrichment-national.json", national);
  write(
    "data/parent-park-information-enrichment-campaign.json",
    campaignParents,
  );
  write("data/launch-location-overrides.json", locations);
  console.log(`Super-enriched ${campaign.places.filter((place) => place.currentBatch).length} Indianapolis guides.`);
})();
