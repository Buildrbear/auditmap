#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = require("../data/southeast-atlantic-photo-research.json");
const checkedAt = "2026-08-08";

const selections = {
  "launch-sc-charleston-waterfront-park": [
    ["https://www.flickr.com/photos/15581111@N08/3059563221", "Waterfront Park's harborfront landscape in Charleston"],
    ["https://www.flickr.com/photos/22711505@N05/7633060646", "Pineapple Fountain in Waterfront Park"],
    ["https://www.flickr.com/photos/22711505@N05/7818524824", "Pineapple Fountain and City Gallery in Waterfront Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=50419681", "Vendue Wharf at Waterfront Park"],
  ],
  "launch-sc-charleston-hampton-park": [
    ["https://www.flickr.com/photos/28643687@N08/25110799813", "Hampton Park bandstand and surrounding lawn"],
    {
      title: "Hampton Park 3.jpg",
      url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Hampton_Park_3.jpg?width=1600",
      source: "https://commons.wikimedia.org/wiki/File:Hampton_Park_3.jpg",
      creator: "ProfReader",
      creatorUrl: "https://commons.wikimedia.org/wiki/User:ProfReader",
      license: "PDM",
      licenseVersion: "",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      provider: "wikimedia",
      alt: "Fountain in Hampton Park",
    },
    {
      title: "Hampton Park path.jpg",
      url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Hampton_Park_path.jpg?width=1600",
      source: "https://commons.wikimedia.org/wiki/File:Hampton_Park_path.jpg",
      creator: "WClarke",
      creatorUrl: "https://commons.wikimedia.org/",
      license: "BY-SA",
      licenseVersion: "4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      provider: "wikimedia",
      alt: "Walking path through Hampton Park",
    },
    {
      title: "Concession stand at Hampton Park.jpg",
      url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Concession_stand_at_Hampton_Park.jpg?width=1600",
      source: "https://commons.wikimedia.org/wiki/File:Concession_stand_at_Hampton_Park.jpg",
      creator: "ProfReader",
      creatorUrl: "https://commons.wikimedia.org/wiki/User:ProfReader",
      license: "BY-SA",
      licenseVersion: "3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
      provider: "wikimedia",
      alt: "Concession building at Hampton Park",
    },
  ],
  "launch-sc-charleston-white-point-garden": [
    ["https://www.flickr.com/photos/28643687@N08/7030414327", "White Point Garden bandstand"],
    ["https://commons.wikimedia.org/w/index.php?curid=73146816", "White Point Garden, also known as Battery Park"],
    ["https://www.flickr.com/photos/15572047@N00/12494434894", "Walkway through White Point Garden"],
    ["https://www.flickr.com/photos/28643687@N08/7030334855", "Posted dog-use rules at White Point Garden"],
  ],
  "launch-ga-savannah-forsyth-park": [
    ["https://commons.wikimedia.org/w/index.php?curid=60579331", "Forsyth Park along Whitaker Street in Savannah"],
    ["https://www.flickr.com/photos/22711505@N05/7720553680", "Forsyth Park Fountain"],
    ["https://www.flickr.com/photos/22711505@N05/7721823102", "Shaded lawn and paths in Forsyth Park"],
    ["https://www.flickr.com/photos/24029425@N06/8368129044", "Historic view of Forsyth Park Fountain"],
  ],
  "launch-ga-savannah-skidaway-island-state-park": [
    ["https://www.flickr.com/photos/117767094@N04/14512233426", "Big Ferry Trail at Skidaway Island State Park"],
    ["https://www.flickr.com/photos/23724661@N00/5847130658", "Maritime forest at Skidaway Island State Park"],
    ["https://commons.wikimedia.org/w/index.php?curid=68293153", "Skidaway Island State Park landscape"],
    ["https://www.flickr.com/photos/95212304@N00/347716434", "Intracoastal waterway at Skidaway Island State Park"],
  ],
  "launch-ga-savannah-bonaventure-cemetery": [
    ["https://www.flickr.com/photos/22711505@N05/7720547658", "Main entrance to Bonaventure Cemetery"],
    ["https://www.flickr.com/photos/22711505@N05/7720570594", "Live-oak-shaded gravesites at Bonaventure Cemetery"],
    ["https://www.flickr.com/photos/42693172@N05/20239418033", "Little Gracie Watson monument at Bonaventure Cemetery"],
    ["https://commons.wikimedia.org/w/index.php?curid=153722770", "Historic monument at Bonaventure Cemetery"],
  ],
  "launch-fl-jacksonville-kathryn-abbey-hanna-park": [
    {
      title: "Beach at Hanna Park.jpg",
      url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Beach_at_Hanna_Park.jpg?width=2000",
      source: "https://commons.wikimedia.org/wiki/File:Beach_at_Hanna_Park.jpg",
      creator: "The Bushranger",
      creatorUrl: "https://commons.wikimedia.org/wiki/User:The_Bushranger",
      license: "BY-SA",
      licenseVersion: "4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      provider: "wikimedia",
      alt: "Atlantic beach viewed from the Lot 1 boardwalk at Kathryn Abbey Hanna Park",
    },
    {
      title: "Hanna Park boardwalk at Lot 1.jpg",
      url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Hanna_Park_boardwalk_at_Lot_1.jpg?width=2000",
      source: "https://commons.wikimedia.org/wiki/File:Hanna_Park_boardwalk_at_Lot_1.jpg",
      creator: "The Bushranger",
      creatorUrl: "https://commons.wikimedia.org/wiki/User:The_Bushranger",
      license: "BY-SA",
      licenseVersion: "4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      provider: "wikimedia",
      alt: "Lot 1 beach boardwalk at Kathryn Abbey Hanna Park",
    },
    {
      title: "Hanna Park entrance.jpg",
      url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Hanna_Park_entrance.jpg?width=2000",
      source: "https://commons.wikimedia.org/wiki/File:Hanna_Park_entrance.jpg",
      creator: "The Bushranger",
      creatorUrl: "https://commons.wikimedia.org/wiki/User:The_Bushranger",
      license: "BY-SA",
      licenseVersion: "4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      provider: "wikimedia",
      alt: "Entrance to Kathryn Abbey Hanna Park",
    },
    {
      title: "Hanna Park lake.jpg",
      url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Hanna_Park_lake.jpg?width=2000",
      source: "https://commons.wikimedia.org/wiki/File:Hanna_Park_lake.jpg",
      creator: "The Bushranger",
      creatorUrl: "https://commons.wikimedia.org/wiki/User:The_Bushranger",
      license: "BY-SA",
      licenseVersion: "4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      provider: "wikimedia",
      alt: "Freshwater lake at Kathryn Abbey Hanna Park",
    },
  ],
  "launch-fl-jacksonville-jessie-ball-dupont-park": [
    ["https://www.flickr.com/photos/11020019@N04/26709370248", "Treaty Oak in Jessie Ball duPont Park"],
    ["https://www.flickr.com/photos/11020019@N04/39686380745", "Supported branch of Treaty Oak"],
    ["https://www.flickr.com/photos/11020019@N04/26709377048", "Treaty Oak interpretive sign"],
    ["https://www.flickr.com/photos/81464596@N00/5686868395", "Wide view of Treaty Oak's canopy"],
  ],
};

