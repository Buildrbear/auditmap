const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const inputPath = path.resolve(root, process.argv[2] || "data/growth-loops/raleigh-community-question-queue.json");
const outputPath = path.resolve(root, process.argv[3] || "preview/raleigh-community-answer-replies.md");
const queue = JSON.parse(fs.readFileSync(inputPath, "utf8"));

function xLength(text) {
  return String(text).replace(/https?:\/\/\S+/g, "x".repeat(23)).length;
}

function firstSentence(text) {
  return (String(text || "").match(/^.*?[.!?](?:\s|$)/)?.[0] || String(text || "")).trim();
}

function draftFor(need) {
  const prefix = `We found a sourced answer for ${need.placeName}: `;
  const suffix = `\n\nFull guide and source: ${need.answerUrl}\n\nThanks for helping the next explorer.`;
  const available = 280 - xLength(prefix + suffix);
  let answer = firstSentence(need.answer);
  if (answer.length > available) answer = `${answer.slice(0, Math.max(20, available - 1)).replace(/\s+\S*$/, "")}…`;
  const text = `${prefix}${answer}${suffix}`;
  if (xLength(text) > 280) throw new Error(`${need.key}: reply draft exceeds X limit`);
  return { text, length: xLength(text) };
}

const ready = (queue.needs || []).filter((need) => need.status === "answer-ready");
for (const need of ready) {
  if (!need.answer || !need.source || !need.sourceLabel || !need.answerUrl) throw new Error(`${need.key}: answer-ready need is missing evidence`);
  if (need.expiresAt && new Date(need.expiresAt) <= new Date()) throw new Error(`${need.key}: answer-ready need has expired`);
}
const sections = ready.map((need) => {
  const draft = draftFor(need);
  return `## ${need.placeName}: ${need.intentLabel}\n\n`+
    `**Status:** Reviewer must return this in the original public thread; nothing is posted automatically.  \n`+
    `**Evidence:** [${need.sourceLabel}](${need.source}), checked ${need.checkedAt || "date unavailable"}${need.expiresAt ? `, current through ${need.expiresAt}` : ""}  \n`+
    `**Approximate X length:** ${draft.length}/280\n\n${draft.text}`;
}).join("\n\n---\n\n");
const report = `# Raleigh Community Answer Reply Queue\n\n`+
  `Generated only from current, source-backed AuditMap answers. Social replies establish demand, not facts. Recheck every time-sensitive answer before posting.\n\n`+
  (sections || "No answer-ready community needs are available.\n");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${report}\n`);
console.log(JSON.stringify({ input: path.relative(root, inputPath), output: path.relative(root, outputPath), drafts: ready.length }, null, 2));

module.exports = { draftFor, firstSentence, xLength };
