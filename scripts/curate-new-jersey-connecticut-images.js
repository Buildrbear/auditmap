#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = require("../data/new-jersey-connecticut-photo-research.json");
const launch = require("../data/generated/launch-map-places.json");
const checkedAt = "2026-08-08";
const wanted = {
  "launch-nj-newark-branch-brook-park": [
    ["research", "https://commons.wikimedia.org/w/index.php?curid=22440827", "Cherry blossoms in Branch Brook Park"],
    ["research", "https://www.flickr.com/photos/22714323@N06/2415624636", "Stone bridge in Branch Brook Park"],
    ["research", "https://www.flickr.com/photos/24029425@N06/8488398145", "Branch Brook Park lake near the athletic fields"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Branch_Brook_Park_Roller_Skating_Center_in_Newark,_2024.jpg", "Branch Brook Park Roller Skating Center"]
  ],
  "launch-nj-newark-weequahic-park": [
    ["research", "https://commons.wikimedia.org/w/index.php?curid=130069828", "Historic rose garden at Weequahic Park"],
    ["research", "https://www.flickr.com/photos/30411166@N04/26052159552", "Contemporary view inside Weequahic Park"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Newarkmonument2013.jpg", "Historic monument building in Weequahic Park"]
  ],
  "launch-nj-jersey-city-liberty-state-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Liberty_State_Park_Bridge_over_the_Morris_Canal_Basin,_Jersey_City_NJ_20250511-jag9889.jpg", "Jersey Avenue bridge into Liberty State Park"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=47513", "Central Railroad of New Jersey Terminal"],
    ["research", "https://www.flickr.com/photos/87922801@N08/25311400993", "Empty Sky 9/11 Memorial"],
    ["research", "https://www.flickr.com/photos/75683070@N00/7238084884", "Statue of Liberty viewed from Liberty State Park"]
  ],
  "launch-nj-jersey-city-lincoln-park": [
    ["research", "https://commons.wikimedia.org/w/index.php?curid=122494969", "Lincoln Park fountain and Jersey City skyline"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=122495004", "Lincoln Park golf course, track, and athletic fields"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=122494989", "Lincoln Park lake and playing fields"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=49282249", "Open lawn at sunset in Lincoln Park"]
  ],
  "launch-ct-new-haven-east-rock-park": [
    ["research", "https://commons.wikimedia.org/w/index.php?curid=175070599", "New Haven skyline from East Rock"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=175070598", "Soldiers and Sailors Monument at East Rock summit"],
    ["research", "https://www.flickr.com/photos/28826830@N00/27310042599", "Historic landscape view of East Rock Park"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Juvenile_red-tailed_hawk_perched_on_a_branch,_East_Rock_Park,_New_Haven,_Connecticut.jpg", "Red-tailed hawk in East Rock Park"]
  ],
  "launch-ct-new-haven-lighthouse-point-park": [
    ["research", "https://commons.wikimedia.org/w/index.php?curid=193681645", "Five Mile Point Light and Lighthouse Point Park"],
    ["research", "https://www.flickr.com/photos/39908901@N06/14173868684", "Beach at Lighthouse Point Park"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=4479740", "Historic carousel at Lighthouse Point Park"],
    ["research", "https://www.flickr.com/photos/8241297@N03/36686570701", "Splash pad at Lighthouse Point Park"]
  ],
  "launch-ct-hartford-bushnell-park": [
    ["research", "https://www.flickr.com/photos/34166194@N00/2290119242", "Bushnell Park landscape in downtown Hartford"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=185109654", "Bushnell Park Carousel horse"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=51017733", "Corning Fountain in Bushnell Park"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=4410934", "Soldiers and Sailors Memorial Arch in Bushnell Park"]
  ],
  "launch-ct-hartford-elizabeth-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Kousa_Dogwood_Tree,_Elizabeth_Park,_West_Hartford,_CT_-_June_23,_2015.jpg", "Kousa dogwood in Elizabeth Park's sunken garden"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Ed_Richardson_with_Dawn_Redwood_at_Elizabeth_Park,_West_Hartford,_CT_6-22-2013.jpg", "Dawn redwood in Elizabeth Park"],
    ["existing", "https://commons.wikimedia.org/wiki/File:Elizabeth_Park,_Hartford,_CT_-_greenhouses_1.jpg", "Historic greenhouses at Elizabeth Park"]
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
fs.writeFileSync(path.join(root, "data/new-jersey-connecticut-photo-selections.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Approved ${Object.values(output.places).reduce((sum, place) => sum + place.candidates.length, 0)} New Jersey and Connecticut images after review.`);
