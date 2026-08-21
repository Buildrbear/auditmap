const { createHash } = require("node:crypto");
const { authenticatedUser } = require("./_lib/account-auth");
const {
  assertSameOrigin,
  enforceRateLimit,
  requestFingerprint,
  requireFeature,
} = require("./_lib/abuse-controls");
const {
  addImpactEvent,
  awardPublishedContribution,
  IMPACT_POINTS,
  impactSummary,
  syncBadges,
} = require("./_lib/crumb-impact");
const { databaseReady, supabaseRequest } = require("./_lib/supabase");
const { _private: mediaPrivate } = require("./media");
const { syncInformationNeed } = require("./_lib/information-needs");
const { reviewContribution, statusForDecision } = require("./_lib/moderation");
const { generateCommunityAnswer } = require("./_lib/community-answer");
const { recordVerificationEvidence } = require("./_lib/verification-evidence");
const {
  currentKnowledge,
  freshnessWindow,
  matchingQuestionKey,
} = require("./_lib/question-knowledge");

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanHttpUrl(value) {
  const candidate = cleanText(value, 1000);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function cleanUuid(value) {
  const candidate = cleanText(value, 36);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    candidate,
  )
    ? candidate
    : null;
}

function cleanCoordinate(value, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}

function cleanDate(value) {
  const date = new Date(value || "");
  return Number.isFinite(date.valueOf()) ? date.toISOString() : null;
}

