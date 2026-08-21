#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  root = path.resolve(__dirname, ".."),
  campaign = require("../data/baltimore-super-enrichment-campaign.json"),
  facts = require("../data/baltimore-visitor-facts.json").places,
  featureFactsDocument = require("../data/baltimore-feature-visitor-facts.json"),
  featureFacts = featureFactsDocument.places,
  galleries = require("../data/generated/baltimore-super-images.json"),
  coordinates =
    require("../data/generated/baltimore-feature-coordinates.json").places,
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
const obsoleteFeatureSlugs = {
  "launch-md-baltimore-druid-hill-park": [
    "druid-hill-park-pool",
    "disc-golf-course",
    "jones-falls-trail-connection",
  ],
  "launch-md-baltimore-patterson-park": [
    "patterson-park-playground",
    "patterson-park-dog-park",
    "patterson-park-pool",
    "patterson-park-ice-rink",
    "patterson-park-athletic-fields",
  ],
  "launch-md-baltimore-federal-hill-park": [
    "federal-hill-park-playground",
    "federalist-ship-play-structure",
    "signal-hill-tower-play-structure",
    "flag-staff-plaza",
    "colonel-george-armistead-monument",
    "general-samuel-smith-monument",
    "federal-hill-basketball-court",
  ],
  "launch-md-baltimore-fort-mchenry-national-monument-and-historic-shrine": [
    "flag-change-program",
    "fort-mchenry-wetland",
    "water-battery",
    "fort-mchenry-picnic-area",
  ],
  "launch-md-baltimore-baltimore-waterfront-promenade": [
    "inner-harbor-amphitheater",
    "west-shore-park",
    "rash-field-park",
    "harbor-point-central-plaza",
    "pierces-park",
    "canton-waterfront-park",
    "fells-point-broadway-pier",
    "harbor-east-promenade",
  ],
  "launch-md-baltimore-lake-roland-park": [
    "lake-roland-nature-center",
    "lake-roland-boardwalk",
    "lake-roland-dog-park",
    "red-trail",
    "yellow-trail",
    "falls-road-light-rail-entrance",
    "paw-point-dog-park-beach",
  ],
};
function schedule(p) {
  if (p.id.endsWith("cylburn-arboretum"))
    return {
      sunday: [["08:00", "20:00"]],
      monday: [],
      tuesday: [["08:00", "20:00"]],
      wednesday: [["08:00", "20:00"]],
      thursday: [["08:00", "20:00"]],
      friday: [["08:00", "20:00"]],
      saturday: [["08:00", "20:00"]],
    };
  return false;
}
function ans(p, k, q, a, meta = {}) {
  return {
    intentKey: k,
    question: q,
    answer: a,
    sourceLabel: meta.sourceLabel || p.operator,
    source: meta.source || p.source,
    verifiedAt: p.verifiedAt || checkedAt,
    freshnessClass:
      meta.freshnessClass ||
      (["hours", "parking", "need-to-know", "weather"].includes(k)
        ? "fast"
        : "slow"),
    status: "verified",
  };
}
function answers(p) {
  const core = [
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
      p.weather || `Check current Baltimore weather and operator alerts. Harbor wind, thunderstorms, flash flooding, stream and lake conditions, heat, snow and ice can close trails, water access or facilities independently.`,
    ],
  ].map((v) => ans(p, ...v));
  const extra = (p.extraAnswers || []).map((entry) =>
    ans(p, entry.intentKey, entry.question, entry.answer, entry),
  );
  return core.concat(extra);
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
  if (p.id.endsWith("druid-hill-park")) { if (n.includes("conservatory")) return 1; if (n.includes("chinese")) return 2; if (n.includes("mansion")) return 3; return 0; }
  if (p.id.endsWith("patterson-park")) { if (n.includes("observatory")) return 1; if (n.includes("lake")||n.includes("playground")) return 2; return i%4; }
  if (p.id.endsWith("fort-mchenry-national-monument-and-historic-shrine")) { if (n.includes("orpheus")) return 2; if (n.includes("harbor")||n.includes("seawall")||n.includes("wetland")) return 3; if (n.includes("interior")||n.includes("star")) return 1; return 0; }
  if (p.id.endsWith("cylburn-arboretum")) { if (n.includes("maple")) return 2; if (n.includes("garden")) return 1; return i%4; }
  if (p.id.endsWith("gwynns-falls-leakin-park")) { if (n.includes("crimea")||n.includes("magnolia")) return 3; if (n.includes("trail")) return 2; return i%4; }
  if (p.id.endsWith("baltimore-waterfront-promenade")) { if (n.includes("trash")) return 3; return i%3; }
  if (p.id.endsWith("lake-roland-park")) { if (n.includes("dam")) return 2; if (n.includes("trail")) return 3; return i%4; }
  return i;
}
function feature(p, name, i, images) {
  const s = slug(name),
    id = stable(p.id, s),
    point = coordinates[p.id]?.[s],
    factsForPlace = featureFacts[p.id],
    specific = factsForPlace?.[s],
    description = specific?.description || note(name, p.name);
  if (!point) throw new Error(`${p.name}/${name}: coordinate missing`);
  if (factsForPlace && !specific)
    throw new Error(`${p.name}/${name}: destination-specific facts missing`);
  const imageIndex = specific?.imageIndex ?? featureImageIndex(p, name, i),
    base = images[imageIndex % images.length],
    image = {
      ...base,
      featureId: id,
      latitude: point.latitude,
      longitude: point.longitude,
      alt: `${name} at ${p.name}`,
    },
    separateHours = /(conservatory|zoo|pool|observatory|dog park|ice rink|recreation center|visitor center|star fort|flag change|mansion|nature education center|greenhouse|children's garden|nature center|pier|amphitheater|park|plaza|paw point)/i.test(name),
    featureHours = specific?.hours || (separateHours
      ? `${name} keeps its own admission, operating, seasonal, staffing, program, construction, maintenance, or weather schedule. Check the cited official source and current operator notices before leaving.`
      : p.hours),
    sourceMeta = specific
      ? { sourceLabel: specific.sourceLabel, source: specific.source }
      : {},
    qs = [
      ["location", `Where exactly is ${name}?`, specific?.location || description],
      ["parking", `Where should I park for ${name}?`, specific?.parking || p.parking],
      [
        "hours",
        `When is ${name} open?`,
        featureHours,
      ],
      ["restroom", `Are there restrooms near ${name}?`, specific?.restrooms || p.restrooms],
      ["fees", `Is ${name} free?`, specific?.fees || p.cost],
      ["accessibility", `How accessible is ${name}?`, specific?.accessibility || p.accessibility],
      ["dogs", `Are dogs allowed at ${name}?`, specific?.dogs || p.dogs],
      ["family", `Is ${name} good for children?`, specific?.family || p.family],
      [
        "need-to-know",
        `What should I know before visiting ${name}?`,
        specific?.need || `${description} ${p.need}`,
      ],
    ].map((v) => ans(p, ...v, sourceMeta));
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
      address: specific?.address || p.address,
      hours: featureHours,
      hoursSchedule: separateHours ? false : schedule(p),
      cost: specific?.fees || p.cost,
      accessibility: specific?.accessibility || p.accessibility,
      locationContext: description,
      needToKnow: specific?.need || p.need,
      informationSourceLabel: specific?.sourceLabel || p.operator,
      informationSourceUrl: specific?.source || p.source,
      informationCheckedAt: specific ? featureFactsDocument.checkedAt : p.verifiedAt || checkedAt,
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
    verified_at: specific ? featureFactsDocument.checkedAt : p.verifiedAt || checkedAt,
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
      images = galleries.places[p.id]?.images || [],
      parentAnswers = answers(p),
      sourceMap = new Map(
        [
          { label: p.operator, url: p.source },
          ...parentAnswers.map((answer) => ({
            label: answer.sourceLabel,
            url: answer.source,
          })),
        ].map((source) => [source.url, source]),
      ),
      parentSources = [...sourceMap.values()];
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
      verifiedAt: p.verifiedAt || checkedAt,
      operator: p.operator,
      image: images[0],
      images: images.slice(1),
      sources: parentSources,
      launchTier: "anchor",
      likelySubsites: true,
      publishStatus: "super-enriched",
      researchQueue: [],
      transit: p.transit,
      searchAnswers: parentAnswers,
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
      verifiedAt: p.verifiedAt || checkedAt,
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
      checkedAt: p.verifiedAt || checkedAt,
    };
    const li = locations.findIndex((x) => x.id === p.id);
    li >= 0 ? (locations[li] = loc) : locations.push(loc);
    for (const featureSlug of obsoleteFeatureSlugs[p.id] || []) {
      fs.rmSync(
        path.join(
          root,
          "us",
          p.state.toLowerCase(),
          slug(p.city),
          "parks",
          slug(p.name),
          featureSlug,
        ),
        { recursive: true, force: true },
      );
    }
  }
  write("data/generated/all-subsites-ready.json", all);
  write("data/generated/pilot-subsites-ready.json", pilot);
  write("data/parent-park-information-enrichment-national.json", national);
  write(
    "data/parent-park-information-enrichment-campaign.json",
    campaignParents,
  );
  write("data/launch-location-overrides.json", locations);
  console.log(`Super-enriched ${campaign.places.length} Baltimore guides.`);
})();
