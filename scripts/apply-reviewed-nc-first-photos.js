const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const { hasDocumentedReuseRights } = require("./lib/image-rights");

const root = path.resolve(__dirname, "..");
const selectionsPath = process.env.AUDITMAP_FIRST_PHOTO_SELECTIONS_PATH
  ? path.resolve(process.env.AUDITMAP_FIRST_PHOTO_SELECTIONS_PATH)
  : path.join(root, "data", "nc-first-photo-selections.json");
const selections = JSON.parse(fs.readFileSync(selectionsPath, "utf8"));
const defaultCandidatePaths = [
  path.join(root, "data", "photo-research", "nc-naip-aerial-candidates.json"),
  path.join(root, "data", "photo-research", "nc-reviewed-public-domain-candidates.json"),
  path.join(root, "data", "photo-research", "nc-geotagged-commons-candidates.json"),
  path.join(root, "data", "photo-research", "nc-geotagged-commons-tight-candidates.json"),
  path.join(root, "data", "photo-research", "nc-named-commons-candidates.json"),
  path.join(root, "data", "photo-research", "nc-name-only-commons-candidates.json"),
  path.join(root, "data", "photo-research", "nc-openverse-candidates.json"),
  path.join(root, "data", "photo-research", "nc-openverse-name-only-candidates.json"),
  path.join(root, "data", "photo-research", "nc-openverse-reusable-candidates.json"),
  path.join(root, "data", "photo-research", "nc-openverse-name-only-reusable-candidates.json"),
  path.join(root, "data", "photo-research", "nc-openverse-ncwetlands-org-collection.json"),
  path.join(root, "data", "photo-research", "nc-openverse-themachinephotography-collection.json"),
  path.join(root, "data", "photo-research", "nc-flickr-licensed-search-candidates.json"),
];
const candidatePaths = process.env.AUDITMAP_FIRST_PHOTO_CANDIDATES_PATHS
  ? process.env.AUDITMAP_FIRST_PHOTO_CANDIDATES_PATHS
      .split(path.delimiter)
      .filter(Boolean)
      .map((candidatePath) => path.resolve(candidatePath))
  : defaultCandidatePaths;
const candidateDocuments = candidatePaths
  .filter((candidatePath) => fs.existsSync(candidatePath))
  .map((candidatePath) => JSON.parse(fs.readFileSync(candidatePath, "utf8")));
const institutionsPath = path.join(root, "data", "institutions.json");
const basicPath = path.join(root, "data", "nc-basic-official-park-enrichment.json");
const institutions = JSON.parse(fs.readFileSync(institutionsPath, "utf8"));
const basicDocument = JSON.parse(fs.readFileSync(basicPath, "utf8"));
const basicPlaces = basicDocument.places || [];
const targetPath = process.env.AUDITMAP_FIRST_PHOTO_TARGET_PATH
  ? path.resolve(process.env.AUDITMAP_FIRST_PHOTO_TARGET_PATH)
  : null;
const targetDocument = targetPath
  ? JSON.parse(fs.readFileSync(targetPath, "utf8"))
  : null;
const refreshReviewedImages = process.env.AUDITMAP_REFRESH_REVIEWED_IMAGES === "1";

const candidatePlaces = new Map();
for (const document of candidateDocuments) {
  for (const place of document.places || []) {
    const current = candidatePlaces.get(place.id) || { ...place, candidates: [] };
    const sources = new Set(current.candidates.map((candidate) => candidate.source));
    for (const candidate of place.candidates || []) {
      if (!sources.has(candidate.source)) {
        current.candidates.push(candidate);
        sources.add(candidate.source);
      }
    }
    candidatePlaces.set(place.id, current);
  }
}

function findRecord(records, selection) {
  return records.find((place) => place.id === selection.placeId)
    || records.find((place) => place.name === selection.name && place.city === selection.city);
}

