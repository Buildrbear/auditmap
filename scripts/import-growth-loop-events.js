const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const input = process.argv[2];
const checkpoint = process.argv[3] || "7d";
if (!input) throw new Error("Usage: node scripts/import-growth-loop-events.js <event-export.json> [24h|7d]");
if (!["24h", "7d"].includes(checkpoint)) throw new Error("Checkpoint must be 24h or 7d");

const source = JSON.parse(fs.readFileSync(path.resolve(root, input), "utf8"));
const events = Array.isArray(source) ? source : source.events;
if (!Array.isArray(events)) throw new Error("Event export must be an array or an object with an events array");

function eventName(event) {
  return event.name || event.event || event.eventName;
}

function props(event) {
  return event.properties || event.props || {};
}

function loopOf(event) {
  return event.loop || props(event).loop;
}

function count(loop, name) {
  return events.filter((event) => loopOf(event) === loop && eventName(event) === name).length;
}

function countStage(loop, stage) {
  return events.filter((event) => loopOf(event) === loop && (event.stage || props(event).stage) === stage).length;
}

const loops = {
  "place-discovery": {
    exposures: count("place-discovery", "Campaign impression"),
    landings: count("place-discovery", "Campaign landing"),
    usefulActions: events.filter((event) => loopOf(event) === "place-discovery" && ["retention", "visit-intent", "distribution", "contribution"].includes(event.stage || props(event).stage)).length,
    contributions: countStage("place-discovery", "contribution"),
  },
  "shared-planning-list": {
    shares: count("shared-planning-list", "Saved list shared"),
    opens: count("shared-planning-list", "Shared list opened"),
    guideOpens: count("shared-planning-list", "Shared list guide opened"),
    downstreamActions: events.filter((event) => loopOf(event) === "shared-planning-list" && ["retention", "visit-intent", "contribution"].includes(event.stage || props(event).stage)).length,
    contributions: countStage("shared-planning-list", "contribution"),
  },
  "verified-answer-sharing": {
    shares: count("verified-answer-sharing", "Verified answer shared"),
    opens: count("verified-answer-sharing", "Shared answer opened"),
    followups: countStage("verified-answer-sharing", "inquiry"),
    contributions: countStage("verified-answer-sharing", "contribution"),
  },
  "directions-return": {
    shown: count("directions-return", "Return contribution prompt shown"),
    accepted: count("directions-return", "Return contribution prompt accepted"),
    dismissed: count("directions-return", "Return contribution prompt dismissed"),
    contributions: countStage("directions-return", "contribution"),
  },
  "question-to-reviewed-answer": {
    questions: count("question-to-reviewed-answer", "Question captured"),
    answersPublished: count("question-to-reviewed-answer", "Reviewed answer published"),
    answerLandings: count("question-to-reviewed-answer", "Campaign landing"),
    followups: countStage("question-to-reviewed-answer", "inquiry"),
    contributions: countStage("question-to-reviewed-answer", "contribution"),
  },
  "explorer-passport": {
    opens: count("explorer-passport", "Explorer passport opened"),
    placesMarked: count("explorer-passport", "Explorer place marked"),
    shares: count("explorer-passport", "Explorer progress shared"),
    sharedOpens: count("explorer-passport", "Shared passport opened"),
    contributionIntents: count("explorer-passport", "Explorer contribution opened"),
    contributions: countStage("explorer-passport", "contribution"),
  },
  "community-question": null,
};

const output = {
  updatedAt: new Date().toISOString(),
  checkpoint,
  notes: `Aggregated from ${input}. Counts are event totals, not unique people.`,
  loops,
};
const outputPath = path.join(root, "data/growth-loops/loop-results.json");
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ input, events: events.length, output: path.relative(root, outputPath) }, null, 2));
