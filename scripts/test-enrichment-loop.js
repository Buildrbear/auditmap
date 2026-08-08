const assert = require("node:assert/strict");
const {
  buildEnrichmentQueue,
  scorePlaceCoverage,
} = require("../api/_lib/proactive-enrichment");
const { aiConnection } = require("../api/_lib/ai-connection");
const { detectIntent } = require("../api/_lib/park-intents");

const now = "2026-07-30T12:00:00.000Z";
const basePlace = {
  id: "test-park",
  name: "Test Park",
  type: "Park",
  city: "Raleigh",
  state: "NC",
  officialSource: {
    label: "City parks",
    url: "https://example.gov/test-park",
  },
  facts: [],
};

const empty = scorePlaceCoverage(basePlace, { now });
assert.equal(empty.coveredIntentCount, 0);
assert(empty.tasks.some((task) => task.intentKey === "parking"));
assert(empty.tasks.every((task) => task.requiresHumanReview));

const currentParkingFacts = [{
  key: "parking",
  value: "Use Lot A.",
  scope: "place",
  sourceUrl: "https://example.gov/test-park",
  expiresAt: "2026-08-01T12:00:00.000Z",
}];
const currentParking = scorePlaceCoverage({
  ...basePlace,
  facts: currentParkingFacts,
}, { now });
assert(!currentParking.tasks.some((task) => task.intentKey === "parking"));

const expiredParking = scorePlaceCoverage({
  ...basePlace,
  facts: [{
    key: "parking",
    value: "Use Lot A.",
    scope: "place",
    sourceUrl: "https://example.gov/test-park",
    expiresAt: "2026-07-29T12:00:00.000Z",
  }],
}, { now });
const refresh = expiredParking.tasks.find((task) => task.intentKey === "parking");
assert.equal(refresh.action, "refresh");
assert.equal(refresh.previousAnswer, "Use Lot A.");

const partialParking = scorePlaceCoverage({
  ...basePlace,
  facts: [{
    key: "parking",
    value: "Parking exists, but its location still needs verification.",
    scope: "place",
    sourceUrl: "https://example.gov/test-park",
    verificationStatus: "partial",
  }],
}, { now });
const completeParking = partialParking.tasks.find((task) => task.intentKey === "parking");
assert.equal(completeParking.action, "complete");
assert.match(completeParking.reason, /still needs/i);
assert(partialParking.coverageScore > empty.coverageScore);
assert(partialParking.coverageScore < currentParking.coverageScore);

const hoursOnly = scorePlaceCoverage({
  ...basePlace,
  facts: [{ key: "hours", value: "Dawn to dusk.", scope: "place" }],
}, { now });
assert(hoursOnly.tasks.some((task) => task.intentKey === "closures"));

const queue = buildEnrichmentQueue({
  places: [
    basePlace,
    { ...basePlace, id: "covered-park", name: "Covered Park", facts: currentParkingFacts },
  ],
}, { now });
assert.equal(queue.policy.publication.includes("human"), true);
assert(queue.tasks.every((task) => task.question && task.reason && task.suggestedSources.length));
assert(queue.tasks[0].priority >= queue.tasks.at(-1).priority);
assert.equal(
  detectIntent("Where should I park for John Chavis Memorial Park?")?.key,
  "parking",
);
assert.equal(
  detectIntent("Where are the restrooms at John Chavis Memorial Park?")?.key,
  "restroom",
);
assert.equal(
  detectIntent("Is construction affecting John Chavis Memorial Park?")?.key,
  "closures",
);
assert.equal(
  detectIntent("Where are the shaded play areas?")?.key,
  "shade",
);
assert.equal(
  detectIntent("Is my train running normally today?")?.key,
  "closures",
);
assert.equal(
  detectIntent("Was train 80 canceled?")?.key,
  "closures",
);
assert.equal(
  detectIntent("Is train 80 delayed?")?.key,
  "closures",
);
assert.equal(
  detectIntent("Is the museum open today?")?.key,
  "closures",
);
assert.equal(
  detectIntent("Where does a school bus unload?")?.key,
  "entrance",
);

const priorDirectKey = process.env.OPENAI_API_KEY;
const priorGatewayKey = process.env.AI_GATEWAY_API_KEY;
const priorGatewayEnabled = process.env.AI_GATEWAY_ENABLED;
const priorOidc = process.env.VERCEL_OIDC_TOKEN;
delete process.env.OPENAI_API_KEY;
delete process.env.AI_GATEWAY_API_KEY;
delete process.env.AI_GATEWAY_ENABLED;
delete process.env.VERCEL_OIDC_TOKEN;
assert.equal(aiConnection(), null);
process.env.VERCEL_OIDC_TOKEN = "test-oidc";
process.env.AI_GATEWAY_ENABLED = "true";
assert.deepEqual(aiConnection({ model: "gpt-4.1-mini" }), {
  apiUrl: "https://ai-gateway.vercel.sh/v1/responses",
  token: "test-oidc",
  model: "openai/gpt-4.1-mini",
  provider: "vercel-ai-gateway",
});
if (priorDirectKey) process.env.OPENAI_API_KEY = priorDirectKey;
else delete process.env.OPENAI_API_KEY;
if (priorGatewayKey) process.env.AI_GATEWAY_API_KEY = priorGatewayKey;
else delete process.env.AI_GATEWAY_API_KEY;
if (priorGatewayEnabled) process.env.AI_GATEWAY_ENABLED = priorGatewayEnabled;
else delete process.env.AI_GATEWAY_ENABLED;
if (priorOidc) process.env.VERCEL_OIDC_TOKEN = priorOidc;
else delete process.env.VERCEL_OIDC_TOKEN;

console.log(`Enrichment loop tests passed: ${queue.tasks.length} prioritized tasks checked.`);
