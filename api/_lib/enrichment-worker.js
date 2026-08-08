const { databaseReady, supabaseRequest } = require("./supabase");
const { PROMPT_VERSION, enrichPlace, normalizePlace } = require("./enrichment");
const { resolveAiConnection } = require("./ai-connection");

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

async function createJob(place, institution, options = {}) {
  const connection = await resolveAiConnection({
    model: process.env.OPENAI_ENRICHMENT_MODEL || "gpt-4.1-mini",
  });
  const rows = await supabaseRequest("enrichment_jobs", {
    method: "POST",
    body: JSON.stringify({
      institution_id: institution?.id || null,
      public_id: place.publicId,
      trigger: options.trigger || "admin",
      status: "processing",
      input_snapshot: {
        ...place,
        cycleTaskId: options.cycleTaskId || null,
      },
      model: connection?.model || null,
      prompt_version: PROMPT_VERSION,
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

function addDays(value, days) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
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
  for (const answer of result.intentAnswers) {
    factRows.push({
      institution_id: institution.id,
      predicate: `answer:${answer.intentKey}`,
      value: {
        question: answer.question,
        text: answer.answer,
        sourceLabel: answer.sourceLabel,
      },
      source_id: sourceIds.get(answer.sourceUrl) || null,
      confidence: result.confidence,
      status: "proposed",
      observed_at: checkedAt,
      valid_until: addDays(checkedAt, answer.freshnessDays),
    });
  }
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
  if (result.searchOpportunity?.question) {
    factRows.push({
      institution_id: institution.id,
      predicate: "search-opportunity",
      value: result.searchOpportunity,
      confidence: result.searchOpportunity.confidence,
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

async function failJob(job, error) {
  if (!job?.id || !databaseReady()) return;
  await supabaseRequest(`enrichment_jobs?id=eq.${job.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "failed",
      error_message: String(error.message || error).slice(0, 800),
      completed_at: new Date().toISOString(),
    }),
  }).catch(() => {});
}

async function runEnrichment(placeInput, options = {}) {
  const place = normalizePlace(placeInput);
  let institution;
  let job;
  try {
    if (databaseReady()) {
      institution = await ensureInstitution(place);
      job = await createJob(place, institution, options);
    }
    const enrichment = await enrichPlace(place);
    if (databaseReady()) await persistDraft(enrichment, institution, job);
    return {
      ...enrichment,
      institution,
      job,
      persistence: databaseReady() ? "review_queue" : "not_configured",
    };
  } catch (error) {
    await failJob(job, error);
    throw error;
  }
}

module.exports = {
  createJob,
  ensureInstitution,
  failJob,
  persistDraft,
  runEnrichment,
};
