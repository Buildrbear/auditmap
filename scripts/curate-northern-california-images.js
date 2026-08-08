#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = require("../data/northern-california-photo-research.json");
const launch = require("../data/generated/launch-map-places.json");
const checkedAt = "2026-08-08";

const custom = {
  lakeMerrittCityscape: {
    title: "Lake Merrit. Oakland, Ca.jpg", url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Lake_Merrit._Oakland,_Ca.jpg?width=2000",
    source: "https://commons.wikimedia.org/wiki/File:Lake_Merrit._Oakland,_Ca.jpg", creator: "AliceChAragon", creatorUrl: "https://commons.wikimedia.org/wiki/User:AliceChAragon",
    license: "BY-SA", licenseVersion: "4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", provider: "wikimedia",
    alt: "Lake Merritt reflecting the Oakland skyline"
  },
  redwoodComposite: {
    title: "RedwoodRegional.jpg", url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/RedwoodRegional.jpg?width=1600",
    source: "https://commons.wikimedia.org/wiki/File:RedwoodRegional.jpg", creator: "Binksternet", creatorUrl: "https://commons.wikimedia.org/wiki/User:Binksternet",
    license: "PDM", licenseVersion: "", licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/", provider: "wikimedia",
    alt: "Coast redwoods in Reinhardt Redwood Regional Park"
  },
  frenchTrail: {
    title: "French Trail, Redwood Regional Park.jpg", url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/French_Trail,_Redwood_Regional_Park.jpg?width=2000",
    source: "https://commons.wikimedia.org/wiki/File:French_Trail,_Redwood_Regional_Park.jpg", creator: "Miguel Vieira", creatorUrl: "https://commons.wikimedia.org/",
    license: "BY", licenseVersion: "2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", provider: "wikimedia",
    alt: "French Trail through Reinhardt Redwood Regional Park"
  },
  redwoodCreek: {
    title: "Redwood Creek Confluence.jpg", url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Redwood_Creek_Confluence.jpg?width=1600",
    source: "https://commons.wikimedia.org/wiki/File:Redwood_Creek_Confluence.jpg", creator: "Peter J. Caprio", creatorUrl: "https://commons.wikimedia.org/",
    license: "BY-SA", licenseVersion: "4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", provider: "wikimedia",
    alt: "Redwood Creek confluence in Reinhardt Redwood Regional Park"
  },
  fairytaleTown: {
    title: "Fairytale Town.jpg", url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Fairytale_Town.jpg?width=1600",
    source: "https://commons.wikimedia.org/wiki/File:Fairytale_Town.jpg", creator: "DestinationFearFan", creatorUrl: "https://commons.wikimedia.org/wiki/User:DestinationFearFan",
    license: "BY-SA", licenseVersion: "4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", provider: "wikimedia",
    alt: "Entrance to Fairytale Town in William Land Park"
  },
  discoveryParkCreek: {
    title: "DGP ToneMap (10316545706).jpg", url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/DGP_ToneMap_(10316545706).jpg?width=2000",
    source: "https://commons.wikimedia.org/wiki/File:DGP_ToneMap_(10316545706).jpg", creator: "Max Denisevich", creatorUrl: "https://www.flickr.com/people/9380114@N02",
    license: "BY", licenseVersion: "2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", provider: "wikimedia",
    alt: "Creek and trees near Discovery Park in Sacramento"
  }
};

