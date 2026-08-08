const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = JSON.parse(fs.readFileSync(path.join(root, "data/discovery-campaigns/raleigh-planning-pilot.json"), "utf8"));
const generated = JSON.parse(fs.readFileSync(path.join(root, "data/generated/discovery-campaigns/raleigh-planning-pilot.json"), "utf8"));
const html = fs.readFileSync(path.join(root, "discover/raleigh/together/index.html"), "utf8");
const queue = fs.readFileSync(path.join(root, "preview/raleigh-planning-pilot-social-queue.md"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(campaign.status === "review", "Planning posts must remain review-only.");
assert(generated.lists.length === 3, "Pilot must contain exactly three comparable lists.");
assert(new Set(generated.lists.map((item) => item.id)).size === 3, "Planning list IDs must be unique.");
for (const item of generated.lists) {
  assert(item.places.length >= 2 && item.places.length <= 12, `${item.id} has an invalid place count.`);
  assert(new Set(item.places.map((place) => place.id)).size === item.places.length, `${item.id} repeats a place.`);
  assert(item.url.includes("utm_campaign=raleigh_planning_pilot"), `${item.id} lacks campaign attribution.`);
  assert(item.url.includes(`utm_content=${item.id}`), `${item.id} lacks creative attribution.`);
  assert(item.url.includes(`list=${item.placeIds.join("%2C")}`), `${item.id} does not open the exact shared list.`);
  assert(/\b(public domain|cc0|cc by|cc-by|creative commons)\b/i.test(item.image.license), `${item.id} image is not clearly reusable.`);
  assert(item.image.source && item.image.author && item.image.alt, `${item.id} image attribution is incomplete.`);
  assert(item.places.every((place) => place.source), `${item.id} has an unsourced destination.`);
  assert(item.estimatedXLength <= 280, `${item.id} exceeds the X limit.`);
  assert(html.includes(item.id) && queue.includes(item.id), `${item.id} is missing from an output.`);
}
assert(html.includes('<link rel="canonical" href="https://www.auditmap.org/discover/raleigh/together/"'), "Planning page canonical is missing.");
assert(html.includes("Raleigh Places to Explore Together"), "Planning page title is missing.");
assert(html.includes("Open and share this list"), "Planning page does not hand off to the saved-list loop.");
assert(!html.includes("noindex"), "The curated planning page should remain discoverable.");
assert(queue.includes("Collection labels are editorial, not evidence."), "Review queue must identify editorial synthesis.");

console.log("Raleigh planning page, three shared lists, attribution, evidence, image rights, and social queue checks passed.");
