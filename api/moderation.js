const crypto = require("node:crypto");
const { authenticatedUser, trustedRole } = require("./_lib/account-auth");
const { enforceRateLimit } = require("./_lib/abuse-controls");
const { databaseConfig, databaseReady, supabaseRequest } = require("./_lib/supabase");
const { reviewContribution, statusForDecision } = require("./_lib/moderation");
const { recordVerificationEvidence } = require("./_lib/verification-evidence");
const {
  addImpactEvent,
  awardPublishedContribution,
  IMPACT_POINTS,
  syncBadges,
} = require("./_lib/crumb-impact");
const { processContributionMedia } = require("./_lib/media-processing");
const { _private: mediaPrivate } = require("./media");
const { buildDiscoveryFollowUp } = require("./_lib/discovery-followups");

function cleanText(value, maxLength = 200) {
  return String(value || "").trim().slice(0, maxLength);
}

function tokenAuthorized(request) {
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

async function authorizationContext(request) {
  if (tokenAuthorized(request)) return { authorized: true, user: null };
  try {
    const { user } = await authenticatedUser(request, { requireActive: true });
    return {
      authorized: ["moderator", "super_admin"].includes(trustedRole(user)),
      user,
    };
  } catch {
    return { authorized: false, user: null };
  }
}

async function reportInbox() {
  let rows;
  try {
    rows = await supabaseRequest(
      "reports?status=eq.open&select=id,institution_id,user_id,target_type,contribution_id,reported_user_id,reason,details,status,metadata,created_at&order=created_at.asc&limit=200",
      { method: "GET" },
    );
  } catch (error) {
    if (!/column|schema cache/i.test(`${error.detail || ""} ${error.message || ""}`)) throw error;
    rows = await supabaseRequest(
      "reports?status=eq.open&select=id,institution_id,user_id,reason,status,created_at&order=created_at.asc&limit=200",
      { method: "GET" },
    );
  }
  return attachPlaces(rows || []);
}

async function authUser(userId) {
  const config = databaseConfig();
  const authResponse = await fetch(`${config.url}/auth/v1/admin/users/${userId}`, {
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
    },
  });
  const payload = await authResponse.json().catch(() => ({}));
  if (!authResponse.ok || !payload.id) throw new Error("The reported account could not be found.");
  return payload;
}

async function suspendAccount(userId, reportId) {
  const user = await authUser(userId);
  if (["moderator", "super_admin"].includes(trustedRole(user))) {
    const error = new Error("Privileged accounts require direct owner review.");
    error.status = 409;
    throw error;
  }
  await supabaseRequest(`community_profiles?user_id=eq.${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ profile_status: "suspended" }),
  }).catch(() => null);
  const config = databaseConfig();
  const authResponse = await fetch(`${config.url}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_metadata: {
        ...(user.app_metadata || {}),
        auditmap_suspended: true,
        auditmap_suspension_report_id: reportId,
        auditmap_suspended_at: new Date().toISOString(),
      },
    }),
  });
  if (!authResponse.ok) throw new Error("The account could not be suspended.");
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

async function attachMedia(contributions) {
  const contributionIds = contributions.map((item) => item.id).filter(Boolean);
  if (!contributionIds.length) return contributions;
  const media = await supabaseRequest(
    `media?contribution_id=in.(${contributionIds.join(",")})&select=id,contribution_id,media_kind,storage_path,alt_text,width,height,byte_size,checksum,storage_state,status,metadata,created_at&order=created_at.asc`,
    { method: "GET" },
  );
  const checksums = [...new Set((media || []).map((item) => item.checksum).filter(Boolean))];
  const duplicates = checksums.length
    ? await supabaseRequest(
        `media?checksum=in.(${checksums.join(",")})&status=eq.published&select=id,checksum`,
        { method: "GET" },
      )
    : [];
  const duplicateCounts = new Map();
  for (const item of duplicates || []) {
    duplicateCounts.set(item.checksum, (duplicateCounts.get(item.checksum) || 0) + 1);
  }
  const byContribution = new Map();
  for (const item of media || []) {
    const list = byContribution.get(item.contribution_id) || [];
    list.push({
      ...item,
      duplicate_count: duplicateCounts.get(item.checksum) || 0,
      review_url: await mediaPrivate.signedMediaUrl(item.storage_path, 900),
    });
    byContribution.set(item.contribution_id, list);
  }
  return contributions.map((item) => ({
    ...item,
    media: byContribution.get(item.id) || [],
  }));
}

