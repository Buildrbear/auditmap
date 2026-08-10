#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const checkedAt = "2026-08-10";
const downloadImages = process.argv.includes("--download");
const featureImagesPath = path.join(root, "data/generated/dc-feature-images.json");
const featureImages = fs.existsSync(featureImagesPath)
  ? JSON.parse(fs.readFileSync(featureImagesPath, "utf8")).places
  : {};
const allDaySchedule = Object.fromEntries(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) => [day, [["00:00", "24:00"]]]));
const dailySchedule = (open, close) => Object.fromEntries(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) => [day, [[open, close]]]));
const splitDailySchedule = (periods) => Object.fromEntries(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) => [day, periods]));

function slugify(value) {
  return String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function stableUuid(parentId, slug) {
  const bytes = crypto.createHash("sha256").update(`auditmap:${parentId}:${slug}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function photo(slug, url, source, author = "National Park Service", license = "Official federal photograph; source attribution retained") {
  return { slug, url, source, author, license };
}

function commonsPhoto(slug, file) {
  const encoded = encodeURIComponent(file.replaceAll(" ", "_"));
  return photo(
    slug,
    `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=1800`,
    `https://commons.wikimedia.org/wiki/File:${encoded}`,
    "Wikimedia Commons contributor",
    "See source page for Creative Commons or public-domain terms",
  );
}

function licensedCommonsPhoto(slug, file, author, license) {
  const encoded = encodeURIComponent(file.replaceAll(" ", "_"));
  return photo(
    slug,
    `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encoded}?width=1800`,
    `https://commons.wikimedia.org/wiki/File:${encoded}`,
    author,
    license,
  );
}

const mall = "https://www.nps.gov/nama/planyourvisit/index.htm";
const rock = "https://www.nps.gov/rocr/index.htm";
const anacostia = "https://www.nps.gov/anac/index.htm";
const kenilworth = "https://www.nps.gov/keaq/index.htm";
const island = "https://www.nps.gov/this/index.htm";
const meridian = "https://home.nps.gov/rocr/learn/historyculture/meridian-hill-park.htm";
const georgetown = "https://www.nps.gov/places/georgetown-waterfront-park.htm";
const arboretum = "https://usna.usda.gov/visit/hours-and-directions/";
const eastPotomac = "https://www.nps.gov/places/000/east-potomac-park-hains-point.htm";
const gravellyPoint = "https://home.nps.gov/places/000/gravelly-point.htm";
const greatFalls = "https://www.nps.gov/grfa/planyourvisit/index.htm";
const glenEcho = "https://www.nps.gov/glec/planyourvisit/index.htm";
const greatFallsMaryland = "https://www.nps.gov/choh/planyourvisit/great-falls-things-to-do.htm";
const huntleyMeadows = "https://www.fairfaxcounty.gov/parks/huntley-meadows";

const parks = [
  {
    id: "launch-dc-washington-national-mall", name: "National Mall", lat: 38.8895, lon: -77.0230,
    address: "National Mall, Washington, DC 20565", source: mall, sourceLabel: "National Park Service", operator: "National Park Service", tier: "anchor", hoursSchedule: allDaySchedule,
    summary: "Washington's monumental civic landscape, connecting memorials, museums, lawns, gardens, and gathering spaces from the U.S. Capitol toward the Potomac River.",
    hours: "The outdoor National Mall and memorial grounds are open 24 hours. Monument interiors, museums, visitor services, roads, and restrooms use separate schedules.", cost: "Outdoor memorials and general Mall access are free. Timed-entry reservations, parking, museums, tours, and concessions may have separate charges.",
    arrival: "Choose the exact memorial or museum before navigating. The Mall is more than two miles long, and a generic center pin can leave you far from the intended stop.", parking: "Street and public garage parking is limited and often expensive. Metro, walking, cycling, or a permitted tour bus are usually more predictable; accessible spaces are distributed near individual memorials.",
    restrooms: "Public restrooms are distributed near major memorials and visitor areas, but hours and closures vary. Use the official NPS map and identify a facility near the first stop before arriving.",
    accessibility: "Major memorials have accessible approaches, but distances, heat, temporary security zones, curb work, and crowding can make a multi-stop route demanding. Plan a shorter loop around one cluster.",
    dogs: "Leashed pets are generally allowed in outdoor National Mall areas but not inside most buildings, monuments, or museums. Keep pets off memorial elements and clean up waste.",
    family: "The grounds are family-friendly, but long distances and exposed lawns are tiring. Pick two or three nearby destinations, carry water, and use a stroller-ready route rather than attempting the entire Mall.",
    transit: "Smithsonian, Federal Triangle, L'Enfant Plaza, Archives, and Foggy Bottom stations serve different parts of the Mall. Select transit based on the first memorial, not the words National Mall.",
    need: "Security closures, demonstrations, ceremonies, construction, and major events can reroute pedestrians and traffic. Check current NPS alerts and the individual destination page on the visit day.",
    photos: [
      photo("mall-landscape", "https://www.nps.gov/common/uploads/structured_data/3C81722F-1DD8-B71B-0B5AAC81974582C6.jpg?maxHeight=800&maxWidth=1200&quality=90", mall),
      photo("lincoln-memorial", "https://www.nps.gov/common/uploads/structured_data/F1E78AAD-9805-F027-778F77F86A524BDD.jpg?maxHeight=800&maxWidth=1200&quality=90", "https://www.nps.gov/linc/index.htm"),
      photo("washington-monument", "https://www.nps.gov/common/uploads/structured_data/271D461C-C676-4479-71A3FCD2D15C325F.jpg?maxHeight=800&maxWidth=1200&quality=90", "https://www.nps.gov/wamo/index.htm"),
      photo("wwii-memorial", "https://www.nps.gov/common/uploads/structured_data/2303AB7B-E6D5-BB2F-8AB9F8319DB4B901.jpg?maxHeight=800&maxWidth=1200&quality=90", "https://www.nps.gov/wwii/index.htm"),
      photo("mlk-memorial", "https://www.nps.gov/common/uploads/structured_data/3C817680-1DD8-B71B-0B2377795A1029FE.jpg?maxHeight=800&maxWidth=1200&quality=90", "https://www.nps.gov/mlkm/index.htm"),
      photo("jefferson-memorial", "https://www.nps.gov/common/uploads/structured_data/F313C540-E6E1-3928-D14883E746D101E9.jpg?maxHeight=800&maxWidth=1200&quality=90", "https://www.nps.gov/thje/index.htm", "Library of Congress / Carol M. Highsmith", "Public-domain collection image; source attribution retained"),
      photo("vietnam-veterans-memorial", "https://www.nps.gov/common/uploads/structured_data/B7747C16-EFF0-AE6C-C2CCE4E52D34F1F7.jpg?maxHeight=800&maxWidth=1200&quality=90", "https://www.nps.gov/vive/index.htm"),
    ],
  },
  {
    id: "launch-dc-washington-rock-creek-park", name: "Rock Creek Park", lat: 38.9531, lon: -77.0501,
    address: "5200 Glover Road NW, Washington, DC 20015", source: rock, sourceLabel: "National Park Service", operator: "National Park Service", tier: "anchor",
    summary: "A 1,754-acre urban national park with more than 32 miles of trails, forested creek valleys, historic sites, picnic areas, a nature center, planetarium, and working mill.",
    hours: "Park land is open sunrise to sunset. Public roads remain open 24 hours unless posted or temporarily closed; the Nature Center, planetarium, mill, stables, and programs use shorter schedules.", cost: "General park, trail, Nature Center, and Peirce Mill access is free. Horseback riding, permits, reservations, and some partner programs may charge.",
    arrival: "Rock Creek is a long network rather than one entrance. Navigate to the Nature Center, Peirce Mill, a named picnic area, or a signed trailhead instead of the park center.", parking: "Use designated lots and marked spaces only. Parking is distributed and can fill near the Nature Center, picnic areas, trailheads, and events; roadside parking outside marked areas is prohibited.",
    restrooms: "Restrooms are available at selected developed sites, including the Nature Center area and other mapped facilities. Trails do not have continuous services, so confirm the closest open facility before hiking.",
    accessibility: "The Nature Center and selected developed areas have accessible routes, while many forest trails include hills, roots, rocks, creek crossings, and mud. Choose a destination-specific route.",
    dogs: "Dogs must remain leashed. Bring waste bags, protect wildlife, and do not let pets enter Rock Creek or interfere with horses and trail users.", family: "The Nature Center, planetarium programs, Peirce Mill, picnic areas, and shorter trails are strong family options. Match distance and terrain to the group before leaving the developed area.",
    transit: "Bus and Metro access varies widely by destination. The Nature Center is not directly beside a Metro station; review the exact destination and final walking route before relying on transit.",
    need: "Swimming and wading in Rock Creek are prohibited. Download a trail map, carry water, and check road, trail, weather, and facility alerts because service and closures vary across the park.",
    photos: [
      photo("boulder-bridge", "https://www.nps.gov/common/uploads/structured_data/5578822B-0F57-D3E7-A49D70F3D88C1509.jpg?maxHeight=800&maxWidth=1200&quality=90", rock),
      photo("rock-creek-autumn", "https://www.nps.gov/common/uploads/structured_data/55F58D72-A55D-7573-6D04AFFB2E33F50F.jpg?maxHeight=800&maxWidth=1200&quality=90", rock, "NPS / K. Cain"),
      photo("nature-center", "https://www.nps.gov/common/uploads/structured_data/49BAB6E4-91B3-9624-43F4A6C4F1E1BFD8.jpg?maxHeight=800&maxWidth=1200&quality=90", "https://www.nps.gov/rocr/planyourvisit/visitorcenters.htm"),
      photo("peirce-mill", "https://www.nps.gov/common/uploads/structured_data/3C79683C-1DD8-B71B-0BEDB5CD59B5341A.jpg?maxHeight=800&maxWidth=1200&quality=90", "https://www.nps.gov/rocr/learn/historyculture/peirce-mill.htm", "NPS / Michael Zwelling"),
    ],
  },
  {
    id: "launch-dc-washington-anacostia-park", name: "Anacostia Park", lat: 38.8752, lon: -76.9680,
    address: "1900 Anacostia Drive SE, Washington, DC 20020", source: anacostia, sourceLabel: "National Park Service", operator: "National Park Service", tier: "anchor",
    summary: "A broad Anacostia River park with paved trail access, free roller skating, playgrounds, fields, basketball, picnic areas, boating connections, and open waterfront space.",
    hours: "The park is open daily 6 a.m.-10 p.m. The skating-rental booth, programs, permits, concessions, fields, and special events use separate seasonal schedules.", cost: "General park access is free. Roller-skate loans are offered free during posted summer sessions with valid government ID and socks; permits and partner services may charge.",
    arrival: "Use the exact facility address. The Skating Pavilion is at 1500 Anacostia Drive SE; other fields, playgrounds, river-trail connections, and boat facilities are spread along the waterfront.", parking: "Free designated parking is distributed along Anacostia Drive. Events and sports can fill the closest lots, so choose the facility first and keep bike and emergency access clear.",
    restrooms: "Restrooms are available near selected developed recreation areas, including the skating complex, but availability can vary by building, maintenance, and season.",
    accessibility: "The river trail and developed recreation areas provide long paved sections, while field edges, shore access, construction, and temporary event layouts vary.",
    dogs: "Leashed dogs are allowed in outdoor park areas. Remove waste and keep pets out of playgrounds, athletic play, skating surfaces, and protected shoreline habitat.", family: "Playgrounds, open lawns, basketball, skating, picnics, and the paved river trail make this a flexible family destination. Bring helmets and socks if free skating is the plan.",
    transit: "Anacostia Metro and neighborhood bus routes can support some visits, but the walk to a particular riverfront facility varies. Map the final approach before traveling.",
    need: "The waterfront is large and conditions vary by segment. Confirm the exact recreation area, current trail detours, skating-rental schedule, heat, storms, and river conditions before leaving.",
    photos: [
      photo("park-aerial", "https://www.nps.gov/common/uploads/structured_data/3C82A965-1DD8-B71B-0B42F2CD698E11A7.jpg?maxHeight=800&maxWidth=1200&quality=90", anacostia, "NPS / Miguel Marquez"),
      photo("basketball", "https://www.nps.gov/common/uploads/structured_data/E90FE9D6-0571-1A74-ECA594CE99431972.jpg?maxHeight=800&maxWidth=1200&quality=90", anacostia),
      photo("river-trail", "https://www.nps.gov/common/uploads/structured_data/E92300B8-A71B-CCA4-3E64717D74B8149A.jpg?maxHeight=800&maxWidth=1200&quality=90", anacostia),
      photo("skating-pavilion", "https://www.nps.gov/common/uploads/structured_data/E93463E4-973F-F00C-F3FD4C81F20D5A8F.jpg?maxHeight=800&maxWidth=1200&quality=90", "https://www.nps.gov/anac/planyourvisit/roller-skating.htm"),
    ],
  },
  {
    id: "launch-dc-washington-kenilworth-park-aquatic-gardens", name: "Kenilworth Park & Aquatic Gardens", lat: 38.9128, lon: -76.9434,
    address: "1550 Anacostia Avenue NE, Washington, DC 20019", source: kenilworth, sourceLabel: "National Park Service", operator: "National Park Service", tier: "anchor",
    summary: "A free living collection of lotus and water-lily ponds beside the Anacostia tidal marsh, with a visitor center, boardwalk, wildlife, and trail connection.",
    hours: "Standard garden hours are daily 8 a.m.-4 p.m. During the current summer schedule, hours extend to 8 p.m. Wednesday-Sunday and remain 8 a.m.-4 p.m. Monday-Tuesday; check current dates before visiting.", cost: "Admission and parking are free.",
    arrival: "Use 1550 Anacostia Avenue NE for the signed garden entrance. Deanwood Metro is about a half-mile away; the entrance is not directly on the Anacostia River Trail.", parking: "A free visitor lot serves the gardens. It is modest in size and can fill during lotus bloom, ranger programs, and pleasant weekend mornings.",
    restrooms: "Restrooms and drinking water are at the Visitor Center during its operating hours. There is no vending, and facilities are not distributed through the ponds or marsh trail.",
    accessibility: "Accessible parking and two loan wheelchairs are available. Main routes include gravel, dirt, grass, a wood boardwalk, and paved Anacostia River Trail; conditions and firmness vary.",
    dogs: "Leashed pets are allowed outdoors under posted rules, but sensitive wetland habitat and narrow paths require close control. Pets generally cannot enter the Visitor Center.", family: "The ponds, turtles, frogs, birds, and short boardwalk are excellent for curious children. Bring water, bug protection, and close supervision around open water.",
    transit: "Deanwood Metro on the Orange Line is roughly a half-mile walk. Review the pedestrian route in advance because the final neighborhood approach is less obvious than a downtown attraction.",
    need: "Water lilies usually begin blooming in June and lotus peak later in summer, but bloom timing changes with weather. Arrive early for flowers, cooler temperatures, and easier parking.",
    photos: [
      photo("lotus-pond", "https://www.nps.gov/common/uploads/structured_data/3C819F7C-1DD8-B71B-0BE9077BC0E39492.jpg?maxHeight=800&maxWidth=1200&quality=90", kenilworth, "NPS / Miguel A. Marquez"),
      photo("ponds-in-fall", "https://www.nps.gov/common/uploads/structured_data/3C81A0E5-1DD8-B71B-0BA98A148F520896.jpg?maxHeight=800&maxWidth=1200&quality=90", kenilworth, "NPS / Miguel A. Marquez"),
      photo("pond-turtles", "https://www.nps.gov/common/uploads/structured_data/3C81A243-1DD8-B71B-0BFAF6170F21B206.jpg?maxHeight=800&maxWidth=1200&quality=90", kenilworth, "NPS / Miguel A. Marquez"),
    ],
  },
  {
    id: "launch-dc-washington-theodore-roosevelt-island", name: "Theodore Roosevelt Island", lat: 38.8977, lon: -77.0645,
    address: "George Washington Memorial Parkway, Arlington, VA 22209", source: island, sourceLabel: "National Park Service", operator: "National Park Service", tier: "supporting",
    summary: "A wooded Potomac island reached by footbridge, with a monumental memorial plaza, quiet forest paths, tidal marsh, and a distinctive boardwalk loop.",
    hours: "The island is open daily 6 a.m.-10 p.m. Weather, flooding, maintenance, and parkway conditions can close the parking area, bridge, boardwalk, or trails.", cost: "Island access and parking are free.",
    arrival: "The parking lot is accessible only from northbound George Washington Memorial Parkway. Cross the wide footbridge from the lot; there is no vehicle access onto the island.", parking: "The free lot has more than 100 marked standard and accessible spaces but regularly fills on pleasant weekends. Parking outside marked spaces is prohibited.",
    restrooms: "A comfort station and drinking fountains are on the south end along Woods Trail, about one-third mile from Memorial Plaza. Do not expect a restroom at the parking lot or memorial itself.",
    accessibility: "The footbridge is firm and wide, but island trails are gravel, dirt, roots, and boardwalk. Memorial Plaza is about a quarter-mile uphill, with grades up to roughly 12 percent and ramp access at the plaza.",
    dogs: "Leashed dogs are allowed on trails but not on ranger-led programs. Use a leash no longer than six feet, carry waste out, and keep pets away from wildlife and marsh water.", family: "The short bridge and memorial can work for families, while the full swamp loop adds roots, mud, water edges, and an unrailed boardwalk. Choose the route based on conditions.",
    transit: "The island has no direct Metro entrance. Rosslyn is the practical nearby station, followed by a walk and regional trail connection; verify construction and crossing conditions.",
    need: "Bicycles must remain at the rack near the entrance and are not allowed on island trails. The Swamp Trail can flood or become muddy, so check conditions after rain or high water.",
    photos: [
      photo("roosevelt-statue", "https://www.nps.gov/common/uploads/structured_data/3C85E097-1DD8-B71B-0BA63E687BBA913E.jpg?maxHeight=800&maxWidth=1200&quality=90", island),
      photo("woodland-trail", "https://www.nps.gov/common/uploads/structured_data/3C862DDE-1DD8-B71B-0B5C48506D1C2EFA.jpg?maxHeight=800&maxWidth=1200&quality=90", island),
      photo("memorial-plaza", "https://www.nps.gov/common/uploads/structured_data/3C86309E-1DD8-B71B-0B99AD65E25A94C9.jpg?maxHeight=800&maxWidth=1200&quality=90", island),
      photo("swamp-boardwalk", "https://www.nps.gov/common/uploads/structured_data/3C8631C9-1DD8-B71B-0BA4D335CC1C974F.jpg?maxHeight=800&maxWidth=1200&quality=90", island),
    ],
  },
  {
    id: "launch-dc-washington-meridian-hill-park-malcolm-x-park", name: "Meridian Hill Park (Malcolm X Park)", lat: 38.9210, lon: -77.0362,
    address: "16th Street NW & W Street NW, Washington, DC 20009", source: meridian, sourceLabel: "National Park Service", operator: "National Park Service", tier: "supporting",
    summary: "An Italianate neighborhood park, widely called Malcolm X Park, known for its thirteen-basin cascade, monumental terraces, sculpture, lawns, and long-running Sunday drum circle.",
    hours: "May-October hours are 5 a.m.-midnight; November-April hours are 5 a.m.-9 p.m. Construction or restoration work can restrict individual lawns, paths, sculpture, or fountain areas.", cost: "General park access is free. Organized events, commercial activity, and some gatherings require permits.",
    arrival: "Upper entrances are along 16th Street near Euclid Street; the lower park meets 15th Street and Florida Avenue. Pick the entrance based on the cascade, upper lawn, or an accessible lower approach.", parking: "There is no large park lot. Use legal neighborhood street parking, bus, bikeshare, or a nearby Metro approach and respect residential restrictions.",
    restrooms: "Do not plan around a dependable public restroom inside the park. Use a verified nearby facility before arriving, especially for a longer family visit or event.",
    accessibility: "A newer accessible route serves the lower park near 16th Street and Florida Avenue. The historic terraces, stairs, grades, and construction zones still require destination-specific planning.",
    dogs: "Dogs must remain leashed and under control. Keep pets out of fountain basins, planted areas, events, and restoration zones and remove waste.", family: "Lawns, sculpture, views, and the cascade make a rewarding short visit. Closely supervise children around stairs, walls, streets, and water; swimming and wading are prohibited.",
    transit: "Frequent buses serve 16th Street, and Columbia Heights and U Street Metro stations are walkable from different sides. Choose the approach that avoids an unnecessary climb.",
    need: "A major rehabilitation has reopened key lower-park features, but testing, temporary fencing, and continuing landscape work may affect access. Check the latest NPS conditions before visiting for the cascade specifically.",
    photos: [
      photo("cascading-fountain", "https://home.nps.gov/common/uploads/cropped_image/primary/644275AE-C3D9-A2BC-774E26B625D32014.jpg?mode=crop&quality=90&width=1600", "https://home.nps.gov/places/000/cascading-fountain.htm", "U.S. Department of the Interior / Kelsey Graczyk"),
      photo("joan-of-arc", "https://home.nps.gov/common/uploads/cropped_image/primary/1C0D885F-B4D4-A130-A64EAAF121507AF3.jpg?mode=crop&quality=90&width=1600", "https://home.nps.gov/places/000/joan-of-arc-statue.htm", "NPS / Claire Hassler"),
      photo("armillary-sphere", "https://home.nps.gov/common/uploads/cropped_image/primary/59DA2E48-057B-2F5C-41CB32D119FA41E5.jpg?mode=crop&quality=90&width=1600", "https://home.nps.gov/places/000/noyes-armillary-sphere.htm", "NPS / Jordan Land"),
    ],
  },
  {
    id: "launch-dc-washington-georgetown-waterfront-park", name: "Georgetown Waterfront Park", lat: 38.9024, lon: -77.0615,
    address: "Wisconsin Avenue & K Street NW, Washington, DC 20007", source: georgetown, sourceLabel: "National Park Service", operator: "National Park Service", tier: "supporting",
    summary: "An accessible Potomac promenade from 31st Street to Key Bridge with seasonal fountain play, river overlooks, gardens, a labyrinth, broad steps, and trail connections.",
    hours: "The outdoor waterfront is generally open during National Park Service park hours. The fountain is seasonal and may close for maintenance, weather, water-quality work, or winterization.", cost: "General waterfront, fountain, garden, and labyrinth access is free. Parking, boat rentals, food, tours, and events may charge.",
    arrival: "Use Wisconsin Avenue and K Street for the central fountain area, or approach the western end near Key Bridge for the labyrinth and quieter river views.", parking: "There is no dependable dedicated park lot. Use legal metered street parking or a public garage, and expect high demand on weekends and waterfront event days.",
    restrooms: "The park does not provide a dependable full-time public restroom. Identify a nearby public or customer facility before arriving and do not assume restaurants will provide access.",
    accessibility: "Wide paved routes and river overlooks support a relatively accessible visit. River steps, wet fountain pavement, crowding, and transitions to adjacent trails can require care.",
    dogs: "Leashed dogs are allowed outdoors under posted rules. Keep pets out of active fountain play, garden beds, and crowded events and remove waste.", family: "The seasonal fountain is a popular free water-play stop. Bring water shoes, dry clothes, sun protection, and a backup plan in case the fountain is off.",
    transit: "The waterfront is not directly at a Metro station. Frequent buses, bikeshare, walking from Foggy Bottom, and the Capital Crescent Trail can be more practical than parking.",
    need: "Bicycles should use the adjacent designated trail and be walked in pedestrian park areas where posted. Check the fountain and waterfront alert status before promising water play.",
    photos: [
      photo("waterfront", "https://www.nps.gov/common/uploads/cropped_image/primary/DDDB9CA4-BA01-088C-6F782E4C5B517C09.jpg?mode=crop&quality=90&width=1600", georgetown, "NPS / Claire Hassler"),
      photo("fountain-play", "https://www.nps.gov/thingstodo/images/ROCR_GTWaterfront_2_1.jpg?autorotate=false&maxwidth=650", "https://www.nps.gov/thingstodo/georgetown-waterfront-park.htm"),
      photo("potomac-kayaking", "https://www.nps.gov/rocr/planyourvisit/images/Kayaking-on-the-Potomac.png?autorotate=false&maxwidth=650", georgetown, "NPS / Terry Adams"),
      photo("waterfront-garden", "https://www.nps.gov/rocr/planyourvisit/images/F5JZ6482.JPG?autorotate=false&maxwidth=650", georgetown),
    ],
  },
  {
    id: "launch-dc-washington-u-s-national-arboretum", name: "U.S. National Arboretum", lat: 38.9101, lon: -76.9671,
    address: "2400 R Street NE, Washington, DC 20002", source: arboretum, sourceLabel: "U.S. National Arboretum", operator: "U.S. Department of Agriculture", tier: "anchor",
    summary: "A free 451-acre federal garden and research landscape with nine miles of roads, the National Capitol Columns, bonsai museum, azaleas, herb gardens, forests, and major seasonal collections.",
    hours: "Grounds are normally open daily 8 a.m.-5 p.m. except December 25, with last entry at 4:30 p.m. Current summer weekdays may extend to 8 p.m.; buildings and the bonsai museum use shorter hours.", cost: "Admission and general parking are free. Programs, events, tours, and partner services may use reservations or separate fees.",
    arrival: "Use the R Street entrance as the primary visitor approach. The New York Avenue gate closes earlier under current schedules, so do not rely on it for a late-day exit.", parking: "Free designated parking is distributed near major collections. Do not park on roads or lawns; weekends, azalea bloom, and events increase demand near the Columns and bonsai museum.",
    restrooms: "Visitor restrooms are available near the Administration Building and Arbor House, with additional seasonal facilities. Identify the nearest open facility before walking into a distant collection.",
    accessibility: "Major buildings and collections have developed approaches, but the 451-acre landscape includes slopes, long distances, garden paths, and natural surfaces. Drive between distant collections when needed.",
    dogs: "Leashed pets are permitted only under current Arboretum rules and may be restricted from buildings, collections, and events. Review posted pet guidance and protect research plantings.", family: "The Columns, bonsai museum, lawns, and seasonal gardens work well for families. The grounds are too large to cover casually on foot, so choose two or three collections.",
    transit: "Public transit reaches surrounding neighborhoods but not every collection. Confirm the gate, final walking route, and closing time; cycling or rideshare may be easier than a long walk from transit.",
    need: "Collections peak at different times. Check bloom and event information, save the official map, use R Street for late-day visits, and leave enough time to return to the correct gate before closing.",
    photos: [
      photo("national-capitol-columns", "https://commons.wikimedia.org/wiki/Special:Redirect/file/National%20Capitol%20Columns%20at%20the%20U.S.%20National%20Arboretum.jpg?width=1600", "https://commons.wikimedia.org/wiki/File:National_Capitol_Columns_at_the_U.S._National_Arboretum.jpg", "Finch Scout", "CC BY-SA 4.0"),
      photo("bonsai-museum", "https://commons.wikimedia.org/wiki/Special:Redirect/file/National%20Bonsai%20%26%20Penjing%20Museum%20%283502429490%29.jpg?width=1600", "https://commons.wikimedia.org/wiki/File:National_Bonsai_%26_Penjing_Museum_(3502429490).jpg", "Cliff from Arlington", "CC BY 2.0"),
      photo("azalea-garden", "https://commons.wikimedia.org/wiki/Special:Redirect/file/Azalea%20garden%20at%20the%20National%20Arboretum.jpg?width=1600", "https://commons.wikimedia.org/wiki/File:Azalea_garden_at_the_National_Arboretum.jpg", "Lea Shanley", "CC BY-SA 3.0"),
    ],
  },
];

parks[3].photos.push(
  commonsPhoto(
    "kenilworth-boardwalk-view",
    "Kenilworth Aquatic Gardens Washington DC 112703.jpg",
  ),
);
parks[5].photos.push(commonsPhoto("malcolm-x-park", "Malcolm X Park.jpg"));
parks[7].photos.push(
  commonsPhoto(
    "arboretum-koi-pond",
    "Koi pond at United States National Arboretum A - Stierch.jpg",
  ),
);

parks.push(
  {
    id: "launch-dc-washington-east-potomac-park-hains-point",
    name: "East Potomac Park & Hains Point",
    city: "Washington",
    state: "DC",
    citySlug: "washington-dc",
    assetCitySlug: "washington",
    region: "Mid-Atlantic",
    lat: 38.8688,
    lon: -77.0263,
    address: "972 Ohio Drive SW, Washington, DC 20024",
    source: eastPotomac,
    sourceLabel: "National Park Service",
    operator: "National Park Service",
    tier: "anchor",
    summary: "A Potomac peninsula with the Hains Point loop, waterfront lawns, playground and picnic areas, public golf, historic miniature golf, tennis, fishing access, and broad river views.",
    hours: "East Potomac Park closes to all traffic daily from 1 a.m.-5 a.m. Individual golf, miniature golf, tennis, picnic reservations, restrooms, and concessions follow separate schedules, and the Hains Point loop can close for flooding, snow, events, or safety.",
    cost: "General park, shoreline, playground, and loop access are free. Golf, miniature golf, tennis, reservations, parking, rentals, and concessions charge separately.",
    arrival: "Use Ohio Drive SW and navigate to the exact activity. Hains Point is at the peninsula's south end, while golf, miniature golf, tennis, and the main parking areas are farther north.",
    parking: "NPS lots A-C are along Ohio Drive and lot D serves the Buckeye Drive and tennis area. Metered parking is currently $2.30 per hour from 7 a.m.-8 p.m. daily except December 25, with pay-by-plate and posted three- or six-hour limits.",
    restrooms: "Restrooms are available at selected developed areas, including Hains Point and recreation facilities, but hours and outages vary. Identify the closest facility to the chosen activity before walking the loop.",
    accessibility: "Hains Point includes paved approaches, designated accessible parking, picnic space, and generally level waterfront routes. Facility entrances, older recreation areas, temporary flooding, and long distances still require destination-specific planning.",
    dogs: "Leashed pets are allowed in outdoor park areas under posted National Park Service rules. Keep pets off active golf and tennis areas, playground surfaces, and protected shoreline habitat, and remove waste.",
    family: "The playground, picnic grove, miniature golf, loop, and open lawns provide flexible family options. The peninsula is exposed to heat, storms, traffic, and water edges, so bring water and supervise closely.",
    transit: "L'Enfant Plaza and Waterfront Metro are the nearest practical rail approaches, followed by a substantial walk, bikeshare ride, or seasonal transit connection. Confirm the final route to the exact activity.",
    need: "Hains Point is low and flood-prone. Check NPS alerts, weather, Potomac water conditions, recreation-facility schedules, and loop-road status before traveling specifically for a shoreline circuit or reserved activity.",
    photos: [
      licensedCommonsPhoto("hains-point-playground", "East Potomac Park- Hains Point (176375dc-631a-4379-834f-d53dabe6cc9d).jpg", "NPS Photo", "Public domain"),
      licensedCommonsPhoto("east-potomac-mini-golf", "East Potomac Park- Mini Golf (35724ef5-d174-4a7b-94b0-452b651316c0).jpg", "NPS Photo", "Public domain"),
      licensedCommonsPhoto("hains-point-loop", "Hains Point Loop 0995 (5644163440).jpg", "National Park Service", "Public domain"),
      licensedCommonsPhoto("east-potomac-golf-clubhouse", "Clubhouse - East Potomac Golf Course - East Potomac Park - 2013-08-25.jpg", "Tim Evanson", "CC BY-SA 2.0"),
    ],
  },
  {
    id: "launch-va-arlington-gravelly-point",
    name: "Gravelly Point",
    city: "Arlington",
    state: "VA",
    citySlug: "arlington",
    assetCitySlug: "arlington",
    region: "Mid-Atlantic",
    lat: 38.8654,
    lon: -77.0386,
    address: "George Washington Memorial Parkway, Arlington, VA 22202",
    source: gravellyPoint,
    sourceLabel: "National Park Service",
    operator: "National Park Service",
    tier: "supporting",
    hoursSchedule: dailySchedule("06:00", "22:00"),
    summary: "A free Potomac riverfront lawn beside Reagan National Airport, known for exceptionally close plane spotting, skyline views, picnicking, trail access, restrooms, and a public boat ramp.",
    hours: "The Gravelly Point parking lot and boat ramp are open daily 6 a.m.-10 p.m. Closures can occur for parkway incidents, flooding, construction, security needs, or special operations.",
    cost: "Park, plane-spotting lawn, picnic area, trail, lot, and boat-ramp access are free. Commercial services and activities outside the park may charge.",
    arrival: "Vehicle access is only from the northbound George Washington Memorial Parkway. Southbound drivers must continue to a legal turnaround; do not stop or reverse on the parkway shoulder.",
    parking: "Use designated marked spaces only. The lot frequently fills during pleasant weekends and aviation events; weekday recreational parking is limited to six hours, and overnight parking is prohibited.",
    restrooms: "A public restroom serves Gravelly Point, but temporary closure or maintenance is possible. There is no staffed visitor center or dependable drinking-water service.",
    accessibility: "The main lawn, picnic area, and paved Mount Vernon Trail connection are relatively level, but grass, curb transitions, crowding, noise, and the boat-ramp edge vary.",
    dogs: "Pets must remain on a physical leash no longer than six feet. Remove waste, keep animals controlled around crowds and bicycles, and do not allow pets to enter the Potomac from parkway land.",
    family: "The dramatic aircraft views are memorable, but the sound is extremely loud and sudden. Bring hearing protection for young or noise-sensitive visitors and supervise children near the river, road, trail, and boat ramp.",
    transit: "There is no direct Metro entrance. The Mount Vernon Trail is the practical car-free route from nearby Arlington and Washington connections; plan the return before dark.",
    need: "Aircraft direction and closeness depend on wind and airport operations. Never use drones, lasers, kites, or objects that could interfere with aviation, and keep the Mount Vernon Trail clear while watching planes.",
    photos: [
      photo("gravelly-point-lawn", "https://home.nps.gov/common/uploads/cropped_image/primary/146FBE45-033D-E99A-D504405F2BEA7F16.jpg?width=1600&quality=90&mode=crop", gravellyPoint, "NPS / Claire Hassler", "Official federal photograph; source attribution retained"),
      licensedCommonsPhoto("gravelly-point-panorama", "360 panorama of Gravelly Point Arlington VA 2026-03-15 08-35-49 1.jpg", "G. Edward Johnson", "CC BY 4.0"),
      licensedCommonsPhoto("gravelly-point-landing", "Gravelly Point Park 34510.jpg", "Ted Eytan", "CC BY-SA 3.0"),
      licensedCommonsPhoto("gravelly-point-plane-watchers", "Gravelly Point airplane couple.png", "Greenmars", "CC BY-SA 3.0"),
    ],
  },
  {
    id: "launch-va-mclean-great-falls-park",
    name: "Great Falls Park",
    city: "McLean",
    state: "VA",
    citySlug: "mclean",
    assetCitySlug: "mclean",
    region: "Mid-Atlantic",
    lat: 38.9987,
    lon: -77.2539,
    address: "9200 Old Dominion Drive, McLean, VA 22102",
    source: greatFalls,
    sourceLabel: "National Park Service",
    operator: "National Park Service",
    tier: "anchor",
    summary: "A dramatic Potomac gorge park with three close waterfall overlooks, fifteen miles of trails, historic Patowmack Canal remains, picnic grounds, visitor services, and seasonal concessions.",
    hours: "The park is open daily from 7 a.m. until 30 minutes after sunset and is closed December 25. The Visitor Center is currently open 10 a.m.-5 p.m.; courtyard restrooms, portable toilets, snack bar, and programs use separate schedules.",
    cost: "A standard seven-day entrance pass currently costs $10-$20 depending on entry type, and the annual park pass is $35. The park is cashless; verify current NPS fees and pass acceptance before arriving.",
    arrival: "Navigate to the Virginia entrance at 9200 Old Dominion Drive, not the Maryland-side C&O Canal overlook. The three primary overlooks are a five- to ten-minute walk from the main parking and Visitor Center area.",
    parking: "Parking is inside the entrance station and routinely backs up on pleasant weekends, holidays, and high-water viewing days. Arrive near opening or choose a quieter weekday; never queue or park outside designated areas.",
    restrooms: "Courtyard bathrooms are currently open 8:30 a.m.-4 p.m. A separate restroom is out of order, with portable toilets available from 7 a.m. until dark; recheck the current facilities notice before leaving.",
    accessibility: "Routes near the Visitor Center, picnic area, and overlooks are mostly flat gravel. Overlooks 2 and 3 have ramped access; Overlook 1 requires negotiating rocky terrain and is not accessible to wheelchairs.",
    dogs: "Leashed pets are welcome on trails, in parking areas, at overlooks, and in picnic areas. Use a physical leash no longer than six feet; pets may not enter the river, Visitor Center, restrooms, or ranger programs except service animals.",
    family: "The overlooks are close to parking, but cliffs, fast water, and unprotected rocky edges demand constant supervision. Choose Overlooks 2 or 3 for the easiest family route and keep children beside an adult.",
    transit: "There is no practical direct public transit to the park entrance. Rideshare pickup can be unreliable because cellular service is limited, so arrange the return before arrival.",
    need: "Swimming, wading, and rock hopping are prohibited and deadly currents continue below apparently calm water. Cell service is limited; download the map, check flood and weather alerts, carry water, and wear closed-toe shoes.",
    photos: [
      licensedCommonsPhoto("great-falls-overlook-1", "Great Falls from Overlook 1.jpg", "Dontkickthebaby", "CC BY-SA 4.0"),
      licensedCommonsPhoto("great-falls-overlook-2", "2019-09-07 15 06 10 View north towards the Great Falls of the Potomac River from Overlook 2 about 250 feet downstream of the falls within Great Falls Park in Great Falls, Fairfax County, Virginia.jpg", "Famartin", "CC BY-SA 4.0"),
      licensedCommonsPhoto("great-falls-overlook-3", "2019-09-07 15 02 29 View north towards the Great Falls of the Potomac River from Overlook 3 about 500 feet downstream of the falls within Great Falls Park in Great Falls, Fairfax County, Virginia.jpg", "Famartin", "CC BY-SA 4.0"),
      licensedCommonsPhoto("great-falls-visitor-center", "GrearFallsVisitorCenter.JPG", "Jyothis", "CC BY-SA 3.0"),
    ],
  },
  {
    id: "launch-md-glen-echo-glen-echo-park",
    name: "Glen Echo Park",
    city: "Glen Echo",
    state: "MD",
    citySlug: "glen-echo",
    assetCitySlug: "glen-echo",
    region: "Mid-Atlantic",
    lat: 38.9669058,
    lon: -77.1394511,
    address: "7300 MacArthur Boulevard, Glen Echo, MD 20812",
    source: glenEcho,
    sourceLabel: "National Park Service",
    operator: "National Park Service and Glen Echo Park Partnership for Arts and Culture",
    tier: "anchor",
    hoursSchedule: splitDailySchedule([["00:00", "01:00"], ["06:00", "24:00"]]),
    summary: "A former amusement park transformed into a year-round public arts and culture campus, with a historic carousel, social dancing, theaters, studios, galleries, playground, picnic grove, civil-rights history, and family programs.",
    hours: "The outdoor grounds are open daily from 6 a.m. until 1 a.m. the next day. The carousel, dances, theaters, galleries, studios, aquarium, ranger station, and events keep separate schedules; the park is closed Thanksgiving and Christmas Day.",
    cost: "Grounds, main visitor parking, playground, picnic grove, and many ranger programs are free. Carousel rides, performances, classes, dances, aquarium admission, rentals, and special events may charge separately.",
    arrival: "Use 5801 Oxford Road for the free main visitor lot, then cross the Minnehaha Creek footbridge. The 7300 MacArthur Boulevard street address can route drivers toward the permit-only upper lot instead.",
    parking: "The main public lot off Oxford Road is free and includes lawn overflow unless posted otherwise. The upper MacArthur Boulevard lot is generally permit-only during the day; no overnight parking is allowed.",
    restrooms: "Accessible public restrooms are available in several park buildings. The red-brick Arcade building beside the carousel has year-round restrooms, including non-gendered and family facilities on its second floor.",
    accessibility: "Accessible spaces are available in the main and upper lots, and NPS describes the park as wheelchair- and walker-accessible from both. Historic buildings, slopes, older surfaces, crowds, and individual performances still need destination-specific planning.",
    dogs: "Leashed pets are allowed in outdoor park and picnic areas on a physical leash no longer than six feet. Buildings, performances, classes, crowded events, and partner attractions may restrict pets; service animals follow applicable access rules.",
    family: "The carousel, playground, shaded picnic grove, children's theaters, aquarium, studios, Junior Ranger activities, and open historic campus make this a strong family destination. Confirm the chosen attraction's ticket and schedule before promising it.",
    transit: "Montgomery County Ride On Route 29 connects from Bethesda or Friendship Heights to the Glen Echo stop. Confirm the current timetable and return trip because evening events often continue after daytime service patterns change.",
    need: "Treat the park as a campus, not one attraction. Grounds may be open while the carousel, theater, gallery, dance, aquarium, or ranger service is closed; check the exact partner calendar and weather before leaving.",
    photos: [
      photo("dentzel-carousel", "https://www.nps.gov/common/uploads/structured_data/3C848FDE-1DD8-B71B-0BE1393F7AFBC3D4.jpg", "https://www.nps.gov/glec/index.htm", "NPS / Bruce Douglas", "Official federal photograph; source attribution retained"),
      photo("bumper-car-pavilion", "https://www.nps.gov/common/uploads/structured_data/3C848E7B-1DD8-B71B-0BBAA0366FDA5B58.jpg", "https://www.nps.gov/glec/index.htm", "NPS / Bruce Douglas", "Official federal photograph; source attribution retained"),
      photo("picnic-grove", "https://www.nps.gov/common/uploads/structured_data/3C84917B-1DD8-B71B-0B9EAFE7DD8C3A13.jpg", "https://www.nps.gov/glec/index.htm", "NPS / Bruce Douglas", "Official federal photograph; source attribution retained"),
      licensedCommonsPhoto("spanish-ballroom", "Jive Aces at Glen Echo.jpg", "Sdkb", "CC BY-SA 4.0"),
    ],
  },
  {
    id: "launch-md-potomac-great-falls-tavern-olmsted-island",
    name: "Great Falls Tavern & Olmsted Island",
    city: "Potomac",
    state: "MD",
    citySlug: "potomac",
    assetCitySlug: "potomac",
    region: "Mid-Atlantic",
    lat: 39.0002043,
    lon: -77.2481581,
    address: "11710 MacArthur Boulevard, Potomac, MD 20854",
    source: greatFallsMaryland,
    sourceLabel: "National Park Service",
    operator: "National Park Service",
    tier: "anchor",
    summary: "The Maryland side of Great Falls combines a historic canal tavern and locks, an accessible Olmsted Island boardwalk to the falls, the C&O Canal towpath, strenuous Billy Goat Trail, seasonal launch-boat rides, ranger programs, and Potomac Gorge scenery.",
    hours: "Outdoor trails and the towpath are daylight destinations subject to river, flood, weather, and maintenance closures. Great Falls Tavern Visitor Center is currently open Wednesday-Sunday 9 a.m.-4 p.m. and closed Monday, Tuesday, Thanksgiving, Christmas Eve, Christmas Day, and New Year's Day.",
    cost: "The Great Falls Tavern area is the C&O Canal park's fee area. Current standard passes cost $10-$20 by entry type and the annual Great Falls pass is $35; the site is cashless. Seasonal launch-boat tickets are free but limited and first-come.",
    arrival: "Navigate to 11710 MacArthur Boulevard in Potomac for the Maryland entrance. Do not follow directions to 9200 Old Dominion Drive, which is the separate Virginia Great Falls Park entrance across the river.",
    parking: "Use the entrance-station parking at Great Falls Tavern. The lot fills on pleasant weekends and during high-water viewing; arrive near opening, and never park on MacArthur Boulevard or block emergency access.",
    restrooms: "Accessible restrooms, drinking water, maps, and ranger assistance are available at the Tavern visitor complex during posted facility hours. There are no trash cans along the overlook boardwalk or trails, so pack everything out.",
    accessibility: "Great Falls Tavern and its restrooms are wheelchair accessible, wheelchairs may be available, and the 0.25-mile Olmsted Island boardwalk is described as ADA accessible. Billy Goat Trail A is strenuous scrambling and is not an accessible route.",
    dogs: "Leashed pets are allowed on much of the towpath but are prohibited on Olmsted Island, the Great Falls boardwalk and overlook, Billy Goat Trail Section A, and inside park buildings. Carried pets do not bypass those restrictions.",
    family: "The Tavern, canal locks, towpath, Junior Ranger materials, and Olmsted overlook work well for many families. Billy Goat A requires rock scrambling beside cliffs and fast water and should only be chosen for capable, closely supervised hikers.",
    transit: "There is no practical direct public transit to the Great Falls Tavern entrance. Rideshare pickup and cellular service can be unreliable; arrange the return before arriving.",
    need: "Section A of Billy Goat Trail frequently closes when the Potomac rises. Check the current conditions page on the visit day, stay out of the river, remain on the Olmsted boardwalk, carry water, and download the official map before losing service.",
    photos: [
      photo("great-falls-tavern", "https://www.nps.gov/choh/planyourvisit/images/Great-Falls-Tavern-Wide.jpg", "https://www.nps.gov/choh/planyourvisit/greatfallstavernvisitorcenter.htm", "National Park Service", "Official federal photograph; source attribution retained"),
      photo("olmsted-overlook", "https://www.nps.gov/choh/planyourvisit/images/014_4.jpg", "https://home.nps.gov/choh/planyourvisit/great-falls-overlook.htm", "National Park Service", "Official federal photograph; source attribution retained"),
      photo("great-falls-launch-boat", "https://www.nps.gov/choh/planyourvisit/images/Launch-Boat-plain.jpg", "https://www.nps.gov/choh/planyourvisit/great-falls-canal-boat-rides.htm", "National Park Service", "Official federal photograph; source attribution retained"),
      licensedCommonsPhoto("billy-goat-trail-a", "Billy Goat Trail Cliff (from above).jpg", "GeneralPoxter", "CC BY-SA 4.0"),
    ],
  },
  {
    id: "launch-va-alexandria-huntley-meadows-park",
    name: "Huntley Meadows Park",
    city: "Alexandria",
    state: "VA",
    citySlug: "alexandria",
    assetCitySlug: "alexandria",
    region: "Mid-Atlantic",
    lat: 38.7525834,
    lon: -77.1075177,
    address: "3701 Lockheed Boulevard, Alexandria, VA 22306",
    source: huntleyMeadows,
    sourceLabel: "Fairfax County Park Authority",
    operator: "Fairfax County Park Authority",
    tier: "anchor",
    summary: "A 1,500-acre wildlife sanctuary of forest, meadow, and restored wetland, centered on a half-mile raised boardwalk, observation platform, naturalist-led programs, visitor center, and a separate paved hike-bike entrance.",
    hours: "Trails and natural areas are daylight destinations. The Norma Hoffman Visitor Center currently opens 9 a.m.-5 p.m. on weekdays except Tuesday; weekend hours are seasonal, including 9 a.m.-1 p.m. through August 30 and noon-5 p.m. during spring and fall periods. Check holidays and current alerts.",
    cost: "Individual and family admission is free. Organized groups of 12-60 currently pay $30, with $1 for each additional person over 60; programs, shelters, commercial photography, rentals, and special activities may charge separately.",
    arrival: "Use 3701 Lockheed Boulevard for the main parking lot, Visitor Center, restrooms, Cedar Trail, wetland boardwalk, and naturalist help. The separate 6901 South Kings Highway entrance serves a one-mile paved hike-bike trail but has no facilities.",
    parking: "The main Lockheed Boulevard lot is the correct choice for the boardwalk and Visitor Center. A small lot at 6901 South Kings Highway serves only the hike-bike trail; do not expect it to provide a short boardwalk approach.",
    restrooms: "Restrooms, exhibits, and staff assistance are available at the main Visitor Center during its operating hours. There are no facilities at the South Kings Highway entrance or on the wetland boardwalk.",
    accessibility: "Fairfax County lists a measured accessible stonedust route from accessible parking toward the boardwalk. The boardwalk is narrow, wetland conditions vary, and visitors needing a specific accommodation should contact the park in advance.",
    dogs: "Pets are prohibited on the Restoration and Heron Trails, including the wetland boardwalk. Leashed pets are allowed on other designated park trails, including the separate South Kings Highway hike-bike route.",
    family: "The Visitor Center, short forest approach, wildlife, boardwalk, frogs, beavers, dragonflies, deer, and more than 200 recorded bird species make this a strong quiet-nature outing. Children must walk rather than run on the narrow boardwalk.",
    transit: "Local bus service reaches parts of the surrounding Lockheed Boulevard and South Kings Highway area, but the final walk and return schedule vary. Map the exact entrance rather than navigating to the preserve's geographic center.",
    need: "This is a wildlife sanctuary, not an active-recreation park. Walk slowly, stay on marked routes, do not run or jog on the boardwalk, do not fish or use nets, keep wheels at the main entrance, and carry out everything brought in.",
    photos: [
      licensedCommonsPhoto("huntley-visitor-center", "Visitor Center, Huntley Meadows Park.jpg", "Ser Amantio di Nicolao", "CC BY-SA 4.0"),
      licensedCommonsPhoto("heron-trail-boardwalk", "Sunny boardwalk, Huntley Meadows Park.jpg", "Ser Amantio di Nicolao", "CC BY-SA 4.0"),
      licensedCommonsPhoto("huntley-wetland", "Wetlands from boardwalk, Huntley Meadows Park.jpg", "Ser Amantio di Nicolao", "CC BY-SA 4.0"),
      licensedCommonsPhoto("wetland-viewing-area", "Boardwalk through viewing area, Huntley Meadows Park.jpg", "Ser Amantio di Nicolao", "CC BY-SA 4.0"),
    ],
  },
);

parks.push(
  {
    id: "launch-md-bethesda-cabin-john-regional-park",
    name: "Cabin John Regional Park",
    city: "Bethesda",
    state: "MD",
    citySlug: "bethesda",
    assetCitySlug: "bethesda",
    region: "Mid-Atlantic",
    lat: 39.0311522,
    lon: -77.1526596,
    address: "7400 Tuckerman Lane, Bethesda, MD 20817",
    source: "https://montgomeryparks.org/parks-and-trails/cabin-john-regional-park/",
    sourceLabel: "Montgomery Parks",
    operator: "Montgomery Parks",
    tier: "anchor",
    summary: "A large family and recreation park with a miniature train, Adventure Playground, indoor ice rink, dog park, picnic shelters, athletic fields, tennis, camping, nature programs, and more than six miles of hard- and natural-surface trails.",
    hours: "Outdoor park areas are open daily from sunrise to sunset, while lighted courts close at 11 p.m. The miniature train, ice rink, nature center, tennis center, campground, shelters, and scheduled programs keep separate hours.",
    cost: "General park, playground, trail, dog-park, and unreserved picnic access are free. The miniature train is $4 per rider in the 2026 regular season, with children under two free with a paying adult; skating, rentals, camping, permits, and reservations charge separately.",
    arrival: "Use the destination-specific address rather than the general park pin. The train is at 7410 Tuckerman Lane, while the ice rink and several athletic facilities are reached from Westlake Drive.",
    parking: "Free parking is distributed among separate facility lots. The Westlake Drive lot near the dog park and Power Line Trail North trailhead is under phased renovation through summer 2026, with part of the lot remaining open and traffic patterns subject to change.",
    restrooms: "Restrooms are available at developed park facilities, but access follows each building or seasonal area's schedule. Identify the closest open facility to the train, rink, playground, shelter, or trailhead before starting a longer visit.",
    accessibility: "Developed facilities include accessible parking and routes, and Montgomery Parks accepts accommodation requests through its Program Access office. Trail surfaces, grades, older picnic areas, and the active Westlake lot project require destination-specific planning.",
    dogs: "Dogs must remain leashed outside the fenced dog park. The dog park is free from sunrise to sunset, separates dogs at 20 pounds or less from larger dogs, and requires current legally required vaccinations.",
    family: "The train, Adventure Playground, picnic shelters, paved paths, and ice rink make this a strong all-day family park, but the ticketed attractions are not continuously open. Check the exact facility before promising a ride or skate.",
    transit: "Ride On routes 42 and 47 stop on Democracy Boulevard near the tennis center and Locust Grove Nature Center. Other destinations may require a substantial internal walk, so map the final facility rather than relying on the park address alone.",
    need: "The park works as several activity zones, not one compact stop. Check the train's weather status, rink session calendar, current construction and event notices, and the correct parking entrance before leaving.",
    photos: [
      licensedCommonsPhoto("cabin-john-woodland", "Cabin John Regional Park (1).jpg", "Fuzheado", "CC BY-SA 3.0"),
      licensedCommonsPhoto("cabin-john-train-station", "Cabin-john-park-md-porky.jpg", "Fuzheado", "CC BY-SA 4.0"),
      licensedCommonsPhoto("cabin-john-picnic-shelter", "Picnic pavilion Cabin John Park md 2020-11-23 09-11-53 1.jpg", "G. Edward Johnson", "CC BY 4.0"),
      licensedCommonsPhoto("cabin-john-ice-rink", "2022-0502-icerink-wide-square.jpg", "Fuzheado", "CC BY-SA 4.0"),
      licensedCommonsPhoto("cabin-john-hippo-fountain", "Hippo water fountain Cabin John Park MD 2020-11-23 09-09-50 1.jpg", "G. Edward Johnson", "CC BY 4.0"),
    ],
  },
  {
    id: "launch-md-rockville-rock-creek-regional-park",
    name: "Rock Creek Regional Park",
    city: "Rockville",
    state: "MD",
    citySlug: "rockville",
    assetCitySlug: "rockville",
    region: "Mid-Atlantic",
    lat: 39.1171446,
    lon: -77.1278556,
    address: "15700 Needwood Lake Circle, Rockville, MD 20855",
    source: "https://montgomeryparks.org/parks-and-trails/rock-creek-regional-park/",
    sourceLabel: "Montgomery Parks",
    operator: "Montgomery Parks",
    tier: "anchor",
    summary: "An approximately 1,800-acre regional park centered on 75-acre Lake Needwood and 55-acre Lake Frank, with boating, fishing, playgrounds, picnic shelters, an archery range, Meadowside trails, and thirteen miles of park trails.",
    hours: "Outdoor park areas are open daily from sunrise to sunset. The Lake Needwood boathouse, Meadowside programs, golf, Go Ape, shelters, and other facilities use separate seasonal or reservation-based schedules.",
    cost: "General park and trail access are free. Lake Needwood rentals currently cost $15 per hour for kayaks, canoes, and rowboats, $12 per half hour for pedal boats, or $55 for a full day except pedal boats; tours, permits, golf, concessions, and partner activities charge separately.",
    arrival: "Choose Lake Needwood, Lake Frank, Meadowside Nature Center trails, a picnic area, or another named entrance before navigating. The official park explicitly warns that its multiple entrances do not connect visitors directly to every activity.",
    parking: "Parking is distributed among Lake Needwood, Meadowside, picnic, golf, and trail access areas. Use 15700 Needwood Lake Circle for boating and 5100 Meadowside Lane for the Meadowside trail complex; events and good-weather weekends can fill the closest lots.",
    restrooms: "Facilities are concentrated at developed recreation areas and may be seasonal. Meadowside's building and restrooms are currently closed for renovation, so do not begin that trail visit expecting indoor services.",
    accessibility: "Lake Needwood has an accessible dock and launch system, and the Needwood Queen can accommodate wheelchair users. The wider park includes asphalt hiker-biker trail, natural-surface lake trails, grades, roots, and long distances between entrances.",
    dogs: "Dogs must remain leashed throughout the park. Lake Needwood welcomes dogs aboard rental boats, but owners must follow staff directions, boating rules, and any facility-specific restrictions.",
    family: "Boating, playgrounds, lakeside walks, wildlife, picnic shelters, and short Meadowside routes offer varied family options. Match the activity to the season, weather, swimming prohibition, and availability of restrooms.",
    transit: "Transit usefulness depends on the selected entrance and a potentially long final walk. Confirm the exact destination and return route before relying on transit for Lake Needwood or Meadowside.",
    need: "Swimming is prohibited in park lakes. Alcohol is prohibited, dogs must be leashed, buses need weekday permits and are not allowed on weekends, and boating depends on season, weather, permits, life jackets, and same-day operational conditions.",
    photos: [
      licensedCommonsPhoto("lake-needwood-autumn", "Lake Needwood (52451911526).jpg", "John Brighenti", "CC BY 2.0"),
      licensedCommonsPhoto("lake-needwood-trail", "Colorful Trail Along the Lake (52442554654).jpg", "John Brighenti", "CC BY 2.0"),
      licensedCommonsPhoto("meadowside-creek", "Meadowside Nature Center (50526799517).jpg", "John Brighenti", "CC BY 2.0"),
      licensedCommonsPhoto("rock-creek-footbridge", "Footbridge (52022927801).jpg", "John Brighenti", "CC BY 2.0"),
      licensedCommonsPhoto("meadowside-woods", "Meadowside Nature Center (50525914983).jpg", "John Brighenti", "CC BY 2.0"),
    ],
  },
  {
    id: "launch-va-fairfax-station-burke-lake-park",
    name: "Burke Lake Park",
    city: "Fairfax Station",
    state: "VA",
    citySlug: "fairfax-station",
    assetCitySlug: "fairfax-station",
    region: "Mid-Atlantic",
    lat: 38.7624787,
    lon: -77.2919171,
    address: "7315 Ox Road, Fairfax Station, VA 22039",
    source: "https://www.fairfaxcounty.gov/parks/burkelakepark/",
    sourceLabel: "Fairfax County Park Authority",
    operator: "Fairfax County Park Authority",
    tier: "anchor",
    summary: "An 888-acre park around a 218-acre fishing lake, with a 4.7-mile lake trail, marina, miniature railroad, carousel, playgrounds, mini golf, disc golf, picnic areas, campground, ice cream parlor, and seasonal tour boat.",
    hours: "Park grounds are open daily from sunrise to sunset. In 2026 the railroad, carousel, marina, mini golf, office, campground, store, and food service each follow detailed seasonal schedules and may close for weather, holidays, maintenance, or special events.",
    cost: "Fairfax County residents enter free. From April through late October, non-county residents pay on weekends and holidays only: currently $12 per passenger vehicle or van, $6 per motorcycle, and $40 per bus. Rides, boating, golf, camping, reservations, and concessions charge separately.",
    arrival: "The park entrance is the second Ox Road turn when traveling south and comes before the golf center when traveling north. Once inside, follow the official map to the marina, train and carousel, picnic zones, campground, or lake trail rather than stopping at the first lot.",
    parking: "Large activity-specific lots are distributed inside the entrance. The marina and railroad have separate parking areas, while the dam and 24-hour state boat launch use a separate approach outside the main family recreation core.",
    restrooms: "Year-round permanent restrooms serve the ice cream parlor and Shelter A/B areas, while other mapped restrooms are seasonal. The official picnic map identifies facilities near the marina, train and carousel, playgrounds, and shelter zones.",
    accessibility: "The park provides accessible developed facilities, and the mini golf course is wheelchair accessible. The long lake loop includes changing surfaces and grades; contact the Park Authority for a specific accommodation or current route condition.",
    dogs: "Leashed dogs can use park grounds and trails under Fairfax County rules, but pets are not permitted on rental boats or the tour boat. Keep dogs away from playgrounds, active rides, wildlife, and fishing activity.",
    family: "The train, carousel, playgrounds, ice cream, marina, picnic areas, mini golf, and short lakeside walks can fill a family day. Check the individual attraction schedule before promising a ride or rental, especially outside summer.",
    transit: "This is primarily a vehicle-oriented destination with no dependable direct rail connection to the park entrance. Arrange the return before arrival if using rideshare, and navigate to the exact internal facility.",
    need: "Swimming and windsurfing are prohibited. Gas motors and sailboats are prohibited, recreational kayaks are restricted unless used for fishing, attraction schedules are seasonal, and weekend entrance lines can build during good weather.",
    photos: [
      licensedCommonsPhoto("burke-lake-marina", "Burke Lake Park (14181898648).jpg", "Paulo Ordoveza", "CC BY 2.0"),
      licensedCommonsPhoto("burke-lake-railroad", "Burke Lake Park Railroad (14182084667).jpg", "Paulo Ordoveza", "CC BY 2.0"),
      licensedCommonsPhoto("burke-lake-dam", "Burke Lake Park- Dam (14368535995).jpg", "Paulo Ordoveza", "CC BY 2.0"),
      licensedCommonsPhoto("burke-lake-shore", "Burke Lake Park (14181904698).jpg", "Paulo Ordoveza", "CC BY 2.0"),
      licensedCommonsPhoto("burke-lake-evening", "Burke lake, Fairfax Virginia, May 2025.jpg", "1879515Starwars1", "CC0"),
    ],
  },
);

const cabinJohnPark = parks.find((park) => park.id === "launch-md-bethesda-cabin-john-regional-park");
const rockCreekRegionalPark = parks.find((park) => park.id === "launch-md-rockville-rock-creek-regional-park");
const burkeLakePark = parks.find((park) => park.id === "launch-va-fairfax-station-burke-lake-park");

const featureRows = [
  [parks[0].id,"lincoln-memorial","Lincoln Memorial","memorial",38.8893,-77.0502,"https://www.nps.gov/linc/index.htm","lincoln-memorial","The columned memorial and seated Lincoln overlook the Reflecting Pool from the Mall's west end.","Use 23rd Street NW and the memorial circle area; accessible approaches avoid the monumental stairs.","Restrooms and visitor services are near the memorial but use separate operating schedules.","The chamber and surrounding plaza are free and normally open 24 hours; crowding and ceremonies can change access."],
  [parks[0].id,"washington-monument","Washington Monument","monument",38.8895,-77.0353,"https://www.nps.gov/wamo/index.htm","washington-monument","The 555-foot obelisk anchors the Mall and offers timed elevator access to an observation level.","Use the Monument Lodge and screening entrance on the east side; a reservation is not the same as parking.","Restrooms are available near the Monument Lodge during posted hours.","The grounds are free and open continuously, but interior entry needs a timed ticket and security screening; elevator closures can occur."],
  [parks[0].id,"world-war-ii-memorial","World War II Memorial","memorial",38.8894,-77.0405,"https://www.nps.gov/wwii/index.htm","wwii-memorial","A ceremonial plaza of state pillars, fountains, and inscriptions between the Washington Monument and Lincoln Memorial.","Approach from 17th Street or the Reflecting Pool paths; accessible routes enter the lowered plaza without using stairs.","Use nearby Mall restrooms shown on the official NPS map; there is no large visitor building inside the memorial.","The memorial is free and open 24 hours. Do not enter the Rainbow Pool; ceremonies can restrict parts of the plaza."],
  [parks[0].id,"martin-luther-king-jr-memorial","Martin Luther King, Jr. Memorial","memorial",38.8862,-77.0442,"https://www.nps.gov/mlkm/index.htm","mlk-memorial","The Stone of Hope and inscription walls form a contemplative Tidal Basin memorial near the Roosevelt Memorial.","Use West Basin Drive or the Tidal Basin paths; parking is limited and cherry-blossom season radically increases crowding.","Public restrooms are nearby along West Basin Drive but hours and closures vary.","The outdoor memorial is free and open 24 hours. The route is exposed, and events or high water can affect the basin paths."],
  [parks[0].id,"thomas-jefferson-memorial","Thomas Jefferson Memorial","memorial",38.8814,-77.0365,"https://www.nps.gov/thje/index.htm","jefferson-memorial","The domed memorial stands on the south Tidal Basin with chamber exhibits and prominent water views.","Use East Basin or Ohio Drive approaches and expect a longer walk from most Metro stations; accessible entry avoids the broad front stair.","Restrooms and visitor services are available at the memorial during posted facility hours.","The grounds are free and open 24 hours; interior services and exhibits use shorter hours, and Tidal Basin construction can alter routes."],
  [parks[0].id,"vietnam-veterans-memorial","Vietnam Veterans Memorial","memorial",38.8913,-77.0477,"https://www.nps.gov/vive/index.htm","vietnam-veterans-memorial","The Wall, Three Servicemen, Vietnam Women's Memorial, and In Memory plaque form a quiet memorial landscape north of the Reflecting Pool.","Approach from Constitution Avenue near 21st or 22nd Street; the Wall's gently descending path is accessible.","Use nearby Lincoln Memorial-area restrooms and visitor services rather than expecting a facility at the Wall.","The memorial is free and open 24 hours. Use the name directories or NPS assistance when locating a specific person on the Wall."],
  [parks[1].id,"rock-creek-nature-center-and-planetarium","Rock Creek Nature Center & Planetarium","visitor_center",38.9587,-77.0518,"https://www.nps.gov/rocr/planyourvisit/visitorcenters.htm","nature-center","The park's primary orientation point offers exhibits, maps, ranger help, children's discovery activities, and free scheduled planetarium programs.","Navigate to 5200 Glover Road NW and use the signed Nature Center lot; this is not the same entrance as Peirce Mill.","Accessible restrooms and drinking water are available during building hours.","The Nature Center is generally open Wednesday-Sunday 9 a.m.-5 p.m. Planetarium programs have limited capacity and may require same-day registration."],
  [parks[1].id,"peirce-mill","Peirce Mill","historic_site",38.9400,-77.0523,"https://www.nps.gov/rocr/learn/historyculture/peirce-mill.htm","peirce-mill","A restored 1820s water-powered gristmill and historic landscape beside Rock Creek and the multi-use trail.","Navigate to 2401 Tilden Street NW and use designated nearby parking or the paved trail.","Seasonal public facilities are available nearby; confirm building and restroom status before a timed visit.","Mill hours are seasonal and staffing-dependent, generally weekend-focused outside summer. Grounds remain accessible during broader park daylight hours."],
  [parks[1].id,"boulder-bridge","Boulder Bridge","bridge",38.9548,-77.0470,"https://www.nps.gov/places/000/boulder-bridge.htm","boulder-bridge","A rustic stone bridge built in 1902, reached by wooded hiking routes in the park's northern trail network.","Use the official trail map and begin at a signed trailhead near the Nature Center or Beach Drive; there is no parking at the bridge.","There are no restrooms at Boulder Bridge. Use Nature Center facilities before hiking.","The route includes natural surfaces, roots, rocks, grades, and possible mud. It is a trail destination, not a roadside photo stop."],
  [parks[2].id,"anacostia-skating-pavilion","Anacostia Skating Pavilion","skating",38.8690,-76.9714,"https://www.nps.gov/anac/planyourvisit/roller-skating.htm","skating-pavilion","A covered outdoor roller rink offering year-round free skating space and seasonal free skate loans.","Navigate to 1500 Anacostia Drive SE and park in the designated recreation-area lot.","Restrooms and water are available in the developed pavilion area during posted operating conditions.","The pavilion is open daily 6 a.m.-10 p.m. Seasonal free rentals require government ID and socks; bring a helmet and check the current booth schedule."],
  [parks[2].id,"anacostia-river-trail","Anacostia River Trail","trail",38.8785,-76.9680,"https://www.nps.gov/anac/planyourvisit/bicycling.htm","river-trail","A paved walking and cycling route linking Anacostia Park with riverfront neighborhoods, bridges, recreation sites, and the regional trail network.","Choose a named trail access and turnaround point before starting; the route continues well beyond the park's recreation core.","Restrooms are available only at selected developed parks and facilities along the corridor.","The trail is free and generally follows park hours. Expect sun, bridge approaches, faster bicycles, construction detours, and long distances between services."],
  [parks[3].id,"lotus-and-water-lily-ponds","Lotus & Water Lily Ponds","garden",38.9134,-76.9428,"https://www.nps.gov/keaq/learn/nature/aquatic-plants.htm","lotus-pond","A grid of historic cultivated ponds filled seasonally with lotus, hardy and tropical water lilies, wildlife, and changing bloom displays.","Enter through the main garden gate, stop at the Visitor Center, and follow the pond paths; early morning offers the best flowers and cooler conditions.","Use Visitor Center restrooms before entering the pond network.","The ponds are free during garden hours. Paths are gravel, dirt, and grass; keep children behind edges and never enter or pick from the ponds."],
  [parks[3].id,"tidal-marsh-boardwalk","Tidal Marsh Boardwalk","boardwalk",38.9117,-76.9445,"https://www.nps.gov/keaq/planyourvisit/things2do.htm","ponds-in-fall","A short wood boardwalk extends into the restored tidal marsh for birding, wetland views, and a landscape distinct from the cultivated ponds.","Follow signs beyond the ponds toward the marsh and Anacostia River Trail connection; photograph the map before leaving the Visitor Center.","There are no restrooms on the boardwalk. Use the Visitor Center first.","The boardwalk is free during garden hours. Wood can be slick, insects and sun are seasonal, and high water or maintenance can affect access."],
  [parks[4].id,"theodore-roosevelt-memorial-plaza","Theodore Roosevelt Memorial Plaza","memorial",38.8977,-77.0630,"https://www.nps.gov/places/theodore-roosevelt-memorial.htm","memorial-plaza","A monumental forest clearing with a 17-foot Roosevelt statue, monoliths, fountains, quotations, and seating.","Cross the island footbridge and follow the main route roughly one-quarter mile uphill; ramps provide plaza entry.","The closest restroom is about one-third mile away on the south end of Woods Trail.","The memorial is free during island hours. The approach includes gravel and grades up to roughly 12 percent; fountains may be seasonal or under maintenance."],
  [parks[4].id,"swamp-trail-and-boardwalk","Swamp Trail & Boardwalk","trail",38.8965,-77.0645,"https://www.nps.gov/this/planyourvisit/hiking-trails.htm","swamp-boardwalk","A roughly 1.5-mile island loop through swamp, marsh, and forest, including a low wood boardwalk near tidal water.","Begin just beyond the footbridge and follow Swamp Trail signs; keep a map because intersecting Woods and Upland trails change the distance.","Use the south-end comfort station; there are no facilities on most of the loop.","Natural surfaces, mud, roots, flooding, and an unrailed boardwalk make this route condition-sensitive. Bikes are not allowed on the island."],
  [parks[5].id,"cascading-fountain","Cascading Fountain","fountain",38.9198,-77.0360,"https://home.nps.gov/places/000/cascading-fountain.htm","cascading-fountain","The park's restored thirteen-basin Italianate cascade descends through the lower terraces toward the reflecting pool.","Enter the lower park near 16th Street and Florida Avenue for the easiest direct approach; upper-park entry requires descending terraces.","There is no dependable restroom at the fountain.","Viewing is free during park hours. Swimming and wading are prohibited, and testing, maintenance, weather, or restoration work can stop the water or restrict access."],
  [parks[5].id,"noyes-armillary-sphere","Noyes Armillary Sphere","public_art",38.9220,-77.0364,"https://home.nps.gov/places/000/noyes-armillary-sphere.htm","armillary-sphere","A bronze celestial sculpture on the upper terrace, installed as a memorial to poet and diplomat Theodore Roosevelt-era figure Frank B. Noyes.","Use an upper 16th Street entrance and follow terrace paths; stairs and slopes separate it from the lower cascade.","There is no dependable restroom beside the sculpture.","The outdoor sculpture is free during park hours. Keep off the artwork and check restoration-area fencing before a sculpture-focused visit."],
  [parks[5].id,"joan-of-arc-statue","Joan of Arc Statue","public_art",38.9224,-77.0361,"https://home.nps.gov/places/000/joan-of-arc-statue.htm","joan-of-arc","An equestrian bronze Joan of Arc crowns a pedestal in the upper park and is the only equestrian statue of a woman in Washington's public collection.","Enter from 16th Street near the upper lawn, then follow the terrace paths to the statue.","There is no dependable restroom at the statue.","The sculpture is free to view during park hours. Do not climb the pedestal and respect any temporary conservation barriers."],
  [parks[6].id,"georgetown-waterfront-fountain","Georgetown Waterfront Fountain","splash_pad",38.9022,-77.0605,"https://www.nps.gov/thingstodo/georgetown-waterfront-park.htm","fountain-play","A broad seasonal interactive fountain where children and adults may cool off beside the Potomac promenade.","Use Wisconsin Avenue and K Street and walk west toward the central paved plaza; do not confuse it with a decorative private fountain.","There is no dependable park restroom, so identify a nearby facility before changing wet children.","Fountain play is free when operating. Bring water shoes and dry clothes, and check for seasonal shutdown, maintenance, weather, or water-quality closures."],
  [parks[6].id,"georgetown-waterfront-labyrinth","Georgetown Waterfront Labyrinth","landmark",38.9033,-77.0662,"https://www.nps.gov/places/georgetown-waterfront-park.htm","waterfront","A stone walking labyrinth and quiet river-view space near the park's western end below Key Bridge.","Walk west along the paved promenade toward Key Bridge; it is farther from Wisconsin Avenue than the fountain plaza.","There is no dedicated restroom at the labyrinth.","The labyrinth is free during park hours. It is a contemplative walking feature, so keep bikes and active games outside the pattern."],
  [parks[6].id,"river-steps-and-pergola","River Steps & Pergola","overlook",38.9023,-77.0627,"https://www.nps.gov/places/georgetown-waterfront-park.htm","potomac-kayaking","Broad Potomac-facing steps, overlooks, and shaded structures create a central place for views, lunch, and watching river activity.","Approach from the central promenade between Wisconsin Avenue and Key Bridge; the paved route is step-free even though the seating feature uses steps.","There is no dependable public restroom in the park.","Access is free. Steps can be hot, wet, or crowded, and the river edge is not a swimming area; supervise children closely."],
  [parks[7].id,"national-capitol-columns","National Capitol Columns","landmark",38.9133,-76.9713,"https://usna.usda.gov/discover/gardens-collections/national-capitol-columns/","national-capitol-columns","Twenty-two sandstone Corinthian columns from the U.S. Capitol stand on an open knoll above a reflecting pool and broad lawn.","Enter through R Street and follow Arboretum signs to the Columns parking area; the collection is far from the main entrance on foot.","Use restrooms near Arbor House or the Administration Building before driving or walking to the Columns.","The outdoor collection is free during Arboretum hours. The lawn and reflecting-pool edge vary by weather; events and photography permits can affect use."],
  [parks[7].id,"national-bonsai-and-penjing-museum","National Bonsai & Penjing Museum","museum",38.9104,-76.9688,"https://www.bonsai-nbf.org/museum","bonsai-museum","A free living museum of Japanese, Chinese, and North American bonsai and penjing displayed in outdoor pavilions and rotating exhibits.","Follow signs from the R Street entrance toward the National Bonsai & Penjing Museum and nearby Administration Building area.","Visitor restrooms are available in the developed museum and administration area during operating hours.","The museum is generally open 10 a.m.-4 p.m. and closes on federal holidays in winter. Entry is free; quiet viewing and protection of the living collection are essential."],
  [parks[7].id,"azalea-collections","Azalea Collections","garden",38.9120,-76.9745,"https://usna.usda.gov/discover/gardens-collections/azaleas/","azalea-garden","Hillside collections around Mount Hamilton create one of Washington's major spring azalea displays, with woodland paths and broad seasonal color.","Use the official map and park near a signed azalea access; the collection covers slopes and is not one compact flower bed.","There are no dependable restrooms within the hillside collection. Use developed visitor facilities first.","Access is free during Arboretum hours. Peak bloom varies by cultivar and weather; expect hills, natural paths, crowds, and uneven footing."],
];

featureRows.push(
  [parks[0].id,"korean-war-veterans-memorial","Korean War Veterans Memorial","memorial",38.8878,-77.0478,"https://www.nps.gov/kowa/index.htm","vietnam-veterans-memorial","A field of stainless-steel service-member statues, granite wall, Pool of Remembrance, and commemorative landscape southeast of the Lincoln Memorial.","Approach from Independence Avenue or the Reflecting Pool's south path; the memorial is close to Lincoln but not visible from every approach.","Use Lincoln Memorial-area visitor facilities and restrooms; there is no large building inside the memorial.","The memorial is free and open 24 hours. Use a respectful voice, keep memorial elements clear, and expect ceremonies or security activity to affect circulation."],
  [parks[0].id,"franklin-delano-roosevelt-memorial","Franklin Delano Roosevelt Memorial","memorial",38.8836,-77.0434,"https://www.nps.gov/frde/index.htm","mlk-memorial","Four outdoor rooms use sculpture, water, quotations, and landscape to interpret Franklin and Eleanor Roosevelt and the four presidential terms.","Use West Basin Drive or the Tidal Basin path between the MLK and Jefferson memorials; accessible entrances avoid unnecessary stairs.","Public restrooms and visitor services are available near the memorial during posted facility hours.","The grounds are free and open 24 hours. Water features may be seasonal, and Tidal Basin construction, high water, ceremonies, or crowds can change the route."],

  [parks[1].id,"rock-creek-horse-center","Rock Creek Horse Center","equestrian",38.9563,-77.0546,"https://rockcreekhorsecenter.com/","nature-center","A separately operated public stable offering trail rides, lessons, camps, and equestrian programs within Rock Creek Park.","Use 5100 Glover Road NW and the Horse Center entrance rather than the nearby Nature Center lot.","Stable visitor facilities follow Horse Center operating hours and program access.","Walking nearby is free, but riding and programs require reservations, eligibility, payment, waivers, and appropriate clothing. Horses have right of way on shared routes."],
  [parks[1].id,"old-stone-house","Old Stone House","historic_site",38.9048,-77.0605,"https://www.nps.gov/places/old-stone-house.htm","peirce-mill","Washington's oldest structure on its original foundation preserves an eighteenth-century house and small garden in Georgetown.","Use 3051 M Street NW; the entrance is on a busy commercial block and is far from Rock Creek Nature Center.","Building restroom availability is limited; plan around an open Georgetown public facility.","Garden access is generally free, while interior hours and room access depend on staffing, preservation work, and current NPS notices."],
  [parks[1].id,"dumbarton-oaks-park","Dumbarton Oaks Park","trail",38.9165,-77.0645,"https://www.nps.gov/places/dumbarton-oaks-park.htm","rock-creek-autumn","A naturalistic stream valley and woodland path designed as part of the historic Dumbarton Oaks landscape, now managed as public parkland.","Enter from Lovers' Lane near R Street or from the Rock Creek trail network; do not confuse the free park with the separately operated paid garden.","There are no dependable restrooms in the natural park. Use facilities before entering the valley.","The park is free during daylight hours. Expect mud, roots, stream crossings, erosion work, and steep connectors; the adjacent Dumbarton Oaks Garden has separate admission."],
  [parks[1].id,"fort-derussy","Fort DeRussy","historic_site",38.9618,-77.0437,"https://www.nps.gov/places/fort-derussy.htm","boulder-bridge","Earthwork remains of a Civil War fort survive in the forest east of Oregon Avenue and are reached by natural-surface trails.","Use the official Rock Creek map and a signed trailhead near Military Road or Oregon Avenue; there is no visitor lot at the fort itself.","No restrooms or water are available at the earthworks.","Free during park daylight hours. The site is unstaffed, uneven, wooded, and easy to miss; stay on paths and do not climb or disturb historic earthworks."],
  [parks[1].id,"western-ridge-trail","Western Ridge Trail","trail",38.9480,-77.0535,"https://www.nps.gov/rocr/planyourvisit/hiking-trails.htm","boulder-bridge","A long north-south hiking route through upland forest linking major park roads, picnic areas, the Nature Center vicinity, and other trails.","Choose a signed trailhead and turnaround from the official map; this is not a single short loop and road crossings divide the route.","Restrooms are available only at selected developed areas, not continuously along the trail.","Free during daylight hours. Carry water and a map, expect hills, roots, mud, ticks, and road crossings, and finish before sunset."],

  [parks[2].id,"pirate-ship-playground","Anacostia Park Pirate Ship Playground","playground",38.8730,-76.9696,"https://www.nps.gov/anac/planyourvisit/things2do.htm","basketball","A large themed playground near the recreation core gives children climbing, sliding, and imaginative play beside lawns and the river trail.","Use Anacostia Drive and the recreation-area parking closest to the playground rather than the general park center.","Use nearby developed recreation-area restrooms when open.","Play is free during park hours. Surfaces can become hot or wet, shade varies, and children need supervision around parking, bicycles, and the nearby riverfront."],
  [parks[2].id,"anacostia-park-boat-ramp","Anacostia Park Boat Ramp","boat_launch",38.8673,-76.9694,"https://www.nps.gov/anac/planyourvisit/boating.htm","river-trail","A public launch area provides access to the tidal Anacostia River for trailered and hand-carried boats under current river rules.","Navigate to the signed boat ramp on Anacostia Drive and keep staging lanes clear; it is separate from the skating pavilion.","Developed park restrooms may be available nearby, but boaters should not depend on dockside facilities.","General access is free unless current permits or partner services apply. Check tides, weather, water quality, safety equipment, and motor rules before launching."],
  [parks[2].id,"anacostia-park-section-f","Anacostia Park Section F Recreation Area","sports_field",38.8805,-76.9657,anacostia,"park-aerial","A northern recreation section provides athletic fields, lawns, picnic space, parking, and trail access along Anacostia Drive.","Select the assigned field or picnic area before driving because lettered park sections extend along the river.","Restroom availability varies by field schedule, season, and maintenance.","Open recreation is free, while permits, leagues, tournaments, and events can reserve fields or lots. Check field condition after heavy rain."],
  [parks[2].id,"river-terrace-recreation-area","River Terrace Recreation Area","recreation",38.8913,-76.9572,anacostia,"river-trail","A quieter northern riverfront segment connects neighborhood access, lawns, playground space, and the Anacostia River Trail.","Use the River Terrace neighborhood approach and choose a legal park entrance rather than crossing unmarked road or rail edges.","Facilities are limited compared with the skating-pavilion area; plan a restroom before arriving.","Park and trail access are free. Expect exposed sun, faster trail traffic, seasonal insects, and occasional construction or flood detours."],
  [parks[2].id,"langston-golf-course","Langston Golf Course","golf",38.9005,-76.9686,"https://www.playdcgolf.com/langston-golf-course/","park-aerial","A historic public golf facility on the Anacostia corridor offers an 18-hole course, driving range, instruction, clubhouse, and river views.","Use the Langston clubhouse entrance on Benning Road NE rather than an Anacostia Drive recreation lot.","Clubhouse facilities follow golf operating hours.","Trail and surrounding park access are free, but golf, range use, carts, rentals, and instruction charge. Non-golf visitors must stay off active fairways."],
  [parks[2].id,"anacostia-pool-and-recreation-center","Anacostia Pool and Recreation Center","pool",38.8660,-76.9765,"https://dpr.dc.gov/page/outdoor-pools","basketball","A seasonal D.C. public pool and recreation complex near the park provides guarded swimming, programs, and neighborhood facilities.","Navigate to the pool facility and confirm the current DPR entrance, schedule, and residency or identification rules before leaving.","Pool changing and restroom facilities are available only during operating sessions.","Pool access, season dates, capacity, weather closures, and admission rules are separate from NPS park hours. Never substitute river swimming for a closed pool."],

  [parks[3].id,"kenilworth-visitor-center","Kenilworth Aquatic Gardens Visitor Center","visitor_center",38.9128,-76.9438,kenilworth,"kenilworth-boardwalk-view","The small staffed visitor center provides maps, bloom guidance, exhibits, ranger help, restrooms, water, and loan wheelchairs.","Enter at 1550 Anacostia Avenue NE and stop at the building before following pond or marsh paths.","Restrooms and drinking water are available during Visitor Center operating hours.","Admission is free, but building hours can be shorter than garden hours. There is no vending, so bring water and food needed for the visit."],
  [parks[3].id,"kenilworth-pond-loop","Kenilworth Pond Loop","walking",38.9132,-76.9432,kenilworth,"lotus-pond","The principal garden walk links cultivated lotus and water-lily ponds, viewing points, benches, wildlife, and seasonal blooms.","Begin at the Visitor Center map and follow the signed pond paths; early morning is best for flowers and summer temperatures.","Use Visitor Center facilities before starting; there are no restrooms among the ponds.","Free during garden hours. Routes combine gravel, dirt, and grass, and open pond edges require close child supervision."],
  [parks[3].id,"kenilworth-marsh-trail","Kenilworth Marsh Trail","trail",38.9108,-76.9444,"https://www.nps.gov/keaq/planyourvisit/things2do.htm","ponds-in-fall","A natural route beyond the cultivated ponds leads through wetland-edge habitat toward tidal marsh views and the river trail network.","Photograph the Visitor Center map and follow current marsh or river-trail signs; the route is less formal than the pond grid.","No restrooms or drinking water are available on the marsh route.","Free during garden hours. Expect sun, insects, mud, high water, and seasonal vegetation; turn back if paths are flooded or closed."],
  [parks[3].id,"anacostia-river-trail-connection","Anacostia River Trail Connection at Kenilworth","trail_access",38.9098,-76.9460,"https://www.nps.gov/keaq/planyourvisit/bicycling.htm","kenilworth-boardwalk-view","A connector links the gardens and marsh area with the regional paved Anacostia River Trail for walking and bicycling.","Use the signed connector from the garden's outer paths and remember that the main visitor lot is not directly on the regional trail.","Use Visitor Center restrooms before joining the longer trail.","Trail use is free. Confirm garden gate hours for the return, yield to faster bicycles, and plan distance and daylight before leaving the pond area."],
  [parks[3].id,"kenilworth-marsh-overlook","Kenilworth Marsh Overlook","overlook",38.9106,-76.9427,kenilworth,"pond-turtles","A wetland viewing point supports birding, turtle and frog observation, photography, and interpretation of the Anacostia tidal marsh.","Follow current marsh and boardwalk signs from the cultivated ponds; conditions can change the closest approach.","There are no facilities at the overlook; use the Visitor Center first.","Free during garden hours. Bring binoculars and insect protection, stay on the route, and avoid disturbing wildlife or entering marsh vegetation."],
  [parks[3].id,"kenilworth-park-fields","Kenilworth Park Fields","sports_field",38.9075,-76.9470,"https://www.nps.gov/keaq/planyourvisit/things2do.htm","kenilworth-boardwalk-view","Open recreation fields south of the aquatic gardens provide space for sports, gatherings, and trail connections within the larger park unit.","Use the field or event directions rather than the Aquatic Gardens visitor lot when recreation is the primary destination.","Field-area facilities are limited and event-dependent; do not rely on the garden Visitor Center after its closing time.","General access is free, while organized sports, events, and large gatherings may require permits and can affect parking."],

  [parks[4].id,"theodore-roosevelt-island-footbridge","Theodore Roosevelt Island Footbridge","bridge",38.8966,-77.0670,island,"woodland-trail","A wide pedestrian bridge crosses the Potomac channel from the northbound parkway lot to the island trail network.","Enter only from the northbound George Washington Memorial Parkway lot, leave bicycles at the island-side rack, and cross on foot.","There is no restroom at the parking lot or bridge; the island comfort station is farther south.","Bridge access is free during island hours. Flooding, ice, maintenance, or parkway incidents can close the only public entrance."],
  [parks[4].id,"woods-trail","Woods Trail","trail",38.8960,-77.0637,"https://www.nps.gov/this/planyourvisit/hiking-trails.htm","woodland-trail","A forest route links the footbridge, memorial approach, comfort station, and southern island paths under mature tree canopy.","Follow Woods Trail signs from the entrance and note junctions with Swamp and Upland trails.","The island comfort station is along the southern portion of Woods Trail.","Free during island hours. Expect gravel, dirt, roots, mud, and mosquitoes; bicycles are not permitted beyond the entrance rack."],
  [parks[4].id,"upland-trail","Upland Trail","trail",38.8988,-77.0640,"https://www.nps.gov/this/planyourvisit/hiking-trails.htm","woodland-trail","A shorter interior forest trail crosses higher ground and connects the entrance area with the memorial and northern island routes.","Use the official island map and watch junction signs because the compact trail network can change the intended loop.","No restrooms are on the Upland Trail; use the south-end comfort station if open.","Free during island hours. Natural surfaces include roots, leaves, mud, and grades, and the route is not maintained as a paved accessible path."],
  [parks[4].id,"potomac-river-overlook","Theodore Roosevelt Island Potomac Overlook","overlook",38.8992,-77.0619,island,"roosevelt-statue","Informal shoreline views through the trees look toward Georgetown, Rosslyn, the Potomac, and passing boats.","Stay on marked trail and established viewing areas; do not create a shortcut down eroding riverbanks.","No facilities are at the shoreline. The comfort station is on the island's south side.","Viewing is free. Banks can be muddy or flooded, currents are strong, and the shoreline is not a swimming or wading area."],
  [parks[4].id,"theodore-roosevelt-island-comfort-station","Theodore Roosevelt Island Comfort Station","restroom",38.8953,-77.0647,island,"memorial-plaza","The island's only public restroom and drinking-fountain area sits on the southern Woods Trail rather than at the entrance or memorial.","Follow Woods Trail south from the memorial area; allow roughly one-third mile from Memorial Plaza.","This is the island restroom location, but seasonal closure or maintenance can still affect availability.","Facility use is free during posted island operations. Carry backup water and do not assume the building is available during emergencies or closures."],
  [parks[4].id,"theodore-roosevelt-island-tidal-marsh","Theodore Roosevelt Island Tidal Marsh","wetland",38.8958,-77.0658,island,"swamp-boardwalk","A low tidal wetland beside the Swamp Trail supports birds, plants, amphibians, and changing Potomac water levels.","View the marsh from the established trail and boardwalk; do not step into vegetation or tidal mud.","No facilities are in the marsh. Use the comfort station before entering the loop.","Free during island hours. High tide, rain, flooding, insects, and slick boards can make the route impassable; pets must stay leashed."],

  [parks[5].id,"meridian-hill-upper-lawn","Meridian Hill Upper Lawn","lawn",38.9222,-77.0365,meridian,"malcolm-x-park","The broad upper terrace lawn supports neighborhood relaxation, informal games, views, and the long-running Sunday drum gathering.","Use 16th Street entrances near Euclid Street for the shortest approach without climbing from the lower park.","There is no dependable public restroom on the upper lawn.","Use is free during seasonal park hours. Permitted events, turf restoration, crowds, and winter darkness can limit lawn access."],
  [parks[5].id,"meridian-hill-lower-plaza","Meridian Hill Lower Plaza","plaza",38.9195,-77.0358,meridian,"cascading-fountain","The lower formal plaza anchors the cascade with reflecting space, terraces, sculpture, and an accessible approach near Florida Avenue.","Use the lower entrance near 16th Street and Florida Avenue when avoiding the long historic stair system.","There is no dependable public restroom in the lower plaza.","Access is free. Fountain testing, restoration barriers, ceremonies, wet surfaces, and crowds can change circulation."],
  [parks[5].id,"meridian-hill-sunday-drum-circle","Meridian Hill Sunday Drum Circle","gathering",38.9220,-77.0360,meridian,"malcolm-x-park","A longstanding Sunday gathering brings drumming, dancing, music, and community activity to the upper park lawn when weather and conditions allow.","Use an upper 16th Street entrance and expect neighborhood parking pressure; transit or walking is usually easier.","Do not depend on an on-site restroom; use a verified nearby facility before joining the gathering.","The informal gathering is generally free, but timing, weather, permits, park work, and community participation vary. Respect performers and personal space."],
  [parks[5].id,"dante-statue","Dante Statue","public_art",38.9211,-77.0356,"https://home.nps.gov/places/000/dante-statue.htm","joan-of-arc","A bronze seated Dante Alighieri stands on the east side of the upper terraces as part of the park's international sculpture collection.","Use an upper park entrance and follow terrace paths east of the central lawn.","There is no restroom at the sculpture.","Free to view during park hours. Do not climb the pedestal and follow conservation or restoration barriers."],
  [parks[5].id,"james-buchanan-memorial","James Buchanan Memorial","memorial",38.9202,-77.0368,"https://home.nps.gov/places/000/james-buchanan-memorial.htm","armillary-sphere","A large Beaux-Arts memorial with a seated President Buchanan and allegorical figures stands near the lower park's west side.","Use the lower park entrance and terrace paths rather than descending from the upper lawn when mobility is limited.","There is no dependable restroom at the memorial.","Free during park hours. Respect memorial surfaces and expect temporary fencing during conservation work."],

  [parks[6].id,"georgetown-potomac-overlook","Georgetown Potomac Overlook","overlook",38.9020,-77.0648,georgetown,"potomac-kayaking","Paved overlooks and seating face the Potomac, Key Bridge, Roosevelt Island, passing boats, and Virginia shoreline.","Walk west from Wisconsin Avenue along the central promenade and choose an established overlook rather than the river edge.","There is no dependable public restroom in the park.","Viewing is free during park hours. The river is not a swimming area, railings do not replace child supervision, and high water can affect lower paths."],
  [parks[6].id,"georgetown-waterfront-pergola-garden","Georgetown Waterfront Pergola Garden","garden",38.9026,-77.0638,georgetown,"waterfront-garden","A shaded pergola, planted beds, benches, and river views form a quieter central garden room beside the promenade.","Approach from K Street or the central waterfront walk between Wisconsin Avenue and Key Bridge.","No public restroom is provided in the garden.","Access is free. Private events, horticultural work, crowding, and winter conditions can limit seating or paths."],
  [parks[6].id,"capital-crescent-trail-connection","Capital Crescent Trail Connection","trail_access",38.9045,-77.0690,"https://www.nps.gov/choh/planyourvisit/georgetown-visitor-center.htm","waterfront","The western waterfront connects toward the C&O Canal towpath and Capital Crescent Trail, supporting walking and bicycling beyond Georgetown.","Continue west under or beyond Key Bridge using current trail signs; construction can shift the exact connection.","Restrooms are not continuous on the connection. Identify a Georgetown or C&O Canal facility before departing.","Trail access is free. Expect bicycle traffic, narrow merges, construction, changing surfaces, and long distances before the next service."],
  [parks[6].id,"rock-creek-trail-connection","Rock Creek Trail Connection at Georgetown","trail_access",38.9015,-77.0574,"https://www.nps.gov/rocr/planyourvisit/bicycling.htm","waterfront","The east end links the Georgetown promenade with Rock Creek and Potomac Parkway paths toward Foggy Bottom, the National Mall, and Rock Creek Park.","Use signed paths east of Wisconsin Avenue and confirm temporary detours around roads, bridges, and waterfront construction.","There is no dependable restroom at the trail junction.","Connection use is free. Yield at merges, expect commuting bicycle traffic and road noise, and check flood or construction closures."],
  [parks[6].id,"key-bridge-waterfront-access","Key Bridge Waterfront Access","entrance",38.9038,-77.0678,georgetown,"waterfront","The park's western entrance beneath Key Bridge connects waterfront paths, the labyrinth, trail routes, boathouse activity, and steep neighborhood approaches.","Use signed K Street or trail access below Key Bridge; street level above is not the same destination.","There is no dependable park restroom at the bridge access.","Access is free. Construction, bridge work, boat operations, stairs, and bicycle congestion can change the practical route."],

  [parks[7].id,"national-herb-garden","National Herb Garden","garden",38.9108,-76.9702,"https://usna.usda.gov/discover/gardens-collections/national-herb-garden/","arboretum-koi-pond","Formal and themed beds display culinary, medicinal, fragrance, dye, industrial, and historic plants near the Administration Building.","Enter through R Street and follow signs toward the Administration Building and National Bonsai & Penjing Museum area.","Use nearby Administration Building or museum-area restrooms during operating hours.","Outdoor access is free during Arboretum hours. Displays change seasonally; stay on paths and do not harvest or handle collection plants."],
  [parks[7].id,"asian-collections","Asian Collections","garden",38.9149,-76.9731,"https://usna.usda.gov/discover/gardens-collections/asian-collections/","azalea-garden","Woodland paths across Mount Hamilton, Hickey Hill, and China Valley display plants from China, Japan, and Korea with seasonal flowers and views.","Use the official Arboretum map and a nearby collection parking area; this is a large hillside landscape, not one bed.","There are no dependable restrooms within the collection. Use developed visitor facilities first.","Free during Arboretum hours. Expect hills, natural paths, roots, seasonal crowds, ticks, and variable bloom timing."],
  [parks[7].id,"gotelli-conifer-collection","Gotelli Conifer Collection","garden",38.9147,-76.9656,"https://usna.usda.gov/discover/gardens-collections/gotelli-conifer-collection/","national-capitol-columns","A rolling landscape of conifers from around the world provides year-round form, color, and long views across the Arboretum.","Drive or walk to the signed collection area from the R Street entrance and note the closing-time travel back to the gate.","No restroom is located within the collection; use developed facilities before visiting.","Free during Arboretum hours. Hills, lawns, weather, and limited shade affect accessibility and comfort."],
  [parks[7].id,"friendship-garden","Friendship Garden","garden",38.9102,-76.9715,"https://usna.usda.gov/discover/gardens-collections/friendship-garden/","arboretum-koi-pond","A designed garden near the National Bonsai & Penjing Museum combines paths, plantings, water, and seasonal horticultural displays.","Follow signs from the museum and Administration Building area rather than navigating to the Arboretum's general center.","Nearby developed visitor facilities have restrooms during operating hours.","Free during Arboretum hours. Stay on paths and expect seasonal maintenance, irrigation, events, or exhibit work."],
  [parks[7].id,"fern-valley-native-plant-collections","Fern Valley Native Plant Collections","garden",38.9092,-76.9754,"https://usna.usda.gov/discover/gardens-collections/fern-valley/","azalea-garden","Woodland trails interpret native plants of the eastern United States through forest, meadow, wetland, and regional habitat displays.","Use the official map and a signed Fern Valley access; the collection is separated from the Columns and museum area.","There are no dependable restrooms on the woodland trails.","Free during Arboretum hours. Natural surfaces, roots, ticks, humidity, mud, and seasonal plant work affect the route."],
);

const eastPotomacPark = parks.find((park) => park.id === "launch-dc-washington-east-potomac-park-hains-point");
const gravellyPointPark = parks.find((park) => park.id === "launch-va-arlington-gravelly-point");
const greatFallsPark = parks.find((park) => park.id === "launch-va-mclean-great-falls-park");
const glenEchoPark = parks.find((park) => park.id === "launch-md-glen-echo-glen-echo-park");
const greatFallsMarylandPark = parks.find((park) => park.id === "launch-md-potomac-great-falls-tavern-olmsted-island");
const huntleyMeadowsPark = parks.find((park) => park.id === "launch-va-alexandria-huntley-meadows-park");

featureRows.push(
  [eastPotomacPark.id,"hains-point-playground-and-picnic-grove","Hains Point Playground & Picnic Grove","playground",38.859987,-77.023030,"https://www.nps.gov/places/000/east-potomac-park-hains-point.htm","hains-point-playground","A playground, picnic tables, reservable grove sections, waterfront lawn, information kiosk, and nearby restroom make the peninsula's south end the primary family stop.","Follow Ohio Drive to Hains Point at the peninsula's southern tip and use the signed parking and picnic area rather than stopping on the loop road.","A restroom serves the developed Hains Point area, but outages or seasonal maintenance can affect access.","The playground and open picnic space are free. Reservable grove areas currently cost $90 for a half day or $180 for a full day, and the loop may close for flooding, weather, events, or safety."],
  [eastPotomacPark.id,"east-potomac-mini-golf","East Potomac Mini Golf","mini_golf",38.875375,-77.026695,"https://www.nps.gov/nama/planyourvisit/outdooractivities.htm","east-potomac-mini-golf","The country's oldest continually operating miniature golf course offers a compact eighteen-hole public course beside the East Potomac Golf Course clubhouse.","Navigate to 972 Ohio Drive SW and follow signs for miniature golf; the starter building and course are near the golf clubhouse, not at Hains Point.","Use clubhouse-area restrooms during facility hours.","The surrounding park is free, but miniature golf charges per round and keeps facility-specific hours. Check the operator's current schedule, weather status, and wait before promising play."],
  [eastPotomacPark.id,"hains-point-loop","Hains Point Loop","scenic_drive",38.868816,-77.027807,"https://www.nps.gov/places/000/east-potomac-park-hains-point.htm","hains-point-loop","A roughly three-mile Ohio Drive circuit around the peninsula supports walking, running, cycling, river views, cherry trees, fishing access, and a low-speed scenic drive.","Choose a legal lot before starting and travel in the posted loop direction. Do not use the road shoulder as overflow parking or block bicycle and emergency access.","Restrooms are concentrated at developed recreation areas rather than continuously around the loop.","Loop access is free, but the road may close because of tides, flooding, snow, events, construction, or public safety. Expect mixed traffic and exposed weather."],
  [eastPotomacPark.id,"east-potomac-golf-course-clubhouse","East Potomac Golf Course Clubhouse","golf",38.8738,-77.0268,"https://www.nps.gov/nama/planyourvisit/outdooractivities.htm","east-potomac-golf-clubhouse","The public golf clubhouse supports three courses, a driving range, lessons, rentals, food service, and the adjacent historic miniature golf course.","Navigate to 972 Ohio Drive SW and use the golf-facility parking rather than continuing to the Hains Point picnic area.","Clubhouse restrooms are available during facility operations.","Park entry is free, while golf, range use, rentals, instruction, miniature golf, and food charge separately. Tee times, weather closures, and concession hours change independently from park access."],

  [gravellyPointPark.id,"gravelly-point-plane-spotting-lawn","Gravelly Point Plane-Spotting Lawn","viewpoint",38.865384,-77.038563,"https://home.nps.gov/places/000/gravelly-point.htm","gravelly-point-landing","The broad central lawn sits directly beneath a Reagan National Airport flight path and gives visitors unusually close views of arriving or departing aircraft.","Enter from northbound George Washington Memorial Parkway, park only in a marked space, and walk onto the open lawn without standing on the Mount Vernon Trail.","The Gravelly Point restroom is nearby, but availability can change with maintenance or closure.","Plane spotting is free. Aircraft direction depends on wind and operations; protect hearing, keep children close, and never fly drones, kites, lasers, or other objects near the airport."],

  [greatFallsPark.id,"great-falls-overlook-1","Great Falls Overlook 1","overlook",38.9964,-77.2535,"https://www.nps.gov/thingstodo/great-falls-overlooks.htm","great-falls-overlook-1","The closest and most dramatic overlook places visitors on a rocky outcrop beside the main falls, with powerful water and minimal separation from steep terrain.","Follow overlook signs from the Visitor Center area and use the rocky spur for Overlook 1; do not confuse an informal river edge with the signed viewpoint.","Use courtyard restrooms or portable toilets near the Visitor Center before approaching the overlook.","The overlook is included with park admission. It requires uneven rock scrambling, is not wheelchair accessible, and has severe cliff and current hazards; children and leashed pets need direct control."],
  [greatFallsPark.id,"great-falls-overlook-2","Great Falls Overlook 2","overlook",38.995883,-77.253525,"https://www.nps.gov/thingstodo/great-falls-overlooks.htm","great-falls-overlook-2","A signed overlook about 250 feet downstream frames the main falls and has a ramped approach that makes it the most practical close view for many visitors.","Follow the signed riverside route south from the Visitor Center and Overlook 1; use the ramped viewing area rather than crossing protective barriers.","Use courtyard restrooms or portable toilets near the Visitor Center before walking to the overlooks.","The viewpoint is included with park admission and has an accessible ramp. Wet surfaces, crowds, cliffs, snakes, and fast water still require caution, and barriers must never be crossed."],
  [greatFallsPark.id,"great-falls-overlook-3","Great Falls Overlook 3","overlook",38.995319,-77.252792,"https://www.nps.gov/thingstodo/great-falls-overlooks.htm","great-falls-overlook-3","The southern primary overlook provides a wider upriver view of the falls and gorge from a ramped platform roughly 500 feet downstream.","Continue south on the signed overlook route beyond Overlook 2. The platform is close to the main visitor area, but it is distinct from River Trail viewpoints farther downstream.","Use courtyard restrooms or portable toilets near the Visitor Center before the overlook walk.","The viewpoint is included with park admission and has a ramped approach. Stay behind barriers, supervise children, and expect exposed sun, weather, crowds, and slick surfaces."],
  [greatFallsPark.id,"great-falls-visitor-center-and-courtyard","Great Falls Visitor Center & Courtyard","visitor_center",38.9987,-77.2530,"https://home.nps.gov/grfa/planyourvisit/hours.htm","great-falls-visitor-center","The main orientation area provides ranger information, exhibits, maps, courtyard seating, nearby restrooms, seasonal snack service, and the shortest approach to all three overlooks.","After the entrance station, use the main parking area and follow Visitor Center signs. Start here before choosing an overlook or natural-surface trail.","Courtyard bathrooms are currently open 8:30 a.m.-4 p.m.; another restroom is out of order, with portable toilets available 7 a.m. until dark.","The building is currently open 10 a.m.-5 p.m., while the park opens earlier and closes later. Snack service is typically weekend and seasonal; check current notices rather than relying on hours visible in older photographs."],

  [glenEchoPark.id,"dentzel-carousel","Dentzel Carousel","carousel",38.9662005,-77.1387893,"https://www.nps.gov/glec/planyourvisit/hours.htm","dentzel-carousel","The restored 1921 Dentzel carousel remains the park's signature family attraction, with hand-carved animals, a band organ, seasonal rides, and a historic pavilion.","Cross the footbridge from the Oxford Road visitor lot and follow the main path toward the round carousel pavilion near the Arcade building.","Year-round accessible restrooms are in the red-brick Arcade building beside the carousel.","The grounds are free, but carousel rides require a current ticket and operate seasonally on a facility-specific schedule. Check same-day maintenance and weather status before promising a ride."],
  [glenEchoPark.id,"bumper-car-pavilion","Bumper Car Pavilion","dance_pavilion",38.9656064,-77.1385186,"https://www.nps.gov/glec/index.htm","bumper-car-pavilion","The roofed open-air pavilion from the former amusement park now hosts seasonal social dances, concerts, classes, and public events.","From the main entrance, continue beyond the carousel toward the eastern side of the campus; the pavilion is separate from the enclosed Spanish Ballroom.","Use accessible public restrooms in nearby park buildings during their posted hours.","Walking through the campus is free, while dances and programs may require admission, registration, or partner tickets. The open-air venue can be affected by heat, storms, and private rentals."],
  [glenEchoPark.id,"spanish-ballroom","Spanish Ballroom","ballroom",38.9655954,-77.1390818,"https://www.nps.gov/glec/planyourvisit/hours.htm","spanish-ballroom","The restored 1933 Spanish Ballroom is a major year-round social-dance and performance venue with a large sprung floor and historic Streamline Moderne interior.","The Ballroom stands along the park's southeast edge beside its annex and near the picnic and playground area; follow event signs from the main entrance.","Accessible restrooms are available at the Ballroom and in nearby park buildings during operations.","The building is not continuously open with the grounds. Review the exact dance, concert, festival, class, or rental listing for admission, start time, footwear, age guidance, and accessibility arrangements."],
  [glenEchoPark.id,"picnic-grove-and-playground","Picnic Grove & Playground","playground",38.9659,-77.1393,"https://home.nps.gov/glec/planyourvisit/playground-and-picnic-area.htm","picnic-grove","A shaded first-come picnic grove and redesigned playground provide the park's primary free family base between ticketed or scheduled activities.","Follow the campus map south of the carousel toward the Spanish Ballroom. Do not stop at the permit lot; use the Oxford Road public lot and walk across the bridge.","Accessible restrooms are close by in the Arcade building and other open park buildings.","Playground and small-group picnic use are free and first-come. Tables are uncovered; supervise children, pack out trash, keep fires out, and confirm current rules before bringing a grill, canopy, or larger group."],

  [greatFallsMarylandPark.id,"great-falls-tavern-visitor-center","Great Falls Tavern Visitor Center","visitor_center",39.0002043,-77.2481581,"https://www.nps.gov/choh/planyourvisit/greatfallstavernvisitorcenter.htm","great-falls-tavern","The historic canal tavern at Lock 20 is the Maryland-side orientation hub for maps, exhibits, ranger programs, Junior Ranger activities, trail advice, restrooms, water, and seasonal boat tickets.","Enter at 11710 MacArthur Boulevard, pay or show a valid pass, park in the main lot, and follow signs to the white tavern beside the canal.","Accessible restrooms and drinking water are available at the visitor complex during posted hours.","The building is currently open Wednesday-Sunday 9 a.m.-4 p.m. and closes Monday, Tuesday, and listed holidays. Outdoor park access, entrance staffing, boat rides, and trail conditions use separate schedules."],
  [greatFallsMarylandPark.id,"olmsted-island-great-falls-overlook","Olmsted Island Great Falls Overlook","overlook",38.9967303,-77.2519772,"https://home.nps.gov/choh/planyourvisit/great-falls-overlook.htm","olmsted-overlook","An accessible boardwalk crosses the sensitive Olmsted Island ecosystem to the Maryland overlook above Great Falls and the Potomac Gorge.","Park at Great Falls Tavern, then follow the signed route about one-half mile to the overlook; the boardwalk itself is roughly one-quarter mile each way.","Use Tavern-area restrooms before starting. There are no restrooms, water, or trash cans on the island boardwalk.","The overlook is included with park admission and is an easy, ADA-accessible boardwalk route. Pets are prohibited; stay on the boards, keep children close, and never climb toward the river.",{ cost: "The overlook is included with Great Falls entrance admission.", accessibility: "The quarter-mile Olmsted Island boardwalk is ADA accessible, although weather and river conditions can close the route.", dogs: "Pets are prohibited on Olmsted Island, its boardwalk, and the Great Falls overlook.", family: "The boardwalk is manageable for many families, but adults must keep children on the boards and away from the river edge." }],
  [greatFallsMarylandPark.id,"billy-goat-trail-section-a","Billy Goat Trail Section A","trail",38.9935209,-77.2454676,"https://www.nps.gov/choh/planyourvisit/great-falls-things-to-do.htm","billy-goat-trail-a","A strenuous one-way rock-scrambling route leaves the towpath for exposed Potomac Gorge terrain, including angled slabs, boulders, and a steep traverse.","Use Great Falls Tavern parking and the official hiking map, then enter only at the signed Section A trailhead off the towpath. The map pin marks the upstream trailhead, not roadside parking.","There are no facilities on the trail. Use Tavern-area restrooms, carry sufficient water, and pack out all waste.","The trail is included with park admission but frequently closes for river rise or hazards. Pets and bicycles are prohibited; this is not a casual family walk, and hikers must stay out of the Potomac.",{ cost: "The trail is included with Great Falls entrance admission.", accessibility: "Section A is a strenuous natural-surface rock scramble and is not an accessible route.", dogs: "Pets are prohibited on Billy Goat Trail Section A, even when carried.", family: "This exposed rock scramble is not a casual family walk; choose it only for capable hikers who can safely manage cliffs, boulders, and heat." }],
  [greatFallsMarylandPark.id,"great-falls-launch-boat-program","Great Falls Launch Boat Program","boat_tour",39.000284,-77.248140,"https://www.nps.gov/choh/planyourvisit/great-falls-canal-boat-rides.htm","great-falls-launch-boat","A seasonal ranger-led ride uses a small replica launch boat to interpret canal history and the people who traveled and worked along the C&O Canal.","Begin at Great Falls Tavern Visitor Center. Every participant must be present when free same-day tickets are released one hour before the scheduled ride.","Use accessible Tavern-area restrooms before boarding; the approximately thirty-minute launch boat has limited capacity and space.","Tickets are free but cannot be reserved, capacity is currently ten people including children, and weather, high wind, extreme heat, or canal conditions may cancel a program. Pets are not permitted except service animals.",{ hours: "Rides follow a seasonal program schedule and can be canceled for weather, heat, wind, or canal conditions; confirm the current NPS listing on the visit day.", cost: "Same-day launch-boat tickets are free, first-come, and cannot be reserved.", accessibility: "The small launch boat has limited capacity and boarding space; contact the park before visiting for a specific mobility accommodation.", dogs: "Pets are not permitted on the launch boat except service animals.", family: "The roughly thirty-minute ranger program can work well for children, but every participant counts toward the ten-person capacity." }],

  [huntleyMeadowsPark.id,"norma-hoffman-visitor-center","Norma Hoffman Visitor Center","visitor_center",38.7566753,-77.0983679,"https://www.fairfaxcounty.gov/parks/huntley-meadows/hours","huntley-visitor-center","The main orientation building provides naturalist help, wetland exhibits, program check-in, restrooms, maps, and the correct starting point for the forest and boardwalk approach.","Use 3701 Lockheed Boulevard and the main parking lot. Do not use the South Kings Highway hike-bike entrance when the Visitor Center or boardwalk is the destination.","Restrooms are available inside during current Visitor Center hours; there are no facilities at the separate South Kings Highway entrance.","Individual entry is free. The building is closed Tuesdays and uses seasonal weekend hours; holiday schedules, programs, and special events can change access even when outdoor trails remain available."],
  [huntleyMeadowsPark.id,"heron-trail-wetland-boardwalk","Heron Trail Wetland Boardwalk","boardwalk",38.752271,-77.1057712,"https://www.fairfaxcounty.gov/parks/huntley-meadows/on-your-own","heron-trail-boardwalk","A half-mile raised boardwalk winds through the restored wetland to a viewing platform, creating close but protected views of beavers, frogs, dragonflies, herons, deer, and changing water habitat.","Start at the Lockheed Boulevard Visitor Center, follow Cedar Trail through the forest, and continue onto signed Heron Trail. The South Kings Highway route does not provide the short boardwalk approach.","There are no facilities on the boardwalk. Use the Visitor Center restrooms before beginning and carry out all waste.","Boardwalk access is free. Pets, bicycles, scooters, jogging, running, fishing, and netting are prohibited; walk slowly, stay on the narrow boards, protect wildlife, and expect heat, insects, wet surfaces, and seasonal water changes.",{ cost: "Individual and family access to the boardwalk is free.", accessibility: "The approach includes a measured accessible stonedust route, while the wetland boardwalk is narrow and conditions can be damp; contact the park for a specific accommodation.", dogs: "Pets are prohibited on Heron Trail and the wetland boardwalk.", family: "Wildlife viewing is excellent for patient children, but running, jogging, scooters, and bicycles are prohibited on the narrow boardwalk." }],
);

featureRows.push(
  [cabinJohnPark.id,"cabin-john-miniature-train","Cabin John Miniature Train","train",39.0345397,-77.1491006,"https://montgomeryparks.org/parks-and-trails/cabin-john-regional-park/miniature-train/?level=1","cabin-john-train-station","A scenic two-mile miniature-train ride through Cabin John Regional Park, operating during the regular season from April through October with weather-dependent service.","Navigate to 7410 Tuckerman Lane and the signed train station rather than the Westlake Drive recreation facilities. The pin is the mapped train destination cross-checked against the official address.","Use the closest marked park restroom before joining the train queue; the official train page does not promise onboard facilities.","Regular 2026 tickets are $4, with children under two riding free with a paying adult. Regular service is weekends 9:30 a.m.-4:30 p.m. plus limited summer Fridays 10 a.m.-1 p.m.; rain, track condensation, excessive heat, and special events can change service.",{ address: "7410 Tuckerman Lane, Rockville, MD 20852", hours: "Regular 2026 service is weekends 9:30 a.m.-4:30 p.m. Limited Friday service runs June 19-August 14 from 10 a.m.-1 p.m.; October uses special-event tickets, and weather or track conditions can stop trains.", cost: "Regular-season tickets are $4 per rider in 2026. Children under two ride free with a paying adult; special events use separate tickets.", accessibility: "Montgomery Parks accepts train accommodation requests through its Program Access office; contact staff before visiting for a specific boarding need.", dogs: "Leashed dogs may use the surrounding outdoor park, but do not assume pets can board the train; confirm directly. Service animals follow applicable access rules.", family: "The roughly two-mile ride is designed for children and adults. Buy tickets at the window, keep the group together in the queue, and check weather status before promising the ride.", positionQuality: "Official train address and park map cross-checked against the public mapped Cabin John Miniature Train location" }],
  [cabinJohnPark.id,"cabin-john-ice-rink","Cabin John Ice Rink","ice_rink",39.0306860,-77.1483206,"https://montgomeryparks.org/parks-and-trails/cabin-john-regional-park/cabin-john-ice-rink/schedules-info/public-sessions/","cabin-john-ice-rink","A fully enclosed year-round ice facility with public skating, lessons, rentals, hockey, figure-skating programs, and session-specific admission.","Use 10610 Westlake Drive and the ice-rink entrance. This is a separate activity zone from the train and Tuckerman Lane picnic and playground areas.","Building restrooms are available during scheduled rink operations; confirm facility status when checking the public-session calendar.","Public skating is session-based rather than continuous. Current admission is $9 for ages five and up, $5 for ages three to four, and $4 for skate rental; closures, programs, and special events alter the daily schedule.",{ address: "10610 Westlake Drive, Rockville, MD 20852", hours: "Public skating follows the posted session calendar rather than general park hours. Check the exact date and session because hockey, lessons, maintenance, closures, and special events change availability.", cost: "Current public-session admission is $9 for ages five and up and $5 for ages three to four. Skate rental is $4 per session; specialty sessions may bundle rental or use different fees.", accessibility: "The rink has a developed building approach and Montgomery Parks offers disability modifications through Program Access; contact the rink for a specific on-ice or spectator accommodation.", dogs: "Leashed pets belong in permitted outdoor park areas, not public skating sessions. Service animals follow applicable building-access rules.", family: "Public sessions can work well for families, but admission and rental are per session, schedules change, and young or new skaters need close supervision and appropriate cold-weather clothing.", positionQuality: "OpenStreetMap ice-rink object 180390638 cross-checked against the official 10610 Westlake Drive facility address" }],

  [rockCreekRegionalPark.id,"lake-needwood-boats","Lake Needwood & Boat Rentals","boating",39.1171446,-77.1278556,"https://montgomeryparks.org/parks-and-trails/lake-needwood-boats/","lake-needwood-autumn","The 75-acre Lake Needwood boating area offers seasonal kayaks, canoes, rowboats, pedal boats, an accessible launch system, a small supply counter, and Needwood Queen pontoon tours.","Use 15700 Needwood Lake Circle and follow signs to the boathouse and lakeside parking. The pin is the mapped public boating destination at the official address.","Use boathouse-area facilities during posted operations; services are seasonal, so do not rely on the counter or restrooms outside the current operating period without confirming.","Rentals are weather-dependent, require photo ID, and require life jackets. The official page currently posts weekend May-September operations but includes prior-season holiday dates, so verify the current calendar or call before leaving.",{ address: "15700 Needwood Lake Circle, Rockville, MD 20855", hours: "The official page currently posts weekend May-September rental hours of 10 a.m.-4:30 p.m., with last returns by 6 p.m., but its listed holiday dates are from a prior season. Confirm the current operating day before traveling.", cost: "Current posted rates are $15 per hour for kayaks, canoes, and rowboats, $12 per half hour for pedal boats, and $55 for a full day except pedal boats. Needwood Queen tours are posted at $5 per person.", accessibility: "An ADA-compliant dock and launch system supports canoe and kayak entry, and the Needwood Queen accommodates wheelchair users. Contact the boathouse for a specific boarding need.", dogs: "Dogs are welcome aboard Montgomery Parks rental boats, but must remain controlled and follow staff and park rules.", family: "Rowboats and pedal boats can suit families, but every rider needs a life jacket, children cannot sit on an adult's lap in a kayak, and capacity and age rules apply.", positionQuality: "Official boathouse address and park map cross-checked against the public mapped Lake Needwood boating location" }],
  [rockCreekRegionalPark.id,"meadowside-nature-center-trails","Meadowside Nature Center Trails","trail",39.1123369,-77.1066841,"https://montgomeryparks.org/parks-and-trails/rock-creek-regional-park/meadowside-nature-center/trail-maps/","meadowside-creek","More than eight miles of trails explore woods, meadows, ponds, streams, Lake Frank, wildlife habitat, and historical features around Meadowside Nature Center.","Use 5100 Meadowside Lane for this trail network. Do not navigate to Lake Needwood when the Meadowside loops, Lake Frank, or outdoor exhibits are the destination.","The Nature Center building and restroom facilities are currently closed for renovation. Arrive prepared to complete the trail visit without indoor services.","Outdoor park areas and trails are open sunrise to sunset. The building remains closed, swimming, boating, and ice skating are prohibited at Study Pond, and trail length, terrain, heat, mud, and water conditions vary.",{ address: "5100 Meadowside Lane, Rockville, MD 20855", hours: "Outdoor park areas and trails are open daily from sunrise to sunset. The Nature Center building and restrooms remain closed during the current renovation.", cost: "General trail and outdoor self-guided access is free. Registered programs may have separate fees or capacity limits.", accessibility: "The trail system includes varied natural surfaces; use the official accessible and topographic maps to select a route and contact Program Access for a specific modification.", dogs: "Leashed dogs are allowed only where current trail rules permit. Keep pets controlled around wildlife, ponds, streams, and program groups.", family: "Short routes such as Rocky Ridge, Study Pond, and the self-guided Tree Trail can suit families, but there are no open restrooms and water edges require supervision.", positionQuality: "Official Meadowside address and trail maps cross-checked against the public mapped nature-center location" }],

  [burkeLakePark.id,"burke-lake-marina","Burke Lake Marina","marina",38.7609478,-77.3013925,"https://www.fairfaxcounty.gov/parks/burke-lake/marina","burke-lake-marina","The main lakefront recreation hub provides seasonal rowboat and canoe rentals, bait and tackle, a county boat launch, trail access, parking, and the starting point for the 4.68-mile lake loop.","Enter Burke Lake Park at 7315 Ox Road and follow internal marina signs to the dedicated lot. The state launch at the dam is a different access point.","Mapped permanent and seasonal restrooms serve the developed marina and nearby picnic areas; confirm seasonal facility availability before an early or late visit.","The 2026 marina schedule changes several times between May and November. Rentals require photo ID and age compliance, life jackets are mandatory, swimming is prohibited, and weather can stop operations.",{ hours: "The 2026 marina is generally open weekends May 2-June 17, daily June 18-August 23, and weekends August 24-November 1, with seasonal opening and last-rental times. Check the official operational-hours page for the exact date.", cost: "The current county launch fee is $8. Posted 2026 rowboat rates begin at $15 weekday or $16 weekend for a half day; canoe and motor packages cost more.", accessibility: "The marina is a developed facility with parking and docks, but boarding and shoreline conditions vary. Contact Fairfax County Park Authority for a specific mobility accommodation.", dogs: "Pets are not permitted on rental boats or the tour boat. Leashed dogs may use permitted surrounding park and trail areas.", family: "Boat rentals, fishing, nearby picnics, and the lakeside trail can work well for families, but rental-age, capacity, waiver, and life-jacket rules apply to every trip.", positionQuality: "Official marina address and park map cross-checked against the public mapped Burke Lake Marina location" }],
  [burkeLakePark.id,"burke-lake-railroad","Burke Lake Railroad","train",38.7626101,-77.3044747,"https://www.fairfaxcounty.gov/parks/node/2177","burke-lake-railroad","A one-third-scale C.P. Huntington miniature steam-engine replica pulls passengers on a roughly 1.75-mile, ten-minute circuit through the park.","Enter at 7315 Ox Road, then follow the official park map and train signs to the railroad station near the carousel and family recreation area.","Permanent restrooms are available in the nearby ice cream parlor and Shelter A/B areas; seasonal facilities are also mapped around the family activity zone.","The 2026 train normally runs weekends in spring and fall and daily June 18-August 23, weather permitting. The last ride is posted at 5:45 p.m.; tickets and special-event trains use separate terms.",{ hours: "In 2026 the train runs weekends April 4-June 17, daily June 18-August 23, and weekends August 24-November 1, generally 11 a.m.-6 p.m. with the last ride at 5:45 p.m. Weather and events can alter service.", cost: "The railroad is a ticketed attraction with current pricing posted through Fairfax County's purchase system. General park access does not include a train ride.", accessibility: "The developed station has a defined boarding area; contact park staff before visiting for a specific boarding or seating accommodation.", dogs: "Do not plan to bring a pet aboard the railroad. Leashed dogs may use permitted surrounding park areas; service animals follow applicable access rules.", family: "The approximately ten-minute ride is designed as a family attraction. Check the same-day weather status and last departure before promising children a ride.", positionQuality: "Official park map and attraction page cross-checked against the public mapped Burke Lake Railroad location" }],
  [burkeLakePark.id,"burke-lake-dam-state-launch","Burke Lake Dam & State Boat Launch","dam",38.7550164,-77.2954471,"https://www.fairfaxcounty.gov/parks/node/2173","burke-lake-dam","A separate dam crossing and state-owned 24-hour boat launch provide lake views, trail continuity, and early access for properly equipped anglers outside the main marina complex.","Navigate to the named dam and state launch rather than the county marina. The access and parking are separate from the train, carousel, and main family activity lots.","Do not expect the county marina's staffed restrooms, bait sales, or rental counter at this separate launch. Plan essential services before arriving.","The official county boating guide identifies the state launch as a 24-hour access, but Virginia fishing, boating, parking, and safety rules still apply. Swimming is prohibited and the dam edge requires close supervision.",{ hours: "The state-owned launch at the dam is identified by Fairfax County as a 24-hour launch. The surrounding county park, marina, and staffed services follow separate schedules.", cost: "Applicable Virginia fishing, registration, and launch rules govern this separate access. Do not assume a county marina rental or launch payment covers state requirements.", accessibility: "The dam and launch are functional water-access infrastructure rather than a staffed visitor attraction; verify current surfaces and accommodation needs before travel.", dogs: "Keep dogs physically leashed and away from active launching, fishing lines, wildlife, and the dam edge.", family: "This is useful for anglers and a lake-trail stop, not the park's primary family ride area. Closely supervise children around vehicles, boats, water, and the dam.", positionQuality: "OpenStreetMap dam object 329395125 cross-checked against Fairfax County's official Burke Lake boating guidance" }],
);

function answer(park, intentKey, question, text) {
  return { intentKey, question, answer: text, sourceLabel: park.sourceLabel, source: park.source, sourceType: "official", checkedAt };
}

function parkAnswers(park) {
  return [
    answer(park,"hours",`When is ${park.name} open?`,park.hours), answer(park,"parking",`Where should I park for ${park.name}?`,park.parking),
    answer(park,"entrance",`What is the best entrance for ${park.name}?`,park.arrival), answer(park,"restroom",`Are there restrooms at ${park.name}?`,park.restrooms),
    answer(park,"fees",`Is ${park.name} free?`,park.cost), answer(park,"accessibility",`How accessible is ${park.name}?`,park.accessibility),
    answer(park,"dogs",`Are dogs allowed at ${park.name}?`,park.dogs), answer(park,"family",`Is ${park.name} good for children?`,park.family),
    answer(park,"transit",`How do I reach ${park.name} without a car?`,park.transit), answer(park,"need-to-know",`What should I know before visiting ${park.name}?`,park.need),
    answer(park,"food",`Should I bring food and water to ${park.name}?`,`Bring water and a backup snack unless a currently open concession is confirmed near the exact destination. Food availability, vending, and event vendors are not consistent across this large public place.`),
  ];
}

async function downloadPhoto(park, item) {
  const relative = `${park.assetCitySlug || slugify(park.city || "Washington")}/${slugify(park.name)}/${item.slug}.webp`;
  const outputPath = path.join(root, "assets", "parks", "washington-dc-super", relative);
  if (fs.existsSync(outputPath)) return `/assets/parks/washington-dc-super/${relative}`;
  if (!downloadImages) throw new Error(`Missing ${park.name} image ${item.slug}; rerun with --download`);
  let response;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    response = await fetch(item.url, { headers: { "User-Agent": "Mozilla/5.0 AuditMap official-source enrichment/1.0", Accept: "image/*,*/*;q=0.8", Referer: item.source } });
    if (response.ok || response.status !== 429) break;
    await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
  }
  if (!response?.ok) throw new Error(`${park.name}/${item.slug}: image returned ${response?.status || "no response"}`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize(1600, 1000, { fit: "cover", position: "attention", withoutEnlargement: true }).webp({ quality: 83 }).toFile(outputPath);
  return `/assets/parks/washington-dc-super/${relative}`;
}

function ensureCatalogRows() {
  const csvPath = path.join(root, "data", "nationwide-major-parks-launch.csv");
  let csv = fs.readFileSync(csvPath, "utf8").trimEnd();
  for (const park of parks) {
    const row = `${park.region || "Mid-Atlantic"},${park.state || "DC"},${park.city || "Washington"},${park.name},${park.tier},yes,super-enriched`;
    if (!csv.split("\n").some((line) => line.split(",").slice(0, 4).join(",") === row.split(",").slice(0, 4).join(","))) csv += `\n${row}`;
  }
  fs.writeFileSync(csvPath, `${csv}\n`);
}

function ensureLocations() {
  const file = path.join(root, "data", "launch-location-overrides.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf8")).filter(
    (row) => row.id !== "launch-md-potomac-great-falls-tavern-and-olmsted-island",
  );
  for (const park of parks) {
    const city = park.city || "Washington";
    const state = park.state || "DC";
    const value = { id: park.id, park: park.name, city, state, latitude: park.lat, longitude: park.lon, address: park.address, displayName: `${park.name}, ${city}, ${state}`, source: park.sourceLabel, sourceUrl: park.source, checkedAt };
    const index = rows.findIndex((row) => row.id === park.id);
    if (index >= 0) rows[index] = value; else rows.push(value);
  }
  fs.writeFileSync(file, `${JSON.stringify(rows, null, 2)}\n`);
}

