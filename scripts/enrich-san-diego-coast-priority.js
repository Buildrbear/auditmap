#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const checkedAt = "2026-08-05";
const downloadImages = process.argv.includes("--download");

const sources = {
  missionBay: "https://www.sandiego.gov/park-and-recreation/parks/regional/missionbay",
  missionBeach: "https://www.sandiego.gov/lifeguards/beaches/mb",
  southMission: "https://www.sandiego.gov/lifeguards/beaches/smb",
  missionSafety: "https://www.sandiego.gov/lifeguards/safety",
  missionAccessibility: "https://www.sandiego.gov/sites/default/files/beachaccesslocations.pdf",
  oceansideBeaches: "https://www.ci.oceanside.ca.us/government/public-works/beaches-pier/beaches",
  oceansidePier: "https://www.ci.oceanside.ca.us/government/public-works/beaches-pier/pier",
  oceansideParking: "https://visitoceanside.org/wp-content/uploads/2025/06/City-of-Oceanside_Parking-Guide_4-9-2025.pdf",
  carlsbadBeach: "https://www.parks.ca.gov/?page_id=653",
  carlsbadOverview: "https://www.carlsbadca.gov/residents/about-carlsbad/beaches/about-carlsbad-beaches/",
  carlsbadSafety: "https://www.carlsbadca.gov/departments/fire/lifeguards/beach-safety",
};

