const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const locationsPath = path.join(projectRoot, "data", "generated", "launch-park-locations.json");
const overridesPath = path.join(projectRoot, "data", "launch-location-overrides.json");
const outputPath = path.join(projectRoot, "data", "generated", "launch-park-enrichment.json");
const commonsEndpoint = "https://commons.wikimedia.org/w/api.php";
const allowedLicenses = /^(CC0|CC BY|CC BY-SA|Public domain|PDM)/i;
const approvedNearbyFiles = {
  "launch-fl-miami-maurice-a-ferre-park": [
    "Frost Science Museum",
    "Havana's Balcony",
  ],
  "launch-tn-memphis-tom-lee-park": ["Old Man River", "Tom Lee"],
  "launch-tx-houston-memorial-park": ["Houston Arboretum"],
  "launch-ok-oklahoma-city-lake-hefner-park": ["Lake Hefner"],
  "launch-co-colorado-springs-memorial-park": ["Memorial Park, Colorado Springs"],
  "launch-ca-los-angeles-exposition-park": ["Memorial Coliseum"],
  "launch-ca-long-beach-el-dorado-east-regional-park": ["El Dorado Regional"],
  "launch-nc-charlotte-reedy-creek-park-and-nature-center": ["Robinson Rockhouse"],
};
const rejectedImageFiles = {
  "launch-nc-cherokee-great-smoky-mountains-national-park": ["Pink Motel"],
  "launch-nc-asheville-blue-ridge-parkway": ["Dirk Kempthorne"],
  "launch-nc-nags-head-jockey-s-ridge-state-park": ["U.S. Route 158"],
  "launch-nc-danbury-hanging-rock-state-park": ["Stars behind the clouds"],
  "launch-nc-greensboro-keeley-park": ["1940 Census Enumeration District Descriptions"],
  "launch-nc-durham-west-point-on-the-eno": ["Sollie, 2015"],
  "launch-nc-durham-durham-central-park": ["Apartment Construction", "No Kings Protest"],
  "launch-nc-durham-american-tobacco-trail": [
    "American tobacco campus looking south",
    "Looking South from Bert",
    "Moon over Southside",
    "Full moon over Southside",
    "Yellow ribbon marking a tree"
  ],
  "launch-nc-winston-salem-hanes-park": ["Hanes Park Girls Track Apr 26th, 1930"],
  "launch-nc-winston-salem-washington-park": ["Washington Park, Cascade near Park"],
  "launch-nc-fayetteville-cape-fear-river-trail": ["3rd MISB volunteers cut new bike path"],
  "launch-nc-cary-fred-g-bond-metro-park": ["Branta canadensis canadensis"],
  "launch-nc-cary-hemlock-bluffs-nature-preserve": ["Marbled Salamanders Eggs"],
  "launch-nc-wilmington-empie-park": ["Wilmington NC Damage Isaias"],
  "launch-nc-greenville-greenville-town-common": [
    "GvlNC Collage",
    "Tar River at Town Common",
    "BUILD Grant Project"
  ],
  "launch-nc-apex-kelly-road-park": ["shuttered for Covid-19"],
  "launch-nc-huntersville-north-mecklenburg-park": ["1940 Census Enumeration District Descriptions"],
  "launch-nc-chapel-hill-bolin-creek-trail": [
    "Rainwater drainage pipe in Chapel Hill",
    "Water flowing out of a drainage pipe in Chapel Hill"
  ],
  "launch-nc-burlington-arboretum-at-willowbrook-park": ["Burlington Iowa"],
};

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

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AuditMap park research/1.0 (https://www.auditmap.org)",
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`${response.status} from ${new URL(url).hostname}`);
  return response.json();
}

async function osmFacts(location) {
  if (!location.osmType || !location.osmId) return {};
  const type = location.osmType === "node" ? "node" : location.osmType === "relation" ? "relation" : "way";
  const payload = await fetchJson(
    `https://api.openstreetmap.org/api/0.6/${type}/${location.osmId}.json`,
  );
  const element = payload.elements?.find(
    (candidate) => candidate.type === type && Number(candidate.id) === Number(location.osmId),
  );
  const tags = element?.tags || {};
  return {
    operator: tags.operator || "",
    officialWebsite: tags.website || tags["contact:website"] || "",
    hours: tags.opening_hours || "",
    fee: tags.fee || "",
    wheelchair: tags.wheelchair || "",
    description: tags.description || "",
    wikipedia: tags.wikipedia || "",
    wikidata: tags.wikidata || "",
    sourceUrl: location.sourceUrl,
    checkedAt: new Date().toISOString().slice(0, 10),
  };
}

