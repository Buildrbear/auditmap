#!/usr/bin/env node
const fs = require("node:fs"),
  path = require("node:path"),
  sharp = require("sharp"),
  root = path.resolve(__dirname, ".."),
  places = require("../data/generated/launch-map-places.json"),
  ids = new Set([
    "launch-il-chicago-lincoln-park",
    "launch-il-chicago-millennium-park",
    "launch-il-chicago-grant-park",
    "launch-il-chicago-maggie-daley-park",
    "launch-il-chicago-chicago-riverwalk",
    "launch-il-chicago-jackson-park",
    "launch-il-chicago-garfield-park-conservatory",
    "launch-il-chicago-chicago-lakefront-trail",
  ]),
  rejectedMatches = new Set([
    "launch-il-chicago-chicago-riverwalk:the-jetty",
    "launch-il-chicago-chicago-riverwalk:the-water-plaza",
    "launch-il-chicago-jackson-park:jackson-park-golf-course",
    "launch-il-chicago-garfield-park-conservatory:desert-house",
    "launch-il-chicago-garfield-park-conservatory:aroid-house",
    "launch-il-chicago-garfield-park-conservatory:show-house",
    "launch-il-chicago-garfield-park-conservatory:sugar-from-the-sun",
  ]),
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  slug = (value) =>
    String(value)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
  plain = (value) =>
    String(value || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[^;]+;/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  decode = (value) =>
    String(value || "")
      .replaceAll("&amp;", "&")
      .replaceAll("&#039;", "'")
      .replaceAll("&quot;", '"');

async function official(feature, parent) {
  if (!feature.source_url || feature.source_url === parent.source) return null;
  try {
    const response = await fetch(feature.source_url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 AuditMap/1.0",
      },
    });
    if (!response.ok) return null;
    const html = await response.text(),
      match =
        html.match(
          /<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i,
        ) ||
        html.match(
          /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i,
        );
    if (!match?.[1]) return null;
    return {
      url: new URL(decode(match[1]), feature.source_url).href,
      source: feature.source_url,
      author: parent.sourceLabel,
      license: `Official ${parent.sourceLabel} photograph; source attribution retained`,
      matchMethod: "official feature page",
    };
  } catch {
    return null;
  }
}

async function commons(feature) {
  const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: `"${feature.name}" Chicago`,
      gsrnamespace: "6",
      gsrlimit: "8",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "1800",
      format: "json",
      origin: "*",
    }),
    response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { "User-Agent": "AuditMap/1.0 contact@auditmap.org" },
    });
  if (!response.ok) return null;
  const payload = await response.json(),
    words = slug(feature.name)
      .split("-")
      .filter(
        (word) =>
          word.length > 3 &&
          !["chicago", "park", "trail", "access", "plaza", "street"].includes(
            word,
          ),
      ),
    candidates = Object.values(payload.query?.pages || {}).map((page) => {
      const info = page.imageinfo?.[0],
        haystack = slug(
          `${page.title} ${info?.extmetadata?.ImageDescription?.value || ""}`,
        ),
        score = words.reduce(
          (total, word) => total + (haystack.includes(word) ? 2 : 0),
          haystack.includes("chicago") ? 2 : 0,
        );
      return { page, info, score };
    });
  candidates.sort((left, right) => right.score - left.score);
  const hit = candidates.find(
    ({ info, score }) => info?.thumburl && score >= Math.max(4, words.length * 2),
  );
  if (!hit) return null;
  return {
    url: hit.info.thumburl || hit.info.url,
    source: hit.info.descriptionurl,
    author:
      plain(hit.info.extmetadata?.Artist?.value) ||
      "Wikimedia Commons contributor",
    license:
      plain(hit.info.extmetadata?.LicenseShortName?.value) ||
      "Wikimedia Commons source license",
    matchMethod: "reviewed title match on Wikimedia Commons",
  };
}

async function download(record, target, label) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await fetch(record.url, {
      headers: {
        "User-Agent": record.source.includes("wikimedia")
          ? "AuditMap/1.0 contact@auditmap.org"
          : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Referer: record.source,
      },
    });
    if (response.ok) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      await sharp(Buffer.from(await response.arrayBuffer()))
        .rotate()
        .resize(1600, 1000, {
          fit: "cover",
          position: "attention",
          withoutEnlargement: true,
        })
        .webp({ quality: 83 })
        .toFile(target);
      return;
    }
    if (attempt === 5) throw new Error(`${label}: image HTTP ${response.status}`);
    await wait(attempt * 1200);
  }
}

(async () => {
  const output = { checkedAt: "2026-08-06", places: {} };
  for (const parent of places.filter((place) => ids.has(place.id))) {
    output.places[parent.id] = {};
    for (const feature of (parent.features || []).slice(3)) {
      if (rejectedMatches.has(`${parent.id}:${feature.slug}`)) {
        console.log(`${parent.name}/${feature.name}: retaining related parent image`);
        continue;
      }
      let record = await official(feature, parent);
      if (!record) {
        await wait(350);
        record = await commons(feature);
      }
      if (!record) {
        console.log(`${parent.name}/${feature.name}: retaining related parent image`);
        continue;
      }
      const target = path.join(
        root,
        "assets/parks/chicago-super/features",
        slug(parent.name),
        `${feature.slug}.webp`,
      );
      await download(record, target, `${parent.name}/${feature.name}`);
      const metadata = await sharp(target).metadata();
      output.places[parent.id][feature.slug] = {
        ...record,
        url: `/${path.relative(root, target)}`,
        alt: `${feature.name} at ${parent.name}`,
        width: metadata.width,
        height: metadata.height,
      };
      console.log(
        `${parent.name}/${feature.name}: ${record.matchMethod} (${metadata.width}x${metadata.height})`,
      );
      await wait(350);
    }
  }
  fs.writeFileSync(
    path.join(root, "data/generated/chicago-feature-images.json"),
    `${JSON.stringify(output, null, 2)}\n`,
  );
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
