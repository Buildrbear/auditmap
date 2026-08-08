module.exports = async function handler(request, response) {
  const latitude = Number(request.query.lat);
  const longitude = Number(request.query.lon);
  const mapZoom = Math.min(Math.max(Number(request.query.zoom) || 10, 3), 18);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    response.status(400).json({ error: "A valid map location is required." });
    return;
  }

  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
    zoom: mapZoom <= 7 ? "5" : mapZoom <= 9 ? "8" : "12",
    addressdetails: "1",
  });

  try {
    const areaResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "AuditMap/1.0 (https://www.auditmap.org)",
        },
      },
    );
    if (!areaResponse.ok) throw new Error("Area lookup failed.");
    const result = await areaResponse.json();
    const address = result.address || {};
    const name =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      address.state ||
      address.country ||
      "Current map area";
    const stateCode = String(address["ISO3166-2-lvl4"] || "").split("-").pop();

    response.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    response.status(200).json({
      name,
      state: stateCode || address.state || "",
      stateName: address.state || "",
      county: address.county || "",
      country: address.country_code?.toUpperCase() || "",
      label: [name, address.state].filter((value, index, values) =>
        value && values.indexOf(value) === index,
      ).join(", "),
    });
  } catch {
    response.status(502).json({ error: "Could not identify this map area." });
  }
};
