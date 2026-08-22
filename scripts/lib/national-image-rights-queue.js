const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { hasDocumentedReuseRights } = require("./image-rights");

const IMAGE_PACKET_TYPE = "image-rights-reconciliation";
const ACTIVE_IMAGE_CLAIM_STATUSES = new Set(["claimed", "submitted", "changes-requested"]);

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function walkPlacePages(directory, output = []) {
  if (!fs.existsSync(directory)) return output;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walkPlacePages(filePath, output);
    else if (entry.name === "index.html") output.push(filePath);
  }
  return output;
}

function parsePlacePage(filePath, rootDirectory) {
  const html = fs.readFileSync(filePath, "utf8");
  if (!html.includes('data-page="place"')) return null;
  const match = html.match(
    /<script id="search-place-data" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) throw new Error(`Place page is missing search-place-data: ${filePath}`);
  let place;
  try {
    place = JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`Place page contains invalid search-place-data: ${filePath}: ${error.message}`);
  }
  const route = `/${path.relative(rootDirectory, path.dirname(filePath)).split(path.sep).join("/")}`;
  return {
    id: place.id || route,
    path: route,
    name: place.name || path.basename(route),
    city: place.city || "Unknown",
    state: String(place.state || "US").toUpperCase(),
    kind: place.parentId ? "subsite" : "parent",
    parentId: place.parentId || null,
    image: place.image || null,
  };
}

function collectPlacePages(rootDirectory) {
  return walkPlacePages(path.join(rootDirectory, "us"))
    .map((filePath) => parsePlacePage(filePath, rootDirectory))
    .filter(Boolean)
    .sort((left, right) => left.path.localeCompare(right.path));
}

function imageStorage(url) {
  const value = String(url || "");
  if (!value) return "missing";
  if (value.startsWith("/assets/")) return "local";
  if (value.startsWith("/_vercel/image?")) {
    try {
      const original = new URL(value.replaceAll("&amp;", "&"), "https://www.auditmap.org")
        .searchParams.get("url") || "";
      return original.startsWith("/assets/") ? "local" : "remote";
    } catch {
      return "remote";
    }
  }
  return /^https?:/i.test(value) ? "remote" : "local";
}

function rightsGap(image) {
  if (!image?.url) return "missing-image";
  if (!image.source || !image.author || !image.license || !image.alt) {
    return "incomplete-rights-metadata";
  }
  return "reuse-rights-not-documented";
}

function recommendedAction(gap) {
  if (gap === "missing-image") {
    return "Find a real destination-matched image with explicit reusable rights and complete attribution.";
  }
  if (gap === "incomplete-rights-metadata") {
    return "Complete the source, creator, license and alt fields from authoritative evidence, or replace the image with reusable media.";
  }
  return "Document an explicit reusable license or permission for the exact image, or replace it; official hosting and attribution alone do not grant reuse rights.";
}

function clusterKey(record) {
  if (!record.image?.url) return JSON.stringify(["missing-image", record.path]);
  return JSON.stringify([
    record.image.url || "",
    record.image.source || "",
    record.image.author || "",
    record.image.license || "",
  ]);
}

function clusterId(key) {
  return `image-rights-${crypto.createHash("sha256").update(key).digest("hex").slice(0, 12)}`;
}

