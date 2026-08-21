const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const backlog = JSON.parse(fs.readFileSync(path.join(root, "data", "nc-enrichment-backlog.json"), "utf8"));
const campaign = JSON.parse(fs.readFileSync(path.join(root, "data", "parent-park-information-enrichment-campaign.json"), "utf8")).parks;
const configPath = path.join(root, "data", "launch-official-image-pages.json");
const pages = JSON.parse(fs.readFileSync(configPath, "utf8"));
const configured = new Set(pages.map((page) => page.id));
let added = 0;

for (const place of backlog.places.filter((item) => !item.hasHero && item.origin === "launch")) {
  if (configured.has(place.id)) continue;
  const source = campaign[place.id]?.source;
  const sourceLabel = campaign[place.id]?.sourceLabel;
  if (!/^https:\/\//.test(source || "")) continue;
  pages.push({
    id: place.id,
    url: source,
    label: sourceLabel || "Official park source",
    license: `Official ${sourceLabel || "park source"} image`,
    prepend: true,
    reviewStatus: "automatic-lead-needs-visual-review"
  });
  configured.add(place.id);
  added += 1;
}

fs.writeFileSync(configPath, `${JSON.stringify(pages, null, 2)}\n`);
console.log(JSON.stringify({ added, totalConfigured: pages.length }, null, 2));
