const assert = require("node:assert/strict");
const {
  buildPackets,
  buildRegistry,
  dateInTimeZone,
  localPagesFromLaunchMap,
  openTaskBrief,
  parseSitemap,
  summarize,
  validateActiveClaimReferences,
  validateCampaignCapacity,
  validateClaimsDocument,
} = require("./build-national-coverage-registry");

assert.equal(
  dateInTimeZone(new Date("2026-08-21T01:30:00.000Z")),
  "2026-08-20",
);
assert.equal(
  dateInTimeZone(new Date("2026-08-21T04:30:00.000Z")),
  "2026-08-21",
);

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
assert.equal(registry.find((record) => record.path.endsWith("/live-park")).researchMatchBasis[0], "exact");
assert.equal(
  registry.find((record) => record.path.endsWith("/different-park")).releaseStatus,
  "research-only",
  "a reused official URL must not override an exact catalog identity belonging to another record",
);

const identityRegistry = buildRegistry({
  livePages: parseSitemap(sitemap([
    "/us/nc/raleigh/parks/boundary-preserve",
    "/us/nc/durham/parks/twin-park-north",
    "/us/nc/durham/parks/twin-park-south",
    "/us/nc/durham/parks/shared-park-north",
    "/us/nc/durham/parks/shared-park-south",
  ])),
  localPages: [],
  productionCatalog: { places: [
    {
      id: "boundary-preserve",
      name: "Boundary Preserve",
      city: "Raleigh",
      state: "NC",
      officialSource: { url: "https://raleighnc.gov/parks/boundary-preserve/" },
    },
    {
      id: "twin-park-north",
      name: "Twin Park",
      city: "Durham",
      state: "NC",
      officialSource: { url: "https://durhamnc.gov/parks/twin-park-north" },
    },
    {
      id: "twin-park-south",
      name: "Twin Park",
      city: "Durham",
      state: "NC",
      officialSource: { url: "https://durhamnc.gov/parks/twin-park-south" },
    },
    {
      id: "shared-park-north",
      name: "Shared Park",
      city: "Durham",
      state: "NC",
      officialSource: { url: "https://durhamnc.gov/parks" },
    },
    {
      id: "shared-park-south",
      name: "Shared Park",
      city: "Durham",
      state: "NC",
      officialSource: { url: "https://durhamnc.gov/parks" },
    },
  ] },
  localCatalog: { places: [] },
  intakes: [{
    campaignId: "identity-intake",
    records: [
      {
        slug: "wake-forest-boundary-preserve",
        name: "Boundary Preserve",
        city: "Wake Forest",
        state: "NC",
        official_source_url: "https://raleighnc.gov/parks/boundary-preserve",
      },
      {
        slug: "chapel-hill-boundary-preserve",
        name: "Boundary Preserve",
        city: "Chapel Hill",
        state: "NC",
        official_source_url: "https://chapelhillnc.gov/parks/different-boundary-preserve",
      },
      {
        slug: "durham-twin-park",
        name: "Twin Park",
        city: "Durham",
        state: "NC",
        official_source_url: "https://durhamnc.gov/parks/twin-park-south",
      },
      {
        slug: "durham-shared-park",
        name: "Shared Park",
        city: "Durham",
        state: "NC",
        official_source_url: "https://durhamnc.gov/parks",
      },
    ],
  }],
});
const boundary = identityRegistry.find((record) => record.path === "/us/nc/raleigh/parks/boundary-preserve");
assert.deepEqual(boundary.researchMatchBasis, ["official-source-url"]);
assert.equal(boundary.researchSources.length, 1, "matching official URLs may reconcile a postal-city mismatch");
assert.equal(
  identityRegistry.find((record) => record.path.includes("/chapel-hill/parks/boundary-preserve")).releaseStatus,
  "research-only",
  "a unique state name must not silently merge a different municipality without source corroboration",
);
const southTwin = identityRegistry.find((record) => record.path.endsWith("/twin-park-south"));
assert.deepEqual(southTwin.researchMatchBasis, ["official-source-url"]);
assert.equal(southTwin.researchSources.length, 1, "an official source must disambiguate an exact-name collision");
assert.equal(
  identityRegistry.find((record) => record.path.endsWith("/twin-park-north")).researchSources.length,
  0,
);
assert.equal(
  identityRegistry.find((record) => record.path === "/us/nc/durham/parks/shared-park").releaseStatus,
  "research-only",
  "a shared official source must not resolve a colliding exact identity",
);
assert.equal(
  identityRegistry.find((record) => record.path.endsWith("/shared-park-north")).researchSources.length,
  0,
);
assert.equal(
  identityRegistry.find((record) => record.path.endsWith("/shared-park-south")).researchSources.length,
  0,
);
assert.throws(() => buildRegistry({
  livePages: parseSitemap(sitemap(["/us/nc/durham/parks/collision-park"])),
  localPages: [],
  productionCatalog: { places: [
    { id: "collision-park", name: "Collision Park", city: "Durham", state: "NC" },
    { id: "collision-park-south", name: "Collision Park", city: "Durham", state: "NC" },
  ] },
  localCatalog: { places: [] },
  intakes: [{
    campaignId: "canonical-collision-intake",
    records: [{ slug: "durham-collision-park", name: "Collision Park", city: "Durham", state: "NC" }],
  }],
}), /would duplicate existing canonical path \/us\/nc\/durham\/parks\/collision-park/);
assert.throws(() => buildRegistry({
  livePages: [],
  localPages: [],
  productionCatalog: { places: [] },
  localCatalog: { places: [] },
  intakes: [{
    campaignId: "research-path-collision-intake",
    records: [
      { slug: "durham-shared-slug", name: "North Park", city: "Durham", state: "NC" },
      { slug: "durham-shared-slug", name: "South Park", city: "Durham", state: "NC" },
    ],
  }],
}), /Duplicate national registry path: \/us\/nc\/durham\/parks\/shared-slug/);

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
const researchPacketId = packets.find((packet) => packet.type === "research-completion").id;
const releasePacketId = packets.find((packet) => packet.type === "release-reconciliation").id;
const lowHopperBrief = openTaskBrief({
  asOf: "2026-08-20",
  summary: { ...summary, hopper: 100 },
}, packets);
assert.match(lowHopperBrief, /at or below 100 records/);
assert.ok(lowHopperBrief.indexOf(researchPacketId) < lowHopperBrief.indexOf(releasePacketId));
const highHopperBrief = openTaskBrief({
  asOf: "2026-08-20",
  summary: { ...summary, hopper: 101 },
}, packets);
assert.match(highHopperBrief, /exceeds 100 records/);
assert.ok(highHopperBrief.indexOf(releasePacketId) < highHopperBrief.indexOf(researchPacketId));
const noOpenPacketBrief = openTaskBrief({
  asOf: "2026-08-20",
  summary,
}, packets.map((packet) => ({ ...packet, status: "accepted" })));
assert.match(noOpenPacketBrief, /No unclaimed packets are currently generated/);
assert.doesNotMatch(noOpenPacketBrief, /Claim one exact available packet ID/);
const campaignQueue = {
  activeCluster: {
    resumeCheckpoint: {
      campaignCapacity: {
        asOf: "2026-08-20",
        limits: { municipalityBreadth: 1, depth: 1 },
        activeLanes: {
          municipalityBreadth: [{
            packetId: "research-completion-nc-raleigh-01",
            issueUrl: "https://github.com/example/auditmap/issues/1",
            pullRequestUrl: "https://github.com/example/auditmap/pull/1",
            status: "submitted",
          }],
          depth: [],
        },
        available: { municipalityBreadth: 0, depth: 1 },
      },
    },
  },
};
const capacity = validateCampaignCapacity(campaignQueue);
const capacityGatedBrief = openTaskBrief({ asOf: "2026-08-20", summary }, packets, capacity);
const openSection = capacityGatedBrief.split("## Capacity-blocked backlog")[0];
const blockedSection = capacityGatedBrief.split("## Capacity-blocked backlog")[1];
assert.match(capacityGatedBrief, /0\/1 municipality-breadth/);
assert.match(capacityGatedBrief, /breadth capacity is full/);
assert.doesNotMatch(capacityGatedBrief, /evidence-completion packets may lead/);
assert.doesNotMatch(openSection, new RegExp(researchPacketId));
assert.match(blockedSection, new RegExp(researchPacketId));
assert.match(openSection, new RegExp(releasePacketId));
assert.throws(() => validateCampaignCapacity({
  ...campaignQueue,
  activeCluster: {
    resumeCheckpoint: {
      campaignCapacity: {
        ...capacity,
        available: { municipalityBreadth: 1, depth: 1 },
      },
    },
  },
}), /available count/);
assert.throws(() => validateCampaignCapacity({
  activeCluster: {
    resumeCheckpoint: {
      campaignCapacity: { ...capacity, unexpected: true },
    },
  },
}), /Unknown field unexpected/);
assert.throws(() => validateCampaignCapacity(campaignQueue, [{
  packetId: "research-completion-nc-raleigh-01",
  assignee: "agent-example",
  assignmentUrl: "https://opentask.ai/assignments/example",
  issueUrl: "https://github.com/example/auditmap/issues/different",
  pullRequestUrl: "https://github.com/example/auditmap/pull/1",
  claimedAt: "2026-08-17",
  expiresAt: "2026-08-24",
  lastUpdatedAt: "2026-08-17",
  status: "submitted",
}]), /issueUrl differs/);

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
  $schema: "./schemas/national-work-packet-claims.schema.json",
  schemaVersion: 1,
  updatedAt: "2026-08-17",
  claims: [baseClaim],
};
assert.equal(validateClaimsDocument(claimsDocument, { asOf: "2026-08-18" }).length, 1);
assert.throws(() => validateClaimsDocument({
  ...claimsDocument,
  $schema: "./wrong-schema.json",
}), /\$schema/);
assert.throws(() => validateClaimsDocument({
  ...claimsDocument,
  unexpected: true,
}), /Unknown field unexpected/);
assert.throws(() => validateClaimsDocument({
  ...claimsDocument,
  updatedAt: "2026-02-31",
}), /updatedAt/);

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
assert.throws(() => validateClaimsDocument({
  ...claimsDocument,
  claims: [{ ...baseClaim, unexpected: true }],
}), /Unknown field unexpected/);
assert.throws(() => validateClaimsDocument(claimsDocument, { asOf: "2026-08-25" }), /expired/);
assert.throws(() => validateClaimsDocument({
  ...claimsDocument,
  claims: [{ ...baseClaim, acceptedRecordIds: "not-an-array" }],
}), /acceptedRecordIds.*array/);
assert.throws(() => validateClaimsDocument({
  ...claimsDocument,
  claims: [{ ...baseClaim, acceptedRecordIds: ["not-a-record-path"] }],
}), /acceptedRecordId.*\/us\//);
assert.throws(() => validateClaimsDocument({
  ...claimsDocument,
  claims: [{
    ...baseClaim,
    acceptedRecordIds: [
      "/us/nc/raleigh/parks/live-park/local-playground",
      "/us/nc/raleigh/parks/live-park/local-playground",
    ],
  }],
}), /Duplicate acceptedRecordId/);
assert.throws(() => validateClaimsDocument({
  ...claimsDocument,
  claims: [{ ...baseClaim, reviewQueue: "not-an-array" }],
}), /reviewQueue.*array/);
assert.throws(() => validateClaimsDocument({
  ...claimsDocument,
  claims: [{ ...baseClaim, reviewQueue: [{ issue: "Missing evidence" }] }],
}), /recommendation/);
assert.throws(() => validateClaimsDocument({
  ...claimsDocument,
  claims: [{
    ...baseClaim,
    reviewQueue: [{ issue: "Missing evidence", recommendation: "Recheck", unexpected: true }],
  }],
}), /Unknown field unexpected/);
assert.throws(() => validateClaimsDocument({
  ...claimsDocument,
  claims: [{
    ...baseClaim,
    reviewQueue: [{
      issue: "Missing evidence",
      recommendation: "Recheck",
      sourceUrl: "http://example.com/not-https",
    }],
  }],
}), /reviewQueue\[0\].sourceUrl/);
assert.throws(() => validateClaimsDocument({
  ...claimsDocument,
  claims: [{ ...baseClaim, notes: 42 }],
}), /notes.*string/);
assert.throws(() => validateActiveClaimReferences(packets, [{
  ...baseClaim,
  packetId: "release-reconciliation-nc-missing-city-01",
}]), /unknown packet/);
assert.doesNotThrow(() => validateActiveClaimReferences(packets, [{
  ...baseClaim,
  acceptedRecordIds: ["/us/nc/raleigh/parks/live-park/local-playground"],
}]));
assert.throws(() => validateActiveClaimReferences(packets, [{
  ...baseClaim,
  acceptedRecordIds: ["/us/nc/raleigh/parks/live-park/not-in-the-packet"],
}]), /outside its packet/);

console.log("National coverage registry tests passed.");
