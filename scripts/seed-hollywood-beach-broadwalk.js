#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const checkedAt = "2026-08-10";
const id = "launch-fl-hollywood-hollywood-beach-broadwalk";
const legacyId = "launch-fl-hollywood-hollywood-beach-and-broadwalk";
const official = "https://www.hollywoodfl.org/facilities/facility/details/Hollywood-Beach-Broadwalk-109";
const beachGuide = "https://www.hollywoodfl.org/1049/Hollywood-Beach";
const beachSafety = "https://www.hollywoodfl.org/251/Beach-Safety";
const parking = "https://www.hollywoodfl.org/704/Parking-Garage-Rates";
const transit = "https://www.hollywoodfl.org/933/City-of-Hollywood-Transit-Options";
const beachRules = "https://www.hollywoodfl.org/DocumentCenter/View/24727/New-Horizons-April-2025-WEB";
const beachMap = "https://hollywoodfl.org/DocumentCenter/View/27071/hollywood-beach-map---03-2026";
const charnow = "https://www.hollywoodfl.org/facilities/facility/details/Charnow-Park-22";
const theater = "https://www.hollywoodfl.org/facilities/facility/details/Hollywood-Beach-Theater-Plaza-97";
const dogBeach = "https://hollywoodfl.org/facilities/facility/details/Dog-Beach-Hollywood-Beach-98";

const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const upsert = (items, item, key = "id") => {
  const index = items.findIndex((candidate) => candidate[key] === item[key]);
  if (index >= 0) items[index] = item;
  else items.push(item);
};
const answer = (intentKey, question, text, source = official, sourceLabel = "City of Hollywood") => ({
  intentKey,
  question,
  answer: text,
  sourceLabel,
  source,
  sourceType: "official",
  checkedAt,
});

