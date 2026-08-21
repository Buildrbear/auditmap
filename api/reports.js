const { authenticatedUser } = require("./_lib/account-auth");
const {
  assertSameOrigin,
  enforceRateLimit,
  requestFingerprint,
  requireFeature,
} = require("./_lib/abuse-controls");
const { databaseReady, supabaseRequest } = require("./_lib/supabase");

const REASONS = new Set(["unsafe", "harassment", "spam", "privacy", "inaccurate", "other"]);

function cleanText(value, limit = 500) {
  return String(value || "").trim().slice(0, limit);
}

function cleanUuid(value) {
  const candidate = cleanText(value, 36);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : null;
}

async function institutionForPlace(placeId) {
  const rows = await supabaseRequest(
    `institutions?public_id=eq.${encodeURIComponent(placeId)}&select=id,public_id&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] || null;
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }
  if (!databaseReady()) {
    response.status(503).json({ error: "Community reports are not configured." });
    return;
  }

  try {
    assertSameOrigin(request);
    requireFeature("COMMUNITY_REPORTS_ENABLED", "Community reports are briefly paused.");
    const { user } = await authenticatedUser(request, { requireActive: true });
    enforceRateLimit(request, response, {
      name: "community-report",
      subject: user.id,
      limit: 10,
      windowMs: 24 * 60 * 60 * 1000,
    });

    const body = request.body || {};
    const placeId = cleanText(body.placeId, 180);
    const reason = REASONS.has(body.reason) ? body.reason : "other";
    const details = cleanText(body.details, 1200);
    const contributionId = cleanUuid(body.contributionId);
    const targetType = contributionId ? "contribution" : "place";
    if (!placeId || !details) {
      response.status(400).json({ error: "Tell us what happened so a reviewer can act on it." });
      return;
    }
    const institution = await institutionForPlace(placeId);
    if (!institution) {
      response.status(404).json({ error: "That place is not in the shared record yet." });
      return;
    }

    let reportedUserId = null;
    if (contributionId) {
      const rows = await supabaseRequest(
        `contributions?id=eq.${contributionId}&institution_id=eq.${institution.id}&moderation_status=eq.published&select=id,user_id&limit=1`,
        { method: "GET" },
      );
      const contribution = rows?.[0];
      if (!contribution) {
        response.status(404).json({ error: "That contribution is no longer public." });
        return;
      }
      reportedUserId = contribution.user_id || null;
    }

    const reportBody = {
      institution_id: institution.id,
      user_id: user.id,
      reason,
      target_type: targetType,
      contribution_id: contributionId,
      reported_user_id: reportedUserId,
      details,
      reporter_hash: requestFingerprint(request, "community-report"),
      metadata: { placeId },
      status: "open",
    };
    let rows;
    try {
      rows = await supabaseRequest("reports", {
        method: "POST",
        body: JSON.stringify(reportBody),
      });
    } catch (error) {
      if (!/column|schema cache/i.test(`${error.detail || ""} ${error.message || ""}`)) throw error;
      rows = await supabaseRequest("reports", {
        method: "POST",
        body: JSON.stringify({
          institution_id: institution.id,
          user_id: user.id,
          reason: `[${targetType}${contributionId ? `:${contributionId}` : ""}] ${reason}: ${details}`.slice(0, 1800),
          status: "open",
        }),
      });
    }
    response.status(202).json({
      report: { id: rows?.[0]?.id, status: "open" },
      message: "Report received. A reviewer will check it privately.",
    });
  } catch (error) {
    response.status(error.status || 502).json({
      error: error.status ? error.message : "The report could not be saved right now.",
      code: error.code,
    });
  }
};

module.exports._private = { REASONS, cleanUuid };
