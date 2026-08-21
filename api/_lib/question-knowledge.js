const { createHash } = require("node:crypto");
const { detectIntent, topicWords } = require("./park-intents");

function cleanText(value, limit = 500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function questionKey(question) {
  const normalized = cleanText(question, 500)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(normalized).digest("hex");
}

function matchingQuestionKey(question, candidates) {
  const incoming = topicWords(question);
  const incomingIntent = detectIntent(question)?.key || null;
  let best = null;
  for (const candidate of candidates || []) {
    if (incomingIntent && candidate.intent_key && incomingIntent !== candidate.intent_key) {
      continue;
    }
    const existing = topicWords(candidate.sample_question);
    const intersection = [...incoming].filter((word) => existing.has(word)).length;
    const union = new Set([...incoming, ...existing]).size;
    const score = union ? intersection / union : 0;
    const sameIntent = incomingIntent && candidate.intent_key === incomingIntent ? 0.6 : 0;
    const knowledgeBoost =
      candidate.canonical_answer &&
      (!candidate.expires_at || new Date(candidate.expires_at) > new Date())
        ? 0.5
        : 0;
    const rank = score + sameIntent + knowledgeBoost;
    if (score >= 0.45 && (!best || rank > best.rank)) {
      best = { key: candidate.question_key, rank };
    }
  }
  return best?.key || questionKey(question);
}

function currentKnowledge(record) {
  if (!record?.canonical_answer || record.answer_status === "needs_verification") return null;
  if (record.expires_at && new Date(record.expires_at) <= new Date()) return null;
  const sources = Array.isArray(record.answer_sources)
    ? record.answer_sources.filter((source) => source?.url)
    : [];
  const referralOnly =
    /\bclosest matches?\b|\bopen (?:a|the) result\b|\bopen the .* record\b|\brefer(?:ring)? you to\b/i.test(
      record.canonical_answer,
    );
  if (!sources.length || referralOnly) return null;
  return {
    answer: record.canonical_answer,
    status: record.answer_status,
    sources,
    answeredAt: record.answered_at,
    expiresAt: record.expires_at,
  };
}

function freshnessWindow(question, status) {
  const intent = detectIntent(question);
  const timeSensitive =
    intent?.timeSensitive ||
    /\b(today|tonight|now|currently|open|closed|bloom|available|crowd|weather)\b/i.test(
      question,
    );
  const days = timeSensitive ? 7 : status === "answered" ? 180 : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

module.exports = {
  cleanText,
  currentKnowledge,
  freshnessWindow,
  matchingQuestionKey,
  questionKey,
};
