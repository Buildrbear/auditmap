const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const input = JSON.parse(fs.readFileSync(path.join(root, "data", "nc-enrichment-gap-structured.json"), "utf8"));
const outputPath = path.join(root, "data", "parent-park-information-enrichment-campaign.json");
const output = JSON.parse(fs.readFileSync(outputPath, "utf8"));
const fields = [
  ["entrance", "What address or entrance should I use for", "address"],
  ["parking", "Where should I park for", "parking"],
  ["hours", "When is", "hours"],
  ["fees", "How much does it cost to visit", "cost"],
  ["restroom", "Are there restrooms at", "restroom"],
  ["accessibility", "What accessibility information should I know about", "accessibility"],
  ["trail-surface", "What are the paths or trails like at", "trail"],
  ["playground", "What can families do at", "family"],
  ["dog-area", "Can I bring a dog to", "dogs"],
  ["picnic", "Can I picnic at", "picnic"],
  ["public-art", "What landmarks or areas should I look for at", "landmarks"],
  ["closures", "What closures or conditions can affect", "closures"]
];
for (const place of input.places) {
  output.parks[place.id] = {
    operator: place.operator, sourceLabel: place.sourceLabel, source: place.source,
    hours: place.hours, cost: place.cost, summary: place.summary,
    searchAnswers: fields.map(([intentKey, lead, field]) => ({
      intentKey,
      question: `${lead} ${place.name}?`,
      answer: place[field],
      sourceLabel: place.sourceLabel,
      source: place.source,
      sourceType: "official",
      checkedAt: input.checkedAt
    }))
  };
}
output.checkedAt = input.checkedAt;
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ updatedPlaces: input.places.length, answersPerPlace: fields.length }, null, 2));
