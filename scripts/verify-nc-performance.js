const fs = require("node:fs");
const path = require("node:path");

const MAX_HTML_BYTES = 150 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_WARNING_BYTES = 2 * 1024 * 1024;

const sitemap = fs.readFileSync("sitemap.xml", "utf8");
const pagePaths = [...sitemap.matchAll(/<loc>https:\/\/www\.auditmap\.org(\/us\/nc(?:\/[^<]*)?)<\/loc>/g)]
  .map((match) => match[1]);

const oversizedPages = [];
const oversizedImages = [];
const imageWarnings = [];
const checkedImages = new Set();
let largestPage = null;
let largestImage = null;

for (const pagePath of pagePaths) {
  const filePath = path.join(`.${pagePath}`, "index.html");
  if (!fs.existsSync(filePath)) continue;

  const bytes = fs.statSync(filePath).size;
  if (!largestPage || bytes > largestPage.bytes) largestPage = { pagePath, bytes };
  if (bytes > MAX_HTML_BYTES) oversizedPages.push({ pagePath, bytes });

  const html = fs.readFileSync(filePath, "utf8");
  const placeDataMatch = html.match(/<script id="search-place-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!placeDataMatch) continue;

  const place = JSON.parse(placeDataMatch[1]);
  const images = [place.image, ...(place.images || [])].filter((image) => image?.url?.startsWith("/"));
  for (const image of images) {
    if (checkedImages.has(image.url)) continue;
    checkedImages.add(image.url);

    const imagePath = path.join(`.${image.url}`);
    if (!fs.existsSync(imagePath)) continue;
    const imageBytes = fs.statSync(imagePath).size;
    const record = { image: image.url, bytes: imageBytes };
    if (!largestImage || imageBytes > largestImage.bytes) largestImage = record;
    if (imageBytes > MAX_IMAGE_BYTES) oversizedImages.push(record);
    else if (imageBytes > IMAGE_WARNING_BYTES) imageWarnings.push(record);
  }
}

oversizedPages.sort((a, b) => b.bytes - a.bytes);
oversizedImages.sort((a, b) => b.bytes - a.bytes);
imageWarnings.sort((a, b) => b.bytes - a.bytes);

const report = {
  valid: oversizedPages.length === 0 && oversizedImages.length === 0,
  pagesChecked: pagePaths.length,
  localImagesChecked: checkedImages.size,
  limits: { maxHtmlBytes: MAX_HTML_BYTES, maxImageBytes: MAX_IMAGE_BYTES, imageWarningBytes: IMAGE_WARNING_BYTES },
  largestPage,
  largestImage,
  oversizedPages,
  oversizedImages,
  imageWarnings,
};

console.log(JSON.stringify(report, null, 2));
if (!report.valid) process.exitCode = 1;
