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

const anneVisit = "https://www.visitlauderdale.com/listing/anne-kolb-nature-center/3989/";
const anneExhibits = "https://www.broward.org/Parks/ThingsToDo/Pages/exhibithalls.aspx";
const anneGeneral = "https://www.broward.org/Parks/Pages/GeneralInformation.aspx";
const anneFees = "https://www.broward.org/Parks/Fees/Documents/FeeSchedule.pdf";
const anneTransit = "https://www.broward.org/BCT/Documents/Destinations.pdf";
const anneVolunteer = "https://www.broward.org/Parks/Support/Pages/EcoActionDays.aspx";
const mizell = "https://www.floridastateparks.org/mizell";
const mizellAmenities = "https://www.floridastateparks.org/parks-and-trails/dr-von-d-mizell-eula-johnson-state-park/experiences-amenities";
const whiskey = "https://www.floridastateparks.org/parks-and-trails/dr-von-d-mizell-eula-johnson-state-park/whiskey-creek-hideout";
const mizellBrochure = "https://www.floridastateparks.org/sites/default/files/media/file/Mizell-Johnson-brochure.pdf";

const ids = {
  anne: "launch-fl-hollywood-anne-kolb-nature-center",
  mizell: "launch-fl-dania-beach-dr-von-d-mizell-eula-johnson-state-park",
};

const campaignPlaces = [
  {
    id: ids.anne,
    name: "Anne Kolb Nature Center",
    city: "Hollywood",
    state: "FL",
    citySlug: "hollywood-fl",
    operator: "Broward County Parks and Recreation",
    source: anneVisit,
    featureResearchRadiusMeters: 1800,
    minimumImages: 3,
    imageQueries: ["Anne Kolb Nature Center", "Anne Kolb observation tower", "Anne Kolb mangrove boardwalk"],
    subsites: ["Anne Kolb Observation Tower", "Exhibit Hall and Eco-Room", "Lake Trail", "Fishing Pier Trail", "Mud Flat Trail", "South Trail"],
  },
  {
    id: ids.mizell,
    name: "Dr. Von D. Mizell-Eula Johnson State Park",
    city: "Dania Beach",
    state: "FL",
    citySlug: "dania-beach-fl",
    operator: "Florida Park Service",
    source: mizell,
    featureResearchRadiusMeters: 2600,
    imageQueries: ["Mizell Eula Johnson State Park", "John U Lloyd State Park boardwalk", "John U Lloyd State Park beach", "John U Lloyd State Park lagoon"],
    subsites: ["Whiskey Creek Hideout and Paddling Area", "Barrier Nature Trail", "Jetty Pavilion", "Boat Ramp"],
  },
];

