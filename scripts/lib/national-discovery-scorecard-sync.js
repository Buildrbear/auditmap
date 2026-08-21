function aggregateNationalDiscovery(campaignResults, checkpointKey) {
  const collected = campaignResults.posts
    .map((post) => post.checkpoints?.[checkpointKey])
    .filter(Boolean);
  if (!collected.length) return null;
  const sum = (key) => collected.reduce((total, metrics) => total + metrics[key], 0);
  return {
    exposures: sum("socialImpressions"),
    landings: sum("attributedVisits"),
    usefulActions: sum("saves") + sum("directions") + sum("shares") + sum("crumbSubmissions"),
    contributions: sum("crumbSubmissions"),
    collectedPosts: collected.length,
    totalPosts: campaignResults.posts.length,
  };
}

module.exports = { aggregateNationalDiscovery };
