const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(app.includes('get("list")'), "Shared lists must use an explicit utility URL parameter.");
assert(app.includes('replace(/[^a-z0-9_-]/gi, "")'), "Shared place IDs must be sanitized.");
assert(app.includes(".slice(0, 12)"), "Shared lists must have a small destination limit.");
assert(app.includes("savedListShareUrl(ids)"), "Saved places must produce a shareable AuditMap URL.");
assert(app.includes('url.searchParams.set("utm_campaign", "saved_list_loop")'), "Shared-list referrals need loop-specific attribution.");
assert(app.includes("navigator.share"), "Supported devices should use their familiar native share surface.");
assert(app.includes("navigator.clipboard.writeText(url)"), "Browsers without native share need a copy-link fallback.");
assert(app.includes("Someone shared these public places with you."), "Recipients need context instead of a generic saved-state screen.");
assert(app.includes("data-save-shared-list"), "Recipients must be able to keep a shared list without an account.");
assert(app.includes('trackAuditMapEvent("Saved list shared"'), "List distribution must be measurable.");
assert(app.includes('trackAuditMapEvent("Shared list opened"'), "Shared-list landings must be measurable.");
assert(app.includes('trackAuditMapEvent("Shared list guide opened"'), "Guide handoffs from a shared list must be measurable.");
assert(app.includes('trackAuditMapEvent("Shared list saved"'), "Recipient retention must be measurable.");
assert(!/savedListShareUrl[\s\S]{0,500}(latitude|longitude|userId|email)/.test(app), "Shared-list URLs must not include identity or precise location.");
assert(styles.includes(".saved-list-actions"), "Saved-list actions need a deliberate responsive presentation.");

console.log("Saved-list sharing, recipient, retention, measurement, and privacy contracts passed.");
