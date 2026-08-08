const assert = require("node:assert/strict");

const {
  SafetyError,
  _private,
  assertSameOrigin,
  enforceRateLimit,
  featureEnabled,
  stableHash,
} = require("../api/_lib/abuse-controls");
const { trustedRole } = require("../api/_lib/account-auth");
const { _private: reportsPrivate } = require("../api/reports");

function responseMock() {
  const headers = new Map();
  return {
    headers,
    setHeader(name, value) {
      headers.set(name.toLowerCase(), String(value));
    },
  };
}

function requestMock(headers = {}) {
  return { headers };
}

_private.buckets.clear();
const request = requestMock({
  host: "www.auditmap.org",
  origin: "https://www.auditmap.org",
  "x-forwarded-for": "203.0.113.10",
});
assert.doesNotThrow(() => assertSameOrigin(request));
assert.throws(
  () => assertSameOrigin(requestMock({
    host: "www.auditmap.org",
    origin: "https://attacker.example",
  })),
  (error) => error instanceof SafetyError && error.code === "ORIGIN_MISMATCH",
);
assert.throws(
  () => assertSameOrigin(requestMock({ "sec-fetch-site": "cross-site" })),
  (error) => error instanceof SafetyError && error.code === "CROSS_SITE_REQUEST",
);

const response = responseMock();
enforceRateLimit(request, response, { name: "test", limit: 2, windowMs: 60_000 });
enforceRateLimit(request, response, { name: "test", limit: 2, windowMs: 60_000 });
assert.throws(
  () => enforceRateLimit(request, response, { name: "test", limit: 2, windowMs: 60_000 }),
  (error) => error instanceof SafetyError && error.status === 429,
);
assert.equal(response.headers.get("retry-after"), "60");

process.env.TEST_SAFETY_SWITCH = "false";
assert.equal(featureEnabled("TEST_SAFETY_SWITCH"), false);
delete process.env.TEST_SAFETY_SWITCH;
assert.equal(featureEnabled("TEST_SAFETY_SWITCH"), true);

assert.equal(stableHash("person@example.com", "email"), stableHash("person@example.com", "email"));
assert.notEqual(stableHash("person@example.com", "email"), stableHash("other@example.com", "email"));
assert.equal(trustedRole({ app_metadata: { auditmap_demo: true, auditmap_role: "super_admin" } }), "member");
assert.equal(trustedRole({ app_metadata: { auditmap_role: "moderator" } }), "moderator");
assert.equal(reportsPrivate.REASONS.has("privacy"), true);
assert.equal(reportsPrivate.cleanUuid("not-an-id"), null);

console.log("Community safety checks passed.");