const parentProfile = {
  operator: "City of Hollywood Parks, Recreation and Cultural Arts",
  sourceLabel: "City of Hollywood",
  source: official,
  hours: "Hollywood Beach and the Broadwalk follow the City's sunrise-to-sunset park schedule. Lifeguards operate daily from 9:00 a.m. to 6:00 p.m., extended to 7:00 p.m. on holidays and special-event days. Individual parks, garages, events, restaurants, and concessions use separate schedules.",
  cost: "Beach and Broadwalk access are free. City garages, metered spaces, food, rentals, pavilion reservations, programs, and special events can cost separately.",
  summary: "Hollywood Beach and its nearly 2.5-mile brick Broadwalk form a major public oceanfront corridor with guarded swimming, a designated bike lane, accessible beach entries, public restrooms, Charnow Park's splash fountain and playground, Hollywood Beach Theatre, Dog Beach, public art, dining, and transit connections.",
  accessibility: "The City identifies accessible beach entries at Carolina, Connecticut, Johnson, New York, Tyler, Harrison, and Oregon streets and between Iris and Magnolia terraces. Charnow Park and Hollywood Beach Theatre are listed as ADA accessible; verify the closest access mat and current condition for the exact destination.",
  searchAnswers: [
    answer("hours", "When are Hollywood Beach and the Broadwalk open?", "The City lists Hollywood parks, including Hollywood Beach and the Broadwalk, as open from sunrise to sunset. Lifeguard coverage is 9:00 a.m.-6:00 p.m. year-round and 9:00 a.m.-7:00 p.m. on holidays and special-event days; businesses, Charnow Park facilities, performances, and garages use separate schedules.", beachSafety),
    answer("entrance", "Where should I start at Hollywood Beach and the Broadwalk?", "For the central Broadwalk, theatre, restaurants, and an accessible beach entry, start near Johnson Street. For a playground and splash fountain, use Charnow Park at 300 Connecticut Street. Dog Beach is much farther north between the Pershing and Custer Street lifeguard stands, so navigate to that destination separately.", beachMap),
    answer("parking", "Where should I park for Hollywood Beach and the Broadwalk?", "Garfield Garage at 300 Connecticut Street is the practical choice for Charnow Park, while Nebraska Garage at 327 Nebraska Street serves the central Broadwalk. Both operate 24/7. Nonresident rates currently vary by weekday and weekend, and special-event rates can replace hourly pricing; check the City's parking page before arriving.", parking),
    answer("restroom", "Where are public restrooms on Hollywood Beach?", "The City's 2026 beach map marks public restrooms along the corridor, including Charnow Park and the Nebraska Street garage area. City visitor guidance also identifies facilities at Tyler, Fillmore, Johnson, Garfield, Taft, and Missouri streets. Pick a restroom near your planned beach entry rather than assuming every block has one.", beachMap),
    answer("fees", "Is Hollywood Beach and the Broadwalk free?", "Walking the Broadwalk, using the public beach, Charnow Park play areas, and attending ordinary open access at the theatre plaza are free. Parking, food, rentals, reserved pavilions, organized programs, and some events cost separately.", official),
    answer("accessibility", "Where are accessible beach entries at Hollywood Beach?", "The City lists accessible beach access at Carolina, Connecticut, Johnson, New York, Tyler, Harrison, and Oregon streets and between Iris and Magnolia terraces. Charnow Park and the theatre are listed as ADA accessible. Use the 2026 beach map to pair the chosen access with parking and restrooms, then confirm current mat and surf conditions.", beachGuide),
    answer("dog-area", "Where are dogs allowed on Hollywood Beach?", "Dogs are allowed only at the designated free Dog Beach between the Pershing and Custer Street lifeguard stands. It is open sunrise to sunset. Dogs must be controlled, have a current rabies tag, and remain leashed everywhere outside Dog Beach; owners must remove waste.", dogBeach),
    answer("playground", "Is there a playground or splash pad on the Hollywood Beach Broadwalk?", "Yes. Charnow Park at Connecticut Street has playgrounds, a children's interactive splash fountain, shaded seating, picnic pavilions, restrooms, outdoor fitness equipment, and restored paddleball courts. The splash feature can close for maintenance or weather, so verify same-day status before promising water play.", charnow),
    answer("family", "What should families know before visiting Hollywood Beach?", "Charnow Park is the most concentrated family stop because it combines play equipment, a splash fountain, shade, picnic space, and restrooms beside the Broadwalk. For ocean swimming, stay near an operating lifeguard tower, check warning flags, and maintain close supervision around surf, bicycles, busy crossings, and the open promenade.", beachSafety),
    answer("transit", "Can I reach Hollywood Beach without parking at the beach?", "Yes. The free Holly-Go Orange Line offers a Friday-through-Sunday City Hall park-and-ride connection, and the Sun Shuttle provides on-demand service in its operating zones for a published per-rider fare. Check current routes, service days, app availability, and beach stops before leaving.", transit),
    answer("trail-surface", "Can I bike or skate on the Hollywood Beach Broadwalk?", "The nearly 2.5-mile brick promenade has a designated bicycle path used by bicyclists and rollerbladers as well as space for people walking and jogging. Human-powered users must yield to pedestrians and stay in the designated lane; motorized recreational devices are prohibited except mobility devices allowed by disability law.", official),
    answer("picnic", "Where can I picnic at Hollywood Beach?", "Use designated picnic areas between Sherman and Custer streets or established parks such as Charnow Park. Charnow has five reservable pavilions with separate rates, capacities, deposits, and a nonresident surcharge. Barbecuing and alcohol are prohibited on the sandy beach.", beachRules),
    answer("need-to-know", "What rules are easiest to miss at Hollywood Beach?", "Swim near a lifeguard and obey warning flags. Pets belong only at Dog Beach, bicycles belong in the Broadwalk bike lane, and the sandy beach prohibits alcohol, barbecuing, smoking, littering, scooters, skateboards, motorized recreational vehicles, drones, balloons, bird feeding, and disposable plastic, polystyrene, or glass containers. Follow current signs when rules or event controls differ.", beachRules),
    answer("weather", "What conditions should I check before going to Hollywood Beach?", "Check the City's beach-safety conditions and warning flags immediately before swimming. Lightning, rip currents, rough surf, heat, heavy rain, king tides, and special-event crowd controls can change a visit quickly. Leave the sand when thunder is heard and never treat lifeguard operating hours as a guarantee that swimming conditions are safe.", beachSafety),
    answer("events", "Where can I find live music on the Hollywood Beach Broadwalk?", "Hollywood Beach Theatre at Johnson Street normally hosts free musical entertainment Wednesday through Sunday from 7:00 to 9:00 p.m., with programming supplied by the adjacent resort. Performances can change for weather, holidays, private events, or production needs, so check the current calendar before traveling for a specific show.", theater),
  ],
  sources: [
    { label: "City of Hollywood", url: official },
    { label: "City of Hollywood Beach Safety", url: beachSafety },
    { label: "City of Hollywood 2026 Beach Map", url: beachMap },
  ],
  verifiedAt: checkedAt,
};

