#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/chesapeake-bay-evidence-gate-campaign.json");
const galleries = require("../data/generated/chesapeake-bay-evidence-gate-images.json");
const checkedAt = campaign.checkedAt;
const reservations = "https://dnr.maryland.gov/publiclands/pages/park-dayuse-reservations.aspx";
const charges = "https://dnr.maryland.gov/publiclands/Pages/oc.aspx";
const accessibility = "https://dnr.maryland.gov/publiclands/Pages/accessibleactivities.aspx?activity=AccessiblePublicLands";
const transit = "https://www.mta.maryland.gov/trip-planner";
const keyBridge = "https://mdta.maryland.gov/keybridgenews";
const blackMarsh = "https://dnr.maryland.gov/wildlife/Pages/NaturalAreas/Central/Black-Marsh.aspx";
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const upsertPark = (document, record) => {
  const index = document.parks.findIndex((item) => item.id === record.id);
  if (index >= 0) document.parks[index] = record;
  else document.parks.push(record);
};

const guidance = {
  "launch-md-annapolis-sandy-point-state-park": {
    neighborhood: "Sandy Point",
    launchTier: "anchor",
    summary: "Sandy Point State Park is a Chesapeake Bay day-use destination near Annapolis with a one-mile sandy beach, guarded seasonal swimming zone, picnic areas, trails, fishing and crabbing access, playgrounds, pavilions, nature programming, and a 22-ramp boat-launch complex.",
    hours: "The park is open 7 a.m. to sunset year-round except Christmas Day. From mid-November through January 2, park hours are 7 a.m. to 4 p.m. because of Lights on the Bay. Fishing and boating access is available 24 hours under separate rules.",
    cost: "From May 1 through September 30, day-use service charges are $5 per person on weekends and holidays and $4 per person on weekdays. From October 1 through April 30, the charge is $3 per vehicle. Reservation processing charges may apply, and re-entry requires paying again.",
    accessibility: "Maryland DNR lists accessible food and concession service, fishing, picnic areas and shelters, the South Beach playground, bathhouse facilities, and accessible sailing at Sandy Point. Conditions between facilities still vary, so confirm the exact activity and current route before relying on step-free access.",
    transit: "Use the Maryland Transit Administration trip planner for current service toward Sandy Point and verify the final connection to 1100 East College Parkway. The reviewed park guidance does not promise frequent direct transit to the beach entrance.",
    researchQueue: [
      "Keep beach zones, boat ramps, marina store, playgrounds, nature center, trails, pavilions, and the farmhouse in parent guidance until exact current positions, destination-specific profiles, and matching reusable photographs clear together.",
      "Do not create a Sandy Point Shoal Lighthouse destination: Maryland DNR says the lighthouse is privately owned and not open to the public.",
      "Do not describe the historic farmhouse as separately open to visitors without a current operator schedule."
    ],
    answers: [
      ["hours", "When is Sandy Point State Park open?", "The park is open 7 a.m. to sunset year-round except Christmas Day. From mid-November through January 2 it closes at 4 p.m. for Lights on the Bay. Fishing and boating access is available 24 hours under separate rules."],
      ["parking", "Do I need a reservation to park at Sandy Point State Park?", "Advance day-use reservations are required on weekends and holidays from Memorial Day weekend through Labor Day. Buy before arrival and follow the reservation's entry instructions; space is not guaranteed without one.", "Maryland Park Service day-use reservations", reservations],
      ["entrance", "Which entrance should I use for Sandy Point State Park?", "Use the official 1100 East College Parkway entrance and follow signs for the planned activity. The beach, picnic areas, marina and boat ramps use different internal zones, so do not navigate to the offshore lighthouse."],
      ["restroom", "Are restrooms and showers available at Sandy Point State Park?", "A bathhouse near the swimming beach provides restrooms and showers. Confirm seasonal or maintenance status before relying on it, especially outside the guarded swimming period."],
      ["fees", "What does Sandy Point State Park cost?", "From May 1 through September 30, service charges are $5 per person on weekends and holidays and $4 per person on weekdays. From October 1 through April 30, the charge is $3 per vehicle. Processing fees may apply, there are no refunds, and re-entry requires paying again.", "Maryland Park Service reservation and service charges", charges],
      ["accessibility", "What accessible facilities are listed at Sandy Point State Park?", "Maryland DNR lists accessible food and concession service, fishing, picnic areas and shelters, the South Beach playground, bathhouse facilities, and accessible sailing. Confirm the exact activity and current route before relying on step-free access.", "Maryland DNR accessible public lands", accessibility],
      ["dogs", "Are dogs allowed at Sandy Point State Park?", "Leashed pets are allowed in the park except on the sandy swimming beach from Memorial Day weekend through the day after Labor Day. Follow posted restrictions and remove waste."],
      ["family", "What should families plan at Sandy Point State Park?", "Families can plan beach time, picnics, playgrounds, short trails, fishing or nature programs. Part of South Beach is normally guarded from 10 a.m. to 6 p.m. between Memorial Day and Labor Day; swimming at other times is at your own risk."],
      ["transit", "Can I reach Sandy Point State Park without a car?", "Use the Maryland Transit Administration's live trip planner for current service toward 1100 East College Parkway and verify the final connection. The reviewed park guidance does not promise frequent direct service to the beach entrance.", "Maryland Transit Administration", transit],
      ["need-to-know", "What should I know before visiting Sandy Point State Park?", "Reserve summer weekend and holiday entry before leaving, bring water shoes when conditions warrant, expect jellyfish in late summer, follow shade-structure rules, and remember that swimming is prohibited after dark. The park is trash-free, so take refuse with you."],
      ["weather", "How does weather affect Sandy Point State Park?", "The beach, bay, ramps and picnic grounds are exposed to heat, wind, storms and changing water conditions. Guarded swimming is seasonal, boating has separate safety requirements, and posted closures override ordinary hours."]
    ]
  },
  "launch-md-edgemere-north-point-state-park": {
    neighborhood: "Edgemere",
    launchTier: "supporting",
    summary: "North Point State Park protects Chesapeake Bay shoreline and Black Marsh near Edgemere, with relatively level trails, picnic areas, fishing and water access, two fishing piers, a visitor center, and remnants of the former Bay Shore amusement and trolley landscape.",
    hours: "Maryland DNR's current North Point page lists 10 a.m. to sunset, while the statewide reservation information page lists 8 a.m. to sunset. Because the official sources conflict, confirm the opening time with the park before an early visit.",
    cost: "Maryland DNR lists day-use service charges and requires advance reservations on summer weekends and holidays. The exact charge can vary by date and visitor category, and processing fees may apply; verify the current reservation listing before purchase.",
    accessibility: "Maryland DNR describes the park's trails as relatively level and lists accessible public-land activities. Surfaces, shoreline edges, pier closures, historic structures and the wildlands vary, so confirm the exact route or accommodation with the park.",
    transit: "Use the Maryland Transit Administration trip planner for current service toward 8400 North Point Road and verify the final connection. Because the Francis Scott Key Bridge is closed, drivers should use Maryland Transportation Authority routing updates rather than an older cross-harbor itinerary.",
    researchQueue: [
      "Resolve the official opening-time conflict: the park page says 10 a.m. to sunset, while the statewide reservation information page says 8 a.m. to sunset.",
      "Resolve the operator-page visitor-center schedule conflict before publishing a staffed-hours claim; the same page describes appointment-only access and separate summer weekend hours.",
      "Keep Crystal Pier parent-only while its last approximately 100 feet remain closed after storm damage, and keep Trolley Station Pavilion parent-only while renovation closure remains posted.",
      "Keep trails, picnic areas, water access, piers, visitor center and historic remnants in parent guidance until exact current positions, destination profiles and matching reusable photographs clear together."
    ],
    answers: [
      ["hours", "When is North Point State Park open?", "Maryland DNR's North Point page lists 10 a.m. to sunset, while the statewide reservation information page lists 8 a.m. to sunset. The official sources conflict, so confirm the opening time with the park before an early visit."],
      ["parking", "Do I need a reservation to park at North Point State Park?", "Advance day-use reservations are required on weekends and holidays from Memorial Day weekend through Labor Day. Buy before arrival and follow current entry and parking instructions.", "Maryland Park Service day-use reservations", reservations],
      ["entrance", "Which entrance should I use for North Point State Park?", "Use the official 8400 North Point Road entrance and follow current signs. Do not route through Black Marsh Natural Area or toward a closed facility as a substitute entrance."],
      ["restroom", "Are restrooms available at North Point State Park?", "The Takos Visitor Center area has public restrooms, but the operator page gives conflicting visitor-center schedules. Confirm availability before relying on staffed access or a specific opening time."],
      ["fees", "What does North Point State Park cost?", "Maryland DNR lists day-use service charges and may apply reservation processing fees. Because charges vary by date and visitor category, verify the current reservation listing before purchase.", "Maryland Park Service reservation and service charges", charges],
      ["accessibility", "How accessible is North Point State Park?", "Maryland DNR describes the trails as relatively level and lists accessible public-land activities. Shoreline edges, natural surfaces, historic structures and current pier closures vary, so confirm the exact route or accommodation.", "Maryland DNR accessible public lands", accessibility],
      ["dogs", "Are dogs allowed at North Point State Park?", "Leashed pets are allowed except in the sandy water-access area from Memorial Day weekend through Labor Day. Keep pets controlled and remove waste."],
      ["family", "What should families plan at North Point State Park?", "Families can plan relatively level trails, picnics, shoreline views and fishing. Water access is unguarded with no lifeguards, water shoes are recommended, and children need close supervision near the bay and piers."],
      ["transit", "Can I reach North Point State Park without a car?", "Use the Maryland Transit Administration's live trip planner for 8400 North Point Road and verify the final connection. Service and the last walk can change, so do not rely on an old route number.", "Maryland Transit Administration", transit],
      ["need-to-know", "What closures affect North Point State Park?", "The last approximately 100 feet of Crystal Pier is closed after storm damage, Trolley Station Pavilion is closed for renovation, and the Francis Scott Key Bridge closure requires an alternate driving route. Check current notices immediately before travel.", "Maryland Department of Natural Resources and Maryland Transportation Authority", keyBridge],
      ["weather", "How does weather affect North Point State Park?", "Bay shoreline, piers and water access are exposed, and there are no lifeguards. Storm damage already limits Crystal Pier, so obey barriers and posted closures and use water shoes where recommended."]
    ]
  }
};

