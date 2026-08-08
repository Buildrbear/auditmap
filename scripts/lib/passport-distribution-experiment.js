const metricKeys = [
  "socialImpressions",
  "socialEngagements",
  "passportOpens",
  "placesMarked",
  "progressShares",
  "sharedPassportOpens",
  "contributionIntents",
  "crumbSubmissions",
  "nonTeamResponses",
];

function rate(numerator, denominator) {
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
    ? numerator / denominator
    : null;
}

function validateCheckpoint(checkpoint, variantId, checkpointName) {
  const invalid = metricKeys.filter((key) => checkpoint[key] !== null && (!Number.isInteger(checkpoint[key]) || checkpoint[key] < 0));
  if (invalid.length) throw new Error(`${variantId} ${checkpointName} has missing or invalid fields: ${invalid.join(", ")}`);
  const constraints = [
    ["socialEngagements", "socialImpressions"],
    ["crumbSubmissions", "contributionIntents"],
  ];
  for (const [numerator, denominator] of constraints) {
    if (Number.isInteger(checkpoint[numerator]) && Number.isInteger(checkpoint[denominator]) && checkpoint[numerator] > checkpoint[denominator]) {
      throw new Error(`${variantId} ${checkpointName} ${numerator} cannot exceed ${denominator}`);
    }
  }
}

function validateResults(campaign, results) {
  if (results.campaignId !== campaign.id) throw new Error("Campaign and results IDs do not match");
  const campaignIds = campaign.variants.map(({ id }) => id);
  const resultIds = results.variants.map(({ id }) => id);
  if (new Set(campaignIds).size !== campaignIds.length || new Set(resultIds).size !== resultIds.length) {
    throw new Error("Variant IDs must be unique");
  }
  if (campaignIds.length !== resultIds.length || campaignIds.some((id) => !resultIds.includes(id))) {
    throw new Error("Campaign and result variants do not match");
  }
  for (const result of results.variants) {
    for (const checkpointName of ["24h", "7d"]) {
      const checkpoint = result.checkpoints?.[checkpointName];
      if (checkpoint !== null) validateCheckpoint(checkpoint, result.id, checkpointName);
    }
  }
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function evaluateResults(campaign, results, checkpointName = "7d") {
  validateResults(campaign, results);
  const collected = results.variants
    .map((result) => result.checkpoints[checkpointName])
    .filter(Boolean);
  const medianOpens = median(collected.map(({ passportOpens }) => passportOpens));
  const variants = campaign.variants.map((variant) => {
    const result = results.variants.find(({ id }) => id === variant.id);
    const metrics = result.checkpoints[checkpointName];
    if (!metrics) return { ...variant, collected: false, metrics: null, decision: "collect", reason: "No checkpoint data has been entered." };
    const missing = metricKeys.filter((key) => !Number.isInteger(metrics[key]));
    if (missing.length) return { ...variant, collected: false, metrics, decision: "collect", reason: `Awaiting: ${missing.join(", ")}.` };
    const calculated = {
      ...metrics,
      openRate: rate(metrics.passportOpens, metrics.socialImpressions),
      marksPerOpen: rate(metrics.placesMarked, metrics.passportOpens),
      sharesPerOpen: rate(metrics.progressShares, metrics.passportOpens),
      referralOpensPerShare: rate(metrics.sharedPassportOpens, metrics.progressShares),
      contributionsPerOpen: rate(metrics.crumbSubmissions, metrics.passportOpens),
    };
    let decision = "keep-testing";
    let reason = "The message activated explorers but needs another comparable window.";
    if (metrics.socialImpressions === 0) {
      decision = "fix-distribution";
      reason = "The message was measured but received no distribution.";
    } else if (metrics.passportOpens === 0) {
      decision = "rewrite-hook";
      reason = "People saw the message but did not open the passport.";
    } else if (Number.isFinite(medianOpens) && medianOpens > 0 && metrics.passportOpens < medianOpens / 2) {
      decision = "insufficient-reach";
      reason = "This variant received less than half the campaign's median passport opens.";
    } else if (metrics.placesMarked === 0) {
      decision = "rewrite-promise";
      reason = "Visitors opened the passport but did not mark a place explored.";
    } else if (metrics.crumbSubmissions > 0) {
      decision = "repeat-and-expand";
      reason = "The message produced a completed contribution that improves a public record.";
    } else if (metrics.progressShares > 0 || metrics.contributionIntents > 0 || metrics.nonTeamResponses > 0) {
      decision = "repeat";
      reason = "The message produced a downstream sharing, contribution-intent, or community signal.";
    }
    return { ...variant, collected: true, metrics: calculated, decision, reason };
  });
  return {
    checkpoint: checkpointName,
    complete: variants.every(({ collected: value }) => value),
    collectedVariants: variants.filter(({ collected: value }) => value).length,
    totalVariants: variants.length,
    medianOpens,
    variants,
  };
}

module.exports = { evaluateResults, metricKeys, rate, validateResults };
