const assert = require("node:assert/strict");
const { buildDiscoveryFollowUp, canonicalPlacePath } = require("../api/_lib/discovery-followups");

const place = { public_id: "dix-park", name: "Dix Park", type: "Park", city: "Raleigh", state: "NC" };
const base = {
  id: "11111111-1111-4111-8111-111111111111",
  place,
  sample_question: "Where should I park?",
  canonical_answer: "Use the marked visitor lots near your destination. Do not park on grass.",
  answer_sources: [{ title: "Official park guide", url: "https://example.gov/park" }],
  answer_status: "answered",
  status: "answered",
  answered_at: "2026-08-07T12:00:00.000Z",
  metadata: { followUpStatus: "queued", followUpReadyAt: "2026-08-07T12:00:00.000Z" },
};

assert.equal(canonicalPlacePath(place), "/us/nc/raleigh/parks/dix-park");
const followUp = buildDiscoveryFollowUp(base);
assert.ok(followUp.caption.includes("visitors asked"));
assert.ok(followUp.caption.includes("#AnsweredByAuditMap"));
assert.ok(followUp.url.includes("utm_campaign=answered_by_auditmap"));
assert.ok(followUp.estimatedXLength <= 280);
const longFollowUp = buildDiscoveryFollowUp({
  ...base,
  place: { ...place, name: "A Public Destination With an Exceptionally Long Official Municipal Name" },
  sample_question: "Where is the most convenient accessible parking area for a first-time visitor arriving with several young children?",
  canonical_answer: "The official visitor guide recommends a specific marked parking area beside the accessible entrance, but visitors should confirm temporary construction signs before arriving.",
});
assert.ok(longFollowUp.estimatedXLength <= 280);
assert.equal(buildDiscoveryFollowUp({ ...base, answer_status: "needs_verification" }), null);
assert.equal(buildDiscoveryFollowUp({ ...base, answer_sources: [] }), null);
assert.equal(buildDiscoveryFollowUp({ ...base, metadata: { followUpStatus: "prepared" } }), null);

console.log("Reviewed-answer follow-up generation checks passed.");
