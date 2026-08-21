const fs = require("node:fs");
const path = require("node:path");

const sitemap = fs.readFileSync("sitemap.xml", "utf8");
const pagePaths = [...sitemap.matchAll(/<loc>https:\/\/www\.auditmap\.org(\/us\/nc\/[^<]+)<\/loc>/g)]
  .map((match) => match[1])
  .filter((pagePath) => /^\/us\/nc\/[^/]+\/parks\/[^/]+$/.test(pagePath));

function imageFormat(bytes) {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP") return "webp";
  if (["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString())) return "gif";
  if (/^\s*<svg[\s>]/i.test(bytes.toString("utf8", 0, Math.min(bytes.length, 256)))) return "svg";
  return "unknown";
}

const missing = [];
const invalid = [];
let galleryImages = 0;
let localImages = 0;
let externalImages = 0;

for (const pagePath of pagePaths) {
  const html = fs.readFileSync(path.join(`.${pagePath}`, "index.html"), "utf8");
  const placeDataMatch = html.match(/<script id="search-place-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!placeDataMatch) {
    invalid.push({ pagePath, reason: "place data missing" });
    continue;
  }

  const place = JSON.parse(placeDataMatch[1]);
  const images = [place.image, ...(place.images || [])].filter((image) => image?.url);
  galleryImages += images.length;

  for (const image of images) {
    if (!image.url.startsWith("/")) {
      externalImages++;
      continue;
    }

    localImages++;
    const filePath = path.join(`.${image.url}`);
    if (!fs.existsSync(filePath)) {
      missing.push({ pagePath, image: image.url });
      continue;
    }

    const format = imageFormat(fs.readFileSync(filePath));
    if (format === "unknown") invalid.push({ pagePath, image: image.url, reason: "unsupported file signature" });
  }
}

const report = {
  valid: missing.length === 0 && invalid.length === 0,
  pagesChecked: pagePaths.length,
  galleryImages,
  localImages,
  externalImages,
  missing,
  invalid,
};

console.log(JSON.stringify(report, null, 2));
if (!report.valid) process.exitCode = 1;