const imageSelections = {
  [ids.anne]: {
    name: "Anne Kolb Nature Center",
    candidates: [
      {
        title: "Anne Kolb Nature Center - panoramio",
        url: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Anne_Kolb_Nature_Center_-_panoramio.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Anne_Kolb_Nature_Center_-_panoramio.jpg",
        creator: "Mickey Logitmark",
        creatorUrl: "https://web.archive.org/web/20161101192148/http://www.panoramio.com/user/527037?with_photo_id=115657968",
        license: "BY",
        licenseVersion: "3.0",
        licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
        width: 8192,
        height: 1856,
        provider: "wikimedia",
        query: "Anne Kolb Nature Center",
        reviewStatus: "approved-destination-match",
        reviewNote: "The Commons title, geotag, and visual review identify the Anne Kolb Nature Center mangrove complex.",
        alt: "Panoramic mangrove and water view at Anne Kolb Nature Center",
        reviewedAt: checkedAt,
      },
      {
        title: "Anne Kolb Nature Center observation tower boardwalk view - panoramio",
        url: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Anne_Kolb_Nature_Center_observation_tower_boardwalk_view_-_panoramio.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Anne_Kolb_Nature_Center_observation_tower_boardwalk_view_-_panoramio.jpg",
        creator: "quyentr",
        creatorUrl: "https://web.archive.org/web/20161029114559/http://www.panoramio.com/user/3410929?with_photo_id=24233534",
        license: "BY",
        licenseVersion: "3.0",
        licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
        width: 2592,
        height: 1944,
        provider: "wikimedia",
        query: "Anne Kolb observation tower",
        reviewStatus: "approved-destination-match",
        reviewNote: "The exact title and geotag identify a boardwalk view from the observation tower across the mangrove canopy.",
        alt: "Boardwalk winding through mangroves below the Anne Kolb observation tower",
        reviewedAt: checkedAt,
      },
      {
        title: "Anne Kolb Nature Center observation tower view - panoramio",
        url: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Anne_Kolb_Nature_Center_observation_tower_view_-_panoramio.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Anne_Kolb_Nature_Center_observation_tower_view_-_panoramio.jpg",
        creator: "quyentr",
        creatorUrl: "https://web.archive.org/web/20161029113957/http://www.panoramio.com/user/3410929?with_photo_id=24233539",
        license: "BY",
        licenseVersion: "3.0",
        licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
        width: 2592,
        height: 1944,
        provider: "wikimedia",
        query: "Anne Kolb observation tower",
        reviewStatus: "approved-destination-match",
        reviewNote: "The exact title and geotag identify the broad mangrove, water, and skyline view from the observation tower.",
        alt: "Mangrove canopy and distant skyline viewed from the Anne Kolb observation tower",
        reviewedAt: checkedAt,
      },
    ],
  },
  [ids.mizell]: {
    name: "Dr. Von D. Mizell-Eula Johnson State Park",
    candidates: [
      {
        title: "Sign at Dr. Von D. Mizell-Eula Johnson State Park",
        url: "https://upload.wikimedia.org/wikipedia/commons/2/20/Sign_at_Dr._Von_D._Mizell-Eula_Johnson_State_Park.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Sign_at_Dr._Von_D._Mizell-Eula_Johnson_State_Park.jpg",
        creator: "Rscooli",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:Rscooli",
        license: "BY-SA",
        licenseVersion: "4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        width: 1199,
        height: 899,
        provider: "wikimedia",
        query: "Mizell Eula Johnson State Park",
        reviewStatus: "approved-destination-match",
        reviewNote: "The park's Florida Heritage marker documents the segregated beach, the wade-ins, and the civil-rights history behind the current park name.",
        alt: "Florida Heritage marker explaining the civil-rights history of Mizell-Johnson State Park",
        reviewedAt: checkedAt,
      },
      {
        title: "Dania Beach FL John U. Lloyd SP boardwalk 01",
        url: "https://upload.wikimedia.org/wikipedia/commons/4/49/Dania_Beach_FL_John_U._Lloyd_SP_bdwk01.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Dania_Beach_FL_John_U._Lloyd_SP_bdwk01.jpg",
        creator: "Ebyabe",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:Ebyabe",
        license: "BY-SA",
        licenseVersion: "3.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
        width: 3264,
        height: 2448,
        provider: "wikimedia",
        query: "John U Lloyd State Park boardwalk",
        reviewStatus: "approved-former-name-destination-match",
        reviewNote: "The file depicts the same park under its former official name and shows a developed beach boardwalk through coastal vegetation.",
        alt: "Beach boardwalk through coastal vegetation at Mizell-Johnson State Park",
        reviewedAt: checkedAt,
      },
      {
        title: "Dania Beach FL John U. Lloyd SP beach south 01",
        url: "https://upload.wikimedia.org/wikipedia/commons/8/8b/Dania_Beach_FL_John_U._Lloyd_SP_beach_south01.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Dania_Beach_FL_John_U._Lloyd_SP_beach_south01.jpg",
        creator: "Ebyabe",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:Ebyabe",
        license: "BY-SA",
        licenseVersion: "3.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
        width: 3264,
        height: 2448,
        provider: "wikimedia",
        query: "John U Lloyd State Park beach",
        reviewStatus: "approved-former-name-destination-match",
        reviewNote: "The file depicts the same park under its former official name and is explicitly labeled as the south beach.",
        alt: "Atlantic beach looking south at Mizell-Johnson State Park",
        reviewedAt: checkedAt,
      },
      {
        title: "Dania Beach FL John U. Lloyd SP water north 01",
        url: "https://upload.wikimedia.org/wikipedia/commons/0/0a/Dania_Beach_FL_John_U._Lloyd_SP_water_north01._Lloyd_SP_water02.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Dania_Beach_FL_John_U._Lloyd_SP_water_north01._Lloyd_SP_water02.jpg",
        creator: "Ebyabe",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:Ebyabe",
        license: "BY-SA",
        licenseVersion: "3.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
        width: 3264,
        height: 2448,
        provider: "wikimedia",
        query: "John U Lloyd State Park lagoon",
        reviewStatus: "approved-former-name-area-context",
        reviewNote: "The file depicts the park under its former name and provides representative Whiskey Creek and protected-water context.",
        alt: "Sheltered water and mangrove shoreline in Mizell-Johnson State Park",
        reviewedAt: checkedAt,
      },
    ],
  },
};

