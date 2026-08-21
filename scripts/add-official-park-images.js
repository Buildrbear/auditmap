const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const pages = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data", "launch-official-image-pages.json"), "utf8"),
);
const enrichmentPath = path.join(projectRoot, "data", "generated", "launch-park-enrichment.json");
const enrichment = JSON.parse(fs.readFileSync(enrichmentPath, "utf8"));
const records = new Map(enrichment.parks.map((record) => [record.id, record]));

function decodeHtml(value = "") {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .trim();
}

function metaContent(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const property = tag.match(/\b(?:property|name)=["']([^"']+)["']/i)?.[1];
    if (property?.toLowerCase() !== key.toLowerCase()) continue;
    return decodeHtml(tag.match(/\bcontent=["']([^"']+)["']/i)?.[1] || "");
  }
  return "";
}

function validImageUrl(value) {
  try {
    const url = new URL(value, "https://www.auditmap.org");
    const pathname = url.pathname.toLowerCase();
    return pathname !== "/" && !pathname.endsWith("//") && !/\/portals\/\d+\/?$/.test(pathname);
  } catch {
    return false;
  }
}

async function main() {
  for (const page of pages) {
    const record = records.get(page.id);
    if (!record || (record.images?.length && !page.prepend)) continue;
    try {
      let imageUrl = page.imageUrl;
      if (!imageUrl) {
        const response = await fetch(page.url, {
          headers: {
            "User-Agent": "AuditMap park research/1.0 (https://www.auditmap.org)",
            Accept: "text/html",
          },
          redirect: "follow",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        const imageValue =
          metaContent(html, "og:image") ||
          metaContent(html, "twitter:image");
        if (!imageValue) throw new Error("No lead image metadata");
        imageUrl = new URL(imageValue, response.url).href;
      }
      if (!validImageUrl(imageUrl)) throw new Error("Lead metadata is not an image URL");
      const officialImage = {
        url: imageUrl,
        source: page.imageSource || page.url,
        author: page.label,
        license: page.license || "Official site image",
        alt: `${record.id.split("-").slice(4).join(" ")} park photograph`,
        matchMethod: "official-page-lead",
      };
      record.images = page.prepend
        ? [
            officialImage,
            ...(record.images || []).filter(
              (image) =>
                image.url !== officialImage.url &&
                image.matchMethod !== "official-page-lead",
            ),
          ].slice(0, 3)
        : [officialImage];
      record.reviewStatus = "baseline";
      console.log(`Added official image: ${page.id}`);
    } catch (error) {
      if (record?.images?.[0]?.matchMethod === "official-page-lead" && !validImageUrl(record.images[0].url)) {
        record.images = record.images.slice(1);
      }
      console.log(`Still missing: ${page.id} (${error.message})`);
    }
  }
  fs.writeFileSync(
    enrichmentPath,
    `${JSON.stringify({ ...enrichment, generatedAt: new Date().toISOString(), parks: [...records.values()] }, null, 2)}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
