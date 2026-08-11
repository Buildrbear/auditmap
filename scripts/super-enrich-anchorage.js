#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const campaign = require("../data/anchorage-evidence-gate-campaign.json");
const galleries = require("../data/generated/anchorage-evidence-gate-images.json");
const checkedAt = campaign.checkedAt;
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const upsert = (document, record) => {
  const index = document.parks.findIndex((item) => item.id === record.id);
  if (index >= 0) document.parks[index] = record;
  else document.parks.push(record);
};
const stableId = (parentId, featureSlug) => {
  const bytes = crypto.createHash("sha256").update(`auditmap:${parentId}:${featureSlug}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const value = bytes.toString("hex");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
};
const featureDefinitions = {
  "launch-ak-anchorage-kincaid-park": [{
    name: "Kincaid Beach", imageIndex: 2, latitude: 61.155515, longitude: -150.073843,
    informationSourceUrl: "https://www.muni.org/Departments/parks/Documents/PRC%2015-09%20SR-RES.pdf",
    informationSourceLabel: "Municipality of Anchorage Parks and Recreation Commission",
    coordinateSource: "https://commons.wikimedia.org/wiki/File:Kincaid_Beach,_Alaska_-_panoramio.jpg",
    description: "The natural Cook Inlet shoreline reached by a soft-surface spur from the Tony Knowles Coastal Trail.",
    hours: "Use only while Kincaid Park access and the connecting trail are open; daylight, snow, ice, tides, and maintenance can change practical access.",
    parking: "Park at Kincaid Park's Raspberry Road visitor area and follow the mapped Coastal Trail connection and Kincaid Beach spur. There is no beach-side vehicle lot.",
    restrooms: "No destination-specific restroom is documented at the beach. Use the public facilities at Kincaid Outdoor Center before starting the trail and confirm that the center is open.",
    cost: "General park, trail, and shoreline access are free; programs and rentals elsewhere in Kincaid Park may charge.",
    accessibility: "The final beach route is a soft-surface trail and the shoreline is natural, uneven, snowy, icy, or muddy depending on conditions. Do not describe it as a step-free beach facility.",
    dogs: "Follow current Kincaid trail leash and wildlife rules, keep full control, and remove waste. Avoid wildlife and never allow a dog onto the tidal mudflats.",
    family: "Families can use the trail and shoreline viewpoint, but the route is not a supervised beach. Keep children off the tidal mudflats and plan for cold, wind, wildlife, and a return hike.",
    need: "Treat the mudflats as hazardous and stay on firm upland or beach surfaces. Check tides, daylight, weather, wildlife notices, and trail conditions before making the shoreline the purpose of the trip."
  }],
  "launch-ak-anchorage-delaney-park-strip": [
    {
      name: "Centennial Rose Garden", imageIndex: 2, latitude: 61.2131713, longitude: -149.9084078,
      informationSourceUrl: "https://www.muni.org/Departments/parks/Documents/DelaneyParkMP.pdf",
      informationSourceLabel: "Municipality of Anchorage",
      coordinateSource: "https://www.openstreetmap.org/way/627649066",
      description: "The named garden at Delaney Park Strip's west end near N Street, with flower beds, lawn, paths, and mature trees.",
      hours: "The garden follows posted Delaney Park access and seasonal horticultural operations; flowers and maintenance vary across Anchorage's short growing season.",
      parking: "Use legal street parking nearest N Street and the west end of the Park Strip; observe downtown restrictions, winter operations, and event controls.",
      restrooms: "No permanent destination-specific restroom is documented at the garden. Plan to use a confirmed-open downtown facility or event-provided restroom.",
      cost: "Casual garden access is free; permitted events or reserved uses may charge.",
      accessibility: "The municipal master plan calls for ADA improvements, and paved walks approach the garden, but snow, ice, turf edges, and seasonal maintenance can affect the usable route.",
      dogs: "Dogs are not permitted off leash at Delaney Park Strip. Keep them controlled and away from planted beds, and remove waste.",
      family: "The small garden is suited to a short, quiet stop, but it has no supervised play facility or dependable restroom of its own.",
      need: "Expect a seasonal garden rather than year-round bloom. Do not enter beds, and check for event fencing, snow work, or horticultural maintenance."
    },
    {
      name: "Alaska Railroad No. 556", imageIndex: 3, latitude: 61.213377, longitude: -149.891006,
      informationSourceUrl: "https://www.muni.org/departments/parks/documents/delaneyparkmemorialpolicy.pdf",
      informationSourceLabel: "Municipality of Anchorage",
      coordinateSource: "https://www.openstreetmap.org/node/2117423017",
      description: "The historic steam locomotive displayed near E Street at the east end of Delaney Park Strip.",
      hours: "The outdoor artifact follows posted Delaney Park access; barriers, preservation work, events, snow, or ice can restrict close approach.",
      parking: "Use legal downtown street parking near E Street and 9th or 10th Avenue. Event and winter restrictions can change the closest usable space.",
      restrooms: "No destination-specific public restroom is documented at the locomotive. Use a confirmed-open downtown facility or event plan.",
      cost: "Viewing the outdoor locomotive is free; nearby events or reserved activities may charge.",
      accessibility: "Paved downtown sidewalks approach the display, but curbs, snow, ice, temporary fencing, and the artifact's own steps can limit access. Viewing does not require climbing onto it.",
      dogs: "Dogs must remain leashed and controlled at Delaney Park Strip; keep them clear of the artifact, fencing, and active recreation areas.",
      family: "The locomotive is an engaging historic stop, but adults should treat it as an artifact and obey current barriers rather than promise that climbing is allowed.",
      need: "The reuse photograph shows temporary fencing in 2011 and does not prove today's hands-on access. Follow current barriers and preservation notices at the site."
    }
  ]
};

function normalizeAnswer(answer) {
  const intent = answer.intentKey || "need-to-know";
  return {
    ...answer,
    sourceLabel: answer.sourceLabel || "Municipality of Anchorage",
    source: answer.source,
    verifiedAt: checkedAt,
    checkedAt,
    freshnessClass: ["hours", "parking", "closures", "transit"].includes(intent) ? "fast" : "slow",
    status: "verified",
  };
}

function feature(parent, definition, images) {
  const featureSlug = slug(definition.name);
  const featureId = stableId(parent.id, featureSlug);
  const image = { ...images[definition.imageIndex], featureId, latitude: definition.latitude, longitude: definition.longitude, alt: `${definition.name} at ${parent.name}` };
  const answers = [
    ["location", `Where exactly is ${definition.name}?`, definition.description],
    ["parking", `Where should I park for ${definition.name}?`, definition.parking],
    ["hours", `When is ${definition.name} open?`, definition.hours],
    ["restroom", `Are there restrooms near ${definition.name}?`, definition.restrooms],
    ["fees", `Is ${definition.name} free?`, definition.cost],
    ["accessibility", `How accessible is ${definition.name}?`, definition.accessibility],
    ["dogs", `Are dogs allowed at ${definition.name}?`, definition.dogs],
    ["family", `Is ${definition.name} good for children?`, definition.family],
    ["need-to-know", `What should I know before visiting ${definition.name}?`, definition.need],
  ].map(([intentKey, question, answer]) => ({
    intentKey, question, answer, sourceLabel: definition.informationSourceLabel,
    source: definition.informationSourceUrl, verifiedAt: checkedAt,
    freshnessClass: ["hours", "parking", "need-to-know"].includes(intentKey) ? "fast" : "slow", status: "verified",
  }));
  return {
    id: featureId, slug: featureSlug, name: definition.name, feature_type: "destination",
    description: definition.description, latitude: definition.latitude, longitude: definition.longitude,
    details: {
      category: "destination", includeInParentGallery: true, address: parent.address,
      hours: definition.hours, hoursSchedule: false, cost: definition.cost,
      accessibility: definition.accessibility, locationContext: definition.description,
      needToKnow: definition.need, informationSourceLabel: definition.informationSourceLabel,
      informationSourceUrl: definition.informationSourceUrl, informationCheckedAt: checkedAt,
      coordinateSource: definition.coordinateSource, positionQuality: "exact-geotag-or-named-open-map-object",
      imageUrl: image.url, imageSourceUrl: image.source, imageAuthor: image.author,
      imageLicense: image.license, imageAlt: image.alt, images: [image], searchAnswers: answers,
    },
    source_label: definition.informationSourceLabel, source_url: definition.informationSourceUrl, verified_at: checkedAt,
  };
}

(() => {
  const all = read("data/generated/all-subsites-ready.json");
  const pilot = read("data/generated/pilot-subsites-ready.json");
  const launch = read("data/generated/launch-map-places.json");
  const national = read("data/parent-park-information-enrichment-national.json");
  const campaignParents = read("data/parent-park-information-enrichment-campaign.json");
  const locations = read("data/launch-location-overrides.json");
  for (const scope of campaign.places) {
    const prior = launch.find((item) => item.id === scope.id);
    const parentFacts = national.parks[scope.id];
    if (!prior || !parentFacts) throw new Error(`${scope.name}: existing parent record missing`);
    const images = galleries.places[scope.id]?.images || [];
    const deferred = Boolean(scope.deferRelease);
    if (deferred ? images.length < 1 || images.length >= 4 : images.length !== 4) throw new Error(`${scope.name}: evidence-gate gallery mismatch`);
    const definitions = deferred ? [] : (featureDefinitions[scope.id] || []);
    const base = { ...prior, ...parentFacts, id: scope.id, name: scope.name, city: scope.city, state: scope.state, address: scope.address };
    const answers = (parentFacts.searchAnswers || prior.searchAnswers || []).map(normalizeAnswer);
    const parentHours = scope.id === "launch-ak-anchorage-kincaid-park"
      ? "Kincaid Outdoor Center is currently listed daily from 12:30 to 8:00 p.m. Raspberry Road gates are listed daily from 10:00 a.m. to 10:00 p.m. (to 11:00 p.m. June through August), while the Jodhpur gate is listed daily from 10:00 a.m. to 9:00 p.m. Facilities and programmed areas can close independently."
      : parentFacts.hours;
    if (scope.id === "launch-ak-anchorage-kincaid-park") {
      const hoursAnswer = answers.find((answer) => answer.intentKey === "hours");
      if (hoursAnswer) {
        hoursAnswer.answer = parentHours;
        hoursAnswer.sourceLabel = "Municipality of Anchorage";
        hoursAnswer.source = scope.officialSource;
      }
    }
    const features = definitions.map((definition) => feature(base, definition, images));
    const sources = [{ label: "Municipality of Anchorage", url: scope.officialSource }, ...answers.map((answer) => ({ label: answer.sourceLabel, url: answer.source })), ...definitions.map((definition) => ({ label: definition.informationSourceLabel, url: definition.informationSourceUrl }))]
      .filter((item) => item.url?.startsWith("https://"))
      .filter((item, index, list) => list.findIndex((other) => other.url === item.url) === index);
    const record = {
      ...prior, name: scope.name, city: scope.city, state: scope.state, address: scope.address,
      summary: parentFacts.summary, hours: parentHours, hoursSchedule: parentFacts.hoursSchedule || false,
      cost: parentFacts.cost, accessibility: parentFacts.accessibility || prior.accessibility,
      sourceLabel: "Municipality of Anchorage", source: scope.officialSource,
      operator: "Municipality of Anchorage Parks and Recreation", verifiedAt: checkedAt,
      image: images[0], images: images.slice(1), sources, searchAnswers: answers, features,
      likelySubsites: !deferred && features.length > 0,
      publishStatus: deferred ? "photo-gated-deferred" : "super-enriched",
      researchQueue: deferred ? [scope.reviewNote] : [],
    };
    upsert(all, record);
    upsert(pilot, record);
    const launchIndex = launch.findIndex((item) => item.id === record.id);
    launch[launchIndex] = record;
    const persistedParent = {
      name: scope.name, city: scope.city, citySlug: prior.citySlug, operator: record.operator,
      sourceLabel: record.sourceLabel, source: record.source, address: record.address,
      summary: record.summary, hours: record.hours, hoursSchedule: record.hoursSchedule,
      cost: record.cost, accessibility: record.accessibility, transit: record.transit,
      searchAnswers: answers, image: images[0], additionalImages: images.slice(1), replaceImages: true, verifiedAt: checkedAt,
    };
    national.parks[scope.id] = persistedParent;
    campaignParents.parks[scope.id] = persistedParent;
    const location = {
      id: scope.id, park: scope.name, city: scope.city, state: scope.state,
      latitude: record.latitude, longitude: record.longitude, address: record.address,
      displayName: `${scope.name}, ${scope.city}, ${scope.state}`,
      source: record.operator, sourceUrl: record.source, checkedAt,
    };
    const locationIndex = locations.findIndex((item) => item.id === scope.id);
    if (locationIndex >= 0) locations[locationIndex] = location;
    else locations.push(location);
  }
  write("data/generated/all-subsites-ready.json", all);
  write("data/generated/pilot-subsites-ready.json", pilot);
  write("data/generated/launch-map-places.json", launch);
  write("data/parent-park-information-enrichment-national.json", national);
  write("data/parent-park-information-enrichment-campaign.json", campaignParents);
  write("data/launch-location-overrides.json", locations);
  const deferredCount = campaign.places.filter((place) => place.deferRelease).length;
  const destinationCount = Object.values(featureDefinitions).flat().length;
  console.log(`Rebuilt ${campaign.places.length - deferredCount} Anchorage guides, retained ${deferredCount} photo-gated parent, and published ${destinationCount} exact destinations.`);
})();
