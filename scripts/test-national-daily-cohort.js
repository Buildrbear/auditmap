const assert = require("node:assert/strict");
const { resolveNationalDailyCohort } = require("./lib/national-daily-cohort");

const candidates = ["alpha", "beta"].map((id) => ({ place: { id } }));
const cohort = { campaignId: "national-daily-discovery-v1", placeIds: ["beta", "alpha"] };
assert.deepEqual(resolveNationalDailyCohort(cohort, candidates, 2).map(({ place }) => place.id), ["beta", "alpha"]);
assert.throws(() => resolveNationalDailyCohort({ ...cohort, campaignId: "wrong" }, candidates, 2), /campaign ID is invalid/);
assert.throws(() => resolveNationalDailyCohort({ ...cohort, placeIds: ["alpha", "alpha"] }, candidates, 2), /unique place IDs/);
assert.throws(() => resolveNationalDailyCohort({ ...cohort, placeIds: ["alpha", "missing"] }, candidates, 2), /no longer publishable: missing/);
console.log("National daily cohort order and fail-closed replacement rules passed.");
