const { databaseConfig, supabaseRequest } = require("./_lib/supabase");
const { accessToken, authenticatedUser } = require("./_lib/account-auth");
const { assertSameOrigin, enforceRateLimit } = require("./_lib/abuse-controls");

const MAX_SAVED_PLACES = 1000;
const PLACE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9:_./-]{0,159}$/;

function normalizePlaceIds(value) {
  if (!Array.isArray(value)) return null;
  return [...new Set(value.map((id) => String(id).trim()).filter((id) => PLACE_ID_PATTERN.test(id)))]
    .slice(0, MAX_SAVED_PLACES);
}

function demoSavedPlaces(user) {
  return normalizePlaceIds(user.app_metadata?.auditmap_demo_profile?.savedPlaceIds || []) || [];
}

async function replaceDemoFavorites(user, placeIds) {
  const config = databaseConfig();
  const profile = user.app_metadata?.auditmap_demo_profile || {};
  const authResponse = await fetch(`${config.url}/auth/v1/admin/users/${user.id}`, {
    method: "PUT",
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_metadata: {
        ...(user.app_metadata || {}),
        auditmap_demo_profile: { ...profile, savedPlaceIds: placeIds },
      },
    }),
  });
  if (!authResponse.ok) throw new Error("Demo saved places could not be updated.");
  return placeIds;
}

async function readFavorites(userId, token) {
  const rows = await supabaseRequest(
    `user_saved_places?select=place_id&user_id=eq.${encodeURIComponent(userId)}&order=created_at.asc`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return (rows || []).map((row) => row.place_id);
}

async function replaceFavorites(token, placeIds) {
  const rows = await supabaseRequest("rpc/replace_user_saved_places", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ saved_place_ids: placeIds }),
  });
  return (rows || []).map((row) => row.place_id);
}

module.exports = async function handler(request, response) {
  if (!databaseConfig()) {
    response.status(503).json({ configured: false, error: "Account sync is not configured." });
    return;
  }

  if (!["GET", "PUT"].includes(request.method)) {
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  const token = accessToken(request);
  if (!token) {
    response.status(401).json({ error: "A valid account session is required." });
    return;
  }

  try {
    if (request.method === "PUT") assertSameOrigin(request);
    const { user } = await authenticatedUser(request, {
      requireActive: request.method === "PUT",
    });
    const isDemo = user.app_metadata?.auditmap_demo === true;
    if (request.method === "GET") {
      if (isDemo) {
        response.status(200).json({ placeIds: demoSavedPlaces(user) });
        return;
      }
      response.status(200).json({ placeIds: await readFavorites(user.id, token) });
      return;
    }

    const placeIds = normalizePlaceIds(request.body?.placeIds);
    if (!placeIds) {
      response.status(400).json({ error: "placeIds must be a list." });
      return;
    }
    enforceRateLimit(request, response, {
      name: "saved-places",
      subject: user.id,
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
    if (isDemo) {
      response.status(200).json({ placeIds: await replaceDemoFavorites(user, placeIds) });
      return;
    }
    response.status(200).json({ placeIds: await replaceFavorites(token, placeIds) });
  } catch (error) {
    response.status(error.status || 500).json({ error: error.message });
  }
};

module.exports._private = {
  demoSavedPlaces,
  normalizePlaceIds,
};
