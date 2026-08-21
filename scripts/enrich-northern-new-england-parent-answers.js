#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const checkedAt = "2026-08-08";
const additions = {
  "launch-ri-providence-roger-williams-park": [
    {
      intentKey: "accessibility",
      question: "How accessible is Roger Williams Park?",
      answer: "Accessibility varies across the large historic landscape. Carousel Village has the fully accessible Hasbro Boundless Playground, while individual gardens, bridges, trails, museums, zoo areas, and historic buildings have different surfaces and entrances. Route to the exact destination and confirm that attraction's current access information.",
      sourceLabel: "Roger Williams Park Conservancy",
      source: "https://www.rwpconservancy.org/explore/places-to-go/carousel-village/"
    }
  ],
  "launch-me-portland-eastern-promenade": [
    {
      intentKey: "fees",
      question: "Is Eastern Promenade free?",
      answer: "Yes. General access to the park, public lawns, overlooks, playground, Fort Allen, and multi-use trail is free. Boat-launch use, rail attractions, food, rentals, permits, and some parking or organized activities can have separate costs.",
      sourceLabel: "City of Portland",
      source: "https://www.portlandmaine.gov/1222/5487/Eastern-Promenade"
    },
    {
      intentKey: "accessibility",
      question: "How accessible is Eastern Promenade?",
      answer: "The upper park and lower waterfront trail sit at different elevations. Paved routes and designated parking serve major areas, but stairs, slopes, rail crossings, winter conditions, and the beach approach can change the easiest route. Start from the destination-specific access closest to Fort Allen, the playground, or East End Beach.",
      sourceLabel: "City of Portland",
      source: "https://www.portlandmaine.gov/1222/5487/Eastern-Promenade"
    }
  ],
  "launch-me-portland-deering-oaks-park": [
    {
      intentKey: "accessibility",
      question: "How accessible is Deering Oaks Park?",
      answer: "Developed paths connect the pond, playground, splash area, Castle, courts, fields, and park edges, but historic grades, winter conditions, event setups, and grass routes vary. Use the nearest destination-specific entrance and do not assume the restroom or splash area is open whenever the outdoor park is open.",
      sourceLabel: "City of Portland",
      source: "https://www.portlandmaine.gov/deering-oaks-park"
    }
  ]
};
const hours = {
  "launch-vt-burlington-waterfront-park": "The City does not publish one destination-specific daily gate schedule for Waterfront Park on its current visitor pages. Outdoor access, seasonal restrooms, event closures, parking enforcement, and Greenway conditions follow posted notices and can differ.",
  "launch-vt-burlington-oakledge-park": "The City does not publish one destination-specific daily gate schedule for Oakledge Park on its current visitor pages. Beaches, restrooms, shelters, rentals, parking collection, and winter access are seasonal or condition-dependent."
};
const files = [
  "data/generated/launch-map-places.json",
  "data/parent-park-information-enrichment-national.json",
  "data/parent-park-information-enrichment-campaign.json",
  "data/generated/all-subsites-ready.json",
  "data/generated/pilot-subsites-ready.json"
];

function findRecord(data, id) {
  if (Array.isArray(data)) return data.find((record) => record.id === id);
  if (Array.isArray(data.parks)) return data.parks.find((record) => record.id === id);
  return data.parks?.[id];
}

const loaded = files.map((file) => ({ file, data: JSON.parse(fs.readFileSync(path.join(root, file), "utf8")) }));
for (const [id, answers] of Object.entries(additions)) {
  const records = loaded.map(({ data }) => findRecord(data, id)).filter(Boolean);
  const longest = records.map((record) => record.searchAnswers || []).sort((left, right) => right.length - left.length)[0] || [];
  const merged = new Map(longest.map((answer) => [answer.intentKey, answer]));
  for (const answer of answers) merged.set(answer.intentKey, { ...answer, sourceType: "official", checkedAt, verifiedAt: checkedAt, freshnessClass: "slow", status: "verified" });
  for (const record of records) {
    record.searchAnswers = [...merged.values()];
    record.verifiedAt = checkedAt;
  }
  console.log(`${id}: ${merged.size} parent answers`);
}
for (const [id, value] of Object.entries(hours)) {
  for (const { data } of loaded) {
    const record = findRecord(data, id);
    if (record) {
      record.hours = value;
      record.verifiedAt = checkedAt;
    }
  }
  console.log(`${id}: current official-hours limitation documented`);
}
for (const { file, data } of loaded) fs.writeFileSync(path.join(root, file), `${JSON.stringify(data, null, 2)}\n`);
