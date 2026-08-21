#!/usr/bin/env node

const campaign = require("../data/miami-super-enrichment-campaign.json");

const failures = [];
const ids = new Set();

if (campaign.places.length !== 8) failures.push(`Expected 8 places, found ${campaign.places.length}.`);

for (const place of campaign.places) {
  if (ids.has(place.id)) failures.push(`${place.name}: duplicate id`);
  ids.add(place.id);
  if (!/^https:\/\//.test(place.officialSource || "")) failures.push(`${place.name}: official source missing`);
  if (!place.address) failures.push(`${place.name}: address missing`);
  if (!place.focus) failures.push(`${place.name}: visitor focus missing`);
  if ((place.subsites || []).length < 3) failures.push(`${place.name}: fewer than 3 planned subsites`);
  const candidateCount = (place.officialImages || []).length +
    (place.commonsImages || []).length +
    Number(place.existingReusableImages || 0);
  if (candidateCount < 3 && !(place.photoQueries || []).length) {
    failures.push(`${place.name}: no path to a 3-image gallery`);
  }
}

const coastal = campaign.releaseStandard?.coastalRequirements || [];
for (const requirement of ["swimming conditions", "storm and lightning guidance", "beach mobility", "capacity closures"]) {
  if (!coastal.includes(requirement)) failures.push(`Missing coastal release requirement: ${requirement}`);
}

const matheson = campaign.places.find((place) => place.id === "launch-fl-miami-matheson-hammock-park");
if (!/modern sourced images/i.test(matheson?.photoWarning || "")) {
  failures.push("Matheson Hammock modern-photo quality gate missing.");
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`Verified Miami campaign: ${campaign.places.length} places, ${campaign.places.reduce((sum, place) => sum + place.subsites.length, 0)} planned subsites, official-source and coastal release gates present.`);
