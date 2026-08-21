#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const campaign = require("../data/philadelphia-super-enrichment-campaign.json");
const places = require("../data/generated/launch-map-places.json");
const allSubsites = require("../data/generated/all-subsites-ready.json").parks;
const pilotSubsites = require("../data/generated/pilot-subsites-ready.json").parks;
const nationalParents = require("../data/parent-park-information-enrichment-national.json").parks;
const root = path.resolve(__dirname, "..");
const failures = [];
const slugify = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

for (const expected of campaign.places) {
  const place = places.find((item) => item.id === expected.id);
  if (!place) { failures.push(`${expected.name}: missing from map data`); continue; }
  for (const [label, records] of [["all-subsites source", allSubsites], ["pilot-subsites source", pilotSubsites]]) {
    const matches = records.filter((item) => item.id === expected.id);
    if (matches.length !== 1) {
      failures.push(`${expected.name}: expected one ${label} record, found ${matches.length}`);
      continue;
    }
    const sourceRecord = matches[0];
    const sourceImages = [sourceRecord.image, ...(sourceRecord.images || [])].filter((image) => image?.url);
    if (sourceImages.length < (expected.minImages || 4)) failures.push(`${expected.name}: ${label} has only ${sourceImages.length} images`);
    if ((sourceRecord.features || []).length !== expected.subsites.length) failures.push(`${expected.name}: ${label} expected ${expected.subsites.length} subsites, found ${(sourceRecord.features || []).length}`);
    if ((sourceRecord.searchAnswers || []).length < 11) failures.push(`${expected.name}: ${label} has fewer than 11 answers`);
  }
  const nationalParent = nationalParents[expected.id];
  if (!nationalParent) failures.push(`${expected.name}: missing from national parent source`);
  else {
    const nationalImages = [nationalParent.image, ...(nationalParent.additionalImages || [])].filter((image) => image?.url);
    if (nationalImages.length < (expected.minImages || 4)) failures.push(`${expected.name}: national parent source has only ${nationalImages.length} images`);
    if ((nationalParent.searchAnswers || []).length < 11) failures.push(`${expected.name}: national parent source has fewer than 11 answers`);
  }
  const images = [place.image, ...(place.images || [])].filter((image) => image?.url);
  if (images.length < (expected.minImages || 4)) failures.push(`${place.name}: only ${images.length} images`);
  if ((place.features || []).length !== expected.subsites.length) failures.push(`${place.name}: expected ${expected.subsites.length} subsites, found ${(place.features || []).length}`);
  if ((place.searchAnswers || []).length < 11) failures.push(`${place.name}: fewer than 11 answers`);
  for (const feature of place.features || []) {
    if (!feature.details?.images?.[0]?.url) failures.push(`${place.name}/${feature.name}: image missing`);
    if ((feature.details?.searchAnswers || []).length < 9) failures.push(`${place.name}/${feature.name}: fewer than 9 answers`);
    if ((feature.description || "").includes("is a distinct visitor destination")) failures.push(`${place.name}/${feature.name}: generic description remains`);
    if ((feature.description || "").length < 80) failures.push(`${place.name}/${feature.name}: guidance too thin`);
    if (!Number.isFinite(feature.latitude) || !Number.isFinite(feature.longitude)) failures.push(`${place.name}/${feature.name}: invalid coordinates`);
    if (!feature.details?.coordinateSource || !feature.details?.positionQuality) failures.push(`${place.name}/${feature.name}: missing coordinate provenance`);
    const featurePage = path.join(root, "us/pa/philadelphia/parks", place.slug, feature.slug, "index.html");
    if (!fs.existsSync(featurePage)) failures.push(`${place.name}/${feature.name}: page missing`);
    else {
      const featureHtml = fs.readFileSync(featurePage, "utf8");
      for (const text of [feature.name, place.name, "Where should I park", "Are there restrooms", "Are dogs allowed", "Sources", "rel=\"canonical\""]) {
        if (!featureHtml.includes(text)) failures.push(`${place.name}/${feature.name}: raw HTML missing ${text}`);
      }
    }
  }
  const parentPage = path.join(root, "us/pa/philadelphia/parks", slugify(place.name), "index.html");
  if (!fs.existsSync(parentPage)) { failures.push(`${place.name}: page missing`); continue; }
  const html = fs.readFileSync(parentPage, "utf8");
  const parkingQuestion = place.searchAnswers.find((answer) => answer.intentKey === "parking")?.question;
  const restroomQuestion = place.searchAnswers.find((answer) => answer.intentKey === "restroom")?.question;
  for (const text of [place.name, place.address, parkingQuestion, restroomQuestion, "rel=\"canonical\""]) if (text && !html.includes(text)) failures.push(`${place.name}: raw HTML missing ${text}`);
}
const fdr = places.find((place) => place.id === "launch-pa-philadelphia-fdr-park");
for (const phrase of ["Anna C. Verna Playground remains closed", "6 a.m.-9 p.m. from April through October", "two permanent public bathrooms", "tabletop grills and campfires are not allowed"]) if (!JSON.stringify(fdr).includes(phrase)) failures.push(`FDR Park: missing ${phrase}`);
const fdrImageChecks = [["Meadow Lake and FDR Park Boathouse", "FDR_Park_1"], ["FDR Park Skatepark", "FDR_Park_Skatepark_6"], ["American Swedish Historical Museum", "American_Swedish_Museum"], ["Olmsted Overlook and Gazebo", "FDR_Park_2A"]];
for (const [name, token] of fdrImageChecks) {
  const imageSourceUrl = fdr?.features?.find((feature) => feature.name === name)?.details?.imageSourceUrl || "";
  if (!imageSourceUrl.includes(token)) failures.push(`FDR Park/${name}: image does not match destination`);
}
const rittenhouse = places.find((place) => place.id === "launch-pa-philadelphia-rittenhouse-square");
for (const phrase of ["more than 200 trees", "10 p.m. systemwide curfew", "Tuesday market year-round from 10 a.m.-2 p.m.", "there is no playground", "no documented standalone park restroom"]) if (!JSON.stringify(rittenhouse).toLowerCase().includes(phrase.toLowerCase())) failures.push(`Rittenhouse Square: missing ${phrase}`);
for (const [name, sourceToken] of [["Rittenhouse Square Central Plaza and Reflecting Pool", "Rittenhouse_Square_2024"], ["Lion Crushing a Serpent", "Rittenhouse_Square_-_Lion_killing_a_snake"], ["Duck Girl", "Girl_w_duck_Rittenhs_Sq"], ["Billy", "Rittenhouse_Sq_goat"]]) {
  const feature = rittenhouse?.features?.find((item) => item.name === name);
  if (!feature) failures.push(`Rittenhouse Square: missing ${name}`);
  else if (!(feature.details?.imageSourceUrl || "").includes(sourceToken)) failures.push(`Rittenhouse Square/${name}: destination image does not match`);
}
const independence = places.find((place) => place.id === "launch-pa-philadelphia-independence-national-historical-park");
for (const phrase of ["9 a.m.-6 p.m.", "9-9:50 a.m. open house", "$7.50 for adults", "There are no public restrooms in the Liberty Bell Center", "arrive about 30 minutes", "Pets are not allowed inside public buildings", "Washington Square is open 24 hours"]) if (!JSON.stringify(independence).toLowerCase().includes(phrase.toLowerCase())) failures.push(`Independence: missing ${phrase}`);
for (const [name, sourceToken] of [["Independence Visitor Center", "Independence_Visitor_Center_interior"], ["Liberty Bell Center", "Liberty_Bell_View_of_Independence_Hall"], ["Independence Hall and Independence Square", "Independence_National_Historical_Park_(NPS)"], ["Franklin Court and Benjamin Franklin Museum", "Benjamin_Franklin_Museum_in_Philadelphia"], ["President's House Site", "President's_House_Site_overview"], ["Congress Hall", "Congress_Hall_exterior"], ["Old City Hall", "Old_City_Hall_Philadelphia_USA"], ["Washington Square and Tomb of the Unknown Soldier", "Washington_Square_Tomb_of_the_Unknown_Revolutionary_War_Soldier"]]) {
  const feature = independence?.features?.find((item) => item.name === name);
  if (!feature) failures.push(`Independence: missing ${name}`);
  else if (!(feature.details?.imageSourceUrl || "").includes(sourceToken)) failures.push(`Independence/${name}: destination image does not match`);
}
const franklin = places.find((place) => place.id === "launch-pa-philadelphia-franklin-square");
for (const phrase of ["cleared before the ticketed Chinese Lantern Festival", "new expanded restrooms opened in spring 2025", "pets are not permitted on the carousel", "$15 adults and $12 children", "PATCO Station reopened in 2025"]) if (!JSON.stringify(franklin).toLowerCase().includes(phrase.toLowerCase())) failures.push(`Franklin Square: missing ${phrase}`);
for (const [name, sourceToken] of [["Franklin Square Fountain and SquareBurger", "Franklin_Square_Fountain_b"], ["Parx Liberty Carousel", "2013_Franklin_Square_Carousel_from_east"], ["Philly Mini Golf", "Franklin_Square_golf"], ["Franklin Square PATCO Station", "Franklin_Square_head_house"]]) {
  const feature = franklin?.features?.find((item) => item.name === name);
  if (!feature) failures.push(`Franklin Square: missing ${name}`);
  else if (!(feature.details?.imageSourceUrl || "").includes(sourceToken)) failures.push(`Franklin Square/${name}: destination image does not match`);
}
const schuylkill = places.find((place) => place.id === "launch-pa-philadelphia-schuylkill-banks");
for (const phrase of ["4.5 trail miles", "9 a.m.-5 p.m.", "walk your bicycle on the ramp", "Market Street Ramp", "Grays Ferry"]) if (!JSON.stringify(schuylkill).toLowerCase().includes(phrase.toLowerCase())) failures.push(`Schuylkill Banks: missing ${phrase}`);
for (const [name, sourceToken] of [["Schuylkill Banks Boardwalk", "Philadelphia_from_South_Street_Bridge_July_2016_panorama_2"], ["Walnut Street Trail Hub and Dock", "Schuylkill_River_Trail_(Philadelphia)"], ["South Street Bridge Trail Ramp", "Schuylkill_River_Trail_from_the_South_St._bridge"]]) {
  const feature = schuylkill?.features?.find((item) => item.name === name);
  if (!feature) failures.push(`Schuylkill Banks: missing ${name}`);
  else if (!(feature.details?.imageSourceUrl || "").includes(sourceToken)) failures.push(`Schuylkill Banks/${name}: destination image does not match`);
}
const spruce = places.find((place) => place.id === "launch-pa-philadelphia-spruce-street-harbor-park");
for (const phrase of ["Sunday-Thursday 11 a.m.-10 p.m.", "activities and bars close at least 30 minutes", "I-95 CAP construction", "Chiliboats", "Family Fun Day", "not permitted in hammocks or on the barge"]) if (!JSON.stringify(spruce).toLowerCase().includes(phrase.toLowerCase())) failures.push(`Spruce Street Harbor Park: missing ${phrase}`);
for (const [name, sourceToken] of [["Hammock Grove and Lazy Hammock", "Spruce_Street_Harbor_Park"], ["Christopher Columbus Memorial", "Christopher_Columbus_Memorial%2C_Philadelphia_01"]]) {
  const feature = spruce?.features?.find((item) => item.name === name);
  if (!feature) failures.push(`Spruce Street Harbor Park: missing ${name}`);
  else if (!(feature.details?.imageSourceUrl || "").includes(sourceToken)) failures.push(`Spruce Street Harbor Park/${name}: destination image does not match`);
}
const fairmount = places.find((place) => place.id === "launch-pa-philadelphia-fairmount-park");
for (const phrase of ["Lemon Hill park is currently closed", "Wednesday through Saturday, 10 a.m.-5 p.m.", "more than 50 outdoor play structures", "timed ticket and capacity is limited", "second and third Sundays 11 a.m.-4:30 p.m."]) if (!JSON.stringify(fairmount).includes(phrase)) failures.push(`Fairmount Park: missing ${phrase}`);
for (const [name, sourceToken] of [["Lemon Hill", "Lemon_Hill_Mansion"], ["Belmont Plateau", "Belmont_Plateau"], ["Fairmount Water Works", "Fairmount_Water_Works"], ["Smith Memorial Playground and Playhouse", "Smith_Playground"], ["Shofuso Japanese Cultural Center", "Shofuso_Japanese_House"], ["Please Touch Museum and Memorial Hall", "MemorialHallPhila03"]]) {
  const feature = fairmount?.features?.find((item) => item.name === name);
  if (!feature) failures.push(`Fairmount Park: missing ${name}`);
  else if (!(feature.details?.imageSourceUrl || "").includes(sourceToken)) failures.push(`Fairmount Park/${name}: destination image does not match`);
}
const wissahickon = places.find((place) => place.id === "launch-pa-philadelphia-wissahickon-valley-park");
for (const phrase of ["three permanent public restroom locations", "parking or drop-off is prohibited on Livezey Lane", "5.35-mile, broad gravel path", "Swimming and wading are prohibited", "cell service can be limited"]) if (!JSON.stringify(wissahickon).includes(phrase)) failures.push(`Wissahickon Valley Park: missing ${phrase}`);
for (const [name, sourceToken] of [["Valley Green Inn and Trailhead", "Valley_Green_Inn_on_Forbidden_Drive"], ["Forbidden Drive", "Forbidden_Drive_trail_NB"], ["Devil's Pool", "Devil's_Pool"], ["Thomas Mill Covered Bridge", "Thomas_Mill_Covered_Bridge"], ["Fingerspan", "Fingerspan_bridge_fall"]]) {
  const feature = wissahickon?.features?.find((item) => item.name === name);
  if (!feature) failures.push(`Wissahickon Valley Park: missing ${name}`);
  else if (!(feature.details?.imageSourceUrl || "").includes(sourceToken)) failures.push(`Wissahickon Valley Park/${name}: destination image does not match`);
}
const dilworth = places.find((place) => place.id === "launch-pa-philadelphia-dilworth-park");
for (const phrase of ["bathrooms inside City Hall", "full City Hall Broad Street Line accessibility remains an active project", "free Tuesday evening Zumba through October 6", "fountain operates seasonally from April through October"]) if (!JSON.stringify(dilworth).includes(phrase)) failures.push(`Dilworth Park: missing ${phrase}`);
for (const [name, sourceToken] of [["Dilworth Park Fountain and Pulse", "15th_Street_SEPTA_2017_dilworth2"], ["Rothman Orthopaedics Ice Rink", "Dilworth_Park_ice_skating"], ["Albert M. Greenfield Lawn and Wintergarden", "DilworthLawn"], ["Dilworth Park Transit Entrances", "DilworthParkOpening"]]) {
  const feature = dilworth?.features?.find((item) => item.name === name);
  if (!feature) failures.push(`Dilworth Park: missing ${name}`);
  else if (!(feature.details?.imageSourceUrl || "").includes(sourceToken)) failures.push(`Dilworth Park/${name}: destination image does not match`);
}
if (failures.length) { console.error(failures.map((failure) => `- ${failure}`).join("\n")); process.exit(1); }
console.log(`Verified ${campaign.places.length} Philadelphia guides with sourced galleries, ${campaign.places.reduce((sum, place) => sum + place.subsites.length, 0)} full subsites, raw visitor answers, and current closure guidance.`);
