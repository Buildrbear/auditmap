#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const checkedAt = "2026-08-10";
const nationalPath = path.join(root, "data/parent-park-information-enrichment-national.json");
const campaignPath = path.join(root, "data/parent-park-information-enrichment-campaign.json");
const locationsPath = path.join(root, "data/launch-location-overrides.json");
const superCampaignPath = path.join(root, "data/south-florida-atlantic-super-enrichment-campaign.json");
const photoSelectionsPath = path.join(root, "data/south-florida-atlantic-photo-selections.json");
const featureSelectionsPath = path.join(root, "data/south-florida-atlantic-feature-selections.json");
const addressesPath = path.join(root, "data/south-florida-atlantic-addresses.json");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

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

const fortLauderdaleFacility = "https://www.parks.fortlauderdale.gov/beach/beaches/fort-lauderdale-beach-park";
const fortLauderdaleParking = "https://www.fortlauderdale.gov/Government/Departments/Transportation-and-Mobility/Parking-Services/Residential-Beach-Parking-Permit";
const fortLauderdaleRescue = "https://www.fortlauderdale.gov/Government/Departments/Fire-Rescue/Organization/Ocean-Rescue";
const fortLauderdaleAccessibility = "https://www.parks.fortlauderdale.gov/parks/parks/ada-accessibility-information";
const fortLauderdaleRules = "https://www.parks.fortlauderdale.gov/parks/park-rules";
const fortLauderdaleDogs = "https://www.parks.fortlauderdale.gov/parks/dog-friendly-places";
const hollywoodParent = "https://hollywoodfl.org/facilities/facility/details/Hollywood-Beach-Broadwalk-109";
const hollywoodBeach = "https://www.hollywoodfl.org/1049/Hollywood-Beach";
const hollywoodSafety = "https://www.hollywoodfl.org/251/Beach-Safety";
const hollywoodMap = "https://hollywoodfl.org/DocumentCenter/View/27071/hollywood-beach-map---03-2026";
const hollywoodDogs = "https://hollywoodfl.org/facilities/facility/details/Dog-Beach-Hollywood-Beach-98";

const campaignPlaces = [
  {
    id: "launch-fl-fort-lauderdale-fort-lauderdale-beach-park",
    name: "Fort Lauderdale Beach Park",
    city: "Fort Lauderdale",
    state: "FL",
    citySlug: "fort-lauderdale-fl",
    operator: "City of Fort Lauderdale Parks and Recreation",
    source: fortLauderdaleFacility,
    featureResearchRadiusMeters: 1400,
    imageQueries: [
      "Fort Lauderdale Beach Park",
      "Fort Lauderdale beach lifeguard tower",
      "Fort Lauderdale beach ocean",
      "Fort Lauderdale Beach Florida",
    ],
    subsites: ["Fort Lauderdale Beach Park Playground", "Fort Lauderdale Beach Park Volleyball Courts", "South Beach Picnic Area"],
  },
  {
    id: "launch-fl-hollywood-hollywood-beach-and-broadwalk",
    name: "Hollywood Beach and Broadwalk",
    city: "Hollywood",
    state: "FL",
    citySlug: "hollywood-fl",
    operator: "City of Hollywood Parks, Recreation and Cultural Arts",
    source: hollywoodParent,
    featureResearchRadiusMeters: 1800,
    imageQueries: ["Hollywood Beach Broadwalk", "Hollywood Beach Florida", "Charnow Park Hollywood Florida", "Hollywood Beach Theatre"],
    subsites: ["Charnow Park", "Hollywood Beach Theatre", "Johnson Street Accessible Beach Entrance", "Garfield Street Parking Garage"],
  },
];

