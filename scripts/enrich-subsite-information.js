const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const readyPath = path.join(projectRoot, "data", "generated", "all-subsites-ready.json");
const overlayPath = path.join(
  projectRoot,
  "data",
  "generated",
  "subsite-information-enrichment.json",
);
const locations = new Map(
  JSON.parse(
    fs.readFileSync(
      path.join(projectRoot, "data", "generated", "launch-park-locations.json"),
      "utf8",
    ),
  ).locations.map((location) => [location.id, location]),
);
const checkedAt = new Date().toISOString().slice(0, 10);

const needToKnow = {
  museum:
    "Hours and admission can differ from the surrounding park, so check the destination source before visiting.",
  garden:
    "This is a distinct garden area; seasonal displays, closures, and access conditions can change.",
  art:
    "Use the exact map pin to find this artwork or monument within the larger park.",
  landmark:
    "Use the exact map pin to find this landmark within the larger park.",
  "dog-area":
    "Confirm posted leash, vaccination, and area-separation rules before entering with a dog.",
  "event-space":
    "Programming and access can change for events, so check the park schedule before making a special trip.",
  playground:
    "Check posted age guidance, surface conditions, and seasonal closures when you arrive.",
  sports:
    "Availability may depend on programming, reservations, or seasonal maintenance.",
  water:
    "Allowed water activities and shoreline access vary; follow current posted rules.",
  "visitor-center":
    "Check current opening hours before relying on this location for visitor assistance.",
  trailhead:
    "Use this pin as a route-planning reference and confirm current trail conditions before setting out.",
  nature:
    "Stay on designated routes and check current habitat or seasonal restrictions.",
  restroom:
    "Opening hours and seasonal availability can differ from general park hours.",
  parking:
    "Parking availability, pricing, and time limits can change; check signs when you arrive.",
  picnic:
    "Large gatherings or reserved use may require advance approval.",
};

function sentenceExcerpt(value, maxWords = 52) {
  const cleaned = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(/\s+/);
  return words.length <= maxWords ? cleaned : `${words.slice(0, maxWords).join(" ")}…`;
}

function haversineMiles(left, right) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const latitudeDistance = radians(right.latitude - left.latitude);
  const longitudeDistance = radians(right.longitude - left.longitude);
  const a =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(radians(left.latitude)) *
      Math.cos(radians(right.latitude)) *
      Math.sin(longitudeDistance / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(a));
}

function locationContext(center, feature) {
  if (!center) return `Use the mapped pin for its exact location within ${feature.parkName}.`;
  const distance = haversineMiles(center, feature);
  if (distance < 0.15) return "Use the exact map pin; it is near the park's mapped center.";
  return `Use the exact map pin; it is about ${distance.toFixed(1)} miles from the park's mapped center.`;
}

async function wikipediaSummary(reference) {
  if (!reference?.startsWith("en:")) return null;
  const title = reference.slice(3).split("#")[0];
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    {
      signal: AbortSignal.timeout(20000),
      headers: {
        "User-Agent": "AuditMap visitor information research/1.0 (https://www.auditmap.org)",
        Accept: "application/json",
      },
    },
  );
  if (!response.ok) return null;
  const payload = await response.json();
  if (!payload.extract || payload.type === "disambiguation") return null;
  return {
    text: sentenceExcerpt(payload.extract),
    label: "Wikipedia",
    url:
      payload.content_urls?.desktop?.page ||
      `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`,
  };
}

function metaContent(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,
      "i",
    ),
  ];
  return patterns.map((pattern) => html.match(pattern)?.[1]).find(Boolean);
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function officialPageSummary(url) {
  if (!url || !/^https?:/i.test(url) || /\.pdf(?:$|\?)/i.test(url)) return null;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: {
        "User-Agent": "AuditMap visitor information research/1.0 (https://www.auditmap.org)",
        Accept: "text/html",
      },
    });
    if (!response.ok || !/text\/html/i.test(response.headers.get("content-type") || "")) {
      return null;
    }
    const html = await response.text();
    const description = metaContent(html, "og:description") || metaContent(html, "description");
    return description ? sentenceExcerpt(decodeEntities(description)) : null;
  } catch {
    return null;
  }
}

