const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}
const inputName = argumentValue("input") || "pilot-subsites.json";
const pilotPath = path.join(projectRoot, "data", "generated", inputName);
const strictContext = process.argv.includes("--strict-context");
const clearImages = process.argv.includes("--clear-images");
const commonsEndpoint = "https://commons.wikimedia.org/w/api.php";
const allowedLicenses = /^(CC0|CC BY|CC BY-SA|Public domain|PDM)/i;
const ignoredTokens = new Set([
  "park",
  "museum",
  "garden",
  "center",
  "centre",
  "memorial",
  "playground",
  "golf",
  "course",
  "tennis",
  "fitness",
  "trail",
  "trails",
  "regional",
  "metropolitan",
  "the",
  "and",
]);

function stripHtml(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulTokens(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !ignoredTokens.has(token));
}

async function fetchJson(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    headers: {
      "User-Agent": "AuditMap subsite image research/1.0 (https://www.auditmap.org)",
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`Commons returned ${response.status}`);
  return response.json();
}

async function search(feature, park) {
  const queries = [
    `"${feature.name}" "${park.name}"`,
    `${feature.name} ${park.city} ${park.state}`,
    `intitle:"${feature.name}"`,
    `${feature.name} ${park.city}`,
  ];
  const pages = [];
  for (const query of queries) {
    const parameters = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: query,
      gsrnamespace: "6",
      gsrlimit: "15",
      prop: "imageinfo",
      iiprop: "url|extmetadata|mime",
      iiurlwidth: "1400",
      format: "json",
      origin: "*",
    });
    const payload = await fetchJson(`${commonsEndpoint}?${parameters}`);
    pages.push(
      ...Object.values(payload.query?.pages || {}).sort(
        (left, right) => Number(left.index || 999) - Number(right.index || 999),
      ),
    );
  }

  const featureTokens = meaningfulTokens(feature.name);
  const parkTokens = meaningfulTokens(park.name);
  return pages
    .map((page) => {
      if ((feature.discovery?.rejectedImageTitles || []).includes(page.title)) return null;
      const info = page.imageinfo?.[0] || {};
      const metadata = info.extmetadata || {};
      const license = stripHtml(metadata.LicenseShortName?.value);
      const text = `${page.title} ${stripHtml(metadata.ImageDescription?.value)}`.toLowerCase();
      const featureMatches = featureTokens.filter((token) => text.includes(token)).length;
      const featureMatch = featureMatches > 0;
      const strongFeatureMatch = featureTokens.length >= 2 && featureMatches >= 2;
      const contextMatch =
        parkTokens.some((token) => text.includes(token)) ||
        text.includes(park.city.toLowerCase());
      if (
        !featureMatch ||
        (!contextMatch && (strictContext || !strongFeatureMatch)) ||
        !info.thumburl ||
        !/^image\/(jpeg|png|webp)$/i.test(info.mime || "") ||
        !allowedLicenses.test(license)
      ) return null;
      return {
        url: info.thumburl,
        source: info.descriptionurl,
        author:
          stripHtml(metadata.Artist?.value) ||
          stripHtml(metadata.Credit?.value) ||
          "Wikimedia Commons contributor",
        license,
        alt:
          stripHtml(metadata.ImageDescription?.value) ||
          `${feature.name} within ${park.name}`,
        fileTitle: page.title,
      };
    })
    .filter(Boolean)[0] || null;
}

async function main() {
  const document = JSON.parse(fs.readFileSync(pilotPath, "utf8"));
  if (clearImages) {
    for (const park of document.parks) {
      for (const feature of park.features || []) {
        delete feature.details.imageUrl;
        delete feature.details.imageSourceUrl;
        delete feature.details.imageAuthor;
        delete feature.details.imageLicense;
        delete feature.details.imageAlt;
        delete feature.discovery.imageFileTitle;
      }
    }
  }
  let matched = 0;
  let missing = 0;
  for (const park of document.parks) {
    for (const feature of park.features || []) {
      if (feature.details?.imageUrl) {
        matched += 1;
        continue;
      }
      try {
        const image = await search(feature, park);
        if (!image) {
          missing += 1;
          console.log(`No photo: ${park.name} / ${feature.name}`);
          continue;
        }
        feature.details.imageUrl = image.url;
        feature.details.imageSourceUrl = image.source;
        feature.details.imageAuthor = image.author;
        feature.details.imageLicense = image.license;
        feature.details.imageAlt = image.alt;
        feature.discovery.imageFileTitle = image.fileTitle;
        matched += 1;
        console.log(`Photo: ${park.name} / ${feature.name}`);
      } catch (error) {
        missing += 1;
        feature.discovery.imageError = error.message;
      }
      fs.writeFileSync(
        pilotPath,
        `${JSON.stringify({ ...document, generatedAt: new Date().toISOString() }, null, 2)}\n`,
      );
    }
  }
  fs.writeFileSync(
    pilotPath,
    `${JSON.stringify({ ...document, generatedAt: new Date().toISOString() }, null, 2)}\n`,
  );
  console.log(`Matched ${matched}; missing ${missing}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
