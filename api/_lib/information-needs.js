const { detectIntent } = require("./park-intents");
const { supabaseRequest } = require("./supabase");

function addDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function needsFreshAnswer(record) {
  if (record?.answer_status === "needs_verification") return true;
  if (!record?.canonical_answer) return true;
  if (!record.expires_at) return false;
  return new Date(record.expires_at) <= new Date();
}

function shouldQueueEnrichment(record, intent) {
  if (!record || record.status === "dismissed") return false;
  if (!needsFreshAnswer(record)) return false;
  const threshold = intent?.timeSensitive ? 2 : 3;
  return Number(record.ask_count || 0) >= threshold;
}

async function syncInformationNeed(record, question, place) {
  if (!record?.id) return record;

  const intent = detectIntent(question);
  const metadata = {
    ...(record.metadata || {}),
    intentKey: intent?.key || null,
    intentLabel: intent?.label || null,
    matchedTerms: intent?.matchedTerms || [],
    parkPublicId: place?.id || null,
    parkName: place?.name || null,
  };

  const needsEnrichment = shouldQueueEnrichment(record, intent);
  let supportsIntentColumns = true;
  let patchedRows;
  try {
    patchedRows = await supabaseRequest(`information_needs?id=eq.${record.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        intent_key: intent?.key || null,
        needs_enrichment: needsEnrichment,
        enrichment_queued_at: needsEnrichment
          ? record.enrichment_queued_at || new Date().toISOString()
          : null,
        metadata,
      }),
    });
  } catch (error) {
    if (!/intent_key|needs_enrichment|enrichment_queued_at/.test(error.detail || "")) {
      throw error;
    }
    supportsIntentColumns = false;
    patchedRows = await supabaseRequest(`information_needs?id=eq.${record.id}`, {
      method: "PATCH",
      body: JSON.stringify({ metadata }),
    });
  }
  const patched = patchedRows?.[0] || { ...record, metadata };

  if (!place?.id || !shouldQueueEnrichment(patched, intent)) {
    return patched;
  }

  const existingJobs = await supabaseRequest(
    `enrichment_jobs?public_id=eq.${encodeURIComponent(place.id)}&status=in.(queued,processing,review_needed)&select=id,created_at&order=created_at.desc&limit=1`,
    { method: "GET" },
  );
  if (existingJobs?.length) {
    return patched;
  }

  await supabaseRequest("enrichment_jobs", {
    method: "POST",
    body: JSON.stringify({
      public_id: place.id,
      trigger: "refresh",
      status: "queued",
      input_snapshot: {
        source: "question-loop",
        question,
        intentKey: intent?.key || null,
        askCount: Number(patched.ask_count || 0),
        queuedAt: new Date().toISOString(),
        publicId: place.id,
        name: place.name || null,
        city: place.city || null,
        state: place.state || null,
        address: place.address || null,
      },
      started_at: null,
      completed_at: null,
    }),
  });

  const queuedAt = new Date().toISOString();
  const enrichmentMetadata = {
    ...metadata,
    enrichmentReason: "repeated-unanswered-questions",
    enrichmentQueuedAt: queuedAt,
    reviewBy: addDays(intent?.timeSensitive ? 7 : 30),
  };
  const refreshedRows = await supabaseRequest(`information_needs?id=eq.${record.id}`, {
    method: "PATCH",
    body: JSON.stringify(supportsIntentColumns
      ? {
          needs_enrichment: true,
          enrichment_queued_at: queuedAt,
          metadata: enrichmentMetadata,
        }
      : { metadata: enrichmentMetadata }),
  });
  return refreshedRows?.[0] || patched;
}

module.exports = {
  syncInformationNeed,
};
