const { databaseReady, supabaseRequest } = require("./_lib/supabase");

function cleanText(value, limit = 180) {
  return String(value || "").trim().slice(0, limit);
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }
  if (!databaseReady()) {
    response.status(200).json({ questions: [] });
    return;
  }

  try {
    const placeId = cleanText(request.query.placeId);
    const institutions = await supabaseRequest(
      `institutions?public_id=eq.${encodeURIComponent(placeId)}&select=id,public_id,name&limit=1`,
      { method: "GET" },
    );
    const institution = institutions?.[0];
    if (!institution) {
      response.status(200).json({ questions: [] });
      return;
    }
    const rows = await supabaseRequest(
      `information_needs?institution_id=eq.${institution.id}&canonical_answer=not.is.null&status=neq.dismissed&select=id,sample_question,ask_count,canonical_answer,answer_status,answer_sources,answered_at,expires_at,last_asked_at&order=ask_count.desc,last_asked_at.desc&limit=30`,
      { method: "GET" },
    );
    response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    response.status(200).json({
      place: { id: institution.public_id, name: institution.name },
      questions: rows || [],
    });
  } catch (error) {
    console.error("Knowledge catalogue:", error.message);
    response.status(502).json({ error: "The place knowledge catalogue is temporarily unavailable." });
  }
};
