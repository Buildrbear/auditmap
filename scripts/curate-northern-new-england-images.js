#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = require("../data/northern-new-england-photo-research.json");
const launch = require("../data/generated/launch-map-places.json");
const checkedAt = "2026-08-08";
const wanted = {
  "launch-ri-providence-roger-williams-park": [
    ["https://commons.wikimedia.org/w/index.php?curid=58170532", "Bandstand and Casino at Roger Williams Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=58170537", "Carousel Village at Roger Williams Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=52420057", "Temple to Music at Roger Williams Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=139356418", "Japanese Garden at Roger Williams Park"]
  ],
  "launch-ri-providence-india-point-park": [
    ["https://commons.wikimedia.org/w/index.php?curid=54338802", "India Point Park waterfront landscape"],
    ["https://commons.wikimedia.org/w/index.php?curid=78785221", "India Point Park lawn and harbor setting"],
    ["https://www.flickr.com/photos/12176869@N00/3576407468", "Visitor view inside India Point Park"],
    ["https://www.flickr.com/photos/64802517@N04/9398434333", "India Point Park waterfront and skyline"]
  ],
  "launch-me-portland-eastern-promenade": [
    ["https://www.flickr.com/photos/7327243@N05/4109170596", "Eastern Promenade overlooking Casco Bay"],
    ["https://commons.wikimedia.org/wiki/File:Call_Box_-_East_Promenade_Trail,_Portland,_Maine.jpg", "Eastern Promenade Trail used by walkers, runners, and cyclists"],
    ["https://commons.wikimedia.org/wiki/File:Eastern_Promenade_IMG_1718.JPG", "Contemporary park view at Eastern Promenade"],
    ["https://www.flickr.com/photos/28826830@N00/38436819044", "Fort Allen Park on the Eastern Promenade"]
  ],
  "launch-me-portland-deering-oaks-park": [
    ["https://commons.wikimedia.org/wiki/File:Deering_Oaks_Park_and_fountain,_Portland,_ME_IMG_1838.JPG", "Deering Oaks Park pond and fountain"],
    ["https://commons.wikimedia.org/wiki/File:Deering_Oaks_(Portland,_ME)_-_IMG_8127.JPG", "Historic landscape at Deering Oaks Park"],
    ["https://www.flickr.com/photos/32041861@N08/8235735679", "Rose Garden in Deering Oaks Park"],
    ["https://www.flickr.com/photos/12357841@N02/15972488678", "Holiday lights and winter paths in Deering Oaks Park"]
  ],
  "launch-vt-burlington-waterfront-park": [
    ["https://www.flickr.com/photos/21283177@N00/9101866788", "Burlington Waterfront Park beside Lake Champlain"],
    ["https://commons.wikimedia.org/wiki/File:Burlington_Discover_Jazz_Festival_Waterfront_Park_Burlington_VT_June_2025_13.jpg", "Discover Jazz Festival at Burlington Waterfront Park"],
    ["https://commons.wikimedia.org/wiki/File:Burlington_Discover_Jazz_Festival_Waterfront_Park_Burlington_VT_June_2025_02.jpg", "Waterfront Park lawn during Burlington's Discover Jazz Festival"]
  ],
  "launch-vt-burlington-oakledge-park": [
    ["https://www.flickr.com/photos/193316968@N06/54538839181", "Accessible path and play area at Oakledge Park"],
    ["https://www.flickr.com/photos/14116968@N00/48197979166", "Oakledge Park beach on Lake Champlain"],
    ["https://commons.wikimedia.org/w/index.php?curid=94511309", "Forever Young accessible treehouse at Oakledge Park"],
    ["https://www.flickr.com/photos/68985180@N00/13455247283", "Blanchard Beach at Oakledge Park"]
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
    if (!candidate) throw new Error(`${place.name}: selection missing ${source}`);
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

fs.writeFileSync(path.join(root, "data/northern-new-england-photo-selections.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Approved ${Object.values(output.places).reduce((sum, place) => sum + place.candidates.length, 0)} Northern New England images after visual review.`);
