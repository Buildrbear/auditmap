const fs = require("node:fs");
const path = require("node:path");
const { importDiscoveryEvents } = require("./lib/discovery-event-import");
const { validateResults } = require("./lib/discovery-experiment");

const root = path.resolve(__dirname, "..");
const input = process.argv[2];
const checkpoint = process.argv[3] || "7d";
if (!input) throw new Error("Usage: node scripts/import-national-daily-discovery-events.js <event-export.json> [24h|7d]");
if (!["24h", "7d"].includes(checkpoint)) throw new Error("Checkpoint must be 24h or 7d");

const campaignPath = path.join(root, "data/generated/marketing/national-daily-discovery.json");
const resultsPath = path.join(root, "data/discovery-campaigns/national-daily-discovery-results.json");
const campaign = JSON.parse(fs.readFileSync(campaignPath, "utf8"));
const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const source = JSON.parse(fs.readFileSync(path.resolve(root, input), "utf8"));
const events = Array.isArray(source) ? source : source.events;
const social = Array.isArray(source) ? [] : source.social || [];
if (!Array.isArray(events)) throw new Error("Event export must be an array or an object with an events array");
if (!Array.isArray(social)) throw new Error("Event export social field must be an array when provided");

const updated = importDiscoveryEvents(campaign, results, events, checkpoint, social);
validateResults(campaign, updated);
fs.writeFileSync(resultsPath, `${JSON.stringify(updated, null, 2)}\n`);
console.log(JSON.stringify({ input, events: events.length, checkpoint, results: path.relative(root, resultsPath) }, null, 2));
