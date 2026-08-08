function resolveNationalDailyCohort(cohort, candidates, expectedCount = 14) {
  if (cohort.campaignId !== "national-daily-discovery-v1") throw new Error("National daily cohort campaign ID is invalid");
  if (!Array.isArray(cohort.placeIds) || cohort.placeIds.length !== expectedCount || new Set(cohort.placeIds).size !== expectedCount) {
    throw new Error(`National daily cohort must contain exactly ${expectedCount} unique place IDs`);
  }
  const candidatesById = new Map(candidates.map((candidate) => [candidate.place.id, candidate]));
  const unavailable = cohort.placeIds.filter((id) => !candidatesById.has(id));
  if (unavailable.length) throw new Error(`Approved national daily destinations are no longer publishable: ${unavailable.join(", ")}`);
  return cohort.placeIds.map((id) => candidatesById.get(id));
}

module.exports = { resolveNationalDailyCohort };
