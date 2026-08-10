#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/philadelphia-super-enrichment-campaign.json");
const customFacts = require("../data/philadelphia-visitor-facts.json").places;
const featureFactsDocument = require("../data/philadelphia-feature-visitor-facts.json");
const featureFacts = featureFactsDocument.places;
const galleries = require("../data/generated/philadelphia-super-images.json");
const featureCoordinates = require("../data/generated/philadelphia-feature-coordinates.json").places;
const checkedAt = campaign.checkedAt;
const featureProfiles = {
  "launch-pa-philadelphia-fairmount-park": [
    { image: 7, description: "Lemon Hill is East Fairmount Park's historic hilltop landscape and mansion." },
    { image: 0, description: "Belmont Plateau is the West Fairmount Park overlook known for its open lawn, skyline view, picnic space, and nearby trail connections." },
    { image: 3, description: "Fairmount Water Works is the free riverfront watershed center below the Philadelphia Museum of Art." },
    { image: 4, description: "Smith Memorial Playground and Playhouse is a free, separately operated family destination with indoor and outdoor play." },
    { image: 5, description: "Shofuso is a ticketed Japanese house and garden in the Centennial District." },
    { image: 6, description: "Please Touch Museum occupies Memorial Hall and is a ticketed indoor children's museum." }
  ],
  "launch-pa-philadelphia-wissahickon-valley-park": [
    { image: 4, description: "Valley Green Inn is the best-known Wissahickon arrival for creek views and Forbidden Drive, with limited parking and a permanent outdoor restroom." },
    { image: 5, description: "Forbidden Drive is the park's broad creekside gravel route, shared by walkers, runners, cyclists, and permitted equestrians." },
    { image: 6, description: "Devil's Pool is a natural pool reached only by trail; swimming and wading are prohibited, and there is no vehicle access on Livezey Lane." },
    { image: 7, description: "Thomas Mill Covered Bridge crosses Wissahickon Creek beside Forbidden Drive and is reached as a trail destination, not a vehicle crossing." },
    { image: 8, description: "Fingerspan is Jody Pinto's sculptural footbridge on the Orange Trail, reached over steep, rocky natural-surface terrain." }
  ],
  "launch-pa-philadelphia-dilworth-park": [
    { image: 0, description: "The zero-depth fountain and Janet Echelman's Pulse artwork share the central plaza, with water jets and colored mist operating seasonally around events and maintenance." },
    { image: 1, description: "The Rothman Orthopaedics Ice Rink replaces the fountain area each winter, with seasonal tickets, rentals, sessions and weather-dependent operations." },
    { image: 2, description: "The Albert M. Greenfield Lawn is the warm-season turf gathering space and becomes the decorated Wintergarden during the colder season." },
    { image: 3, description: "Dilworth Park's glass headhouses, stairs and elevators connect the plaza to SEPTA's 15th Street and City Hall transit complex, but step-free access differs by line." }
  ],
  "launch-pa-philadelphia-fdr-park": [
    { image: 0, description: "Meadow Lake and the FDR Park Boathouse form the park's primary lake-view, fishing and program meeting area, with no swimming and weather-sensitive shoreline access." },
    { image: 1, description: "FDR Park Skatepark is the landmark DIY concrete skate environment beneath I-95, separated from the park's playground and lake recreation areas." },
    { image: 2, description: "The American Swedish Historical Museum is a separately operated, ticketed museum inside FDR Park with its own entrance, hours, parking and accessibility guidance." },
    { image: 3, description: "Olmsted Overlook and its historic gazebo provide a recognizable lake-side gathering landmark used for free music and other scheduled park programs." }
  ],
  "launch-pa-philadelphia-rittenhouse-square": [
    { image: 1, description: "The central plaza and reflecting pool are Rittenhouse Square's main meeting point, surrounded by benches, diagonal paths, lawns and public art." },
    { image: 2, description: "Lion Crushing a Serpent is the dramatic bronze sculpture in the southwest portion of Rittenhouse Square and an easy landmark for meeting or exploring." },
    { image: 3, description: "Duck Girl is Paul Manship's bronze figure at the Children's Pool, best visited as part of the square's compact public-art walk." },
    { image: 4, description: "Billy is Albert Laessle's bronze goat sculpture and a popular children's landmark beside the square's open paths." }
  ],
  "launch-pa-philadelphia-franklin-square": [
    { image: 1, description: "Parx Liberty Carousel is Franklin Square's gentle family ride; it operates on a seasonal schedule and requires a separate ticket for riders age three and older." },
    { image: 2, description: "Philly Mini Golf is the square's Philadelphia-themed ticketed course, with seasonal and weather-dependent operating hours." },
    { image: 2, description: "Franklin Square's playground is the free play area within the compact park loop, convenient to the fountain and staffed attractions when they are open." },
    { image: 0, description: "The historic fountain and SquareBurger area anchor the center of the square; fountain operation and food-service hours change by season and event." },
    { image: 3, description: "The Living Flame Memorial honors fallen Philadelphia police and firefighters near the square's edge; use paths respectfully and expect commemorative events at times." },
    { image: 1, description: "The Chinese Lantern Festival occupies much of Franklin Square on scheduled summer evenings, changing admission, circulation, lighting, food, and attraction access." },
    { image: 0, description: "The Race Street lawn and picnic tables provide free daytime seating near the playground and attractions, but festival setup and private events can reduce availability." },
    { image: 2, description: "Isamu Noguchi's Lightning Bolt sculpture stands near the square and Benjamin Franklin Bridge approach as a compact public-art landmark beside busy streets." }
  ],
  "launch-pa-philadelphia-schuylkill-banks": [
    { image: 3, description: "The Schuylkill Banks Boardwalk carries the paved river trail over the water south of Locust Street, with skyline views and busy mixed bicycle and pedestrian traffic." },
    { image: 1, description: "Schuylkill River Park connects the river trail to lawns, recreation space, and a designated dog run west of Fitler Square." },
    { image: 0, description: "The Walnut Street trailhead and kayak dock provide a central access point for the river trail and scheduled paddling or boat programs." },
    { image: 2, description: "The northern trail connection reaches Fairmount Water Works and the art museum area, where ramps, bridge approaches, and event crowds affect arrival." },
    { image: 0, description: "The Locust Street access ramp reaches the river trail and nearby overlook from Center City; grades and mixed bicycle traffic matter when entering the path." },
    { image: 2, description: "The South Street Bridge ramp is a major step-free connection to the Boardwalk and trail, with long grades, bicycle traffic, and exposed river conditions." },
    { image: 1, description: "Paine's Park is the free skate landscape at the trail's northern Center City end, with concrete terrain, spectators, and connections toward the art museum." },
    { image: 3, description: "Bartram's Mile continues the river route south through Southwest Philadelphia, but gaps, construction, and different trailheads require a separate trip plan." }
  ],
  "launch-pa-philadelphia-spruce-street-harbor-park": [
    { image: 0, description: "The hammock grove is the park's signature free relaxation area; hammocks are first-come, seasonal, and busiest on warm evenings and event days." },
    { image: 1, description: "The floating gardens and net lounges sit over the Delaware River and offer distinctive seating, but capacity, weather, and water-edge conditions matter." },
    { image: 3, description: "Food and drink vendors operate seasonally inside the park; menus, bar service, payment options, and hours vary by day and weather." },
    { image: 2, description: "The Penn's Landing riverfront games area adds free and paid play near the promenade, with activity and access changing around festivals." },
    { image: 1, description: "The Barge Oasis extends seating and plantings over the Delaware River, with narrow transitions, limited capacity, and closures possible during wind or storms." },
    { image: 2, description: "The adjacent RiverRink complex hosts seasonal roller skating, ice skating, rides, food, and events with separate tickets and hours from Harbor Park." },
    { image: 3, description: "The marina-facing edge provides boat and river views beside working docks; public access, charters, and dock gates vary, and the water edge needs close supervision." },
    { image: 0, description: "The South Street pedestrian entrance is the clearest walk-in gateway from Society Hill, connecting directly to the hammock and vendor areas across Columbus Boulevard." }
  ],
  "launch-pa-philadelphia-independence-national-historical-park": [
    { image: 0, description: "The Independence Visitor Center is the practical first stop for current schedules, maps, accessible restrooms, wheelchairs, films, and ranger guidance." },
    { image: 1, description: "The Liberty Bell Center is free and does not require a ticket, but visitors pass through security and lines are longest during peak daytime hours." },
    { image: 2, description: "Independence Hall requires a security screening and may require a timed ticket with a $1 service fee; there are no restrooms inside the secured area." },
    { image: 0, description: "Franklin Court and the Benjamin Franklin Museum sit within the Old City blocks east of Independence Mall; the museum has separate admission and hours." },
    { image: 1, description: "The President's House Site is an open-air exhibit beside the Liberty Bell Center examining presidential history and slavery; access is free and weather exposed." },
    { image: 2, description: "Congress Hall stands beside Independence Hall and is visited through ranger-led access and security procedures that can change by season and staffing." },
    { image: 3, description: "Old City Hall sits at the east side of Independence Square and has separate ranger access and operating hours despite being within the same historic block." },
    { image: 0, description: "Washington Square is a landscaped park block southeast of Independence Hall centered on the Tomb of the Unknown Soldier, with free outdoor access and limited services." }
  ]
};
const slugify = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const stableId = (parent, slug) => {
  const bytes = crypto.createHash("sha256").update(`auditmap:${parent}:${slug}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const upsert = (document, park) => { const index = document.parks.findIndex((item) => item.id === park.id); index >= 0 ? document.parks[index] = park : document.parks.push(park); };

function answer(place, intentKey, question, text, metadata = {}) {
  return { intentKey, question, answer: text, sourceLabel: metadata.sourceLabel || place.operator, source: metadata.source || place.source, verifiedAt: metadata.verifiedAt || place.verifiedAt || checkedAt, freshnessClass: metadata.freshnessClass || (["hours", "parking", "need-to-know", "weather"].includes(intentKey) ? "fast" : "slow"), status: "verified" };
}
function makeAnswers(place) {
  const core = [
    ["hours", `When is ${place.name} open?`, place.hours], ["parking", `Where should I park for ${place.name}?`, place.parking],
    ["entrance", `What is the best entrance for ${place.name}?`, place.arrival], ["restroom", `Are there restrooms at ${place.name}?`, place.restrooms],
    ["fees", `Is ${place.name} free?`, place.cost], ["accessibility", `How accessible is ${place.name}?`, place.accessibility],
    ["dogs", `Are dogs allowed at ${place.name}?`, place.dogs], ["family", `Is ${place.name} good for children?`, place.family],
    ["transit", `How do I reach ${place.name} without a car?`, place.transit], ["need-to-know", `What should I know before visiting ${place.name}?`, place.need],
    ["weather", `What weather should I check before visiting ${place.name}?`, place.weather || "Check heat index, thunderstorms, river or creek flooding, high wind, snow and ice, air quality, and daylight. Leave water edges, fields, playgrounds, and trees when thunder is heard."]
  ].map((values) => answer(place, ...values, place.answerSources?.[values[0]]));
  return core.concat((place.extraAnswers || []).map((entry) => answer(place, entry.intentKey, entry.question, entry.answer, entry)));
}
function feature(place, name, index, images) {
  const slug = slugify(name), id = stableId(place.id, slug);
  const profile = featureProfiles[place.id]?.[index];
  if (!profile) throw new Error(`${place.name}/${name}: visitor profile missing`);
  const position = featureCoordinates[place.id]?.[name];
  if (!position) throw new Error(`${place.name}/${name}: coordinate record missing`);
  const factsForPlace = featureFacts[place.id];
  const specific = factsForPlace?.[slug];
  if (factsForPlace && !specific) throw new Error(`${place.name}/${name}: destination-specific facts missing`);
  const note = specific?.description || profile?.description || `${name} is a distinct visitor destination within ${place.name}. Navigate to this named destination rather than the broad parent-park pin.`;
  const base = images[specific?.imageIndex ?? profile?.image ?? (index % images.length)];
  const image = { ...base, featureId: id, latitude: position.latitude, longitude: position.longitude, alt: `${name} at ${place.name}` };
  const source = specific ? { sourceLabel: specific.sourceLabel, source: specific.source, verifiedAt: featureFactsDocument.checkedAt } : {};
  const questions = [
    ["location", `Where exactly is ${name}?`, specific?.location || note], ["parking", `Where should I park for ${name}?`, specific?.parking || place.parking],
    ["hours", `When is ${name} open?`, specific?.hours || place.hours], ["restroom", `Are there restrooms near ${name}?`, specific?.restrooms || place.restrooms],
    ["fees", `Is ${name} free?`, specific?.fees || place.cost], ["accessibility", `How accessible is ${name}?`, specific?.accessibility || place.accessibility],
    ["dogs", `Are dogs allowed at ${name}?`, specific?.dogs || place.dogs], ["family", `Is ${name} good for children?`, specific?.family || place.family],
    ["need-to-know", `What should I know before visiting ${name}?`, specific?.need || `${note} ${place.need}`]
  ].map((values) => answer(place, ...values, source));
  const closure = specific?.temporarilyClosed === undefined ? {} : { temporarilyClosed: Boolean(specific.temporarilyClosed) };
  return { id, slug, name, feature_type: "destination", description: note, latitude: image.latitude, longitude: image.longitude, ...closure, details: { category: "destination", includeInParentGallery: true, address: specific?.address || place.address, hours: specific?.hours || place.hours, hoursSchedule: false, cost: specific?.fees || place.cost, accessibility: specific?.accessibility || place.accessibility, locationContext: note, needToKnow: specific?.need || place.need, ...closure, coordinateSource: position.coordinateSource, positionQuality: position.positionQuality, informationSourceLabel: specific?.sourceLabel || place.operator, informationSourceUrl: specific?.source || place.source, informationCheckedAt: specific ? featureFactsDocument.checkedAt : checkedAt, imageUrl: image.url, imageSourceUrl: image.source, imageAuthor: image.author, imageLicense: image.license, imageAlt: image.alt, images: [image], searchAnswers: questions }, source_label: specific?.sourceLabel || place.operator, source_url: specific?.source || place.source, verified_at: specific ? featureFactsDocument.checkedAt : checkedAt };
}

(() => {
  const all = read("data/generated/all-subsites-ready.json");
  const pilot = read("data/generated/pilot-subsites-ready.json");
  const national = read("data/parent-park-information-enrichment-national.json");
  const locations = read("data/launch-location-overrides.json");
  const currentMap = read("data/generated/launch-map-places.json");
  for (const scope of campaign.places) {
    const prior = national.parks[scope.id] || {};
    const mapped = currentMap.find((item) => item.id === scope.id) || {};
    const facts = customFacts[scope.id] || {};
    const place = {
      ...scope, ...facts,
      address: facts.address || prior.address || mapped.address || "Philadelphia, PA",
      latitude: facts.latitude || mapped.latitude,
      longitude: facts.longitude || mapped.longitude,
      summary: facts.summary || prior.summary || scope.focus,
      hours: facts.hours || prior.hours || mapped.hours || "Follow posted park hours and destination-specific schedules.",
      cost: facts.cost || prior.cost || mapped.cost || "General outdoor access is free; attractions and programs may charge.",
      accessibility: facts.accessibility || prior.accessibility || mapped.accessibility || "Accessibility varies by entrance and destination.",
      parking: facts.parking || prior.searchAnswers?.find((item) => item.intentKey === "parking")?.answer || "Choose parking for the exact named destination; event conditions vary.",
      arrival: facts.arrival || prior.searchAnswers?.find((item) => ["entrance", "location"].includes(item.intentKey))?.answer || "Navigate to the exact named destination rather than the broad park center.",
      restrooms: facts.restrooms || prior.searchAnswers?.find((item) => item.intentKey === "restroom")?.answer || "Restroom coverage varies by destination and operating schedule.",
      dogs: facts.dogs || prior.searchAnswers?.find((item) => item.intentKey === "dogs")?.answer || "Follow posted leash and restricted-area rules.",
      family: facts.family || prior.searchAnswers?.find((item) => ["family", "playground"].includes(item.intentKey))?.answer || scope.focus,
      transit: facts.transit || prior.transit || mapped.transit || "Use SEPTA trip planning for the exact destination.",
      need: facts.need || prior.searchAnswers?.find((item) => item.intentKey === "need-to-know")?.answer || `Check current closures, events, weather, and destination schedules before visiting ${scope.name}.`
    };
    if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) throw new Error(`${place.name}: coordinates missing`);
    const images = galleries.places[place.id]?.images || [];
    if (images.length < 4) throw new Error(`${place.name}: gallery incomplete`);
    const searchAnswers = customFacts[place.id] ? makeAnswers(place) : (prior.searchAnswers || makeAnswers(place));
    const record = { id: place.id, name: place.name, type: "Park", city: "Philadelphia", state: "PA", country: "US", citySlug: "philadelphia-PA", slug: slugify(place.name), searchCategory: "park", neighborhood: "Philadelphia", status: "Sourced public-access visitor guide", summary: place.summary, searchDescription: `Hours, parking, real photos, mapped destinations, and essential visitor answers for ${place.name} in Philadelphia.`, address: place.address, latitude: place.latitude, longitude: place.longitude, hours: place.hours, cost: place.cost, accessibility: place.accessibility, sourceLabel: place.operator, source: place.source, verifiedAt: place.verifiedAt || checkedAt, operator: place.operator, image: images[0], images: images.slice(1), sources: [{ label: place.operator, url: place.source }], launchTier: "anchor", likelySubsites: true, publishStatus: "super-enriched", researchQueue: [], transit: place.transit, searchAnswers, features: place.subsites.map((name, index) => feature(place, name, index, images)), amenities: [], comments: [] };
    upsert(all, record); upsert(pilot, record);
    national.parks[place.id] = { city: "Philadelphia", citySlug: "philadelphia-PA", operator: place.operator, sourceLabel: place.operator, source: place.source, address: place.address, summary: place.summary, hours: place.hours, cost: place.cost, accessibility: place.accessibility, transit: place.transit, searchAnswers, image: images[0], additionalImages: images.slice(1), replaceImages: true, verifiedAt: place.verifiedAt || checkedAt };
    const location = { id: place.id, park: place.name, city: "Philadelphia", state: "PA", latitude: place.latitude, longitude: place.longitude, address: place.address, displayName: `${place.name}, Philadelphia, PA`, source: place.operator, sourceUrl: place.source, checkedAt: place.verifiedAt || checkedAt };
    const locationIndex = locations.findIndex((item) => item.id === place.id); locationIndex >= 0 ? locations[locationIndex] = location : locations.push(location);
  }
  write("data/generated/all-subsites-ready.json", all); write("data/generated/pilot-subsites-ready.json", pilot);
  write("data/parent-park-information-enrichment-national.json", national); write("data/launch-location-overrides.json", locations);
  console.log(`Super-enriched ${campaign.places.length} Philadelphia guides with ${campaign.places.reduce((total, place) => total + place.subsites.length, 0)} focused destinations.`);
})();
