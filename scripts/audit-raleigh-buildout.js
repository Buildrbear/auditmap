const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const campaign = JSON.parse(
  fs.readFileSync(path.join(root, "data/raleigh-full-buildout-campaign.json"), "utf8")
);
const institutionData = JSON.parse(
  fs.readFileSync(path.join(root, "data/institutions.json"), "utf8")
);
const launchData = JSON.parse(
  fs.readFileSync(path.join(root, "data/generated/launch-map-places.json"), "utf8")
);

const institutions = Array.isArray(institutionData)
  ? institutionData
  : institutionData.institutions || [];
const launchPlaces = Array.isArray(launchData)
  ? launchData
  : launchData.places || [];
const records = new Map(
  [...institutions, ...launchPlaces].map((place) => [place.id, place])
);

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function categorySegment(place) {
  const category = slugify(place.searchCategory || "place");
  if (category === "library") return "libraries";
  if (category === "park") return "parks";
  return category.endsWith("s") ? category : `${category}s`;
}

function generatedPagePath(place) {
  const canonicalPath =
    place.canonicalPath ||
    `/us/${slugify(place.state)}/${slugify(place.city)}/${categorySegment(place)}/${place.slug}`;
  return path.join(root, canonicalPath.replace(/^\//, ""), "index.html");
}

function missingFields(value, fields) {
  return fields.filter(
    (field) => value?.[field] === undefined || value?.[field] === null || value?.[field] === ""
  );
}

const targetIds = [
  ...campaign.existingCore,
  ...Object.values(campaign.targetGroups).flat()
];
const uniqueTargets = [...new Set(targetIds)];
const rows = uniqueTargets.map((id) => {
  const place = records.get(id);
  const imageCount = place ? Number(Boolean(place.image)) + (place.images || []).length : 0;
  const answerCount = place ? (place.searchAnswers || []).length : 0;
  const requiredIntents = new Set((place?.searchAnswers || []).map((answer) => answer.intentKey));
  const missingIntents = campaign.standard.requiredIntents.filter(
    (intent) => !requiredIntents.has(intent)
  );
  const structuralIssues = [];

  if (place) {
    const placeFields = missingFields(place, [
      "name",
      "city",
      "state",
      "address",
      "latitude",
      "longitude",
      "slug",
      "searchCategory",
      "summary",
      "searchDescription",
      "source",
      "sourceLabel",
      "verifiedAt"
    ]);
    structuralIssues.push(...placeFields.map((field) => `missing place field: ${field}`));

    [place.image, ...(place.images || [])].filter(Boolean).forEach((image, index) => {
      const imageFields = missingFields(image, ["url", "source", "author", "license", "alt"]);
      structuralIssues.push(
        ...imageFields.map((field) => `image ${index + 1} missing attribution field: ${field}`)
      );
      if (/\b(ai image|ai-generated|dall-e|midjourney)\b/i.test(JSON.stringify(image))) {
        structuralIssues.push(`image ${index + 1} conflicts with no-AI policy`);
      }
    });

    (place.searchAnswers || []).forEach((answer, index) => {
      const answerFields = missingFields(answer, [
        "intentKey",
        "question",
        "answer",
        "source",
        "sourceLabel",
        "checkedAt"
      ]);
      structuralIssues.push(
        ...answerFields.map((field) => `answer ${index + 1} missing source field: ${field}`)
      );
    });

    const pagePath = generatedPagePath(place);
    if (!fs.existsSync(pagePath)) {
      structuralIssues.push(`missing generated page: ${path.relative(root, pagePath)}`);
    } else {
      const html = fs.readFileSync(pagePath, "utf8");
      if (!html.includes(place.address)) structuralIssues.push("address missing from raw HTML");
      if (!html.includes('rel="canonical"')) structuralIssues.push("canonical missing from raw HTML");
    }
  }
  return {
    id,
    exists: Boolean(place),
    imageCount,
    answerCount,
    missingIntents,
    structuralIssues,
    ready:
      Boolean(place) &&
      imageCount >= campaign.standard.minimumImages &&
      answerCount >= campaign.standard.minimumAnswers &&
      missingIntents.length === 0 &&
      structuralIssues.length === 0
  };
});

const excludedIds = campaign.excluded.map((item) => item.id).filter(Boolean);
const exclusionIssues = excludedIds
  .filter((id) => uniqueTargets.includes(id))
  .map((id) => `${id} is both excluded and targeted`);

const summary = {
  market: campaign.market,
  targets: rows.length,
  existing: rows.filter((row) => row.exists).length,
  ready: rows.filter((row) => row.ready).length,
  missing: rows.filter((row) => !row.exists).length,
  incomplete: rows.filter((row) => row.exists && !row.ready).length,
  structuralIssues: rows.reduce((total, row) => total + row.structuralIssues.length, 0),
  exclusionIssues: exclusionIssues.length
};

console.log(JSON.stringify({ summary, exclusionIssues, rows }, null, 2));
