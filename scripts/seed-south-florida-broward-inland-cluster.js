#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const checkedAt = "2026-08-10";
const files = {
  national: path.join(root, "data/parent-park-information-enrichment-national.json"),
  campaign: path.join(root, "data/parent-park-information-enrichment-campaign.json"),
  locations: path.join(root, "data/launch-location-overrides.json"),
  superCampaign: path.join(root, "data/south-florida-atlantic-super-enrichment-campaign.json"),
  photos: path.join(root, "data/south-florida-atlantic-photo-selections.json"),
  features: path.join(root, "data/south-florida-atlantic-feature-selections.json"),
  addresses: path.join(root, "data/south-florida-atlantic-addresses.json"),
};
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

function answer(intentKey, question, text, source, sourceLabel) {
  return { intentKey, question, answer: text, sourceLabel, source, sourceType: "official", checkedAt };
}

const sources = {
  general: "https://www.broward.org/Parks/Pages/GeneralInformation.aspx",
  directory: "https://www.broward.org/atyourservice/Pages/parks.htm",
  passports: "https://www.broward.org/Parks/Pages/ParkPassports.aspx",
  freeGateDays: "https://www.broward.org/Parks/Pages/FreeGateEntranceDays.aspx",
  splash: "https://www.broward.org/Parks/ThingsToDo/Pages/SplashAdventure.aspx",
  camping: "https://www.broward.org/parks/camping/Pages/default.aspx",
  campingRules: "https://www.broward.org/Parks/Camping/Pages/CampgroundRules.aspx",
  bicycling: "https://www.broward.org/Parks/ThingsToDo/Pages/Bicycling.aspx",
  dogParks: "https://www.broward.org/Parks/ThingsToDo/Pages/DogParks.aspx",
  fishing: "https://www.broward.org/Parks/ThingsToDo/Pages/Fishing.aspx",
  discGolf: "https://www.broward.org/Parks/ThingsToDo/Pages/DiscGolf.aspx",
  playgrounds: "https://www.broward.org/Parks/ThingsToDo/Pages/Playgrounds.aspx",
  boating: "https://www.broward.org/Parks/ThingsToDo/Pages/Boating.aspx",
  summerFun: "https://www.broward.org/Parks/ThingsToDo/Pages/SummerFun.aspx",
  sports: "https://www.broward.org/Parks/ThingsToDo/Pages/Sports.aspx",
  velodrome: "https://www.broward.org/Parks/ThingsToDo/Pages/velodrome.aspx",
  brianBrief: "https://www.broward.org/Parks/Support/Documents/BrianPiccoloInfo.pdf",
  lightning: "https://www.broward.org/Parks/safety/Pages/LightningPredictionSystems.aspx",
};

const ids = {
  quiet: "launch-fl-deerfield-beach-quiet-waters-park",
  brian: "launch-fl-cooper-city-brian-piccolo-sports-park-velodrome",
};
const legacyIds = ["launch-fl-cooper-city-brian-piccolo-sports-park-and-velodrome"];

const campaignPlaces = [
  {
    id: ids.quiet,
    name: "Quiet Waters Park",
    city: "Deerfield Beach",
    state: "FL",
    citySlug: "deerfield-beach-fl",
    operator: "Broward County Parks and Recreation",
    source: sources.splash,
    featureResearchRadiusMeters: 2600,
    minimumImages: 4,
    imageQueries: ["Quiet Waters Park", "Quiet Waters Splash Adventure", "Quiet Waters Ski Rixen"],
    subsites: ["Splash Adventure", "Ski Rixen USA Cable Park", "Woofing Waters Dog Park", "Quiet Waters Campground", "Mountain Bike Trails", "Lakeview Marina"],
  },
  {
    id: ids.brian,
    name: "Brian Piccolo Sports Park & Velodrome",
    city: "Cooper City",
    state: "FL",
    citySlug: "cooper-city-fl",
    operator: "Broward County Parks and Recreation",
    source: sources.brianBrief,
    featureResearchRadiusMeters: 1800,
    minimumImages: 4,
    imageQueries: ["Brian Piccolo Sports Park", "Brian Piccolo Park Velodrome", "Brian Piccolo inline skating"],
    subsites: ["Brian Piccolo Park Velodrome", "Road Course", "Cricket Fields", "Disc Golf Course", "Playground", "Baseball and Softball Complex"],
  },
];

