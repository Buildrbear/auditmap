const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const resultsPath = path.join(root, "data/growth-loops/loop-results.json");
const outputPath = path.join(root, "preview/growth-loop-scorecard.md");
const nationalValidationPath = path.join(root, "preview/national-daily-discovery-production-validation.json");

const definitions = {
  "place-discovery": {
    name: "Place discovery",
    fields: ["exposures", "landings", "usefulActions", "contributions"],
    rates: [
      ["landing rate", "landings", "exposures"],
      ["activation rate", "usefulActions", "landings"],
      ["contribution rate", "contributions", "landings"],
    ],
  },
  "shared-planning-list": {
    name: "Shared planning list",
    fields: ["shares", "opens", "guideOpens", "downstreamActions", "contributions"],
    rates: [
      ["open rate", "opens", "shares"],
      ["guide activation", "guideOpens", "opens"],
      ["downstream action rate", "downstreamActions", "opens"],
    ],
  },
  "verified-answer-sharing": {
    name: "Verified answer sharing",
    fields: ["shares", "opens", "followups", "contributions"],
    rates: [
      ["open rate", "opens", "shares"],
      ["follow-up rate", "followups", "opens"],
      ["contribution rate", "contributions", "opens"],
    ],
  },
  "directions-return": {
    name: "Directions return invitation",
    fields: ["shown", "accepted", "dismissed", "contributions"],
    rates: [
      ["acceptance rate", "accepted", "shown"],
      ["completion rate", "contributions", "accepted"],
    ],
  },
  "question-to-reviewed-answer": {
    name: "Question to reviewed answer",
    fields: ["questions", "answersPublished", "answerLandings", "followups", "contributions"],
    rates: [
      ["publication rate", "answersPublished", "questions"],
      ["continued-use rate", "followups", "answerLandings"],
      ["contribution rate", "contributions", "answerLandings"],
    ],
  },
  "explorer-passport": {
    name: "Explorer passport",
    fields: ["opens", "placesMarked", "shares", "sharedOpens", "contributionIntents", "contributions"],
    rates: [
      ["marks per open", "placesMarked", "opens"],
      ["shares per open", "shares", "opens"],
      ["referral opens per share", "sharedOpens", "shares"],
      ["contribution-intent rate", "contributionIntents", "placesMarked"],
      ["completed-contribution rate", "contributions", "placesMarked"],
    ],
  },
  "community-question": {
    name: "Community question to sourced answer",
    fields: ["impressions", "qualifiedNeeds", "resolvedNeeds", "recordImprovements", "replyBacks", "respondentShares"],
    rates: [
      ["qualified needs per impression", "qualifiedNeeds", "impressions"],
      ["resolution rate", "resolvedNeeds", "qualifiedNeeds"],
      ["record-improvement rate", "recordImprovements", "resolvedNeeds"],
      ["public closure rate", "replyBacks", "resolvedNeeds"],
      ["respondent shares per reply-back", "respondentShares", "replyBacks"],
    ],
  },
};

function rate(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}

function percent(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "—";
}

function nationalLaunchGate(validation) {
  if (!validation) return { decision: "VERIFY", reason: "No dated production validation exists." };
  if (!validation.contentReady) return { decision: "FIX CONTENT", reason: "At least one tracked destination is not ready on the public site." };
  if (!validation.measurementReady) return { decision: "RELEASE TRACKING", reason: "Destination content is ready, but production cannot measure the loop yet." };
  return { decision: "RUN DAY 1", reason: "Production content and measurement gates pass; recheck the Day 1 fact and image before publishing." };
}

