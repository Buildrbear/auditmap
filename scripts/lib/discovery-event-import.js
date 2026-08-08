const siteMetricEvents = {
  "Campaign landing": "attributedVisits",
  "Place saved": "saves",
  "Directions opened": "directions",
  "Place shared": "shares",
  "Crumb started": "crumbStarts",
  "Crumb submitted": "crumbSubmissions",
  "Return contribution prompt shown": "returnPromptShown",
  "Return contribution prompt accepted": "returnPromptAccepted",
  "Return contribution prompt dismissed": "returnPromptDismissed",
};

const manualMetricKeys = ["socialImpressions", "socialEngagements", "nonTeamResponses"];
const promptVariants = ["help-next-person", "leave-breadcrumb"];

function eventName(event) {
  return event.name || event.event || event.eventName;
}

function properties(event) {
  return event.properties || event.props || {};
}

function emptySiteMetrics() {
  return {
    attributedVisits: 0,
    saves: 0,
    directions: 0,
    shares: 0,
    crumbStarts: 0,
    crumbSubmissions: 0,
    returnPromptShown: 0,
    returnPromptAccepted: 0,
    returnPromptDismissed: 0,
    returnPromptVariants: Object.fromEntries(promptVariants.map((variant) => [variant, {
      shown: 0,
      accepted: 0,
      dismissed: 0,
    }])),
  };
}

function importDiscoveryEvents(campaign, results, events, checkpointKey, social = []) {
  const campaignPosts = new Set(campaign.posts.map((post) => post.id));
  const totals = Object.fromEntries(campaign.posts.map((post) => [post.id, emptySiteMetrics()]));
  const socialById = new Map(social.map((entry) => [entry.id, entry]));

  for (const event of events) {
    const props = properties(event);
    if (props.campaign !== campaign.campaign || !campaignPosts.has(props.content)) continue;
    const name = eventName(event);
    const metric = siteMetricEvents[name];
    if (!metric || (name === "Place saved" && props.saved === false)) continue;
    totals[props.content][metric] += 1;
    if (name.startsWith("Return contribution prompt") && promptVariants.includes(props.variant)) {
      const outcome = name.slice("Return contribution prompt ".length);
      totals[props.content].returnPromptVariants[props.variant][outcome] += 1;
    }
  }

  const posts = results.posts.map((post) => {
    const current = post.checkpoints[checkpointKey];
    const manual = current || socialById.get(post.id);
    if (!manual || manualMetricKeys.some((key) => !Number.isInteger(manual[key]) || manual[key] < 0)) {
      throw new Error(`${post.id}.${checkpointKey} needs non-negative ${manualMetricKeys.join(", ")} before importing site events`);
    }
    return {
      ...post,
      checkpoints: {
        ...post.checkpoints,
        [checkpointKey]: {
          ...(current || {}),
          ...totals[post.id],
          ...Object.fromEntries(manualMetricKeys.map((key) => [key, manual[key]])),
        },
      },
    };
  });

  return { ...results, updatedAt: new Date().toISOString(), posts };
}

module.exports = { importDiscoveryEvents, manualMetricKeys };
