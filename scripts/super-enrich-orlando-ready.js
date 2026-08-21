#!/usr/bin/env node
const crypto = require("node:crypto"),
  fs = require("node:fs"),
  path = require("node:path"),
  root = path.resolve(__dirname, ".."),
  checkedAt = "2026-08-06",
  campaign = require("../data/orlando-super-enrichment-campaign.json"),
  gallery = require("../data/generated/orlando-super-images.json"),
  coordinates =
    require("../data/generated/orlando-feature-coordinates.json").places;
const slug = (v) =>
  String(v)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const uuid = (p, s) => {
  const b = crypto
    .createHash("sha256")
    .update(`auditmap:${p}:${s}`)
    .digest()
    .subarray(0, 16);
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
const facts = {
  "launch-fl-orlando-lake-eola-park": {
    lat: 28.5438382,
    lon: -81.375257,
    address: "512 E. Washington Street, Orlando, FL 32801",
    label: "City of Orlando",
    hours:
      "Open daily 6 a.m.-11:59 p.m. Swan boats operate Tuesday-Sunday 10 a.m.-7 p.m., weather permitting, and close Monday.",
    cost: "Park access is free. Swan boats are $15 for 30 minutes; downtown parking, food, reservations, and events cost separately.",
    parking:
      "Use paid downtown garages, metered streets, transit, or rideshare. Markets, festivals, concerts, and road closures can eliminate the closest normal approach.",
    arrival:
      "Choose the swan-boat dock on Rosalind Avenue, amphitheater, playground, or market side before parking; the loop is 0.9 mile.",
    restrooms:
      "Public restrooms serve developed park areas, but event access and hours can vary. Identify the closest facility before walking the full loop.",
    accessibility:
      "The paved 0.9-mile loop and major facilities are accessible; a wheelchair lift serves an accessible swan boat, subject to availability.",
    dogs: "Leashed pets are allowed in general park areas, and pets and service animals are permitted on swan boats under current rules.",
    family:
      "Swan boats, playgrounds, fountain views, birds, lawns, and frequent events work well for families. Do not feed or approach swans and waterfowl.",
    transit:
      "LYMMO downtown buses and nearby SunRail/central transit connections reduce parking pressure.",
    need: "Boats are first-come and weather dependent. Check lightning, heat, fountain or water-quality notices, event closures, and swan behavior before visiting.",
  },
  "launch-fl-orlando-bill-frederick-park-at-turkey-lake": {
    lat: 28.5071074,
    lon: -81.4839004,
    address: "3401 S. Hiawassee Road, Orlando, FL 32835",
    label: "City of Orlando",
    hours:
      "Open daily 8 a.m.-7 p.m. April-October and 8 a.m.-5 p.m. November-March; closed December 24 and 25. The seasonal pool is currently closed until further notice; boats, disc golf, camping, and offices differ.",
    cost: "Daily entry is $5 per car, $2 driver-only, or $1 per bus/large-van passenger. Cabins, camping, shelters, boats, and programs cost extra.",
    parking:
      "Pay at the park entrance and follow internal signs to the lake, playgrounds, disc golf, cabins, farm, or reserved pavilion; the 183-acre park is not one compact lot.",
    arrival:
      "Choose the fishing pier/boathouse, playground and seasonal pool, disc-golf course, campground, or farm before entering.",
    restrooms:
      "Restrooms serve developed recreation, pavilion, pool, and campground areas. Remote trails and disc-golf sections have fewer facilities.",
    accessibility:
      "Developed parking, restrooms, paved paths, shelters, and selected recreation areas are accessible; trails, lake edges, and disc golf vary.",
    dogs: "Leashed pets are allowed in designated areas and camping under posted rules; keep them out of pool, playground, farm, and restricted facilities.",
    family:
      "Playgrounds, farm animals, fishing, seasonal pool, trails, camping, and lake views can fill a day. Confirm pool and boat operations before promising either.",
    transit:
      "Direct transit is limited; driving or rideshare is the practical approach, but arrange pickup because internal distances are substantial.",
    need: "Swimming is only in the seasonal pool, not Turkey Lake. Check heat, lightning, insects, disc-golf event closures, pool status, fishing rules, and campground terms.",
  },
  "launch-fl-orlando-harry-p-leu-gardens": {
    lat: 28.5698,
    lon: -81.3557,
    address: "1920 N. Forest Avenue, Orlando, FL 32803",
    label: "Harry P. Leu Gardens / City of Orlando",
    hours:
      "Garden admission generally operates daily 9 a.m.-5 p.m., with last admission before closing. Holiday, Leu House, event, and construction schedules differ.",
    cost: "The garden is ticketed; current admission, discounts, free days, events, and house-tour terms should be confirmed before visiting.",
    parking:
      "Free on-site parking is available, but popular events and free-admission days fill the closest lot. Follow event-specific entry instructions.",
    arrival:
      "Use the visitor-center entrance on Forest Avenue; the Leu House, rose garden, tropical stream, and event lawn sit on different parts of the 50-acre grounds.",
    restrooms:
      "Accessible restrooms and visitor services are available near the entrance and developed garden facilities during admission hours.",
    accessibility:
      "Primary garden routes and visitor facilities are accessible, while historic-house stairs, lawns, wet paths, and secondary garden surfaces vary.",
    dogs: "Pets are generally not admitted except qualified service animals and specifically announced dog-friendly events.",
    family:
      "Open lawns, flowers, ponds, shaded paths, and children's programming can work well for families. Strollers should remain on permitted paths.",
    transit:
      "Driving and rideshare are simplest; local buses require a final neighborhood walk. Confirm pickup before evening events.",
    need: "Bloom conditions change seasonally. Check admission, event closures, heat, lightning, mosquitoes, wet paths, house-tour availability, and the official garden map.",
  },
  "launch-fl-winter-park-mead-botanical-garden": {
    lat: 28.5831,
    lon: -81.3608,
    address: "1300 S. Denning Drive, Winter Park, FL 32789",
    label: "Mead Botanical Garden / City of Winter Park",
    hours:
      "Open daily 8 a.m.-dusk. Buildings, greenhouse access, programs, weddings, and events use separate schedules.",
    cost: "General garden admission is free. Programs, rentals, photography permits, and special events may cost.",
    parking:
      "Free on-site parking is near the Denning Drive/Garden Drive entrance. Garden Drive is easy to miss; event parking instructions may differ.",
    arrival:
      "Enter where Garden Drive meets Denning Drive, then choose boardwalk/wetlands, butterfly gardens, Alice's Pond trails, or The Grove.",
    restrooms:
      "Restrooms are near developed facilities and event areas; trail and boardwalk sections do not have continuous service.",
    accessibility:
      "Developed paths and facilities support access, while boardwalk transitions, roots, wet trails, and natural surfaces vary after rain.",
    dogs: "Well-behaved dogs are welcome on leash in most areas; clean up waste and keep pets away from wildlife and restoration beds.",
    family:
      "The boardwalk, pond, butterflies, creek, greenhouse, and open grove make a calm family visit. Bring insect protection and supervise at water edges.",
    transit:
      "Driving, cycling, or rideshare is simplest; the garden sits just east of US 17-92 and requires a final neighborhood approach.",
    need: "This is a natural garden, not a manicured theme attraction. Expect mosquitoes, mud, wildlife, limited evening light, event closures, and changing dusk time.",
  },
  "launch-fl-orlando-blue-jacket-park": {
    lat: 28.577164,
    lon: -81.338858,
    address: "2501 General Rees Avenue, Orlando, FL 32814",
    label: "City of Orlando",
    hours:
      "Open daily 6 a.m.-11 p.m. Athletic fields, lights, reserved pavilion, and organized events use separate schedules.",
    cost: "General park, playground, fitness, paths, history wall, and open-space access are free. Pavilion and field reservations cost extra.",
    parking:
      "A park lot and legal on-street parking serve different areas. Navigate to the fields, playground, pavilion, or Navy History Wall rather than the broad park center.",
    arrival:
      "Use General Rees Avenue for main facilities; the Navy History Wall and memorials are at the south end in front of the baseball fields.",
    restrooms:
      "Public restroom facilities serve developed park areas, but access can vary with field and reservation schedules.",
    accessibility:
      "Accessible parking, restrooms, paved paths, playground approaches, and developed recreation areas are provided.",
    dogs: "Leashed dogs are allowed in general park areas under posted rules; keep them off active fields, playgrounds, and reserved events.",
    family:
      "Playgrounds for ages 2-5 and 5-12, fitness, fields, paths, fountains, and naval history offer a practical family visit with broad open space.",
    transit:
      "Local buses and Baldwin Park walking/cycling connections serve the neighborhood; parking is easier than at downtown parks outside major events.",
    need: "Field games, 5Ks, ceremonies, and rentals can control sections. Check lightning, heat, shade, restroom access, and field reservations before arriving.",
  },
};
Object.assign(facts, {
  "launch-fl-christmas-orlando-wetlands": {
    lat: 28.5583,
    lon: -81.0022,
    address: "25155 Wheeler Road, Christmas, FL 32709",
    label: "City of Orlando",
    hours:
      "Open Tuesday-Sunday from sunrise to sunset and closed Monday. The Visitors Center is open Tuesday-Saturday 9 a.m.-4 p.m. and closes on city-observed holidays; tram tours use a limited seasonal schedule.",
    cost: "Admission, parking, and public volunteer tram tours are free; tram donations are welcome and reserved group-tour rates vary.",
    parking:
      "Use the free entrance lot on Wheeler Road. Restrooms, picnic pavilions, and the Visitors Center are near this lot; private vehicles cannot continue onto the wetland berm roads.",
    arrival:
      "Start at the Visitors Center and map board near the entrance. Choose the 2,200-foot Cypress Boardwalk, a short berm loop, or a longer trail before leaving the developed area.",
    restrooms:
      "Restrooms are just north of the parking lot and at the Visitors Center. There are no restrooms across the remote 1,650-acre trail system.",
    accessibility:
      "A sidewalk connects accessible parking with restrooms, picnic pavilion, Visitors Center, and Cypress Boardwalk. Compacted sand-shell berms are generally wheelchair accessible only when dry.",
    dogs: "Pets are prohibited because of alligators and birds of prey. ADA-defined service animals are permitted; keep them close and away from water edges.",
    family:
      "The boardwalk and Visitors Center are the easiest family visit. Keep children close, stay atop berms, carry water, and never approach alligators, snakes, or other wildlife.",
    transit:
      "There is no practical public transit from Orlando. Driving is the reliable approach; confirm a rideshare return before depending on one in rural Christmas.",
    need: "Expect extreme heat, minimal shade, fast lightning storms, mosquitoes, soft trails after rain, and wildlife at close range. The automatic gate closes at sunset and vehicles can be locked in.",
  },
  "launch-fl-orlando-lake-baldwin-park": {
    lat: 28.5770969,
    lon: -81.3257034,
    address: "2000 S. Lakemont Avenue, Winter Park, FL 32792",
    label: "City of Winter Park",
    hours:
      "Open daily 8 a.m.-sunset. The park is closed every second and fourth Wednesday until noon for maintenance; special closures and lake-access advisories can change conditions.",
    cost: "General park and off-leash area access are free. Pavilion reservations and permitted activities may cost.",
    parking:
      "Free on-site parking serves the Lakemont Avenue entrance. Dogs must be leashed in the parking lot and while entering or leaving the fenced off-leash area.",
    arrival:
      "Use the Lakemont Avenue entrance for the dog area, sandy dog beach, pavilions, restroom, dock, and non-gas boat ramp. Confirm whether you need the fenced dog area or the broader lake loop.",
    restrooms:
      "One public restroom serves the park near the developed picnic and pavilion area; the surrounding lake loop has limited facilities.",
    accessibility:
      "The city lists the park as wheelchair accessible, with developed parking and facilities. Sandy beach, grass, roots, and wet or muddy dog-area surfaces vary.",
    dogs: "Dogs may be off leash only within the designated fenced area and under voice control. Dogs may enter the lake, but people may not swim; puppies under four months and dogs in heat are prohibited.",
    family:
      "This is primarily a high-energy off-leash dog destination. A playground, pavilions, picnic tables, dock, and lake views are available, but supervise children closely around unfamiliar dogs and water.",
    transit:
      "Driving, cycling, and rideshare are simplest. Baldwin Park paths connect nearby neighborhoods, but verify the exact Winter Park entrance rather than navigating to the opposite side of Lake Baldwin.",
    need: "Check the second/fourth Wednesday closure, current lake-water advisory, mud, dog conflicts, heat, lightning, and wash-station status. Human swimming is permanently prohibited.",
  },
  "launch-fl-orlando-barber-park": {
    lat: 28.4951897,
    lon: -81.320282,
    address: "3701 Gatlin Avenue, Orlando, FL 32812",
    label: "Orange County Parks and Recreation",
    hours:
      "Open daily 8 a.m.-8 p.m. in summer and 8 a.m.-6 p.m. in winter. The splash pad uses four sessions: 10-11:45 a.m., noon-1:45 p.m., 3-4:45 p.m., and 5-6:45 p.m., with a 2-3 p.m. closure.",
    cost: "General park, playground, splash pad, dog park, trails, and open recreation access are free. Reservations and organized programs may cost.",
    parking:
      "Use the free Gatlin Avenue lots and choose the playground/splash pad, dog park, fields, courts, skate area, or pavilions before parking; the 81-acre park has separated activity zones.",
    arrival:
      "Families should navigate to the splash playground and inclusive playground area, while sports visitors should confirm the assigned field or court and dog visitors should use the fenced dog area.",
    restrooms:
      "Public restrooms serve the developed recreation complex. Locate them before entering the timed splash session or heading to a remote field.",
    accessibility:
      "The county lists an inclusive playground, paved fitness path, developed parking, pavilions, and recreation facilities; individual sports and splash surfaces vary.",
    dogs: "Leashed pets are allowed in general areas and an off-leash dog park is provided. Keep dogs out of the playground, splash pad, and active athletic areas.",
    family:
      "The inclusive playground, free timed splash pad, pavilions, courts, skate park, and fields make this a strong family stop. Bring shade, water, dry clothes, and the current session schedule.",
    transit:
      "Driving and rideshare are simplest. Bus service in the Conway area may still require a walk along busy roads; confirm the final pedestrian route before relying on transit.",
    need: "Splash sessions and sports calendars matter more than general park hours. Check weather, lightning, heat, court or field closures, skate activity, and splash-pad operations before leaving home.",
  },
});
const ready = campaign.places.filter(
  (p) => gallery.places[p.id] && facts[p.id],
);
function answer(p, k, q, t) {
  return {
    intentKey: k,
    question: q,
    answer: t,
    sourceLabel: facts[p.id].label,
    source: p.officialSource,
    verifiedAt: checkedAt,
    freshnessClass: ["hours", "parking", "weather", "need-to-know"].includes(k)
      ? "fast"
      : "slow",
    status: "verified",
  };
}
function answers(p) {
  const f = facts[p.id];
  return [
    ["hours", `When is ${p.name} open?`, f.hours],
    ["parking", `Where should I park for ${p.name}?`, f.parking],
    ["entrance", `What is the best entrance for ${p.name}?`, f.arrival],
    ["restroom", `Are there restrooms at ${p.name}?`, f.restrooms],
    ["fees", `Is ${p.name} free?`, f.cost],
    ["accessibility", `How accessible is ${p.name}?`, f.accessibility],
    ["dogs", `Are dogs allowed at ${p.name}?`, f.dogs],
    ["family", `Is ${p.name} good for children?`, f.family],
    ["transit", `How do I reach ${p.name} without a car?`, f.transit],
    ["need-to-know", `What should I know before visiting ${p.name}?`, f.need],
    [
      "weather",
      `What weather check matters before visiting ${p.name}?`,
      `Check heat index, lightning, thunderstorms, hurricane or storm closures, shade, drinking water, mosquitoes, and operator alerts. Leave exposed fields, water, boats, and playgrounds immediately for thunder.`,
    ],
  ].map((x) => answer(p, ...x));
}
function feature(p, n, i, imgs) {
  const f = facts[p.id],
    s = slug(n),
    id = uuid(p.id, s),
    position = coordinates[p.id]?.[s],
    focused = `${n} is a distinct visitor destination within ${p.name}. ${f.arrival}`,
    pic = {
      ...imgs[i % imgs.length],
      featureId: id,
      latitude: position?.latitude,
      longitude: position?.longitude,
      alt: `${n} at ${p.name}`,
    },
    qs = [
      ["location", `Where exactly is ${n}?`, focused],
      ["parking", `Where should I park for ${n}?`, f.parking],
      ["hours", `When is ${n} open?`, f.hours],
      ["restroom", `Are there restrooms near ${n}?`, f.restrooms],
      ["fees", `Is ${n} free?`, f.cost],
      ["accessibility", `How accessible is ${n}?`, f.accessibility],
      ["dogs", `Are dogs allowed at ${n}?`, f.dogs],
      ["family", `Is ${n} good for children?`, f.family],
      ["need-to-know", `What should I know before visiting ${n}?`, f.need],
    ].map((x) => answer(p, ...x));
  return {
    id,
    slug: s,
    name: n,
    feature_type: "destination",
    description: focused,
    latitude: pic.latitude,
    longitude: pic.longitude,
    details: {
      category: "destination",
      includeInParentGallery: true,
      positionQuality: position?.displayName,
      coordinateSource: position?.source,
      address: f.address,
      hours: f.hours,
      cost: f.cost,
      accessibility: f.accessibility,
      locationContext: f.arrival,
      needToKnow: f.need,
      informationSourceLabel: f.label,
      informationSourceUrl: p.officialSource,
      informationCheckedAt: checkedAt,
      imageUrl: pic.url,
      imageSourceUrl: pic.source,
      imageAuthor: pic.author,
      imageLicense: pic.license,
      imageAlt: pic.alt,
      images: [pic],
      searchAnswers: qs,
    },
    source_label: f.label,
    source_url: p.officialSource,
    verified_at: checkedAt,
  };
}
const up = (d, p) => {
  const i = d.parks.findIndex((x) => x.id === p.id);
  i >= 0 ? (d.parks[i] = p) : d.parks.push(p);
};
(async () => {
  const af = path.join(root, "data/generated/all-subsites-ready.json"),
    pf = path.join(root, "data/generated/pilot-subsites-ready.json"),
    cf = path.join(
      root,
      "data/parent-park-information-enrichment-national.json",
    ),
    all = JSON.parse(fs.readFileSync(af)),
    pilot = JSON.parse(fs.readFileSync(pf)),
    camp = JSON.parse(fs.readFileSync(cf)),
    locf = path.join(root, "data/launch-location-overrides.json"),
    loc = JSON.parse(fs.readFileSync(locf));
  for (const p of ready) {
    const f = facts[p.id],
      imgs = gallery.places[p.id].images,
      record = {
        ...(all.parks.find((x) => x.id === p.id) || {}),
        id: p.id,
        name: p.name,
        type: "Park",
        city: p.city,
        state: "FL",
        country: "US",
        citySlug: `${slug(p.city)}-FL`,
        slug: slug(p.name),
        searchCategory: "park",
        status: "Sourced public-access visitor guide",
        summary: p.focus || `${p.name} visitor guide.`,
        searchDescription: `Hours, parking, images, internal destinations, and essential visitor answers for ${p.name}.`,
        address: f.address,
        latitude: f.lat,
        longitude: f.lon,
        hours: f.hours,
        cost: f.cost,
        accessibility: f.accessibility,
        sourceLabel: f.label,
        source: p.officialSource,
        verifiedAt: checkedAt,
        operator: f.label,
        image: imgs[0],
        images: imgs.slice(1),
        sources: [{ label: f.label, url: p.officialSource }],
        launchTier: p.priority,
        likelySubsites: true,
        publishStatus: "super-enriched",
        researchQueue: [],
        transit: f.transit,
        searchAnswers: answers(p),
        features: p.subsites.map((n, i) => feature(p, n, i, imgs)),
        amenities: [],
        comments: [],
      };
    up(all, record);
    up(pilot, record);
    camp.parks[p.id] = {
      city: p.city,
      citySlug: `${slug(p.city)}-FL`,
      operator: f.label,
      sourceLabel: f.label,
      source: p.officialSource,
      address: f.address,
      summary: record.summary,
      hours: f.hours,
      cost: f.cost,
      accessibility: f.accessibility,
      transit: f.transit,
      searchAnswers: record.searchAnswers,
      image: imgs[0],
      additionalImages: imgs.slice(1),
      replaceImages: true,
      verifiedAt: checkedAt,
    };
    const v = {
        id: p.id,
        park: p.name,
        city: p.city,
        state: "FL",
        latitude: f.lat,
        longitude: f.lon,
        address: f.address,
        displayName: `${p.name}, ${p.city}, FL`,
        source: f.label,
        sourceUrl: p.officialSource,
        checkedAt,
      },
      i = loc.findIndex((x) => x.id === p.id);
    i >= 0 ? (loc[i] = v) : loc.push(v);
  }
  fs.writeFileSync(af, JSON.stringify(all, null, 2) + "\n");
  fs.writeFileSync(pf, JSON.stringify(pilot, null, 2) + "\n");
  fs.writeFileSync(cf, JSON.stringify(camp, null, 2) + "\n");
  fs.writeFileSync(locf, JSON.stringify(loc, null, 2) + "\n");
  console.log(
    `Super-enriched ${ready.length} Orlando guides with ${ready.reduce((n, p) => n + p.subsites.length, 0)} focused destinations.`,
  );
})().catch((e) => {
  console.error(e.stack || e);
  process.exit(1);
});