const imageSelections = {
  "launch-fl-fort-lauderdale-fort-lauderdale-beach-park": {
    name: "Fort Lauderdale Beach Park",
    candidates: [
      {
        title: "Fort Lauderdale Beach Park sign",
        url: "https://upload.wikimedia.org/wikipedia/commons/b/be/Fort_Lauderdale_Beach_Park_sign.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Fort_Lauderdale_Beach_Park_sign.jpg",
        creator: "MrBill3",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:MrBill3",
        license: "BY-SA",
        licenseVersion: "4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        width: 3984,
        height: 2988,
        provider: "wikimedia",
        query: "Fort Lauderdale Beach Park",
        reviewStatus: "approved-destination-match",
        reviewNote: "The named park sign, palms, sidewalk, parking, and visible ocean confirm the exact public destination.",
        alt: "Fort Lauderdale Beach Park entrance sign beside palms and beach parking",
        reviewedAt: checkedAt,
      },
      {
        title: "Ft lauderdale beach 1",
        url: "https://upload.wikimedia.org/wikipedia/commons/a/aa/Ft_lauderdale_beach_1.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Ft_lauderdale_beach_1.jpg",
        creator: "MdeVicente",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:MdeVicente",
        license: "BY-SA",
        licenseVersion: "4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        width: 4624,
        height: 2600,
        provider: "wikimedia",
        query: "Fort Lauderdale beach lifeguard tower",
        reviewStatus: "approved-destination-match",
        reviewNote: "The file is explicitly identified as Fort Lauderdale Beach, and visual review confirms an active city lifeguard tower, swimmers, and public shoreline.",
        alt: "Staffed lifeguard tower and swimmers on Fort Lauderdale Beach",
        reviewedAt: checkedAt,
      },
      {
        title: "Beach in Fort Lauderdale, Florida (2014)",
        url: "https://upload.wikimedia.org/wikipedia/commons/0/05/Beach_in_Fort_Lauderdale%2C_Florida_%282014%29.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Beach_in_Fort_Lauderdale,_Florida_(2014).jpg",
        creator: "osseous",
        creatorUrl: "https://www.flickr.com/people/10787737@N02",
        license: "BY",
        licenseVersion: "2.0",
        licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
        width: 1169,
        height: 485,
        provider: "wikimedia",
        query: "Fort Lauderdale beach ocean",
        reviewStatus: "approved-destination-match",
        reviewNote: "The source identifies Fort Lauderdale Beach, and visual review shows a city lifeguard tower, broad sand, palms, and the beachfront skyline.",
        alt: "Lifeguard tower, broad sand, palms, and skyline at Fort Lauderdale Beach",
        reviewedAt: checkedAt,
      },
      {
        title: "Central Beach Fort Lauderdale Beach Florida Atlantic Coast",
        url: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Central_Beach_Fort_Lauderdale_Beach_Florida_Atlantic_Coast.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Central_Beach_Fort_Lauderdale_Beach_Florida_Atlantic_Coast.jpg",
        creator: "EgorovaSvetlana",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:EgorovaSvetlana",
        license: "BY-SA",
        licenseVersion: "4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        width: 4315,
        height: 2759,
        provider: "wikimedia",
        query: "Fort Lauderdale Beach Florida",
        reviewStatus: "approved-area-context",
        reviewNote: "The Commons title identifies Central Beach in Fort Lauderdale, and the wide Atlantic view gives useful shoreline and weather context without substituting another destination.",
        alt: "Wide Atlantic shoreline view along Fort Lauderdale Beach",
        reviewedAt: checkedAt,
      },
    ],
  },
  "launch-fl-hollywood-hollywood-beach-and-broadwalk": {
    name: "Hollywood Beach and Broadwalk",
    candidates: [
      {
        title: "Hollywood Beach Boardwalk (1)",
        url: "https://upload.wikimedia.org/wikipedia/commons/f/ff/Hollywood_Beach_Boardwalk_%281%29.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Hollywood_Beach_Boardwalk_(1).jpg",
        creator: "Tamanoeconomico",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:Tamanoeconomico",
        license: "BY-SA",
        licenseVersion: "4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        width: 6000,
        height: 4000,
        provider: "wikimedia",
        query: "Hollywood Beach Broadwalk",
        reviewStatus: "approved-destination-match",
        reviewNote: "The named Commons file and visual review show the brick Hollywood Broadwalk, palms, beach access, ocean, and adjacent visitor services.",
        alt: "Brick Hollywood Beach Broadwalk beside palms and the Atlantic shoreline",
        reviewedAt: checkedAt,
      },
      {
        title: "Hollywood Beach (1)",
        url: "https://upload.wikimedia.org/wikipedia/commons/9/94/Hollywood_Beach_%281%29.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Hollywood_Beach_(1).jpg",
        creator: "Tamanoeconomico",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:Tamanoeconomico",
        license: "BY-SA",
        licenseVersion: "4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        width: 6000,
        height: 4000,
        provider: "wikimedia",
        query: "Hollywood Beach Florida",
        reviewStatus: "approved-destination-match",
        reviewNote: "The named Commons file shows the Hollywood Beach wall, palms, sand, ocean, and active public shoreline.",
        alt: "Palms, sand, and turquoise water at Hollywood Beach",
        reviewedAt: checkedAt,
      },
      {
        title: "Charnow Park (Hollywood Beach)",
        url: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Charnow_Park_%28Hollywood_Beach%29.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Charnow_Park_(Hollywood_Beach).jpg",
        creator: "Tamanoeconomico",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:Tamanoeconomico",
        license: "BY-SA",
        licenseVersion: "4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        width: 6000,
        height: 4000,
        provider: "wikimedia",
        query: "Charnow Park Hollywood Florida",
        reviewStatus: "approved-destination-match",
        reviewNote: "The exact Commons title and visual review confirm Charnow Park's splash fountain, pavilion seating, playground feature, and adjacent parking garage.",
        alt: "Splash fountain, pavilion, and playground at Charnow Park on Hollywood Beach",
        reviewedAt: checkedAt,
      },
      {
        title: "Hollywood Beach Theatre (1)",
        url: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Hollywood_Beach_Theatre_%281%29.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Hollywood_Beach_Theatre_(1).jpg",
        creator: "Tamanoeconomico",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:Tamanoeconomico",
        license: "BY-SA",
        licenseVersion: "4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        width: 6000,
        height: 4000,
        provider: "wikimedia",
        query: "Hollywood Beach Theatre",
        reviewStatus: "approved-destination-match",
        reviewNote: "The exact Commons title and visible venue name confirm the outdoor Hollywood Beach Theatre and its oceanfront plaza.",
        alt: "Hollywood Beach Theatre stage and oceanfront plaza",
        reviewedAt: checkedAt,
      },
    ],
  },
};

