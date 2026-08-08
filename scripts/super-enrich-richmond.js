#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  root = path.resolve(__dirname, ".."),
  campaign = require("../data/richmond-super-enrichment-campaign.json"),
  facts = require("../data/richmond-visitor-facts.json").places,
  galleries = require("../data/generated/richmond-super-images.json"),
  coordinates =
    require("../data/generated/richmond-feature-coordinates.json").places,
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
  if (p.id.endsWith("virginia-museum-of-fine-arts"))
    return Object.fromEntries(days.map((d) => [d, [["10:00", ["wednesday", "thursday", "friday"].includes(d) ? "21:00" : "17:00"]]]));
  if (p.id.endsWith("browns-island")) return Object.fromEntries(days.map((d) => [d, []]));
  return null;
}
function featureIsClosed(p, name) {
  if (!p.id.endsWith("brown-s-island")) return false;
  return [
    "emancipation and freedom monument",
    "brown's island dam walk",
    "brown's island event lawn",
  ].some((value) => name.toLowerCase().includes(value));
}
function hasSeparateHours(p, name) {
  const n = name.toLowerCase();
  if (p.id.endsWith("brown-s-island")) return true;
  if (p.id.endsWith("maymont") && /(mansion|nature center)/.test(n)) return true;
  if (
    p.id.endsWith("byrd-park") &&
    /(fountain lake|dogwood dell|round house)/.test(n)
  )
    return true;
  if (
    p.id.endsWith("forest-hill-park") &&
    /(stone house|farmers market)/.test(n)
  )
    return true;
  if (p.id.endsWith("virginia-museum-of-fine-arts")) return true;
  if (
    p.id.endsWith("richmond-national-battlefield-park") &&
    /(museum|visitor center)/.test(n)
  )
    return true;
  return /(museum|restaurant|cafe|amphitheater|event lawn)/.test(n);
}
function featureHours(p, name) {
  const n = name.toLowerCase();
  if (p.id.endsWith("james-river-park-system") && n.includes("texas beach"))
    return "The shoreline remains a sunrise-to-sunset park destination, but the direct pedestrian bridge is closed. Use the signed North Bank Trail alternate route and allow substantially more walking time.";
  if (p.id.endsWith("james-river-park-system") && n.includes("pipeline"))
    return "Use only during daylight and when the access gate is open. High river levels, slippery grating, maintenance or emergency response can close the walkway without closing the entire park system.";
  if (p.id.endsWith("brown-s-island")) {
    if (n.includes("potterfield"))
      return "The bridge generally remains open during Brown's Island construction. Reach it from Tredegar Street at the western end and follow current detour signs.";
    if (n.includes("canal walk"))
      return "The Canal Walk remains available with a construction detour along Tredegar Street to Haxall Point Bridge near 10th Street. Follow posted closures rather than attempting to cross the island.";
    if (n.includes("tredegar") || n.includes("civil war museum"))
      return "This is an independently operated museum destination with its own admission hours. Brown's Island construction does not establish the museum schedule; check the museum before leaving.";
    if (n.includes("kanawha canal"))
      return "Canal access varies by segment during construction. Use the signed Canal Walk detour and do not enter Brown's Island work zones.";
    return "Closed with Brown's Island during construction. A limited event reopening is planned for October 9-11, 2026, while full project completion is anticipated in early 2027.";
  }
  if (p.id.endsWith("maymont") && n.includes("mansion"))
    return "Mansion entry uses a separate tour and ticket schedule from the free outdoor grounds. Confirm the day's experience and remaining capacity before walking to the Hampton Street end.";
  if (p.id.endsWith("maymont") && n.includes("nature center"))
    return "The Robins Nature Center uses separate ticketed hours from Maymont's outdoor grounds. Confirm admission availability before navigating to the Shields Lake Drive entrance.";
  if (p.id.endsWith("byrd-park") && n.includes("fountain lake"))
    return "The lake and surrounding paths follow sunrise-to-sunset park hours. Pedal boats, concessions and concession-building restrooms operate only on their posted summer schedule.";
  if (p.id.endsWith("byrd-park") && n.includes("dogwood dell"))
    return "The grounds follow park hours, while amphitheater entry follows the 2026 Festival of Arts or permitted-event schedule. Event setup can restrict access.";
  if (p.id.endsWith("byrd-park") && n.includes("round house"))
    return "The surrounding park follows sunrise-to-sunset hours. Interior access is tied to reservations, programs or staffed events.";
  if (p.id.endsWith("forest-hill-park") && n.includes("farmers market"))
    return "The market operates on its separately published Saturday schedule; the host park remains open sunrise to sunset. Verify the current vendor-day listing before making a market-specific trip.";
  if (p.id.endsWith("forest-hill-park") && n.includes("stone house"))
    return "The surrounding park is open sunrise to sunset, but Stone House interior access is limited to reservations, programs and staffed events.";
  if (p.id.endsWith("virginia-museum-of-fine-arts"))
    return `${p.hours} ${name} may use a shorter restaurant, shop, program, garden or event schedule; confirm the facility listing for a time-sensitive visit.`;
  if (
    p.id.endsWith("richmond-national-battlefield-park") &&
    n.includes("chimborazo")
  )
    return "Chimborazo Medical Museum is open Wednesday-Sunday, 9:00 a.m.-4:30 p.m., and closed Monday-Tuesday plus Thanksgiving, Christmas and New Year's Day. The grounds remain sunrise to sunset.";
  if (
    p.id.endsWith("richmond-national-battlefield-park") &&
    n.includes("fort harrison")
  )
    return "Fort Harrison battlefield grounds remain open sunrise to sunset, but the Fort Harrison Visitor Center is closed throughout 2026.";
  return hasSeparateHours(p, name)
    ? `${p.hours} ${name} has a separate staffed, seasonal, reservation or event schedule.`
    : p.hours;
}
function featureSchedule(p, name) {
  if (featureIsClosed(p, name))
    return Object.fromEntries(days.map((day) => [day, []]));
  return hasSeparateHours(p, name) ? false : schedule(p);
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
      `Check current Richmond weather, James River levels, air quality and operator alerts. Heat, thunderstorms, flash flooding, high water, ice, wind and event closures can independently affect roads, trails, bridges or facilities.`,
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
  if (p.id.endsWith("maymont") && n.includes("japanese")) return 1;
  if (p.id.endsWith("maymont") && n.includes("italian")) return 2;
  if (p.id.endsWith("maymont") && n.includes("mansion")) return 3;
  if (p.id.endsWith("byrd-park") && n.includes("dogwood")) return 2;
  if (p.id.endsWith("forest-hill-park") && n.includes("stone house")) return 3;
  if (p.id.endsWith("libby-hill-park") && n.includes("fountain")) return 3;
  if (p.id.endsWith("virginia-museum-of-fine-arts") && n.includes("garden")) return 2;
  if (p.id.endsWith("richmond-national-battlefield-park") && n.includes("malvern")) return 0;
  return i % 4;
}
function feature(p, name, i, images) {
  const s = slug(name),
    id = stable(p.id, s),
    point = coordinates[p.id]?.[s],
    description = note(name, p.name);
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
        featureHours(p, name),
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
      hours: featureHours(p, name),
      temporarilyClosed: featureIsClosed(p, name),
      hoursSchedule: featureSchedule(p, name),
      cost: p.cost,
      accessibility: p.accessibility,
      locationContext: description,
      needToKnow: p.need,
      informationSourceLabel: p.operator,
      informationSourceUrl: p.source,
      informationCheckedAt: checkedAt,
      coordinateSource: point.source,
      positionQuality:
        point.quality ||
        (point.source.includes("Nominatim")
          ? "public-map-match"
          : point.source.includes("reviewed public-map")
            ? "reviewed-map-placement"
            : "official-map-reviewed"),
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
      temporarilyClosed: p.id.endsWith("brown-s-island"),
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
      temporarilyClosed: p.id.endsWith("brown-s-island"),
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
  console.log(`Super-enriched ${campaign.places.length} Richmond guides.`);
})();
