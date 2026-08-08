const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const credentialsPath = path.join(root, ".auditmap-demo-credentials.json");
const recoveryPath = path.join(root, ".auditmap-demo-credentials.rotation.json");
const origin = String(process.env.AUDITMAP_ORIGIN || "https://www.auditmap.org").replace(/\/$/, "");

function nextPassword() {
  return `${crypto.randomBytes(18).toString("base64url")}!8Q`;
}

async function api(body, token = null) {
  const response = await fetch(`${origin}/api/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Authentication request failed (${response.status}).`);
  return payload;
}

async function run() {
  const current = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  const rotation = {
    generatedAt: new Date().toISOString(),
    accounts: current.accounts.map((account) => ({ ...account, password: nextPassword() })),
  };
  fs.writeFileSync(recoveryPath, `${JSON.stringify(rotation, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(recoveryPath, 0o600);

  for (const next of rotation.accounts) {
    const previous = current.accounts.find((account) => account.email === next.email);
    const session = await api({ action: "password", email: previous.email, password: previous.password });
    await api({ action: "password-update", password: next.password }, session.access_token);
  }

  fs.renameSync(recoveryPath, credentialsPath);
  fs.chmodSync(credentialsPath, 0o600);
  console.log(`Rotated ${rotation.accounts.length} demo account passwords.`);
}

run().catch((error) => {
  console.error(error.message);
  console.error(`Recovery plan retained at ${recoveryPath}`);
  process.exitCode = 1;
});
