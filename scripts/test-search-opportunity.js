const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROMPT_VERSION, scoreResult } = require("../api/_lib/enrichment");

const root = path.resolve(__dirname, "..");
const enrichmentSource = fs.readFileSync(path.join(root, "api/_lib/enrichment.js"), "utf8");
const workerSource = fs.readFileSync(path.join(root, "api/_lib/enrichment-worker.js"), "utf8");
const moderationSource = fs.readFileSync(path.join(root, "api/moderation.js"), "utf8");
const adminSource = fs.readFileSync(path.join(root, "admin.js"), "utf8");
const askSource = fs.readFileSync(path.join(root, "api/ask.js"), "utf8");
const guidance = fs.readFileSync(path.join(root, "docs/search-opportunity-guidance.md"), "utf8");
const brand = fs.readFileSync(path.join(root, "docs/brand-voice-and-lexicon.md"), "utf8");

assert.equal(PROMPT_VERSION, "place-enrichment-v2-search-opportunity");
assert.match(enrichmentSource, /required: \["synopsis", "searchOpportunity"/);
assert.match(enrichmentSource, /The search opportunity is an internal content hypothesis/);
assert.match(enrichmentSource, /Do not claim search volume, low competition, likely ranking, or superiority/);
assert.match(workerSource, /predicate: "search-opportunity"/);
assert.match(workerSource, /status: "proposed"/);
assert.match(moderationSource, /current\.predicate !== "search-opportunity"/);
assert.match(adminSource, /Approve opportunity/);
assert.match(adminSource, /Complete the evidence plan before publishing any resulting claim/);
assert.match(askSource, /fact\.predicate === "search-opportunity"/);

assert.match(guidance, /Top search volume shows demand\. Search gaps show opportunity\./);
assert.match(guidance, /Every audited place should carry one reviewable search opportunity brief/);
assert.match(guidance, /The brief is planning material/);
assert.match(brand, /trusted, observant, human layer on top of the map/);

const baseResult = {
  synopsis: "Useful place synopsis.",
  searchOpportunity: null,
  facts: {
    hours: "Daily",
    cost: "Free",
    accessibility: "Documented",
    transit: "Bus access",
    phone: "555-0100",
    website: "https://example.gov",
  },
  intentAnswers: [],
  amenities: ["Trail"],
  sources: [{ url: "https://example.gov/1" }],
  confidence: 1,
};
const withoutOpportunity = scoreResult(baseResult).score;
const withOpportunity = scoreResult({
  ...baseResult,
  searchOpportunity: {
    question: "What does this place feel like for a first visit?",
    evidencePlan: "Collect dated field observations from several visits.",
  },
}).score;
assert.ok(withOpportunity > withoutOpportunity, "A complete opportunity brief should improve audit completeness");

console.log("Search opportunity guidance and enrichment checks passed.");