// Lead with the shoreline while keeping the civil-rights marker prominent in the gallery.
imageSelections[ids.mizell].candidates = [
  imageSelections[ids.mizell].candidates[2],
  imageSelections[ids.mizell].candidates[0],
  imageSelections[ids.mizell].candidates[1],
  imageSelections[ids.mizell].candidates[3],
];

const featureSelections = {
  [ids.anne]: [
    {
      name: "Anne Kolb Observation Tower",
      address: "751 Sheridan St, Hollywood, FL 33019",
      latitude: 26.038657,
      longitude: -80.119933,
      coordinateSource: "https://commons.wikimedia.org/wiki/File:Anne_Kolb_Nature_Center_observation_tower_view_-_panoramio.jpg",
      officialMapSource: anneVisit,
      positionQuality: "reviewed-exact-geotagged-destination-photo",
      imageIndex: 2,
      checkedAt,
      sourceLabel: "Visit Lauderdale",
      source: anneVisit,
      summary: "The five-level, 68-foot Anne Kolb Observation Tower rises above the mangrove estuary and provides broad views toward West Lake, the Intracoastal Waterway, and the Atlantic coast.",
      cost: "Ordinary tower access is not separately ticketed. Programs, events, rentals, and any current weekend or holiday park charge can cost separately.",
      hours: "Use the nature center's current operating hours and posted tower conditions. The exhibit hall is currently listed as open daily from 9:00 a.m. to 5:00 p.m.; weather, maintenance, lightning, or elevator service can close the tower independently.",
      needToKnow: "Use the exact tower pin after entering at 751 Sheridan Street. The boardwalk approach is exposed to heat, rain, insects, and lightning. Visitors who need the elevator should confirm that it is operating before making the trip, and everyone should leave elevated structures when thunder is heard.",
      answerSources: {
        parking: { source: anneVisit, sourceLabel: "Visit Lauderdale" },
        restroom: { source: anneExhibits, sourceLabel: "Broward County Parks and Recreation" },
        accessibility: { source: anneVisit, sourceLabel: "Visit Lauderdale" },
        dogs: { source: anneGeneral, sourceLabel: "Broward County Parks and Recreation" },
        family: { source: anneExhibits, sourceLabel: "Broward County Parks and Recreation" },
      },
      answers: {
        parking: "Enter Anne Kolb Nature Center at 751 Sheridan Street and use the on-site visitor parking, then follow signs and the boardwalk toward the tower. Do not navigate to a generic West Lake shoreline pin because the mangrove preserve has limited road access.",
        restroom: "Use the nature-center restrooms near the exhibit and visitor facilities before walking to the tower. The elevated structure itself should not be treated as a restroom stop, and building access can end before an outdoor route feels finished.",
        accessibility: "The tower has been described by the official tourism authority as a developed visitor attraction, but elevator operation can change. Confirm the elevator and boardwalk route with the nature center before traveling for step-free access.",
        dogs: "Do not bring pets into the nature-center preserve. Service-animal access and a specific accommodation should be confirmed with Broward County Parks when wildlife, narrow boardwalks, or indoor exhibits are involved.",
        family: "The tower can be a memorable family destination, but its height, stairs, railings, heat, lightning exposure, and narrow shared approach require close supervision. Pair it with the free exhibit hall and Eco-Room during their operating hours.",
      },
    },
  ],
  [ids.mizell]: [
    {
      name: "Whiskey Creek Hideout and Paddling Area",
      address: "6503 N Ocean Dr, Dania Beach, FL 33004",
      latitude: 26.0814648,
      longitude: -80.1106792,
      coordinateSource: "https://www.openstreetmap.org/way/414474203",
      officialMapSource: whiskey,
      positionQuality: "reviewed-named-destination-building-centroid",
      imageIndex: 3,
      checkedAt,
      sourceLabel: "Florida State Parks",
      source: whiskey,
      summary: "Whiskey Creek Hideout is the park's official waterside concession and paddling hub on a 1.5-mile mangrove-lined tidal creek, offering food plus canoe, kayak, and paddleboard rentals beside sheltered water.",
      cost: "Park entrance is currently $6 per vehicle. Food, watercraft, umbrellas, beach chairs, events, and other concession services cost separately; verify current prices and availability with the operator.",
      hours: "The state park is open 8:00 a.m. to sunset. Concession and rental hours can be shorter and can change for weather, tides, staffing, or events; confirm directly before making a rental-dependent trip.",
      needToKnow: "Enter through the state-park gate and navigate to the exact Hideout pin, not a generic Dania Beach marker. Check tides, wind, lightning, rental cutoffs, and return time before launching. Wear a properly fitted PFD, stay alert for motorboats outside protected water, and never approach or feed manatees.",
      answerSources: {
        parking: { source: mizellAmenities, sourceLabel: "Florida State Parks" },
        restroom: { source: mizell, sourceLabel: "Florida State Parks" },
        accessibility: { source: mizellAmenities, sourceLabel: "Florida State Parks" },
        dogs: { source: mizellAmenities, sourceLabel: "Florida State Parks" },
        family: { source: whiskey, sourceLabel: "Florida State Parks" },
      },
      answers: {
        parking: "Pay the park entrance fee, then follow signs toward Whiskey Creek Hideout and its nearby parking. Do not stop at the first beach lot if the goal is paddling or the concession; the park road is long and the destinations are spread out.",
        restroom: "Restrooms are distributed through the state park, but the March 2026 notice closes restrooms 3 and 4. Identify an open facility before launching or ordering food rather than assuming the nearest numbered building is available.",
        accessibility: "Florida State Parks lists Whiskey Creek Hideout, parking, restrooms, picnic facilities, and the marina among accessible amenities. Watercraft transfer, dock height, tides, and beach surfaces vary, so request a specific rental or transfer accommodation before arrival.",
        dogs: "Pets are allowed only in designated park areas on a hand-held leash no longer than six feet. They are not allowed on beaches or natural shorelines, so confirm the current Hideout seating and launch-area rule before bringing a pet. Service animals are allowed under state policy.",
        family: "The concession can simplify food and rental logistics, but paddling is not passive play. Match the route to every participant's ability, insist on fitted PFDs, keep children within arm's reach near docks and water, and use a land-based backup plan when wind, tides, heat, or lightning are unfavorable.",
      },
    },
  ],
};

