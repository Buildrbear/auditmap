const fs = require("node:fs");
const path = require("node:path");
const { cleanText, detectIntent, intentTaxonomy } = require("../api/_lib/park-intents");

const root = path.resolve(__dirname, "..");
const inputPath = path.resolve(root, process.argv[2] || "data/growth-loops/raleigh-community-question-intake.json");
const outputPath = path.join(root, "data/growth-loops/raleigh-community-question-queue.json");
const campaign = JSON.parse(fs.readFileSync(path.join(root, "data/discovery-campaigns/raleigh-community-prompt-pilot.json"), "utf8"));
const intake = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const places = JSON.parse(fs.readFileSync(path.join(root, "data/institutions.json"), "utf8"));
const placeById = new Map(places.map((place) => [place.id, place]));
const promptIds = new Set(campaign.prompts.map(({ id }) => id));
const intentByKey = new Map(intentTaxonomy.map((intent) => [intent.key, intent]));
const forbiddenKeys = /^(author|authorName|displayName|handle|profile|profileUrl|rawReply|replyText|screenName|username)$/i;
const errors = [];

function inspectKeys(value, trail = "intake") {
  if (Array.isArray(value)) return value.forEach((item, index) => inspectKeys(item, `${trail}[${index}]`));
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (forbiddenKeys.test(key)) errors.push(`${trail}.${key}: social identity or copied reply fields are forbidden`);
    inspectKeys(item, `${trail}.${key}`);
  }
}

inspectKeys(intake);
if (intake.campaignId !== campaign.id) errors.push("Intake campaign ID does not match");
if (!Array.isArray(intake.responses)) errors.push("Intake responses must be an array");

const reviewed = [];
for (const [index, response] of (intake.responses || []).entries()) {
  const label = `responses[${index}]`;
  const id = cleanText(response.id, 80);
  const question = cleanText(response.questionParaphrase, 240);
  const place = placeById.get(response.placeId);
  if (!id || !/^[a-z0-9-]+$/i.test(id)) errors.push(`${label}: stable non-identifying id is required`);
  if (!promptIds.has(response.promptId)) errors.push(`${label}: unknown promptId`);
  if (!place || place.city !== "Raleigh" || place.state !== "NC") errors.push(`${label}: placeId must resolve to a Raleigh, NC record`);
  if (!question || question.length < 12) errors.push(`${label}: questionParaphrase must be a useful reviewer-written paraphrase`);
  if (!["qualified", "out-of-scope"].includes(response.disposition)) errors.push(`${label}: disposition must be qualified or out-of-scope`);
  const detected = detectIntent(question);
  const intentKey = response.intentKey || detected?.key;
  if (response.disposition === "qualified" && !intentByKey.has(intentKey)) errors.push(`${label}: qualified response needs a taxonomy intent`);
  reviewed.push({ id, promptId: response.promptId, place, question, intentKey, disposition: response.disposition });
}
if (new Set(reviewed.map(({ id }) => id)).size !== reviewed.length) errors.push("Response IDs must be unique");
if (errors.length) {
  console.error(JSON.stringify({ valid: false, errors }, null, 2));
  process.exitCode = 1;
  return;
}

const groups = new Map();
for (const response of reviewed.filter(({ disposition }) => disposition === "qualified")) {
  const key = `${response.place.id}:${response.intentKey}`;
  const group = groups.get(key) || { key, place: response.place, intentKey: response.intentKey, questions: [], occurrences: 0, promptIds: new Set() };
  group.questions.push(response.question);
  group.occurrences += 1;
  group.promptIds.add(response.promptId);
  groups.set(key, group);
}

const now = Date.now();
const needs = [...groups.values()].map((group) => {
  const intent = intentByKey.get(group.intentKey);
  const answer = (group.place.searchAnswers || []).find((item) => item.intentKey === group.intentKey && item.answer && item.source && item.sourceLabel);
  const expiry = answer?.expiresAt || answer?.expires_at || null;
  const current = Boolean(answer && (!expiry || new Date(expiry).getTime() > now));
  const slug = group.place.slug || group.place.id;
  return {
    key: group.key,
    placeId: group.place.id,
    placeName: group.place.name,
    intentKey: group.intentKey,
    intentLabel: intent.label,
    questionParaphrase: group.questions[0],
    occurrences: group.occurrences,
    promptIds: [...group.promptIds].sort(),
    timeSensitive: intent.timeSensitive,
    status: current ? "answer-ready" : answer ? "recheck-required" : "research-needed",
    answerUrl: `https://www.auditmap.org/us/nc/raleigh/parks/${slug}/`,
    ...(current ? {
      answer: answer.answer,
      sourceLabel: answer.sourceLabel,
      source: answer.source,
      checkedAt: answer.checkedAt || answer.verifiedAt || null,
      expiresAt: expiry,
    } : {}),
  };
}).sort((left, right) => right.occurrences - left.occurrences || left.key.localeCompare(right.key));

const promptMetrics = Object.fromEntries(campaign.prompts.map(({ id }) => {
  const promptResponses = reviewed.filter((response) => response.promptId === id);
  const qualifiedKeys = new Set(promptResponses.filter(({ disposition }) => disposition === "qualified").map((response) => `${response.place.id}:${response.intentKey}`));
  const resolvedKeys = new Set(needs.filter((need) => need.status === "answer-ready" && need.promptIds.includes(id)).map(({ key }) => key));
  return [id, {
    nonTeamReplies: promptResponses.length,
    qualifiedNeeds: qualifiedKeys.size,
    resolvedNeeds: resolvedKeys.size,
  }];
}));

const output = {
  campaignId: campaign.id,
  generatedAt: new Date().toISOString(),
  privacy: "No social identity or copied reply text retained; questions are reviewer paraphrases.",
  metrics: {
    reviewedResponses: reviewed.length,
    nonTeamReplies: reviewed.length,
    qualifiedNeeds: needs.length,
    duplicateNeeds: reviewed.filter(({ disposition }) => disposition === "qualified").length - needs.length,
    outOfScope: reviewed.filter(({ disposition }) => disposition === "out-of-scope").length,
    answerReady: needs.filter(({ status }) => status === "answer-ready").length,
    recheckRequired: needs.filter(({ status }) => status === "recheck-required").length,
    researchNeeded: needs.filter(({ status }) => status === "research-needed").length,
  },
  promptMetrics,
  needs,
};
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ input: path.relative(root, inputPath), output: path.relative(root, outputPath), ...output.metrics }, null, 2));
