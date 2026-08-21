const { supabaseRequest } = require("./supabase");

const IMPACT_POINTS = Object.freeze({
  approvedText: 1,
  usefulLocation: 1,
  approvedPhoto: 3,
  approvedPanorama: 5,
  approved360: 10,
  acceptedVerification: 4,
  acceptedCorrection: 8,
  uniqueThank: 1,
});

const LEVELS = [
  { key: "neighborhood_guide", label: "Neighborhood Guide", points: 150, crumbs: 20, verified: 20, places: 5 },
  { key: "path_finder", label: "Path Finder", points: 50, crumbs: 1, places: 3 },
  { key: "trail_helper", label: "Trail Helper", points: 15, crumbs: 3, places: 1 },
  { key: "first_crumb", label: "First Crumb", points: 1, crumbs: 1, places: 1 },
  { key: "new_explorer", label: "New Explorer", points: 0, crumbs: 0, places: 0 },
];

function levelForSummary({ points, approvedCrumbs, verifiedCrumbs, placesHelped }) {
  return LEVELS.find(
    (candidate) => points >= candidate.points && approvedCrumbs >= candidate.crumbs &&
      verifiedCrumbs >= (candidate.verified || 0) && placesHelped >= candidate.places,
  ) || LEVELS.at(-1);
}

async function addImpactEvent({ userId, contributionId = null, eventType, points, sourceKey, metadata = {} }) {
  if (!userId || !sourceKey) return null;
  const rows = await supabaseRequest("contribution_impact_events", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=representation",
    body: JSON.stringify({
      user_id: userId,
      contribution_id: contributionId,
      event_type: eventType,
      points,
      source_key: sourceKey,
      metadata,
    }),
  });
  return rows?.[0] || null;
}

async function impactSummary(userId) {
  if (!userId) return {
    points: 0, approvedCrumbs: 0, verifiedCrumbs: 0, placesHelped: 0, thanks: 0, level: LEVELS.at(-1), nextLevel: LEVELS.at(-2), badges: [],
  };
  const [events, contributions, badges] = await Promise.all([
    supabaseRequest(
      `contribution_impact_events?user_id=eq.${userId}&select=points,event_type,contribution_id,metadata`,
      { method: "GET" },
    ),
    supabaseRequest(
      `contributions?user_id=eq.${userId}&moderation_status=eq.published&select=id,institution_id,verification_status,metadata`,
      { method: "GET" },
    ),
    supabaseRequest(
      `contributor_badges?user_id=eq.${userId}&select=badge_key,awarded_at&order=awarded_at.asc`,
      { method: "GET" },
    ),
  ]);
  const points = (events || []).reduce((sum, event) => sum + Number(event.points || 0), 0);
  const approvedCrumbs = new Set((contributions || []).map((item) => item.id)).size;
  const verifiedCrumbs = (contributions || []).filter((item) => item.verification_status === "verified").length;
  const placesHelped = new Set((contributions || []).map((item) =>
    item.metadata?.demoSeed === true && item.metadata?.demoPlaceId
      ? item.metadata.demoPlaceId
      : item.institution_id,
  )).size;
  const thanks = (events || []).filter((event) => event.event_type === "unique_thank").length;
  const level = levelForSummary({ points, approvedCrumbs, verifiedCrumbs, placesHelped });
  const levelIndex = LEVELS.findIndex((candidate) => candidate.key === level.key);
  const nextLevel = levelIndex > 0 ? LEVELS[levelIndex - 1] : null;
  return {
    points,
    approvedCrumbs,
    verifiedCrumbs,
    placesHelped,
    thanks,
    level,
    nextLevel,
    badges: badges || [],
  };
}

async function syncBadges(userId) {
  const summary = await impactSummary(userId);
  const events = await supabaseRequest(
    `contribution_impact_events?user_id=eq.${userId}&select=event_type`,
    { method: "GET" },
  );
  const count = (type) => (events || []).filter((event) => event.event_type === type).length;
  const earned = [
    summary.approvedCrumbs >= 1 && "first_crumb",
    count("approved_photo") >= 5 && "eyes_on_the_trail",
    count("approved_360") >= 1 && "full_circle",
    count("accepted_verification") + count("accepted_correction") >= 5 && "detail_detective",
    summary.placesHelped >= 5 && "park_friend",
    summary.thanks >= 25 && "neighborly",
    count("approved_text") >= 5 && "fresh_tracks",
  ].filter(Boolean);
  if (earned.length) {
    await supabaseRequest("contributor_badges", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: JSON.stringify(earned.map((badgeKey) => ({ user_id: userId, badge_key: badgeKey }))),
    });
  }
  return impactSummary(userId);
}

async function awardPublishedContribution(contribution) {
  if (!contribution?.user_id || contribution.moderation_status !== "published") return null;
  const metadata = { institutionId: contribution.institution_id };
  if (contribution.metadata?.hasText !== false) {
    await addImpactEvent({
      userId: contribution.user_id,
      contributionId: contribution.id,
      eventType: "approved_text",
      points: IMPACT_POINTS.approvedText,
      sourceKey: `contribution:${contribution.id}:text`,
      metadata,
    });
  }
  if (contribution.location_scope === "pin" && contribution.latitude != null) {
    await addImpactEvent({
      userId: contribution.user_id,
      contributionId: contribution.id,
      eventType: "useful_location",
      points: IMPACT_POINTS.usefulLocation,
      sourceKey: `contribution:${contribution.id}:location`,
      metadata,
    });
  }
  const media = await supabaseRequest(
    `media?contribution_id=eq.${contribution.id}&status=eq.published&select=id,media_kind`,
    { method: "GET" },
  );
  for (const item of (media || []).slice(0, 3)) {
    const event = item.media_kind === "photo_360"
      ? { type: "approved_360", points: IMPACT_POINTS.approved360 }
      : item.media_kind === "panorama"
        ? { type: "approved_panorama", points: IMPACT_POINTS.approvedPanorama }
        : { type: "approved_photo", points: IMPACT_POINTS.approvedPhoto };
    await addImpactEvent({
      userId: contribution.user_id,
      contributionId: contribution.id,
      eventType: event.type,
      points: event.points,
      sourceKey: `media:${item.id}:approved`,
      metadata,
    });
  }
  if (contribution.contribution_type === "correction") {
    await addImpactEvent({
      userId: contribution.user_id,
      contributionId: contribution.id,
      eventType: "accepted_correction",
      points: IMPACT_POINTS.acceptedCorrection,
      sourceKey: `contribution:${contribution.id}:correction`,
      metadata,
    });
  }
  return syncBadges(contribution.user_id);
}

module.exports = {
  LEVELS,
  IMPACT_POINTS,
  addImpactEvent,
  awardPublishedContribution,
  impactSummary,
  levelForSummary,
  syncBadges,
};
