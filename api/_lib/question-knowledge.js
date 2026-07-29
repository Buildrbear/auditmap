const { createHash } = require("node:crypto");

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

function topicWords(question) {
  const ignored = new Set([
    "a", "about", "and", "are", "at", "can", "do", "does", "for", "how", "i",
    "in", "is", "it", "know", "me", "my", "of", "on", "should", "the", "there",
    "this", "to", "what", "when", "where", "which", "who", "with", "you",
  ]);
  const synonyms = {
    allowed: "allow",
    allowing: "allow",
    permitted: "allow",
    permitting: "allow",
    fly: "allow",
    flying: "allow",
    drones: "drone",
    bathrooms: "restroom",
    bathroom: "restroom",
    restrooms: "restroom",
    toilets: "restroom",
    dogs: "dog",
    pets: "pet",
  };
  return new Set(
    cleanText(question, 500)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .map((word) => synonyms[word] || word.replace(/s$/, ""))
      .filter((word) => word.length > 2 && !ignored.has(word)),
  );
}

function matchingQuestionKey(question, candidates) {
  const incoming = topicWords(question);
  let best = null;
  for (const candidate of candidates || []) {
    const existing = topicWords(candidate.sample_question);
    const intersection = [...incoming].filter((word) => existing.has(word)).length;
    const union = new Set([...incoming, ...existing]).size;
    const score = union ? intersection / union : 0;
    const knowledgeBoost =
      candidate.canonical_answer &&
      (!candidate.expires_at || new Date(candidate.expires_at) > new Date())
        ? 0.5
        : 0;
    const rank = score + knowledgeBoost;
    if (score >= 0.45 && (!best || rank > best.rank)) {
      best = { key: candidate.question_key, rank };
    }
  }
  return best?.key || questionKey(question);
}

function currentKnowledge(record) {
  if (!record?.canonical_answer || record.answer_status === "needs_verification") return null;
  if (record.expires_at && new Date(record.expires_at) <= new Date()) return null;
  return {
    answer: record.canonical_answer,
    status: record.answer_status,
    sources: Array.isArray(record.answer_sources) ? record.answer_sources : [],
    answeredAt: record.answered_at,
    expiresAt: record.expires_at,
  };
}

function freshnessWindow(question, status) {
  const timeSensitive =
    /\b(today|tonight|now|currently|open|closed|bloom|available|crowd|parking|weather)\b/i.test(
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
