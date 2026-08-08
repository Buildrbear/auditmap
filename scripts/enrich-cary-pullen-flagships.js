#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "institutions.json");
const checkedAt = "2026-08-05";
const downloadImages = process.argv.includes("--download");

const CARY_SOURCE = "https://downtowncarypark.com/welcome-to-downtown-cary-park";
const CARY_MAP = "https://downtowncarypark.com/wp-content/themes/nmc_carypark/assets/map-zoom/map-full-2024-02-02.jpg";
const PULLEN_SOURCE = "https://raleighnc.gov/parks-and-recreation/places/pullen-park";
const PULLEN_AMUSEMENTS = "https://raleighnc.gov/parks-and-recreation/places/pullen-park-amusements";
const PULLEN_MAP = "https://cityofraleigh0drupal.blob.core.usgovcloudapi.net/drupal-prod/COR24/pullen-campus-map.pdf";

const dailySchedule = (opens, closes) => ({
  sunday: [[opens, closes]], monday: [[opens, closes]], tuesday: [[opens, closes]],
  wednesday: [[opens, closes]], thursday: [[opens, closes]], friday: [[opens, closes]],
  saturday: [[opens, closes]],
});
const rideSchedule = {
  sunday: [["10:00", "20:00"]], monday: [["10:00", "18:00"]],
  tuesday: [["10:00", "18:00"]], wednesday: [["10:00", "18:00"]],
  thursday: [["10:00", "18:00"]], friday: [["10:00", "20:00"]],
  saturday: [["10:00", "20:00"]],
};