const featureResearchQueue = {
  [ids.anne]: "Published the exact Observation Tower from two destination-named geotagged photographs and current visitor guidance. Defer the Exhibit Hall, Eco-Room, Lake Trail, Fishing Pier Trail, Mud Flat Trail, South Trail, amphitheater, and paddling launch until each has a destination-specific reusable photograph and exact reviewed pin.",
  [ids.mizell]: "Published Whiskey Creek Hideout and Paddling Area from a named official operator page and exact reviewed building pin. Defer the Barrier Nature Trail, Jetty Pavilion, boat ramp, beach lots, individual pavilions, restrooms, and shower stations until each has a destination-specific reusable photograph and exact reviewed pin; preserve the March 2026 closures on the parent guide.",
};

const profiles = {
  [ids.anne]: {
    name: "Anne Kolb Nature Center",
    city: "Hollywood",
    citySlug: "hollywood-fl",
    operator: "Broward County Parks and Recreation",
    sourceLabel: "Broward County Parks and Recreation",
    source: anneExhibits,
    address: "751 Sheridan St, Hollywood, FL 33019",
    hours: "The nature center exhibit hall is currently open daily from 9:00 a.m. to 5:00 p.m. Outdoor trails, tower, programs, rentals, and gates can follow separate posted or weather-dependent schedules.",
    cost: "The nature center and exhibit hall currently have no admission fee. Programs, rentals, reserved facilities, and any posted weekend or holiday gate charge cost separately.",
    summary: "Anne Kolb Nature Center is Broward County's largest nature center, protecting a 1,501-acre mangrove wetland with a free exhibit hall and Eco-Room, a five-level observation tower, short nature trails, fishing access, and non-motorized paddling routes.",
    accessibility: "Developed visitor facilities include the exhibit hall and tower complex, but individual trails, elevator service, docks, and wet outdoor surfaces vary. Contact the center before traveling for a specific accommodation.",
    transit: "Broward County Transit serves the nature-center area. Use the current BCT trip planner for 751 Sheridan Street because stop patterns and route numbers can change.",
    verifiedAt: checkedAt,
    searchAnswers: [
      answer("hours", "What hours is Anne Kolb Nature Center open?", "The Broward County exhibit-hall page currently lists nature centers and their exhibit halls open daily from 9:00 a.m. to 5:00 p.m. Tower, trail, gate, event, and paddling access can close separately for weather, maintenance, or programming, so call 954-357-5161 before a time-sensitive visit.", anneExhibits, "Broward County Parks and Recreation"),
      answer("entrance", "What address should I use for Anne Kolb Nature Center?", "Use 751 Sheridan Street, Hollywood, FL 33019. The entrance is on the north side of Sheridan Street east of Federal Highway. Navigate to the nature center, not a generic West Lake shoreline point, because most of the preserve is mangrove wetland without road access.", anneVolunteer, "Broward County Parks and Recreation"),
      answer("parking", "Where should I park at Anne Kolb Nature Center?", "Use the on-site visitor parking reached from the Sheridan Street entrance. Park once for the exhibit hall, tower, and nearby short trails; the separate West Lake Park marina and South Trail approaches should not be assumed to use the same lot.", anneVisit, "Visit Lauderdale"),
      answer("fees", "Is Anne Kolb Nature Center free?", "The current Broward County exhibit-hall page says there is no admission fee to the nature centers or exhibit halls. Programs, rentals, meeting spaces, events, and any posted weekend or holiday gate fee can cost separately; confirm before a rental-dependent visit.", anneExhibits, "Broward County Parks and Recreation"),
      answer("restroom", "Are there restrooms at Anne Kolb Nature Center?", "Restrooms and visitor services are available at the developed nature-center complex during building hours. Use them before heading onto the tower, fishing-pier route, or longer outdoor paths because facilities are not distributed throughout the mangrove preserve.", anneExhibits, "Broward County Parks and Recreation"),
      answer("accessibility", "Is Anne Kolb Nature Center accessible?", "The developed visitor complex includes indoor exhibits and a five-level observation tower, but elevator operation, trail surfaces, docks, and weather exposure can affect access. Contact the center at 954-357-5161 before travel for a specific mobility, sensory, or program accommodation.", anneVisit, "Visit Lauderdale"),
      answer("dog-area", "Are dogs allowed at Anne Kolb Nature Center?", "Do not plan on bringing a pet into this wildlife-focused mangrove preserve. Service-animal access and a specific accommodation should be confirmed with Broward County Parks before visiting indoor exhibits, narrow boardwalks, or wildlife-sensitive areas.", anneGeneral, "Broward County Parks and Recreation"),
      answer("family", "What can children do at Anne Kolb Nature Center?", "The free exhibit hall has interactive mangrove displays, a hands-on Eco-Room, and a short theater video. Families can add the observation tower and a short trail, but should bring water, insect repellent, sun protection, and close supervision around stairs, railings, docks, fishing areas, and tidal water.", anneExhibits, "Broward County Parks and Recreation"),
      answer("trail-surface", "What trails are at Anne Kolb Nature Center?", "The visitor complex connects to short nature routes and fishing access through a mangrove environment, while the broader preserve also includes longer gravel and paddling routes. Surfaces can be wet, exposed, or uneven; get the current trail map at the visitor center and ask which routes are open.", anneVisit, "Visit Lauderdale"),
      answer("public-art", "What are the main landmarks at Anne Kolb Nature Center?", "The signature landmarks are the five-level, 68-foot observation tower, the exhibit hall and Eco-Room, the mangrove boardwalks and nature trails, the Intracoastal fishing pier, the outdoor amphitheater, and views across the 1,501-acre wetland.", anneVisit, "Visit Lauderdale"),
      answer("paddling", "Can I kayak at Anne Kolb Nature Center?", "The West Lake and Anne Kolb complex includes designated non-motorized paddling routes through mangrove wetland. Rental availability, launch location, route conditions, and last-return times can change, so confirm with the center or marina before bringing or renting a boat.", anneVisit, "Visit Lauderdale"),
      answer("transit", "Can I reach Anne Kolb Nature Center by transit?", "Yes. Broward County Transit identifies Anne Kolb Nature Center as a destination. Plan the current route to 751 Sheridan Street and check the last return trip before entering a trail or program because published route numbers can change.", anneTransit, "Broward County Transit"),
      answer("weather", "What weather should I plan for at Anne Kolb Nature Center?", "The tower, boardwalks, fishing areas, and trails are exposed to South Florida heat, lightning, heavy rain, mosquitoes, and slick surfaces. Leave the tower and water at the first sign of thunder, carry drinking water, and check the forecast before choosing a long outdoor route.", anneVisit, "Visit Lauderdale"),
      answer("wildlife", "What wildlife might I see at Anne Kolb Nature Center?", "The protected mangrove wetland supports native and migratory birds plus aquatic wildlife. Observe quietly from developed routes, never feed or approach animals, keep hands away from water and mangrove edges, and use insect protection without disturbing habitat.", anneGeneral, "Broward County Parks and Recreation"),
      answer("need-to-know", "What should I know before visiting Anne Kolb Nature Center?", "Start in the exhibit hall for the current map and closure status, then choose one destination rather than assuming the 1,501-acre preserve is a single walkable loop. Confirm tower elevator and paddling availability, use restrooms first, and carry water, sun and insect protection, and a lightning exit plan.", anneExhibits, "Broward County Parks and Recreation"),
    ],
    sources: [
      { label: "Broward County Parks and Recreation exhibit halls", url: anneExhibits },
      { label: "Visit Lauderdale destination guide", url: anneVisit },
      { label: "Broward County Parks general information", url: anneGeneral },
      { label: "Broward County Parks current fee schedule", url: anneFees },
    ],
  },
  [ids.mizell]: {
    name: "Dr. Von D. Mizell-Eula Johnson State Park",
    alternateNames: ["Mizell-Johnson State Park", "John U. Lloyd Beach State Park"],
    city: "Dania Beach",
    citySlug: "dania-beach-fl",
    operator: "Florida Park Service",
    sourceLabel: "Florida State Parks",
    source: mizell,
    address: "6503 N Ocean Dr, Dania Beach, FL 33004",
    hours: "The park is open daily from 8:00 a.m. to sunset. The boat ramp opens one hour before official sunrise and has separate closing rules; concessions and individual facilities keep shorter or variable schedules.",
    cost: "The current entrance fee is $6 per vehicle. Pavilions, watercraft, food, rentals, events, and other services cost separately.",
    summary: "Dr. Von D. Mizell-Eula Johnson State Park is a historic, largely undeveloped Broward County beach preserve with more than two miles of Atlantic shoreline, Whiskey Creek paddling, guarded-by-flags but unlifeguarded swimming, a boat ramp, picnicking, showers, restrooms, a nature trail, and an official food-and-rental concession.",
    accessibility: "Florida State Parks identifies accessible beach boardwalks, parking, picnic facilities, restrooms, marina facilities, and Whiskey Creek Hideout. Beach wheelchairs are first-come, first-served at the entrance station.",
    transit: "The park entrance is at the north end of North Ocean Drive. Transit does not replace the long internal park road, so verify the final approach and return trip before relying on it.",
    verifiedAt: checkedAt,
    searchAnswers: [
      answer("hours", "What hours is Mizell-Johnson State Park open?", "The park is open 8:00 a.m. to sunset, 365 days a year. The boat ramp opens one hour before official sunrise and follows separate closing rules, while concessions, rentals, restrooms, and pavilions can keep shorter schedules or close independently.", mizell, "Florida State Parks"),
      answer("entrance", "What address should I use for Mizell-Johnson State Park?", "Use 6503 N. Ocean Drive, Dania Beach, FL 33004. Enter from the south via Dania Beach Boulevard and North Ocean Drive; the park road is the only public vehicle approach and stretches north toward Port Everglades.", mizell, "Florida State Parks"),
      answer("parking", "Where should I park at Mizell-Johnson State Park?", "Parking areas are distributed along the long park road. Choose the lot for your destination: Whiskey Creek and concessions, a currently open beach access, the boat ramp, a reserved pavilion, or the northern jetty. The March 2026 notice closes beach access from lot 3.", mizell, "Florida State Parks"),
      answer("fees", "How much does Mizell-Johnson State Park cost?", "The current entrance fee is $6 per vehicle. Pavilion reservations, food, watercraft and beach rentals, events, and other services cost separately. Confirm the live fee page before bringing a large group or trailer.", mizell, "Florida State Parks"),
      answer("restroom", "Are restrooms and showers available at Mizell-Johnson State Park?", "Yes. The park lists restrooms and seven freshwater shower stations, but the current March 2026 notice closes restrooms 3 and 4. Identify an open facility before choosing a beach lot because the park stretches for miles.", mizell, "Florida State Parks"),
      answer("accessibility", "What accessible facilities are at Mizell-Johnson State Park?", "Accessible amenities include beach boardwalks, parking, picnic facilities, restrooms, marina facilities, and Whiskey Creek Hideout. Beach wheelchairs are available first-come, first-served from the entrance station; call ahead for a critical accommodation.", mizellAmenities, "Florida State Parks"),
      answer("dog-area", "Are dogs allowed at Mizell-Johnson State Park?", "Pets are welcome only in designated areas on a hand-held leash no longer than six feet. They are not allowed on beaches or natural shorelines and may not be left unattended. Service animals are allowed under Florida State Parks policy.", mizellAmenities, "Florida State Parks"),
      answer("swimming", "Are there lifeguards at Mizell-Johnson State Park?", "No lifeguards are on duty. Swimming is at your own risk. Read the warning flags, stay out on double-red conditions, never swim near the jetty or boat traffic, and keep children and weak swimmers within direct reach.", mizellAmenities, "Florida State Parks"),
      answer("paddling", "Where can I kayak at Mizell-Johnson State Park?", "Whiskey Creek is a 1.5-mile mangrove-lined paddling route. The official concession rents canoes, kayaks, and paddleboards. Check tides, wind, lightning, rental cutoff, and return time; wear a fitted PFD and stay alert for boats outside sheltered water.", whiskey, "Florida State Parks"),
      answer("food", "Is there food at Mizell-Johnson State Park?", "Yes. Whiskey Creek Hideout is the official concession and offers a restaurant, limited picnic supplies, ice, and watercraft and beach rentals. Hours and inventory can change, so bring drinking water and confirm before relying on it for a meal.", mizellAmenities, "Florida State Parks"),
      answer("trail-surface", "What trails are at Mizell-Johnson State Park?", "The park lists a 0.4-mile Barrier Nature Trail through coastal hammock, a three-mile service-road route, and more than two miles of beach walking. Expect heat, sand, roots, insects, standing water, and limited shade; do not enter posted closures.", mizellAmenities, "Florida State Parks"),
      answer("picnic", "Can I reserve a pavilion at Mizell-Johnson State Park?", "Seven named pavilions normally serve different lots, but the March 2026 notice closes the Leatherback and Osprey pavilions plus picnic areas around restroom 4. Verify availability with the park office before paying or inviting a group.", mizellAmenities, "Florida State Parks"),
      answer("boating", "Can I launch a boat at Mizell-Johnson State Park?", "The boat ramp can launch trailered boats up to 36 feet and the adjacent lot accommodates about 90 vehicle-trailer rigs. It opens one hour before official sunrise and follows separate closing rules. Check conditions and ramp operations before towing to the park.", mizellAmenities, "Florida State Parks"),
      answer("closures", "What is currently closed at Mizell-Johnson State Park?", "Effective March 9, 2026, restrooms 3 and 4, beach access from parking lot 3, picnic areas north and south of restroom 4, and the Leatherback and Osprey pavilions are closed. Follow posted signs because construction conditions can change.", mizell, "Florida State Parks"),
      answer("need-to-know", "What should families know before visiting Mizell-Johnson State Park?", "Choose a specific lot before entering, check the current closure notice and beach flags, and remember there are no lifeguards. Bring water, sun and insect protection, use an open restroom before settling in, keep children within direct reach near surf and docks, and leave the water for thunder.", mizell, "Florida State Parks"),
    ],
    sources: [
      { label: "Florida State Parks current park guide and closure notice", url: mizell },
      { label: "Florida State Parks experiences and amenities", url: mizellAmenities },
      { label: "Florida State Parks Whiskey Creek Hideout", url: whiskey },
      { label: "Florida State Parks park brochure", url: mizellBrochure },
    ],
  },
};

