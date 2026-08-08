#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const checkedAt = "2026-08-05";
const parkId = "launch-ny-new-york-city-central-park";
const downloadImages = process.argv.includes("--download");
const officialMap = "https://assets.centralparknyc.org/media/documents/CPCWeb_Downloadablemaps_2022_GeneralCPMap_Final_2022-12-06-163931_nzin.pdf";
const accessibilityMap = "https://assets.centralparknyc.org/new_images/map/Central-Park-Accessibility-Map.pdf";
const parkSource = "https://www.centralparknyc.org/plan-a-visit";

const dailySchedule = {
  sunday: [["06:00", "25:00"]], monday: [["06:00", "25:00"]],
  tuesday: [["06:00", "25:00"]], wednesday: [["06:00", "25:00"]],
  thursday: [["06:00", "25:00"]], friday: [["06:00", "25:00"]],
  saturday: [["06:00", "25:00"]],
};

function stableUuid(slug) {
  const bytes = crypto.createHash("sha256").update(`auditmap:${parkId}:${slug}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const location = (slug) => `https://www.centralparknyc.org/locations/${slug}`;

const places = [
  {
    slug: "pond-gapstow-bridge", name: "The Pond & Gapstow Bridge", type: "water", category: "South end landmarks",
    latitude: 40.76664, longitude: -73.97421, page: location("the-pond"),
    description: "The southeast-corner landscape pairs a five-acre pond, skyline views, Gapstow Bridge, and the wooded Hallett edge in one of Central Park's easiest short scenic loops.",
    arrival: "Enter at Grand Army Plaza near Fifth Avenue and 59th Street for the shortest approach. Columbus Circle is across the entire south end and is not the closest gate.",
    restrooms: "There is no restroom at Gapstow Bridge. The nearest dependable options are generally the Dairy, Heckscher Playground, Wollman Rink when operating, or facilities inside the Zoo with admission or purchase rules.",
    need: "The bridge and east shoreline become congested at photo times. Paths include slopes, steps, and rock edges; use the official accessibility map for a step-free approach.",
  },
  {
    slug: "hallett-nature-sanctuary", name: "Hallett Nature Sanctuary", type: "nature", category: "Woodlands & trails",
    latitude: 40.76658, longitude: -73.97491, page: location("hallett-nature-sanctuary"),
    description: "A restored four-acre woodland and rocky overlook above the Pond with winding paths, native habitat, and a quieter experience just inside the southeast corner.",
    arrival: "Use the Sixth Avenue or Grand Army Plaza side of Central Park South, then follow the Pond to the sanctuary entrance. The interior is not a through-route.",
    restrooms: "There are no restrooms inside the sanctuary. Use the Dairy or Heckscher facilities before entering.",
    need: "Narrow rustic paths, stairs, rocks, mud, and periodic ecological closures make this unsuitable as a guaranteed wheelchair or stroller route. Dogs, bikes, food, and picking plants are not appropriate inside.",
  },
  {
    slug: "central-park-zoo", name: "Central Park Zoo & Tisch Children's Zoo", type: "museum", category: "Family attractions",
    latitude: 40.76770, longitude: -73.97170, page: "https://www.centralparknyc.org/activities/guides/visiting-the-central-park-zoo",
    description: "A separately ticketed Wildlife Conservation Society zoo with tropical, temperate, and polar habitats; admission includes the Tisch Children's Zoo.",
    arrival: "Use Fifth Avenue between East 63rd and 66th Streets. The zoo is near the southeast corner, not near the park's geographic center.",
    restrooms: "Accessible customer restrooms and food are inside the ticketed zoo. The Conservancy notes that zoo restroom access requires a purchase.",
    need: "Reserve a date-specific ticket, review security and bag rules, and use the Wildlife Conservation Society schedule rather than general park hours. The sea lion feeding and Delacorte Clock are useful timing anchors.",
  },
  {
    slug: "wollman-rink", name: "Wollman Rink", type: "recreation", category: "Seasonal recreation",
    latitude: 40.76774, longitude: -73.97447, page: location("wollman-rink"),
    description: "The seasonal rink below the south-end skyline operates as an ice-skating destination in colder months and hosts separate warm-season programming.",
    arrival: "Enter from Central Park South near Sixth Avenue or Grand Army Plaza. Follow signs downhill; do not route to the Central Park center pin.",
    restrooms: "Customer facilities are available during rink operations. Heckscher Playground and the Dairy are the nearest public alternatives outside the venue.",
    need: "Admission, skate rentals, sessions, lockers, weather rules, and event access are controlled by the operator and change seasonally. Buy the correct dated session before arriving.",
  },
  {
    slug: "heckscher-playground", name: "Heckscher Playground & Ballfields", type: "playground", category: "Playgrounds & sports",
    latitude: 40.76878, longitude: -73.97659, page: location("heckscher-playground"),
    description: "Central Park's largest playground combines climbers, swings, slides, rock outcrops, sand, seasonal water play, and adjacent ballfields near the southwest corner.",
    arrival: "Enter from Central Park West near West 61st to 63rd Streets. Columbus Circle is the most useful major transit hub for this area.",
    restrooms: "The adjacent accessible restroom is normally open 6:30 a.m.-9 p.m. year-round; confirm any current closure before a family visit.",
    need: "The play area is large and has multiple levels and exits. Bring water shoes and dry clothes in spray season, supervise closely around rock and water areas, and expect weekend crowds.",
  },
  {
    slug: "dairy-carousel", name: "The Dairy & Central Park Carousel", type: "visitor_center", category: "Visitor services & rides",
    latitude: 40.76953, longitude: -73.97448, page: location("dairy-visitor-center"),
    description: "The historic Dairy visitor center provides maps, staff guidance, and gifts near the separately operated Central Park Carousel and Chess & Checkers House.",
    arrival: "Enter from Central Park South near Sixth or Seventh Avenue. The Dairy is east of the Carousel and north of Wollman Rink.",
    restrooms: "Public restrooms are available near the Dairy and Heckscher area; carousel access and hours are separate from visitor-center service.",
    need: "Start here when you need a paper map or human directions. Check the Carousel's same-day operating schedule and payment rules before promising a ride.",
  },
  {
    slug: "sheep-meadow-tavern-on-the-green", name: "Sheep Meadow & Tavern on the Green", type: "lawn", category: "Lawns & picnics",
    latitude: 40.77174, longitude: -73.97556, page: location("sheep-meadow"),
    description: "A 15-acre sunbathing and picnic lawn near the southwest side, with skyline views and Tavern on the Green immediately west of the meadow.",
    arrival: "Use Central Park West near West 66th or 67th Street. Columbus Circle is a longer but straightforward southern approach.",
    restrooms: "Public restrooms are beside Tavern on the Green. Restaurant seating and restrooms can follow separate customer rules during events.",
    need: "The fenced lawn closes seasonally and after wet weather. Dogs, bikes, organized sports, amplified sound, tents, and chairs that damage turf are restricted; check alerts before carrying a full picnic.",
  },
  {
    slug: "mall-literary-walk", name: "The Mall & Literary Walk", type: "landmark", category: "Promenades & art",
    latitude: 40.77115, longitude: -73.97241, page: location("the-mall-literary-walk"),
    description: "The park's broad elm-lined promenade leads from Literary Walk and its statues toward Bethesda Terrace, with the Naumburg Bandshell along the east edge.",
    arrival: "Enter near East 66th or 72nd Street for the shortest east-side approach, or walk north from the Dairy. The Mall runs north-south between roughly 66th and 72nd Streets.",
    restrooms: "Bethesda Terrace has a seasonal restroom at the north end; the Dairy and Zoo area provide alternatives farther south.",
    need: "This is a high-traffic pedestrian spine with performers, vendors, and events. Bicycles should be walked on pedestrian-only paths, and the Bandshell may alter circulation during programs.",
  },
  {
    slug: "bethesda-terrace-fountain", name: "Bethesda Terrace & Fountain", type: "landmark", category: "Iconic landmarks",
    latitude: 40.77422, longitude: -73.97086, page: location("bethesda-terrace"),
    description: "Central Park's architectural heart combines two terrace levels, the tiled Arcade, Bethesda Fountain, Lake overlook, musicians, and direct connections to the Mall and Ramble.",
    arrival: "Use the East or West 72nd Street entrance and follow Terrace Drive toward mid-park. The west approach is useful from the B/C subway; the east approach is useful from Fifth Avenue buses.",
    restrooms: "The seasonal restroom is normally open 6:30 a.m.-9 p.m. from late March through early November and is not wheelchair accessible.",
    need: "The monumental stair is not the accessible route. Use the side ramps and official accessibility map; crowds, weddings, filming, and performances can make the Arcade and fountain edge slow to cross.",
  },
  {
    slug: "lake-bow-bridge-loeb-boathouse", name: "The Lake, Bow Bridge & Loeb Boathouse", type: "water", category: "Water & boating",
    latitude: 40.77543, longitude: -73.97020, page: location("the-lake"),
    description: "The Lake links rowboat views, Bow Bridge, the Ramble shoreline, Cherry Hill, and the Loeb Boathouse dining and boating area in Central Park's busiest scenic cluster.",
    arrival: "Use West 72nd Street for Bow Bridge and Cherry Hill or East 72nd to 74th Street for the Boathouse. Choose the side for your first stop rather than crossing the Ramble by accident.",
    restrooms: "Restrooms are available around Bethesda Terrace seasonally and at the Loeb Boathouse during operating hours; customer access and closures can vary.",
    need: "Rowboats, gondola service, dining, and concessions use separate seasonal schedules and fees. Bow Bridge is pedestrian-only and extremely crowded at peak photo times.",
  },
  {
    slug: "strawberry-fields", name: "Strawberry Fields & Imagine Mosaic", type: "memorial", category: "Memorials & quiet zones",
    latitude: 40.77537, longitude: -73.97484, page: location("strawberry-fields"),
    description: "The living memorial to John Lennon centers on the Imagine mosaic in a designated quiet landscape just inside the west side near West 72nd Street.",
    arrival: "Enter at Central Park West and West 72nd Street. The B/C 72nd Street station is the closest subway stop.",
    restrooms: "There is no restroom at the mosaic. Tavern on the Green, Bethesda Terrace seasonally, and nearby outside-park businesses are the practical alternatives.",
    need: "The mosaic area is compact and often crowded with visitors and performers. Keep pathways clear and treat the surrounding planted landscape as a quiet memorial, not a picnic or play lawn.",
  },
  {
    slug: "conservatory-water-alice", name: "Conservatory Water & Alice in Wonderland", type: "family", category: "Family landmarks",
    latitude: 40.77456, longitude: -73.96681, page: location("conservatory-water"),
    description: "The model-boat pond is ringed by benches and family landmarks including Alice in Wonderland and Hans Christian Andersen, with Kerbs Boathouse on the east shore.",
    arrival: "Enter from Fifth Avenue near East 72nd to 75th Street. This is much closer to the east edge than to Bethesda Terrace or Central Park West.",
    restrooms: "There is no guaranteed restroom at the Alice sculpture. Check Kerbs Boathouse operations or use nearby east-side facilities shown on the official restroom map.",
    need: "Model-boat rentals and programs are seasonal. The Alice sculpture is climbable but becomes crowded and hot; supervise children and do not enter the pond.",
  },
  {
    slug: "ramble", name: "The Ramble", type: "nature", category: "Woodlands & trails",
    latitude: 40.77738, longitude: -73.96940, page: location("the-ramble"),
    description: "A 36-acre woodland of winding paths, rock outcrops, streams, rustic bridges, bird habitat, and deliberately indirect routes between the Lake and Belvedere Castle.",
    arrival: "Enter from Bethesda Terrace, Bow Bridge, the Boathouse, or Belvedere Castle depending on the route. Save your intended exit before going in.",
    restrooms: "There are no restrooms inside the Ramble. Use Bethesda Terrace seasonally, the Boathouse when operating, or Belvedere-area facilities before entering.",
    need: "Expect stairs, roots, rocks, mud, low sightlines, and confusing forks. It is a rewarding birding walk but not a dependable shortcut, fast stroller route, or uniformly accessible trail.",
  },
  {
    slug: "belvedere-shakespeare-turtle-pond", name: "Belvedere Castle, Shakespeare Garden & Turtle Pond", type: "landmark", category: "Views & gardens",
    latitude: 40.77948, longitude: -73.96903, page: location("belvedere-castle"),
    description: "A compact mid-park cluster combines castle terraces and skyline views, a hillside literary garden, Turtle Pond, the Swedish Cottage, and access toward the Ramble and Great Lawn.",
    arrival: "Use Central Park West near West 79th or 81st Street for Shakespeare Garden and the Delacorte side, or Fifth Avenue near East 79th for a longer cross-park approach.",
    restrooms: "Belvedere's visitor-center hours and nearby restrooms are shorter than park hours. The Delacorte area can provide seasonal facilities during operations.",
    need: "The direct scenic approaches involve hills and stairs. Use the accessibility map for the step-free castle route, and check interior or restoration closures before visiting specifically for the observation decks.",
  },
  {
    slug: "delacorte-theater", name: "Delacorte Theater", type: "event_space", category: "Performances",
    latitude: 40.78026, longitude: -73.96879, page: location("delacorte-theater"),
    description: "The open-air theater beside Belvedere Castle is home to Shakespeare in the Park and other seasonal performances with event-specific ticketing and security procedures.",
    arrival: "Use Central Park West near West 81st Street and follow signs past the Swedish Cottage. Event queues and accessible entry may use designated routes.",
    restrooms: "Restroom access is tied to theater operations and nearby seasonal facilities. Do not assume the venue is open outside an event.",
    need: "A public park entrance does not provide theater admission. Confirm the production calendar, ticket-distribution method, arrival deadline, bag policy, weather procedure, and accessible seating before the performance day.",
  },
  {
    slug: "great-lawn-pinetum", name: "Great Lawn & Arthur Ross Pinetum", type: "lawn", category: "Lawns & sports",
    latitude: 40.78186, longitude: -73.96667, page: location("great-lawn"),
    description: "The central oval and surrounding landscape support picnics, sunbathing, permitted ballfields, concerts, basketball, volleyball, and shaded conifer seating in the Pinetum.",
    arrival: "Use east or west entrances near 79th to 86th Streets. Choose the side closest to your field, picnic edge, or museum connection.",
    restrooms: "The Conservancy lists no restroom on the Great Lawn itself. Use facilities near Belvedere, the Metropolitan Museum edge, or North Meadow as shown on the official map.",
    need: "The oval closes for winter and can close after rain or for major events. Organized ball play needs the appropriate permit; the tree-lined edge and Pinetum offer shade when the center is exposed.",
  },
  {
    slug: "obelisk-metropolitan-museum", name: "The Obelisk & Metropolitan Museum Edge", type: "landmark", category: "Museums & history",
    latitude: 40.77980, longitude: -73.96545, page: location("obelisk"),
    description: "The approximately 3,500-year-old Egyptian Obelisk, commonly called Cleopatra's Needle, stands west of the Metropolitan Museum in a shaded historic setting.",
    arrival: "Use the Fifth Avenue entrance at East 79th or 81st Street. The museum and park are separate destinations with separate entrances, hours, security, and admission policies.",
    restrooms: "The Obelisk has no restroom. Museum restrooms require museum access; use the official park restroom map for public alternatives.",
    need: "This is a free outdoor monument, not a museum annex. Pair it with the Great Lawn, Turtle Pond, or the Met only after checking each destination's hours and walking route.",
  },
  {
    slug: "reservoir-running-track", name: "Jacqueline Kennedy Onassis Reservoir & Running Track", type: "trail", category: "Running & views",
    latitude: 40.78548, longitude: -73.96208, page: location("reservoir"),
    description: "The 106-acre Reservoir is encircled by the 1.58-mile Stephanie and Fred Shuman Running Track, with skyline views and entrances from both park sides.",
    arrival: "Use entrances between roughly 86th and 96th Streets. Select east or west based on transit; the track has limited entry points and does not connect at every street.",
    restrooms: "There are no restrooms on the running track. Use Great Lawn, North Meadow, tennis, or outside-park facilities before starting a lap.",
    need: "The soft-surface track is pedestrian-only and follows the posted one-way direction. It can be narrow and crowded; bicycles, strollers used as vehicles, and dogs are restricted on the track.",
  },
  {
    slug: "east-meadow-cedar-hill", name: "East Meadow & Cedar Hill", type: "lawn", category: "Lawns & picnics",
    latitude: 40.78700, longitude: -73.95720, page: location("east-meadow"),
    description: "East-side lawns offer room for picnics, informal play, sledding terrain at Cedar Hill, and quieter alternatives to the Great Lawn and Sheep Meadow.",
    arrival: "Use Fifth Avenue entrances near East 79th for Cedar Hill or East 97th to 100th Streets for East Meadow. These are separate landscapes, not one continuous flat lawn.",
    restrooms: "Restroom options vary by latitude; use the Metropolitan Museum edge, North Meadow, or the official restroom map rather than assuming a lawn facility.",
    need: "Lawns close for restoration and wet conditions. Cedar Hill is sloped and popular for winter sledding, while East Meadow is farther north and better for a less crowded picnic.",
  },
  {
    slug: "rumsey-playfield-summerstage", name: "Rumsey Playfield & SummerStage", type: "event_space", category: "Performances",
    latitude: 40.77259, longitude: -73.97021, page: location("rumsey-playfield"),
    description: "The east-side event venue hosts SummerStage concerts, dance, festivals, and community programming with event-specific entry, capacity, and security rules.",
    arrival: "Enter from Fifth Avenue near East 69th or 72nd Street. Event lines may form along East Drive, so use the organizer's designated gate.",
    restrooms: "Temporary or venue restrooms are provided during many events; outside event hours use Bethesda, Zoo, or Dairy-area public facilities.",
    need: "Free does not always mean walk-in: popular events can require RSVP, security screening, early arrival, or reach capacity. Check weather, prohibited items, and accessibility instructions on the event listing.",
  },
  {
    slug: "north-meadow-recreation-center", name: "North Meadow Recreation Center & Fields", type: "sports", category: "Sports & recreation",
    latitude: 40.79122, longitude: -73.95953, page: location("north-meadow-recreation-center"),
    description: "A major sports complex with baseball, softball, soccer, handball, basketball, field access, and a recreation center near the north side of the Reservoir.",
    arrival: "Use Central Park West near West 97th or Fifth Avenue near East 97th, then follow the transverse-area paths. Field numbers matter, so save the exact permit location.",
    restrooms: "The recreation center provides public restrooms on its published schedule. Seasonal or maintenance closures can leave a long walk to alternatives.",
    need: "Organized field use requires permits and fields close when wet. Confirm the field number, league instructions, equipment rules, and same-day field status before crossing the park.",
  },
  {
    slug: "pool-loch-ravine", name: "The Pool, Loch & Ravine", type: "nature", category: "Woodlands & trails",
    latitude: 40.79518, longitude: -73.95940, page: location("the-pool"),
    description: "A connected north-end water and woodland route follows the Pool into the Loch and Ravine through waterfalls, rustic bridges, rock outcrops, and dense canopy.",
    arrival: "Enter from Central Park West near West 100th to 103rd Street for the Pool, or from the north/east for the Ravine. Decide whether you want a loop or a one-way woodland crossing.",
    restrooms: "There are no restrooms along much of the woodland route. Use North Meadow, the Davis Center, or Dana Discovery Center before entering.",
    need: "Surfaces include dirt, roots, rocks, stairs, mud, and narrow bridges. Cell position can be imprecise under canopy; download the map and avoid treating this as a fast accessible shortcut.",
  },
  {
    slug: "north-woods-blockhouse", name: "North Woods & Blockhouse No. 1", type: "nature", category: "Woodlands & history",
    latitude: 40.79815, longitude: -73.95650, page: location("north-woods"),
    description: "Central Park's largest woodland combines steep rocky paths, the Ravine, overlooks, and the 1814 Blockhouse near the park's northern edge.",
    arrival: "Use Central Park West near West 106th to 110th Street for the Blockhouse or the Harlem Meer/Davis Center side for an east-to-west route.",
    restrooms: "There are no restrooms at the Blockhouse. Use the Davis Center, Dana Discovery Center, Great Hill, or North Meadow facilities before entering.",
    need: "The Blockhouse interior is normally closed and the ruin is reached by an uphill trail. Expect steep grades, uneven rock, mud, stairs, and confusing forks; use daylight and a downloaded map.",
  },
  {
    slug: "great-hill", name: "Great Hill", type: "lawn", category: "Lawns & picnics",
    latitude: 40.79690, longitude: -73.95891, page: location("great-hill"),
    description: "A high, open northwestern lawn ringed by mature trees, with picnic tables, a soft running loop, nearby playground, and a more neighborhood-scale atmosphere.",
    arrival: "Enter from Central Park West near West 103rd or 106th Street. The lawn sits uphill and is not close to the park's midtown attractions.",
    restrooms: "Check the official map for Great Hill and nearby playground restroom hours; North Meadow and Davis Center are farther alternatives.",
    need: "The climb and surrounding paths vary in slope. The lawn can close after rain or for restoration, and organized gatherings of 20 or more require a permit.",
  },
  {
    slug: "conservatory-garden", name: "Conservatory Garden", type: "garden", category: "Gardens & quiet zones",
    latitude: 40.79368, longitude: -73.95228, page: location("conservatory-garden"),
    description: "Central Park's six-acre formal garden contains distinct Italian, French, and English landscapes, fountains, pergolas, sculpture, lawns, and seasonal planting.",
    arrival: "Use the accessible Fifth Avenue entrance near East 105th Street. This avoids a long cross-park walk and the steep northern interior terrain.",
    restrooms: "The garden does not provide a public restroom inside every section. Dana Discovery Center and Davis Center are the main nearby north-end options.",
    need: "The garden is normally open 8 a.m. to dusk, shorter than park hours. It is a quiet zone: dogs, bikes, scooters, ball play, picnics, and picking flowers are not allowed; check restoration notices.",
  },
  {
    slug: "harlem-meer-dana-center", name: "Harlem Meer & Dana Discovery Center", type: "water", category: "North end family areas",
    latitude: 40.79660, longitude: -73.95185, page: location("harlem-meer"),
    description: "The northeast-corner lake offers shoreline paths, benches, lawns, wildlife, family programs, catch-and-release fishing, and the Charles A. Dana Discovery Center.",
    arrival: "Use Fifth Avenue or Lenox Avenue near 110th Street. The 2/3 subway at Central Park North is the closest major rail arrival for the north edge.",
    restrooms: "Dana Discovery Center restrooms are normally open 6:30 a.m.-9 p.m. daily, year-round, and include a wheelchair-accessible restroom.",
    need: "Do not swim or wade in the Meer. Fishing, equipment, algae conditions, events, and shoreline access can change; use the Davis Center for the official seasonal pool or rink.",
  },
  {
    slug: "davis-center", name: "Davis Center at the Harlem Meer", type: "recreation", category: "Pools, skating & community",
    latitude: 40.79612, longitude: -73.95461, page: location("the-davis-center"),
    description: "A year-round north-end facility transforms seasonally between the free Gottesman Pool, an ice rink, the Harlem Oval turf, community programs, and an indoor gathering space.",
    arrival: "Use the east side between 106th and 108th Streets. The official address is 106-51 East Drive; Fifth Avenue and Central Park North transit are the practical approaches.",
    restrooms: "Accessible restrooms, family-friendly gender-neutral shower rooms, and changing facilities follow seasonal operating schedules and may be limited to pool users in summer.",
    need: "For the 2026 pool season, free public swimming is scheduled June 27-September 13, 11 a.m.-7 p.m., with a 3-4 p.m. cleaning closure. Pool rules, lap-swim registration, food restrictions, rink fees, and program schedules are separate.",
  },
];

function answer(intentKey, question, text, source) {
  return { intentKey, question, answer: text, sourceLabel: "Central Park Conservancy", source, sourceType: "official-partner", checkedAt };
}

function questions(place) {
  const hours = place.hours || "Central Park is open daily 6 a.m.-1 a.m., but this destination, restroom, lawn, attraction, concession, or event may use a shorter or seasonal schedule. Check the linked official page and current alerts before a feature-specific trip.";
  const accessibility = place.accessibility || `Central Park has accessible entrances and mapped barrier-free routes, but slopes, stairs, historic paving, woodland trails, and temporary closures vary around ${place.name}. Use the official accessibility map for the exact approach.`;
  return [
    answer("location", `Where is ${place.name} in Central Park?`, place.arrival, place.page),
    answer("transit", `Which entrance or subway should I use for ${place.name}?`, `${place.arrival} Choose transit for that edge of the park rather than routing to Central Park's center pin.`, place.page),
    answer("restroom", `Where are the nearest restrooms to ${place.name}?`, place.restrooms, "https://www.centralparknyc.org/restrooms"),
    answer("hours", `When can I visit ${place.name}?`, hours, place.page),
    answer("accessibility", `What accessibility details should I know about ${place.name}?`, accessibility, accessibilityMap),
    answer("need-to-know", `What should I know before visiting ${place.name}?`, place.need, place.page),
  ];
}

function decodeHtml(value) {
  return String(value || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}

async function officialPhoto(place) {
  const response = await fetch(place.page, { headers: { "User-Agent": "AuditMap official-source enrichment/1.0" } });
  if (!response.ok) throw new Error(`${place.name}: official page returned ${response.status}`);
  const html = await response.text();
  const imageUrl = decodeHtml(html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i)?.[1] || html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1]);
  if (!imageUrl) throw new Error(`${place.name}: official page has no social image`);
  const imageResponse = await fetch(imageUrl, { headers: { "User-Agent": "AuditMap official-source enrichment/1.0" } });
  if (!imageResponse.ok) throw new Error(`${place.name}: official image returned ${imageResponse.status}`);
  const outputDirectory = path.join(root, "assets", "parks", "central-park", "flagship", place.slug);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, "hero.webp");
  await sharp(Buffer.from(await imageResponse.arrayBuffer())).rotate().resize(1600, 1000, { fit: "cover", position: "attention" }).webp({ quality: 82 }).toFile(outputPath);
  return `/assets/parks/central-park/flagship/${place.slug}/hero.webp`;
}

