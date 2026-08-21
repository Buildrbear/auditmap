const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const origin = String(process.env.AUDITMAP_ORIGIN || "https://www.auditmap.org").replace(/\/$/, "");
const credentials = JSON.parse(fs.readFileSync(path.join(root, ".auditmap-demo-credentials.json"), "utf8"));
const avatarByPersona = {
  founder: "founder.webp",
  "new-explorer": "maya-chen.webp",
  "first-crumb": "jordan-brooks.webp",
  "trail-helper": "elena-rivera.webp",
  "path-finder": "theo-morgan.webp",
  "neighborhood-guide": "priya-shah.webp",
};

async function request(endpoint, options = {}) {
  const response = await fetch(`${origin}${endpoint}`, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `${endpoint} failed (${response.status}).`);
  return payload;
}

async function run() {
  for (const account of credentials.accounts) {
    const session = await request("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "password", email: account.email, password: account.password }),
    });
    const file = fs.readFileSync(path.join(root, "assets", "demo-avatars", avatarByPersona[account.persona]));
    await request("/api/profile-avatar", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dataUrl: `data:image/webp;base64,${file.toString("base64")}` }),
    });
  }
  console.log(`Uploaded ${credentials.accounts.length} demo profile photos.`);
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
