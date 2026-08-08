#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  root = path.resolve(__dirname, ".."),
  campaign = require("../data/charlotte-super-enrichment-campaign.json"),
  facts = require("../data/charlotte-visitor-facts.json").places,
  galleries = require("../data/generated/charlotte-super-images.json"),
  coordinates =
    require("../data/generated/charlotte-feature-coordinates.json").places,
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
  return null;
}
function hasSeparateHours(p, name) {
  const n = name.toLowerCase();
  if (p.id.endsWith("freedom-park"))
    return /(amphitheater|pavilion|courts|fields)/.test(n);
  if (p.id.endsWith("romare-bearden-park"))
    return /(event lawn|sprayground|waterfall)/.test(n);
  if (p.id.endsWith("reedy-creek-park-and-nature-center"))
    return /(nature center|dog park|pavilion)/.test(n);
  if (p.id.endsWith("mcalpine-creek-community-park"))
    return /(dog park|cross country|community garden)/.test(n);
  if (p.id.endsWith("park-road-park"))
    return /(pavilion|fields|picnic shelters)/.test(n);
  if (p.id.endsWith("little-sugar-creek-greenway")) return true;
  if (p.id.endsWith("latta-nature-preserve"))
    return /(quest|equestrian|canoe launch|raptor center)/.test(n);
  if (p.id.endsWith("mcdowell-nature-preserve"))
    return /(nature center|discovery hall|copperhead|campground|launch)/.test(n);
  return false;
}
function featureHours(p, name) {
  const n = name.toLowerCase();
  if (p.id.endsWith("freedom-park")) {
    if (n.includes("mahlon adams"))
      return "Mahlon Adams Pavilion opens for reserved rentals and scheduled access rather than continuously with the park. Reservation assistance is available Monday-Friday 8:00 a.m.-4:00 p.m.";
    if (n.includes("amphitheater"))
      return "The outdoor amphitheater sits within park daylight access, but performances, setup and reserved use follow the event permit schedule.";
    if (n.includes("courts") || n.includes("fields"))
      return "The surrounding park follows posted daylight access. Organized leagues, reservations, lighting, maintenance and field conditions can independently affect play.";
  }
  if (p.id.endsWith("romare-bearden-park")) {
    if (n.includes("sprayground"))
      return "The interactive water feature is seasonal and weather dependent. Verify same-day operation and posted rules; park access does not guarantee that water is running.";
    if (n.includes("waterfall"))
      return "The park remains accessible during posted hours, but the ornamental waterfall can be paused for maintenance, winterization or event operations.";
    if (n.includes("event lawn"))
      return "The lawn's public access changes with permitted events, setup and breakdown. Check the Uptown event calendar before planning an open-lawn visit.";
  }
  if (p.id.endsWith("reedy-creek-park-and-nature-center")) {
    if (n.includes("nature center"))
      return "Reedy Creek Nature Center is open Monday-Saturday 9:00 a.m.-5:00 p.m. and Sunday 1:00-5:00 p.m. The outdoor preserve remains open daily sunup to sundown.";
    if (n.includes("dog park"))
      return "The dog park follows posted daylight access and can close separately for maintenance, saturated ground or safety conditions.";
    if (n.includes("pavilion"))
      return "Laine Clontz Pavilion follows its reservation and event permit time within the park's sunup-to-sundown access.";
  }
  if (p.id.endsWith("mcalpine-creek-community-park")) {
    if (n.includes("fetching meadow"))
      return "The fenced dog park follows posted daylight access and can close independently for maintenance, mud, flooding or gate repairs.";
    if (n.includes("cross country"))
      return "The course is available during park daylight hours outside scheduled meets, course preparation, maintenance and flood closures.";
    if (n.includes("community garden"))
      return "Public paths follow park access, while plots, workdays and organized garden activity follow the garden program's separate rules and schedule.";
  }
  if (p.id.endsWith("park-road-park")) {
    if (n.includes("pavilion") || n.includes("picnic shelters"))
      return "The facility is available within park hours, but reserved use follows the permit time and event setup can limit ordinary access.";
    if (n.includes("fields"))
      return "The fields follow league, reservation, maintenance and playable-condition decisions; an open park does not guarantee an available field.";
  }
  if (p.id.endsWith("little-sugar-creek-greenway")) {
    if (n.includes("freedom park"))
      return "This connection follows daylight greenway and park access, but Freedom Park projects or events can close the adjoining path independently.";
    if (n.includes("park road park"))
      return "This connection follows daylight greenway and park access, but Park Road Park construction, sports events or flooding can alter the approach.";
    if (n.includes("midtown park"))
      return "The public path is intended for daylight use. Nearby retail, parking and programmed spaces keep independent schedules and may not permit trail parking.";
    return "Use this segment during posted daylight hours. Flooding, bridge work, construction and connected-park closures can affect it independently from the rest of Little Sugar Creek Greenway.";
  }
  if (p.id.endsWith("latta-nature-preserve")) {
    if (n.includes("quest"))
      return "Quest Nature Center, including its aquarium and exhibit hall, is open Monday-Saturday 9:00 a.m.-5:00 p.m. and Sunday 1:00-5:00 p.m. The preserve remains open daily sunup to sundown.";
    if (n.includes("equestrian"))
      return "Equestrian trails are available during preserve daylight hours but close when wet. Call the county trail hotline before hauling a horse to the preserve.";
    if (n.includes("canoe launch"))
      return "The launch follows preserve daylight access and can be affected by lake levels, weather, maintenance and program use.";
    if (n.includes("raptor center"))
      return "Carolina Raptor Center is a separately operated, ticketed attraction with its own dated hours, admission and closure notices; preserve hours do not apply.";
  }
  if (p.id.endsWith("mcdowell-nature-preserve")) {
    if (n.includes("nature center") || n.includes("discovery hall"))
      return "McDowell Nature Center and Discovery Hall are open Monday-Saturday 9:00 a.m.-5:00 p.m. and Sunday 1:00-5:00 p.m. The outdoor preserve remains open daily sunup to sundown.";
    if (n.includes("copperhead"))
      return "Copperhead Island is a reservable group campground and event destination. Access, gate entry and overnight use follow the reservation rather than ordinary day-use preserve hours.";
    if (n.includes("campground"))
      return "McDowell Campground access follows the confirmed campsite reservation, check-in instructions and gate rules; do not rely on the Nature Center schedule for arrival.";
    if (n.includes("launch"))
      return "The launch follows preserve daylight access and can be affected by lake level, weather, maintenance and guided-program use.";
  }
  return hasSeparateHours(p, name)
    ? `${p.hours} ${name} has a separate facility, reservation, seasonal or event schedule.`
    : p.hours;
}
function featureSchedule(p, name) {
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
      `Check current Charlotte weather, heat index, air quality, thunderstorm risk and Mecklenburg County alerts. Heavy rain can flood creek greenways and natural trails even when nearby streets or developed park areas remain open.`,
    ],
  ].map((v) => ans(p, ...v));
}
function note(name, parent) {
  const n = name.toLowerCase();
  if (n.includes("splash") || n.includes("fountain"))
    return `${name} is a seasonal, weather-dependent water feature at ${parent}; verify same-day operation and supervision rules.`;
  if (n.includes("dog park") || n.includes("fetching meadow"))
    return `${name} is the designated off-leash area at ${parent}; pause outside the gate, use the posted size area and confirm water and surface conditions before entering.`;
  if (n.includes("lake") || n.includes("pond") || n.includes("waterfront"))
    return `${name} is a water-edge destination at ${parent}; supervise children, follow fishing rules and do not assume swimming or lifeguard coverage is available.`;
  if (n.includes("statue") || n.includes("odyssey") || n.includes("muse"))
    return `${name} is a specific art or history landmark at ${parent}; navigate to this mapped point rather than the broad park pin and leave the work undisturbed.`;
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
  if (p.id.endsWith("mcalpine-creek-community-park") && n.includes("lake")) return 0;
  if (p.id.endsWith("mcalpine-creek-community-park") && n.includes("wetland")) return 1;
  if (p.id.endsWith("mcalpine-creek-community-park") && n.includes("cross country")) return 2;
  if (p.id.endsWith("reedy-creek-park-and-nature-center") && n.includes("play 60")) return 0;
  if (p.id.endsWith("reedy-creek-park-and-nature-center") && n.includes("rockhouse")) return 1;
  if (p.id.endsWith("latta-nature-preserve") && n.includes("quest")) return n.includes("aquarium") ? 2 : 0;
  if (p.id.endsWith("latta-nature-preserve") && n.includes("shoreline")) return 1;
  if (p.id.endsWith("mcdowell-nature-preserve") && n.includes("center")) return 0;
  if (p.id.endsWith("mcdowell-nature-preserve") && n.includes("copperhead")) return 3;
  if (p.id.endsWith("little-sugar-creek-greenway") && n.includes("captain")) return 3;
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
        `${p.hours} This feature may have shorter, seasonal or daylight-only hours.`,
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
      hoursSchedule: featureSchedule(p, name),
      cost: p.cost,
      accessibility: p.accessibility,
      locationContext: description,
      needToKnow: p.need,
      amenities: p.amenities,
      informationSourceLabel: p.operator,
      informationSourceUrl: p.source,
      informationCheckedAt: checkedAt,
      coordinateSource: point.source,
      positionQuality:
        point.quality ||
        (String(point.source).includes("Nominatim")
          ? "public-map-match"
          : String(point.source).includes("reviewed public-map")
            ? "reviewed-map-placement"
            : "official-or-reviewed-placement"),
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
      amenities: p.amenities,
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
      amenities: p.amenities,
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
  console.log(`Super-enriched ${campaign.places.length} Charlotte/Mecklenburg guides.`);
})();
