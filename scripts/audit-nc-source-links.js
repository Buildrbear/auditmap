const fs = require("node:fs");
const path = require("node:path");

const root = path.join("us", "nc");
const outputPath = path.join("data", "generated", "nc-source-link-audit.json");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(filePath) : [filePath];
  });
}

function addSource(catalog, url, context) {
  if (!/^https?:\/\//i.test(url || "")) return;
  if (!catalog.has(url)) catalog.set(url, new Set());
  catalog.get(url).add(context);
}

function collectSources(place, pagePath, catalog) {
  addSource(catalog, place.source, `${pagePath}: official`);
  addSource(catalog, place.image?.source, `${pagePath}: hero photo`);
  for (const [index, image] of (place.images || []).entries()) {
    addSource(catalog, image.source, `${pagePath}: photo ${index + 2}`);
  }
  for (const [intent, fact] of Object.entries(place.factSources || {})) {
    addSource(catalog, fact?.url, `${pagePath}: ${intent} fact`);
  }
  for (const source of place.sources || []) {
    addSource(catalog, source?.url, `${pagePath}: source list`);
  }
  for (const answer of place.searchAnswers || []) {
    addSource(catalog, answer?.source, `${pagePath}: ${answer.intentKey || "answer"}`);
  }
}

async function checkSource(url) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: "text/html,application/xhtml+xml,application/pdf,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 AuditMap citation audit (https://www.auditmap.org)",
      },
    });
    let classification = "healthy";
    if ([404, 410].includes(response.status)) classification = "dead";
    else if ([401, 403, 405, 406, 429].includes(response.status)) classification = "access-blocked";
    else if (response.status >= 500) classification = "temporary-error";
    else if (!response.ok) classification = "other-error";
    await response.body?.cancel();
    return {
      url,
      status: response.status,
      classification,
      finalUrl: response.url,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      url,
      status: null,
      classification: error.name === "TimeoutError" ? "timeout" : "network-error",
      error: error.message,
      elapsedMs: Date.now() - startedAt,
    };
  }
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

async function main() {
  const catalog = new Map();
  let pages = 0;
  for (const filePath of walk(root).filter((filePath) => filePath.endsWith(`${path.sep}index.html`))) {
    const html = fs.readFileSync(filePath, "utf8");
    const match = html.match(/<script id="search-place-data" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) continue;
    pages++;
    collectSources(JSON.parse(match[1]), filePath, catalog);
  }

  const checks = await mapWithConcurrency([...catalog.keys()], 10, checkSource);
  const results = checks.map((check) => ({
    ...check,
    contexts: [...catalog.get(check.url)].sort(),
  }));
  const counts = results.reduce((summary, result) => {
    summary[result.classification] = (summary[result.classification] || 0) + 1;
    return summary;
  }, {});
  const report = {
    generatedAt: new Date().toISOString(),
    pages,
    uniqueSources: results.length,
    counts,
    dead: results.filter((result) => result.classification === "dead"),
    needsReview: results.filter((result) => !["healthy", "dead"].includes(result.classification)),
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ...report, needsReview: report.needsReview.length }, null, 2));
  if (report.dead.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
