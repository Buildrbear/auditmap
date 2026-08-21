const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const origin = String(process.env.AUDITMAP_ORIGIN || "https://www.auditmap.org").replace(/\/$/, "");
const credentialsPath = path.resolve(__dirname, "../.auditmap-demo-credentials.json");

async function request(route, options = {}) {
  const response = await fetch(`${origin}${route}`, {
    ...options,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Production request failed (${response.status}).`);
  return payload;
}

async function run() {
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  const founder = credentials.accounts.find((account) => account.persona === "founder");
  assert(founder, "Founder demo credentials are missing.");
  const session = await request("/api/auth?action=password", {
    method: "POST",
    body: JSON.stringify({
      action: "password",
      email: founder.email,
      password: founder.password,
    }),
  });
  assert(session.access_token, "Founder demo sign-in did not return a session.");
  try {
    const profile = await request("/api/profile", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    assert.equal(profile.profile.isDemo, true);
    assert.equal(profile.profile.role, "member");
    console.log("Production demo founder is restricted to member access.");
  } finally {
    await request("/api/auth?action=logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: "logout" }),
    }).catch(() => null);
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
