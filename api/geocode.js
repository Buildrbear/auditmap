const NC_BOUNDS = {
  south: 33.75,
  west: -84.33,
  north: 36.59,
  east: -75.4,
};

module.exports = async function handler(request, response) {
  const query = String(request.query.q || "").trim().slice(0, 120);
  if (query.length < 2) {
    response.status(400).json({ error: "Enter a North Carolina city or address." });
    return;
  }

  const params = new URLSearchParams({
    q: `${query}, North Carolina`,
    format: "jsonv2",
    limit: "1",
    countrycodes: "us",
    bounded: "1",
    viewbox: `${NC_BOUNDS.west},${NC_BOUNDS.north},${NC_BOUNDS.east},${NC_BOUNDS.south}`,
    addressdetails: "1",
  });

  try {
    const geocodeResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "AuditMap/1.0 (https://www.auditmap.org)",
        },
      },
    );
    if (!geocodeResponse.ok) throw new Error("Geocoder request failed.");
    const [result] = await geocodeResponse.json();
    if (!result) {
      response.status(404).json({ error: "No North Carolina location matched that search." });
      return;
    }

    response.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    response.status(200).json({
      name:
        result.address?.city ||
        result.address?.town ||
        result.address?.village ||
        result.address?.county ||
        query,
      state: "NC",
      latitude: Number(result.lat),
      longitude: Number(result.lon),
      label: result.display_name,
      source: `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}`,
      boundingBox: result.boundingbox?.map(Number) || null,
    });
  } catch {
    response.status(502).json({ error: "North Carolina location search is temporarily unavailable." });
  }
};
