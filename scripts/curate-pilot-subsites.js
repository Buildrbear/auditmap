const fs = require("node:fs");
const path = require("node:path");

const pilotPath = path.resolve(
  __dirname,
  "..",
  "data",
  "generated",
  "pilot-subsites.json",
);

const rejectedFeatures = new Set([
  "launch-ca-los-angeles-griffith-park:camel",
  "launch-ca-los-angeles-griffith-park:elephant",
  "launch-ca-los-angeles-griffith-park:equidome",
]);

const rejectedImages = new Map([
  [
    "launch-ca-los-angeles-griffith-park:griffith-observatory",
    "File:View of Griffith Park from Sunset Boulevard.jpg",
  ],
  [
    "launch-ca-los-angeles-griffith-park:hollywood-sign",
    [
      "File:Hollywood Hills view from Jefferson Park.jpg",
      "File:View of Griffith Park from Sunset Boulevard 2.jpg",
    ],
  ],
  [
    "launch-ca-los-angeles-griffith-park:rebel-without-a-cause-monument",
    "File:Griffith Observatory front.jpg",
  ],
  [
    "launch-ca-los-angeles-griffith-park:equidome",
    [
      "File:MCG spends New Years in Los Angeles 150101-M-ss662-003.jpg",
      "File:MCG spends New Years in Los Angeles 150101-M-ss662-005.jpg",
    ],
  ],
  [
    "launch-tx-austin-zilker-metropolitan-park:barton-springs",
    "File:Andrew Jackson Zilker TxHM (3161557917).jpg",
  ],
  [
    "launch-tx-houston-memorial-park:memorial-park-golf-course",
    "File:Sunset around autumnal equinox, Campbell Hall, NY.jpg",
  ],
  [
    "launch-ny-new-york-city-central-park:albert-bertel-thorvaldsen",
    "File:Andreas Martin Petersen, Albert Bertel Thorvaldsen, 1839, KKS12390, Statens Museum for Kunst.jpg",
  ],
  [
    "launch-ny-new-york-city-prospect-park:dragon-fountain",
    "File:Dragon Fountain, Eaton Hall 03.jpg",
  ],
  [
    "launch-tx-austin-zilker-metropolitan-park:green-garden",
    "File:Austin Rose Garden Green Man.jpg",
  ],
  [
    "launch-ga-atlanta-piedmont-park:welcome-plaza",
    "File:Honda HR412E engine front-right 2013 Honda Welcome Plaza.jpg",
  ],
  [
    "launch-mo-st-louis-forest-park:boathouse-at-forest-park",
    "File:Sylvan Lake, Forest Park (NBY 437323).jpg",
  ],
  [
    "launch-ny-new-york-city-prospect-park:harmony-playground",
    "File:Day in the sun in Prospect Park.jpg",
  ],
  [
    "launch-ca-los-angeles-griffith-park:los-angeles-zoo",
    "File:Los Angeles Zoo Magnet Campus.JPG",
  ],
  [
    "launch-ca-los-angeles-griffith-park:hollywood-sign",
    [
      "File:View of Griffith Park from Sunset Boulevard.jpg",
      "File:View of Griffith Park from Sunset Boulevard 2.jpg",
      "File:Hollywood Hills view from Jefferson Park.jpg",
    ],
  ],
]);

function clearImage(feature) {
  delete feature.details.imageUrl;
  delete feature.details.imageSourceUrl;
  delete feature.details.imageAuthor;
  delete feature.details.imageLicense;
  delete feature.details.imageAlt;
  delete feature.discovery.imageFileTitle;
}

const document = JSON.parse(fs.readFileSync(pilotPath, "utf8"));
let removedFeatures = 0;
let removedImages = 0;

for (const park of document.parks) {
  park.features = (park.features || []).filter((feature) => {
    const key = `${park.id}:${feature.slug}`;
    if (!rejectedFeatures.has(key)) return true;
    removedFeatures += 1;
    return false;
  });

  for (const feature of park.features) {
    const key = `${park.id}:${feature.slug}`;
    const rejectedTitles = [rejectedImages.get(key)].flat().filter(Boolean);
    const rejectedTitle = feature.discovery?.imageFileTitle;
    if (!rejectedTitles.includes(rejectedTitle)) continue;
    clearImage(feature);
    feature.discovery.rejectedImageTitles = [
      ...new Set([...(feature.discovery.rejectedImageTitles || []), rejectedTitle]),
    ];
    removedImages += 1;
  }
}

document.generatedAt = new Date().toISOString();
fs.writeFileSync(pilotPath, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Removed ${removedFeatures} false subsites and ${removedImages} false image matches.`);