const imageSelections = {
  [ids.quiet]: {
    name: "Quiet Waters Park",
    candidates: [
      {
        title: "Quiet-waters-splash",
        url: "https://upload.wikimedia.org/wikipedia/commons/b/b9/Quiet-waters-splash.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Quiet-waters-splash.jpg",
        creator: "Dtobias",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:Dtobias",
        license: "BY-SA",
        licenseVersion: "4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        width: 3072,
        height: 2304,
        provider: "wikimedia",
        query: "Quiet Waters Splash Adventure",
        reviewStatus: "approved-destination-match",
        reviewNote: "The title identifies Quiet Waters and visual review shows the signed Splash Adventure entrance and aquatic play area.",
        alt: "Signed entrance and water-play area at Splash Adventure in Quiet Waters Park",
        reviewedAt: checkedAt,
      },
      {
        title: "Flying over the lake, Quiet Waters Park, Deerfield, Florida - panoramio",
        url: "https://upload.wikimedia.org/wikipedia/commons/6/6e/Flying_over_the_lake%2C_Quiet_Waters_Park%2C_Deerfield%2C_Florida_-_panoramio.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Flying_over_the_lake,_Quiet_Waters_Park,_Deerfield,_Florida_-_panoramio.jpg",
        creator: "Richard Mc Neil",
        creatorUrl: "https://commons.wikimedia.org/wiki/File:Flying_over_the_lake,_Quiet_Waters_Park,_Deerfield,_Florida_-_panoramio.jpg",
        license: "BY",
        licenseVersion: "3.0",
        licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
        width: 3207,
        height: 1767,
        provider: "wikimedia",
        query: "Quiet Waters Ski Rixen",
        reviewStatus: "approved-exact-geotagged-destination-match",
        reviewNote: "The exact geotag and title identify Ski Rixen at Quiet Waters Park; visual review shows an active cable wakeboard run.",
        alt: "Wakeboarder airborne on the Ski Rixen cable course at Quiet Waters Park",
        reviewedAt: checkedAt,
      },
      {
        title: "Cable skying on the lake in Quiet Waters Park, Deerfield Beach, Florida, USA - panoramio",
        url: "https://upload.wikimedia.org/wikipedia/commons/8/87/Cable_skying_on_the_lake_in_Quiet_Waters_Park%2C_Deerfield_Beach%2C_Florida%2C_USA_-_panoramio.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Cable_skying_on_the_lake_in_Quiet_Waters_Park,_Deerfield_Beach,_Florida,_USA_-_panoramio.jpg",
        creator: "Richard Mc Neil",
        creatorUrl: "https://commons.wikimedia.org/wiki/File:Cable_skying_on_the_lake_in_Quiet_Waters_Park,_Deerfield_Beach,_Florida,_USA_-_panoramio.jpg",
        license: "BY",
        licenseVersion: "3.0",
        licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
        width: 3743,
        height: 2307,
        provider: "wikimedia",
        query: "Quiet Waters cable skiing",
        reviewStatus: "approved-exact-geotagged-destination-match",
        reviewNote: "The exact geotag, title, and visual review identify an active cable-skiing run on the Ski Rixen lake.",
        alt: "Cable skier carving across the Ski Rixen lake at Quiet Waters Park",
        reviewedAt: checkedAt,
      },
      {
        title: "Quiet-waters-ski",
        url: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Quiet-waters-ski.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Quiet-waters-ski.jpg",
        creator: "Dtobias",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:Dtobias",
        license: "BY-SA",
        licenseVersion: "4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        width: 3072,
        height: 2304,
        provider: "wikimedia",
        query: "Quiet Waters Ski Rixen",
        reviewStatus: "approved-destination-match",
        reviewNote: "The title identifies Quiet Waters and visual review clearly shows the Ski Rixen USA cable course and riders.",
        alt: "Cable wakeboarders on the Ski Rixen USA course at Quiet Waters Park",
        reviewedAt: checkedAt,
      },
    ],
  },
  [ids.brian]: {
    name: "Brian Piccolo Sports Park & Velodrome",
    candidates: [
      {
        title: "Brian piccolo park canal",
        url: "https://upload.wikimedia.org/wikipedia/commons/0/0e/Brian_piccolo_park_canal_%2814104379547%29.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Brian_piccolo_park_canal_(14104379547).jpg",
        creator: "Russ",
        creatorUrl: "https://www.flickr.com/people/81751903@N08",
        license: "BY",
        licenseVersion: "2.0",
        licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
        width: 5472,
        height: 3648,
        provider: "wikimedia",
        query: "Brian Piccolo Sports Park",
        reviewStatus: "approved-destination-match",
        reviewNote: "The title identifies Brian Piccolo Park and visual review shows a broad canal and wooded shoreline within the sports complex.",
        alt: "Calm canal and wooded shoreline at Brian Piccolo Sports Park",
        reviewedAt: checkedAt,
      },
      {
        title: "Brian Piccolo Park Velodrome IMG 0450",
        url: "https://upload.wikimedia.org/wikipedia/commons/1/10/Brian_Piccolo_Park_Velodrome_IMG_0450_%284106218279%29.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Brian_Piccolo_Park_Velodrome_IMG_0450_(4106218279).jpg",
        creator: "Lenny",
        creatorUrl: "https://www.flickr.com/people/8068061@N03",
        license: "BY-SA",
        licenseVersion: "2.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
        width: 3264,
        height: 2448,
        provider: "wikimedia",
        query: "Brian Piccolo Park Velodrome",
        reviewStatus: "approved-destination-match",
        reviewNote: "The exact title and visual review identify an inline-skating race on the banked Brian Piccolo Park Velodrome.",
        alt: "Inline speed skaters racing around the banked Brian Piccolo Park Velodrome",
        reviewedAt: checkedAt,
      },
      {
        title: "Brian Piccolo Park Velodrome IMG 0439",
        url: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Brian_Piccolo_Park_Velodrome_IMG_0439_%284106210769%29.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Brian_Piccolo_Park_Velodrome_IMG_0439_(4106210769).jpg",
        creator: "Lenny",
        creatorUrl: "https://www.flickr.com/people/8068061@N03",
        license: "BY-SA",
        licenseVersion: "2.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
        width: 3264,
        height: 2448,
        provider: "wikimedia",
        query: "Brian Piccolo Park Velodrome",
        reviewStatus: "approved-destination-match",
        reviewNote: "The exact title and visual review identify skaters preparing on the recreational track below the competitive bank.",
        alt: "Skaters preparing on the lower track at Brian Piccolo Park Velodrome",
        reviewedAt: checkedAt,
      },
      {
        title: "Brian Piccolo Park Velodrome IMG 0469",
        url: "https://upload.wikimedia.org/wikipedia/commons/3/31/Brian_Piccolo_Park_Velodrome_IMG_0469_%284106997368%29.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Brian_Piccolo_Park_Velodrome_IMG_0469_(4106997368).jpg",
        creator: "Lenny",
        creatorUrl: "https://www.flickr.com/people/8068061@N03",
        license: "BY-SA",
        licenseVersion: "2.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
        width: 3264,
        height: 2448,
        provider: "wikimedia",
        query: "Brian Piccolo inline skating",
        reviewStatus: "approved-destination-match",
        reviewNote: "The exact title and visual review identify a line of inline skaters using the Brian Piccolo Park Velodrome in evening light.",
        alt: "Line of inline speed skaters at Brian Piccolo Park Velodrome near sunset",
        reviewedAt: checkedAt,
      },
    ],
  },
};

