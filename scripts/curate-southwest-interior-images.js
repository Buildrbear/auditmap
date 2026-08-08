#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = require("../data/southwest-interior-photo-research.json");
const launch = require("../data/generated/launch-map-places.json");
const checkedAt = "2026-08-08";
const wanted = {
  "launch-nm-albuquerque-balloon-fiesta-park": [
    ["https://commons.wikimedia.org/w/index.php?curid=51319928", "Balloons over Balloon Fiesta Park in Albuquerque"],
    ["https://www.flickr.com/photos/53986933@N00/10236755833", "Special-shape balloons at Balloon Fiesta Park"],
    ["https://www.flickr.com/photos/94833286@N00/4002852413", "Mass ascension from the Balloon Fiesta launch field"],
    ["https://www.flickr.com/photos/40563877@N00/8182921287", "Overview of Balloon Fiesta Park during the festival"]
  ],
  "launch-nm-albuquerque-elena-gallegos-open-space": [
    ["https://www.flickr.com/photos/11173517@N08/7024986685", "A public trail through Elena Gallegos Open Space"],
    ["https://www.flickr.com/photos/11173517@N08/1186497924", "Sandia foothill landscape at Elena Gallegos Open Space"],
    ["https://www.flickr.com/photos/11173517@N08/1468762397", "Sunrise from the Elena Gallegos Picnic Area"],
    ["https://commons.wikimedia.org/w/index.php?curid=82993922", "Kiwanis shelter and accessible bridge at Cottonwood Springs"]
  ],
  "launch-nm-albuquerque-tingley-beach-and-bosque": [
    ["https://commons.wikimedia.org/wiki/File:Albuquerque_NM_Tingley_Beach.jpg", "Water and shoreline at Tingley Beach"],
    ["https://commons.wikimedia.org/wiki/File:Tingley_Beach_Albuquerque_Detail.jpg", "A detailed visitor view of Tingley Beach"],
    ["https://commons.wikimedia.org/wiki/File:Tingley_Beach_Albuquerque_NM.jpg", "Visitors beside the ponds at Tingley Beach"],
    ["https://www.flickr.com/photos/32234827@N03/41649949790", "Cottonwood trees around Tingley Beach and the bosque"]
  ],
  "launch-ok-oklahoma-city-scissortail-park": [
    ["https://commons.wikimedia.org/w/index.php?curid=87582424", "Scissortail Park lawn and downtown setting"],
    ["https://www.flickr.com/photos/46183897@N00/51522128833", "Scissortail Park landscape and paths"],
    ["https://commons.wikimedia.org/w/index.php?curid=128080026", "Skydance Bridge connecting toward Scissortail Park"]
  ],
  "launch-ok-oklahoma-city-myriad-botanical-gardens": [
    ["https://www.flickr.com/photos/59081381@N03/54010022233", "Crystal Bridge Conservatory at Myriad Botanical Gardens"],
    ["https://www.flickr.com/photos/59081381@N03/54010021578", "Children's Garden at Myriad Botanical Gardens"],
    ["https://www.flickr.com/photos/59081381@N03/54010222025", "Amphitheater and garden landscape at Myriad Botanical Gardens"],
    ["https://www.flickr.com/photos/59081381@N03/54010121704", "Lagoon and terraces at Myriad Botanical Gardens"]
  ],
  "launch-ok-oklahoma-city-lake-hefner-park": [
    ["https://www.flickr.com/photos/53179863@N07/5153556526", "East Wharf beside Lake Hefner"],
    ["https://www.flickr.com/photos/67958110@N00/2521730402", "Open-water view across Lake Hefner"],
    ["https://commons.wikimedia.org/w/index.php?curid=108193168", "Lake Hefner Lighthouse at sunset"],
    ["https://commons.wikimedia.org/wiki/File:Lake_Hefner_-_Oklahoma_(2521730360).jpg", "Sailboats using Lake Hefner"]
  ],
  "launch-tx-fort-worth-trinity-park": [
    ["https://commons.wikimedia.org/w/index.php?curid=52810427", "A current landscape view in Trinity Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=52810422", "Public paths and greenery in Trinity Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=52810433", "Visitor scenery inside Trinity Park in Fort Worth"]
  ],
  "launch-tx-fort-worth-fort-worth-water-gardens": [
    ["https://commons.wikimedia.org/w/index.php?curid=49439978", "The Active Pool at Fort Worth Water Gardens"],
    ["https://commons.wikimedia.org/w/index.php?curid=49439979", "The Aerating Pool at Fort Worth Water Gardens"],
    ["https://www.flickr.com/photos/8499840@N04/3103034169", "The Quiet Pool at Fort Worth Water Gardens"],
    ["https://commons.wikimedia.org/w/index.php?curid=93564012", "A broad architectural view of Fort Worth Water Gardens"]
  ]
};

const output = {
  campaign: research.campaign,
  reviewedAt: checkedAt,
  reviewMethod: "Exact title/source match, reusable-rights check, and visual-purpose review; unrelated search results and historical Trinity Park postcards were excluded.",
  places: {}
};
for (const [id, selections] of Object.entries(wanted)) {
  const place = research.places[id];
  const current = launch.find((item) => item.id === id);
  const existing = [current?.image, ...(current?.images || [])].filter(Boolean);
  const candidates = selections.map(([source, alt]) => {
    let candidate = place.candidates.find((item) => item.source === source);
    const image = existing.find((item) => item.source === source);
    if (!candidate && image) candidate = { title: image.alt || place.name, url: image.url, source: image.source, creator: image.author, license: image.license, licenseUrl: image.licenseUrl, provider: "existing-auditmap" };
    if (!candidate) throw new Error(`${place.name}: selection missing ${source}`);
    return { ...candidate, alt, reviewStatus: "approved-destination-match", reviewedAt: checkedAt, reviewNote: `The source identifies ${place.name} or its named component and permits reuse under the recorded license.` };
  });
  output.places[id] = { name: place.name, candidates };
}
fs.writeFileSync(path.join(root, "data/southwest-interior-photo-selections.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Approved ${Object.values(output.places).reduce((sum, place) => sum + place.candidates.length, 0)} Southwest interior images after source review.`);
