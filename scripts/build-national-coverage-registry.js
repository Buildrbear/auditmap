#!/usr/bin/env node

const crypto = require("node:crypto");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const defaultPaths = {
  localSitemap: "sitemap.xml",
  localCatalog: "data/generated/official-catalog.json",
  localLaunchMap: "data/generated/launch-map-places.json",
  productionSitemap: "https://www.auditmap.org/sitemap.xml",
  productionCatalog: "https://www.auditmap.org/data/generated/official-catalog.json",
  productionLaunchMap: "https://www.auditmap.org/data/generated/launch-map-places.json",
  intakeDirectory: "data/research-intake",
  externalSources: "data/research-intake/opentask-external-sources.json",
  claims: "data/national-work-packet-claims.json",
  spatialSources: "data/spatial-source-registry.json",
  output: "data/generated/national-coverage-registry.json",
  packetsOutput: "data/generated/national-work-packets.json",
  briefOutput: "preview/opentask-daily-ask.md",
};

const CLAIM_STATUSES = new Set([
  "claimed",
  "submitted",
  "changes-requested",
  "accepted",
  "released",
]);
const ACTIVE_CLAIM_STATUSES = new Set(["claimed", "submitted", "changes-requested"]);
const CLAIM_PACKET_PATTERN = /^(release-reconciliation|research-completion|local-production-sync)-[a-z]{2}-[a-z0-9-]+-[0-9]{2}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CLAIMS_SCHEMA_PATH = "./schemas/national-work-packet-claims.schema.json";
const CLAIM_DOCUMENT_FIELDS = new Set(["$schema", "schemaVersion", "updatedAt", "claims"]);
const CLAIM_FIELDS = new Set([
  "packetId",
  "assignee",
  "assignmentUrl",
  "issueUrl",
  "claimedAt",
  "expiresAt",
  "lastUpdatedAt",
  "status",
  "submissionUrl",
  "pullRequestUrl",
  "acceptedRecordIds",
  "reviewQueue",
  "notes",
]);
const REVIEW_QUEUE_FIELDS = new Set(["issue", "recommendation", "sourceUrl"]);

function parseArgs(argv) {
  const options = { ...defaultPaths, write: true, includeExternal: true };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--no-write") options.write = false;
    else if (argument === "--no-external") options.includeExternal = false;
    else if (argument.startsWith("--")) {
      const next = argv[++index];
      if (!next) throw new Error(`Missing value for ${argument}`);
      const key = argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      options[key] = next;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(value) {
  return normalize(value).replace(/\s+/g, "-");
}

function relativePath(value) {
  return path.isAbsolute(value) ? value : path.join(root, value);
}

function localGitBaseline() {
  const read = (args) => childProcess.execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  try {
    return {
      branch: read(["branch", "--show-current"]) || null,
      commit: read(["rev-parse", "HEAD"]),
    };
  } catch {
    return { branch: null, commit: null };
  }
}

function validateHttpsUrl(value, field, packetId) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") throw new Error("not HTTPS");
  } catch {
    throw new Error(`Invalid ${field} for claim ${packetId}: expected an HTTPS URL`);
  }
}

function validateKnownFields(value, allowedFields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) throw new Error(`Unknown field ${field} in ${label}`);
  }
}

