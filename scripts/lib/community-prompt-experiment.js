const metricKeys = [
  "impressions",
  "engagements",
  "replies",
  "nonTeamReplies",
  "qualifiedNeeds",
  "resolvedNeeds",
  "recordImprovements",
  "publicReplyBacks",
  "respondentShares",
];

function rate(numerator, denominator) {
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0 ? numerator / denominator : null;
}

function validateResults(campaign, results) {
  if (campaign.id !== results.campaignId) throw new Error("Campaign and results IDs do not match");
  const campaignIds = campaign.prompts.map(({ id }) => id);
  const resultIds = results.prompts.map(({ id }) => id);
  if (new Set(campaignIds).size !== campaignIds.length || new Set(resultIds).size !== resultIds.length) throw new Error("Prompt IDs must be unique");
  if (campaignIds.length !== resultIds.length || campaignIds.some((id) => !resultIds.includes(id))) throw new Error("Campaign and result prompts do not match");
  for (const result of results.prompts) {
    for (const checkpointName of ["24h", "7d"]) {
      const checkpoint = result.checkpoints?.[checkpointName];
      if (checkpoint === null) continue;
      const invalid = metricKeys.filter((key) => checkpoint[key] !== null && (!Number.isInteger(checkpoint[key]) || checkpoint[key] < 0));
      if (invalid.length) throw new Error(`${result.id} ${checkpointName} has missing or invalid fields: ${invalid.join(", ")}`);
      const constraints = [
        ["engagements", "impressions"],
        ["replies", "engagements"],
        ["nonTeamReplies", "replies"],
        ["qualifiedNeeds", "nonTeamReplies"],
        ["resolvedNeeds", "qualifiedNeeds"],
        ["recordImprovements", "resolvedNeeds"],
        ["publicReplyBacks", "resolvedNeeds"],
        ["respondentShares", "publicReplyBacks"],
      ];
      for (const [numerator, denominator] of constraints) {
        if (Number.isInteger(checkpoint[numerator]) && Number.isInteger(checkpoint[denominator]) && checkpoint[numerator] > checkpoint[denominator]) throw new Error(`${result.id} ${checkpointName} ${numerator} cannot exceed ${denominator}`);
      }
    }
  }
}

function evaluateResults(campaign, results, checkpointName = "7d") {
  validateResults(campaign, results);
  const prompts = campaign.prompts.map((prompt) => {
    const checkpoint = results.prompts.find(({ id }) => id === prompt.id).checkpoints[checkpointName];
    if (!checkpoint) return { ...prompt, collected: false, metrics: null, decision: "collect", reason: "No checkpoint data has been entered." };
    const missing = metricKeys.filter((key) => !Number.isInteger(checkpoint[key]));
    if (missing.length) return { ...prompt, collected: false, metrics: checkpoint, decision: "collect", reason: `Awaiting: ${missing.join(", ")}.` };
    const metrics = {
      ...checkpoint,
      engagementRate: rate(checkpoint.engagements, checkpoint.impressions),
      replyRate: rate(checkpoint.nonTeamReplies, checkpoint.impressions),
      qualificationRate: rate(checkpoint.qualifiedNeeds, checkpoint.nonTeamReplies),
      resolutionRate: rate(checkpoint.resolvedNeeds, checkpoint.qualifiedNeeds),
      improvementRate: rate(checkpoint.recordImprovements, checkpoint.resolvedNeeds),
      closureRate: rate(checkpoint.publicReplyBacks, checkpoint.resolvedNeeds),
    };
    let decision = "keep-testing";
    let reason = "The prompt produced a useful signal but needs another comparable window.";
    if (checkpoint.impressions === 0) {
      decision = "fix-distribution";
      reason = "The prompt was measured but did not reach anyone.";
    } else if (checkpoint.nonTeamReplies === 0) {
      decision = "rewrite-prompt";
      reason = "People saw the prompt but no community member replied.";
    } else if (checkpoint.qualifiedNeeds === 0) {
      decision = "narrow-question";
      reason = "Replies did not identify a real place plus an answerable visitor need.";
    } else if (checkpoint.resolvedNeeds === 0) {
      decision = "finish-enrichment";
      reason = "The prompt found useful demand, but AuditMap does not yet have a current sourced answer.";
    } else if (checkpoint.publicReplyBacks === 0) {
      decision = "close-loop";
      reason = "A sourced answer exists, but it has not been returned to the community publicly.";
    } else if (checkpoint.recordImprovements > 0 && checkpoint.respondentShares > 0) {
      decision = "repeat-and-expand";
      reason = "AuditMap improved the public record, returned the answer, and a respondent shared it.";
    } else if (checkpoint.respondentShares > 0) {
      decision = "repeat";
      reason = "A respondent shared an existing sourced answer; the loop proved utility without creating new knowledge.";
    } else {
      decision = "repeat";
      reason = "The prompt produced a qualified need, a sourced answer, and a public reply-back.";
    }
    return { ...prompt, collected: true, metrics, decision, reason };
  });
  return {
    checkpoint: checkpointName,
    complete: prompts.every(({ collected }) => collected),
    collectedPrompts: prompts.filter(({ collected }) => collected).length,
    totalPrompts: prompts.length,
    prompts,
  };
}

module.exports = { evaluateResults, metricKeys, rate, validateResults };