async function wikidataSummary(identifier) {
  if (!identifier) return null;
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.searchParams.set("action", "wbgetentities");
  url.searchParams.set("ids", identifier);
  url.searchParams.set("props", "descriptions|sitelinks");
  url.searchParams.set("languages", "en");
  url.searchParams.set("sitefilter", "enwiki");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: {
      "User-Agent": "AuditMap visitor information research/1.0 (https://www.auditmap.org)",
      Accept: "application/json",
    },
  });
  if (!response.ok) return null;
  const entity = (await response.json()).entities?.[identifier];
  const wikipediaTitle = entity?.sitelinks?.enwiki?.title;
  if (wikipediaTitle) {
    const wikipedia = await wikipediaSummary(`en:${wikipediaTitle}`);
    if (wikipedia) return wikipedia;
  }
  const description = entity?.descriptions?.en?.value;
  return description
    ? {
        text: `${description.charAt(0).toUpperCase()}${description.slice(1)}.`,
        label: "Wikidata",
        url: `https://www.wikidata.org/wiki/${identifier}`,
      }
    : null;
}

function fallbackDescription(feature) {
  const category =
    {
      sports: "sports facility",
      water: "water feature",
      art: "public artwork",
      museum: "museum or visitor attraction",
      "dog-area": "dog area",
      "event-space": "event space",
      "visitor-center": "visitor center",
      trailhead: "trail access point",
    }[feature.feature_type] ||
    String(feature.feature_type || "destination").replaceAll("-", " ");
  return `${feature.name} is a mapped ${category} within ${feature.parkName}.`;
}

async function main() {
  const document = JSON.parse(fs.readFileSync(readyPath, "utf8"));
  let wikipediaCount = 0;
  let officialCount = 0;
  let mapCount = 0;
  let wikidataCount = 0;
  const records = {};
  for (const park of document.parks) {
    if (!park.features.length) continue;
    const center = locations.get(park.id);
    for (const feature of park.features) {
      feature.parkName = park.name;
      const officialInformationUrl =
        feature.discovery?.imageMethod === "official-page-open-graph"
          ? feature.details.imageSourceUrl
          : !/^OpenStreetMap contributors$/i.test(feature.source_label || "")
            ? feature.source_url
            : null;
      let wikipedia = await wikipediaSummary(feature.discovery?.wikipedia);
      let rejectedAnchoredWikipedia = false;
      if (
        wikipedia &&
        feature.discovery?.wikipedia?.includes("#") &&
        !wikipedia.text.toLowerCase().includes(park.name.toLowerCase())
      ) {
        wikipedia = null;
        rejectedAnchoredWikipedia = true;
      }
      const wikidata = wikipedia || rejectedAnchoredWikipedia
        ? null
        : await wikidataSummary(feature.discovery?.wikidata);
      const officialSummary =
        feature.discovery?.imageMethod === "official-page-open-graph"
          ? await officialPageSummary(officialInformationUrl)
          : null;
      const context =
        officialSummary || wikipedia?.text || wikidata?.text || fallbackDescription(feature);
      const guidance =
        needToKnow[feature.feature_type] ||
        "Use the mapped pin and check current posted conditions when you arrive.";
      feature.description = context;
      feature.details.locationContext = locationContext(center, feature);
      feature.details.needToKnow = guidance;
      feature.details.informationCheckedAt = checkedAt;
      if (officialInformationUrl) {
        feature.details.informationSourceLabel = feature.source_label || "Official park source";
        feature.details.informationSourceUrl = officialInformationUrl;
        officialCount += 1;
      } else if (wikipedia) {
        feature.details.informationSourceLabel = wikipedia.label;
        feature.details.informationSourceUrl = wikipedia.url;
        wikipediaCount += 1;
      } else if (wikidata) {
        feature.details.informationSourceLabel = wikidata.label;
        feature.details.informationSourceUrl = wikidata.url;
        wikidataCount += 1;
      } else {
        feature.details.informationSourceLabel = feature.source_label || "OpenStreetMap contributors";
        feature.details.informationSourceUrl = feature.source_url;
        mapCount += 1;
      }
      records[feature.id] = {
        description: feature.description,
        details: {
          locationContext: feature.details.locationContext,
          needToKnow: feature.details.needToKnow,
          informationCheckedAt: feature.details.informationCheckedAt,
          informationSourceLabel: feature.details.informationSourceLabel,
          informationSourceUrl: feature.details.informationSourceUrl,
        },
      };
      delete feature.parkName;
      await new Promise((resolve) => setTimeout(resolve, wikipedia ? 80 : 0));
    }
  }
  document.generatedAt = new Date().toISOString();
  document.informationEnrichment = {
    checkedAt,
    officialSourceRecords: officialCount,
    wikipediaRecords: wikipediaCount,
    wikidataRecords: wikidataCount,
    mappedGuidanceRecords: mapCount,
  };
  fs.writeFileSync(readyPath, `${JSON.stringify(document, null, 2)}\n`);
  fs.writeFileSync(
    overlayPath,
    `${JSON.stringify(
      {
        generatedAt: document.generatedAt,
        checkedAt,
        records,
      },
      null,
      2,
    )}\n`,
  );
  console.log(JSON.stringify(document.informationEnrichment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
