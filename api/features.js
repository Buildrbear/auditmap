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
    response.status(200).json({ features: [] });
    return;
  }

  try {
    const placeId = cleanText(request.query.placeId);
    const institutions = await supabaseRequest(
      `institutions?public_id=eq.${encodeURIComponent(placeId)}&select=id,public_id,name,latitude,longitude&limit=1`,
      { method: "GET" },
    );
    const place = institutions?.[0];
    if (!place) {
      response.status(200).json({ features: [] });
      return;
    }
    const features = await supabaseRequest(
      `place_features?institution_id=eq.${place.id}&status=eq.published&select=id,parent_feature_id,slug,name,feature_type,description,latitude,longitude,level_label,level_order,details,source_label,source_url,verified_at&order=level_order.asc.nullslast,name.asc`,
      { method: "GET" },
    );
    response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    response.status(200).json({
      place: {
        id: place.public_id,
        name: place.name,
        latitude: place.latitude,
        longitude: place.longitude,
      },
      features: features || [],
    });
  } catch (error) {
    console.error("Place features:", error.message);
    response.status(502).json({ error: "Place features are temporarily unavailable." });
  }
};
