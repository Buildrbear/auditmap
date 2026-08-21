const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const inputArgument = process.argv.find((argument) => argument.startsWith("--input="));
if (!inputArgument) throw new Error("Use --input=<generated-subsite-file.json>.");
const inputPath = path.join(
  projectRoot,
  "data",
  "generated",
  inputArgument.slice("--input=".length),
);
const rules = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data", "subsite-curation.json"), "utf8"),
);
const document = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const rejectedFeatures = new Set(rules.rejectedFeatures || []);
let removedFeatures = 0;
let removedImages = 0;

function clearImage(feature) {
  delete feature.details.imageUrl;
  delete feature.details.imageSourceUrl;
  delete feature.details.imageAuthor;
  delete feature.details.imageLicense;
  delete feature.details.imageAlt;
  delete feature.discovery.imageFileTitle;
}

for (const park of document.parks) {
  park.features = (park.features || []).filter((feature) => {
    const key = `${park.id}:${feature.slug}`;
    if (!rejectedFeatures.has(key)) return true;
    removedFeatures += 1;
    return false;
  });
  for (const feature of park.features) {
    const key = `${park.id}:${feature.slug}`;
    const rejectedTitles = rules.rejectedImages?.[key] || [];
    const currentTitle = feature.discovery?.imageFileTitle;
    if (!currentTitle || !rejectedTitles.includes(currentTitle)) continue;
    clearImage(feature);
    feature.discovery.rejectedImageTitles = [
      ...new Set([...(feature.discovery.rejectedImageTitles || []), currentTitle]),
    ];
    removedImages += 1;
  }
}

document.generatedAt = new Date().toISOString();
fs.writeFileSync(inputPath, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Removed ${removedFeatures} rejected features and ${removedImages} rejected images.`);