function buildRightsClusters(placePages) {
  const clusters = new Map();
  for (const record of placePages) {
    if (hasDocumentedReuseRights(record.image)) continue;
    const key = clusterKey(record);
    let cluster = clusters.get(key);
    if (!cluster) {
      const id = clusterId(key);
      cluster = {
        id,
        gap: rightsGap(record.image),
        state: record.state,
        city: record.city,
        citySlug: slugify(record.city),
        storage: imageStorage(record.image?.url),
        image: {
          url: record.image?.url || null,
          source: record.image?.source || null,
          author: record.image?.author || null,
          license: record.image?.license || null,
          alt: record.image?.alt || null,
        },
        recommendedAction: recommendedAction(rightsGap(record.image)),
        records: [],
      };
      clusters.set(key, cluster);
    }
    if (cluster.state !== record.state || cluster.city !== record.city) {
      cluster.state = "US";
      cluster.city = "Multi-city";
      cluster.citySlug = "multi-city";
    }
    cluster.records.push({
      id: record.id,
      path: record.path,
      name: record.name,
      kind: record.kind,
      parentId: record.parentId,
    });
  }
  return [...clusters.values()].map((cluster) => {
    cluster.records.sort((left, right) =>
      (left.kind === right.kind ? 0 : left.kind === "parent" ? -1 : 1)
      || left.path.localeCompare(right.path),
    );
    return {
      ...cluster,
      pageCount: cluster.records.length,
      parentPages: cluster.records.filter((record) => record.kind === "parent").length,
      subsitePages: cluster.records.filter((record) => record.kind === "subsite").length,
    };
  }).sort((left, right) =>
    left.state.localeCompare(right.state)
    || left.citySlug.localeCompare(right.citySlug)
    || right.parentPages - left.parentPages
    || right.pageCount - left.pageCount
    || left.id.localeCompare(right.id),
  );
}

function packetBucket(cluster) {
  const hashPrefix = cluster.id.slice("image-rights-".length, "image-rights-".length + 2);
  return (Number.parseInt(hashPrefix, 16) % 2) + 1;
}

function imagePacketFingerprint(clusterIds, recordIds) {
  return crypto.createHash("sha256").update(JSON.stringify([
    [...clusterIds].sort(),
    [...recordIds].sort(),
  ])).digest("hex");
}

function packetRecordIds(items) {
  return [...new Set(items.flatMap((cluster) =>
    cluster.records.map((record) => record.path),
  ))].sort();
}

function packetId(state, citySlug, fingerprint) {
  return `${IMAGE_PACKET_TYPE}-${state.toLowerCase()}-${citySlug}-${fingerprint.slice(0, 8)}`;
}

function imageClaimSnapshot(claim) {
  const clusterIds = [...(claim.claimedClusterIds || [])].sort();
  const recordIds = [...(claim.claimedRecordIds || [])].sort();
  const fingerprint = imagePacketFingerprint(clusterIds, recordIds);
  if (fingerprint !== claim.packetFingerprint) {
    throw new Error(`Image-rights claim fingerprint differs from its snapshot: ${claim.packetId}`);
  }
  if (!claim.packetId.endsWith(`-${fingerprint.slice(0, 8)}`)) {
    throw new Error(`Image-rights claim packet ID differs from its fingerprint: ${claim.packetId}`);
  }
  return { clusterIds, recordIds, fingerprint };
}

function packetFromClusters(items, { claim = null, snapshot = null } = {}) {
  const first = items[0];
  const state = first?.state || claim.packetId.match(
    /^image-rights-reconciliation-([a-z]{2})-/,
  )?.[1]?.toUpperCase() || "US";
  const citySlug = first?.citySlug || claim.packetId
    .replace(/^image-rights-reconciliation-[a-z]{2}-/, "")
    .replace(/-[a-f0-9]{8}$/, "");
  const currentClusterIds = items.map((cluster) => cluster.id).sort();
  const currentRecordIds = packetRecordIds(items);
  const clusterIds = snapshot?.clusterIds || currentClusterIds;
  const recordIds = snapshot?.recordIds || currentRecordIds;
  const fingerprint = snapshot?.fingerprint || imagePacketFingerprint(clusterIds, recordIds);
  const id = claim?.packetId || packetId(state, citySlug, fingerprint);
  return {
    id,
    type: IMAGE_PACKET_TYPE,
    audience: "internal",
    state,
    citySlug,
    bucket: first ? packetBucket(first) : null,
    packetFingerprint: fingerprint,
    status: claim?.status === "released" ? "open" : claim?.status || "open",
    claim,
    count: recordIds.length,
    remainingCount: currentRecordIds.length,
    clusterCount: clusterIds.length,
    remainingClusterCount: currentClusterIds.length,
    recordIds,
    remainingRecordIds: currentRecordIds,
    resolvedRecordIds: recordIds.filter((recordId) => !currentRecordIds.includes(recordId)),
    clusterIds,
    remainingClusterIds: currentClusterIds,
    clusters: items,
    acceptance: "Resolve every image cluster with explicit reusable-rights evidence or replacement media, update every affected source record together, and preserve unresolved items in review.",
  };
}

