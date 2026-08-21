const fs = require("node:fs");
const path = require("node:path");

const inputArgument = process.argv.find((argument) => argument.startsWith("--input="));
const fileName = inputArgument
  ? inputArgument.slice("--input=".length)
  : process.argv.includes("--ready")
    ? "pilot-subsites-ready.json"
    : "pilot-subsites.json";
const pilotPath = path.resolve(
  __dirname,
  "..",
  "data",
  "generated",
  fileName,
);
const document = JSON.parse(fs.readFileSync(pilotPath, "utf8"));
const errors = [];
let publishable = 0;
let photographed = 0;

for (const park of document.parks) {
  const slugs = new Set();
  const imageUrls = new Set();
  for (const feature of park.features || []) {
    publishable += 1;
    const label = `${park.name} / ${feature.name}`;
    if (!feature.id || !feature.slug) errors.push(`${label}: missing stable ID or slug`);
    if (slugs.has(feature.slug)) errors.push(`${label}: duplicate slug`);
    slugs.add(feature.slug);
    if (!Number.isFinite(feature.latitude) || !Number.isFinite(feature.longitude)) {
      errors.push(`${label}: missing coordinates`);
    }
    if (!feature.details?.positionQuality) errors.push(`${label}: missing position quality`);
    if (!feature.description) errors.push(`${label}: missing visitor description`);
    if (!feature.source_url || !feature.source_label) errors.push(`${label}: missing source`);
    if (!feature.verified_at) errors.push(`${label}: missing checked date`);

    const imageFields = [
      "imageUrl",
      "imageSourceUrl",
      "imageAuthor",
      "imageLicense",
      "imageAlt",
    ];
    if (imageFields.every((field) => feature.details?.[field])) {
      photographed += 1;
      if (imageUrls.has(feature.details.imageUrl)) {
        errors.push(`${label}: duplicates another subsite image in this park`);
      }
      imageUrls.add(feature.details.imageUrl);
    } else errors.push(`${label}: missing complete photo attribution`);
  }
}

console.log(
  JSON.stringify(
    {
      publishable,
      photographed,
      missingPhoto: publishable - photographed,
      errors: errors.length,
    },
    null,
    2,
  ),
);
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
}
