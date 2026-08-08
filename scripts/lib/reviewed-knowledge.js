function cleanText(value, limit = 1400) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function validDate(value) {
  const parsed = new Date(value || "");
  return Number.isFinite(parsed.valueOf()) ? parsed.toISOString() : null;
}

function validPublicUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function normalizeReviewedKnowledge(document, { now = new Date() } = {}) {
  if (!document || document.version !== 1 || !Array.isArray(document.answers)) {
    throw new Error("Reviewed knowledge must use version 1 with an answers array");
  }
  const issues = [];
  const accepted = [];
  const keys = new Set();
  for (const [index, item] of document.answers.entries()) {
    const label = item?.informationNeedId || `answer ${index + 1}`;
    const placeId = cleanText(item?.placeId, 180);
    const intentKey = cleanText(item?.intentKey, 100);
    const question = cleanText(item?.question, 300);
    const answer = cleanText(item?.answer, 1400);
    const sourceLabel = cleanText(item?.sourceLabel, 200);
    const sourceUrl = validPublicUrl(item?.sourceUrl);
    const checkedAt = validDate(item?.checkedAt);
    const reviewedAt = validDate(item?.reviewedAt);
    const expiresAt = item?.expiresAt ? validDate(item.expiresAt) : null;
    const key = `${placeId}:${intentKey}`;
    const failures = [];
    if (item?.reviewStatus !== "approved") failures.push("reviewStatus must be approved");
    if (!placeId || !intentKey || !question || !answer) failures.push("place, intent, question, and answer are required");
    if (!sourceLabel || !sourceUrl) failures.push("a public source label and URL are required");
    if (!checkedAt || !reviewedAt) failures.push("checkedAt and reviewedAt are required dates");
    if (checkedAt && new Date(checkedAt) > now) failures.push("checkedAt cannot be in the future");
    if (reviewedAt && new Date(reviewedAt) > now) failures.push("reviewedAt cannot be in the future");
    if (item?.answerStatus && !["answered", "partial"].includes(item.answerStatus)) failures.push("answerStatus is not publishable");
    if (item?.expiresAt && !expiresAt) failures.push("expiresAt is invalid");
    if (expiresAt && new Date(expiresAt) <= now) failures.push("answer is expired");
    if (keys.has(key)) failures.push("place and intent are duplicated");
    if (failures.length) {
      issues.push(`${label}: ${failures.join(", ")}`);
      continue;
    }
    keys.add(key);
    accepted.push({
      informationNeedId: cleanText(item.informationNeedId, 100) || null,
      placeId,
      intentKey,
      question,
      answer,
      sourceLabel,
      source: sourceUrl,
      sourceType: cleanText(item.sourceType, 40) || "reviewed",
      checkedAt: checkedAt.slice(0, 10),
      reviewedAt: reviewedAt.slice(0, 10),
      expiresAt: expiresAt ? expiresAt.slice(0, 10) : null,
      answerStatus: item.answerStatus || "answered",
      verificationStatus: "reviewed",
    });
  }
  if (issues.length) throw new Error(`Reviewed knowledge failed publication gates:\n${issues.join("\n")}`);
  return accepted;
}

function latestDate(...values) {
  return values
    .flat(Infinity)
    .map(validDate)
    .filter(Boolean)
    .sort()
    .slice(-1)[0]?.slice(0, 10) || null;
}

function applyReviewedKnowledge(places, answers) {
  const knownPlaceIds = new Set(places.map((place) => place.id));
  const unknownPlaceIds = [...new Set(answers.map((answer) => answer.placeId))]
    .filter((placeId) => !knownPlaceIds.has(placeId));
  if (unknownPlaceIds.length) {
    throw new Error(`Reviewed knowledge references unknown places: ${unknownPlaceIds.join(", ")}`);
  }
  const byPlace = new Map();
  for (const answer of answers) {
    if (!byPlace.has(answer.placeId)) byPlace.set(answer.placeId, []);
    byPlace.get(answer.placeId).push(answer);
  }
  return places.map((place) => {
    const reviewed = byPlace.get(place.id) || [];
    if (!reviewed.length) return place;
    const nextAnswers = [...(place.searchAnswers || [])];
    for (const answer of reviewed) {
      const index = nextAnswers.findIndex((item) => item.intentKey === answer.intentKey);
      if (index >= 0) nextAnswers[index] = { ...nextAnswers[index], ...answer };
      else nextAnswers.push(answer);
    }
    const knowledgeUpdatedAt = latestDate(reviewed.map((answer) => answer.reviewedAt));
    return {
      ...place,
      searchAnswers: nextAnswers,
      knowledgeUpdatedAt,
      verifiedAt: latestDate(place.verifiedAt, knowledgeUpdatedAt) || place.verifiedAt,
    };
  });
}

function placeLastModified(place, fallback = null) {
  return latestDate(
    place?.verifiedAt,
    place?.knowledgeUpdatedAt,
    (place?.searchAnswers || []).map((answer) => [answer.checkedAt, answer.reviewedAt]),
    (place?.features || []).map((feature) => [
      feature.verified_at,
      feature.details?.informationCheckedAt,
    ]),
  ) || fallback;
}

module.exports = {
  applyReviewedKnowledge,
  latestDate,
  normalizeReviewedKnowledge,
  placeLastModified,
};
