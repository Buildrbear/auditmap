const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const pilotPath = path.join(projectRoot, "data", "generated", "pilot-subsites.json");
const pageMap = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "data", "pilot-official-image-pages.json"), "utf8"),
);

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

async function main() {
  const document = JSON.parse(fs.readFileSync(pilotPath, "utf8"));
  let added = 0;
  for (const park of document.parks) {
    for (const feature of park.features || []) {
      if (feature.details?.imageUrl) continue;
      const pageUrl = pageMap[`${park.id}:${feature.slug}`];
      if (!pageUrl) continue;
      const response = await fetch(pageUrl, {
        signal: AbortSignal.timeout(30000),
        headers: {
          "User-Agent": "AuditMap official image research/1.0 (https://www.auditmap.org)",
          Accept: "text/html",
        },
      });
      if (!response.ok) throw new Error(`${pageUrl} returned ${response.status}`);
      const html = await response.text();
      const imageUrl = metaContent(html, "og:image");
      if (!imageUrl) throw new Error(`${pageUrl} has no Open Graph image`);
      feature.details.imageUrl = new URL(imageUrl, pageUrl).href;
      feature.details.imageSourceUrl = pageUrl;
      feature.details.imageAuthor = feature.source_label;
      feature.details.imageLicense = "Official source image; rights retained by source";
      feature.details.imageAlt =
        metaContent(html, "og:image:alt") || `${feature.name} at ${park.name}`;
      feature.discovery.imageFileTitle = path.basename(new URL(imageUrl, pageUrl).pathname);
      feature.discovery.imageMethod = "official-page-open-graph";
      added += 1;
      console.log(`Official photo: ${park.name} / ${feature.name}`);
    }
  }
  document.generatedAt = new Date().toISOString();
  fs.writeFileSync(pilotPath, `${JSON.stringify(document, null, 2)}\n`);
  console.log(`Added ${added} official-source photos.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
