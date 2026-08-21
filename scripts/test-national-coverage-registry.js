const assert = require("node:assert/strict");
const {
  buildPackets,
  buildRegistry,
  localPagesFromLaunchMap,
  parseSitemap,
  summarize,
  validateActiveClaimReferences,
  validateClaimsDocument,
} = require("./build-national-coverage-registry");

const sitemap = (paths) => `<?xml version="1.0"?><urlset>${paths.map((item) =>
  `<url><loc>https://www.auditmap.org${item}</loc></url>`,
).join("")}</urlset>`;

const livePages = parseSitemap(sitemap([
  "/us/nc/raleigh/parks/live-park",
  "/us/nc/raleigh/parks/live-park/live-trail",
  "/us/nc/durham/parks/production-only-park",
  "/us/nc",
]));
const localPages = parseSitemap(sitemap([
  "/us/nc/raleigh/parks/live-park",
  "/us/nc/raleigh/parks/live-park/live-trail",
  "/us/nc/raleigh/parks/live-park/local-playground",
]));
const launchMapPages = localPagesFromLaunchMap({ places: [{
  id: "launch-nc-raleigh-live-park",
  name: "Live Park",
  city: "Raleigh",
  state: "NC",
  features: [
    { slug: "local-playground", name: "Local Playground" },
    { slug: "research-only-trail", name: "Research Only Trail" },
  ],
}] }, {
  pageExists: (pagePath) => new Set([
    "/us/nc/raleigh/parks/live-park",
    "/us/nc/raleigh/parks/live-park/local-playground",
  ]).has(pagePath),
});
assert.deepEqual(launchMapPages.map((page) => page.path), [
  "/us/nc/raleigh/parks/live-park",
  "/us/nc/raleigh/parks/live-park/local-playground",
]);
const productionCatalog = {
  places: [
    { id: "live-park", name: "Live Park", city: "Raleigh", state: "NC", officialSource: { url: "https://raleighnc.gov/live" } },
    { id: "production-only-park", name: "Production Only Park", city: "Durham", state: "NC" },
    { id: "memorial-park", name: "Memorial Park", city: "Houston", state: "TX" },
  ],
};
const localCatalog = { places: [{ id: "live-park", name: "Live Park", city: "Raleigh", state: "NC" }] };
const intakes = [{
  campaignId: "test-intake",
  checkedAt: "2026-08-17",
  records: [
    { slug: "raleigh-live-park", name: "Live Park", city: "Raleigh", state: "NC", official_source_url: "https://raleighnc.gov/live" },
    { slug: "raleigh-new-park", name: "New Park", city: "Raleigh", state: "NC" },
    { slug: "durham-blocked-park", name: "Blocked Park", city: "Durham", state: "NC" },
    { slug: "raleigh-different-park", name: "Different Park", city: "Raleigh", state: "NC", official_source_url: "https://raleighnc.gov/live" },
    { slug: "el-paso-memorial-park", name: "Memorial Park", city: "El Paso", state: "TX" },
  ],
  reviewQueue: [{ park_slug: "durham-blocked-park", issue: "Coordinate conflict", recommendation: "Check GIS" }],
}];

const registry = buildRegistry({ livePages, localPages, productionCatalog, localCatalog, intakes });
const summary = summarize(registry);
assert.deepEqual(summary, {
  knownDestinations: 8,
  liveDestinationPages: 3,
  liveParentPages: 2,
  liveSubsitePages: 1,
  hopper: 5,
  generatedLocallyNotLive: 1,
  researchOnly: 3,
  blockedReview: 1,
  productionMissingFromLocal: 1,
  recordsWithResearchHandoffs: 5,
  mappableDestinations: 0,
  openReviewItems: 1,
});
assert.equal(registry.find((record) => record.path.endsWith("/live-park")).researchSources.length, 1);
assert.equal(registry.find((record) => record.path.endsWith("/new-park")).releaseStatus, "research-only");
assert.equal(registry.find((record) => record.path.endsWith("/blocked-park")).releaseStatus, "blocked-review");
assert.equal(registry.find((record) => record.path === "/us/tx/el-paso/parks/memorial-park").releaseStatus, "research-only");

const mappedRegistry = buildRegistry({
  livePages,
  localPages,
  productionCatalog,
  localCatalog,
  localLaunchMap: [{
    id: "live-park",
    slug: "live-park",
    name: "Live Park",
    city: "Raleigh",
    state: "NC",
    latitude: 35.78,
    longitude: -78.64,
    features: [{
      slug: "live-trail",
      name: "Live Trail",
      latitude: 35.781,
      longitude: -78.641,
      details: { positionQuality: "reviewed-public-map-placement" },
    }],
  }],
  intakes,
});
assert.equal(mappedRegistry.find((record) => record.path.endsWith("/live-park")).latitude, 35.78);
assert.equal(mappedRegistry.find((record) => record.path.endsWith("/live-trail")).name, "Live Trail");

const packets = buildPackets(registry, 25);
assert.equal(packets.reduce((total, packet) => total + packet.count, 0), 6);
assert.deepEqual(new Set(packets.map((packet) => packet.type)), new Set([
  "local-production-sync",
  "release-reconciliation",
  "research-completion",
]));

const baseClaim = {
  packetId: "release-reconciliation-nc-raleigh-01",
  status: "claimed",
  assignee: "agent-example",
  assignmentUrl: "https://opentask.ai/assignments/example",
  issueUrl: "https://github.com/example/auditmap/issues/1",
  claimedAt: "2026-08-17",
  expiresAt: "2026-08-24",
  lastUpdatedAt: "2026-08-17",
};
const claimsDocument = {
  schemaVersion: 1,
  updatedAt: "2026-08-17",
  claims: [baseClaim],
};
assert.equal(validateClaimsDocument(claimsDocument, { asOf: "2026-08-18" }).length, 1);

const claimedPacket = buildPackets(registry, 25, [baseClaim])
  .find((packet) => packet.id === "release-reconciliation-nc-raleigh-01");
assert.equal(claimedPacket.status, "claimed");
assert.equal(claimedPacket.claim.assignee, "agent-example");

const releasedPacket = buildPackets(registry, 25, [{ ...baseClaim, status: "released" }])
  .find((packet) => packet.id === "release-reconciliation-nc-raleigh-01");
assert.equal(releasedPacket.status, "open");
assert.equal(releasedPacket.claim.status, "released");

assert.throws(() => validateClaimsDocument({
  ...claimsDocument,
  claims: [baseClaim, { ...baseClaim }],
}), /Duplicate claim packetId/);
assert.throws(() => validateClaimsDocument(claimsDocument, { asOf: "2026-08-25" }), /expired/);
assert.throws(() => validateActiveClaimReferences(packets, [{
  ...baseClaim,
  packetId: "release-reconciliation-nc-missing-city-01",
}]), /unknown packet/);

console.log("National coverage registry tests passed.");
