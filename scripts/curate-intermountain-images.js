#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = require("../data/intermountain-photo-research.json");
const launch = require("../data/generated/launch-map-places.json");
const checkedAt = "2026-08-08";
const wanted = {
  "launch-id-boise-julia-davis-park": [
    ["https://www.flickr.com/photos/75683070@N00/46388605972", "Julia Davis Park beside the Boise River"],
    ["https://www.flickr.com/photos/42560612@N04/5164578308", "Fall color and open space in Julia Davis Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=75150036", "The Julia Davis Park Rose Garden"],
    ["https://www.flickr.com/photos/28096801@N05/3530475949", "Visitors using the pond at Julia Davis Park"]
  ],
  "launch-id-boise-ann-morrison-park": [
    ["https://commons.wikimedia.org/w/index.php?curid=71713477", "A broad visitor view of Ann Morrison Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=71713484", "The playground at Ann Morrison Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=71713478", "The fountain at Ann Morrison Park"],
    ["https://www.flickr.com/photos/36411430@N03/49883712432", "Dog Island at Ann Morrison Park"]
  ],
  "launch-wa-spokane-riverfront-park": [
    ["https://commons.wikimedia.org/wiki/File:Childhood_Express_Red_Wagon_Spokane.jpg", "The Childhood Express Red Wagon in Riverfront Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=149782220", "The Great Northern Clock Tower in Riverfront Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=149782090", "The Spokane Pavilion in Riverfront Park"],
    ["https://www.flickr.com/photos/59081381@N03/53796311096", "Lower Spokane Falls from Riverfront Park"]
  ],
  "launch-wa-spokane-manito-park": [
    ["https://commons.wikimedia.org/w/index.php?curid=6281527", "Duncan Garden at Manito Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=150334121", "Flower beds and paths in Duncan Garden"],
    ["https://www.flickr.com/photos/14317811@N08/1451362688", "Nishinomiya Tsutakawa Japanese Garden at Manito Park"],
    ["https://www.flickr.com/photos/62005704@N00/7626195716", "A garden bridge in Manito Park's Japanese Garden"]
  ],
  "launch-co-colorado-springs-garden-of-the-gods": [
    ["https://commons.wikimedia.org/w/index.php?curid=153410154", "Balanced Rock at Garden of the Gods"],
    ["https://commons.wikimedia.org/w/index.php?curid=153132240", "Siamese Twins formation at Garden of the Gods"],
    ["https://www.flickr.com/photos/130826934@N07/28691122806", "A broad landscape view across Garden of the Gods"],
    ["https://www.flickr.com/photos/17094005@N00/37735848706", "Siamese Twins at sunset in Garden of the Gods"]
  ],
  "launch-co-colorado-springs-memorial-park": [
    ["https://commons.wikimedia.org/w/index.php?curid=26341284", "Prospect Lake in Memorial Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=26341291", "Memorial Park skatepark"],
    ["https://commons.wikimedia.org/w/index.php?curid=26341287", "Memorial Park Recreation Center"],
    ["https://commons.wikimedia.org/w/index.php?curid=26341283", "The velodrome at Memorial Park"]
  ]
};

const manual = {
  "https://commons.wikimedia.org/wiki/File:Childhood_Express_Red_Wagon_Spokane.jpg": {
    title: "Childhood Express Red Wagon Spokane",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Childhood_Express_Red_Wagon_Spokane.jpg/1920px-Childhood_Express_Red_Wagon_Spokane.jpg",
    creator: "Gabriel Millos",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
    provider: "wikimedia"
  }
};

const output = {
  campaign: research.campaign,
  reviewedAt: checkedAt,
  reviewMethod: "Exact title/source match, reusable-rights check, and visual-purpose review; plant close-ups, unrelated results, repetitive event imagery, and wildlife-only views were excluded.",
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
      title: image.alt || place.name,
      url: image.url,
      source: image.source,
      creator: image.author,
      license: image.license,
      licenseUrl: image.licenseUrl,
      provider: "existing-auditmap"
    };
    if (!candidate && manual[source]) candidate = { ...manual[source], source };
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

fs.writeFileSync(path.join(root, "data/intermountain-photo-selections.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Approved ${Object.values(output.places).reduce((sum, place) => sum + place.candidates.length, 0)} Intermountain images after source review.`);
