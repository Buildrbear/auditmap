const { authenticatedUser, trustedRole } = require("./_lib/account-auth");
const { assertSameOrigin, enforceRateLimit } = require("./_lib/abuse-controls");
const { impactSummary } = require("./_lib/crumb-impact");
const { databaseReady, supabaseRequest } = require("./_lib/supabase");

function cleanText(value, limit = 80) {
  return String(value || "").trim().slice(0, limit);
}

function profileSlug(displayName, userId) {
  const base = cleanText(displayName, 40).toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "explorer";
  return `${base.slice(0, 32)}-${String(userId).replace(/-/g, "").slice(0, 6)}`;
}

function publicSummary(profile, impact, owner = false) {
  return {
    slug: profile.public_slug,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url || null,
    level: impact.level,
    nextLevel: owner ? impact.nextLevel : undefined,
    progressPoints: owner ? impact.points : undefined,
    approvedCrumbs: impact.approvedCrumbs,
    verifiedCrumbs: impact.verifiedCrumbs,
    placesHelped: impact.placesHelped,
    thanks: impact.thanks,
    badges: impact.badges,
  };
}

function accountRole(user) {
  const role = trustedRole(user);
  return ["member", "moderator", "super_admin"].includes(role) ? role : "member";
}

function demoOwnerSummary(user) {
  const demo = user.app_metadata?.auditmap_demo_profile || {};
  const level = demo.level || { key: "new_explorer", label: "New Explorer", points: 0 };
  const nextPoints = {
    "First Crumb": 1,
    "Trail Helper": 15,
    "Path Finder": 50,
    "Neighborhood Guide": 150,
  };
  const nextLevel = level.next ? {
    key: String(level.next).toLowerCase().replaceAll(" ", "_"),
    label: level.next,
    points: nextPoints[level.next] || 0,
  } : null;
  return {
    slug: null,
    displayName: demo.displayName || user.user_metadata?.full_name || "Demo Explorer",
    avatarUrl: user.app_metadata?.auditmap_avatar_url || demo.avatarUrl || null,
    level: { key: level.key, label: level.label },
    nextLevel,
    progressPoints: Number(level.points || 0),
    approvedCrumbs: Number(demo.approvedCrumbs || 0),
    verifiedCrumbs: Number(demo.verifiedCrumbs || 0),
    placesHelped: Number(demo.placesHelped || 0),
    thanks: Number(demo.thanks || 0),
    badges: Array.isArray(demo.badges) ? demo.badges : [],
    recentCrumbs: Array.isArray(demo.recentCrumbs) ? demo.recentCrumbs : [],
    role: accountRole(user),
    isDemo: true,
  };
}

async function recentCrumbs(userId) {
  const rows = await supabaseRequest(
    `contributions?user_id=eq.${userId}&select=id,institution_id,body,contribution_type,moderation_status,verification_status,metadata,observed_at,created_at&order=created_at.desc&limit=6`,
    { method: "GET" },
  );
  const institutionIds = [...new Set((rows || []).map((item) => item.institution_id).filter(Boolean))];
  const institutions = institutionIds.length
    ? await supabaseRequest(
        `institutions?id=in.(${institutionIds.join(",")})&select=id,public_id,name`,
        { method: "GET" },
      )
    : [];
  const placeById = new Map((institutions || []).map((item) => [item.id, item]));
  return (rows || []).map((item) => ({
    id: item.id,
    placeId: item.metadata?.demoPlaceId || placeById.get(item.institution_id)?.public_id || null,
    placeName: item.metadata?.demoPlaceName || placeById.get(item.institution_id)?.name || "Public place",
    body: cleanText(item.body, 180),
    type: item.contribution_type,
    status: item.verification_status === "verified" ? "Verified" :
      item.moderation_status === "published" ? "Published" : "Waiting for review",
    observedAt: item.observed_at || item.created_at,
    media: Array.isArray(item.metadata?.demoMedia) ? item.metadata.demoMedia.slice(0, 3) : [],
  }));
}

async function ownerSummary(profile, user) {
  return {
    ...publicSummary(profile, await impactSummary(user.id), true),
    avatarUrl: user.app_metadata?.auditmap_avatar_url || profile.avatar_url || null,
    role: accountRole(user),
    isDemo: user.app_metadata?.auditmap_demo === true,
    recentCrumbs: await recentCrumbs(user.id),
  };
}

async function currentProfile(request, knownUser = null) {
  const user = knownUser || (await authenticatedUser(request)).user;
  let rows = await supabaseRequest(
    `community_profiles?user_id=eq.${user.id}&select=user_id,public_slug,display_name,profile_status&limit=1`,
    { method: "GET" },
  );
  if (!rows?.[0]) {
    const displayName = cleanText(
      user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Explorer",
      40,
    );
    rows = await supabaseRequest("community_profiles", {
      method: "POST",
      body: JSON.stringify({
        user_id: user.id,
        display_name: displayName,
        public_slug: profileSlug(displayName, user.id),
      }),
    });
  }
  return { user, profile: rows[0] };
}

module.exports = async function handler(request, response) {
  if (!databaseReady()) {
    response.status(503).json({ error: "Community profiles are not configured." });
    return;
  }
  try {
    if (request.method === "GET" && request.query?.slug) {
      const slug = cleanText(request.query.slug, 80).toLowerCase();
      let rows;
      try {
        rows = await supabaseRequest(
          `community_profiles?public_slug=eq.${encodeURIComponent(slug)}&profile_status=eq.public&select=user_id,public_slug,display_name,avatar_url,profile_status&limit=1`,
          { method: "GET" },
        );
      } catch {
        rows = await supabaseRequest(
          `community_profiles?public_slug=eq.${encodeURIComponent(slug)}&profile_status=eq.public&select=user_id,public_slug,display_name,profile_status&limit=1`,
          { method: "GET" },
        );
      }
      const profile = rows?.[0];
      if (!profile) {
        response.status(404).json({ error: "Contributor profile not found." });
        return;
      }
      response.status(200).json({ profile: publicSummary(profile, await impactSummary(profile.user_id)) });
      return;
    }
    if (request.method === "PATCH") assertSameOrigin(request);
    const { user } = await authenticatedUser(request, {
      requireActive: request.method === "PATCH",
    });
    if (user.app_metadata?.auditmap_demo_profile) {
      if (request.method === "GET") {
        response.status(200).json({ profile: demoOwnerSummary(user) });
        return;
      }
      if (request.method === "PATCH") {
        response.status(409).json({ error: "Demo member names are fixed so screenshots stay consistent." });
        return;
      }
    }
    const { profile } = await currentProfile(request, user);
    if (request.method === "GET") {
      response.status(200).json({ profile: await ownerSummary(profile, user) });
      return;
    }
    if (request.method === "PATCH") {
      enforceRateLimit(request, response, {
        name: "profile-update",
        subject: user.id,
        limit: 10,
        windowMs: 24 * 60 * 60 * 1000,
      });
      const displayName = cleanText(request.body?.displayName, 40);
      if (displayName.length < 2) {
        response.status(400).json({ error: "Choose a nickname with at least two characters." });
        return;
      }
      const updated = await supabaseRequest(`community_profiles?user_id=eq.${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ display_name: displayName }),
      });
      response.status(200).json({ profile: await ownerSummary(updated[0], user) });
      return;
    }
    response.setHeader("Allow", "GET, PATCH");
    response.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    const status = error.status || (error.code === "23505" ? 409 : 502);
    response.status(status).json({ error: error.message || "Profile request failed." });
  }
};

module.exports._private = { accountRole, demoOwnerSummary, profileSlug, publicSummary };
