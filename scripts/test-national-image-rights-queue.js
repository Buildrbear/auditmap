const assert = require("node:assert/strict");
const {
  IMAGE_PACKET_TYPE,
  buildImageRightsPackets,
  buildRightsClusters,
  imagePacketFingerprint,
  summarizeImageRights,
} = require("./lib/national-image-rights-queue");

const reusable = {
  url: "/assets/parks/reusable.webp",
  source: "https://commons.wikimedia.org/wiki/File:Reusable.jpg",
  author: "Example creator",
  license: "CC BY 4.0",
  alt: "Reusable park view",
};
const unclear = {
  url: "/assets/parks/official.webp",
  source: "https://example.gov/parks/official-park",
  author: "Example city",
  license: "Official city photograph",
  alt: "Official Park",
};
const pages = [
  {
    id: "reusable-parent",
    path: "/us/nc/raleigh/parks/reusable-parent",
    name: "Reusable Parent",
    city: "Raleigh",
    state: "NC",
    kind: "parent",
    parentId: null,
    image: reusable,
  },
  {
    id: "official-parent",
    path: "/us/nc/raleigh/parks/official-parent",
    name: "Official Parent",
    city: "Raleigh",
    state: "NC",
    kind: "parent",
    parentId: null,
    image: unclear,
  },
  {
    id: "official-subsite",
    path: "/us/nc/raleigh/parks/official-parent/playground",
    name: "Playground",
    city: "Raleigh",
    state: "NC",
    kind: "subsite",
    parentId: "official-parent",
    image: { ...unclear, alt: "Official Park playground" },
  },
  {
    id: "missing-parent",
    path: "/us/tx/austin/parks/missing-parent",
    name: "Missing Parent",
    city: "Austin",
    state: "TX",
    kind: "parent",
    parentId: null,
    image: null,
  },
];

const clusters = buildRightsClusters(pages);
assert.equal(clusters.length, 2, "the reusable image must stay out of the queue");
const shared = clusters.find((cluster) => cluster.pageCount === 2);
assert.ok(shared, "the same image-rights decision must be clustered once");
assert.equal(shared.parentPages, 1);
assert.equal(shared.subsitePages, 1);
assert.equal(shared.gap, "reuse-rights-not-documented");
assert.match(shared.recommendedAction, /official hosting and attribution alone/i);

const packets = buildImageRightsPackets(clusters);
assert.equal(packets.length, 2);
assert.ok(packets.every((packet) => packet.type === IMAGE_PACKET_TYPE));
assert.ok(packets.every((packet) => packet.audience === "internal"));
assert.equal(new Set(packets.flatMap((packet) => packet.recordIds)).size, 3);
assert.ok(packets.every((packet) => /-[a-f0-9]{8}$/.test(packet.id)));

const claimedPacket = packets[0];
const claim = {
  packetId: claimedPacket.id,
  status: "claimed",
  assignee: "internal-agent",
  packetFingerprint: claimedPacket.packetFingerprint,
  claimedClusterIds: claimedPacket.clusterIds,
  claimedRecordIds: claimedPacket.recordIds,
};
assert.equal(
  imagePacketFingerprint(claim.claimedClusterIds, claim.claimedRecordIds),
  claim.packetFingerprint,
);
const claimed = buildImageRightsPackets(clusters, [claim])
  .find((packet) => packet.id === claimedPacket.id);
assert.equal(claimed.status, "claimed");
assert.equal(claimed.claim.assignee, "internal-agent");
assert.equal(claimed.remainingCount, claimed.count);

const resolvedClusters = clusters.filter((cluster) =>
  !claim.claimedClusterIds.includes(cluster.id),
);
const retainedAfterResolution = buildImageRightsPackets(resolvedClusters, [claim])
  .find((packet) => packet.id === claimedPacket.id);
assert.ok(retainedAfterResolution, "an active packet must survive after its final gap is fixed");
assert.equal(retainedAfterResolution.remainingCount, 0);
assert.deepEqual(retainedAfterResolution.resolvedRecordIds, claim.claimedRecordIds);

assert.doesNotThrow(() => buildImageRightsPackets(resolvedClusters, [{
  ...claim,
  status: "accepted",
}]));
assert.throws(() => buildImageRightsPackets(clusters, [{
  ...claim,
  status: "accepted",
}]), /accepted image-rights claim still has unresolved clusters/i);

const changedPages = pages.map((page) => page.image?.url === unclear.url
  ? { ...page, image: { ...page.image, url: "/assets/parks/replacement-candidate.webp" } }
  : page);
const changedClusters = buildRightsClusters(changedPages);
const changedPacket = buildImageRightsPackets(changedClusters, [{
  ...claim,
  status: "accepted",
}]).find((packet) => packet.state === claimedPacket.state);
assert.ok(changedPacket, "changed image membership must create an open packet");
assert.equal(changedPacket.status, "open");
assert.notEqual(changedPacket.id, claimedPacket.id);

assert.deepEqual(summarizeImageRights(pages, clusters, packets), {
  imageRightsPlacePagesScanned: 4,
  imageRightsDocumentedPages: 1,
  imageRightsReviewPages: 3,
  imageRightsReviewParents: 2,
  imageRightsReviewSubsites: 1,
  imageRightsUniqueClusters: 2,
  imageRightsSharedClusters: 1,
  imageRightsPagesInSharedClusters: 2,
  imageRightsPackets: 2,
});

console.log("National image-rights clustering, stable packets and claim status passed.");