function applyImage(record, image) {
  record.image = image;
  record.images = (record.images || []).filter((candidate) => candidate?.url && candidate.url !== image.url);
  if (Array.isArray(record.researchQueue)) {
    record.researchQueue = record.researchQueue.filter((item) => item.intentKey !== "photos");
  }
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
  let appliedInstitutions = 0;
  let appliedBasic = 0;
  let appliedTargetRecords = 0;
  let downloadedAssets = 0;
  let reusedAssets = 0;

  for (const selection of selections.selections.filter(
    (candidate) => candidate.presentationStatus !== "context-only",
  )) {
    const candidatePlace = candidatePlaces.get(selection.placeId)
      || [...candidatePlaces.values()].find((place) => place.name === selection.name && place.city === selection.city);
    const candidate = candidatePlace?.candidates?.find((image) => image.source === selection.candidateSource);
    if (!candidate) throw new Error(`Reviewed candidate missing for ${selection.name}`);

    const license = candidate.licenseVersion && !String(candidate.license).includes(candidate.licenseVersion)
      ? `${candidate.license} ${candidate.licenseVersion}`
      : candidate.license;
    const image = {
      url: selection.url,
      source: candidate.source,
      author: candidate.author,
      license,
      alt: selection.alt,
    };
    if (selection.imageKind) image.kind = selection.imageKind;
    if (!hasDocumentedReuseRights(image)) throw new Error(`Incomplete image rights for ${selection.name}`);

    const assetPath = path.join(root, selection.url.replace(/^\//, ""));
    if (refreshReviewedImages || !fs.existsSync(assetPath)) {
      const response = await fetch(candidate.url, {
        headers: { "User-Agent": "AuditMap reviewed image preparation/1.0 (https://www.auditmap.org)" },
      });
      if (!response.ok) throw new Error(`Image download failed for ${selection.name}: HTTP ${response.status}`);
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) throw new Error(`Unexpected content type for ${selection.name}: ${contentType}`);
      const sourceBytes = Buffer.from(await response.arrayBuffer());
      if (sourceBytes.length < 25_000) throw new Error(`Image is unexpectedly small for ${selection.name}`);
      const extension = path.extname(assetPath).toLowerCase();
      let pipeline = sharp(sourceBytes)
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true });
      if (extension === ".webp") pipeline = pipeline.webp({ quality: 82 });
      else if (extension === ".png") pipeline = pipeline.png({ compressionLevel: 9 });
      else pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
      const bytes = await pipeline.toBuffer();
      fs.mkdirSync(path.dirname(assetPath), { recursive: true });
      fs.writeFileSync(assetPath, bytes);
      downloadedAssets += 1;
    } else {
      const assetBytes = fs.readFileSync(assetPath);
      if (assetBytes.length < 5_000) throw new Error(`Existing image is unexpectedly small for ${selection.name}`);
      const metadata = await sharp(assetBytes).metadata();
      const extension = path.extname(assetPath).toLowerCase();
      const expectedFormat = extension === ".webp" ? "webp"
        : extension === ".png" ? "png"
          : extension === ".jpg" || extension === ".jpeg" ? "jpeg"
            : "";
      if (!metadata.format || !metadata.width || !metadata.height
        || metadata.width < 320 || metadata.height < 240
        || (expectedFormat && metadata.format !== expectedFormat)) {
        throw new Error(`Existing image is not a readable ${expectedFormat || "supported"} image for ${selection.name}`);
      }
      reusedAssets += 1;
    }

    if (targetDocument) {
      const target = findTargetRecord(targetDocument, selection);
      if (!target) throw new Error(`Target record missing for ${selection.name}`);
      applyImage(target, image);
      appliedTargetRecords += 1;
    } else {
      const institution = findRecord(institutions, selection);
      if (!institution) throw new Error(`Institution record missing for ${selection.name}`);
      applyImage(institution, image);
      appliedInstitutions += 1;

      const basic = findRecord(basicPlaces, selection);
      if (basic) {
        applyImage(basic, image);
        appliedBasic += 1;
      }
    }
  }

  if (targetDocument) {
    fs.writeFileSync(targetPath, `${JSON.stringify(targetDocument, null, 2)}\n`);
  } else {
    fs.writeFileSync(institutionsPath, `${JSON.stringify(institutions, null, 2)}\n`);
    fs.writeFileSync(basicPath, `${JSON.stringify(basicDocument, null, 2)}\n`);
  }
  console.log(JSON.stringify({
    reviewed: selections.selections.length,
    appliedInstitutions,
    appliedBasic,
    appliedTargetRecords,
    downloadedAssets,
    reusedAssets,
    refreshReviewedImages,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
