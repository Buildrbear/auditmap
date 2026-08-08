const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const inventoryPath = path.join(root, "data", "nc-white-dot-inventory.json");
const summaryPath = path.join(root, "data", "nc-white-dot-light-enrichment-summary.json");
const checkedAt = new Date().toISOString().slice(0, 10);
const deferredNonParkIds = new Set([
  "osm-way-1369807279", // Latta Park is a commercial development, not a public park.
  "osm-way-1200015234", // Cameron Crossing Pocket Park is a development amenity, not a Town park.
  "osm-way-1044574558", // Riverwood open fields are a development amenity.
  "osm-way-547117191", // Riverwood play area is a development amenity.
  "osm-way-634488370", // The Quad is campus open space, not a City park.
  "osm-way-542635132", // Camden Park is a Fearrington Village amenity outside Apex, not a Town park.
  "osm-way-1332684492", // Christie Park is development open space outside the Town park inventory.
  "osm-way-916746342", // Woodbury Dog Park is a residential-development amenity, not a Town dog park.
  "osm-way-1089610218", // Agerholm Memorial Gun Park is inside controlled-access Camp Lejeune.
  "osm-way-611694842", // Midway Dog Park #1 serves military housing rather than the general public.
  "osm-way-611694843", // Midway Dog Park #2 serves military housing rather than the general public.
  "osm-way-189678858", // Annsdale Park is a Brunswick Forest development amenity, not a Town park.
  "osm-node-357797111", // Winchester Avenue is primarily a community facility, deferred with municipal buildings.
  "osm-way-577297921", // Lincolnville AME Park is not listed in the Town of Wake Forest public park inventory.
  "osm-way-1105920329", // Linear Park is a generic mapped greenway/planning label, not a distinct public destination.
  "osm-way-1268822469", // Debden Park is not listed in the City of Goldsboro public park inventory.
  "osm-way-1346788965", // Heritage Park is not listed in the City of Goldsboro public park inventory.
  "osm-way-802335527", // Highgrove Park is subdivision open space, not a Town of Chapel Hill park.
  "osm-way-1445870361", // Explicitly mapped Private Dog Park is not a general-public destination.
  "osm-way-1082353409", // Trail Head Park is a private Cheval residential-community amenity.
  "osm-way-1082353412", // Woodlands Park is a private Cheval residential-community amenity.
  "osm-way-556630800", // Large-dog enclosure is a subfacility of Crooked Creek Park.
  "osm-way-556630802", // Small-dog enclosure is a subfacility of Crooked Creek Park.
  "osm-way-543920265", // KettleBridge is not in Cary's official public-park inventory.
  "osm-relation-8257028", // Duplicate of the authoritative Apex Nature Park and Seymour Athletic Fields launch page.
  "osm-relation-15448820", // Back Creek Greenway is still a planning study, not an open visitor destination.
  "osm-way-1010261710", // Chalyce Park is an unverified subdivision amenity, not a public park.
  "osm-way-868864647", // Chateau Community Park is an unverified subdivision amenity, not a public park.
  "osm-way-575371253", // Hamilton Green Park is an unverified subdivision amenity, not a public park.
]);

function known(value) {
  return Boolean(value && !/not yet documented|open status varies/i.test(String(value)));
}

function sourceLabel(place) {
  return place.sourceLabel || (/openstreetmap\.org/i.test(place.source || "")
    ? "OpenStreetMap contributors"
    : "Official park source");
}

function answer(place, intentKey, question, text) {
  return {
    intentKey,
    question,
    answer: text,
    sourceLabel: sourceLabel(place),
    source: place.source,
    sourceType: /openstreetmap\.org/i.test(place.source || "") ? "public-map" : "official",
    checkedAt: place.verifiedAt || checkedAt,
  };
}

