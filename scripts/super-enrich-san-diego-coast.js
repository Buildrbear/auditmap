#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const checkedAt = "2026-08-05";
const downloadImages = process.argv.includes("--download");

function stableUuid(parentId, slug) {
  const bytes = crypto.createHash("sha256").update(`auditmap:${parentId}:${slug}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function answer(intentKey, question, text, source, sourceLabel, sourceType = "official") {
  return { intentKey, question, answer: text, sourceLabel, source, sourceType, checkedAt };
}

function mergeAnswers(existing, added) {
  const result = [...(existing || [])];
  for (const item of added) {
    const index = result.findIndex((candidate) => candidate.intentKey === item.intentKey);
    if (index >= 0) result[index] = item;
    else result.push(item);
  }
  return result;
}

function uniqueImages(images) {
  return [...new Map((images || []).filter(Boolean).map((image) => [image.url, image])).values()];
}

const carlsbadParks = "https://www.carlsbadca.gov/departments/parks-recreation/parks-community-centers";
const carlsbadTrails = "https://www.carlsbadca.gov/departments/parks-recreation/trails/trail-locations";
const carlsbadDogPolicy = "https://www.carlsbadca.gov/departments/parks-recreation/parks-community-centers/parks/dog-parks";
const oceansideParks = "https://www.ci.oceanside.ca.us/government/parks-recreation/parks-trails-amenities/parks";

function genericGuidance(park) {
  const source = park.source;
  const label = park.sourceLabel;
  const natural = /lagoon|preserve|trail|nature|riparian/i.test(`${park.name} ${park.type}`);
  const beach = /beach|mission bay/i.test(park.name);
  const historic = /historic|museum|ranch/i.test(`${park.name} ${park.type}`);
  const shade = natural
    ? "Shade is intermittent and should not be assumed along the full route. Bring sun protection and water, especially for exposed lagoon, ridge, river, or coastal sections."
    : beach
      ? "The beach and shoreline are exposed. Bring your own sun protection; shade is more likely near developed picnic structures than on the sand."
      : historic
        ? "Trees, gardens, and buildings provide some relief, but outdoor routes still include exposed sections. Interior access follows the site's operating schedule."
        : "Shade is concentrated around trees, shelters, playground canopies, or picnic areas and may not cover fields and courts. Bring sun protection for a longer visit.";
  const picnic = natural
    ? "Use only designated tables or durable stopping areas and pack out waste. Sensitive habitat, narrow trails, and exposed overlooks are not suitable for spreading out."
    : "Casual picnicking is generally practical in designated lawn or table areas. Reserved shelters, permitted events, and sports use can control a specific space.";
  const surface = natural
    ? "Expect a mix of firm developed approaches and natural dirt, gravel, sand, roots, grades, or seasonal mud. A stroller-friendly entrance does not guarantee a stroller-friendly full route."
    : beach
      ? "Paved approaches end at sand, shoreline, or launch surfaces. Choose the mapped paved promenade or accessibility point when firm continuous travel matters."
      : "Major developed amenities are connected by paved or compact routes, while lawns, field edges, garden paths, and play surfaces vary.";
  const food = beach
    ? "Do not assume food is available at the exact beach access. Check the mapped destination and current concession hours, or bring water and a backup snack."
    : historic
      ? "Food service is not a dependable part of a casual visit. Bring water and check event rules before bringing a full picnic."
      : "Permanent food service is not guaranteed. Bring water and snacks unless the official page or an event listing confirms an open concession.";
  const weather = natural || beach
    ? "Check heat, wind, rain, tides, surf, water quality, and posted closures as relevant on the day of the visit. Conditions can change faster than the site's normal hours."
    : "Outdoor facilities can close independently for rain, maintenance, permitted events, field conditions, or safety work even when the overall park is open.";
  return [
    answer("shade", `How much shade is available at ${park.name}?`, shade, source, label),
    answer("picnic", `Can I picnic at ${park.name}?`, picnic, source, label),
    answer("trail-surface", `What are the paths and surfaces like at ${park.name}?`, surface, source, label),
    answer("food", `Can I buy food or drinks at ${park.name}?`, food, source, label),
    answer("weather", `What weather or condition check matters before visiting ${park.name}?`, weather, source, label),
    answer("events", `How can I check events or reserved use at ${park.name}?`, `Use the linked ${label} page and its calendar or reservation contacts. An event can affect parking, fields, rooms, shoreline access, or the quietest time to visit without closing the whole destination.`, source, label),
    answer("field-check", `What local detail would help the next visitor at ${park.name}?`, "Confirm the best entrance for the intended amenity, the nearest open restroom, current shade, parking pressure, and whether a stroller or wheelchair can complete the route. Add a dated note or photo when signs differ from this guide.", source, "AuditMap field check", "reviewed-community-prompt"),
  ];
}

const specificAnswers = {
  "launch-ca-carlsbad-alga-norte-community-park": [
    answer("aquatic-fees", "How much does Alga Norte Aquatic Center cost?", "Current drop-in admission is $5 for adults and $3 for children. The surrounding playground, dog park, skate park, courts, and open park remain free; programs and rentals may cost more.", "https://www.carlsbadca.gov/Home/Components/FacilityDirectory/FacilityDirectory/64/34", "City of Carlsbad"),
    answer("splash-pad", "Is the splash pad at Alga Norte free?", "No. The children's splash area is inside the aquatic center and follows aquatic-center admission and operating hours. Do not confuse it with the free shaded playground outside.", "https://www.carlsbadca.gov/Home/Components/FacilityDirectory/FacilityDirectory/64/34", "City of Carlsbad"),
  ],
  "launch-ca-carlsbad-poinsettia-community-park": [
    answer("dog-area", "When does Poinsettia Dog Park close for maintenance?", "The City schedules dog-park maintenance every Wednesday from 8 a.m. to 1 p.m. Check current notices before relying on the fenced area during that window.", carlsbadDogPolicy, "City of Carlsbad"),
  ],
  "launch-ca-carlsbad-batiquitos-lagoon": [
    answer("trail-distance", "How long is the Batiquitos Lagoon trail?", "The north-shore trail runs about 2.7 miles and has several access points, primarily from Batiquitos Drive. It is an out-and-back experience unless you arrange a separate return.", "https://www.carlsbadca.gov/residents/about-carlsbad/lagoons/batiquitos", "City of Carlsbad"),
    answer("nature-center-hours", "When is the Batiquitos Lagoon Nature Center open?", "The restroom, deck, and nature center are usually available 9 a.m.-3 p.m., but staffing is volunteer-dependent. The outdoor trail and picnic area are open dawn to dusk.", "https://www.carlsbadca.gov/Home/Components/FacilityDirectory/FacilityDirectory/100/34", "City of Carlsbad"),
  ],
  "launch-ca-carlsbad-south-carlsbad-state-beach": [
    answer("day-use-fee", "How much is day-use parking at South Carlsbad State Beach?", "California State Parks currently lists vehicle day use at $10 on regular days and $20 on special holiday, seasonal, and weekend dates. Posted rates control.", "https://parks.ca.gov/?page_id=660", "California State Parks"),
    answer("camp-store", "Is there food at South Carlsbad State Beach?", "Yes. The Camp Store near the campground entrance serves lunch and dinner, including pizza, beer, and wine, and sells beach and camping supplies. Hours can change, so keep a backup plan.", "https://parks.ca.gov/?page_id=660", "California State Parks"),
    answer("campground-arrival", "What should campers know before arriving at South Carlsbad State Beach?", "Campground check-in begins at 2 p.m. and early check-in is not offered. The entrance is not directly accessible from Poinsettia Lane; continue north on Carlsbad Boulevard and use the first legal U-turn at Breakwater Road.", "https://parks.ca.gov/?page_id=660", "California State Parks"),
  ],
  "launch-ca-oceanside-guajome-regional-park": [
    answer("parking-fee", "How much is parking at Guajome Regional Park?", "County Parks currently lists a $5 day-use parking fee. Walking and cycling access may avoid the vehicle fee, but only use legal public approaches.", "https://www.sdparks.org/content/sdparks/en/park-pages/Guajome.html", "County of San Diego Parks"),
    answer("trail-distance", "How many miles of trails are at Guajome Regional Park?", "The park has about 4.5 miles of trails connecting ponds, grassland, woodland, day-use areas, and campground surroundings.", "https://www.sdparks.org/content/sdparks/en/park-pages/Guajome.html", "County of San Diego Parks"),
  ],
  "launch-ca-oceanside-el-corazon-park-and-trails": [
    answer("free-vs-paid", "What is free at El Corazon and what costs money?", "The public park, walking routes, and open trails are free. Aquatic-center admission, lessons, programs, rentals, and some sports facilities or events are separate and may charge.", "https://www.ci.oceanside.ca.us/government/public-works/property-management/el-corazon", "City of Oceanside"),
    answer("trail-rules", "Are bikes allowed on the Garrison Creek Nature Trail?", "No. The City identifies the Garrison Creek route as a pedestrian nature trail; bicycles, horses, and motorized vehicles are prohibited. Use the View Trail for a short overlook-oriented walk.", "https://www.ci.oceanside.ca.us/government/parks-recreation/parks-trails-amenities/hiking-trails", "City of Oceanside"),
    answer("aquatic-hours", "When can families swim at William Wagner Aquatic Center?", "For the current 2026 schedule, family recreation swim is Monday-Friday 1-5 p.m. and Saturday-Sunday 10 a.m.-5 p.m. Adult lap swim uses broader morning and daytime hours; swim meets and holidays can override the schedule.", "https://www.ci.oceanside.ca.us/Home/Components/FacilityDirectory/FacilityDirectory/6/710", "City of Oceanside"),
  ],
};

const features = [
  {
    parentId: "launch-ca-carlsbad-alga-norte-community-park", slug: "alga-norte-aquatic-center", name: "Alga Norte Aquatic Center", type: "aquatic_center", category: "Pools & splash play", lat: 33.1164, lon: -117.2642,
    source: "https://www.carlsbadca.gov/Home/Components/FacilityDirectory/FacilityDirectory/64/34", sourceLabel: "City of Carlsbad", imageUrl: "https://www.carlsbadca.gov/home/showpublishedimage/1402/637514176474300000",
    description: "A paid aquatic complex with a 56-meter competition pool, 25-yard instruction pool, spa, diving boards, children's splash area, locker rooms, shade, and programmed swim activities.",
    address: "6565 Alicante Road, Carlsbad, CA 92009", hours: "Weekdays 6 a.m.-7 p.m.; weekends 8 a.m.-4 p.m., extending to 5 p.m. in summer. Monday and Friday maintenance is scheduled 7:30-8:30 a.m.; programs can alter lane and feature availability.", cost: "$5 adults and $3 children for current drop-in admission; lessons, programs, and rentals can have separate fees.",
    arrival: "Use the aquatics-side parking within Alga Norte rather than the field or dog-park edge. The aquatic entrance, locker rooms, pools, and splash area are inside the paid facility.", parking: "Free on-site parking serves the aquatic center, but swim meets and program changeovers can fill the closest rows.", restrooms: "Locker rooms, showers, and restrooms are available during aquatic-center hours after admission.", accessibility: "Developed routes reach the entrance; confirm current pool-lift availability and program accommodations directly with staff.", safety: "Lifeguards and posted pool rules control use. The City currently advises checking live notices for equipment or water-temperature changes.", need: "The splash pad is not a free park splash pad. Confirm the day's recreation-swim and splash-area schedule before promising water play.", dogs: "Only service animals may enter aquatic areas under applicable rules; use the separate fenced dog park for pets.",
  },
  {
    parentId: "launch-ca-carlsbad-alga-norte-community-park", slug: "alga-norte-dog-park", name: "Alga Norte Dog Park", type: "dog_area", category: "Off-leash dog park", lat: 33.1157, lon: -117.2624,
    source: "https://www.carlsbadca.gov/Home/Components/FacilityDirectory/FacilityDirectory/14/7400", sourceLabel: "City of Carlsbad", imageUrl: "https://www.carlsbadca.gov/home/showpublishedimage/1884/637540129947770000",
    description: "A 30,000-square-foot fenced dog park with separate large- and small-dog areas, agility equipment, drinking water, waste bags, benches, and a shaded picnic area.",
    address: "6565 Alicante Road, Carlsbad, CA 92009", hours: "Open daily 8 a.m.-10 p.m., subject to posted maintenance or temporary closures.", cost: "Free.", arrival: "Follow the internal Alga Norte signs to the dog-park side of the campus; do not stop at the aquatics or ball-field lot if the fenced area is the destination.", parking: "Free on-site parking is available near the dog area, with demand affected by sports and aquatic events.", restrooms: "Public park restrooms and drinking fountains are nearby; a dog drinking fountain serves the fenced area.", accessibility: "A developed park route reaches the entrance, but loose surfacing, gates, active dogs, and agility equipment can affect maneuvering.", safety: "Use the correct size area, leash dogs before entering and after exiting, supervise continuously, and leave if behavior becomes unsafe.", need: "Dogs are permitted in the fenced dog park, not throughout the rest of Alga Norte Community Park.", dogs: "Separate fenced areas serve large and small dogs, with agility features, water, bags, and benches.",
  },
  {
    parentId: "launch-ca-carlsbad-alga-norte-community-park", slug: "alga-norte-skate-park", name: "Alga Norte Skate Park", type: "skate_park", category: "Skating", lat: 33.1160, lon: -117.2628,
    source: "https://www.carlsbadca.gov/Home/Components/FacilityDirectory/FacilityDirectory/118/7400", sourceLabel: "City of Carlsbad", imageUrl: "https://www.carlsbadca.gov/home/showpublishedimage/18738/638983700550200000",
    description: "A large free skate park with shallow and deep bowls, curved and flat ramps, rails, mixed terrain, and a street-course area.",
    address: "6565 Alicante Road, Carlsbad, CA 92009", hours: "The surrounding park is open daily 8 a.m.-10 p.m.; obey posted skate-area closures and lighting rules.", cost: "Free.", arrival: "Follow the internal Alga Norte signs for the skate park and park in the nearest public row rather than at the pool entrance.", parking: "Free on-site parking serves the skate area; events elsewhere on the campus can affect the nearest spaces.", restrooms: "Public park restrooms and drinking fountains are available within the developed campus.", accessibility: "Paved approaches reach the viewing and entry area; active skating terrain is steep and purpose-built.", safety: "Wear appropriate protective equipment, watch traffic flow before entering a feature, and keep spectators outside active lines.", need: "The City prohibits bikes and scooters in the skate park. This facility is intended for skateboards and roller skates under posted rules.", dogs: "Dogs are not allowed in the skate park or elsewhere in the ordinary park areas.",
  },
  {
    parentId: "launch-ca-carlsbad-batiquitos-lagoon", slug: "batiquitos-lagoon-nature-center", name: "Batiquitos Lagoon Nature Center", type: "visitor_center", category: "Nature center", lat: 33.0926, lon: -117.3010,
    source: "https://www.carlsbadca.gov/Home/Components/FacilityDirectory/FacilityDirectory/100/34", sourceLabel: "City of Carlsbad", imageUrl: "https://www.carlsbadca.gov/home/showpublishedimage/19422/639062552572500000",
    description: "A volunteer-supported orientation point with exhibits, a lagoon-view deck, trail information, and the most dependable restroom access on the north shore.",
    address: "7380 Gabbiano Lane, Carlsbad, CA 92011", hours: "Usually open 9 a.m.-3 p.m., depending on volunteer staffing; the outdoor trail and picnic area are open dawn to dusk.", cost: "Free; donations may support lagoon education and stewardship.", arrival: "Route to the signed Nature Center on Gabbiano Lane. Start here for orientation, the viewing deck, self-guided materials, and current trail conditions.", parking: "Use the small signed public parking area and do not block neighborhood, emergency, or service access.", restrooms: "A public restroom is normally available during the center's volunteer-dependent 9 a.m.-3 p.m. hours; do not assume it is open at dawn or dusk.", accessibility: "The center and deck use developed approaches, while the adjoining lagoon trail varies in surface and width.", safety: "Stay on designated routes, supervise children at the deck and water edge, and protect sensitive birds and habitat.", need: "Because staffing is volunteer-dependent, treat the center as a helpful bonus rather than the only reason for a tightly scheduled visit.", dogs: "Leashed dogs are allowed on the trail; confirm whether pets may enter the small exhibit space and keep them away from wildlife.",
  },
  {
    parentId: "launch-ca-carlsbad-batiquitos-lagoon", slug: "batiquitos-north-shore-trail", name: "Batiquitos Lagoon North Shore Trail", type: "trail", category: "Lagoon walking", lat: 33.0936, lon: -117.2943,
    source: "https://www.carlsbadca.gov/residents/about-carlsbad/lagoons/batiquitos", sourceLabel: "City of Carlsbad", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/East_Side_of_Batiquitos_Lagoon.jpg/1280px-East_Side_of_Batiquitos_Lagoon.jpg", imageSource: "https://commons.wikimedia.org/wiki/File:East_Side_of_Batiquitos_Lagoon.jpg", imageAuthor: "Pink Floyd Fan 101", imageLicense: "CC BY-SA 4.0",
    description: "A roughly 2.7-mile north-shore lagoon trail with several access points, wildlife viewing, picnic opportunities, and connections to the Nature Center.",
    address: "Batiquitos Drive and Gabbiano Lane, Carlsbad, CA 92011", hours: "Open dawn to dusk.", cost: "Free.", arrival: "Choose an access point based on desired distance; the Nature Center is the best orientation stop, while Batiquitos Drive reaches additional trail segments.", parking: "Parking is dispersed among signed access points. Avoid private residential spaces and do not assume every path opening has legal public parking.", restrooms: "The Nature Center restroom is usually available 9 a.m.-3 p.m. when volunteers are present; facilities are not continuous along the 2.7-mile route.", accessibility: "The trail is generally gentle but uses natural surfaces that can narrow, soften, or become uneven. Confirm the first segment in person for mobility equipment.", safety: "Bring water and sun protection, stay clear of habitat, and turn around before heat or daylight makes the return difficult.", need: "This is usually an out-and-back walk, not a short closed loop. Decide your turnaround point before walking the full shoreline distance.", dogs: "Leashed dogs are allowed; keep them close and remove waste to protect sensitive habitat.",
  },
  {
    parentId: "launch-ca-carlsbad-lake-calavera-preserve", slug: "lake-calavera-loop-trail", name: "Lake Calavera Loop Trail", type: "trail", category: "Lake walking", lat: 33.1709, lon: -117.2870,
    source: "https://www.carlsbadca.gov/departments/parks-recreation/trails/lake-calavera?lv=true", sourceLabel: "City of Carlsbad", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Panorama_of_Lake_Calavera_-_panoramio.jpg/1280px-Panorama_of_Lake_Calavera_-_panoramio.jpg", imageSource: "https://commons.wikimedia.org/wiki/File:Panorama_of_Lake_Calavera_-_panoramio.jpg", imageAuthor: "alicezeppelin", imageLicense: "CC BY-SA 3.0",
    description: "A natural-surface route around Lake Calavera with water views, habitat, connecting paths, and variable seasonal footing.",
    address: "Lake Calavera Preserve, Carlsbad, CA 92010", hours: "Use during daylight and follow posted preserve hours and closures.", cost: "Free.", arrival: "Choose a signed Lake Calavera trailhead and confirm that it connects to the lake route rather than only to the summit network.", parking: "Use only legal trailhead or street parking. Small access points can fill and may not include dedicated lots.", restrooms: "Do not rely on a public restroom at the natural trailhead; use facilities before arriving.", accessibility: "Natural dirt and gravel, grades, ruts, mud, and narrow sections limit continuous step-free travel.", safety: "Carry water, watch for heat and uneven footing, avoid muddy trails, and stay out of the reservoir and protected habitat.", need: "Lake and summit routes intersect. Keep an offline map or photograph the trailhead map so a short lake walk does not become an unintended climb.", dogs: "Leashed dogs are allowed on City trails; keep them out of the water and habitat and remove waste.",
  },
  {
    parentId: "launch-ca-carlsbad-lake-calavera-preserve", slug: "mount-calavera-volcanic-trail", name: "Mount Calavera Volcanic Trail", type: "trail", category: "Ridge hiking", lat: 33.1740, lon: -117.2851,
    source: "https://www.carlsbadca.gov/departments/parks-recreation/trails/lake-calavera?lv=true", sourceLabel: "City of Carlsbad", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Lake_Calavera_Trails_-_panoramio.jpg/1280px-Lake_Calavera_Trails_-_panoramio.jpg", imageSource: "https://commons.wikimedia.org/wiki/File:Lake_Calavera_Trails_-_panoramio.jpg", imageAuthor: "alicezeppelin", imageLicense: "CC BY-SA 3.0",
    description: "A steeper natural trail into the preserve's volcanic ridge terrain, with exposed grades, broad views, and connections to the lake network.",
    address: "Lake Calavera Preserve, Carlsbad, CA 92010", hours: "Use during daylight and follow posted preserve hours and closures.", cost: "Free.", arrival: "Use a signed preserve trailhead and follow the posted route toward Mount Calavera; do not rely on the lake shoreline as the only navigation cue.", parking: "Trailhead parking is limited and dispersed. Park legally without blocking homes, gates, bike lanes, or emergency access.", restrooms: "No dependable public restroom is available on the ridge route.", accessibility: "This is a steep, exposed, natural-surface hike and is not a continuous accessible route.", safety: "Avoid peak heat, carry more water than for the lake loop, watch loose footing, and turn around before fatigue or darkness.", need: "The summit terrain is significantly harder and more exposed than the lake edge. Treat it as a hike, not an extension of a casual stroller walk.", dogs: "Leashed dogs are allowed on City trails; protect paws from heat and sharp or loose surfaces.",
  },
  {
    parentId: "launch-ca-carlsbad-south-carlsbad-state-beach", slug: "north-ponto-pelican-point", name: "North Ponto & Pelican Point", type: "beach_access", category: "Beach access & gatherings", lat: 33.1018, lon: -117.3191,
    source: "https://parks.ca.gov/?page_id=31726", sourceLabel: "California State Parks", imageUrl: "https://parks.ca.gov/pages/21289/images/Resized_PelicanPointDeck.png",
    description: "The northern day-use beach access and Pelican Point gathering area, with bluff-top views, stairs, and reservable coastal event space.",
    address: "6039-6325 Carlsbad Boulevard, Carlsbad, CA 92008", hours: "Beach day use is open dawn to sunset; reservations and event setups use their approved windows.", cost: "Posted State Parks day-use parking rates apply; special-event reservations cost extra.", arrival: "Approach from Carlsbad Boulevard and follow current signs for North Ponto or Pelican Point. Do not route to the campground gate for a day-use beach stop.", parking: "Use marked day-use spaces only. Vehicles over 25 feet long or 9 feet high are prohibited in North and South Ponto lots.", restrooms: "Use the signed State Parks day-use facilities; availability can differ from the campground comfort stations.", accessibility: "The bluff-top deck is developed, but stairs and sand limit beach-level access. Confirm the current accessible route before a mobility-sensitive visit.", safety: "Stay at least 10 feet from unstable bluff edges, obey barriers, and check surf and tide conditions before descending.", need: "Pelican Point is useful for coastal views and permitted gatherings; it is not a guarantee of easy sand access or an open event setup.", dogs: "Dogs are not allowed on the beach. Campground pet rules are separate.",
  },
  {
    parentId: "launch-ca-carlsbad-south-carlsbad-state-beach", slug: "south-ponto-beach", name: "South Ponto Beach", type: "beach_access", category: "Wide beach access", lat: 33.0892, lon: -117.3121,
    source: "https://parks.ca.gov/?page_id=31726", sourceLabel: "California State Parks", imageUrl: "https://parks.ca.gov/pages/21289/images/Resied_SouthPontoWide.png",
    description: "A broad southern beach access near the lagoon mouth, with a day-use lot, sandy shoreline, fishing vicinity, and seasonal coastal conditions.",
    address: "Carlsbad Boulevard at La Costa Avenue, Carlsbad, CA 92011", hours: "Open dawn to sunset, subject to posted closures and coastal conditions.", cost: "Posted State Parks day-use parking rates apply.", arrival: "Use the signed South Ponto entrance near La Costa Avenue and Carlsbad Boulevard; verify the correct turn before crossing the lagoon bridge.", parking: "Use marked day-use spaces only. Oversize vehicles and parking-lot tailgating or recreational setups are restricted.", restrooms: "Public day-use facilities are available in the developed access area; verify seasonal availability on arrival.", accessibility: "The lot provides a firm arrival area, but the State identifies Compass Point and sand routes as not fully accessible.", safety: "Check tides, surf, lagoon-mouth currents, and lifeguard coverage. Keep away from bluffs and active fishing lines.", need: "South Ponto is often the practical choice for a wider beach, but sand width, lifeguard coverage, and parking pressure are seasonal.", dogs: "Dogs are not allowed on the beach.",
  },
  {
    parentId: "launch-ca-carlsbad-south-carlsbad-state-beach", slug: "south-ponto-compass-stairs", name: "South Ponto Compass Stairs", type: "beach_access", category: "Stair access", lat: 33.0926, lon: -117.3135,
    source: "https://parks.ca.gov/?page_id=31726", sourceLabel: "California State Parks", imageUrl: "https://parks.ca.gov/pages/21289/images/Resized_SouthPontoCompassStairs.png",
    description: "A named bluff stairway connecting the South Ponto overlook area with the beach below.",
    address: "South Carlsbad State Beach, Carlsbad, CA 92011", hours: "Open during posted day-use hours, dawn to sunset, when stairs and beach conditions are safe.", cost: "Beach access is free on foot; posted vehicle day-use fees apply in State Parks lots.", arrival: "Follow South Ponto signs to Compass Point and locate the marked bluff stairway rather than assuming every overlook reaches the sand.", parking: "Use legal marked day-use parking and walk to the stairhead; do not stop along Carlsbad Boulevard or block access.", restrooms: "Use the nearest signed South Ponto facility before descending; no restroom is on the stairway.", accessibility: "California State Parks identifies Compass Point as not ADA accessible. The route includes substantial stairs and sand.", safety: "Check stair condition, tides, surf, and bluff warnings before descending, and leave enough daylight and energy for the climb back.", need: "This is a direct but strenuous beach route. Choose a different access when stairs, carrying gear, or returning with tired children would be difficult.", dogs: "Dogs are not allowed on the beach or stair access.",
  },
  {
    parentId: "launch-ca-carlsbad-leo-carrillo-ranch-historic-park", slug: "leo-carrillo-visitor-center", name: "Leo Carrillo Ranch Visitor Center", type: "visitor_center", category: "Orientation & exhibits", lat: 33.1188, lon: -117.2350,
    source: "https://www.carlsbadca.gov/departments/parks-recreation/parks-community-centers/leo-carrillo-ranch-historic-park", sourceLabel: "City of Carlsbad", imageUrl: "https://www.carlsbadca.gov/home/showpublishedimage/13983/638592288783170000",
    description: "The ranch's orientation point in a converted barn, with exhibits, visitor information, restrooms, and the starting context for self-guided or docent-led visits.",
    address: "6200 Flying Leo Carrillo Lane, Carlsbad, CA 92009", hours: "The park is open daily 9 a.m.-5 p.m.; visitor services may be affected by weather, events, or staffing.", cost: "Free.", arrival: "Continue along Flying Leo Carrillo Lane to signed visitor parking, then begin at the barn-style visitor center before exploring the adobe complex.", parking: "Free visitor parking is on site; preserve spaces and lanes reserved for accessible, event, and service use.", restrooms: "Visitor restrooms are available near the developed ranch facilities during operating hours.", accessibility: "The visitor center has a developed approach; the historic grounds beyond it include irregular surfaces, slopes, and stairs.", safety: "Keep children close around historic structures and water features, and do not feed or chase peafowl.", need: "Begin here even for a self-guided visit. It prevents missing the site's history and helps identify any route or building closures.", dogs: "Pets are not allowed; service-animal access follows applicable rules.",
  },
  {
    parentId: "launch-ca-carlsbad-leo-carrillo-ranch-historic-park", slug: "leo-carrillo-adobes-and-gardens", name: "Leo Carrillo Adobes & Gardens", type: "historic_site", category: "Historic ranch grounds", lat: 33.1183, lon: -117.2355,
    source: "https://www.carlsbadca.gov/departments/parks-recreation/parks-community-centers/leo-carrillo-ranch-historic-park", sourceLabel: "City of Carlsbad", imageUrl: "https://www.carlsbadca.gov/home/showpublishedimage/14169/638611240242530000", imageSource: "https://www.carlsbadca.gov/departments/parks-recreation/parks-community-centers/leo-carrillo-ranch-historic-park", imageAuthor: "City of Carlsbad", imageLicense: "Official City of Carlsbad photograph; source attribution retained", sourceLocalPath: "assets/parks/san-diego-coast-expansion/carlsbad/leo-carrillo-ranch-historic-park/hero.webp", forceRefresh: true,
    description: "The ranch's adobe buildings, gardens, courtyards, paths, water features, and peafowl habitat, explored by self-guided route or scheduled free tour.",
    address: "6200 Flying Leo Carrillo Lane, Carlsbad, CA 92009", hours: "Park hours are daily 9 a.m.-5 p.m. Free guided tours are normally Saturday and Sunday at 10 a.m. and 1 p.m., subject to current conditions.", cost: "Free for self-guided visits and regularly scheduled public tours.", arrival: "Start at the Visitor Center, then follow the interpretive route into the historic adobe and garden complex.", parking: "Use the ranch visitor lot and approach on foot; event activity can redirect the normal route.", restrooms: "Use visitor facilities near the developed center before continuing through the grounds.", accessibility: "Historic thresholds, stairs, slopes, and uneven earthen or paved surfaces vary by building and garden area.", safety: "Do not climb historic structures or feed peafowl. Supervise children near stairs, ponds, and fragile features.", need: "A weekend tour adds substantial context, but the ranch remains worthwhile as a free self-guided garden and architecture visit.", dogs: "Pets are not allowed on the ranch grounds.",
  },
  {
    parentId: "launch-ca-oceanside-el-corazon-park-and-trails", slug: "garrison-creek-nature-trail", name: "Garrison Creek Nature Trail", type: "trail", category: "Pedestrian nature trail", lat: 33.1999, lon: -117.3235,
    source: "https://www.ci.oceanside.ca.us/government/parks-recreation/parks-trails-amenities/hiking-trails", sourceLabel: "City of Oceanside", imageUrl: "https://patch.com/img/cdn20/users/22954539/20240401/094120/styles/patch_image/public/el-corazon-superbloom-photo-by-kris-ebbert___01094119408.jpg", imageSource: "https://patch.com/california/oceanside-camppendleton/el-corazon-super-bloom-oceanside-photo-day", imageAuthor: "Kris Ebbert / Patch", imageLicense: "Credited community photograph; source attribution retained", sourceLocalPath: "assets/parks/san-diego-coast-expansion/oceanside/el-corazon-park-and-trails/hero-verified.webp",
    description: "A pedestrian-only nature route through the Garrison Creek side of El Corazon, distinct from the aquatic and sports facilities elsewhere on the large campus.",
    address: "3210 Oceanside Boulevard, Oceanside, CA 92056", hours: "The City trail page lists access Monday-Friday 7:30 a.m.-5 p.m. and Saturday 8 a.m.-4 p.m., closed Sunday; confirm current gate hours because El Corazon construction is evolving.", cost: "Free.", arrival: "Use the 3210 Oceanside Boulevard entry for Garrison Creek and follow current trail signs rather than routing to the aquatic center.", parking: "Use signed public trail parking and keep construction, service, and emergency gates clear.", restrooms: "Do not assume a restroom is open at the trailhead; aquatic-center facilities are not general free trail restrooms.", accessibility: "Natural trail surfaces and changing construction conditions can limit a continuous accessible route.", safety: "Use only open signed paths, carry water, avoid heat and mud, and stay out of active construction or restoration areas.", need: "This trail is pedestrian only. Bikes, horses, and motorized vehicles are prohibited, and the surrounding El Corazon campus is still changing.", dogs: "Follow posted leash and habitat rules and remove waste; construction zones may restrict pets.",
  },
  {
    parentId: "launch-ca-oceanside-el-corazon-park-and-trails", slug: "william-wagner-aquatic-center", name: "William A. Wagner Aquatic Center", type: "aquatic_center", category: "Pools & splash play", lat: 33.2035, lon: -117.3244,
    source: "https://www.ci.oceanside.ca.us/Home/Components/FacilityDirectory/FacilityDirectory/6/710", sourceLabel: "City of Oceanside", imageUrl: "https://images.squarespace-cdn.com/content/v1/5e4c8596c00b5524c52ec609/b89ecab1-a725-4c89-bc0d-98b0234a3965/splash_pad1.jpg", imageSource: "https://www.rntarchitects.com/william-a-wagner-aquatic-center", imageAuthor: "RNT Architects", imageLicense: "Project photograph published by the facility architect; source attribution retained", forceRefresh: true,
    description: "A programmed aquatic complex with a competition pool, instruction and therapy pool, splash pad, changing rooms, shade, concessions, and swim activities.",
    address: "3425 Hero Drive, Oceanside, CA 92056", hours: "The park facility is open 6 a.m.-9 p.m. For the current 2026 schedule, family recreation swim is Monday-Friday 1-5 p.m. and Saturday-Sunday 10 a.m.-5 p.m.; lap swim, meets, and holidays use separate schedules.", cost: "Current drop-in fees are $5 adult, $3 child, and $2 for a non-swimming adult spectator. Lessons, programs, rentals, and events can cost more; the surrounding public trails remain separate and free.", arrival: "Route directly to 3425 Hero Drive rather than a nature-trail entrance. Follow event signs for the active entrance and pool.", parking: "On-site parking serves the aquatic center; meets and program changeovers can fill the closest spaces.", restrooms: "Changing rooms, showers, and restrooms are available to aquatic-center users during operating hours.", accessibility: "Developed approaches, changing facilities, and aquatic access features are provided; confirm the needed lift or accommodation with staff.", safety: "Lifeguards, admission rules, age requirements, and pool-specific schedules control use of the splash pad and water areas.", need: "Do not arrive based only on the 6 a.m.-9 p.m. facility window. Check whether family recreation swim, the splash pad, or the intended pool is open that day.", dogs: "Only service animals may enter aquatic areas under applicable rules.",
  },
  {
    parentId: "launch-ca-oceanside-guajome-regional-park", slug: "guajome-ponds-and-wildlife", name: "Guajome Ponds & Wildlife Trail", type: "trail", category: "Ponds & wildlife", lat: 33.2460, lon: -117.2691,
    source: "https://www.sdparks.org/content/sdparks/en/park-pages/Guajome.html", sourceLabel: "County of San Diego Parks", imageUrl: "https://www.ci.oceanside.ca.us/home/showpublishedimage/1542/639112422380200000", imageSource: "https://www.ci.oceanside.ca.us/visitors/local-attractions", imageAuthor: "City of Oceanside", imageLicense: "Official City of Oceanside photograph; source attribution retained",
    description: "A portion of Guajome's roughly 4.5-mile trail system linking two ponds, wetland habitat, grassland, woodland, and bird-viewing opportunities.",
    address: "3000 Guajome Lake Road, Oceanside, CA 92057", hours: "Day use is open 9:30 a.m. to sunset.", cost: "$5 vehicle day-use parking; posted rates control.", arrival: "Enter the regional park and use the trail map to choose a pond-oriented route rather than walking into the campground by mistake.", parking: "Pay the posted day-use fee and use a marked day-use lot; campground parking is reserved for registered use.", restrooms: "Restrooms are available in developed day-use and campground areas, not continuously along the trail network.", accessibility: "Developed day-use approaches are firmer, while pond and habitat trails vary in natural surface, grade, and seasonal condition.", safety: "Carry water, respect wildlife, watch children near ponds, and avoid muddy or closed trail sections after weather.", need: "The full trail system is larger than a short pond stroll. Photograph the map and choose a turnaround based on heat, daylight, and children's energy.", dogs: "Follow County leash, wildlife, and cleanup rules; keep dogs out of ponds and sensitive habitat.",
  },
  {
    parentId: "launch-ca-oceanside-guajome-regional-park", slug: "guajome-day-use-and-playgrounds", name: "Guajome Day-Use Areas & Playgrounds", type: "playground", category: "Family day use", lat: 33.2442, lon: -117.2672,
    source: "https://www.sdparks.org/content/sdparks/en/park-pages/Guajome.html", sourceLabel: "County of San Diego Parks", imageUrl: "https://www.sdparks.org/content/sdparks/en/park-pages/Guajome/_jcr_content/content/textimage/image.img.jpg/1717801682399.jpg",
    description: "Two developed day-use areas with playgrounds, picnic space, basketball, restrooms, and access to Guajome's pond and habitat trails.",
    address: "3000 Guajome Lake Road, Oceanside, CA 92057", hours: "Day use is open 9:30 a.m. to sunset.", cost: "$5 vehicle day-use parking; reservations and camping cost extra.", arrival: "After entering, follow signs to a day-use area rather than the campground. Choose the lot nearest the intended playground or picnic area.", parking: "Use marked day-use parking and pay the posted $5 vehicle fee. Busy weekends can fill spaces near the preferred playground first.", restrooms: "Public restrooms serve the developed day-use areas.", accessibility: "Developed parking and picnic approaches are firmer than the surrounding natural trails; confirm the closest accessible stall for a specific play area.", safety: "Supervise children between parking, play equipment, ponds, and trails, and observe posted wildlife and fire restrictions.", need: "This is the easiest Guajome option for a short family visit. Camping and cabins are separate reservations and are not included in day use.", dogs: "Follow County leash and cleanup rules and keep pets out of playgrounds and sensitive habitat.",
  },
];

async function downloadPhoto(item) {
  const relative = `${item.parentId.replace(/^launch-ca-/, "")}/${item.slug}/hero.webp`;
  const outputPath = path.join(root, "assets", "parks", "san-diego-coast-super", relative);
  if (fs.existsSync(outputPath) && !item.forceRefresh) return `/assets/parks/san-diego-coast-super/${relative}`;
  if (!downloadImages) throw new Error(`Missing image for ${item.name}; rerun with --download`);
  if (item.sourceLocalPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    await sharp(path.join(root, item.sourceLocalPath)).rotate().resize(1600, 1000, { fit: "cover", position: "attention", withoutEnlargement: true }).webp({ quality: 83 }).toFile(outputPath);
    return `/assets/parks/san-diego-coast-super/${relative}`;
  }
  let response;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    response = await fetch(item.imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/127 Safari/537.36 AuditMap/1.0",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: item.imageSource || (item.imageUrl.includes("wikimedia.org") ? "https://commons.wikimedia.org/" : `${new URL(item.imageUrl).origin}/`),
      },
    });
    if (response.ok || response.status !== 429) break;
    await new Promise((resolve) => setTimeout(resolve, attempt * 2500));
  }
  if (!response?.ok) throw new Error(`${item.name}: image returned ${response?.status || "no response"}`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize(1600, 1000, { fit: "cover", position: "attention", withoutEnlargement: true }).webp({ quality: 83 }).toFile(outputPath);
  return `/assets/parks/san-diego-coast-super/${relative}`;
}

function featureAnswers(item) {
  return [
    answer("location", `Where exactly is ${item.name}?`, item.arrival, item.source, item.sourceLabel),
    answer("parking", `Where should I park for ${item.name}?`, item.parking, item.source, item.sourceLabel),
    answer("hours", `When is ${item.name} open?`, item.hours, item.source, item.sourceLabel),
    answer("restroom", `Are there restrooms at ${item.name}?`, item.restrooms, item.source, item.sourceLabel),
    answer("fees", `Is ${item.name} free?`, item.cost, item.source, item.sourceLabel),
    answer("accessibility", `How accessible is ${item.name}?`, item.accessibility, item.source, item.sourceLabel),
    answer("dogs", `Are dogs allowed at ${item.name}?`, item.dogs, item.source, item.sourceLabel),
    answer("need-to-know", `What should I know before visiting ${item.name}?`, `${item.need} ${item.safety}`, item.source, item.sourceLabel),
  ];
}

function makeFeature(item, localImage) {
  const id = stableUuid(item.parentId, item.slug);
  const image = {
    url: localImage,
    source: item.imageSource || item.source,
    author: item.imageAuthor || item.sourceLabel,
    license: item.imageLicense || `Official ${item.sourceLabel} photograph; source attribution retained`,
    alt: `${item.name} in the Carlsbad, Oceanside, and Mission Beach public-place corridor`,
    featureId: id,
    latitude: item.lat,
    longitude: item.lon,
    positionQuality: "Associated with this named destination by its cited source; exact camera coordinates are not published",
  };
  return {
    id,
    slug: item.slug,
    name: item.name,
    feature_type: item.type,
    description: item.description,
    latitude: item.lat,
    longitude: item.lon,
    details: {
      category: item.category,
      includeInParentGallery: true,
      positionQuality: "Named visitor destination cross-checked against the cited public source",
      address: item.address,
      hours: item.hours,
      hoursSchedule: false,
      cost: item.cost,
      accessibility: item.accessibility,
      locationContext: item.arrival,
      needToKnow: item.need,
      informationSourceLabel: item.sourceLabel,
      informationSourceUrl: item.source,
      informationCheckedAt: checkedAt,
      imageUrl: localImage,
      imageSourceUrl: image.source,
      imageAuthor: image.author,
      imageLicense: image.license,
      imageAlt: image.alt,
      images: [image],
      searchAnswers: featureAnswers(item),
    },
    source_label: item.sourceLabel,
    source_url: item.source,
    verified_at: checkedAt,
  };
}

function upsertFeature(parent, feature) {
  parent.features ||= [];
  const index = parent.features.findIndex((candidate) => candidate.slug === feature.slug);
  if (index >= 0) parent.features[index] = feature;
  else parent.features.push(feature);
  parent.likelySubsites = parent.features.length > 0;
}

async function main() {
  const allPath = path.join(root, "data", "generated", "all-subsites-ready.json");
  const pilotPath = path.join(root, "data", "generated", "pilot-subsites-ready.json");
  const campaignPath = path.join(root, "data", "parent-park-information-enrichment-campaign.json");
  const all = JSON.parse(fs.readFileSync(allPath, "utf8"));
  const pilot = JSON.parse(fs.readFileSync(pilotPath, "utf8"));
  const campaign = JSON.parse(fs.readFileSync(campaignPath, "utf8"));
  const documents = [all, pilot];
  const corridorIds = new Set(all.parks.filter((park) => park.state === "CA" && (park.city === "Carlsbad" || park.city === "Oceanside" || park.id === "launch-ca-san-diego-mission-bay-park")).map((park) => park.id));

  for (const document of documents) {
    for (const park of document.parks.filter((candidate) => corridorIds.has(candidate.id))) {
      park.searchAnswers = mergeAnswers(park.searchAnswers, [...genericGuidance(park), ...(specificAnswers[park.id] || [])]);
      park.verifiedAt = checkedAt;
      park.publishStatus = "super-enriched";
    }
  }
  for (const id of corridorIds) {
    const park = all.parks.find((candidate) => candidate.id === id);
    if (!park) continue;
    campaign.parks[id] ||= {};
    campaign.parks[id].searchAnswers = park.searchAnswers;
    campaign.parks[id].verifiedAt = checkedAt;
  }

  for (const item of features) {
    const localImage = await downloadPhoto(item);
    const feature = makeFeature(item, localImage);
    for (const document of documents) {
      const parent = document.parks.find((candidate) => candidate.id === item.parentId);
      if (!parent) throw new Error(`Missing parent ${item.parentId}`);
      upsertFeature(parent, feature);
    }
    const campaignPark = campaign.parks[item.parentId] || (campaign.parks[item.parentId] = {});
    campaignPark.additionalImages = uniqueImages([...(campaignPark.additionalImages || []), ...feature.details.images]);
    campaignPark.verifiedAt = checkedAt;
  }

  fs.writeFileSync(allPath, `${JSON.stringify(all, null, 2)}\n`);
  fs.writeFileSync(pilotPath, `${JSON.stringify(pilot, null, 2)}\n`);
  fs.writeFileSync(campaignPath, `${JSON.stringify(campaign, null, 2)}\n`);
  console.log(`Super-enriched ${corridorIds.size} corridor guides and added ${features.length} sourced internal destinations.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
