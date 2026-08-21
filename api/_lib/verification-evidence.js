const { supabaseRequest } = require("./supabase");

function cleanText(value, limit = 500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function intentFromContribution(contribution) {
  return cleanText(contribution?.metadata?.verificationIntent, 100)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
}

async function matchingNeed(institutionId, intentKey) {
  const rows = await supabaseRequest(
    `information_needs?institution_id=eq.${institutionId}&intent_key=eq.${encodeURIComponent(intentKey)}&status=neq.dismissed&select=id,metadata&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] || null;
}

async function ensureNeed(contribution, intentKey) {
  const existing = await matchingNeed(contribution.institution_id, intentKey);
  if (existing) return existing;
  const question =
    cleanText(contribution.metadata?.verificationPrompt, 500) ||
    `What should visitors know about ${intentKey}?`;
  const rows = await supabaseRequest("rpc/record_information_need", {
    method: "POST",
    body: JSON.stringify({
      target_institution_id: contribution.institution_id,
      target_question_key: `intent:${intentKey}`,
      target_sample_question: question,
    }),
  });
  const created = Array.isArray(rows) ? rows[0] : rows;
  if (!created?.id) return null;
  const patched = await supabaseRequest(`information_needs?id=eq.${created.id}`, {
    method: "PATCH",
    body: JSON.stringify({ intent_key: intentKey }),
  });
  return patched?.[0] || created;
}

async function recordVerificationEvidence(contribution) {
  const intentKey = intentFromContribution(contribution);
  if (!intentKey || !contribution?.id || !contribution?.institution_id) return null;
  const predicate = `answer:${intentKey}`;
  const existing = await supabaseRequest(
    `claims?contribution_id=eq.${contribution.id}&predicate=eq.${encodeURIComponent(predicate)}&select=id&limit=1`,
    { method: "GET" },
  );
  let claim = existing?.[0];
  if (!claim) {
    const rows = await supabaseRequest("claims", {
      method: "POST",
      body: JSON.stringify({
        institution_id: contribution.institution_id,
        contribution_id: contribution.id,
        predicate,
        value: {
          intentKey,
          response: cleanText(contribution.metadata?.verificationAnswer, 80) || null,
          observation: cleanText(contribution.body, 2000),
          observedAt:
            cleanText(contribution.metadata?.observedAt, 80) ||
            contribution.created_at ||
            new Date().toISOString(),
        },
        claim_text: cleanText(contribution.body, 4000),
        confidence: contribution.source_url ? 0.65 : 0.5,
        verification_status: "unreviewed",
      }),
    });
    claim = rows?.[0];
  }
  const need = await ensureNeed(contribution, intentKey);
  if (need?.id) {
    const priorIds = Array.isArray(need.metadata?.communityClaimIds)
      ? need.metadata.communityClaimIds
      : [];
    const claimIds = [...new Set([...priorIds, claim?.id].filter(Boolean))].slice(-50);
    await supabaseRequest(`information_needs?id=eq.${need.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "open",
        needs_enrichment: true,
        enrichment_queued_at: null,
        metadata: {
          ...(need.metadata || {}),
          communityClaimIds: claimIds,
          communityEvidenceCount: claimIds.length,
          lastCommunityEvidenceAt: new Date().toISOString(),
        },
      }),
    });
  }
  return claim;
}

module.exports = {
  intentFromContribution,
  recordVerificationEvidence,
};