function stableUuid(parentId, slug) {
  const bytes = crypto.createHash("sha256").update(`auditmap:${parentId}:${slug}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uniqueImages(images) {
  return [...new Map(images.filter(Boolean).map((image) => [image.url, image])).values()];
}

function answer(intentKey, question, text, source, sourceLabel) {
  return { intentKey, question, answer: text, sourceLabel, source, sourceType: "official", checkedAt };
}

function featureQuestions(parent, place) {
  const label = place.sourceLabel || parent.sourceLabel;
  return [
    answer("location", `Where exactly is ${place.name}?`, place.arrival, place.page, label),
    answer("parking", `Where should I park for ${place.name}?`, place.parking, place.page, label),
    answer("restroom", `Are there restrooms or showers at ${place.name}?`, place.restrooms, place.page, label),
    answer("accessibility", `What accessibility details should I know at ${place.name}?`, place.accessibility, place.accessibilitySource || place.page, label),
    answer("safety", `What water or beach safety details matter at ${place.name}?`, place.safety, place.safetySource || place.page, label),
    answer("need-to-know", `What should the next visitor know about ${place.name}?`, place.need, place.page, label),
  ];
}

const parents = [
  {
    id: "launch-ca-san-diego-mission-bay-park",
    name: "Mission Bay Park",
    city: "San Diego",
    state: "CA",
    latitude: 32.7756,
    longitude: -117.2322,
    address: "Mission Bay Park",
    sourceLabel: "City of San Diego",
    source: sources.missionBay,
    existing: true,
    priority: 1,
    features: [
      {
        slug: "mission-beach", name: "Mission Beach", type: "beach", category: "Ocean beaches",
        latitude: 32.7715, longitude: -117.2523, page: sources.missionBeach,
        imageUrl: "https://www.sandiego.gov/sites/default/files/mission-beach.jpg",
        imagePage: "https://www.sandiego.gov/planning/community-plans/mission-beach",
        arrival: "Use the Mission Boulevard and Ventura Place area for the main lifeguard station, beach, boardwalk, and Belmont Park waterfront. Route to South Mission Beach instead when you need the large public lot, courts, or jetty.",
        parking: "The main beach has limited public lots and constrained street parking. Summer weekends and event days fill early; use current signs and avoid routing only to the center of the neighborhood.",
        restrooms: "Public restrooms and outdoor showers are available near the main beach and lifeguard station. Facilities can close for cleaning or maintenance, so note the next restroom before walking far along the boardwalk.",
        accessibility: "The City lists disabled access and beach wheelchairs at the main Mission Beach lifeguard station. Beach chairs are first come, first served and require identification; call ahead when this is essential.",
        accessibilitySource: sources.missionAccessibility,
        safety: "Mission Beach has ocean surf and rip-current risk. Swim near a staffed lifeguard, check the daily condition flags, keep children within reach, and do not rely on flotation devices as a substitute for swimming ability.",
        safetySource: sources.missionSafety,
        need: "Mission Beach and Mission Bay are different water environments. This page is for the Pacific Ocean beach; use Bonita Cove or another designated bay beach when calm bay water is the priority.",
      },
      {
        slug: "mission-beach-lifeguard-station", name: "Mission Beach Lifeguard Station & Beach Wheelchairs", type: "visitor_center", category: "Safety & accessibility",
        latitude: 32.7708, longitude: -117.2527, page: sources.missionBeach,
        imageUrl: "https://www.sandiego.gov/sites/default/files/legacy/lifeguards/graphics/mbtower.jpg",
        arrival: "Find the permanent lifeguard station on the oceanfront near Ventura Place. It is the best starting point for current surf guidance, emergency help, and beach-wheelchair availability.",
        parking: "Use legal public parking around Ventura Place and Mission Boulevard, then approach on foot. There is no guaranteed dedicated wheelchair pickup parking space at the station.",
        restrooms: "Public beach restrooms and rinse showers are nearby, but the lifeguard building itself is an operations station rather than a public changing facility.",
        accessibility: "Power beach chairs are based at the main lifeguard station. Availability is first come, first served; confirm the current checkout process before planning around one chair.",
        accessibilitySource: sources.missionAccessibility,
        safety: "Ask the lifeguard about rip currents, swim zones, surfing separation, water quality, and the safest place to enter on the day of the visit.",
        safetySource: sources.missionSafety,
        need: "This is an active emergency-services station. Keep rescue access clear and use staff for current safety guidance rather than treating the building as a general visitor center.",
      },
      {
        slug: "ocean-front-walk", name: "Ocean Front Walk & Mission Beach Boardwalk", type: "trail", category: "Walking & cycling",
        latitude: 32.7734, longitude: -117.2522, page: sources.missionBeach,
        imageUrl: "https://www.sandiego.gov/sites/default/files/legacy/lifeguards/graphics/mbsouth.jpg",
        imagePage: sources.missionBeach,
        arrival: "Join the oceanfront concrete promenade from Ventura Place, Belmont Park, or South Mission Beach. It continues north toward Pacific Beach and south to the large South Mission lot.",
        parking: "Choose parking for the section you intend to use. The South Mission lot is practical for the southern end; central Mission Beach parking is closer to Belmont Park but fills quickly.",
        restrooms: "Restrooms and showers are concentrated near major beach facilities rather than continuous along the promenade. Use the main or South Mission facilities before a long walk.",
        accessibility: "The concrete promenade is the most continuous hard-surface route along Mission Beach, but crowding, sand, driveway crossings, bikes, skates, and temporary obstructions can narrow passage.",
        safety: "The promenade is shared and fast-moving. Keep children and pets predictable, look both ways at access alleys, and step off the travel lane before stopping for photos.",
        need: "This is not a quiet pedestrian-only path. Peak periods mix walkers, runners, bikes, boards, vendors, and beach traffic; early morning is usually easier for an unhurried accessible trip.",
      },
      {
        slug: "south-mission-beach", name: "South Mission Beach", type: "beach", category: "Ocean beaches",
        latitude: 32.7596, longitude: -117.2517, page: sources.southMission,
        imageUrl: "https://www.sandiego.gov/sites/default/files/styles/100_percent/public/south.mission.jpg?itok=RbkEM64s",
        imagePage: sources.southMission,
        arrival: "Route directly to the public lot at the southern end of Mission Boulevard. This is the wide beach near the channel jetty, courts, fire rings, and south end of the boardwalk.",
        parking: "A large public lot serves South Mission Beach, but it can still fill early on warm summer weekends and event days. Observe posted closing times and do not leave a vehicle overnight.",
        restrooms: "Public restrooms and outdoor showers are beside the beach facilities and parking area.",
        accessibility: "The City lists disabled accessibility. The paved lot and boardwalk provide a firm approach, while the sand and jetty remain variable natural surfaces.",
        safety: "Swim near the lifeguard and stay away from the channel and jetty currents unless using a specifically permitted activity area. Conditions differ sharply from the calmer bay side.",
        safetySource: sources.missionSafety,
        need: "South Mission is the practical choice for volleyball, basketball, Over-the-Line, fire rings, and a wider beach. Dogs, alcohol, glass, smoking, camping, and disturbing noise are prohibited.",
      },
      {
        slug: "south-mission-courts-and-jetty", name: "South Mission Courts, Fire Rings & Jetty", type: "recreation", category: "Sports & gatherings",
        latitude: 32.7587, longitude: -117.2507, page: sources.southMission,
        imageUrl: "https://www.sandiego.gov/sites/default/files/legacy/lifeguards/graphics/smb.jpg",
        imagePage: sources.southMission,
        arrival: "Use the eastern side of the South Mission parking area for basketball and volleyball access; the jetty and fishing edge are farther south and west.",
        parking: "Use the South Mission public lot and arrive early for weekend play or a fire-ring visit. Spaces and fire rings are not guaranteed.",
        restrooms: "The South Mission restroom and shower building serves this recreation area.",
        accessibility: "Courts and paved approaches are firmer than the beach. The rocky jetty is uneven, exposed, and not an accessible route.",
        safety: "Keep off wet rocks during surf, supervise children around the channel edge, and obey lifeguard separation between swimming, surfing, fishing, and sport areas.",
        need: "Fire rings are first come, first served where open. Open fires outside City containers are prohibited; confirm current fire rules and extinguish coals completely.",
      },
    ],
  },
  {
    id: "launch-ca-oceanside-oceanside-city-beach-and-pier",
    name: "Oceanside City Beach and Pier",
    city: "Oceanside",
    state: "CA",
    latitude: 33.1937,
    longitude: -117.3846,
    address: "Pier View Way and The Strand",
    sourceLabel: "City of Oceanside",
    source: sources.oceansideBeaches,
    priority: 2,
    summary: "Oceanside's public beach corridor links the 1,954-foot pier, Pier View beaches, The Strand, beach amphitheater, accessible beach-chair service, Tyson Street Park, Wisconsin Street, Buccaneer Beach, Breakwater Way, and Harbor Beach with destination-specific parking, restrooms, surf zones, and family amenities.",
    hours: "Beach access follows posted City rules and facility closures. Oceanside Pier is open daily 4 a.m.-10 p.m.; lifeguard towers, restrooms, lots, amphitheater, and harbor facilities use separate schedules.",
    cost: "General beach, pier, and park access is free. Metered and paid lots, harbor parking, events, rentals, concessions, and permits may charge.",
    features: [
      {
        slug: "oceanside-pier", name: "Oceanside Pier", type: "landmark", category: "Pier & fishing",
        latitude: 33.1935, longitude: -117.3863, page: sources.oceansidePier,
        imageUrl: "https://www.ci.oceanside.ca.us/home/showpublishedimage/8512/638857670417570000",
        arrival: "Use Pier View Way and North Pacific Street, then walk down the pier approach. The Pier, beach, amphitheater, and nearest public restrooms are separate mapped stops.",
        parking: "Use nearby public lots, meters, or legal street parking. Downtown event days and summer weekends fill early; consult the City's current parking map.",
        restrooms: "New public restrooms are in the pier plaza area. The old restroom building was converted to a police substation, so follow current signs rather than older maps.",
        accessibility: "The pier approach is ramped. A sand-friendly beach wheelchair can be borrowed first come, first served from Lifeguard Headquarters below the pier in exchange for identification.",
        safety: "Most of the pier is open, but the fire-damaged far west end remains unavailable. Obey barriers, keep fishing gear controlled, and bring a layer for wind over the water.",
        need: "The pier is free and currently opens at 4 a.m. and closes at 10 p.m. About 90% is usable; do not promise access to the former restaurant end.",
      },
      {
        slug: "pier-view-beaches", name: "Pier View North & South Beaches", type: "beach", category: "Central beaches",
        latitude: 33.1930, longitude: -117.3847, page: sources.oceansideBeaches,
        imageUrl: "https://www.ci.oceanside.ca.us/home/showpublishedimage/624/637962496851630000",
        arrival: "Use the pier plaza for the central beach. Pier View North generally carries more sand; Pier View South hosts more surf and body-sport activity and connects down The Strand.",
        parking: "Parking is available in nearby lots, meters, and legal streets rather than on most of The Strand. Use the public parking map and expect event restrictions.",
        restrooms: "Use the current pier-plaza restrooms or walk to Tyson, Wisconsin, or Buccaneer facilities. Older City text noting no pier restroom predates the completed beachfront restroom project.",
        accessibility: "A sloping ramp near the pier reaches beach level, and the paved Strand is relatively level. Sand access still varies; beach-wheelchair loans are based at Lifeguard Headquarters.",
        safety: "Swim near the marked lifeguard tower and respect seasonal swim/surf separation. Conditions, sand width, and crowds vary between the north and south sides.",
        need: "Choose north for more dependable sand and south for events and surf activity. The central area is convenient but can be the busiest beach zone in Oceanside.",
      },
      {
        slug: "junior-seau-beach-amphitheater", name: "Junior Seau Beach Amphitheater", type: "event_space", category: "Events",
        latitude: 33.1928, longitude: -117.3832, page: sources.oceansidePier,
        imageUrl: "https://www.ci.oceanside.ca.us/home/showpublishedimage/628/637962496863270000",
        arrival: "The amphitheater sits directly below the pier entrance beside Lifeguard Headquarters and the beach community center.",
        parking: "Use downtown public parking and walk to the pier plaza. Events can close nearby roads or reserve spaces, so use event-specific instructions.",
        restrooms: "Current pier-plaza public restrooms are nearby. Event organizers may add temporary facilities for large programs.",
        accessibility: "Use the ramped pier-plaza approach and confirm accessible audience seating with the event organizer before a ticketed or capacity-controlled program.",
        safety: "Crowd controls, bags, beach access, and emergency lanes can change during events. Keep lifeguard and police access clear.",
        need: "The amphitheater is scheduled for a future renovation phase. Check the event listing and construction notices rather than assuming open seating on a particular date.",
      },
      {
        slug: "tyson-street-beach-and-park", name: "Tyson Street Beach & Park", type: "playground", category: "Family beaches",
        latitude: 33.1878, longitude: -117.3787, page: "https://visitoceanside.org/things-to-do/beaches/tyson-street-beach/",
        sourceLabel: "Visit Oceanside",
        imageUrl: "https://visitoceanside.org/wp-content/uploads/2023/02/tyson-street-beach-grass-area.jpeg",
        arrival: "Use Tyson Street and The Strand. Stairs descend from Pacific Street, while the grassy park, playground, and beach facilities sit just inland of Tower 5.",
        parking: "Metered spaces are on Pacific Street, two accessible spaces are on The Strand, and the nearest larger lot is near Mission Avenue and Myers Street.",
        restrooms: "Public restrooms and outdoor showers are available at Tyson Street Beach.",
        accessibility: "Two accessible parking spaces are on The Strand. Confirm the usable route from parking because the Pacific Street approach includes stairs.",
        safety: "The crowded swimming area is closed to surfing during summer. Follow Tower 5 flags and current swim/surf separation.",
        need: "This is the strongest central family stop when a playground, grass, picnic tables, restrooms, and beach access need to be close together.",
      },
      {
        slug: "wisconsin-street-beach", name: "Wisconsin Street Beach", type: "beach", category: "Tide-dependent beaches",
        latitude: 33.1847, longitude: -117.3760, page: "https://visitoceanside.org/things-to-do/beaches/wisconsin-street-beach/",
        sourceLabel: "Visit Oceanside",
        imageUrl: "https://visitoceanside.org/wp-content/uploads/2023/02/wisconsin-street-beach-pier.jpeg",
        arrival: "Use Wisconsin Street and the one-way South Strand. The beach ramp is just north of Lifeguard Tower 7.",
        parking: "A small paid lot sits behind Tower 7, with additional legal parking along Pacific Street.",
        restrooms: "Public restrooms and showers are available near Tower 7.",
        accessibility: "A ramp provides the practical beach approach, but high tide can remove nearly all usable sand and waves may reach the rocks.",
        safety: "Check tides before choosing this beach. At high tide there may be little or no dry sand, making it unsuitable for a settled family beach day.",
        need: "This is usually quieter than the pier area, but it is the most tide-dependent stop in the corridor. Use another beach if dry sand is essential.",
      },
      {
        slug: "buccaneer-beach-and-park", name: "Buccaneer Beach & Park", type: "playground", category: "Family beaches",
        latitude: 33.1739, longitude: -117.3628, page: "https://visitoceanside.org/things-to-do/beaches/buccaneer-beach/",
        sourceLabel: "Visit Oceanside",
        imageUrl: "https://visitoceanside.org/wp-content/uploads/2023/02/buccaneer-beach-view.jpeg",
        arrival: "Use 1500 South Pacific Street. The small beach is across the road from Buccaneer Park, cafe, playground, gazebo, restroom, and Loma Alta Marsh path.",
        parking: "A free public lot is directly across from the beach, but it is small and can fill quickly.",
        restrooms: "Restrooms and showers are in the park across South Pacific Street.",
        accessibility: "The compact park and parking area are easier to understand than many bluff accesses, but confirm the current crossing and sand route for mobility needs.",
        safety: "In summer the water directly in front of Tower 11 is marked for swimmers, waders, and bodyboarders; surfing is outside the checkered flags.",
        need: "This is a small beach rather than a broad all-day strand. It is valuable because the park, playground, cafe, shade, restroom, and family swim zone are tightly grouped.",
      },
      {
        slug: "harbor-beach", name: "Harbor Beach", type: "beach", category: "Large beaches & harbor",
        latitude: 33.2071, longitude: -117.3945, page: "https://visitoceanside.org/things-to-do/beaches/harbor-beach/",
        sourceLabel: "Visit Oceanside",
        imageUrl: "https://visitoceanside.org/wp-content/uploads/2023/02/harbor-beach-covered-picnic-tables.webp",
        arrival: "Route to Harbor Beach rather than Oceanside Pier. The broad beach sits north of the harbor entrance near Harbor Village, jetties, boat ramp, and multiple lifeguard towers.",
        parking: "The harbor provides a mix of paid seasonal beach lots, free spaces, and time-limited areas. Boat-trailer and overnight rules differ; read every sign.",
        restrooms: "Public restrooms and showers serve Harbor Beach, with picnic shelters, fire pits, playground, and harbor services nearby.",
        accessibility: "Large lots and developed harbor routes provide a more direct arrival than many south-coast accesses, but sand access and beach-chair availability should be confirmed.",
        safety: "Towers 12, 14, and 16 serve the summer beach. Stay out of the harbor mouth and jetty currents, and use the marked swimming area for children.",
        need: "Harbor Beach is Oceanside's largest beach and usually the best choice for space, fire pits, volleyball, a playground, and a full beach day near food and marina services.",
      },
    ],
  },
  {
    id: "launch-ca-carlsbad-carlsbad-state-beach",
    name: "Carlsbad State Beach",
    city: "Carlsbad",
    state: "CA",
    latitude: 33.1474,
    longitude: -117.3457,
    address: "Carlsbad Boulevard at Tamarack Avenue",
    sourceLabel: "California State Parks",
    source: sources.carlsbadBeach,
    priority: 3,
    summary: "Carlsbad State Beach is a roughly 14-acre Pacific beach below coastal bluffs, stretching from the north-city access area toward Cannon Road with Tamarack Surf Beach, Frazee Beach, seawall walks, swimming, surfing, fishing, beachcombing, public parking, restrooms, rinse showers, accessible picnic points, and multiple named city access streets.",
    hours: "The state beach is open daily 6 a.m.-11 p.m. The main parking lot is open 7 a.m.-10 p.m.; lifeguard towers, restrooms, showers, events, and individual access gates can use shorter schedules.",
    cost: "Pedestrian beach access is free. State parking areas may charge or accept eligible California State Parks passes; nearby public street parking has posted restrictions.",
    features: [
      {
        slug: "tamarack-surf-beach", name: "Tamarack Surf Beach & Main Lot", type: "beach", category: "Main beach access",
        latitude: 33.1472, longitude: -117.3455, page: sources.carlsbadBeach,
        imageUrl: "https://www.parks.ca.gov/pages/653/images/090-P106971.JPG",
        arrival: "Use approximately 4100 South Carlsbad Boulevard at Tamarack Avenue for the main state-beach lot, restrooms, showers, seawall, picnic points, and most recognizable access.",
        parking: "The state lot normally operates 7 a.m.-10 p.m. Fees and pass acceptance can change; nearby curb parking follows City signs.",
        restrooms: "Public restrooms and outdoor rinse showers are available at the Tamarack end of the state beach.",
        accessibility: "The lot has four designated accessible spaces and two of five picnic areas on the paved walkway are generally accessible. Sand access remains variable.",
        safety: "Swim near lifeguards, read the daily condition board, and expect active surf and rip currents. Keep children within reach.",
        safetySource: sources.carlsbadSafety,
        need: "Tamarack is the easiest first-time arrival but also one of the busiest. Use a northern access or another beach when the main lot is full rather than waiting in the travel lane.",
      },
      {
        slug: "carlsbad-seawall-trail", name: "Carlsbad Seawall Trail", type: "trail", category: "Coastal walking",
        latitude: 33.1512, longitude: -117.3482, page: sources.carlsbadOverview,
        imageUrl: "https://www.parks.ca.gov/pages/653/images/090-P106972.JPG",
        imagePage: sources.carlsbadBeach,
        arrival: "Join the lower or upper seawall from Tamarack Avenue, Pine Avenue, or intermediate access points. The paved coastal route links beach entrances but not every bluff stair is accessible.",
        parking: "Use legal street parking or the Tamarack lot, then join the trail at the nearest signed entrance. Do not block private drives or beach-access easements.",
        restrooms: "Restrooms and showers are concentrated at Tamarack and the ends of developed paths rather than continuously along the seawall.",
        accessibility: "The paved seawall is a useful firm-surface coastal route. Slopes, stairs between levels, sand, crowding, and erosion-related closures vary by segment.",
        safety: "Stay behind barriers near bluff work, avoid wet lower sections during high surf, and keep moving traffic lanes clear when stopping for views.",
        need: "Leashed dogs are allowed on the upper path, but not on the lower path or beach. The seawall is often the better choice for a scenic walk when beach sand is difficult.",
      },
      {
        slug: "frazee-beach", name: "Frazee Beach", type: "beach", category: "Village beaches",
        latitude: 33.1576, longitude: -117.3541, page: sources.carlsbadOverview,
        imageUrl: "https://www.parks.ca.gov/pages/653/images/090-P106974.JPG",
        imagePage: sources.carlsbadBeach,
        arrival: "Use the beach access near Pine Avenue and the north end of the state-beach corridor. This is closer to Carlsbad Village than the Tamarack lot.",
        parking: "Use legal Village or Carlsbad Boulevard parking and walk to the signed access. Spaces are limited and time restrictions vary by block.",
        restrooms: "The most dependable public facilities are along the developed state-beach corridor and at Tamarack; confirm the nearest open building before settling north of it.",
        accessibility: "Access conditions vary by street and bluff route. Use Tamarack when accessible parking and a documented paved picnic route are essential.",
        safety: "Beach width and bluff conditions change with tide and erosion. Stay out from under unstable bluff faces and use guarded areas for swimming.",
        need: "Frazee is useful for a Village-centered beach visit, but it does not offer the same straightforward lot-and-restroom arrival as Tamarack.",
      },
      {
        slug: "pine-avenue-access", name: "Pine Avenue Beach Access", type: "entrance", category: "Beach entrances",
        latitude: 33.1552, longitude: -117.3525, page: sources.carlsbadOverview,
        imageUrl: "https://www.parks.ca.gov/pages/653/images/090-P106979.JPG",
        imagePage: sources.carlsbadBeach,
        arrival: "Use the signed Pine Avenue access from Carlsbad Boulevard for the north section of Carlsbad State Beach and seawall connections.",
        parking: "Use legal public curb or Village parking. This access does not provide a large dedicated beach lot.",
        restrooms: "Do not assume a restroom at the top of every access. Plan around the main state-beach facilities or nearby public park facilities.",
        accessibility: "Street-end beach accesses can include slopes or stairs. Use Tamarack for the most clearly documented accessible parking and paved picnic route.",
        safety: "Check tide, surf, and bluff conditions before descending; temporary closures can isolate a preferred return route.",
        need: "This is an entrance, not a full-service beach facility. It is best for walkers staying in the Village who already know where they will park and use restrooms.",
      },
      {
        slug: "warm-water-jetty", name: "Warm Water Jetty", type: "beach", category: "Surf & fishing",
        latitude: 33.1372, longitude: -117.3388, page: sources.carlsbadOverview,
        imageUrl: "https://www.parks.ca.gov/pages/653/images/090-P106977.JPG",
        imagePage: sources.carlsbadBeach,
        arrival: "Use Carlsbad Boulevard south of Tamarack toward the Agua Hedionda and former power-plant area. Route specifically to the legal public access rather than an industrial driveway.",
        parking: "Parking is limited and controlled by posted curb and state rules. Do not improvise parking along highway shoulders or service access.",
        restrooms: "Use the nearest developed state-beach restroom before walking to the jetty area; facilities are not distributed at every surf access.",
        accessibility: "Jetty rocks, sand, changing beach width, and informal approaches are not dependable accessible routes.",
        safety: "Jetties create strong currents and slippery rock hazards. Do not climb wet rocks, and swim only in an appropriate guarded zone away from the structure.",
        need: "This is primarily a surf, fishing, and shoreline landmark rather than the best family swim beach. Tamarack is the safer default for first-time facilities.",
      },
      {
        slug: "maple-sycamore-cherry-accesses", name: "Maple, Sycamore & Cherry Avenue Beach Accesses", type: "entrance", category: "Beach entrances",
        latitude: 33.1518, longitude: -117.3496, page: sources.carlsbadOverview,
        imageUrl: "https://www.parks.ca.gov/pages/653/images/090-P106991.JPG",
        imagePage: sources.carlsbadBeach,
        arrival: "These signed street ends provide distributed access between Pine Avenue and Tamarack. Pick the access nearest your legal parking and intended seawall section.",
        parking: "There are no large dedicated lots at these street ends. Read curb restrictions and keep residential driveways and access paths clear.",
        restrooms: "Restrooms and rinse showers are at the main developed ends of the coastal path, not at every street access.",
        accessibility: "Individual approaches vary in grade, stairs, and surface. Confirm the exact street before relying on it for a stroller or mobility device.",
        safety: "Check high-tide beach width and bluff warnings. Do not enter a closed stair or assume the next street access is passable along the sand.",
        need: "These are useful low-footprint neighborhood entrances, not service hubs. Photographing current signs, slopes, and obstructions here would be especially valuable to future visitors.",
      },
    ],
  },
];

function parentAnswers(parent) {
  if (parent.existing) return null;
  const label = parent.sourceLabel;
  if (parent.city === "Oceanside") {
    return [
      answer("entrance", "Where should I start at Oceanside City Beach?", "Use the Pier and Pier View area for the central landmark, Tyson Street for a playground and picnic lawn, Harbor Beach for the broadest sand and most facilities, or Buccaneer for a compact family beach-and-park stop.", parent.source, label),
      answer("parking", "Where should I park for Oceanside beaches?", "Parking varies by destination: downtown public lots and meters serve the Pier, Tyson has nearby meters and a lot, Wisconsin has a small paid lot, Buccaneer has a small free lot, and Harbor Beach uses a mix of seasonal paid and free harbor spaces. Read current signs.", sources.oceansideParking, label),
      answer("restroom", "Where are public restrooms along Oceanside beach?", "Current public restrooms serve the pier plaza, Tyson Street, Wisconsin Street, Buccaneer, Breakwater Way, and Harbor Beach. Do not assume every stretch between towers has a facility.", parent.source, label),
      answer("accessibility", "Where can I borrow a beach wheelchair in Oceanside?", "Sand-friendly beach wheelchairs are available first come, first served from Lifeguard Headquarters below Oceanside Pier in exchange for identification. Confirm availability before relying on one.", sources.oceansidePier, label),
      answer("hours", "What hours is Oceanside Pier open?", "The Pier opens at 4 a.m. and closes at 10 p.m. daily. Beaches, lots, restrooms, harbor facilities, and events follow separate posted hours.", sources.oceansidePier, label),
      answer("closures", "Is all of Oceanside Pier open after the fire?", "About 90% of the pier remains open, while the fire-damaged far west end is closed. Follow barriers and the City's current pier updates.", sources.oceansidePier, label),
      answer("playground", "Which Oceanside beach is best with children?", "Tyson Street combines a guarded summer swim zone, playground, grass, picnic tables, restrooms, and showers. Harbor Beach offers more sand and facilities; Buccaneer provides a compact park, play area, cafe, and marked summer swim zone.", parent.source, label),
      answer("trail-surface", "Can I walk or bike The Strand in Oceanside?", "The Strand is a paved oceanfront route shared with local vehicles, bikes, and pedestrians. It is relatively level at beach grade, but downtown approaches can be steep and crowding varies.", parent.source, label),
      answer("transit", "Can I reach Oceanside beach without driving?", "Oceanside Transit Center is within walking distance of the Pier and central beaches. The City also recommends the seasonal gO'side shuttle for beach access when parking is tight.", "https://www.ci.oceanside.ca.us/Home/Components/News/News/263/14", label),
      answer("dogs", "Are dogs allowed on Oceanside beaches?", "Do not bring a dog onto the sand unless current City signs explicitly permit it. Dog walking is common in harbor and paved public areas, but beach, pier, park, and leash rules differ by exact location.", "https://records.ci.oceanside.ca.us/gov/pw/harbor/info/", label),
      answer("fees", "Is Oceanside City Beach free?", "General beach, pier, and park access is free. Parking, rentals, concessions, events, and permits can charge.", parent.source, label),
      answer("safety", "Which Oceanside beach should I use for swimming or surfing?", "Use the current lifeguard flags. Tyson and portions of Buccaneer become swimmer-focused in summer; Breakwater and Pier View support major surf activity; Wisconsin can lose its dry sand at high tide.", parent.source, label),
    ];
  }
  return [
    answer("entrance", "Where should I enter Carlsbad State Beach?", "Use Tamarack Avenue for the main lot, restrooms, showers, accessible parking, picnic points, and seawall. Pine, Maple, Sycamore, Cherry, and other signed accesses are useful when arriving on foot from Carlsbad Village.", sources.carlsbadOverview, label),
    answer("hours", "What hours is Carlsbad State Beach open?", "The beach is open daily 6 a.m.-11 p.m. The main parking lot operates 7 a.m.-10 p.m.; individual facilities and lifeguard towers use shorter schedules.", parent.source, label),
    answer("parking", "Where should I park for Carlsbad State Beach?", "The Tamarack state lot is the most direct facility-based arrival and may charge. Street and Village parking vary by block and time limit; distributed street accesses do not have large dedicated lots.", parent.source, label),
    answer("restroom", "Where are restrooms and showers at Carlsbad State Beach?", "Public restrooms and rinse showers are at the developed ends of the state-beach paths, including Tamarack. They are not available at every street access.", sources.carlsbadOverview, label),
    answer("accessibility", "How accessible is Carlsbad State Beach?", "Tamarack has four designated accessible parking spaces and generally accessible paved picnic points. The seawall provides a firm coastal route, while sand, bluff stairs, jetties, and erosion closures vary.", "https://www.parks.ca.gov/AccessibleFeatures/Details/653", label),
    answer("dogs", "Are dogs allowed on Carlsbad beaches?", "Dogs are prohibited on Carlsbad beaches. Leashed dogs may use the upper coastal path, but not the lower path; City trails are the better dog-walking option.", sources.carlsbadOverview, label),
    answer("lifeguards", "When are Carlsbad lifeguard towers staffed?", "Carlsbad provides year-round daytime lifeguard coverage, with four north-beach towers typically staffed May through September from 10 a.m. to sunset. State Parks covers the southern state beaches; staffing changes with season and weather.", sources.carlsbadSafety, "City of Carlsbad"),
    answer("trail-surface", "Can I walk the Carlsbad seawall?", "Yes. The paved seawall connects sections between Pine and Tamarack and continues south from Tamarack, but upper and lower levels, stairs, closures, crowding, and dogs rules differ.", sources.carlsbadOverview, label),
    answer("closures", "How do I check Carlsbad beach closures and conditions?", "Review California State Parks restrictions, City lifeguard condition signs, and current coastal-bluff notices before visiting. High surf, erosion, water quality, maintenance, or emergencies can close individual access points.", parent.source, label),
    answer("fees", "Is Carlsbad State Beach free?", "Pedestrian access is free. State parking may charge or accept eligible passes; nearby street parking follows posted City rules.", parent.source, label),
    answer("transit", "Can I reach Carlsbad State Beach without driving?", "Carlsbad Village is within walking distance of northern beach accesses, while Tamarack and southern sections require a longer walk or local connection. Choose the entrance before planning transit.", sources.carlsbadOverview, label),
    answer("safety", "What should families know before swimming at Carlsbad State Beach?", "Use a staffed lifeguard area, read daily surf flags, supervise children continuously, and stay away from jetties and unstable bluff faces. Ocean conditions change throughout the day.", sources.carlsbadSafety, "City of Carlsbad"),
  ];
}

async function downloadPhoto(parent, place) {
  const directory = path.join(root, "assets", "parks", "san-diego-coast", parent.id.replace(/^launch-ca-/, ""), place.slug);
  const outputPath = path.join(directory, "hero.webp");
  if (fs.existsSync(outputPath)) return `/assets/parks/san-diego-coast/${parent.id.replace(/^launch-ca-/, "")}/${place.slug}/hero.webp`;
  if (!downloadImages) throw new Error(`${place.name}: run with --download to retrieve its sourced photograph`);
  const response = await fetch(place.imageUrl, { headers: { "User-Agent": "AuditMap sourced-image enrichment/1.0" } });
  if (!response.ok) throw new Error(`${place.name}: image returned ${response.status}`);
  fs.mkdirSync(directory, { recursive: true });
  await sharp(Buffer.from(await response.arrayBuffer()))
    .rotate()
    .resize(1600, 1000, { fit: "cover", position: "attention", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(outputPath);
  return `/assets/parks/san-diego-coast/${parent.id.replace(/^launch-ca-/, "")}/${place.slug}/hero.webp`;
}

function ensureCsvRows() {
  const file = path.join(root, "data", "nationwide-major-parks-launch.csv");
  const retiredRows = new Set([
    "Pacific,CA,Oceanside,Oceanside City Beach & Pier,anchor,yes,priority-contributor-request",
  ]);
  let text = fs.readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => !retiredRows.has(line))
    .join("\n")
    .trimEnd();
  const rows = [
    "Pacific,CA,Oceanside,Oceanside City Beach and Pier,anchor,yes,priority-contributor-request",
    "Pacific,CA,Carlsbad,Carlsbad State Beach,anchor,yes,priority-contributor-request",
  ];
  for (const row of rows) if (!text.includes(row)) text += `\n${row}`;
  fs.writeFileSync(file, `${text}\n`);
}

function ensureLocations() {
  const file = path.join(root, "data", "launch-location-overrides.json");
  const locations = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const parent of parents.filter((candidate) => !candidate.existing)) {
    const value = {
      id: parent.id, park: parent.name, city: parent.city, state: parent.state,
      latitude: parent.latitude, longitude: parent.longitude, address: parent.address,
      displayName: `${parent.name}, ${parent.city}, CA`, source: parent.sourceLabel,
      sourceUrl: parent.source, checkedAt,
    };
    const index = locations.findIndex((candidate) => candidate.id === parent.id);
    if (index >= 0) locations[index] = value; else locations.push(value);
  }
  fs.writeFileSync(file, `${JSON.stringify(locations, null, 2)}\n`);
}

async function main() {
  ensureCsvRows();
  ensureLocations();

  const allPath = path.join(root, "data", "generated", "all-subsites-ready.json");
  const pilotPath = path.join(root, "data", "generated", "pilot-subsites-ready.json");
  const campaignPath = path.join(root, "data", "parent-park-information-enrichment-campaign.json");
  const launchPath = path.join(root, "data", "generated", "launch-map-places.json");
  const all = JSON.parse(fs.readFileSync(allPath, "utf8"));
  const pilot = JSON.parse(fs.readFileSync(pilotPath, "utf8"));
  const campaign = JSON.parse(fs.readFileSync(campaignPath, "utf8"));
  const launch = JSON.parse(fs.readFileSync(launchPath, "utf8"));

  for (const parent of parents) {
    const images = [];
    const features = [];
    for (const place of parent.features) {
      const localImage = await downloadPhoto(parent, place);
      const id = stableUuid(parent.id, place.slug);
      const image = {
        url: localImage, source: place.imagePage || place.page, author: place.sourceLabel || parent.sourceLabel,
        license: "Official public-agency or destination-partner image; source attribution retained",
        alt: `${place.name} in ${parent.city}, California`, featureId: id,
        positionQuality: "Associated with this destination by its official source; exact camera coordinates are not published",
      };
      images.push(image);
      features.push({
        id, slug: place.slug, name: place.name, feature_type: place.type,
        description: `${place.name} is a mapped visitor destination within ${parent.name}, with its own arrival, facility, safety, and contribution context.`,
        latitude: place.latitude, longitude: place.longitude,
        details: {
          category: place.category, includeInParentGallery: true,
          positionQuality: "Visitor destination center cross-checked against official place guidance and public mapping",
          address: parent.address, hours: parent.hours || "Follow posted beach and facility hours.",
          hoursSchedule: false, cost: parent.cost || "General public access is free; parking and services may charge.",
          accessibility: place.accessibility, locationContext: place.arrival, needToKnow: place.need,
          informationSourceLabel: place.sourceLabel || parent.sourceLabel, informationSourceUrl: place.page,
          informationCheckedAt: checkedAt, imageUrl: localImage, imageSourceUrl: place.imagePage || place.page,
          imageAuthor: place.sourceLabel || parent.sourceLabel,
          imageLicense: "Official public-agency or destination-partner image; source attribution retained",
          imageAlt: image.alt, images: [image], searchAnswers: featureQuestions(parent, place),
        },
        source_label: place.sourceLabel || parent.sourceLabel, source_url: place.page, verified_at: checkedAt,
      });
    }

    const existing = launch.find((candidate) => candidate.id === parent.id) || all.parks.find((candidate) => candidate.id === parent.id);
    const base = existing || {
      id: parent.id, name: parent.name, type: "Park", city: parent.city, state: parent.state, country: "US",
      citySlug: `${parent.city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-ca`,
      slug: parent.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      searchCategory: "park", neighborhood: parent.city, launchTier: "anchor", likelySubsites: true,
      publishStatus: "enriched", researchQueue: [], transit: "Use the local transit planner for the exact beach entrance.", amenities: [], comments: [],
    };
    const parentInfo = campaign.parks[parent.id] || {};
    const answers = parentAnswers(parent) || parentInfo.searchAnswers || base.searchAnswers || [];
    const updated = {
      ...base, name: parent.name, slug: slugify(parent.name), city: parent.city, state: parent.state,
      citySlug: slugify(`${parent.city}-${parent.state}`), address: parent.address,
      latitude: parent.latitude, longitude: parent.longitude,
      operator: parent.operator || parentInfo.operator || parent.sourceLabel,
      sourceLabel: parent.sourceLabel, source: parent.source, verifiedAt: checkedAt,
      summary: parent.summary || parentInfo.summary || base.summary,
      hours: parent.hours || parentInfo.hours || base.hours,
      cost: parent.cost || parentInfo.cost || base.cost,
      status: "Sourced contributor-priority visitor guide", publishStatus: "enriched",
      searchAnswers: answers, features, researchQueue: [],
    };

    for (const document of [all, pilot]) {
      const index = document.parks.findIndex((candidate) => candidate.id === parent.id);
      if (index >= 0) document.parks[index] = updated; else document.parks.push(updated);
    }
    campaign.parks[parent.id] = {
      ...parentInfo,
      operator: updated.operator, sourceLabel: parent.sourceLabel, source: parent.source,
      address: parent.address, summary: updated.summary, hours: updated.hours, cost: updated.cost,
      searchAnswers: answers, image: parent.existing ? parentInfo.image : images[0],
      additionalImages: parent.existing
        ? uniqueImages([...(parentInfo.additionalImages || []), ...images])
        : uniqueImages(images.slice(1)),
      verifiedAt: checkedAt,
    };
  }

  fs.writeFileSync(allPath, `${JSON.stringify(all, null, 2)}\n`);
  fs.writeFileSync(pilotPath, `${JSON.stringify(pilot, null, 2)}\n`);
  fs.writeFileSync(campaignPath, `${JSON.stringify(campaign, null, 2)}\n`);
  fs.writeFileSync(path.join(root, "data", "us-priority-enrichment-queue.json"), `${JSON.stringify({
    updatedAt: checkedAt,
    reason: "Traveler contribution request for the San Diego north-coast corridor",
    active: parents.map((parent) => ({ priority: parent.priority, id: parent.id, name: parent.name, city: parent.city, status: "enriched-and-ready-for-production" })),
    next: [
      { priority: 4, name: "South Carlsbad State Beach", city: "Carlsbad", target: "campground, North Ponto, South Ponto, accessible beach chair" },
      { priority: 5, name: "Guajome Regional Park", city: "Oceanside", target: "trails, ponds, playgrounds, camping, fishing" },
      { priority: 6, name: "Alga Norte Community Park", city: "Carlsbad", target: "playground, splash pad, skate park, dog park, aquatics" },
      { priority: 7, name: "Batiquitos Lagoon", city: "Carlsbad", target: "north shore trail, nature center, wildlife access" },
    ],
  }, null, 2)}\n`);
  console.log(`Prepared ${parents.length} contributor-priority coastal guides with ${parents.reduce((sum, parent) => sum + parent.features.length, 0)} mapped destinations.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
