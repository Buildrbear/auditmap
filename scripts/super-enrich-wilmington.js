#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const campaign = require("../data/wilmington-evidence-gate-campaign.json");
const galleries = require("../data/generated/wilmington-evidence-gate-images.json");
const checkedAt = campaign.checkedAt;
const stateParkSource = "https://getconnected.delaware.gov/agency/detail/?agency_id=176980";
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

const parentOverrides = {
  "launch-de-wilmington-brandywine-park": {
    hours: "Wilmington State Parks lists outdoor park access daily from 8:00 a.m. to sunset. Brandywine Zoo, Baynard Stadium, restrooms, programs, permitted events, and other facilities keep separate schedules and may close independently.",
    accessibility: "Developed roads and paved creekside routes serve portions of Brandywine Park, but grades, bridges, natural edges, weather, flooding, and destination-specific entrances vary. Use the exact destination guidance and do not assume the whole 165-acre park is step-free.",
    transit: "Use DART First State's current trip planner for the exact destination, such as Brandywine Zoo or North Park Drive, because the park spans both sides of the creek and several approaches.",
    researchQueue: [
      "Keep Brandywine Zoo parent-only until a current, representative reusable destination photograph clears rights review; the inherited animal portrait has ambiguous permission wording and the available entrance postcard is historic.",
      "Keep Jasper Crane Rose Garden, the Swinging Footbridge, Sugar Bowl, playgrounds, dog areas, Baynard Stadium, and other facilities in parent guidance until exact current profiles and matching reusable photographs clear together."
    ]
  },
  "launch-de-wilmington-rockford-park": {
    hours: "Wilmington State Parks lists outdoor park access daily from 8:00 a.m. to sunset. Rockford Tower's observation deck is not open daily; the current 2026 Tower Afternoons listing schedules Sundays from 1:00 to 3:00 p.m., May 17 through October 11, weather permitting.",
    accessibility: "Off-street parking and developed park roads reach the hilltop landscape, but the tower, meadow, woodland trails, and other facilities have different grades and surfaces. No operator source reviewed describes the observation deck as step-free.",
    transit: "Use DART First State's current trip planner with 2001 Lookout Drive or the Rockford Tower pin and verify the final uphill walk; do not rely on a stale route number.",
    researchQueue: [
      "Keep the dog park, courts, sports fields, Canby Seat, Samuel Francis Du Pont statue, Bancroft Memorial, sledding areas, and trail segments in parent guidance until exact current destination profiles and matching reusable photographs clear together."
    ]
  }
};

