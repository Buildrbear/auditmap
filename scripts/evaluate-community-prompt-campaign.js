const fs = require("node:fs");
const path = require("node:path");
const { evaluateResults, metricKeys } = require("./lib/community-prompt-experiment");

const root = path.resolve(__dirname, "..");
const checkpoint = process.argv[2] || "7d";
if (!["24h", "7d"].includes(checkpoint)) throw new Error("Checkpoint must be 24h or 7d");
const campaign = JSON.parse(fs.readFileSync(path.join(root, "data/discovery-campaigns/raleigh-community-prompt-pilot.json"), "utf8"));
const results = JSON.parse(fs.readFileSync(path.join(root, "data/discovery-campaigns/raleigh-community-prompt-pilot-results.json"), "utf8"));
const evaluation = evaluateResults(campaign, results, checkpoint);
const percent = (value) => Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "—";
const rows = evaluation.prompts.map((prompt) => `| ${prompt.id} | ${prompt.motivation} | ${prompt.metrics?.impressions ?? "—"} | ${prompt.metrics?.qualifiedNeeds ?? "—"} | ${prompt.metrics?.resolvedNeeds ?? "—"} | ${prompt.metrics?.recordImprovements ?? "—"} | ${percent(prompt.metrics?.closureRate)} | **${prompt.decision}** | ${prompt.reason} |`).join("\n");
const report = `# Raleigh Community-question Loop — ${checkpoint}\n\n`+
  `**Collection:** ${evaluation.collectedPrompts}/${evaluation.totalPrompts} prompts\n\n`+
  `| Prompt | Motivation | Impressions | Qualified needs | Resolved needs | Record improvements | Reply-back closure | Decision | Why |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |\n${rows}\n\n`+
  `A qualified need names a real public place and a concrete, answerable visitor question. A resolved need has a current source-backed answer; a record improvement means AuditMap published or materially refreshed that answer because of the prompt. A public reply-back must return the answer in the original thread. Required fields: ${metricKeys.join(", ")}.\n`;
const output = path.join(root, "preview", `raleigh-community-prompt-results-${checkpoint}.md`);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, report);
console.log(JSON.stringify({ checkpoint, complete: evaluation.complete, collected: evaluation.collectedPrompts, report: path.relative(root, output) }, null, 2));
