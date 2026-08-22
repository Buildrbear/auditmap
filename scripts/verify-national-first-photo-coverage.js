#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const failures = [];

function walk(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath, output);
    else if (entry.name === "index.html") output.push(filePath);
  }
  return output;
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else value += character;
  }
  values.push(value);
  return values;
}

function identity(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

let placePages = 0;
let localImages = 0;
for (const filePath of walk(path.join(root, "us"))) {
  const html = fs.readFileSync(filePath, "utf8");
  if (!html.includes('data-page="place"')) continue;
  placePages += 1;

  const gallery = html.match(/<section class="place-gallery"[^>]*>/)?.[0] || "";
  const image = html.match(/<img id="gallery-image"[^>]*>/)?.[0] || "";
  const source = image.match(/\ssrc="([^"]*)"/)?.[1] || "";
  const alt = image.match(/\salt="([^"]*)"/)?.[1] || "";

  if (!gallery || /\shidden(?:\s|>)/.test(gallery)) {
    failures.push(`${path.relative(root, filePath)}: gallery is hidden`);
  }
  if (!source || /logo\.svg/i.test(source)) {
    failures.push(`${path.relative(root, filePath)}: missing or placeholder hero image`);
  }
  if (!alt.trim()) failures.push(`${path.relative(root, filePath)}: image alt text is empty`);

  if (source.startsWith("/_vercel/image?")) {
    const optimized = new URL(source.replaceAll("&amp;", "&"), "https://www.auditmap.org");
    const original = optimized.searchParams.get("url") || "";
    if (original.startsWith("/assets/")) {
      localImages += 1;
      if (!fs.existsSync(path.join(root, original.slice(1)))) {
        failures.push(`${path.relative(root, filePath)}: local image does not exist: ${original}`);
      }
    }
  }
}

const csvLines = fs.readFileSync(path.join(root, "data", "nationwide-major-parks-launch.csv"), "utf8")
  .trim()
  .split(/\r?\n/);
const headers = parseCsvLine(csvLines.shift());
const identities = new Map();
for (const line of csvLines) {
  const values = parseCsvLine(line);
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  const key = [row.state, row.city, row.park].map(identity).join("|");
  const names = identities.get(key) || [];
  names.push(row.park);
  identities.set(key, names);
}
for (const [key, names] of identities) {
  if (names.length > 1) failures.push(`nationwide launch duplicate ${key}: ${names.join(", ")}`);
}

const redirects = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8")).redirects || [];
const expectedRedirects = new Map([
  ["/us/fl/miami/parks/maurice-a-ferr-park", "/us/fl/miami/parks/maurice-a-ferre-park"],
  ["/us/ga/atlanta/parks/atlanta-beltline-eastside-trail", "/us/ga/atlanta/parks/eastside-trail"],
  ["/us/ga/atlanta/parks/chastain-memorial-park", "/us/ga/atlanta/parks/chastain-park"],
  ["/us/ga/atlanta/parks/shirley-clarke-franklin-park-westside-park", "/us/ga/atlanta/parks/westside-park"],
]);
for (const [source, destination] of expectedRedirects) {
  if (!redirects.some((redirect) => redirect.source === source
    && redirect.destination === destination
    && redirect.permanent === true)) {
    failures.push(`missing permanent redirect: ${source} -> ${destination}`);
  }
  const staleFile = path.join(root, source.slice(1), "index.html");
  if (fs.existsSync(staleFile)) failures.push(`stale duplicate page still exists: ${source}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  valid: true,
  placePages,
  localImages,
  placeholderOrHiddenGalleries: 0,
  duplicateLaunchRows: 0,
  legacyRedirects: expectedRedirects.size,
}, null, 2));