function stableUuid(parkId, slug) {
  const bytes = crypto.createHash("sha256").update(`auditmap:${parkId}:${slug}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function photo(remote, alt, name = "hero", options = {}) {
  return { remote, alt, name, ...options };
}

function answer(intentKey, question, text, source, sourceLabel) {
  return {
    intentKey,
    question,
    answer: text,
    sourceLabel,
    source,
    sourceType: "official",
    checkedAt,
  };
}

const caryExisting = {
  nest: "/assets/parks/downtown-cary-park/the-nest.jpg",
  academy: "/assets/parks/downtown-cary-park/academy-plaza.jpg",
  barkyard: "/assets/parks/downtown-cary-park/barkyard.jpg",
  lawn: "/assets/parks/downtown-cary-park/great-lawn.jpg",
  gathering: "/assets/parks/downtown-cary-park/gathering-house.png",
  courts: "/assets/parks/downtown-cary-park/park-street-courts.jpg",
  skywalk: "/assets/parks/downtown-cary-park/skywalk.jpg",
  frantz: "/assets/parks/downtown-cary-park/frantz-square.jpg",
};

const caryPlaces = [
  {
    slug: "the-nest", name: "The Nest", type: "playground", category: "Play & water",
    latitude: 35.7835706, longitude: -78.780128,
    description: "The signature family area combines two cardinal-shaped climbing structures, slides, toddler play, a splash pad, and an adjacent shaded picnic pavilion.",
    location: "The Nest is on the south side of the park beside Cary Regional Library and Guest Services. The closest practical approach is from Dry Avenue or the library parking deck.",
    parking: "Use the parking deck behind Cary Regional Library or the Academy Street deck. The Walker Street passenger drop-off is useful for families carrying water-play gear.",
    restrooms: "Restrooms are beside The Nest, with a larger restroom bank and family restroom inside Guest Services on the bottom floor of Cary Regional Library. The family restroom has an adult changing table.",
    hours: "The park is open 7 a.m.-11 p.m. The Nest splash pad operates seasonally, generally 9 a.m.-8 p.m., and closes the second Monday of each month for maintenance.",
    accessibility: "The play area includes accessible slides, age- and ability-specific zones, ramps, accessible surfacing, and a communication board. Main approaches are paved.",
    need: "Bring water shoes, dry clothes, and active supervision. The playground and splash pad share one busy area, surfaces can become hot, and water can close for weather or maintenance.",
    amenities: ["Cardinal climbing structures", "Slides", "Toddler play", "Splash pad", "Accessible play", "Shade pavilion", "Nearby family restroom"],
    source: "https://downtowncarypark.com/locations/the-nest",
    image: photo(caryExisting.nest, "Children climbing the cardinal play structures at The Nest"),
  },
  {
    slug: "academy-plaza", name: "Academy Pavilion & Plaza", type: "splash_pad", category: "Food, water & services",
    latitude: 35.78372, longitude: -78.78083,
    description: "A shaded arrival plaza with Academy Pavilion, Market 317, public restrooms, event space, seating, an overlook, and a seasonal sprayground.",
    location: "Academy Pavilion is on the southwest side of the park along South Academy Street, directly north of Frantz Square and west of the Great Lawn.",
    parking: "The Academy Street parking deck at 206 S. Academy Street is the closest large facility. Street spaces and the Cary Regional Library deck are also walkable.",
    restrooms: "Public restrooms are inside Academy Pavilion. Additional restroom areas are distributed around the park, including Guest Services near The Nest.",
    hours: "The plaza follows park hours, 7 a.m.-11 p.m. The sprayground generally runs seasonally 9 a.m.-8 p.m.; Market 317 is normally open daily 9 a.m.-6 p.m.",
    accessibility: "Academy Plaza is a paved, accessible arrival area with built-in ramps, tactile indicators, seating, and nearby restrooms.",
    need: "This is the best all-purpose meeting point for coffee, snacks, restrooms, shade, and water play. The park is cashless, including Market 317.",
    amenities: ["Seasonal sprayground", "Market 317", "Restrooms", "Shade", "Seating", "Event space", "Overlook"],
    source: "https://downtowncarypark.com/locations/academy-pavilion-plaza",
    image: photo(caryExisting.academy, "Sprayground at Academy Plaza in Downtown Cary Park"),
  },
  {
    slug: "barkyard", name: "Barkyard", type: "dog_area", category: "Dogs",
    latitude: 35.7844415, longitude: -78.7787647,
    description: "A pass-controlled off-leash dog park with separate small- and large-dog areas, tunnels, interactive water, turf, logs, mounds, hills, and shade.",
    location: "Barkyard fills the northeast corner of Downtown Cary Park along Walker Street, immediately beside The Bark Bar.",
    parking: "Use downtown public parking and enter from Walker Street or Park Street. There is no dedicated dog-park lot inside the seven-acre park.",
    restrooms: "The closest public restrooms are in Academy Pavilion or Guest Services near The Nest. Plan the restroom stop before entering the gated dog area.",
    hours: "Barkyard is normally accessible 7 a.m.-9 p.m. It closes for scheduled Wednesday maintenance and may close for weather, turf, or water-feature work.",
    hoursSchedule: dailySchedule("07:00", "21:00"),
    accessibility: "The entrance is on an accessible park route, but play terrain includes slopes, logs, turf, tunnels, and wet areas. Separate enclosures reduce size conflicts.",
    need: "A Cary dog-park membership or day pass is required. Bring proof of the pass, keep the leash on until inside the enclosure, and check maintenance closures before driving downtown.",
    amenities: ["Large-dog area", "Small-dog area", "Interactive water", "Tunnels", "Logs", "Turf", "Natural shade"],
    source: "https://downtowncarypark.com/locations/barkyard",
    image: photo(caryExisting.barkyard, "Dog visitors using the Barkyard tunnels and turf"),
  },
  {
    slug: "great-lawn-pavilion", name: "Great Lawn & Pavilion", type: "event_space", category: "Events & lawns",
    latitude: 35.7840204, longitude: -78.7801246,
    description: "The central lawn and performance pavilion host concerts, movies, yoga, festivals, picnics, and informal gatherings, with three fire-bowl terraces along the lawn.",
    location: "The Great Lawn is at the center of the park between Academy Plaza, The Nest, the Gathering Garden, and Willow Isle.",
    parking: "Any downtown deck works; the Academy Street deck is convenient from the west and the library deck is convenient from the south.",
    restrooms: "Academy Pavilion restrooms are west of the lawn. Guest Services and the larger restroom bank are south near The Nest.",
    hours: "The lawn follows park hours, 7 a.m.-11 p.m. Events, setup, wet turf, or rentals can limit normal lawn use.",
    accessibility: "Paved accessible paths ring the lawn and reach the pavilion. The central lawn is grass and may be soft after rain.",
    need: "Check the calendar before planning a quiet picnic. For concerts and movies, bring a low chair or blanket and expect nearby streets, parking, and lawn access to change.",
    amenities: ["Performance pavilion", "Event lawn", "Movies", "Concerts", "Fire bowls", "Picnic space", "Accessible perimeter paths"],
    source: "https://downtowncarypark.com/locations/great-lawn-pavilion",
    image: photo(caryExisting.lawn, "Families gathered on the Great Lawn at Downtown Cary Park"),
  },
  {
    slug: "gathering-house-garden", name: "Gathering House & Garden", type: "garden", category: "Gardens & quiet",
    latitude: 35.78455, longitude: -78.78015,
    description: "A quieter garden room and reservable indoor-outdoor house with 28 French doors, mature trees, layered plantings, and direct access to the botanical garden paths.",
    location: "The Gathering House is on the northwest side of the park, north of the Great Lawn and west of Park Street Courts.",
    parking: "The Academy Street deck and nearby downtown street parking provide the shortest west-side approach. Rental guests should follow their event-specific arrival instructions.",
    restrooms: "Restrooms are available in the Gathering House during staffed rentals. Public facilities are also at Academy Pavilion and Guest Services.",
    hours: "The surrounding garden follows park hours. The building is generally available through programs or reservations rather than as a continuously open visitor center.",
    accessibility: "Paved park paths reach the house and garden. The indoor-outdoor threshold and event layout can vary during rentals.",
    need: "This is a useful quieter alternative when the Great Lawn or playground is busy. A private rental can limit entry to the house or immediate event area.",
    amenities: ["Garden", "Indoor-outdoor room", "Mature trees", "Reservable venue", "Nearby botanical paths"],
    source: "https://downtowncarypark.com/locations/gathering-house",
    image: photo(caryExisting.gathering, "Gathering House and Garden at Downtown Cary Park"),
  },
  {
    slug: "park-street-courts", name: "Park Street Courts", type: "recreation", category: "Games & activity",
    latitude: 35.7847069, longitude: -78.7792662,
    description: "The active-recreation edge includes a flexible arena, putting green, table tennis, foosball, volleyball, bike parking, food trucks, and pop-up markets.",
    location: "Park Street Courts run along the north side of the park between the Gathering Garden and Barkyard.",
    parking: "Use public downtown decks or legal street parking, then enter from Park Street. Food-truck and market events can alter curb access.",
    restrooms: "The nearest dependable public restrooms are in Academy Pavilion to the southwest or Guest Services near The Nest.",
    hours: "The area generally follows park hours, but equipment, courts, and pop-up activities depend on programming, weather, and maintenance.",
    accessibility: "Main paths and game areas are built into the accessible park circulation network. Individual temporary activities can have different layouts.",
    need: "Free equipment is not guaranteed to be available at every moment. Check the calendar for programmed games, markets, food trucks, or court takeovers.",
    amenities: ["Flexible arena", "Putting green", "Table tennis", "Foosball", "Volleyball", "Bike parking", "Food-truck space"],
    source: "https://downtowncarypark.com/locations/park-street-courts",
    image: photo(caryExisting.courts, "Active recreation at Park Street Courts"),
  },
  {
    slug: "skywalk-light-passage", name: "Skywalk & Light Passage", type: "public_art", category: "Art & views",
    latitude: 35.7842396, longitude: -78.7793359,
    description: "An elevated walkway rises 17 feet into the eastern tree canopy and passes through Light Passage, a ring-shaped public artwork illuminated after dark.",
    location: "Skywalk crosses the eastern water garden between Willow Isle, the botanical garden, and the Walker Street edge.",
    parking: "The Cary Regional Library deck is the closest large south-side option. Enter near The Nest and follow the eastern paths toward the water feature.",
    restrooms: "Guest Services near The Nest is the closest major restroom location; Academy Pavilion is farther west.",
    hours: "Skywalk follows park hours, 7 a.m.-11 p.m. Lighting is most visible after dark, but storms, ice, or maintenance can affect access.",
    accessibility: "The elevated route is reached through the park's accessible path system. Visitors who avoid stairs should stay on the signed ramped approach.",
    need: "Visit once in daylight for canopy and water views and again after dark for Light Passage. Keep moving during crowded photo periods so the narrow route does not bottleneck.",
    amenities: ["Elevated walkway", "Canopy views", "Light Passage artwork", "Night lighting", "Accessible route"],
    source: "https://downtowncarypark.com/locations/skywalk",
    image: photo(caryExisting.skywalk, "Skywalk and Light Passage illuminated at night"),
  },
  {
    slug: "frantz-square", name: "Frantz Square", type: "public_art", category: "Art & gathering",
    latitude: 35.7833779, longitude: -78.7808592,
    description: "The Academy Street and Dry Avenue corner includes Cary's recognizable fountain, public art, shaded seating, and a multipurpose lawn for classes and small events.",
    location: "Frantz Square is the southwest corner of the park at South Academy Street and Dry Avenue, immediately south of Academy Pavilion.",
    parking: "The Academy Street deck is the closest large facility. Frantz Square is also a convenient first stop for visitors arriving from downtown on foot.",
    restrooms: "Academy Pavilion restrooms are directly north. Guest Services is east near The Nest.",
    hours: "The square follows park hours, 7 a.m.-11 p.m. Fountain appearance and small-event access can vary with maintenance and programming.",
    accessibility: "Paved, level routes connect the square to Academy Pavilion, The Nest, and the Great Lawn.",
    need: "This is an easy landmark and meeting point, especially at night when the fountain is lit. It is not the children's splash pad or Academy sprayground.",
    amenities: ["Fountain", "Public art", "Seating", "Small event lawn", "Night lighting"],
    source: "https://downtowncarypark.com/locations/frantz-square",
    image: photo(caryExisting.frantz, "Frantz Square fountain illuminated at night"),
  },
  {
    slug: "market-317", name: "Market 317", type: "food", category: "Food, water & services",
    latitude: 35.7837036, longitude: -78.780879,
    description: "A cashless grab-and-go market inside Academy Pavilion with meals, pastries, snacks, coffee drinks, beer, wine, cold drinks, merchandise, and North Carolina products.",
    location: "Market 317 is inside Academy Pavilion on South Academy Street, directly north of Frantz Square and west of the Great Lawn.",
    parking: "Use the Academy Street parking deck at 206 S. Academy Street for the shortest walk, or use nearby legal street parking.",
    restrooms: "Public restrooms are in the same Academy Pavilion building.",
    hours: "The official daily hours are 9 a.m.-6 p.m.; holidays, events, or operational notices can change service.",
    hoursSchedule: dailySchedule("09:00", "18:00"),
    accessibility: "The market is reached from the paved Academy Plaza and is within the accessible pavilion and restroom area.",
    need: "Market 317 is card and contactless payment only. Selection changes, but typically includes wraps, sandwiches, pastries, snacks, coffee, espresso drinks, beer, wine, soda, and water.",
    amenities: ["Grab-and-go meals", "Pastries", "Snacks", "Coffee", "Beer and wine", "Cold drinks", "Merchandise", "Restrooms"],
    source: "https://downtowncarypark.com/locations/market-317",
    image: photo("https://e1.nmcdn.io/carypark/wp-content/uploads/2023/06/Market317jpg.jpg/v:-dynamic:1-aspect:1-fit:cover-gravity:center/Market317jpg--600.webp", "Interior shelves and counter at Market 317"),
  },
  {
    slug: "bark-bar", name: "The Bark Bar", type: "food", category: "Food, water & services",
    latitude: 35.7846712, longitude: -78.7788822,
    description: "An open-air pavilion beside Barkyard serving beer, wine, nonalcoholic drinks, and light snacks under a covered undulating roof.",
    location: "The Bark Bar is on the northeast edge of the park along Walker Street, immediately beside Barkyard.",
    parking: "Use downtown public decks or legal street parking and enter from Walker Street or Park Street. There is no dedicated bar lot.",
    restrooms: "Public restrooms are at Academy Pavilion or Guest Services near The Nest. Barkyard users should plan a restroom stop before entering the dog area.",
    hours: "Weather-dependent hours are Monday-Thursday 4-9 p.m., Friday-Saturday noon-10 p.m., and Sunday noon-8 p.m. Contact Guest Services for same-day confirmation.",
    hoursSchedule: {
      sunday: [["12:00", "20:00"]], monday: [["16:00", "21:00"]],
      tuesday: [["16:00", "21:00"]], wednesday: [["16:00", "21:00"]],
      thursday: [["16:00", "21:00"]], friday: [["12:00", "22:00"]],
      saturday: [["12:00", "22:00"]],
    },
    accessibility: "The open-air counter and covered seating are on the park's accessible path network next to Barkyard.",
    need: "The bar can close for weather even while the park remains open. Dogs do not need to enter Barkyard to accompany visitors in permitted leashed areas; Barkyard itself requires a pass.",
    amenities: ["Beer", "Wine", "Nonalcoholic drinks", "Light snacks", "Covered seating", "Barkyard access"],
    source: "https://downtowncarypark.com/locations/the-bark-bar",
    image: photo("https://e1.nmcdn.io/carypark/wp-content/uploads/2023/12/TheBarkBar-scaled.jpg/v:-dynamic:1-aspect:1-fit:cover-gravity:center/TheBarkBar-scaled--600.webp", "Visitors and a dog relaxing at The Bark Bar"),
  },
  {
    slug: "tiered-water-feature-willow-isle", name: "Tiered Water Feature & Willow Isle", type: "garden", category: "Gardens & quiet",
    latitude: 35.78403, longitude: -78.77954,
    description: "A linked pond and stream landscape designed for stormwater quality and flood mitigation, with Willow Isle and the shaded L'ILE FOLIE public artwork in the lower pond.",
    location: "The water feature occupies the east-central park between the Great Lawn, botanical garden, Skywalk, and The Nest.",
    parking: "The Cary Regional Library deck offers the shortest south-side approach. Academy Street parking is convenient from the west.",
    restrooms: "Guest Services near The Nest is the closest major restroom area; Academy Pavilion restrooms are across the Great Lawn.",
    hours: "The public paths and Willow Isle follow park hours, 7 a.m.-11 p.m. Maintenance, storms, or high water can affect waterside routes.",
    accessibility: "Use the main paved paths, bridges, and signed routes. The narrow maintenance path at the water's edge is not the continuous public accessible route.",
    need: "This is a visual and ecological water feature, not a swimming or splash area. Use The Nest splash pad or Academy sprayground for water play.",
    amenities: ["Ponds", "Bridges", "Willow Isle", "L'ILE FOLIE artwork", "Shade", "Stormwater garden", "Skywalk views"],
    source: "https://downtowncarypark.com/locations/tiered-water-feature",
    image: photo("https://e1.nmcdn.io/carypark/wp-content/uploads/2023/06/Tieredwaterfeature-scaled.jpg/v:-dynamic:1-aspect:1-fit:cover-gravity:center/Tieredwaterfeature-scaled--600.webp", "Aerial view of the tiered water feature and Willow Isle"),
  },
];

const raleighImage = (file) => `https://raleighnc.gov/sites/default/files/${file}`;

const pullenPlaces = [
  {
    slug: "welcome-center", name: "Welcome Center & Tickets", type: "visitor_services", category: "Arrival & tickets",
    latitude: 35.7799079, longitude: -78.6619969,
    description: "The main arrival point for amusement tickets, ride information, daily operating updates, reservations, and the Junior Conductor Adventure.",
    location: "The Welcome Center is just inside the main Ashe Avenue entrance beside the cafe, event lawn, playground, and main amusement parking lot.",
    parking: "Use the main lot at 520 Ashe Avenue, including accessible spaces. Arrive early on weekends and event days because this is the primary visitor lot.",
    restrooms: "One of the park's two accessible public restroom locations is in the main amusement area near the Welcome Center.",
    hours: "Amusement hours are generally 10 a.m.-6 p.m. Monday-Thursday and 10 a.m.-8 p.m. Friday-Sunday in the current season. Ticket sales close 15 minutes before rides close.",
    hoursSchedule: rideSchedule,
    accessibility: "The main lot, Welcome Center, paved paths, and nearby restrooms are accessible. Staff can explain ride-specific boarding requirements.",
    need: "Buy $2 ride tickets online before arrival when possible. Cashiers may not always be available, ride operations can change daily, and the official ride-status phone is updated around 10:30 a.m.",
    amenities: ["Ride tickets", "Visitor information", "Junior Conductor Adventure", "Accessible parking", "Nearby restrooms", "Cafe"],
    source: PULLEN_AMUSEMENTS,
    image: photo(raleighImage("2022-02/pullen-park-entrance-sign.jpg"), "Pullen Park entrance sign and main arrival"),
  },
  {
    slug: "historic-carousel", name: "Gustave A. Dentzel Carousel", type: "amusement", category: "Rides",
    latitude: 35.7799572, longitude: -78.6637928,
    description: "The park's 1911 Dentzel carousel is listed in the National Register of Historic Places and includes carved animals, bench seating, and an accessible boarding option.",
    location: "The carousel pavilion is west of the playground and Welcome Center, beside Lake Howell and the miniature train loop.",
    parking: "Use the main Ashe Avenue lot and follow the amusement path west. The upper shelter parking is farther away and uphill.",
    restrooms: "Accessible public restrooms are in the main amusement area east of the carousel.",
    hours: "The carousel follows seasonal amusement hours and may pause for weather, maintenance, or special events.",
    hoursSchedule: rideSchedule,
    accessibility: "The carousel has a wheelchair-accessible option and bench seating. Riders under 42 inches need an accompanying adult, and both riders need tickets.",
    need: "Each rider needs one $2 ticket except children under one riding with a paying adult. Confirm same-day ride operations before promising a child that it will be running.",
    amenities: ["Historic carousel", "Carved animals", "Bench seating", "Wheelchair-accessible option", "Covered pavilion"],
    source: PULLEN_AMUSEMENTS,
    image: photo(raleighImage("2020-01/toddler-girl-carousel-pullen-park-christmas.jpg"), "Child riding the historic Pullen Park carousel"),
  },
  {
    slug: "miniature-train", name: "C.P. Huntington Miniature Train", type: "amusement", category: "Rides",
    latitude: 35.780014, longitude: -78.6623328,
    description: "A one-third-size C.P. Huntington miniature train circles the amusement area and Lake Howell, passing the playground, carousel, tunnel, and construction views.",
    location: "The train station is east of the carousel and beside the playground and kiddie boats in the main amusement area.",
    parking: "Use the main Ashe Avenue lot. The station is a short paved walk from the Welcome Center.",
    restrooms: "Accessible restrooms are near the Welcome Center and main amusement path.",
    hours: "The train follows seasonal ride hours and closes around sunset, so it may stop before the other attractions on shorter winter days.",
    hoursSchedule: rideSchedule,
    accessibility: "The train is wheelchair accessible. Riders under 42 inches need an accompanying adult, and both riders need tickets.",
    need: "The lake is drained during shoreline construction, so the ride currently offers construction views rather than its usual lake scenery. Each rider needs one $2 ticket.",
    amenities: ["Miniature train", "Accessible boarding", "Park loop", "Tunnel", "Lake and construction views"],
    source: PULLEN_AMUSEMENTS,
    image: photo(raleighImage("2020-01/girl-giving-ticket-conductor-boarding-pullen-train-parks.jpg"), "Child giving a ticket to the Pullen Park train conductor"),
    images: [photo(raleighImage("2019-11/train-tunnel-pullen-park-amusements.jpg"), "Pullen Park miniature train entering its tunnel", "tunnel")],
  },
  {
    slug: "kiddie-boats", name: "Kiddie Boats", type: "amusement", category: "Rides",
    latitude: 35.78023, longitude: -78.66227,
    description: "A small covered circular boat ride reserved for children between 30 and 54 inches tall, with individual boats inside a fenced operator-controlled area.",
    location: "Kiddie Boats are beside the miniature train station on the east side of the amusement area near the playground.",
    parking: "Use the main Ashe Avenue lot and follow the paved path past the Welcome Center toward the playground and train station.",
    restrooms: "Accessible restrooms are nearby in the main amusement area.",
    hours: "Kiddie Boats operate on limited seasonal days and hours. Check the current ride-status line before visiting specifically for this ride.",
    hoursSchedule: false,
    accessibility: "The queue is on the paved amusement route, but only riders between 30 and 54 inches may board and adults cannot ride with children.",
    need: "Measure uncertain riders before buying a ticket. One $2 ticket is required, and this ride is less consistently available than the carousel or train.",
    amenities: ["Children's boat ride", "Covered ride", "Operator-controlled enclosure"],
    source: PULLEN_AMUSEMENTS,
    image: photo(raleighImage("2020-01/empty-kiddie-boats-pullen-park.jpg"), "Kiddie Boats under their pavilion at Pullen Park"),
  },
  {
    slug: "lake-howell-pedal-boats", name: "Lake Howell & Pedal Boats", type: "water", category: "Lake & construction",
    latitude: 35.77972, longitude: -78.66445,
    description: "The historic park lake and pedal-boat area are undergoing shoreline reconstruction, with the lake drained and waterside paths, boats, island gazebo, and fountain terrace closed.",
    location: "Lake Howell occupies the southwest side of the amusement area inside the train loop, west of the carousel and playground.",
    parking: "Use the main Ashe Avenue lot. Construction fencing changes the closest walking route, so follow posted detours rather than heading directly toward the lake edge.",
    restrooms: "Use the main amusement restrooms near the Welcome Center before walking toward the construction boundary.",
    hours: "The lake edge remains closed during construction. Pedal boats are officially unavailable until spring 2027; the project is expected to continue through September 2026.",
    accessibility: "Construction removes the normal complete lakeside route. Use open paved detours and do not move barriers to reach the shore.",
    need: "Do not plan a pedal-boat outing or full lake loop in 2026. The carousel, train, playground, and main park areas remain the dependable family visit while the shoreline work continues.",
    amenities: ["Lake Howell", "Pedal boats - closed", "Island gazebo - closed", "Fountain terrace - closed", "Shoreline project"],
    source: "https://raleighnc.gov/projects/lake-howell-pullen-park",
    image: photo(raleighImage("2020-01/family-of-four-pedalboats-pullen-park-amusements.jpg"), "Family using a Pullen Park pedal boat before the Lake Howell project"),
  },
  {
    slug: "playgrounds", name: "Pullen Park Playgrounds", type: "playground", category: "Play",
    latitude: 35.7802058, longitude: -78.6624946,
    description: "Four connected play zones provide swings, school-age climbing and slides, sand and music play, and an enclosed preschool playground with shade and accessible elements.",
    location: "The playgrounds are in the main amusement area between the Welcome Center, train station, carousel, and aquatic center.",
    parking: "Use the main Ashe Avenue lot. The playground is one of the closest major destinations to the entrance, but weekend parking fills quickly.",
    restrooms: "Two accessible public restroom locations serve the park, including facilities in the main amusement area near the playground.",
    hours: "The playground follows park hours, 7 a.m.-9 p.m., unless maintenance, construction deliveries, weather, or events require a temporary closure.",
    accessibility: "Accessible elements include molded-bucket swings, two universally accessible slides, an accessible sand digger, and an accessible spring platform on paved approaches.",
    need: "Choose the age-appropriate zone before children scatter: preschool is enclosed, while swings, school-age climbing, and sand play are separate. Shade structures exist but do not cover every surface.",
    amenities: ["Swing area", "School-age climbing", "Accessible slides", "Sand play", "Music stage", "Enclosed preschool area", "Shade structures"],
    source: PULLEN_AMUSEMENTS,
    image: photo(raleighImage("2020-01/pullen-park-playground-climbing-net.jpg"), "Children climbing at Pullen Park Playground"),
  },
  {
    slug: "pullen-place-cafe", name: "Pullen Place Cafe", type: "food", category: "Food & visitor services",
    latitude: 35.77982, longitude: -78.66206,
    description: "The dedicated cafe building beside the Welcome Center has indoor service frontage and outdoor seating for park visitors.",
    location: "The cafe is inside the main Ashe Avenue entrance beside the Welcome Center, event lawn, and amusement parking lot.",
    parking: "Use the main park lot at 520 Ashe Avenue. The cafe is close enough to the entrance for a quick food stop without crossing the whole park.",
    restrooms: "Accessible public restrooms are nearby in the main amusement area.",
    hours: "Food service hours can differ from park and ride hours. Raleigh advertised for a new operator in 2026, so verify same-day service before relying on the cafe for a meal.",
    hoursSchedule: false,
    accessibility: "The cafe frontage, outdoor seating, Welcome Center, and restrooms are on the paved main arrival route.",
    need: "Treat the cafe as a convenient option, not a guaranteed meal plan during an operator transition. Pack water and a backup snack, especially with young children or dietary needs.",
    amenities: ["Cafe building", "Outdoor seating", "Nearby Welcome Center", "Nearby restrooms"],
    source: "https://raleighnc.gov/parks-and-recreation/news/bring-your-business-pullen-park",
    image: photo(raleighImage("2026-04/pullen-park.jpg"), "Pullen Park cafe exterior and outdoor service area"),
  },
  {
    slug: "amusement-landmarks", name: "Andy & Opie, Caboose & Children's Stage", type: "landmark", category: "Landmarks & history",
    latitude: 35.77998, longitude: -78.66282,
    description: "Three free landmarks cluster around the amusement area: the TV Land Andy and Opie statue, a Southern Railway caboose, and the children's amphitheater stage.",
    location: "The landmarks sit between the Welcome Center, playground, train station, carousel, and Lake Howell. Use the campus map because they are easy to walk past while following rides.",
    parking: "Use the main Ashe Avenue lot and enter through the Welcome Center area.",
    restrooms: "Accessible restrooms are in the nearby main amusement area.",
    hours: "The outdoor landmarks generally follow park hours, 7 a.m.-9 p.m. The caboose interior or event-stage access may be restricted outside programs.",
    accessibility: "Paved paths reach the statue, stage area, and exterior caboose viewpoint. Interior or event access can have separate restrictions.",
    need: "These are free photo and exploration stops that do not require ride tickets. The caboose becomes a special attraction during Holiday Express and may have event-specific queues.",
    amenities: ["Andy and Opie statue", "Southern Railway caboose", "Children's amphitheater", "Free photo stops"],
    source: PULLEN_AMUSEMENTS,
    image: photo("https://commons.wikimedia.org/wiki/Special:Redirect/file/Pullen_Park_Childrens_Railroad_Oct_2013_Southern_380_Caboose_-_panoramio.jpg", "Southern Railway caboose beside the Pullen Park children's railroad", "hero", { author: "Mikeiamunion21", license: "CC BY-SA 3.0", source: "https://commons.wikimedia.org/wiki/File:Pullen_Park_Childrens_Railroad_Oct_2013_Southern_380_Caboose_-_panoramio.jpg" }),
  },
  {
    slug: "petanque-bocce", name: "Petanque & Bocce Courts", type: "recreation", category: "Courts & games",
    latitude: 35.78147, longitude: -78.66315,
    description: "Free-to-use petanque and bocce courts in the upper shelter area, with reservable time and equipment available through the Welcome Center or kiosk.",
    location: "The courts are uphill from the amusement area near Shelters 3, 4, and 5 and the upper parking lot.",
    parking: "The upper lot is the closest option. The walk from the main amusement lot is uphill.",
    restrooms: "Restrooms are downhill in the main amusement area; plan before beginning a longer game or group reservation.",
    hours: "The outdoor courts generally follow park hours. Reservations take priority over walk-up play.",
    accessibility: "The upper area has nearby parking, but confirm the final path and court surface if anyone has mobility concerns.",
    need: "Walk-up use is free, while the current reservation rate is $7 per hour and includes equipment. Ask at the Welcome Center or kiosk rather than assuming equipment is unattended at the court.",
    amenities: ["Petanque courts", "Bocce courts", "Equipment rental", "Reservations", "Upper parking"],
    source: PULLEN_AMUSEMENTS,
    image: photo(raleighImage("2025-03/pullen-p%C3%A9tanque.jpg"), "Petanque boards and court area at Pullen Park"),
  },
  {
    slug: "upper-shelter-area", name: "Upper Shelter Area", type: "picnic", category: "Picnics & rentals",
    latitude: 35.78138, longitude: -78.66295,
    description: "Shelters 2 through 5 cluster on the hill by the upper parking lot, offering picnic tables, charcoal grills, capacities from 30 to 100, and nearby game courts.",
    location: "The upper shelters are north and uphill from the carousel and playground beside the upper lot. Shelters 3, 4, and 5 use the lot as their main landmark.",
    parking: "Use the upper parking lot when the shelter permit or event instructions allow. Do not unload in travel lanes or block reserved spaces.",
    restrooms: "The campus map places restrooms downhill near the main amusement area, so account for the walk when planning a group event.",
    hours: "Shelters follow the approved reservation period. General park hours are 7 a.m.-9 p.m., and reservations take priority over casual use.",
    accessibility: "Shelter 4 is beside the upper lot and has electrical outlets. Confirm the exact shelter route and table layout when booking for accessibility needs.",
    need: "Match the permit to the numbered shelter; they differ in capacity, table length, grills, electricity, hill position, and train proximity. Rental requests must be made at least two weeks ahead.",
    amenities: ["Shelters 2-5", "Picnic tables", "Charcoal grills", "Upper parking", "Shelter 4 electricity", "Nearby courts"],
    source: PULLEN_SOURCE,
    image: photo(raleighImage("2020-02/pullen-park-shelter-4.jpg"), "Circular Shelter 4 beside Pullen Park's upper parking lot"),
  },
  {
    slug: "carousel-pavilion-shelter-6", name: "Carousel Pavilion & Shelter 6", type: "picnic", category: "Picnics & rentals",
    latitude: 35.78019, longitude: -78.66358,
    description: "Two reservable picnic structures sit closest to the carousel: the powered Carousel Pavilion on its east side and Shelter 6 above the carousel on the hill.",
    location: "The Carousel Pavilion is immediately east of the carousel; Shelter 6 is uphill above it. Construction has closed the separate shelter adjacent to the carousel shoreline.",
    parking: "Use the main amusement lot and carry supplies along the paved path. Confirm event-specific unloading instructions with the rental permit.",
    restrooms: "Accessible restrooms are east in the main amusement area.",
    hours: "Access follows reservation terms and park hours. The shoreline-adjacent carousel shelter remains unavailable during the Lake Howell project.",
    accessibility: "The Carousel Pavilion is on the amusement path and has electricity. Shelter 6 is uphill, so verify the route for guests with mobility needs.",
    need: "Do not confuse the open Carousel Pavilion with the lake-adjacent shelter closed by construction. Your permit name and number determine the correct setup location.",
    amenities: ["Carousel Pavilion", "Shelter 6", "Picnic tables", "Electricity at pavilion", "Carousel views"],
    source: PULLEN_SOURCE,
    image: photo(raleighImage("2020-02/pullen-park-carousel-pavilion.jpg"), "Pullen Park Carousel Pavilion beside the historic ride"),
  },
  {
    slug: "event-lawn-stage", name: "Event Lawn & Stage", type: "event_space", category: "Events & lawns",
    latitude: 35.77965, longitude: -78.66245,
    description: "A reservable lawn and stage behind the ticket office for movies, fitness programs, festivals, performances, and events with approximately 100 to 500 people.",
    location: "The Event Lawn is behind the Welcome Center and ticket office near the main Ashe Avenue entrance and cafe.",
    parking: "Use the main lot unless the event listing provides alternate parking or road-closure instructions.",
    restrooms: "Accessible restrooms are nearby in the main amusement area.",
    hours: "Public access depends on the event and setup schedule. The surrounding park is open 7 a.m.-9 p.m.",
    accessibility: "Paved arrival routes reach the edge of the lawn. Seating is generally attendee-provided, and the central surface is grass.",
    need: "Check the live event listing before visiting because a movie, fitness class, performance, or rental can change noise, parking, and lawn access. Bring a low chair or blanket when the event permits.",
    amenities: ["Stage", "Event lawn", "Movies", "Fitness programs", "Power available by arrangement", "Nearby restrooms"],
    source: PULLEN_SOURCE,
    image: photo(raleighImage("2020-02/pullen-park-event-lawn-stage.jpg"), "Pullen Park Event Lawn and Stage"),
  },
  {
    slug: "aquatic-center", name: "Pullen Aquatic Center", type: "pool", category: "Campus facilities",
    latitude: 35.780718, longitude: -78.6618913,
    address: "410 Ashe Avenue",
    description: "A separate indoor aquatic facility with an Olympic-size pool, warm-water therapy pool, lap swimming, recreation, lessons, and its own admission and schedule.",
    location: "The Aquatic Center is northeast of the main amusement area on Ashe Avenue beside the Community Center.",
    parking: "Use the facility parking shown on the campus map, not a picnic-shelter space. Busy swim programs can fill the closest spaces.",
    restrooms: "Locker rooms and aquatic-facility restrooms are inside for admitted users; park restrooms remain separate.",
    hours: "The Aquatic Center has a separate daily program schedule and admission from the outdoor park. Check the current pool calendar before arriving.",
    hoursSchedule: false,
    accessibility: "Contact the aquatic center for current lift, therapy-pool, locker-room, and program accommodations. The building has its own accessible arrival route.",
    need: "This is not an outdoor splash pad and park admission does not include swimming. Verify the pool schedule, admission, lane availability, and any age rules before changing into swimwear.",
    amenities: ["Olympic pool", "Therapy pool", "Lap swimming", "Recreation swim", "Lessons", "Locker rooms"],
    source: "https://raleighnc.gov/parks-and-recreation/places/pullen-aquatic-center",
    image: photo(raleighImage("2020-01/baby-parents-pool-wide-pullen-aquatics-center-parks.jpg"), "Family using the warm-water pool at Pullen Aquatic Center"),
  },
  {
    slug: "community-center", name: "Pullen Community Center", type: "community_center", category: "Campus facilities",
    latitude: 35.7805952, longitude: -78.661123,
    address: "408 Ashe Avenue",
    description: "A staffed community building with classes, programs, meeting rooms, a large hall, warming kitchen, and the Georges Le Chevallier 'Everyone is welcome' mural.",
    location: "The Community Center is on the east side of Ashe Avenue circulation beside the Aquatic Center and east of the amusement area.",
    parking: "Use the center's nearby campus parking rather than the distant upper shelter lot.",
    restrooms: "Building restrooms are available during center hours and programs; outdoor park restrooms follow separate hours.",
    hours: "Current hours are Monday-Friday 10 a.m.-9 p.m., Saturday 9 a.m.-3 p.m., and Sunday closed.",
    hoursSchedule: {
      sunday: [], monday: [["10:00", "21:00"]], tuesday: [["10:00", "21:00"]],
      wednesday: [["10:00", "21:00"]], thursday: [["10:00", "21:00"]],
      friday: [["10:00", "21:00"]], saturday: [["09:00", "15:00"]],
    },
    accessibility: "Contact the center for program modifications and room-specific access. Main public approaches are on the developed campus route.",
    need: "The building is a program and rental destination, not a general indoor lounge for amusement visitors. Confirm the class, reservation, or public-hours purpose before walking over.",
    amenities: ["Programs", "Meeting rooms", "Large hall", "Warming kitchen", "Public art mural", "Rentals"],
    source: "https://raleighnc.gov/parks-and-recreation/places/pullen-park-community-center",
    image: photo(raleighImage("2020-01/pullen-park-community-center-exterior-parks.jpg"), "Brick exterior of Pullen Community Center"),
  },
  {
    slug: "arts-center", name: "Pullen Arts Center", type: "arts_center", category: "Campus facilities",
    latitude: 35.785016, longitude: -78.6629266,
    description: "A renovated community visual-arts education facility with studios, classrooms, exhibition space, professional teaching artists, and year-round classes for many ages and skill levels.",
    location: "The Arts Center is in the far north part of Pullen Park across the rail corridor, reached by the signed orange path from the main park or directly from Pullen Road.",
    parking: "Use the Arts Center's northern parking area when attending a class or exhibition. It is not a practical parking substitute for the amusement area.",
    restrooms: "Building facilities are available during Arts Center hours and programs.",
    hours: "Hours follow the current arts class, exhibition, and building schedule rather than the amusement ride calendar.",
    hoursSchedule: false,
    accessibility: "The renovated building and program spaces support arts participation; contact Raleigh Arts for class-specific modifications and equipment needs.",
    need: "The railway separates this facility from the family rides. Follow the designated path and allow extra walking time if combining an arts visit with the amusement area.",
    amenities: ["Art studios", "Classrooms", "Exhibitions", "Year-round classes", "Teaching artists", "Dedicated parking"],
    source: "https://raleighnc.gov/arts/services/arts-centers",
    image: photo(raleighImage("2021-08/Pullen-Arts-Center-exterior.jpg"), "Renovated exterior of Pullen Arts Center"),
  },
  {
    slug: "theatre-in-the-park", name: "Theatre In The Park", type: "theater", category: "Campus facilities",
    latitude: 35.78452, longitude: -78.66165,
    description: "A producing community theatre at the north end of Pullen Park with its own performances, ticketing, lobby, and event schedule.",
    location: "The theatre is in the northern campus east of the Arts Center and across the rail corridor from the main amusement area.",
    parking: "Use the northern theatre parking shown on the campus map and follow performance-specific arrival instructions.",
    restrooms: "Indoor patron restrooms are available during performances and theatre events.",
    hours: "The building opens according to its box-office, performance, rehearsal, and event schedule rather than general park hours.",
    hoursSchedule: false,
    accessibility: "Contact the theatre when purchasing tickets for current accessible seating, entrance, and performance accommodations.",
    need: "This is a separately operated ticketed venue inside the park campus. A park visit does not provide theatre admission, and evening performance traffic differs from daytime amusement traffic.",
    amenities: ["Live theatre", "Ticketed performances", "Lobby", "Patron restrooms", "Northern parking"],
    source: "https://raleighnc.gov/parks-and-recreation/places/pullen-park",
    image: photo("https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Theatre_in_Pullen_Park.jpg/1920px-Theatre_in_Pullen_Park.jpg", "Theatre In The Park building in Pullen Park", "hero", { author: "Pithon314", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Theatre_in_Pullen_Park.jpg" }),
  },
];

const campaigns = [
  {
    parkId: "downtown-cary-park",
    cityLabel: "Cary",
    sourceLabel: "Downtown Cary Park / Town of Cary",
    mapUrl: CARY_MAP,
    hoursSchedule: dailySchedule("07:00", "23:00"),
    places: caryPlaces,
    parentSummary: "Downtown Cary Park is a compact seven-acre destination where play, water, gardens, food, dog recreation, public art, and more than 750 annual programs fit into linked outdoor rooms. The most useful visit starts by choosing the exact room, its operating schedule, and the closest downtown parking deck.",
    parentDescription: "A sourced guide to every major Downtown Cary Park area, including The Nest, both water-play features, Barkyard, Bark Bar, Market 317, parking, restrooms, events, gardens, Skywalk, accessibility, and exact map pins.",
    amenities: ["The Nest playground", "Splash pad", "Sprayground", "Barkyard", "Bark Bar", "Market 317", "Great Lawn", "Skywalk", "Tiered water feature", "Public art", "Restrooms", "Gardens"],
    parentAnswers: [
      answer("food-drink", "Where can I get food, coffee, beer, or wine at Downtown Cary Park?", "Market 317 inside Academy Pavilion is the dependable daily grab-and-go stop, normally 9 a.m.-6 p.m., with meals, snacks, pastries, coffee, beer, wine, and cold drinks. The weather-dependent Bark Bar serves beer, wine, nonalcoholic drinks, and light snacks on afternoon and evening hours beside Barkyard. Both are cashless.", "https://downtowncarypark.com/about-2/faq", "Downtown Cary Park"),
      answer("events", "What events are coming up at Downtown Cary Park?", "AuditMap's Today section should be checked with the official park calendar before arrival. Downtown Cary Park hosts more than 750 annual programs, including CaryLIVE concerts, movies, markets, fitness, story times, art programs, and signature events that can change lawn access and parking.", "https://downtowncarypark.com/calendar", "Downtown Cary Park"),
      answer("cashless", "Can I pay with cash at Downtown Cary Park?", "No. Market 317, The Bark Bar, and Guest Services are card and contactless payment only. Bring a physical card or supported mobile wallet rather than relying on cash.", "https://downtowncarypark.com/about-2/faq", "Downtown Cary Park"),
      answer("weather", "How does weather affect Downtown Cary Park?", "The splash pad, sprayground, Bark Bar, events, and some active areas can close for weather. Official group guidance says lightning within 10 miles suspends activities, with a 30-minute all-clear period after nearby lightning ends. Check the live NWS panel and park notices before relying on water play or outdoor programming.", "https://downtowncarypark.com/wp-content/uploads/2023/11/Groups-Guidelines.pdf", "Downtown Cary Park"),
      answer("visitor-services", "Where is Guest Services at Downtown Cary Park?", "Guest Services is on the bottom floor of Cary Regional Library near The Nest. It handles lost and found, dog-park passes, accessibility support, and visitor questions; the nearby family restroom includes an adult changing table. Call 919-653-7180 for same-day help.", "https://downtowncarypark.com/about-2/faq", "Downtown Cary Park"),
    ],
  },
  {
    parkId: "pullen-park",
    cityLabel: "Raleigh",
    sourceLabel: "Raleigh Parks / City of Raleigh",
    mapUrl: PULLEN_MAP,
    hoursSchedule: dailySchedule("07:00", "21:00"),
    places: pullenPlaces,
    parentSummary: "Pullen Park is a 66.4-acre campus combining one of the country's oldest operating amusement parks with a historic carousel, miniature train, layered playgrounds, shelters, indoor swimming, arts, theatre, sports, and community programs. In 2026 the dependable family core is open while Lake Howell, pedal boats, and shoreline paths remain under construction.",
    parentDescription: "The complete sourced guide to Pullen Park parking, ride tickets and hours, carousel, train, kiddie boats, playgrounds, Lake Howell closures, cafe, shelters, restrooms, accessibility, campus buildings, events, and exact destination pins.",
    amenities: ["Historic carousel", "Miniature train", "Kiddie boats", "Playgrounds", "Lake Howell", "Aquatic center", "Arts center", "Community center", "Theatre", "Picnic shelters", "Cafe", "Restrooms", "Petanque and bocce"],
    parentAnswers: [
      answer("daily-ride-status", "How do I check which Pullen Park rides are running today?", "Call the official ride-status line at 919-996-6472 after about 10:30 a.m. Ride hours vary by season, the train closes around sunset, Kiddie Boats have limited days and hours, and weather or maintenance can change operations after the schedule is posted.", PULLEN_AMUSEMENTS, "Raleigh Parks"),
      answer("food-drink", "Can I buy food at Pullen Park?", "The City lists Pullen Place Cafe beside the Welcome Center, but Raleigh sought a new cafe operator in 2026, so same-day service and menu availability should be confirmed before relying on it. Pack water and a backup snack for young children or dietary needs.", "https://raleighnc.gov/parks-and-recreation/news/bring-your-business-pullen-park", "City of Raleigh"),
      answer("events", "What events are coming up at Pullen Park?", "AuditMap's Today section uses the current City of Raleigh event feed. Fitness programs, movies, Holiday Express, and other events can change parking, ride access, stage use, and crowd levels, so open the official event entry before leaving.", PULLEN_AMUSEMENTS, "Raleigh Parks"),
      answer("lake-project", "When will Lake Howell and the pedal boats reopen?", "The City says pedal boats will be unavailable until spring 2027. The lake is drained and the shoreline paths, island gazebo, fountain terrace, and the shelter beside the carousel remain closed during construction expected through September 2026.", "https://raleighnc.gov/projects/lake-howell-pullen-park", "City of Raleigh"),
      answer("weather", "How does weather affect Pullen Park rides?", "Ride operations can pause or end early for rain, lightning, wind, heat, darkness, or maintenance even when the outdoor park remains open. Use the live National Weather Service panel, then call the ride-status line for the park's operating decision.", PULLEN_AMUSEMENTS, "Raleigh Parks"),
    ],
  },
];

function searchAnswers(item, campaign) {
  const label = item.name;
  return [
    answer("location", `Where is ${label} in ${campaign.parkId === "pullen-park" ? "Pullen Park" : "Downtown Cary Park"}?`, item.location, item.source, campaign.sourceLabel),
    answer("parking", `Where should I park for ${label}?`, item.parking, item.source, campaign.sourceLabel),
    answer("restroom", `Where are the nearest restrooms to ${label}?`, item.restrooms, item.source, campaign.sourceLabel),
    answer("hours", `When can I visit ${label}?`, item.hours, item.source, campaign.sourceLabel),
    answer("accessibility", `What accessibility details should I know about ${label}?`, item.accessibility, item.source, campaign.sourceLabel),
    answer("need-to-know", `What should I know before visiting ${label}?`, item.need, item.source, campaign.sourceLabel),
  ];
}

function localImagePath(campaign, item, asset, index) {
  if (asset.remote.startsWith("/")) return asset.remote;
  const suffix = asset.name || (index === 0 ? "hero" : `photo-${index + 1}`);
  return `/assets/parks/${campaign.parkId}/flagship/${item.slug}/${suffix}.webp`;
}

function buildFeature(campaign, item, existingBySlug) {
  const assets = [item.image, ...(item.images || [])].filter(Boolean);
  const localAssets = assets.map((asset, index) => ({
    url: localImagePath(campaign, item, asset, index),
    source: asset.source || item.source,
    author: asset.author || campaign.sourceLabel,
    license: asset.license || "Official municipal park source; attribution retained",
    alt: asset.alt,
    latitude: Number.isFinite(asset.latitude) ? asset.latitude : item.latitude,
    longitude: Number.isFinite(asset.longitude) ? asset.longitude : item.longitude,
    featureId: existingBySlug.get(item.slug)?.id || stableUuid(campaign.parkId, item.slug),
  }));
  const existing = existingBySlug.get(item.slug);
  const id = existing?.id || stableUuid(campaign.parkId, item.slug);
  localAssets.forEach((asset) => { asset.featureId = id; });
  return {
    id,
    slug: item.slug,
    name: item.name,
    feature_type: item.type,
    description: item.description,
    latitude: item.latitude,
    longitude: item.longitude,
    details: {
      category: item.category,
      includeInParentGallery: true,
      positionQuality: "Official map cross-checked with public location data",
      officialMapUrl: campaign.mapUrl,
      address: item.address || (campaign.parkId === "pullen-park" ? "Pullen Park" : "Downtown Cary Park"),
      hours: item.hours,
      hoursSchedule: item.hoursSchedule === false
        ? false
        : item.hoursSchedule || campaign.hoursSchedule || null,
      cost: item.cost || "Free general access; rides, food, programs, rentals, passes, or ticketed events may cost extra.",
      accessibility: item.accessibility,
      amenities: item.amenities,
      locationContext: item.location,
      needToKnow: item.need,
      informationSourceLabel: campaign.sourceLabel,
      informationSourceUrl: item.source,
      informationCheckedAt: checkedAt,
      imageUrl: localAssets[0]?.url,
      imageSourceUrl: localAssets[0]?.source,
      imageAuthor: localAssets[0]?.author,
      imageLicense: localAssets[0]?.license,
      imageAlt: localAssets[0]?.alt,
      images: localAssets.slice(1),
      searchAnswers: searchAnswers(item, campaign),
    },
    source_label: campaign.sourceLabel,
    source_url: item.source,
    verified_at: checkedAt,
  };
}

async function downloadAsset(campaign, item, asset, index) {
  if (!asset || asset.remote.startsWith("/")) return;
  const publicPath = localImagePath(campaign, item, asset, index);
  const destination = path.join(root, publicPath.replace(/^\//, ""));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (fs.existsSync(destination)) return;
  const response = await fetch(asset.remote, {
    headers: { "User-Agent": "AuditMap enrichment (https://www.auditmap.org)" },
    redirect: "follow",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`${response.status} downloading ${asset.remote}`);
  const input = Buffer.from(await response.arrayBuffer());
  await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 1100, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(destination);
  console.log(`Downloaded ${publicPath}`);
}

async function main() {
  if (downloadImages) {
    for (const campaign of campaigns) {
      for (const item of campaign.places) {
        const assets = [item.image, ...(item.images || [])].filter(Boolean);
        for (let index = 0; index < assets.length; index += 1) {
          await downloadAsset(campaign, item, assets[index], index);
        }
      }
    }
  }

  const records = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  for (const campaign of campaigns) {
    const park = records.find((record) => record.id === campaign.parkId);
    if (!park) throw new Error(`${campaign.parkId} record was not found.`);
    const existingBySlug = new Map((park.features || []).map((feature) => [feature.slug, feature]));
    park.verifiedAt = checkedAt;
    park.summary = campaign.parentSummary;
    park.searchDescription = campaign.parentDescription;
    park.hoursSchedule = campaign.hoursSchedule;
    park.amenities = campaign.amenities;
    park.factSources = {
      ...(park.factSources || {}),
      address: { label: campaign.sourceLabel, url: park.source, checkedAt },
      amenities: { label: campaign.sourceLabel, url: campaign.mapUrl, checkedAt },
    };
    const answerKeys = new Set(campaign.parentAnswers.map((item) => item.intentKey));
    park.searchAnswers = [
      ...(park.searchAnswers || []).filter((item) => !answerKeys.has(item.intentKey)),
      ...campaign.parentAnswers,
    ];
    park.features = campaign.places.map((item) => buildFeature(campaign, item, existingBySlug));
    const parentPhotos = park.features.slice(0, 3).map((feature) => ({
      url: feature.details.imageUrl,
      source: feature.details.imageSourceUrl,
      author: feature.details.imageAuthor,
      license: feature.details.imageLicense,
      alt: feature.details.imageAlt,
      latitude: feature.latitude,
      longitude: feature.longitude,
      featureId: feature.id,
    }));
    park.image = parentPhotos[0];
    park.images = parentPhotos;
    console.log(`Updated ${park.name} with ${park.features.length} mapped destinations and ${park.searchAnswers.length} parent answers.`);
  }

  fs.writeFileSync(dataPath, `${JSON.stringify(records, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
