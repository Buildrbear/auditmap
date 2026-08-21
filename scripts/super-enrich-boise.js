#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/boise-evidence-gate-campaign.json");
const galleries = require("../data/generated/boise-evidence-gate-images.json");
const checkedAt = campaign.checkedAt;
const transit = "https://www.valleyregionaltransit.org/trip-planner/";
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const upsertPark = (document, record) => {
  const index = document.parks.findIndex((item) => item.id === record.id);
  if (index >= 0) document.parks[index] = record;
  else document.parks.push(record);
};

const guidance = {
  "launch-id-boise-ann-morrison-park": {
    summary: "Ann Morrison Park is a 153-acre Boise River park with a large accessible playground, Greenbelt access, a seasonal river-float takeout, Dog Island, disc golf, sports fields and courts, an outdoor gym, splash pad, picnic shelter, restrooms, and broad lawns.",
    hours: "The park is open daily from sunrise to sunset. Only lighted ballfields may remain open until 11 p.m.",
    cost: "The City of Boise does not list a general admission charge. Inside-park float parking is first-come, first-served and free, while reservations and the seasonal shuttle can have separate charges.",
    accessibility: "The official page lists 23 ADA parking spaces and a playground with universally accessible bonded-rubber surfacing. Conditions and routes to other facilities vary, so confirm the exact amenity before relying on step-free access.",
    transit: "Use Valley Regional Transit's current trip planner for service to 1000 South Americana Boulevard and verify the final walk and return time. The park page does not promise a particular route or frequency.",
    researchQueue: [
      "Secure exact named map objects for the photographed playground, fountain, and Dog Island before publishing them; also research disc golf, river-float takeout, Greenbelt access, fields, courts, shelters, and restrooms.",
      "Keep Dog Island, the playground, fountain and river-float takeout in parent guidance until exact current positions, destination-specific profiles and matching reusable photographs clear together.",
      "Keep the disc-golf course, traffic garden, courts, sports fields, outdoor gym, shelter and Greenbelt connections parent-only until their separate evidence packages clear.",
      "Recheck splash-pad and river-float operations before seasonal travel; general park hours do not prove either feature is operating."
    ],
    answers: [
      ["hours", "When is Ann Morrison Park open?", "The park is open daily from sunrise to sunset. Only lighted ballfields may remain open until 11 p.m."],
      ["parking", "Where can I park at Ann Morrison Park?", "Use the on-site parking reached from the park entrances. The City lists 23 ADA spaces, prohibits overnight parking, and says float parking inside the park is first-come, first-served and free."],
      ["entrance", "Which entrance should I use for Ann Morrison Park?", "Navigate to 1000 South Americana Boulevard, then follow internal signs for the planned activity. The disc-golf start, Dog Island, playground, fields and river takeout occupy different parts of this large park."],
      ["restroom", "Are restrooms available at Ann Morrison Park?", "Yes. Three of the five restrooms by the playground are open year-round, and portable restrooms are available year-round near Together Treasure Valley Dog Island."],
      ["fees", "Is Ann Morrison Park free?", "The City does not list a general admission charge. Inside-park float parking is first-come, first-served and free; shelter or field reservations and the seasonal river shuttle can have separate charges."],
      ["accessibility", "How accessible is Ann Morrison Park?", "The official page lists 23 ADA parking spaces and universally accessible bonded-rubber surfacing at the playground. Routes and surfaces to other park features vary, so confirm the exact amenity before relying on step-free access."],
      ["dogs", "Where can dogs go off leash at Ann Morrison Park?", "Together Treasure Valley Dog Island is a year-round 5.4-acre off-leash area in the southwest corner with a fenced shy-dog area and a swimming pond. The broader park is seasonally off leash from November 1 through the end of February; follow leash rules when traveling to and from the dog area."],
      ["family", "What can families do at Ann Morrison Park?", "The playground serves ages 2–12 and has swings and accessible surfacing. Families can also use lawns, paths, courts and the seasonal splash pad, which the City lists from sunrise to sunset between Memorial Day and Labor Day."],
      ["transit", "Can I reach Ann Morrison Park without a car?", "Use Valley Regional Transit's current trip planner for 1000 South Americana Boulevard and verify the final walk and return time. The park page does not promise a particular route or frequency.", "Valley Regional Transit", transit],
      ["need-to-know", "What should I verify before visiting Ann Morrison Park?", "Check seasonal splash-pad and Boise River float operations separately from general park hours. The float takeout is river-left before the bridge, and posted closures, water conditions and event reservations override ordinary use."],
      ["weather", "How does weather affect Ann Morrison Park?", "Large lawns, sports fields, the river edge and splash pad are exposed to sun, heat, wind and storms. River conditions and seasonal operations can change independently of the park's sunrise-to-sunset schedule."],
      ["splash-pad", "When does the Ann Morrison splash pad operate?", "The City lists daily operation from sunrise to sunset between Memorial Day and Labor Day. Weather, maintenance and posted closures can interrupt that seasonal schedule."],
      ["river-float", "Where does the Boise River float end at Ann Morrison Park?", "The takeout is river-left just before the bridge. The shuttle pickup and drop-off is across the grass on the park's main road, and an additional floater drop-off area is next to the playground."],
      ["disc-golf", "Does Ann Morrison Park have disc golf?", "Yes. The official page describes an 18-hole course that starts off the Americana Boulevard entrance. Follow the current layout and signs because holes have been relocated or added as the park changes."],
      ["reservations", "Can I reserve a shelter at Ann Morrison Park?", "Yes. The park shelter can be reserved for events, picnics and ceremonies. The City says reservations for this park open January 1 each year; use the current reservation system for availability and charges."]
    ]
  },
  "launch-id-boise-kathryn-albertson-park": {
    summary: "Kathryn Albertson Park is a 41-acre quiet-use wildlife park near downtown Boise with wide paved footpaths, ponds and riparian habitat, open lawns, wildlife viewing, restrooms, parking, and two small reservable outdoor gazebos.",
    hours: "The park is open daily from sunrise to sunset.",
    cost: "The City of Boise does not list a general admission or parking charge. The two small ceremony facilities use a separate reservation process and may have fees.",
    accessibility: "The City describes wide, paved footpaths and on-site parking. It does not provide a route-by-route accessibility statement on the reviewed page, so confirm the exact gazebo, restroom or path condition before relying on step-free access.",
    transit: "Use Valley Regional Transit's current trip planner for service to 1001 South Americana Boulevard and verify the final walk and return time. The park page does not promise a particular route or frequency.",
    researchQueue: [
      "Keep The Rookery and The Eyrie in parent guidance until exact operator-confirmed positions, current reservation details, destination accessibility and complete destination profiles clear together.",
      "Keep Quail Corners, Riparian Run, ponds, overlooks and the main loop parent-only until each has an authoritative destination profile in addition to exact photographic evidence.",
      "Recheck the Russian olive removal project and any posted habitat closures before travel; construction or wildlife protection can change path access."
    ],
    answers: [
      ["hours", "When is Kathryn Albertson Park open?", "The park is open daily from sunrise to sunset."],
      ["parking", "Is there parking at Kathryn Albertson Park?", "Yes. The City lists on-site parking. Navigate to 1001 South Americana Boulevard and use this park's own entrance rather than assuming the adjacent Ann Morrison lots are the same destination."],
      ["entrance", "Where is the entrance to Kathryn Albertson Park?", "Use 1001 South Americana Boulevard. Kathryn Albertson is next to Ann Morrison Park but has its own entrance, parking and quiet wildlife-focused path system."],
      ["restroom", "Are restrooms available at Kathryn Albertson Park?", "Yes. The City says park restrooms are open and links to its current park-restroom information for year-round availability. Recheck before relying on a specific building or seasonal status."],
      ["fees", "Is Kathryn Albertson Park free?", "The City does not list a general admission or parking charge. Reserving one of the two small ceremony facilities uses a separate process and may have fees."],
      ["accessibility", "How accessible is Kathryn Albertson Park?", "The City describes wide, paved footpaths and on-site parking. It does not give a route-by-route accessibility guarantee, so confirm the exact gazebo, restroom or path condition before relying on step-free access."],
      ["dogs", "Are dogs allowed at Kathryn Albertson Park?", "Yes. Dogs are permitted year-round but must remain on leash. Keep them controlled around ponds and wildlife and remove waste."],
      ["family", "Is Kathryn Albertson Park a good family destination?", "It can suit quiet walks and wildlife watching on wide paved paths, but it is not an equipment-play park. Bicycles, e-scooters, fishing, boating, swimming and wading are prohibited, and visitors should observe wildlife from a distance."],
      ["transit", "Can I reach Kathryn Albertson Park without a car?", "Use Valley Regional Transit's current trip planner for 1001 South Americana Boulevard and verify the final walk and return time. The park page does not promise a particular route or frequency.", "Valley Regional Transit", transit],
      ["need-to-know", "What activities are prohibited at Kathryn Albertson Park?", "Biking, e-scooter use, fishing, boating, swimming and wading are prohibited. Observe wildlife from a distance, keep dogs leashed and check the Russian olive removal project or posted closures before entering affected paths."],
      ["weather", "How does weather affect Kathryn Albertson Park?", "Paved paths, ponds and lawns remain exposed to heat, cold, wind and storms despite wooded sections. Sunrise and sunset change through the year, and posted habitat or project closures override ordinary access."]
    ]
  }
};

