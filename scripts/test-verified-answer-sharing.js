const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const generator = fs.readFileSync(path.join(root, "scripts/generate-search-pages.js"), "utf8");
const dix = fs.readFileSync(path.join(root, "us/nc/raleigh/parks/dix-park/index.html"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(generator.includes('answer.source ? `<button data-knowledge-share='), "Static share controls must require a public answer source.");
assert(app.includes('item.answer_status === "answered" && sources.length'), "Live share controls must require an answered status and at least one source.");
assert(app.includes('utm_campaign", "verified_answer_loop"'), "Shared answers need loop-specific attribution.");
assert(app.includes('trackAuditMapEvent("Verified answer shared"'), "Answer distribution must be measurable.");
assert(app.includes('trackAuditMapEvent("Shared answer opened"'), "Shared-answer landings must be measurable.");
assert(app.includes('url.hash = `answer-${intentKey}`'), "Shared links must open the exact on-page answer.");
assert(/id="answer-parking-[a-z0-9]+"/.test(dix), "Dix Park raw HTML must expose a compact stable parking fragment.");
assert(/data-knowledge-share="parking-[a-z0-9]+"/.test(dix), "Dix Park sourced parking answer must be shareable in raw HTML.");
assert(!/(id="answer-[^"]+")[\s\S]*\1/.test(dix), "Dix Park answer fragment IDs must be unique.");
assert(!/needs_verification[\s\S]{0,300}data-knowledge-share/.test(app), "AI drafts must not gain a share control.");

console.log("Verified-answer trust boundary, exact-link, distribution, landing, and raw HTML contracts passed.");
