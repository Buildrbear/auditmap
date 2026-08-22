const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { hasDocumentedReuseRights } = require("./image-rights");

const IMAGE_PACKET_TYPE = "image-rights-reconciliation";

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

function buildImageRightsPackets(clusters, claims = []) {
  const claimsByPacket = new Map(claims.map((claim) => [claim.packetId, claim]));
  const groups = new Map();
  for (const cluster of clusters) {
    const bucket = packetBucket(cluster);
    const key = [cluster.state.toLowerCase(), cluster.citySlug, bucket].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(cluster);
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, items]) => {
    const [state, citySlug, bucket] = key.split("|");
    const id = `${IMAGE_PACKET_TYPE}-${state}-${citySlug}-${String(bucket).padStart(2, "0")}`;
    const claim = claimsByPacket.get(id) || null;
    const recordIds = [...new Set(items.flatMap((cluster) =>
      cluster.records.map((record) => record.path),
    ))].sort();
    return {
      id,
      type: IMAGE_PACKET_TYPE,
      audience: "internal",
      state: state.toUpperCase(),
      citySlug,
      status: claim?.status === "released" ? "open" : claim?.status || "open",
      claim,
      count: recordIds.length,
      clusterCount: items.length,
      recordIds,
      clusterIds: items.map((cluster) => cluster.id).sort(),
      clusters: items,
      acceptance: "Resolve every image cluster with explicit reusable-rights evidence or replacement media, update every affected source record together, and preserve unresolved items in review.",
    };
  });
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
  parsePlacePage,
  rightsGap,
  summarizeImageRights,
};
