#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = JSON.parse(fs.readFileSync(path.join(root, "data", "tucson-tulsa-photo-research.json"), "utf8"));
const reviewedAt = "2026-08-08";
const reviewNote = "The source identifies the named destination or an exact park component and permits reuse under the recorded license.";

function researched(placeId, sources, alts) {
  const candidates = research.places[placeId]?.candidates || [];
  return sources.map((source, index) => {
    const candidate = candidates.find((item) => item.source === source);
    if (!candidate) throw new Error(`${placeId}: missing researched candidate ${source}`);
    return { ...candidate, reviewStatus: "approved-destination-match", reviewNote, alt: alts[index], reviewedAt };
  });
}

function commons(candidate) {
  return {
    provider: "wikimedia",
    reviewStatus: "approved-destination-match",
    reviewNote,
    reviewedAt,
    ...candidate,
  };
}

const places = {
  "launch-az-tucson-reid-park": {
    name: "Gene C. Reid Park",
    candidates: [
      researched("launch-az-tucson-reid-park", ["https://www.flickr.com/photos/48804373@N07/7229205396"], ["Cele Peterson Rose Garden in Gene C. Reid Park"])[0],
      researched("launch-az-tucson-reid-park", ["https://www.flickr.com/photos/48804373@N07/8616270649"], ["Hi Corbett Field at Gene C. Reid Park"])[0],
      commons({
        title: "Georges Demeester Performance Center, Landscape zoomed out, November 2014",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Georges_Demeester_Performance_Center%2C_Landscape_zoomed_out%2C_November_2014.JPG/1600px-Georges_Demeester_Performance_Center%2C_Landscape_zoomed_out%2C_November_2014.JPG",
        source: "https://commons.wikimedia.org/wiki/File:Georges_Demeester_Performance_Center,_Landscape_zoomed_out,_November_2014.JPG",
        creator: "Ianmcorvidae",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:Ianmcorvidae",
        license: "CC0",
        licenseVersion: "1.0",
        licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
        alt: "The lawn and stage at Georges DeMeester Outdoor Performance Center",
      }),
      commons({
        title: "Barnum Hill Stream",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Barnum_Hill_Stream.jpg/1600px-Barnum_Hill_Stream.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Barnum_Hill_Stream.jpg",
        creator: "Gatomasgordo",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:Gatomasgordo",
        license: "BY-SA",
        licenseVersion: "4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        alt: "The landscaped stream on Barnum Hill in Gene C. Reid Park",
      }),
    ],
  },
  "launch-az-tucson-rillito-river-park": {
    name: "Rillito River Park",
    candidates: [
      commons({
        title: "Rillito River Park, April 22, 2018",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Rillito_River_Park%2C_April_22%2C_2018_%2839824768570%29.jpg/1600px-Rillito_River_Park%2C_April_22%2C_2018_%2839824768570%29.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Rillito_River_Park,_April_22,_2018_(39824768570).jpg",
        creator: "Robert Nunnally",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:Gurdonark",
        license: "BY",
        licenseVersion: "2.0",
        licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
        alt: "Palo verde trees and the shared-use path at Rillito River Park",
      }),
      commons({
        title: "A short connector from the Rillito River Park to Mountain Avenue",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/A_short_connector_from_the_Rillito_River_Park_to_Mountain_Avenue._%286147797130%29.jpg/1920px-A_short_connector_from_the_Rillito_River_Park_to_Mountain_Avenue._%286147797130%29.jpg",
        source: "https://commons.wikimedia.org/wiki/File:A_short_connector_from_the_Rillito_River_Park_to_Mountain_Avenue._(6147797130).jpg",
        creator: "Nathan Johnson",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:Natefromarizona",
        license: "BY-SA",
        licenseVersion: "2.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
        alt: "The shared-use connector from Rillito River Park to Mountain Avenue",
      }),
      commons({
        title: "Crossing the River Park Gateway Bridge",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Crossing_the_River_Park_Gateway_Bridge._%286147796572%29.jpg/1920px-Crossing_the_River_Park_Gateway_Bridge._%286147796572%29.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Crossing_the_River_Park_Gateway_Bridge._(6147796572).jpg",
        creator: "Nathan Johnson",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:Natefromarizona",
        license: "BY-SA",
        licenseVersion: "2.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
        alt: "Crossing the River Park Gateway Bridge on the Rillito path network",
      }),
      commons({
        title: "Picnic area at the Mountain connection and River Park path",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Picnic_area_where_the_Mountain_connection_meets_the_River_Park_multi-use_path._%286147853576%29.jpg/1920px-Picnic_area_where_the_Mountain_connection_meets_the_River_Park_multi-use_path._%286147853576%29.jpg",
        source: "https://commons.wikimedia.org/wiki/File:Picnic_area_where_the_Mountain_connection_meets_the_River_Park_multi-use_path._(6147853576).jpg",
        creator: "Nathan Johnson",
        creatorUrl: "https://commons.wikimedia.org/wiki/User:Natefromarizona",
        license: "BY-SA",
        licenseVersion: "2.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
        alt: "A picnic area where the Mountain Avenue connector meets the Rillito River Park path",
      }),
    ],
  },
  "launch-ok-tulsa-gathering-place": {
    name: "Gathering Place",
    candidates: researched(
      "launch-ok-tulsa-gathering-place",
      [
        "https://www.flickr.com/photos/53301297@N00/45561725025",
        "https://www.flickr.com/photos/53301297@N00/46474992231",
        "https://www.flickr.com/photos/53301297@N00/46474991311",
        "https://www.flickr.com/photos/53301297@N00/46426789852",
      ],
      [
        "A visitor entrance into Gathering Place in Tulsa",
        "Chapman Adventure Playground at Gathering Place",
        "Peggy's Pond at Gathering Place",
        "ONEOK Boathouse at Gathering Place",
      ],
    ),
  },
  "launch-ok-tulsa-woodward-park": {
    name: "Woodward Park",
    candidates: researched(
      "launch-ok-tulsa-woodward-park",
      [
        "https://commons.wikimedia.org/w/index.php?curid=110949781",
        "https://commons.wikimedia.org/w/index.php?curid=105207221",
        "https://commons.wikimedia.org/w/index.php?curid=2247011",
        "https://www.flickr.com/photos/99535234@N00/3470234556",
      ],
      [
        "Fall color across Woodward Park in Tulsa",
        "The Victorian Conservatory at Woodward Park",
        "The Teaching Garden at Woodward Park",
        "A reflecting pool in Woodward Park",
      ],
    ),
  },
};

const output = {
  campaign: research.campaign,
  reviewedAt,
  reviewMethod: "Exact title and source match, reusable-rights check, destination review, and visitor-value review. Protest coverage, wildlife close-ups, unrelated nearby places, and official images without explicit reuse rights were excluded.",
  places,
};

fs.writeFileSync(path.join(root, "data", "tucson-tulsa-photo-selections.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log("Curated 16 reviewed Tucson and Tulsa destination photographs.");
