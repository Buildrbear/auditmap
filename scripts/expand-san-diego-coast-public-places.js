#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const checkedAt = "2026-08-05";
const downloadImages = process.argv.includes("--download");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function stableUuid(parentId, slug) {
  const bytes = crypto.createHash("sha256").update(`auditmap:${parentId}:${slug}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function answer(place, intentKey, question, text, source = place.source, sourceLabel = place.sourceLabel) {
  return { intentKey, question, answer: text, sourceLabel, source, sourceType: "official", checkedAt };
}

function parkAnswers(place) {
  return [
    answer(place, "entrance", `Where is the best entrance for ${place.name}?`, place.arrival),
    answer(place, "hours", `What hours is ${place.name} open?`, place.hours),
    answer(place, "parking", `Where should I park for ${place.name}?`, place.parking),
    answer(place, "restroom", `Are there restrooms at ${place.name}?`, place.restrooms),
    answer(place, "fees", `Is ${place.name} free?`, place.cost),
    answer(place, "playground", `Is ${place.name} good for children?`, place.family),
    answer(place, "accessibility", `What accessibility details should I know at ${place.name}?`, place.accessibility),
    answer(place, "dogs", `Are dogs allowed at ${place.name}?`, place.dogs),
    answer(place, "amenities", `What amenities are at ${place.name}?`, place.amenities),
    answer(place, "need-to-know", `What should I know before visiting ${place.name}?`, place.need),
    answer(place, "closures", `How do I check closures or facility changes at ${place.name}?`, `Check the linked ${place.sourceLabel} page and posted notices before a time-sensitive visit. Fields, trails, water access, restrooms, and reservable spaces can close independently.`),
  ];
}

const carlsbadParksSource = "https://www.carlsbadca.gov/departments/parks-recreation/parks-community-centers";
const carlsbadTrailsSource = "https://www.carlsbadca.gov/departments/parks-recreation/trails/trail-locations";
const oceansideParksSource = "https://www.ci.oceanside.ca.us/government/parks-recreation/parks-trails-amenities/parks";

const places = [
  {
    name: "Alga Norte Community Park", city: "Carlsbad", type: "Community park", lat: 33.1161201, lon: -117.2633913,
    address: "6565 Alicante Road, Carlsbad, CA 92009", sourceLabel: "City of Carlsbad",
    source: "https://www.carlsbadca.gov/Home/Components/FacilityDirectory/FacilityDirectory/10/7400",
    imageUrl: "https://www.carlsbadca.gov/home/showpublishedimage/1894/637540166066070000", imageSource: carlsbadParksSource,
    imageAuthor: "City of Carlsbad", imageLicense: "Official City of Carlsbad photograph; source attribution retained",
    summary: "A 32-acre recreation hub with a large playground, aquatic center, skate park, separate dog areas, ball fields, basketball, picnic space, and barbecues.",
    hours: "The park is open daily 8 a.m.-10 p.m. The aquatic center, skate park, fields, and programmed facilities can use separate schedules.",
    cost: "General park, playground, skate park, dog park, court, and open-space access is free. Aquatic programs, rentals, reservations, and some events may charge.",
    arrival: "Enter from Alicante Road near Poinsettia Lane. Pick the internal parking area closest to the aquatics, skate, dog, field, or playground destination instead of stopping at the first lot.",
    parking: "Multiple on-site lots serve the large park. Tournament, swim-meet, and weekend demand can concentrate around different facilities, so follow internal signs.",
    restrooms: "Public restrooms and drinking fountains serve the park; aquatic-center locker rooms follow facility admission and operating rules.",
    family: "Yes. The large playground and picnic areas are free; the children's splash area is part of the aquatic center and can have admission and operating-hour requirements.",
    accessibility: "Developed paths connect parking with major facilities, and the City lists accessibility throughout its community-park system. Confirm pool lifts or program accommodations directly with the aquatic center.",
    dogs: "Dogs may use the designated fenced dog park, with separate small- and large-dog areas. Dogs are not allowed elsewhere in the park; keep them leashed while entering and leaving the fenced area.",
    amenities: "Playground, aquatics, splash area, skate park, dog park, ball fields, basketball courts, picnic tables, barbecues, restrooms, drinking fountains, and parking.",
    need: "This is several destinations in one campus. Confirm the aquatics schedule before promising water play, and check field or event calendars when parking capacity matters.",
  },
  {
    name: "Aviara Community Park", city: "Carlsbad", type: "Community park", lat: 33.1107959, lon: -117.2813302,
    address: "6435 Ambrosia Lane, Carlsbad, CA 92011", sourceLabel: "City of Carlsbad",
    source: "https://www.carlsbadca.gov/Home/Components/FacilityDirectory/FacilityDirectory/25/7417",
    imageUrl: "https://www.carlsbadca.gov/home/showpublishedimage/1896/637540166075430000", imageSource: carlsbadParksSource,
    imageAuthor: "City of Carlsbad", imageLicense: "Official City of Carlsbad photograph; source attribution retained",
    summary: "A broad neighborhood and sports park with athletic fields, basketball, a playground, picnic areas, barbecues, restrooms, and an outdoor gathering area.",
    hours: "The park is open daily 8 a.m.-10 p.m. Permitted fields and reserved gathering areas can use separate schedules.",
    cost: "General park, playground, court, and open-lawn access is free. Reservations, organized sports, and permitted events may charge.",
    arrival: "Use the Ambrosia Lane entrance and choose parking for the playground and picnic area or the athletic fields; the campus is larger than a single play stop.",
    parking: "On-site parking is available. Sports practices and weekend games can fill the field-side spaces first.",
    restrooms: "Public restrooms and drinking water are listed among the park facilities.",
    family: "Yes. The playground, picnic space, fields, and open lawn make this a practical family park even when no programmed activity is underway.",
    accessibility: "Developed walks connect the parking, play, court, picnic, and field areas. Confirm a particular field-side route if step-free access is essential.",
    dogs: "Dogs are not allowed in this City park. Use a designated Carlsbad dog park for off-leash access; leashed dogs are allowed on City trails, not in ordinary City parks.",
    amenities: "Athletic field, basketball, playground, picnic areas, barbecues, outdoor fireplace, restrooms, drinking water, and parking.",
    need: "Fields and gathering areas can be reserved. A free casual visit remains possible, but organized use may control a specific field or picnic area.",
  },
  {
    name: "Calavera Hills Community Park", city: "Carlsbad", type: "Community park", lat: 33.1676512, lon: -117.298572,
    address: "2997 Glasgow Drive, Carlsbad, CA 92010", sourceLabel: "City of Carlsbad",
    source: "https://www.carlsbadca.gov/Home/Components/FacilityDirectory/FacilityDirectory/16/7417",
    imageUrl: "https://www.carlsbadca.gov/home/showpublishedimage/1900/637540166090270000", imageSource: carlsbadParksSource,
    imageAuthor: "City of Carlsbad", imageLicense: "Official City of Carlsbad photograph; source attribution retained",
    summary: "A 21-acre community park with playgrounds, sports fields, basketball and tennis, a community garden, loop walk, shaded picnic areas, outdoor fitness, public art, and a recreation center.",
    hours: "The outdoor park is open daily 8 a.m.-10 p.m. Recreation-center programs, gym access, fields, courts, and snack service can use separate schedules.",
    cost: "General outdoor park, playground, walk, and open-court access is free when not reserved. Programs, rentals, and organized activities may charge.",
    arrival: "Enter from Glasgow Drive. The playground, recreation center, garden, courts, and fields occupy distinct parts of the site, so follow internal signs to the intended amenity.",
    parking: "On-site parking serves the recreation center and park. Games and programs can create short peaks around start and finish times.",
    restrooms: "Public restrooms and drinking facilities serve the park and community center; indoor availability follows building hours.",
    family: "Yes. The park includes play equipment and a sand play area, open lawn, a loop walk, shaded picnic space, and nearby sports facilities.",
    accessibility: "Paved campus routes connect major developed amenities. The nearby Lake Calavera trail system is a separate natural-surface destination with different access conditions.",
    dogs: "Dogs are not allowed in this City park. Use a designated Carlsbad dog park for off-leash access; leashed dogs are allowed on City trails, not in ordinary City parks.",
    amenities: "Playgrounds, sand play, fields, basketball, tennis, community garden, picnic shelters, outdoor fitness, loop walk, public art, restrooms, snack bar, and recreation center.",
    need: "Do not confuse this developed community park with Lake Calavera Preserve. Use this listing for playgrounds, courts, fields, restrooms, and easier developed paths.",
  },
  {
    name: "Poinsettia Community Park", city: "Carlsbad", type: "Community park", lat: 33.1150496, lon: -117.3060027,
    address: "6600 Hidden Valley Road, Carlsbad, CA 92011", sourceLabel: "City of Carlsbad",
    source: "https://www.carlsbadca.gov/Home/Components/FacilityDirectory/FacilityDirectory/43/7417",
    imageUrl: "https://www.carlsbadca.gov/home/showpublishedimage/1920/637540166181070000", imageSource: carlsbadParksSource,
    imageAuthor: "City of Carlsbad", imageLicense: "Official City of Carlsbad photograph; source attribution retained",
    summary: "A large sports and family park with fields, basketball, playground and picnic areas, plus a fenced dog park with agility features and dog drinking water.",
    hours: "The park is open daily 8 a.m.-10 p.m. Fields, courts, dog areas, and reserved facilities may have posted restrictions.",
    cost: "General park, playground, dog park, and open recreation access is free. Reservations and organized sports may charge.",
    arrival: "Use Hidden Valley Road and follow internal signs to the dog park, playground, picnic area, or athletic fields; they are not all reached most directly from one stall.",
    parking: "On-site lots serve the park. Sports schedules and dog-park peaks can change which lot is most convenient.",
    restrooms: "Public restrooms and drinking facilities serve the developed park areas.",
    family: "Yes. Play equipment, open space, picnic areas, fields, and courts support a flexible family visit.",
    accessibility: "Developed paths connect the major park amenities. Confirm the closest accessible stall for the dog park or a specific field before a mobility-sensitive visit.",
    dogs: "A fenced dog park includes agility features and dog drinking water. Dogs are not allowed elsewhere in the park; keep them leashed while entering and leaving the fenced area.",
    amenities: "Athletic fields, basketball, playground, picnic areas, barbecues, fenced dog park, dog agility, dog drinking fountain, restrooms, and parking.",
    need: "This is a better Carlsbad choice when a dog area and family recreation need to be combined. Check field use before relying on open sports space.",
  },
  {
    name: "Pine Avenue Community Park", city: "Carlsbad", type: "Community park", lat: 33.1595516, lon: -117.3427583,
    address: "3209 Harding Street, Carlsbad, CA 92008", sourceLabel: "City of Carlsbad",
    source: "https://www.carlsbadca.gov/Home/Components/FacilityDirectory/FacilityDirectory/23/7417",
    imageUrl: "https://www.carlsbadca.gov/home/showpublishedimage/1928/637540731917030000", imageSource: carlsbadParksSource,
    imageAuthor: "City of Carlsbad", imageLicense: "Official City of Carlsbad photograph; source attribution retained",
    summary: "A central Carlsbad park and community campus with a playground, skate park, fields, basketball, garden, picnic space, and community gathering plaza near the Village.",
    hours: "The park is open daily 8 a.m.-10 p.m. The community center, skate park, garden, and programmed facilities can use separate schedules.",
    cost: "General outdoor park, playground, skate, court, garden-viewing, and lawn access is free. Programs, rentals, and reservations may charge.",
    arrival: "Use Harding Street for the park and community-center campus. This is a separate destination from Pine Avenue's beach access west of the railroad.",
    parking: "On-site and nearby legal public parking serve the park. Village events and recreation programs can increase demand.",
    restrooms: "Restroom access is associated with the developed park and community center; indoor hours can differ from outdoor park hours.",
    family: "Yes. The playground, skate park, fields, basketball, garden, and gathering spaces offer choices for different ages.",
    accessibility: "The central developed campus uses paved routes between major facilities. Confirm building accommodations with the community center for a specific program.",
    dogs: "Dogs are not allowed in this City park. Use a designated Carlsbad dog park for off-leash access; leashed dogs are allowed on City trails, not in ordinary City parks.",
    amenities: "Playground, skate park, athletic field, basketball, community garden, gathering plaza, picnic space, community center, restrooms, and parking.",
    need: "Navigation searches can confuse the park with Pine Avenue Beach Access. Use Harding Street for playgrounds and skating; use Carlsbad Boulevard for the beach.",
  },
  {
    name: "Stagecoach Community Park", city: "Carlsbad", type: "Community park", lat: 33.0748469, lon: -117.2327621,
    address: "3420 Camino de los Coches, Carlsbad, CA 92009", sourceLabel: "City of Carlsbad",
    source: "https://www.carlsbadca.gov/Home/Components/FacilityDirectory/FacilityDirectory/21/7417",
    imageUrl: "https://www.carlsbadca.gov/home/showpublishedimage/19426/639062552583600000", imageSource: carlsbadParksSource,
    imageAuthor: "City of Carlsbad", imageLicense: "Official City of Carlsbad photograph; source attribution retained",
    summary: "A southeastern Carlsbad community park with sports fields, basketball, playground and picnic areas, community garden, gym, and recreation programs.",
    hours: "The outdoor park is open daily 8 a.m.-10 p.m. The center, gym, programs, fields, and reserved spaces can use separate schedules.",
    cost: "General outdoor park and playground access is free. Classes, gym programs, rentals, and organized sports may charge.",
    arrival: "Enter from Camino de los Coches and use internal signs for the community center, playground, garden, fields, and courts.",
    parking: "On-site parking serves the park and center; program changes and sports schedules affect peak demand.",
    restrooms: "Public restroom access is available in the developed park and center areas, with indoor access tied to building hours.",
    family: "Yes. Playground, lawn, fields, courts, picnic areas, and community programming support different ages and visit lengths.",
    accessibility: "Paved routes connect the major developed facilities. Contact the recreation center for accommodation details tied to a class or indoor activity.",
    dogs: "Dogs are not allowed in this City park. Use a designated Carlsbad dog park for off-leash access; leashed dogs are allowed on City trails, not in ordinary City parks.",
    amenities: "Playground, fields, basketball, picnic areas, barbecues, community garden, gym, recreation center, restrooms, and parking.",
    need: "Free outdoor recreation and scheduled indoor programming share the campus. Check the program calendar only when a particular indoor activity is the reason for visiting.",
  },
  {
    name: "Magee Park", city: "Carlsbad", type: "Historic park", lat: 33.161168, lon: -117.354196,
    address: "258 Beech Avenue, Carlsbad, CA 92008", sourceLabel: "City of Carlsbad",
    source: "https://www.carlsbadca.gov/Home/Components/FacilityDirectory/FacilityDirectory/45/7417",
    imageUrl: "https://www.carlsbadca.gov/home/showpublishedimage/1914/637540166151530000", imageSource: carlsbadParksSource,
    imageAuthor: "City of Carlsbad", imageLicense: "Official City of Carlsbad photograph; source attribution retained",
    summary: "A compact historic Village park with preserved buildings, a rose garden, gazebo, lawns, picnic tables, barbecues, and public restrooms near the coast.",
    hours: "The park is open daily 8 a.m.-10 p.m. Historic buildings, museums, rentals, and events may use shorter or appointment-based hours.",
    cost: "General park, garden, lawn, and outdoor historic-site access is free. Reserved events or special programs may charge.",
    arrival: "Enter from Beech Avenue west of Carlsbad Boulevard. The park is walkable from the Village but is not itself a beach entrance.",
    parking: "Use legal Village street or public parking and respect time limits. Event days can change nearby availability.",
    restrooms: "Public restrooms are listed at the park.",
    family: "Yes for a quiet lawn, garden, picnic, and local-history stop; it is not a playground or sports park.",
    accessibility: "The lawn, garden, and historic-building approaches vary by surface and doorway. Confirm building access for an interior program.",
    dogs: "Dogs are not allowed in this City park. Use a designated Carlsbad dog park for off-leash access; leashed dogs are allowed on City trails, not in ordinary City parks.",
    amenities: "Historic buildings, rose garden, gazebo, lawn, picnic tables, barbecues, restrooms, and nearby Village access.",
    need: "Choose Magee for a calm, historic, garden-focused stop. Pine Avenue Community Park is the nearby choice for a playground, skating, courts, and fields.",
  },
  {
    name: "Leo Carrillo Ranch Historic Park", city: "Carlsbad", type: "Historic park", lat: 33.118772, lon: -117.235333,
    address: "6200 Flying Leo Carrillo Lane, Carlsbad, CA 92009", sourceLabel: "City of Carlsbad",
    source: "https://www.carlsbadca.gov/departments/parks-recreation/parks-community-centers/leo-carrillo-ranch-historic-park",
    imageUrl: "https://www.carlsbadca.gov/home/showpublishedimage/14169/638611240242530000", imageSource: "https://www.carlsbadca.gov/departments/parks-recreation/parks-community-centers/leo-carrillo-ranch-historic-park",
    imageAuthor: "City of Carlsbad", imageLicense: "Official City of Carlsbad photograph; source attribution retained",
    summary: "A 27-acre historic ranch park with adobe buildings, gardens, walking paths, exhibits, a visitor-center barn, peafowl, and free self-guided and scheduled tours.",
    hours: "The park is open daily 9 a.m.-5 p.m., subject to weather or event closures. Free guided tours are normally offered Saturday and Sunday at 10 a.m. and 1 p.m.",
    cost: "General admission, self-guided visits, and regularly scheduled public tours are free. Private events or special programs can have separate terms.",
    arrival: "Use Flying Leo Carrillo Lane and continue to the signed visitor parking. Begin at the visitor-center barn for exhibits, orientation, and current tour information.",
    parking: "Free visitor parking is available on site; keep service and event access clear.",
    restrooms: "Visitor restrooms are available near the developed ranch facilities during operating hours.",
    family: "Yes for history, gardens, peafowl, and short exploratory walks. Closely supervise children around historic structures, stairs, water features, and animals.",
    accessibility: "The ranch has irregular earthen and paved surfaces, stairs, and trails. Use the visitor center to identify the most practical route for the day's open areas.",
    dogs: "Pets are not allowed. Service-animal access follows applicable rules; do not feed or chase the resident peafowl.",
    amenities: "Historic adobe buildings, gardens, trails, visitor-center barn, exhibits, orientation film, restrooms, self-guided information, and free guided tours.",
    need: "Weather and private events can affect access. Stay on designated paths, do not feed wildlife, and confirm tour times before planning around a docent-led visit.",
  },
  {
    name: "Batiquitos Lagoon", city: "Carlsbad", type: "Nature preserve", lat: 33.0941867, lon: -117.3014488,
    address: "7380 Gabbiano Lane, Carlsbad, CA 92011", sourceLabel: "City of Carlsbad",
    source: "https://www.carlsbadca.gov/residents/about-carlsbad/lagoons/batiquitos",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/East_Side_of_Batiquitos_Lagoon.jpg/1280px-East_Side_of_Batiquitos_Lagoon.jpg", imageSource: "https://commons.wikimedia.org/wiki/File:East_Side_of_Batiquitos_Lagoon.jpg",
    imageAuthor: "Pink Floyd Fan 101", imageLicense: "CC BY-SA 4.0",
    summary: "A 561-acre coastal estuary with a 2.7-mile north-shore nature trail, bird habitat, overlooks, picnic points, and a volunteer-supported nature center.",
    hours: "The trail and picnic area are open dawn to dusk. The nature center is generally open 9 a.m.-3 p.m., but volunteer availability can change its hours.",
    cost: "Trail, overlook, picnic, and nature-center admission is free. Donations support the nonprofit nature center.",
    arrival: "Use 7380 Gabbiano Lane for the nature center and the most accessible developed trail segment. Other north-shore access points do not offer identical parking or facilities.",
    parking: "A small public lot serves the nature center, with limited parking at other legal trail access points. Do not block neighborhood streets or service access.",
    restrooms: "A restroom is available at the nature center during its open hours; do not assume facilities elsewhere along the 2.7-mile trail.",
    family: "Yes for wildlife viewing, a gentle walk, and nature-center exhibits. Bring water, sun protection, and binoculars rather than expecting a playground.",
    accessibility: "The Gabbiano Lane-to-nature-center segment is identified as wheelchair accessible. Other trail surfaces and access points vary.",
    dogs: "Leashed dogs are allowed on the trail. Keep them close, remove waste, and protect sensitive wildlife habitat.",
    amenities: "Nature center, viewing deck, north-shore trail, wildlife interpretation, picnic points, benches, restroom during center hours, and birding access.",
    need: "Bicycles are not allowed on the lagoon trail. Fishing is limited to specified rock-jetty, lagoon-mouth, and I-5 areas and requires compliance with current license and habitat rules.",
  },
  {
    name: "Lake Calavera Preserve", city: "Carlsbad", type: "Nature preserve", lat: 33.1705657, lon: -117.2848961,
    address: "Lake Calavera trail network, Carlsbad, CA 92010", sourceLabel: "City of Carlsbad",
    source: "https://www.carlsbadca.gov/departments/parks-recreation/trails/lake-calavera?lv=true",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Panorama_of_Lake_Calavera_-_panoramio.jpg/1280px-Panorama_of_Lake_Calavera_-_panoramio.jpg", imageSource: "https://commons.wikimedia.org/wiki/File:Panorama_of_Lake_Calavera_-_panoramio.jpg",
    imageAuthor: "alicezeppelin", imageLicense: "CC BY-SA 3.0",
    summary: "A natural open-space trail network around Calavera Lake and an extinct volcanic plug, with birding, hill views, varied terrain, and links toward nearby neighborhoods.",
    hours: "Use the preserve during daylight hours and obey posted gate, habitat, fire-weather, and trail closures.",
    cost: "Public trail access is free. There is no full-service visitor facility or guaranteed dedicated parking at every access point.",
    arrival: "Choose an official trail access before navigating; the preserve has multiple neighborhood approaches and no single full-service front gate. Calavera Hills Community Park is a separate developed park.",
    parking: "Parking is limited and varies by trailhead. Use only signed public spaces, keep neighborhood access clear, and do not park in fire lanes.",
    restrooms: "Do not rely on a restroom or drinking water in the preserve. Use nearby developed parks or facilities before beginning a longer loop.",
    family: "Older children may enjoy the lake and short trail options, but heat, hills, loose surfaces, exposure, and route-finding make this different from a playground park.",
    accessibility: "Natural surfaces, grades, erosion, and narrow segments vary across the network. Review the exact access and turn-around point before a mobility-sensitive visit.",
    dogs: "Leashed dogs are allowed on City trails; remove waste and keep pets out of sensitive habitat and water.",
    amenities: "Natural-surface trails, lake views, birding, volcanic geology, overlooks, neighborhood connections, and interpretive opportunities.",
    need: "Carry water and sun protection, download a route before leaving signal, and avoid mud or heat extremes. No motor vehicles, smoking, fires, or fireworks are allowed on City trails.",
  },
  {
    name: "Agua Hedionda Lagoon Discovery Center", city: "Carlsbad", type: "Nature center", lat: 33.1500392, lon: -117.2973463,
    address: "1580 Cannon Road, Carlsbad, CA 92008", sourceLabel: "Agua Hedionda Lagoon Foundation",
    source: "https://www.aguahedionda.org/the-discovery-campus",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facing_South_-_Agua_Hedionda_Lagoon_2.jpg/1280px-Facing_South_-_Agua_Hedionda_Lagoon_2.jpg", imageSource: "https://commons.wikimedia.org/wiki/File:Facing_South_-_Agua_Hedionda_Lagoon_2.jpg",
    imageAuthor: "Z3lvs", imageLicense: "CC0",
    summary: "A public environmental-learning destination overlooking Agua Hedionda Lagoon, with exhibits, family programs, native habitat, and an introduction to the lagoon's distinct public-access areas.",
    hours: "The Discovery Campus is open daily 9 a.m.-5 p.m. Rain can delay opening until 1:30 p.m., and the Foundation posts special closures and early closings on its visitor page. Outdoor lagoon access and water recreation follow separate site and permit rules.",
    cost: "The Foundation suggests a $15 donation for groups of up to six and $25 for larger groups; members are complimentary. Programs, watercraft access, rentals, and permits may charge separately.",
    arrival: "Use 1580 Cannon Road for the Discovery Center. Do not navigate to an industrial, marina, hatchery, or residential shoreline when the exhibits are your destination.",
    parking: "Use the signed Discovery Center parking. Other lagoon access points have separate ownership, permits, and parking rules.",
    restrooms: "Visitor facilities are available during Discovery Center operating hours; they are not guaranteed around the entire lagoon.",
    family: "Yes. Exhibits and scheduled nature activities make this the most approachable first stop for families learning about the lagoon.",
    accessibility: "The developed center is the practical accessibility starting point. Natural shoreline and trail conditions vary elsewhere around the lagoon.",
    dogs: "Follow posted center and habitat rules. Do not assume pets are allowed inside exhibits or at every shoreline access.",
    amenities: "Environmental exhibits, family learning, lagoon overlook, native habitat interpretation, scheduled programs, visitor facilities, and parking.",
    need: "The lagoon is not one continuous public park. Fishing, paddling, power boating, trails, and educational access occur in different basins under different rules.",
  },
  {
    name: "South Carlsbad State Beach", city: "Carlsbad", type: "State beach", lat: 33.1012724, lon: -117.31867,
    address: "7201 Carlsbad Boulevard, Carlsbad, CA 92008", sourceLabel: "California State Parks",
    source: "https://www.parks.ca.gov/?page_id=660",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/SouthCarlsbadStateBeach2019.jpg/1280px-SouthCarlsbadStateBeach2019.jpg", imageSource: "https://commons.wikimedia.org/wiki/File:SouthCarlsbadStateBeach2019.jpg",
    imageAuthor: "Sam Trenholme", imageLicense: "CC BY-SA 4.0",
    summary: "A long bluff-backed state beach with public day-use access, North and South Ponto areas, swimming and surfing, tide-dependent sand, and a reservation campground above the coast.",
    hours: "Day-use beach and parking hours follow current California State Parks postings. The campground is a separate reserved overnight facility with check-in and quiet-hour rules.",
    cost: "Pedestrian beach access is free. State day-use parking, camping, reservations, concessions, and some services may charge.",
    arrival: "Choose North Ponto, South Ponto, or the campground/day-use area before navigating. They are separate access points along Carlsbad Boulevard with different parking and facility patterns.",
    parking: "State and public parking varies by access and can fill early on warm weekends. Read every sign and do not use the highway shoulder or campground without authorization.",
    restrooms: "Restrooms and rinse facilities are concentrated at developed day-use and campground areas, not at every stair or shoreline segment.",
    family: "Yes when the selected access has suitable sand and facilities, but ocean surf, bluff stairs, high tides, and limited shade require planning.",
    accessibility: "Accessible parking and beach-wheelchair services vary by state-beach unit and access. Confirm the current pickup location and route before relying on equipment.",
    dogs: "Dogs are not allowed on the beach. Campground and paved-area pet rules are separate and require a leash where permitted.",
    amenities: "Ocean beach, surfing, swimming, fishing, day-use areas, restrooms at developed access points, campground, bluff views, and seasonal lifeguard coverage.",
    need: "Check tides and surf before choosing an access. High tide can sharply reduce usable sand, and the campground is not a substitute for public day-use parking.",
  },
  {
    name: "Buddy Todd Park", city: "Oceanside", type: "Community park", lat: 33.2074646, lon: -117.3476895,
    address: "Mesa Drive and Parnassus Circle, Oceanside, CA 92054", sourceLabel: "City of Oceanside",
    source: "https://records.ci.oceanside.ca.us/gov/ns/parks/amenities/parks.asp",
    imageUrl: "https://www.ci.oceanside.ca.us/home/showpublishedimage/4304/639100334513270000", imageSource: "https://www.ci.oceanside.ca.us/government/parks-recreation/recreation-centers/buddy-todd-park-photo-album",
    imageAuthor: "City of Oceanside", imageLicense: "Official City of Oceanside photograph; source attribution retained",
    summary: "Oceanside's oldest park, a 19-acre hilltop green space with panoramic views, playground and swings, basketball, volleyball, picnic tables, barbecues, fields, restrooms, and walking paths.",
    hours: "City park hours are 6 a.m.-9 p.m. Follow posted field, restroom, event, and maintenance closures.",
    cost: "General park, playground, court, field, picnic, and viewpoint access is free. Reservations and permitted events may charge.",
    arrival: "Use Mesa Drive and Parnassus Circle and continue to the signed park entrance. The playground, courts, lawn, memorial areas, and viewpoints are spread across the hilltop.",
    parking: "A public parking area serves the park. Sunset, weekend picnics, and games can increase demand.",
    restrooms: "Public restrooms and drinking fountains are listed among the park amenities.",
    family: "Yes. The playground and swings, broad grass, picnic space, courts, and views make it one of Oceanside's strongest free family parks.",
    accessibility: "Developed paths serve the major park areas, but the hilltop setting includes slopes. Choose parking closest to the intended amenity.",
    dogs: "Keep dogs leashed and follow posted play-area, field, and cleanup rules; no fenced off-leash area is listed.",
    amenities: "Playground and swings, basketball, volleyball, multipurpose field, picnic tables, barbecues, restrooms, drinking fountain, paths, views, and parking.",
    need: "The park's strongest feature is the hilltop setting, but it can be windy and exposed. Bring a layer and choose a picnic location with the day's sun and wind in mind.",
  },
  {
    name: "Heritage Park Village and Museum", city: "Oceanside", type: "Historic park", lat: 33.2323, lon: -117.3128,
    address: "220 Peyri Road, Oceanside, CA 92057", sourceLabel: "City of Oceanside",
    source: "https://www.ci.oceanside.ca.us/government/parks-recreation/special-events/heritage-park",
    imageUrl: "https://www.ci.oceanside.ca.us/home/showpublishedimage/3698/638084469338970000", imageSource: "https://www.ci.oceanside.ca.us/Home/Components/FacilityDirectory/FacilityDirectory/28/710",
    imageAuthor: "City of Oceanside", imageLicense: "Official City of Oceanside photograph; source attribution retained",
    summary: "A four-acre historic village with relocated turn-of-the-century buildings, a museum setting, gazebo, lawn, picnic space, restrooms, and regular public events near Mission San Luis Rey.",
    hours: "The historic park is open to the public Wednesday-Sunday, 9 a.m.-4 p.m. General City park hours are broader, but building and museum access follows the published visitor schedule.",
    cost: "General public park and historic-village access is free. Rentals, registered programs, and special events may charge.",
    arrival: "Use 220 Peyri Road. The park is near Mission San Luis Rey but is a separate public destination with its own parking and hours.",
    parking: "A public parking area is listed at the park. Weddings and special events can affect ordinary access.",
    restrooms: "Public restrooms and drinking water are listed among the park amenities during open hours.",
    family: "Yes for local history, lawns, picnics, and event days. It is not a playground-focused park.",
    accessibility: "The lawn, gazebo, and historic-building thresholds vary. Confirm access to a specific interior exhibit before a mobility-sensitive visit.",
    dogs: "Follow posted historic-building, lawn, event, leash, and cleanup rules; do not assume dogs may enter museum interiors.",
    amenities: "Historic buildings, gazebo, lawn, picnic area, museum setting, restrooms, drinking fountain, parking, tours, and public events.",
    need: "Public hours are Wednesday through Sunday rather than every day. Private events can change access, so check the City's page before a special trip.",
  },
  {
    name: "Mance Buchanon Park", city: "Oceanside", type: "Community park", lat: 33.2421192, lon: -117.3012814,
    address: "425 College Boulevard, Oceanside, CA 92057", sourceLabel: "City of Oceanside",
    source: "https://records.ci.oceanside.ca.us/gov/ns/parks/amenities/parks.asp",
    imageUrl: "https://www.ci.oceanside.ca.us/home/showpublishedimage/3958/639101965080330000", imageSource: "https://www.ci.oceanside.ca.us/government/parks-recreation/recreation-centers/mance-buchanon-park-photo-album",
    imageAuthor: "City of Oceanside", imageLicense: "Official City of Oceanside photograph; source attribution retained",
    summary: "A roughly 29-acre sports and community park with a playground, broad fields, picnic space, restrooms, drinking water, parking, and recurring citywide family events.",
    hours: "City park hours are 6 a.m.-9 p.m. Field permits, events, restrooms, and maintenance can change access to individual areas.",
    cost: "General park, playground, lawn, and casual recreation access is free. Organized sports, reservations, and registered events may charge.",
    arrival: "Use the College Boulevard entrance and follow internal signs for playground, fields, picnic areas, and event access.",
    parking: "On-site parking serves the park. Large sports and holiday events can use special traffic plans.",
    restrooms: "Public restrooms and a drinking fountain are listed at the park.",
    family: "Yes. The playground, large fields, and picnic space make it suitable for casual visits and major City family events.",
    accessibility: "Developed paths connect parking to primary facilities. Event layouts can alter the easiest route.",
    dogs: "Keep dogs leashed and follow posted playground, field, event, and cleanup rules.",
    amenities: "Playground, multipurpose fields, picnic areas, restrooms, drinking fountain, parking, and space for large community events.",
    need: "The park hosts major annual events, including egg hunts and Halloween programming. Check the City calendar when crowds or special activities matter.",
  },
  {
    name: "Libby Lake Park", city: "Oceanside", type: "Community park", lat: 33.2491213, lon: -117.3088828,
    address: "424 Calle Montecito, Oceanside, CA 92057", sourceLabel: "City of Oceanside",
    source: "https://www.ci.oceanside.ca.us/Home/Components/FacilityDirectory/FacilityDirectory/20/710",
    imageUrl: "https://www.ci.oceanside.ca.us/home/showpublishedimage/4008/639102027352470000", imageSource: "https://www.ci.oceanside.ca.us/Home/Components/FacilityDirectory/FacilityDirectory/20/710",
    imageAuthor: "City of Oceanside", imageLicense: "Official City of Oceanside photograph; source attribution retained",
    summary: "An 18-acre lake-centered park with a playground, picnic areas, barbecues, horseshoes, parking, and a nearby daylight-hours skatepark.",
    hours: "City park hours are 6 a.m.-9 p.m. The unstaffed skatepark is open only during daylight hours.",
    cost: "General park, playground, picnic, and skatepark access is free. Reservations or programs may charge.",
    arrival: "Use 424 Calle Montecito for the lake park. The skatepark is west of the main park near 504 Calle Montecito and should be treated as a separate activity zone.",
    parking: "A public parking area serves the park. Use the entrance closest to the lake/playground or skatepark rather than crossing activity areas unnecessarily.",
    restrooms: "The City's current facility list does not promise a restroom in its amenity summary; plan around nearby public facilities and verify posted conditions.",
    family: "Yes. The lake view, playground, picnic areas, and nearby skatepark offer options for mixed ages, with close water supervision required.",
    accessibility: "Developed park paths and parking serve the lake area, but shoreline edges, grass, and the skatepark have different surfaces and risks.",
    dogs: "Keep dogs leashed and away from sensitive shoreline habitat; remove waste and follow posted play-area rules.",
    amenities: "Lake, playground, picnic area, barbecues, horseshoes, drinking fountain, parking, benches, and nearby skatepark.",
    need: "The skatepark requires helmets, elbow pads, and knee pads and is open in daylight only. Closely supervise children near the lake edge.",
  },
  {
    name: "Guajome Regional Park", city: "Oceanside", type: "Regional park", lat: 33.244366, lon: -117.267673,
    address: "3000 Guajome Lake Road, Oceanside, CA 92057", sourceLabel: "San Diego County Parks and Recreation",
    source: "https://www.sdparks.org/content/sdparks/en/park-pages/Guajome.html",
    imageUrl: "https://www.sdparks.org/content/sdparks/en/park-pages/Guajome/_jcr_content/content/textimage/image.img.jpg/1717801682399.jpg", imageSource: "https://www.sdparks.org/content/sdparks/en/park-pages/Guajome.html",
    imageAuthor: "San Diego County Parks and Recreation", imageLicense: "Official San Diego County photograph; source attribution retained",
    summary: "A habitat-rich regional park with about 4.5 miles of trails, two ponds, fishing, birding, two day-use areas, new playgrounds, basketball, lawns, restrooms, camping, and a rustic cabin.",
    hours: "Day use is open daily 9:30 a.m. to sunset. Registered camping operates 24 hours under campground rules.",
    cost: "Walking and biking access follow County park rules; day-use vehicle parking is $5. Camping, cabin use, reservations, and permits charge separately.",
    arrival: "Use 3000 Guajome Lake Road and choose the signed day-use or campground area. Do not enter the campground when visiting only the playgrounds or trails.",
    parking: "Day-use parking costs $5. Park only in designated areas and keep campsite loops for registered guests.",
    restrooms: "Restrooms serve the developed day-use and camping areas; carry water on longer trail loops.",
    family: "Yes. Two day-use areas include playgrounds, basketball, lawns, picnic space, ponds, and short trail options.",
    accessibility: "Developed day-use facilities provide the firmest routes. The 4.5-mile trail network crosses varied woodland, wetland, chaparral, and grassland surfaces.",
    dogs: "Dogs must follow County leash, campground, trail, wildlife, and cleanup rules.",
    amenities: "4.5 miles of trails, two ponds, fishing, birding, two playgrounds, basketball, lawns, picnic areas, restrooms, 33 campsites, caravan pavilion, and rustic cabin.",
    need: "Fishing requires current California licensing and park compliance. Check County alerts for pond, trail, fire-weather, event, or construction closures.",
  },
  {
    name: "San Luis Rey River Trail", city: "Oceanside", type: "Multi-use trail", lat: 33.2205, lon: -117.353,
    address: "Neptune Way to North Santa Fe Avenue, Oceanside, CA", sourceLabel: "City of Oceanside",
    source: "https://records.ci.oceanside.ca.us/gov/ns/parks/amenities/trails.asp",
    imageUrl: "https://records.ci.oceanside.ca.us/images/Parks%20and%20Rec/Parks/SanLuisReyBikeTrail.jpg", imageSource: "https://records.ci.oceanside.ca.us/gov/ns/parks/amenities/trails.asp", imageFilename: "hero-verified.webp",
    imageAuthor: "City of Oceanside", imageLicense: "Official City of Oceanside photograph; source attribution retained",
    summary: "A roughly nine-mile, paved, mostly level Class I trail separated from motor traffic, connecting coastal Oceanside with inland river habitat for biking, walking, rolling, running, and birding.",
    hours: "Use during daylight hours. The trail has no lighting, and the City discourages travel after dark; construction can close individual access points.",
    cost: "Public trail access is free. Parking and connections vary by access point.",
    arrival: "Choose a trail access before navigating. Neptune Way is the western end; Foussat/Alex Road, Douglas Drive, and inland connections serve different mileage points and parking patterns.",
    parking: "Parking is available at selected access points, not continuously along the trail. The Douglas Drive lot has had construction-related restrictions, so check current notices.",
    restrooms: "Do not rely on restrooms or water along the trail. Use coastal, park, or neighborhood facilities before entering a long segment.",
    family: "The separated, mostly level pavement can work well for families, but distance, sun, faster bicycles, limited services, and river edges require planning.",
    accessibility: "The paved Class I surface supports wheelchairs and other nonmotorized users, though access ramps, construction, debris, and distance between exits vary.",
    dogs: "Leashed dogs are allowed for walkers and runners; leashes must be no longer than six feet, and waste must be removed.",
    amenities: "Paved traffic-separated trail, river and bird views, mileage access points, benches and kiosks at selected entrances, and transit connection near the west end.",
    need: "There are no lights and limited shade or services. Carry water, yield predictably, keep right, announce passes, and choose a turn-around distance before starting.",
  },
  {
    name: "El Corazon Park and Trails", city: "Oceanside", type: "Open space and recreation", lat: 33.2017155, lon: -117.3270587,
    address: "3210 Oceanside Boulevard, Oceanside, CA 92056", sourceLabel: "City of Oceanside",
    source: "https://www.ci.oceanside.ca.us/government/parks-recreation/parks-trails-amenities/hiking-trails",
    imageUrl: "https://patch.com/img/cdn20/users/24892379/20230418/112815/styles/patch_image/public/kristopher-ebbert-el-corazon-super-bloom___18232523091.jpg?width=1200", imageSource: "https://patch.com/california/oceanside-camppendleton/el-corazon-super-bloom-oceanside-photo-day", imageFilename: "hero-verified.webp",
    imageAuthor: "Kris Ebbert / Patch", imageLicense: "Credited community photograph; source attribution retained",
    summary: "A large evolving public recreation landscape with Garrison Creek and View trails, habitat, sunset views, sports fields, community facilities, aquatics, events, and newly opened trail connections.",
    hours: "General park hours are 6 a.m.-9 p.m. Garrison Creek Trail has historically used shorter gate hours; facilities, sports, aquatics, events, and construction zones follow separate schedules.",
    cost: "Open-space trails and general park access are free. Aquatics, programs, tournaments, rentals, and special events may charge.",
    arrival: "Use 3210 Oceanside Boulevard for Garrison Creek Trail. Use the Senior Center driveway from Rancho Del Oro Drive for View Trail; sports and aquatics use their own entrances.",
    parking: "Parking is distributed among separate facilities. Navigate to the exact trail, field, aquatic, senior, or event destination rather than the center of the 465-acre property.",
    restrooms: "Restrooms are associated with developed facilities and events, not guaranteed along nature trails. Confirm access before a long walk.",
    family: "Trails and open space are family-friendly for prepared walkers; aquatics includes a children's splash area but uses its own admission and schedule.",
    accessibility: "Developed facilities provide accessible routes, while nature trails and active construction vary. Confirm the exact destination rather than relying on a property-wide accessibility claim.",
    dogs: "Follow posted trail and facility leash rules. The planned future dog park and pump track should not be described as open until the City confirms completion.",
    amenities: "Nature trails, habitat, viewpoints, sports complex, aquatic center with splash area, event space, community facilities, parking, and evolving public park connections.",
    need: "El Corazon is still developing. Park Site 1 amenities under design or construction are not current visitor promises; use only open trails and operating facilities shown by the City.",
  },
  {
    name: "Oak Riparian Park", city: "Oceanside", type: "Community park", lat: 33.1745031, lon: -117.2658212,
    address: "4625 Lake Boulevard, Oceanside, CA 92056", sourceLabel: "City of Oceanside",
    source: "https://www.ci.oceanside.ca.us/Home/Components/FacilityDirectory/FacilityDirectory/80/710",
    imageUrl: "https://www.ci.oceanside.ca.us/home/showpublishedimage/8734/638920529781830000", imageSource: "https://www.ci.oceanside.ca.us/government/water-utilities/environmental-services-programs/watershed-protection-program/oceanside-waterbodies", imageFilename: "hero-verified.webp",
    imageAuthor: "City of Oceanside", imageLicense: "Official City of Oceanside photograph of Calavera Creek at Oak Riparian Park; source attribution retained",
    summary: "A 20-acre park along Calavera Creek with play equipment, baseball and soccer fields, picnic areas, barbecues, restrooms, parking, and access to a riparian wildlife corridor.",
    hours: "City park hours are 6 a.m.-9 p.m. Unlighted athletic fields are available only through sunset and can be reserved.",
    cost: "General park, playground, picnic, and casual field access is free when areas are not reserved. Organized sports and permits may charge.",
    arrival: "Use 4625 Lake Boulevard. Follow the park layout for playground, restrooms, creek-side areas, baseball, and the two soccer fields.",
    parking: "A public parking area serves the park. Permitted games can fill field-side spaces.",
    restrooms: "Public restrooms and drinking fountains are listed at the park.",
    family: "Yes. Play equipment, picnic areas, fields, and nearby creek habitat support a flexible visit, with close supervision near water and natural edges.",
    accessibility: "Developed park paths serve the main facilities. Creek-side and trail connections can have natural or uneven surfaces.",
    dogs: "Keep dogs leashed, remove waste, and protect the Calavera Creek wildlife corridor.",
    amenities: "Playground, baseball/softball, two soccer fields, multipurpose lawn, picnic areas, barbecues, restrooms, drinking fountain, parking, and creek habitat.",
    need: "The soccer fields have no lights and permitted groups have priority. For a trail-focused visit, use the separate Lake Calavera Preserve guide.",
  },
  {
    name: "Buena Vista Audubon Nature Center", city: "Oceanside", type: "Nature center", lat: 33.1748, lon: -117.3598,
    address: "2202 South Coast Highway, Oceanside, CA 92054", sourceLabel: "Buena Vista Audubon Society",
    source: "https://bvaudubon.org/nature-center/",
    imageUrl: "https://www.ci.oceanside.ca.us/home/showpublishedimage/1536/639112422055830000", imageSource: "https://www.ci.oceanside.ca.us/visitors/local-attractions",
    imageAuthor: "City of Oceanside", imageLicense: "Official City of Oceanside photograph; source attribution retained",
    summary: "A free, nonprofit-supported nature center at Buena Vista Lagoon with exhibits, birding, native habitat, family learning, and short outdoor exploration near the coast.",
    hours: "The Nature Center is normally open daily 10 a.m.-4 p.m., although volunteer staffing can affect access. Check the center's current notice before planning around indoor exhibits. Outdoor habitat access follows posted daylight and closure rules.",
    cost: "General nature-center and lagoon learning access is free or donation-supported. Programs and events can use registration or suggested donations.",
    arrival: "Use 2202 South Coast Highway for the nature center. This is the practical public orientation point for the lagoon, not an invitation to enter every shoreline parcel.",
    parking: "Use the signed visitor parking and follow current access directions; space is limited.",
    restrooms: "Visitor facilities depend on the nature center being open. Do not assume restrooms elsewhere around the lagoon.",
    family: "Yes. Exhibits, birds, native habitat, and short learning-focused visits are suitable for children with adult supervision.",
    accessibility: "The developed center is the most practical starting point. Outdoor paths and observation areas vary by surface and weather.",
    dogs: "Protect wildlife and follow posted center and preserve pet rules; do not assume dogs may enter exhibits or sensitive habitat.",
    amenities: "Nature exhibits, birding, lagoon views, native habitat, family education, volunteer interpretation, visitor facilities, and limited parking.",
    need: "This is a sensitive wildlife destination rather than a playground. Bring binoculars, keep voices low, and confirm center hours before planning around indoor exhibits.",
  },
];

const missionBayFeatures = [
  {
    slug: "fiesta-island", name: "Fiesta Island", type: "dog_area", category: "Open beach and dog access",
    lat: 32.7825, lon: -117.2155, sourceLabel: "City of San Diego",
    source: "https://www.sandiego.gov/park-and-recreation/parks/regional/missionbay/fiestaisland",
    imageUrl: "https://www.sandiego.gov/sites/default/files/styles/100_percent/public/missionbay3.jpg?itok=a5odnzPa",
    arrival: "Use the signed Fiesta Island entrance from East Mission Bay Drive and follow the one-way loop. Special events can close some or all of the island.",
    parking: "Parking is informal along permitted parts of the island loop. Obey barriers and do not block gates, race routes, habitat protection, or emergency access.",
    restrooms: "Facilities are limited compared with developed Mission Bay coves. Plan around nearby mainland restrooms and current event setups.",
    accessibility: "The island is largely sand, dirt, and informal shoreline. Conditions change, and it is not the best Mission Bay choice when paved accessible facilities are essential.",
    safety: "Keep clear of event courses and vehicles, supervise dogs around water and traffic, and obey seasonal habitat closures.",
    need: "Fiesta Island is open 4 a.m.-10 p.m. Dogs are welcome and may be off leash in allowed areas, including a fenced dog area; confirm current closures before driving onto the island.",
  },
  {
    slug: "model-yacht-pond", name: "Model Yacht Pond", type: "recreation", category: "Model boating",
    lat: 32.7746, lon: -117.2345, sourceLabel: "City of San Diego",
    source: "https://www.sandiego.gov/park-and-recreation/parks/regional/missionbay/facilities1",
    imageUrl: "https://www.sandiego.gov/sites/default/files/legacy/park-and-recreation/graphics/modelyachtpond02.jpg",
    arrival: "Use Vacation Isle and follow signs to the dedicated pond rather than a swimming beach or boat launch.",
    parking: "Free public parking is available near the pond. Read event and overnight restrictions.",
    restrooms: "Public restrooms are available near the pond and surrounding Vacation Isle facilities.",
    accessibility: "Parking, grass, and pond-edge routes are relatively developed, but exact viewing surfaces and event setups vary.",
    safety: "This pond is for model sail and power boats, not swimming. Keep children back from the water edge and avoid interfering with active model craft.",
    need: "The pond is open 4 a.m.-2 a.m. and has shaded grass nearby. It is a specialized free stop, not a full-service family swim beach.",
  },
  {
    slug: "south-shores-park", name: "South Shores Park and Boat Launch", type: "boat_launch", category: "Boating access",
    lat: 32.7653, lon: -117.209, sourceLabel: "City of San Diego",
    source: "https://www.sandiego.gov/park-and-recreation/parks/regional/missionbay/facilities1",
    imageUrl: "https://www.sandiego.gov/sites/default/files/legacy/park-and-recreation/graphics/southshores01.jpg",
    arrival: "Use South Shores Parkway and follow the trailer-oriented signs to the ramp. This is primarily a boating access site rather than a family swimming beach.",
    parking: "A large lot is designed around boat trailers. Use the correct stall type, read permit and overnight rules, and keep launch circulation clear.",
    restrooms: "A comfort station and public restroom serve the developed launch area.",
    accessibility: "The paved lot and developed facilities offer firm routes, while ramps, docks, wet surfaces, and trailer traffic require care.",
    safety: "Stay out of active launch lanes, secure children and pets around vehicles and water, and use personal flotation devices for boating.",
    need: "South Shores is open 4 a.m.-2 a.m. and includes a boat ramp, trailer parking, RV dump, small grass and picnic areas, and restrooms. Choose another cove for swimming or playgrounds.",
  },
];

async function downloadPhoto(directory, imageUrl, filename = "hero.webp", imageReferer) {
  const outputPath = path.join(root, "assets", "parks", "san-diego-coast-expansion", directory, filename);
  if (fs.existsSync(outputPath)) return `/assets/parks/san-diego-coast-expansion/${directory}/${filename}`;
  if (!downloadImages) throw new Error(`Missing image for ${directory}; run with --download`);
  let response;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/127 Safari/537.36 AuditMap/1.0",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: imageReferer || (imageUrl.includes("wikimedia.org") ? "https://commons.wikimedia.org/" : `${new URL(imageUrl).origin}/`),
      },
    });
    if (response.ok || response.status !== 429) break;
    await new Promise((resolve) => setTimeout(resolve, attempt * 2500));
  }
  if (!response?.ok) throw new Error(`${directory}: image returned ${response?.status || "no response"}`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp(Buffer.from(await response.arrayBuffer()))
    .rotate()
    .resize(1600, 1000, { fit: "cover", position: "attention", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(outputPath);
  return `/assets/parks/san-diego-coast-expansion/${directory}/${filename}`;
}

function ensureCsvRows() {
  const file = path.join(root, "data", "nationwide-major-parks-launch.csv");
  let text = fs.readFileSync(file, "utf8").trimEnd();
  for (const place of places) {
    const row = `Pacific,CA,${place.city},${place.name},supporting,no,coast-public-access-expansion`;
    if (!text.split("\n").includes(row)) text += `\n${row}`;
  }
  fs.writeFileSync(file, `${text}\n`);
}

function ensureLocations() {
  const file = path.join(root, "data", "launch-location-overrides.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const place of places) {
    const id = `launch-ca-${slugify(place.city)}-${slugify(place.name)}`;
    const value = {
      id, park: place.name, city: place.city, state: "CA", latitude: place.lat, longitude: place.lon,
      address: place.address, displayName: `${place.name}, ${place.city}, CA`, source: place.sourceLabel,
      sourceUrl: place.source, checkedAt,
    };
    const index = rows.findIndex((row) => row.id === id);
    if (index >= 0) rows[index] = value; else rows.push(value);
  }
  fs.writeFileSync(file, `${JSON.stringify(rows, null, 2)}\n`);
}

function upsertPark(document, park) {
  const index = document.parks.findIndex((candidate) => candidate.id === park.id);
  if (index >= 0) document.parks[index] = park; else document.parks.push(park);
}

async function main() {
  ensureCsvRows();
  ensureLocations();

  const allPath = path.join(root, "data", "generated", "all-subsites-ready.json");
  const pilotPath = path.join(root, "data", "generated", "pilot-subsites-ready.json");
  const campaignPath = path.join(root, "data", "parent-park-information-enrichment-campaign.json");
  const all = JSON.parse(fs.readFileSync(allPath, "utf8"));
  const pilot = JSON.parse(fs.readFileSync(pilotPath, "utf8"));
  const campaign = JSON.parse(fs.readFileSync(campaignPath, "utf8"));

  for (const place of places) {
    const id = `launch-ca-${slugify(place.city)}-${slugify(place.name)}`;
    const localImage = await downloadPhoto(`${slugify(place.city)}/${slugify(place.name)}`, place.imageUrl, place.imageFilename, place.imageReferer);
    const image = {
      url: localImage, source: place.imageSource, author: place.imageAuthor, license: place.imageLicense,
      alt: `${place.name} in ${place.city}, California`, latitude: place.lat, longitude: place.lon,
      positionQuality: "Associated with this destination by its named source; exact camera coordinates are not published",
    };
    const searchAnswers = parkAnswers(place);
    const park = {
      id, name: place.name, type: "Park", city: place.city, state: "CA", country: "US",
      citySlug: slugify(`${place.city}-CA`), slug: slugify(place.name), searchCategory: "park",
      neighborhood: place.city, status: "Sourced public-access visitor guide", summary: place.summary,
      searchDescription: `Hours, arrival guidance, amenities, photo, and essential visitor questions for ${place.name} in ${place.city}, California.`,
      address: place.address, latitude: place.lat, longitude: place.lon, hours: place.hours, cost: place.cost,
      accessibility: place.accessibility, sourceLabel: place.sourceLabel, source: place.source,
      verifiedAt: checkedAt, operator: place.sourceLabel, image, images: [], factSources: {}, sources: [],
      launchTier: "supporting", likelySubsites: false, publishStatus: "enriched", researchQueue: [],
      searchAnswers, features: [], amenities: place.amenities.split(", "), comments: [],
    };
    upsertPark(all, park);
    upsertPark(pilot, park);
    campaign.parks[id] = {
      operator: place.sourceLabel, sourceLabel: place.sourceLabel, source: place.source, address: place.address,
      summary: place.summary, hours: place.hours, cost: place.cost, accessibility: place.accessibility,
      searchAnswers, image, additionalImages: [], verifiedAt: checkedAt,
    };
  }

  const missionBayId = "launch-ca-san-diego-mission-bay-park";
  const missionBayCampaign = campaign.parks[missionBayId] || {};
  const missionImages = [];
  for (const item of missionBayFeatures) {
    const id = stableUuid(missionBayId, item.slug);
    const localImage = await downloadPhoto(`san-diego/mission-bay-park/${item.slug}`, item.imageUrl);
    const image = {
      url: localImage, source: item.source, author: item.sourceLabel,
      license: "Official City of San Diego photograph; source attribution retained",
      alt: `${item.name} at Mission Bay Park in San Diego`, featureId: id, latitude: item.lat, longitude: item.lon,
      positionQuality: "Associated with this named destination by the official source; exact camera coordinates are not published",
    };
    missionImages.push(image);
    const feature = {
      id, slug: item.slug, name: item.name, feature_type: item.type,
      description: `${item.name} is a named public destination within Mission Bay Park with its own arrival, facilities, safety, and visitor guidance.`,
      latitude: item.lat, longitude: item.lon,
      details: {
        category: item.category, includeInParentGallery: true,
        positionQuality: "Named visitor destination cross-checked against official City of San Diego guidance",
        address: "Mission Bay Park, San Diego, CA", hours: item.need, hoursSchedule: false,
        cost: "General public access is free; permits, parking rules, rentals, and services may vary.",
        accessibility: item.accessibility, locationContext: item.arrival, needToKnow: item.need,
        informationSourceLabel: item.sourceLabel, informationSourceUrl: item.source, informationCheckedAt: checkedAt,
        imageUrl: localImage, imageSourceUrl: item.source, imageAuthor: item.sourceLabel,
        imageLicense: image.license, imageAlt: image.alt, images: [image],
        searchAnswers: [
          answer(item, "location", `Where exactly is ${item.name}?`, item.arrival),
          answer(item, "parking", `Where should I park for ${item.name}?`, item.parking),
          answer(item, "restroom", `Are there restrooms at ${item.name}?`, item.restrooms),
          answer(item, "accessibility", `How accessible is ${item.name}?`, item.accessibility),
          answer(item, "safety", `What safety details matter at ${item.name}?`, item.safety),
          answer(item, "need-to-know", `What should I know before visiting ${item.name}?`, item.need),
        ],
      },
      source_label: item.sourceLabel, source_url: item.source, verified_at: checkedAt,
    };
    for (const document of [all, pilot]) {
      const parent = document.parks.find((candidate) => candidate.id === missionBayId);
      if (!parent) throw new Error("Mission Bay Park record is missing");
      const featureIndex = (parent.features || []).findIndex((candidate) => candidate.slug === item.slug);
      if (featureIndex >= 0) parent.features[featureIndex] = feature; else parent.features.push(feature);
    }
  }
  missionBayCampaign.additionalImages = [
    ...(missionBayCampaign.additionalImages || []).filter((image) => !missionImages.some((added) => added.url === image.url)),
    ...missionImages,
  ];
  missionBayCampaign.verifiedAt = checkedAt;
  campaign.parks[missionBayId] = missionBayCampaign;

  fs.writeFileSync(allPath, `${JSON.stringify(all, null, 2)}\n`);
  fs.writeFileSync(pilotPath, `${JSON.stringify(pilot, null, 2)}\n`);
  fs.writeFileSync(campaignPath, `${JSON.stringify(campaign, null, 2)}\n`);
  fs.writeFileSync(path.join(root, "data", "us-priority-enrichment-queue.json"), `${JSON.stringify({
    updatedAt: checkedAt,
    reason: "Traveler-requested San Diego north-coast public-access expansion",
    active: places.map((place, index) => ({ priority: index + 1, id: `launch-ca-${slugify(place.city)}-${slugify(place.name)}`, name: place.name, city: place.city, status: "enriched-and-ready-for-production" })),
    next: [
      { priority: places.length + 1, name: "Mission Bay remaining named coves", city: "San Diego", target: "unique sourced photography and exact access details" },
      { priority: places.length + 2, name: "Oceanside neighborhood park second wave", city: "Oceanside", target: "playgrounds, dog parks, skateparks, and accessible paths" },
      { priority: places.length + 3, name: "Carlsbad public trail second wave", city: "Carlsbad", target: "trailheads, parking limits, surfaces, and shade" },
    ],
  }, null, 2)}\n`);
  console.log(`Prepared ${places.length} new public-place guides and ${missionBayFeatures.length} additional Mission Bay destinations.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
