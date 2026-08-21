const { databaseReady, supabaseRequest } = require("./_lib/supabase");
const {
  assertSameOrigin,
  enforceRateLimit,
  requestFingerprint,
  requireFeature,
} = require("./_lib/abuse-controls");

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

async function findInstitution(publicId) {
  const rows = await supabaseRequest(
    `institutions?public_id=eq.${encodeURIComponent(publicId)}&select=id&limit=1`,
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
    response.status(503).json({ error: "Shared database not configured." });
    return;
  }

  try {
    assertSameOrigin(request);
    requireFeature("COMMUNITY_WRITES_ENABLED", "Steward applications are briefly paused.");
    enforceRateLimit(request, response, {
      name: "steward-application",
      subject: requestFingerprint(request, "steward-application"),
      limit: 3,
      windowMs: 24 * 60 * 60 * 1000,
    });
  } catch (error) {
    response.status(error.status || 403).json({ error: error.message, code: error.code });
    return;
  }

  const body = request.body || {};
  const placeId = cleanText(body.place?.id, 180);
  const name = cleanText(body.name, 120);
  const message = cleanText(body.message, 2000);
  const relationship = cleanText(body.relationship, 40);
  const allowedRelationships = ["employee", "volunteer", "neighbor", "advocate", "other"];

  if (!placeId || !name || !message || !allowedRelationships.includes(relationship)) {
    response.status(400).json({ error: "Complete the steward application first." });
    return;
  }

  try {
    const institution = await findInstitution(placeId);
    if (!institution) {
      response.status(404).json({
        error: "This place must be added to the shared record before stewardship can be reviewed.",
      });
      return;
    }
    const rows = await supabaseRequest("place_steward_applications", {
      method: "POST",
      body: JSON.stringify({
        institution_id: institution.id,
        applicant_name: name,
        relationship,
        message,
        verification_url: cleanHttpUrl(body.sourceUrl),
        status: "pending",
      }),
    });
    response.status(202).json({
      application: rows?.[0],
      message: "Steward interest saved for independent review.",
    });
  } catch {
    response.status(502).json({ error: "Steward interest could not be shared right now." });
  }
};
