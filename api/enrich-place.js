const crypto = require("crypto");
const { cleanText } = require("./_lib/enrichment");
const { runEnrichment } = require("./_lib/enrichment-worker");

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

  try {
    const enrichment = await runEnrichment(request.body?.place || request.body, {
      trigger: "admin",
    });
    response.setHeader("Cache-Control", "no-store");
    response.status(200).json({
      place: enrichment.place,
      draft: enrichment.result,
      completenessScore: enrichment.quality.score,
      qualityTier: enrichment.quality.tier,
      reviewRequired: true,
      persistence: enrichment.persistence,
    });
  } catch (error) {
    console.error("Place enrichment failed:", error.message);
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
