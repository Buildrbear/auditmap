const fs = require("node:fs");
const path = require("node:path");
const { evaluatePlanningResults, metricKeys } = require("./lib/planning-experiment");

const root = path.resolve(__dirname, "..");
const checkpoint = process.argv[2] || "7d";
if (!["24h", "7d"].includes(checkpoint)) throw new Error("Checkpoint must be 24h or 7d");
const campaign = JSON.parse(fs.readFileSync(path.join(root, "data/discovery-campaigns/raleigh-planning-pilot.json"), "utf8"));
const results = JSON.parse(fs.readFileSync(path.join(root, "data/discovery-campaigns/raleigh-planning-pilot-results.json"), "utf8"));
const evaluation = evaluatePlanningResults(campaign, results, checkpoint);
const rows = evaluation.items.map((item) => `| ${item.id} | ${item.metrics?.listOpens ?? "—"} | ${item.metrics?.guideOpens ?? "—"} | ${item.metrics?.usefulActions ?? "—"} | ${item.decision} | ${item.reason} |`).join("\n");
const report = `# Raleigh Shared-list Results — ${checkpoint}\n\n**Collection:** ${evaluation.collected}/${evaluation.total} lists\n\n| List | Opens | Guide opens | Useful actions | Decision | Reason |\n| --- | ---: | ---: | ---: | --- | --- |\n${rows}\n\nUseful actions are guide opens, list saves, directions, reshares, and submitted Crumbs. Required fields: ${metricKeys.join(", ")}.\n`;
const reportPath = path.join(root, "preview", `raleigh-planning-pilot-results-${checkpoint}.md`);
fs.writeFileSync(reportPath, report);
console.log(JSON.stringify({ checkpoint, complete: evaluation.complete, collected: evaluation.collected, report: path.relative(root, reportPath) }, null, 2));
