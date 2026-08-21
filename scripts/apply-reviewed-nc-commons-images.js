const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const candidates = JSON.parse(fs.readFileSync(path.join(root, "data", "photo-research", "nc-geotagged-commons-candidates.json"), "utf8")).places;
const enrichmentPath = path.join(root, "data", "generated", "launch-park-enrichment.json");
const enrichment = JSON.parse(fs.readFileSync(enrichmentPath, "utf8"));
const records = new Map(enrichment.parks.map((place) => [place.id, place]));
const candidateMap = new Map(candidates.map((place) => [place.id, place.candidates]));
const selections = {
  "launch-nc-cary-fred-g-bond-metro-park": [1],
  "launch-nc-charlotte-mcalpine-creek-community-park": [0],
  "launch-nc-greensboro-battleground-parks-district": [0, 1, 2]
};

for (const record of records.values()) {
  record.images = (record.images || []).filter((image) => image.matchMethod !== "reviewed-geotagged-commons");
}

let updated = 0;
for (const [id, indexes] of Object.entries(selections)) {
  const record = records.get(id);
  const available = candidateMap.get(id) || [];
  if (!record) continue;
  const reviewed = indexes.map((index) => available[index]).filter(Boolean).map((image) => ({
    url: image.url,
    source: image.source,
    author: image.author,
    license: image.license,
    alt: image.description || image.title.replace(/^File:/, ""),
    matchMethod: "reviewed-geotagged-commons"
  }));
  if (!reviewed.length) continue;
  record.images = [...reviewed, ...(record.images || [])].filter((image, index, images) => image?.url && images.findIndex((candidate) => candidate.url === image.url) === index).slice(0, 3);
  record.reviewStatus = "reviewed-geotagged-commons";
  updated += 1;
}

fs.writeFileSync(enrichmentPath, `${JSON.stringify({ ...enrichment, generatedAt: new Date().toISOString(), parks: [...records.values()] }, null, 2)}\n`);
console.log(JSON.stringify({ updated, selectedImages: Object.values(selections).reduce((total, indexes) => total + indexes.length, 0) }, null, 2));
