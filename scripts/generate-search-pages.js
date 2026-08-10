const fs = require("node:fs");
const path = require("node:path");
const { buildEnrichmentQueue } = require("../api/_lib/proactive-enrichment");
const {
  applyReviewedKnowledge,
  latestDate,
  normalizeReviewedKnowledge,
  placeLastModified,
} = require("./lib/reviewed-knowledge");

const projectRoot = path.resolve(__dirname, "..");
const outputRoot = process.env.AUDITMAP_OUTPUT_ROOT
  ? path.resolve(process.env.AUDITMAP_OUTPUT_ROOT)
  : projectRoot;
const baseUrl = "https://www.auditmap.org";
const logoUrl = `${baseUrl}/logo.svg`;
const assetVersion = "20260810-62";
const styleVersion = "20260807-42";

function readJson(relativePath, fallback = null) {
  const filePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonFile(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseGenerationScope(argv) {
  const parkIds = new Set();
  const campaignPaths = [];
  const scopeRequested = argv.length > 0;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!["--parks", "--campaign"].includes(argument)) {
      throw new Error(`Unknown generator option: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${argument} requires a value`);
    }
    index += 1;
    if (argument === "--parks") {
      value.split(",").map((item) => item.trim()).filter(Boolean).forEach((id) => parkIds.add(id));
    } else {
      campaignPaths.push(value);
    }
  }

  for (const campaignPath of campaignPaths) {
    const absolutePath = path.resolve(projectRoot, campaignPath);
    const campaign = readJsonFile(absolutePath);
    if (!campaign || !Array.isArray(campaign.places)) {
      throw new Error(`${campaignPath} must contain a places array`);
    }
    campaign.places
      .filter((place) => !place.deferRelease)
      .forEach((place) => parkIds.add(place.id));
  }

  if (scopeRequested && parkIds.size === 0) {
    throw new Error("Scoped generation did not select any publishable places");
  }

  return {
    parkIds,
    scoped: scopeRequested,
  };
}

function readCsv(relativePath) {
  const filePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift());
  return lines.map((line) =>
    Object.fromEntries(headers.map((header, index) => [header, parseCsvLine(line)[index] || ""])),
  );
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value);
  return values;
}

