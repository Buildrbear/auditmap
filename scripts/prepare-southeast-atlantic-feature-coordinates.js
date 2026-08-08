#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/southeast-atlantic-super-enrichment-campaign.json");
const inside = require("../data/generated/southeast-atlantic-in-boundary-map-features.json");
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const reviewed = {
  "launch-sc-charleston-waterfront-park": {
    "pineapple-fountain": "way/1356302855", "vendue-fountain": "way/408085455",
    "charleston-harbor-interpretive-marker": "node/12618614001", "robert-smalls-marker": "node/12674245093",
    "charleston-waterfront-park-dedication-plaque": "node/13136871000", "north-echo-rock": "node/13139706614",
    "central-echo-rock": "node/13139853472", "south-echo-rock": "node/13139853568"
  },
  "launch-sc-charleston-hampton-park": {
    "rose-pavilion": "way/38653055", "denmark-vesey-monument": "node/13535433963",
    "first-memorial-day-memorial": "node/13535434162", "hampton-park-fountain": "node/7879665586",
    "parcourse-fitcircuit": "way/1475410305", "mary-murray-drive": "way/38653061",
    "hampton-park-picnic-shelter": "way/255624255"
  },
  "launch-sc-charleston-white-point-garden": {
    "martha-fort-williams-memorial-bandstand": "way/1353172053", "william-gilmore-simms-monument": "node/1451228385",
    "civil-war-torpedo-boatmen-memorial": "node/4820588423", "william-moultrie-statue": "node/4820414608",
    "defenders-of-fort-moultrie-monument": "node/12854266442", "confederate-defenders-monument": "node/5895553785",
    "uss-amberjack-memorial": "node/12520802399", "white-point-garden-cannon-collection": "node/12520802337"
  },
  "launch-ga-savannah-forsyth-park": {
    "forsyth-park-fountain": "way/334561390", "fragrant-garden": "way/453436984",
    "forsyth-park-amphitheater": "way/950239152", "forsyth-park-north-playground": "way/585451248",
    "forsyth-park-south-playground": "way/585451247", "civil-war-memorial": "node/3698964602",
    "forsyth-park-tennis-courts": "way/316971427", "forsyth-park-basketball-courts": "way/316971426"
  },
  "launch-ga-savannah-skidaway-island-state-park": {
    "sandpiper-trail-loop": "way/288580228", "big-ferry-trail-loop": "way/306627218",
    "avian-loop-trail": "way/290274925", "observation-tower": "way/1019350781",
    "skidaway-island-campground": "way/868482153", "skidaway-island-playground": "way/1202784508",
    "skidaway-meadow": "node/8095253956", "skidaway-narrows-viewpoint": "node/2938259776"
  },
  "launch-fl-jacksonville-kathryn-abbey-hanna-park": {
    "kids-splash-park": "way/457293743", "hanna-park-lot-1-beach-access": "way/457241382",
    "hanna-park-freshwater-lake": "way/457293768", "hanna-park-campground": "way/10871699",
    "south-loop-trail": "way/368877535", "z-trail": "way/368877547",
    "reservable-shelter-1": "way/457241362", "hanna-park-p8-recreation-area": "way/457235111"
  },
  "launch-fl-jacksonville-jessie-ball-dupont-park": {
    "treaty-oak": "node/5637868194", "urban-trees-interpretive-marker": "node/10658468613",
    "jessie-ball-dupont-park-information-board": "node/10658468768"
  }
};

const output = { checkedAt: campaign.checkedAt, places: {} };
for (const place of campaign.places) {
  const pool = inside.places[place.id]?.candidates || [];
  const records = {};
  for (const name of place.subsites) {
    const key = slug(name);
    const suffix = reviewed[place.id]?.[key];
    const candidate = pool.find((item) => item.sourceUrl.endsWith(suffix || "--missing--"));
    if (!candidate) throw new Error(`${place.name}/${name}: reviewed map object missing`);
    records[key] = {
      name, latitude: candidate.latitude, longitude: candidate.longitude,
      displayName: candidate.name || `${name} mapped feature`,
      source: "OpenStreetMap feature inside reviewed park boundary", sourceUrl: candidate.sourceUrl,
      boundarySource: inside.places[place.id].boundarySource,
      quality: "reviewed-public-map-placement", reviewStatus: "approved-feature-and-boundary-match",
      reviewedAt: campaign.checkedAt
    };
  }
  output.places[place.id] = records;
  console.log(`${place.name}: ${Object.keys(records).length} approved feature coordinates`);
}
fs.writeFileSync(path.join(root, "data/generated/southeast-atlantic-feature-coordinates.json"), `${JSON.stringify(output, null, 2)}\n`);