const photoCandidates = [
  {
    title: "Charnow Park (Hollywood Beach)",
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Charnow%20Park%20%28Hollywood%20Beach%29.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Charnow_Park_(Hollywood_Beach).jpg",
    creator: "Tamanoeconomico",
    creatorUrl: "https://commons.wikimedia.org/wiki/User:Tamanoeconomico",
    license: "BY-SA",
    licenseVersion: "4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    width: 6000,
    height: 4000,
    provider: "wikimedia",
    query: "Charnow Park Hollywood Beach",
    reviewStatus: "approved-destination-match",
    reviewNote: "The Commons title, caption, and WGS-84 geotag identify Charnow Park; visual review confirms the beachfront park and play landscape.",
    alt: "Play and recreation landscape at Charnow Park beside Hollywood Beach",
    reviewedAt: checkedAt,
  },
  {
    title: "Hollywood Beach Theatre (1)",
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Hollywood%20Beach%20Theatre%20%281%29.jpg",
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
    reviewNote: "The Commons title, caption, and geotag identify the Hollywood Beach Theatre at Johnson Street.",
    alt: "Hollywood Beach Theatre and plaza on the oceanfront Broadwalk",
    reviewedAt: checkedAt,
  },
  {
    title: "Dog Beach - Hollywood, Florida - DSC08787",
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Dog%20Beach%20-%20Hollywood%2C%20Florida%20-%20DSC08787.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Dog_Beach_-_Hollywood,_Florida_-_DSC08787.jpg",
    creator: "Daderot",
    creatorUrl: "https://commons.wikimedia.org/wiki/User:Daderot",
    license: "CC0",
    licenseVersion: "1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    width: 5472,
    height: 3648,
    provider: "wikimedia",
    query: "Dog Beach Hollywood Florida",
    reviewStatus: "approved-destination-match",
    reviewNote: "The Commons record explicitly identifies Hollywood Dog Beach, and the official City page confirms the named destination between Pershing and Custer streets.",
    alt: "Dogs and visitors on the sand at Hollywood Dog Beach",
    reviewedAt: checkedAt,
  },
  {
    title: "Hollywood Beach Boardwalk (1)",
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Hollywood%20Beach%20Boardwalk%20%281%29.jpg",
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
    reviewNote: "The Commons record identifies and geotags the Hollywood Beach Broadwalk and provides a representative promenade view.",
    alt: "Brick promenade, palms, and oceanfront activity on the Hollywood Beach Broadwalk",
    reviewedAt: checkedAt,
  },
];

