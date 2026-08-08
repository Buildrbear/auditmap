const metricKeys = [
  "socialImpressions",
  "socialEngagements",
  "listOpens",
  "guideOpens",
  "listSaves",
  "directions",
  "reshares",
  "crumbSubmissions",
  "nonTeamResponses",
];

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function validatePlanningResults(campaign, results) {
  if (results.campaignId !== campaign.id) throw new Error("Results campaignId does not match the planning campaign");
  if (!Number.isInteger(results.round) || results.round < 1) throw new Error("Results round must be a positive integer");
  const expected = campaign.lists.map((item) => item.id);
  const actual = results.lists.map((item) => item.id);
  if (new Set(actual).size !== actual.length || expected.length !== actual.length || expected.some((id) => !actual.includes(id))) {
    throw new Error("Results must contain every planning list exactly once");
  }
  for (const item of results.lists) {
    for (const checkpointKey of ["24h", "7d"]) {
      const checkpoint = item.checkpoints?.[checkpointKey];
      if (checkpoint === null) continue;
      if (!checkpoint || typeof checkpoint !== "object") throw new Error(`${item.id}.${checkpointKey} must be an object or null`);
      for (const key of metricKeys) {
        if (!Number.isInteger(checkpoint[key]) || checkpoint[key] < 0) throw new Error(`${item.id}.${checkpointKey}.${key} must be a non-negative integer`);
      }
      if (checkpoint.guideOpens > checkpoint.listOpens) throw new Error(`${item.id}.${checkpointKey}.guideOpens cannot exceed listOpens`);
      if (checkpoint.listSaves > checkpoint.listOpens) throw new Error(`${item.id}.${checkpointKey}.listSaves cannot exceed listOpens`);
    }
  }
}

function summarize(checkpoint) {
  const usefulActions = checkpoint.guideOpens + checkpoint.listSaves + checkpoint.directions + checkpoint.reshares + checkpoint.crumbSubmissions;
  return {
    ...checkpoint,
    usefulActions,
    socialClickRate: checkpoint.socialImpressions ? checkpoint.listOpens / checkpoint.socialImpressions : null,
    usefulActionsPer100Opens: checkpoint.listOpens ? usefulActions / checkpoint.listOpens * 100 : null,
  };
}

function evaluatePlanningResults(campaign, results, checkpointKey = "7d") {
  validatePlanningResults(campaign, results);
  const collected = results.lists.filter((item) => item.checkpoints[checkpointKey]);
  const openMedian = median(collected.map((item) => item.checkpoints[checkpointKey].listOpens).filter((value) => value > 0));
  const items = results.lists.map((result) => {
    const checkpoint = result.checkpoints[checkpointKey];
    if (!checkpoint) return { id: result.id, decision: "awaiting-results", reason: `No ${checkpointKey} data yet.` };
    const metrics = summarize(checkpoint);
    if (metrics.socialImpressions > 0 && metrics.listOpens === 0) return { id: result.id, decision: "rewrite-hook", reason: "The post received distribution but produced no list opens.", metrics };
    if (openMedian !== null && metrics.listOpens < openMedian * 0.5) return { id: result.id, decision: "insufficient-reach", reason: "List opens were below half the campaign median.", metrics };
    if (metrics.listOpens > 0 && metrics.usefulActions === 0) return { id: result.id, decision: "rewrite-list", reason: "Recipients opened the list but took no useful planning action.", metrics };
    if (metrics.nonTeamResponses > 0 || metrics.crumbSubmissions > 0 || metrics.reshares > 0) return { id: result.id, decision: "repeat", reason: "The list produced a human response, contribution, or second-generation share.", metrics };
    return { id: result.id, decision: "test-again", reason: "The list produced planning activity but needs more evidence before scaling.", metrics };
  });
  return { checkpoint: checkpointKey, complete: collected.length === results.lists.length, collected: collected.length, total: results.lists.length, items };
}

module.exports = { evaluatePlanningResults, metricKeys, validatePlanningResults };
