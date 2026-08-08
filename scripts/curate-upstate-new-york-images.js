#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = require("../data/upstate-new-york-photo-research.json");
const launch = require("../data/generated/launch-map-places.json");
const checkedAt = "2026-08-08";
const wanted = {
  "launch-ny-buffalo-delaware-park": [
    ["research", "https://commons.wikimedia.org/w/index.php?curid=89515840", "Cherry blossoms and visitors at Delaware Park"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=108727126", "Delaware Park Rose Garden in bloom"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=124958506", "Japanese Garden at Delaware Park"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=106482981", "Marcy Casino beside Hoyt Lake"]
  ],
  "launch-ny-buffalo-outer-harbor-and-lakeside-complex": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Outbound_Skyway,_Buffalo,_New_York_-_20211119.jpg", "Buffalo Outer Harbor seen from the Skyway"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Outer_Harbor_Getaway,_Buffalo,_New_York_-_20200601.jpg", "Downtown Buffalo skyline from the Outer Harbor"],
    ["research", "https://www.flickr.com/photos/21608680@N00/20647683311", "Lake Erie waterfront at Buffalo Outer Harbor"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=122710056", "Kites flying at Wilkeson Pointe"]
  ],
  "launch-ny-rochester-highland-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Rochester_NY_Highland_Park_2001.jpeg", "Garden landscape in Highland Park"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Rochester_NY_Highland_Park_Lamberton_Conservatory.jpeg", "Lamberton Conservatory in Highland Park"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=118457679", "Lilac Gate area in Highland Park"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=124519690", "Frederick Douglass statue in Highland Park"]
  ],
  "launch-ny-rochester-genesee-valley-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:SenecaChief2025BicentennialVoyageRochesterMeetingTheGeneseeRiverB.jpg", "Erie Canal meeting the Genesee River in Genesee Valley Park"],
    ["existing", "https://commons.wikimedia.org/wiki/File:SenecaChief2025BicentennialVoyageRochesterProceedingUpTheGeneseeRiverA.jpg", "Boat traveling through the Genesee River and Erie Canal junction"],
    ["existing", "https://commons.wikimedia.org/wiki/File:SenecaChief2025BicentennialVoyageRochesterProceedingUpTheGeneseeRiverB.jpg", "Genesee River waterway landscape in the park"]
  ],
  "launch-ny-albany-washington-park": [
    ["research", "https://www.flickr.com/photos/7327243@N05/5152621594", "Washington Park Lake in autumn"],
    ["research", "https://www.flickr.com/photos/7327243@N05/5152001985", "Washington Park Lake House beside the water"],
    ["research", "https://www.flickr.com/photos/7327243@N05/5152006433", "Walking path beside Washington Park Lake"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=117916704", "King Memorial Fountain in Washington Park"]
  ],
  "launch-ny-albany-corning-preserve": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Livingston_Avenue_Bridge_Viewed_from_Corning_Preserve_-_Albany,_New_York.png", "Livingston Avenue Bridge viewed from Corning Preserve"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Agents_House_from_Albany%27s_Corning_Preserve.jpg", "Hudson River view from the Corning Preserve boat launch"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Corning_Preserve_Albany.jpg", "Corning Preserve beside the Hudson River"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=10714236", "Hudson River Way pedestrian bridge to Corning Preserve"]
  ]
};

const output = {
  campaign: research.campaign,
  reviewedAt: checkedAt,
  reviewMethod: "Exact title/source match plus visual relevance review; reusable license retained from the source record.",
  places: {}
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
        provider: "existing-auditmap"
      };
    }
    if (!candidate) throw new Error(`${place.name}: selection missing ${kind}/${key}`);
    return {
      ...candidate,
      alt,
      reviewStatus: "approved-destination-match",
      reviewedAt: checkedAt,
      reviewNote: `The source identifies ${place.name} or its named subsite and permits reuse under the recorded license.`
    };
  });
  output.places[id] = { name: place.name, candidates };
}

fs.writeFileSync(path.join(root, "data/upstate-new-york-photo-selections.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Approved ${Object.values(output.places).reduce((sum, place) => sum + place.candidates.length, 0)} Upstate New York images after visual review.`);
