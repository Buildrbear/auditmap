const assert = require("node:assert/strict");
const {
  IMAGE_PACKET_TYPE,
  buildImageRightsPackets,
  buildRightsClusters,
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
assert.ok(packets.every((packet) => /-0[12]$/.test(packet.id)));

const claimedId = packets[0].id;
const claimed = buildImageRightsPackets(clusters, [{
  packetId: claimedId,
  status: "claimed",
  assignee: "internal-agent",
}]).find((packet) => packet.id === claimedId);
assert.equal(claimed.status, "claimed");
assert.equal(claimed.claim.assignee, "internal-agent");

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
