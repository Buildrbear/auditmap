const fs = require("node:fs");
const path = require("node:path");
const { nationalDailyPostId } = require("./lib/national-daily-identifiers");
const { resolveNationalDailyCohort } = require("./lib/national-daily-cohort");

const root = path.resolve(__dirname, "..");
const outputJson = path.join(root, "data/generated/marketing/national-daily-discovery.json");
const outputBrief = path.join(root, "preview/national-daily-discovery-launch.md");
const cohortPath = path.join(root, "data/discovery-campaigns/national-daily-discovery-cohort.json");
const startDate = new Date(process.env.AUDITMAP_DAILY_START || "2026-08-10T12:00:00-04:00");
const campaign = "national_daily_discovery";
const reusableLicense = /\b(public domain|pdm(?:\s+1\.0)?|cc0|cc[ -]?by(?:[ -]?sa)?|by(?:-sa)?(?:\s+\d)|creative commons)\b/i;
const priorityIntents = ["public-art", "playground", "trail-surface", "accessibility", "shade", "restroom", "entrance", "parking", "fees", "dog-area"];
const regions = {
  northeast: new Set(["CT", "ME", "MA", "NH", "RI", "VT", "NJ", "NY", "PA"]),
  south: new Set(["AL", "AR", "DE", "DC", "FL", "GA", "KY", "LA", "MD", "MS", "NC", "OK", "SC", "TN", "TX", "VA", "WV"]),
  midwest: new Set(["IL", "IN", "IA", "KS", "MI", "MN", "MO", "NE", "ND", "OH", "SD", "WI"]),
  west: new Set(["AK", "AZ", "CA", "CO", "HI", "ID", "MT", "NV", "NM", "OR", "UT", "WA", "WY"]),
};

