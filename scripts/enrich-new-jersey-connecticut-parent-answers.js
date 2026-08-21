#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const checkedAt = "2026-08-08";
const additions = {
  "launch-nj-jersey-city-liberty-state-park": [
    {
      intentKey: "fees",
      question: "Is Liberty State Park free to visit?",
      answer: "Yes. New Jersey lists no entrance fee for Liberty State Park. Ferry tickets, boat-launch permits, pavilion rentals, food, marina services, Liberty Science Center admission, and some transportation or parking options are separate costs.",
      sourceLabel: "New Jersey State Park Service",
      source: "https://dep.nj.gov/parksandforests/state-park/liberty-state-park/"
    },
    {
      intentKey: "accessibility",
      question: "How accessible is Liberty State Park?",
      answer: "The developed waterfront promenade links major visitor areas, and the picnic pavilions have adjacent ADA parking and accessible grills. Because the park is long, route to the exact destination and review current construction or shuttle notices rather than assuming every attraction is a short walk from one parking lot.",
      sourceLabel: "New Jersey State Park Service",
      source: "https://dep.nj.gov/parksandforests/state-park/liberty-state-park/"
    }
  ],
  "launch-nj-jersey-city-lincoln-park": [
    {
      intentKey: "public-art",
      question: "What landmarks should I see in Lincoln Park in Jersey City?",
      answer: "The County guide highlights the 1911 entrance fountain, Lincoln the Mystic, the Irish Famine Memorial, Civil War soldier statue, James T. Farrier Firefighter Memorial, historic cannons, and sun houses. These are concentrated mainly in Lincoln Park East; route to a specific landmark instead of the broad park pin.",
      sourceLabel: "Hudson County Parks",
      source: "https://gis.hcnj.us/Images/parks/lincoln-park.pdf"
    }
  ]
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
  for (const answer of answers) {
    merged.set(answer.intentKey, {
      ...answer,
      sourceType: "official",
      verifiedAt: checkedAt,
      checkedAt,
      freshnessClass: "slow",
      status: "verified"
    });
  }
  for (const record of records) {
    record.searchAnswers = [...merged.values()];
    record.verifiedAt = checkedAt;
  }
  console.log(`${id}: ${merged.size} parent answers`);
}

for (const { file, data } of loaded) fs.writeFileSync(path.join(root, file), `${JSON.stringify(data, null, 2)}\n`);
