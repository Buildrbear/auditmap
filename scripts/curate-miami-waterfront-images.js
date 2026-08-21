#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = require("../data/miami-waterfront-photo-research.json");
const checkedAt = "2026-08-11";
const manual = {
  "frost-science": {
    title: "Phillip and Patricia Frost Museum of Science exterior",
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Frost_Science_Museum_-_Miami_Science_Museum_-_Flickr_-_Knight_Foundation.jpg?width=2000",
    source: "https://commons.wikimedia.org/wiki/File:Frost_Science_Museum_-_Miami_Science_Museum_-_Flickr_-_Knight_Foundation.jpg",
    creator: "Knight Foundation",
    creatorUrl: "https://www.flickr.com/people/79532629@N00",
    license: "CC BY-SA",
    licenseVersion: "2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
    provider: "wikimedia"
  },
  "havana-balcony": {
    title: "Havana's Balcony in Museum Park Miami",
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Havana%27s_Balcony_in_Museum_Park_Miami.jpg?width=2000",
    source: "https://commons.wikimedia.org/wiki/File:Havana%27s_Balcony_in_Museum_Park_Miami.jpg",
    creator: "Elena Weisz",
    creatorUrl: "https://commons.wikimedia.org/wiki/User:Ellawanda",
    license: "CC BY-SA",
    licenseVersion: "4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    provider: "wikimedia"
  },
  "bill-baggs-picnic": {
    title: "Bill Baggs Cape Florida State Park picnic area",
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Bill_Baggs_SP_picnic01.jpg?width=2000",
    source: "https://commons.wikimedia.org/wiki/File:Bill_Baggs_SP_picnic01.jpg",
    creator: "Ebyabe",
    creatorUrl: "https://commons.wikimedia.org/wiki/User:Ebyabe",
    license: "CC BY-SA",
    licenseVersion: "3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    provider: "wikimedia"
  }
};

const wanted = {
  "launch-fl-miami-maurice-a-ferre-park": [
    ["manual", "havana-balcony", "Havana's Balcony public artwork and park landscape"],
    ["manual", "frost-science", "Frost Science exterior beside Maurice A. Ferré Park"],
    ["index", 15, "Pérez Art Museum Miami hanging gardens facing the park"],
    ["index", 21, "Museum terrace, ramp, and waterfront landscape in Maurice A. Ferré Park"]
  ],
  "launch-fl-miami-bayfront-park": [
    ["index", 0, "Bayfront Park palms and Biscayne Bay waterfront"],
    ["index", 1, "Laser Light Tower among Bayfront Park lawns and palms"],
    ["index", 3, "FPL Solar Amphitheater and lawn at Bayfront Park"],
    ["index", 28, "Slide Mantra sculpture in Bayfront Park"]
  ],
  "launch-fl-miami-matheson-hammock-park": [
    ["index", 0, "Matheson Hammock waterfront and Miami skyline across Biscayne Bay"],
    ["index", 2, "Matheson Hammock atoll pool, palms, and bay"],
    ["index", 4, "Boats and docks at Matheson Hammock Marina"],
    ["index", 13, "Guard station and palms beside the Matheson Hammock atoll pool"]
  ],
  "launch-fl-miami-beach-south-pointe-park": [
    ["index", 0, "South Pointe beach viewed from the park pier"],
    ["index", 2, "Dunes, lawn, and skyline at South Pointe Park"],
    ["index", 3, "South Pointe Park Pier over Government Cut"],
    ["index", 8, "South Pointe promenade, lawn, and bayfront light towers"]
  ],
  "launch-fl-miami-beach-lummus-park": [
    ["index", 2, "Palms and park landscape beside Ocean Drive in Lummus Park"],
    ["index", 4, "Lawn and public facility building in Lummus Park"],
    ["index", 7, "Palms, lawn, and refreshment stand in Lummus Park"],
    ["index", 20, "Lummus Park beach, palms, and Ocean Drive skyline"]
  ],
  "launch-fl-key-biscayne-crandon-park": [
    ["index", 1, "Aerial view of the Crandon Park tennis complex and surrounding preserve"],
    ["index", 2, "Palm and beach view at Crandon Park"],
    ["index", 3, "Palm grove and visitor landscape at Crandon Park"],
    ["index", 6, "Changing sandbar and broad shoreline at Crandon Park"]
  ],
  "launch-fl-key-biscayne-bill-baggs-cape-florida-state-park": [
    ["index", 1, "Cape Florida Lighthouse seen across the water"],
    ["index", 2, "Palms, beach, and lighthouse at Bill Baggs Cape Florida State Park"],
    ["index", 9, "Fishing from the Cape Florida beach shoreline"],
    ["manual", "bill-baggs-picnic", "Palm-shaded picnic area at Bill Baggs Cape Florida State Park"]
  ],
  "launch-fl-miami-historic-virginia-key-beach-park": [
    ["index", 5, "Historic Virginia Key Beach Park visitor landscape and building"],
    ["index", 1, "Restored dance floor at Historic Virginia Key Beach Park"],
    ["index", 6, "Miniature railroad at Historic Virginia Key Beach Park"],
    ["index", 7, "Historic carousel pavilion at Virginia Key Beach Park"]
  ]
};

const output = {
  campaign: research.campaign,
  reviewedAt: checkedAt,
  reviewMethod: "Exact-location title and source review plus visual inspection of contact sheets. Unrelated results, event portraits, historic postcards, wildlife-only views, and unlicensed operator images were rejected.",
  places: {}
};

for (const [id, choices] of Object.entries(wanted)) {
  const place = research.places[id];
  const candidates = choices.map(([kind, key, alt]) => {
    const candidate = kind === "manual" ? manual[key] : place.candidates[key];
    if (!candidate) throw new Error(`${place.name}: missing ${kind} selection ${key}`);
    return {
      ...candidate,
      alt,
      reviewStatus: "approved-parent-match",
      reviewedAt: checkedAt,
      reviewNote: "Visual review confirmed that the image depicts the named parent park or a defining destination within it and the recorded license permits reuse."
    };
  });
  output.places[id] = { name: place.name, candidates };
}

fs.writeFileSync(path.join(root, "data/miami-waterfront-photo-selections.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Approved ${Object.values(output.places).reduce((sum, place) => sum + place.candidates.length, 0)} Miami waterfront images after visual review.`);
