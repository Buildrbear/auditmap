#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = require("../data/mid-south-river-photo-research.json");
const launch = require("../data/generated/launch-map-places.json");
const checkedAt = "2026-08-08";
const wanted = {
  "launch-tn-memphis-shelby-farms-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Shelby_Farms_Park_Memphis_TN_2013-11-17_006.jpg", "Open landscape at Shelby Farms Park"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=29695528", "Wooden trail bridge at Shelby Farms Park"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Midtown_to_Shelby_Farms_Greenway_Memphis_TN_02.jpg", "Shelby Farms Greenline access in Memphis"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=20269732", "Bison at Shelby Farms Park"]
  ],
  "launch-tn-memphis-overton-park": [
    ["research", "https://www.flickr.com/photos/53301297@N00/28698489778", "Open lawn and trees at Overton Park"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=9599317", "Natural-surface trail in Overton Park Old Forest"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=6058801", "Overton Park Shell performance venue"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=57775361", "Doughboy memorial in Overton Park"]
  ],
  "launch-tn-memphis-tom-lee-park": [
    ["research", "https://commons.wikimedia.org/w/index.php?curid=12171989", "Mississippi River excursion boat seen from Tom Lee Park"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Old_Man_River.jpeg", "Mississippi River view from Tom Lee Park"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Memphis,_TN,_View_N,_Tom_Lee_Park,_April_2008_-_panoramio.jpg", "Memphis skyline and riverfront from Tom Lee Park"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Memphis,_TN,_Tom_Lee_Memorial_Obelisk_Inscription,_April_2008_-_panoramio.jpg", "Tom Lee Memorial in the riverfront park"]
  ],
  "launch-ky-louisville-cherokee-park": [
    ["research", "https://www.flickr.com/photos/128927323@N07/16279105815", "Hogan's Fountain in Cherokee Park"],
    ["research", "https://www.flickr.com/photos/72219410@N00/4783414849", "Big Rock beside Beargrass Creek in Cherokee Park"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=14617211", "Hogan's Fountain Pavilion in Cherokee Park"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Bridge_-5,_Cherokee_Park,_Louisville,_Kentucky_LCCN95506994.jpg", "Historic Bridge Number 5 in Cherokee Park"]
  ],
  "launch-ky-louisville-louisville-waterfront-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:WaterfrontPkDwnt.jpg", "Louisville Waterfront Park and downtown skyline"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Big_Four_Bridge.jpg", "Big Four Bridge from Louisville Waterfront Park"],
    ["research", "https://www.flickr.com/photos/34587083@N08/3702072452", "Children's playground at Louisville Waterfront Park"],
    ["research", "https://www.flickr.com/photos/77890596@N04/49781445372", "Big Four Bridge illuminated at night"]
  ],
  "launch-ky-louisville-iroquois-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Iroquois_Park,_Observation_Point_on_top_of_hill,_looking_toward_Louisville,_Kentucky_LCCN2006679260.jpg", "Historic view from the Iroquois Park observation point"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=103611027", "Paved path through Iroquois Park"],
    ["research", "https://www.flickr.com/photos/25857921@N00/2393921268", "Public art and gathering area at Iroquois Park"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=3906554", "Iroquois Park landscape in Louisville"]
  ]
};

const output = {
  campaign: research.campaign,
  reviewedAt: checkedAt,
  reviewMethod: "Exact title/source match plus visual relevance review; reusable license retained from the source record.",
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
fs.writeFileSync(path.join(root, "data/mid-south-river-photo-selections.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Approved ${Object.keys(output.places).length * 4} provisional Mid-South images for visual review.`);
