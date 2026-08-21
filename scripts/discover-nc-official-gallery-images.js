const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const backlog = JSON.parse(fs.readFileSync(path.join(root, "data", "nc-enrichment-backlog.json"), "utf8"));
const campaign = JSON.parse(fs.readFileSync(path.join(root, "data", "parent-park-information-enrichment-campaign.json"), "utf8")).parks;
const outputPath = path.join(root, "data", "photo-research", "nc-official-gallery-candidates.json");
const decode = (value = "") => String(value).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#039;/g, "'").trim();
const words = (value) => String(value || "").toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3 && !["park", "greenway", "community", "north", "south"].includes(word));

function imageCandidates(html, pageUrl, placeName) {
  const placeWords = words(placeName);
  const tags = html.match(/<img\b[^>]*>/gi) || [];
  return tags.map((tag) => {
    const source = decode(tag.match(/\b(?:src|data-src|data-original)=['"]([^'"]+)['"]/i)?.[1] || "");
    const sourceSet = decode(tag.match(/\b(?:srcset|data-srcset)=['"]([^'"]+)['"]/i)?.[1] || "");
    const largestSource = sourceSet.split(",").map((item) => item.trim().split(/\s+/)[0]).filter(Boolean).at(-1);
    const rawUrl = largestSource || source;
    const alt = decode(tag.match(/\balt=['"]([^'"]*)['"]/i)?.[1] || "");
    if (!rawUrl || /^data:|\.svg(?:\?|$)/i.test(rawUrl)) return null;
    let url;
    try { url = new URL(rawUrl, pageUrl).href; } catch { return null; }
    const identity = `${url} ${alt}`.toLowerCase();
    if (/logo|seal|icon|sprite|avatar|social|facebook|twitter|instagram|youtube|calendar|map|marker|default|placeholder|header[-_ ]?bg|favicon/.test(identity)) return null;
    const placeMatches = placeWords.filter((word) => identity.includes(word)).length;
    const amenityMatches = (identity.match(/playground|splash|spray|trail|lake|marina|field|court|garden|dog|shelter|picnic|river|bike|nature|wetland|water|boat|arboretum/g) || []).length;
    const score = placeMatches * 10 + Math.min(amenityMatches, 4) * 3 + Number(/gallery|photo|image|uploads|documents|files\/assets/.test(identity));
    return { url, alt, score, placeMatches, amenityMatches };
  }).filter(Boolean).filter((candidate, index, candidates) => candidates.findIndex((item) => item.url === candidate.url) === index).sort((left, right) => right.score - left.score).slice(0, 12);
}

async function main() {
  const results = [];
  for (const place of backlog.places.filter((item) => !item.hasHero && item.origin === "launch")) {
    const source = campaign[place.id]?.source;
    if (!source) continue;
    try {
      const response = await fetch(source, { headers: { "User-Agent": "Mozilla/5.0 AuditMap research (https://www.auditmap.org)", Accept: "text/html" }, redirect: "follow" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const candidates = imageCandidates(await response.text(), response.url, place.name);
      results.push({ id: place.id, name: place.name, city: place.city, source, status: candidates.length ? "candidates" : "none", candidates });
      console.log(`${place.city}: ${place.name} - ${candidates.length} candidates`);
    } catch (error) {
      results.push({ id: place.id, name: place.name, city: place.city, source, status: "blocked", error: error.message, candidates: [] });
      console.log(`${place.city}: ${place.name} - ${error.message}`);
    }
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), places: results }, null, 2)}\n`);
  console.log(JSON.stringify({ places: results.length, withCandidates: results.filter((item) => item.candidates.length).length, blocked: results.filter((item) => item.status === "blocked").length }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
