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

const parkId = "launch-fl-hollywood-hollywood-north-beach-park";
const visit = "https://www.visitlauderdale.com/listing/hollywood-north-beach-park/4760/";
const browardParks = "https://www.broward.org/atyourservice/Pages/parks.htm";
const fees = "https://www.broward.org/Parks/Fees/Documents/FeeSchedule.pdf";
const passports = "https://www.broward.org/Parks/Pages/ParkPassports.aspx";
const fishing = "https://www.broward.org/PARKS/THINGSTODO/Pages/Fishing.aspx";
const dogPolicy = "https://www.broward.org/Parks/ThingsToDo/Pages/MarkhamDogPark.aspx";
const planning = "https://www.broward.org/Parks/Support/Documents/DraftMinutes5.30.pdf";
const beachSafety = "https://www.hollywoodfl.org/251/Beach-Safety";
const seaTurtles = "https://www.hollywoodfl.org/1608/Sea-Turtles";
const transit = "https://www.broward.org/BCT/Schedules/Documents/2026_01-18/rt4web.pdf";

const campaignPlace = {
  id: parkId,
  name: "Hollywood North Beach Park",
  city: "Hollywood",
  state: "FL",
  citySlug: "hollywood-fl",
  operator: "Broward County Parks and Recreation",
  source: visit,
  featureResearchRadiusMeters: 1700,
  minimumImages: 4,
  imageQueries: ["Hollywood North Beach Park", "Hollywood Florida North Beach boardwalk", "Hollywood North Beach ocean"],
  subsites: ["Atlantic Beach Access", "Intracoastal Fishing Piers", "Observation Tower", "Marine Environmental Education Center at the Carpenter House"],
};

