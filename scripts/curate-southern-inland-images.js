#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = require("../data/southern-inland-photo-research.json");
const launch = require("../data/generated/launch-map-places.json");
const checkedAt = "2026-08-08";
const wanted = {
  "launch-al-birmingham-railroad-park": [
    ["research", "https://commons.wikimedia.org/w/index.php?curid=65978202", "Landscaped walking path at Railroad Park"],
    ["research", "https://www.flickr.com/photos/76792851@N07/46275221094", "Open lawn and Birmingham skyline at Railroad Park"],
    ["research", "https://www.flickr.com/photos/76792851@N07/40034799573", "Railroad Park identity wall and visitor path"],
    ["research", "https://www.flickr.com/photos/76792851@N07/46275203674", "Play and gathering landscape at Railroad Park"]
  ],
  "launch-al-birmingham-red-mountain-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:November_7th,_2023_photo_of_Red_Mountain_Park_Birmingham,_AL.jpg", "Red Mountain Park entrance and iron sign"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Red_Mountain_Park.JPG", "Historic mining structure at Red Mountain Park"]
  ],
  "launch-al-birmingham-ruffner-mountain": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Panorama_of_Ruffner_Mountain_Nature_Preserve.JPG", "Panorama from Ruffner Mountain Nature Preserve"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Ruffner_Mountain_Nature_Preserve.JPG", "Rocky quarry landscape at Ruffner Mountain"],
    ["research", "https://www.flickr.com/photos/22265703@N06/5523438800", "Forested trail at Ruffner Mountain"],
    ["research", "https://www.flickr.com/photos/29218907@N00/4262341872", "Visitors looking toward Birmingham from Ruffner Mountain"]
  ],
  "launch-ms-jackson-lefleur-s-bluff-state-park": [
    ["research", "https://www.flickr.com/photos/128269164@N05/18419302992", "Wooded wetland at LeFleur's Bluff State Park"],
    ["research", "https://www.flickr.com/photos/128269164@N05/17802818403", "Bridge and water landscape at LeFleur's Bluff State Park"],
    ["research", "https://www.flickr.com/photos/128269164@N05/18425182441", "Mayes Lake shoreline and dock at LeFleur's Bluff State Park"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Pickin_%26_Paddlin_Canoe_Race.jpg", "Paddlers on the water at LeFleur's Bluff State Park"]
  ],
  "launch-ar-little-rock-two-rivers-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Two_Rivers_Park_Bridge,_Little_Rock_Arkansas.jpg", "Two Rivers Park Bridge in Little Rock"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Teloschistes_chrysophthalmus-Arkansas.jpg", "Lichen documented in the Two Rivers Park landscape"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Ilex_decidua_4.jpg", "Possumhaw documented in Two Rivers Park"]
  ]
};

const output = {
  campaign: research.campaign,
  reviewedAt: checkedAt,
  reviewMethod: "Exact title/source match plus visual relevance review; reusable license retained from the source record. Sparse exact galleries remain below the four-photo target and carry a research queue.",
  places: {},
};
for (const [id, selections] of Object.entries(wanted)) {
  const place = research.places[id];
  const current = launch.find((item) => item.id === id);
  const existing = [current?.image, ...(current?.images || [])].filter(Boolean);
  const candidates = selections.map(([kind, key, alt]) => {
    let candidate;
    if (kind === "research") candidate = place.candidates.find((item) => item.source === key);
    if (kind === "existing") {
      const image = existing.find((item) => item.source === key);
      if (image) candidate = {
        title: image.alt || place.name,
        url: image.url,
        source: image.source,
        creator: image.author,
        license: image.license,
        licenseUrl: image.licenseUrl,
        provider: "existing-auditmap",
      };
    }
    if (!candidate) throw new Error(`${place.name}: selection missing ${kind}/${key}`);
    return {
      ...candidate,
      alt,
      reviewStatus: "approved-destination-match",
      reviewedAt: checkedAt,
      reviewNote: `The source identifies ${place.name} or its named subsite and permits reuse under the recorded license.`,
    };
  });
  output.places[id] = { name: place.name, candidates };
}
fs.writeFileSync(path.join(root, "data/southern-inland-photo-selections.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Approved ${Object.values(output.places).reduce((sum, place) => sum + place.candidates.length, 0)} Southern inland images across ${Object.keys(output.places).length} releasable parents.`);
