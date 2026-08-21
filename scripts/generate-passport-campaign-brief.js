const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaignPath = path.join(root, "data/discovery-campaigns/raleigh-passport-pilot.json");
const campaign = JSON.parse(fs.readFileSync(campaignPath, "utf8"));

function taggedUrl(variant) {
  const url = new URL(campaign.destination);
  url.searchParams.set("utm_source", campaign.channel);
  url.searchParams.set("utm_medium", "organic_social");
  url.searchParams.set("utm_campaign", campaign.campaign);
  url.searchParams.set("utm_content", variant.utmContent);
  return url.toString();
}

function xLength(copy) {
  // X wraps HTTP(S) links to a fixed-length t.co URL; the post has one URL.
  return [...copy].length + 2 + 23;
}

const variants = campaign.variants.map((variant, index) => {
  const url = taggedUrl(variant);
  const compose = new URL("https://twitter.com/intent/tweet");
  compose.searchParams.set("text", `${variant.copy}\n\n${url}`);
  return `## ${index + 1}. ${variant.id}\n\n`+
    `**Motivation:** ${variant.motivation}  \n`+
    `**Approximate X length:** ${xLength(variant.copy)}/280  \n`+
    `**Tagged destination:** ${url}  \n`+
    `**Review in X composer:** ${compose.toString()}\n\n`+
    `${variant.copy}\n\n${url}`;
}).join("\n\n---\n\n");

const brief = `# Raleigh Explorer Passport Launch Review\n\n`+
  `**Status:** ${campaign.status === "ready" ? "Ready for approved distribution" : "Awaiting production"}; nothing has been posted automatically.  \n`+
  (campaign.status === "ready" ? "" : "**Launch gate:** Do not publish. The canonical public passport must pass `npm run verify:passport:raleigh:production` first.  \n")+
  `**Channel:** X  \n`+
  `**Destination:** ${campaign.destination}\n\n`+
  `## Test Procedure\n\n`+
  `1. Use the same passport link-preview image for all three posts so the first round tests motivation rather than artwork.\n`+
  `2. Publish the variants 48 hours apart at the same Raleigh local time. Do not publish another AuditMap Raleigh campaign during each 24-hour window.\n`+
  `3. Record X impressions and engagements plus attributed AuditMap events at 24 hours, then cumulative results at seven days.\n`+
  `4. Count a contribution only when a Crumb is submitted. Never count a contribution-form open as completed work.\n`+
  `5. Run \`npm run evaluate:passport:raleigh:24h\` and \`npm run evaluate:passport:raleigh\`. Repeat the motivation that produces real exploration plus the strongest downstream signal.\n\n`+
  `## Controlled Visual\n\n`+
  `Use the existing passport Open Graph preview, currently sourced from the reusable Dix Park image already attributed on the passport. Do not add an unsourced social image.\n\n`+
  `${variants}\n`;

const outputPath = path.join(root, "preview/raleigh-passport-pilot-launch.md");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, brief);
console.log(JSON.stringify({ output: path.relative(root, outputPath), variants: campaign.variants.length }, null, 2));

module.exports = { taggedUrl, xLength };
