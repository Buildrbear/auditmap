const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const { hasDocumentedReuseRights } = require("./lib/image-rights");

const root = path.resolve(__dirname, "..");
const selectionsPath = process.env.AUDITMAP_FIRST_PHOTO_SELECTIONS_PATH
  ? path.resolve(process.env.AUDITMAP_FIRST_PHOTO_SELECTIONS_PATH)
  : path.join(root, "data", "nc-first-photo-selections.json");
const selections = JSON.parse(fs.readFileSync(selectionsPath, "utf8")).selections;
const institutions = JSON.parse(fs.readFileSync(path.join(root, "data", "institutions.json"), "utf8"));
const basic = JSON.parse(fs.readFileSync(path.join(root, "data", "nc-basic-official-park-enrichment.json"), "utf8")).places;
const targetPath = process.env.AUDITMAP_FIRST_PHOTO_TARGET_PATH
  ? path.resolve(process.env.AUDITMAP_FIRST_PHOTO_TARGET_PATH)
  : null;
const targetDocument = targetPath
  ? JSON.parse(fs.readFileSync(targetPath, "utf8"))
  : null;

function findRecord(records, selection) {
  return records.find((place) => place.id === selection.placeId)
    || records.find((place) => place.name === selection.name && place.city === selection.city);
}

function findTargetRecord(document, selection) {
  if (Array.isArray(document)) return findRecord(document, selection);
  if (document?.parks && !Array.isArray(document.parks)) {
    return document.parks[selection.placeId]
      || Object.values(document.parks).find(
        (place) => place.name === selection.name && place.city === selection.city,
      );
  }
  if (Array.isArray(document?.parks)) return findRecord(document.parks, selection);
  return null;
}

async function main() {
for (const selection of selections) {
  const record = targetDocument
    ? findTargetRecord(targetDocument, selection)
    : findRecord(institutions, selection);
  assert.ok(record, `Missing target record for ${selection.name}`);
  assert.equal(record.image?.url, selection.url, `Unexpected image path for ${selection.name}`);
  assert.ok(hasDocumentedReuseRights(record.image), `Incomplete image rights for ${selection.name}`);
  assert.equal(
    (record.researchQueue || []).filter((item) => item.intentKey === "photos").length,
    0,
    `Resolved photo question remains queued for ${selection.name}`,
  );

  const assetPath = path.join(root, selection.url.replace(/^\//, ""));
  assert.ok(fs.existsSync(assetPath), `Missing image asset for ${selection.name}`);
  assert.ok(fs.statSync(assetPath).size >= 5_000, `Image asset is too small for ${selection.name}`);
  const metadata = await sharp(assetPath).metadata();
  assert.ok(metadata.width >= 320 && metadata.height >= 240, `Image dimensions are too small for ${selection.name}`);
  assert.ok(["jpeg", "png", "webp"].includes(metadata.format), `Unsupported image format for ${selection.name}`);

  const basicRecord = targetDocument ? null : findRecord(basic, selection);
  if (basicRecord) {
    assert.equal(basicRecord.image?.url, selection.url, `Basic record image mismatch for ${selection.name}`);
    assert.ok(hasDocumentedReuseRights(basicRecord.image), `Basic record rights incomplete for ${selection.name}`);
  }
}

console.log(`Verified ${selections.length} reviewed first-photo selections and local assets.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
