const assert = require("node:assert/strict");

process.env.SUPABASE_URL = "https://auditmap-test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
process.env.SUPABASE_AUTH_PROVIDERS = "google, github";

const handler = require("../api/auth");

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    redirectLocation: null,
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    redirect(status, location) {
      this.statusCode = status;
      this.redirectLocation = location;
      return this;
    },
  };
}

async function invoke({ method = "GET", action = "config", body = {}, headers = {}, query = {} } = {}) {
  const response = responseRecorder();
  await handler({
    method,
    body: { action, ...body },
    query: { action, ...query },
    headers: {
      host: "www.auditmap.org",
      "x-forwarded-proto": "https",
      ...headers,
    },
  }, response);
  return response;
}

async function run() {
  const originalFetch = global.fetch;
  try {
    const config = await invoke();
    assert.equal(config.statusCode, 200);
    assert.deepEqual(config.body, {
      configured: true,
      provider: "google",
      providers: ["google", "github"],
      mode: "server",
    });

    const oauth = await invoke({
      action: "oauth",
      query: {
        provider: "google",
        redirectTo: "https://malicious.example/steal",
      },
    });
    assert.equal(oauth.statusCode, 302);
    const oauthUrl = new URL(oauth.redirectLocation);
    assert.equal(oauthUrl.origin, "https://auditmap-test.supabase.co");
    assert.equal(oauthUrl.searchParams.get("provider"), "google");
    assert.equal(oauthUrl.searchParams.get("redirect_to"), "https://www.auditmap.org");

    const disabledProvider = await invoke({
      action: "oauth",
      query: { provider: "apple", redirectTo: "https://www.auditmap.org" },
    });
    assert.equal(disabledProvider.statusCode, 400);
    assert.equal(disabledProvider.body.error, "That sign-in provider is not enabled.");

    process.env.SUPABASE_AUTH_PROVIDERS = "none";
    const emailOnlyConfig = await invoke();
    assert.deepEqual(emailOnlyConfig.body, {
      configured: true,
      provider: null,
      providers: [],
      mode: "server",
    });
    const emailOnlyOauth = await invoke({ action: "oauth", query: { provider: "github" } });
    assert.equal(emailOnlyOauth.statusCode, 400);
    process.env.SUPABASE_AUTH_PROVIDERS = "google, github";

    delete process.env.SUPABASE_AUTH_PROVIDERS;
    delete process.env.SUPABASE_AUTH_PROVIDER;
    assert.deepEqual(handler._private.configuredProviders(), []);
    process.env.SUPABASE_AUTH_PROVIDERS = "google, github";

    const invalidEmail = await invoke({ method: "POST", action: "otp", body: { email: "not-an-email" } });
    assert.equal(invalidEmail.statusCode, 400);

    const invalidPassword = await invoke({
      method: "POST",
      action: "password",
      body: { email: "explorer@example.com", password: "short" },
    });
    assert.equal(invalidPassword.statusCode, 400);

    const missingSession = await invoke({ method: "POST", action: "user" });
    assert.equal(missingSession.statusCode, 401);

    const missingRefreshToken = await invoke({ method: "POST", action: "refresh" });
    assert.equal(missingRefreshToken.statusCode, 400);

    const requests = [];
    global.fetch = async (url, options) => {
      requests.push({ url, options });
      if (String(url).endsWith("/auth/v1/user")) {
        return new Response(JSON.stringify({ id: "user-1", email: "explorer@example.com" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (String(url).includes("/auth/v1/token?grant_type=refresh_token")) {
        return new Response(JSON.stringify({
          access_token: "refreshed-token",
          refresh_token: "next-refresh-token",
          expires_in: 3600,
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (String(url).includes("/auth/v1/token?grant_type=password")) {
        return new Response(JSON.stringify({
          access_token: "password-token",
          refresh_token: "password-refresh-token",
          expires_in: 3600,
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const otp = await invoke({
      method: "POST",
      action: "otp",
      body: {
        email: "explorer@example.com",
        redirectTo: "https://www.auditmap.org/us/nc",
      },
    });
    assert.equal(otp.statusCode, 200);
    assert.equal(otp.body.sent, true);
    const otpBody = JSON.parse(requests[0].options.body);
    assert.equal(otpBody.email, "explorer@example.com");
    assert.equal(otpBody.options.email_redirect_to, "https://www.auditmap.org/us/nc");

    const user = await invoke({
      method: "POST",
      action: "user",
      headers: { authorization: "Bearer user-token" },
    });
    assert.equal(user.statusCode, 200);
    assert.equal(user.body.email, "explorer@example.com");
    assert.equal(requests[1].options.headers.Authorization, "Bearer user-token");

    const passwordSession = await invoke({
      method: "POST",
      action: "password",
      body: { email: "explorer@example.com", password: "correct-horse-battery" },
    });
    assert.equal(passwordSession.statusCode, 200);
    assert.equal(passwordSession.body.access_token, "password-token");

    const weakUpdate = await invoke({
      method: "POST",
      action: "password-update",
      headers: { authorization: "Bearer user-token" },
      body: { password: "too-short" },
    });
    assert.equal(weakUpdate.statusCode, 400);

    const passwordUpdate = await invoke({
      method: "POST",
      action: "password-update",
      headers: { authorization: "Bearer user-token" },
      body: { password: "replacement-password-2026" },
    });
    assert.equal(passwordUpdate.statusCode, 200);
    assert.equal(passwordUpdate.body.updated, true);

    const logout = await invoke({
      method: "POST",
      action: "logout",
      headers: { authorization: "Bearer user-token" },
    });
    assert.equal(logout.statusCode, 200);
    assert.equal(logout.body.signedOut, true);

    const refresh = await invoke({
      method: "POST",
      action: "refresh",
      body: { refreshToken: "refresh-token" },
    });
    assert.equal(refresh.statusCode, 200);
    assert.equal(refresh.body.access_token, "refreshed-token");
    const refreshRequest = requests.at(-1);
    assert.deepEqual(JSON.parse(refreshRequest.options.body), { refresh_token: "refresh-token" });

    console.log("Auth API contract checks passed.");
  } finally {
    global.fetch = originalFetch;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
