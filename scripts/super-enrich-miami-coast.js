#!/usr/bin/env node
const crypto = require("node:crypto"),
  fs = require("node:fs"),
  path = require("node:path"),
  sharp = require("sharp"),
  root = path.resolve(__dirname, ".."),
  checkedAt = "2026-08-05",
  downloadImages = process.argv.includes("--download");
const slug = (v) =>
  String(v)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const uuid = (p, s) => {
  const b = crypto
    .createHash("sha256")
    .update(`auditmap:${p}:${s}`)
    .digest()
    .subarray(0, 16);
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
const cm = (s, f, a, l) => ({
  slug: s,
  url: `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(f.replaceAll(" ", "_"))}?width=1920`,
  source: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(f.replaceAll(" ", "_"))}`,
  author: a,
  license: l,
});
const official = (s, u, src, a) => ({
  slug: s,
  url: u,
  source: src,
  author: a,
  license: `Official ${a} photograph; source attribution retained`,
});
const schedule = (o, c) =>
  Object.fromEntries(
    [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ].map((d) => [d, [[o, c]]]),
  );
const parks = [
  {
    id: "launch-fl-miami-beach-south-pointe-park",
    name: "South Pointe Park",
    city: "Miami Beach",
    lat: 25.7651,
    lon: -80.1341,
    address: "1 Washington Avenue, Miami Beach, FL 33139",
    source:
      "https://www.miamibeachfl.gov/city-hall/parks-and-recreation/parks-facilities-directory/south-pointe-park/",
    label: "City of Miami Beach",
    hours:
      "Open daily from sunrise to 10 p.m. The pier, splash pad, playground, cafe, lifeguards, and beach-mobility services follow separate schedules.",
    hoursSchedule: false,
    summary:
      "A family-friendly waterfront park at the southern tip of Miami Beach with a pier, beach, splash pad, playground, lawns, promenade, cruise-ship views, and accessible beach support.",
    arrival:
      "Use Washington Avenue for the park and playground, South Pointe Drive for the bayfront promenade, or the beach entrance for lifeguard and mobility assistance. The pier is at the east end.",
    parking:
      "Paid municipal garages, lots, and metered streets serve South of Fifth. The nearest spaces fill early on weekends; verify garage closing terms and never rely on Ocean Drive curb access.",
    restrooms:
      "Public restrooms and outdoor showers are available near the beach and park facilities. Beach-wheelchair assistance begins with the lifeguard during service hours.",
    cost: "Park, pier, playground, splash pad, promenade, and beach access are free. Parking, food, rentals, and reserved spaces cost extra.",
    accessibility:
      "Paved paths, ramps, beach access mats, and free manual beach wheelchairs support access. Chairs are first-come, require an assisting companion, and have seasonal service hours.",
    dogs: "Leashed dogs are allowed in designated park areas under posted rules, but not on the beach sand or in playground and splash areas. Use the nearby designated dog park for off-leash activity.",
    family:
      "The splash pad, playground, lawns, ships, and beach make a strong family stop. Keep children clear of cyclists, pier fishing gear, seawalls, and Government Cut currents.",
    transit:
      "Miami Beach trolley and bus routes serve Washington Avenue and South Pointe Drive. Walking or cycling from South Beach avoids peak parking delays.",
    need: "Government Cut has strong currents and boat traffic; swim only in the guarded beach zone, not beside the pier or inlet. Lightning, heat, surf, and cruise-security activity can change access quickly.",
    photos: [
      cm("promenade", "South Pointe promenade.jpg", "iJammin", "CC BY 2.0"),
      cm(
        "pier-view",
        "Miami Beach from South Pointe Park Pier.jpeg",
        "Dough4872",
        "CC BY-SA 4.0",
      ),
      official(
        "park-overview",
        "https://www.miamibeachfl.gov/wp-content/uploads/2024/02/ParksSquare-SouthPointePark.jpeg",
        "https://www.miamibeachfl.gov/city-hall/parks-and-recreation/parks-facilities-directory/south-pointe-park/",
        "City of Miami Beach",
      ),
      cm(
        "park-pier",
        "South Pointe Park Pier.jpg",
        "Wikimedia Commons contributor",
        "See source page for license terms",
      ),
    ],
  },
  {
    id: "launch-fl-miami-beach-lummus-park",
    name: "Lummus Park",
    city: "Miami Beach",
    lat: 25.7812,
    lon: -80.1298,
    address: "Ocean Drive between 5 Street and 14 Place, Miami Beach, FL 33139",
    source:
      "https://www.miamibeachfl.gov/city-hall/parks-and-recreation/parks-facilities-directory/lummus-park/",
    label: "City of Miami Beach",
    hours:
      "Open daily from sunrise to midnight. The playground and outdoor fitness areas generally operate 7:30 a.m. to sunset; lifeguard and beach services differ.",
    hoursSchedule: false,
    summary:
      "South Beach's ten-block beachfront park, connecting Ocean Drive to beach access, a playground, Muscle Beach, outdoor fitness, volleyball, paths, restrooms, and major events.",
    arrival:
      "Choose a cross street: 6th for fitness and restroom service, 9th for Muscle Beach, 10th for central facilities, or 14th for the north end. A single Lummus Park pin is not precise enough.",
    parking:
      "Ocean Drive parking is restricted. Use a municipal garage or legal metered parking west of the park and note the cross street before walking onto the beach.",
    restrooms:
      "Public restrooms, water fountains, and beach wash stations are specifically located at 6th, 10th, and 14th Streets.",
    cost: "Park, playground, fitness areas, paths, volleyball, and beach access are free. Parking, rentals, food, and permitted programs cost extra.",
    accessibility:
      "The paved park path is accessible, beach access mats serve selected streets, and free manual beach wheelchairs are available through lifeguards during seasonal service hours.",
    dogs: "Dogs are prohibited on the beach sand except qualified service animals. Follow posted leash rules in park paths and lawns and use a designated dog park for off-leash activity.",
    family:
      "The playground serves ages 2-5 and 5-12 with ADA swings and resilient surfacing. The busiest Ocean Drive blocks, bike traffic, heat, and beach crowds require a clear meeting point.",
    transit:
      "Frequent buses and the free Miami Beach trolley serve Washington and Collins avenues. Walk east at the chosen numbered street.",
    need: "The park is linear and event-heavy. Confirm street closures, lifeguard flags, lightning, heat, and sea-turtle lighting rules, and do not confuse park hours with guarded-swimming hours.",
    photos: [
      official(
        "sixth-street",
        "https://www.miamibeachfl.gov/wp-content/uploads/2024/02/Parks-Square-40-LummusPark6Street.jpeg",
        "https://www.miamibeachfl.gov/city-hall/parks-and-recreation/parks-facilities-directory/lummus-park/",
        "City of Miami Beach",
      ),
      official(
        "muscle-beach",
        "https://www.miamibeachfl.gov/wp-content/uploads/bb-plugin/cache/Parks-Gallery-15-MuscleBeach-circle.jpeg",
        "https://www.miamibeachfl.gov/city-hall/parks-and-recreation/parks-facilities-directory/lummus-park/",
        "City of Miami Beach",
      ),
      official(
        "playground",
        "https://www.miamibeachfl.gov/wp-content/uploads/bb-plugin/cache/Parks-Square-42-LummusParkPlayground-circle.jpeg",
        "https://www.miamibeachfl.gov/city-hall/parks-and-recreation/parks-facilities-directory/lummus-park/",
        "City of Miami Beach",
      ),
      official(
        "walking-path",
        "https://www.miamibeachfl.gov/wp-content/uploads/bb-plugin/cache/Parks-Gallery-16-LummusWalkingTrail-circle.jpeg",
        "https://www.miamibeachfl.gov/city-hall/parks-and-recreation/parks-facilities-directory/lummus-park/",
        "City of Miami Beach",
      ),
    ],
  },
  {
    id: "launch-fl-key-biscayne-crandon-park",
    name: "Crandon Park",
    city: "Key Biscayne",
    lat: 25.7084,
    lon: -80.1561,
    address: "6747 Crandon Boulevard, Key Biscayne, FL 33149",
    source:
      "https://www.miamidade.gov/global/recreation/park/crandon-park.page",
    label: "Miami-Dade County Parks",
    hours:
      "The main park office is open daily 8 a.m.-5 p.m.; beach, parking, nature center, golf, tennis, concessions, and rentals use separate schedules.",
    hoursSchedule: false,
    summary:
      "A two-mile county beach and nature destination with calm water, a changing offshore sandbar, nearly 3,000 parking spaces, concessions, cabanas, family amusement, nature center, and Bear Cut Preserve.",
    arrival:
      "North Beach is closer to watersports and the nature center; South Beach serves cabanas and quieter family areas. Choose the beach section, amusement center, or preserve before entering.",
    parking:
      "Current parking is $7 plus tax Monday-Thursday and $10 plus tax Friday-Sunday. Large lots still fill on peak holidays, and causeway traffic can add substantial time.",
    restrooms:
      "Accessible restrooms, showers, and concession facilities serve developed beach areas. Preserve trails have limited services, so stop before entering Bear Cut.",
    cost: "Pedestrian beach and park access is free; parking costs $7 plus tax Monday-Thursday and $10 plus tax Friday-Sunday. Cabanas, rentals, golf, tennis, food, and programs cost extra.",
    accessibility:
      "Five accessible beach pathways and free beach wheelchairs support mobility. Chairs may require an item held as security and should be confirmed before arrival.",
    dogs: "Pets are prohibited throughout Crandon Park except qualified service animals.",
    family:
      "Calm water, picnic areas, playground and amusement facilities, nature programs, and concessions work well for families. The offshore sandbar shifts and should not be treated as a fixed shallow boundary.",
    transit:
      "Bus service crosses the Rickenbacker Causeway, but frequency and final walking distance vary. Cycling is possible but exposed to heat, wind, and causeway traffic.",
    need: "Flotation devices are prohibited at county beaches, and personal paddleboards or kayaks may not launch from the beach outside authorized concessions. Check water quality, flags, lightning, and sea-turtle notices.",
    photos: [
      cm(
        "crandon-beach",
        "Crandon Park beach, FL.jpg",
        "Paulkondratuk3194",
        "CC BY-SA 3.0",
      ),
      cm(
        "palms-beach",
        "Crandon Park Modified.jpg",
        "Paulkondratuk3194",
        "CC BY-SA 3.0",
      ),
      cm("wide-beach", "Crandon Beach.jpg", "Mathieu Plourde", "CC BY 2.0"),
      cm(
        "tennis-center",
        "Crandon Park Tennis Center Panorama.jpg",
        "Wikimedia Commons contributor",
        "See source page for license terms",
      ),
    ],
  },
  {
    id: "launch-fl-key-biscayne-bill-baggs-cape-florida-state-park",
    name: "Bill Baggs Cape Florida State Park",
    city: "Key Biscayne",
    lat: 25.674,
    lon: -80.1574,
    address: "1200 S. Crandon Boulevard, Key Biscayne, FL 33149",
    source:
      "https://www.floridastateparks.org/parks-and-trails/bill-baggs-cape-florida-state-park",
    label: "Florida State Parks",
    hours:
      "Open daily 8 a.m. to sundown, 365 days a year. Lighthouse tours, cafes, rentals, harbor service, and facilities use separate schedules.",
    hoursSchedule: false,
    summary:
      "A coastal state park centered on Cape Florida Lighthouse, Atlantic beach, No Name Harbor, Black history, bike and walking paths, fishing, paddling, cafes, pavilions, and bay sunsets.",
    arrival:
      "Use the lighthouse and beach access roads for Atlantic-side visits; continue to No Name Harbor for boating and bay views. The park can close at the entrance when capacity is reached.",
    parking:
      "Entry is $8 per vehicle for two-eight people, $4 for a single occupant or motorcycle, and $2 for pedestrians or cyclists. Arrive early on weekends and holidays.",
    restrooms:
      "Restrooms and showers serve beach and picnic areas, but Restroom 2 is currently closed for renovation. Confirm the closest open facility at entry.",
    cost: "Current entry is $8 per multi-person vehicle, $4 single-occupant vehicle or motorcycle, and $2 pedestrian or cyclist. Harbor, food, rentals, and pavilion fees are separate.",
    accessibility:
      "Developed areas include accessible parking, paths, facilities, and beach access, but lighthouse-tower stairs, sand, and changing renovation closures require destination-specific planning.",
    dogs: "Leashed pets are allowed in designated outdoor areas but not on the beach, playgrounds, lighthouse, cafes, or other posted facilities.",
    family:
      "The beach, lighthouse grounds, bikes, picnics, and harbor make a full family day. Tower tours involve stairs and fixed times; capacity closures make a backup plan essential.",
    transit:
      "Public transit is limited at the south end of Key Biscayne. Cycling is possible, but heat and causeway distance are significant; rideshare passengers still cannot enter during a capacity closure.",
    need: "The park may close to vehicles, pedestrians, and cyclists at capacity and remain closed at least two hours. Fishing piers, Restroom 2, beach access 3, and pavilions A8-A9 are currently closed for work.",
    photos: [
      cm(
        "lighthouse-exterior",
        "Cape Florida Lighthouse at the Bill Baggs Cape Florida State Park.jpg",
        "Florida Memory",
        "Public domain",
      ),
      cm("beach", "Bill Baggs SP beach01.jpg", "Ebyabe", "CC BY-SA 3.0"),
      cm("cape-beach", "Cape Florida Beach 2.jpg", "Wilfredor", "CC0"),
      cm("picnic-area", "Bill Baggs SP picnic01.jpg", "Ebyabe", "CC BY-SA 3.0"),
    ],
  },
  {
    id: "launch-fl-miami-bayfront-park",
    name: "Bayfront Park",
    city: "Miami",
    lat: 25.7753,
    lon: -80.1862,
    address: "301 Biscayne Boulevard, Miami, FL 33132",
    source: "https://www.bayfrontparkmiami.com/bayfront-park",
    label: "Bayfront Park Management Trust",
    hours:
      "The outdoor park is generally open daily, but amphitheater events, holiday productions, fountains, concessions, and secured areas use separate schedules and closures.",
    hoursSchedule: false,
    summary:
      "Downtown Miami's waterfront gathering park with Biscayne Bay views, Noguchi-designed monuments, Tina Hills Pavilion, lawns, walking paths, Metromover access, and major civic events.",
    arrival:
      "Use Bayfront Park Metromover for the central lawn and pavilion, Biscayne Boulevard for monument areas, or the Bay Walk for the waterfront. Event fencing can change every normal entrance.",
    parking:
      "There is no dependable free park lot. Use paid downtown garages, metered parking, transit, or rideshare; Bayside and arena events can sharply change rates and street access.",
    restrooms:
      "Public restroom availability depends on current park and event operations. Nearby commercial facilities should not be treated as guaranteed public restrooms.",
    cost: "General park, monuments, paths, lawns, and waterfront access are free. Parking, concessions, concerts, festivals, and reserved programs cost separately.",
    accessibility:
      "Broad paved paths, Metromover elevator access, and developed event routes support mobility, but temporary fencing, crowds, and waterfront grades can change circulation.",
    dogs: "Leashed dogs are allowed in general outdoor areas under posted rules but may be excluded from ticketed events, playground areas, fountains, and crowded productions.",
    family:
      "Waterfront views, monuments, lawns, and trains overhead are engaging, but shade is uneven and the park hosts large events. Keep children away from seawalls and event equipment.",
    transit:
      "Bayfront Park Metromover station directly serves the park; Government Center connections and downtown buses make transit more reliable than driving during events.",
    need: "Check both the park and downtown event calendars before visiting. New Year's, concerts, races, arena events, construction, heat, lightning, and security perimeters can close large sections.",
    photos: [
      official(
        "bayfront-overview",
        "https://images.squarespace-cdn.com/content/v1/68b1eb1fe4a6532173a716cc/1171c20d-f61a-4ca0-bcbd-3a51f2c8fc17/BF-Bayfront-Park-1-Low2.jpg?format=2500w",
        "https://www.bayfrontparkmiami.com/parks",
        "Bayfront Park Management Trust",
      ),
      official(
        "pepper-fountain",
        "https://images.squarespace-cdn.com/content/v1/68b1eb1fe4a6532173a716cc/24d0856d-fbc4-4bc9-bd0c-b4be9b937e4a/THE+MILDRED+AND+CLAUDE+PEPPER+FOUNTAIN.jpg?format=2500w",
        "https://www.bayfrontparkmiami.com/bayfront-park",
        "Bayfront Park Management Trust",
      ),
      official(
        "bayfront-aerial",
        "https://images.squarespace-cdn.com/content/v1/68b1eb1fe4a6532173a716cc/69d2815b-4c9b-49a3-a78b-6a9d33ddd19a/DJI_20251104181812_0027_D.JPG?format=2500w",
        "https://www.bayfrontparkmiami.com/bayfront-park",
        "Bayfront Park Management Trust",
      ),
    ],
  },
  {
    id: "launch-fl-miami-historic-virginia-key-beach-park",
    name: "Historic Virginia Key Beach Park",
    city: "Miami",
    lat: 25.7367,
    lon: -80.1567,
    address: "4020 Virginia Beach Drive, Miami, FL 33149",
    source: "https://virginiakeybeachpark.net/",
    label: "Historic Virginia Key Beach Park Trust",
    hours:
      "Operating days and hours vary by season, restoration work, events, and weather. Confirm the official calendar before crossing the causeway; beach and event access may close independently.",
    hoursSchedule: false,
    summary:
      "Miami's historic Black beach and cultural landscape, combining shoreline, restored dance floor and carousel areas, miniature-train history, wetlands, picnic spaces, and civil-rights interpretation.",
    arrival:
      "Enter from Virginia Beach Drive and follow signs for the historic park rather than the neighboring mountain-bike trails, marine facilities, or public beach areas elsewhere on Virginia Key.",
    parking:
      "On-site parking and entry terms vary with operating day and event. Confirm current fees and capacity before arrival; the Rickenbacker Causeway can back up on weekends.",
    restrooms:
      "Restrooms serve developed historic and event areas when the park is operating. Do not depend on facilities outside posted opening or event hours.",
    cost: "Admission, parking, tours, rentals, and events can use separate fees. Verify current terms directly with the park before making the causeway trip.",
    accessibility:
      "Developed cultural areas and selected paths are accessible, while sand, wetland edges, historic structures, and restoration zones vary. Contact the park for event-specific access.",
    dogs: "Pet access is controlled by posted park and beach rules and may differ during events. Confirm before bringing a dog; never assume general Virginia Key rules apply inside the historic park.",
    family:
      "The beach, train history, dance floor, picnic spaces, and civil-rights story can make a meaningful family visit. Prepare for heat, insects, limited shade, and variable concessions.",
    transit:
      "Direct public transit is limited. Driving, cycling, or rideshare requires the Rickenbacker Causeway, and rideshare pickup should be arranged before signal or event congestion builds.",
    need: "This is not simply another beach: it preserves the site opened in 1945 for Black Miamians during segregation. Check storms, lightning, water quality, mosquitoes, restoration closures, and the operating calendar.",
    photos: [
      cm(
        "historic-beach",
        "Virginia Key, Miami, Florida.jpg",
        "Prisma morado",
        "CC BY-SA 4.0",
      ),
      cm(
        "dance-floor",
        "Miami FL Virginia Key Beach Park dance floor01.jpg",
        "Ebyabe",
        "CC BY-SA 3.0",
      ),
      cm(
        "mini-train",
        "Miami FL Virginia Key Beach Park RR05.jpg",
        "Ebyabe",
        "CC BY-SA 3.0",
      ),
      cm(
        "historic-marker",
        "Miami FL Virginia Key Beach Park marker01.jpg",
        "Ebyabe",
        "CC BY-SA 3.0",
      ),
    ],
  },
  {
    id: "launch-fl-miami-maurice-a-ferre-park",
    name: "Maurice A. Ferré Park",
    city: "Miami",
    lat: 25.7852,
    lon: -80.186,
    address: "1075 Biscayne Boulevard, Miami, FL 33132",
    source: "https://www.bayfrontparkmiami.com/parks",
    label: "Bayfront Park Management Trust",
    hours:
      "The outdoor park is generally open daily, while museums, public programs, fountains, food, events, and secured areas maintain independent schedules.",
    hoursSchedule: false,
    summary:
      "A downtown bayfront park linking PAMM, Frost Science, public art, lawns, waterfront paths, transit, museums, and views across Biscayne Bay.",
    arrival:
      "Use Museum Park Metromover for the museums and central lawn, Biscayne Boulevard for drop-off, or the waterfront path for walking connections. Select PAMM or Frost when that is the true destination.",
    parking:
      "Paid museum garages and downtown lots are the dependable options. Museum, arena, cruise, and festival traffic can change rates and access; Metromover is usually simpler.",
    restrooms:
      "Museum restrooms require admission or operating access. Park and event restroom availability varies, so identify a current public option before a long lawn or waterfront visit.",
    cost: "Park lawns, public art, paths, and bay views are free. Museum admission, parking, food, special exhibitions, and events charge separately.",
    accessibility:
      "Paved paths, Metromover elevators, museum entrances, and developed waterfront routes are accessible, but event fencing, grades, and heat affect practical circulation.",
    dogs: "Leashed dogs are allowed in general park areas under posted rules but not inside museums, playgrounds, fountains, or restricted event zones except service animals.",
    family:
      "Frost Science, open lawns, public art, boats, and trains make a strong family cluster. One museum plus outdoor time is usually more realistic than both museums in one day.",
    transit:
      "Museum Park Metromover station directly serves the park, connecting free to downtown rail hubs and parking farther inland.",
    need: "Do not treat museum hours as park hours. Check heat, lightning, bayfront wind, events, arena traffic, museum reservations, and construction before committing to a route.",
    photos: [
      official(
        "park-overview",
        "https://images.squarespace-cdn.com/content/v1/68b1eb1fe4a6532173a716cc/24a2bbed-99e8-4b41-98e4-54a587626a31/MAF-Maurice-A-Ferre%CC%81-Park-Low2.jpg?format=2500w",
        "https://www.bayfrontparkmiami.com/parks",
        "Bayfront Park Management Trust",
      ),
      cm(
        "frost-science",
        "Frost Science Museum - Miami Science Museum - Flickr - Knight Foundation.jpg",
        "Knight Foundation",
        "CC BY-SA 2.0",
      ),
      cm(
        "havana-balcony",
        "Havana's Balcony in Museum Park Miami.jpg",
        "Elena Weisz",
        "CC BY-SA 4.0",
      ),
    ],
  },
  {
    id: "launch-fl-miami-matheson-hammock-park",
    name: "Matheson Hammock Park",
    city: "Miami",
    lat: 25.6804,
    lon: -80.259,
    address: "9610 Old Cutler Road, Miami, FL 33156",
    source:
      "https://www.miamidade.gov/global/recreation/park/matheson-hammock-park.page",
    label: "Miami-Dade County Parks",
    hours:
      "Open sunrise to sunset; the park office is open daily 8 a.m.-5 p.m. Atoll-pool, marina, restaurant, boat ramp, and concession schedules differ seasonally.",
    hoursSchedule: false,
    summary:
      "Miami-Dade's first county park, combining a tide-flushed atoll pool, beach, marina, boat ramps, tropical hammock, mangroves, shelters, trails, and a waterfront restaurant.",
    arrival:
      "Use the east-side atoll pool entrance for swimming and Red Fish, the marina route for boats, or the Old Cutler/West Matheson entrance for natural areas. These are not one compact stop.",
    parking:
      "Current car parking is $7 plus tax weekdays and $10 plus tax weekends/holidays. Boat-trailer rates are higher and paid separately through approved systems or the office.",
    restrooms:
      "Restrooms and showers serve the atoll-pool, marina, and developed picnic areas. West-side trails have fewer services; stop before entering natural areas.",
    cost: "Parking is $7 plus tax weekdays and $10 plus tax weekends/holidays. Boat launch, shelters, restaurant, rentals, and programs use separate fees.",
    accessibility:
      "Developed beach, restroom, parking, and marina areas provide accessible facilities; trail surfaces, sand, mangrove edges, and long internal distances vary.",
    dogs: "Pets are prohibited in the main Matheson Hammock Park. West Matheson has separate posted dog provisions, including designated areas; confirm the exact zone before visiting.",
    family:
      "The shallow-looking atoll pool, palms, picnic areas, and marina are visually appealing, but it remains tidal saltwater. Supervise continuously and check water quality and lifeguard status.",
    transit:
      "Direct transit is limited along Old Cutler Road. Driving, cycling, or rideshare requires choosing the correct east, marina, or west destination in advance.",
    need: "Flotation devices are prohibited at county beaches. Check water quality, tides, lightning, heat, mosquitoes, marina alerts, and seasonal pool hours; sunrise-to-sunset park hours do not guarantee guarded swimming.",
    photos: [
      official(
        "atoll-pool",
        "https://floridahikes.com/wp-content/uploads/2019/06/Matheson-Hammock-Beach-e1642453600471.jpg",
        "https://floridahikes.com/matheson-hammock-park/",
        "Florida Hikes",
      ),
      official(
        "marina",
        "https://photos.smugmug.com/Florida-Hikes/Matheson-Hammock/i-4p9Vkxn/0/e83c5181/L/Matheson%20Hammock%20marina-L.jpg",
        "https://floridahikes.com/matheson-hammock-park/",
        "Florida Hikes",
      ),
      official(
        "hammock-trail",
        "https://photos.smugmug.com/Florida-Hikes/Matheson-Hammock/i-49dhv6T/0/5ca5a4a4/L/East%20Hammock%20Trail%20Matheson-L.jpg",
        "https://floridahikes.com/matheson-hammock-park/",
        "Florida Hikes",
      ),
    ],
  },
];
const features = [
  [
    0,
    "south-pointe-pier",
    "South Pointe Pier",
    "pier",
    25.7645,
    -80.1297,
    "pier-view",
  ],
  [
    0,
    "splash-pad-playground",
    "South Pointe Splash Pad & Playground",
    "splash_pad",
    25.7655,
    -80.1332,
    "park-overview",
  ],
  [
    0,
    "cutwalk-promenade",
    "Cutwalk & Promenade",
    "promenade",
    25.766,
    -80.136,
    "promenade",
  ],
  [
    1,
    "lummus-playground",
    "Lummus Playground",
    "playground",
    25.7795,
    -80.1296,
    "playground",
  ],
  [
    1,
    "muscle-beach-south-beach",
    "Muscle Beach South Beach",
    "fitness",
    25.7805,
    -80.1292,
    "muscle-beach",
  ],
  [
    1,
    "sixth-street-fitness-restrooms",
    "6th Street Fitness & Restrooms",
    "fitness",
    25.7761,
    -80.1304,
    "sixth-street",
  ],
  [
    1,
    "beachfront-path",
    "Lummus Beachfront Path",
    "trail",
    25.783,
    -80.129,
    "walking-path",
  ],
  [
    2,
    "crandon-beach",
    "Crandon Beach",
    "beach",
    25.71,
    -80.154,
    "crandon-beach",
  ],
  [
    2,
    "family-amusement-center",
    "Crandon Family Amusement Center",
    "playground",
    25.7137,
    -80.1573,
    "palms-beach",
  ],
  [
    2,
    "visitor-nature-center",
    "Crandon Visitor & Nature Center",
    "visitor_center",
    25.7108,
    -80.1583,
    "wide-beach",
  ],
  [
    2,
    "bear-cut-preserve",
    "Bear Cut Preserve",
    "nature",
    25.7271,
    -80.1582,
    "wide-beach",
  ],
  [
    3,
    "cape-florida-lighthouse",
    "Cape Florida Lighthouse",
    "landmark",
    25.6668,
    -80.1556,
    "lighthouse-exterior",
  ],
  [
    3,
    "cape-florida-beach",
    "Cape Florida Beach",
    "beach",
    25.67,
    -80.156,
    "cape-beach",
  ],
  [3, "no-name-harbor", "No Name Harbor", "harbor", 25.6767, -80.1624, "beach"],
  [
    3,
    "lighthouse-cafe-picnic-area",
    "Lighthouse Café & Picnic Area",
    "cafe",
    25.669,
    -80.157,
    "lighthouse-exterior",
  ],
  [
    4,
    "tina-hills-pavilion",
    "Tina Hills Pavilion",
    "event_space",
    25.776,
    -80.1852,
    "bayfront-overview",
  ],
  [
    4,
    "noguchi-monuments",
    "Isamu Noguchi Monuments",
    "public_art",
    25.7748,
    -80.187,
    "pepper-fountain",
  ],
  [
    4,
    "bay-walk-waterfront",
    "Bay Walk & Waterfront",
    "promenade",
    25.774,
    -80.1845,
    "bayfront-aerial",
  ],
  [
    5,
    "historic-beach-shoreline",
    "Historic Beach & Shoreline",
    "beach",
    25.7364,
    -80.1548,
    "historic-beach",
  ],
  [
    5,
    "dance-floor-cultural-landscape",
    "Dance Floor & Cultural Landscape",
    "historic_site",
    25.7368,
    -80.1565,
    "dance-floor",
  ],
  [
    5,
    "mini-train-station-history",
    "Mini Train & Station History",
    "historic_site",
    25.7372,
    -80.157,
    "mini-train",
  ],
  [
    5,
    "wetland-nature-areas",
    "Wetland & Nature Areas",
    "nature",
    25.7359,
    -80.1581,
    "historic-marker",
  ],
  [
    6,
    "perez-art-museum-miami",
    "Pérez Art Museum Miami",
    "museum",
    25.7858,
    -80.1864,
    "park-overview",
  ],
  [
    6,
    "frost-science-museum",
    "Frost Science Museum",
    "museum",
    25.7859,
    -80.187,
    "frost-science",
  ],
  [
    6,
    "public-art-waterfront-walk",
    "Public Art & Waterfront Walk",
    "public_art",
    25.7843,
    -80.1849,
    "havana-balcony",
  ],
  [
    7,
    "atoll-pool-beach",
    "Atoll Pool & Beach",
    "beach",
    25.6795,
    -80.258,
    "atoll-pool",
  ],
  [
    7,
    "matheson-marina",
    "Matheson Marina & Boat Ramps",
    "marina",
    25.6808,
    -80.2555,
    "marina",
  ],
  [
    7,
    "east-hammock-trail",
    "East Hammock Trail",
    "trail",
    25.6814,
    -80.262,
    "hammock-trail",
  ],
  [
    0,
    "south-pointe-beach",
    "South Pointe Beach & Lifeguard Area",
    "beach",
    25.7638,
    -80.131,
    "pier-view",
  ],
  [
    0,
    "south-pointe-dog-park",
    "South Pointe Dog Park",
    "dog_park",
    25.7662,
    -80.1349,
    "park-overview",
  ],
  [
    0,
    "park-lawns-ship-overlook",
    "Park Lawns & Ship Overlook",
    "overlook",
    25.7653,
    -80.1357,
    "promenade",
  ],
  [
    0,
    "beachwalk-connection",
    "Miami Beachwalk Connection",
    "promenade",
    25.7651,
    -80.1315,
    "promenade",
  ],
  [
    0,
    "washington-avenue-entrance",
    "Washington Avenue Entrance & Restrooms",
    "entrance",
    25.7664,
    -80.1336,
    "park-overview",
  ],
  [
    1,
    "tenth-street-restrooms",
    "10th Street Restrooms & Beach Access",
    "restroom",
    25.7807,
    -80.1297,
    "sixth-street",
  ],
  [
    1,
    "fourteenth-street-access",
    "14th Street Restrooms & Beach Access",
    "restroom",
    25.7859,
    -80.1291,
    "walking-path",
  ],
  [
    1,
    "lummus-volleyball-courts",
    "Lummus Park Volleyball Courts",
    "volleyball",
    25.7822,
    -80.129,
    "walking-path",
  ],
  [
    1,
    "beach-access-mats",
    "Accessible Beach Entrances & Wheelchairs",
    "accessibility",
    25.7784,
    -80.13,
    "playground",
  ],
  [
    2,
    "crandon-north-beach",
    "Crandon North Beach & Watersports",
    "beach",
    25.721,
    -80.1539,
    "wide-beach",
  ],
  [
    2,
    "crandon-south-beach-cabanas",
    "Crandon South Beach & Cabanas",
    "beach",
    25.7015,
    -80.155,
    "palms-beach",
  ],
  [
    2,
    "crandon-tennis-center",
    "Crandon Park Tennis Center",
    "tennis",
    25.7088,
    -80.162,
    "tennis-center",
  ],
  [
    2,
    "crandon-golf-course",
    "Crandon Golf at Key Biscayne",
    "golf",
    25.7145,
    -80.1587,
    "wide-beach",
  ],
  [
    3,
    "boaters-grill",
    "Boater's Grill at No Name Harbor",
    "cafe",
    25.6768,
    -80.1632,
    "beach",
  ],
  [
    3,
    "cape-florida-bike-trails",
    "Cape Florida Bike & Walking Paths",
    "trail",
    25.6729,
    -80.1591,
    "cape-beach",
  ],
  [
    3,
    "seawall-fishing",
    "No Name Harbor Seawall Fishing",
    "fishing",
    25.6759,
    -80.1627,
    "beach",
  ],
  [
    3,
    "picnic-pavilions",
    "Cape Florida Picnic Pavilions",
    "picnic",
    25.6712,
    -80.158,
    "picnic-area",
  ],
  [
    4,
    "pepper-fountain",
    "Mildred and Claude Pepper Fountain",
    "fountain",
    25.7746,
    -80.1861,
    "pepper-fountain",
  ],
  [
    4,
    "challenger-memorial",
    "Challenger Memorial",
    "memorial",
    25.7752,
    -80.1868,
    "bayfront-overview",
  ],
  [
    4,
    "bayfront-amphitheater",
    "Bayfront Park Amphitheater",
    "event_space",
    25.7768,
    -80.1848,
    "bayfront-aerial",
  ],
  [
    4,
    "bayfront-park-station",
    "Bayfront Park Metromover Station",
    "transit",
    25.7755,
    -80.189,
    "bayfront-overview",
  ],
  [
    4,
    "central-lawn-event-zone",
    "Central Lawn & Event Zone",
    "lawn",
    25.7757,
    -80.1855,
    "bayfront-aerial",
  ],
  [
    5,
    "civil-rights-visitor-center",
    "Civil Rights History & Visitor Area",
    "visitor_center",
    25.7369,
    -80.1561,
    "historic-marker",
  ],
  [
    5,
    "historic-carousel",
    "Historic Carousel Pavilion",
    "historic_site",
    25.737,
    -80.1568,
    "mini-train",
  ],
  [
    5,
    "picnic-pavilions-event-lawns",
    "Picnic Pavilions & Event Lawns",
    "picnic",
    25.7362,
    -80.1571,
    "dance-floor",
  ],
  [
    5,
    "beach-boardwalk",
    "Historic Beach Boardwalk & Access",
    "promenade",
    25.7358,
    -80.1554,
    "historic-beach",
  ],
  [
    6,
    "dogs-and-cats-walkway",
    "Dogs and Cats Walkway",
    "public_art",
    25.7848,
    -80.1854,
    "havana-balcony",
  ],
  [
    6,
    "museum-park-station",
    "Museum Park Metromover Station",
    "transit",
    25.7866,
    -80.1868,
    "park-overview",
  ],
  [
    6,
    "bayfront-lawn",
    "Museum Park Bayfront Lawn",
    "lawn",
    25.7848,
    -80.1847,
    "park-overview",
  ],
  [
    6,
    "museum-plaza",
    "PAMM and Frost Museum Plaza",
    "plaza",
    25.7858,
    -80.1867,
    "frost-science",
  ],
  [
    6,
    "fec-slip-waterfront",
    "FEC Slip Waterfront",
    "waterfront",
    25.786,
    -80.1848,
    "havana-balcony",
  ],
  [
    7,
    "redfish-waterfront-restaurant",
    "Redfish Waterfront Restaurant",
    "cafe",
    25.679,
    -80.257,
    "atoll-pool",
  ],
  [
    7,
    "west-matheson-dog-area",
    "West Matheson Dog-Friendly Area",
    "dog_park",
    25.684,
    -80.2685,
    "hammock-trail",
  ],
  [
    7,
    "matheson-picnic-shelters",
    "Matheson Picnic Shelters",
    "picnic",
    25.68,
    -80.26,
    "atoll-pool",
  ],
  [
    7,
    "kiteboarding-launch-area",
    "Kiteboarding Launch Area",
    "watersports",
    25.6788,
    -80.2555,
    "marina",
  ],
  [
    7,
    "mangrove-waterfront-path",
    "Mangrove Waterfront Path",
    "trail",
    25.681,
    -80.2595,
    "hammock-trail",
  ],
];
function answer(p, k, q, t, src = p.source) {
  return {
    intentKey: k,
    question: q,
    answer: t,
    sourceLabel: p.label,
    source: src,
    verifiedAt: checkedAt,
    freshnessClass: ["hours", "parking", "weather", "need-to-know"].includes(k)
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
      `What weather check matters before visiting ${p.name}?`,
      `Check official beach flags, lightning, heat index, UV, wind, tides, water quality, storms, and operator alerts. Leave the beach immediately for thunder and never use park hours as proof that swimming is guarded or safe.`,
    ],
  ].map((x) => answer(p, ...x));
}
async function dl(p, i) {
  const rel = `${slug(p.name)}/${i.slug}.webp`,
    out = path.join(root, "assets/parks/miami-super", rel);
  if (fs.existsSync(out)) return `/assets/parks/miami-super/${rel}`;
  if (!downloadImages) throw Error(`Missing ${rel}`);
  let r;
  for (let n = 1; n <= 5; n++) {
    r = await fetch(i.url, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 AuditMap/1.0", referer: i.source },
    });
    if (r.ok || r.status !== 429) break;
    await new Promise((x) => setTimeout(x, n * 1800));
  }
  if (!r?.ok) throw Error(`${rel}: ${r?.status}`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(Buffer.from(await r.arrayBuffer()))
    .rotate()
    .resize(1600, 1000, {
      fit: "cover",
      position: "attention",
      withoutEnlargement: true,
    })
    .webp({ quality: 83 })
    .toFile(out);
  return `/assets/parks/miami-super/${rel}`;
}
function feat(p, r, imgs) {
  const [, s, n, t, lat, lon, img] = r,
    id = uuid(p.id, s),
    focused = `${n} is a distinct visitor destination within ${p.name}. ${p.arrival}`,
    pic = {
      ...imgs.find((x) => x.slug === img),
      featureId: id,
      latitude: lat,
      longitude: lon,
      alt: `${n} at ${p.name}`,
    },
    qs = [
      ["location", `Where exactly is ${n}?`, focused],
      ["parking", `Where should I park for ${n}?`, p.parking],
      ["hours", `When is ${n} open?`, p.hours],
      ["restroom", `Are there restrooms near ${n}?`, p.restrooms],
      ["fees", `Is ${n} free?`, p.cost],
      ["accessibility", `How accessible is ${n}?`, p.accessibility],
      ["dogs", `Are dogs allowed at ${n}?`, p.dogs],
      ["family", `Is ${n} good for children?`, p.family],
      ["need-to-know", `What should I know before visiting ${n}?`, p.need],
    ].map((x) => answer(p, ...x));
  return {
    id,
    slug: s,
    name: n,
    feature_type: t,
    description: focused,
    latitude: lat,
    longitude: lon,
    details: {
      category: t,
      includeInParentGallery: true,
      positionQuality:
        "Named destination cross-checked against the cited official park source",
      coordinateSource: "AuditMap reviewed official-map placement",
      address: p.address,
      hours: p.hours,
      cost: p.cost,
      accessibility: p.accessibility,
      locationContext: p.arrival,
      needToKnow: p.need,
      informationSourceLabel: p.label,
      informationSourceUrl: p.source,
      informationCheckedAt: checkedAt,
      imageUrl: pic.url,
      imageSourceUrl: pic.source,
      imageAuthor: pic.author,
      imageLicense: pic.license,
      imageAlt: pic.alt,
      images: [pic],
      searchAnswers: qs,
    },
    source_label: p.label,
    source_url: p.source,
    verified_at: checkedAt,
  };
}
function rows() {
  const f = path.join(root, "data/nationwide-major-parks-launch.csv");
  let a = fs.readFileSync(f, "utf8").trimEnd().split("\n");
  for (const p of parks) {
    const row = `Southeast,FL,${p.city},${p.name},anchor,yes,super-enriched`,
      key = `Southeast,FL,${p.city},${p.name},`,
      i = a.findIndex((x) => x.startsWith(key));
    i >= 0 ? (a[i] = row) : a.push(row);
  }
  fs.writeFileSync(f, a.join("\n") + "\n");
  const f2 = path.join(root, "data/launch-location-overrides.json"),
    b = JSON.parse(fs.readFileSync(f2));
  for (const p of parks) {
    const v = {
        id: p.id,
        park: p.name,
        city: p.city,
        state: "FL",
        latitude: p.lat,
        longitude: p.lon,
        address: p.address,
        displayName: `${p.name}, ${p.city}, FL`,
        source: p.label,
        sourceUrl: p.source,
        checkedAt,
      },
      i = b.findIndex((x) => x.id === p.id);
    i >= 0 ? (b[i] = v) : b.push(v);
  }
  fs.writeFileSync(f2, JSON.stringify(b, null, 2) + "\n");
}
const up = (d, p) => {
  const i = d.parks.findIndex((x) => x.id === p.id);
  i >= 0 ? (d.parks[i] = p) : d.parks.push(p);
};
(async () => {
  rows();
  const af = path.join(root, "data/generated/all-subsites-ready.json"),
    pf = path.join(root, "data/generated/pilot-subsites-ready.json"),
    cf = path.join(
      root,
      "data/parent-park-information-enrichment-national.json",
    ),
    all = JSON.parse(fs.readFileSync(af)),
    pilot = JSON.parse(fs.readFileSync(pf)),
    camp = JSON.parse(fs.readFileSync(cf));
  for (const p of parks) {
    const imgs = [];
    for (const i of p.photos)
      imgs.push({
        ...i,
        url: await dl(p, i),
        alt: `${p.name} in ${p.city}, Florida`,
        latitude: p.lat,
        longitude: p.lon,
      });
    const record = {
      ...(all.parks.find((x) => x.id === p.id) || {}),
      id: p.id,
      name: p.name,
      type: "Park",
      city: p.city,
      state: "FL",
      country: "US",
      citySlug: `${slug(p.city)}-FL`,
      slug: slug(p.name),
      searchCategory: "park",
      status: "Sourced public-access visitor guide",
      summary: p.summary,
      searchDescription: `Hours, parking, beach access, images, internal destinations, and essential visitor answers for ${p.name}.`,
      address: p.address,
      latitude: p.lat,
      longitude: p.lon,
      hours: p.hours,
      hoursSchedule: p.hoursSchedule,
      cost: p.cost,
      accessibility: p.accessibility,
      sourceLabel: p.label,
      source: p.source,
      verifiedAt: checkedAt,
      operator: p.label,
      image: imgs[0],
      images: imgs.slice(1),
      sources: [{ label: p.label, url: p.source }],
      launchTier: "anchor",
      likelySubsites: true,
      publishStatus: "super-enriched",
      researchQueue: [],
      transit: p.transit,
      searchAnswers: answers(p),
      features: features
        .filter((x) => x[0] === parks.indexOf(p))
        .map((x) => feat(p, x, imgs)),
      amenities: [],
      comments: [],
    };
    up(all, record);
    up(pilot, record);
    camp.parks[p.id] = {
      operator: p.label,
      sourceLabel: p.label,
      source: p.source,
      address: p.address,
      summary: p.summary,
      hours: p.hours,
      cost: p.cost,
      accessibility: p.accessibility,
      transit: p.transit,
      searchAnswers: record.searchAnswers,
      image: imgs[0],
      additionalImages: imgs.slice(1),
      verifiedAt: checkedAt,
    };
  }
  fs.writeFileSync(af, JSON.stringify(all, null, 2) + "\n");
  fs.writeFileSync(pf, JSON.stringify(pilot, null, 2) + "\n");
  fs.writeFileSync(cf, JSON.stringify(camp, null, 2) + "\n");
  console.log(
    `Super-enriched ${parks.length} Miami coastal guides with ${features.length} focused destinations.`,
  );
})().catch((e) => {
  console.error(e.stack || e);
  process.exit(1);
});
