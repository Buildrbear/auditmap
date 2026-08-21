const fs = require("node:fs");
const path = require("node:path");
const { evaluateResults, metricKeys } = require("./lib/passport-distribution-experiment");

const root = path.resolve(__dirname, "..");
const campaignPath = path.join(root, "data/discovery-campaigns/raleigh-passport-pilot.json");
const resultsPath = path.join(root, "data/discovery-campaigns/raleigh-passport-pilot-results.json");
const checkpoint = process.argv[2] || "7d";
if (!["24h", "7d"].includes(checkpoint)) throw new Error("Checkpoint must be 24h or 7d");

const campaign = JSON.parse(fs.readFileSync(campaignPath, "utf8"));
const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const evaluation = evaluateResults(campaign, results, checkpoint);
const percent = (value) => Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "—";
const rows = evaluation.variants.map((variant) => {
  const metrics = variant.metrics;
  return `| ${variant.id} | ${variant.motivation} | ${metrics?.passportOpens ?? "—"} | ${percent(metrics?.marksPerOpen)} | ${percent(metrics?.sharesPerOpen)} | ${metrics?.crumbSubmissions ?? "—"} | **${variant.decision}** | ${variant.reason} |`;
}).join("\n");
const report = `# Raleigh Explorer Passport Distribution — ${checkpoint}\n\n`+
  `**Collection:** ${evaluation.collectedVariants}/${evaluation.totalVariants} variants  \n`+
  `**Median passport opens:** ${evaluation.medianOpens ?? "—"}\n\n`+
  `| Variant | Motivation | Opens | Marks / open | Shares / open | Crumbs | Decision | Why |\n| --- | --- | ---: | ---: | ---: | ---: | --- | --- |\n${rows}\n\n`+
  `A passport open is acquisition, a place marking is activation, and a submitted Crumb is contribution. Contribution-form opens are diagnostic only. Required checkpoint fields: ${metricKeys.join(", ")}.\n`;
const reportPath = path.join(root, "preview", `raleigh-passport-pilot-results-${checkpoint}.md`);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, report);
console.log(JSON.stringify({ checkpoint, complete: evaluation.complete, collected: evaluation.collectedVariants, report: path.relative(root, reportPath) }, null, 2));