const featureSelections = {
  [ids.quiet]: [
    {
      name: "Splash Adventure",
      address: "401 S Powerline Rd, Deerfield Beach, FL 33442",
      latitude: 26.3060506,
      longitude: -80.1581114,
      coordinateSource: "https://www.openstreetmap.org/way/462183962",
      officialMapSource: sources.splash,
      positionQuality: "reviewed-named-destination-footprint-centroid",
      imageIndex: 0,
      checkedAt,
      sourceLabel: "Broward County Parks and Recreation",
      source: sources.splash,
      summary: "Splash Adventure is Quiet Waters Park's shallow interactive children's water playground, with slides, tunnels, spray controls, water curtains, and a tipping bucket in water ranging from zero to 12 inches deep.",
      cost: "2026 admission is $6 per person or $4.40 after 3:00 p.m.; children under one enter free. Weekend and holiday park gate fees, rentals, and concessions cost separately.",
      hours: "For the 2026 season, hours are 10:00 a.m. to 4:30 p.m. weekdays and 10:00 a.m. to 5:00 p.m. weekends and holidays. It is open daily through August 9, then weekends through September 27, plus Labor Day; verify before travel.",
      needToKnow: "Children 12 and under need an adult age 18 or older, and children five and under must remain within arm's reach. Use proper swimwear and waterproof diapers, shower before entering, and expect weather closures. Dogs, glass, alcohol, toys, outside pizza, and pop-up shade structures are prohibited.",
      answerSources: {
        parking: { source: sources.splash, sourceLabel: "Broward County Parks and Recreation" },
        restroom: { source: sources.splash, sourceLabel: "Broward County Parks and Recreation" },
        accessibility: { source: sources.splash, sourceLabel: "Broward County Parks and Recreation" },
        dogs: { source: sources.splash, sourceLabel: "Broward County Parks and Recreation" },
        family: { source: sources.splash, sourceLabel: "Broward County Parks and Recreation" },
        fees: { source: sources.splash, sourceLabel: "Broward County Parks and Recreation" },
      },
      answers: {
        parking: "Enter Quiet Waters Park at 401 South Powerline Road and follow signs to Splash Adventure. On weekends and holidays, pay the park gate fee before the separate water-park admission; arrive early on busy summer days because entry and nearby parking can fill.",
        restroom: "Changing and restroom use is built into the water-park visit, and diaper changing is allowed only in restrooms. Use the facilities before entering the play area and shower before water use as required by the posted rules.",
        accessibility: "The zero-depth edge and two communication boards support a wider range of visitors, and U.S. Coast Guard-approved life vests are allowed and available on request. Contact the park before travel for a specific transfer, aquatic-chair, sensory, or communication accommodation.",
        dogs: "Dogs and other pets are not allowed inside Splash Adventure. Use the separate Woofing Waters facility for an off-leash dog outing; service-animal questions around an aquatic area should be confirmed with park staff.",
        family: "This is designed for children, but it requires active adult supervision. Children 12 and under need an adult at least 18, and children five and under must stay within arm's reach in the water park.",
        fees: "The 2026 admission price is $6 per person, $4.40 after 3:00 p.m., and free for children under one. The weekend or holiday vehicle gate fee is separate, as are Funbrella rentals and concessions.",
      },
    },
    {
      name: "Ski Rixen USA Cable Park",
      address: "401 S Powerline Rd, Deerfield Beach, FL 33442",
      latitude: 26.311331,
      longitude: -80.155515,
      coordinateSource: "https://commons.wikimedia.org/wiki/File:Cable_skying_on_the_lake_in_Quiet_Waters_Park,_Deerfield_Beach,_Florida,_USA_-_panoramio.jpg",
      officialMapSource: sources.summerFun,
      positionQuality: "reviewed-exact-geotagged-destination-photo",
      imageIndex: 2,
      checkedAt,
      sourceLabel: "Broward County Parks and Recreation",
      source: sources.summerFun,
      summary: "Ski Rixen USA is Quiet Waters Park's cable-powered watersports lake, where participants can wakeboard, water-ski, kneeboard, trick-ski, or surf without a towboat.",
      cost: "Ski Rixen charges separate participation, lesson, rental, or pass fees. The park's weekend and holiday vehicle gate fee can also apply; confirm current prices directly before travel.",
      hours: "The county currently identifies Ski Rixen as a seasonal concession and describes service daily except Mondays. Operator hours, age sessions, lessons, and weather closures can change, so call 954-429-0215 before making a ride-dependent trip.",
      needToKnow: "The county guide identifies the attraction for ages 12 and older. Confirm skill requirements, waiver, fitted safety gear, instruction, last ride time, and operating weather before arrival. Fishing is not allowed in the Ski Rixen lake.",
      answerSources: {
        parking: { source: sources.summerFun, sourceLabel: "Broward County Parks and Recreation" },
        restroom: { source: sources.directory, sourceLabel: "Broward County Parks and Recreation" },
        accessibility: { source: sources.summerFun, sourceLabel: "Broward County Parks and Recreation" },
        dogs: { source: sources.dogParks, sourceLabel: "Broward County Parks and Recreation" },
        family: { source: sources.summerFun, sourceLabel: "Broward County Parks and Recreation" },
        fees: { source: sources.summerFun, sourceLabel: "Broward County Parks and Recreation" },
      },
      answers: {
        parking: "Enter Quiet Waters Park at 401 South Powerline Road, then follow internal signs to Ski Rixen and the exact lake pin. Do not stop at Splash Adventure or the marina if cable riding is your destination; the activity areas use different lakes.",
        restroom: "Use the nearest open developed park restroom before gearing up. The county's current Ski Rixen overview does not promise a restroom at the launch point, so ask the concession where the closest facility is when checking in.",
        accessibility: "Cable riding requires water entry, grip, balance, impact tolerance, and an assisted return after a fall. Contact Ski Rixen directly before travel to discuss instruction, adaptive participation, dock transfer, spectator access, or another specific accommodation.",
        dogs: "Do not bring a dog into the active cable-water area. Quiet Waters has a separate fee-based Woofing Waters dog facility; service-animal arrangements near docks and watersports equipment should be discussed with the operator before arrival.",
        family: "The county currently describes Ski Rixen for ages 12 and older. Reserve beginner instruction when needed, confirm every participant meets the operator's rules, use fitted safety gear, and keep nonparticipants away from cable lines and water-entry areas.",
        fees: "Cable riding, lessons, rentals, and passes cost separately from the park gate. Confirm current pricing, what safety gear is included, waiver requirements, and refund or weather-credit terms before paying.",
      },
    },
  ],
  [ids.brian]: [
    {
      name: "Brian Piccolo Park Velodrome",
      address: "9501 Sheridan St, Cooper City, FL 33024",
      latitude: 26.0350222,
      longitude: -80.2689861,
      coordinateSource: "https://commons.wikimedia.org/wiki/Category:Brian_Piccolo_Park_Velodrome",
      officialMapSource: sources.velodrome,
      positionQuality: "reviewed-wikimedia-named-destination-coordinate",
      imageIndex: 1,
      checkedAt,
      sourceLabel: "Broward County Parks and Recreation",
      source: sources.velodrome,
      summary: "Florida's only velodrome has a 333.3-meter competitive track banked to 30 degrees and a 200-meter recreational track banked to 10 degrees for cycling and inline skating, plus an adjacent paved road course.",
      cost: "Track passes and youth track passes are available. The adjacent road course is ordinarily free except for special events, but the park's weekend and holiday vehicle gate fee still applies.",
      hours: "The velodrome is currently listed Monday through Friday from 5:30 to 9:45 p.m.; weekends are by appointment. The adjacent road course is open daily from 8:00 a.m. to dusk. Confirm events and closures before travel.",
      needToKnow: "A signed liability waiver is required. Track bicycles do not use multiple gears or brakes, and the steep bank is not an ordinary bike path. Confirm the correct session, equipment, helmet, skill level, and track etiquette before entering.",
      answerSources: {
        parking: { source: sources.directory, sourceLabel: "Broward County Parks and Recreation" },
        restroom: { source: sources.brianBrief, sourceLabel: "Broward County Parks and Recreation" },
        accessibility: { source: sources.velodrome, sourceLabel: "Broward County Parks and Recreation" },
        dogs: { source: sources.dogParks, sourceLabel: "Broward County Parks and Recreation" },
        family: { source: sources.velodrome, sourceLabel: "Broward County Parks and Recreation" },
        fees: { source: sources.velodrome, sourceLabel: "Broward County Parks and Recreation" },
      },
      answers: {
        parking: "Enter Brian Piccolo Sports Park at 9501 Sheridan Street and follow internal signs toward the velodrome and road course. Large tournament traffic may use other field lots, so navigate to the exact velodrome pin after entering.",
        restroom: "The park has developed athletic facilities and a meeting room, but the official velodrome page does not identify the closest restroom. Ask at the gate or call 954-357-5160 before a long session if restroom proximity is important.",
        accessibility: "The road course and track complex use paved surfaces, but banking, participant transfer, spectator routes, and event barriers vary. Call the park before travel for an exact step-free spectator route or adaptive cycling and skating accommodation.",
        dogs: "Brian Piccolo is listed as dog-friendly, not as an off-leash dog park. Keep pets leashed and away from the tracks and active athletes; confirm event restrictions and service-animal seating with staff.",
        family: "Spectating can work for families, but the competitive bank and fast road-course users require close supervision. Keep children off active surfaces unless they are in an appropriate supervised session with the required equipment and waiver.",
        fees: "Track passes cost separately, while the adjacent road course is ordinarily free outside special events. Weekend and holiday vehicle entry can still cost $3 for a vehicle with eight or fewer occupants.",
      },
    },
  ],
};