function answerRecord(scope, tuple) {
  const [intentKey, question, answer, sourceLabel = "Maryland Department of Natural Resources", source = scope.officialSource] = tuple;
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
      { label: "Maryland Department of Natural Resources", url: scope.officialSource },
      { label: "Maryland Park Service day-use reservations", url: reservations },
      { label: "Maryland Park Service reservation and service charges", url: charges },
      { label: "Maryland DNR accessible public lands", url: accessibility },
      { label: "Maryland Transit Administration", url: transit },
      ...(scope.id.includes("north-point") ? [
        { label: "Maryland Department of Natural Resources — Black Marsh", url: blackMarsh },
        { label: "Maryland Transportation Authority — Key Bridge", url: keyBridge }
      ] : [])
    ];
    const record = {
      id: scope.id, name: scope.name, type: "Park", city: scope.city, state: scope.state,
      country: "US", citySlug: scope.citySlug, slug: scope.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      searchCategory: "park", neighborhood: details.neighborhood,
      status: "Sourced state-park visitor guide", summary: details.summary,
      searchDescription: `Sourced hours, arrival guidance, essential visitor information, and licensed photographs for ${scope.name} in ${scope.city}, Maryland.`,
      address: scope.address, latitude: scope.latitude, longitude: scope.longitude,
      hours: details.hours, hoursSchedule: false, cost: details.cost,
      accessibility: details.accessibility, transit: details.transit,
      sourceLabel: "Maryland Department of Natural Resources", source: scope.officialSource,
      verifiedAt: checkedAt, operator: scope.operator, image: images[0], images: images.slice(1),
      sources, launchTier: details.launchTier, likelySubsites: false,
      publishStatus: "super-enriched", researchQueue: details.researchQueue,
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
  console.log(`Built ${campaign.places.length} Chesapeake Bay state-park guides with 8 reviewed images, 22 visitor answers, and no evidence-gated destination pages.`);
})();