const features = [
  {
    name: "Charnow Park",
    address: "300 Connecticut St, Hollywood, FL 33020",
    latitude: 26.022835,
    longitude: -80.115237,
    coordinateSource: "https://commons.wikimedia.org/wiki/File:Charnow_Park_(Hollywood_Beach).jpg",
    officialMapSource: charnow,
    positionQuality: "reviewed-geotagged-destination-photo",
    imageIndex: 0,
    checkedAt,
    sourceLabel: "City of Hollywood",
    source: charnow,
    summary: "Charnow Park is the Broadwalk's concentrated family recreation stop at Connecticut Street, with playgrounds, an interactive splash fountain, shaded seating, picnic pavilions, outdoor fitness equipment, restrooms, and restored paddleball courts.",
    cost: "Ordinary park, playground, splash-fountain, fitness, and paddleball use are free. Reserving one of the five pavilions requires hourly payment, a refundable deposit, sales tax, and a 50% surcharge for non-Hollywood residents.",
    hours: "The City lists Charnow Park facilities from 7:00 a.m. to 6:00 p.m. daily and also notes the general sunrise-to-sunset City park schedule. The splash fountain, pavilion reservations, maintenance work, and special events may use shorter or controlled hours.",
    needToKnow: "Use Garfield Garage at the same Connecticut Street address for the shortest practical arrival. The splash fountain can close for maintenance, lightning, or water-quality work. Alcohol, bounce houses, animal displays, DJs, and inflatable waterslides are prohibited, and pavilion reservations do not grant exclusive control of the rest of the park.",
    answers: {
      parking: "Garfield Garage is at 300 Connecticut Street, the same published address as Charnow Park, and operates 24/7. Visitor rates change by weekday, weekend, holiday, and special event; verify the current rate and garage access before arriving.",
      restroom: "The City lists restrooms at Charnow Park. Availability can change with maintenance, events, or water work, so families should identify the backup public facilities shown on the 2026 beach map.",
      accessibility: "The City lists Charnow Park as ADA accessible, and Connecticut Street is one of the named accessible beach entries. This does not establish that every play or splash element has the same transfer access; verify the exact feature needed with Parks staff.",
      dogs: "Pets are not allowed on the ordinary sandy beach or in play and splash areas. Use the separate Dog Beach between Pershing and Custer streets, and keep dogs leashed everywhere outside that designated zone.",
      family: "This is the strongest family base on the Broadwalk because play equipment, water play, shade, picnic space, and restrooms are concentrated together. Supervise closely around wet surfaces, the open Broadwalk, bicycle traffic, nearby streets, and the ocean.",
    },
    answerSources: { parking: { source: parking, sourceLabel: "City of Hollywood" }, restroom: { source: charnow, sourceLabel: "City of Hollywood" }, accessibility: { source: charnow, sourceLabel: "City of Hollywood" }, dogs: { source: beachRules, sourceLabel: "City of Hollywood" }, family: { source: charnow, sourceLabel: "City of Hollywood" } },
  },
  {
    name: "Hollywood Beach Theatre",
    address: "200 Johnson St, Hollywood, FL 33020",
    latitude: 26.0195232,
    longitude: -80.1151321,
    coordinateSource: "https://www.openstreetmap.org/way/714578858",
    officialMapSource: theater,
    positionQuality: "reviewed-public-map-theatre-centroid",
    imageIndex: 1,
    checkedAt,
    sourceLabel: "City of Hollywood",
    source: theater,
    summary: "Hollywood Beach Theatre is the outdoor oceanfront stage and plaza at Johnson Street, used for free live music and community programming directly on the Broadwalk.",
    cost: "Ordinary public access and regularly scheduled live music are free. Private events, nearby parking, food, reserved services, and separately ticketed programming can cost extra.",
    hours: "The outdoor plaza follows posted Broadwalk and event controls. The City currently advertises musical entertainment Wednesday through Sunday from 7:00 to 9:00 p.m.; programming can change for weather, holidays, private events, or production needs.",
    needToKnow: "Treat the published performance pattern as a schedule to recheck, not a guarantee. The plaza is open-air with limited weather shelter, and sound checks, crowd controls, resort programming, or storms can alter access. Use Johnson Street for the exact stage rather than a general Broadwalk pin.",
    answers: {
      parking: "Use Nebraska Garage at 327 Nebraska Street or another legal central-beach facility shown on the City's 2026 map. Garage and event rates vary, and Johnson Street itself is not a dependable place to find curb parking.",
      restroom: "The City's beach map and visitor guidance identify public restrooms in the central Broadwalk area, including near Johnson Street and Nebraska Garage. Confirm that the closest facility is open before settling in for an evening performance.",
      accessibility: "The City lists the theatre and plaza as ADA accessible and Johnson Street as an accessible beach entry. Event seating, crowd layout, and temporary production equipment can alter routes, so contact the event organizer when a specific accommodation is needed.",
      dogs: "Dogs are not generally permitted on the sandy beach and should not be brought into crowded performance areas unless allowed by current event rules. The designated Dog Beach is several blocks north between Pershing and Custer streets; service-animal rights remain separate.",
      family: "The open-air stage can be an easy free family evening when the weather and program fit. Expect amplified sound, crowds, bicycles on the adjacent Broadwalk, limited fixed seating, and no barrier between the plaza and busy public circulation.",
    },
    answerSources: { parking: { source: parking, sourceLabel: "City of Hollywood" }, restroom: { source: beachMap, sourceLabel: "City of Hollywood" }, accessibility: { source: theater, sourceLabel: "City of Hollywood" }, dogs: { source: beachRules, sourceLabel: "City of Hollywood" }, family: { source: theater, sourceLabel: "City of Hollywood" } },
  },
  {
    name: "Hollywood Dog Beach",
    address: "4999 N Surf Rd, Hollywood, FL 33019",
    latitude: 26.044861,
    longitude: -80.113455,
    coordinateSource: "https://www.openstreetmap.org/way/10791333",
    officialMapSource: dogBeach,
    positionQuality: "reviewed-official-address-arrival-point",
    imageIndex: 2,
    checkedAt,
    sourceLabel: "City of Hollywood",
    source: dogBeach,
    summary: "Hollywood Dog Beach is the City's free designated dog-friendly ocean zone between the Pershing and Custer Street lifeguard stands, with street-side arrival from North Surf Road.",
    cost: "No pass or admission fee is required. Metered street parking, supplies, and private services cost separately.",
    hours: "Dog Beach is open daily from sunrise to sunset. Lifeguard staffing, lightning, dangerous surf, beach closures, maintenance, or special-event controls may shorten practical access.",
    needToKnow: "Navigate to the exact North Surf Road arrival point and confirm the Pershing-to-Custer boundary on posted signs. Dogs need a current rabies tag and must remain controlled; leash them everywhere outside the designated Dog Beach. Sick, aggressive, or in-heat dogs are prohibited, and owners must remove waste. Exit immediately when thunder is heard or lightning is seen.",
    answers: {
      parking: "Use legal metered spaces along the north-beach streets near Pershing or Custer and read every posted restriction. The central Garfield and Nebraska garages are far from Dog Beach, so do not use a generic Hollywood Beach parking pin for this destination.",
      restroom: "The official Dog Beach page does not promise a restroom inside the dog zone. Identify the nearest public facility on the City's 2026 beach map before unloading, and do not rely on a private hotel or restaurant restroom.",
      accessibility: "The official page identifies street parking but does not document a firm accessible route across the sand or a beach wheelchair at this dog zone. Visitors who need mat access or mobility equipment should contact the City before traveling and consider one of the City's named accessible beach entries instead.",
      dogs: "Dogs may be off leash only inside the posted Dog Beach boundary and must remain under the owner's control. A current rabies tag is required; sick, aggressive, or in-heat dogs are prohibited, and owners are responsible for cleanup and any injury or damage.",
      family: "Dog Beach can work for families comfortable around unfamiliar off-leash dogs and active surf. Keep children close, ask before approaching another dog, avoid food and toys that may trigger conflict, and leave during lightning, dangerous flags, or crowding.",
    },
    answerSources: { parking: { source: beachMap, sourceLabel: "City of Hollywood" }, restroom: { source: beachMap, sourceLabel: "City of Hollywood" }, accessibility: { source: dogBeach, sourceLabel: "City of Hollywood" }, dogs: { source: dogBeach, sourceLabel: "City of Hollywood" }, family: { source: dogBeach, sourceLabel: "City of Hollywood" } },
  },
];

