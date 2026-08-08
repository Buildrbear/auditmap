function cleanText(value, limit = 500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function slugify(value) {
  return cleanText(value, 180).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function categorySegment(type) {
  const category = slugify(type || "place");
  if (category === "park") return "parks";
  if (category === "library") return "libraries";
  return category.endsWith("s") ? category : `${category}s`;
}

function canonicalPlacePath(place) {
  return `/us/${slugify(place.state)}/${slugify(place.city)}/${categorySegment(place.type)}/${slugify(place.public_id || place.name)}`;
}

function firstSentence(value, limit = 118) {
  const text = cleanText(value, 800);
  const sentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || text;
  if (sentence.length <= limit) return sentence;
  return `${sentence.slice(0, limit - 1).replace(/\s+\S*$/, "")}…`;
}

function truncate(value, limit) {
  const text = cleanText(value, limit * 2);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).replace(/\s+\S*$/, "")}…`;
}

function estimatedXLength(value) {
  return String(value).replace(/https?:\/\/\S+/g, "x".repeat(23)).length;
}

function buildDiscoveryFollowUp(need) {
  const place = need.place;
  const sources = Array.isArray(need.answer_sources)
    ? need.answer_sources.filter((source) => /^https?:\/\//i.test(source?.url || ""))
    : [];
  if (
    !place?.public_id ||
    need.status !== "answered" ||
    !["answered", "partial"].includes(need.answer_status) ||
    !need.canonical_answer ||
    !sources.length ||
    need.metadata?.followUpStatus !== "queued"
  ) return null;

  const url = `https://www.auditmap.org${canonicalPlacePath(place)}?utm_source=x&utm_medium=organic_social&utm_campaign=answered_by_auditmap&utm_content=${encodeURIComponent(need.id)}`;
  const placeName = truncate(place.name, 40);
  const question = truncate(cleanText(need.sample_question, 120).replace(/[?!.]+$/, ""), 50);
  const answer = truncate(firstSentence(need.canonical_answer), 70);
  const caption = `${placeName}: visitors asked “${question}?”\n${answer}\nSourced on AuditMap. What should we answer next?\n${url}\n#AnsweredByAuditMap`;
  return {
    id: need.id,
    place,
    question: need.sample_question,
    answer: need.canonical_answer,
    sources,
    url,
    caption,
    estimatedXLength: estimatedXLength(caption),
    readyAt: need.metadata.followUpReadyAt || need.answered_at,
  };
}

module.exports = { buildDiscoveryFollowUp, canonicalPlacePath, estimatedXLength };
