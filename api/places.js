const { databaseReady, supabaseRequest } = require("./_lib/supabase");

function normalizePlace(row) {
  const images = (row.media || []).map((item) => ({
    url: item.external_url,
    source: item.source_url,
    author: item.author_name,
    license: item.license,
    alt: item.alt_text || row.name,
  }));
  const coverImage = images.find((_, index) => row.media?.[index]?.is_cover) || images[0];
  return {
    id: row.public_id,
    name: row.name,
    type: row.type,
    city: row.city,
    state: row.state,
    country: "US",
    citySlug: `${row.city}-${row.state}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    neighborhood: row.neighborhood || row.city,
    address: row.address,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    summary: row.summary,
    hours: row.hours || "Hours not yet documented",
    cost: row.cost || "Cost not yet documented",
    accessibility: row.accessibility || "Accessibility not yet documented",
    transit: row.transit || "Transit access not yet documented",
    amenities: row.amenities || [],
    verifiedAt: row.verified_at,
    distance: Number.isFinite(Number(row.distance_meters))
      ? Number(row.distance_meters) / 1609.344
      : undefined,
    status: "Shared public record",
    sourceLabel: "AuditMap sources",
    source: `./place.html?id=${encodeURIComponent(row.public_id)}`,
    image: coverImage,
    images: images.filter((image) => image.url !== coverImage?.url),
    comments: [],
  };
}

async function attachMedia(rows) {
  const publicIds = [...new Set((rows || []).map((row) => row.public_id).filter(Boolean))];
  if (!publicIds.length) return rows || [];
  const idsFilter = publicIds.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(",");
  const institutions = await supabaseRequest(
    `institutions?public_id=in.(${encodeURIComponent(idsFilter)})&select=id,public_id`,
    { method: "GET" },
  );
  const institutionIds = (institutions || []).map((item) => item.id);
  if (!institutionIds.length) return rows || [];
  const media = await supabaseRequest(
    `media?institution_id=in.(${institutionIds.join(",")})&status=eq.published&select=institution_id,external_url,source_url,alt_text,author_name,license,is_cover,created_at&order=is_cover.desc,created_at.asc`,
    { method: "GET" },
  );
  const publicIdByInstitution = new Map(
    (institutions || []).map((item) => [item.id, item.public_id]),
  );
  const mediaByPublicId = new Map();
  for (const item of media || []) {
    const publicId = publicIdByInstitution.get(item.institution_id);
    if (!publicId) continue;
    mediaByPublicId.set(publicId, [...(mediaByPublicId.get(publicId) || []), item]);
  }
  return (rows || []).map((row) => ({
    ...row,
    media: mediaByPublicId.get(row.public_id) || [],
  }));
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }
  if (!databaseReady()) {
    response.status(503).json({ error: "Shared database not configured.", places: [] });
    return;
  }

  const latitude = Number(request.query.lat);
  const longitude = Number(request.query.lon);
  const limit = Math.min(Math.max(Number(request.query.limit) || 100, 1), 250);

  try {
    let rows;
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const radius = Math.min(Math.max(Number(request.query.radius) || 16000, 500), 50000);
      rows = await supabaseRequest("rpc/nearby_places", {
        method: "POST",
        body: JSON.stringify({
          search_latitude: latitude,
          search_longitude: longitude,
          radius_meters: radius,
          result_limit: limit,
        }),
      });
    } else {
      rows = await supabaseRequest(
        `institutions?status=eq.published&select=public_id,name,type,city,state,neighborhood,address,latitude,longitude,summary,hours,cost,accessibility,transit,amenities,verified_at&limit=${limit}`,
        { method: "GET" },
      );
    }

    rows = await attachMedia(rows);
    response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    response.status(200).json({
      places: (rows || []).map(normalizePlace),
      source: "AuditMap shared database",
    });
  } catch {
    response.status(502).json({ error: "Shared place search is temporarily unavailable." });
  }
};
