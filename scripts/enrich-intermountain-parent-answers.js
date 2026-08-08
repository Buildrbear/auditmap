#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const checkedAt = "2026-08-08";
const files = [
  "data/parent-park-information-enrichment-national.json",
  "data/parent-park-information-enrichment-campaign.json"
];
const additions = {
  "launch-id-boise-ann-morrison-park": [
    {
      intentKey: "accessibility",
      question: "How accessible is Ann Morrison Park?",
      answer: "The park has paved roads and Greenbelt paths, accessible parking and restrooms, and a large inclusive playground with ramped and ground-level play. Distances across the 153-acre park are substantial, so navigate to the exact playground, Dog Island, field, pavilion, fountain, or river-float destination rather than relying on the general park pin.",
      sourceLabel: "City of Boise Parks and Recreation",
      source: "https://www.cityofboise.org/departments/parks-and-recreation/parks/ann-morrison-park/",
      sourceType: "official"
    },
    {
      intentKey: "fees",
      question: "Is Ann Morrison Park free?",
      answer: "General park entry, playground use, paths, Dog Island, fountain viewing, disc golf, and ordinary drop-in recreation are free. Pavilion reservations, organized field use, permits, river-float shuttle service, concessions, and special events can charge separately.",
      sourceLabel: "City of Boise Parks and Recreation",
      source: "https://www.cityofboise.org/departments/parks-and-recreation/parks/ann-morrison-park/",
      sourceType: "official"
    }
  ],
  "launch-wa-spokane-manito-park": [
    {
      intentKey: "accessibility",
      question: "How accessible is Manito Park?",
      answer: "Major gardens, conservatory approaches, parking areas, and many park paths have paved or firm routes, but grades, gates, seasonal parking closures, and older garden layouts vary by destination. Use the City's park map and exact garden pin, and contact Parks before a visit that depends on a particular step-free route or accommodation.",
      sourceLabel: "City of Spokane Parks and Recreation",
      source: "https://my.spokanecity.org/parks/major/manito/",
      sourceType: "official"
    },
    {
      intentKey: "fees",
      question: "Is Manito Park free?",
      answer: "General park entry, the major public gardens, playgrounds, paths, lawns, Mirror Pond viewing, and Gaiser Conservatory entry are free. Food, reservations, weddings, commercial photography, programs, and special events can charge separately.",
      sourceLabel: "City of Spokane Parks and Recreation",
      source: "https://my.spokanecity.org/parks/major/manito/",
      sourceType: "official"
    }
  ]
};

for (const file of files) {
  const target = path.join(root, file);
  const data = JSON.parse(fs.readFileSync(target, "utf8"));
  let changed = false;
  for (const [id, answers] of Object.entries(additions)) {
    const park = data.parks[id];
    if (!park) continue;
    park.searchAnswers = Array.isArray(park.searchAnswers) ? park.searchAnswers : [];
    for (const item of answers) {
      const answer = { ...item, checkedAt, verifiedAt: checkedAt, freshnessClass: "slow", status: "verified" };
      const index = park.searchAnswers.findIndex((existing) => existing.intentKey === item.intentKey);
      if (index >= 0) park.searchAnswers[index] = answer;
      else park.searchAnswers.push(answer);
    }
    park.verifiedAt = checkedAt;
    changed = true;
    console.log(`${park.name || id}: ${park.searchAnswers.length} parent answers in ${path.basename(file)}`);
  }
  if (changed) fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);
}