function buildImageRightsPackets(clusters, claims = []) {
  const claimsByPacket = new Map(claims.map((claim) => [claim.packetId, claim]));
  const clustersById = new Map(clusters.map((cluster) => [cluster.id, cluster]));
  const reservedClusterIds = new Set();
  const packets = [];

  for (const claim of claims.filter((item) => item.packetId.startsWith(`${IMAGE_PACKET_TYPE}-`))) {
    const snapshot = imageClaimSnapshot(claim);
    const remaining = snapshot.clusterIds.map((id) => clustersById.get(id)).filter(Boolean);
    if (claim.status === "accepted") {
      if (remaining.length) {
        throw new Error(`Accepted image-rights claim still has unresolved clusters: ${claim.packetId}`);
      }
      continue;
    }
    if (!ACTIVE_IMAGE_CLAIM_STATUSES.has(claim.status)) continue;
    for (const cluster of remaining) {
      if (reservedClusterIds.has(cluster.id)) {
        throw new Error(`Image-rights cluster is reserved by multiple active claims: ${cluster.id}`);
      }
      reservedClusterIds.add(cluster.id);
    }
    packets.push(packetFromClusters(remaining, { claim, snapshot }));
  }

  const groups = new Map();
  for (const cluster of clusters) {
    if (reservedClusterIds.has(cluster.id)) continue;
    const bucket = packetBucket(cluster);
    const key = [cluster.state.toLowerCase(), cluster.citySlug, bucket].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(cluster);
  }
  for (const [, items] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const recordIds = packetRecordIds(items);
    const clusterIds = items.map((cluster) => cluster.id).sort();
    const fingerprint = imagePacketFingerprint(clusterIds, recordIds);
    const id = packetId(items[0].state, items[0].citySlug, fingerprint);
    const claim = claimsByPacket.get(id) || null;
    if (claim?.status === "accepted") {
      throw new Error(`Accepted image-rights packet membership reappeared: ${id}`);
    }
    packets.push(packetFromClusters(items, { claim }));
  }
  return packets.sort((left, right) => left.id.localeCompare(right.id));
}

function summarizeImageRights(placePages, clusters, packets) {
  const reviewPages = clusters.reduce((total, cluster) => total + cluster.pageCount, 0);
  const reviewParents = clusters.reduce((total, cluster) => total + cluster.parentPages, 0);
  const sharedClusters = clusters.filter((cluster) => cluster.pageCount > 1);
  return {
    imageRightsPlacePagesScanned: placePages.length,
    imageRightsDocumentedPages: placePages.length - reviewPages,
    imageRightsReviewPages: reviewPages,
    imageRightsReviewParents: reviewParents,
    imageRightsReviewSubsites: reviewPages - reviewParents,
    imageRightsUniqueClusters: clusters.length,
    imageRightsSharedClusters: sharedClusters.length,
    imageRightsPagesInSharedClusters: sharedClusters.reduce(
      (total, cluster) => total + cluster.pageCount,
      0,
    ),
    imageRightsPackets: packets.length,
  };
}

function buildImageRightsQueue({ rootDirectory, asOf, claims = [] }) {
  const placePages = collectPlacePages(rootDirectory);
  const clusters = buildRightsClusters(placePages);
  const packets = buildImageRightsPackets(clusters, claims);
  return {
    schemaVersion: 1,
    asOf,
    summary: summarizeImageRights(placePages, clusters, packets),
    packets,
  };
}

module.exports = {
  IMAGE_PACKET_TYPE,
  buildImageRightsPackets,
  buildImageRightsQueue,
  buildRightsClusters,
  collectPlacePages,
  imageStorage,
  imagePacketFingerprint,
  parsePlacePage,
  rightsGap,
  summarizeImageRights,
};
