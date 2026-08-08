#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = require("../data/central-plains-photo-research.json");
const launch = require("../data/generated/launch-map-places.json");
const checkedAt = "2026-08-08";
const wanted = {
  "launch-ia-des-moines-gray-s-lake-park": [
    ["https://www.flickr.com/photos/93393982@N00/26978776665", "Gray's Lake Park and its waterfront landscape"],
    ["https://www.flickr.com/photos/88876166@N00/15116211062", "Visitors using the water at Gray's Lake Park"],
    ["https://www.flickr.com/photos/88876166@N00/15116199092", "A cyclist on the trail at Gray's Lake Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=53737135", "Kruidenier Trail Bridge illuminated at night"]
  ],
  "launch-ia-des-moines-water-works-park": [
    ["https://commons.wikimedia.org/wiki/File:Waterworks_Park_along_the_Raccoon_River_-_Des_Moines,_Iowa_(24344458190).jpg", "Water Works Park beside the Raccoon River"],
    ["https://www.flickr.com/photos/88876166@N00/51520318569", "A public concert at Water Works Park"],
    ["https://www.flickr.com/photos/88876166@N00/52434633469", "Runners passing through Water Works Park during the Des Moines Marathon"],
    ["https://www.flickr.com/photos/88876166@N00/4549245207", "Trees and paths in the Water Works Park arboretum"]
  ],
  "launch-ia-des-moines-pappajohn-sculpture-park": [
    ["https://www.flickr.com/photos/72958083@N00/9347284903", "Nomade illuminated at Pappajohn Sculpture Park"],
    ["https://www.flickr.com/photos/88876166@N00/39812292314", "Pumpkin Large being installed at Pappajohn Sculpture Park"],
    ["https://www.flickr.com/photos/124651729@N04/53501330081", "A broad visitor view of Pappajohn Sculpture Park"],
    ["https://www.flickr.com/photos/88876166@N00/5637140035", "Spring tulips and sculpture at Pappajohn Sculpture Park"]
  ],
  "launch-ne-omaha-the-riverfront": [
    ["https://commons.wikimedia.org/wiki/File:Gene_Leahy_Mall,_Omaha,_Nebraska.jpg", "Gene Leahy Mall after the Omaha RiverFront renovation"],
    ["https://commons.wikimedia.org/wiki/File:Gene_Leahy_Mall_view.jpg", "A current landscape view across Gene Leahy Mall"],
    ["https://commons.wikimedia.org/wiki/File:Lewis_%26_Clark_Landing_Omaha_side.jpg", "Lewis and Clark Landing beside the Missouri River"]
  ],
  "launch-ks-wichita-riverside-park": [
    ["https://www.flickr.com/photos/49481946@N00/4043642384", "A visitor view inside Central Riverside Park in Wichita"],
    ["https://www.flickr.com/photos/53179863@N07/5617514984", "Spring landscape at Central Riverside Park in Wichita"],
    ["https://www.flickr.com/photos/49481946@N00/4043643126", "Autumn foliage and paths at Central Riverside Park in Wichita"]
  ]
};

const manual = {
  "https://commons.wikimedia.org/wiki/File:Gene_Leahy_Mall,_Omaha,_Nebraska.jpg": {
    title: "Gene Leahy Mall, Omaha, Nebraska", creator: "WiinterU", license: "CC0", licenseVersion: "1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", provider: "wikimedia"
  },
  "https://commons.wikimedia.org/wiki/File:Gene_Leahy_Mall_view.jpg": {
    title: "Gene Leahy Mall view", creator: "WiinterU", license: "CC0", licenseVersion: "1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", provider: "wikimedia"
  },
  "https://commons.wikimedia.org/wiki/File:Lewis_%26_Clark_Landing_Omaha_side.jpg": {
    title: "Lewis and Clark Landing Omaha side", creator: "WiinterU", license: "CC0", licenseVersion: "1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", provider: "wikimedia"
  }
};

const output = {
  campaign: research.campaign,
  reviewedAt: checkedAt,
  reviewMethod: "Exact destination/source match, reusable-rights check, and visual-purpose review; outdated Omaha RiverFront imagery was excluded.",
  places: {}
};

for (const [id, selections] of Object.entries(wanted)) {
  const place = research.places[id];
  const current = launch.find((item) => item.id === id);
  const existing = [current?.image, ...(current?.images || [])].filter(Boolean);
  const candidates = selections.map(([source, alt]) => {
    let candidate = place.candidates.find((item) => item.source === source);
    const image = existing.find((item) => item.source === source);
    if (!candidate && image) candidate = {
      title: image.alt || place.name, url: image.url, source: image.source, creator: image.author,
      license: image.license, licenseUrl: image.licenseUrl, provider: "existing-auditmap"
    };
    if (!candidate && manual[source]) candidate = { ...manual[source], source, url: source };
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

fs.writeFileSync(path.join(root, "data/central-plains-photo-selections.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Approved ${Object.values(output.places).reduce((sum, place) => sum + place.candidates.length, 0)} Central Plains images after source review.`);
