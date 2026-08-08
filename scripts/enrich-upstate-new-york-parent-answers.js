#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const checkedAt = "2026-08-08";
const id = "launch-ny-albany-washington-park";
const answers = [
  {
    intentKey: "hours",
    question: "What hours is Washington Park in Albany open?",
    answer: "The park is open from sunrise to 11:00 p.m. May through October and sunrise to 10:00 p.m. November through April. Restrooms, performances, recreation programs, fountains, and special events use separate schedules.",
    sourceLabel: "City of Albany",
    source: "https://www.albanyny.gov/1894/Parks-Beautification"
  },
  {
    intentKey: "entrance",
    question: "Which entrance should I use for Albany's Washington Park?",
    answer: "Use State Street and Washington Park Road for the northeast playground side, Madison Avenue for the lake and Lake House side, or Willett Street for the central east edge. Navigate to the exact destination because the park is long, hilly, and encircled by one-way and permit-controlled streets.",
    sourceLabel: "City of Albany",
    source: "https://www.albanyny.gov/DocumentCenter/View/7627/Albany-City-PARKS-PDF"
  },
  {
    intentKey: "fees",
    question: "Is Washington Park in Albany free?",
    answer: "General park access, paths, lawns, playground, lake views, monuments, and ordinary recreation are free. Parking restrictions still apply, and permitted events, performances, organized activities, food, or rentals can have separate prices.",
    sourceLabel: "Washington Park Conservancy",
    source: "https://www.washingtonparkconservancy.org/general-park-information/"
  },
  {
    intentKey: "playground",
    question: "Is the Washington Park playground open?",
    answer: "Yes. Albany held the grand opening for the rebuilt inclusive playground in October 2025. It is in the northeast corner near State Street and Washington Park Road; the nearest identified restroom is at the Lake House more than 600 feet away, so plan that walk before children start playing.",
    sourceLabel: "City of Albany",
    source: "https://www.albanyny.gov/2259/Washington-Park-Playground"
  },
  {
    intentKey: "dog-area",
    question: "Are dogs allowed in Albany's Washington Park?",
    answer: "Yes, dogs are welcome on leash and handlers must clean up after them. There is no sanctioned off-leash dog park inside Washington Park, so lawns, paths, the lake edge, and recreation areas are not off-leash exceptions.",
    sourceLabel: "Washington Park Conservancy",
    source: "https://www.washingtonparkconservancy.org/general-park-information/"
  },
  {
    intentKey: "trail-surface",
    question: "What are the walking paths like at Washington Park?",
    answer: "The park has developed paved and compacted paths around the lake, lawns, monuments, and recreation areas, with noticeable slopes in several sections. Winter ice, event fencing, construction, and steep approaches can change the easiest route, so use the destination pin rather than assuming a flat loop.",
    sourceLabel: "Washington Park Conservancy",
    source: "https://www.washingtonparkconservancy.org/general-park-information/"
  },
  {
    intentKey: "accessibility",
    question: "How accessible is Albany's Washington Park?",
    answer: "Accessibility varies because the historic landscape includes hills and older paths. The rebuilt playground was designed around universal and ADA-accessible play routes, but the nearest restroom remains at the Lake House and not every park approach is equally level. Use the State Street and Washington Park Road side for the playground and confirm any required route before arrival.",
    sourceLabel: "City of Albany",
    source: "https://www.albanyny.gov/2259/Washington-Park-Playground"
  },
  {
    intentKey: "picnic",
    question: "Can I picnic in Washington Park?",
    answer: "Yes. Albany's park inventory lists picnic tables, and lawns support casual first-come picnics. Organized gatherings, vendors, amplified sound, exclusive areas, or large attendance require City permits; parking on park grass is prohibited.",
    sourceLabel: "City of Albany",
    source: "https://www.albanyny.gov/DocumentCenter/View/7627/Albany-City-PARKS-PDF"
  },
  {
    intentKey: "public-art",
    question: "What should I see in Albany's Washington Park?",
    answer: "Major landmarks include Washington Park Lake and Lake House, King Memorial Fountain, Park Playhouse, historic monuments, mature trees, seasonal flower beds, and the newly rebuilt playground. Tulip Festival is the best-known seasonal event, but event fencing and crowds substantially change an ordinary park visit.",
    sourceLabel: "Washington Park Conservancy",
    source: "https://www.washingtonparkconservancy.org/monuments-and-memorials/"
  },
  {
    intentKey: "closures",
    question: "What can change access at Washington Park?",
    answer: "Tulip Festival, performances, permitted events, playground or landscape projects, snow emergencies, maintenance, and severe weather can change roads, parking, paths, restrooms, and recreation access. Check current City notices and the specific event page before a time-sensitive visit.",
    sourceLabel: "City of Albany",
    source: "https://www.albanyny.gov/2108/Special-Events-Application"
  }
].map((answer) => ({ ...answer, sourceType: "official", checkedAt }));

const files = [
  "data/parent-park-information-enrichment-national.json",
  "data/parent-park-information-enrichment-campaign.json",
  "data/generated/all-subsites-ready.json",
  "data/generated/pilot-subsites-ready.json"
];

let canonicalAnswers;
for (const file of files) {
  const target = path.join(root, file);
  const data = JSON.parse(fs.readFileSync(target, "utf8"));
  const record = Array.isArray(data.parks) ? data.parks.find((park) => park.id === id) : data.parks[id];
  if (!record) {
    console.log(`${file}: Washington Park is outside this cache; skipped`);
    continue;
  }
  const startingAnswers = canonicalAnswers || record.searchAnswers || [];
  const merged = new Map(startingAnswers.map((answer) => [answer.intentKey, answer]));
  for (const answer of answers) merged.set(answer.intentKey, answer);
  record.searchAnswers = [...merged.values()];
  canonicalAnswers ||= record.searchAnswers;
  record.verifiedAt = checkedAt;
  fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`${file}: ${record.searchAnswers.length} Washington Park answers`);
}