function makeFeature(park, row, localImages) {
  const [parentId, slug, name, type, lat, lon, source, imageSlug, description, arrival, restrooms, need, overrides = {}] = row;
  const id = stableUuid(parentId, slug);
  const photoItem = park.photos.find((candidate) => candidate.slug === imageSlug) || park.photos[0];
  const image = { ...(featureImages[parentId]?.[slug] || localImages.find((candidate) => candidate.slug === photoItem.slug)), featureId: id, latitude: lat, longitude: lon };
  const parking = overrides.parking || park.parking;
  const hours = overrides.hours || need;
  const cost = overrides.cost || park.cost;
  const accessibility = overrides.accessibility || park.accessibility;
  const dogs = overrides.dogs || park.dogs;
  const family = overrides.family || park.family;
  const detailsAnswers = [
    ["location",`Where exactly is ${name}?`,arrival], ["parking",`Where should I park for ${name}?`,parking], ["hours",`When is ${name} open?`,hours],
    ["restroom",`Are there restrooms near ${name}?`,restrooms], ["fees",`Is ${name} free?`,cost], ["accessibility",`How accessible is ${name}?`,accessibility],
    ["dogs",`Are dogs allowed at ${name}?`,dogs], ["family",`Is ${name} good for children?`,family], ["need-to-know",`What should I know before visiting ${name}?`,need],
  ].map(([intentKey, question, text]) => ({ intentKey, question, answer: text, sourceLabel: park.sourceLabel, source, sourceType: "official", checkedAt }));
  return { id, slug, name, feature_type: type, description, latitude: lat, longitude: lon, details: { category: type.replace(/_/g," "), includeInParentGallery: true, positionQuality: overrides.positionQuality || "Named destination cross-checked against its official public source", address: overrides.address || park.address, hours, hoursSchedule: false, cost, accessibility, locationContext: arrival, needToKnow: need, informationSourceLabel: park.sourceLabel, informationSourceUrl: source, informationCheckedAt: checkedAt, imageUrl: image.url, imageSourceUrl: image.source, imageAuthor: image.author, imageLicense: image.license, imageAlt: `${name} at ${park.name}`, images: [{ ...image, alt: `${name} at ${park.name}` }], searchAnswers: detailsAnswers }, source_label: park.sourceLabel, source_url: source, verified_at: checkedAt };
}

