#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  root = path.resolve(__dirname, ".."),
  campaign = require("../data/columbus-super-enrichment-campaign.json"),
  factsDocument = require("../data/columbus-visitor-facts.json"),
  facts = factsDocument.places,
  featureFactsDocument = require("../data/columbus-feature-visitor-facts.json"),
  featureFacts = featureFactsDocument.places,
  galleries = require("../data/generated/columbus-super-images.json"),
  coordinates =
    require("../data/generated/columbus-feature-coordinates.json").places,
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
  if (
    p.id.endsWith("highbanks-metro-park") ||
    p.id.endsWith("battelle-darby-creek-metro-park")
  )
    return daily("06:30", "22:00");
  return daily("07:00", "23:00");
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
    ...(p.answerSourceLabels?.[key]
      ? { sourceLabel: p.answerSourceLabels[key] }
      : {}),
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
      p.weather ||
        `Check current Columbus-area weather and operator alerts. Scioto, Olentangy and Darby water levels, heat, storms, snow, ice and high winds can close fountains, river paths, trails or facilities independently.`,
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
  if (p.id.endsWith("scioto-mile")) {
    if (n.includes("fountain") || n.includes("bicentennial")) return 0;
    if (n.includes("bridge")) return 2;
    return i % 4;
  }
  if (p.id.endsWith("franklin-park")) {
    if (n.includes("conservatory") || n.includes("children")) return 2;
    if (n.includes("cascade")) return 1;
    return i % 4;
  }
  if (p.id.endsWith("goodale-park")) {
    if (n.includes("shelter")) return 2;
    if (n.includes("pond") || n.includes("fountain")) return 0;
    return i % 4;
  }
  if (p.id.endsWith("schiller-park")) return i % 4;
  if (p.id.includes("whetstone-park")) {
    if (n.includes("fountain")) return 3;
    return i % 3;
  }
  if (p.id.endsWith("highbanks-metro-park")) {
    if (n.includes("bridge") || n.includes("dripping")) return 0;
    if (n.includes("mound") || n.includes("overlook")) return 1;
    if (n.includes("wildflower") || n.includes("meadow")) return 3;
    return 2;
  }
  if (p.id.endsWith("battelle-darby-creek-metro-park")) {
    if (n.includes("nature center")) return 0;
    if (n.includes("bison")) return 1;
    if (n.includes("creek") || n.includes("canoe")) return 2;
    return 3;
  }
  if (p.id.endsWith("quarry-trails-metro-park")) {
    if (n.includes("falls") || n.includes("via ferrata") || n.includes("climb"))
      return 0;
    return i % 4;
  }
  return i;
}
function feature(p, name, i, images) {
  const s = slug(name),
    id = stable(p.id, s),
    point = coordinates[p.id]?.[s],
    specific = featureFacts[p.id]?.[s],
    description = specific?.description || note(name, p.name);
  if (!point) throw new Error(`${p.name}/${name}: coordinate missing`);
  if (featureFacts[p.id] && !specific)
    throw new Error(`${p.name}/${name}: destination-specific facts missing`);
  const base = images[
      specific?.imageIndex ?? featureImageIndex(p, name, i) % images.length
    ],
    image = {
      ...base,
      featureId: id,
      latitude: point.latitude,
      longitude: point.longitude,
      alt: specific?.imageAlt || `${name} at ${p.name}`,
    },
    separateHours = Boolean(specific) || /(park$|fountain|conservatory|garden campus|children's garden|amphitheater|sports complex|court|shelter|gazebo|nature center|picnic|play|observation|canoe|via ferrata|climbing|bike|dog park|lake area)/i.test(name),
    featureHours = specific?.hours || (separateHours
      ? `${name} keeps its own admission, operating, seasonal, staffing, reservation, water, maintenance, or weather schedule. Check the cited official source and current operator notices before leaving.`
      : p.hours),
    sourceFor = (key) => ({
      sourceLabel: specific?.sourceLabel || p.operator,
      source: specific?.answerSources?.[key] || specific?.source || p.source,
      ...(specific?.answerSourceLabels?.[key]
        ? { sourceLabel: specific.answerSourceLabels[key] }
        : {}),
      verifiedAt: specific ? featureFactsDocument.checkedAt : p.checkedAt || checkedAt,
    }),
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
    ].map((v) => ans(p, ...v, sourceFor(v[0])));
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
      informationCheckedAt: specific ? featureFactsDocument.checkedAt : p.checkedAt || checkedAt,
      coordinateSource: point.source,
      positionQuality:
        point.displayName || `Reviewed placement within ${p.name}`,
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
    verified_at: specific ? featureFactsDocument.checkedAt : p.checkedAt || checkedAt,
  };
}
function researchQueue(p) {
  if (p.id.endsWith("scioto-mile"))
    return [
      "Bicentennial Park, the interactive fountain, Main and Rich street bridges, Genoa Park, North Bank Park and Coleman Point remain parent guidance until each has a complete current profile, exact arrival evidence and destination-specific reusable photography.",
    ];
  if (p.id.endsWith("franklin-park"))
    return [
      "The Community Garden Campus, Children's Garden, amphitheater, Espy Adaptive Sports Complex, Asian Garden and Broad Street entrance remain parent guidance until each clears exact-arrival and destination-photo review.",
      "The Cascades are retained as a documented closed destination; do not imply that the waterfall or lower pond is currently accessible.",
    ];
  if (p.id.endsWith("goodale-park"))
    return [
      "The fountain, playground, tennis and basketball courts, gazebo and Short North entrance remain parent guidance until destination-specific reusable photos and complete current profiles clear review.",
      "The historical pond postcard is labeled as historical and must not be presented as a current conditions image.",
    ];
  if (p.id.endsWith("schiller-park"))
    return [
      "The amphitheater, Umbrella Girl Fountain, community center, playground, tennis and basketball courts remain parent guidance until each has a matching reusable photograph and a complete destination-specific profile.",
      "Huntington Gardens has an exact reusable aerial and partner guidance, but remains parent context until a public authoritative destination coordinate clears review.",
      "The city's pond and playground improvement plans are not closure notices; recheck current alerts and posted conditions before publication.",
    ];
  if (p.id.includes("whetstone-park"))
    return [
      "The Park of Roses gazebo, Heritage Rose Garden, Herb Garden, Whetstone Prairie, Olentangy Trail access, playground and tennis courts remain parent guidance until each has a matching reusable photograph, exact reviewed coordinates and a complete current profile.",
      "The three historical Park of Roses gallery images are explicitly labeled historical and must not be presented as current conditions evidence.",
      "Recheck the 2026 Hollenback Road, pond-lot, garden-path and community-center projects before publication or a later Whetstone release.",
    ];
  if (p.id.endsWith("highbanks-metro-park"))
    return [
      "The Nature Center, Overlook Trail, Big Meadows, natural play area, Dripping Rock, Scenic River and wetland deck remain parent guidance until each has a matching reusable photograph, exact reviewed destination coordinate and complete current profile.",
      "The operator's current Highbanks park page says 1,204 acres while its park-overview page says 1,160 acres. The guide avoids a precise acreage claim until the operator resolves that conflict.",
      "An official-site Nature Center photograph was removed from the reuse candidate set because appearance on the operator website does not establish a publication license.",
    ];
  if (p.id.endsWith("battelle-darby-creek-metro-park"))
    return [
      "Indian Ridge, natural play, Darby Creek Greenway, Cedar Ridge, canoe access and Pleasant Valley remain parent guidance until each has a matching reusable photograph, exact reviewed destination coordinate and complete current profile.",
      "Bison use separate winter and summer pastures and may be distant or out of view; recheck current operator guidance before publication and never promise a sighting.",
      "Designated Battelle Darby zones can be open to hunting in season. Recheck the current public hunting map and posted signs before a later trail or access release.",
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
    if (images.length < (scope.minImages || 4))
      throw new Error(`${p.name}: gallery missing`);
    const record = {
      id: p.id,
      name: p.name,
      type: "Park",
      city: p.city,
      state: "OH",
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
    if (launchIndex >= 0)
      launchPlaces[launchIndex] = { ...launchPlaces[launchIndex], ...record };
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
      state: "OH",
      latitude: p.latitude,
      longitude: p.longitude,
      address: p.address,
      displayName: `${p.name}, Columbus area, OH`,
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
  console.log(
    `Super-enriched ${campaign.places.filter((place) => place.currentBatch).length} Columbus guides.`,
  );
})();