const featureSelections = {
  "launch-fl-fort-lauderdale-fort-lauderdale-beach-park": [],
  "launch-fl-hollywood-hollywood-beach-and-broadwalk": [
    {
      name: "Charnow Park",
      address: "300 Connecticut St, Hollywood, FL 33019",
      latitude: 26.022341,
      longitude: -80.1151925,
      coordinateSource: "https://www.openstreetmap.org/way/423896815",
      officialMapSource: hollywoodMap,
      positionQuality: "reviewed-official-address-destination-centroid",
      imageIndex: 2,
      checkedAt,
      sourceLabel: "City of Hollywood Parks, Recreation and Cultural Arts",
      source: "https://hollywoodfl.org/Facilities/Facility/Details/Charnow-Park-22",
      summary: "Charnow Park is the Broadwalk's dedicated family play stop, with a children's splash fountain, playgrounds, shaded seating, five reservable pavilions, restrooms, outdoor fitness equipment, and restored paddleball courts beside the beach.",
      cost: "Ordinary park, playground, and splash-fountain use is free. Pavilion reservations, organized programs, parking, rentals, food, and special events cost separately.",
      hours: "The current facility schedule displays 7:00 a.m.-6:00 p.m. daily and also notes that City of Hollywood parks are open sunrise to sunset. Use the narrower posted schedule for the splash fountain and staffed amenities, which can close for maintenance, weather, or events.",
      needToKnow: "Navigate to 300 Connecticut Street and the exact Charnow Park pin, not a generic Hollywood Beach marker. The Garfield garage is immediately inland, but parking is paid and can fill. Bring swim clothes, water, sun protection, and dry footwear; the splash fountain can close independently, and bounce houses, alcohol, animal rides, DJs, and inflatable waterslides are prohibited.",
      answerSources: {
        parking: { source: hollywoodMap, sourceLabel: "City of Hollywood" },
        restroom: { source: hollywoodMap, sourceLabel: "City of Hollywood" },
        accessibility: { source: "https://hollywoodfl.org/Facilities/Facility/Details/Charnow-Park-22", sourceLabel: "City of Hollywood Parks, Recreation and Cultural Arts" },
        dogs: { source: hollywoodDogs, sourceLabel: "City of Hollywood Parks, Recreation and Cultural Arts" },
        family: { source: "https://hollywoodfl.org/Facilities/Facility/Details/Charnow-Park-22", sourceLabel: "City of Hollywood Parks, Recreation and Cultural Arts" },
      },
      answers: {
        parking: "The Garfield Street public garage is directly inland from Charnow Park at Connecticut Street. Use the exact park pin, check the current paid rate before entering, and arrive early on weekends or event days because the garage and nearby metered spaces can fill.",
        restroom: "The official park page lists restrooms at Charnow Park, and the current city beach map marks a public restroom in the Charnow/Garfield area. Check the facility before play because cleaning or maintenance can temporarily close an individual restroom.",
        accessibility: "The city lists Charnow Park as ADA accessible and identifies Connecticut Street as an accessible beach access point. The page does not promise that every play or splash feature provides the same transfer access, so confirm a specific need with Parks before traveling.",
        dogs: "Charnow Park is not the designated off-leash or dog-beach area. Hollywood's Dog Beach is farther north between the Pershing and Custer Street lifeguard stands. Keep dogs leashed outside that designated area and away from the splash fountain and play equipment.",
        family: "This is the Broadwalk's strongest dedicated play-and-splash stop. Pack for both wet and dry play, use the shaded pavilion area for breaks when available, supervise continuously around the fountain and crowds, and keep a backup plan because weather or maintenance can close the water feature without closing the beach.",
      },
    },
    {
      name: "Hollywood Beach Theatre",
      address: "200 Johnson St, Hollywood, FL 33019",
      latitude: 26.0195204,
      longitude: -80.1151353,
      coordinateSource: "https://www.openstreetmap.org/way/714578858",
      officialMapSource: hollywoodMap,
      positionQuality: "reviewed-named-public-map-destination-centroid",
      imageIndex: 3,
      checkedAt,
      sourceLabel: "City of Hollywood Parks, Recreation and Cultural Arts",
      source: "https://www.hollywoodfl.org/facilities/facility/details/Hollywood-Beach-Theater-Plaza-97",
      summary: "Hollywood Beach Theatre is the Broadwalk's open-air oceanfront stage and plaza at Johnson Street, with regularly scheduled live music, an Atlantic backdrop, step-free plaza access, and nearby beach, restaurant, restroom, parking, and shuttle connections.",
      cost: "The city does not list a general admission charge for the regularly scheduled outdoor entertainment. Special events, food, parking, reserved programming, and nearby private activities can cost separately.",
      hours: "The plaza follows posted beach and event access. The city currently advertises musical entertainment Wednesday-Sunday from 7:00-9:00 p.m.; individual performances can be canceled, rescheduled, or changed for weather, holidays, private programming, or special events.",
      needToKnow: "Navigate to the exact Johnson Street theatre pin, then verify the live event calendar before making a special trip. This is an uncovered outdoor plaza with limited guaranteed seating; bring hearing and sun or rain protection as needed, keep walking routes clear, and expect parking and pedestrian traffic to increase before performances.",
      answerSources: {
        parking: { source: hollywoodMap, sourceLabel: "City of Hollywood" },
        restroom: { source: hollywoodMap, sourceLabel: "City of Hollywood" },
        accessibility: { source: "https://www.hollywoodfl.org/facilities/facility/details/Hollywood-Beach-Theater-Plaza-97", sourceLabel: "City of Hollywood Parks, Recreation and Cultural Arts" },
        dogs: { source: hollywoodDogs, sourceLabel: "City of Hollywood Parks, Recreation and Cultural Arts" },
        family: { source: "https://www.hollywoodfl.org/facilities/facility/details/Hollywood-Beach-Theater-Plaza-97", sourceLabel: "City of Hollywood Parks, Recreation and Cultural Arts" },
      },
      answers: {
        parking: "Use the Johnson Street theatre pin and choose a public garage or legal metered space shown on the city's beach map. The theatre is central on the Broadwalk, but event nights can fill nearby parking; allow time to walk from an alternate garage or use the Sun Shuttle.",
        restroom: "The city's beach map marks public restrooms along the Broadwalk, including central facilities near the Johnson Street activity area. Identify the nearest currently open facility before the performance rather than assuming the theatre stage itself contains a public restroom.",
        accessibility: "The city lists the theatre and plaza as ADA accessible, and Johnson Street is one of the published accessible beach access points. Confirm reserved-event seating or a specific viewing accommodation with the event operator before arrival because open-plaza layouts vary.",
        dogs: "The theatre plaza is not Hollywood's designated Dog Beach. Dogs may use only the separate marked Dog Beach between Pershing and Custer streets under its rules; do not bring a dog into a crowded performance unless current city rules and the event permit it.",
        family: "The open-air music setting can work well for families, but performances run into the evening and crowd, noise, weather, and seating conditions vary. Check the event listing, bring hearing protection for sensitive children, and agree on a nearby meeting point before the plaza becomes busy.",
      },
    },
  ],
};

