const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const queuePath = path.join(root, "data/generated/marketing/national-daily-discovery.json");
const baseUrl = String(process.env.AUDITMAP_VERIFY_BASE_URL || "https://www.auditmap.org").replace(/\/$/, "");

function targetUrl(value) {
  const url = new URL(value);
  return `${baseUrl}${url.pathname}${url.search}`;
}

function inspectProductionHtml(post, response, html) {
  const errors = [];
  const canonicalPath = new URL(post.url).pathname.replace(/\/$/, "");
  if (!response.ok) errors.push(`HTTP ${response.status}`);
  if (!html.includes(post.placeName)) errors.push("place name missing");
  if (!html.includes('rel="canonical"')) errors.push("canonical tag missing");
  if (!html.includes(canonicalPath)) errors.push("canonical path missing");
  if (!html.includes(post.answerEvidence.source.replaceAll("&", "&amp;")) && !html.includes(post.answerEvidence.source)) errors.push("cited source missing from raw HTML");
  if (/name="robots" content="[^"]*noindex/i.test(html)) errors.push("page is noindex");
  return errors;
}

async function run() {
  const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
  const results = await Promise.all(queue.posts.map(async (post) => {
    try {
      const response = await fetch(targetUrl(post.url), { redirect: "follow", signal: AbortSignal.timeout(20000) });
      const html = await response.text();
      return { day: post.day, placeId: post.placeId, status: response.status, finalUrl: response.url, errors: inspectProductionHtml(post, response, html) };
    } catch (error) {
      return { day: post.day, placeId: post.placeId, status: null, finalUrl: null, errors: [error.message] };
    }
  }));
  const failures = results.filter(({ errors }) => errors.length);
  let measurementErrors = [];
  try {
    const response = await fetch(`${baseUrl}/app.js`, { redirect: "follow", signal: AbortSignal.timeout(20000) });
    const script = await response.text();
    if (!response.ok) measurementErrors.push(`app.js returned HTTP ${response.status}`);
    for (const marker of ["trackAuditMapEvent", "Campaign landing", "Crumb submitted", "Directions opened", "Place saved", "Place shared"]) {
      if (!script.includes(marker)) measurementErrors.push(`production app.js is missing ${marker}`);
    }
  } catch (error) {
    measurementErrors.push(`production app.js request failed: ${error.message}`);
  }
  const contentReady = failures.length === 0;
  const measurementReady = measurementErrors.length === 0;
  const output = { ready: contentReady && measurementReady, contentReady, measurementReady, baseUrl, checkedAt: new Date().toISOString(), posts: results.length, passed: results.length - failures.length, failures, measurementErrors };
  const reportPath = path.join(root, "preview/national-daily-discovery-production-validation.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output, null, 2));
  if (!output.ready) process.exitCode = 1;
}

if (require.main === module) run();
module.exports = { inspectProductionHtml };