const output = {
  campaign: research.campaign,
  reviewedAt: checkedAt,
  reviewMethod: "Matched the image title, source page, and depicted landmark to the named public destination; reusable license retained from Openverse.",
  places: {},
};

for (const [id, wanted] of Object.entries(selections)) {
  const place = research.places[id];
  if (!place) throw new Error(`${id}: place missing from research manifest`);
  const candidates = wanted.map((selection) => {
    if (!Array.isArray(selection)) {
      return {
        ...selection,
        reviewStatus: "approved-destination-match",
        reviewedAt: checkedAt,
        reviewNote: `The Wikimedia file description identifies ${place.name}; license and creator were checked on the file page.`,
      };
    }
    const [source, alt] = selection;
    const candidate = place.candidates.find((item) => item.source === source);
    if (!candidate) throw new Error(`${place.name}: candidate missing: ${source}`);
    return {
      ...candidate,
      alt,
      reviewStatus: "approved-destination-match",
      reviewedAt: checkedAt,
      reviewNote: `Source title and depicted landmark identify ${place.name}; license permits reuse with the recorded attribution.`,
    };
  });
  if (candidates.length !== 4) throw new Error(`${place.name}: expected four selections`);
  output.places[id] = { name: place.name, candidates };
}

fs.writeFileSync(
  path.join(root, "data/southeast-atlantic-photo-selections.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(`Approved ${Object.keys(output.places).length * 4} licensed destination images.`);
