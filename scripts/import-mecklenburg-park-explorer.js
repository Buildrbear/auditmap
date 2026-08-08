const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const inventoryPath = path.join(root, "data", "nc-white-dot-inventory.json");
const outputPath = path.join(root, "data", "mecklenburg-park-explorer-overrides.json");
const service = "https://meckags.mecklenburgcountync.gov/server/rest/services/ParkandRec/ParkLocations/FeatureServer/0";
const sourcePage = "https://parkandrec.mecknc.gov/Places-to-Visit/Parks";
const nonPhotoAttachments = new Set(["Double Oaks Park", "University Meadows Park"]);
const officialNameAliases = {
  "Kirk Farm Fields": "Kirk Farm Fields Park",
  "Mallard Creek Community Park": "Mallard Creek Park",
  "McAlpine Creek Dog Park": "McAlpine Creek Park",
  "Tom Hunter Neighborhood Park": "Tom Hunter Park",
};

const amenityFields = {
  restroom: "Restrooms", picnic: "Picnic tables", playground: "Playground",
  playswings: "Playground swings", basketball: "Basketball", tennis: "Tennis",
  volleyball: "Volleyball", spraygroun: "Sprayground", mtbcycle: "Mountain biking",
  boating: "Canoeing and kayaking", fishing: "Fishing", swimming: "Swimming",
  discgolf: "Disc golf", shelter: "Outdoor shelter", walking: "Walking trails",
  dogpark: "Dog park", garden: "Community garden", historical: "Historic feature",
  skatepark: "Skate park", fitness: "Fitness equipment", pickleball: "Pickleball",
  multipurps: "Multipurpose field", opngrnspac: "Open lawn", ballfield: "Ball field",
  batingcage: "Batting cage", grnwyacces: "Greenway access", parking: "Parking",
};

function slugify(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function json(url) {
  const response = await fetch(url, { headers: { "User-Agent": "AuditMap/1.0 (https://www.auditmap.org)" } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function download(url, destination) {
  if (fs.existsSync(destination) && fs.statSync(destination).size > 0) return;
  const response = await fetch(url, { headers: { "User-Agent": "AuditMap/1.0 (https://www.auditmap.org)" } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  fs.writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
}

async function main() {
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  const candidates = inventory.places.filter((place) => place.city === "Charlotte" && place.inventoryStatus === "park-candidate");
  const params = new URLSearchParams({ where: "city='CHARLOTTE'", outFields: "*", returnGeometry: "false", f: "json" });
  const official = await json(`${service}/query?${params}`);
  const byName = new Map(official.features.map(({ attributes }) => [attributes.prkname.toLowerCase(), attributes]));
  const result = { generatedAt: new Date().toISOString(), source: sourcePage, imageOverrides: {}, imageMetadataOverrides: {}, galleryOverrides: {}, sourceOverrides: {}, detailOverrides: {}, unmatched: [], nonOperational: [] };

  for (const place of candidates) {
    const officialName = officialNameAliases[place.name] || place.name;
    const record = byName.get(officialName.toLowerCase());
    if (!record) {
      result.unmatched.push(place.name);
      continue;
    }
    if (record.operhours === "Non-Operational") {
      result.nonOperational.push(place.name);
      continue;
    }
    const amenities = Object.entries(amenityFields).filter(([field]) => record[field] === "Yes").map(([, label]) => label);
    const address = String(record.address || record.prkaddr || place.address).toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
    const parking = record.parking === "Yes"
      ? `Use the designated parking at ${address}${record.numparking ? `; the official inventory lists approximately ${record.numparking} spaces` : ""}. Follow event and reserved-facility signs.`
      : `The official inventory does not list a dedicated parking lot. Use a legal nearby approach without blocking homes, driveways, gates, or service access.`;
    result.sourceOverrides[place.name] = sourcePage;
    result.detailOverrides[place.name] = {
      address,
      summary: `${place.name} is a ${String(record.prktype || "public").toLowerCase()} Mecklenburg County park in Charlotte with ${amenities.length ? amenities.join(", ") : "public open space"}.`,
      hours: record.operhours === "Daylight" ? "Daily during daylight hours." : `${record.operdays || "Daily"}, ${record.operhours || "during posted hours"}.`,
      amenities,
      cost: "Free public access; reservations and organized programs may have fees.",
      accessibility: record.adacomply === "Yes" ? "Mecklenburg County's Park Explorer identifies this park as ADA compliant." : "The official inventory does not identify the overall park as ADA compliant; contact Mecklenburg County for the best route to a specific amenity.",
      dogPolicy: record.dogpark === "Yes" ? "A designated dog park is available. Follow posted separation, leash, vaccination, waste, and maintenance rules." : "Dogs should remain leashed and under control. Remove waste and do not assume off-leash use is permitted.",
      parking,
    };

    const attachmentInfo = await json(`${service}/${record.objectid}/attachments?f=json`);
    const photos = nonPhotoAttachments.has(place.name)
      ? []
      : attachmentInfo.attachmentInfos.filter((item) => item.contentType.startsWith("image/")).slice(0, 3);
    if (!photos.length) continue;
    const directory = path.join(root, "assets", "parks", "nc", "charlotte", slugify(place.name));
    fs.mkdirSync(directory, { recursive: true });
    const imported = [];
    for (let index = 0; index < photos.length; index += 1) {
      const photo = photos[index];
      const extension = photo.contentType === "image/png" ? "png" : "jpg";
      const filename = index === 0 ? `hero.${extension}` : `gallery-${index}.${extension}`;
      const attachmentUrl = `${service}/${record.objectid}/attachments/${photo.id}`;
      await download(attachmentUrl, path.join(directory, filename));
      imported.push({ url: `/assets/parks/nc/charlotte/${slugify(place.name)}/${filename}`, source: attachmentUrl });
    }
    result.imageOverrides[place.name] = imported[0].url;
    result.imageMetadataOverrides[place.name] = { source: imported[0].source, author: "Mecklenburg County Park and Recreation", license: "Official Mecklenburg County Park Explorer image", alt: `${place.name} in Charlotte` };
    result.galleryOverrides[place.name] = imported.slice(1).map((photo, index) => ({ url: photo.url, source: photo.source, author: "Mecklenburg County Park and Recreation", license: "Official Mecklenburg County Park Explorer image", alt: `${place.name} visitor view ${index + 2}` }));
  }
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ matched: candidates.length - result.unmatched.length, images: Object.keys(result.imageOverrides).length, nonOperational: result.nonOperational, unmatched: result.unmatched }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
