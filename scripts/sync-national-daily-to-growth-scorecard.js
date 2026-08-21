const fs = require("node:fs");
const path = require("node:path");
const { aggregateNationalDiscovery } = require("./lib/national-discovery-scorecard-sync");

const root = path.resolve(__dirname, "..");
const checkpoint = process.argv[2] || "7d";
if (!["24h", "7d"].includes(checkpoint)) throw new Error("Checkpoint must be 24h or 7d");
const campaignPath = path.join(root, "data/discovery-campaigns/national-daily-discovery-results.json");
const scorecardPath = path.join(root, "data/growth-loops/loop-results.json");
const campaign = JSON.parse(fs.readFileSync(campaignPath, "utf8"));
const scorecard = JSON.parse(fs.readFileSync(scorecardPath, "utf8"));
const aggregate = aggregateNationalDiscovery(campaign, checkpoint);
const publicMetrics = aggregate ? {
  exposures: aggregate.exposures,
  landings: aggregate.landings,
  usefulActions: aggregate.usefulActions,
  contributions: aggregate.contributions,
} : null;
const updated = {
  ...scorecard,
  updatedAt: aggregate ? new Date().toISOString() : scorecard.updatedAt,
  checkpoint: aggregate ? checkpoint : scorecard.checkpoint,
  notes: aggregate
    ? `Place discovery aggregates ${aggregate.collectedPosts}/${aggregate.totalPosts} national daily posts at ${checkpoint}; other loop measurements are preserved.`
    : scorecard.notes,
  loops: { ...scorecard.loops, "place-discovery": publicMetrics },
};
fs.writeFileSync(scorecardPath, `${JSON.stringify(updated, null, 2)}\n`);
console.log(JSON.stringify({ requestedCheckpoint: checkpoint, scorecardCheckpoint: updated.checkpoint, collectedPosts: aggregate?.collectedPosts || 0, totalPosts: campaign.posts.length, placeDiscovery: publicMetrics }, null, 2));