const featureResearchQueue = {
  "launch-fl-fort-lauderdale-fort-lauderdale-beach-park": "Published the evidence-complete parent guide with four reviewed beach photographs. Secure exact reusable photo-and-pin pairs before publishing the playground, volleyball courts, basketball court, non-motorized launch, picnic area, showers, or individual parking areas as separate pages.",
  "launch-fl-hollywood-hollywood-beach-and-broadwalk": "Published Charnow Park and Hollywood Beach Theatre from exact official pages, reviewed address pins, and destination-specific reusable photography. Secure exact photo-and-pin pairs before adding Dog Beach, accessible beach mats, North Beach Park, Garfield garage, individual restroom buildings, public art, or separate Broadwalk entrances.",
};

const profiles = {
  "launch-fl-fort-lauderdale-fort-lauderdale-beach-park": {
    name: "Fort Lauderdale Beach Park",
    city: "Fort Lauderdale",
    citySlug: "fort-lauderdale-fl",
    operator: "City of Fort Lauderdale Parks and Recreation",
    sourceLabel: "City of Fort Lauderdale Parks and Recreation",
    source: fortLauderdaleFacility,
    address: "1100 Seabreeze Blvd, Fort Lauderdale, FL 33316",
    hours: "Use posted park hours. The city currently lists Beach Park parking from 5:00 a.m. to 2:00 a.m.; seasonal lifeguard coverage is shorter and the lot is closed from 2:00 a.m. to 5:00 a.m.",
    cost: "General beach and park access is free. The city currently lists nonresident Beach Park parking at $4 per hour, with special-event rates possible.",
    summary: "Fort Lauderdale Beach Park is the city's amenity-rich south beach hub, combining guarded Atlantic shoreline with a playground, basketball and volleyball courts, picnic tables, grills, outdoor showers, restrooms, and a non-motorized boat ramp beside paid beach parking.",
    accessibility: "The city identifies accessible parking, picnic tables, grills, restrooms, and showers at Fort Lauderdale Beach Park. Visitors who need beach-mobility assistance should confirm the current access route before leaving.",
    transit: "Broward County Transit and the LauderGo community shuttle serve the beach area. Use the current trip planner because routes, stops, and event detours can change.",
    verifiedAt: checkedAt,
    searchAnswers: [
      answer("hours", "What hours is Fort Lauderdale Beach Park open?", "Follow the hours posted at the park. The city currently publishes Beach Park parking from 5:00 a.m. to 2:00 a.m., with no parking from 2:00-5:00 a.m. Lifeguards use a shorter seasonal schedule: 9:45 a.m.-7:00 p.m. in spring and summer and 9:15 a.m.-6:00 p.m. in fall and winter.", fortLauderdaleRescue, "City of Fort Lauderdale Ocean Rescue"),
      answer("entrance", "What address should I use for Fort Lauderdale Beach Park?", "Use 1100 Seabreeze Boulevard, Fort Lauderdale, FL 33316 for the park. The beach parking system also identifies the larger Fort Lauderdale Beach Park parking area along Seabreeze Boulevard, so follow current city signs rather than stopping at a generic Fort Lauderdale Beach pin.", fortLauderdaleFacility, "City of Fort Lauderdale Parks and Recreation"),
      answer("parking", "Where should I park for Fort Lauderdale Beach Park?", "The city-operated Fort Lauderdale Beach Park lot is the closest large public parking option. The current nonresident rate is $4 per hour and parking is allowed from 5:00 a.m.-2:00 a.m.; special events can replace hourly pricing and fill the lot. Las Olas Garage and beach transit are alternatives.", fortLauderdaleParking, "City of Fort Lauderdale Parking Services"),
      answer("fees", "Does Fort Lauderdale Beach Park charge admission?", "The city does not list a general admission fee for the beach or ordinary park amenities. Parking, permits, rentals, concessions, organized activities, and special events can cost extra; verify the live parking rate before arriving.", fortLauderdaleFacility, "City of Fort Lauderdale Parks and Recreation"),
      answer("restroom", "Are there restrooms and showers at Fort Lauderdale Beach Park?", "Yes. The official facility page lists restrooms and outdoor showers, and the city's accessibility page identifies accessible restrooms and showers. Individual fixtures can close for cleaning or maintenance, so check the closest facility before settling on the sand.", fortLauderdaleAccessibility, "City of Fort Lauderdale Parks and Recreation"),
      answer("playground", "Does Fort Lauderdale Beach Park have a playground?", "Yes. The official amenity list includes a playground, plus a full basketball court, volleyball court, picnic tables, grills, and open beach access. Bring sun protection and supervise children closely around the parking lot, Seabreeze Boulevard, sports courts, and ocean.", fortLauderdaleFacility, "City of Fort Lauderdale Parks and Recreation"),
      answer("accessibility", "What accessible amenities are at Fort Lauderdale Beach Park?", "The city identifies accessible parking, picnic tables, grills, restrooms, and showers at the park. Sand and changing beach conditions can still affect the final route, so visitors who need a beach wheelchair or hands-on assistance should contact the city before traveling.", fortLauderdaleAccessibility, "City of Fort Lauderdale Parks and Recreation"),
      answer("dog-area", "Are dogs allowed at Fort Lauderdale Beach Park?", "Do not assume dogs may use ordinary Fort Lauderdale Beach Park sand. The city designates a separate Canine Beach north of Sunrise Boulevard near lifeguard tower 16, currently open 6:00-9:00 a.m. and 5:00-7:00 p.m., with its own control, vaccination, and cleanup rules.", fortLauderdaleDogs, "City of Fort Lauderdale Parks and Recreation"),
      answer("transit", "Can I reach Fort Lauderdale Beach Park without a car?", "Yes. Broward County Transit serves the beach corridor, and the city points visitors to the LauderGo community shuttle as another option. Check the live route and stop for 1100 Seabreeze Boulevard because events and beach traffic can change the practical approach.", fortLauderdaleParking, "City of Fort Lauderdale Parking Services"),
      answer("weather", "How do I check swimming conditions at Fort Lauderdale Beach?", "Check the flag at the nearest staffed lifeguard tower and follow Ocean Rescue instructions. The city also publishes a beach-conditions hotline at 954-828-4597. Double-red flags mean the water and/or beach is closed; lightning, pollution, surf, currents, or marine life can change conditions quickly.", fortLauderdaleRescue, "City of Fort Lauderdale Ocean Rescue"),
      answer("swimming", "When are lifeguards on duty at Fort Lauderdale Beach Park?", "Fort Lauderdale Ocean Rescue staffs the municipal beach every day of the year. The current coverage schedule is 9:45 a.m.-7:00 p.m. in spring and summer and 9:15 a.m.-6:00 p.m. in fall and winter. Swim only in front of a staffed tower and confirm the day's flags.", fortLauderdaleRescue, "City of Fort Lauderdale Ocean Rescue"),
      answer("picnic", "Can I picnic or grill at Fort Lauderdale Beach Park?", "The facility page lists picnic tables and grills. City beach rules prohibit unapproved grills or generators outside designated or permitted use, so use only the installed facilities, follow posted fire restrictions, and do not bring glass or alcohol onto the beach.", fortLauderdaleRules, "City of Fort Lauderdale Parks and Recreation"),
      answer("rules", "What is prohibited on Fort Lauderdale Beach?", "Glass containers and alcohol are prohibited on the beach, and digging holes, erecting tents or fencing, and using unapproved grills or generators are not allowed. Canopies can also be restricted during special events. Follow lifeguard, ranger, and police directions.", fortLauderdaleRules, "City of Fort Lauderdale Parks and Recreation"),
      answer("need-to-know", "What should families know before visiting Fort Lauderdale Beach Park?", "This is both a recreation park and an exposed ocean beach. Check warning flags first, park legally before the lot fills, use the restroom before choosing a distant sand spot, bring water and sun protection, and keep children within direct reach near traffic, courts, grills, the boat ramp, and surf.", fortLauderdaleRescue, "City of Fort Lauderdale Ocean Rescue"),
      answer("public-art", "What are the main landmarks at Fort Lauderdale Beach Park?", "The park's signed Seabreeze Boulevard entrance, guarded beach, playground, sports courts, picnic area, showers, and non-motorized boat ramp form the main visitor zones. The Fort Lauderdale Aquatic Center and Las Olas Oceanside Park are nearby but operate as separate destinations.", fortLauderdaleFacility, "City of Fort Lauderdale Parks and Recreation"),
    ],
    sources: [
      { label: "City of Fort Lauderdale Parks and Recreation", url: fortLauderdaleFacility },
      { label: "City of Fort Lauderdale Ocean Rescue", url: fortLauderdaleRescue },
      { label: "City of Fort Lauderdale Parking Services", url: fortLauderdaleParking },
    ],
  },
  "launch-fl-hollywood-hollywood-beach-and-broadwalk": {
    name: "Hollywood Beach and Broadwalk",
    alternateNames: ["Hollywood Beach & Broadwalk"],
    city: "Hollywood",
    citySlug: "hollywood-fl",
    operator: "City of Hollywood Parks, Recreation and Cultural Arts",
    sourceLabel: "City of Hollywood Parks, Recreation and Cultural Arts",
    source: hollywoodParent,
    address: "A1A between Dania Beach Blvd and Hallandale Beach Blvd, Hollywood, FL 33019",
    hours: "City of Hollywood parks, including Hollywood Beach and Broadwalk, are open from sunrise to sunset. Lifeguards are normally on duty 9:00 a.m.-6:00 p.m., with 9:00 a.m.-7:00 p.m. coverage on holidays and special events.",
    cost: "Public beach and Broadwalk access is free. Parking, rentals, food, reserved facilities, and ticketed or special activities cost separately.",
    summary: "Hollywood Beach and Broadwalk is a nearly 2.5-mile brick oceanfront promenade and public beach, linking guarded swimming, accessible sand routes, restaurants, bike and walking space, Charnow Park's children's water playground, Hollywood Beach Theatre, public restrooms, and multiple parking and shuttle approaches.",
    accessibility: "The city lists the destination as ADA accessible and identifies beach access points at Carolina, Connecticut, Johnson, New York, Tyler, Harrison, and Oregon streets and between Iris and Magnolia terraces.",
    transit: "The Hollywood Sun Shuttle serves the barrier island and connections toward Downtown Hollywood. Check the current app, fare, operating area, and event detours before depending on it.",
    verifiedAt: checkedAt,
    searchAnswers: [
      answer("hours", "What hours are Hollywood Beach and the Broadwalk open?", "The city lists its parks as open from sunrise to sunset. Lifeguard coverage is normally 9:00 a.m.-6:00 p.m. year-round and extends to 7:00 p.m. on holidays and special events. Restaurants, garages, restrooms, Charnow Park, and the Beach Theatre can keep different schedules.", hollywoodParent, "City of Hollywood Parks, Recreation and Cultural Arts"),
      answer("entrance", "Where should I start at Hollywood Beach Broadwalk?", "The Broadwalk runs along A1A between Dania Beach Boulevard and Hallandale Beach Boulevard. Johnson Street is a practical central arrival point near Hollywood Beach Theatre, while Connecticut Street is best for Charnow Park. Use the exact destination pin for the part of the beach you plan to visit.", hollywoodMap, "City of Hollywood"),
      answer("parking", "Where should I park for Hollywood Beach Broadwalk?", "The city map identifies public garages at Garfield Street and Nevada Street, public parking at North Beach Park, metered street spaces, and additional public-access private garages and lots. Choose parking near the intended subsite and check current rates and event restrictions before entering the barrier island.", hollywoodMap, "City of Hollywood"),
      answer("fees", "Is Hollywood Beach Broadwalk free?", "Yes. General access to the public beach and Broadwalk is free. Parking, bike or surrey rentals, food, private attractions, reserved pavilions, and special programs cost separately.", hollywoodParent, "City of Hollywood Parks, Recreation and Cultural Arts"),
      answer("restroom", "Where are public restrooms on Hollywood Beach Broadwalk?", "The city's March 2026 beach map marks public restrooms at several points along the Broadwalk, including the Charnow Park/Garfield area and central and southern access streets. Identify the nearest marked facility before settling on the beach because the promenade is nearly 2.5 miles long.", hollywoodMap, "City of Hollywood"),
      answer("accessibility", "Where are accessible beach entrances at Hollywood Beach?", "Accessible beach access points are listed at Carolina, Connecticut, Johnson, New York, Tyler, Harrison, and Oregon streets and between Iris and Magnolia terraces. Match the access street to nearby parking and the desired destination rather than assuming every cross street has the same mat or route.", hollywoodBeach, "City of Hollywood"),
      answer("splash-pad", "Is there a splash pad on Hollywood Beach Broadwalk?", "Yes. Charnow Park at 300 Connecticut Street has a children's splash fountain, playgrounds, shaded seating, pavilions, restrooms, and restored paddleball courts. It follows its own posted operating conditions and can close for weather or maintenance even when the beach remains open.", "https://hollywoodfl.org/Facilities/Facility/Details/Charnow-Park-22", "City of Hollywood Parks, Recreation and Cultural Arts"),
      answer("dog-area", "Are dogs allowed on Hollywood Beach?", "Dogs belong only in the city's designated Dog Beach between the Pershing and Custer Street lifeguard stands. No pass is currently required and the designated area is open sunrise to sunset. Dogs must be controlled, have a current rabies tag, and remain leashed outside Dog Beach.", hollywoodDogs, "City of Hollywood Parks, Recreation and Cultural Arts"),
      answer("transit", "Can I reach Hollywood Beach without parking on the barrier island?", "The Hollywood Sun Shuttle serves the beach and Downtown Hollywood connections. The city's beach map also marks shuttle stops near parking hubs. Check the current service area, app-request rules, fare, and operating hours because those details can change.", hollywoodMap, "City of Hollywood"),
      answer("trail-surface", "Can I bike or skate on Hollywood Beach Broadwalk?", "Yes. The brick-paved Broadwalk is used by pedestrians, joggers, bicycles, rollerblades, and other human-powered users. Motorized recreational devices are prohibited, while mobility devices used for disability access remain allowed. Stay in the designated path and yield to pedestrians.", hollywoodParent, "City of Hollywood Parks, Recreation and Cultural Arts"),
      answer("swimming", "When are lifeguards on duty at Hollywood Beach?", "Hollywood Beach Safety operates year-round, seven days a week. Current hours are 9:00 a.m.-6:00 p.m., extended to 7:00 p.m. for holidays and special events. Swim near an open tower, check warning flags, and leave the water for thunder or lightning.", hollywoodSafety, "City of Hollywood Beach Safety"),
      answer("food", "Are there places to eat along Hollywood Beach Broadwalk?", "Yes. The city describes beachfront restaurants, bars, shopping, and rentals along the Broadwalk. Hours and prices belong to each operator, so do not rely on a particular business being open late; carry water and identify a backup before a long walk.", hollywoodBeach, "City of Hollywood"),
      answer("public-art", "What are the main landmarks on Hollywood Beach Broadwalk?", "The strongest family and culture stops are Charnow Park's water playground and pavilions, Hollywood Beach Theatre at Johnson Street, the brick Broadwalk itself, accessible beach entrances, public-art displays, and the guarded Atlantic shoreline. North Beach Park and Dog Beach are separate northern destinations.", hollywoodParent, "City of Hollywood Parks, Recreation and Cultural Arts"),
      answer("weather", "How do I check current Hollywood Beach conditions?", "Use the city's Beach Safety Conditions link and read the warning flag at the nearest lifeguard tower. Lightning, rip currents, surf, marine life, king tides, storms, or special events can change a safe route or close water access without closing the entire Broadwalk.", hollywoodSafety, "City of Hollywood Beach Safety"),
      answer("need-to-know", "What should families know before visiting Hollywood Beach Broadwalk?", "Choose the subsite first, then park near it; the Broadwalk is nearly 2.5 miles long. Charnow Park is the best dedicated play-and-splash stop, Johnson Street is the central theatre and accessible-beach hub, and lifeguard hours are shorter than park hours. Bring water, sun protection, and a weather exit plan.", hollywoodParent, "City of Hollywood Parks, Recreation and Cultural Arts"),
    ],
    sources: [
      { label: "City of Hollywood Parks, Recreation and Cultural Arts", url: hollywoodParent },
      { label: "City of Hollywood Beach Safety", url: hollywoodSafety },
      { label: "City of Hollywood March 2026 beach map", url: hollywoodMap },
    ],
  },
};