function answerRecord(scope, tuple) {
  const [intentKey, question, answer, sourceLabel = "City of Boise Parks and Recreation", source = scope.officialSource] = tuple;
  return {
    intentKey, question, answer, sourceLabel, source, sourceType: "official",
    checkedAt, verifiedAt: checkedAt,
    freshnessClass: ["hours", "parking", "transit", "need-to-know", "weather"].includes(intentKey) ? "fast" : "slow",
    status: "verified"
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
    const details = guidance[scope.id];
    const images = galleries.places[scope.id]?.images || [];
    if (!details || images.length !== 4) throw new Error(`${scope.name}: incomplete campaign evidence`);
    const searchAnswers = details.answers.map((tuple) => answerRecord(scope, tuple));
    const sources = [
      { label: "City of Boise Parks and Recreation", url: scope.officialSource },
      { label: "Valley Regional Transit", url: transit }
    ];
    const record = {
      id: scope.id, name: scope.name, type: "Park", city: scope.city, state: scope.state,
      country: "US", citySlug: scope.citySlug, slug: scope.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      searchCategory: "park", neighborhood: "Boise River",
      status: "Sourced Boise river-park visitor guide", summary: details.summary,
      searchDescription: `Sourced hours, arrival guidance, essential visitor information, and licensed photographs for ${scope.name} in Boise, Idaho.`,
      address: scope.address, latitude: scope.latitude, longitude: scope.longitude,
      hours: details.hours, hoursSchedule: false, cost: details.cost,
      accessibility: details.accessibility, transit: details.transit,
      sourceLabel: "City of Boise Parks and Recreation", source: scope.officialSource,
      verifiedAt: checkedAt, operator: scope.operator, image: images[0], images: images.slice(1),
      sources, launchTier: scope.id.includes("ann-morrison") ? "anchor" : "supporting",
      likelySubsites: false, publishStatus: "super-enriched", researchQueue: details.researchQueue,
      searchAnswers, features: [], amenities: []
    };
    upsertPark(all, record);
    upsertPark(pilot, record);
    const launchIndex = launch.findIndex((item) => item.id === record.id);
    if (launchIndex >= 0) launch[launchIndex] = record;
    else launch.push(record);
    const persistedParent = {
      name: scope.name, city: scope.city, citySlug: scope.citySlug, operator: record.operator,
      sourceLabel: record.sourceLabel, source: record.source, address: record.address,
      summary: record.summary, hours: record.hours, hoursSchedule: false, cost: record.cost,
      accessibility: record.accessibility, transit: record.transit, searchAnswers,
      image: images[0], additionalImages: images.slice(1), replaceImages: true, verifiedAt: checkedAt
    };
    national.parks[scope.id] = persistedParent;
    campaignParents.parks[scope.id] = persistedParent;
    const location = {
      id: scope.id, park: scope.name, city: scope.city, state: scope.state,
      latitude: scope.latitude, longitude: scope.longitude, address: scope.address,
      displayName: `${scope.name}, ${scope.city}, ${scope.state}`,
      source: scope.operator, sourceUrl: scope.coordinateSource, checkedAt
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
  console.log(`Built ${campaign.places.length} Boise river-park guides with 8 reviewed images, 26 visitor answers, and no evidence-gated destination pages.`);
})();
