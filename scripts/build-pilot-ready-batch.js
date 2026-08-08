const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}
const inputName = argumentValue("input") || "pilot-subsites.json";
const outputName = argumentValue("output") || "pilot-subsites-ready.json";
const inputPath = path.join(projectRoot, "data", "generated", inputName);
const outputPath = path.join(
  projectRoot,
  "data",
  "generated",
  outputName,
);
const document = JSON.parse(fs.readFileSync(inputPath, "utf8"));

function photoComplete(feature) {
  return [
    "imageUrl",
    "imageSourceUrl",
    "imageAuthor",
    "imageLicense",
    "imageAlt",
  ].every((field) => feature.details?.[field]);
}

const parks = document.parks.map((park) => {
  const ready = (park.features || []).filter(photoComplete);
  const needsPhoto = (park.features || []).filter((feature) => !photoComplete(feature));
  return {
    id: park.id,
    name: park.name,
    city: park.city,
    state: park.state,
    sourceBoundary: park.sourceBoundary,
    features: ready,
    researchQueue: [
      ...(park.reviewCandidates || []),
      ...needsPhoto.map((feature) => ({
        ...feature,
        publicationBlocker: "missing-reviewed-photo",
      })),
    ],
  };
});

const output = {
  generatedAt: new Date().toISOString(),
  publicationRule:
    "Only coordinate-verified, source-backed subsites with complete real-photo attribution.",
  parks,
  totals: {
    parks: parks.length,
    readyFeatures: parks.reduce((total, park) => total + park.features.length, 0),
    researchQueue: parks.reduce((total, park) => total + park.researchQueue.length, 0),
  },
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.totals, null, 2));