function writeFile(relativePath, content) {
  const filePath = path.join(outputRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const normalized = relativePath.endsWith(".html")
    ? content.replace(/[ \t]+$/gm, "")
    : content;
  fs.writeFileSync(filePath, normalized);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPlaceAddress(place) {
  const address = String(place?.address || "").trim();
  const city = String(place?.city || "").trim();
  const state = String(place?.state || "").trim();
  const normalized = address.toLowerCase();
  const parts = address ? [address] : [];
  if (city && !normalized.includes(city.toLowerCase())) parts.push(city);
  if (state && !new RegExp(`(^|[^a-z])${state.toLowerCase()}([^a-z]|$)`).test(normalized)) {
    parts.push(state);
  }
  return parts.join(", ");
}

function optimizedImageUrl(url, width, quality = 78) {
  if (!url || /^data:|^blob:/i.test(url)) return url || "";
  return `/_vercel/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
}

function responsiveImageAttributes(url, {
  widths = [320, 480, 640, 828, 1080, 1400],
  sizes = "100vw",
  priority = false,
} = {}) {
  if (!url || /^data:|^blob:/i.test(url)) {
    return `src="${escapeHtml(url || "")}"${priority ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"'} decoding="async"`;
  }
  const srcset = widths
    .map((width) => `${optimizedImageUrl(url, width)} ${width}w`)
    .join(", ");
  return `src="${optimizedImageUrl(url, widths[Math.min(widths.length - 1, 3)])}" srcset="${escapeHtml(srcset)}" sizes="${escapeHtml(sizes)}"${priority ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"'} decoding="async"`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function answerFragment(intentKey, question) {
  let hash = 2166136261;
  for (const character of String(question || "")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${slugify(intentKey || "answer").slice(0, 24)}-${(hash >>> 0).toString(36)}`;
}

function isSearchPark(place) {
  return place.searchCategory === "park";
}

function isPublishablePlace(place) {
  if (["excluded", "deferred"].includes(place.publishStatus)) return false;
  const identity = `${place.name || ""} ${place.type || ""} ${place.searchCategory || ""}`;
  const ordinaryMunicipalBuilding = /\b(city|town|municipal|county)\s+(hall|office|offices|building|administration|administrative center)|\bgovernment\s+(center|office|offices|building)\b/i.test(identity);
  const administrativeType = /\b(city office|municipal office|government office|civic resource)\b/i.test(identity);
  const publicDestination = /\b(park|plaza|garden|museum|gallery|historic|landmark|memorial|trail|greenway|library|playground|recreation)\b/i.test(identity);
  return (!ordinaryMunicipalBuilding && !administrativeType) || publicDestination || place.publicDestination === true;
}

function stateSegment(value) {
  return slugify(value);
}

function citySegment(place) {
  return slugify(place.city);
}

function placeSegment(place) {
  return place.slug || slugify(place.name || place.id);
}

function categorySegment(place) {
  const category = slugify(place.searchCategory || "place");
  if (category === "library") return "libraries";
  if (category === "park") return "parks";
  return category.endsWith("s") ? category : `${category}s`;
}

function placePath(place) {
  if (place.canonicalPath) return place.canonicalPath;
  return `/us/${stateSegment(place.state)}/${citySegment(place)}/${categorySegment(place)}/${placeSegment(place)}`;
}

function subsitePath(place, feature) {
  return `${placePath(place)}/${feature.slug || slugify(feature.name || feature.id)}`;
}

function cityHubPath(place) {
  return `/us/${stateSegment(place.state)}/${citySegment(place)}/parks`;
}

function stateHubPath(state) {
  return `/us/${stateSegment(state)}`;
}

function formatDate(value) {
  if (!value) return "Not recorded";
  const text = String(value).trim();
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T12:00:00-04:00`)
    : new Date(text);
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
}

function mergePlaces(seed, shared) {
  const records = new Map();
  for (const place of [...seed, ...(shared || [])]) {
    records.set(place.id, { ...(records.get(place.id) || {}), ...place });
  }
  return [...records.values()];
}

function withFeatureGalleryImages(place) {
  const featureImages = (place.features || [])
    .filter(
      (feature) =>
        feature.details?.imageUrl && feature.details?.includeInParentGallery !== false,
    )
    .map((feature) => ({
      url: feature.details.imageUrl,
      source: feature.details.imageSourceUrl || feature.source_url || place.source,
      author: feature.details.imageAuthor || feature.source_label || "Source",
      license: feature.details.imageLicense || "Source terms apply",
      alt: feature.details.imageAlt || `${feature.name} at ${place.name}`,
      label: feature.name,
      origin: "subsite",
      featureId: feature.id,
      latitude: Number(feature.latitude),
      longitude: Number(feature.longitude),
    }));
  const primaryUrl = place.image?.url;
  const images = [...(place.images || []), ...featureImages].filter(
    (image, index, candidates) =>
      image?.url &&
      image.url !== primaryUrl &&
      candidates.findIndex((candidate) => candidate?.url === image.url) === index,
  );
  return { ...place, images };
}

function launchCandidatePlaces(rows, existingPlaces, locations = [], enrichments = []) {
  const existingKeys = new Set(
    existingPlaces.map((place) =>
      [place.state, place.city, place.name].map((value) => slugify(value)).join("|"),
    ),
  );
  const locationsById = new Map(locations.map((location) => [location.id, location]));
  const enrichmentsById = new Map(enrichments.map((enrichment) => [enrichment.id, enrichment]));

  return rows
    .filter((row) => !existingKeys.has([row.state, row.city, row.park].map(slugify).join("|")))
    .map((row) => {
      const id = `launch-${slugify(row.state)}-${slugify(row.city)}-${slugify(row.park)}`;
      const location = locationsById.get(id);
      const enrichment = enrichmentsById.get(id) || {};
      const facts = enrichment.facts || {};
      const sourcedImages = (enrichment.images || []).map((image) => ({
        ...image,
        alt:
          !image.alt || /\bpark park photograph\b/i.test(image.alt)
            ? `${row.park} in ${row.city}`
            : image.alt,
      }));
      const accessibility = {
        yes: "OpenStreetMap marks this park as wheelchair accessible.",
        limited: "OpenStreetMap marks wheelchair access as limited.",
        no: "OpenStreetMap marks this park as not wheelchair accessible.",
      }[facts.wheelchair];
      const cost = facts.fee === "no"
        ? "No general access fee is marked in OpenStreetMap."
        : facts.fee === "yes"
          ? "A fee is marked for this park; confirm the current amount before visiting."
          : undefined;
      const primarySource = facts.officialWebsite || location?.sourceUrl;
      return {
      id,
      name: row.park,
      type: "Park",
      city: row.city,
      state: row.state,
      country: "US",
      citySlug: slugify(`${row.city}-${row.state}`),
      slug: slugify(row.park),
      searchCategory: "park",
      neighborhood: row.city,
      status: location ? "Basic nationwide park record" : "Nationwide launch research candidate",
      summary: location
        ? `${row.park} is a major ${row.city} park in AuditMap's nationwide launch. Its location${facts.operator ? `, operator (${facts.operator}),` : ""} and available baseline visit details are sourced; deeper arrival guidance and internal destinations are still being added.`
        : `${row.park} is a major ${row.city} park selected for AuditMap's nationwide research queue. Its location still needs confirmation before it can appear on the map.`,
      searchDescription: location
        ? `Location and address for ${row.park} in ${row.city}, ${row.state}, with additional park details in progress.`
        : `AuditMap research page for ${row.park} in ${row.city}, ${row.state}.`,
      address: location?.address,
      latitude: location?.latitude,
      longitude: location?.longitude,
      hours: facts.hours || undefined,
      cost,
      accessibility,
      sourceLabel: facts.officialWebsite
        ? facts.operator || "Official park website"
        : location?.source,
      source: primarySource,
      verifiedAt: location?.checkedAt,
      operator: facts.operator || undefined,
      image: sourcedImages[0],
      images: sourcedImages.slice(1),
      factSources: {
        ...(facts.hours
          ? { hours: { label: "OpenStreetMap park record", url: facts.sourceUrl, checkedAt: facts.checkedAt } }
          : {}),
        ...(cost
          ? { cost: { label: "OpenStreetMap park record", url: facts.sourceUrl, checkedAt: facts.checkedAt } }
          : {}),
        ...(accessibility
          ? { accessibility: { label: "OpenStreetMap park record", url: facts.sourceUrl, checkedAt: facts.checkedAt } }
          : {}),
      },
      sources: [
        ...(location?.sourceUrl && location.sourceUrl !== primarySource
          ? [{ label: location.source, url: location.sourceUrl, note: "Map location and address" }]
          : []),
        ...(facts.wikipedia
          ? [{
              label: "Wikipedia background",
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(facts.wikipedia.replace(/^en:/, "").replaceAll(" ", "_"))}`,
              note: "Background reference",
            }]
          : []),
      ],
      launchTier: row.launch_tier,
      likelySubsites: row.likely_subsites === "yes",
      publishStatus: location ? "basic" : "research",
      researchQueue: [
        ...(location
          ? []
          : [{ intentKey: "location", question: "Confirm the park address and map location." }]),
        ...(!facts.officialWebsite
          ? [{ intentKey: "official-source", question: "Confirm the official park page and operating authority." }]
          : []),
        ...(sourcedImages.length < 3
          ? [{
              intentKey: "photos",
              question: sourcedImages.length
                ? `Add ${3 - sourcedImages.length} more real, reusable park ${3 - sourcedImages.length === 1 ? "photograph" : "photographs"} with credits.`
                : "Source at least one real, reusable park photograph with credits.",
            }]
          : []),
        { intentKey: "arrival", question: "Verify the address, entrances, parking, transit, hours, and fees." },
        { intentKey: "accessibility", question: "Document accessible arrival, routes, restrooms, and amenities." },
        { intentKey: "subsites", question: "Map the major destinations and facilities within this park." },
      ],
    };
    });
}

function isPublishedPlace(place) {
  return place.publishStatus !== "research";
}

function documented(value) {
  return value && !/need(s)?|not yet|check .*current/i.test(String(value));
}

function derivedAnswers(place) {
  const answers = [...(place.searchAnswers || [])];
  const seen = new Set(answers.map((answer) => answer.intentKey));

  const fallbacks = [
    {
      intentKey: "fees",
      question: `How much does ${place.name} cost?`,
      answer: place.cost,
    },
    {
      intentKey: "accessibility",
      question: `How accessible is ${place.name}?`,
      answer: place.accessibility,
    },
    {
      intentKey: "transit",
      question: `How do you reach ${place.name}?`,
      answer: place.transit,
    },
  ];

  for (const fallback of fallbacks) {
    if (!seen.has(fallback.intentKey) && documented(fallback.answer)) {
      answers.push({
        ...fallback,
        sourceLabel: place.sourceLabel,
        source: place.source,
        sourceType: "official",
        checkedAt: place.verifiedAt,
      });
    }
  }

  return answers;
}

function subsiteAnswers(place, feature) {
  const sourceLabel =
    feature.details?.informationSourceLabel || feature.source_label || place.sourceLabel;
  const source =
    feature.details?.informationSourceUrl || feature.source_url || place.source;
  const checkedAt =
    feature.details?.informationCheckedAt || feature.verified_at || place.verifiedAt;
  const customAnswers = (feature.details?.searchAnswers || []).filter(
    (answer) => answer?.question && answer?.answer,
  );
  const customKeys = new Set(customAnswers.map((answer) => answer.intentKey).filter(Boolean));
  const fallbackAnswers = [
    {
      intentKey: "overview",
      question: `What is ${feature.name} at ${place.name}?`,
      answer: feature.description,
    },
    {
      intentKey: "location",
      question: `Where exactly is ${feature.name} within ${place.name}?`,
      answer:
        feature.details?.locationContext ||
        `${feature.name} is mapped within ${place.name}. Use the page map for its exact position.`,
    },
    {
      intentKey: "need-to-know",
      question: `What should I know before visiting ${feature.name}?`,
      answer:
        feature.details?.needToKnow ||
        `Conditions can change. Check the cited ${feature.name} source before a time-sensitive visit.`,
    },
  ].filter((answer) => answer.answer && !customKeys.has(answer.intentKey));
  const answers = [...customAnswers, ...fallbackAnswers];
  const inheritedKeys = new Set([
    "parking", "entrance", "restroom", "accessibility", "closures", "fees", "transit",
  ]);
  const inheritedIntents = new Set();
  for (const answer of place.searchAnswers || []) {
    if (
      !inheritedKeys.has(answer.intentKey) ||
      inheritedIntents.has(answer.intentKey) ||
      customKeys.has(answer.intentKey)
    ) continue;
    inheritedIntents.add(answer.intentKey);
    answers.push({
      ...answer,
      question: answer.question.replace(new RegExp(place.name, "gi"), feature.name),
    });
  }
  return answers.map((answer) => ({
    sourceLabel,
    source,
    sourceType: "official",
    checkedAt,
    ...answer,
    sourceLabel: answer.sourceLabel || sourceLabel,
    source: answer.source || source,
    checkedAt: answer.checkedAt || checkedAt,
  })).slice(0, Math.max(6, customAnswers.length));
}

function asSubsitePlace(place, feature) {
  const featureImage = feature.details?.imageUrl
    ? {
        url: feature.details.imageUrl,
        source: feature.details.imageSourceUrl || feature.source_url || place.source,
        author: feature.details.imageAuthor || feature.source_label || place.sourceLabel,
        license: feature.details.imageLicense || "Source terms apply",
        alt: feature.details.imageAlt || `${feature.name} at ${place.name}`,
        featureId: feature.id,
        latitude: Number(feature.latitude),
        longitude: Number(feature.longitude),
      }
    : null;
  const summaryParts = [];
  const seenSummaryParts = new Set();
  for (const value of [
    feature.description,
    feature.details?.locationContext,
    feature.details?.needToKnow,
  ]) {
    const text = String(value || "").trim();
    const key = text.toLowerCase().replace(/\s+/g, " ");
    if (text && !seenSummaryParts.has(key)) {
      seenSummaryParts.add(key);
      summaryParts.push(text);
    }
  }
  return {
    ...place,
    id: `${place.id}--${feature.slug || feature.id}`,
    slug: feature.slug || slugify(feature.name),
    canonicalPath: subsitePath(place, feature),
    parentId: place.id,
    parentPlace: { id: place.id, name: place.name, path: placePath(place) },
    featureDataExcludeId: feature.id,
    name: feature.name,
    type: feature.feature_type || "Park destination",
    neighborhood: place.name,
    status: `Destination within ${place.name}`,
    address: feature.details?.address || place.address,
    hours: feature.details?.hours || place.hours,
    temporarilyClosed: feature.details?.temporarilyClosed === true,
    hoursSchedule: feature.details?.hoursSchedule === false
      ? false
      : feature.details?.hoursSchedule || place.hoursSchedule || null,
    cost: feature.details?.cost || place.cost,
    accessibility: feature.details?.accessibility || place.accessibility,
    transit: feature.details?.transit || place.transit,
    amenities: feature.details?.amenities || [],
    externalRating: feature.details?.externalRating || null,
    latitude: feature.latitude,
    longitude: feature.longitude,
    summary: summaryParts.join(" "),
    searchDescription: `Plan a visit to ${feature.name} at ${place.name} with sourced location, arrival, accessibility, seasonal, and essential visitor information.`,
    sourceLabel:
      feature.details?.informationSourceLabel || feature.source_label || place.sourceLabel,
    source:
      feature.details?.informationSourceUrl || feature.source_url || place.source,
    verifiedAt: latestDate(
      feature.details?.informationCheckedAt,
      feature.verified_at,
      place.verifiedAt,
      place.knowledgeUpdatedAt,
    ),
    knowledgeUpdatedAt: place.knowledgeUpdatedAt || null,
    image: featureImage,
    images: (feature.details?.images || []).map((image) => ({
      source: feature.details?.imageSourceUrl || feature.source_url || place.source,
      author: feature.details?.imageAuthor || feature.source_label || place.sourceLabel,
      license: feature.details?.imageLicense || "Source terms apply",
      ...image,
    })),
    media360: feature.details?.media360 || [],
    searchAnswers: subsiteAnswers(place, feature),
    features: (place.features || []).filter((candidate) => candidate.id !== feature.id),
    comments: [],
  };
}

function uniqueSources(place, answers) {
  const all = [
    {
      label: place.sourceLabel,
      url: place.source,
      note: "Official place record",
    },
    ...(answers || []).map((answer) => ({
      label: answer.sourceLabel || "Source",
      url: answer.source,
      note: answer.intentKey ? `${answer.intentKey} answer` : "Answer source",
    })),
    ...(place.sources || []).map((source) => ({
      label: source.label,
      url: source.url,
      note: source.note || "Public reference",
    })),
    ...[place.image, ...(place.images || [])]
      .filter(Boolean)
      .map((image) => ({
        label: image.author ? `Photo by ${image.author}` : "Photo source",
        url: image.source,
        note: image.license || "Image reference",
      })),
  ].filter((source) => source.url);

  return [...new Map(all.map((source) => [source.url, source])).values()];
}

function organizationSchema() {
  return {
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: "AuditMap",
    url: baseUrl,
    logo: logoUrl,
  };
}

function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    url: baseUrl,
    name: "AuditMap",
    publisher: { "@id": `${baseUrl}/#organization` },
  };
}

function collectionPageSchema({ pathName, name, description, imageUrl, items }) {
  const canonicalUrl = `${baseUrl}${pathName}`;
  return {
    "@type": "CollectionPage",
    "@id": `${canonicalUrl}#collection`,
    url: canonicalUrl,
    name,
    description,
    isPartOf: { "@id": `${baseUrl}/#website` },
    primaryImageOfPage: imageUrl
      ? { "@type": "ImageObject", contentUrl: absoluteMediaUrl(imageUrl) }
      : undefined,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: `${baseUrl}${item.path}`,
      })),
    },
  };
}

function absoluteMediaUrl(value) {
  return new URL(value || logoUrl, `${baseUrl}/`).href;
}

function breadcrumbSchema(items, currentPath = null) {
  const normalizedItems = items
    .map((item, index) => ({
      ...item,
      path: item.path || (currentPath && index === items.length - 1 ? currentPath : null),
    }))
    .filter((item) => item.path);
  return {
    "@type": "BreadcrumbList",
    itemListElement: normalizedItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.path}`,
    })),
  };
}

function clientFeatureData(place) {
  return (place.features || []).map((feature, index) => ({
    id: feature.id,
    slug: feature.slug,
    name: feature.name,
    feature_type: feature.feature_type,
    description: feature.description,
    latitude: feature.latitude,
    longitude: feature.longitude,
    source_label: feature.source_label,
    source_url: feature.source_url,
    verified_at: feature.verified_at,
    details: {
      category: feature.details?.category,
      includeInParentGallery: feature.details?.includeInParentGallery,
      officialMapUrl: index === 0 ? feature.details?.officialMapUrl : undefined,
      positionQuality: feature.details?.positionQuality,
      coordinateSource: feature.details?.coordinateSource,
      informationSourceLabel: feature.details?.informationSourceLabel,
      informationSourceUrl: feature.details?.informationSourceUrl,
      informationCheckedAt: feature.details?.informationCheckedAt,
      imageUrl: feature.details?.imageUrl,
      imageSourceUrl: feature.details?.imageSourceUrl,
      imageAuthor: feature.details?.imageAuthor,
      imageLicense: feature.details?.imageLicense,
      imageAlt: feature.details?.imageAlt,
      media360: feature.details?.media360,
    },
  }));
}

function clientPlaceData(place, { includeFeatures = true } = {}) {
  const { searchAnswers, ...placeWithoutAnswers } = place;
  return {
    ...placeWithoutAnswers,
    images: place.parentPlace
      ? place.images || []
      : (place.images || []).filter((image) => image.origin !== "subsite"),
    features: includeFeatures ? clientFeatureData(place) : undefined,
    featureDataUrl: (place.features || []).length
      ? `${place.parentPlace?.path || placePath(place)}/features.json`
      : undefined,
  };
}

function pageShell({ title, description, canonicalPath, imageUrl, modifiedAt, schema, bodyClass, pageData, body }) {
  const ldJson = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": schema,
  }).replace(/</g, "\\u003c");

  const embeddedData = pageData
    ? `<script id="search-place-data" type="application/json">${JSON.stringify(clientPlaceData(pageData)).replace(/</g, "\\u003c")}</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${baseUrl}${canonicalPath}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="AuditMap" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${baseUrl}${canonicalPath}" />
    <meta property="og:image" content="${escapeHtml(absoluteMediaUrl(imageUrl))}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta property="article:modified_time" content="${escapeHtml(modifiedAt)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles.css?v=${assetVersion}" />
    <script type="application/ld+json">${ldJson}</script>
  </head>
  <body class="${bodyClass}" data-page="${bodyClass}">
    <header class="site-header">
      <div class="brand-lockup">
        <a class="brand" href="/index.html" aria-label="AuditMap home">
          <img src="/logo.svg" alt="" />
          <span>AuditMap</span>
        </a>
        <p>The public's guide to public places.</p>
      </div>
      <p class="header-community-note">Built by explorers. Useful to everyone.</p>
    </header>
    <div class="mobile-brand-path" aria-label="How AuditMap works">
      <span>Browse</span><i></i><span>Explore</span><i></i><strong>Leave a note</strong>
    </div>
    ${body}
    ${embeddedData}
    <script src="/config.js"></script>
    <script src="/app.js?v=${assetVersion}"></script>
  </body>
</html>
`;
}

function parkSchema(place, answers, pathName) {
  const image = absoluteMediaUrl(place.image?.url || place.images?.[0]?.url);
  return {
    "@type": "Place",
    "@id": `${baseUrl}${pathName}#place`,
    name: place.name,
    alternateName: [
      place.officialName,
      ...(place.alternateNames || []),
    ].filter((name, index, names) => name && name !== place.name && names.indexOf(name) === index),
    description: place.searchDescription || place.summary,
    url: `${baseUrl}${pathName}`,
    isPartOf: place.parentPlace
      ? {
          "@type": "Place",
          name: place.parentPlace.name,
          url: `${baseUrl}${place.parentPlace.path}`,
        }
      : undefined,
    image,
    address: {
      "@type": "PostalAddress",
      streetAddress: place.address,
      addressLocality: place.city,
      addressRegion: place.state,
      addressCountry: place.country || "US",
    },
    geo: Number.isFinite(Number(place.latitude)) && Number.isFinite(Number(place.longitude))
      ? {
          "@type": "GeoCoordinates",
          latitude: Number(place.latitude),
          longitude: Number(place.longitude),
        }
      : undefined,
    amenityFeature: answers.slice(0, 8).map((answer) => ({
      "@type": "LocationFeatureSpecification",
      name: answer.intentKey || answer.question,
      value: true,
      description: answer.answer,
    })),
  };
}

function breadcrumbsMarkup(items) {
  return `<nav class="search-breadcrumbs" aria-label="Breadcrumbs">${items
    .map((item, index) => {
      const crumb = item.path
        ? `<a href="${item.path}">${escapeHtml(item.name)}</a>`
        : `<span>${escapeHtml(item.name)}</span>`;
      return `${index ? '<span aria-hidden="true">/</span>' : ""}${crumb}`;
    })
    .join("")}</nav>`;
}

function mappedFeatures(place) {
  return (place.features || []).filter(
    (feature) =>
      Number.isFinite(Number(feature.latitude)) &&
      Number.isFinite(Number(feature.longitude)),
  );
}

function officialCatalog(place) {
  if (!isPublishedPlace(place)) return [];
  const core = [
    ["hours", "Hours", place.hours],
    ["cost", "Cost and fees", place.cost],
    ["accessibility", "Accessibility", place.accessibility],
    ["transit", "Transit and arrival", place.transit],
    ["amenities", "Amenities", (place.amenities || []).join(", ")],
    ["address", "Address", formatPlaceAddress(place)],
  ]
    .filter(([, , value]) => value && !/not yet|needs? (community )?(verification|documentation)/i.test(value))
    .map(([key, label, value]) => {
      const factSource = place.factSources?.[key];
      return {
        key,
        label,
        value,
        scope: "place",
        sourceLabel: factSource?.label || place.sourceLabel,
        sourceUrl: factSource?.url || place.source,
        checkedAt: factSource?.checkedAt || place.verifiedAt || null,
        expiresAt: factSource?.expiresAt || null,
        sourceType: factSource?.sourceType || "official",
        verificationStatus: place.factVerificationStatus?.[key] || "verified",
      };
    });
  const answers = (place.searchAnswers || []).map((answer) => ({
    key: answer.intentKey || slugify(answer.question),
    label: answer.question,
    value: answer.answer,
    scope: "place",
    sourceLabel: answer.sourceLabel || place.sourceLabel,
    sourceUrl: answer.source || place.source,
    checkedAt: answer.checkedAt || place.verifiedAt || null,
    expiresAt: answer.expiresAt || null,
    sourceType: answer.sourceType || "official",
    verificationStatus: answer.verificationStatus || "verified",
  }));
  const features = (place.features || []).map((feature) => ({
    key: feature.slug || feature.id,
    label: feature.name,
    value: feature.description,
    scope: "feature",
    featureId: feature.id,
    featureType: feature.feature_type,
    positionQuality: feature.details?.positionQuality || null,
    sourceLabel: feature.source_label || place.sourceLabel,
    sourceUrl: feature.source_url || place.source,
    checkedAt: feature.verified_at || place.verifiedAt || null,
    expiresAt: null,
    sourceType: "official",
  }));
  return [...core, ...answers, ...features];
}

// Dix Park established the feature-map pattern. Every feature-rich park uses this
// same markup and client renderer so new parks cannot drift into bespoke layouts.
function submapMarkup(place) {
  const features = mappedFeatures(place);
  if (features.length < 2) return "";
  return `
    <section class="place-explorer search-park-submap" id="place-explorer" hidden>
      <div class="place-explorer-heading">
        <div>
          <p class="kicker" id="explorer-kicker">${escapeHtml(place.name)} field guide</p>
          <h2 id="explorer-title">Explore the grounds</h2>
          <p>Choose a destination, preview what it looks like, then open Explorer for live on-site guidance.</p>
        </div>
        <div class="site-map-heading-actions">
          <span id="site-map-summary"></span>
          <a id="launch-place-explorer" class="launch-place-explorer" href="#" hidden>Open Explorer</a>
          <button id="expand-site-map-button" type="button" aria-expanded="false">Open full map</button>
          <a id="explorer-source" href="#" target="_blank" rel="noreferrer">Official map ↗</a>
        </div>
      </div>
      <div class="feature-filters" id="feature-filters" aria-label="Filter park destinations"></div>
      <div class="place-explorer-layout">
        <div class="internal-map" id="internal-map" aria-label="Map of destinations within ${escapeHtml(place.name)}"></div>
        <div class="feature-browser">
          <p class="feature-browser-count" id="feature-browser-count"></p>
          <div class="feature-list" id="feature-list"></div>
        </div>
      </div>
    </section>
  `;
}

function renderSearchParkPageLegacy(place, relatedParks) {
  const pathName = placePath(place);
  const answers = derivedAnswers(place);
  const sources = uniqueSources(place, answers);
  const modifiedAt = placeLastModified(
    { ...place, searchAnswers: answers },
    new Date().toISOString().slice(0, 10),
  );
  const heroImage = place.image?.url || place.images?.[0]?.url || null;
  const breadcrumbs = [
    { name: "United States", path: "/us" },
    { name: place.state, path: stateHubPath(place.state) },
    { name: `${place.city} parks`, path: cityHubPath(place) },
    { name: place.name },
  ];
  const schema = [
    organizationSchema(),
    websiteSchema(),
    breadcrumbSchema(breadcrumbs, pathName),
    parkSchema(place, answers, pathName),
  ];

  const body = `
    <main class="search-shell">
      ${breadcrumbsMarkup(breadcrumbs)}
      <section class="search-hero">
        <div>
          <p class="kicker">${escapeHtml(place.type)} · ${escapeHtml(place.city)}, ${escapeHtml(place.state)}</p>
          <h1>${escapeHtml(place.name)}</h1>
          <p class="search-summary">${escapeHtml(place.summary)}</p>
          <div class="search-actions">
            <button type="button" id="share-place-button">Share</button>
            <a id="navigate-place-link" href="#" target="_blank" rel="noreferrer">Navigate</a>
            <button type="button" id="favorite-place-button" aria-pressed="false">Favorite</button>
            <a id="search-live-map-link" href="/place.html?id=${encodeURIComponent(place.id)}">Live place page</a>
          </div>
          <p class="place-action-status" id="place-action-status" role="status"></p>
          <div class="search-badges">
            <span class="search-badge">Checked ${escapeHtml(formatDate(modifiedAt))}</span>
            <span class="search-badge">${escapeHtml(answers.length)} sourced answers</span>
            <span class="search-badge">${escapeHtml((place.features || []).length)} mapped sublocations</span>
          </div>
          ${heroImage ? `<img class="search-hero-image" ${responsiveImageAttributes(heroImage, { sizes: "(max-width: 760px) 100vw, min(68vw, 1040px)", priority: true })} alt="${escapeHtml(place.image?.alt || place.name)}" />` : ""}
        </div>
        <div class="search-meta-grid">
          <div>
            <span>Address</span>
            <strong>${escapeHtml(formatPlaceAddress(place))}</strong>
          </div>
          <div>
            <span>Hours</span>
            <strong>${escapeHtml(place.hours || "Check the official page for current hours.")}</strong>
          </div>
          <div>
            <span>Cost</span>
            <strong>${escapeHtml(place.cost || "Not yet documented")}</strong>
          </div>
          <div>
            <span>Accessibility</span>
            <strong>${escapeHtml(place.accessibility || "Not yet documented")}</strong>
          </div>
          <div>
            <span>Official source</span>
            <strong><a href="${escapeHtml(place.source)}" target="_blank" rel="noreferrer">${escapeHtml(place.sourceLabel)} ↗</a></strong>
          </div>
        </div>
      </section>

      ${submapMarkup(place)}

      <div class="search-content-grid">
        <div class="search-main-column">
          <section class="search-section">
            <div class="search-section-header">
              <div>
                <p class="kicker">Best-known answers</p>
                <h2>Top visit questions for this park</h2>
              </div>
              <span>${escapeHtml(answers.length)} sourced answers</span>
            </div>
            <div class="search-answer-grid">
              ${answers
                .map(
                  (answer) => `
                    <article class="search-answer-card" id="answer-${escapeHtml(answer.intentKey || slugify(answer.question))}">
                      <h3>${escapeHtml(answer.question)}</h3>
                      <p>${escapeHtml(answer.answer)}</p>
                      <div class="search-answer-meta">
                        <span>${escapeHtml(answer.intentKey || "park-answer")}</span>
                        <span>Checked ${escapeHtml(formatDate(answer.checkedAt || place.verifiedAt))}</span>
                        <span>${escapeHtml(answer.sourceType || "official")}</span>
                      </div>
                      ${
                        answer.source
                          ? `<a href="${escapeHtml(answer.source)}" target="_blank" rel="noreferrer">${escapeHtml(answer.sourceLabel || "Source")} ↗</a>`
                          : ""
                      }
                    </article>
                  `,
                )
                .join("")}
            </div>
          </section>

          <section class="search-section">
            <div class="search-section-header">
              <div>
                <p class="kicker">Inside the park</p>
                <h2>Mapped sublocations and landmarks</h2>
              </div>
              <span>${escapeHtml((place.features || []).length)} feature records</span>
            </div>
            <div class="search-feature-grid">
              ${(place.features || []).length
                ? place.features
                    .map(
                      (feature) => `
                        <article class="search-feature-card">
                          ${
                            feature.details?.imageUrl
                              ? `<img ${responsiveImageAttributes(feature.details.imageUrl, { widths: [320, 480, 640], sizes: "(max-width: 720px) 82vw, 360px" })} alt="${escapeHtml(feature.details.imageAlt || feature.name)}">`
                              : ""
                          }
                          <h3>${escapeHtml(feature.name)}</h3>
                          <p>${escapeHtml(feature.description || "AuditMap is still documenting this area.")}</p>
                          ${
                            feature.details?.locationContext
                              ? `<p class="search-feature-detail"><strong>Where:</strong> ${escapeHtml(feature.details.locationContext)}</p>`
                              : ""
                          }
                          ${
                            feature.details?.needToKnow
                              ? `<p class="search-feature-detail"><strong>Need to know:</strong> ${escapeHtml(feature.details.needToKnow)}</p>`
                              : ""
                          }
                          <div class="search-answer-meta">
                            <span>${escapeHtml(feature.feature_type || "feature")}</span>
                            <span>${escapeHtml(feature.level_label || "Park feature")}</span>
                            <span>Checked ${escapeHtml(formatDate(feature.verified_at || place.verifiedAt))}</span>
                          </div>
                          ${
                            feature.source_url
                              ? `<a href="${escapeHtml(feature.source_url)}" target="_blank" rel="noreferrer">${escapeHtml(feature.source_label || "Feature source")} ↗</a>`
                              : ""
                          }
                          ${
                            feature.details?.informationSourceUrl &&
                            feature.details.informationSourceUrl !== feature.source_url
                              ? `<a href="${escapeHtml(feature.details.informationSourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(feature.details.informationSourceLabel || "Information source")} ↗</a>`
                              : ""
                          }
                          ${
                            feature.details?.imageSourceUrl
                              ? `<a class="search-photo-credit" href="${escapeHtml(feature.details.imageSourceUrl)}" target="_blank" rel="noreferrer">Photo: ${escapeHtml(feature.details.imageAuthor || feature.source_label || "Source")}${feature.details.imageLicense ? ` · ${escapeHtml(feature.details.imageLicense)}` : ""} ↗</a>`
                              : ""
                          }
                        </article>
                      `,
                    )
                    .join("")
                : '<p class="search-empty-copy">Feature-level mapping is still growing for this park.</p>'}
            </div>
          </section>

          <section class="search-section">
            <div class="search-section-header">
              <div>
                <p class="kicker">Live updates</p>
                <h2>AuditMap knowledge and community context</h2>
              </div>
            </div>
            <div class="search-section-list">
              <div>
                <h3>Latest researched answers</h3>
                <p class="search-related-copy" id="seo-knowledge-count">${escapeHtml(answers.length)} seeded answers</p>
                <div id="seo-knowledge-list">
                  ${answers
                    .slice(0, 3)
                    .map(
                      (answer) => `
                        <article class="search-knowledge-item">
                          <h3>${escapeHtml(answer.question)}</h3>
                          <p>${escapeHtml(answer.answer)}</p>
                          <div class="search-knowledge-meta">
                            <span>${escapeHtml(answer.intentKey || "park-answer")}</span>
                            <span>Checked ${escapeHtml(formatDate(answer.checkedAt || place.verifiedAt))}</span>
                          </div>
                        </article>
                      `,
                    )
                    .join("")}
                </div>
              </div>
              <div>
                <h3>Community notes</h3>
                <p class="search-related-copy" id="seo-community-count">${escapeHtml((place.comments || []).length)} seeded notes</p>
                <div id="seo-community-list">
                  ${(place.comments || []).length
                    ? place.comments
                        .slice(0, 3)
                        .map(
                          (comment) => `
                            <article class="search-community-item">
                              <div>
                                <strong>${escapeHtml(comment.author || "AuditMap seed")}</strong>
                                <span>Seeded context</span>
                              </div>
                              <p>${escapeHtml(comment.text)}</p>
                            </article>
                          `,
                        )
                        .join("")
                    : '<p class="search-empty-copy">No community notes yet.</p>'}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside class="search-sidebar-column">
          <section class="search-sidebar-card">
            <p class="kicker">Research queue</p>
            <h2>What AuditMap still needs to verify</h2>
            ${
              (place.researchQueue || []).length
                ? `<div class="search-section-list">${place.researchQueue
                    .map(
                      (item) => `
                        <div>
                          <strong>${escapeHtml(item.question)}</strong>
                          <p class="search-empty-copy">${escapeHtml(item.intentKey || "general")} intent</p>
                          <a class="search-verification-link" href="/place.html?id=${encodeURIComponent(place.id)}&verify=${encodeURIComponent(item.intentKey || "general")}#verification-list">Help verify this</a>
                        </div>
                      `,
                    )
                    .join("")}</div>`
                : '<p class="search-empty-copy">This page already covers the top seeded intents for the current park record.</p>'
            }
          </section>

          <section class="search-sidebar-card">
            <p class="kicker">Related parks</p>
            <h2>Keep exploring ${escapeHtml(place.city)}</h2>
            <div class="search-park-grid">
              ${relatedParks
                .map(
                  (related) => `
                    <article class="search-park-card">
                      <h3><a href="${placePath(related)}">${escapeHtml(related.name)}</a></h3>
                      <span>${escapeHtml(related.neighborhood || related.city)}</span>
                      <p>${escapeHtml((derivedAnswers(related)[0] || {}).answer || related.summary)}</p>
                    </article>
                  `,
                )
                .join("")}
            </div>
          </section>

          <section class="search-sidebar-card">
            <p class="kicker">Sources</p>
            <h2>Where this page came from</h2>
            <div class="search-source-grid">
              ${sources
                .map(
                  (source) => `
                    <article class="search-source-card">
                      <strong>${escapeHtml(source.label)}</strong>
                      <span>${escapeHtml(source.note)}</span>
                      <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Open ↗</a>
                    </article>
                  `,
                )
                .join("")}
            </div>
          </section>
        </aside>
      </div>
    </main>
  `;

  return pageShell({
    title: `${place.name} in ${place.city}, ${place.state} | Parking, hours, and park answers | AuditMap`,
    description: place.searchDescription || place.summary,
    canonicalPath: pathName,
    imageUrl: heroImage,
    modifiedAt,
    schema,
    bodyClass: "search-place",
    pageData: place,
    body,
  });
}

function staticKnowledgeMarkup(place, answers) {
  return answers
    .map((answer) => {
      const answerKey = answerFragment(answer.intentKey, answer.question);
      return `
        <details class="knowledge-item" id="answer-${escapeHtml(answerKey)}">
          <summary>
            <span>${escapeHtml(answer.question)}</span>
            <span aria-hidden="true">+</span>
          </summary>
          <p>${escapeHtml(answer.answer)}</p>
          <div class="knowledge-meta">
            <span>Sourced answer</span>
            <span>Researched ${escapeHtml(formatDate(answer.checkedAt || place.verifiedAt))}</span>
          </div>
          ${
            answer.source
              ? `<div class="knowledge-sources"><a href="${escapeHtml(answer.source)}" target="_blank" rel="noreferrer">${escapeHtml(answer.sourceLabel || "Official source")} ↗</a></div>`
              : ""
          }
          <div class="knowledge-actions" aria-label="Respond to this answer">
            <button type="button" data-knowledge-helpful="${escapeHtml(answer.intentKey || slugify(answer.question))}">Helpful</button>
            ${answer.source ? `<button data-knowledge-share="${escapeHtml(answerKey)}">Share</button>` : ""}
            <button type="button" data-knowledge-follow-up="${escapeHtml(answer.question)}">Ask a follow-up</button>
            <button type="button" data-knowledge-note="${escapeHtml(answer.intentKey || slugify(answer.question))}" data-knowledge-question="${escapeHtml(answer.question)}">Add a note</button>
            <button type="button" data-knowledge-confirm="${escapeHtml(answer.intentKey || slugify(answer.question))}" data-knowledge-question="${escapeHtml(answer.question)}">Confirm or update</button>
          </div>
        </details>
      `;
    })
    .join("");
}

function staticFeatureMarkup(place) {
  const parentRoute = place.parentPlace?.path
    ? { canonicalPath: place.parentPlace.path }
    : place;
  const features = mappedFeatures(place);
  const priorityFeatures = [...features].sort((left, right) => {
    const leftArt = left.feature_type === "art" ? 1 : 0;
    const rightArt = right.feature_type === "art" ? 1 : 0;
    return leftArt - rightArt;
  });
  const initialFeatures = priorityFeatures.slice(0, place.parentPlace ? 8 : 12);
  const cards = initialFeatures
    .map((feature, index) => {
      const imageUrl = feature.details?.imageUrl;
      return `
        <article class="feature-card" data-feature-id="${escapeHtml(feature.id)}">
          <a class="feature-card-media${imageUrl ? " has-image" : ""}" href="${escapeHtml(subsitePath(parentRoute, feature))}" aria-label="View the full guide for ${escapeHtml(feature.name)}">
            ${
              imageUrl
                ? `<img ${responsiveImageAttributes(imageUrl, { widths: [320, 480, 640], sizes: "(max-width: 720px) 82vw, 360px" })} alt="${escapeHtml(feature.details?.imageAlt || feature.name)}">`
                : ""
            }
            <span class="feature-card-number">${index + 1}</span>
            <span class="feature-card-kind">${escapeHtml(feature.feature_type || "Destination")}</span>
          </a>
          <div class="feature-card-body">
            <h3><a href="${escapeHtml(subsitePath(parentRoute, feature))}">${escapeHtml(feature.name)}</a></h3>
            <span>${escapeHtml(feature.description || "Park destination")}</span>
            <div class="feature-card-footer">
              <div class="feature-card-actions">
                <a class="feature-card-guide" href="${escapeHtml(subsitePath(parentRoute, feature))}">View guide <span aria-hidden="true">→</span></a>
                <a class="feature-card-navigate" href="https://www.google.com/maps/dir/?api=1&amp;destination=${encodeURIComponent(`${feature.latitude},${feature.longitude}`)}" target="_blank" rel="noreferrer" aria-label="Navigate to ${escapeHtml(feature.name)}" title="Navigate">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.4 3.6 3.8 10.4c-.8.3-.8 1.5.1 1.7l6.8 1.3 1.3 6.8c.2.9 1.4.9 1.7.1l6.8-16.6c.3-.7-.4-1.4-1.1-1.1Z"></path>
                    <path d="m10.7 13.3 4.2-4.2"></path>
                  </svg>
                </a>
              </div>
              ${
                feature.details?.imageSourceUrl
                  ? `<a class="feature-photo-credit" href="${escapeHtml(feature.details.imageSourceUrl)}" target="_blank" rel="noreferrer">Photo: ${escapeHtml(feature.details.imageAuthor || feature.source_label || "Source")}</a>`
                  : ""
              }
            </div>
          </div>
        </article>
      `;
    })
    .join("");
  const index = features.length > initialFeatures.length
    ? `<nav class="feature-index-links" aria-label="All mapped destinations">
        <strong>All ${features.length} mapped places</strong>
        <span>${features.map((feature) => `<a href="${escapeHtml(subsitePath(parentRoute, feature))}">${escapeHtml(feature.name)}</a>`).join("")}</span>
      </nav>`
    : "";
  return `${cards}${index}`;
}

function renderParkPage(place) {
  const pathName = placePath(place);
  const answers = derivedAnswers(place);
  const sources = uniqueSources(place, answers);
  const modifiedAt = placeLastModified(
    { ...place, searchAnswers: answers },
    new Date().toISOString().slice(0, 10),
  );
  const heroImage = place.image?.url || place.images?.[0]?.url || null;
  const isPark = place.searchCategory === "park";
  const categoryName = categorySegment(place).replaceAll("-", " ");
  const breadcrumbs = [
    { name: "United States", path: "/us" },
    { name: place.state, path: stateHubPath(place.state) },
    {
      name: `${place.city} ${categoryName}`,
      path: isPark ? cityHubPath(place) : null,
    },
    ...(place.parentPlace
      ? [{ name: place.parentPlace.name, path: place.parentPlace.path }]
      : []),
    { name: place.name },
  ];
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(),
      websiteSchema(),
      breadcrumbSchema(breadcrumbs, pathName),
      parkSchema(place, answers, pathName),
    ],
  };
  const title = place.parentPlace
    ? `${place.name} at ${place.parentPlace.name} | AuditMap`
    : `${place.name} in ${place.city}, ${place.state} | AuditMap`;
  const description = place.searchDescription || place.summary;
  const published = isPublishedPlace(place);
  const heleneNotice = place.city === "Asheville" && place.state === "NC"
    ? `<aside class="recovery-notice" aria-label="Helene recovery notice">
        <strong>Areas may still be affected by Helene.</strong>
        <span>Check <a href="https://www.ashevillenc.gov/projects/french-broad-riverfront-parks-recovery/" target="_blank" rel="noreferrer">current Asheville recovery conditions</a> before visiting. To help Western North Carolina recover, <a href="https://www.nccommunityfoundation.org/nonprofits/disaster-relief-fund/hurricane-helene-response" target="_blank" rel="noreferrer">donate to the NC Community Foundation Disaster Relief Fund</a>.</span>
      </aside>`
    : "";
  const embeddedData = JSON.stringify(clientPlaceData(place, { includeFeatures: false })).replace(/</g, "\\u003c");
  const directionsDestination =
    place.parentPlace &&
    Number.isFinite(Number(place.latitude)) &&
    Number.isFinite(Number(place.longitude))
      ? `${Number(place.latitude)},${Number(place.longitude)}`
      : `${place.name}, ${formatPlaceAddress(place)}`;
  const knowledgeMarkup = staticKnowledgeMarkup(place, answers);
  const featureMarkup = staticFeatureMarkup(place);
  const sourceMarkup = sources
    .map(
      (source) => `
        <div class="source-item">
          <div>
            <strong>${escapeHtml(source.label)}</strong>
            <span>${escapeHtml(source.note)}</span>
          </div>
          <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Open source ↗</a>
        </div>
      `,
    )
    .join("");
  const commentMarkup = (place.comments || [])
    .map(
      (comment) => `
        <article class="comment">
          <div class="comment-meta"><strong>${escapeHtml(comment.author || "Local contributor")}</strong></div>
          <p>${escapeHtml(comment.text)}</p>
        </article>
      `,
    )
    .join("");

  let html = fs.readFileSync(path.join(projectRoot, "place.html"), "utf8");
  html = html
    .replace(
      /href="\/styles\.css\?v=[^"]+"/,
      `href="/styles.css?v=${styleVersion}"`,
    )
    .replace(
      /\s*<meta name="robots" content="noindex,follow" \/>/,
      published ? "" : '\n    <meta name="robots" content="noindex,follow" />',
    )
    .replace("<title>Place | AuditMap</title>", `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    )
    .replace(
      "</head>",
      `    <link rel="canonical" href="${baseUrl}${pathName}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${baseUrl}${pathName}" />
    <meta property="og:image" content="${escapeHtml(absoluteMediaUrl(heroImage))}" />
    <meta property="article:modified_time" content="${escapeHtml(modifiedAt)}" />
    <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>
  </head>`,
    )
    .replace(
      '<a class="back-link" href="/index.html">← Back to the map</a>',
      `${
        place.parentPlace
          ? `<a class="back-link" href="${escapeHtml(place.parentPlace.path)}">← Back to ${escapeHtml(place.parentPlace.name)}</a>`
          : `<a class="back-link" href="/index.html?city=${encodeURIComponent(place.citySlug || `${place.city}-${place.state}`)}">← Back to the map</a>`
      }
      ${breadcrumbsMarkup(breadcrumbs)}`,
    )
    .replace(
      'class="place-gallery" id="place-gallery" aria-label="Place photos" hidden',
      `class="place-gallery" id="place-gallery" aria-label="Place photos"${heroImage ? "" : " hidden"}`,
    )
    .replace('<img id="gallery-image" alt="" />', `<img id="gallery-image" ${responsiveImageAttributes(heroImage || logoUrl, { sizes: "(max-width: 760px) 100vw, min(68vw, 1040px)", priority: true })} data-source-url="${escapeHtml(heroImage || logoUrl)}" alt="${escapeHtml(place.image?.alt || place.name)}" />`)
    .replace(
      '<p class="gallery-credit" id="gallery-credit"></p>',
      `<p class="gallery-credit" id="gallery-credit">${
        place.image?.source
          ? `<a href="${escapeHtml(place.image.source)}" target="_blank" rel="noreferrer" title="${escapeHtml([place.image.author, place.image.license].filter(Boolean).join(" · "))}" aria-label="Photo source: ${escapeHtml([place.image.author, place.image.license].filter(Boolean).join(" · "))}">Photo source ↗</a>`
          : ""
      }</p>`,
    )
    .replace('<p class="kicker" id="place-type">Public place</p>', `<p class="kicker" id="place-type">${escapeHtml(place.type)}</p>`)
    .replace('<h1 id="place-name">Loading...</h1>', `<h1 id="place-name">${escapeHtml(place.name)}</h1>`)
    .replace(
      '<p class="place-official-name" id="place-official-name" hidden></p>',
      place.officialName && place.officialName !== place.name
        ? `<p class="place-official-name" id="place-official-name">Officially: ${escapeHtml(place.officialName)}</p>`
        : '<p class="place-official-name" id="place-official-name" hidden></p>',
    )
    .replace('<p class="place-summary brief-copy" id="living-brief"></p>', `<p class="place-summary brief-copy" id="living-brief">${escapeHtml(place.summary)}</p>${heleneNotice}`)
    .replace('<span id="brief-updated"></span>', `<span id="brief-updated">Checked ${escapeHtml(formatDate(modifiedAt))}</span>`)
    .replace('<strong id="place-neighborhood"></strong>', `<strong id="place-neighborhood">${escapeHtml(place.neighborhood || place.city)}</strong>`)
    .replace('<span id="place-address"></span>', `<span id="place-address">${escapeHtml(formatPlaceAddress(place))}</span>`)
    .replace(
      'id="place-address-link" href="#"',
      `id="place-address-link" href="https://www.google.com/maps/dir/?api=1&amp;destination=${encodeURIComponent(directionsDestination)}"`,
    )
    .replace('<strong id="place-hours"></strong>', `<strong id="place-hours">${escapeHtml(place.hours || "Official hours research pending")}</strong>`)
    .replace('<strong id="place-status"></strong>', `<strong id="place-status">${escapeHtml(place.status)}</strong>`)
    .replace(
      '<a id="place-source" href="#" target="_blank" rel="noreferrer"></a>',
      place.source
        ? `<a id="place-source" href="${escapeHtml(place.source)}" target="_blank" rel="noreferrer">${escapeHtml(place.sourceLabel || "Official source")}</a>`
        : '<span id="place-source">Official source research pending</span>',
    )
    .replace('class="place-explorer" id="place-explorer" hidden', `class="place-explorer" id="place-explorer"${mappedFeatures(place).length >= 2 ? "" : " hidden"}`)
    .replace('<div class="feature-list" id="feature-list"></div>', `<div class="feature-list" id="feature-list">${featureMarkup}</div>`)
    .replace(
      'class="community-section knowledge-section" id="place-knowledge" hidden',
      `class="community-section knowledge-section" id="place-knowledge"${answers.length ? "" : " hidden"}`,
    )
    .replace('<span class="source-count" id="knowledge-count"></span>', `<span class="source-count" id="knowledge-count">${answers.length} answers</span>`)
    .replace('<div class="knowledge-list" id="knowledge-list"></div>', `<div class="knowledge-list" id="knowledge-list">${knowledgeMarkup}</div>`)
    .replace('<div class="comment-list" id="comment-list"></div>', `<div class="comment-list" id="comment-list">${commentMarkup}</div>`)
    .replace('<span class="source-count" id="source-count"></span>', `<span class="source-count" id="source-count">${sources.length} sources</span>`)
    .replace('<div class="source-list" id="source-list"></div>', `<div class="source-list" id="source-list">${sourceMarkup}</div>`)
    .replace(
      /<script src="\/app\.js\?v=[^"]+"><\/script>/,
      `<script id="search-place-data" type="application/json">${embeddedData}</script>
    <script src="/app.js?v=${assetVersion}"></script>`,
    );
  return html;
}

function renderCityHubPage(state, city, parks) {
  const sample = parks[0];
  const publishedParks = parks.filter(isPublishedPlace);
  const pathName = cityHubPath(sample);
  const breadcrumbs = [
    { name: "United States", path: "/us" },
    { name: state, path: stateHubPath(state) },
    { name: `${city} parks` },
  ];
  const description = `Browse AuditMap's major ${city}, ${state} park launch directory and see which detailed park pages are researched or still in production.`;
  const title = `${city}, ${state} Major Parks | AuditMap`;
  const imageUrl = parks[0]?.image?.url || parks[0]?.images?.[0]?.url || logoUrl;
  const schema = [
    organizationSchema(),
    websiteSchema(),
    breadcrumbSchema(breadcrumbs, pathName),
    collectionPageSchema({
      pathName,
      name: title,
      description,
      imageUrl,
      items: parks.map((park) => ({ name: park.name, path: placePath(park) })),
    }),
  ];
  const body = `
    <main class="search-shell">
      ${breadcrumbsMarkup(breadcrumbs)}
      <section class="search-hero">
        <div>
          <p class="kicker">${escapeHtml(state)} city park hub</p>
          <h1>${escapeHtml(city)} park answers</h1>
          <p class="search-summary">AuditMap is building detailed pages for major ${escapeHtml(city)} parks. Researched pages contain sourced visit answers; research candidates show what must be documented before publication.</p>
          <div class="search-badges">
            <span class="search-badge">${escapeHtml(parks.length)} park pages</span>
            <span class="search-badge">${escapeHtml(publishedParks.length)} researched</span>
            <span class="search-badge">${escapeHtml(parks.length - publishedParks.length)} in research</span>
          </div>
        </div>
        <div class="search-meta-grid">
          <div>
            <span>State hub</span>
            <strong><a href="${stateHubPath(state)}">${escapeHtml(state)} parks ↗</a></strong>
          </div>
          <div>
            <span>Live map</span>
            <strong><a href="/index.html?city=${encodeURIComponent(slugify(`${city}-${state}`))}">Open the interactive map ↗</a></strong>
          </div>
        </div>
      </section>
      <div class="search-content-grid">
        <div class="search-main-column">
          <section class="search-section">
            <div class="search-section-header">
              <div>
                <p class="kicker">Park directory</p>
                <h2>Current city pages</h2>
              </div>
            </div>
            <div class="search-park-grid">
              ${parks
                .map((park) => {
                  const firstAnswer = derivedAnswers(park)[0];
                  return `
                    <article class="search-park-card">
                      <h3><a href="${placePath(park)}">${escapeHtml(park.name)}</a></h3>
                      <span>${escapeHtml(isPublishedPlace(park) ? park.neighborhood || city : `${park.launchTier} · research candidate`)}</span>
                      <p>${escapeHtml(firstAnswer?.answer || park.summary)}</p>
                    </article>
                  `;
                })
                .join("")}
            </div>
          </section>
        </div>
        <aside class="search-sidebar-column">
          <section class="search-sidebar-card">
            <p class="kicker">Top intents</p>
            <h2>What people usually want to know</h2>
            <div class="search-intent-list">
              ${[...new Set(parks.flatMap((park) => derivedAnswers(park).map((answer) => answer.intentKey)).filter(Boolean))]
                .map((intent) => `<span class="search-badge">${escapeHtml(intent)}</span>`)
                .join("")}
            </div>
          </section>
        </aside>
      </div>
    </main>
  `;

  return pageShell({
    title,
    description,
    canonicalPath: pathName,
    imageUrl,
    modifiedAt: new Date().toISOString(),
    schema,
    bodyClass: "search-hub",
    body,
  });
}

function renderStateHubPage(state, cities) {
  const pathName = stateHubPath(state);
  const breadcrumbs = [
    { name: "United States", path: "/us" },
    { name: state },
  ];
  const description = `Browse AuditMap's current ${state} city hubs and major-park page production directory.`;
  const title = `${state} Major Parks | City-by-city AuditMap directory`;
  const schema = [
    organizationSchema(),
    websiteSchema(),
    breadcrumbSchema(breadcrumbs, pathName),
    collectionPageSchema({
      pathName,
      name: title,
      description,
      imageUrl: logoUrl,
      items: cities.map((city) => ({ name: `${city.name} parks`, path: cityHubPath(city.parks[0]) })),
    }),
  ];
  const body = `
    <main class="search-shell">
      ${breadcrumbsMarkup(breadcrumbs)}
      <section class="search-hero">
        <div>
          <p class="kicker">State park hub</p>
          <h1>${escapeHtml(state)} park answers</h1>
          <p class="search-summary">AuditMap is growing city by city, starting with major urban parks that generate detailed visit questions like parking, splash pads, restrooms, dog areas, and landmark locations.</p>
        </div>
        <div class="search-meta-grid">
          <div>
            <span>Tracked cities</span>
            <strong>${escapeHtml(cities.length)}</strong>
          </div>
          <div>
            <span>Tracked parks</span>
            <strong>${escapeHtml(cities.reduce((total, city) => total + city.parks.length, 0))}</strong>
          </div>
        </div>
      </section>
      <section class="search-section" style="margin-top:24px;">
        <div class="search-section-header">
          <div>
            <p class="kicker">Cities</p>
            <h2>Current park hubs in ${escapeHtml(state)}</h2>
          </div>
        </div>
        <div class="search-park-grid">
          ${cities
            .map(
              (city) => `
                <article class="search-park-card">
                  <h3><a href="${cityHubPath(city.parks[0])}">${escapeHtml(city.name)} parks</a></h3>
                  <span>${escapeHtml(city.parks.length)} park pages</span>
                  <p>${escapeHtml(city.parks.map((park) => park.name).slice(0, 3).join(", "))}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>
    </main>
  `;

  return pageShell({
    title,
    description,
    canonicalPath: pathName,
    imageUrl: logoUrl,
    modifiedAt: new Date().toISOString(),
    schema,
    bodyClass: "search-hub",
    body,
  });
}

function renderNationalHubPage(states) {
  const schema = [organizationSchema(), websiteSchema()];
  const body = `
    <main class="search-shell">
      <section class="search-hero">
        <div>
          <p class="kicker">Nationwide park guides</p>
          <h1>Explore major parks across the United States</h1>
          <p class="search-summary">Find practical, sourced answers for major parks across all 50 states, including parking, hours, restrooms, accessibility, trails, family amenities, and the landmarks people search for inside each park.</p>
        </div>
        <div class="search-meta-grid">
          <div>
            <span>States covered</span>
            <strong>${escapeHtml(states.length)}</strong>
          </div>
          <div>
            <span>Park guides</span>
            <strong>${escapeHtml(states.reduce((total, state) => total + state.parks.length, 0))}</strong>
          </div>
        </div>
      </section>
      <section class="search-section" style="margin-top:24px;">
        <div class="search-section-header">
          <div>
            <p class="kicker">States</p>
            <h2>Explore parks by state</h2>
          </div>
        </div>
        <div class="search-park-grid">
          ${states
            .map(
              (state) => `
                <article class="search-park-card">
                  <h3><a href="${stateHubPath(state.name)}">${escapeHtml(state.name)}</a></h3>
                  <span>${escapeHtml(state.parks.length)} park pages</span>
                  <p>${escapeHtml(state.cities.join(", "))}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>
    </main>
  `;

  return pageShell({
    title: "Major Parks Across the United States | AuditMap",
    description: "Explore sourced visitor guides to major parks across all 50 states, organized by state and city.",
    canonicalPath: "/us",
    imageUrl: logoUrl,
    modifiedAt: new Date().toISOString(),
    schema,
    bodyClass: "search-hub",
    body,
  });
}

function renderDixBetaPage() {
  const sourcePath = path.join(
    projectRoot,
    "us/nc/raleigh/parks/dix-park/index.html",
  );
  if (!fs.existsSync(sourcePath)) return;
  let html = fs.readFileSync(sourcePath, "utf8");
  const betaStyles = `
    <style>
      :root {
        --beta-ink: #18342b;
        --beta-moss: #315e47;
        --beta-lime: #dcef74;
        --beta-sand: #f4eedf;
        --beta-sky: #b9d9e8;
        --beta-line: rgba(24, 52, 43, .18);
      }
      body.beta-dix-v2 {
        background:
          radial-gradient(circle at 82% 4%, rgba(185, 217, 232, .7), transparent 28rem),
          linear-gradient(180deg, #f9f5e9 0, #f4eedf 42rem, #fff 80rem);
        color: var(--beta-ink);
      }
      .beta-dix-v2 .site-header {
        background: var(--beta-ink);
        color: #fff;
        border-bottom: 0;
      }
      .beta-dix-v2 .site-header .brand,
      .beta-dix-v2 .site-header p { color: #fff; }
      .beta-lab-bar {
        position: sticky;
        top: 0;
        z-index: 50;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 11px clamp(18px, 4vw, 54px);
        background: var(--beta-lime);
        color: var(--beta-ink);
        border-bottom: 1px solid var(--beta-ink);
        font-weight: 700;
      }
      .beta-lab-bar div { display: flex; align-items: center; gap: 18px; }
      .beta-lab-bar a { color: inherit; }
      .beta-lab-tag {
        padding: 5px 10px;
        border: 1px solid currentColor;
        border-radius: 999px;
        font-size: .75rem;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .beta-dix-v2 .detail-shell {
        width: min(1480px, calc(100% - 40px));
        padding-top: 24px;
      }
      .beta-dix-v2 .search-breadcrumbs { margin-bottom: 10px; }
      .beta-dix-v2 .place-gallery {
        margin-top: 24px;
        border-radius: 34px;
        overflow: hidden;
        box-shadow: 0 28px 70px rgba(24, 52, 43, .18);
      }
      .beta-dix-v2 .place-gallery img {
        height: min(68vh, 720px);
        object-fit: cover;
      }
      .beta-dix-v2 .place-hero {
        position: relative;
        margin: -72px 36px 0;
        padding: 42px;
        background: rgba(255, 255, 255, .94);
        border: 1px solid var(--beta-line);
        border-radius: 28px;
        box-shadow: 0 24px 60px rgba(24, 52, 43, .13);
        backdrop-filter: blur(14px);
      }
      .beta-dix-v2 .place-hero h1 {
        max-width: 8ch;
        font-size: clamp(4rem, 9vw, 8.5rem);
        line-height: .82;
        letter-spacing: -.075em;
      }
      .beta-dix-v2 .place-meta {
        align-self: start;
        background: var(--beta-sand);
        border: 1px solid var(--beta-line);
        border-radius: 22px;
        padding: 8px 22px;
      }
      .beta-dix-v2 .place-actions button,
      .beta-dix-v2 .place-actions a {
        border-color: var(--beta-ink);
      }
      .beta-dix-v2 .place-explorer {
        margin-top: 72px;
        background: var(--beta-ink);
        color: #fff;
        border-radius: 34px;
        padding: clamp(28px, 5vw, 64px);
      }
      .beta-dix-v2 .place-explorer a { color: inherit; }
      .beta-dix-v2 .feature-card {
        background: #fff;
        color: var(--beta-ink);
        border: 0;
      }
      .beta-dix-v2 .internal-map {
        border: 6px solid #fff;
        border-radius: 28px;
      }
      .beta-dix-v2 .community-section,
      .beta-dix-v2 .source-section {
        border-color: var(--beta-line);
      }
      .beta-dix-v2 .knowledge-item {
        background: #fff;
        border: 1px solid var(--beta-line);
        border-radius: 18px;
        margin-bottom: 10px;
        padding-inline: 18px;
      }
      .beta-dix-v2 .ask-launcher { background: var(--beta-ink); }
      @media (max-width: 760px) {
        .beta-lab-bar { align-items: flex-start; font-size: .82rem; }
        .beta-lab-bar div a:not(:last-child) { display: none; }
        .beta-dix-v2 .detail-shell { width: min(100% - 24px, 1480px); }
        .beta-dix-v2 .place-gallery { border-radius: 22px; }
        .beta-dix-v2 .place-gallery img { height: 54vh; }
        .beta-dix-v2 .place-hero {
          margin: -34px 10px 0;
          padding: 24px 20px;
          border-radius: 22px;
        }
        .beta-dix-v2 .place-hero h1 { font-size: clamp(3.6rem, 20vw, 6rem); }
        .beta-dix-v2 .place-explorer { margin-top: 42px; border-radius: 24px; padding: 24px 14px; }
      }
    </style>`;
  const betaBar = `
    <aside class="beta-lab-bar" aria-label="Beta design navigation">
      <span class="beta-lab-tag">Beta 2</span>
      <strong>Dix Park field-guide experiment</strong>
      <div>
        <a href="#place-explorer">Explore areas</a>
        <a href="#place-knowledge">Visitor answers</a>
        <a href="/us/nc/raleigh/parks/dix-park/">View current design</a>
      </div>
    </aside>`;
  html = html
    .replace("<title>Dix Park in Raleigh, NC | AuditMap</title>", "<title>Dix Park Beta 2 | AuditMap</title>")
    .replace("</head>", `    <meta name="robots" content="noindex,follow" />\n${betaStyles}\n  </head>`)
    .replace('body class="detail-body"', 'body class="detail-body beta-dix-v2"')
    .replace("</header>", `</header>\n${betaBar}`)
    .replace(
      "Built by explorers. Useful to everyone.",
      "A field guide for arriving well.",
    );
  writeFile("beta/dix-park-v2/index.html", html);
}

function build() {
  const generationScope = parseGenerationScope(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const seed = readJson("data/institutions.json", []);
  const shared = readJson("data/shared-records.json", []);
  const researchedPlaces = mergePlaces(seed, shared).filter(isPublishablePlace);
  const launchLocationDocument = readJson(
    "data/generated/launch-park-locations.json",
    { locations: [] },
  );
  const launchLocationOverrides = readJson("data/launch-location-overrides.json", []);
  const launchEnrichmentDocument = readJson(
    "data/generated/launch-park-enrichment.json",
    { parks: [] },
  );
  const parentInformationDocument = readJson(
    "data/parent-park-information-enrichment.json",
    { parks: {} },
  );
  const nationalParentInformationDocument = readJson(
    "data/parent-park-information-enrichment-national.json",
    { parks: {} },
  );
  const campaignParentInformationDocument = readJson(
    "data/parent-park-information-enrichment-campaign.json",
    { parks: {} },
  );
  const parentInformationIds = new Set([
    ...Object.keys(parentInformationDocument.parks),
    ...Object.keys(nationalParentInformationDocument.parks),
    ...Object.keys(campaignParentInformationDocument.parks),
  ]);
  const parentInformationById = Object.fromEntries(
    [...parentInformationIds].map((id) => [
      id,
      {
        ...(parentInformationDocument.parks[id] || {}),
        ...(nationalParentInformationDocument.parks[id] || {}),
        ...(campaignParentInformationDocument.parks[id] || {}),
      },
    ]),
  );
  const launchCandidateBase = launchCandidatePlaces(
    readCsv("data/nationwide-major-parks-launch.csv"),
    researchedPlaces,
    [...launchLocationDocument.locations, ...launchLocationOverrides],
    launchEnrichmentDocument.parks,
  );
  const pilotSubsiteDocument = readJson(
    "data/generated/all-subsites-ready.json",
    { parks: [] },
  );
  const pilotSubsitesByPark = new Map(
    pilotSubsiteDocument.parks.map((park) => [park.id, park]),
  );
  const launchCandidates = launchCandidateBase.map((place) => {
    const pilot = pilotSubsitesByPark.get(place.id);
    const parentInformation = parentInformationById[place.id] || {};
    const hasParentInformation = Object.keys(parentInformation).length > 0;
    const enrichedParent = hasParentInformation
      ? {
          ...place,
          ...parentInformation,
          images: [
            ...(parentInformation.replaceImages ? [] : place.images || []),
            ...(parentInformation.additionalImages || []),
          ].filter(
            (image, index, images) =>
              image?.url &&
              images.findIndex((candidate) => candidate.url === image.url) === index,
          ),
          additionalImages: undefined,
          replaceImages: undefined,
          status: "Sourced major-park visitor guide",
          searchDescription: `Sourced hours, arrival guidance, essential visitor information, photos, and mapped destinations for ${place.name} in ${place.city}, ${place.state}.`,
          publishStatus: "enriched",
          cost:
            parentInformation.cost ||
            place.cost ||
            "General outdoor park access is free; individual attractions, parking, rentals, reservations, and programs may charge separately.",
          accessibility:
            parentInformation.accessibility ||
            place.accessibility ||
            "Accessibility varies by entrance, route, terrain, and destination. Review the exact mapped subsite and its official source before relying on a specific accessible route.",
          researchQueue: (place.researchQueue || []).filter(
            (item) =>
              !["official-source", "arrival", "accessibility", "subsites"].includes(item.intentKey),
          ),
        }
      : place;
    if (!pilot) return enrichedParent;
    const combinedImageCount = new Set([
      enrichedParent.image?.url,
      ...(enrichedParent.images || []).map((image) => image.url),
      ...pilot.features.map((feature) => feature.details?.imageUrl),
    ].filter(Boolean)).size;
    const richerSearchAnswers = [
      enrichedParent.searchAnswers,
      pilot.searchAnswers,
    ]
      .filter(Array.isArray)
      .sort((left, right) => right.length - left.length)[0] || [];
    return {
      ...enrichedParent,
      searchAnswers: richerSearchAnswers,
      features: pilot.features,
      researchQueue: [
        ...(enrichedParent.researchQueue || []),
        ...(pilot.researchQueue || []).filter((item) => !item.publicationBlocker),
      ].filter((item) => item.intentKey !== "photos" || combinedImageCount < 3),
    };
  });
  const reviewedKnowledgePath = process.env.AUDITMAP_REVIEWED_KNOWLEDGE_PATH
    ? path.resolve(process.env.AUDITMAP_REVIEWED_KNOWLEDGE_PATH)
    : path.join(projectRoot, "data/reviewed-knowledge.json");
  const reviewedKnowledgeDocument = readJsonFile(
    reviewedKnowledgePath,
    { version: 1, exportedAt: null, answers: [] },
  );
  const reviewedAnswers = normalizeReviewedKnowledge(reviewedKnowledgeDocument, {
    now: new Date(generatedAt),
  });
  const allPlaces = applyReviewedKnowledge(
    [...researchedPlaces, ...launchCandidates],
    reviewedAnswers,
  ).map(withFeatureGalleryImages);
  if (generationScope.scoped) {
    const availableIds = new Set(allPlaces.map((place) => place.id));
    const unknownIds = [...generationScope.parkIds].filter((id) => !availableIds.has(id));
    if (unknownIds.length) {
      throw new Error(`Unknown park IDs: ${unknownIds.join(", ")}`);
    }
  }
  const places = allPlaces.filter(isSearchPark);
  const standalonePlaces = allPlaces.filter(
    (place) => place.searchCategory && place.searchCategory !== "park",
  );
  const subsitePlaces = places.flatMap((place) =>
    (place.features || []).map((feature) => asSubsitePlace(place, feature)),
  );
  const byState = new Map();
  const selectedPlaces = generationScope.scoped
    ? allPlaces.filter((place) => generationScope.parkIds.has(place.id))
    : allPlaces;
  const selectedStates = new Set(selectedPlaces.map((place) => place.state));
  const selectedCities = new Set(selectedPlaces.map((place) => `${place.state}\u0000${place.city}`));
  const sitemapEntries = [];
  const addSitemapEntry = (url, lastmod) => {
    const nextLastmod = lastmod || generatedAt.slice(0, 10);
    const existing = sitemapEntries.find((entry) => entry.url === url);
    if (existing) {
      existing.lastmod = latestDate(existing.lastmod, nextLastmod) || nextLastmod;
      return;
    }
    sitemapEntries.push({ url, lastmod: nextLastmod });
  };

  for (const place of places) {
    const state = place.state;
    const city = place.city;
    if (!byState.has(state)) byState.set(state, new Map());
    if (!byState.get(state).has(city)) byState.get(state).set(city, []);
    byState.get(state).get(city).push(place);
  }

  const nationalStates = [];
  for (const [state, cityMap] of byState.entries()) {
    const cityGroups = [...cityMap.entries()].map(([city, parks]) => ({
      name: city,
      parks: parks.sort((left, right) => left.name.localeCompare(right.name)),
    }));
    nationalStates.push({
      name: state,
      cities: cityGroups.map((group) => group.name),
      parks: cityGroups.flatMap((group) => group.parks),
    });

    if (!generationScope.scoped || selectedStates.has(state)) {
      writeFile(`${stateHubPath(state).slice(1)}/index.html`, renderStateHubPage(state, cityGroups));
    }
    addSitemapEntry(
      stateHubPath(state),
      latestDate(cityGroups.flatMap((group) => group.parks.map((park) => placeLastModified(park)))),
    );

    for (const group of cityGroups) {
      if (!generationScope.scoped || selectedCities.has(`${state}\u0000${group.name}`)) {
        writeFile(`${cityHubPath(group.parks[0]).slice(1)}/index.html`, renderCityHubPage(state, group.name, group.parks));
      }
      addSitemapEntry(
        cityHubPath(group.parks[0]),
        latestDate(group.parks.map((park) => placeLastModified(park))),
      );

      for (const park of group.parks) {
        if (generationScope.scoped && !generationScope.parkIds.has(park.id)) continue;
        const related = group.parks.filter((candidate) => candidate.id !== park.id).slice(0, 4);
        writeFile(`${placePath(park).slice(1)}/index.html`, renderParkPage(park, related));
        if ((park.features || []).length) {
          writeFile(
            `${placePath(park).slice(1)}/features.json`,
            `${JSON.stringify({ place: { id: park.id, name: park.name, hiddenFeatureIds: park.hiddenFeatureIds || [] }, features: clientFeatureData(park) })}\n`,
          );
        }
        if (isPublishedPlace(park)) addSitemapEntry(placePath(park), placeLastModified(park));
        for (const feature of park.features || []) {
          const subsite = asSubsitePlace(park, feature);
          writeFile(`${placePath(subsite).slice(1)}/index.html`, renderParkPage(subsite));
          if (isPublishedPlace(park)) {
            addSitemapEntry(placePath(subsite), placeLastModified(subsite));
          }
        }
      }
    }
  }

  for (const place of standalonePlaces) {
    if (generationScope.scoped && !generationScope.parkIds.has(place.id)) continue;
    writeFile(`${placePath(place).slice(1)}/index.html`, renderParkPage(place));
    addSitemapEntry(placePath(place), placeLastModified(place));
  }

  if (generationScope.scoped) {
    console.log(
      `Scoped generation complete: ${generationScope.parkIds.size} parent place(s), ${selectedCities.size} city hub(s), ${selectedStates.size} state hub(s).`,
    );
    return;
  }

  writeFile("us/index.html", renderNationalHubPage(nationalStates));
  addSitemapEntry("/us", latestDate(allPlaces.map((place) => placeLastModified(place))));

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map(
    (entry) => `  <url>
    <loc>${baseUrl}${entry.url}</loc>
    <lastmod>${entry.lastmod}</lastmod>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

  writeFile("sitemap.xml", sitemap);
  const officialCatalogDocument = {
    generatedAt,
    places: allPlaces.map((place) => ({
      id: place.id,
      name: place.name,
      type: place.type,
      city: place.city,
      state: place.state,
      address: place.address,
      officialSource: {
        label: place.sourceLabel,
        url: place.source,
      },
      verifiedAt: place.verifiedAt || null,
      facts: officialCatalog(place),
      unresolved: place.researchQueue || [],
    })),
  };
  writeFile(
    "data/generated/official-catalog.json",
    `${JSON.stringify(officialCatalogDocument, null, 2)}\n`,
  );
  writeFile(
    "data/generated/enrichment-queue.json",
    `${JSON.stringify(
      buildEnrichmentQueue(officialCatalogDocument, { now: generatedAt }),
      null,
      2,
    )}\n`,
  );
  writeFile(
    "data/generated/search-page-manifest.json",
    `${JSON.stringify(
      {
        generatedAt,
        states: byState.size,
        cities: [...byState.values()].reduce((total, cities) => total + cities.size, 0),
        parkPages: places.length,
        researchedParkPages: places.filter(isPublishedPlace).length,
        researchParkPages: places.filter((place) => !isPublishedPlace(place)).length,
        subsitePages: subsitePlaces.length,
        indexedUrls: sitemapEntries.length,
        reviewedKnowledgeAnswers: reviewedAnswers.length,
      },
      null,
      2,
    )}\n`,
  );
  writeFile(
    "data/generated/launch-map-places.json",
    `${JSON.stringify(
      launchCandidates
        .filter(
          (place) =>
            Number.isFinite(Number(place.latitude)) &&
            Number.isFinite(Number(place.longitude)),
        )
        .map((place) => ({
          ...place,
          hours: place.hours || "Official hours research pending",
          cost: place.cost || "Official fees research pending",
          accessibility: place.accessibility || "Accessibility research pending",
          transit: place.transit || "Transit research pending",
          amenities: [],
          comments: [],
        })),
      null,
      2,
    )}\n`,
  );
  writeFile(
    "robots.txt",
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /place.html\nDisallow: /feature.html\nSitemap: ${baseUrl}/sitemap.xml\n`,
  );
}

build();
