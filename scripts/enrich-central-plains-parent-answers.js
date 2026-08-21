#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const checkedAt = "2026-08-08";
const additions = {
  "launch-ks-wichita-riverside-park": [
    {
      intentKey: "accessibility",
      question: "How accessible is Central Riverside Park in Wichita?",
      answer: "Convenient sidewalks reach the park's major areas, and the City lists parking and restrooms among its facilities. Individual historic structures, lawn routes, the sand-surface playground, wildlife exhibit, splash pad, bridge approaches, and event setups can differ, so use the closest destination entrance and follow posted accessible routes.",
      sourceLabel: "City of Wichita",
      source: "https://www.wichita.gov/Facilities/Facility/Details/Riverside-Central-Park-43"
    }
  ]
};
const hours = {
  "launch-ks-wichita-riverside-park": "The City publishes facilities and seasonal splash-pad information but does not list one destination-specific daily gate schedule for Central Riverside Park. Use posted park signs and current City alerts; the splash pad, wildlife exhibit, restrooms, events, and other facilities can keep narrower or seasonal hours."
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
