#!/usr/bin/env node
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/miami-waterfront-evidence-gate-campaign.json");
const galleries = require("../data/generated/miami-waterfront-super-images.json").places;
const checkedAt = campaign.checkedAt;
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const vercelPath = path.join(root, "vercel.json");
const originalVercelText = fs.readFileSync(vercelPath, "utf8");
const originalVercel = JSON.parse(originalVercelText);
const upsert = (data, record) => {
  const index = data.parks.findIndex((item) => item.id === record.id);
  if (index >= 0) data.parks[index] = record;
  else data.parks.push(record);
};
const stable = (parent, child) => {
  const bytes = crypto.createHash("sha256").update(`auditmap:${parent}:${child}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const sources = {
  miamiParks: "https://www.miami.gov/Parks-Public-Places/Parks-Directory",
  bayfront: "https://www.miami.gov/Parks-Public-Places/Parks-Directory/Bayfront-Park",
  southPointe: "https://www.miamibeachfl.gov/city-hall/parks-and-recreation/parks-facilities-directory/south-pointe-park/",
  lummus: "https://www.miamibeachfl.gov/city-hall/parks-and-recreation/parks-facilities-directory/lummus-park/",
  beachAccess: "https://www.miamibeachfl.gov/ada/beach-wheelchair-access/",
  crandon: "https://www.miamidade.gov/global/recreation/park/crandon-park.page",
  matheson: "https://www.miamidade.gov/global/recreation/park/matheson-hammock-park.page",
  westMatheson: "https://www.miamidade.gov/global/recreation/west-matheson/home.page",
  billBaggs: "https://www.floridastateparks.org/parks-and-trails/bill-baggs-cape-florida-state-park",
  billBaggsAmenities: "https://www.floridastateparks.org/parks-and-trails/bill-baggs-cape-florida-state-park/experiences-amenities",
  billBaggsFees: "https://www.floridastateparks.org/parks-and-trails/bill-baggs-cape-florida-state-park/hours-fees",
  lighthouse: "https://www.floridastateparks.org/parks-and-trails/bill-baggs-cape-florida-state-park/cape-florida-light",
  virginia: "https://virginiakeybeachpark.net/park-information/",
  virginiaHistory: "https://virginiakeybeachpark.net/history/",
  virginiaRentals: "https://virginiakeybeachpark.net/park-rental/venuerentals/",
  pamm: "https://www.pamm.org/en/visit/",
  pammAccess: "https://www.pamm.org/en/accessibility/",
  frost: "https://www.frostscience.org/plan-your-day/",
  frostAccess: "https://www.frostscience.org/accessibility/",
  transit: "https://www.miamidade.gov/global/transportation/home.page",
  weather: "https://www.weather.gov/mfl/"
};
const canonicalSlugs = {
  "launch-fl-miami-maurice-a-ferre-park": "maurice-a-ferre-park"
};
const legacyFeatureSlugs = {
  "launch-fl-miami-maurice-a-ferre-park": ["perez-art-museum-miami", "frost-science-museum", "public-art-waterfront-walk", "dogs-and-cats-walkway", "museum-park-station", "bayfront-lawn", "museum-plaza", "fec-slip-waterfront"],
  "launch-fl-miami-bayfront-park": ["tina-hills-pavilion", "noguchi-monuments", "bay-walk-waterfront", "pepper-fountain", "challenger-memorial", "bayfront-amphitheater", "bayfront-park-station", "central-lawn-event-zone"],
  "launch-fl-miami-matheson-hammock-park": ["atoll-pool-beach", "matheson-marina", "east-hammock-trail", "redfish-waterfront-restaurant", "west-matheson-dog-area", "matheson-picnic-shelters", "kiteboarding-launch-area", "mangrove-waterfront-path"],
  "launch-fl-miami-beach-south-pointe-park": ["south-pointe-pier", "splash-pad-playground", "cutwalk-promenade", "south-pointe-beach", "south-pointe-dog-park", "park-lawns-ship-overlook", "beachwalk-connection", "washington-avenue-entrance"],
  "launch-fl-miami-beach-lummus-park": ["lummus-playground", "muscle-beach-south-beach", "sixth-street-fitness-restrooms", "beachfront-path", "tenth-street-restrooms", "fourteenth-street-access", "lummus-volleyball-courts", "beach-access-mats"],
  "launch-fl-key-biscayne-crandon-park": ["crandon-beach", "family-amusement-center", "visitor-nature-center", "bear-cut-preserve", "crandon-north-beach", "crandon-south-beach-cabanas", "crandon-tennis-center", "crandon-golf-course"],
  "launch-fl-key-biscayne-bill-baggs-cape-florida-state-park": ["cape-florida-lighthouse", "cape-florida-beach", "no-name-harbor", "lighthouse-cafe-picnic-area", "boaters-grill", "cape-florida-bike-trails", "seawall-fishing", "picnic-pavilions"],
  "launch-fl-miami-historic-virginia-key-beach-park": ["historic-beach-shoreline", "dance-floor-cultural-landscape", "mini-train-station-history", "wetland-nature-areas", "civil-rights-visitor-center", "historic-carousel", "picnic-pavilions-event-lawns", "beach-boardwalk"]
};

const parentOverrides = {
  "launch-fl-miami-maurice-a-ferre-park": {
    source: sources.miamiParks,
    sourceLabel: "City of Miami Parks",
    operator: "City of Miami",
    hours: "The City directory lists the park as an unstaffed public park but does not publish a dependable daily schedule. Museum, event, and secured areas keep separate hours; check same-day access before traveling.",
    need: "City control of Maurice A. Ferré Park changed in 2025. Confirm current City notices, museum schedules, event fencing, arena traffic, heat, lightning, and construction rather than relying on former Bayfront Park Management Trust information."
  },
  "launch-fl-miami-bayfront-park": {
    source: sources.bayfront,
    sourceLabel: "City of Miami Parks",
    operator: "City of Miami",
    hours: "The City directory identifies Bayfront Park as an unstaffed citywide park but does not publish dependable daily hours. Concerts, holiday productions, construction, and secured event areas can alter access.",
    need: "The City assumed operation after the former park trust was abolished in 2025. Check current City and event notices before visiting; fencing, downtown events, heat, lightning, and waterfront construction can change normal circulation."
  },
  "launch-fl-miami-matheson-hammock-park": {
    source: sources.matheson,
    sourceLabel: "Miami-Dade County Parks",
    operator: "Miami-Dade County Parks",
    hours: "The park and boat ramp operate sunrise to sunset. The office is open daily 8 a.m.-5 p.m.; the atoll pool, marina, restaurant, lifeguards, and concessions use separate schedules.",
    need: "West Matheson is closed for restoration beginning February 17, 2026, with completion expected in fall 2026. For the open east side, check atoll-pool water quality, wildlife closures, lifeguard staffing, tides, lightning, heat, and marina alerts."
  },
  "launch-fl-miami-beach-south-pointe-park": {
    source: sources.southPointe,
    sourceLabel: "City of Miami Beach",
    operator: "City of Miami Beach",
    hours: "The City lists South Pointe Park open daily from sunrise to sunset. The pier, playground water feature, beach lifeguards, concession, and beach-mobility services may use separate schedules.",
    need: "Government Cut has strong currents and vessel traffic. Use guarded beach areas for swimming, keep clear of pier fishing gear and seawalls, and check lightning, surf, heat, beach flags, and event closures."
  },
  "launch-fl-miami-beach-lummus-park": {
    source: sources.lummus,
    sourceLabel: "City of Miami Beach",
    operator: "City of Miami Beach",
    hours: "Open daily from sunrise to midnight. The 6th Street outdoor gym and 9th Street Muscle Beach operate 7:30 a.m. to sunset; lifeguard and beach services use separate schedules.",
    need: "Lummus is a ten-block linear park and a frequent event site. Choose a cross street before arrival and check event street closures, beach flags, lightning, heat, and current restroom or construction notices."
  },
  "launch-fl-key-biscayne-crandon-park": {
    source: sources.crandon,
    sourceLabel: "Miami-Dade County Parks",
    operator: "Miami-Dade County Parks",
    hours: "The main office is open daily 8 a.m.-5 p.m. The beach, Visitor and Nature Center, tennis center, golf course, marina, concessions, and rentals have separate schedules.",
    need: "The offshore sandbar moves with storms and currents. Check water quality, beach flags, lightning, heat, causeway traffic, facility schedules, and concession status; flotation devices are prohibited at County beaches."
  },
  "launch-fl-key-biscayne-bill-baggs-cape-florida-state-park": {
    source: sources.billBaggs,
    sourceLabel: "Florida State Parks",
    operator: "Florida State Parks",
    hours: "Open daily 8 a.m. to sundown. Lighthouse tours, restaurants, rentals, harbor service, and facilities use separate schedules.",
    need: "The park closes to vehicles, pedestrians, and cyclists at capacity and may remain closed for at least two hours. Fishing piers remain closed; Restroom 2, beach access 3, and pavilions A8-A9 are listed closed for renovations."
  },
  "launch-fl-miami-historic-virginia-key-beach-park": {
    source: sources.virginia,
    sourceLabel: "Historic Virginia Key Beach Park Trust",
    operator: "Historic Virginia Key Beach Park Trust",
    hours: "Open daily 7 a.m.-5 p.m. from November through March and 7 a.m.-6 p.m. from April through October; the main gate closes 30 minutes before park closing. Closed Thanksgiving and Christmas.",
    parking: "Vehicle entry is currently $5 Monday-Thursday, $10 Friday-Sunday, and $12 on holidays. Event operations and causeway traffic can change normal arrival conditions.",
    cost: "Current vehicle entry is $5 Monday-Thursday, $10 Friday-Sunday, and $12 on holidays. Rentals, permitted events, and special programs charge separately.",
    need: "Check the park calendar for full closures and ticketed events before crossing the causeway. Heat, lightning, water quality, mosquitoes, restoration work, and event setup can affect beach and cultural-area access."
  }
};

const featureDefinitions = {
  "launch-fl-miami-maurice-a-ferre-park": [
    { slug: "perez-art-museum-miami", name: "Pérez Art Museum Miami", lat: 25.7858, lon: -80.1864, imageIndex: 2, source: sources.pamm, sourceLabel: "Pérez Art Museum Miami", summary: "The ticketed art museum on the park's north side, with its entrance above the ground-level garage.", hours: "Monday 11 a.m.-6 p.m.; Tuesday-Wednesday closed; Thursday 11 a.m.-9 p.m.; Friday-Sunday 11 a.m.-6 p.m. Recheck holidays and special closures.", cost: "Timed admission is ticketed; current standard adult admission is $18, with listed discounts and free categories. Parking is separate.", need: "Tickets can sell out and stop selling 30 minutes before close. Use the museum garage or Museum Park Metromover, and use the accessible group entrance when needed." },
    { slug: "frost-science-museum", name: "Phillip and Patricia Frost Museum of Science", lat: 25.7859, lon: -80.187, imageIndex: 1, source: sources.frost, sourceLabel: "Frost Science", summary: "The ticketed science museum and aquarium beside PAMM at the north end of the park.", hours: "Museum admission and entry times are independent of park access; check the live Plan Your Day page for the visit date.", cost: "Museum admission, planetarium programs, parking, and special experiences are ticketed separately from the free outdoor park.", need: "Reserve enough time for timed entry and the aquarium circulation route. The museum garage has limited accessible spaces and a 7-foot-2 vehicle clearance." },
    { slug: "havana-s-balcony", name: "Havana's Balcony", lat: 25.7843, lon: -80.1849, imageIndex: 0, source: "https://commons.wikimedia.org/wiki/File:Havana%27s_Balcony_in_Museum_Park_Miami.jpg", sourceLabel: "Wikimedia Commons", summary: "Juan Garaizabal's large public artwork on the waterfront side of Maurice A. Ferré Park.", hours: "Outdoor park access applies; event fencing or waterfront work can temporarily restrict the artwork area.", cost: "Viewing the outdoor artwork is free.", need: "Navigate to the artwork pin rather than a museum entrance. The exposed waterfront route has limited shade and can close for events or lightning." }
  ],
  "launch-fl-miami-bayfront-park": [
    { slug: "laser-light-tower", name: "Laser Light Tower", lat: 25.7748, lon: -80.187, imageIndex: 1, source: sources.bayfront, sourceLabel: "City of Miami Parks", summary: "Isamu Noguchi's landmark tower within Bayfront Park's public-art landscape.", hours: "General outdoor park access applies; lighting, fountain, and event operations are not guaranteed on a daily schedule.", cost: "Viewing the outdoor artwork is free.", need: "The tower is a landmark, not a staffed attraction. Event fencing and construction can block the closest path." },
    { slug: "slide-mantra", name: "Slide Mantra", lat: 25.7746, lon: -80.1861, imageIndex: 3, source: sources.bayfront, sourceLabel: "City of Miami Parks", summary: "Noguchi's white marble slide sculpture near the park's central art and fountain area.", hours: "General outdoor park access applies; event or maintenance closures can restrict the sculpture area.", cost: "Viewing the outdoor artwork is free.", need: "Treat the sculpture as public art and follow posted rules; do not assume it is available for play during events or maintenance." },
    { slug: "fpl-solar-amphitheater", name: "FPL Solar Amphitheater", lat: 25.7768, lon: -80.1848, imageIndex: 2, source: sources.bayfront, sourceLabel: "City of Miami Parks", summary: "The gated outdoor concert venue on Bayfront Park's northeast waterfront.", hours: "Access is event-controlled; there is no general interior visiting schedule outside ticketed or permitted events.", cost: "The exterior park is free, but concerts and controlled events require event-specific tickets and terms.", need: "Use the event promoter's live listing for doors, bags, tickets, and accessibility. Venue fencing changes normal park circulation." }
  ],
  "launch-fl-miami-matheson-hammock-park": [
    { slug: "atoll-pool-beach", name: "Matheson Hammock Atoll Pool", lat: 25.6795, lon: -80.258, imageIndex: 1, source: sources.matheson, sourceLabel: "Miami-Dade County Parks", summary: "The tide-flushed saltwater atoll pool and developed beach on the park's east side.", hours: "Open seven days with seasonal hours; current summer hours are 9 a.m.-5:30 p.m. weekdays and 9 a.m.-6:30 p.m. weekends, while winter closes one hour earlier. Operations can change for water quality or wildlife.", cost: "Park car parking is $7 plus tax weekdays and $10 plus tax weekends and holidays; beach access has no separate admission listed.", need: "Lifeguards are staffed on weekends and holidays, not guaranteed every open day. It is tidal saltwater; check water quality and never treat shallow appearance as proof of safety." },
    { slug: "matheson-marina", name: "Matheson Hammock Marina", lat: 25.6808, lon: -80.2555, imageIndex: 2, source: sources.matheson, sourceLabel: "Miami-Dade County Parks", summary: "The full-service marina and eleven-lane boat ramp east of Old Cutler Road.", hours: "Boat ramps operate sunrise to sunset; the park office is open daily 8 a.m.-5 p.m. Fuel, shop, slip, and restaurant operations differ.", cost: "Trailer launch is $20 plus tax Monday-Thursday and $30 plus tax Friday-Sunday and holidays; storage, dockage, fuel, and parking use separate rates.", need: "Use the marina entrance and current marine alerts rather than the atoll-pool pin. Vessel approach, ramp queues, weather, and tides require separate planning." }
  ],
  "launch-fl-miami-beach-south-pointe-park": [
    { slug: "south-pointe-pier", name: "South Pointe Pier", lat: 25.7645, lon: -80.1297, imageIndex: 2, source: sources.southPointe, sourceLabel: "City of Miami Beach", summary: "The fishing and viewing pier at the park's Atlantic end beside Government Cut.", hours: "The pier follows posted City access and can close independently for weather, maintenance, or security; do not assume beach or park hours guarantee pier access.", cost: "General pier access is free; parking and concessions cost separately.", need: "Keep clear of fishing lines and the rail edge. Swimming beside the pier or in Government Cut is unsafe because of currents and vessel traffic." },
    { slug: "south-pointe-promenade", name: "South Pointe Promenade", lat: 25.766, lon: -80.136, imageIndex: 3, source: sources.southPointe, sourceLabel: "City of Miami Beach", summary: "The paved bayfront promenade linking Washington Avenue, park lawns, Government Cut, and the beach side.", hours: "Park hours of sunrise to sunset apply unless events or construction restrict a section.", cost: "The public promenade is free.", need: "Cyclists, runners, families, and ship watchers share the route. Use the exact pin for the bayfront segment and expect exposed heat and limited shade." },
    { slug: "south-pointe-beach", name: "South Pointe Beach", lat: 25.7638, lon: -80.131, imageIndex: 0, source: sources.southPointe, sourceLabel: "City of Miami Beach", summary: "The guarded Atlantic beach zone east of the park lawns and south of the main South Beach corridor.", hours: "Beach access and lifeguard service differ from park hours; check current beach flags and staffed-swimming times on arrival.", cost: "Beach access is free; parking, chairs, umbrellas, and concessions cost separately.", need: "Swim only in the guarded Atlantic zone, not Government Cut. Beach wheelchairs and access mats depend on current service location and hours." }
  ],
  "launch-fl-miami-beach-lummus-park": [],
  "launch-fl-key-biscayne-crandon-park": [
    { slug: "crandon-beach", name: "Crandon Beach", lat: 25.71, lon: -80.154, imageIndex: 1, source: sources.crandon, sourceLabel: "Miami-Dade County Parks", summary: "The two-mile developed beach east of Crandon Boulevard, with north and south parking areas, concessions, showers, and a changing offshore sandbar.", hours: "Beach and lifeguard operations are separate from the 8 a.m.-5 p.m. main office; verify current service and flags on arrival.", cost: "Parking is $7 plus tax Monday-Thursday and $10 plus tax Friday-Sunday; beach access has no separate admission listed.", need: "The sandbar changes with storms and currents. Flotation devices are prohibited, and personal paddleboards or kayaks may not launch from the beach outside authorized operations." },
    { slug: "crandon-tennis-center", name: "Crandon Park Tennis Center", lat: 25.7088, lon: -80.162, imageIndex: 0, source: sources.crandon, sourceLabel: "Miami-Dade County Parks", summary: "The 27-court tennis center west of Crandon Boulevard, separate from the beach lots.", hours: "Current listed hours are Monday-Friday 8 a.m.-10 p.m. and Saturday-Sunday 8 a.m.-6 p.m.; programs and court availability require confirmation.", cost: "Court reservations, lessons, and programs charge separately from general park access.", need: "Navigate to 7300 Crandon Boulevard rather than the beach. USTA Florida began interim operation in January 2026, so recheck booking procedures before arrival." }
  ],
  "launch-fl-key-biscayne-bill-baggs-cape-florida-state-park": [
    { slug: "cape-florida-lighthouse", name: "Cape Florida Lighthouse", lat: 25.6668, lon: -80.1556, imageIndex: 0, source: sources.lighthouse, sourceLabel: "Florida State Parks", summary: "The historic 1825 lighthouse and keeper's cottage at the park's south end.", hours: "Tower tours run 10 a.m.-noon Thursday-Monday; closed Tuesday-Wednesday. The lighthouse and keeper's cottage open only during tour times, while grounds are listed open daily 8 a.m.-4 p.m.", cost: "Tours are included with park entry and do not require a separate fee or reservation.", need: "The tower has 109 spiral steps, narrow spaces, and heights. Climbers must be at least 42 inches tall and able to climb independently; pets are not permitted." },
    { slug: "cape-florida-beach", name: "Cape Florida Beach", lat: 25.67, lon: -80.156, imageIndex: 2, source: sources.billBaggsAmenities, sourceLabel: "Florida State Parks", summary: "The 1.25-mile Atlantic beach reached from Areas A, B, and C.", hours: "Beach access follows park hours, 8 a.m. to sundown, but capacity, weather, and renovation closures can restrict specific accesses.", cost: "Included with park entry; chair and umbrella rentals cost extra.", need: "There are no lifeguards, so swimming is at your own risk. Use the marked float area, watch winter man-of-war warnings, and note that beach access 3 is listed closed for renovation." },
    { slug: "cape-florida-picnic-pavilions", name: "Cape Florida Picnic Pavilions", lat: 25.6712, lon: -80.158, imageIndex: 3, source: sources.billBaggsFees, sourceLabel: "Florida State Parks", summary: "Eighteen reservable picnic pavilions distributed through the developed park areas.", hours: "Pavilion use follows park hours; reservations are handled Monday-Friday at the entrance station and must be made at least two days in advance.", cost: "Fifteen pavilions are $50 plus tax per day and three large pavilions are $100 plus tax; all visitors also pay park entry. Electricity is $15 where available.", need: "A reservation does not guarantee entry after the park reaches capacity. Pavilions A8 and A9 are listed closed for renovations; confirm the exact assigned shelter." }
  ],
  "launch-fl-miami-historic-virginia-key-beach-park": [
    { slug: "dance-floor-cultural-landscape", name: "Historic Dance Floor", lat: 25.7368, lon: -80.1565, imageIndex: 1, source: sources.virginiaRentals, sourceLabel: "Historic Virginia Key Beach Park Trust", summary: "The restored open-air dance floor within the park's historic core and event landscape.", hours: "General park hours apply for exterior viewing; permitted events and rentals can control access to the dance pavilion area.", cost: "Exterior viewing is included with vehicle entry. The Dance Pavilion is listed as a $250 rental with a 150-person maximum.", need: "Event setup can close or alter the historic core. Confirm the calendar before traveling and do not assume a private-event area is open for casual use." },
    { slug: "mini-train-station-history", name: "Historic Mini Train", lat: 25.7372, lon: -80.157, imageIndex: 2, source: sources.virginiaHistory, sourceLabel: "Historic Virginia Key Beach Park Trust", summary: "The restored miniature-train experience and station history associated with the segregated-era beach park.", hours: "The operator promotes mini-train rides but does not publish a dependable daily ride schedule on the current history page; confirm operation before visiting specifically for a ride.", cost: "Vehicle entry applies; verify whether rides are included or event-controlled on the visit date.", need: "Treat the train as schedule-dependent, not a guaranteed daily attraction. Event closures, maintenance, and weather can cancel operations." },
    { slug: "historic-carousel", name: "Historic Carousel", lat: 25.737, lon: -80.1568, imageIndex: 3, source: sources.virginiaRentals, sourceLabel: "Historic Virginia Key Beach Park Trust", summary: "The restored historic carousel and pavilion in the park's cultural core.", hours: "The operator lists free rides noon-5 p.m. on weekends and holidays; private rentals can control other periods. Recheck the calendar and operating status.", cost: "Listed weekend and holiday rides are free after vehicle entry. Private carousel rental is $75 per hour with a two-hour weekday minimum.", need: "Confirm the carousel is operating before making it the purpose of the trip; maintenance, events, and weather can interrupt rides." }
  ]
};

function answer(intentKey, question, text, source, sourceLabel) {
  return { intentKey, question, answer: text, source, sourceLabel, verifiedAt: checkedAt, freshnessClass: ["hours", "parking", "need-to-know", "weather"].includes(intentKey) ? "fast" : "slow", status: "verified" };
}

function refreshAnswers(base, scope, override) {
  const current = new Map((base.searchAnswers || []).map((item) => [item.intentKey, item]));
  const textOverride = { hours: override.hours, parking: override.parking, fees: override.cost, "need-to-know": override.need };
  const intents = ["hours", "parking", "entrance", "restroom", "fees", "accessibility", "dogs", "family", "transit", "need-to-know", "weather"];
  return intents.map((intent) => {
    const prior = current.get(intent) || {};
    const text = textOverride[intent] || prior.answer || `Check the current ${override.sourceLabel} guidance before visiting ${scope.name}.`;
    const source = intent === "weather" ? sources.weather : intent === "transit" ? sources.transit : override.source;
    const sourceLabel = intent === "weather" ? "National Weather Service Miami" : intent === "transit" ? "Miami-Dade Transportation" : override.sourceLabel;
    return answer(intent, prior.question || `${intent} guidance for ${scope.name}`, text, source, sourceLabel);
  });
}

function inherited(parent, intent, fallback) {
  return parent.searchAnswers.find((item) => item.intentKey === intent) || { answer: fallback, source: parent.source, sourceLabel: parent.sourceLabel };
}

function makeFeature(parent, definition, images) {
  const id = stable(parent.id, definition.slug);
  const baseImage = images[definition.imageIndex];
  if (!baseImage) throw new Error(`${parent.name}/${definition.name}: image ${definition.imageIndex} missing`);
  const image = { ...baseImage, featureId: id, latitude: definition.lat, longitude: definition.lon, positionQuality: "reviewed-official-destination-and-open-map-position", alt: `${definition.name} at ${parent.name}` };
  const mapSource = `https://www.openstreetmap.org/?mlat=${definition.lat}&mlon=${definition.lon}#map=19/${definition.lat}/${definition.lon}`;
  const parking = inherited(parent, "parking", "Use the closest legal destination-specific arrival point.");
  const restroom = inherited(parent, "restroom", "Identify an open restroom before leaving the developed visitor area.");
  const access = inherited(parent, "accessibility", "Check the operator for current accessible routes and services.");
  const dogs = inherited(parent, "dogs", "Follow posted pet rules.");
  const family = inherited(parent, "family", "Supervise around roads, water, structures, and crowds.");
  const answers = [
    answer("location", `Where exactly is ${definition.name}?`, `${definition.summary} Navigate to the exact pin rather than the general ${parent.name} marker.`, definition.source, definition.sourceLabel),
    answer("parking", `Where should I park for ${definition.name}?`, parking.answer, parking.source, parking.sourceLabel),
    answer("hours", `When is ${definition.name} open?`, definition.hours, definition.source, definition.sourceLabel),
    answer("restroom", `Are there restrooms near ${definition.name}?`, restroom.answer, restroom.source, restroom.sourceLabel),
    answer("fees", `What fees apply at ${definition.name}?`, definition.cost, definition.source, definition.sourceLabel),
    answer("accessibility", `How accessible is ${definition.name}?`, access.answer, access.source, access.sourceLabel),
    answer("dogs", `Are dogs allowed at ${definition.name}?`, dogs.answer, dogs.source, dogs.sourceLabel),
    answer("family", `Is ${definition.name} useful for a family visit?`, `${definition.summary} ${family.answer}`, family.source, family.sourceLabel),
    answer("need-to-know", `What should I know before visiting ${definition.name}?`, definition.need, definition.source, definition.sourceLabel)
  ];
  return {
    id,
    slug: definition.slug,
    name: definition.name,
    feature_type: "destination",
    description: definition.summary,
    latitude: definition.lat,
    longitude: definition.lon,
    details: {
      category: "destination",
      includeInParentGallery: true,
      address: parent.address,
      hours: definition.hours,
      cost: definition.cost,
      accessibility: access.answer,
      locationContext: definition.summary,
      needToKnow: definition.need,
      informationSourceLabel: definition.sourceLabel,
      informationSourceUrl: definition.source,
      informationCheckedAt: checkedAt,
      coordinateSource: mapSource,
      positionQuality: "reviewed-official-destination-and-open-map-position",
      imageUrl: image.url,
      imageSourceUrl: image.source,
      imageAuthor: image.author,
      imageLicense: image.license,
      imageAlt: image.alt,
      images: [image],
      searchAnswers: answers
    },
    source_label: definition.sourceLabel,
    source_url: definition.source,
    verified_at: checkedAt
  };
}

function addRetirementRedirects(vercel, parent, retiredSlugs) {
  const parentRoute = `/us/fl/${slug(parent.city)}/parks/${parent.slug || slug(parent.name)}`;
  const retained = new Set((featureDefinitions[parent.id] || []).map((item) => item.slug));
  for (const featureSlug of retiredSlugs) {
    if (retained.has(featureSlug)) continue;
    const source = `${parentRoute}/${featureSlug}`;
    if (!vercel.redirects.some((item) => item.source === source)) vercel.redirects.push({ source, destination: parentRoute, permanent: true });
  }
}

(() => {
  const all = read("data/generated/all-subsites-ready.json");
  const pilot = read("data/generated/pilot-subsites-ready.json");
  const launch = read("data/generated/launch-map-places.json");
  const national = read("data/parent-park-information-enrichment-national.json");
  const campaignParents = read("data/parent-park-information-enrichment-campaign.json");
  const vercel = read("vercel.json");
  if (!Array.isArray(vercel.redirects)) vercel.redirects = [];
  vercel.redirects = vercel.redirects.filter((item) => !item.source.startsWith("/us/fl/miami/parks/maurice-a-ferr-park/"));

  for (const scope of campaign.places) {
    const base = all.parks.find((item) => item.id === scope.id) || launch.find((item) => item.id === scope.id);
    if (!base) throw new Error(`${scope.name}: existing parent missing`);
    const override = { ...parentOverrides[scope.id] };
    const images = galleries[scope.id]?.images || [];
    if (images.length !== 4) throw new Error(`${scope.name}: expected four reviewed images`);
    const parent = {
      ...base,
      id: scope.id,
      name: scope.name,
      slug: canonicalSlugs[scope.id] || base.slug || slug(scope.name),
      source: override.source,
      sourceLabel: override.sourceLabel,
      operator: override.operator,
      hours: override.hours,
      cost: override.cost || base.cost,
      image: images[0],
      images: images.slice(1),
      verifiedAt: checkedAt
    };
    parent.searchAnswers = refreshAnswers(parent, scope, override);
    parent.features = (featureDefinitions[scope.id] || []).map((definition) => makeFeature(parent, definition, images));
    parent.likelySubsites = parent.features.length > 0;
    parent.publishStatus = parent.features.length ? "super-enriched" : "sourced-parent-guide";
    const retainedSlugs = new Set(parent.features.map((item) => item.slug));
    const retiredSlugs = legacyFeatureSlugs[scope.id].filter((item) => !retainedSlugs.has(item));
    parent.researchQueue = retiredSlugs.length ? [`Retired legacy destinations pending destination-specific reusable photography and a complete current profile: ${retiredSlugs.join(", ")}.`] : [];
    const featureSources = parent.features.map((item) => ({ label: item.source_label, url: item.source_url }));
    parent.sources = [{ label: override.sourceLabel, url: override.source }, ...featureSources].filter((item, index, list) => list.findIndex((other) => other.url === item.url) === index);
    upsert(all, parent);
    upsert(pilot, parent);
    const launchIndex = launch.findIndex((item) => item.id === scope.id);
    launch[launchIndex] = parent;
    for (const document of [national, campaignParents]) {
      const current = document.parks[scope.id] || {};
      document.parks[scope.id] = { ...current, operator: override.operator, source: override.source, sourceLabel: override.sourceLabel, address: parent.address, hours: parent.hours, cost: parent.cost, searchAnswers: parent.searchAnswers, image: images[0], additionalImages: images.slice(1), replaceImages: true, sources: parent.sources, verifiedAt: checkedAt };
    }
    addRetirementRedirects(vercel, parent, legacyFeatureSlugs[scope.id]);
    console.log(`${scope.name}: four reviewed photos, ${parent.features.length} retained destinations, ${retiredSlugs.length} retired legacy cards`);
  }

  const wrongMauriceRoute = "/us/fl/miami/parks/maurice-a-ferr-park";
  if (!vercel.redirects.some((item) => item.source === wrongMauriceRoute)) vercel.redirects.push({ source: wrongMauriceRoute, destination: "/us/fl/miami/parks/maurice-a-ferre-park", permanent: true });

  write("data/generated/all-subsites-ready.json", all);
  write("data/generated/pilot-subsites-ready.json", pilot);
  write("data/generated/launch-map-places.json", launch);
  write("data/parent-park-information-enrichment-national.json", national);
  write("data/parent-park-information-enrichment-campaign.json", campaignParents);
  const originalRedirectSources = new Set((originalVercel.redirects || []).map((item) => item.source));
  const addedRedirects = vercel.redirects.filter((item) => !originalRedirectSources.has(item.source));
  if (addedRedirects.length) {
    const redirectLines = addedRedirects
      .map((item) => `    { "source": ${JSON.stringify(item.source)}, "destination": ${JSON.stringify(item.destination)}, "permanent": true },`)
      .join("\n");
    const updatedVercelText = originalVercelText.replace('  "redirects": [\n', `  "redirects": [\n${redirectLines}\n`);
    fs.writeFileSync(vercelPath, updatedVercelText);
  }
})();