function freshnessFor(topic, observedAt) {
  const days = {
    closure: 7,
    condition: 14,
    hours: 30,
    amenity: 30,
    evergreen: 180,
  }[topic] || 180;
  const start = new Date(observedAt || Date.now());
  return new Date(start.valueOf() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function publishedFeed(institution) {
  const storedRows = await supabaseRequest(
    `contributions?institution_id=eq.${institution.id}&moderation_status=eq.published&select=id,user_id,feature_id,parent_id,author_name,contribution_type,body,rating,source_url,metadata,latitude,longitude,location_scope,location_accuracy_meters,observed_at,fresh_until,verification_status,created_at&order=created_at.desc&limit=100`,
    { method: "GET" },
  );
  const rows = (storedRows || []).filter((item) => item.metadata?.demoSeed !== true);
  const contributionIds = (rows || []).map((item) => item.id);
  const userIds = [...new Set((rows || []).map((item) => item.user_id).filter(Boolean))];
  const [mediaRows, reactions, profiles] = await Promise.all([
    contributionIds.length
      ? supabaseRequest(
          `media?contribution_id=in.(${contributionIds.join(",")})&status=eq.published&select=id,contribution_id,feature_id,media_kind,storage_path,preview_path,derivative_path,alt_text,width,height,captured_at,metadata&order=created_at.asc`,
          { method: "GET" },
        )
      : [],
    contributionIds.length
      ? supabaseRequest(
          `contribution_reactions?contribution_id=in.(${contributionIds.join(",")})&reaction=eq.helpful&select=contribution_id`,
          { method: "GET" },
        )
      : [],
    userIds.length
      ? supabaseRequest(
          `community_profiles?user_id=in.(${userIds.join(",")})&profile_status=eq.public&select=user_id,public_slug,display_name,avatar_url`,
          { method: "GET" },
        )
      : [],
  ]);
  const mediaByContribution = new Map();
  for (const item of mediaRows || []) {
    const url = await mediaPrivate.signedMediaUrl(item.derivative_path || item.storage_path);
    const previewUrl = item.preview_path
      ? await mediaPrivate.signedMediaUrl(item.preview_path)
      : url;
    const list = mediaByContribution.get(item.contribution_id) || [];
    list.push({
      id: item.id,
      kind: item.media_kind,
      url,
      previewUrl,
      alt: item.alt_text,
      width: item.width,
      height: item.height,
      capturedAt: item.captured_at,
      projection: item.metadata?.projection || "flat",
      featureId: item.feature_id || null,
      latitude: item.metadata?.latitude ?? null,
      longitude: item.metadata?.longitude ?? null,
      locationScope: item.metadata?.locationScope || null,
      locationLabel: item.metadata?.locationLabel || null,
    });
    mediaByContribution.set(item.contribution_id, list);
  }
  const reactionCounts = new Map();
  for (const reaction of reactions || []) {
    reactionCounts.set(reaction.contribution_id, (reactionCounts.get(reaction.contribution_id) || 0) + 1);
  }
  const profileByUser = new Map();
  await Promise.all((profiles || []).map(async (profile) => {
    const impact = await impactSummary(profile.user_id);
    profileByUser.set(profile.user_id, {
      slug: profile.public_slug,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url || null,
      level: impact.level.label,
      verifiedCrumbs: impact.verifiedCrumbs,
      placesHelped: impact.placesHelped,
      thanks: impact.thanks,
      badges: impact.badges,
    });
  }));
  return rows.map((item) => ({
    ...item,
    media: mediaByContribution.get(item.id) || [],
    helpful: reactionCounts.get(item.id) || 0,
    contributor: profileByUser.get(item.user_id) || null,
    isFresh: !item.fresh_until || new Date(item.fresh_until) >= new Date(),
  }));
}

async function thankContribution(request, response) {
  assertSameOrigin(request);
  requireFeature("COMMUNITY_WRITES_ENABLED", "Community actions are briefly paused.");
  const { user } = await authenticatedUser(request, { requireActive: true });
  enforceRateLimit(request, response, {
    name: "feed-thank",
    subject: user.id,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  const contributionId = cleanUuid(request.body?.contributionId);
  if (!contributionId) {
    response.status(400).json({ error: "Choose a published crumb to thank." });
    return;
  }
  const rows = await supabaseRequest(
    `contributions?id=eq.${contributionId}&moderation_status=eq.published&select=id,user_id&limit=1`,
    { method: "GET" },
  );
  const contribution = rows?.[0];
  if (!contribution || contribution.user_id === user.id) {
    response.status(400).json({ error: "You cannot thank this crumb." });
    return;
  }
  await supabaseRequest("contribution_reactions", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: JSON.stringify({ contribution_id: contribution.id, user_id: user.id, reaction: "helpful" }),
  });
  const reactions = await supabaseRequest(
    `contribution_reactions?contribution_id=eq.${contribution.id}&reaction=eq.helpful&select=user_id`,
    { method: "GET" },
  );
  const index = (reactions || []).findIndex((reaction) => reaction.user_id === user.id);
  if (index >= 0 && index < 5 && contribution.user_id) {
    await addImpactEvent({
      userId: contribution.user_id,
      contributionId: contribution.id,
      eventType: "unique_thank",
      points: IMPACT_POINTS.uniqueThank,
      sourceKey: `thank:${contribution.id}:${user.id}`,
    });
    await syncBadges(contribution.user_id);
  }
  response.status(200).json({ helpful: reactions?.length || 0 });
}

async function recordQuestionGap(question, institutionId) {
  const candidates = await supabaseRequest(
    `information_needs?institution_id=eq.${institutionId}&status=neq.dismissed&select=id,question_key,sample_question,canonical_answer,answer_status,expires_at,ask_count,status,intent_key,needs_enrichment,metadata,enrichment_queued_at&limit=100`,
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
      response.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=60");
      response.status(200).json({ contributions: await publishedFeed(institution) });
      return;
    }

    if (request.method === "POST") {
      if ((request.query?.action || request.body?.action) === "thank") {
        await thankContribution(request, response);
        return;
      }
      assertSameOrigin(request);
      requireFeature("COMMUNITY_WRITES_ENABLED", "Community contributions are briefly paused.");
      const body = request.body || {};
      const text = cleanText(body.body, 4000);
      const rating = body.rating ? Number(body.rating) : null;
      const mediaIds = Array.isArray(body.mediaIds)
        ? [...new Set(body.mediaIds.map(cleanUuid).filter(Boolean))].slice(0, 3)
        : [];
      if (!text && !(rating >= 1 && rating <= 5) && !mediaIds.length) {
        response.status(400).json({ error: "Add a note, rating, or media first." });
        return;
      }
      const { user } = await authenticatedUser(request, { requireActive: true });
      enforceRateLimit(request, response, {
        name: "feed-account",
        subject: user.id,
        limit: 20,
        windowMs: 60 * 60 * 1000,
      });
      const locationScope = ["place", "feature", "pin"].includes(body.target?.scope)
        ? body.target.scope
        : "place";
      const latitude = locationScope === "pin"
        ? cleanCoordinate(body.target?.latitude, -90, 90)
        : null;
      const longitude = locationScope === "pin"
        ? cleanCoordinate(body.target?.longitude, -180, 180)
        : null;
      if (locationScope === "pin" && (latitude === null || longitude === null)) {
        response.status(400).json({ error: "Choose a valid point inside the park." });
        return;
      }
      const institution = await ensureInstitution(body.place);
      let attachedMedia = [];
      if (mediaIds.length) {
        attachedMedia = await supabaseRequest(
          `media?id=in.(${mediaIds.join(",")})&user_id=eq.${user.id}&institution_id=eq.${institution.id}&storage_state=eq.uploaded&status=eq.pending&select=id`,
          { method: "GET" },
        );
        if (attachedMedia.length !== mediaIds.length) {
          response.status(400).json({ error: "One or more media uploads are incomplete." });
          return;
        }
      }
      const submitterHash = createHash("sha256")
        .update(requestFingerprint(request, "contribution"))
        .digest("hex");
      const rows = await supabaseRequest("contributions", {
        method: "POST",
        body: JSON.stringify({
          institution_id: institution.id,
          user_id: user.id,
          author_name: cleanText(body.authorName, 120) || "Local contributor",
          contribution_type: ["observation", "review", "correction", "confirmation", "question"]
            .includes(body.type)
            ? body.type
            : "observation",
          feature_id: cleanUuid(body.featureId),
          parent_id: cleanUuid(body.parentId),
          body: text || "Rated this place.",
          rating: rating >= 1 && rating <= 5 ? rating : null,
          latitude,
          longitude,
          location_scope: locationScope,
          location_accuracy_meters: locationScope === "pin"
            ? Math.min(Math.max(Number(body.target?.accuracyMeters) || 0, 0), 10000) || null
            : null,
          observed_at: cleanDate(body.observedAt) || new Date().toISOString(),
          fresh_until: freshnessFor(cleanText(body.topic, 40), cleanDate(body.observedAt)),
          verification_status: "unverified",
          source_url: cleanHttpUrl(body.sourceUrl),
          metadata: {
            clientSubmittedAt: cleanText(body.submittedAt, 80) || null,
            submitterHash,
            verificationIntent: cleanText(body.metadata?.verificationIntent, 100) || null,
            verificationAnswer: cleanText(body.metadata?.verificationAnswer, 80) || null,
            verificationPrompt: cleanText(body.metadata?.verificationPrompt, 500) || null,
            evidenceRequest: cleanText(body.metadata?.evidenceRequest, 500) || null,
            observedAt: cleanText(body.metadata?.observedAt, 80) || null,
            hasText: Boolean(text),
            topic: cleanText(body.topic, 40) || "evergreen",
            locationLabel: cleanText(body.target?.label, 180) || null,
          },
          moderation_status: "pending",
          analysis_status: "queued",
        }),
      });
      const contribution = rows?.[0];
      if (attachedMedia.length) {
        await supabaseRequest(`media?id=in.(${mediaIds.join(",")})`, {
          method: "PATCH",
          body: JSON.stringify({
            contribution_id: contribution.id,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        });
      }
      const placeRows = await supabaseRequest(
        `institutions?id=eq.${institution.id}&select=id,public_id,name,type,city,state,address,summary,hours,cost,accessibility,transit,amenities,verified_at&limit=1`,
        { method: "GET" },
      );
      const accountAgeMs = user.created_at
        ? Date.now() - new Date(user.created_at).valueOf()
        : 0;
      const publishedByUser = await supabaseRequest(
        `contributions?user_id=eq.${user.id}&moderation_status=eq.published&select=id&limit=3`,
        { method: "GET" },
      ).catch(() => []);
      const establishedContributor = Boolean(
        accountAgeMs >= 7 * 24 * 60 * 60 * 1000 && publishedByUser.length >= 3,
      );
      const requiresHumanReview =
        !establishedContributor ||
        attachedMedia.length > 0 ||
        ["confirmation", "correction"].includes(contribution.contribution_type);
      const aiReview = requiresHumanReview
        ? {
            decision: "review",
            confidence: 0,
            summary: !establishedContributor
                ? "New contributor held for human review."
                : "Trust-sensitive contribution held for human review.",
          }
        : await reviewContribution(contribution, placeRows?.[0]);
      const moderationStatus = requiresHumanReview
        ? "pending"
        : statusForDecision(aiReview.decision);
      const reviewedRows = await supabaseRequest(`contributions?id=eq.${contribution.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          moderation_status: moderationStatus,
          analysis_status: aiReview.confidence > 0 ? "complete" : "queued",
          metadata: {
            ...(contribution.metadata || {}),
            aiModeration: aiReview,
          },
        }),
      });
      const reviewedContribution = reviewedRows?.[0] || contribution;
      if (moderationStatus === "published") {
        await recordVerificationEvidence(reviewedContribution);
        await awardPublishedContribution(reviewedContribution);
      }
      let aiReply = null;
      if (moderationStatus === "published" && contribution.contribution_type === "question") {
        try {
          const informationNeedResult = await recordQuestionGap(
            reviewedContribution.body,
            institution.id,
          );
          const recordedNeed = Array.isArray(informationNeedResult)
            ? informationNeedResult[0]
            : informationNeedResult;
          const informationNeed = await syncInformationNeed(
            recordedNeed,
            reviewedContribution.body,
            body.place,
          ).catch(() => recordedNeed);
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
                  answer_status: "needs_verification",
                  answer_sources: generated.sources,
                  answered_at: null,
                  expires_at: freshnessWindow(
                    reviewedContribution.body,
                    generated.status,
                  ),
                  status: "open",
                  metadata: {
                    ...(informationNeed.metadata || {}),
                    aiDraft: {
                      generatedAt: new Date().toISOString(),
                      model: generated.model || null,
                      sourceCount: generated.sources?.length || 0,
                      proposedStatus: generated.status,
                    },
                  },
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
                  answerStatus: stored ? stored.status : "needs_verification",
                  proposedAnswerStatus: stored ? null : generated.status,
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
    response.status(error.status || 502).json({
      error: error.message === "A valid place record is required."
        ? error.message
        : error.status
          ? error.message
          : "The shared contribution feed is temporarily unavailable.",
      code: error.code,
    });
  }
};

module.exports._private = { cleanCoordinate, cleanDate, freshnessFor };