function evaluate(key, metrics) {
  const definition = definitions[key];
  if (metrics === null) return { key, ...definition, collected: false, metrics: null, rates: [], decision: "COLLECT", reason: "No measurement window has been entered." };
  const invalid = definition.fields.filter((field) => !Number.isInteger(metrics[field]) || metrics[field] < 0);
  if (invalid.length) throw new Error(`${key} has missing or invalid fields: ${invalid.join(", ")}`);
  const rates = definition.rates.map(([label, numerator, denominator]) => ({
    label,
    value: rate(metrics[numerator], metrics[denominator]),
  }));
  const distribution = metrics.exposures ?? metrics.impressions ?? metrics.opens ?? metrics.shares ?? metrics.shown ?? metrics.questions;
  const activated = metrics.usefulActions ?? metrics.qualifiedNeeds ?? metrics.placesMarked ?? metrics.downstreamActions ?? metrics.followups ?? metrics.accepted ?? metrics.answersPublished;
  const contributions = metrics.contributions ?? (key === "community-question" ? metrics.recordImprovements : 0);
  let decision = "KEEP TESTING";
  let reason = "The loop has measurable activation but needs another comparable window.";
  if (distribution === 0) {
    decision = "FIX DISTRIBUTION";
    reason = "The loop was measured but did not reach anyone.";
  } else if (activated === 0) {
    decision = "FIX PROMISE";
    reason = "People reached the loop but did not take its first meaningful action.";
  } else if (key === "community-question" && contributions > 0 && metrics.replyBacks === 0) {
    decision = "KEEP TESTING";
    reason = "A sourced answer was published, but AuditMap has not returned it publicly to close the loop.";
  } else if (contributions > 0) {
    decision = "SCALE CAREFULLY";
    reason = "The loop produced at least one record-improving contribution.";
  }
  return { key, ...definition, collected: true, metrics, rates, decision, reason };
}

const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const unknown = Object.keys(results.loops || {}).filter((key) => !definitions[key]);
if (unknown.length) throw new Error(`Unknown growth loops: ${unknown.join(", ")}`);
const evaluations = Object.keys(definitions).map((key) => evaluate(key, results.loops?.[key] ?? null));
const nationalValidation = fs.existsSync(nationalValidationPath) ? JSON.parse(fs.readFileSync(nationalValidationPath, "utf8")) : null;
const nationalGate = nationalLaunchGate(nationalValidation);
const rows = evaluations.map((item) => {
  const rates = item.rates.length ? item.rates.map((entry) => `${entry.label}: ${percent(entry.value)}`).join("<br>") : "—";
  return `| ${item.name} | ${item.collected ? "Yes" : "No"} | ${rates} | **${item.decision}** | ${item.reason} |`;
}).join("\n");
const report = `# AuditMap Growth-loop Scorecard\n\n`+
  `**Checkpoint:** ${results.checkpoint || "unspecified"}  \n`+
  `**Updated:** ${results.updatedAt || "Not collected yet"}  \n`+
  `**Coverage:** ${evaluations.filter((item) => item.collected).length}/${evaluations.length} loops measured\n\n`+
  `| Loop | Collected | Conversion signals | Decision | Why |\n| --- | --- | --- | --- | --- |\n${rows}\n\n`+
  `## Active experiment gate\n\n`+
  `| Experiment | Content | Measurement | Next action | Why |\n| --- | --- | --- | --- | --- |\n`+
  `| National daily discovery | ${nationalValidation?.contentReady ? "Ready" : "Not ready"} | ${nationalValidation?.measurementReady ? "Ready" : "Not ready"} | **${nationalGate.decision}** | ${nationalGate.reason} |\n\n`+
  `## Reading the scorecard\n\n`+
  `A contribution is the strongest signal because it improves the public record for the next visitor. Shares, opens, directions, saves, and self-reported passport markings are useful intent signals, not proof of a visit. Never replace an unknown with zero. Compare loops only after they have similar distribution and measurement windows. Passport marks per open and referral opens per share can exceed 100% because one passport contains several places and one shared link can reach several recipients.\n`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, report);
console.log(JSON.stringify({ report: path.relative(root, outputPath), measured: evaluations.filter((item) => item.collected).length, total: evaluations.length }, null, 2));

module.exports = { definitions, evaluate, nationalLaunchGate, rate };