async function attachPlacesAndMedia(contributions) {
  return attachMedia(await attachPlaces(contributions));
}

async function contributionInbox(status) {
  try {
    const rows = await supabaseRequest(
      `contributions?moderation_status=eq.${status}&select=id,institution_id,user_id,feature_id,parent_id,author_name,contribution_type,body,rating,source_url,metadata,latitude,longitude,location_scope,location_accuracy_meters,observed_at,fresh_until,verification_status,moderation_status,analysis_status,created_at,updated_at&order=created_at.asc&limit=200`,
      { method: "GET" },
    );
    return attachPlacesAndMedia(rows || []);
  } catch (error) {
    if (!/column|schema cache|media/i.test(`${error.detail || ""} ${error.message || ""}`)) throw error;
    const rows = await supabaseRequest(
      `contributions?moderation_status=eq.${status}&select=id,institution_id,user_id,author_name,contribution_type,body,rating,source_url,metadata,moderation_status,analysis_status,created_at,updated_at&order=created_at.asc&limit=200`,
      { method: "GET" },
    );
    return attachPlaces(rows || []);
  }
}

async function enrichmentFacts() {
  const facts = await supabaseRequest(
    "place_facts?status=eq.proposed&select=id,institution_id,predicate,value,source_id,confidence,status,observed_at,valid_until,created_at&order=created_at.asc&limit=200",
    { method: "GET" },
  );
  const attached = await attachPlaces(facts || []);
  const sourceIds = [...new Set(attached.map((fact) => fact.source_id).filter(Boolean))];
  const sources = sourceIds.length
    ? await supabaseRequest(
        `sources?id=in.(${sourceIds.join(",")})&select=id,label,url,source_type,checked_at`,
        { method: "GET" },
      )
    : [];
  const institutionIds = [...new Set(attached.map((fact) => fact.institution_id).filter(Boolean))];
  const jobs = institutionIds.length
    ? await supabaseRequest(
        `enrichment_jobs?institution_id=in.(${institutionIds.join(",")})&status=eq.review_needed&select=id,institution_id,input_snapshot,model,prompt_version,created_at&order=created_at.desc`,
        { method: "GET" },
      )
    : [];
  const sourceById = new Map((sources || []).map((source) => [source.id, source]));
  const jobByInstitution = new Map();
  for (const job of jobs || []) {
    if (!jobByInstitution.has(job.institution_id)) jobByInstitution.set(job.institution_id, job);
  }
  return attached.map((fact) => ({
    ...fact,
    source: sourceById.get(fact.source_id) || null,
    job: jobByInstitution.get(fact.institution_id) || null,
  }));
}

async function verificationClaims() {
  const claims = await supabaseRequest(
    "claims?verification_status=eq.unreviewed&predicate=like.answer:*&select=id,institution_id,contribution_id,predicate,value,claim_text,confidence,verification_status,extracted_at&order=extracted_at.asc&limit=200",
    { method: "GET" },
  );
  const attached = await attachPlaces(claims || []);
  const contributionIds = [
    ...new Set(attached.map((claim) => claim.contribution_id).filter(Boolean)),
  ];
  const contributions = contributionIds.length
    ? await supabaseRequest(
        `contributions?id=in.(${contributionIds.join(",")})&select=id,author_name,body,source_url,metadata,created_at,moderation_status`,
        { method: "GET" },
      )
    : [];
  const contributionById = new Map(
    (contributions || []).map((contribution) => [contribution.id, contribution]),
  );
  return attached.map((claim) => ({
    ...claim,
    contribution: contributionById.get(claim.contribution_id) || null,
  }));
}

