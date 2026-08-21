const assert = require("node:assert/strict");

const supabasePath = require.resolve("../api/_lib/supabase");
const calls = [];
let storedClaim = null;
const need = {
  id: "need-1",
  metadata: {
    communityClaimIds: [],
  },
};

require.cache[supabasePath] = {
  id: supabasePath,
  filename: supabasePath,
  loaded: true,
  exports: {
    async supabaseRequest(path, options = {}) {
      calls.push({ path, options });
      if (path.startsWith("claims?")) return storedClaim ? [{ id: storedClaim.id }] : [];
      if (path === "claims" && options.method === "POST") {
        storedClaim = { id: "claim-1", ...JSON.parse(options.body) };
        return [storedClaim];
      }
      if (path === "information_needs?id=eq.need-1" && options.method === "PATCH") {
        Object.assign(need, JSON.parse(options.body));
        return [need];
      }
      if (path.startsWith("information_needs?")) return [need];
      throw new Error(`Unexpected mock request: ${path}`);
    },
  },
};

const { recordVerificationEvidence } = require("../api/_lib/verification-evidence");

const contribution = {
  id: "contribution-1",
  institution_id: "institution-1",
  contribution_type: "observation",
  body: "restroom: Restrooms are on the second floor beside the elevators.",
  created_at: "2026-07-30T14:00:00.000Z",
  metadata: {
    verificationIntent: "restroom",
    verificationPrompt: "Where are the public restrooms?",
    observedAt: "2026-07-30T14:00:00.000Z",
  },
};

(async () => {
  await recordVerificationEvidence(contribution);
  await recordVerificationEvidence(contribution);

  const claimPosts = calls.filter(
    ({ path, options }) => path === "claims" && options.method === "POST",
  );
  assert.equal(claimPosts.length, 1, "Repeated processing must not duplicate a claim.");
  assert.equal(storedClaim.predicate, "answer:restroom");
  assert.equal(storedClaim.verification_status, "unreviewed");
  assert.equal(storedClaim.value.intentKey, "restroom");
  assert.equal(need.status, "open");
  assert.equal(need.needs_enrichment, true);
  assert.deepEqual(need.metadata.communityClaimIds, ["claim-1"]);
  assert.equal(need.metadata.communityEvidenceCount, 1);

  console.log("Verification evidence test passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
