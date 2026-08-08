const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const queue = JSON.parse(fs.readFileSync(path.join(root, "data/generated/marketing/national-daily-discovery.json"), "utf8"));
const validation = JSON.parse(fs.readFileSync(path.join(root, "preview/national-daily-discovery-production-validation.json"), "utf8"));
const post = queue.posts.find(({ day }) => day === 1);
if (!post) throw new Error("National daily queue has no Day 1 post");

const scheduled = new Date(`${post.date}T23:59:59-04:00`);
const now = new Date();
const checks = {
  scheduledDateCurrent: scheduled >= now,
  sourceRecorded: Boolean(post.answerEvidence.source && post.answerEvidence.sourceLabel && post.answerEvidence.checkedAt),
  factCurrentThroughPost: !post.answerEvidence.expiresAt || new Date(post.answerEvidence.expiresAt) >= scheduled,
  reusableImageRecorded: Boolean(post.image.source && post.image.author && /public domain|cc0|cc by|cc-by|creative commons/i.test(post.image.license || "")),
  productionContentReady: validation.contentReady === true,
  productionMeasurementReady: validation.measurementReady === true,
};
const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
const status = failed.length ? "HOLD" : "READY FOR HUMAN REVIEW";
const result = {
  generatedAt: now.toISOString(),
  status,
  failed,
  postId: post.id,
  placeId: post.placeId,
  scheduledDate: post.date,
  productionCheckedAt: validation.checkedAt,
  checks,
};
const checkRows = Object.entries(checks).map(([name, passed]) => `| ${name} | ${passed ? "Pass" : "Fail"} |`).join("\n");
const report = `# National Daily Discovery: Day 1\n\n`+
  `**Decision:** ${status}  \n`+
  `**Scheduled:** ${post.date}  \n`+
  `**Destination:** ${post.placeName}, ${post.city}, ${post.state}  \n`+
  `**Why held:** ${failed.length ? failed.join(", ") : "No automated gate failures; a person must still recheck same-day conditions and approve publication."}\n\n`+
  `## Post\n\n${post.text}\n\n`+
  `## Photograph\n\n![${post.image.alt}](${post.image.url})\n\n`+
  `${post.image.author} · ${post.image.license} · [source page](${post.image.source})\n\n`+
  `## Visitor Fact\n\n${post.intentKey}: ${post.text.split(`${post.state}. `)[1]?.split("\n\n")[0] || "See post copy."}\n\n`+
  `[${post.answerEvidence.sourceLabel}](${post.answerEvidence.source}), checked ${post.answerEvidence.checkedAt}${post.answerEvidence.expiresAt ? `, current through ${post.answerEvidence.expiresAt}` : ""}.\n\n`+
  `## Automated Gates\n\n| Check | Result |\n| --- | --- |\n${checkRows}\n\n`+
  `## Human Publication Check\n\n`+
  `- Confirm no same-day closure, emergency, weather hazard, or source conflict.\n`+
  `- Confirm the photograph still depicts the named destination and attribution accompanies the post where required.\n`+
  `- Do not alter the tracked URL or post ID.\n`+
  `- Publish only after this card says READY FOR HUMAN REVIEW.\n`+
  `- At 24 hours, record X impressions, engagements, and non-team responses, then import AuditMap events.\n`;

fs.writeFileSync(path.join(root, "preview/national-daily-day1-approval.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(root, "preview/national-daily-day1-approval.md"), report);
console.log(JSON.stringify(result, null, 2));
