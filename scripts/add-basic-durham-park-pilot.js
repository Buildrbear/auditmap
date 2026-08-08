const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "..", "data", "institutions.json");
const checkedAt = "2026-08-04";
const official = "Durham Parks and Recreation";
const facility = (slug, id) => `https://www.dprplaymore.org/Facilities/Facility/Details/${slug}-${id}`;
const image = (documentID, source, alt) => ({
  url: `https://www.dprplaymore.org/ImageRepository/Document?documentID=${documentID}`,
  source,
  author: official,
  license: "Official municipal website image",
  alt,
});
const localImage = (url, source, alt) => ({
  url,
  source,
  author: official,
  license: "Official municipal website image",
  alt,
});
const answer = (intentKey, question, text, source) => ({
  intentKey,
  question,
  answer: text,
  sourceLabel: official,
  source,
  sourceType: "official",
  checkedAt,
});
const base = (record) => ({
  type: "Park",
  city: "Durham",
  state: "NC",
  country: "US",
  citySlug: "durham-nc",
  searchCategory: "park",
  status: "Open",
  hours: "Daily, dawn to dusk.",
  cost: "Free general park access; reservations and programs may have fees.",
  sourceLabel: official,
  verifiedAt: checkedAt,
  enrichmentTier: "basic",
  publishStatus: "enriched-basic",
  ...record,
});