const locations = [
  {
    id: ids.anne,
    park: "Anne Kolb Nature Center",
    city: "Hollywood",
    state: "FL",
    latitude: 26.0366831,
    longitude: -80.1184611,
    address: "751 Sheridan St, Hollywood, FL 33019",
    displayName: "Anne Kolb Nature Center, Hollywood, FL",
    source: "OpenStreetMap contributors",
    sourceUrl: "https://www.openstreetmap.org/relation/8473100",
    checkedAt,
  },
  {
    id: ids.mizell,
    park: "Dr. Von D. Mizell-Eula Johnson State Park",
    city: "Dania Beach",
    state: "FL",
    latitude: 26.0740086,
    longitude: -80.1117378,
    address: "6503 N Ocean Dr, Dania Beach, FL 33004",
    displayName: "Dr. Von D. Mizell-Eula Johnson State Park, Dania Beach, FL",
    source: "OpenStreetMap contributors",
    sourceUrl: "https://www.openstreetmap.org/relation/5682647",
    checkedAt,
  },
];

for (const file of [files.national, files.campaign]) {
  const document = read(file);
  for (const [id, profile] of Object.entries(profiles)) document.parks[id] = { ...(document.parks[id] || {}), ...profile };
  write(file, document);
}

const locationDocument = read(files.locations);
for (const location of locations) {
  const index = locationDocument.findIndex((item) => item.id === location.id);
  if (index >= 0) locationDocument[index] = location;
  else locationDocument.push(location);
}
write(files.locations, locationDocument);

const superCampaign = read(files.superCampaign);
superCampaign.checkedAt = checkedAt;
for (const place of campaignPlaces) {
  const index = superCampaign.places.findIndex((item) => item.id === place.id);
  if (index >= 0) superCampaign.places[index] = place;
  else superCampaign.places.push(place);
}
write(files.superCampaign, superCampaign);

const photos = read(files.photos);
photos.reviewedAt = checkedAt;
for (const [id, selection] of Object.entries(imageSelections)) photos.places[id] = selection;
write(files.photos, photos);

const features = read(files.features);
features.checkedAt = checkedAt;
for (const [id, selection] of Object.entries(featureSelections)) features.places[id] = selection;
for (const [id, note] of Object.entries(featureResearchQueue)) features.researchQueue[id] = note;
write(files.features, features);

const addresses = read(files.addresses);
addresses[ids.anne] = "751 Sheridan St, Hollywood, FL 33019";
addresses[ids.mizell] = "6503 N Ocean Dr, Dania Beach, FL 33004";
write(files.addresses, addresses);

console.log("Seeded Anne Kolb Nature Center and Mizell-Johnson State Park parent guides, licensed galleries, and exact qualifying destinations.");
