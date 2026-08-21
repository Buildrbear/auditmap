#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const checkedAt = "2026-08-08";
const additions = {
  "launch-ny-buffalo-delaware-park": {
    intentKey: "hours",
    question: "What hours is Delaware Park in Buffalo open?",
    answer: "Delaware Park opens at sunrise and closes at 10:00 p.m. Individual restaurants, restrooms, golf, boats, shelters, museums, the zoo, events, and reserved facilities follow their own schedules and can close earlier.",
    sourceLabel: "City of Buffalo Parks and Recreation",
    source: "https://www.buffalony.gov/332/Department-of-Parks-Recreation",
    sourceType: "official",
    checkedAt
  },
  "launch-ny-rochester-genesee-valley-park": {
    intentKey: "hours",
    question: "What hours is Genesee Valley Park open?",
    answer: "Monroe County lists park hours from 6:00 a.m. to 11:00 p.m. The City-managed sports complex, pool, rink, golf courses, restrooms, shelters, rentals, and boating programs each use separate seasonal schedules.",
    sourceLabel: "Monroe County Parks",
    source: "https://www.monroecounty.gov/files/parks/GVP.pdf",
    sourceType: "official",
    checkedAt
  }
};

for (const file of [
  "data/parent-park-information-enrichment-national.json",
  "data/parent-park-information-enrichment-campaign.json",
  "data/generated/all-subsites-ready.json"
]) {
  const target = path.join(root, file);
  const data = JSON.parse(fs.readFileSync(target, "utf8"));
  for (const [id, addition] of Object.entries(additions)) {
    const record = Array.isArray(data.parks) ? data.parks.find((park) => park.id === id) : data.parks[id];
    if (!record) throw new Error(`${file}: ${id} missing`);
    const merged = new Map((record.searchAnswers || []).map((answer) => [answer.intentKey, answer]));
    merged.set(addition.intentKey, addition);
    record.searchAnswers = [...merged.values()];
    record.verifiedAt = checkedAt;
  }
  fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`${file}: completed Delaware and Genesee Valley hours`);
}
