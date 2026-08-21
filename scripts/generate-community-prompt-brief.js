const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = JSON.parse(fs.readFileSync(path.join(root, "data/discovery-campaigns/raleigh-community-prompt-pilot.json"), "utf8"));
const sections = campaign.prompts.map((prompt, index) => {
  const composer = new URL("https://twitter.com/intent/tweet");
  composer.searchParams.set("text", prompt.copy);
  return `## ${index + 1}. ${prompt.id}\n\n**Motivation:** ${prompt.motivation}  \n**Length:** ${[...prompt.copy].length}/280  \n**Review in X composer:** ${composer}\n\n${prompt.copy}`;
}).join("\n\n---\n\n");
const brief = `# Raleigh Community-question Launch Review\n\n`+
  `**Status:** Review only; nothing has been posted automatically.  \n`+
  `**Privacy:** Record aggregate counts and reviewer-written paraphrases only. Do not store handles or copy reply text.\n\n`+
  `## Test Control\n\nPublish one prompt at a time, 72 hours apart, at the same Raleigh local time. Publicly return each sourced answer before declaring the prompt successful. Do not reward outrage, popularity, or raw reply volume; optimize for qualified visitor needs and closed answer loops.\n\n`+
  sections + "\n";
const output = path.join(root, "preview/raleigh-community-prompt-launch.md");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, brief);
console.log(JSON.stringify({ output: path.relative(root, output), prompts: campaign.prompts.length }, null, 2));