module.exports = async function handler(request, response) {
  if (!databaseReady()) {
    response.status(503).json({ error: "The shared database is not configured." });
    return;
  }
  const access = await authorizationContext(request);
  if (!access.authorized) {
    response.status(401).json({ error: "Review access could not be confirmed." });
    return;
  }

  try {
    enforceRateLimit(request, response, {
      name: "moderation",
      limit: 240,
      windowMs: 10 * 60 * 1000,
    });
    if (request.method === "GET") {
      if (request.query.status === "reports") {
        response.setHeader("Cache-Control", "no-store");
        response.status(200).json({ reports: await reportInbox() });
        return;
      }
      if (request.query.status === "enrichment") {
        response.setHeader("Cache-Control", "no-store");
        response.status(200).json({ enrichmentFacts: await enrichmentFacts() });
        return;
      }
      if (request.query.status === "claims") {
        response.setHeader("Cache-Control", "no-store");
        response.status(200).json({ verificationClaims: await verificationClaims() });
        return;
      }
      if (request.query.status === "needs") {
        const needs = await supabaseRequest(
          "information_needs?status=eq.open&select=id,institution_id,sample_question,ask_count,status,first_asked_at,last_asked_at,intent_key,canonical_answer,answer_status,answer_sources,expires_at,needs_enrichment,metadata&order=ask_count.desc,last_asked_at.desc&limit=200",
          { method: "GET" },
        );
        response.setHeader("Cache-Control", "no-store");
        response.status(200).json({ informationNeeds: await attachPlaces(needs || []) });
        return;
      }
      if (request.query.status === "followups") {
        const needs = await supabaseRequest(
          "information_needs?status=eq.answered&answer_status=in.(answered,partial)&select=id,institution_id,sample_question,ask_count,status,answer_status,canonical_answer,answer_sources,answered_at,expires_at,metadata&order=answered_at.desc&limit=200",
          { method: "GET" },
        );
        const attached = await attachPlaces(needs || []);
        response.setHeader("Cache-Control", "no-store");
        response.status(200).json({
          followUps: attached.map(buildDiscoveryFollowUp).filter(Boolean),
        });
        return;
      }
      const status = ["pending", "published", "rejected"].includes(request.query.status)
        ? request.query.status
        : "pending";
      response.setHeader("Cache-Control", "no-store");
      response.status(200).json({ contributions: await contributionInbox(status) });
      return;
    }

    if (request.method === "POST") {
      const id = cleanText(request.body?.id, 36);
      const action = cleanText(request.body?.action, 20);
      if (request.body?.resourceType === "report") {
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
          !["resolve", "dismiss", "suspend"].includes(action)
        ) {
          response.status(400).json({ error: "Choose a valid report decision." });
          return;
        }
        let currentRows;
        try {
          currentRows = await supabaseRequest(
            `reports?id=eq.${id}&status=eq.open&select=id,reason,contribution_id,reported_user_id&limit=1`,
            { method: "GET" },
          );
        } catch (error) {
          if (!/column|schema cache/i.test(`${error.detail || ""} ${error.message || ""}`)) throw error;
          currentRows = await supabaseRequest(
            `reports?id=eq.${id}&status=eq.open&select=id,reason&limit=1`,
            { method: "GET" },
          );
        }
        const report = currentRows?.[0];
        if (!report) {
          response.status(404).json({ error: "That report is no longer open." });
          return;
        }
        let reportedUserId = report.reported_user_id || null;
        const fallbackContributionId = report.contribution_id ||
          String(report.reason || "").match(/^\[contribution:([0-9a-f-]{36})\]/i)?.[1];
        if (!reportedUserId && fallbackContributionId) {
          const contributions = await supabaseRequest(
            `contributions?id=eq.${fallbackContributionId}&select=user_id&limit=1`,
            { method: "GET" },
          );
          reportedUserId = contributions?.[0]?.user_id || null;
        }
        if (action === "suspend") {
          if (!reportedUserId) {
            response.status(409).json({ error: "This report is not connected to an account." });
            return;
          }
          await suspendAccount(reportedUserId, report.id);
        }
        const status = action === "dismiss" ? "dismissed" : "resolved";
        const patch = {
          status,
          resolved_at: new Date().toISOString(),
        };
        if (access.user?.id) patch.reviewed_by = access.user.id;
        try {
          await supabaseRequest(`reports?id=eq.${id}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
          });
        } catch (error) {
          if (!/reviewed_by|column|schema cache/i.test(`${error.detail || ""} ${error.message || ""}`)) throw error;
          delete patch.reviewed_by;
          await supabaseRequest(`reports?id=eq.${id}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
          });
        }
        response.status(200).json({
          message: action === "suspend"
            ? "Account suspended and report resolved."
            : action === "dismiss"
              ? "Report dismissed."
              : "Report resolved.",
        });
        return;
      }
      if (request.body?.resourceType === "verificationClaim") {
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            id,
          ) ||
          !["accept", "reject"].includes(action)
        ) {
          response.status(400).json({ error: "Choose a valid claim decision." });
          return;
        }
        const currentRows = await supabaseRequest(
          `claims?id=eq.${id}&verification_status=eq.unreviewed&select=id,institution_id,predicate,value,contribution_id&limit=1`,
          { method: "GET" },
        );
        const current = currentRows?.[0];
        if (!current) {
          response.status(404).json({ error: "That claim is no longer waiting for review." });
          return;
        }
        const reviewedAt = new Date().toISOString();
        const reviewedRows = await supabaseRequest(`claims?id=eq.${id}`, {
          method: "PATCH",
          body: JSON.stringify({
            verification_status: action === "accept" ? "accepted" : "rejected",
            reviewed_at: reviewedAt,
          }),
        });
        if (action === "accept" && current.predicate.startsWith("answer:")) {
          const intentKey = current.predicate.slice("answer:".length);
          const needs = await supabaseRequest(
            `information_needs?institution_id=eq.${current.institution_id}&intent_key=eq.${encodeURIComponent(intentKey)}&status=neq.dismissed&select=id,metadata&limit=1`,
            { method: "GET" },
          );
          const need = needs?.[0];
          if (need) {
            const acceptedIds = Array.isArray(need.metadata?.acceptedCommunityClaimIds)
              ? need.metadata.acceptedCommunityClaimIds
              : [];
            const nextIds = [...new Set([...acceptedIds, current.id])].slice(-50);
            await supabaseRequest(`information_needs?id=eq.${need.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                status: "open",
                needs_enrichment: true,
                enrichment_queued_at: null,
                metadata: {
                  ...(need.metadata || {}),
                  acceptedCommunityClaimIds: nextIds,
                  acceptedCommunityEvidenceCount: nextIds.length,
                  lastAcceptedCommunityEvidenceAt: reviewedAt,
                },
              }),
            });
          }
        }
        if (action === "accept" && current.contribution_id) {
          const contributorRows = await supabaseRequest(
            `contributions?id=eq.${current.contribution_id}&select=id,user_id,institution_id&limit=1`,
            { method: "GET" },
          );
          const contributor = contributorRows?.[0];
          if (contributor) {
            await supabaseRequest(`contributions?id=eq.${contributor.id}`, {
              method: "PATCH",
              body: JSON.stringify({ verification_status: "verified" }),
            });
          }
          if (contributor?.user_id) {
            await addImpactEvent({
              userId: contributor.user_id,
              contributionId: contributor.id,
              eventType: "accepted_verification",
              points: IMPACT_POINTS.acceptedVerification,
              sourceKey: `claim:${current.id}:accepted`,
              metadata: { institutionId: contributor.institution_id },
            });
            await syncBadges(contributor.user_id);
          }
        }
        response.setHeader("Cache-Control", "no-store");
        response.status(200).json({
          claim: reviewedRows?.[0],
          message:
            action === "accept"
              ? "Accepted as community evidence and queued for answer synthesis."
              : "Rejected and excluded from answer synthesis.",
        });
        return;
      }
      if (request.body?.resourceType === "enrichmentFact") {
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            id,
          ) ||
          !["accept", "reject"].includes(action)
        ) {
          response.status(400).json({ error: "Choose a valid AI-fact decision." });
          return;
        }
        const currentRows = await supabaseRequest(
          `place_facts?id=eq.${id}&status=eq.proposed&select=id,institution_id,predicate,value,source_id,observed_at,valid_until&limit=1`,
          { method: "GET" },
        );
        const current = currentRows?.[0];
        if (!current) {
          response.status(404).json({ error: "That proposed fact is no longer waiting for review." });
          return;
        }
        if (
          action === "accept" &&
          !current.source_id &&
          current.predicate !== "search-opportunity"
        ) {
          response.status(400).json({
            error: "A sourced fact is required. Reject this draft or attach evidence before accepting it.",
          });
          return;
        }
        const reviewedRows = await supabaseRequest(`place_facts?id=eq.${id}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: action === "accept" ? "accepted" : "superseded",
          }),
        });
        if (action === "accept" && current.predicate.startsWith("answer:")) {
          const intentKey = current.predicate.slice("answer:".length);
          const sourceRows = await supabaseRequest(
            `sources?id=eq.${current.source_id}&select=label,url,source_type&limit=1`,
            { method: "GET" },
          );
          const source = sourceRows?.[0];
          await supabaseRequest(
            `information_needs?institution_id=eq.${current.institution_id}&intent_key=eq.${encodeURIComponent(intentKey)}&status=eq.open`,
            {
              method: "PATCH",
              body: JSON.stringify({
                canonical_answer: current.value?.text || null,
                answer_status: "answered",
                answer_sources: source
                  ? [{
                      title: source.label,
                      url: source.url,
                      sourceType: source.source_type,
                    }]
                  : [],
                answered_at: current.observed_at || new Date().toISOString(),
                expires_at: current.valid_until,
                status: "answered",
                needs_enrichment: false,
                enrichment_queued_at: null,
              }),
            },
          );
        }
        const remaining = await supabaseRequest(
          `place_facts?institution_id=eq.${current.institution_id}&status=eq.proposed&select=id&limit=1`,
          { method: "GET" },
        );
        if (!remaining?.length) {
          await Promise.all([
            supabaseRequest(`institutions?id=eq.${current.institution_id}`, {
              method: "PATCH",
              body: JSON.stringify({ enrichment_status: "complete" }),
            }),
            supabaseRequest(
              `enrichment_jobs?institution_id=eq.${current.institution_id}&status=eq.review_needed`,
              {
                method: "PATCH",
                body: JSON.stringify({
                  status: "complete",
                  completed_at: new Date().toISOString(),
                }),
              },
            ),
          ]);
        }
        response.setHeader("Cache-Control", "no-store");
        response.status(200).json({
          fact: reviewedRows?.[0],
        message: action === "accept"
            ? current.predicate === "search-opportunity"
              ? "Approved as an internal search opportunity. Evidence is still required before publication."
              : "Accepted as a sourced AuditMap fact."
            : "Rejected and kept out of public answers.",
        });
        return;
      }
      if (request.body?.resourceType === "informationNeed") {
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            id,
          ) ||
          !["answered", "dismissed", "open", "followup_prepared"].includes(action)
        ) {
          response.status(400).json({ error: "Choose a valid information-gap decision." });
          return;
        }
        if (action === "followup_prepared") {
          const currentRows = await supabaseRequest(
            `information_needs?id=eq.${id}&status=eq.answered&select=id,metadata&limit=1`,
            { method: "GET" },
          );
          const current = currentRows?.[0];
          if (!current || current.metadata?.followUpStatus !== "queued") {
            response.status(404).json({ error: "That follow-up is no longer queued." });
            return;
          }
          const preparedAt = new Date().toISOString();
          const rows = await supabaseRequest(`information_needs?id=eq.${id}`, {
            method: "PATCH",
            body: JSON.stringify({
              metadata: {
                ...(current.metadata || {}),
                followUpStatus: "prepared",
                followUpPreparedAt: preparedAt,
              },
            }),
          });
          response.setHeader("Cache-Control", "no-store");
          response.status(200).json({
            informationNeed: rows?.[0],
            message: "Follow-up marked prepared. Publication remains a separate human action.",
          });
          return;
        }
        if (action === "answered") {
          const currentRows = await supabaseRequest(
            `information_needs?id=eq.${id}&select=id,canonical_answer,answer_sources,metadata&limit=1`,
            { method: "GET" },
          );
          const current = currentRows?.[0];
          const sources = Array.isArray(current?.answer_sources)
            ? current.answer_sources.filter((source) => /^https?:\/\//i.test(source?.url || ""))
            : [];
          if (!current?.canonical_answer || !sources.length) {
            response.status(409).json({
              error: "A direct answer with at least one public source is required before approval.",
            });
            return;
          }
          const reviewedAt = new Date().toISOString();
          const rows = await supabaseRequest(`information_needs?id=eq.${id}`, {
            method: "PATCH",
            body: JSON.stringify({
              status: "answered",
              answer_status: "answered",
              answered_at: reviewedAt,
              needs_enrichment: false,
              enrichment_queued_at: null,
              metadata: {
                ...(current.metadata || {}),
                followUpStatus: "queued",
                followUpReadyAt: reviewedAt,
                reviewedBy: access.user?.id || "review-token",
              },
            }),
          });
          response.setHeader("Cache-Control", "no-store");
          response.status(200).json({
            informationNeed: rows?.[0],
            message: "Approved as a sourced answer and queued for a visitor follow-up.",
          });
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
        !["publish", "publish_text", "reject", "pending", "analyze"].includes(action)
      ) {
        response.status(400).json({ error: "Choose a valid review decision." });
        return;
      }
      const currentRows = await supabaseRequest(
        `contributions?id=eq.${id}&select=id,institution_id,user_id,feature_id,parent_id,contribution_type,body,rating,source_url,metadata,latitude,longitude,location_scope,observed_at,fresh_until,verification_status,moderation_status&limit=1`,
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
        const attachedMedia = await supabaseRequest(
          `media?contribution_id=eq.${id}&status=eq.pending&select=id&limit=1`,
          { method: "GET" },
        );
        const moderationStatus = attachedMedia?.length
          ? "pending"
          : statusForDecision(aiReview.decision);
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
        if (moderationStatus === "published") {
          await recordVerificationEvidence(rows?.[0] || {
            ...current,
            moderation_status: moderationStatus,
          });
          await awardPublishedContribution(rows?.[0] || {
            ...current,
            moderation_status: moderationStatus,
          });
        }
        response.setHeader("Cache-Control", "no-store");
        response.status(200).json({
          contribution: rows?.[0],
          message: `AI review recommends ${aiReview.decision}.`,
        });
        return;
      }

      const moderationStatus =
        ["publish", "publish_text"].includes(action)
          ? "published"
          : action === "reject"
            ? "rejected"
            : "pending";
      if (action === "publish") await processContributionMedia(id);
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
      if (["publish", "publish_text", "reject", "pending"].includes(action)) {
        const publishMedia = action === "publish";
        const returnMediaToReview = action === "pending";
        await supabaseRequest(`media?contribution_id=eq.${id}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: publishMedia ? "published" : returnMediaToReview ? "pending" : "rejected",
            storage_state: publishMedia ? "published" : returnMediaToReview ? "uploaded" : "rejected",
            ...(publishMedia ? {} : {
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }),
          }),
        });
      }
      if (moderationStatus === "published") {
        await recordVerificationEvidence(rows?.[0] || {
          ...current,
          moderation_status: moderationStatus,
        });
        await awardPublishedContribution(rows?.[0] || {
          ...current,
          moderation_status: moderationStatus,
        });
      }
      response.setHeader("Cache-Control", "no-store");
      response.status(200).json({
        contribution: rows?.[0],
        message:
          action === "publish"
            ? "Published to the community record."
            : action === "publish_text"
              ? "Published the text and kept attached media private."
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
    response.status(error.status || 502).json({
      error: error.status ? error.message : "The review inbox is temporarily unavailable.",
      code: error.code,
    });
  }
};
