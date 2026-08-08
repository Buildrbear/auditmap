const fs = require("node:fs");
const path = require("node:path");
const { databaseReady, supabaseRequest } = require("../api/_lib/supabase");
const { normalizeReviewedKnowledge } = require("./lib/reviewed-knowledge");

const root = path.resolve(__dirname, "..");
if (!databaseReady()) {
  console.error("The reviewed-knowledge export requires a configured read-only database connection.");
  process.exit(1);
}

async function run() {
  const institutions = await supabaseRequest(
    "institutions?select=id,public_id&limit=10000",
    { method: "GET" },
  );
  const publicIdByInstitution = new Map((institutions || []).map((item) => [item.id, item.public_id]));
  const needs = await supabaseRequest(
    "information_needs?status=eq.answered&answer_status=in.(answered,partial)&canonical_answer=not.is.null&select=id,institution_id,sample_question,intent_key,canonical_answer,answer_status,answer_sources,answered_at,expires_at,metadata&order=answered_at.asc&limit=10000",
    { method: "GET" },
  );
  const answers = [];
  for (const need of needs || []) {
    const placeId = publicIdByInstitution.get(need.institution_id);
    const sources = Array.isArray(need.answer_sources) && need.answer_sources.length
      ? need.answer_sources
      : [{}];
    for (const source of sources.slice(0, 1)) {
      answers.push({
        informationNeedId: need.id,
        placeId,
        intentKey: need.intent_key,
        question: need.sample_question,
        answer: need.canonical_answer,
        answerStatus: need.answer_status,
        sourceLabel: source.title,
        sourceUrl: source.url,
        sourceType: source.sourceType || "reviewed",
        checkedAt: need.answered_at,
        reviewedAt: need.metadata?.followUpReadyAt || need.answered_at,
        expiresAt: need.expires_at,
        reviewStatus: need.metadata?.followUpStatus ? "approved" : null,
      });
    }
  }
  const document = { version: 1, exportedAt: new Date().toISOString(), answers };
  normalizeReviewedKnowledge(document);
  const output = path.join(root, "data/reviewed-knowledge.json");
  fs.writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
  console.log(JSON.stringify({ output: path.relative(root, output), approvedAnswers: answers.length }, null, 2));
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