const locations = [
  {
    id: "launch-fl-fort-lauderdale-fort-lauderdale-beach-park",
    park: "Fort Lauderdale Beach Park",
    city: "Fort Lauderdale",
    state: "FL",
    latitude: 26.109815,
    longitude: -80.106029,
    address: "1100 Seabreeze Blvd, Fort Lauderdale, FL 33316",
    displayName: "Fort Lauderdale Beach Park, Fort Lauderdale, FL",
    source: "OpenStreetMap contributors",
    sourceUrl: "https://www.openstreetmap.org/way/1306291113",
    checkedAt,
  },
  {
    id: "launch-fl-hollywood-hollywood-beach-and-broadwalk",
    park: "Hollywood Beach and Broadwalk",
    city: "Hollywood",
    state: "FL",
    latitude: 26.0195204,
    longitude: -80.1151353,
    address: "A1A between Dania Beach Blvd and Hallandale Beach Blvd, Hollywood, FL 33019",
    displayName: "Hollywood Beach and Broadwalk at Johnson Street, Hollywood, FL",
    source: "OpenStreetMap contributors",
    sourceUrl: "https://www.openstreetmap.org/way/714578858",
    checkedAt,
  },
];

for (const file of [nationalPath, campaignPath]) {
  const document = read(file);
  for (const [id, profile] of Object.entries(profiles)) {
    document.parks[id] = { ...(document.parks[id] || {}), ...profile };
  }
  write(file, document);
}

