const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"));
}

const parks = readJson("data/generated/all-subsites-ready.json").parks.filter(
  (park) => park.features.length,
);
const reviewed = readJson("data/subsite-visitor-guidance.json").records;
const features = parks.flatMap((park) =>
  park.features.map((feature) => ({ ...feature, parkId: park.id, parkName: park.name })),
);
const featureById = new Map(features.map((feature) => [feature.id, feature]));
const issues = [];

for (const [id, record] of Object.entries(reviewed)) {
  const feature = featureById.get(id);
  if (!feature) {
    issues.push(`${id}: reviewed record does not match a generated subsite`);
    continue;
  }
  if (!record.description || record.description.length < 80) {
    issues.push(`${id}: description is not detailed`);
  }
  const details = record.details || {};
  if (!details.locationContext || details.locationContext.length < 60) {
    issues.push(`${id}: location context is not actionable`);
  }
  if (!details.needToKnow || details.needToKnow.length < 140) {
    issues.push(`${id}: need-to-know guidance is not detailed`);
  }
  if (!/^https:\/\//.test(details.informationSourceUrl || "")) {
    issues.push(`${id}: source URL is missing or not HTTPS`);
  }
  if (!details.informationSourceLabel || !details.informationCheckedAt) {
    issues.push(`${id}: source label or checked date is missing`);
  }
  if (
    /check (?:the )?(?:destination )?source|follow current posted rules|use the exact map pin/i.test(
      details.needToKnow || "",
    )
  ) {
    issues.push(`${id}: guidance still uses a generic enrichment template`);
  }
}

const parkCoverage = parks.map((park) => {
  const covered = park.features.filter((feature) => reviewed[feature.id]).length;
  return {
    id: park.id,
    name: park.name,
    reviewed: covered,
    total: park.features.length,
    complete: covered === park.features.length,
  };
});
const uncovered = parkCoverage.filter((park) => !park.complete);
const requireAll = process.argv.includes("--require-all");
if (requireAll && uncovered.length) {
  issues.push(`${uncovered.length} generated parks still have unreviewed subsites`);
}

const report = {
  checkedAt: new Date().toISOString(),
  reviewedSubsites: Object.keys(reviewed).length,
  generatedSubsites: features.length,
  reviewedParks: parkCoverage.filter((park) => park.complete).length,
  generatedParks: parks.length,
  completeParks: parkCoverage.filter((park) => park.complete).map((park) => park.name),
  remainingByPark: uncovered.map((park) => ({
    name: park.name,
    remaining: park.total - park.reviewed,
  })),
  issues,
};

console.log(JSON.stringify(report, null, 2));
if (issues.length) process.exitCode = 1;
