const { databaseConfig, supabaseRequest } = require("./supabase");

function accessToken(request) {
  return String(request.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
}

async function accountStatus(user) {
  if (user?.app_metadata?.auditmap_suspended === true) return "suspended";
  try {
    const rows = await supabaseRequest(
      `community_profiles?user_id=eq.${user.id}&select=profile_status&limit=1`,
      { method: "GET" },
    );
    return rows?.[0]?.profile_status || "active";
  } catch (error) {
    if (/community_profiles|schema cache|column/i.test(`${error.detail || ""} ${error.message || ""}`)) {
      return "active";
    }
    throw error;
  }
}

async function authenticatedUser(request, { required = true, requireActive = false } = {}) {
  const token = accessToken(request);
  if (!token) {
    if (!required) return { token: null, user: null };
    const error = new Error("A valid account session is required.");
    error.status = 401;
    throw error;
  }
  const config = databaseConfig();
  if (!config) {
    const error = new Error("Account sync is not configured.");
    error.status = 503;
    throw error;
  }
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${token}`,
    },
  });
  const user = await response.json().catch(() => ({}));
  if (!response.ok || !user.id) {
    const error = new Error("Your session has expired. Please sign in again.");
    error.status = 401;
    throw error;
  }
  if (requireActive && (await accountStatus(user)) === "suspended") {
    const error = new Error("This account cannot contribute while it is under review.");
    error.status = 403;
    error.code = "ACCOUNT_SUSPENDED";
    throw error;
  }
  return { token, user };
}

function trustedRole(user) {
  if (user?.app_metadata?.auditmap_demo === true) return "member";
  return String(user?.app_metadata?.auditmap_role || "member");
}

module.exports = { accessToken, accountStatus, authenticatedUser, trustedRole };
