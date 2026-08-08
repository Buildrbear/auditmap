const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(projectRoot, "app.js"), "utf8");
const apiSource = fs.readFileSync(path.join(projectRoot, "api", "ask.js"), "utf8");
const functionStart = appSource.indexOf("function featureNeedToKnowQuestions");
const functionEnd = appSource.indexOf(
  "window.auditMapFeatureNeedToKnowQuestions = featureNeedToKnowQuestions;",
);

if (functionStart < 0 || functionEnd < 0) {
  throw new Error("Could not locate the subsite question strategy in app.js.");
}

const context = {};
vm.createContext(context);
vm.runInContext(
  `${appSource.slice(functionStart, functionEnd)}\nthis.buildQuestions = featureNeedToKnowQuestions;`,
  context,
);

const generated = JSON.parse(
  fs.readFileSync(
    path.join(projectRoot, "data", "generated", "all-subsites-ready.json"),
    "utf8",
  ),
).parks.filter((park) => park.features.length);
const curated = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data", "institutions.json"), "utf8"),
).filter((place) => place.searchCategory === "park" && (place.features || []).length);
const places = [...generated, ...curated];
const issues = [];
const categoryExamples = new Map();

for (const place of places) {
  for (const feature of place.features || []) {
    const questions = context.buildQuestions(place, feature);
    const category = feature.feature_type || "unknown";
    if (!categoryExamples.has(category)) categoryExamples.set(category, questions);
    if (questions.length < 5 || questions.length > 6) {
      issues.push(`${place.id}/${feature.id}: expected 5-6 questions, found ${questions.length}`);
    }
    if (new Set(questions).size !== questions.length) {
      issues.push(`${place.id}/${feature.id}: duplicate questions`);
    }
    if (questions.some((question) => !question.includes(feature.name))) {
      issues.push(`${place.id}/${feature.id}: question does not identify the focused subsite`);
    }
    if (!questions.some((question) => /park|enter|route|within/i.test(question))) {
      issues.push(`${place.id}/${feature.id}: no arrival or location question`);
    }
  }
}

const appContextSignals = {
  locationContext: "focusedFeature.details?.locationContext",
  needToKnow: "focusedFeature.details?.needToKnow",
  latitude: "latitude: focusedFeature.latitude",
  longitude: "longitude: focusedFeature.longitude",
  sourceLabel: "focusedFeature.details?.informationSourceLabel",
  checkedAt: "focusedFeature.details?.informationCheckedAt",
};
for (const [field, signal] of Object.entries(appContextSignals)) {
  if (!appSource.includes(signal)) issues.push(`app.js: focused subsite context does not include ${field}`);
  if (!apiSource.includes(`place.focusedFeature.${field}`)) {
    issues.push(`api/ask.js: normalized focused subsite context does not include ${field}`);
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  parks: places.length,
  subsites: places.reduce((total, place) => total + place.features.length, 0),
  categories: Object.fromEntries(
    [...categoryExamples.entries()].map(([category, questions]) => [
      category,
      { count: questions.length, firstQuestion: questions[0] },
    ]),
  ),
  issues,
};

console.log(JSON.stringify(report, null, 2));
if (issues.length) process.exitCode = 1;