const imageSelection = {
  name: "Hollywood North Beach Park",
  candidates: [
    {
      title: "Quiet look at the ocean...Doux regard a l'ocean... - panoramio",
      url: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Quiet_look_at_the_ocean...Doux_regard_%C3%A0_l%27oc%C3%A9an..._-_panoramio.jpg",
      source: "https://commons.wikimedia.org/wiki/File:Quiet_look_at_the_ocean...Doux_regard_%C3%A0_l%27oc%C3%A9an..._-_panoramio.jpg",
      creator: "Richard Mc Neil",
      creatorUrl: "https://web.archive.org/web/20161014155613/http://www.panoramio.com/user/1779162?with_photo_id=32842053",
      license: "BY",
      licenseVersion: "3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      width: 2304,
      height: 1728,
      provider: "wikimedia",
      query: "Hollywood North Beach Park beach access",
      reviewStatus: "approved-exact-geotagged-area-match",
      reviewNote: "The exact geotag is inside Hollywood North Beach Park and visual review shows its beach-access boardwalk, palms, lifeguard tower, and ocean.",
      alt: "Boardwalk, palms, lifeguard tower, and Atlantic Ocean at Hollywood North Beach Park",
      reviewedAt: checkedAt,
    },
    {
      title: "Hollywood Beach, Hollywood, FL 33019, USA - panoramio (3)",
      url: "https://upload.wikimedia.org/wikipedia/commons/b/be/Hollywood_Beach%2C_Hollywood%2C_FL_33019%2C_USA_-_panoramio_%283%29.jpg",
      source: "https://commons.wikimedia.org/wiki/File:Hollywood_Beach,_Hollywood,_FL_33019,_USA_-_panoramio_(3).jpg",
      creator: "Rick Shu",
      creatorUrl: "https://web.archive.org/web/20161101221026/http://www.panoramio.com/user/398923?with_photo_id=115353569",
      license: "BY-SA",
      licenseVersion: "3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
      width: 3872,
      height: 2592,
      provider: "wikimedia",
      query: "Hollywood North Beach shoreline",
      reviewStatus: "approved-exact-geotagged-area-match",
      reviewNote: "The geotag falls on the park's Atlantic shoreline and visual review shows the broad beach, surf, palms, and late-day light.",
      alt: "Wide Atlantic shoreline and palms at Hollywood North Beach Park",
      reviewedAt: checkedAt,
    },
    {
      title: "Hollywood Beach, Hollywood, FL 33019, USA - panoramio (11)",
      url: "https://upload.wikimedia.org/wikipedia/commons/c/c3/Hollywood_Beach%2C_Hollywood%2C_FL_33019%2C_USA_-_panoramio_%2811%29.jpg",
      source: "https://commons.wikimedia.org/wiki/File:Hollywood_Beach,_Hollywood,_FL_33019,_USA_-_panoramio_(11).jpg",
      creator: "Rick Shu",
      creatorUrl: "https://web.archive.org/web/20161102194344/http://www.panoramio.com/user/398923?with_photo_id=115353573",
      license: "BY-SA",
      licenseVersion: "3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
      width: 3872,
      height: 2592,
      provider: "wikimedia",
      query: "Hollywood North Beach visitors",
      reviewStatus: "approved-exact-geotagged-area-match",
      reviewNote: "The geotag falls on the park's Atlantic shoreline and visual review provides useful visitor, umbrella, surf, and seabird context.",
      alt: "Visitors, umbrellas, seabirds, and surf at Hollywood North Beach Park",
      reviewedAt: checkedAt,
    },
    {
      title: "Sailing boat in the hole - panoramio",
      url: "https://upload.wikimedia.org/wikipedia/commons/9/96/Sailing_boat_in_the_hole._-_Voilier_passe_dans_la_fen%C3%AAtre_d%C3%A9corative_de_la_plage_D%27Hollywood%2C_Floride_-_panoramio.jpg",
      source: "https://commons.wikimedia.org/wiki/File:Sailing_boat_in_the_hole._-_Voilier_passe_dans_la_fen%C3%AAtre_d%C3%A9corative_de_la_plage_D%27Hollywood,_Floride_-_panoramio.jpg",
      creator: "Richard Mc Neil",
      creatorUrl: "https://web.archive.org/web/20161015033407/http://www.panoramio.com/user/1779162?with_photo_id=33072566",
      license: "BY",
      licenseVersion: "3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      width: 2232,
      height: 1630,
      provider: "wikimedia",
      query: "Hollywood North Beach entrance",
      reviewStatus: "approved-geotagged-connected-beach-context",
      reviewNote: "The geotag and title identify the connected Hollywood beach corridor and visual review shows a distinctive decorative beach entrance framing the ocean.",
      alt: "Decorative stone beach entrance framing a sailboat on the ocean in Hollywood, Florida",
      reviewedAt: checkedAt,
    },
  ],
};