const profiles = {
  [ids.quiet]: {
    name: "Quiet Waters Park",
    city: "Deerfield Beach",
    citySlug: "deerfield-beach-fl",
    operator: "Broward County Parks and Recreation",
    sourceLabel: "Broward County Parks and Recreation",
    source: sources.general,
    address: "401 S Powerline Rd, Deerfield Beach, FL 33442",
    hours: "Park hours are posted at the entrance and can vary by season or event. The park office is open daily from 9:00 a.m. to 5:00 p.m.; all Broward County parks close on Christmas Day. Splash Adventure, Woofing Waters, Ski Rixen, rentals, trails, and camping keep separate schedules.",
    cost: "Weekday park entry is normally free. The current weekend and County-holiday gate fee is $3 per vehicle with eight or fewer occupants and $20 for vehicles with nine or more; water park, dog park, camping, cable sports, rentals, and trail memberships cost separately.",
    summary: "Quiet Waters Park is a large Broward County regional park built around lakes and active recreation, with Splash Adventure, Ski Rixen cable watersports, platform-tent and tepee camping, a 7.5-mile mountain-bike system, Woofing Waters dog park, fishing, paddling rentals, disc golf, an accessible playground, sports courts, and picnic areas.",
    accessibility: "The park includes an ADA-accessible playground, communication boards at Splash Adventure, and developed paved facilities. Water entry, mountain-bike trails, docks, campsites, and weather conditions vary, so confirm a specific accommodation before travel.",
    transit: "Use Broward County Transit's live trip planner for 401 South Powerline Road and verify the final walk plus last return trip. The park is large enough that transit arrival does not eliminate internal travel between facilities.",
    verifiedAt: checkedAt,
    searchAnswers: [
      answer("hours", "What hours is Quiet Waters Park open?", "Broward County directs visitors to posted park hours rather than a dependable year-round online gate schedule. The park office is open daily from 9:00 a.m. to 5:00 p.m., and all county parks close Christmas Day. Splash Adventure, Woofing Waters, Ski Rixen, camping, boat rentals, and trails keep separate schedules, so verify the exact activity before leaving.", sources.camping, "Broward County Parks and Recreation"),
      answer("entrance", "What address should I use for Quiet Waters Park?", "Use 401 South Powerline Road, Deerfield Beach, FL 33442. Enter through the staffed main gate, then follow internal signs to the exact destination because the water park, cable lake, dog park, campground, marina, trails, and fields are spread across a large regional park.", sources.directory, "Broward County Parks and Recreation"),
      answer("parking", "Where should I park at Quiet Waters Park?", "Choose the lot for your activity after entering: Splash Adventure, Ski Rixen, Woofing Waters, campground check-in, marina and fishing, mountain-bike trail access, or a reserved shelter. Do not assume the first open lot is close to a destination across the lakes.", sources.directory, "Broward County Parks and Recreation"),
      answer("fees", "Is Quiet Waters Park free?", "Weekday gate entry is normally free. Broward County currently charges $3 per vehicle with eight or fewer occupants and $20 for vehicles with nine or more on weekends and County holidays. Splash Adventure, Woofing Waters, camping, Ski Rixen, rentals, trail use, and reservations have separate fees; selected 2026 dates waive only the gate fee.", sources.passports, "Broward County Parks and Recreation"),
      answer("splash-pad", "Does Quiet Waters Park have a splash pad or water park?", "Yes. Splash Adventure is a shallow interactive water playground with slides, tunnels, sprays, water curtains, and a tipping bucket. Its 2026 season runs daily through August 9, then weekends through September 27 plus Labor Day, with separate admission and lifeguards whenever it is open.", sources.splash, "Broward County Parks and Recreation"),
      answer("camping", "Can I camp at Quiet Waters Park?", "Yes. Quiet Waters offers reservable platform sites with a set-up tent or tepee, grill, fire ring, water, electricity, picnic table, and sports equipment. Reserve through the park, check in after 3:00 p.m., check out by 1:00 p.m., observe 11:00 p.m. to 7:00 a.m. quiet hours, and expect weather evacuations when ordered.", sources.camping, "Broward County Parks and Recreation"),
      answer("dog-area", "Where can dogs play at Quiet Waters Park?", "Woofing Waters is the park's approximately two-acre off-leash facility with separate large- and small-dog areas, water sprays, wash stations, drinking fountains, shade, restrooms, and a concession area. It is currently listed 8:00 a.m. to 6:00 p.m. daily but closes seasonally and requires a fee or membership; call before travel.", sources.dogParks, "Broward County Parks and Recreation"),
      answer("trail-surface", "What mountain-bike trails are at Quiet Waters Park?", "Quiet Waters has about 7.5 miles of volunteer-maintained mountain-bike trails. A daily or annual membership is required, and only Class I pedal-assist e-bikes are allowed. Check trail status after heavy rain because South Florida soils and features can close even when the broader park is open.", sources.bicycling, "Broward County Parks and Recreation"),
      answer("fishing", "Where can I fish at Quiet Waters Park?", "Broward County describes good bass fishing and broad shoreline access. Fishing is allowed along park shores except the Ski Rixen USA lake. Lakeview Marina offers boats and food, and electric trolling motors may be used on rented rowboats; check current Florida license rules and rental hours.", sources.fishing, "Broward County Parks and Recreation"),
      answer("disc-golf", "Does Quiet Waters Park have disc golf?", "Yes. Quiet Waters is one of Broward County's free disc-golf locations. Bring your own discs and pick up the current course map or scorecard from the park office; tournaments, maintenance, weather, and nearby activities can affect play.", sources.discGolf, "Broward County Parks and Recreation"),
      answer("playground", "Is there a playground at Quiet Waters Park?", "Yes. Broward County lists one ADA-accessible playground at Quiet Waters Park, in addition to the separately ticketed Splash Adventure water playground. Ask at the gate for the closest current lot and verify any maintenance closure before making the playground the only reason for travel.", sources.playgrounds, "Broward County Parks and Recreation"),
      answer("paddling", "Can I rent a kayak or paddleboard at Quiet Waters Park?", "Broward County lists canoe, kayak, and stand-up paddleboard rentals at Quiet Waters on weekends. Rental hours, equipment, age rules, and weather availability can change, so call the park before relying on a rental and bring fitted personal flotation equipment if instructed.", sources.boating, "Broward County Parks and Recreation"),
      answer("accessibility", "Is Quiet Waters Park accessible?", "The county lists an ADA-accessible playground, and Splash Adventure has zero-depth entry plus communication boards. Individual campsites, docks, trails, transfers, and water activities differ; call 954-357-5100 before travel for a specific mobility, communication, sensory, or aquatic accommodation.", sources.playgrounds, "Broward County Parks and Recreation"),
      answer("weather", "What weather affects Quiet Waters Park?", "Heat, sun, lightning, heavy rain, wind, and saturated trails can affect different activities independently. Leave water, open fields, docks, and cable systems when thunder is heard; check water-park and trail status after storms, and follow park evacuation instructions when camping.", sources.lightning, "Broward County Parks and Recreation"),
      answer("need-to-know", "What should I know before visiting Quiet Waters Park?", "Pick one primary destination before entering, confirm its separate hours and fees, and navigate to the correct internal lot. Splash Adventure is seasonal, Woofing Waters can close seasonally, mountain-bike trails can close after rain, fishing is prohibited on the Ski Rixen lake, and rentals should never be assumed available without checking.", sources.general, "Broward County Parks and Recreation"),
    ],
    sources: [
      { label: "Broward County Splash Adventure 2026 guide", url: sources.splash },
      { label: "Broward County camping guide and rules", url: sources.camping },
      { label: "Broward County dog-park guide", url: sources.dogParks },
      { label: "Broward County bicycling guide", url: sources.bicycling },
      { label: "Broward County fishing guide", url: sources.fishing },
    ],
  },
  [ids.brian]: {
    name: "Brian Piccolo Sports Park & Velodrome",
    alternateNames: ["Brian Piccolo Park", "Brian Piccolo Sports Park"],
    city: "Cooper City",
    citySlug: "cooper-city-fl",
    operator: "Broward County Parks and Recreation",
    sourceLabel: "Broward County Parks and Recreation",
    source: sources.brianBrief,
    address: "9501 Sheridan St, Cooper City, FL 33024",
    hours: "Park hours are posted at the entrance and can vary with leagues and events. The velodrome is currently listed Monday through Friday from 5:30 to 9:45 p.m., with weekends by appointment; the adjacent road course is open daily from 8:00 a.m. to dusk. Broward County parks close Christmas Day.",
    cost: "Weekday park entry is normally free. The current weekend and County-holiday gate fee is $3 per vehicle with eight or fewer occupants and $20 for larger vehicles. Track passes, reservations, leagues, tennis, Soccer 5, and special events cost separately.",
    summary: "Brian Piccolo Sports Park & Velodrome is a 175-acre Broward County regional sports complex with Florida's only velodrome, a paved cycling and skating road course, baseball and softball diamonds, cricket fields, multipurpose fields, basketball, tennis and racquetball courts, disc golf, a fitness zone, playground, pavilion, meeting room, and lakeside fishing.",
    accessibility: "The complex has developed paved sports facilities, but exact spectator routes, field seating, track access, and program accommodations vary. Contact the park before travel for a specific mobility, sensory, adaptive-sport, or event-access need.",
    transit: "Use Broward County Transit's live trip planner for 9501 Sheridan Street and verify the final walk plus last return trip. Tournament traffic and a large internal sports layout can add distance after arrival.",
    verifiedAt: checkedAt,
    searchAnswers: [
      answer("hours", "What hours is Brian Piccolo Sports Park open?", "The county posts general park hours at the entrance rather than maintaining a dependable daily gate schedule online. The velodrome is currently listed Monday through Friday from 5:30 to 9:45 p.m., with weekends by appointment, while the road course runs daily from 8:00 a.m. to dusk. Call 954-357-5150 for field, league, and event access.", sources.velodrome, "Broward County Parks and Recreation"),
      answer("entrance", "What address should I use for Brian Piccolo Sports Park?", "Use 9501 Sheridan Street, Cooper City, FL 33024. Enter from Sheridan Street, then navigate to the exact internal destination because the velodrome, fields, courts, disc golf, playground, and fishing area are distributed across a 175-acre sports complex.", sources.directory, "Broward County Parks and Recreation"),
      answer("parking", "Where should I park at Brian Piccolo Sports Park?", "Park near the specific field, court, velodrome, road course, playground, pavilion, or meeting room you plan to use. Tournament and league traffic can make the first available space a long walk from the destination, so confirm a field number or facility name before entering.", sources.brianBrief, "Broward County Parks and Recreation"),
      answer("fees", "Is Brian Piccolo Sports Park free?", "Weekday gate entry is normally free. Broward County currently charges $3 per vehicle with eight or fewer occupants and $20 for vehicles with nine or more on weekends and County holidays. Track passes, field and room rentals, leagues, tennis, Soccer 5, and events cost separately.", sources.passports, "Broward County Parks and Recreation"),
      answer("velodrome", "Can I ride or skate at the Brian Piccolo velodrome?", "Yes, during the correct operating session. The complex has a 333.3-meter competitive track banked up to 30 degrees and a 200-meter recreational track banked up to 10 degrees. Users must sign a waiver, and track bicycles have no multiple gears or brakes; confirm equipment, skill level, pass, and schedule before entering.", sources.velodrome, "Broward County Parks and Recreation"),
      answer("road-course", "Is there a cycling or skating road course at Brian Piccolo Park?", "Yes. The adjacent paved road course has 500-meter and 800-meter loops and is currently open daily from 8:00 a.m. to dusk for cyclists and inline speed skaters. It is ordinarily free outside special events, though the weekend or holiday vehicle gate fee still applies.", sources.velodrome, "Broward County Parks and Recreation"),
      answer("sports", "What sports are available at Brian Piccolo Park?", "The January 2026 county brief lists eight lighted baseball or softball fields, four multipurpose fields, two lighted basketball courts, two cricket fields, 12 lighted clay tennis courts, six lighted racquetball courts, a fitness zone, pavilion, playground, and meeting room, plus the velodrome and private tennis and mini-soccer operators.", sources.brianBrief, "Broward County Parks and Recreation"),
      answer("disc-golf", "Does Brian Piccolo Park have disc golf?", "Yes. Brian Piccolo is one of Broward County's free disc-golf locations. Bring your own discs and ask the park office for the current map or scorecard; leagues, field activity, maintenance, wind, and standing water can affect play.", sources.discGolf, "Broward County Parks and Recreation"),
      answer("playground", "Is there a playground at Brian Piccolo Park?", "Yes. Broward County's January 2026 park brief lists one playground. Ask at the entrance for the closest current parking and confirm any maintenance or construction change before making the playground the only reason for travel.", sources.brianBrief, "Broward County Parks and Recreation"),
      answer("dog-area", "Are dogs allowed at Brian Piccolo Park?", "Brian Piccolo is listed as a dog-friendly park, not as an off-leash dog park. Keep pets on a hand-held leash, clean up waste, and keep them away from active tracks, courts, fields, wildlife areas, and any event that posts additional restrictions.", sources.dogParks, "Broward County Parks and Recreation"),
      answer("fishing", "Can I fish at Brian Piccolo Park?", "Yes. Broward County allows fishing along the back lake from the dock and west of the dock; boats are not allowed. Check current Florida license rules, keep hooks away from athletes and wildlife, and do not assume fishing access during a closure or crowded event.", sources.fishing, "Broward County Parks and Recreation"),
      answer("restroom", "Are there restrooms at Brian Piccolo Park?", "The park has developed athletic and meeting facilities, but current county sources do not identify every public restroom or its hours. Ask at the entrance for the closest open facility to your field or track, especially during evening leagues or weekend tournaments.", sources.brianBrief, "Broward County Parks and Recreation"),
      answer("accessibility", "Is Brian Piccolo Sports Park accessible?", "The sports complex includes paved developed facilities, but exact accessible parking, spectator routes, seating, track transfer, and program accommodations vary by destination and event. Call 954-357-5150 before travel for a specific need.", sources.brianBrief, "Broward County Parks and Recreation"),
      answer("family", "Is Brian Piccolo Park good for families?", "It is strongest for active-sport families, leagues, spectators, the playground, road course, and disc golf. Confirm the exact field or session, bring helmets and sport-specific gear, keep children away from fast tracks and foul-ball areas, and plan for heat, limited shade, and tournament traffic.", sources.brianBrief, "Broward County Parks and Recreation"),
      answer("weather", "What weather affects Brian Piccolo Park?", "Most fields, courts, tracks, and spectator areas are exposed to heat, sun, lightning, wind, and heavy rain. Leave open athletic areas when thunder is heard, check field and track status after storms, and expect wet surfaces or event delays even when the gate remains open.", sources.lightning, "Broward County Parks and Recreation"),
      answer("need-to-know", "What should I know before visiting Brian Piccolo Park?", "Get the exact field, court, track, or facility name before entering; confirm whether a league, reservation, pass, waiver, or private-operator fee applies; and check weather plus event traffic. The velodrome and road course have separate schedules, and the banked track is not an ordinary recreational bike path.", sources.velodrome, "Broward County Parks and Recreation"),
    ],
    sources: [
      { label: "Broward County January 2026 park brief", url: sources.brianBrief },
      { label: "Broward County velodrome and road-course guide", url: sources.velodrome },
      { label: "Broward County sports guide", url: sources.sports },
      { label: "Broward County disc-golf guide", url: sources.discGolf },
      { label: "Broward County fishing guide", url: sources.fishing },
    ],
  },
};

