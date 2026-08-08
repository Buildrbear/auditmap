const metricKeys = [
  "socialImpressions",
  "socialEngagements",
  "attributedVisits",
  "saves",
  "directions",
  "shares",
  "crumbStarts",
  "crumbSubmissions",
  "returnPromptShown",
  "returnPromptAccepted",
  "returnPromptDismissed",
  "nonTeamResponses",
];
const returnPromptVariantKeys = ["help-next-person", "leave-breadcrumb"];

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function validateCheckpoint(checkpoint, label) {
  if (checkpoint === null) return;
  if (!checkpoint || typeof checkpoint !== "object" || Array.isArray(checkpoint)) {
    throw new Error(`${label} must be an object or null`);
  }
  for (const key of metricKeys) {
    const value = checkpoint[key];
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${label}.${key} must be a non-negative integer`);
    }
  }
  if (checkpoint.crumbSubmissions > checkpoint.crumbStarts) {
    throw new Error(`${label}.crumbSubmissions cannot exceed crumbStarts`);
  }
  if (checkpoint.returnPromptAccepted > checkpoint.returnPromptShown) {
    throw new Error(`${label}.returnPromptAccepted cannot exceed returnPromptShown`);
  }
  if (checkpoint.returnPromptDismissed > checkpoint.returnPromptShown) {
    throw new Error(`${label}.returnPromptDismissed cannot exceed returnPromptShown`);
  }
  if (!checkpoint.returnPromptVariants || typeof checkpoint.returnPromptVariants !== "object") {
    throw new Error(`${label}.returnPromptVariants must contain both prompt variants`);
  }
  for (const variant of returnPromptVariantKeys) {
    const result = checkpoint.returnPromptVariants[variant];
    if (!result || !["shown", "accepted", "dismissed"].every((key) => Number.isInteger(result[key]) && result[key] >= 0)) {
      throw new Error(`${label}.returnPromptVariants.${variant} must contain non-negative shown, accepted, and dismissed counts`);
    }
    if (result.accepted > result.shown || result.dismissed > result.shown) {
      throw new Error(`${label}.returnPromptVariants.${variant} outcomes cannot exceed shown`);
    }
  }
  const variantTotal = (key) => returnPromptVariantKeys.reduce(
    (total, variant) => total + checkpoint.returnPromptVariants[variant][key],
    0,
  );
  if (variantTotal("shown") !== checkpoint.returnPromptShown
    || variantTotal("accepted") !== checkpoint.returnPromptAccepted
    || variantTotal("dismissed") !== checkpoint.returnPromptDismissed) {
    throw new Error(`${label}.returnPromptVariants totals must match the aggregate return-prompt metrics`);
  }
}

function validateResults(campaign, results) {
  if (results.campaignId !== campaign.id) throw new Error("Results campaignId does not match the campaign");
  if (!Number.isInteger(results.round) || results.round < 1) throw new Error("Results round must be a positive integer");
  const campaignIds = campaign.posts.map((post) => post.id);
  const resultIds = results.posts.map((post) => post.id);
  if (new Set(resultIds).size !== resultIds.length) throw new Error("Result post IDs must be unique");
  if (campaignIds.length !== resultIds.length || campaignIds.some((id) => !resultIds.includes(id))) {
    throw new Error("Results must contain every campaign post exactly once");
  }
  for (const post of results.posts) {
    if (!post.checkpoints || !("24h" in post.checkpoints) || !("7d" in post.checkpoints)) {
      throw new Error(`${post.id} must contain 24h and 7d checkpoints`);
    }
    validateCheckpoint(post.checkpoints["24h"], `${post.id}.24h`);
    validateCheckpoint(post.checkpoints["7d"], `${post.id}.7d`);
  }
}

function summarizeCheckpoint(checkpoint) {
  const usefulActions = checkpoint.saves + checkpoint.directions + checkpoint.shares + checkpoint.crumbSubmissions;
  return {
    ...checkpoint,
    usefulActions,
    usefulActionsPer100Visits: checkpoint.attributedVisits
      ? (usefulActions / checkpoint.attributedVisits) * 100
      : null,
    crumbCompletionRate: checkpoint.crumbStarts
      ? checkpoint.crumbSubmissions / checkpoint.crumbStarts
      : null,
    returnPromptAcceptanceRate: checkpoint.returnPromptShown
      ? checkpoint.returnPromptAccepted / checkpoint.returnPromptShown
      : null,
    returnPromptVariantRates: Object.fromEntries(returnPromptVariantKeys.map((variant) => {
      const result = checkpoint.returnPromptVariants[variant];
      return [variant, {
        ...result,
        acceptanceRate: result.shown ? result.accepted / result.shown : null,
      }];
    })),
  };
}

function evaluateResults(campaign, results, checkpointKey = "7d") {
  validateResults(campaign, results);
  const campaignPosts = new Map(campaign.posts.map((post) => [post.id, post]));
  const collected = results.posts
    .filter((post) => post.checkpoints[checkpointKey])
    .map((post) => ({
      id: post.id,
      series: campaignPosts.get(post.id).series,
      hook: campaignPosts.get(post.id).hook,
      metrics: summarizeCheckpoint(post.checkpoints[checkpointKey]),
    }));
  const rateMedian = median(collected.map((post) => post.metrics.usefulActionsPer100Visits).filter(Number.isFinite));
  const visitMedian = median(collected.map((post) => post.metrics.attributedVisits).filter((value) => value > 0));
  const promptVariants = Object.fromEntries(returnPromptVariantKeys.map((variant) => {
    const totals = collected.reduce((sum, post) => {
      const result = post.metrics.returnPromptVariants[variant];
      sum.shown += result.shown;
      sum.accepted += result.accepted;
      sum.dismissed += result.dismissed;
      return sum;
    }, { shown: 0, accepted: 0, dismissed: 0 });
    return [variant, {
      ...totals,
      acceptanceRate: totals.shown ? totals.accepted / totals.shown : null,
    }];
  }));

  const posts = results.posts.map((result) => {
    const campaignPost = campaignPosts.get(result.id);
    const checkpoint = result.checkpoints[checkpointKey];
    if (!checkpoint) return { id: result.id, series: campaignPost.series, decision: "awaiting-results", reason: `No ${checkpointKey} data yet.` };
    const metrics = summarizeCheckpoint(checkpoint);
    const comparableReach = metrics.attributedVisits > 0
      && (visitMedian === null || metrics.attributedVisits >= visitMedian * 0.5);
    const hasHumanSignal = metrics.nonTeamResponses > 0 || metrics.crumbSubmissions > 0;
    let decision = "test-again";
    let reason = "The result is usable but does not yet justify scaling or rewriting.";
    if (!comparableReach) {
      decision = "insufficient-reach";
      reason = "Distribution was below half the campaign median, so the creative cannot be judged fairly.";
    } else if (hasHumanSignal && metrics.usefulActionsPer100Visits >= rateMedian) {
      decision = "repeat";
      reason = "The post produced a non-team response or contribution and met the campaign median useful-action rate.";
    } else if (metrics.usefulActions === 0) {
      decision = "rewrite";
      reason = "The post brought attributed visitors but produced no useful action.";
    } else if (results.round > 1 && metrics.usefulActionsPer100Visits < rateMedian) {
      decision = "retire-format";
      reason = "After more than one round, the format remained below the campaign median with comparable reach.";
    }
    return { id: result.id, series: campaignPost.series, decision, reason, metrics };
  });

  return {
    checkpoint: checkpointKey,
    complete: collected.length === results.posts.length,
    collectedPosts: collected.length,
    totalPosts: results.posts.length,
    campaignMedianUsefulActionsPer100Visits: rateMedian,
    campaignMedianAttributedVisits: visitMedian,
    returnPromptVariants: promptVariants,
    posts,
  };
}

module.exports = { evaluateResults, metricKeys, returnPromptVariantKeys, summarizeCheckpoint, validateResults };
