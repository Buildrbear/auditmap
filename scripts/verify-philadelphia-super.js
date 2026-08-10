#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const campaign = require("../data/philadelphia-super-enrichment-campaign.json");
const places = require("../data/generated/launch-map-places.json");
const root = path.resolve(__dirname, "..");
const failures = [];
const slugify = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

for (const expected of campaign.places) {
  const place = places.find((item) => item.id === expected.id);
  if (!place) { failures.push(`${expected.name}: missing from map data`); continue; }
  const images = [place.image, ...(place.images || [])].filter((image) => image?.url);
  if (images.length < 4) failures.push(`${place.name}: only ${images.length} images`);
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
if (!JSON.stringify(fdr).includes("closed pending a 2026 safety inspection")) failures.push("FDR Park: current Anna C. Verna Playground closure missing");
const fdrImageChecks = [["Anna C. Verna Playground", "playground"], ["FDR Park skatepark", "skatepark"], ["Meadow Lake and fishing", "fisherman"]];
for (const [name, token] of fdrImageChecks) {
  const imageUrl = fdr?.features?.find((feature) => feature.name === name)?.details?.imageUrl || "";
  if (!imageUrl.includes(token)) failures.push(`FDR Park/${name}: image does not match destination`);
}
const independence = places.find((place) => place.id === "launch-pa-philadelphia-independence-national-historical-park");
for (const phrase of ["$1 service fee", "security", "no restrooms inside the Independence Hall secured area"]) if (!JSON.stringify(independence).toLowerCase().includes(phrase.toLowerCase())) failures.push(`Independence: missing ${phrase}`);
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
if (failures.length) { console.error(failures.map((failure) => `- ${failure}`).join("\n")); process.exit(1); }
console.log(`Verified ${campaign.places.length} Philadelphia guides with sourced galleries, ${campaign.places.reduce((sum, place) => sum + place.subsites.length, 0)} full subsites, raw visitor answers, and current closure guidance.`);