function enrich(place) {
  const displayAddress = known(place.address) ? place.address : `the mapped pin in ${place.city}, North Carolina`;
  const amenities = place.amenities || [];
  const unresolved = [];
  let score = 20;
  if (known(place.address)) score += 20;
  else unresolved.push("address");
  if (known(place.hours)) score += 15;
  else unresolved.push("hours");
  if (amenities.length) score += 15;
  else unresolved.push("amenities");
  if (known(place.accessibility)) score += 10;
  else unresolved.push("accessibility");
  if (place.image?.url) score += 20;
  else unresolved.push("image");
  unresolved.push("parking");

  const hoursText = known(place.hours)
    ? `${place.hours}. Check entrance signs and the linked source for weather, maintenance, holiday, or seasonal changes.`
    : `Reliable opening hours are not yet published in this light record. Check entrance signs and the linked source before an early-morning or evening visit.`;
  const amenitiesText = amenities.length
    ? `The current public record identifies ${amenities.join(", ")}. Availability can change, so verify any must-have facility before traveling.`
    : `No specific facilities are verified in the current light record. Treat this as a location-confirmed public park until playgrounds, restrooms, fields, courts, or shelters are documented.`;
  const accessibilityText = known(place.accessibility)
    ? `${place.accessibility}. Surface, slope, and route-level details still need field verification.`
    : `Route-level accessibility is not yet verified. The map pin confirms the park location, but it does not establish an accessible parking space, entrance, surface, or restroom.`;

  return {
    ...place,
    enrichmentTier: "discovery-light",
    completenessScore: Math.min(score, 100),
    unresolvedIntentKeys: [...new Set(unresolved)],
    searchAnswers: [
      answer(place, "location", `Where is ${place.name}?`, `${place.name} is mapped at ${displayAddress}. Use the AuditMap pin to distinguish the public park from similarly named neighborhoods, schools, or municipal buildings.`),
      answer(place, "hours", `What hours is ${place.name} open?`, hoursText),
      answer(place, "parking", `Where should I park for ${place.name}?`, `Navigate to ${displayAddress}. Dedicated parking and overflow rules are not yet verified, so use only signed public spaces, follow posted restrictions, and do not block homes, gates, fields, or service access.`),
      answer(place, "amenities", `What is available at ${place.name}?`, amenitiesText),
      answer(place, "accessibility", `What accessibility information is available for ${place.name}?`, accessibilityText),
      answer(place, "dogs", `Are dogs allowed at ${place.name}?`, place.type === "Dog park"
        ? `This location is mapped as a public dog park. Follow posted leash, enclosure, size-separation, vaccination, child-supervision, and maintenance rules at the entrance.`
        : `Off-leash use is not verified. Keep dogs leashed and follow posted park rules unless a signed dog enclosure says otherwise.`),
    ],
  };
}

const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
const places = inventory.places.map((place) => {
  if (deferredNonParkIds.has(place.id)) {
    return { ...place, inventoryStatus: "deferred-non-park", publishStatus: "excluded", exclusionReason: "Private or non-public development amenity, not a general-public park" };
  }
  return place.inventoryStatus === "park-candidate" && place.enrichmentTier !== "basic" ? enrich(place) : place;
});
const counts = places.reduce((result, place) => {
  result[place.inventoryStatus] = (result[place.inventoryStatus] || 0) + 1;
  if (!place.image?.url) result.withoutImage += 1;
  if (!place.searchAnswers?.length) result.withoutAnswers += 1;
  return result;
}, { "already-curated": 0, "park-candidate": 0, "deferred-non-park": 0, withoutImage: 0, withoutAnswers: 0 });

const output = { ...inventory, lightEnrichedAt: new Date().toISOString(), counts, places };
fs.writeFileSync(inventoryPath, `${JSON.stringify(output, null, 2)}\n`);

const candidates = places.filter((place) => place.inventoryStatus === "park-candidate" && place.publishStatus !== "excluded");
const unresolved = candidates.reduce((result, place) => {
  for (const intent of place.unresolvedIntentKeys || []) result[intent] = (result[intent] || 0) + 1;
  return result;
}, {});
const byCity = Object.values(candidates.reduce((result, place) => {
  const city = result[place.city] || { city: place.city, candidates: 0, withoutImages: 0, averageCompleteness: 0 };
  city.candidates += 1;
  city.withoutImages += place.image?.url ? 0 : 1;
  city.averageCompleteness += place.completenessScore;
  result[place.city] = city;
  return result;
}, {})).map((city) => ({
  ...city,
  averageCompleteness: Math.round(city.averageCompleteness / city.candidates),
})).sort((left, right) => right.withoutImages - left.withoutImages || left.city.localeCompare(right.city));
const summary = {
  generatedAt: new Date().toISOString(),
  lightEnriched: candidates.length,
  withImages: candidates.filter((place) => place.image?.url).length,
  withoutImages: candidates.filter((place) => !place.image?.url).length,
  averageCompleteness: Math.round(candidates.reduce((total, place) => total + place.completenessScore, 0) / candidates.length),
  unresolved,
  byCity,
  imageQueue: candidates.filter((place) => !place.image?.url).map((place) => ({
    id: place.id,
    name: place.name,
    city: place.city,
    source: place.source,
    completenessScore: place.completenessScore,
  })).sort((left, right) => left.city.localeCompare(right.city) || left.name.localeCompare(right.name)),
};
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
