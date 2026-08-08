const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const dixPage = fs.readFileSync(
  path.join(root, "us/nc/raleigh/parks/dix-park/index.html"),
  "utf8",
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(app.includes("auditmap:directions:"), "Directions intent must use a namespaced browser key.");
assert(app.includes("sessionStorage.setItem"), "Directions intent must stay session-local.");
assert(app.includes("15_000"), "Return prompt must not appear immediately after opening directions.");
assert(app.includes("24 * 60 * 60 * 1000"), "Stale directions intent must expire within 24 hours.");
assert(
  app.includes("If you visited, help the next person."),
  "Prompt must not claim that the visitor completed a visit.",
);
assert(
  app.includes("Leave a breadcrumb for the next explorer."),
  "Return experiment must include the explorer-oriented breadcrumb framing.",
);
assert(app.includes("auditmap:return-prompt-variant:v1"), "Prompt assignment must remain stable during a browser session.");
assert(app.includes('campaign: attribution.campaign || "organic"'), "Organic interactions must remain measurable without campaign parameters.");
assert(app.includes("variant,"), "Prompt analytics must include the assigned wording variant.");
assert(app.includes('open("update", feature ? { featureId: feature.id } : {})'), "Subsite directions must preserve the contribution target.");
assert(app.includes("Return contribution prompt shown"), "Prompt impressions must be measurable.");
assert(app.includes("Return contribution prompt accepted"), "Prompt acceptance must be measurable.");
assert(app.includes("Return contribution prompt dismissed"), "Prompt dismissal must be measurable.");
assert(app.includes('document.visibilityState === "hidden"'), "Prompt must not appear over a backgrounded page.");
assert(styles.includes(".directions-return-prompt {\n  position: fixed;"), "Prompt must remain visible without changing page layout.");
assert(styles.includes("width: calc(100vw - 24px);"), "Prompt needs a phone-width layout.");
assert(/\/styles\.css\?v=\d{8}-\d+/.test(dixPage), "Generated pages must load versioned shared prompt styles.");
assert(/\/app\.js\?v=\d{8}-\d+/.test(dixPage), "Generated pages must load versioned shared interaction code.");

console.log("Directions-to-contribution timing, privacy, targeting, analytics, and responsive contracts passed.");
