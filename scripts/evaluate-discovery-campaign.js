const fs = require("node:fs");
const path = require("node:path");
const { evaluateResults, metricKeys } = require("./lib/discovery-experiment");

const root = path.resolve(__dirname, "..");
const campaignPath = process.argv[2] || "data/discovery-campaigns/raleigh-pilot.json";
const resultsPath = process.argv[3] || "data/discovery-campaigns/raleigh-pilot-results.json";
const checkpoint = process.argv[4] || "7d";
if (!["24h", "7d"].includes(checkpoint)) throw new Error("Checkpoint must be 24h or 7d");

const campaign = JSON.parse(fs.readFileSync(path.join(root, campaignPath), "utf8"));
const results = JSON.parse(fs.readFileSync(path.join(root, resultsPath), "utf8"));
const evaluation = evaluateResults(campaign, results, checkpoint);
const formatRate = (value) => Number.isFinite(value) ? value.toFixed(1) : "n/a";
const rows = evaluation.posts.map((post) => {
  const metrics = post.metrics;
  return `| ${post.id} | ${metrics?.attributedVisits ?? "—"} | ${metrics?.usefulActions ?? "—"} | ${formatRate(metrics?.usefulActionsPer100Visits)} | ${formatRate(Number.isFinite(metrics?.returnPromptAcceptanceRate) ? metrics.returnPromptAcceptanceRate * 100 : null)} | ${post.decision} | ${post.reason} |`;
}).join("\n");
const promptVariantRows = Object.entries(evaluation.returnPromptVariants).map(([variant, metrics]) =>
  `| ${variant} | ${metrics.shown} | ${metrics.accepted} | ${metrics.dismissed} | ${formatRate(Number.isFinite(metrics.acceptanceRate) ? metrics.acceptanceRate * 100 : null)}% |`,
).join("\n");
const report = `# ${campaign.market} Discovery Results — ${checkpoint}\n\n`+
  `**Collection:** ${evaluation.collectedPosts}/${evaluation.totalPosts} posts  \n`+
  `**Campaign median attributed visits:** ${formatRate(evaluation.campaignMedianAttributedVisits)}  \n`+
  `**Campaign median useful actions per 100 visits:** ${formatRate(evaluation.campaignMedianUsefulActionsPer100Visits)}\n\n`+
  `| Post | Visits | Useful actions | Actions / 100 visits | Return prompt accepted | Decision | Reason |\n| --- | ---: | ---: | ---: | ---: | --- | --- |\n${rows}\n\n`+
  `## Directions-return wording\n\n| Variant | Shown | Accepted | Dismissed | Acceptance rate |\n| --- | ---: | ---: | ---: | ---: |\n${promptVariantRows}\n\n`+
  `Useful actions are saves, directions, shares, and submitted Crumbs. Required checkpoint fields: ${metricKeys.join(", ")}.\n`;

const reportPath = path.join(root, "preview", `${campaign.id}-results-${checkpoint}.md`);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, report);
console.log(JSON.stringify({ checkpoint, complete: evaluation.complete, collected: evaluation.collectedPosts, report: path.relative(root, reportPath) }, null, 2));
