module.exports = async function handler(request, response) {
  const query = String(request.query.q || "").trim().slice(0, 120);
  if (query.length < 2) {
    response.status(400).json({ error: "Enter a U.S. city, address, or public place." });
    return;
  }

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    countrycodes: "us",
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
      response.status(404).json({ error: "No U.S. location matched that search." });
      return;
    }

    const stateCode = String(
      result.address?.["ISO3166-2-lvl4"] || result.address?.state_code || "",
    )
      .split("-")
      .pop()
      .toUpperCase();

    response.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    response.status(200).json({
      name:
        result.address?.city ||
        result.address?.town ||
        result.address?.village ||
        result.address?.county ||
        query,
      state: stateCode,
      latitude: Number(result.lat),
      longitude: Number(result.lon),
      label: result.display_name,
      source: `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}`,
      boundingBox: result.boundingbox?.map(Number) || null,
    });
  } catch {
    response.status(502).json({ error: "U.S. location search is temporarily unavailable." });
  }
};
