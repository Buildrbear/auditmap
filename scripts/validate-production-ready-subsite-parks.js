const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"));
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function pagePath(place) {
  return path.join(
    projectRoot,
    "us",
    slugify(place.state),
    slugify(place.city),
    "parks",
    place.slug || slugify(place.name),
    "index.html",
  );
}

function imageUrls(place) {
  return [
    place.image?.url,
    ...(place.images || []).map((image) => image.url),
    ...(place.features || []).map((feature) => feature.details?.imageUrl),
  ].filter(Boolean);
}

function validateParent(place, html, issues) {
  for (const field of ["name", "city", "state", "address", "summary", "hours", "cost", "accessibility", "source"]) {
    if (!place[field] || /research pending|not yet documented/i.test(String(place[field]))) {
      issues.push(`${place.id}: parent ${field} is incomplete`);
    }
  }
  if (!/^https:\/\//.test(place.source)) {
    issues.push(`${place.id}: parent source is not HTTPS`);
  }
  if ((place.searchAnswers || []).length < 2) {
    issues.push(`${place.id}: fewer than two sourced parent answers`);
  }
  for (const answer of place.searchAnswers || []) {
    if (!answer.question || !answer.answer || !answer.source || !answer.checkedAt) {
      issues.push(`${place.id}: incomplete parent answer ${answer.intentKey || answer.question || "unknown"}`);
    }
    if (answer.question && !html.includes(answer.question)) {
      issues.push(`${place.id}: parent answer missing from raw HTML: ${answer.question}`);
    }
    if (answer.source && !html.includes(answer.source.replaceAll("&", "&amp;"))) {
      issues.push(`${place.id}: parent citation missing from raw HTML: ${answer.source}`);
    }
  }
  if (new Set(imageUrls(place)).size < 3) {
    issues.push(`${place.id}: fewer than three unique parent-gallery images`);
  }
  for (const item of place.researchQueue || []) {
    if (["official-source", "arrival", "accessibility", "subsites", "photos"].includes(item.intentKey)) {
      issues.push(`${place.id}: resolved research item remains queued: ${item.intentKey}`);
    }
  }
  if (!html.includes(`<link rel="canonical" href="https://www.auditmap.org/`)) {
    issues.push(`${place.id}: canonical metadata missing`);
  }
  if (!html.includes('property="og:image"')) {
    issues.push(`${place.id}: Open Graph image metadata missing`);
  }
  if (!html.includes('"@type":"BreadcrumbList"')) {
    issues.push(`${place.id}: breadcrumb schema missing`);
  }
}

function validateFeature(place, feature, html, issues, requireEnrichedDetails) {
  const details = feature.details || {};
  for (const field of ["name", "description", "source_url", "verified_at"]) {
    if (!feature[field]) issues.push(`${place.id}/${feature.id}: missing ${field}`);
  }
  for (const field of ["imageUrl", "imageSourceUrl", "imageAuthor", "imageLicense", "imageAlt"]) {
    if (!details[field]) issues.push(`${place.id}/${feature.id}: missing details.${field}`);
  }
  if (requireEnrichedDetails) {
    for (const field of [
      "locationContext",
      "needToKnow",
      "informationCheckedAt",
      "informationSourceLabel",
      "informationSourceUrl",
    ]) {
      if (!details[field]) issues.push(`${place.id}/${feature.id}: missing details.${field}`);
    }
  }
  if (!html.includes(feature.name)) {
    issues.push(`${place.id}/${feature.id}: name missing from raw HTML`);
  }
  if (details.imageUrl && !html.includes(details.imageUrl.replaceAll("&", "&amp;"))) {
    issues.push(`${place.id}/${feature.id}: image missing from raw HTML`);
  }
  if (requireEnrichedDetails && !html.includes(details.needToKnow)) {
    issues.push(`${place.id}/${feature.id}: need-to-know guidance missing from raw HTML`);
  }
}

function main() {
  const generatedParks = readJson("data/generated/all-subsites-ready.json").parks.filter(
    (park) => park.features.length,
  );
  const launchPlaces = readJson("data/generated/launch-map-places.json");
  const curatedPlaces = readJson("data/institutions.json").filter(
    (place) => place.searchCategory === "park" && (place.features || []).length,
  );
  const generatedById = new Map(generatedParks.map((park) => [park.id, park]));
  const places = [
    ...launchPlaces
      .filter((place) => generatedById.has(place.id))
      .map((place) => ({ ...place, features: generatedById.get(place.id).features })),
    ...curatedPlaces,
  ];
  const issues = [];

  for (const place of places) {
    const filePath = pagePath(place);
    if (!fs.existsSync(filePath)) {
      issues.push(`${place.id}: generated page missing`);
      continue;
    }
    const html = fs.readFileSync(filePath, "utf8");
    validateParent(place, html, issues);
    const isGenerated = generatedById.has(place.id);
    for (const feature of place.features || []) {
      validateFeature(place, feature, html, issues, isGenerated);
    }
  }

  const report = {
    checkedAt: new Date().toISOString(),
    parks: places.length,
    generatedParks: generatedParks.length,
    curatedParks: curatedPlaces.length,
    subsites: places.reduce((total, place) => total + place.features.length, 0),
    parentAnswers: places.reduce(
      (total, place) => total + (place.searchAnswers || []).length,
      0,
    ),
    issues,
  };
  console.log(JSON.stringify(report, null, 2));
  if (issues.length) process.exitCode = 1;
}

main();
