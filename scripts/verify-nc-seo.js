const fs = require("node:fs");
const path = require("node:path");

const origin = "https://www.auditmap.org";
const sitemap = fs.readFileSync("sitemap.xml", "utf8");
const sitemapEntries = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const sitemapUrls = new Set(sitemapEntries);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(filePath) : [filePath];
  });
}

function attribute(html, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`${escaped}[^>]+content="([^"]*)"`))?.[1] || "";
}

function linkHref(html, relation) {
  return html.match(new RegExp(`<link rel="${relation}" href="([^"]+)"`))?.[1] || "";
}

const pages = [];
const failures = [];
const globalFailures = [];
const seenTitles = new Map();
const seenDescriptions = new Map();
const seenCanonicals = new Map();

for (const filePath of walk(path.join("us", "nc")).filter((filePath) => filePath.endsWith(`${path.sep}index.html`))) {
  const html = fs.readFileSync(filePath, "utf8");
  const isPlacePage = html.includes('id="search-place-data"');
  const relativeDirectory = `/${path.dirname(filePath).replaceAll(path.sep, "/")}`;
  const expectedCanonical = `${origin}${relativeDirectory}`;
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || "";
  const description = attribute(html, '<meta name="description"');
  const canonical = linkHref(html, "canonical");
  const ogTitle = attribute(html, '<meta property="og:title"');
  const ogDescription = attribute(html, '<meta property="og:description"');
  const ogUrl = attribute(html, '<meta property="og:url"');
  const ogImage = attribute(html, '<meta property="og:image"');
  const modified = attribute(html, '<meta property="article:modified_time"');
  const pageFailures = [];

  if (!title) pageFailures.push("title missing");
  if (!description) pageFailures.push("description missing");
  if (canonical !== expectedCanonical) pageFailures.push(`canonical mismatch: ${canonical}`);
  if (ogTitle !== title) pageFailures.push("Open Graph title mismatch");
  if (ogDescription !== description) pageFailures.push("Open Graph description mismatch");
  if (ogUrl !== canonical) pageFailures.push("Open Graph URL mismatch");
  if (!/^https:\/\//.test(ogImage)) pageFailures.push(`Open Graph image is not absolute: ${ogImage}`);
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/.test(modified)) {
    pageFailures.push(`modified date invalid: ${modified}`);
  }
  if (!sitemapUrls.has(canonical)) pageFailures.push("canonical missing from sitemap");

  const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!schemaMatch) {
    pageFailures.push("JSON-LD missing");
  } else {
    try {
      const schema = JSON.parse(schemaMatch[1]);
      const graph = schema["@graph"] || [];
      for (const type of ["Organization", "WebSite", "BreadcrumbList", isPlacePage ? "Place" : "CollectionPage"]) {
        if (!graph.some((node) => node["@type"] === type)) pageFailures.push(`${type} schema missing`);
      }
      const breadcrumbs = graph.find((node) => node["@type"] === "BreadcrumbList")?.itemListElement || [];
      if (breadcrumbs.at(-1)?.item !== canonical) pageFailures.push("structured breadcrumb does not end at canonical");
      if (breadcrumbs.some((item, index) => item.position !== index + 1)) pageFailures.push("structured breadcrumb positions invalid");
      if (isPlacePage) {
        const place = graph.find((node) => node["@type"] === "Place");
        if (place?.url !== canonical) pageFailures.push("Place schema URL mismatch");
        if (place?.["@id"] !== `${canonical}#place`) pageFailures.push("Place schema ID mismatch");
        if (!/^https:\/\//.test(place?.image || "")) pageFailures.push("Place schema image is not absolute");
        if (!Number.isFinite(Number(place?.geo?.latitude)) || !Number.isFinite(Number(place?.geo?.longitude))) {
          pageFailures.push("Place schema coordinates invalid");
        }
      } else {
        const collection = graph.find((node) => node["@type"] === "CollectionPage");
        if (collection?.url !== canonical) pageFailures.push("CollectionPage schema URL mismatch");
        if (collection?.["@id"] !== `${canonical}#collection`) pageFailures.push("CollectionPage schema ID mismatch");
        if (!collection?.mainEntity?.itemListElement?.length) pageFailures.push("CollectionPage ItemList is empty");
      }
    } catch (error) {
      pageFailures.push(`JSON-LD invalid: ${error.message}`);
    }
  }

  for (const [value, label, catalog] of [
    [title, "title", seenTitles],
    [description, "description", seenDescriptions],
    [canonical, "canonical", seenCanonicals],
  ]) {
    if (!value) continue;
    if (catalog.has(value)) pageFailures.push(`duplicate ${label} with ${catalog.get(value)}`);
    else catalog.set(value, filePath);
  }

  pages.push({ filePath, canonical, type: isPlacePage ? "place" : "hub" });
  if (pageFailures.length) failures.push({ filePath, failures: pageFailures });
}

const canonicalUrls = new Set(pages.map((page) => page.canonical));
const ncSitemapUrls = sitemapEntries.filter((url) => url.startsWith(`${origin}/us/nc`));
const staleNcUrls = ncSitemapUrls.filter((url) => !canonicalUrls.has(url));
if (sitemapEntries.length !== sitemapUrls.size) globalFailures.push("sitemap contains duplicate URLs");
if (staleNcUrls.length) globalFailures.push(`sitemap contains stale NC URLs: ${staleNcUrls.join(", ")}`);
if (sitemapEntries.some((url) => /\/(?:admin|place|feature)(?:\.html)?(?:$|[?#/])/i.test(url))) {
  globalFailures.push("sitemap contains admin or utility routes");
}

for (const filePath of ["admin.html", "place.html", "feature.html"]) {
  const html = fs.readFileSync(filePath, "utf8");
  if (!/<meta name="robots" content="[^"]*noindex[^"]*" \/>/.test(html)) {
    globalFailures.push(`${filePath} is missing noindex`);
  }
}

const robots = fs.readFileSync("robots.txt", "utf8");
if (!robots.includes(`Sitemap: ${origin}/sitemap.xml`)) globalFailures.push("robots.txt is missing the root sitemap declaration");

const report = {
  valid: failures.length === 0 && globalFailures.length === 0,
  pagesChecked: pages.length,
  placePages: pages.filter((page) => page.type === "place").length,
  hubPages: pages.filter((page) => page.type === "hub").length,
  sitemapEntries: sitemapEntries.length,
  globalFailures,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (!report.valid) process.exitCode = 1;
