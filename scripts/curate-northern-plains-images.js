#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = require("../data/northern-plains-photo-research.json");
const checkedAt = "2026-08-08";
const wanted = {
  "launch-nd-fargo-lindenwood-park": [
    ["https://www.flickr.com/photos/38315261@N00/50243483213", "A visitor view through Lindenwood Park in Fargo"],
    ["https://www.flickr.com/photos/38315261@N00/50258053233", "Trees and recreation space at Lindenwood Park"],
    ["https://www.flickr.com/photos/38315261@N00/8030889762", "A broad public landscape at Lindenwood Park"],
    ["https://www.flickr.com/photos/28433241@N03/3364864357", "A developed visitor area at Lindenwood Park"]
  ],
  "launch-nd-fargo-island-park": [
    ["https://commons.wikimedia.org/w/index.php?curid=153643999", "A broad visitor view of Island Park in Fargo"],
    ["https://www.flickr.com/photos/28433241@N03/3365686036", "Community activity among the trees at Island Park"],
    ["https://www.flickr.com/photos/28433241@N03/3364863901", "A second public event view within Island Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=177070892", "The GAR Soldier memorial in Island Park"]
  ],
  "launch-sd-sioux-falls-falls-park": [
    ["https://commons.wikimedia.org/w/index.php?curid=135301714", "The Big Sioux River waterfalls at Falls Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=135297480", "Falls Park Visitor Information Center observation tower"],
    ["https://commons.wikimedia.org/w/index.php?curid=73217626", "The Queen Bee Mill ruins at Falls Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=135289589", "The historic hydroelectric building that houses Falls Overlook Cafe"]
  ],
  "launch-sd-sioux-falls-terrace-park": [
    ["https://commons.wikimedia.org/w/index.php?curid=164230183", "A broad visitor view of Terrace Park in Sioux Falls"],
    ["https://commons.wikimedia.org/w/index.php?curid=85801761", "Paths, stonework, and water in the Terrace Park Japanese Garden"],
    ["https://commons.wikimedia.org/w/index.php?curid=85801842", "A second visitor view inside the Terrace Park Japanese Garden"],
    ["https://commons.wikimedia.org/w/index.php?curid=9829376", "Seasonal landscaping in the Terrace Park Japanese Garden"]
  ]
};

const output = {
  campaign: research.campaign,
  reviewedAt: checkedAt,
  reviewMethod: "Exact title and source match, reusable-rights check, destination review, and visitor-value review. Wildlife close-ups, unrelated same-name places, outdated pool imagery, and unrelated geology images were excluded.",
  places: {}
};

for (const [id, selections] of Object.entries(wanted)) {
  const place = research.places[id];
  const candidates = selections.map(([source, alt]) => {
    const candidate = place.candidates.find((item) => item.source === source);
    if (!candidate) throw new Error(`${place.name}: selection missing ${source}`);
    return {
      ...candidate,
      alt,
      reviewStatus: "approved-destination-match",
      reviewedAt: checkedAt,
      reviewNote: `The source identifies ${place.name} or a named component and permits reuse under the recorded license.`
    };
  });
  output.places[id] = { name: place.name, candidates };
}

fs.writeFileSync(path.join(root, "data/northern-plains-photo-selections.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Approved ${Object.values(output.places).reduce((sum, place) => sum + place.candidates.length, 0)} Northern Plains images after source review.`);