const featureDefinitions = {
  "launch-de-wilmington-brandywine-park": [{
    name: "Josephine Fountain", imageIndex: 2, latitude: 39.75604306, longitude: -75.55080806,
    informationSourceUrl: stateParkSource,
    informationSourceLabel: "Wilmington State Parks",
    coordinateSource: "https://commons.wikimedia.org/wiki/File:Brandywine_Park_Blossoms.JPG",
    positionQuality: "exact-geotagged-destination-photograph",
    description: "The named memorial fountain and garden landmark near North Park Drive in Brandywine Park.",
    hours: "Outdoor viewing follows Wilmington State Parks access, currently listed daily from 8:00 a.m. to sunset. Water operation, horticultural work, events, and maintenance can vary independently.",
    parking: "Use legal park parking near North Park Drive or the river lot and follow event controls. No dedicated fountain parking lot is documented, so route to the exact pin rather than the zoo entrance.",
    restrooms: "No destination-specific restroom is documented at the fountain. Brandywine Zoo restrooms are inside a separately ticketed facility and follow zoo hours, so confirm another open facility if a restroom is essential.",
    cost: "No separate admission is listed for viewing the outdoor fountain. Brandywine Zoo, programs, permits, and ticketed events nearby may charge independently.",
    accessibility: "A developed park approach reaches the fountain area, but no reviewed operator source documents a fully step-free route or the fountain's edge conditions. Confirm the exact approach if grades or surface transitions are a concern.",
    dogs: "Keep dogs on a leash no longer than six feet outside Wilmington's marked off-leash areas, remove waste, and keep animals out of planted beds and the fountain basin.",
    family: "The fountain is a brief outdoor landmark stop rather than a supervised water-play feature. Keep children out of the basin and combine it with a separately planned park or zoo visit.",
    need: "Do not promise that the fountain will be running or flowers will be in bloom. Check park notices for storms, maintenance, events, or seasonal landscape work before making it the purpose of a trip.",
    answerSources: {
      parking: { label: "City of Wilmington", url: "https://www.wilmingtonde.gov/Home/Components/FacilityDirectory/FacilityDirectory/131/118" },
      restroom: { label: "Brandywine Zoo", url: "https://brandywinezoo.org/visit/accessibility/" },
      dogs: { label: "City of Wilmington", url: "https://www.wilmingtonde.gov/government/city-departments/department-of-parks-and-recreation/wilmington-s-dog-parks" }
    }
  }],
  "launch-de-wilmington-rockford-park": [{
    name: "Rockford Tower", imageIndex: 1, latitude: 39.7673868, longitude: -75.574666,
    informationSourceUrl: "https://www.wilmingtonde.gov/Home/Components/FacilityDirectory/FacilityDirectory/223/118",
    informationSourceLabel: "City of Wilmington",
    coordinateSource: "https://www.openstreetmap.org/way/302761632",
    positionQuality: "exact-named-open-map-building",
    description: "The historic stone water tower and scheduled observation deck at Rockford Park's hilltop.",
    hours: "Outdoor viewing follows park access. The current 2026 Rockford Tower Afternoons listing schedules observation-deck access Sundays from 1:00 to 3:00 p.m., May 17 through October 11; the tower may close for inclement weather.",
    parking: "Use Rockford Park's documented off-street parking and follow temporary event signs. The tower stands on the hilltop near the park loop, but major events can change the closest legal space.",
    restrooms: "The City lists public restrooms at Rockford Park, but it does not publish destination-specific restroom hours for the tower. Verify availability when a restroom is essential.",
    cost: "Outdoor tower viewing is part of ordinary park access. The current Tower Afternoons listing does not state a separate admission fee; verify the event listing before traveling for observation-deck entry.",
    accessibility: "The named OpenStreetMap tower object is tagged wheelchair=no, and no reviewed operator source describes the observation deck as step-free. Treat the climb and deck as inaccessible unless the operator confirms an accommodation; hilltop ground access is a separate question.",
    dogs: "Dogs must remain controlled under current park rules outside the designated Rockford dog area. Keep them away from the tower entrance and any program queue, and remove waste.",
    family: "The tower is a visible family landmark from the lawn, while deck access is a scheduled climb rather than an always-open attraction. Closely supervise children on stairs and follow staff directions.",
    need: "Check the same-day schedule and weather before visiting to climb. The observation deck can close for inclement weather, and concerts, the Flower Market, or other events can change parking and access.",
    answerSources: {
      hours: { label: "Greater Wilmington Convention & Visitors Bureau", url: "https://www.visitwilmingtonde.com/listing/rockford-park/940/" },
      fees: { label: "Greater Wilmington Convention & Visitors Bureau", url: "https://www.visitwilmingtonde.com/listing/rockford-park/940/" },
      accessibility: { label: "OpenStreetMap contributors", url: "https://www.openstreetmap.org/way/302761632" },
      family: { label: "Greater Wilmington Convention & Visitors Bureau", url: "https://www.visitwilmingtonde.com/listing/rockford-park/940/" },
      "need-to-know": { label: "Greater Wilmington Convention & Visitors Bureau", url: "https://www.visitwilmingtonde.com/listing/rockford-park/940/" }
    }
  }]
};

