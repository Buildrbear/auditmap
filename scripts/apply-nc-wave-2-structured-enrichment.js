const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const input = JSON.parse(fs.readFileSync(path.join(root, "data", "nc-wave-2-structured-enrichment.json"), "utf8"));
const outputPath = path.join(root, "data", "parent-park-information-enrichment-campaign.json");
const output = JSON.parse(fs.readFileSync(outputPath, "utf8"));

function answer(place, intentKey, question, field) {
  return { intentKey, question, answer: place[field], sourceLabel: place.sourceLabel, source: place.source, sourceType: "official", checkedAt: input.checkedAt };
}

for (const place of input.places) {
  output.parks[place.id] = {
    operator: place.operator,
    sourceLabel: place.sourceLabel,
    source: place.source,
    hours: place.hours,
    cost: place.cost,
    summary: place.summary,
    searchAnswers: [
      answer(place, "entrance", `What address or entrance should I use for ${place.name}?`, "address"),
      answer(place, "parking", `Where should I park for ${place.name}?`, "parking"),
      answer(place, "hours", `When is ${place.name} open?`, "hours"),
      answer(place, "fees", `Is ${place.name} free?`, "cost"),
      answer(place, "restroom", `Are there restrooms at ${place.name}?`, "restroom"),
      answer(place, "accessibility", `What accessibility information should I know about ${place.name}?`, "accessibility"),
      answer(place, "trail-surface", `What are the paths or trails like at ${place.name}?`, "trail"),
      answer(place, "playground", `What can families do at ${place.name}?`, "family"),
      answer(place, "dog-area", `Can I bring a dog to ${place.name}?`, "dogs"),
      answer(place, "picnic", `Can I picnic at ${place.name}?`, "picnic"),
      answer(place, "public-art", `What landmarks or areas should I look for at ${place.name}?`, "landmarks"),
      answer(place, "closures", `What closures or conditions can affect ${place.name}?`, "closures")
    ]
  };
}

output.checkedAt = input.checkedAt;
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ updatedPlaces: input.places.length, answersPerPlace: 12 }, null, 2));
