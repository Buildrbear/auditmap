const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const input = process.argv[2];
const checkpoint = process.argv[3] || "7d";
if (!input) throw new Error("Usage: node scripts/import-passport-campaign-events.js <event-export.json> [24h|7d]");
if (!["24h", "7d"].includes(checkpoint)) throw new Error("Checkpoint must be 24h or 7d");

const campaignPath = path.join(root, "data/discovery-campaigns/raleigh-passport-pilot.json");
const resultsPath = path.join(root, "data/discovery-campaigns/raleigh-passport-pilot-results.json");
const campaign = JSON.parse(fs.readFileSync(campaignPath, "utf8"));
const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const source = JSON.parse(fs.readFileSync(path.resolve(root, input), "utf8"));
const events = Array.isArray(source) ? source : source.events;
if (!Array.isArray(events)) throw new Error("Event export must be an array or an object with an events array");

const nameOf = (event) => event.name || event.event || event.eventName;
const propsOf = (event) => event.properties || event.props || {};
const contentOf = (event) => String(event.content || propsOf(event).content || "").replace(/_share$/, "");
const count = (content, name, predicate = () => true) => events.filter((event) => contentOf(event) === content && nameOf(event) === name && predicate(propsOf(event))).length;

for (const variant of campaign.variants) {
  const result = results.variants.find(({ id }) => id === variant.id);
  const previous = result.checkpoints[checkpoint] || {};
  result.checkpoints[checkpoint] = {
    socialImpressions: previous.socialImpressions ?? null,
    socialEngagements: previous.socialEngagements ?? null,
    passportOpens: count(variant.utmContent, "Explorer passport opened"),
    placesMarked: count(variant.utmContent, "Explorer place marked", (properties) => properties.marked !== false),
    progressShares: count(variant.utmContent, "Explorer progress shared"),
    sharedPassportOpens: count(variant.utmContent, "Shared passport opened"),
    contributionIntents: count(variant.utmContent, "Explorer contribution opened"),
    crumbSubmissions: count(variant.utmContent, "Crumb submitted"),
    nonTeamResponses: previous.nonTeamResponses ?? null,
  };
}
results.updatedAt = new Date().toISOString();
fs.writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ input, events: events.length, checkpoint, output: path.relative(root, resultsPath) }, null, 2));
