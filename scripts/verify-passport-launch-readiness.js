const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const remote = process.argv.includes("--remote");
const campaign = JSON.parse(fs.readFileSync(path.join(root, "data/discovery-campaigns/raleigh-passport-pilot.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "discover/raleigh/passport/index.html"), "utf8");
const script = fs.readFileSync(path.join(root, "explorer-passport.js"), "utf8");
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(campaign.status === "awaiting-production" || campaign.status === "ready", "Campaign status must be awaiting-production or ready");
assert(campaign.destination === "https://www.auditmap.org/discover/raleigh/passport/", "Campaign must use the canonical public passport URL");
assert(html.includes('<link rel="canonical" href="https://www.auditmap.org/discover/raleigh/passport/">'), "Generated passport canonical is missing");
assert((html.match(/data-passport-place=/g) || []).length === 5, "Generated passport must contain five place cards");
assert(script.includes("trackOncePerSession"), "Session-deduplicated passport measurement is missing");
assert(script.includes("campaignContents"), "Allowlisted message attribution is missing");
for (const variant of campaign.variants) {
  assert(script.includes(`"${variant.utmContent}"`), `Passport instrumentation is missing ${variant.utmContent}`);
}

async function verifyRemote() {
  if (!remote) return null;
  try {
    const response = await fetch(campaign.destination, { redirect: "follow", signal: AbortSignal.timeout(15000) });
    const body = await response.text();
    assert(response.ok, `Production passport returned HTTP ${response.status}`);
    assert(body.includes("data-passport-place="), "Production response does not contain passport cards");
    assert(body.includes("explorer-passport.js"), "Production response does not load passport instrumentation");
    return { status: response.status, finalUrl: response.url };
  } catch (error) {
    errors.push(`Production passport request failed: ${error.message}`);
    return null;
  }
}

(async () => {
  const production = await verifyRemote();
  if (errors.length) {
    console.error(JSON.stringify({ ready: false, remote, production, errors }, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ ready: true, remote, production, variants: campaign.variants.length }, null, 2));
})();