const requiredParentAnswers = {
  "launch-de-wilmington-brandywine-park": [
    ["hours", "When is Brandywine Park open?", "Wilmington State Parks currently lists outdoor park access daily from 8:00 a.m. to sunset. The zoo, stadium, programs, permitted events, and restrooms use separate schedules and may close independently.", "Wilmington State Parks", stateParkSource],
    ["parking", "Where should I park at Brandywine Park?", "Use the official 1001 N. Park Drive address, then choose legal parking for the exact destination. The City lists off-street parking, while Brandywine Zoo directs visitors to the free river lot across from the zoo and limited accessible spaces nearer its entrance.", "City of Wilmington", "https://www.wilmingtonde.gov/Home/Components/FacilityDirectory/FacilityDirectory/131/118"],
    ["entrance", "Which entrance should I use for Brandywine Park?", "There is no single useful entrance for the full 165-acre creekside park. Route to the zoo, Josephine Fountain, Jasper Crane Rose Garden, Baynard Stadium, or another named destination and follow current signs from North Park Drive or the appropriate neighborhood approach.", "City of Wilmington", "https://www.wilmingtonde.gov/Home/Components/FacilityDirectory/FacilityDirectory/131/118"],
    ["restroom", "Where are restrooms in Brandywine Park?", "The City park listing does not identify a general restroom building. Brandywine Zoo has accessible restrooms near its front entrance, but they are inside a separately ticketed facility and follow zoo hours; verify another open facility if a restroom is essential.", "Brandywine Zoo", "https://brandywinezoo.org/visit/accessibility/"],
    ["fees", "Is Brandywine Park free?", "No general outdoor park admission is listed. Brandywine Zoo has seasonal admission prices, and programs, reservations, stadium use, and ticketed events may charge separately.", "Brandywine Zoo", "https://brandywinezoo.org/visit/"],
    ["accessibility", "What accessible routes are documented at Brandywine Park?", "The reviewed City source documents developed park amenities and off-street parking but does not describe the entire park as accessible. Brandywine Zoo separately documents accessible exhibits, entrance restrooms, limited accessible parking, and slope limitations; verify the exact destination rather than generalizing that guidance to all park routes.", "Brandywine Zoo", "https://brandywinezoo.org/visit/accessibility/"],
    ["dogs", "Are dogs allowed at Brandywine Park?", "Wilmington lists two designated off-leash areas in Brandywine Park. Outside their marked boundaries, keep dogs on a leash no longer than six feet and remove waste; Brandywine Zoo prohibits pets and applies separate service-animal rules.", "City of Wilmington", "https://www.wilmingtonde.gov/government/city-departments/department-of-parks-and-recreation/wilmington-s-dog-parks"],
    ["family", "What should families plan at Brandywine Park?", "Choose a specific combination such as creekside paths, playground equipment, picnic space, gardens, or a separately ticketed zoo visit. The City lists these amenities across a large park, so route to the intended zone and do not treat the creek or memorial fountain as supervised water play.", "City of Wilmington", "https://www.wilmingtonde.gov/Home/Components/FacilityDirectory/FacilityDirectory/131/118"],
    ["transit", "Can I reach Brandywine Park without a car?", "Use DART First State's live trip planner for the exact destination and confirm the final walk. A route to Brandywine Zoo or North Park Drive is more useful than a generic park search because entrances lie on both sides of the creek.", "DART First State", "https://www.dartfirststate.com/map/"],
    ["need-to-know", "What is most likely to disrupt a Brandywine Park visit?", "The zoo, stadium, events, gardens, and outdoor park do not share one schedule. Check the exact destination, follow posted road and path controls, and avoid confusing this Wilmington park with Brandywine Creek State Park or Brandywine Springs Park.", "City of Wilmington", "https://www.wilmingtonde.gov/Home/Components/FacilityDirectory/FacilityDirectory/131/118"],
    ["weather", "How does weather affect Brandywine Park?", "Creekside routes, gardens, open recreation areas, and events are weather-exposed. Check current park and zoo notices after storms or during extreme heat or cold, and never assume the creek is a managed swimming area.", "Wilmington State Parks", stateParkSource]
  ],
  "launch-de-wilmington-rockford-park": [
    ["hours", "When is Rockford Park open?", "Wilmington State Parks currently lists outdoor park access daily from 8:00 a.m. to sunset. Rockford Tower observation-deck access is separately scheduled and can close for weather.", "Wilmington State Parks", stateParkSource],
    ["parking", "Where should I park at Rockford Park?", "Use the official 2001 Lookout Drive address and Rockford Park's documented off-street parking. Follow temporary signs during the Flower Market, concerts, sports, and other events rather than relying on normal circulation.", "City of Wilmington", "https://www.wilmingtonde.gov/Home/Components/FacilityDirectory/FacilityDirectory/223/118"],
    ["entrance", "Which entrance should I use for Rockford Park?", "Use 2001 Lookout Drive for the official listing and route to the exact destination. Rockford Road, Red Oak Road, Park Drive, Tower Road, and Riverview Avenue reach different edges of the park.", "City of Wilmington", "https://www.wilmingtonde.gov/Home/Components/FacilityDirectory/FacilityDirectory/223/118"],
    ["restroom", "Are restrooms available at Rockford Park?", "The City lists public restrooms among Rockford Park's amenities, but it does not publish destination-specific operating hours. Verify availability when a restroom is essential.", "City of Wilmington", "https://www.wilmingtonde.gov/Home/Components/FacilityDirectory/FacilityDirectory/223/118"],
    ["fees", "Is Rockford Park free?", "No general outdoor park admission is listed. Permits, reserved facilities, organized programs, and special events may use separate terms, so verify the exact activity.", "City of Wilmington", "https://www.wilmingtonde.gov/Home/Components/FacilityDirectory/FacilityDirectory/223/118"],
    ["accessibility", "What accessible routes are documented at Rockford Park?", "The City documents off-street parking and developed amenities but does not describe the whole park or tower observation deck as step-free. The hilltop, meadow, and woodland routes vary in grade and surface; confirm the exact destination before relying on an accessible route.", "City of Wilmington", "https://www.wilmingtonde.gov/Home/Components/FacilityDirectory/FacilityDirectory/223/118"],
    ["dogs", "Are dogs allowed at Rockford Park?", "The City lists a designated dog park. Keep dogs controlled outside that marked off-leash area, remove waste, and follow posted Delaware State Parks rules around the tower, courts, fields, and events.", "City of Wilmington", "https://www.wilmingtonde.gov/Home/Components/FacilityDirectory/FacilityDirectory/223/118"],
    ["family", "What should families plan at Rockford Park?", "The City lists open fields, picnic areas, courts, ball fields, walking routes, and the tower landmark. Observation-deck entry is separately scheduled, so do not promise a climb on an ordinary park visit.", "City of Wilmington", "https://www.wilmingtonde.gov/Home/Components/FacilityDirectory/FacilityDirectory/223/118"],
    ["transit", "Can I reach Rockford Park without a car?", "Use DART First State's current trip planner with 2001 Lookout Drive or Rockford Tower and confirm the final uphill walk. Do not rely on a route number copied from an older guide.", "DART First State", "https://www.dartfirststate.com/routes/"],
    ["need-to-know", "What is most likely to disrupt a Rockford Park visit?", "Tower programs, the Flower Market, concerts, permitted events, winter conditions, and field use can change parking or access. Check the exact destination and same-day notices before leaving.", "City of Wilmington", "https://www.wilmingtonde.gov/Home/Components/FacilityDirectory/FacilityDirectory/223/118"],
    ["weather", "How does weather affect Rockford Park?", "The broad hilltop lawn, courts, fields, and tower grounds are exposed. Current Tower Afternoons guidance warns that the observation deck may close for inclement weather; use an enclosed vehicle or confirmed-open substantial building during severe weather rather than trees or the tower.", "Greater Wilmington Convention & Visitors Bureau", "https://www.visitwilmingtonde.com/listing/rockford-park/940/"]
  ]
};

