const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const generatedDirectory = path.join(projectRoot, "data", "generated");
const outputPath = path.join(generatedDirectory, "all-subsites-ready.json");
const files = fs
  .readdirSync(generatedDirectory)
  .filter(
    (file) =>
      file.endsWith("-subsites-ready.json") &&
      file !== path.basename(outputPath) &&
      file !== "all-subsites-ready.json",
  )
  .sort((left, right) => {
    if (left === "pilot-subsites-ready.json") return -1;
    if (right === "pilot-subsites-ready.json") return 1;
    return left.localeCompare(right);
  });
const parks = new Map();
const informationPath = path.join(
  generatedDirectory,
  "subsite-information-enrichment.json",
);
const informationRecords = fs.existsSync(informationPath)
  ? JSON.parse(fs.readFileSync(informationPath, "utf8")).records || {}
  : {};
const reviewedGuidancePath = path.join(
  projectRoot,
  "data",
  "subsite-visitor-guidance.json",
);
const reviewedGuidance = fs.existsSync(reviewedGuidancePath)
  ? JSON.parse(fs.readFileSync(reviewedGuidancePath, "utf8")).records || {}
  : {};

for (const file of files) {
  const document = JSON.parse(fs.readFileSync(path.join(generatedDirectory, file), "utf8"));
  for (const park of document.parks || []) {
    if (!parks.has(park.id)) parks.set(park.id, { ...park, batchSource: file });
  }
}

const mergedParks = [...parks.values()].map((park) => ({
  ...park,
  features: park.features.map((feature) => {
    const enrichment = informationRecords[feature.id];
    const reviewed = reviewedGuidance[feature.id];
    if (!enrichment && !reviewed) return feature;
    return {
      ...feature,
      description: reviewed?.description || enrichment?.description || feature.description,
      details: {
        ...feature.details,
        ...(enrichment?.details || {}),
        ...(reviewed?.details || {}),
      },
    };
  }),
}));
const output = {
  generatedAt: new Date().toISOString(),
  batchFiles: files,
  parks: mergedParks,
  totals: {
    parks: mergedParks.length,
    readyFeatures: mergedParks.reduce((total, park) => total + park.features.length, 0),
    researchQueue: mergedParks.reduce(
      (total, park) => total + (park.researchQueue || []).length,
      0,
    ),
  },
};
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.totals, null, 2));
