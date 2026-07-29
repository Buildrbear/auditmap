const NC_BOUNDS = {
  south: 33.75,
  west: -84.33,
  north: 36.59,
  east: -75.4,
};

function insideNorthCarolina(latitude, longitude) {
  return (
    latitude >= NC_BOUNDS.south &&
    latitude <= NC_BOUNDS.north &&
    longitude >= NC_BOUNDS.west &&
    longitude <= NC_BOUNDS.east
  );
}

module.exports = async function handler(request, response) {
  const latitude = Number(request.query.lat);
  const longitude = Number(request.query.lon);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !insideNorthCarolina(latitude, longitude)
  ) {
    response.status(400).json({ error: "Move the map within North Carolina." });
    return;
  }

  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
    zoom: "12",
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
      "North Carolina";

    response.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    response.status(200).json({
      name,
      state: "NC",
      county: address.county || "",
      label: [name, address.county].filter((value, index, values) =>
        value && values.indexOf(value) === index,
      ).join(", "),
    });
  } catch {
    response.status(502).json({ error: "Could not identify this map area." });
  }
};
