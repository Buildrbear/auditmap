#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/boston-super-enrichment-campaign.json");
const galleries = require("../data/generated/boston-super-images.json");
const coordinateOverrides = require("../data/boston-coordinate-overrides.json").records;
const checkedAt = campaign.checkedAt;
const oldCombinedId = "launch-ma-boston-boston-common-and-public-garden";
const weeklySchedule = (open, close) => Object.fromEntries(
  ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) => [day, [[open, close]]]),
);
const parentSchedules = {
  "launch-ma-boston-boston-common": weeklySchedule("06:00", "23:30"),
  "launch-ma-boston-public-garden": weeklySchedule("06:00", "23:30"),
  "launch-ma-boston-franklin-park": weeklySchedule("06:00", "23:30"),
  "launch-ma-boston-rose-fitzgerald-kennedy-greenway": weeklySchedule("07:00", "23:00"),
  "launch-ma-boston-jamaica-pond": weeklySchedule("06:00", "23:30")
};

const slugify = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const stableId = (parent, slug) => {
  const bytes = crypto.createHash("sha256").update(`auditmap:${parent}:${slug}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const featureNotes = {
  "Boston Common Frog Pond": "Frog Pond sits on the Beacon Street side below the State House. Its spray pool, winter rink, carousel, cafe, and programs are seasonal and do not all operate together.",
  "Tadpole Playground": "Tadpole Playground is beside Frog Pond near Charles and Beacon Streets. It is fenced and designed for children, with the nearest dependable facilities tied to Frog Pond operations.",
  "Brewer Fountain and Visitor Center": "Brewer Fountain and the Boston Common Visitor Information Center are near the Park Street and Tremont Street corner, the easiest starting point for the Freedom Trail.",
  "Flagstaff Hill and Soldiers and Sailors Monument": "The monument crowns Flagstaff Hill near the center of the Common. Reach it by uphill paved paths; lawn shortcuts and winter grades are less predictable.",
  "Swan Boats and Lagoon": "The Swan Boat dock is on the east side of the lagoon near Charles Street. Rides are first-come, seasonal, weather permitting, and usually last about 10 to 15 minutes.",
  "Make Way for Ducklings": "The duckling statues are near the Charles and Beacon Street corner, a short walk from Boston Common. Expect photo queues at peak family times.",
  "Public Garden Footbridge": "The footbridge crosses the lagoon near the center of the garden and connects the two main path loops; approaches are paved but can crowd around Swan Boat operations.",
  "George Washington Statue and Arlington entrance": "The equestrian statue anchors the Arlington Street entrance at the west end, opposite the Swan Boat side and closest to Back Bay transit.",
  "Hatch Memorial Shell": "The Hatch Shell is on the river side of the Esplanade near the Arthur Fiedler Footbridge. Concerts and major celebrations can close paths and radically change access.",
  "Esplanade Playspace": "The Playspace is west of the Hatch Shell near the river paths. Use the nearest pedestrian bridge and supervise children around bicycles, lagoons, and the river edge.",
  "Community Boating and docks": "Community Boating is near the east Esplanade by the Longfellow Bridge. Lessons, rentals, dock access, weather holds, and eligibility use the operator's schedule.",
  "Esplanade lagoons and river paths": "The paved river paths and lagoon bridges extend well beyond one pin. Pick an out-and-back distance and stay right around runners, cyclists, and narrow bridges.",
  "Tiffany Moore Tot Lot and spray play": "Use 155 Seaver Street for the accessible playground and documented spray play. The City lists drinking water and shade but no restroom at the playground itself.",
  "Elma Lewis Playstead and White Stadium": "The Playstead is the large field landscape beside White Stadium. Construction, school athletics, festivals, and permitted events can reroute parking and paths.",
  "Scarboro Pond and Wilderness trails": "Scarboro Pond and the Wilderness are in the quieter interior. Expect natural surfaces, fewer services, longer walks, and woodland conditions rather than a manicured playground visit.",
  "Historic Bear Dens and Overlook Ruins": "The former Bear Dens and Overlook ruins are historic landscape features, not an operating animal attraction. Follow open paths and respect barriers around masonry and restoration work.",
  "Hunnewell Visitor Center": "The Visitor Center is at Arborway Gate, 125 Arborway, and is the best first stop for maps, staff help, accessible restrooms, and wheelchair loans during its hours.",
  "Peters Hill skyline view": "Peters Hill is the Arboretum's highest point and requires a sustained climb. Use Peters Hill Gate for the shortest approach and bring water because the summit is exposed.",
  "Bussey Hill and lilac collection": "Bussey Hill holds the celebrated lilac collection and is busiest around spring bloom and Lilac Sunday. Roads climb steadily and bloom timing varies each year.",
  "Hemlock Hill and woodland collections": "Hemlock Hill is a shaded, natural-feeling collection area with steeper and less even routes than the main Arborway landscape. Wet leaves, roots, ticks, and winter ice matter.",
  "Fort Independence": "Fort Independence occupies the center of Castle Island. The exterior loop is generally available during park hours, but interior tours are seasonal and event closures are common.",
  "Castle Island Loop": "The short paved loop circles Fort Independence with harbor, ship, and airport views. Seawalls are exposed to wind and have immediate water edges.",
  "Pleasure Bay beach and loop": "Pleasure Bay lies west of the fort and supports a longer accessible loop plus seasonal swimming. Check lifeguards, water quality, beach mats, tide, and wind.",
  "Sullivan's and family picnic area": "Sullivan's is the seasonal food counter near the fort parking lot, playground, picnic space, and restrooms. Lines and parking peak on warm weekends.",
  "Greenway Carousel": "The Carousel is at Tiffany & Co. Foundation Grove near the aquarium and Harbor Islands ferry area. Tickets are sold onsite and weather or seasonal schedules can change daily.",
  "Rings Fountain and Wharf District": "Rings Fountain is in the Wharf District near Milk Street. The ground-level jets are seasonal and may pause for maintenance, events, storms, or water-quality operations.",
  "Dewey Square public art": "Dewey Square is beside South Station and hosts large rotating murals, markets, events, lawns, and food vendors. The artwork and programming change frequently.",
  "North End parks and gardens": "The northern Greenway parcels near Haymarket connect gardens, lawns, public art, markets, and the North End. Weekend market activity can crowd paths and streets.",
  "Jamaica Pond Boathouse": "The boathouse at 507 Jamaicaway is the service hub for seasonal rentals, programs, orientation, and nearby facilities. Private boats are not allowed.",
  "Jamaica Pond loop trail": "The loop follows the shore for roughly 1.5 miles. It is popular with walkers and runners, with roots, grades, road proximity, ice, and narrow passing points varying by segment.",
  "Pinebank Promontory": "Pinebank sits on the pond's north side and connects lawns, historic landscape, and Emerald Necklace routes. It is quieter than the boathouse and has fewer immediate services.",
  "Fishing and shoreline access": "Jamaica Pond is stocked and supports legal shore fishing with the required Massachusetts license. Watch for casting lines and never treat the steep, deep pond as a swimming area."
  ,"Parkman Bandstand": "The Parkman Bandstand is in the southern half of the Common near Tremont and Boylston Streets. It is an outdoor landmark and event space, so permitted programs can occupy the surrounding lawn and paths."
  ,"Central Burying Ground": "Central Burying Ground is along Boylston Street near Tremont Street. It has its own roughly daytime gate schedule, historic uneven surfaces, and no stair-free access, so do not assume the full Common's hours or accessibility."
  ,"Robert Gould Shaw and 54th Regiment Memorial": "The memorial faces the State House along Beacon Street at the northeast edge of the Common. Approach from Beacon or Park Street and expect a short uphill route from Tremont Street."
  ,"Boston Common off-leash dog areas": "Boston Common uses rotating, signed off-leash areas rather than one permanent fenced dog park. Confirm the current posted area on arrival; dogs must remain leashed elsewhere and are excluded from playground and Frog Pond facilities."
  ,"Ether Monument": "The Ether Monument is on the garden's northwest side near Arlington and Beacon Streets. It is reached from the main paths and offers benches and shade, but it is not an entrance or staffed visitor facility."
  ,"Japanese Lantern": "The Japanese Lantern is near the lagoon and central paths. It is a small historic landscape feature rather than a separate attraction, so pair it with the bridge, plantings, or Swan Boats."
  ,"Small Child Fountain": "The Small Child Fountain is in the southwest garden near Arlington and Boylston Streets. It is an ornamental sculpture and fountain, not a splash pad or drinking-water feature."
  ,"Wendell Phillips Statue and Boylston entrance": "This statue is near the garden's southeast edge and provides a useful Boylston Street meeting point. The nearby entrance connects quickly toward the theater district and Arlington station routes."
  ,"Stoneman Playground": "Stoneman Playground is in the western Esplanade between the Fairfield Street and Massachusetts Avenue footbridges. It has separate toddler and older-child play zones but no direct visitor parking."
  ,"Teddy Ebersol's Red Sox Fields": "These athletic fields are at the eastern Esplanade near the Blossom Street footbridge and Museum of Science. Games, permits, and maintenance can limit casual field use."
  ,"Arthur Fiedler Footbridge": "This pedestrian bridge crosses Storrow Drive near the Hatch Shell and Esplanade Playspace. It is a primary arrival route, but its ramps and approaches add distance and there is no parking at the bridge."
  ,"Lotta Fountain": "The Lotta Fountain is a historic dog-friendly drinking fountain near the Esplanade paths west of the Hatch Shell. Treat it as a small landmark and water stop, not a dependable human drinking fountain or restroom."
  ,"Franklin Park Zoo": "Franklin Park Zoo is a separately operated, ticketed attraction on the northeast side of the park. Use the zoo entrance and current Zoo New England hours, admission, parking, accessibility, and animal-care notices rather than general park rules."
  ,"William J. Devine Golf Course": "The municipal golf course occupies much of Franklin Park's eastern landscape. Tee times, fees, clubhouse hours, course conditions, and player access are separate from free general park access."
  ,"Schoolmaster Hill": "Schoolmaster Hill is a historic high point and ruin reached by interior park paths. Expect a walk from distributed parking, limited services, uneven ground, and fewer people than at the zoo or Playstead."
  ,"Ellicott Arch and 99 Steps": "Ellicott Arch and the nearby 99 Steps are historic stone landscape features in Franklin Park's interior. Routes include grades and stairs, masonry may be restricted for preservation, and this is not a staffed destination."
  ,"Larz Anderson Bonsai Collection": "The historic bonsai and penjing collection is displayed seasonally near the Dana Greenhouses. Confirm exhibit dates and hours before making it the purpose of a visit; the surrounding Arboretum remains open sunrise to sunset."
  ,"Bradley Rosaceous Collection": "This five-acre rose-family collection sits where Meadow, Bussey Hill, and Forest Hills roads meet. Grass paths between beds are not wheelchair accessible, and a focused visit usually takes 20 to 60 minutes."
  ,"Explorers Garden": "Explorers Garden occupies a high, sheltered slope near Bussey Hill and highlights plants collected from expeditions. Reaching it involves climbing, and paths can be slippery with wet leaves, snow, or ice."
  ,"Conifer Path": "Conifer Path links evergreen collections near the Arborway side of the Arboretum. It is useful for a quieter walk and winter interest, but natural surfaces and grades vary from the main paved roads."
  ,"Castle Island Playground": "The playground is beside the fort-side family area near parking, food, and seasonal restrooms. It is exposed to harbor wind and sun, and the nearby seawall requires close supervision."
  ,"Fishing pier and harbor seawall": "Fishing is popular along the harbor-facing pier and seawall near Fort Independence. Bring required gear and licenses, yield to walkers, watch hooks and slippery edges, and check wind and marine conditions."
  ,"Head Island Causeway": "The causeway is the narrow connection between the Pleasure Bay loop and the fort-side island. It is paved and scenic but exposed to wind, waves, runners, bicycles, and immediate water edges."
  ,"Carson Beach": "Carson Beach is the western beach segment of the larger DCR reservation, well beyond the fort loop. It has its own access, parking, seasonal lifeguard and beach-service conditions, so navigate directly to the beach."
  ,"Chinatown Park": "The southern Greenway park at Chinatown provides gardens, seating, and a gateway near Chinatown and South Station. Events and maintenance can change usable space, and public restrooms are not guaranteed in the park."
  ,"Armenian Heritage Park": "This Greenway parcel near Faneuil Hall includes the Abstract Sculpture and Labyrinth. The sculpture changes configuration seasonally; use paths respectfully and check programming before expecting an event."
  ,"Harbor Fog sculpture": "Harbor Fog is an interactive public artwork in the Wharf District that uses sound, light, and mist. Effects may be seasonal or paused for weather, maintenance, water use, or nearby events."
  ,"Boston Harbor Islands Welcome Center": "The seasonal Welcome Center near the carousel helps visitors plan harbor-island trips. Staffing, ferry information, exhibits, and opening dates follow National Park Service and partner schedules, not Greenway park hours."
  ,"Jamaica Pond Bandstand": "The bandstand is near the boathouse on the pond's southeast side and hosts seasonal concerts and programs. Outside events it is an outdoor landmark, with services tied to nearby staffed operations."
  ,"Parkman Memorial": "Parkman Memorial is on the pond's western side near the loop path. It is a quiet historic landmark with limited nearby services and a longer walk from the boathouse."
  ,"Sugar Bowl shoreline": "The Sugar Bowl is a named shoreline area on the pond's western side. It is best treated as a scenic waypoint on the loop, not a swimming cove or staffed recreation area."
  ,"Ward's Pond and Emerald Necklace connection": "Ward's Pond lies north of Jamaica Pond along the Emerald Necklace route toward Olmsted Park. Reaching it requires leaving the immediate pond loop and crossing or following connecting paths, with wet and uneven conditions possible."
};

const featureOperations = {
  "Central Burying Ground": { hours: "The cemetery is generally open daily about 9 a.m.-4 p.m.; gates can close for weather, maintenance, or preservation work.", hoursSchedule: false, accessibility: "The City lists no stair-free access at Central Burying Ground. Historic paths and gravestones require care.", sourceLabel: "City of Boston Historic Burying Grounds", source: "https://www.boston.gov/cemeteries/central-burying-ground" },
  "Swan Boats and Lagoon": { hours: "Swan Boats operate seasonally and weather permitting on their own daily schedule; the surrounding Public Garden follows park hours.", hoursSchedule: false, cost: "Garden and lagoon viewing are free. Swan Boat rides require a paid ticket.", sourceLabel: "Swan Boats of Boston", source: "https://swanboats.com/" },
  "Community Boating and docks": { hours: "Community Boating's sailing, paddling, lessons, and dock access follow its seasonal operating calendar and can pause for weather.", hoursSchedule: false, cost: "Watching from public paths is free. Lessons, memberships, rentals, and programs use Community Boating pricing.", sourceLabel: "Community Boating", source: "https://www.community-boating.org/" },
  "Franklin Park Zoo": { hours: "The zoo uses separate daily and seasonal admission hours; check the official day-of-visit schedule and last-entry time.", hoursSchedule: false, cost: "General Franklin Park access is free, but Franklin Park Zoo is a ticketed attraction with separate admission and parking rules.", dogs: "Pets are not allowed inside the zoo; qualifying service animals follow Zoo New England policy.", sourceLabel: "Zoo New England", source: "https://www.zoonewengland.org/franklin-park-zoo/" },
  "William J. Devine Golf Course": { hours: "Golf access depends on tee times, daylight, weather, and course operations rather than general Franklin Park hours.", hoursSchedule: false, cost: "The golf course charges greens and related fees; surrounding general park areas remain free.", dogs: "Do not bring pets onto active golf-course areas unless the operator explicitly permits them.", sourceLabel: "City of Boston Golf", source: "https://www.cityofbostongolf.com/" },
  "Larz Anderson Bonsai Collection": { hours: "The landscape is open sunrise to sunset, but the bonsai display is seasonal and has separate exhibit hours.", hoursSchedule: false, sourceLabel: "Arnold Arboretum of Harvard University", source: "https://arboretum.harvard.edu/plants/featured-plants/larz-anderson-bonsai-collection/" },
  "Greenway Carousel": { hours: "Carousel hours are seasonal and weather dependent; check the current operating calendar before promising a ride.", hoursSchedule: false, cost: "Greenway access is free. Carousel rides require a ticket.", sourceLabel: "Greenway Conservancy", source: "https://www.rosekennedygreenway.org/carousel/" },
  "Boston Harbor Islands Welcome Center": { hours: "The Welcome Center is seasonal and uses National Park Service and partner staffing hours; check current island and ferry operations.", hoursSchedule: false, sourceLabel: "National Park Service", source: "https://www.nps.gov/boha/planyourvisit/index.htm" }
};

function answer(place, intentKey, question, text) {
  return { intentKey, question, answer: text, sourceLabel: place.sourceLabel || place.operator, source: place.source, verifiedAt: checkedAt, freshnessClass: ["hours", "parking", "weather", "need-to-know"].includes(intentKey) ? "fast" : "slow", status: "verified" };
}

function parentAnswers(place) {
  return [
    ["hours", `When is ${place.name} open?`, place.hours],
    ["parking", `Where should I park for ${place.name}?`, place.parking],
    ["entrance", `What is the best entrance for ${place.name}?`, place.arrival],
    ["restroom", `Are there restrooms at ${place.name}?`, place.restrooms],
    ["fees", `Is ${place.name} free?`, place.cost],
    ["accessibility", `How accessible is ${place.name}?`, place.accessibility],
    ["dogs", `Are dogs allowed at ${place.name}?`, place.dogs],
    ["family", `Is ${place.name} good for children?`, place.family],
    ["transit", `How do I reach ${place.name} without a car?`, place.transit],
    ["need-to-know", `What should I know before visiting ${place.name}?`, place.need],
    ["weather", `What weather should I check before visiting ${place.name}?`, "Check the local forecast plus heat or wind chill, thunderstorms, snow and ice, high wind, air quality, and daylight. Waterfront places also require wind, tide, and water-condition checks; leave exposed water, fields, trees, and playgrounds when thunder is heard."]
  ].map((values) => answer(place, ...values));
}

function makeFeature(place, name, index, images) {
  const slug = slugify(name);
  const id = stableId(place.id, slug);
  const note = featureNotes[name];
  if (!note) throw new Error(`Missing focused visitor guidance for ${name}`);
  const coordinates = coordinateOverrides[name];
  if (!coordinates) throw new Error(`Missing reviewed coordinates for ${name}`);
  const operation = featureOperations[name] || {};
  const featurePlace = { ...place, ...operation };
  const featureSchedule = Object.prototype.hasOwnProperty.call(operation, "hoursSchedule") ? operation.hoursSchedule : (parentSchedules[place.id] || false);
  const baseImage = images[index % images.length];
  const image = { ...baseImage, featureId: id, latitude: coordinates.latitude, longitude: coordinates.longitude, alt: `${name} at ${place.name}` };
  const questions = [
    ["location", `Where exactly is ${name}?`, note],
    ["parking", `Where should I park for ${name}?`, featurePlace.parking],
    ["hours", `When is ${name} open?`, featurePlace.hours],
    ["restroom", `Are there restrooms near ${name}?`, featurePlace.restrooms],
    ["fees", `Is ${name} free?`, featurePlace.cost],
    ["accessibility", `How accessible is ${name}?`, featurePlace.accessibility],
    ["dogs", `Are dogs allowed at ${name}?`, featurePlace.dogs],
    ["family", `Is ${name} good for children?`, featurePlace.family],
    ["need-to-know", `What should I know before visiting ${name}?`, `${note} ${place.need}`]
  ].map((values) => answer(featurePlace, ...values));
  return {
    id, slug, name, feature_type: "destination", description: note,
    latitude: image.latitude, longitude: image.longitude,
    details: {
      category: "destination", includeInParentGallery: true, address: place.address,
      hours: featurePlace.hours, hoursSchedule: featureSchedule, cost: featurePlace.cost, accessibility: featurePlace.accessibility,
      locationContext: note, needToKnow: place.need,
      coordinateSource: coordinates.source, positionQuality: coordinates.positionQuality,
      informationSourceLabel: featurePlace.sourceLabel || place.operator, informationSourceUrl: featurePlace.source || place.source, informationCheckedAt: checkedAt,
      imageUrl: image.url, imageSourceUrl: image.source, imageAuthor: image.author, imageLicense: image.license, imageAlt: image.alt,
      images: [image], searchAnswers: questions
    },
    source_label: featurePlace.sourceLabel || place.operator, source_url: featurePlace.source || place.source, verified_at: checkedAt
  };
}

function upsert(document, park) {
  const index = document.parks.findIndex((item) => item.id === park.id);
  if (index >= 0) document.parks[index] = park;
  else document.parks.push(park);
}

const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);

(() => {
  const all = read("data/generated/all-subsites-ready.json");
  const pilot = read("data/generated/pilot-subsites-ready.json");
  const national = read("data/parent-park-information-enrichment-national.json");
  const locations = read("data/launch-location-overrides.json");
  all.parks = all.parks.filter((park) => park.id !== oldCombinedId);
  pilot.parks = pilot.parks.filter((park) => park.id !== oldCombinedId);
  delete national.parks[oldCombinedId];

  for (const place of campaign.places) {
    const images = galleries.places[place.id]?.images || [];
    if (images.length < 3) throw new Error(`${place.name} has only ${images.length} prepared images`);
    const record = {
      id: place.id, name: place.name, type: "Park", city: "Boston", state: "MA", country: "US",
      citySlug: "boston-MA", slug: slugify(place.name), searchCategory: "park",
      neighborhood: "Boston", status: "Sourced public-access visitor guide", summary: place.summary,
      searchDescription: `Hours, parking, real photos, mapped destinations, and essential visitor answers for ${place.name} in Boston.`,
      address: place.address, latitude: place.latitude, longitude: place.longitude,
      hours: place.hours, hoursSchedule: parentSchedules[place.id] || false, cost: place.cost, accessibility: place.accessibility,
      sourceLabel: place.operator, source: place.source, verifiedAt: checkedAt, operator: place.operator,
      image: images[0], images: images.slice(1), sources: [{ label: place.operator, url: place.source }],
      launchTier: "anchor", likelySubsites: true, publishStatus: "super-enriched", researchQueue: [],
      transit: place.transit, searchAnswers: parentAnswers(place),
      features: place.subsites.map((name, index) => makeFeature(place, name, index, images)), amenities: [], comments: []
    };
    upsert(all, record);
    upsert(pilot, record);
    national.parks[place.id] = {
      city: "Boston", citySlug: "boston-MA", operator: place.operator, sourceLabel: place.operator,
      source: place.source, address: place.address, summary: place.summary, hours: place.hours, hoursSchedule: parentSchedules[place.id] || false, cost: place.cost,
      accessibility: place.accessibility, transit: place.transit, searchAnswers: record.searchAnswers,
      image: images[0], additionalImages: images.slice(1), replaceImages: true, verifiedAt: checkedAt
    };
    const location = { id: place.id, park: place.name, city: "Boston", state: "MA", latitude: place.latitude, longitude: place.longitude, address: place.address, displayName: `${place.name}, Boston, MA`, source: place.operator, sourceUrl: place.source, checkedAt };
    const locationIndex = locations.findIndex((item) => item.id === place.id);
    if (locationIndex >= 0) locations[locationIndex] = location;
    else locations.push(location);
  }
  write("data/generated/all-subsites-ready.json", all);
  write("data/generated/pilot-subsites-ready.json", pilot);
  write("data/parent-park-information-enrichment-national.json", national);
  write("data/launch-location-overrides.json", locations);
  console.log(`Super-enriched ${campaign.places.length} Boston guides with ${campaign.places.reduce((total, place) => total + place.subsites.length, 0)} focused destinations.`);
})();