function upsertPark(document, park) {
  const index = document.parks.findIndex((candidate) => candidate.id === park.id);
  if (index >= 0) document.parks[index] = park; else document.parks.push(park);
}

async function main() {
  ensureCatalogRows();
  ensureLocations();
  const allPath = path.join(root, "data", "generated", "all-subsites-ready.json");
  const pilotPath = path.join(root, "data", "generated", "pilot-subsites-ready.json");
  const campaignPath = path.join(root, "data", "parent-park-information-enrichment-national.json");
  const all = JSON.parse(fs.readFileSync(allPath, "utf8"));
  const pilot = JSON.parse(fs.readFileSync(pilotPath, "utf8"));
  const campaign = JSON.parse(fs.readFileSync(campaignPath, "utf8"));
  const replacedIds = new Set([
    "launch-dc-washington-kenilworth-park-and-aquatic-gardens",
    "launch-dc-washington-meridian-hill-park",
    "launch-dc-washington-us-national-arboretum",
    "launch-md-potomac-great-falls-tavern-and-olmsted-island",
  ]);
  all.parks = all.parks.filter((park) => !replacedIds.has(park.id));
  pilot.parks = pilot.parks.filter((park) => !replacedIds.has(park.id));
  for (const id of replacedIds) delete campaign.parks[id];

  for (const definition of parks) {
    const city = definition.city || "Washington";
    const state = definition.state || "DC";
    const citySlug = definition.citySlug || "washington-dc";
    const localImages = [];
    for (const item of definition.photos) {
      const url = await downloadPhoto(definition, item);
      localImages.push({ slug: item.slug, url, source: item.source, author: item.author, license: item.license, alt: `${definition.name} in ${city}, ${state}`, latitude: definition.lat, longitude: definition.lon, positionQuality: "Associated with the named destination by its cited source; exact camera coordinates are not published" });
    }
    const searchAnswers = parkAnswers(definition);
    const features = featureRows.filter(([parentId]) => parentId === definition.id).map((row) => makeFeature(definition, row, localImages));
    const hero = localImages[0];
    const existing = all.parks.find((candidate) => candidate.id === definition.id) || {};
    const park = { ...existing, id: definition.id, name: definition.name, type: "Park", city, state, country: "US", citySlug, slug: slugify(definition.name), searchCategory: "park", neighborhood: city, status: "Sourced public-access visitor guide", summary: definition.summary, searchDescription: `Hours, arrival guidance, images, key destinations, and essential visitor questions for ${definition.name} in ${city}, ${state}.`, address: definition.address, latitude: definition.lat, longitude: definition.lon, hours: definition.hours, hoursSchedule: definition.hoursSchedule || null, cost: definition.cost, accessibility: definition.accessibility, sourceLabel: definition.sourceLabel, source: definition.source, verifiedAt: checkedAt, operator: definition.operator, image: hero, images: localImages.slice(1), factSources: {}, sources: [{ label: definition.sourceLabel, url: definition.source }], launchTier: definition.tier, likelySubsites: features.length > 0, publishStatus: "super-enriched", researchQueue: [], transit: definition.transit, searchAnswers, features, amenities: features.map((feature) => feature.name), comments: existing.comments || [] };
    upsertPark(all, park);
    upsertPark(pilot, park);
    campaign.parks[definition.id] = { operator: definition.operator, sourceLabel: definition.sourceLabel, source: definition.source, address: definition.address, summary: definition.summary, hours: definition.hours, hoursSchedule: definition.hoursSchedule || null, cost: definition.cost, accessibility: definition.accessibility, transit: definition.transit, searchAnswers, image: hero, additionalImages: localImages.slice(1), verifiedAt: checkedAt };
  }

  fs.writeFileSync(allPath, `${JSON.stringify(all, null, 2)}\n`);
  fs.writeFileSync(pilotPath, `${JSON.stringify(pilot, null, 2)}\n`);
  fs.writeFileSync(campaignPath, `${JSON.stringify(campaign, null, 2)}\n`);
  console.log(`Super-enriched ${parks.length} Potomac-area guides with ${featureRows.length} focused destinations and ${parks.reduce((sum, park) => sum + park.photos.length, 0)} sourced photos.`);
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