function isIsoDate(value) {
  if (!ISO_DATE_PATTERN.test(String(value || ""))) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function validateClaimsDocument(document, { asOf = null } = {}) {
  validateKnownFields(document, CLAIM_DOCUMENT_FIELDS, "claim ledger");
  if (!document || document.schemaVersion !== 1 || !Array.isArray(document.claims)) {
    throw new Error("Claim ledger must use schemaVersion 1 and contain a claims array");
  }
  if (document.$schema !== CLAIMS_SCHEMA_PATH) {
    throw new Error(`Claim ledger $schema must be ${CLAIMS_SCHEMA_PATH}`);
  }
  if (!isIsoDate(document.updatedAt)) {
    throw new Error("Claim ledger updatedAt must be an ISO date (YYYY-MM-DD)");
  }

  const seen = new Set();
  const required = [
    "packetId",
    "assignee",
    "assignmentUrl",
    "issueUrl",
    "claimedAt",
    "expiresAt",
    "lastUpdatedAt",
    "status",
  ];
  for (const claim of document.claims) {
    const packetId = claim?.packetId || "(missing packetId)";
    validateKnownFields(claim, CLAIM_FIELDS, `claim ${packetId}`);
    for (const field of required) {
      if (typeof claim?.[field] !== "string" || !claim[field].trim()) {
        throw new Error(`Claim ${packetId} is missing required field ${field}`);
      }
    }
    if (!CLAIM_PACKET_PATTERN.test(claim.packetId)) {
      throw new Error(`Invalid claim packetId: ${claim.packetId}`);
    }
    if (seen.has(claim.packetId)) throw new Error(`Duplicate claim packetId: ${claim.packetId}`);
    seen.add(claim.packetId);
    if (!CLAIM_STATUSES.has(claim.status)) {
      throw new Error(`Invalid claim status for ${claim.packetId}: ${claim.status}`);
    }
    for (const field of ["claimedAt", "expiresAt", "lastUpdatedAt"]) {
      if (!isIsoDate(claim[field])) {
        throw new Error(`Invalid ${field} for claim ${claim.packetId}: expected YYYY-MM-DD`);
      }
    }
    if (claim.expiresAt < claim.claimedAt) {
      throw new Error(`Claim ${claim.packetId} expires before it was claimed`);
    }
    validateHttpsUrl(claim.assignmentUrl, "assignmentUrl", claim.packetId);
    validateHttpsUrl(claim.issueUrl, "issueUrl", claim.packetId);
    for (const field of ["submissionUrl", "pullRequestUrl"]) {
      if (Object.hasOwn(claim, field)) validateHttpsUrl(claim[field], field, claim.packetId);
    }
    if (claim.acceptedRecordIds !== undefined) {
      if (!Array.isArray(claim.acceptedRecordIds)) {
        throw new Error(`Invalid acceptedRecordIds for claim ${claim.packetId}: expected an array`);
      }
      const acceptedRecordIds = new Set();
      for (const recordId of claim.acceptedRecordIds) {
        if (typeof recordId !== "string" || !recordId.startsWith("/us/")) {
          throw new Error(
            `Invalid acceptedRecordId for claim ${claim.packetId}: expected a /us/ record path`,
          );
        }
        if (acceptedRecordIds.has(recordId)) {
          throw new Error(`Duplicate acceptedRecordId for claim ${claim.packetId}: ${recordId}`);
        }
        acceptedRecordIds.add(recordId);
      }
    }
    if (claim.reviewQueue !== undefined) {
      if (!Array.isArray(claim.reviewQueue)) {
        throw new Error(`Invalid reviewQueue for claim ${claim.packetId}: expected an array`);
      }
      for (const [index, item] of claim.reviewQueue.entries()) {
        const label = `reviewQueue item ${index} for claim ${claim.packetId}`;
        validateKnownFields(item, REVIEW_QUEUE_FIELDS, label);
        for (const field of ["issue", "recommendation"]) {
          if (typeof item[field] !== "string" || !item[field].trim()) {
            throw new Error(`Invalid ${field} in ${label}: expected a non-empty string`);
          }
        }
        if (Object.hasOwn(item, "sourceUrl")) {
          validateHttpsUrl(item.sourceUrl, `reviewQueue[${index}].sourceUrl`, claim.packetId);
        }
      }
    }
    if (claim.notes !== undefined && typeof claim.notes !== "string") {
      throw new Error(`Invalid notes for claim ${claim.packetId}: expected a string`);
    }
    if (asOf && ACTIVE_CLAIM_STATUSES.has(claim.status) && claim.expiresAt < asOf) {
      throw new Error(
        `Active claim ${claim.packetId} expired ${claim.expiresAt}; extend it or set status to released`,
      );
    }
  }
  return document.claims;
}

function validateActiveClaimReferences(packets, claims) {
  const packetsById = new Map(packets.map((packet) => [packet.id, packet]));
  for (const claim of claims) {
    if (!ACTIVE_CLAIM_STATUSES.has(claim.status)) continue;
    const packet = packetsById.get(claim.packetId);
    if (!packet) throw new Error(`Active claim references unknown packet: ${claim.packetId}`);
    const packetRecordIds = new Set(packet.recordIds);
    for (const recordId of claim.acceptedRecordIds || []) {
      if (!packetRecordIds.has(recordId)) {
        throw new Error(
          `Active claim ${claim.packetId} references record outside its packet: ${recordId}`,
        );
      }
    }
  }
}

async function readText(source) {
  if (/^https:\/\//i.test(source)) {
    const response = await fetch(source, { headers: { "user-agent": "AuditMap coverage registry/1.0" } });
    if (!response.ok) throw new Error(`Unable to read ${source}: HTTP ${response.status}`);
    return response.text();
  }
  return fs.readFileSync(relativePath(source), "utf8");
}

async function readJson(source) {
  return JSON.parse(await readText(source));
}

function destinationFromUrl(url) {
  const pathname = new URL(url, "https://www.auditmap.org").pathname.replace(/\/$/, "");
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "us" || parts[3] !== "parks" || ![5, 6].includes(parts.length)) return null;
  return {
    id: pathname,
    path: pathname,
    url: `https://www.auditmap.org${pathname}`,
    kind: parts.length === 5 ? "parent" : "subsite",
    state: parts[1].toUpperCase(),
    citySlug: parts[2],
    parentSlug: parts[4],
    subsiteSlug: parts[5] || null,
  };
}

