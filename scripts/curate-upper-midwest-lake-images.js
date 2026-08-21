#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = require("../data/upper-midwest-lake-photo-research.json");
const launch = require("../data/generated/launch-map-places.json");
const checkedAt = "2026-08-11";
const manual = {
  "lake-park-grand-staircase": {
    title: "Lake Park August 2025 3 (Grand Staircase)",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/27/Lake_Park_August_2025_3_%28Grand_Staircase%29.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Lake_Park_August_2025_3_(Grand_Staircase).jpg",
    creator: "Michael Barera",
    creatorUrl: "https://commons.wikimedia.org/wiki/User:Michael_Barera",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    width: 4032,
    height: 3024,
    provider: "wikimedia",
  },
  "veterans-park-lagoon": {
    title: "Milwaukee August 2024 4 (Veterans Park Lagoon)",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f1/Milwaukee_August_2024_4_%28Veterans_Park_Lagoon%29.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Milwaukee_August_2024_4_(Veterans_Park_Lagoon).jpg",
    creator: "Michael Barera",
    creatorUrl: "https://commons.wikimedia.org/wiki/User:Michael_Barera",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    width: 4032,
    height: 3024,
    provider: "wikimedia",
  },
  "veterans-park-lawn": {
    title: "Milwaukee October 2024 2 (Veterans Park)",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f6/Milwaukee_October_2024_2_%28Veterans_Park%29.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Milwaukee_October_2024_2_(Veterans_Park).jpg",
    creator: "Michael Barera",
    creatorUrl: "https://commons.wikimedia.org/wiki/User:Michael_Barera",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    width: 4032,
    height: 3024,
    provider: "wikimedia",
  },
};
const deferred = {
  "launch-wi-madison-olbrich-park": "Only two reusable photographs are clearly attributable to Olbrich Park itself. Current City images do not state reuse permission, and Botanical Gardens media depicts an adjacent destination rather than the park.",
};
const wanted = {
  "launch-wi-milwaukee-lake-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Colonial_Revival_-_Milwaukee,_WI_-_Lake_Park_Pavilion_(1).jpg", "Lake Park Pavilion in Milwaukee"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=21240528", "Lion Bridge in Lake Park"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=72738878", "North Point Lighthouse in Lake Park"],
    ["manual", "lake-park-grand-staircase", "Grand Staircase and Lake Michigan view in Lake Park"]
  ],
  "launch-wi-milwaukee-veterans-park": [
    ["manual", "veterans-park-lagoon", "Veterans Park Lagoon and Milwaukee skyline"],
    ["manual", "veterans-park-lawn", "Open lawn and paved path in Veterans Park"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Milwaukee_Art_Museum_viewed_from_Veterans_Park_in_August_2006_(213528301).jpg", "Milwaukee Art Museum viewed from Veterans Park"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=9488967", "Sunrise over Veterans Park"]
  ],
  "launch-wi-madison-olbrich-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Olbrich_Park_Madison_WI_USA.jpg", "Olbrich Park on Lake Monona"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Capitol_Seen_from_Olbrich_Park_-_panoramio.jpg", "Wisconsin State Capitol seen from Olbrich Park"]
  ],
  "launch-wi-madison-vilas-park": [
    ["research", "https://www.flickr.com/photos/33398244@N00/8340100529", "Winter sunset at Vilas Park"],
    ["research", "https://www.flickr.com/photos/56708607@N04/8427702845", "Bridge over the lagoon in Vilas Park"],
    ["research", "https://www.flickr.com/photos/193316968@N06/52937406382", "Vilas Park Beach on Lake Wingra"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Madison,_WI_11-01-2011_230_(6933387163).jpg", "Effigy mounds overlooking Vilas Park"]
  ],
  "launch-mi-grand-rapids-millennium-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Millennium_beach.jpg", "Millennium Park Beach in Grand Rapids"],
    ["research", "https://www.flickr.com/photos/127444856@N04/41707097111", "Lake and restored landscape at Millennium Park"],
    ["research", "https://www.flickr.com/photos/127444856@N04/40989177164", "Sheltered recreation plaza at Millennium Park"],
    ["research", "https://www.flickr.com/photos/127444856@N04/27838552198", "Shelter and landscape at Millennium Park"]
  ],
  "launch-mi-grand-rapids-riverside-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:MI_Big_Green_Gym,_Riverside_Park,_Grand_Rapids_(8949291464).jpg", "Riverside Park in Grand Rapids"],
    ["research", "https://www.flickr.com/photos/54781600@N05/8948776805", "Community recreation in Riverside Park"],
    ["research", "https://www.flickr.com/photos/54781600@N05/8949403672", "Visitor view in Riverside Park"],
    ["research", "https://www.flickr.com/photos/54781600@N05/8949318018", "Trail and riverfront recreation at Riverside Park"]
  ]
};

const output = { campaign: research.campaign, reviewedAt: checkedAt, reviewMethod: "Exact title/source match plus visual relevance review; reusable license retained from the source record.", places: {} };
for (const [id, selections] of Object.entries(wanted)) {
  const place = research.places[id];
  const current = launch.find((item) => item.id === id);
  const existing = [current?.image, ...(current?.images || [])].filter(Boolean);
  const candidates = selections.map(([kind, key, alt]) => {
    let candidate;
    if (kind === "research") candidate = place.candidates.find((item) => item.source === key);
    if (kind === "manual") candidate = manual[key];
    if (kind === "existing") {
      const image = existing.find((item) => item.source === key);
      if (image) candidate = { title: image.alt || place.name, url: image.url, source: image.source, creator: image.author, license: image.license, licenseUrl: image.licenseUrl, provider: "existing-auditmap" };
    }
    if (!candidate) throw new Error(`${place.name}: selection missing ${kind}/${key}`);
    return { ...candidate, alt, reviewStatus: "approved-destination-match", reviewedAt: checkedAt, reviewNote: `The source identifies ${place.name} or its named subsite and permits reuse under the recorded license.` };
  });
  output.places[id] = {
    name: place.name,
    candidates,
    ...(deferred[id] ? { reviewNote: deferred[id] } : {}),
  };
}
fs.writeFileSync(path.join(root, "data/upper-midwest-lake-photo-selections.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Approved ${Object.values(output.places).reduce((sum, place) => sum + place.candidates.length, 0)} Upper Midwest images after visual review; ${Object.keys(deferred).length} parent remains photo-gated.`);