const locationDocument = read(locationsPath);
for (const location of locations) {
  const index = locationDocument.findIndex((item) => item.id === location.id);
  if (index >= 0) locationDocument[index] = location;
  else locationDocument.push(location);
}
write(locationsPath, locationDocument);

const superCampaign = read(superCampaignPath);
superCampaign.checkedAt = checkedAt;
for (const place of campaignPlaces) {
  const index = superCampaign.places.findIndex((item) => item.id === place.id);
  if (index >= 0) superCampaign.places[index] = place;
  else superCampaign.places.push(place);
}
write(superCampaignPath, superCampaign);

const photoSelections = read(photoSelectionsPath);
photoSelections.reviewedAt = checkedAt;
for (const [id, selection] of Object.entries(imageSelections)) photoSelections.places[id] = selection;
write(photoSelectionsPath, photoSelections);

const featureSelectionsDocument = read(featureSelectionsPath);
featureSelectionsDocument.checkedAt = checkedAt;
for (const [id, selection] of Object.entries(featureSelections)) featureSelectionsDocument.places[id] = selection;
for (const [id, note] of Object.entries(featureResearchQueue)) featureSelectionsDocument.researchQueue[id] = note;
write(featureSelectionsPath, featureSelectionsDocument);

const addresses = read(addressesPath);
addresses["launch-fl-fort-lauderdale-fort-lauderdale-beach-park"] = "1100 Seabreeze Blvd, Fort Lauderdale, FL 33316";
addresses["launch-fl-hollywood-hollywood-beach-and-broadwalk"] = "A1A between Dania Beach Blvd and Hallandale Beach Blvd, Hollywood, FL 33019";
write(addressesPath, addresses);

console.log(`Seeded ${Object.keys(profiles).length} South Florida beach parent guides, reviewed locations, image selections, and feature records.`);