function parseSitemap(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => destinationFromUrl(match[1]))
    .filter(Boolean);
}

function catalogPlaces(document) {
  if (Array.isArray(document)) return document;
  if (Array.isArray(document?.places)) return document.places;
  throw new Error("Catalog must be an array or contain a places array");
}

function catalogKey(place, name = place.name, city = place.city) {
  return [place.state, city, name].map(normalize).join("|");
}

function stateNameKey(place, name = place.name) {
  return [place.state, name].map(normalize).join("|");
}

function sourceUrls(record) {
  return [
    record.official_source_url,
    record.source,
    ...(record.sources || []).map((source) => source.url),
  ].filter(Boolean);
}

function recordSlug(record) {
  const prefix = `${slugify(record.city)}-`;
  const supplied = String(record.slug || "");
  return supplied.startsWith(prefix) ? supplied.slice(prefix.length) : supplied || slugify(record.name);
}

function buildCatalogIndex(...documents) {
  const byExact = new Map();
  const byStateName = new Map();
  const bySource = new Map();
  for (const document of documents) {
    for (const place of catalogPlaces(document)) {
      byExact.set(catalogKey(place), place);
      const stateKey = stateNameKey(place);
      if (!byStateName.has(stateKey)) byStateName.set(stateKey, []);
      const stateMatches = byStateName.get(stateKey);
      if (!stateMatches.some((candidate) => candidate.id === place.id)) stateMatches.push(place);
      const officialUrl = place.officialSource?.url || place.source;
      if (officialUrl) bySource.set(officialUrl, place);
    }
  }
  return { byExact, byStateName, bySource };
}

function matchResearchRecord(record, index) {
  for (const name of [record.name, ...(record.aliases || [])]) {
    const exact = index.byExact.get(catalogKey(record, name));
    if (exact) return { place: exact, basis: name === record.name ? "exact" : "reviewed-alias" };
  }
  const stateMatches = (index.byStateName.get(stateNameKey(record)) || [])
    .filter((candidate) => normalize(candidate.city) === normalize(record.city));
  if (stateMatches.length === 1) return { place: stateMatches[0], basis: "unique-city-name" };
  return null;
}

function pagePathsForPlace(place) {
  const prefix = `/us/${slugify(place.state)}/${slugify(place.city)}/parks/`;
  const launchPrefix = `launch-${slugify(place.state)}-${slugify(place.city)}-`;
  const idSlug = slugify(place.id).replace(new RegExp(`^${launchPrefix}`), "");
  return [...new Set([`${prefix}${slugify(place.name)}`, idSlug ? `${prefix}${idSlug}` : null].filter(Boolean))];
}

function pagePathForResearch(record) {
  return `/us/${slugify(record.state)}/${slugify(record.city)}/parks/${recordSlug(record)}`;
}

function launchPlaces(document) {
  if (Array.isArray(document)) return document;
  if (Array.isArray(document?.places)) return document.places;
  throw new Error("Launch map must be an array or contain a places array");
}

