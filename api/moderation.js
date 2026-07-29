const crypto = require("node:crypto");
const { databaseReady, supabaseRequest } = require("./_lib/supabase");
const { reviewContribution, statusForDecision } = require("./_lib/moderation");

function cleanText(value, maxLength = 200) {
  return String(value || "").trim().slice(0, maxLength);
}

function authorized(request) {
  const expected =
    process.env.MODERATION_ADMIN_TOKEN || process.env.ENRICHMENT_ADMIN_TOKEN;
  if (!expected) return false;
  const supplied = cleanText(
    request.headers["x-moderation-token"] ||
      String(request.headers.authorization || "").replace(/^Bearer\s+/i, ""),
    500,
  );
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function attachPlaces(contributions) {
  const institutionIds = [
    ...new Set(contributions.map((item) => item.institution_id).filter(Boolean)),
  ];
  if (!institutionIds.length) return contributions;
  const places = await supabaseRequest(
    `institutions?id=in.(${institutionIds.join(",")})&select=id,public_id,name,type,city,state`,
    { method: "GET" },
  );
  const placesById = new Map((places || []).map((place) => [place.id, place]));
  return contributions.map((contribution) => ({
    ...contribution,
    place: placesById.get(contribution.institution_id) || null,
  }));
}

module.exports = async function handler(request, response) {
  if (!databaseReady()) {
    response.status(503).json({ error: "The shared database is not configured." });
    return;
  }
  if (!process.env.MODERATION_ADMIN_TOKEN && !process.env.ENRICHMENT_ADMIN_TOKEN) {
    response.status(503).json({ error: "The review inbox is not enabled." });
    return;
  }
  if (!authorized(request)) {
    response.status(401).json({ error: "Review access could not be confirmed." });
    return;
  }

  try {
    if (request.method === "GET") {
      if (request.query.status === "needs") {
        const needs = await supabaseRequest(
          "information_needs?status=eq.open&select=id,institution_id,sample_question,ask_count,status,first_asked_at,last_asked_at,metadata&order=ask_count.desc,last_asked_at.desc&limit=200",
          { method: "GET" },
        );
        response.setHeader("Cache-Control", "no-store");
        response.status(200).json({ informationNeeds: await attachPlaces(needs || []) });
        return;
      }
      const status = ["pending", "published", "rejected"].includes(request.query.status)
        ? request.query.status
        : "pending";
      const rows = await supabaseRequest(
        `contributions?moderation_status=eq.${status}&select=id,institution_id,parent_id,author_name,contribution_type,body,rating,source_url,metadata,moderation_status,analysis_status,created_at,updated_at&order=created_at.asc&limit=200`,
        { method: "GET" },
      );
      response.setHeader("Cache-Control", "no-store");
      response.status(200).json({ contributions: await attachPlaces(rows || []) });
      return;
    }

    if (request.method === "POST") {
      const id = cleanText(request.body?.id, 36);
      const action = cleanText(request.body?.action, 20);
      if (request.body?.resourceType === "informationNeed") {
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            id,
          ) ||
          !["answered", "dismissed", "open"].includes(action)
        ) {
          response.status(400).json({ error: "Choose a valid information-gap decision." });
          return;
        }
        const rows = await supabaseRequest(`information_needs?id=eq.${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: action }),
        });
        response.setHeader("Cache-Control", "no-store");
        response.status(200).json({
          informationNeed: rows?.[0],
          message: action === "open" ? "Returned to information gaps." : `Marked ${action}.`,
        });
        return;
      }
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          id,
        ) ||
        !["publish", "reject", "pending", "analyze"].includes(action)
      ) {
        response.status(400).json({ error: "Choose a valid review decision." });
        return;
      }
      const currentRows = await supabaseRequest(
        `contributions?id=eq.${id}&select=id,institution_id,parent_id,contribution_type,body,rating,source_url,metadata,moderation_status&limit=1`,
        { method: "GET" },
      );
      const current = currentRows?.[0];
      if (!current) {
        response.status(404).json({ error: "That contribution no longer exists." });
        return;
      }
      if (action === "analyze") {
        const placeRows = await supabaseRequest(
          `institutions?id=eq.${current.institution_id}&select=public_id,name,type,city,state&limit=1`,
          { method: "GET" },
        );
        const aiReview = await reviewContribution(current, placeRows?.[0]);
        const moderationStatus = statusForDecision(aiReview.decision);
        const rows = await supabaseRequest(`contributions?id=eq.${id}`, {
          method: "PATCH",
          body: JSON.stringify({
            moderation_status: moderationStatus,
            analysis_status: aiReview.confidence > 0 ? "complete" : "failed",
            metadata: {
              ...(current.metadata || {}),
              aiModeration: aiReview,
            },
          }),
        });
        response.setHeader("Cache-Control", "no-store");
        response.status(200).json({
          contribution: rows?.[0],
          message: `AI review recommends ${aiReview.decision}.`,
        });
        return;
      }

      const moderationStatus =
        action === "publish" ? "published" : action === "reject" ? "rejected" : "pending";
      const history = Array.isArray(current.metadata?.moderationHistory)
        ? current.metadata.moderationHistory.slice(-49)
        : [];
      const reviewedAt = new Date().toISOString();
      const rows = await supabaseRequest(`contributions?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          moderation_status: moderationStatus,
          metadata: {
            ...(current.metadata || {}),
            moderationHistory: [
              ...history,
              {
                previousStatus: current.moderation_status,
                action,
                reviewedAt,
                note: cleanText(request.body?.note, 1000) || null,
              },
            ],
            moderation: {
              action,
              reviewedAt,
              note: cleanText(request.body?.note, 1000) || null,
              override: true,
            },
          },
        }),
      });
      response.setHeader("Cache-Control", "no-store");
      response.status(200).json({
        contribution: rows?.[0],
        message:
          action === "publish"
            ? "Published to the community record."
            : action === "reject"
              ? "Rejected and kept out of the public record."
              : "Returned to the review queue.",
      });
      return;
    }

    response.setHeader("Allow", "GET, POST");
    response.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    console.error("Moderation request failed:", error.message);
    response.status(502).json({ error: "The review inbox is temporarily unavailable." });
  }
};
