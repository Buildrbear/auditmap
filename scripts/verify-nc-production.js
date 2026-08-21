const fs = require("node:fs");

const productionOrigin = process.env.AUDITMAP_ORIGIN || "https://www.auditmap.org";
const sitemap = fs.readFileSync("sitemap.xml", "utf8");
const urls = [...sitemap.matchAll(/<loc>(https:\/\/www\.auditmap\.org\/us\/nc\/[^<]+)<\/loc>/g)]
  .map((match) => match[1])
  .filter((url) => /^https:\/\/www\.auditmap\.org\/us\/nc\/[^/]+\/parks\/[^/]+$/.test(url));

function decodeHtml(value) {
  return value.replaceAll("&amp;", "&").replaceAll("&quot;", '"');
}

async function fetchWithRetry(url, options = {}, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.status !== 429 && response.status < 500) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
  }
  throw lastError;
}

async function verifyPage(canonicalUrl) {
  const pageUrl = canonicalUrl.replace("https://www.auditmap.org", productionOrigin);
  const response = await fetchWithRetry(pageUrl, { redirect: "follow" });
  const html = await response.text();
  const heroMatch = html.match(/<img id="gallery-image" src="([^"]+)"/);
  const heroPath = heroMatch ? decodeHtml(heroMatch[1]) : "";
  const placeDataMatch = html.match(/<script id="search-place-data" type="application\/json">([\s\S]*?)<\/script>/);
  const failures = [];
  const imageFailures = [];
  let galleryImages = [];

  if (!response.ok) failures.push(`page HTTP ${response.status}`);
  if (!html.includes(`<link rel="canonical" href="${canonicalUrl}"`)) failures.push("canonical missing");
  if (!/<title>[^<]+<\/title>/.test(html)) failures.push("title missing");
  if (!html.includes("Useful answers about this place")) failures.push("visitor answers missing");
  if (!heroPath) failures.push("hero missing");

  if (placeDataMatch) {
    try {
      const placeData = JSON.parse(placeDataMatch[1]);
      galleryImages = [placeData.image, ...(placeData.images || [])]
        .filter((image) => image?.url)
        .filter((image, index, items) => items.findIndex((candidate) => candidate.url === image.url) === index);
    } catch (error) {
      failures.push(`place data invalid: ${error.message}`);
    }
  } else {
    failures.push("place data missing");
  }

  if (heroPath) {
    const heroResponse = await fetchWithRetry(new URL(heroPath, pageUrl), { redirect: "follow" });
    const contentType = heroResponse.headers.get("content-type") || "";
    if (!heroResponse.ok) failures.push(`hero HTTP ${heroResponse.status}`);
    if (!contentType.startsWith("image/")) failures.push(`hero returned ${contentType || "no content type"}`);
  }

  for (const [index, image] of galleryImages.entries()) {
    const imagePath = `/_vercel/image?url=${encodeURIComponent(image.url)}&w=828&q=78`;
    const imageResponse = await fetchWithRetry(new URL(imagePath, pageUrl), { redirect: "follow" });
    const contentType = imageResponse.headers.get("content-type") || "";
    if (!imageResponse.ok || !contentType.startsWith("image/")) {
      imageFailures.push({
        slide: index + 1,
        status: imageResponse.status,
        contentType: contentType || "none",
        sourceUrl: image.url,
      });
    }
  }

  return { canonicalUrl, galleryImagesChecked: galleryImages.length, failures, imageFailures };
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      try {
        results[index] = await worker(items[index]);
      } catch (error) {
        results[index] = { canonicalUrl: items[index], galleryImagesChecked: 0, failures: [error.message], imageFailures: [] };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

async function main() {
  const results = await mapWithConcurrency(urls, 8, verifyPage);
  const failures = results.filter((result) => result.failures.length > 0 || result.imageFailures.length > 0);
  const report = {
    valid: failures.length === 0,
    origin: productionOrigin,
    pagesChecked: results.length,
    heroesChecked: results.length - failures.filter((result) => result.failures.includes("hero missing")).length,
    galleryImagesChecked: results.reduce((total, result) => total + result.galleryImagesChecked, 0),
    failures,
  };

  console.log(JSON.stringify(report, null, 2));
  if (failures.length) process.exitCode = 1;
}

main();
