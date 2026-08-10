#!/usr/bin/env node
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const args = Object.fromEntries(process.argv.slice(2).map((value, index, list) => value.startsWith("--") ? [value.slice(2), list[index + 1]] : null).filter(Boolean));
for (const key of ["campaign", "selections", "coordinates", "images", "addresses"]) if (!args[key]) throw new Error(`Missing --${key}`);
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const campaign = read(args.campaign);
const selections = read(args.selections);
const coordinates = read(args.coordinates).places;
const galleries = read(args.images).places;
const addresses = read(args.addresses);
const checkedAt = campaign.checkedAt;
const slug = (value) => String(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const upsert = (data, park) => {
  const index = data.parks.findIndex((item) => item.id === park.id);
  if (index >= 0) data.parks[index] = park;
  else data.parks.push(park);
};
const stable = (parent, child) => {
  const bytes = crypto.createHash("sha256").update(`auditmap:${parent}:${child}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

function answer(intentKey, question, text, source, sourceLabel, verifiedAt = checkedAt) {
  return {
    intentKey,
    question,
    answer: text,
    source,
    sourceLabel,
    verifiedAt,
    freshnessClass: ["hours", "parking", "need-to-know"].includes(intentKey) ? "fast" : "slow",
    status: "verified",
  };
}

function parentAnswer(parent, intent, alternate) {
  return (parent.searchAnswers || []).find((item) => item.intentKey === intent)
    || (alternate ? (parent.searchAnswers || []).find((item) => item.intentKey === alternate) : null);
}

function inherited(parent, intent, alternate, fallback) {
  return parentAnswer(parent, intent, alternate)?.answer || fallback;
}

function inheritedSource(parent, intent, alternate, source, sourceLabel) {
  const item = parentAnswer(parent, intent, alternate);
  return { source: item?.source || source, sourceLabel: item?.sourceLabel || sourceLabel };
}

function featureAnswers(parent, feature) {
  const source = feature.source;
  const sourceLabel = feature.sourceLabel;
  const verifiedAt = feature.checkedAt || checkedAt;
  const arrival = `Navigate to the exact ${feature.name} pin rather than the general ${parent.name} marker. ${feature.needToKnow}`;
  const parkingSource = inheritedSource(parent, "parking", "entrance", source, sourceLabel);
  const restroomSource = inheritedSource(parent, "restroom", null, source, sourceLabel);
  const accessibilitySource = inheritedSource(parent, "accessibility", "trail-surface", source, sourceLabel);
  const dogSource = inheritedSource(parent, "dog-area", null, source, sourceLabel);
  const familySource = inheritedSource(parent, "playground", null, source, sourceLabel);
  return [
    answer("location", `Where exactly is ${feature.name}?`, `${feature.summary} ${arrival}`, source, sourceLabel, verifiedAt),
    answer("parking", `Where should I park for ${feature.name}?`, `${inherited(parent, "parking", "entrance", "Use the closest legal destination-specific parking or transit access.")} ${arrival}`, parkingSource.source, parkingSource.sourceLabel, verifiedAt),
    answer("hours", `When is ${feature.name} open?`, feature.hours, source, sourceLabel, verifiedAt),
    answer("restroom", `Are there restrooms near ${feature.name}?`, inherited(parent, "restroom", null, "Restroom availability varies; identify an open staffed facility before arriving."), restroomSource.source, restroomSource.sourceLabel, verifiedAt),
    answer("fees", `What fees apply at ${feature.name}?`, feature.cost, source, sourceLabel, verifiedAt),
    answer("accessibility", `How accessible is ${feature.name}?`, inherited(parent, "accessibility", "trail-surface", "Check the official destination page for current accessible routes and services."), accessibilitySource.source, accessibilitySource.sourceLabel, verifiedAt),
    answer("dogs", `Are dogs allowed at ${feature.name}?`, `${inherited(parent, "dog-area", null, "Follow posted pet rules.")} Separately operated buildings, beaches, gardens, and attractions can set stricter rules.`, dogSource.source, dogSource.sourceLabel, verifiedAt),
    answer("family", `Is ${feature.name} useful for a family visit?`, `${feature.summary} ${inherited(parent, "playground", null, "Match the visit to the child's needs and supervise around roads, water, trails, and structures.")}`, familySource.source, familySource.sourceLabel, verifiedAt),
    answer("need-to-know", `What should I know before visiting ${feature.name}?`, feature.needToKnow, source, sourceLabel, verifiedAt),
  ];
}

function makeFeature(parent, selected, point, images) {
  const featureSlug = slug(selected.name);
  const id = stable(parent.id, featureSlug);
  const baseImage = images[selected.imageIndex];
  if (!baseImage) throw new Error(`${parent.name}/${selected.name}: image index ${selected.imageIndex} missing`);
  const image = {
    ...baseImage,
    featureId: id,
    latitude: point.latitude,
    longitude: point.longitude,
    positionQuality: point.positionQuality,
    alt: `${selected.name} at ${parent.name}`,
  };
  const informationCheckedAt = selected.checkedAt || checkedAt;
  return {
    id,
    slug: featureSlug,
    name: selected.name,
    feature_type: "destination",
    description: selected.summary,
    latitude: point.latitude,
    longitude: point.longitude,
    details: {
      category: "destination",
      includeInParentGallery: true,
      address: parent.address,
      hours: selected.hours,
      cost: selected.cost,
      accessibility: parent.accessibility,
      locationContext: selected.summary,
      needToKnow: selected.needToKnow,
      informationSourceLabel: selected.sourceLabel,
      informationSourceUrl: selected.source,
      informationCheckedAt,
      coordinateSource: point.coordinateSource,
      positionQuality: point.positionQuality,
      boundaryExceptionReason: point.boundaryExceptionReason,
      imageUrl: image.url,
      imageSourceUrl: image.source,
      imageAuthor: image.author,
      imageLicense: image.license,
      imageAlt: image.alt,
      images: [image],
      searchAnswers: featureAnswers(parent, selected),
    },
    source_label: selected.sourceLabel,
    source_url: selected.source,
    verified_at: informationCheckedAt,
  };
}

(() => {
  const all = read("data/generated/all-subsites-ready.json");
  const pilot = read("data/generated/pilot-subsites-ready.json");
  const national = read("data/parent-park-information-enrichment-national.json");
  const campaignParents = read("data/parent-park-information-enrichment-campaign.json");
  const launch = read("data/generated/launch-map-places.json");
  const locations = read("data/launch-location-overrides.json");
  for (const scope of campaign.places) {
    if (scope.deferRelease) {
      console.log(`${scope.name}: deferred until destination-specific reusable photography clears review`);
      continue;
    }
    const launchRecord = launch.find((item) => item.id === scope.id);
    const parentSource = national.parks[scope.id] || campaignParents.parks[scope.id] || launchRecord;
    const existingReady = all.parks.find((item) => item.id === scope.id);
    if (!launchRecord) throw new Error(`${scope.name}: launch source record missing`);
    if (!addresses[scope.id]) throw new Error(`${scope.name}: reviewed address missing`);
    const existing = {
      ...launchRecord,
      ...parentSource,
      ...existingReady,
      id: scope.id,
      name: scope.name,
      city: scope.city,
      state: scope.state,
      address: addresses[scope.id],
      searchAnswers: [launchRecord.searchAnswers, parentSource.searchAnswers, existingReady?.searchAnswers]
        .filter(Array.isArray)
        .sort((left, right) => right.length - left.length)[0] || [],
    };
    const images = galleries[scope.id]?.images || [];
    const minimumImages = Number(scope.minimumImages || 4);
    if (images.length < minimumImages || images.length > 4) throw new Error(`${scope.name}: expected ${minimumImages}-4 reviewed images`);
    const approved = selections.places[scope.id] || [];
    const features = approved.map((selected) => {
      const point = coordinates[scope.id]?.[slug(selected.name)];
      if (!point) throw new Error(`${scope.name}/${selected.name}: reviewed coordinate missing`);
      return makeFeature(existing, selected, point, images);
    });
    const featureSources = approved.map((item) => ({ label: item.sourceLabel, url: item.source }));
    const sources = [...(existing.sources || [{ label: existing.sourceLabel || scope.operator, url: existing.source || scope.source }]), ...featureSources]
      .filter((item, index, list) => item?.url && list.findIndex((other) => other.url === item.url) === index);
    const queue = selections.researchQueue[scope.id] ? [selections.researchQueue[scope.id]] : [];
    const record = {
      ...existing,
      image: images[0],
      images: images.slice(1),
      sources,
      features,
      likelySubsites: features.length > 0,
      publishStatus: features.length ? "super-enriched" : "sourced-parent-guide",
      researchQueue: queue,
      verifiedAt: checkedAt,
    };
    upsert(all, record);
    upsert(pilot, record);
    const mergedParentProfile = {
      ...(national.parks[scope.id] || {}),
      ...(campaignParents.parks[scope.id] || {}),
    };
    for (const parentData of [national, campaignParents]) {
      parentData.parks[scope.id] = {
        ...mergedParentProfile,
        address: addresses[scope.id],
        image: images[0],
        additionalImages: images.slice(1),
        replaceImages: true,
        sources,
        verifiedAt: checkedAt,
      };
    }
    const location = locations.find((item) => item.id === scope.id);
    if (location) location.address = addresses[scope.id];
    console.log(`${scope.name}: ${images.length} photos, ${features.length} publishable subsites, ${(record.searchAnswers || []).length} preserved parent answers`);
  }
  write("data/generated/all-subsites-ready.json", all);
  write("data/generated/pilot-subsites-ready.json", pilot);
  write("data/parent-park-information-enrichment-national.json", national);
  write("data/parent-park-information-enrichment-campaign.json", campaignParents);
  write("data/launch-location-overrides.json", locations);
})();
