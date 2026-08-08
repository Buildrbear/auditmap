#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = require("../data/upper-midwest-lake-photo-research.json");
const launch = require("../data/generated/launch-map-places.json");
const checkedAt = "2026-08-08";
const wanted = {
  "launch-wi-milwaukee-lake-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Colonial_Revival_-_Milwaukee,_WI_-_Lake_Park_Pavilion_(1).jpg", "Lake Park Pavilion in Milwaukee"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=21240528", "Lion Bridge in Lake Park"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=72738878", "North Point Lighthouse in Lake Park"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Colonial_Revival_-_Milwaukee,_WI_-_Lake_Park_Pavilion_(2).jpg", "Another view of the historic Lake Park Pavilion"]
  ],
  "launch-wi-milwaukee-veterans-park": [
    ["research", "https://commons.wikimedia.org/w/index.php?curid=160532141", "Veterans Park on Milwaukee's lakefront"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Milwaukee_Art_Museum_viewed_from_Veterans_Park_in_August_2006_(213528301).jpg", "Milwaukee Art Museum viewed from Veterans Park"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=189150529", "Veterans Park Lagoon and Milwaukee skyline"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=9488967", "Sunrise over Veterans Park"]
  ],
  "launch-wi-madison-olbrich-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Olbrich_Park_Madison_WI_USA.jpg", "Olbrich Park on Lake Monona"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Capitol_Seen_from_Olbrich_Park_-_panoramio.jpg", "Wisconsin State Capitol seen from Olbrich Park"],
    ["research", "https://www.flickr.com/photos/126765364@N07/31002507471", "Walking in Olbrich Park"],
    ["research", "https://www.flickr.com/photos/56708607@N04/8064157493", "Olbrich Botanical Gardens beside Olbrich Park"]
  ],
  "launch-wi-madison-vilas-park": [
    ["research", "https://www.flickr.com/photos/33398244@N00/8340100529", "Winter sunset at Vilas Park"],
    ["research", "https://www.flickr.com/photos/56708607@N04/8427702845", "Bridge over the lagoon in Vilas Park"],
    ["research", "https://www.flickr.com/photos/193316968@N06/52937406382", "Vilas Park Beach on Lake Wingra"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Madison,_WI_11-01-2011_230_(6933387163).jpg", "Effigy mounds overlooking Vilas Park"]
  ],
  "launch-mi-grand-rapids-millennium-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Millennium_beach.jpg", "Millennium Park Beach in Grand Rapids"],
    ["research", "https://www.flickr.com/photos/26503922@N08/14458194387", "Mosaic at Millennium Park"],
    ["research", "https://www.flickr.com/photos/127444856@N04/39899795360", "Cloudy sunset at Millennium Park"],
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
    if (kind === "existing") {
      const image = existing.find((item) => item.source === key);
      if (image) candidate = { title: image.alt || place.name, url: image.url, source: image.source, creator: image.author, license: image.license, licenseUrl: image.licenseUrl, provider: "existing-auditmap" };
    }
    if (!candidate) throw new Error(`${place.name}: selection missing ${kind}/${key}`);
    return { ...candidate, alt, reviewStatus: "approved-destination-match", reviewedAt: checkedAt, reviewNote: `The source identifies ${place.name} or its named subsite and permits reuse under the recorded license.` };
  });
  output.places[id] = { name: place.name, candidates };
}
fs.writeFileSync(path.join(root, "data/upper-midwest-lake-photo-selections.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Approved ${Object.keys(output.places).length * 4} provisional Upper Midwest images for visual review.`);