const locations = [
  {
    id: ids.quiet,
    park: "Quiet Waters Park",
    city: "Deerfield Beach",
    state: "FL",
    latitude: 26.3124513,
    longitude: -80.1612098,
    address: "401 S Powerline Rd, Deerfield Beach, FL 33442",
    displayName: "Quiet Waters Park, Deerfield Beach, FL",
    source: "OpenStreetMap contributors",
    sourceUrl: "https://www.openstreetmap.org/relation/9437548",
    checkedAt,
  },
  {
    id: ids.brian,
    park: "Brian Piccolo Sports Park & Velodrome",
    city: "Cooper City",
    state: "FL",
    latitude: 26.0340035,
    longitude: -80.2722714,
    address: "9501 Sheridan St, Cooper City, FL 33024",
    displayName: "Brian Piccolo Sports Park & Velodrome, Cooper City, FL",
    source: "OpenStreetMap contributors",
    sourceUrl: "https://www.openstreetmap.org/way/168231374",
    checkedAt,
  },
];

const featureResearchQueue = {
  [ids.quiet]: "Published Splash Adventure and Ski Rixen from exact reviewed pins, destination-specific licensed photographs, and current county guidance. Defer Woofing Waters, the campground, mountain-bike trailhead, Lakeview Marina, disc-golf course, playground, shelters, and fields until each has a destination-specific reusable photograph and exact reviewed pin.",
  [ids.brian]: "Published the Brian Piccolo Park Velodrome from a named destination coordinate, three destination-specific licensed photographs, and current county guidance. Defer the road-course pin, cricket fields, disc-golf course, playground, baseball and softball complexes, tennis center, Soccer 5, pavilion, meeting room, fishing dock, and fitness zone until each has a destination-specific reusable photograph and exact reviewed pin.",
};