async function commonsImages(location) {
  const shortName = location.park
    .replace(/\b(regional|state|metropolitan|memorial)\b/gi, "")
    .replace(/\s+(and|at)\s+.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const queries = [
    `"${location.park}" ${location.city} ${location.state}`,
    `${location.park} ${location.city} ${location.state}`,
    `"${shortName}" ${location.city}`,
  ];
  const pages = [];
  for (const query of queries) {
    const parameters = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: query,
      gsrnamespace: "6",
      gsrlimit: "16",
      prop: "imageinfo",
      iiprop: "url|extmetadata|mime",
      iiurlwidth: "1600",
      format: "json",
      origin: "*",
    });
    const payload = await fetchJson(`${commonsEndpoint}?${parameters}`);
    pages.push(
      ...Object.values(payload.query?.pages || {}).sort(
        (left, right) => Number(left.index || 999) - Number(right.index || 999),
      ),
    );
    if (pages.length >= 3) await sleep(80);
  }
  const parkTokens = location.park
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !["park", "regional", "memorial"].includes(token));

  const matchedImages = pages
    .map((page) => {
      const info = page.imageinfo?.[0] || {};
      const metadata = info.extmetadata || {};
      const license = stripHtml(metadata.LicenseShortName?.value);
      const fileTitle = page.title.toLowerCase();
      const description = stripHtml(metadata.ImageDescription?.value).toLowerCase();
      const hasTitleMatch = parkTokens.some((token) => fileTitle.includes(token));
      const hasContextMatch =
        parkTokens.some((token) => description.includes(token)) &&
        (description.includes(location.city.toLowerCase()) ||
          fileTitle.includes(location.city.toLowerCase()));
      if (
        !info.thumburl ||
        info.mime === "image/svg+xml" ||
        !/^image\/(jpeg|png|webp)$/i.test(info.mime || "") ||
        !allowedLicenses.test(license) ||
        !(hasTitleMatch || hasContextMatch)
      ) return null;
      return {
        url: info.thumburl,
        source: info.descriptionurl,
        author:
          stripHtml(metadata.Artist?.value) ||
          stripHtml(metadata.Credit?.value) ||
          "Wikimedia Commons contributor",
        license,
        licenseUrl: metadata.LicenseUrl?.value || "",
        alt:
          stripHtml(metadata.ImageDescription?.value) ||
          `${location.park} in ${location.city}`,
        fileTitle: page.title,
      };
    })
    .filter(Boolean)
    .filter(
      (image) =>
        !(rejectedImageFiles[location.id] || []).some((title) =>
          image.fileTitle?.includes(title),
        ),
    )
    .filter(
      (image, index, images) =>
        images.findIndex((candidate) => candidate.source === image.source) === index,
    )
    .slice(0, 3);
  if (matchedImages.length) return matchedImages;

  const geoParameters = new URLSearchParams({
    action: "query",
    generator: "geosearch",
    ggsprimary: "all",
    ggsnamespace: "6",
    ggsradius: "2000",
    ggscoord: `${location.latitude}|${location.longitude}`,
    ggslimit: "24",
    prop: "imageinfo",
    iiprop: "url|extmetadata|mime",
    iiurlwidth: "1600",
    format: "json",
    origin: "*",
  });
  const geoPayload = await fetchJson(`${commonsEndpoint}?${geoParameters}`);
  return Object.values(geoPayload.query?.pages || {})
    .sort((left, right) => Number(left.index || 999) - Number(right.index || 999))
    .map((page) => {
      const info = page.imageinfo?.[0] || {};
      const metadata = info.extmetadata || {};
      const license = stripHtml(metadata.LicenseShortName?.value);
      if (
        !info.thumburl ||
        info.mime === "image/svg+xml" ||
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
        licenseUrl: metadata.LicenseUrl?.value || "",
        alt:
          stripHtml(metadata.ImageDescription?.value) ||
          `Photograph near ${location.park} in ${location.city}`,
        fileTitle: page.title,
        matchMethod: "geotagged-nearby",
      };
    })
    .filter(Boolean)
    .filter(
      (image) =>
        !(rejectedImageFiles[location.id] || []).some((title) =>
          image.fileTitle?.includes(title),
        ),
    )
    .filter((image) =>
      (approvedNearbyFiles[location.id] || []).some((approvedName) =>
        image.fileTitle.includes(approvedName),
      ),
    )
    .filter(
      (image, index, images) =>
        images.findIndex((candidate) => candidate.source === image.source) === index,
    )
    .slice(0, 3);
}

async function main() {
  const locationDocument = JSON.parse(fs.readFileSync(locationsPath, "utf8"));
  const overrides = fs.existsSync(overridesPath)
    ? JSON.parse(fs.readFileSync(overridesPath, "utf8"))
    : [];
  const locations = [...locationDocument.locations, ...overrides];
  const existing = fs.existsSync(outputPath)
    ? JSON.parse(fs.readFileSync(outputPath, "utf8"))
    : { parks: [] };
  existing.parks.forEach((record) => {
    record.images = (record.images || []).filter((image) => {
      if ((rejectedImageFiles[record.id] || []).some((title) => image.fileTitle?.includes(title))) {
        return false;
      }
      if (image.matchMethod !== "geotagged-nearby") return true;
      return (approvedNearbyFiles[record.id] || []).some((approvedName) =>
        image.fileTitle.includes(approvedName),
      );
    });
  });
  const records = new Map(existing.parks.map((record) => [record.id, record]));

  for (const [index, location] of locations.entries()) {
    const existingRecord = records.get(location.id);
    if (existingRecord?.images?.length) continue;
    let facts = existingRecord?.facts || {};
    let images = [];
    const errors = [];
    if (!Object.keys(facts).length) {
      try {
        facts = await osmFacts(location);
      } catch (error) {
        errors.push(`facts: ${error.message}`);
      }
    }
    try {
      images = await commonsImages(location);
    } catch (error) {
      errors.push(`images: ${error.message}`);
    }
    records.set(location.id, {
      id: location.id,
      facts,
      images,
      reviewStatus: images.length ? "baseline" : "needs-photo",
      errors,
    });
    if ((index + 1) % 10 === 0) {
      fs.writeFileSync(
        outputPath,
        `${JSON.stringify({ generatedAt: new Date().toISOString(), parks: [...records.values()] }, null, 2)}\n`,
      );
    }
    process.stdout.write(
      `\rEnriched ${records.size}/${locations.length}; ${images.length} photos for ${location.park}`,
    );
    await sleep(180);
  }

  const parks = [...records.values()];
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), parks }, null, 2)}\n`,
  );
  console.log(
    `\nSaved ${parks.length} records; ${parks.filter((park) => park.images.length).length} with photos.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