async function main() {
  const allPath = path.join(root, "data", "generated", "all-subsites-ready.json");
  const pilotPath = path.join(root, "data", "generated", "pilot-subsites-ready.json");
  const campaignPath = path.join(root, "data", "parent-park-information-enrichment-campaign.json");
  const all = JSON.parse(fs.readFileSync(allPath, "utf8"));
  const pilot = JSON.parse(fs.readFileSync(pilotPath, "utf8"));
  const campaign = JSON.parse(fs.readFileSync(campaignPath, "utf8"));
  const existing = all.parks.find((park) => park.id === parkId);
  if (!existing) throw new Error("Central Park subsite source record not found");

  const features = [];
  for (const place of places) {
    const localImage = `/assets/parks/central-park/flagship/${place.slug}/hero.webp`;
    const imagePath = path.join(root, localImage.slice(1));
    if (!fs.existsSync(imagePath)) {
      if (!downloadImages) throw new Error(`${place.name}: run with --download to obtain the official image`);
      await officialPhoto(place);
      process.stdout.write(`Downloaded ${place.name}\n`);
    }
    features.push({
      id: stableUuid(place.slug), slug: place.slug, name: place.name, feature_type: place.type,
      description: place.description, latitude: place.latitude, longitude: place.longitude,
      details: {
        category: place.category, includeInParentGallery: true, positionQuality: "Destination center cross-checked against OpenStreetMap and the official Central Park map",
        officialMapUrl: officialMap, address: "Central Park", hours: place.hours || "Central Park is open daily 6 a.m.-1 a.m.; this destination may have shorter or seasonal hours.",
        hoursSchedule: place.hoursSchedule || false, cost: place.cost || "General landscape access is free; attractions, rentals, food, tickets, and programs may charge separately.",
        accessibility: place.accessibility || `Route conditions vary around ${place.name}; use the official accessibility map for a destination-specific barrier-free approach.`,
        amenities: place.amenities || [], locationContext: place.arrival, needToKnow: place.need,
        informationSourceLabel: "Central Park Conservancy", informationSourceUrl: place.page, informationCheckedAt: checkedAt,
        imageUrl: localImage, imageSourceUrl: place.page, imageAuthor: "Central Park Conservancy", imageLicense: "Official Central Park Conservancy image; attribution retained", imageAlt: `${place.name} in Central Park`,
        images: [{ url: localImage, source: place.page, author: "Central Park Conservancy", license: "Official Central Park Conservancy image; attribution retained", alt: `${place.name} in Central Park`, latitude: place.latitude, longitude: place.longitude, featureId: stableUuid(place.slug) }],
        searchAnswers: questions(place),
      },
      source_label: "Central Park Conservancy", source_url: place.page, verified_at: checkedAt,
    });
  }

  const updatedPark = { ...existing, features, researchQueue: [] };
  for (const document of [all, pilot]) {
    const index = document.parks.findIndex((park) => park.id === parkId);
    document.parks[index] = updatedPark;
  }
  fs.writeFileSync(allPath, `${JSON.stringify(all, null, 2)}\n`);
  fs.writeFileSync(pilotPath, `${JSON.stringify(pilot, null, 2)}\n`);

  const parent = campaign.parks[parkId];
  const parentPhotos = features.map((feature) => feature.details.images[0]);
  const parentHero = features.find((feature) => feature.slug === "bethesda-terrace-fountain")?.details.images[0] || parentPhotos[0];
  campaign.parks[parkId] = {
    ...parent,
    address: "Central Park",
    hoursSchedule: dailySchedule,
    image: parentHero,
    additionalImages: parentPhotos.filter((photo) => photo.url !== parentHero.url),
    verifiedAt: checkedAt,
  };
  fs.writeFileSync(campaignPath, `${JSON.stringify(campaign, null, 2)}\n`);
  console.log(`Updated Central Park with ${features.length} flagship destinations and ${parent.searchAnswers?.length || 0} parent answers.`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
