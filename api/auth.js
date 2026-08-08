const { databaseConfig } = require("./_lib/supabase");
const {
  assertSameOrigin,
  enforceRateLimit,
  requestFingerprint,
  stableHash,
} = require("./_lib/abuse-controls");

function configuredProviders() {
  const configured = Object.hasOwn(process.env, "SUPABASE_AUTH_PROVIDERS")
    ? process.env.SUPABASE_AUTH_PROVIDERS
    : process.env.SUPABASE_AUTH_PROVIDER || "none";
  if (["", "none", "off", "disabled"].includes(String(configured).trim().toLowerCase())) return [];
  const providers = String(configured)
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter((provider) => /^[a-z0-9][a-z0-9_-]{0,48}$/.test(provider));
  const uniqueProviders = [...new Set(providers)].slice(0, 8);
  return uniqueProviders;
}

function publicOrigin(request) {
  const protocol = String(request.headers["x-forwarded-proto"] || "https").split(",")[0];
  const host = String(request.headers["x-forwarded-host"] || request.headers.host || "").split(",")[0];
  return host ? `${protocol}://${host}` : null;
}

function safeRedirect(request, value) {
  const origin = publicOrigin(request);
  if (!origin) return null;
  try {
    const target = new URL(value || origin, origin);
    return target.origin === origin ? target.toString() : origin;
  } catch {
    return origin;
  }
}

async function authRequest(path, requestOptions = {}) {
  const config = databaseConfig();
  if (!config) throw new Error("Authentication is not configured.");
  const response = await fetch(`${config.url}/auth/v1/${path}`, {
    ...requestOptions,
    headers: {
      apikey: config.serviceKey,
      "Content-Type": "application/json",
      ...(requestOptions.headers || {}),
    },
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }
  if (!response.ok) {
    const error = new Error(payload.msg || payload.error_description || payload.message || "Authentication failed.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

module.exports = async function handler(request, response) {
  const config = databaseConfig();
  if (!config) {
    response.status(503).json({ configured: false, error: "Authentication is not configured." });
    return;
  }

  const action = String(request.query?.action || request.body?.action || "config");
  try {
    if (request.method === "GET" && action === "config") {
      const providers = configuredProviders();
      response.status(200).json({
        configured: true,
        provider: providers[0] || null,
        providers,
        mode: "server",
      });
      return;
    }

    if (request.method === "GET" && action === "oauth") {
      const redirectTo = safeRedirect(request, request.query?.redirectTo);
      const providers = configuredProviders();
      const provider = String(request.query?.provider || providers[0] || "").trim().toLowerCase();
      if (!providers.includes(provider)) {
        response.status(400).json({ error: "That sign-in provider is not enabled." });
        return;
      }
      const authorizeUrl = new URL(`${config.url}/auth/v1/authorize`);
      authorizeUrl.searchParams.set("provider", provider);
      authorizeUrl.searchParams.set("redirect_to", redirectTo);
      response.redirect(302, authorizeUrl.toString());
      return;
    }

    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed." });
      return;
    }

    assertSameOrigin(request);

    if (action === "otp") {
      const email = String(request.body?.email || "").trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        response.status(400).json({ error: "Enter a valid email address." });
        return;
      }
      enforceRateLimit(request, response, {
        name: "auth-otp-email",
        subject: stableHash(email, "auth-email"),
        limit: 5,
        windowMs: 60 * 60 * 1000,
      });
      enforceRateLimit(request, response, {
        name: "auth-otp-source",
        subject: requestFingerprint(request, "auth-otp"),
        limit: 10,
        windowMs: 60 * 60 * 1000,
      });
      await authRequest("otp", {
        method: "POST",
        body: JSON.stringify({
          email,
          create_user: true,
          options: { email_redirect_to: safeRedirect(request, request.body?.redirectTo) },
        }),
      });
      response.status(200).json({ sent: true });
      return;
    }

    if (action === "password") {
      const email = String(request.body?.email || "").trim().toLowerCase();
      const password = String(request.body?.password || "");
      if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
        response.status(400).json({ error: "Enter a valid email address and password." });
        return;
      }
      enforceRateLimit(request, response, {
        name: "auth-password",
        subject: `${stableHash(email, "auth-email")}:${requestFingerprint(request, "auth-password")}`,
        limit: 10,
        windowMs: 10 * 60 * 1000,
        message: "Too many sign-in attempts. Please wait a few minutes and try again.",
      });
      const session = await authRequest("token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      response.status(200).json(session);
      return;
    }

    if (action === "refresh") {
      const refreshToken = String(request.body?.refreshToken || "").trim();
      if (!refreshToken) {
        response.status(400).json({ error: "A refresh token is required." });
        return;
      }
      enforceRateLimit(request, response, {
        name: "auth-refresh",
        subject: stableHash(refreshToken, "refresh-token"),
        limit: 60,
        windowMs: 60 * 60 * 1000,
      });
      const session = await authRequest("token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      response.status(200).json(session);
      return;
    }

    const accessToken = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      response.status(401).json({ error: "A valid account session is required." });
      return;
    }

    if (action === "user") {
      const user = await authRequest("user", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      response.status(200).json(user);
      return;
    }

    if (action === "password-update") {
      const password = String(request.body?.password || "");
      if (password.length < 12) {
        response.status(400).json({ error: "Choose a password with at least 12 characters." });
        return;
      }
      await authRequest("user", {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ password }),
      });
      response.status(200).json({ updated: true });
      return;
    }

    if (action === "logout") {
      await authRequest("logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      response.status(200).json({ signedOut: true });
      return;
    }

    response.status(400).json({ error: "Unknown authentication action." });
  } catch (error) {
    response.status(error.status || 500).json({ error: error.message });
  }
};

module.exports._private = {
  configuredProviders,
  safeRedirect,
};
