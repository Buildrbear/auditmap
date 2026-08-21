const fs = require("node:fs");
const path = require("node:path");
const { hasDocumentedReuseRights } = require("./lib/image-rights");

const root = path.resolve(__dirname, "..");
const document = JSON.parse(fs.readFileSync(path.join(root, "data/nc-basic-official-park-enrichment.json"), "utf8"));
const places = Array.isArray(document) ? document : document.parks || document.places || [];
const failures = [];

for (const place of places) {
  for (const image of [place.image, ...(place.images || [])].filter(Boolean)) {
    if (!hasDocumentedReuseRights(image)) failures.push(`${place.id}: ${image.license || "missing license"}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Verified documented reuse rights for published images across ${places.length} NC basic records.`);
