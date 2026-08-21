#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const argument = (name, fallback = "") => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || fallback : fallback;
};
const campaignArg = argument("--campaign");
const outputArg = argument("--output");
const pageSizeArg = Number(argument("--page-size", "20"));

if (!campaignArg || !outputArg) {
  console.error(
    "Usage: node scripts/research-openverse-campaign-images.js --campaign data/campaign.json --output data/photo-research.json [--page-size 40]",
  );
  process.exit(1);
}

const campaignPath = path.resolve(root, campaignArg);
const outputPath = path.resolve(root, outputArg);
const campaign = JSON.parse(fs.readFileSync(campaignPath, "utf8"));
const reusableLicenses = new Set(["by", "by-sa", "cc0", "pdm"]);

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchedTerms(place, candidate) {
  const haystack = normalize(
    [candidate.title, ...(candidate.tags || []).map((tag) => tag.name)].join(" "),
  );
  return normalize(`${place.name} ${place.city}`)
    .split(" ")
    .filter((term) => term.length > 3 && haystack.includes(term));
}

async function searchQuery(place, queryText) {
  const query = encodeURIComponent(queryText);
  const response = await fetch(
    `https://api.openverse.org/v1/images/?q=${query}&page_size=${Math.min(Math.max(pageSizeArg, 1), 20)}`,
    {
      headers: {
        "User-Agent": "AuditMap image-rights research (https://www.auditmap.org)",
      },
    },
  );
  if (!response.ok) {
    throw new Error(`${place.name}: Openverse returned ${response.status}`);
  }
  const body = await response.json();
  return (body.results || [])
    .filter((candidate) => reusableLicenses.has(candidate.license))
    .filter((candidate) => candidate.url && candidate.foreign_landing_url)
    .map((candidate) => ({
      title: candidate.title || `${place.name} photograph`,
      url: candidate.url,
      source: candidate.foreign_landing_url,
      creator: candidate.creator || "Unknown creator",
      creatorUrl: candidate.creator_url || "",
      license: String(candidate.license || "").toUpperCase(),
      licenseVersion: candidate.license_version || "",
      licenseUrl: candidate.license_url || "",
      width: candidate.width || null,
      height: candidate.height || null,
      provider: candidate.provider || candidate.source || "Openverse",
      matchedTerms: matchedTerms(place, candidate),
      reviewStatus: "pending-destination-match",
      reviewNote:
        "Confirm that the image depicts the named destination before approving or downloading.",
      query: queryText,
    }));
}

async function search(place) {
  const queries = place.imageQueries?.length
    ? place.imageQueries
    : [`${place.name} ${place.city} ${place.state}`];
  const responses = [];
  for (const query of queries) responses.push(...(await searchQuery(place, query)));
  return [...new Map(responses.map((candidate) => [candidate.source, candidate])).values()]
    .sort((a, b) => {
      const matchDifference = b.matchedTerms.length - a.matchedTerms.length;
      if (matchDifference) return matchDifference;
      return (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0);
    });
}

(async () => {
  const places = {};
  for (const place of campaign.places || []) {
    const candidates = await search(place);
    places[place.id] = {
      name: place.name,
      queries: place.imageQueries || [`${place.name} ${place.city} ${place.state}`],
      candidates,
      reusableCandidateCount: candidates.length,
      reviewedCandidateCount: 0,
    };
    console.log(
      `${place.name}: ${candidates.length} reusable candidates pending review`,
    );
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(
      {
        campaign: campaign.campaign,
        researchedAt: new Date().toISOString().slice(0, 10),
        source: "Openverse API",
        licenseFilter: [...reusableLicenses],
        places,
      },
      null,
      2,
    )}\n`,
  );
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
