const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const institutionsPath = path.join(root, "data", "institutions.json");
const checkedAt = "2026-08-05";
const moreheadRules = "https://www.moreheadcitync.org/252/Park-Rules";
const atlanticParks = "https://atlanticbeach-nc.com/departments/parks-recreation/";
const atlanticAccess = "https://atlanticbeach-nc.com/play/beach-access/";
const atlanticParking = "https://atlanticbeach-nc.com/departments/police-department/parking/";
const atlanticLifeguards = "https://atlanticbeach-nc.com/departments/fire-department/lifeguards/";
const fortMacon = "https://www.ncparks.gov/state-parks/fort-macon-state-park";
const reviewedSelections = JSON.parse(fs.readFileSync(path.join(root, "data", "nc-first-photo-selections.json"), "utf8"));
const reviewedCandidateDocument = JSON.parse(fs.readFileSync(path.join(root, "data", "photo-research", "nc-naip-aerial-candidates.json"), "utf8"));
const reviewedCandidatesById = new Map((reviewedCandidateDocument.places || []).map((place) => [place.id, place]));

function reviewedImage(placeId) {
  const selection = reviewedSelections.selections.find((candidate) => candidate.placeId === placeId);
  if (!selection) return null;
  const candidate = reviewedCandidatesById.get(placeId)?.candidates?.find((image) => (
    image.source === selection.candidateSource
  ));
  if (!candidate) throw new Error(`Reviewed image candidate missing for ${placeId}`);
  return {
    url: selection.url,
    source: candidate.source,
    author: candidate.author,
    license: candidate.licenseVersion && !String(candidate.license).includes(candidate.licenseVersion)
      ? `${candidate.license} ${candidate.licenseVersion}`
      : candidate.license,
    alt: selection.alt,
    ...(selection.imageKind ? { kind: selection.imageKind } : {}),
  };
}

function answer(intentKey, question, text, sourceLabel, source, freshness = "stable") {
  const expiresAt = freshness === "seasonal" ? "2026-09-05" : freshness === "arrival" ? "2026-08-19" : "2027-02-05";
  return { intentKey, question, answer: text, sourceLabel, source, sourceType: "official", checkedAt, expiresAt };
}

function localImage(city, slug, file, source, alt, author) {
  return {
    url: `/assets/parks/nc/${city}/${slug}/${file}`,
    source,
    author,
    license: `Official ${author} image; see source`,
    alt,
  };
}

function moreheadPlace(spec) {
  const id = `carteret-morehead-city-${spec.slug}`;
  const source = `https://www.moreheadcitync.org/Facilities/Facility/Details/${spec.sourceSlug}-${spec.facilityId}`;
  const reviewed = reviewedImage(id);
  const image = reviewed || (spec.image === false ? null : spec.imageObject || localImage(
    "morehead-city",
    spec.slug,
    "hero.jpg",
    source,
    spec.imageAlt || `${spec.name} in Morehead City`,
    "Town of Morehead City",
  ));
  const rulesAnswer = answer(
    "hours",
    `When is ${spec.name} open?`,
    spec.hoursAnswer || "Morehead City park properties are generally open from dawn to dusk. Lighted athletic fields and courts may remain open for scheduled activities. Check the facility page for temporary closures before a time-sensitive visit.",
    "Morehead City Park Rules",
    moreheadRules,
    "arrival",
  );
  const records = [
    rulesAnswer,
    ...(spec.answers || []),
  ];
  return {
    id,
    name: spec.name,
    type: spec.type || "Park",
    city: "Morehead City",
    state: "NC",
    country: "US",
    citySlug: "morehead-city-nc",
    slug: spec.slug,
    searchCategory: "park",
    address: spec.address,
    latitude: spec.latitude,
    longitude: spec.longitude,
    coordinateSource: spec.coordinateSource || source,
    positionQuality: spec.positionQuality || "reviewed-official-address-placement",
    neighborhood: spec.neighborhood || "Morehead City",
    status: spec.status || "Public park",
    hours: spec.hours || "Open daily from dawn to dusk; scheduled lighted activities may run later.",
    cost: spec.cost || "Free general access",
    accessibility: spec.accessibility || "Review the current facility page and onsite conditions for accessible parking and route details.",
    transit: "Local fixed-route transit is limited; most visitors arrive by car, bicycle, or on foot from nearby neighborhoods.",
    amenities: spec.amenities,
    sourceLabel: "Town of Morehead City",
    source,
    verifiedAt: checkedAt,
    summary: spec.summary,
    searchDescription: `Sourced visit details for ${spec.name}, including ${spec.amenities.slice(0, 3).join(", ").toLowerCase()}, parking, and common questions.`,
    searchAnswers: records,
    image: image || undefined,
    images: reviewed ? [] : spec.images || [],
    tags: spec.tags || [],
    inventoryStatus: "already-curated",
    enrichmentTier: "full",
    completenessScore: image ? 100 : 90,
    unresolvedIntentKeys: image ? [] : ["image"],
    researchQueue: image ? [] : [{ intentKey: "image", question: `Find a verified, location-specific image of ${spec.name}.` }],
    publishStatus: spec.publishStatus || "enriched",
  };
}

function atlanticPlace(spec) {
  const id = `carteret-atlantic-beach-${spec.slug}`;
  const reviewed = reviewedImage(id);
  return {
    id,
    name: spec.name,
    type: spec.type || "Park",
    city: "Atlantic Beach",
    state: "NC",
    country: "US",
    citySlug: "atlantic-beach-nc",
    slug: spec.slug,
    searchCategory: "park",
    address: spec.address,
    latitude: spec.latitude,
    longitude: spec.longitude,
    coordinateSource: spec.coordinateSource || spec.source,
    positionQuality: spec.positionQuality || "reviewed-official-address-placement",
    neighborhood: spec.neighborhood || "Atlantic Beach",
    status: spec.status || "Public destination",
    hours: spec.hours,
    cost: spec.cost || "Free general access",
    accessibility: spec.accessibility,
    transit: "Seasonal traffic and parking demand can be heavy. Plan extra arrival time on warm weekends and holidays.",
    amenities: spec.amenities,
    sourceLabel: spec.sourceLabel,
    source: spec.source,
    verifiedAt: checkedAt,
    summary: spec.summary,
    searchDescription: `Sourced visit details for ${spec.name}, including ${spec.amenities.slice(0, 3).join(", ").toLowerCase()}, parking, and common questions.`,
    searchAnswers: spec.answers,
    image: reviewed || spec.images[0],
    images: reviewed ? [] : spec.images.slice(1),
    tags: spec.tags || [],
    inventoryStatus: "already-curated",
    enrichmentTier: "full",
    completenessScore: 100,
    unresolvedIntentKeys: [],
    researchQueue: [],
    publishStatus: "enriched",
  };
}

