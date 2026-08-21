const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { inspectProductionHtml } = require("./verify-national-daily-discovery-production");

const root = path.resolve(__dirname, "..");
const deployment = process.argv[2];
if (!deployment) throw new Error("Usage: node scripts/verify-national-daily-discovery-preview.js <deployment-url-or-id>");
const queue = JSON.parse(fs.readFileSync(path.join(root, "data/generated/marketing/national-daily-discovery.json"), "utf8"));

function request(route) {
  const output = execFileSync("vercel", [
    "curl", route, "--deployment", deployment, "--", "--silent", "--show-error", "--write-out", "\nAUDITMAP_STATUS:%{http_code}\n",
  ], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const match = output.match(/\nAUDITMAP_STATUS:(\d{3})\n$/);
  if (!match) throw new Error(`No HTTP status returned for ${route}`);
  return { status: Number(match[1]), body: output.slice(0, match.index) };
}

const results = queue.posts.map((post) => {
  const route = `${new URL(post.url).pathname}${new URL(post.url).search}`;
  try {
    const response = request(route);
    return {
      day: post.day,
      placeId: post.placeId,
      status: response.status,
      errors: inspectProductionHtml(post, { ok: response.status >= 200 && response.status < 300, status: response.status }, response.body),
    };
  } catch (error) {
    return { day: post.day, placeId: post.placeId, status: null, errors: [error.message] };
  }
});
const failures = results.filter(({ errors }) => errors.length);
const measurementErrors = [];
try {
  const app = request("/app.js");
  if (app.status !== 200) measurementErrors.push(`app.js returned HTTP ${app.status}`);
  for (const marker of ["trackAuditMapEvent", "Campaign landing", "Crumb submitted", "Directions opened", "Place saved", "Place shared"]) {
    if (!app.body.includes(marker)) measurementErrors.push(`preview app.js is missing ${marker}`);
  }
} catch (error) {
  measurementErrors.push(`preview app.js request failed: ${error.message}`);
}
const contentReady = failures.length === 0;
const measurementReady = measurementErrors.length === 0;
const report = {
  ready: contentReady && measurementReady,
  contentReady,
  measurementReady,
  deployment,
  checkedAt: new Date().toISOString(),
  posts: results.length,
  passed: results.length - failures.length,
  failures,
  measurementErrors,
};
const reportPath = path.join(root, "preview/national-daily-discovery-preview-validation.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.ready) process.exitCode = 1;
