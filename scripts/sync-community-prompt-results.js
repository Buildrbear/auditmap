const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const checkpoint = process.argv[2] || "7d";
if (!["24h", "7d"].includes(checkpoint)) throw new Error("Checkpoint must be 24h or 7d");
const queuePath = path.join(root, "data/growth-loops/raleigh-community-question-queue.json");
const resultsPath = path.join(root, "data/discovery-campaigns/raleigh-community-prompt-pilot-results.json");
const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));

for (const prompt of results.prompts) {
  const derived = queue.promptMetrics?.[prompt.id] || { nonTeamReplies: 0, qualifiedNeeds: 0, resolvedNeeds: 0 };
  const previous = prompt.checkpoints[checkpoint] || {};
  prompt.checkpoints[checkpoint] = {
    impressions: previous.impressions ?? null,
    engagements: previous.engagements ?? null,
    replies: previous.replies ?? null,
    nonTeamReplies: derived.nonTeamReplies,
    qualifiedNeeds: derived.qualifiedNeeds,
    resolvedNeeds: derived.resolvedNeeds,
    recordImprovements: previous.recordImprovements ?? null,
    publicReplyBacks: previous.publicReplyBacks ?? null,
    respondentShares: previous.respondentShares ?? null,
  };
}
results.updatedAt = new Date().toISOString();
fs.writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ checkpoint, prompts: results.prompts.length, source: path.relative(root, queuePath), output: path.relative(root, resultsPath) }, null, 2));