const profile = {
  name: "Hollywood North Beach Park",
  city: "Hollywood",
  citySlug: "hollywood-fl",
  operator: "Broward County Parks and Recreation",
  sourceLabel: "Broward County Parks and Recreation",
  source: browardParks,
  address: "3601 N Ocean Dr, Hollywood, FL 33019",
  hours: "Confirm current park and parking hours with Broward County before a time-sensitive visit. City lifeguard coverage is currently 9:00 a.m. to 6:00 p.m. year-round and extends to 7:00 p.m. on holidays and special events; the county park is closed December 25.",
  cost: "There is no ordinary gate admission, but the county charges a parking fee instead. Current rates can change and park passes do not cover this parking charge.",
  summary: "Hollywood North Beach Park is a 56-acre Broward County coastal park with about 1.1 miles of public Atlantic beach, Intracoastal access, picnic areas, fishing piers, restrooms, an observation tower, an accessible boardwalk ramp, and a connected café and environmental-education destination.",
  accessibility: "The developed park includes an ADA-compliant boardwalk ramp and recent accessible gangway improvements. Sand, tides, weather, individual piers, and construction can still affect a specific route, so confirm critical access before travel.",
  transit: "Broward County Transit Route 4 serves Hollywood North Beach Park. Check the live schedule and last return trip before relying on transit for an evening beach visit.",
  verifiedAt: checkedAt,
  searchAnswers: [
    answer("hours", "What hours is Hollywood North Beach Park open?", "Broward County's current park listing does not publish a dependable daily gate schedule, so confirm park and parking hours before a time-sensitive visit. Hollywood Ocean Rescue currently staffs the municipal beach from 9:00 a.m. to 6:00 p.m. year-round and until 7:00 p.m. on holidays and special events. Broward County parks are closed December 25.", beachSafety, "City of Hollywood Ocean Rescue"),
    answer("entrance", "What address should I use for Hollywood North Beach Park?", "Use 3601 N Ocean Drive, Hollywood, FL 33019 for the county park. Decide whether you want the Atlantic beach side or the Intracoastal picnic and fishing side before parking; North Ocean Drive separates visitor experiences within this long coastal park.", browardParks, "Broward County Parks and Recreation"),
    answer("parking", "Where should I park at Hollywood North Beach Park?", "Use the county-operated park parking and choose a space near the side you plan to visit. Parking is the primary access charge and is not included with a Broward Parks Passport. Rates and special-event pricing can change, so read the current fee schedule and posted pay-station instructions before leaving the car.", fees, "Broward County Parks and Recreation"),
    answer("fees", "Is Hollywood North Beach Park free?", "General entry is not normally charged at a gate, but parking is paid. The Broward Parks Passport page specifically says the pass does not cover Hollywood North Beach Park parking. Recheck the current county fee schedule because daily, afternoon, holiday, and oversized-vehicle rates can change.", passports, "Broward County Parks and Recreation"),
    answer("restroom", "Are there restrooms at Hollywood North Beach Park?", "Yes. Broward County planning records identify restrooms among the facilities distributed through the park's five pocket-park areas. Use the nearest open restroom before settling on the beach or fishing because facilities are spread along a long shoreline and can close for maintenance.", planning, "Broward County Parks and Recreation"),
    answer("accessibility", "Is Hollywood North Beach Park accessible?", "The park includes an ADA-compliant boardwalk ramp to the beach and Broward County has documented accessible gangway and service improvements. Sand, weather, tides, pier approaches, and construction still vary, so contact the park before travel for a specific mobility or transfer need.", planning, "Broward County Parks and Recreation"),
    answer("dog-area", "Are dogs allowed at Hollywood North Beach Park?", "Do not bring a pet onto the Hollywood North Beach Park beach side. Broward County excludes that beach side from its general leashed-dog allowance, and the City of Hollywood directs beachgoing dogs to the separate designated Dog Beach between Pershing and Custer streets. Service-animal rules remain separate.", dogPolicy, "Broward County Parks and Recreation"),
    answer("swimming", "Are there lifeguards at Hollywood North Beach Park?", "Hollywood Ocean Rescue provides year-round beach lifeguard service across the city beach system, currently 9:00 a.m. to 6:00 p.m. and until 7:00 p.m. on holidays and special events. Not every stretch should be assumed staffed at every moment; check flags, choose a visible staffed tower, and keep children and weak swimmers within direct reach.", beachSafety, "City of Hollywood Ocean Rescue"),
    answer("fishing", "Can I fish at Hollywood North Beach Park?", "Broward County permits fishing from the park's Intracoastal piers and shoreline. Use the Intracoastal side rather than a swimming area, keep hooks and lines away from other visitors and wildlife, and check current Florida saltwater-license rules and posted restrictions before fishing.", fishing, "Broward County Parks and Recreation"),
    answer("picnic", "Can I picnic at Hollywood North Beach Park?", "Yes. Official sources identify picnic areas and shelters in the park. Choose the Atlantic or Intracoastal side first, confirm reservation requirements for a shelter or group, secure food from birds and wind, and remove everything before leaving.", visit, "Visit Lauderdale"),
    answer("food", "Is there food at Hollywood North Beach Park?", "Visit Lauderdale lists a café among the park's visitor facilities, but concession hours and availability can change independently from beach access. Bring drinking water and verify current service before relying on the café for a meal, especially early, late, or during severe weather.", visit, "Visit Lauderdale"),
    answer("transit", "Can I reach Hollywood North Beach Park by bus?", "Yes. Broward County Transit Route 4 identifies Hollywood North Beach Park as a served destination. Check the current Route 4 schedule, stop direction, and last return trip before leaving because beach time can extend past convenient service.", transit, "Broward County Transit"),
    answer("sea-turtles", "What should I know about sea turtles at Hollywood North Beach Park?", "Sea-turtle nesting season runs March 1 through October 31. Never touch a turtle or nest, avoid flash photography and bright lights at night, remove chairs and belongings, fill holes before leaving, and report an injured or stranded turtle through the city's posted contacts.", seaTurtles, "City of Hollywood"),
    answer("weather", "What weather should I plan for at Hollywood North Beach Park?", "The beach, piers, tower, and picnic areas are exposed to heat, sun, wind, lightning, heavy rain, rough surf, and changing currents. Check the forecast and beach flags, carry water and sun protection, leave piers and water when thunder is heard, and do not enter the ocean on prohibited flag conditions.", beachSafety, "City of Hollywood Ocean Rescue"),
    answer("need-to-know", "What should I know before visiting Hollywood North Beach Park?", "Choose Atlantic beach access or the Intracoastal fishing and picnic side before parking, expect a parking charge, check beach flags and lifeguard hours, use a restroom before settling in, and remember dogs are not allowed on this beach side. During turtle season, remove gear, fill holes, and avoid flash or bright nighttime lighting.", visit, "Visit Lauderdale"),
  ],
  sources: [
    { label: "Broward County Parks destination listing", url: browardParks },
    { label: "Visit Lauderdale park guide", url: visit },
    { label: "Broward County Parks current fee schedule", url: fees },
    { label: "City of Hollywood beach safety", url: beachSafety },
    { label: "City of Hollywood sea-turtle guidance", url: seaTurtles },
  ],
};