function normalizeAnswer(answer) {
  const intent = answer.intentKey || "need-to-know";
  return {
    ...answer,
    sourceLabel: answer.sourceLabel || "City of Wilmington",
    verifiedAt: checkedAt,
    checkedAt,
    freshnessClass: ["hours", "parking", "closures", "transit"].includes(intent) ? "fast" : "slow",
    status: "verified",
  };
}

function mergeParentAnswers(parentId, existing) {
  const required = (requiredParentAnswers[parentId] || []).map(([intentKey, question, answer, sourceLabel, source]) => normalizeAnswer({
    intentKey, question, answer, sourceLabel, source,
    sourceType: sourceLabel === "Greater Wilmington Convention & Visitors Bureau" ? "destination-marketing" : "official",
  }));
  const replaced = new Set(required.map((answer) => answer.intentKey));
  return [...existing.filter((answer) => !replaced.has(answer.intentKey)).map(normalizeAnswer), ...required];
}

function feature(parent, definition, images) {
  const featureSlug = slug(definition.name);
  const featureId = stableId(parent.id, featureSlug);
  const image = { ...images[definition.imageIndex], featureId, latitude: definition.latitude, longitude: definition.longitude, alt: `${definition.name} at ${parent.name}` };
  const values = [
    ["location", `Where exactly is ${definition.name}?`, definition.description],
    ["parking", `Where should I park for ${definition.name}?`, definition.parking],
    ["hours", `When is ${definition.name} open?`, definition.hours],
    ["restroom", `Are there restrooms near ${definition.name}?`, definition.restrooms],
    ["fees", `Is ${definition.name} free?`, definition.cost],
    ["accessibility", `How accessible is ${definition.name}?`, definition.accessibility],
    ["dogs", `Are dogs allowed at ${definition.name}?`, definition.dogs],
    ["family", `Is ${definition.name} good for children?`, definition.family],
    ["need-to-know", `What should I know before visiting ${definition.name}?`, definition.need],
  ];
  const answers = values.map(([intentKey, question, answer]) => {
    const source = definition.answerSources?.[intentKey] || { label: definition.informationSourceLabel, url: definition.informationSourceUrl };
    return {
      intentKey, question, answer, sourceLabel: source.label, source: source.url,
      verifiedAt: checkedAt, checkedAt,
      freshnessClass: ["hours", "parking", "need-to-know"].includes(intentKey) ? "fast" : "slow",
      status: "verified",
    };
  });
  return {
    id: featureId, slug: featureSlug, name: definition.name, feature_type: "destination",
    description: definition.description, latitude: definition.latitude, longitude: definition.longitude,
    details: {
      category: "destination", includeInParentGallery: true, address: parent.address,
      hours: definition.hours, hoursSchedule: false, cost: definition.cost,
      accessibility: definition.accessibility, locationContext: definition.description,
      needToKnow: definition.need, informationSourceLabel: definition.informationSourceLabel,
      informationSourceUrl: definition.informationSourceUrl, informationCheckedAt: checkedAt,
      coordinateSource: definition.coordinateSource, positionQuality: definition.positionQuality,
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
  const vercelPath = path.join(root, "vercel.json");
  const originalVercelText = fs.readFileSync(vercelPath, "utf8");
  const vercel = JSON.parse(originalVercelText);
  for (const scope of campaign.places) {
    const prior = launch.find((item) => item.id === scope.id);
    const parentFacts = national.parks[scope.id];
    if (!prior || !parentFacts) throw new Error(`${scope.name}: existing parent record missing`);
    const images = galleries.places[scope.id]?.images || [];
    if (images.length !== 4) throw new Error(`${scope.name}: evidence-gate gallery mismatch`);
    const definitions = featureDefinitions[scope.id] || [];
    const overrides = parentOverrides[scope.id];
    const base = { ...prior, ...parentFacts, id: scope.id, name: scope.name, city: scope.city, state: scope.state, address: scope.address };
    const answers = mergeParentAnswers(scope.id, parentFacts.searchAnswers || prior.searchAnswers || []);
    const features = definitions.map((definition) => feature(base, definition, images));
    const sources = [
      { label: "City of Wilmington", url: scope.officialSource },
      { label: "Wilmington State Parks", url: stateParkSource },
      ...answers.map((answer) => ({ label: answer.sourceLabel, url: answer.source })),
      ...definitions.flatMap((definition) => [
        { label: definition.informationSourceLabel, url: definition.informationSourceUrl },
        { label: "Coordinate provenance", url: definition.coordinateSource },
        ...Object.values(definition.answerSources || {}),
      ]),
    ].filter((item) => item.url?.startsWith("https://"))
      .filter((item, index, list) => list.findIndex((other) => other.url === item.url) === index);
    const record = {
      ...prior, name: scope.name, city: scope.city, state: scope.state, address: scope.address,
      summary: parentFacts.summary, hours: overrides.hours, hoursSchedule: false,
      cost: parentFacts.cost, accessibility: overrides.accessibility, transit: overrides.transit,
      sourceLabel: "City of Wilmington", source: scope.officialSource,
      operator: "Delaware Division of Parks and Recreation", verifiedAt: checkedAt,
      image: images[0], images: images.slice(1), sources, searchAnswers: answers, features,
      likelySubsites: features.length > 0, publishStatus: "super-enriched",
      researchQueue: overrides.researchQueue,
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
  const retirementRedirect = {
    source: "/us/de/wilmington/parks/brandywine-park/brandywine-zoo",
    destination: "/us/de/wilmington/parks/brandywine-park",
    permanent: true,
  };
  if (!(vercel.redirects || []).some((item) => item.source === retirementRedirect.source)) {
    const redirectLine = `    { "source": ${JSON.stringify(retirementRedirect.source)}, "destination": ${JSON.stringify(retirementRedirect.destination)}, "permanent": true },\n`;
    fs.writeFileSync(vercelPath, originalVercelText.replace('  "redirects": [\n', `  "redirects": [\n${redirectLine}`));
  }
  console.log(`Rebuilt ${campaign.places.length} Wilmington guides, published ${Object.values(featureDefinitions).flat().length} exact destinations, and retained 1 permanent retirement redirect.`);
})();
