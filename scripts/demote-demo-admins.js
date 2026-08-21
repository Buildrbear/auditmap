const assert = require("node:assert/strict");

const url = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert(url && serviceKey, "Production Supabase credentials are required.");

async function authRequest(path, options = {}) {
  const response = await fetch(`${url}/auth/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Auth request failed (${response.status}).`);
  return payload;
}

async function run() {
  const payload = await authRequest("admin/users?per_page=1000");
  const demoUsers = (payload.users || []).filter(
    (user) => user.app_metadata?.auditmap_demo === true,
  );
  let changed = 0;
  for (const user of demoUsers) {
    if (user.app_metadata?.auditmap_role === "member") continue;
    await authRequest(`admin/users/${user.id}`, {
      method: "PUT",
      body: JSON.stringify({
        app_metadata: {
          ...(user.app_metadata || {}),
          auditmap_role: "member",
        },
      }),
    });
    changed += 1;
  }
  console.log(`Verified ${demoUsers.length} demo accounts; demoted ${changed} privileged demo account${changed === 1 ? "" : "s"}.`);
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
