const crypto = require("crypto");
const { databaseReady, supabaseRequest } = require("./_lib/supabase");
const { cleanText, enrichPlace } = require("./_lib/enrichment");

function authorized(request) {
  const expected = process.env.ENRICHMENT_ADMIN_TOKEN;
  if (!expected) return false;
  const supplied = cleanText(
    request.headers["x-enrichment-token"] ||
      String(request.headers.authorization || "").replace(/^Bearer\s+/i, ""),
    500,
  );
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function findInstitution(publicId) {
  const rows = await supabaseRequest(
    `institutions?public_id=eq.${encodeURIComponent(publicId)}&select=id,public_id&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] || null;
}

async function ensureInstitution(place) {
  const existing = await findInstitution(place.publicId);
  if (existing) return existing;
  const rows = await supabaseRequest("institutions", {
    method: "POST",
    body: JSON.stringify({
      public_id: place.publicId,
      slug: place.publicId.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: place.name,
      type: place.type,
      city: place.city,
      state: place.state,
      country_code: place.countryCode,
      neighborhood: place.neighborhood || null,
      address: place.address || `${place.city}, ${place.state}`,
      latitude: place.latitude,
      longitude: place.longitude,
      status: "pending",
      enrichment_status: "processing",
    }),
  });
  return rows[0];
}

async function createJob(place, institution) {
  const rows = await supabaseRequest("enrichment_jobs", {
    method: "POST",
    body: JSON.stringify({
      institution_id: institution?.id || null,
      public_id: place.publicId,
      status: "processing",
      input_snapshot: place,
      model: process.env.OPENAI_ENRICHMENT_MODEL || "gpt-4.1-mini",
      prompt_version: "place-enrichment-v1",
      started_at: new Date().toISOString(),
    }),
  });
  return rows[0];
}

async function persistSources(institutionId, sources) {
  const existing = await supabaseRequest(
    `sources?institution_id=eq.${institutionId}&select=id,url`,
    { method: "GET" },
  );
  const known = new Map((existing || []).map((source) => [source.url, source.id]));
  const additions = sources.filter((source) => !known.has(source.url));
  if (additions.length) {
    const inserted = await supabaseRequest("sources", {
      method: "POST",
      body: JSON.stringify(additions.map((source) => ({
        institution_id: institutionId,
        label: source.label,
        url: source.url,
        source_type: source.sourceType,
        checked_at: source.checkedAt,
      }))),
    });
    for (const source of inserted || []) known.set(source.url, source.id);
  }
  return known;
}

async function persistDraft(enrichment, institution, job) {
  const { result, quality, model, promptVersion } = enrichment;
  const checkedAt = new Date().toISOString();
  const sourceIds = await persistSources(institution.id, result.sources);

  await supabaseRequest(`institutions?id=eq.${institution.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      summary: result.synopsis || null,
      hours: result.facts.hours || null,
      cost: result.facts.cost || null,
      accessibility: result.facts.accessibility || null,
      transit: result.facts.transit || null,
      amenities: result.amenities,
      enrichment_status: "review_needed",
      completeness_score: quality.score,
      quality_tier: quality.tier,
      last_enriched_at: checkedAt,
    }),
  });

  if (result.synopsis) {
    await supabaseRequest("briefs", {
      method: "POST",
      body: JSON.stringify({
        institution_id: institution.id,
        body: result.synopsis,
        source_ids: [...sourceIds.values()],
        model,
        prompt_version: promptVersion,
        status: "draft",
      }),
    });
  }

  const factRows = Object.entries(result.facts)
    .filter(([, value]) => value)
    .map(([predicate, value]) => ({
      institution_id: institution.id,
      predicate,
      value: { text: value },
      confidence: result.confidence,
      status: "proposed",
      observed_at: checkedAt,
    }));
  if (result.amenities.length) {
    factRows.push({
      institution_id: institution.id,
      predicate: "amenities",
      value: { items: result.amenities },
      confidence: result.confidence,
      status: "proposed",
      observed_at: checkedAt,
    });
  }
  if (factRows.length) {
    await supabaseRequest("place_facts", {
      method: "POST",
      body: JSON.stringify(factRows),
    });
  }

  await supabaseRequest(`enrichment_jobs?id=eq.${job.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "review_needed",
      output_snapshot: result,
      completeness_score: quality.score,
      quality_tier: quality.tier,
      completed_at: checkedAt,
    }),
  });
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }
  if (!process.env.ENRICHMENT_ADMIN_TOKEN) {
    response.status(503).json({ error: "The enrichment worker is not enabled." });
    return;
  }
  if (!authorized(request)) {
    response.status(401).json({ error: "Unauthorized." });
    return;
  }

  let institution;
  let job;
  try {
    const placeInput = request.body?.place || request.body;
    if (databaseReady()) {
      const normalized = require("./_lib/enrichment").normalizePlace(placeInput);
      institution = await ensureInstitution(normalized);
      job = await createJob(normalized, institution);
    }
    const enrichment = await enrichPlace(placeInput);
    if (databaseReady()) await persistDraft(enrichment, institution, job);

    response.setHeader("Cache-Control", "no-store");
    response.status(200).json({
      place: enrichment.place,
      draft: enrichment.result,
      completenessScore: enrichment.quality.score,
      qualityTier: enrichment.quality.tier,
      reviewRequired: true,
      persistence: databaseReady() ? "review_queue" : "not_configured",
    });
  } catch (error) {
    console.error("Place enrichment failed:", error.message);
    if (job?.id) {
      await supabaseRequest(`enrichment_jobs?id=eq.${job.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "failed",
          error_message: cleanText(error.message, 800),
          completed_at: new Date().toISOString(),
        }),
      }).catch(() => {});
    }
    response.status(error.statusCode || 500).json({
      error: error.statusCode && error.statusCode < 500
        ? error.message
        : "This place could not be enriched right now.",
    });
  }
};

module.exports.config = {
  maxDuration: 60,
};