const wanted = {
  "launch-ca-oakland-lake-merritt": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Lake_Merritt_Oakland_aerial.jpg", "Aerial view of Lake Merritt and central Oakland"],
    ["custom", "lakeMerrittCityscape"],
    ["research", "https://www.flickr.com/photos/56414420@N02/7408985650", "Gardens at Lake Merritt"],
    ["research", "https://www.flickr.com/photos/56414420@N02/7408976734", "A landscaped garden within the Gardens at Lake Merritt"]
  ],
  "launch-ca-oakland-joaquin-miller-park": [
    ["research", "https://www.flickr.com/photos/57292517@N00/2229569877", "Tall trees in Joaquin Miller Park"],
    ["research", "https://www.flickr.com/photos/35034347485@N01/3990958349", "Redwood setting in Joaquin Miller Park"],
    ["research", "https://www.flickr.com/photos/91655741@N00/38432322", "Woodminster Amphitheater seating"],
    ["research", "https://www.flickr.com/photos/15786211@N00/3732693180", "Woodminster Amphitheater in Joaquin Miller Park"]
  ],
  "launch-ca-oakland-redwood-regional-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Redwood_tree_in_Oakland_California_(person_for_comparison)IMG_4881.jpg", "Coast redwood in Reinhardt Redwood Regional Park"],
    ["custom", "redwoodComposite"], ["custom", "frenchTrail"], ["custom", "redwoodCreek"]
  ],
  "launch-ca-san-jose-alum-rock-park": [
    ["research", "https://commons.wikimedia.org/w/index.php?curid=88569659", "Hillside landscape at Alum Rock Park"],
    ["research", "https://www.flickr.com/photos/132545975@N04/26265387772", "Trail landscape in Alum Rock Park"],
    ["research", "https://www.flickr.com/photos/132545975@N04/25755003373", "Creek and canyon scenery in Alum Rock Park"],
    ["research", "https://www.flickr.com/photos/12187063@N02/2460440097", "Visitor view of Alum Rock Park"]
  ],
  "launch-ca-san-jose-kelley-park": [
    ["research", "https://www.flickr.com/photos/43128739@N05/5459868408", "Kelley Park in San Jose"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=17931786", "Historic trolley at History Park in Kelley Park"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=158704329", "History Park within Kelley Park"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=118483984", "Japanese Friendship Garden in Kelley Park"]
  ],
  "launch-ca-san-jose-guadalupe-river-park": [
    ["existing", "https://commons.wikimedia.org/wiki/File:Guadalupe_river_park_visitors.JPG", "Visitors in Guadalupe River Park and Gardens"],
    ["research", "https://www.flickr.com/photos/28156071@N00/3458490361", "Public artwork along Guadalupe River Park"],
    ["research", "https://www.flickr.com/photos/99247795@N00/9683228068", "Cyclist on the Guadalupe River Trail"],
    ["research", "https://www.flickr.com/photos/75938119@N04/14422095954", "Heritage Rose Garden in Guadalupe River Park"]
  ],
  "launch-ca-sacramento-william-land-regional-park": [
    ["research", "https://commons.wikimedia.org/w/index.php?curid=68593563", "William Land Park in Sacramento"],
    ["research", "https://commons.wikimedia.org/w/index.php?curid=53975914", "Landscape in William Land Park"],
    ["research", "https://www.flickr.com/photos/62925370@N08/34612679421", "Mature trees in William Land Park"],
    ["custom", "fairytaleTown"]
  ],
  "launch-ca-sacramento-discovery-park": [
    ["research", "https://commons.wikimedia.org/w/index.php?curid=48786966", "Discovery Park along the Sacramento River"],
    ["research", "https://www.flickr.com/photos/62925370@N08/26590728182", "Confluence in Discovery Park"],
    ["research", "https://www.flickr.com/photos/84263554@N00/43628302802", "American River meeting the Sacramento River"],
    ["custom", "discoveryParkCreek"]
  ],
  "launch-ca-sacramento-capitol-park": [
    ["research", "https://www.flickr.com/photos/75683070@N00/169670068", "California State Capitol viewed from Capitol Park"],
    ["research", "https://www.flickr.com/photos/36989019@N08/5208827221", "World Peace Rose Garden in Capitol Park"],
    ["research", "https://www.flickr.com/photos/28577026@N02/6134931624", "Vietnam Veterans Memorial in Capitol Park"],
    ["research", "https://www.flickr.com/photos/62925370@N08/27067734056", "California Firefighters Memorial in Capitol Park"]
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
    if (kind === "custom") candidate = custom[key];
    if (!candidate) throw new Error(`${place.name}: selection missing ${kind}/${key}`);
    return { ...candidate, alt: alt || candidate.alt, reviewStatus: "approved-destination-match", reviewedAt: checkedAt, reviewNote: `The source identifies ${place.name} or its named subsite and permits reuse under the recorded license.` };
  });
  output.places[id] = { name: place.name, candidates };
}
fs.writeFileSync(path.join(root, "data/northern-california-photo-selections.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Approved ${Object.keys(output.places).length * 4} Northern California images.`);