const csvPath = path.join(root, "data/nationwide-major-parks-launch.csv");
const csvRows = fs.readFileSync(csvPath, "utf8").trimEnd().split("\n");
const csvPrefix = "South,FL,Hollywood,Hollywood Beach & Broadwalk,";
const csvRow = `${csvPrefix}anchor,yes,super-enriched`;
const csvIndex = csvRows.findIndex((row) => row.startsWith(csvPrefix));
if (csvIndex >= 0) csvRows[csvIndex] = csvRow;
else csvRows.push(csvRow);
fs.writeFileSync(csvPath, `${csvRows.join("\n")}\n`);

const locations = read("data/launch-location-overrides.json");
const legacyLocationIndex = locations.findIndex((item) => item.id === legacyId);
if (legacyLocationIndex >= 0) locations.splice(legacyLocationIndex, 1);
upsert(locations, {
  id,
  park: "Hollywood Beach & Broadwalk",
  city: "Hollywood",
  state: "FL",
  latitude: 26.0195232,
  longitude: -80.1151321,
  address: "200 Johnson St, Hollywood, FL 33020",
  displayName: "Hollywood Beach and Broadwalk central arrival at Johnson Street, Hollywood, FL 33020",
  source: "City of Hollywood and OpenStreetMap contributors",
  sourceUrl: official,
  checkedAt,
});
write("data/launch-location-overrides.json", locations);

