const crypto = require("crypto");
const catalog = require("../data/generated/official-catalog.json");
const queue = require("../data/generated/enrichment-queue.json");
const { databaseReady, supabaseRequest } = require("./_lib/supabase");
const { runEnrichment } = require("./_lib/enrichment-worker");
const {
  checkAiConnection,
  resolveAiConnection,
} = require("./_lib/ai-connection");

function safeEqual(supplied, expected) {
  if (!supplied || !expected) return false;
  const left = Buffer.from(String(supplied));
  const right = Buffer.from(String(expected));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function authorized(request) {
  const bearer = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const admin = request.headers["x-enrichment-token"];
  return safeEqual(bearer, process.env.CRON_SECRET) ||
    safeEqual(bearer, process.env.ENRICHMENT_ADMIN_TOKEN) ||
    safeEqual(admin, process.env.ENRICHMENT_ADMIN_TOKEN);
}

function googleMapsListing(record) {
  const query = [record.name, record.address, record.city, record.state]
    .filter(Boolean)
    .join(" ");
  return {
    label: `${record.name} on Google Maps`,
    url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    sourceType: "other",
  };
}

async function activeJob(publicId) {
  const rows = await supabaseRequest(
    `enrichment_jobs?public_id=eq.${encodeURIComponent(publicId)}&status=in.(queued,processing,review_needed)&select=id,status,input_snapshot,created_at&order=created_at.desc&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] || null;
}

async function acceptedAnswer(publicId, intentKey) {
  const institutions = await supabaseRequest(
    `institutions?public_id=eq.${encodeURIComponent(publicId)}&select=id&limit=1`,
    { method: "GET" },
  );
  if (!institutions?.[0]?.id) return null;
  const facts = await supabaseRequest(
    `place_facts?institution_id=eq.${institutions[0].id}&predicate=eq.${encodeURIComponent(`answer:${intentKey}`)}&status=eq.accepted&select=id,valid_until,updated_at&order=updated_at.desc&limit=1`,
    { method: "GET" },
  );
  const fact = facts?.[0];
  if (!fact) return null;
  if (fact.valid_until && new Date(fact.valid_until) < new Date()) return null;
  return fact;
}

async function nextTaskBundle() {
  for (const task of queue.tasks.slice(0, 100)) {
    if (await activeJob(task.placeId)) continue;
    const candidates = queue.tasks
      .filter((candidate) => candidate.placeId === task.placeId)
      .slice(0, 10);
    const tasks = [];
    for (const candidate of candidates) {
      if (!(await acceptedAnswer(candidate.placeId, candidate.intentKey))) {
        tasks.push(candidate);
      }
    }
    if (tasks.length) {
      return {
        id: `${task.placeId}:visitor-baseline`,
        placeId: task.placeId,
        placeName: task.placeName,
        tasks,
      };
    }
  }
  return null;
}

module.exports = async function handler(request, response) {
  if (!["GET", "POST"].includes(request.method)) {
    response.setHeader("Allow", "GET, POST");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }
  if (!process.env.CRON_SECRET && !process.env.ENRICHMENT_ADMIN_TOKEN) {
    response.status(503).json({ error: "The enrichment cycle is not enabled." });
    return;
  }
  if (!authorized(request)) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }
  if (!databaseReady()) {
    response.status(503).json({
      error: "The enrichment cycle requires the database connection.",
      queueSummary: queue.summary,
    });
    return;
  }

  try {
    const taskBundle = await nextTaskBundle();
    const ai = await resolveAiConnection({
      model: process.env.OPENAI_ENRICHMENT_MODEL || "gpt-4.1-mini",
    });
    const aiReadiness = await checkAiConnection(ai);
    if (request.query?.dryRun === "true") {
      response.setHeader("Cache-Control", "no-store");
      response.status(200).json({
        status: "dry_run",
        nextTask: taskBundle,
        queueSummary: queue.summary,
        databaseConfigured: true,
        aiConfigured: Boolean(ai),
        aiReady: aiReadiness.ready,
        aiReadinessReason: aiReadiness.reason,
        writesPerformed: false,
      });
      return;
    }
    if (!aiReadiness.ready) {
      response.status(503).json({
        error: aiReadiness.reason || "The enrichment cycle requires a ready AI connection.",
        queueSummary: queue.summary,
      });
      return;
    }
    if (!taskBundle) {
      response.status(200).json({
        status: "waiting_for_review",
        message: "Every prioritized place already has active or review-needed enrichment.",
        queueSummary: queue.summary,
      });
      return;
    }
    const record = catalog.places.find((place) => place.id === taskBundle.placeId);
    if (!record) {
      response.status(500).json({ error: "The selected queue task has no catalog record." });
      return;
    }

    const enrichment = await runEnrichment({
      id: record.id,
      name: record.name,
      type: record.type,
      city: record.city,
      state: record.state,
      address: record.address,
      source: record.officialSource?.url,
      sourceLabel: record.officialSource?.label,
      researchTasks: taskBundle.tasks.map((task) => ({
        ...task,
        suggestedSources: [
          ...(task.suggestedSources || []),
          googleMapsListing(record),
        ],
      })),
    }, {
      trigger: "scheduled",
      cycleTaskId: taskBundle.id,
    });

    response.setHeader("Cache-Control", "no-store");
    response.status(200).json({
      status: "review_needed",
      task: taskBundle,
      proposedAnswers: enrichment.result.intentAnswers.length,
      unresolved: enrichment.result.unresolved.length,
      completenessScore: enrichment.quality.score,
      reviewRequired: true,
      jobId: enrichment.job?.id || null,
    });
  } catch (error) {
    console.error("Scheduled enrichment failed:", error.message);
    response.status(error.statusCode || 500).json({
      error: error.statusCode && error.statusCode < 500
        ? error.message
        : "The scheduled enrichment cycle could not complete.",
    });
  }
};

module.exports.config = {
  maxDuration: 60,
};