function slugify(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function placePath(place) {
  return place.canonicalPath || `/us/${slugify(place.state)}/${slugify(place.city)}/parks/${place.slug || slugify(place.name)}`;
}

function regionFor(state) {
  return Object.entries(regions).find(([, states]) => states.has(state))?.[0] || "other";
}

function currentAnswers(place, now) {
  return (place.searchAnswers || []).filter((answer) => answer.answer && answer.source && answer.sourceLabel && (answer.checkedAt || answer.verifiedAt) && (!answer.expiresAt || new Date(answer.expiresAt) > now));
}

function reusableImage(place) {
  return [place.image, ...(place.images || [])].find((image) => image?.url && reusableLicense.test(image.license || "") && image.source && image.author && image.alt);
}

function sentence(value) {
  return (String(value || "").match(/^.*?[.!?](?:\s|$)/)?.[0] || String(value || "")).trim();
}

function xLength(value) {
  return String(value).replace(/https?:\/\/\S+/g, "x".repeat(23)).length;
}

function trackedUrl(place, id) {
  const url = new URL(placePath(place), "https://www.auditmap.org");
  url.searchParams.set("utm_source", "x");
  url.searchParams.set("utm_medium", "organic_social");
  url.searchParams.set("utm_campaign", campaign);
  url.searchParams.set("utm_content", id);
  return url.toString();
}

function captionParts(place, url) {
  const prefix = `Daily reminder to explore somewhere public:\n\n${place.name} in ${place.city}, ${place.state}. `;
  const suffix = `\n\nWhat would help you plan a visit?\n\n${url}\n\n#FoundOnAuditMap`;
  return { prefix, suffix, available: 280 - xLength(prefix + suffix) };
}

function bestAnswer(place, answers, url) {
  const { available } = captionParts(place, url);
  const generic = /^(choose one|check current|check the|use the .*page|official details|do not (?:navigate|treat))|\bdepends on\b|\b(?:vary|varies)\.?$/i;
  const viable = answers.map((answer) => ({ answer, fact: sentence(answer.answer) }))
    .filter(({ fact }) => fact.length >= 38 && fact.length <= available && !generic.test(fact))
    .map((candidate) => {
      const priorityIndex = priorityIntents.indexOf(candidate.answer.intentKey);
      return {
        ...candidate,
        score: (priorityIndex >= 0 ? priorityIntents.length - priorityIndex : 0) * 10 + Math.min(candidate.fact.length, 110) / 10,
      };
    })
    .sort((left, right) => right.score - left.score || left.fact.length - right.fact.length);
  if (!viable.length) return null;
  return viable[0].answer;
}

function caption(place, answer, url) {
  const { prefix, suffix, available } = captionParts(place, url);
  const fact = sentence(answer.answer);
  if (fact.length > available) throw new Error(`${place.id}: no complete fact fits the X caption`);
  const text = `${prefix}${fact}${suffix}`;
  if (xLength(text) > 280) throw new Error(`${place.id}: generated caption exceeds X limit`);
  return text;
}

const sources = [
  JSON.parse(fs.readFileSync(path.join(root, "data/institutions.json"), "utf8")),
  JSON.parse(fs.readFileSync(path.join(root, "data/generated/launch-map-places.json"), "utf8")),
];
const merged = new Map();
for (const source of sources) for (const place of source) merged.set(place.id, place);
const now = new Date();
const candidates = [...merged.values()].map((place) => ({ place, image: reusableImage(place), answers: currentAnswers(place, now) }))
  .filter(({ place, image, answers }) => place.searchCategory === "park" && place.city && place.state && place.slug && image && answers.length && !["excluded", "deferred"].includes(place.publishStatus))
  .filter(({ place }) => fs.existsSync(path.join(root, placePath(place), "index.html")))
  .map((candidate) => ({ ...candidate, region: regionFor(candidate.place.state), score: (candidate.place.launchTier === "anchor" ? 100 : 0) + (candidate.place.features?.length || 0) * 3 + (candidate.place.images?.length || 0) + (candidate.place.searchAnswers?.length || 0) }))
  .sort((left, right) => right.score - left.score || left.place.name.localeCompare(right.place.name));

const cohort = JSON.parse(fs.readFileSync(cohortPath, "utf8"));
const selected = resolveNationalDailyCohort(cohort, candidates);

const posts = selected.map(({ place, image, answers, region }, index) => {
  const date = new Date(startDate);
  date.setDate(date.getDate() + index);
  const id = nationalDailyPostId(place.id);
  const url = trackedUrl(place, id);
  const answer = bestAnswer(place, answers, url);
  if (!answer) throw new Error(`${place.id}: no concise, complete visitor fact fits the daily caption`);
  const text = caption(place, answer, url);
  return {
    id,
    series: "Daily public place",
    hook: "Daily reminder to explore somewhere public",
    day: index + 1,
    date: date.toISOString().slice(0, 10),
    region,
    placeId: place.id,
    placeName: place.name,
    city: place.city,
    state: place.state,
    intentKey: answer.intentKey,
    url,
    text,
    xLength: xLength(text),
    answerEvidence: { sourceLabel: answer.sourceLabel, source: answer.source, checkedAt: answer.checkedAt || answer.verifiedAt, expiresAt: answer.expiresAt || null },
    image: { url: image.url, source: image.source, author: image.author, license: image.license, alt: image.alt },
  };
});
const output = { id: "national-daily-discovery-v1", market: "National rotation", status: "review", cohortStatus: cohort.status, campaign, generatedAt: new Date().toISOString(), postCount: posts.length, states: new Set(posts.map(({ state }) => state)).size, cities: new Set(posts.map(({ city, state }) => `${city}|${state}`)).size, eligiblePlaces: candidates.length, posts };
fs.mkdirSync(path.dirname(outputJson), { recursive: true });
fs.writeFileSync(outputJson, `${JSON.stringify(output, null, 2)}\n`);
const sections = posts.map((post) => `## Day ${post.day}: ${post.placeName}\n\n**Date:** ${post.date}  \n**Market:** ${post.city}, ${post.state} · ${post.region}  \n**Intent:** ${post.intentKey}  \n**Evidence:** [${post.answerEvidence.sourceLabel}](${post.answerEvidence.source}), checked ${post.answerEvidence.checkedAt}${post.answerEvidence.expiresAt ? `, current through ${post.answerEvidence.expiresAt}` : ""}  \n**Image:** ${post.image.author} · ${post.image.license} · [source](${post.image.source})  \n**X length:** ${post.xLength}/280\n\n${post.text}`).join("\n\n---\n\n");
const brief = `# National Daily Public-place Queue\n\n**Status:** Review only; nothing is posted automatically.  \n**Coverage:** ${output.postCount} posts · ${output.cities} cities · ${output.states} states · ${new Set(posts.map(({ region }) => region)).size} regions  \n**Eligible source pool:** ${output.eligiblePlaces} places with current sourced answers and reusable attributed photography.\n\nUse one national AuditMap account. Recheck the answer and image source on the day of posting; skip closures, emergencies, stale guidance, or a destination whose public page fails. Keep the framing fixed during this first rotation so city and place response—not unrelated copy changes—is the tested variable.\n\n${sections}\n`;
fs.writeFileSync(outputBrief, brief);
console.log(JSON.stringify({ json: path.relative(root, outputJson), brief: path.relative(root, outputBrief), posts: output.postCount, cities: output.cities, states: output.states, eligible: output.eligiblePlaces }, null, 2));