const morehead = [
  moreheadPlace({
    facilityId: 2, sourceSlug: "Rotary-Park", slug: "rotary-park", name: "Rotary Park", address: "2200 Mayberry Loop Road", latitude: 34.7353079310078, longitude: -76.7338610746086,
    status: "Sports complex and community park", amenities: ["Three soccer fields", "Big Rock Stadium", "0.89-mile exercise loop", "Two basketball courts", "Playground", "Two picnic shelters", "Restrooms", "Dog park", "Parking"],
    imageAlt: "Big Rock Stadium baseball field at Rotary Park",
    summary: "Rotary Park is Morehead City's main sports complex, but it also works for everyday family visits with a loop trail, playground, courts, shelters, restrooms, and an off-leash dog park on the grounds.",
    answers: [
      answer("parking", "Where should I park at Rotary Park?", "Use the public parking inside the 2200 Mayberry Loop Road complex. The park is spread between soccer fields, Big Rock Stadium, playground and shelter areas, so follow onsite signs for the closest lot to your activity.", "Rotary Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Rotary-Park-2", "arrival"),
      answer("trail-surface", "Is there a walking loop at Rotary Park?", "Yes. The official facility listing documents a 0.89-mile exercise loop. It is useful while games or practices are underway, but confirm surface and accessible-route conditions onsite.", "Rotary Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Rotary-Park-2"),
      answer("dog-area", "Is there a dog park at Rotary Park?", "Yes. Morehead City's fenced dog park is inside Rotary Park near 2200 Mayberry Loop Road. It has separate large- and small-dog areas; keep dogs leashed outside the enclosure and supervise them inside.", "Morehead City Dog Park", "https://www.moreheadcitync.org/CivicAlerts.aspx?AID=287", "arrival"),
      answer("playground", "Does Rotary Park have a playground?", "Yes. The official facility list includes a playground along with picnic shelters, restrooms, courts, fields and parking, making it practical for siblings during scheduled sports.", "Rotary Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Rotary-Park-2"),
      answer("picnic", "Can I reserve a shelter at Rotary Park?", "Rotary Park has two picnic shelters. The town lists shelter rentals through Parks and Recreation; call 252-726-5083 for current availability, fees and group-use requirements.", "Rotary Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Rotary-Park-2", "arrival"),
    ],
  }),
  moreheadPlace({
    facilityId: 3, sourceSlug: "Shevans-Park", slug: "shevans-park", name: "Shevans Park", address: "1501 Evans Street", latitude: 34.72117957617, longitude: -76.7230925656349,
    status: "Family park and seasonal splash pad", amenities: ["Large playground", "Seasonal splash pad", "Four tennis courts", "Pickleball", "Two picnic shelters", "Restrooms", "Parking"],
    imageAlt: "Shevans Park entrance, playground and play area",
    images: [localImage("morehead-city", "shevans-park", "playground.jpg", "https://www.moreheadcitync.org/Facilities/Facility/Details/Shevans-Park-3", "Tennis and pickleball courts at Shevans Park", "Town of Morehead City")],
    summary: "Shevans Park is Morehead City's strongest all-in-one children's park: a large playground, seasonal splash pad, shelters, restrooms and courts fit into a compact neighborhood location near the waterfront.",
    answers: [
      answer("splash-pad", "Is the Shevans Park splash pad open?", "The splash pad is seasonal. The most recent posted season used 10 a.m. to 7 p.m. daily hours; check the town's current alert before leaving because opening and closing dates, weather and maintenance can change operation.", "Morehead City Splash Pad Notices", "https://www.moreheadcitync.org/CivicAlerts.asp?AID=291", "seasonal"),
      answer("playground", "What is at the Shevans Park playground?", "The town describes a large playground beside the splash pad, two picnic shelters, restrooms and courts. The compact layout makes it easier to combine dry play and water play than at Morehead City's sports-focused parks.", "Shevans Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Shevans-Park-3"),
      answer("restroom", "Are there bathrooms at Shevans Park?", "Yes. Restrooms are listed onsite near the playground and shelter area. Check the current facility page for temporary maintenance notices.", "Shevans Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Shevans-Park-3", "arrival"),
      answer("sports", "Can I play tennis or pickleball at Shevans Park?", "The facility has four tennis courts, including two lighted courts, and lists pickleball. Because court work or reservations can affect access, confirm current court status with Morehead City Parks and Recreation before planning around them.", "Shevans Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Shevans-Park-3", "arrival"),
      answer("picnic", "Can I reserve a Shevans Park shelter?", "There are two picnic shelters. Reservations are required for group playground use and shelter rentals; contact Morehead City Parks and Recreation at 252-726-5083 for availability and current fees.", "Shevans Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Shevans-Park-3", "arrival"),
    ],
  }),
  moreheadPlace({
    facilityId: 4, sourceSlug: "Bryan-Street-Pond", slug: "bryan-street-pond", name: "Bryan Street Pond", address: "Bryan Street and Webb Street", latitude: 34.7289479999958, longitude: -76.7989484999909,
    status: "Small neighborhood nature stop", amenities: ["Pond", "Sidewalk", "Bench"], imageAlt: "Bryan Street Pond viewed through mature trees",
    summary: "Bryan Street Pond is a very small, quiet neighborhood stop rather than a full recreation park. Come for a short pond-side pause or walk, not for restrooms, a playground or sports facilities.",
    answers: [
      answer("amenities", "What is at Bryan Street Pond?", "The official listing documents a pond, one bench and a sidewalk. No playground, restroom or dedicated picnic facilities are listed.", "Bryan Street Pond", "https://www.moreheadcitync.org/Facilities/Facility/Details/Bryan-Street-Pond-4"),
      answer("parking", "Is there parking at Bryan Street Pond?", "The town does not list a dedicated parking lot. Treat it as a neighborhood walk-up stop and obey nearby street-parking signs without blocking homes or driveways.", "Bryan Street Pond", "https://www.moreheadcitync.org/Facilities/Facility/Details/Bryan-Street-Pond-4", "arrival"),
    ],
  }),
  moreheadPlace({
    facilityId: 5, sourceSlug: "Dr-Martin-Luther-King-Jr-Park", slug: "dr-martin-luther-king-jr-park", name: "Dr. Martin Luther King Jr. Park", address: "1001 Arendell Street", latitude: 34.7214895578451, longitude: -76.7159817274381,
    amenities: ["Playground", "Gazebo", "Restrooms", "Parking", "Historic train depot"], imageAlt: "Playground and train-themed play structure at Dr. Martin Luther King Jr. Park",
    imageObject: localImage("morehead-city", "mlk-park", "hero.jpg", "https://www.moreheadcitync.org/Facilities/Facility/Details/Dr-Martin-Luther-King-Jr-Park-5", "Playground and train-themed play structure at Dr. Martin Luther King Jr. Park", "Town of Morehead City"),
    summary: "This downtown park pairs a children's playground with a gazebo, restrooms, parking and the historic train depot. It is a useful play stop close to Morehead City's waterfront and downtown blocks.",
    answers: [
      answer("playground", "Does MLK Park in Morehead City have a playground?", "Yes. The park has a playground, gazebo, restrooms and parking beside the Train Depot. The train-themed play structure is a memorable choice for younger children.", "Dr. Martin Luther King Jr. Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Dr-Martin-Luther-King-Jr-Park-5"),
      answer("restroom", "Are there restrooms at MLK Park?", "Yes. Restrooms and parking are both listed onsite.", "Dr. Martin Luther King Jr. Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Dr-Martin-Luther-King-Jr-Park-5"),
      answer("picnic", "Can I reserve the gazebo at MLK Park?", "Yes. The gazebo is reservable for events and group use through Morehead City Parks and Recreation. Confirm the current resident and nonresident fee when booking.", "Dr. Martin Luther King Jr. Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Dr-Martin-Luther-King-Jr-Park-5", "arrival"),
    ],
  }),
  moreheadPlace({
    facilityId: 6, sourceSlug: "Jaycee-Park", slug: "jaycee-park", name: "Jaycee Park", address: "807 Shepard Street", latitude: 34.7195815578469, longitude: -76.713839811261,
    type: "Waterfront park", status: "Downtown waterfront park", amenities: ["Waterfront lawn", "Concert stage", "Fishing", "Piers", "Transient docks", "Covered swings", "Covered picnic tables", "Restrooms", "Parking"], imageAlt: "Waterfront lawn, docks and shelters at Jaycee Park",
    summary: "Jaycee Park is the downtown waterfront gathering space for concerts, fishing, harbor views and events. It is better for strolling, sitting and watching boats than for children's play equipment.",
    answers: [
      answer("parking", "Where should I park for Jaycee Park?", "The park is at 807 Shepard Street with nearby downtown parking. Event days and waterfront festivals can change access, so allow extra time and follow temporary signs.", "Jaycee Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Jaycee-Park-6", "arrival"),
      answer("fishing", "Can I fish at Jaycee Park?", "Yes. The official facility listing includes fishing and piers at 8th and 9th Streets. Follow current North Carolina fishing-license and size-limit rules.", "Jaycee Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Jaycee-Park-6"),
      answer("restroom", "Are there bathrooms at Jaycee Park?", "Yes. Restrooms are listed onsite along with benches, covered swings and covered picnic tables.", "Jaycee Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Jaycee-Park-6"),
      answer("events", "Are there concerts at Jaycee Park?", "Jaycee Park has a waterfront concert stage and hosts town events. Check Morehead City's current calendar because large events can affect parking, seating and dock access.", "Jaycee Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Jaycee-Park-6", "seasonal"),
    ],
  }),
  moreheadPlace({
    facilityId: 7, sourceSlug: "Katherine-Davis-Park", slug: "katherine-davis-park", name: "Katherine Davis Park", address: "601 Arendell Street", latitude: 34.721000634452, longitude: -76.7100912588043,
    status: "Small downtown green", amenities: ["Open lawn", "American flag station", "Restrooms", "Parking"], imageAlt: "Open lawn and flag station at Katherine Davis Park",
    summary: "Katherine Davis Park is a small open lawn opposite the 6th Street charter-boat area. It offers a quick downtown green space with restrooms and parking, but no playground or sports amenities are listed.",
    answers: [
      answer("amenities", "What is at Katherine Davis Park?", "The official listing describes an open-space park with an American flag station, restrooms and parking. It is across from the 6th Street charter fishing boats.", "Katherine Davis Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Katherine-Davis-Park-7"),
      answer("playground", "Does Katherine Davis Park have a playground?", "No playground is listed. For children's play nearby, Dr. Martin Luther King Jr. Park has a playground and Shevans Park has both a playground and seasonal splash pad.", "Katherine Davis Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Katherine-Davis-Park-7"),
    ],
  }),
  moreheadPlace({
    facilityId: 8, sourceSlug: "Mitchell-Village-Park", slug: "mitchell-village-park", name: "Mitchell Village Park", address: "4907 Holly Lane", latitude: 34.7261996083405, longitude: -76.7889277189592,
    status: "Neighborhood playground and water access", amenities: ["Playground", "Gazebo", "Two covered bench swings", "Two grills", "Public water access"], imageAlt: "Playground and gazebo at Mitchell Village Park",
    accessibility: "The town's 2026 draft ADA assessment documented barriers in the parking and route network at the time of inspection. Visitors who need a step-free route should contact the town for the latest improvement status before visiting.",
    summary: "Mitchell Village Park is a neighborhood-scale family stop with a playground, gazebo, covered swings, grills and public water access. Accessibility conditions deserve a same-day check if a continuous step-free route is essential.",
    answers: [
      answer("playground", "Does Mitchell Village Park have a playground?", "Yes. The neighborhood park has a playground, gazebo, two covered bench swings, two grills and public water access.", "Mitchell Village Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Mitchell-Village-Park-8"),
      answer("accessibility", "Is Mitchell Village Park wheelchair accessible?", "The town's 2026 draft ADA assessment identified parking and route barriers at the time of inspection. Contact Parks and Recreation for current conditions before relying on a step-free route.", "Morehead City ADA Transition Plan", "https://www.moreheadcitync.org/DocumentCenter/View/3282/DRAFT-Morehead-City-ADA-Transition-Plan", "arrival"),
      answer("picnic", "Can we cook or picnic at Mitchell Village Park?", "Yes. The official listing includes two grills, a gazebo and covered bench swings. Bring what you need and follow posted fire or grill restrictions.", "Mitchell Village Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Mitchell-Village-Park-8"),
    ],
  }),
  moreheadPlace({
    facilityId: 9, sourceSlug: "Morehead-City-Recreation-Center", slug: "w-s-king-recreation-center", name: "W.S. King Recreation Center and Park", address: "1600 Fisher Street", latitude: 34.7240864166089, longitude: -76.7245498534434,
    type: "Recreation center and park", status: "Indoor recreation center with public grounds", hours: "Center: Monday-Friday 6 a.m.-8 p.m.; Saturday 8 a.m.-noon. Outdoor park areas generally dawn to dusk.",
    amenities: ["Gymnasium", "Cardio and weight rooms", "Exercise and art classrooms", "Meeting rooms", "Outdoor basketball court", "Lighted multipurpose field", "Playground", "Picnic shelter", "Pier", "Restrooms", "Parking"], imageAlt: "Fitness room inside W.S. King Recreation Center",
    summary: "W.S. King combines Morehead City's indoor recreation center with a playground, lighted field, basketball, shelter and pier outside. Check program schedules before assuming the gym or classrooms are open for drop-in use.",
    hoursAnswer: "The Recreation Center is open Monday through Friday from 6 a.m. to 8 p.m. and Saturday from 8 a.m. to noon. Program rooms, gym access and holiday hours can vary; outdoor park grounds generally follow dawn-to-dusk rules.",
    answers: [
      answer("playground", "Is there an outdoor playground at W.S. King Recreation Center?", "Yes. Outdoor facilities include a playground, basketball court, lighted football or multipurpose field, picnic shelter and pier.", "Morehead City Recreation Center", "https://www.moreheadcitync.org/Facilities/Facility/Details/Morehead-City-Recreation-Center-9"),
      answer("indoor", "What is inside W.S. King Recreation Center?", "Indoor facilities include cardio and weight rooms, a gymnasium, art and exercise classrooms, meeting rooms and the reservable W.S. King Room. Check the current program schedule for drop-in availability.", "Morehead City Recreation Center", "https://www.moreheadcitync.org/Facilities/Facility/Details/Morehead-City-Recreation-Center-9", "arrival"),
      answer("restroom", "Are there restrooms and parking at W.S. King?", "Yes. The official facility listing includes parking, restrooms and locker-room facilities.", "Morehead City Recreation Center", "https://www.moreheadcitync.org/Facilities/Facility/Details/Morehead-City-Recreation-Center-9"),
    ],
  }),
  moreheadPlace({
    facilityId: 11, sourceSlug: "Piney-Park", slug: "piney-park", name: "Piney Park", address: "2717 Bridges Street", latitude: 34.7260333946541, longitude: -76.7402902342552,
    status: "Small neighborhood playground", amenities: ["Small tot-lot playground", "Open lawn", "Two picnic tables", "Parking"], imageAlt: "Open lawn, picnic area and sign at Piney Park",
    summary: "Piney Park is a simple neighborhood play stop with a small tot lot, open grass and two picnic tables. It is best for a short younger-child visit rather than a destination outing.",
    answers: [
      answer("playground", "What age is Piney Park best for?", "The town describes the play area as a small tot lot, so it is aimed more toward younger children than older kids seeking large climbing structures or sports courts.", "Piney Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Piney-Park-11"),
      answer("restroom", "Are there bathrooms at Piney Park?", "Restrooms are not listed. Plan for a short visit and use a larger park such as Shevans or Rotary when restrooms are essential.", "Piney Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Piney-Park-11"),
      answer("picnic", "Can we picnic at Piney Park?", "Yes, on a small scale. Two picnic tables are listed, but no shelter or grill is documented.", "Piney Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Piney-Park-11"),
    ],
  }),
  moreheadPlace({
    facilityId: 12, sourceSlug: "Snookie-Wade-Park", slug: "snookie-wade-park", name: "Snookie Wade Park", address: "800 Bay Street", latitude: 34.7239844310392, longitude: -76.7124798789864,
    status: "Official listing currently marked closed", hours: "Currently marked closed on the official facility page; recheck before visiting.", amenities: ["Open lawn", "Benches", "Picnic tables"], imageAlt: "Lawn, benches and historic house at Snookie Wade Park",
    summary: "Snookie Wade Park is a tiny neighborhood green with benches and picnic tables. The official facility page is currently marked closed, so do not make a special trip without checking for reopening information.",
    hoursAnswer: "The official facility listing is currently marked closed. Check that page or contact Morehead City Parks and Recreation before visiting because no reopening date is posted in the listing.",
    answers: [
      answer("closures", "Is Snookie Wade Park open?", "The official facility page is currently marked closed. Check for a new town notice before visiting.", "Snookie Wade Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Snookie-Wade-Park-12", "arrival"),
      answer("amenities", "What is at Snookie Wade Park?", "The town lists open space, benches and picnic tables. No restroom, playground or parking lot is listed.", "Snookie Wade Park", "https://www.moreheadcitync.org/Facilities/Facility/Details/Snookie-Wade-Park-12"),
    ],
  }),
  moreheadPlace({
    facilityId: 14, sourceSlug: "Sugarloaf-Island", slug: "sugarloaf-island", name: "Sugarloaf Island", address: "Morehead City Waterfront (boat or kayak access only)", latitude: 34.717462, longitude: -76.7096734,
    coordinateSource: "https://www.openstreetmap.org/way/38114299", positionQuality: "reviewed-island-centroid-cross-checked-against-2025-usda-naip",
    type: "Natural area", status: "Boat-access natural park", amenities: ["Floating dock", "Natural trails", "Shoreline", "Paddling access", "Wildlife viewing"], imageAlt: "Sugarloaf Island across the water from downtown Morehead City",
    summary: "Sugarloaf Island is the undeveloped island directly across from downtown Morehead City. It is reached only by boat or kayak, with a floating dock and natural terrain rather than conventional park facilities.",
    answers: [
      answer("entrance", "How do I get to Sugarloaf Island?", "There is no road or bridge. The town lists Sugarloaf as boat- or kayak-access only, with a floating dock. Check wind, tide and marine conditions before launching.", "Sugarloaf Island", "https://www.moreheadcitync.org/Facilities/Facility/Details/Sugarloaf-Island-14", "arrival"),
      answer("restroom", "Are there bathrooms on Sugarloaf Island?", "No restroom is listed on the island. Use waterfront facilities before launching and pack out everything you bring.", "Sugarloaf Island", "https://www.moreheadcitync.org/Facilities/Facility/Details/Sugarloaf-Island-14"),
      answer("trail-surface", "What are Sugarloaf Island trails like?", "Expect natural, uneven and potentially wet or sandy terrain. The official listing identifies trails but not a paved or accessible route.", "Sugarloaf Island", "https://www.moreheadcitync.org/Facilities/Facility/Details/Sugarloaf-Island-14", "arrival"),
      answer("closures", "Is Sugarloaf Island restoration affecting access?", "The island has an active long-term stabilization and habitat-restoration history. Check town notices and respect any fenced or signed restoration areas when you arrive.", "Sugarloaf Island Restoration", "https://www.moreheadcitync.org/CivicAlerts.aspx?AID=93", "arrival"),
    ],
  }),
  moreheadPlace({
    facilityId: 16, sourceSlug: "Calico-Creek-Boardwalk", slug: "calico-creek-boardwalk", name: "Calico Creek Boardwalk", address: "North 19th Street and Bay Street", latitude: 34.7256661249277, longitude: -76.7338579654929,
    type: "Boardwalk and trail", status: "Waterfront nature trail", amenities: ["Boardwalk", "Walking trail", "Bike connection", "Creek and marsh views", "Birdwatching"], imageAlt: "Wooden boardwalk curving through the marsh at Calico Creek",
    imageObject: localImage("morehead-city", "calico-creek-boardwalk", "hero.jpg", "https://www.crystalcoastnc.org/listing/calico-creek-boardwalk/25021/", "Wooden boardwalk curving through the marsh at Calico Creek", "Crystal Coast Tourism Authority"),
    summary: "Calico Creek Boardwalk is a low-key marsh walk running from North 19th and Bay Street toward North 22nd Street. It is one of Morehead City's best short nature and birdwatching stops without leaving town.",
    answers: [
      answer("entrance", "Where do I enter Calico Creek Boardwalk?", "The town says the boardwalk begins around North 19th and Bay Street and runs along Calico Creek toward North 22nd Street. It also connects into the longer Calico Creek walking and biking route.", "Calico Creek Boardwalk", "https://www.moreheadcitync.org/Facilities/Facility/Details/Calico-Creek-Boardwalk-16"),
      answer("trail-surface", "What is the surface at Calico Creek Boardwalk?", "The route combines elevated wooden boardwalk and connecting paved sidewalk or trail segments. Wet weather can make wood slick, and marsh edges can flood during exceptional tides.", "Calico Creek Boardwalk", "https://www.moreheadcitync.org/Facilities/Facility/Details/Calico-Creek-Boardwalk-16", "arrival"),
      answer("wildlife", "What can I see at Calico Creek?", "The marsh setting is useful for shorebirds, waterfowl and creek views, especially around quieter morning and evening periods. Observe wildlife from the path and do not enter the marsh.", "Crystal Coast Tourism Authority", "https://www.crystalcoastnc.org/listing/calico-creek-boardwalk/25021/"),
      answer("restroom", "Are there restrooms on Calico Creek Boardwalk?", "No restroom is listed directly on the boardwalk. The longer route connects near W.S. King Recreation Center, where public facilities may be available during center hours.", "Calico Creek Boardwalk", "https://www.moreheadcitync.org/Facilities/Facility/Details/Calico-Creek-Boardwalk-16", "arrival"),
    ],
  }),
  moreheadPlace({
    facilityId: 18, sourceSlug: "Conchs-Point", slug: "conchs-point", name: "Conchs Point", address: "608 Bay Street", latitude: 34.7238195076424, longitude: -76.7103702171715,
    type: "Waterfront park", status: "Small public water access", amenities: ["Gazebo", "Floating dock", "Fishing", "Public water access", "Picnic area"], imageAlt: "Conchs Point sign, gazebo and marsh waterfront",
    summary: "Conchs Point is a small sound-side access with a gazebo and floating dock. It is useful for fishing, launching a very small hand-carried craft or sitting by the water, not as a beach or full-service park.",
    answers: [
      answer("water-access", "What kind of water access is at Conchs Point?", "The town lists a public floating dock and gazebo. Dock use is limited to 90 minutes, so it is intended for short stops rather than long-term boat mooring.", "Conchs Point", "https://www.moreheadcitync.org/Facilities/Facility/Details/Conchs-Point-18", "arrival"),
      answer("fishing", "Can I fish at Conchs Point?", "Yes. Fishing is listed, but space is compact and boat traffic may use the dock. Follow state licensing and catch rules.", "Conchs Point", "https://www.moreheadcitync.org/Facilities/Facility/Details/Conchs-Point-18"),
      answer("restroom", "Are there restrooms at Conchs Point?", "No restroom is listed. Plan for a short waterfront visit.", "Conchs Point", "https://www.moreheadcitync.org/Facilities/Facility/Details/Conchs-Point-18"),
    ],
  }),
  moreheadPlace({
    facilityId: 19, sourceSlug: "Newport-River-Boat-Ramps-Pier-Radio-Island", slug: "newport-river-boat-ramps", name: "Newport River Boat Ramps and Pier", address: "Radio Island Road", latitude: 34.72265, longitude: -76.6868,
    coordinateSource: "https://www.moreheadcitync.org/Facilities/Facility/Details/Newport-River-Boat-Ramps-Pier-Radio-Island-19", positionQuality: "reviewed-six-ramp-facility-placement-cross-checked-against-2025-usda-naip",
    type: "Boat ramp and fishing pier", status: "Public boating and fishing access", amenities: ["Six boat-launch lanes", "575-foot fishing pier", "56 trailer spaces", "Floating docks", "Restrooms", "Parking", "Water access"], imageAlt: "Boat ramp and rainbow over the Newport River access on Radio Island",
    summary: "This Radio Island facility is Morehead City's main public launch complex, with six ramp lanes, trailer parking, a long fishing pier and restrooms. It is designed for boaters and anglers rather than beach swimming.",
    answers: [
      answer("boat-ramp", "How many ramps are at Newport River Boat Ramps?", "The official listing documents six boat-launch lanes, floating docks and 56 trailer-parking spaces.", "Newport River Boat Ramps and Pier", "https://www.moreheadcitync.org/Facilities/Facility/Details/Newport-River-Boat-Ramps-Pier-Radio-Island-19", "arrival"),
      answer("fishing", "Is there a fishing pier at the Radio Island boat ramp?", "Yes. A 575-foot fishing pier is listed. Keep launch lanes and working docks clear while fishing.", "Newport River Boat Ramps and Pier", "https://www.moreheadcitync.org/Facilities/Facility/Details/Newport-River-Boat-Ramps-Pier-Radio-Island-19"),
      answer("restroom", "Are there bathrooms at the Newport River ramps?", "Yes. Restrooms and parking are listed onsite.", "Newport River Boat Ramps and Pier", "https://www.moreheadcitync.org/Facilities/Facility/Details/Newport-River-Boat-Ramps-Pier-Radio-Island-19"),
      answer("swimming", "Is this a swimming beach?", "No designated swimming beach or lifeguard area is listed. Use it as a boat-launch and fishing facility and choose a managed ocean beach access for swimming.", "Newport River Boat Ramps and Pier", "https://www.moreheadcitync.org/Facilities/Facility/Details/Newport-River-Boat-Ramps-Pier-Radio-Island-19"),
    ],
  }),
  moreheadPlace({
    facilityId: 21, sourceSlug: "Ottis-Landing-Deck-Weigh-Station-Day-Docks", slug: "ottis-landing", name: "Ottis Landing and Day Docks", address: "707 Shepard Street", latitude: 34.7199639683431, longitude: -76.7121012089746,
    type: "Waterfront landing", status: "Downtown waterfront destination", amenities: ["Waterfront deck", "Day docks", "Tournament weigh station", "Picnic tables", "Fishing", "Harbor views"], imageAlt: "Fishing boat at Ottis Landing and the Morehead City waterfront",
    summary: "Ottis Landing is the downtown deck and weigh-station area associated with major fishing events. Outside events, it is a compact waterfront stop with day docks, picnic seating and close views of the harbor and Sugarloaf Island.",
    answers: [
      answer("water-access", "Can I use the docks at Ottis Landing?", "Yes. Ottis Landing day docks are available for public use with a four-hour limit. They are not overnight slips.", "Ottis Landing", "https://www.moreheadcitync.org/Facilities/Facility/Details/Ottis-Landing-Deck-Weigh-Station-Day-Docks-21", "arrival"),
      answer("events", "Is Ottis Landing where fishing tournaments weigh in?", "Yes. The landing sits beside the town weigh station and is a focal point for major tournament activity. Event setup can change pedestrian and dock access.", "Ottis Landing", "https://www.moreheadcitync.org/Facilities/Facility/Details/Ottis-Landing-Deck-Weigh-Station-Day-Docks-21", "seasonal"),
      answer("restroom", "Are there restrooms at Ottis Landing?", "Restrooms are not listed as part of the landing itself. Nearby Jaycee Park lists public restrooms, but event access and hours can vary.", "Ottis Landing", "https://www.moreheadcitync.org/Facilities/Facility/Details/Ottis-Landing-Deck-Weigh-Station-Day-Docks-21", "arrival"),
    ],
  }),
  moreheadPlace({
    facilityId: 26, sourceSlug: "South-12th-Street-Water-Access", slug: "walter-lewis-landing", name: "Walter Lewis Landing", address: "401 South 12th Street", latitude: 34.7195750320876, longitude: -76.7185317479834,
    type: "Public water access", status: "Recorded; awaiting a verified location photo", amenities: ["Public water view", "One bench", "One picnic table"], image: false, publishStatus: "deferred",
    summary: "Walter Lewis Landing is a tiny neighborhood street-end access with one bench and one picnic table. It is useful for a quiet water view, but it has no documented restroom, playground, shelter or dedicated parking lot.",
    answers: [
      answer("amenities", "What is at Walter Lewis Landing?", "The official listing documents one bench and one picnic table at the South 12th Street public water access.", "Walter Lewis Landing", "https://www.moreheadcitync.org/Facilities/Facility/Details/South-12th-Street-Water-Access-26"),
      answer("parking", "Is there parking at Walter Lewis Landing?", "No dedicated parking lot is listed. Respect neighborhood parking rules, driveways and the street-end access.", "Walter Lewis Landing", "https://www.moreheadcitync.org/Facilities/Facility/Details/South-12th-Street-Water-Access-26", "arrival"),
      answer("restroom", "Are there restrooms at Walter Lewis Landing?", "No restroom is listed. This is a very small, short-stay waterfront stop.", "Walter Lewis Landing", "https://www.moreheadcitync.org/Facilities/Facility/Details/South-12th-Street-Water-Access-26"),
    ],
  }),
];

