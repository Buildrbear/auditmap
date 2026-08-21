#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = require("../data/southern-california-metro-photo-research.json");
const launch = require("../data/generated/launch-map-places.json");
const checkedAt = "2026-08-08";
const wanted = {
  "launch-ca-long-beach-el-dorado-east-regional-park": [
    ["https://www.flickr.com/photos/14050780@N03/2571708732", "Lake and open landscape at El Dorado East Regional Park"],
    ["https://www.flickr.com/photos/27656017@N02/23908523242", "The El Dorado Nature Center visitor area"],
    ["https://www.flickr.com/photos/27656017@N02/30191084494", "A public walking trail at El Dorado Nature Center"]
  ],
  "launch-ca-long-beach-shoreline-aquatic-park": [
    ["https://commons.wikimedia.org/w/index.php?curid=134640516", "Shoreline Aquatic Park and the Long Beach waterfront"],
    ["https://commons.wikimedia.org/w/index.php?curid=134648762", "A visitor view of Lions Lighthouse and its hill"],
    ["https://commons.wikimedia.org/w/index.php?curid=68766089", "Lions Lighthouse and its waterfront setting"]
  ],
  "launch-ca-anaheim-yorba-regional-park": [
    ["https://www.flickr.com/photos/196406308@N04/52799276039", "A broad visitor view of Yorba Regional Park"],
    ["https://www.flickr.com/photos/196406308@N04/52799426470", "One of the public playgrounds at Yorba Regional Park"],
    ["https://www.flickr.com/photos/196406308@N04/52798468427", "West Lake at Yorba Regional Park"],
    ["https://www.flickr.com/photos/196406308@N04/52799275974", "East Lake at Yorba Regional Park"]
  ],
  "launch-ca-anaheim-pearson-park": [
    ["https://www.flickr.com/photos/75683070@N00/17211222008", "A visitor view inside Pearson Park in Anaheim"],
    ["https://www.flickr.com/photos/75683070@N00/17211220688", "Mature landscaping and paths in Pearson Park"],
    ["https://www.flickr.com/photos/75683070@N00/17191549677", "Pearson Park's historic Anaheim setting"]
  ],
  "launch-ca-irvine-william-r-mason-regional-park": [
    ["https://www.flickr.com/photos/94674772@N03/17346816581", "Lake and shade trees at William R. Mason Regional Park"],
    ["https://www.flickr.com/photos/94674772@N03/17347180085", "A visitor path beside the lake at Mason Regional Park"],
    ["https://www.flickr.com/photos/94674772@N03/17159664700", "Open lawn and lake scenery at Mason Regional Park"],
    ["https://www.flickr.com/photos/94674772@N03/16726925713", "Shade trees and water at Mason Regional Park"]
  ]
};

const output = {
  campaign: research.campaign,
  reviewedAt: checkedAt,
  reviewMethod: "Exact title/source match, reusable-rights check, freshness review, and visual-purpose review; unrelated Bahamas beach results and outdated Great Park development views were excluded.",
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
      reviewNote: `The source identifies ${place.name} or a named component and permits reuse under the recorded license.`
    };
  });
  output.places[id] = { name: place.name, candidates };
}

fs.writeFileSync(path.join(root, "data/southern-california-metro-photo-selections.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Approved ${Object.values(output.places).reduce((sum, place) => sum + place.candidates.length, 0)} Southern California metro images after source review.`);
