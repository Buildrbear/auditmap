const { createHash } = require("node:crypto");
const { databaseReady, supabaseRequest } = require("./_lib/supabase");
const { reviewContribution, statusForDecision } = require("./_lib/moderation");
const { generateCommunityAnswer } = require("./_lib/community-answer");
const {
  currentKnowledge,
  freshnessWindow,
  matchingQuestionKey,
} = require("./_lib/question-knowledge");

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanUuid(value) {
  const candidate = cleanText(value, 36);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    candidate,
  )
    ? candidate
    : null;
}

async function recordQuestionGap(question, institutionId) {
  const candidates = await supabaseRequest(
    `information_needs?institution_id=eq.${institutionId}&status=neq.dismissed&select=question_key,sample_question,canonical_answer,expires_at&limit=100`,
    { method: "GET" },
  );
  return supabaseRequest("rpc/record_information_need", {
    method: "POST",
    body: JSON.stringify({
      target_institution_id: institutionId,
      target_question_key: matchingQuestionKey(question, candidates),
      target_sample_question: cleanText(question, 500),
    }),
  });
}

async function findInstitution(publicId) {
  const rows = await supabaseRequest(
    `institutions?public_id=eq.${encodeURIComponent(publicId)}&select=id,public_id&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] || null;
}

async function ensureInstitution(place) {
  const publicId = cleanText(place?.id, 180);
  let institution = await findInstitution(publicId);
  if (institution) return institution;

  const required = ["name", "type", "city", "state", "address"];
  if (!publicId || required.some((field) => !cleanText(place?.[field], 240))) {
    throw new Error("A valid place record is required.");
  }

  const rows = await supabaseRequest("institutions", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify({
      public_id: publicId,
      slug: publicId.slice(0, 180),
      name: cleanText(place.name, 240),
      type: cleanText(place.type, 100),
      city: cleanText(place.city, 120),
      state: cleanText(place.state, 40),
      country_code: "US",
      neighborhood: cleanText(place.neighborhood, 160) || null,
      address: cleanText(place.address, 300),
      latitude: Number(place.latitude) || null,
      longitude: Number(place.longitude) || null,
      summary: cleanText(place.summary, 2000) || null,
      hours: cleanText(place.hours, 500) || null,
      cost: cleanText(place.cost, 300) || null,
      accessibility: cleanText(place.accessibility, 1000) || null,
      transit: cleanText(place.transit, 1000) || null,
      amenities: Array.isArray(place.amenities) ? place.amenities.slice(0, 40) : [],
      status: "pending",
    }),
  });
  return rows?.[0];
}

module.exports = async function handler(request, response) {
  if (!databaseReady()) {
    response.status(503).json({ error: "Shared database not configured." });
    return;
  }

  try {
    if (request.method === "GET") {
      const publicId = cleanText(request.query.placeId, 180);
      const institution = await findInstitution(publicId);
      if (!institution) {
        response.status(200).json({ contributions: [] });
        return;
      }
      const rows = await supabaseRequest(
        `contributions?institution_id=eq.${institution.id}&moderation_status=eq.published&select=id,feature_id,parent_id,author_name,contribution_type,body,rating,source_url,metadata,created_at&order=created_at.desc&limit=100`,
        { method: "GET" },
      );
      response.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=60");
      response.status(200).json({ contributions: rows || [] });
      return;
    }

    if (request.method === "POST") {
      const body = request.body || {};
      const text = cleanText(body.body, 4000);
      const rating = body.rating ? Number(body.rating) : null;
      if (!text && !(rating >= 1 && rating <= 5)) {
        response.status(400).json({ error: "Add an observation or rating first." });
        return;
      }
      const institution = await ensureInstitution(body.place);
      const forwarded = cleanText(request.headers["x-forwarded-for"], 200);
      const submitterHash = createHash("sha256")
        .update(`${forwarded}|${process.env.CONTRIBUTION_HASH_SALT || "auditmap"}`)
        .digest("hex");
      const rows = await supabaseRequest("contributions", {
        method: "POST",
        body: JSON.stringify({
          institution_id: institution.id,
          author_name: cleanText(body.authorName, 120) || "Local contributor",
          contribution_type: ["observation", "review", "correction", "confirmation", "question"]
            .includes(body.type)
            ? body.type
            : "observation",
          feature_id: cleanUuid(body.featureId),
          parent_id: cleanUuid(body.parentId),
          body: text || "Rated this place.",
          rating: rating >= 1 && rating <= 5 ? rating : null,
          source_url: cleanText(body.sourceUrl, 1000) || null,
          metadata: {
            clientSubmittedAt: cleanText(body.submittedAt, 80) || null,
            submitterHash,
          },
          moderation_status: "pending",
          analysis_status: "queued",
        }),
      });
      const contribution = rows?.[0];
      const placeRows = await supabaseRequest(
        `institutions?id=eq.${institution.id}&select=id,public_id,name,type,city,state,address,summary,hours,cost,accessibility,transit,amenities,verified_at&limit=1`,
        { method: "GET" },
      );
      const aiReview = await reviewContribution(contribution, placeRows?.[0]);
      const moderationStatus = statusForDecision(aiReview.decision);
      const reviewedRows = await supabaseRequest(`contributions?id=eq.${contribution.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          moderation_status: moderationStatus,
          analysis_status: aiReview.confidence > 0 ? "complete" : "failed",
          metadata: {
            ...(contribution.metadata || {}),
            aiModeration: aiReview,
          },
        }),
      });
      const reviewedContribution = reviewedRows?.[0] || contribution;
      let aiReply = null;
      if (moderationStatus === "published" && contribution.contribution_type === "question") {
        try {
          const informationNeedResult = await recordQuestionGap(
            reviewedContribution.body,
            institution.id,
          );
          const informationNeed = Array.isArray(informationNeedResult)
            ? informationNeedResult[0]
            : informationNeedResult;
          const stored = currentKnowledge(informationNeed);
          const generated =
            stored ||
            (await generateCommunityAnswer({
              contribution: reviewedContribution,
              institution: placeRows[0],
            }));
          if (generated) {
            if (!stored) {
              await supabaseRequest(`information_needs?id=eq.${informationNeed.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                  canonical_answer: generated.answer,
                  answer_status: generated.status,
                  answer_sources: generated.sources,
                  answered_at: new Date().toISOString(),
                  expires_at: freshnessWindow(
                    reviewedContribution.body,
                    generated.status,
                  ),
                  status:
                    generated.status === "needs_verification" ? "open" : "answered",
                }),
              });
            }
            const replyRows = await supabaseRequest("contributions", {
              method: "POST",
              body: JSON.stringify({
                institution_id: institution.id,
                author_name: "AuditMap Assistant",
                contribution_type: "observation",
                parent_id: contribution.id,
                body: generated.answer,
                metadata: {
                  aiGenerated: true,
                  answerStatus: generated.status,
                  sources: generated.sources,
                  reusedKnowledge: Boolean(stored),
                  model: generated.model,
                  promptVersion: "community-answer-v1",
                },
                moderation_status: "published",
                analysis_status: "complete",
              }),
            });
            aiReply = replyRows?.[0] || null;
          }
        } catch (error) {
          console.error("AuditMap community answer:", error.message);
        }
      }
      response.status(202).json({
        contribution: reviewedContribution,
        aiReply,
        message:
          moderationStatus === "published"
            ? "Added to the community record."
            : moderationStatus === "rejected"
              ? "The contribution could not be added."
              : "Saved for a quick human review.",
      });
      return;
    }

    response.setHeader("Allow", "GET, POST");
    response.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    response.status(502).json({
      error: error.message === "A valid place record is required."
        ? error.message
        : "The shared contribution feed is temporarily unavailable.",
    });
  }
};