const townParkImages = [
  localImage("atlantic-beach", "town-park", "hero.jpg", atlanticParks, "Splash pad and concessions building at Atlantic Beach Town Park", "Town of Atlantic Beach"),
  localImage("atlantic-beach", "town-park", "splash-pad.jpg", atlanticParks, "Children playing in the Atlantic Beach Town Park splash pad", "Town of Atlantic Beach"),
  localImage("atlantic-beach", "town-park", "playground.jpg", atlanticParks, "Play structures at Atlantic Beach Town Park", "Town of Atlantic Beach"),
  localImage("atlantic-beach", "town-park", "mini-golf.jpg", atlanticParks, "Landscaped 18-hole mini-golf course at Atlantic Beach Town Park", "Town of Atlantic Beach"),
  localImage("atlantic-beach", "town-park", "skate-park.jpg", atlanticParks, "Shaded seating and skate area at Atlantic Beach Town Park", "Town of Atlantic Beach"),
];

const atlantic = [
  atlanticPlace({
    slug: "hoop-pole-creek-nature-trail", name: "Hoop Pole Creek Nature Trail", type: "Nature trail", address: "916 West Fort Macon Road", latitude: 34.7007, longitude: -76.7582,
    status: "Protected maritime-forest trail", hours: "Open for day use; visit between dawn and dusk and follow posted trailhead hours.", cost: "Free access.",
    accessibility: "The roughly one-mile route combines boardwalk, paved sections and natural trail. Wet leaves, roots and marsh conditions can affect footing; confirm current route conditions if a continuous accessible surface is essential.",
    amenities: ["One-mile round-trip trail", "Maritime forest", "Boardwalk", "Salt marsh and estuary views", "Birdwatching", "Kayak launch", "Small trailhead parking area"],
    sourceLabel: "Town of Atlantic Beach", source: "https://atlanticbeach-nc.com/parks-and-attractions/",
    images: [localImage("atlantic-beach", "hoop-pole-creek-nature-trail", "hero.jpg", "https://www.crystalcoastnc.org/listing/hoop-pole-creek-nature-trail/24962/", "Hoop Pole Creek flowing through protected maritime forest and marsh", "Crystal Coast Tourism Authority")],
    summary: "Hoop Pole Creek is Atlantic Beach's hidden nature stop: a short shaded trail and boardwalk through the town's remaining maritime forest to salt marsh and estuary views, with a small kayak launch near the trail.",
    answers: [
      answer("parking", "Where do I park for Hoop Pole Creek Nature Trail?", "Look for the small trailhead near 916 West Fort Macon Road beside Atlantic Station Shopping Center. Parking is limited, so avoid blocking neighboring businesses and follow posted trail signs.", "Hoop Pole Creek Nature Trail", "https://www.crystalcoastnc.org/listing/hoop-pole-creek-nature-trail/24962/", "arrival"),
      answer("trail-surface", "How long and difficult is Hoop Pole Creek Trail?", "The tourism authority describes a roughly one-mile round trip through maritime forest, boardwalk and paved sections. It is short and mostly level, but leaves, roots, damp wood and marsh conditions can make footing variable.", "Hoop Pole Creek Nature Trail", "https://www.crystalcoastnc.org/listing/hoop-pole-creek-nature-trail/24962/", "arrival"),
      answer("restroom", "Are there bathrooms at Hoop Pole Creek?", "No restroom or water fountain is listed at the trail itself. Use nearby public or business facilities before entering and carry water in warm weather.", "Hoop Pole Creek Nature Trail", "https://www.crystalcoastnc.org/listing/hoop-pole-creek-nature-trail/24962/"),
      answer("wildlife", "What can I see at Hoop Pole Creek?", "The preserve protects maritime forest, salt marsh and estuary habitat. Look for songbirds in the canopy and herons, egrets and other wading birds near the creek without leaving the marked route.", "Hoop Pole Creek Fact Sheet", "https://www.nccoast.org/resource/hoop-pole-creek-fact-sheet/"),
      answer("kayak", "Can I launch a kayak at Hoop Pole Creek?", "Yes. The Town of Atlantic Beach identifies a kayak launch at the nature trail. Check tide, wind and creek conditions and avoid disturbing marsh vegetation.", "Atlantic Beach Parks and Attractions", "https://atlanticbeach-nc.com/parks-and-attractions/", "arrival"),
    ],
  }),
  atlanticPlace({
    slug: "atlantic-beach-town-park", name: "Atlantic Beach Town Park", address: "915 West Fort Macon Road", latitude: 34.69987, longitude: -76.75136,
    status: "Family destination park", hours: "Park, skatepark and restrooms: daily 6 a.m.-11 p.m., weather permitting. Splash pad and mini-golf are seasonal.", cost: "Park, playground, splash pad and skatepark are free; mini-golf and concessions cost extra.",
    accessibility: "Paved parking and routes serve the central park amenities. Contact the town for current accessible-play and restroom details if a specific accommodation is essential.",
    amenities: ["Seasonal splash pad", "Playground", "Large skatepark", "18-hole mini-golf", "Half basketball court", "Gaga ball", "Cornhole", "Picnic shelter", "Concessions", "Restrooms", "Parking"],
    sourceLabel: "Town of Atlantic Beach", source: atlanticParks, images: townParkImages,
    summary: "Atlantic Beach Town Park is the town's central family destination, combining a free playground, seasonal splash pad and skatepark with paid mini-golf, concessions, restrooms and a reservable shelter.",
    answers: [
      answer("hours", "What time does Atlantic Beach Town Park close?", "The park, skatepark and restrooms are open daily from 6 a.m. to 11 p.m., weather permitting, unless a reserved activity changes access. Overnight parking is not allowed.", "Atlantic Beach Parks and Recreation", atlanticParks, "arrival"),
      answer("splash-pad", "When is the Atlantic Beach Town Park splash pad open?", "The town lists the splash pad from mid-May through late September, daily 10 a.m. to 8 p.m., weather permitting. It is free. Check same-day town updates for weather or maintenance closures.", "Atlantic Beach Parks and Recreation", atlanticParks, "seasonal"),
      answer("playground", "Does Atlantic Beach Town Park have a playground?", "Yes. A free playground sits with the splash pad, restrooms and shelter, making this the strongest non-beach kids stop in Atlantic Beach.", "Atlantic Beach Parks and Recreation", atlanticParks),
      answer("mini-golf", "How much is mini-golf at Atlantic Beach Town Park?", "The town currently lists 18-hole mini-golf at $6 per person, with children age 6 and younger free. Hours are seasonal and last admission is 30 minutes before closing.", "Atlantic Beach Parks and Recreation", atlanticParks, "seasonal"),
      answer("skate-park", "Is the Atlantic Beach skatepark free?", "Yes. The skatepark is free and generally open daily 6 a.m. to 11 p.m. Riders under 10 must have an adult, and helmets, elbow pads and knee pads are required.", "Atlantic Beach Parks and Recreation", atlanticParks, "arrival"),
      answer("picnic", "Can I reserve the Atlantic Beach Town Park shelter?", "Yes. The 20-by-20-foot shelter has six picnic tables seating about 36 people. The town lists three four-hour reservation blocks and a $25 fee; confirm availability through the town.", "Atlantic Beach Parks and Recreation", atlanticParks, "arrival"),
      answer("restroom", "Are there bathrooms at Atlantic Beach Town Park?", "Yes. Public restrooms and concessions are in the central park building near the splash pad and mini-golf area.", "Atlantic Beach Parks and Recreation", atlanticParks),
    ],
  }),
  atlanticPlace({
    slug: "circle-regional-beach-access", name: "The Circle Regional Beach Access", type: "Beach access", address: "201 West Atlantic Boulevard", latitude: 34.6981, longitude: -76.7406,
    status: "Main guarded town beach access", hours: "Beach access is open daily; parking is paid seasonally and lifeguards operate only during the posted summer schedule.", cost: "Beach access is free; parking is paid April 1 through September 30.",
    accessibility: "A developed public access with bathhouse facilities and a boardwalk. Beach sand and changing surf conditions may limit access beyond the hard-surface route.",
    amenities: ["Ocean beach", "Three seasonal lifeguard stands", "Bathrooms", "Outside showers", "Large parking area", "Picnic tables", "Volleyball courts", "Beach wheelchairs by request"],
    sourceLabel: "Town of Atlantic Beach", source: atlanticAccess,
    images: [localImage("atlantic-beach", "circle-regional-beach-access", "hero.jpg", atlanticParks, "Wide sandy beach and oceanfront access at The Circle", "Town of Atlantic Beach")],
    summary: "The Circle is Atlantic Beach's main full-service ocean access, with the town's largest concentration of parking, bathrooms, outdoor showers, summer lifeguards, volleyball and events.",
    answers: [
      answer("parking", "Where do I park for The Circle beach access?", "Navigate to 201 West Atlantic Boulevard. The Circle has the town's largest public beach-parking area, with more than 300 spaces described by current town materials. Parking is paid April 1 through September 30 and fills quickly on peak weekends.", "Atlantic Beach Parking", atlanticParking, "arrival"),
      answer("lifeguard", "Are there lifeguards at The Circle?", "The town staffs three stands at The Circle during its peak season, generally Memorial Day weekend through mid-August from 9 a.m. to 5:30 p.m. Conditions and staffing can change, so look for an occupied stand and current beach-safety flags before swimming.", "Atlantic Beach Lifeguards", atlanticLifeguards, "seasonal"),
      answer("restroom", "Are there bathrooms and showers at The Circle?", "Yes. The developed access includes public bathrooms and outside rinse showers. Bring footwear because pavement and sand become very hot.", "Atlantic Beach Beach Access", atlanticAccess),
      answer("accessibility", "Can I borrow a beach wheelchair at Atlantic Beach?", "The town offers beach wheelchairs free of charge on a first-come basis. Reserve one through the Fire Department at 252-726-7361; availability is not guaranteed without advance contact.", "Atlantic Beach Beach Wheelchairs", "https://atlanticbeach-nc.com/departments/fire-department/beach-wheelchairs/", "arrival"),
      answer("shade", "Are Shibumi shades allowed at The Circle?", "The town's published beach-access information does not list Shibumi-style wind shades as prohibited. Keep any shade clear of lifeguard sight lines, emergency lanes and dunes, secure it for current winds, and follow staff directions.", "Atlantic Beach Beach Access", atlanticAccess, "arrival"),
    ],
  }),
  atlanticPlace({
    slug: "tom-doe-memorial-beach-access", name: "Tom Doe Memorial Beach Access", type: "Beach access", address: "Ocean Boulevard at Henderson Boulevard", latitude: 34.6972, longitude: -76.7248,
    status: "Family-friendly regional beach access", hours: "Beach access is open daily; facilities and parking enforcement follow town schedules.", cost: "Beach access is free; parking is paid seasonally.",
    accessibility: "The town lists an accessible ramp and accessible parking. Sand remains a natural surface beyond the hard-surface route.",
    amenities: ["Ocean beach", "Beach playground", "Bathrooms", "Outside showers", "Foot-wash station", "Accessible ramp", "Accessible parking", "Additional Henderson Boulevard parking"],
    sourceLabel: "Town of Atlantic Beach", source: atlanticAccess,
    images: [localImage("atlantic-beach", "tom-doe-memorial-beach-access", "hero.jpg", atlanticAccess, "Accessible boardwalk, shower and beach entrance at Tom Doe Memorial Beach Access", "Town of Atlantic Beach")],
    summary: "Tom Doe is especially useful for families because it combines a regional ocean access with a small beach playground, bathrooms, showers, foot wash and an accessible ramp.",
    answers: [
      answer("parking", "Where do I park for Tom Doe Memorial Beach Access?", "Use the regional access parking on Ocean Boulevard, with additional parking along Henderson Boulevard. Summer parking is paid and can fill early.", "Atlantic Beach Beach Access", atlanticAccess, "arrival"),
      answer("playground", "Is there a playground at Tom Doe beach access?", "Yes. The town specifically lists a beach playground, making Tom Doe one of the most useful ocean accesses for families who want play equipment as well as sand and surf.", "Atlantic Beach Beach Access", atlanticAccess),
      answer("restroom", "Are there bathrooms and showers at Tom Doe?", "Yes. The access includes a restroom, outdoor showers and a foot-washing station.", "Atlantic Beach Beach Access", atlanticAccess),
      answer("accessibility", "Is Tom Doe beach access accessible?", "The town lists an accessible ramp and accessible parking. Contact the Fire Department in advance if you need a loaner beach wheelchair for travel over sand.", "Atlantic Beach Beach Access", atlanticAccess, "arrival"),
      answer("lifeguard", "Are there lifeguards at Tom Doe beach access?", "Tom Doe is not listed among the town's staffed lifeguard stands. Swim only to your ability, check flags and conditions, and use The Circle if a staffed stand is important.", "Atlantic Beach Lifeguards", atlanticLifeguards, "seasonal"),
    ],
  }),
  atlanticPlace({
    slug: "les-and-sally-moore-beach-access", name: "Les and Sally Moore Public Beach Access", type: "Beach access", address: "177 New Bern Street", latitude: 34.6984, longitude: -76.7462,
    status: "Regional public beach access", hours: "Beach access is open daily; facilities and parking enforcement follow town schedules.", cost: "Beach access is free; parking is paid seasonally.",
    accessibility: "A developed boardwalk serves the beach access. Sand remains a natural surface; contact the town about beach-wheelchair availability when needed.",
    amenities: ["Ocean beach", "About 50 parking spaces", "Bathrooms", "Outside showers", "Picnic tables", "Boardwalk"],
    sourceLabel: "Town of Atlantic Beach", source: atlanticAccess,
    images: [localImage("atlantic-beach", "les-and-sally-moore-beach-access", "hero.jpg", atlanticAccess, "Accessible boardwalk and dune crossing at Les and Sally Moore Beach Access", "Town of Atlantic Beach")],
    summary: "The New Bern Street access is a practical middle-size beach option with about 50 spaces, bathrooms, outdoor showers and picnic tables, without the event scale of The Circle.",
    answers: [
      answer("parking", "How much parking is at the New Bern Street beach access?", "The town lists about 50 spaces at 177 New Bern Street. Parking is paid April 1 through September 30 and can fill quickly on warm weekends.", "Atlantic Beach Parking", atlanticParking, "arrival"),
      answer("restroom", "Are there bathrooms and showers at Les and Sally Moore Beach Access?", "Yes. Public bathrooms, picnic tables and outside rinse showers are listed.", "Atlantic Beach Beach Access", atlanticAccess),
      answer("lifeguard", "Are there lifeguards at the New Bern Street access?", "This access is not listed among Atlantic Beach's staffed lifeguard stands. Check beach flags and conditions and do not assume lifeguard coverage.", "Atlantic Beach Lifeguards", atlanticLifeguards, "seasonal"),
      answer("accessibility", "Is there a boardwalk at Les and Sally Moore Beach Access?", "Yes. The developed boardwalk crosses the dunes to the beach. Natural sand begins beyond the hard-surface route.", "Atlantic Beach Beach Access", atlanticAccess),
    ],
  }),
  atlanticPlace({
    slug: "fort-macon-beach-access", name: "Fort Macon Bathhouse Beach Access", type: "Beach access", address: "75 Picnic Park Drive", latitude: 34.6958, longitude: -76.6909,
    status: "Full-service state park swim beach", hours: "August: 8 a.m.-9 p.m. Gate hours vary by month; lifeguards are seasonal, as staffing permits, 10 a.m.-5:45 p.m.", cost: "Free day use and free parking.",
    accessibility: "The developed bathhouse area has marked accessible parking, accessible restrooms and hard-surface routes to the beach approach. Natural sand and surf conditions remain variable; confirm current accommodations with the park office.",
    amenities: ["Guarded seasonal swim beach", "Large free parking area", "Bathhouse restrooms", "Outdoor showers and foot rinse", "Seasonal concession stand", "Picnic shelters and gazebos", "Fishing", "Beachcombing", "Trail connection"],
    sourceLabel: "NC State Parks", source: fortMacon,
    images: [
      localImage("atlantic-beach", "fort-macon-beach-access", "hero.jpg", fortMacon, "Visitors under a Shibumi-style shade at Fort Macon beach", "NC State Parks / C. Peek"),
      localImage("atlantic-beach", "fort-macon-beach-access", "fort.jpg", fortMacon, "Fort walls, grassy grounds and paths at Fort Macon State Park", "NC State Parks / E. Farr"),
      localImage("atlantic-beach", "fort-macon-beach-access", "trail.jpg", fortMacon, "Maritime forest section of the Fort Macon trail", "NC State Parks / R. Newman"),
      localImage("atlantic-beach", "fort-macon-beach-access", "cannon.jpg", fortMacon, "Historic cannon silhouetted at Fort Macon", "NC State Parks / B. Fleming"),
      localImage("atlantic-beach", "fort-macon-beach-access", "rainbow.jpg", fortMacon, "Rainbow and flag over Fort Macon State Park", "NC State Parks / J. Fullwood"),
    ],
    summary: "Fort Macon's bathhouse beach is the area's strongest full-service free beach day: a large free lot, seasonal guarded swim area, bathhouse, outdoor rinses, shelters and a seasonal refreshment stand, with the fort and nature trails nearby.",
    answers: [
      answer("parking", "Where should I park for Fort Macon beach access?", "Navigate to 75 Picnic Park Drive, the bathhouse and picnic-area entrance before the historic fort. Parking is free and the developed beach-access lot has hundreds of spaces, but summer weekends can still fill.", "NC State Parks Fort Macon", fortMacon, "arrival"),
      answer("hours", "What time does Fort Macon beach access close?", "Gate hours change by month: 8 a.m.-5:30 p.m. January-February and November-December; 8 a.m.-7 p.m. March and October; 8 a.m.-8 p.m. April-May and September; and 8 a.m.-9 p.m. June-August. The historic fort itself is open daily 9 a.m.-5 p.m. The park is closed Christmas Day.", "NC State Parks Fort Macon", fortMacon, "arrival"),
      answer("lifeguard", "Are there lifeguards at Fort Macon beach?", "NC State Parks lists lifeguards from Memorial Day through Labor Day, as staffing permits, from 10 a.m. to 5:45 p.m. Swim only in the protected area when the stand is staffed and follow flags and lifeguard directions.", "NC State Parks Fort Macon", fortMacon, "seasonal"),
      answer("restroom", "Are there bathrooms and showers at Fort Macon beach?", "Yes. The bathhouse area has public restrooms, outdoor showers or rinse facilities and a foot-rinse station. The bathhouse is seasonal, so confirm off-season availability.", "NC State Parks Fort Macon", fortMacon, "seasonal"),
      answer("concessions", "Is there food at Fort Macon beach access?", "A seasonal concession or refreshment stand operates at the bathhouse area. Because days and hours can vary with season and staffing, bring water and backup food rather than relying on it being open.", "NC State Parks Fort Macon", fortMacon, "seasonal"),
      answer("picnic", "Are there picnic shelters at Fort Macon beach?", "Yes. The bathhouse area has picnic shelters and gazebos near the parking and beach approach. Use the large picnic area for shade and meals while keeping beach-access routes clear.", "NC State Parks Fort Macon", fortMacon),
      answer("shade", "Are Shibumi shades allowed at Fort Macon beach?", "Shibumi-style wind shades are used at this beach and are not listed among the park's published prohibited items. Set them outside lifeguard sight lines, emergency lanes, dunes and protected-swim setup areas, secure them for the wind, and follow any ranger or lifeguard direction.", "NC State Parks Fort Macon", fortMacon, "arrival"),
      answer("dogs", "Are dogs allowed at Fort Macon beach?", "Pets are not permitted on the designated swim beach, inside the fort or inside buildings. Elsewhere in the park they must remain attended on a leash no longer than 6 feet.", "NC State Parks Fort Macon", fortMacon),
      answer("swimming", "Can I swim anywhere along Fort Macon?", "Use the designated bathhouse swim beach when lifeguards are present. Swimming, wading and surfing are prohibited along the dangerous inlet shoreline near the fort, and surfing is kept outside the guarded swim area.", "NC State Parks Fort Macon", fortMacon, "arrival"),
      answer("fees", "Does Fort Macon charge an entrance or parking fee?", "No. NC State Parks lists free day use, and the bathhouse beach parking is free. Certain permits or reserved activities may have separate charges.", "NC State Parks Fort Macon", fortMacon),
    ],
  }),
];

const institutions = JSON.parse(fs.readFileSync(institutionsPath, "utf8"));
const additions = [...morehead, ...atlantic];
const ids = new Set(additions.map((place) => place.id));
const identities = new Set(additions.map((place) => `${place.city}|${place.slug}`));
const retained = institutions.filter((place) => !ids.has(place.id) && !identities.has(`${place.city}|${place.slug}`));
const output = [...retained, ...additions].sort((left, right) => left.name.localeCompare(right.name));
fs.writeFileSync(institutionsPath, `${JSON.stringify(output, null, 2)}\n`);

const campaignPath = path.join(root, "data", "carteret-coast-enrichment-campaign.json");
fs.writeFileSync(campaignPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  checkedAt,
  scope: ["Morehead City", "Atlantic Beach"],
  recordCount: additions.length,
  records: additions.map(({ id, name, city, source, image, images, completenessScore, unresolvedIntentKeys }) => ({
    id, name, city, source, imageCount: (image ? 1 : 0) + (images?.length || 0), completenessScore, unresolvedIntentKeys,
  })),
}, null, 2)}\n`);

console.log(`Upserted ${additions.length} Carteret coast destinations (${morehead.length} Morehead City, ${atlantic.length} Atlantic Beach).`);