for (const file of ["data/parent-park-information-enrichment-national.json", "data/parent-park-information-enrichment-campaign.json"]) {
  const document = read(file);
  delete document.parks[legacyId];
  document.parks[id] = parentProfile;
  write(file, document);
}

const campaign = read("data/south-florida-atlantic-super-enrichment-campaign.json");
campaign.places = campaign.places.filter((place) => place.id !== legacyId);
upsert(campaign.places, {
  id,
  name: "Hollywood Beach & Broadwalk",
  city: "Hollywood",
  state: "FL",
  citySlug: "hollywood-fl",
  operator: "City of Hollywood Parks, Recreation and Cultural Arts",
  source: official,
  checkedAt,
  featureResearchRadiusMeters: 5000,
  imageQueries: ["Hollywood Beach Broadwalk", "Charnow Park Hollywood Beach", "Hollywood Beach Theatre", "Hollywood Dog Beach"],
  subsites: ["Charnow Park", "Hollywood Beach Theatre", "Hollywood Dog Beach", "Hollywood-Dania North Beach Trail", "North Beach Park", "Keating Park"],
});
write("data/south-florida-atlantic-super-enrichment-campaign.json", campaign);

const addresses = read("data/south-florida-atlantic-addresses.json");
delete addresses[legacyId];
addresses[id] = "200 Johnson St, Hollywood, FL 33020";
write("data/south-florida-atlantic-addresses.json", addresses);

const photos = read("data/south-florida-atlantic-photo-selections.json");
photos.reviewedAt = checkedAt;
delete photos.places[legacyId];
photos.places[id] = { name: "Hollywood Beach & Broadwalk", candidates: photoCandidates };
write("data/south-florida-atlantic-photo-selections.json", photos);

const selections = read("data/south-florida-atlantic-feature-selections.json");
selections.checkedAt = checkedAt;
delete selections.places[legacyId];
delete selections.researchQueue[legacyId];
selections.places[id] = features;
selections.researchQueue[id] = "Published Charnow Park, Hollywood Beach Theatre, and Hollywood Dog Beach from exact official records and destination-specific reusable photographs. Add North Beach Park, the Hollywood-Dania North Beach Trail, Keating Park, accessible beach entries, and individual parking or restroom pages only after each has a destination-matched reusable photograph and reviewed exact pin.";
write("data/south-florida-atlantic-feature-selections.json", selections);

console.log("Seeded Hollywood Beach & Broadwalk launch guide, four licensed images, three reviewed destinations, and follow-up queue.");