for (const file of [files.national, files.campaign]) {
  const document = read(file);
  for (const id of legacyIds) delete document.parks[id];
  for (const [id, profile] of Object.entries(profiles)) document.parks[id] = { ...(document.parks[id] || {}), ...profile };
  write(file, document);
}

const locationDocument = read(files.locations);
for (const id of legacyIds) {
  const index = locationDocument.findIndex((item) => item.id === id);
  if (index >= 0) locationDocument.splice(index, 1);
}
for (const location of locations) {
  const index = locationDocument.findIndex((item) => item.id === location.id);
  if (index >= 0) locationDocument[index] = location;
  else locationDocument.push(location);
}
write(files.locations, locationDocument);

const superCampaign = read(files.superCampaign);
superCampaign.checkedAt = checkedAt;
superCampaign.places = superCampaign.places.filter((place) => !legacyIds.includes(place.id));
for (const place of campaignPlaces) {
  const index = superCampaign.places.findIndex((item) => item.id === place.id);
  if (index >= 0) superCampaign.places[index] = place;
  else superCampaign.places.push(place);
}
write(files.superCampaign, superCampaign);

const photos = read(files.photos);
photos.reviewedAt = checkedAt;
for (const id of legacyIds) delete photos.places[id];
for (const [id, selection] of Object.entries(imageSelections)) photos.places[id] = selection;
write(files.photos, photos);

const features = read(files.features);
features.checkedAt = checkedAt;
for (const id of legacyIds) {
  delete features.places[id];
  delete features.researchQueue[id];
}
for (const [id, selection] of Object.entries(featureSelections)) features.places[id] = selection;
for (const [id, note] of Object.entries(featureResearchQueue)) features.researchQueue[id] = note;
write(files.features, features);

const addresses = read(files.addresses);
for (const id of legacyIds) delete addresses[id];
addresses[ids.quiet] = "401 S Powerline Rd, Deerfield Beach, FL 33442";
addresses[ids.brian] = "9501 Sheridan St, Cooper City, FL 33024";
write(files.addresses, addresses);

console.log("Seeded Quiet Waters Park and Brian Piccolo Sports Park with 30 sourced answers, eight licensed photographs, and three exact qualifying destinations.");