const parks = [
  base({
    id: "crest-street-park", name: "Crest Street Park", slug: "crest-street-park",
    address: "2503 Crest Street, Durham, NC 27705", latitude: 36.0123237, longitude: -78.9376474,
    source: facility("Crest-Street-Park", 14),
    summary: "A 6.83-acre west Durham neighborhood park with an ages 2-12 playground, adult ball field, basketball court, picnic shelter, restrooms, swings, and the W.I. Patterson Recreation Center.",
    searchDescription: "Visitor guide to Crest Street Park parking, playground, ball field, basketball, picnic shelter, restrooms, hours, and accessibility.",
    amenities: ["Playground ages 2-12", "Basketball court", "Adult ball field", "Picnic shelter", "Restrooms", "Swings", "Water fountain"],
    accessibility: "Durham lists developed recreation amenities, but does not publish route-level accessibility details for every feature. Contact DPR at 919-560-4355 for specific access needs.",
    image: localImage("/assets/parks/nc/durham/crest-street-park/hero.jpg", facility("Crest-Street-Park", 14), "Playground at Crest Street Park"),
    searchAnswers: [
      answer("parking", "Where should I park for Crest Street Park?", "Navigate to 2503 Crest Street and use the developed park and recreation-center arrival area. Confirm event instructions for a reserved shelter or field.", facility("Crest-Street-Park", 14)),
      answer("hours", "What hours is Crest Street Park open?", "The outdoor park is open daily from dawn to dusk. Recreation-center and program hours can be different.", facility("Crest-Street-Park", 14)),
      answer("playground", "Does Crest Street Park have a playground?", "Yes. Durham lists a playground for ages 2-12, standard swings, a water fountain, picnic tables, and a nearby shelter.", facility("Crest-Street-Park", 14)),
      answer("restroom", "Are there restrooms at Crest Street Park?", "Yes, restrooms are listed as a park feature. Availability can still vary with maintenance or building access.", facility("Crest-Street-Park", 14)),
      answer("sports", "What sports can you play at Crest Street Park?", "The park has an adult baseball/softball field and a basketball court. Organized field or court use may require a reservation.", facility("Crest-Street-Park", 14)),
      answer("picnic", "Can I reserve the Crest Street Park picnic shelter?", "Yes. Durham identifies a reservable picnic shelter; check DPR's shelter-rental system before planning a group gathering.", facility("Crest-Street-Park", 14)),
    ],
  }),
  base({
    id: "indian-trail-park-durham", name: "Indian Trail Park", slug: "indian-trail-park",
    address: "2309 Indian Trail, Durham, NC 27705", latitude: 36.0233914, longitude: -78.9289233,
    source: facility("Indian-Trail-Park", 37),
    summary: "An 8.5-acre west Durham park known for a shaded ages 2-12 playground, inclusive basket swing, picnic tables, outdoor fitness stations, and direct West Ellerbee Creek Trail access.",
    searchDescription: "Visitor guide to Indian Trail Park's shaded playground, West Ellerbee Creek Trail, fitness stations, parking, hours, and water fountain.",
    amenities: ["Shaded playground ages 2-12", "Basket swing", "West Ellerbee Creek Trail", "Outdoor fitness equipment", "Picnic tables", "Water fountain"],
    accessibility: "The basket swing is intended for children of varied abilities. Durham does not document every path grade or surface, so contact DPR for route-specific access needs.",
    image: image(233, facility("Indian-Trail-Park", 37), "Shaded play equipment at Indian Trail Park"),
    searchAnswers: [
      answer("parking", "Where should I park for Indian Trail Park?", "Navigate to 2309 Indian Trail. This is a neighborhood park and trail access point, so use legal marked parking and avoid blocking residential driveways.", facility("Indian-Trail-Park", 37)),
      answer("hours", "When is Indian Trail Park open?", "The park is open daily from dawn to dusk.", facility("Indian-Trail-Park", 37)),
      answer("playground", "Is the Indian Trail Park playground shaded?", "Yes. Durham specifically identifies it as a shaded playground for ages 2-12, with a seesaw, multi-child spinner, standard swings, and a basket swing.", facility("Indian-Trail-Park", 37)),
      answer("trail", "Which trail connects to Indian Trail Park?", "The paved West Ellerbee Creek Trail is accessible through the park, with strength-training stations along the trail. Durham lists no trail restrooms, so plan ahead.", "https://www.dprplaymore.org/265/North-South-Greenway"),
      answer("restroom", "Are there restrooms at Indian Trail Park?", "Durham does not list restrooms among this park's features, and its West Ellerbee Creek Trail guide says there are no restrooms on that trail. Plan a stop before arriving.", "https://www.dprplaymore.org/265/North-South-Greenway"),
      answer("picnic", "Can we picnic at Indian Trail Park?", "Yes, picnic tables and a water fountain are listed. Durham does not list a reservable shelter at this park.", facility("Indian-Trail-Park", 37)),
    ],
  }),
  base({
    id: "walltown-park", name: "Walltown Park", slug: "walltown-park",
    address: "1308 W Club Boulevard, Durham, NC 27705", latitude: 36.0183596, longitude: -78.9141456,
    source: facility("Walltown-Park", 74),
    summary: "A historic neighborhood park around Walltown Recreation Center with playground, three outdoor basketball courts, youth field, picnic shelter, and fitness facilities. Some soil areas are fenced, and park restrooms are closed pending replacement.",
    searchDescription: "Current Walltown Park guide covering restricted areas, closed restrooms, playground, basketball courts, recreation center, parking, and hours.",
    amenities: ["Playground ages 2-12", "Three basketball courts", "Youth ball field", "Picnic shelter", "Recreation center", "Indoor walking track", "Fitness center"],
    accessibility: "The recreation center has developed indoor facilities. Some outdoor park areas are prohibited behind orange fencing; use only open paths and entrances.",
    image: image(430, facility("Walltown-Park", 74), "Play equipment at Walltown Park"),
    searchAnswers: [
      answer("safety", "Are any parts of Walltown Park closed?", "Yes. Durham says portions of the park are prohibited because of soil contamination. Stay outside orange fencing and check the city's park-update page before visiting.", "https://www.dprplaymore.org/531/ParkPlayground-Updates"),
      answer("restroom", "Are the Walltown Park restrooms open?", "No. Durham says the park restrooms are closed pending remodel or replacement. The recreation center has separate building hours and restrooms, so confirm access before relying on them.", facility("Walltown-Park", 74)),
      answer("hours", "When is Walltown Park open?", "The outdoor park is open dawn to dusk. The recreation center is generally open Monday-Friday 9 a.m.-9 p.m., Saturday 8:30 a.m.-2 p.m., and closed Sunday; holiday schedules may differ.", "https://www.dprplaymore.org/facilities/facility/details/Walltown-Park-Recreation-Center-92"),
      answer("playground", "Does Walltown Park have a playground?", "Yes. The fenced playground serves ages 2-12 and includes a tire swing. Follow all closure fencing around restricted soil areas.", facility("Walltown-Park", 74)),
      answer("basketball", "How many basketball courts are at Walltown Park?", "Durham lists three unlighted outdoor basketball courts, plus an indoor gym in the recreation center.", "https://www.dprplaymore.org/580/Basketball-Courts-Information"),
      answer("parking", "Where should I park for Walltown Park?", "Navigate to 1308 W Club Boulevard. The recreation center lists a parking lot; use open marked routes and do not enter fenced areas.", "https://www.dprplaymore.org/facilities/facility/details/Walltown-Park-Recreation-Center-92"),
    ],
  }),
  base({
    id: "westover-park-durham", name: "Westover Park", slug: "westover-park",
    address: "1900 Maryland Avenue, Durham, NC 27705", latitude: 36.0254438, longitude: -78.9217741,
    source: facility("Westover-Park", 78),
    summary: "A compact 1.8-acre neighborhood park with an ages 2-12 playground, toddler and standard swings, picnic tables, grill, water fountain, public art, and West Ellerbee Creek Trail access.",
    searchDescription: "Visitor guide to Westover Park playground, swings, parking, West Ellerbee Creek Trail access, public art, hours, and restroom planning.",
    amenities: ["Playground ages 2-12", "Toddler and standard swings", "West Ellerbee Creek Trail", "Picnic tables", "Grill", "Water fountain", "Public art"],
    accessibility: "Durham lists a unitary-surface playground. Route details for the trail and parking approach are not fully documented; contact DPR for specific needs.",
    image: image(1541, facility("Westover-Park", 78), "Colorful public art at Westover Park"),
    searchAnswers: [
      answer("parking", "Where should I park for Westover Park?", "Navigate to 1900 Maryland Avenue. Durham identifies the paved circle on West Ellerbee Creek Trail near the park parking as a useful landmark.", facility("Westover-Park", 78)),
      answer("hours", "When is Westover Park open?", "The park is open daily from dawn to dusk.", facility("Westover-Park", 78)),
      answer("playground", "What is at the Westover Park playground?", "The ages 2-12 playground has a unitary surface, standard swings, and toddler bucket swings.", "https://www.dprplaymore.org/253/Playgrounds"),
      answer("trail", "Can I access West Ellerbee Creek Trail from Westover Park?", "Yes. Westover is a developed access point on the trail, which is paved and about 2.25 miles long.", "https://www.dprplaymore.org/265/North-South-Greenway"),
      answer("restroom", "Are there restrooms at Westover Park?", "Durham does not list restrooms at the park, and the West Ellerbee Creek Trail guide lists no restrooms. Plan ahead.", "https://www.dprplaymore.org/265/North-South-Greenway"),
      answer("picnic", "Can I picnic at Westover Park?", "Yes. Picnic tables and a grill are listed, but there is no reservable shelter in the official feature list.", facility("Westover-Park", 78)),
    ],
  }),
  base({
    id: "oval-drive-park", name: "Oval Drive Park", slug: "oval-drive-park",
    address: "2200 W Club Boulevard, Durham, NC 27704", latitude: 36.0169327, longitude: -78.9279861,
    source: facility("Oval-Drive-Park", 54),
    summary: "A 3.44-acre neighborhood park with ages 2-12 playground, swings, picnic shelter, adult ball field, basketball court, and tennis courts. One tennis court remains listed closed after tree damage.",
    searchDescription: "Current guide to Oval Drive Park playground, picnic shelter, basketball, tennis-court closure, parking, hours, and restrooms.",
    amenities: ["Playground ages 2-12", "Picnic shelter", "Basketball court", "Adult ball field", "Tennis courts", "Swings", "Water fountain"],
    accessibility: "The playground includes separate age areas and developed paths, but Durham does not publish detailed route information for every feature.",
    image: image(319, facility("Oval-Drive-Park", 54), "Jungle gym at Oval Drive Park"),
    searchAnswers: [
      answer("parking", "Where should I park for Oval Drive Park?", "Navigate to 2200 W Club Boulevard and use legal marked parking near the neighborhood park. Confirm arrival instructions for a shelter or athletic reservation.", facility("Oval-Drive-Park", 54)),
      answer("hours", "When is Oval Drive Park open?", "The park is open daily from dawn to dusk.", facility("Oval-Drive-Park", 54)),
      answer("playground", "What ages is the Oval Drive Park playground for?", "The playground serves ages 2-12 with separate 2-5 and 5-12 areas, standard swings, toddler bucket swings, and a Lazy River play feature.", "https://www.dprplaymore.org/253/Playgrounds"),
      answer("tennis", "Are the Oval Drive Park tennis courts open?", "Durham lists two unlighted tennis courts, but one court has a long-term closure after tree damage. Check the current park-update page before going specifically for tennis.", "https://www.dprplaymore.org/531/ParkPlayground-Updates"),
      answer("restroom", "Are there restrooms at Oval Drive Park?", "Restrooms are not listed among the park's official features. Plan ahead rather than assuming facilities are available.", facility("Oval-Drive-Park", 54)),
      answer("picnic", "Can I reserve the Oval Drive Park shelter?", "Yes. Durham identifies a reservable picnic shelter with tables and a grill; use DPR's rental system for group plans.", facility("Oval-Drive-Park", 54)),
    ],
  }),
  base({
    id: "belmont-park-durham", name: "Belmont Park", slug: "belmont-park",
    address: "2207 Sovereign Street, Durham, NC 27701", latitude: 36.0271394, longitude: -78.9278195,
    source: facility("Belmont-Park", 3),
    summary: "A small specialty park built around a bicycle pump track and beginner strider track, with benches and a dragon sculpture. Protective pads are required and wet-track riding is prohibited.",
    searchDescription: "Visitor guide to Belmont Park's pump track and strider track, required safety gear, wet-weather rules, parking, hours, and facilities.",
    amenities: ["Bicycle pump track", "Beginner strider track", "Benches", "Dragon sculpture", "Walking path"],
    accessibility: "The park has developed paths and benches, but the riding tracks require balance and protective gear. Durham does not publish detailed accessible-route measurements.",
    image: image(1917, facility("Belmont-Park", 3), "Pump track and dragon sculpture at Belmont Park"),
    searchAnswers: [
      answer("parking", "Where should I park for Belmont Park in Durham?", "Navigate to 2207 Sovereign Street. Parking is limited, and Durham has encouraged visitors to walk or bike when practical.", facility("Belmont-Park", 3)),
      answer("hours", "When is Belmont Park open?", "The park is open daily from dawn to dusk. Do not ride when the track is wet.", facility("Belmont-Park", 3)),
      answer("bike", "What is the Belmont Park pump track?", "It is a loop of hills, berms, and banked turns designed to generate momentum by pumping rather than pedaling. Riders should move in the same direction.", facility("Belmont-Park", 3)),
      answer("children", "Is Belmont Park good for young children learning to bike?", "Yes. A separate strider track is designed for young children learning balance and coordination before pedaling.", facility("Belmont-Park", 3)),
      answer("safety", "Do riders need helmets at Belmont Park?", "Yes. Helmets, elbow pads, and knee pads are required on both tracks. Motorized bikes and remote-control cars are prohibited.", facility("Belmont-Park", 3)),
      answer("restroom", "Are there restrooms at Belmont Park?", "Durham lists benches and the pump track but not restrooms or a water fountain. Plan ahead and bring water.", facility("Belmont-Park", 3)),
    ],
  }),
  base({
    id: "morreene-road-park", name: "Morreene Road Park", slug: "morreene-road-park",
    address: "1102 Morreene Road, Durham, NC 27705", latitude: 36.0072296, longitude: -78.9557324,
    source: facility("Morreene-Road-Park", 46),
    summary: "An 11.96-acre community park with Durham's first purpose-built accessible playground, plus courts, youth ball field, picnic shelter, restrooms, swings, and tactile public art.",
    searchDescription: "Visitor guide to Morreene Road Park's accessible playground, tennis and pickleball courts, basketball, parking, shelter, restrooms, and public art.",
    amenities: ["Accessible fenced playground", "Five tennis and pickleball-lined courts", "Two basketball courts", "Youth ball field", "Picnic shelter", "Restrooms", "Public art"],
    accessibility: "The ages 2-12 playground has safety ramps, Braille clock and alphabet, flat rubber wheelchair-friendly surfacing, and nearby art incorporating ASL forms.",
    image: localImage("/assets/parks/nc/durham/morreene-road-park/hero.jpg", "https://www.durhamnc.gov/3245/Public-Art-Collection", "Tactile public art and accessible route at Morreene Road Park"),
    searchAnswers: [
      answer("parking", "Where should I park for Morreene Road Park?", "Navigate to 1102 Morreene Road and use marked on-site spaces. For a reserved court, field, or shelter, confirm the assigned arrival area.", facility("Morreene-Road-Park", 46)),
      answer("hours", "When is Morreene Road Park open?", "The general park is open dawn to dusk. Lighted court programming can run later; current DPR schedules list public court sessions as late as 10 p.m.", "https://dprplaymore.org/DocumentCenter/View/3916/Play-More-June-Aug-26-2"),
      answer("accessibility", "Is the Morreene Road Park playground wheelchair accessible?", "Yes. Durham describes ramps, a flat rubber surface firm enough for wheelchairs, a Braille clock and alphabet, and play equipment for ages 2-12.", facility("Morreene-Road-Park", 46)),
      answer("restroom", "Are there restrooms at Morreene Road Park?", "Yes. Restrooms and a water fountain are listed among the park features.", facility("Morreene-Road-Park", 46)),
      answer("courts", "Does Morreene Road Park have pickleball and basketball?", "Yes. Durham lists five lighted tennis courts with pickleball lines and two lighted basketball courts. Public use can yield to programs and reservations.", "https://www.dprplaymore.org/579/Tennis-Pickleball-Court-Information"),
      answer("picnic", "Can I reserve a shelter at Morreene Road Park?", "Yes. The park has a reservable picnic shelter, tables, and a water fountain.", facility("Morreene-Road-Park", 46)),
    ],
  }),
];

const current = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const pilotIds = new Set(parks.map((park) => park.id));
const next = [...current.filter((park) => !pilotIds.has(park.id)), ...parks];
fs.writeFileSync(dataPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`Added ${parks.length} Basic-tier Durham parks; catalog now has ${next.length} records.`);
