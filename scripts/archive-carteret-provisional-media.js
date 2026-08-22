const fs = require("node:fs");
const path = require("node:path");
const { hasDocumentedReuseRights } = require("./lib/image-rights");

const root = path.resolve(__dirname, "..");
const institutionsPath = path.join(root, "data", "institutions.json");
const outputPath = path.join(root, "data", "photo-research", "carteret-provisional-official-media.json");
const institutions = JSON.parse(fs.readFileSync(institutionsPath, "utf8"));
const existing = fs.existsSync(outputPath)
  ? JSON.parse(fs.readFileSync(outputPath, "utf8"))
  : { schemaVersion: 1, checkedAt: "2026-08-21", places: [] };
const placesById = new Map((existing.places || []).map((place) => [place.id, place]));

for (const place of institutions.filter((candidate) => (
  candidate.state === "NC"
  && ["Atlantic Beach", "Morehead City"].includes(candidate.city)
))) {
  const media = [place.image, ...(place.images || [])]
    .filter(Boolean)
    .filter((image) => !hasDocumentedReuseRights(image));
  if (!media.length) continue;
  placesById.set(place.id, {
    id: place.id,
    name: place.name,
    city: place.city,
    status: "permission-or-open-license-not-documented",
    media,
  });
}

const document = {
  schemaVersion: 1,
  checkedAt: "2026-08-21",
  purpose: "Preserves Carteret media metadata removed from rendered records until reuse permission or an open license is documented.",
  replacement: "Reviewed USDA NAIP public-domain aerial overview where a destination-specific crop passed manual review.",
  places: [...placesById.values()].sort((left, right) => (
    left.city.localeCompare(right.city) || left.name.localeCompare(right.name)
  )),
};

fs.writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Archived provisional media for ${document.places.length} Carteret destinations.`);