function localPagesFromLaunchMap(document, { rootDirectory = root, pageExists = null } = {}) {
  const exists = pageExists || ((pagePath) =>
    fs.existsSync(path.join(rootDirectory, pagePath.replace(/^\//, ""), "index.html"))
  );
  const pages = new Map();
  for (const place of launchPlaces(document)) {
    const parentPaths = pagePathsForPlace(place);
    for (const parentPath of parentPaths) {
      if (exists(parentPath)) pages.set(parentPath, destinationFromUrl(parentPath));
      for (const feature of place.features || []) {
        const featureSlug = feature.slug || slugify(feature.name || feature.id);
        if (!featureSlug) continue;
        const featurePath = `${parentPath}/${featureSlug}`;
        if (exists(featurePath)) pages.set(featurePath, destinationFromUrl(featurePath));
      }
    }
  }
  return [...pages.values()].filter(Boolean);
}

function finiteCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildSpatialIndex(...documents) {
  const byPath = new Map();
  for (const document of documents) {
    for (const place of launchPlaces(document)) {
      const parentPaths = pagePathsForPlace(place);
      const parent = {
        name: place.name || null,
        city: place.city || null,
        latitude: finiteCoordinate(place.latitude),
        longitude: finiteCoordinate(place.longitude),
        positionQuality: place.positionQuality || "parent-map-coordinate",
        coordinateSource: place.coordinateSource || place.source || null,
      };
      for (const parentPath of parentPaths) byPath.set(parentPath, parent);

      for (const feature of place.features || []) {
        const featureSlug = feature.slug || slugify(feature.name || feature.id);
        if (!featureSlug) continue;
        const featureLocation = {
          name: feature.name || null,
          city: place.city || null,
          latitude: finiteCoordinate(feature.latitude),
          longitude: finiteCoordinate(feature.longitude),
          positionQuality: feature.details?.positionQuality || "destination-map-coordinate",
          coordinateSource: feature.details?.coordinateSource || null,
        };
        for (const parentPath of parentPaths) {
          byPath.set(`${parentPath}/${featureSlug}`, featureLocation);
        }
      }
    }
  }
  return byPath;
}

function reviewItemsFor(intake, record) {
  return (intake.reviewQueue || []).filter((item) => item.park_slug === record.slug);
}

function compactResearchRecord(record, intake, sourceId, override = null) {
  return {
    sourceId,
    sourceRecordSlug: record.slug || null,
    name: record.name,
    city: record.city,
    state: record.state,
    managingAgency: record.managing_agency || null,
    checkedAt: record.source_checked_at || intake.checkedAt || null,
    officialSources: sourceUrls(record),
    handoffUrl: intake.researchHandoffUrl || intake.handoffUrl || null,
    assignmentUrl: intake.assignmentUrl || null,
    reviewItems: reviewItemsFor(intake, record),
    override,
  };
}

function mergeResearch(target, research) {
  target.researchSources ||= [];
  if (!target.researchSources.some((item) => item.sourceId === research.sourceId)) {
    target.researchSources.push(research);
  }
  if (research.reviewItems.length) {
    target.openReviewItems = [...(target.openReviewItems || []), ...research.reviewItems];
  }
}

function buildRegistry({
  livePages,
  localPages,
  productionCatalog,
  localCatalog,
  productionLaunchMap = [],
  localLaunchMap = [],
  intakes,
}) {
  const live = new Map(livePages.map((page) => [page.path, page]));
  const local = new Map(localPages.map((page) => [page.path, page]));
  const allPaths = new Set([...live.keys(), ...local.keys()]);
  const registry = [...allPaths].sort().map((pagePath) => {
    const page = live.get(pagePath) || local.get(pagePath);
    const isLive = live.has(pagePath);
    const isLocal = local.has(pagePath);
    return {
      ...page,
      releaseStatus: isLive ? "live" : "generated-locally",
      productionPresent: isLive,
      localPresent: isLocal,
      reconciliationFlags: [
        ...(!isLive ? ["not-in-production"] : []),
        ...(!isLocal ? ["production-missing-from-local"] : []),
      ],
      researchSources: [],
      openReviewItems: [],
    };
  });
  const byPath = new Map(registry.map((record) => [record.path, record]));
  const catalogIndex = buildCatalogIndex(productionCatalog, localCatalog);
  const researchOnly = new Map();

  for (const intake of intakes) {
    for (const record of intake.records || []) {
      const sourceId = intake.campaignId || intake.id;
      const overrideKey = `${sourceId}::${record.slug}`;
      const override = intake.recordOverrides?.[overrideKey] || null;
      const effectiveRecord = override?.aliases
        ? { ...record, aliases: [...(record.aliases || []), ...override.aliases] }
        : record;
      const research = compactResearchRecord(effectiveRecord, intake, sourceId, override);
      const match = matchResearchRecord(effectiveRecord, catalogIndex);
      if (match) {
        const matchedPath = pagePathsForPlace(match.place).find((candidate) => byPath.has(candidate));
        const existing = matchedPath ? byPath.get(matchedPath) : null;
        if (existing) {
          mergeResearch(existing, research);
          existing.researchMatchBasis ||= [];
          if (!existing.researchMatchBasis.includes(match.basis)) existing.researchMatchBasis.push(match.basis);
          continue;
        }
      }

      const candidatePath = pagePathForResearch(effectiveRecord);
      const signature = catalogKey(effectiveRecord);
      let candidate = researchOnly.get(signature);
      if (!candidate) {
        const reviewItems = research.reviewItems;
        const blocked = override?.status === "blocked-review" || reviewItems.length > 0;
        candidate = {
          id: candidatePath,
          path: candidatePath,
          url: `https://www.auditmap.org${candidatePath}`,
          kind: "parent",
          state: effectiveRecord.state,
          citySlug: slugify(effectiveRecord.city),
          parentSlug: recordSlug(effectiveRecord),
          subsiteSlug: null,
          name: effectiveRecord.name,
          city: effectiveRecord.city,
          latitude: finiteCoordinate(effectiveRecord.latitude),
          longitude: finiteCoordinate(effectiveRecord.longitude),
          positionQuality: effectiveRecord.position_quality || effectiveRecord.positionQuality || null,
          coordinateSource: effectiveRecord.coordinate_source || effectiveRecord.coordinateSource || null,
          releaseStatus: blocked ? "blocked-review" : "research-only",
          productionPresent: false,
          localPresent: false,
          reconciliationFlags: ["research-not-integrated"],
          researchSources: [],
          openReviewItems: [],
        };
        researchOnly.set(signature, candidate);
      }
      mergeResearch(candidate, research);
      if (override?.reason) candidate.openReviewItems.push({
        issue: override.reason,
        recommendation: override.possibleDuplicateOf
          ? `Compare with ${override.possibleDuplicateOf} before integration.`
          : "Resolve before integration.",
      });
      if (candidate.openReviewItems.length) candidate.releaseStatus = "blocked-review";
    }
  }

  registry.push(...researchOnly.values());
  const spatialIndex = buildSpatialIndex(productionLaunchMap, localLaunchMap);
  for (const record of registry) {
    const location = spatialIndex.get(record.path);
    if (!location) continue;
    for (const key of ["name", "city", "latitude", "longitude", "positionQuality", "coordinateSource"]) {
      if (location[key] !== null && location[key] !== undefined) record[key] = location[key];
    }
  }
  registry.sort((left, right) => left.path.localeCompare(right.path));
  return registry;
}

function summarize(records) {
  const count = (predicate) => records.filter(predicate).length;
  return {
    knownDestinations: records.length,
    liveDestinationPages: count((record) => record.productionPresent),
    liveParentPages: count((record) => record.productionPresent && record.kind === "parent"),
    liveSubsitePages: count((record) => record.productionPresent && record.kind === "subsite"),
    hopper: count((record) => !record.productionPresent),
    generatedLocallyNotLive: count((record) => record.releaseStatus === "generated-locally"),
    researchOnly: count((record) => record.releaseStatus === "research-only"),
    blockedReview: count((record) => record.releaseStatus === "blocked-review"),
    productionMissingFromLocal: count(
      (record) => record.productionPresent && !record.localPresent,
    ),
    recordsWithResearchHandoffs: count((record) => record.researchSources.length > 0),
    mappableDestinations: count((record) =>
      Number.isFinite(record.latitude) && Number.isFinite(record.longitude),
    ),
    openReviewItems: records.reduce((total, record) => total + record.openReviewItems.length, 0),
  };
}

function packetType(record) {
  if (record.releaseStatus === "generated-locally") return "release-reconciliation";
  if (["research-only", "blocked-review"].includes(record.releaseStatus)) return "research-completion";
  if (record.productionPresent && !record.localPresent) return "local-production-sync";
  return null;
}

function buildPackets(records, packetSize = 25, claims = []) {
  const claimsByPacket = new Map(claims.map((claim) => [claim.packetId, claim]));
  const groups = new Map();
  for (const record of records) {
    const type = packetType(record);
    if (!type) continue;
    const key = `${type}|${record.state}|${record.citySlug}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  const packets = [];
  for (const [key, group] of [...groups].sort()) {
    const [type, state, citySlug] = key.split("|");
    for (let offset = 0; offset < group.length; offset += packetSize) {
      const items = group.slice(offset, offset + packetSize);
      const id = `${type}-${state.toLowerCase()}-${citySlug}-${String(offset / packetSize + 1).padStart(2, "0")}`;
      const claim = claimsByPacket.get(id) || null;
      packets.push({
        id,
        type,
        state,
        citySlug,
        status: claim?.status === "released" ? "open" : claim?.status || "open",
        claim,
        count: items.length,
        recordIds: items.map((item) => item.id),
        acceptance: type === "release-reconciliation"
          ? "Classify every page as publishable, duplicate/renamed, or blocked; preserve production-only work and pass the applicable validators."
          : type === "local-production-sync"
            ? "Reconcile the production record into the active source line without overwriting newer local work."
            : "Resolve the listed evidence or identity gaps and deliver a source-format, reviewable handoff; do not publish guesses.",
      });
    }
  }
  return packets;
}

function openTaskBrief(document, packets) {
  const summary = document.summary;
  const priority = { "research-completion": 0, "release-reconciliation": 1 };
  const openPackets = packets
    .filter((packet) => packet.status === "open" && packet.type !== "local-production-sync")
    .sort((left, right) =>
      (priority[left.type] ?? 9) - (priority[right.type] ?? 9) || left.id.localeCompare(right.id),
    );
  const packetRows = openPackets.slice(0, 20).map((packet) =>
    `| \`${packet.id}\` | ${packet.type} | ${packet.state} / ${packet.citySlug.replace(/-/g, " ")} | ${packet.count} |`,
  ).join("\n");
  return `# AuditMap Daily OpenTask Ask\n\nGenerated: ${document.asOf}\n\n## Current scoreboard\n\n- **${summary.liveDestinationPages.toLocaleString()}** destination pages are live.\n- **${summary.hopper.toLocaleString()}** known destinations are in the hopper.\n- **${summary.generatedLocallyNotLive.toLocaleString()}** are generated locally but absent from production.\n- **${summary.researchOnly.toLocaleString()}** are research-only candidates awaiting launch-guide work.\n- **${summary.blockedReview.toLocaleString()}** are blocked by named review questions.\n- **${summary.productionMissingFromLocal.toLocaleString()}** live records need internal local/production synchronization.\n\n## Current operating ask\n\nClaim one exact packet ID. Do not start a broad overlapping geography. Reconciliation and release work takes priority while the hopper exceeds 100 records. Every submission must return the packet ID, accepted record IDs, source URLs and checked dates, image-rights records where applicable, commands run, and an unresolved queue. OpenTask records coordination and credit; the repository registry remains the source of truth.\n\nThe production-sync queue is reserved for maintainers and repository integrators because it can overwrite newer live work. Community packets below cover evidence completion and reviewable release reconciliation.\n\n## Open packets\n\n| Packet | Work type | Geography | Records |\n| --- | --- | --- | ---: |\n${packetRows || "| None | — | — | 0 |"}\n\n## Daily merge rule\n\n1. Refresh the registry before assigning work.\n2. Reserve the packet ID in OpenTask and its linked GitHub issue.\n3. Accept only source-format changes or the research handoff template.\n4. Merge through reviewed pull requests and a Vercel preview.\n5. Refresh again after production deployment; only production presence marks a record live.\n`;
}

async function loadLocalIntakes(directory) {
  if (!fs.existsSync(relativePath(directory))) return [];
  const files = fs.readdirSync(relativePath(directory)).filter((file) => file.endsWith(".json"));
  const intakes = [];
  for (const file of files) {
    if (file === path.basename(defaultPaths.externalSources)) continue;
    const document = JSON.parse(fs.readFileSync(path.join(relativePath(directory), file), "utf8"));
    if (Array.isArray(document.records)) intakes.push(document);
  }
  return intakes;
}

async function loadExternalIntakes(configPath) {
  const config = await readJson(configPath);
  const intakes = [];
  for (const source of config.sources || []) {
    const text = await readText(source.recordsUrl);
    const digest = crypto.createHash("sha256").update(text).digest("hex");
    if (source.sha256 && digest !== source.sha256) {
      throw new Error(`External intake changed without review: ${source.id}`);
    }
    const parsed = JSON.parse(text);
    const records = source.format === "records-array" ? parsed : parsed.records;
    if (!Array.isArray(records)) throw new Error(`External intake has no records: ${source.id}`);
    intakes.push({
      ...source,
      campaignId: source.id,
      records,
      recordOverrides: config.recordOverrides || {},
      researchHandoffUrl: source.handoffUrl,
    });
  }
  return intakes;
}

async function build(options) {
  const baseline = localGitBaseline();
  const [productionSitemap, localSitemap, productionCatalog, localCatalog, productionLaunchMap, localLaunchMap, localIntakes, claimsDocument, spatialDocument] = await Promise.all([
    readText(options.productionSitemap),
    readText(options.localSitemap),
    readJson(options.productionCatalog),
    readJson(options.localCatalog),
    readJson(options.productionLaunchMap),
    readJson(options.localLaunchMap),
    loadLocalIntakes(options.intakeDirectory),
    readJson(options.claims),
    readJson(options.spatialSources),
  ]);
  const asOf = options.asOf || new Date().toISOString().slice(0, 10);
  const claims = validateClaimsDocument(claimsDocument, { asOf });
  const externalIntakes = options.includeExternal
    ? await loadExternalIntakes(options.externalSources)
    : [];
  const sitemapLocalPages = parseSitemap(localSitemap);
  const filesystemLocalPages = localPagesFromLaunchMap(localLaunchMap);
  const localPages = [...new Map(
    [...sitemapLocalPages, ...filesystemLocalPages].map((page) => [page.path, page]),
  ).values()];
  const registry = buildRegistry({
    livePages: parseSitemap(productionSitemap),
    localPages,
    productionCatalog,
    localCatalog,
    productionLaunchMap,
    localLaunchMap,
    intakes: [...localIntakes, ...externalIntakes],
  });
  const document = {
    schemaVersion: 1,
    asOf,
    productionEvidence: {
      sitemap: options.productionSitemap,
      catalog: options.productionCatalog,
      catalogGeneratedAt: productionCatalog.generatedAt || null,
    },
    localEvidence: {
      sitemap: options.localSitemap,
      catalog: options.localCatalog,
      catalogGeneratedAt: localCatalog.generatedAt || null,
      gitBranch: baseline.branch,
      gitCommit: baseline.commit,
    },
    spatialEvidence: {
      registry: options.spatialSources,
      checkedAt: spatialDocument.checkedAt || null,
      registeredSources: (spatialDocument.sources || []).length,
      publicationApprovedSources: (spatialDocument.sources || []).filter((source) =>
        String(source.licenseStatus || "").startsWith("approved-"),
      ).length,
      reviewRequiredSources: (spatialDocument.sources || []).filter((source) =>
        String(source.licenseStatus || "").includes("review-required"),
      ).length,
    },
    summary: summarize(registry),
    records: registry,
  };
  const packets = buildPackets(registry, 25, claims);
  validateActiveClaimReferences(packets, claims);
  return {
    document,
    packetDocument: { schemaVersion: 1, asOf, summary: document.summary, packets },
    brief: openTaskBrief(document, packets),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await build(options);
  if (options.write) {
    for (const [file, content] of [
      [options.output, `${JSON.stringify(result.document, null, 2)}\n`],
      [options.packetsOutput, `${JSON.stringify(result.packetDocument, null, 2)}\n`],
      [options.briefOutput, result.brief],
    ]) {
      const outputPath = relativePath(file);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, content);
    }
  }
  process.stdout.write(`${JSON.stringify(result.document.summary, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  buildPackets,
  buildRegistry,
  buildSpatialIndex,
  destinationFromUrl,
  localPagesFromLaunchMap,
  matchResearchRecord,
  normalize,
  openTaskBrief,
  parseSitemap,
  summarize,
  validateActiveClaimReferences,
  validateClaimsDocument,
};
