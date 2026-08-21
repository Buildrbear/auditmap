const fs = require("node:fs");
const path = require("node:path");
const { hasDocumentedReuseRights } = require("./lib/image-rights");

const root = path.resolve(__dirname, "..");
const basicPath = path.join(root, "data/nc-basic-official-park-enrichment.json");
const institutionsPath = path.join(root, "data/institutions.json");

function read(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function records(document) {
  if (Array.isArray(document)) return document;
  if (Array.isArray(document.parks)) return document.parks;
  if (Array.isArray(document.places)) return document.places;
  throw new Error("Expected an array or a document with a parks or places array.");
}

function sanitize(place) {
  const candidates = [place.image, ...(place.images || [])].filter(Boolean);
  const reusable = candidates.filter(hasDocumentedReuseRights);
  const removed = candidates.length - reusable.length;
  if (!removed) return 0;

  if (reusable.length) {
    place.image = reusable[0];
    place.images = reusable.slice(1);
  } else {
    delete place.image;
    place.images = [];
  }
  place.researchQueue = place.researchQueue || [];
  if (!place.researchQueue.some((item) => item.intentKey === "photos")) {
    place.researchQueue.push({
      intentKey: "photos",
      question: `Which real, destination-specific photos of ${place.name} have documented reuse rights?`,
      publicationBlocker: false,
      status: "needs-licensed-media",
    });
  }
  return removed;
}

const basicDocument = read(basicPath);
const basicPlaces = records(basicDocument);
const basicIds = new Set(basicPlaces.map((place) => place.id));
const institutions = read(institutionsPath);
let removed = 0;
for (const place of basicPlaces) removed += sanitize(place);
for (const place of institutions) {
  if (basicIds.has(place.id)) removed += sanitize(place);
}

fs.writeFileSync(basicPath, `${JSON.stringify(basicDocument, null, 2)}\n`);
fs.writeFileSync(institutionsPath, `${JSON.stringify(institutions, null, 2)}\n`);
console.log(`Removed ${removed} image references without documented reuse rights from NC basic records.`);
