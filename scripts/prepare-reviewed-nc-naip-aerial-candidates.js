const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const reviewPath = process.env.AUDITMAP_NAIP_REVIEW_PATH
  ? path.resolve(process.env.AUDITMAP_NAIP_REVIEW_PATH)
  : path.join(root, "data", "nc-naip-aerial-review.json");
const review = JSON.parse(fs.readFileSync(reviewPath, "utf8"));
const institutions = JSON.parse(fs.readFileSync(path.join(root, "data", "institutions.json"), "utf8"));
const outputPath = process.env.AUDITMAP_NAIP_CANDIDATES_PATH
  ? path.resolve(process.env.AUDITMAP_NAIP_CANDIDATES_PATH)
  : path.join(root, "data", "photo-research", "nc-naip-aerial-candidates.json");

function metersToLatitudeDegrees(meters) {
  return meters / 111_320;
}

function metersToLongitudeDegrees(meters, latitude) {
  return meters / (111_320 * Math.cos(latitude * Math.PI / 180));
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "AuditMap reviewed NAIP imagery preparation/1.0 (https://www.auditmap.org)" },
  });
  if (!response.ok) throw new Error(`NAIP metadata request failed: HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const places = [];

  for (const item of review.places) {
    const institution = institutions.find((candidate) => candidate.id === item.placeId);
    const place = institution || item;
    if (!place.name || !place.city || !place.state) {
      throw new Error(`Name, city, and state are required for ${item.placeId}`);
    }
    if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
      throw new Error(`Exact coordinates are required for ${place.name}`);
    }

    const cropLatitude = item.cropLatitude ?? place.latitude;
    const cropLongitude = item.cropLongitude ?? place.longitude;
    const metadataParameters = new URLSearchParams({
      geometry: `${cropLongitude},${cropLatitude}`,
      geometryType: "esriGeometryPoint",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "Name,year_ts,ST,QQDATE",
      returnGeometry: "false",
      orderByFields: "year_ts DESC",
      resultRecordCount: "1",
      f: "json",
    });
    const metadata = await fetchJson(`${review.service}/query?${metadataParameters}`);
    const imagery = metadata.features?.[0]?.attributes;
    if (!imagery || !imagery.ST || !imagery.year_ts || !imagery.Name) {
      throw new Error(`Current NAIP imagery was not resolved for ${place.name}`);
    }

    const halfWidthMeters = item.halfWidthMeters || 200;
    const halfHeightMeters = halfWidthMeters * 0.75;
    const longitudeDelta = metersToLongitudeDegrees(halfWidthMeters, cropLatitude);
    const latitudeDelta = metersToLatitudeDegrees(halfHeightMeters);
    const bbox = [
      cropLongitude - longitudeDelta,
      cropLatitude - latitudeDelta,
      cropLongitude + longitudeDelta,
      cropLatitude + latitudeDelta,
    ].join(",");
    const imageParameters = new URLSearchParams({
      bbox,
      bboxSR: "4326",
      imageSR: "4326",
      size: "1600,1200",
      format: "jpg",
      interpolation: "RSP_BilinearInterpolation",
      f: "image",
    });
    const acquisitionDate = imagery.QQDATE ? new Date(imagery.QQDATE).toISOString().slice(0, 10) : "";

    places.push({
      id: item.placeId || place.id,
      name: place.name,
      city: place.city,
      state: place.state,
      latitude: place.latitude,
      longitude: place.longitude,
      status: "reviewed-aerial-fallback",
      reviewNote: item.reviewNote,
      candidates: [
        {
          title: `${place.name} ${imagery.year_ts} NAIP aerial overview`,
          description: `Natural-color USDA NAIP aerial image centered on ${place.name} in ${place.city}, ${place.state}.`,
          url: `${review.service}/exportImage?${imageParameters}`,
          source: review.service,
          author: "USDA Farm Service Agency, National Agriculture Imagery Program",
          authorUrl: "https://www.fsa.usda.gov/",
          license: "Public domain",
          licenseVersion: "",
          licenseUrl: review.licenseSource,
          provider: "USDA NAIP",
          width: 1600,
          height: 1200,
          imageryName: imagery.Name,
          imageryYear: imagery.year_ts,
          imagerySourceState: imagery.ST,
          acquisitionDate,
          cropBbox: bbox,
          ...(item.cropLatitude !== undefined || item.cropLongitude !== undefined
            ? { cropCenterLatitude: cropLatitude, cropCenterLongitude: cropLongitude }
            : {}),
          reviewedAt: review.checkedAt,
        },
      ],
    });
  }

  fs.writeFileSync(outputPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    checkedAt: review.checkedAt,
    service: review.service,
    licenseSource: review.licenseSource,
    places,
  }, null, 2)}\n`);
  console.log(`Prepared ${places.length} reviewed USDA NAIP aerial candidates.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
