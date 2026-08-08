const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  applyReviewedKnowledge,
  normalizeReviewedKnowledge,
  placeLastModified,
} = require("./lib/reviewed-knowledge");

const root = path.resolve(__dirname, "..");
const reviewedAnswer = {
  informationNeedId: "11111111-1111-4111-8111-111111111111",
  placeId: "dix-park",
  intentKey: "parking",
  question: "Which marked lot should I use for a first visit?",
  answer: "Publication fixture: use a marked paved or gravel visitor lot near the exact Dix Park destination.",
  answerStatus: "answered",
  sourceLabel: "Dix Park visitor guide",
  sourceUrl: "https://dixpark.org/visit",
  sourceType: "official",
  checkedAt: "2026-08-07T10:00:00.000Z",
  reviewedAt: "2026-08-07T11:00:00.000Z",
  expiresAt: "2099-01-01T00:00:00.000Z",
  reviewStatus: "approved",
};
const document = { version: 1, exportedAt: "2026-08-07T11:00:00.000Z", answers: [reviewedAnswer] };
const answers = normalizeReviewedKnowledge(document, { now: new Date("2026-08-07T12:00:00.000Z") });
const overlaid = applyReviewedKnowledge([{
  id: "dix-park",
  name: "Dix Park",
  verifiedAt: "2026-08-05",
  searchAnswers: [{ intentKey: "parking", question: "Old question", answer: "Old answer" }],
}], answers)[0];
assert.equal(overlaid.searchAnswers.length, 1);
assert.equal(overlaid.searchAnswers[0].answer, reviewedAnswer.answer);
assert.equal(placeLastModified(overlaid), "2026-08-07");
assert.throws(() => normalizeReviewedKnowledge({
  ...document,
  answers: [{ ...reviewedAnswer, reviewStatus: "draft" }],
}, { now: new Date("2026-08-07T12:00:00.000Z") }), /reviewStatus must be approved/);
assert.throws(() => applyReviewedKnowledge([], answers), /unknown places/);

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "auditmap-reviewed-knowledge-"));
const fixturePath = path.join(temporaryRoot, "reviewed-knowledge.json");
fs.writeFileSync(fixturePath, `${JSON.stringify(document, null, 2)}\n`);
execFileSync(process.execPath, [path.join(root, "scripts/generate-search-pages.js")], {
  cwd: root,
  env: {
    ...process.env,
    AUDITMAP_OUTPUT_ROOT: temporaryRoot,
    AUDITMAP_REVIEWED_KNOWLEDGE_PATH: fixturePath,
  },
  stdio: "pipe",
});

const html = fs.readFileSync(path.join(temporaryRoot, "us/nc/raleigh/parks/dix-park/index.html"), "utf8");
const sitemap = fs.readFileSync(path.join(temporaryRoot, "sitemap.xml"), "utf8");
const catalog = JSON.parse(fs.readFileSync(path.join(temporaryRoot, "data/generated/official-catalog.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(temporaryRoot, "data/generated/search-page-manifest.json"), "utf8"));
assert.ok(html.includes(reviewedAnswer.question));
assert.ok(html.includes(reviewedAnswer.answer));
assert.match(
  sitemap,
  /<loc>https:\/\/www\.auditmap\.org\/us\/nc\/raleigh\/parks\/dix-park<\/loc>\s*<lastmod>2026-08-07<\/lastmod>/,
);
const dix = catalog.places.find((place) => place.id === "dix-park");
assert.ok(dix.facts.some((fact) => fact.key === "parking" && fact.value === reviewedAnswer.answer));
assert.equal(manifest.reviewedKnowledgeAnswers, 1);

console.log("Reviewed answer raw HTML, catalog, and page-specific sitemap freshness checks passed.");