for (const file of [files.national, files.campaign]) {
  const document = read(file);
  document.parks[parkId] = { ...(document.parks[parkId] || {}), ...profile };
  write(file, document);
}

const locations = read(files.locations);
const location = {
  id: parkId,
  park: "Hollywood North Beach Park",
  city: "Hollywood",
  state: "FL",
  latitude: 26.0400578,
  longitude: -80.1147031,
  address: "3601 N Ocean Dr, Hollywood, FL 33019",
  displayName: "Hollywood North Beach Park, Hollywood, FL",
  source: "OpenStreetMap contributors",
  sourceUrl: "https://www.openstreetmap.org/relation/7149335",
  checkedAt,
};
const locationIndex = locations.findIndex((item) => item.id === parkId);
if (locationIndex >= 0) locations[locationIndex] = location;
else locations.push(location);
write(files.locations, locations);

const superCampaign = read(files.superCampaign);
superCampaign.checkedAt = checkedAt;
const campaignIndex = superCampaign.places.findIndex((item) => item.id === parkId);
if (campaignIndex >= 0) superCampaign.places[campaignIndex] = campaignPlace;
else superCampaign.places.push(campaignPlace);
write(files.superCampaign, superCampaign);

const photos = read(files.photos);
photos.reviewedAt = checkedAt;
photos.places[parkId] = imageSelection;
write(files.photos, photos);

const features = read(files.features);
features.checkedAt = checkedAt;
features.places[parkId] = [];
features.researchQueue[parkId] = "Publish the parent guide now. Defer the Atlantic beach access, Intracoastal fishing piers, observation tower, individual pocket parks, and Marine Environmental Education Center until each has an exact reviewed pin and a destination-specific permission-cleared photograph. MEEC official visitor facts are ready, but its available exact photograph is all-rights-reserved and nearby beach imagery is not an acceptable substitute.";
write(files.features, features);

const addresses = read(files.addresses);
addresses[parkId] = "3601 N Ocean Dr, Hollywood, FL 33019";
write(files.addresses, addresses);

console.log("Seeded Hollywood North Beach Park with 15 sourced visitor answers and four licensed destination photographs.");
