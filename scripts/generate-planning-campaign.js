const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaignPath = process.argv[2] || "data/discovery-campaigns/raleigh-planning-pilot.json";
const campaign = JSON.parse(fs.readFileSync(path.join(root, campaignPath), "utf8"));
const institutions = JSON.parse(fs.readFileSync(path.join(root, "data/institutions.json"), "utf8"));
const launch = JSON.parse(fs.readFileSync(path.join(root, "data/generated/launch-map-places.json"), "utf8"));
const records = new Map([...institutions, ...launch].map((place) => [place.id, place]));
const reusableLicense = /\b(public domain|cc0|cc by|cc-by|creative commons)\b/i;

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");
const estimatedXLength = (value) => String(value).replace(/https?:\/\/\S+/g, "x".repeat(23)).length;
const siteRelative = (value) => {
  const url = new URL(value);
  return `${url.pathname}${url.search}`;
};

function listUrl(item) {
  const query = new URLSearchParams({
    list: item.placeIds.join(","),
    utm_source: campaign.channel,
    utm_medium: "organic_social",
    utm_campaign: campaign.campaign,
    utm_content: item.id,
  });
  return `https://www.auditmap.org/index.html?${query}`;
}

const issues = [];
const lists = campaign.lists.map((item) => {
  if (!Array.isArray(item.placeIds) || item.placeIds.length < 2 || item.placeIds.length > 12) {
    issues.push(`${item.id}: list must contain 2-12 places`);
  }
  const places = item.placeIds.map((id) => records.get(id));
  places.forEach((place, index) => {
    if (!place) issues.push(`${item.id}: place ${item.placeIds[index]} does not exist`);
    else if (place.city !== campaign.city || place.state !== campaign.state) issues.push(`${item.id}: ${place.name} is outside ${campaign.market}`);
    else if (!place.source) issues.push(`${item.id}: ${place.name} has no public source`);
  });
  const imagePlace = records.get(item.imagePlaceId);
  if (!imagePlace || !item.placeIds.includes(item.imagePlaceId)) issues.push(`${item.id}: image place must belong to the list`);
  const images = imagePlace ? [imagePlace.image, ...(imagePlace.images || [])]
    .filter(Boolean)
    .filter((image) => reusableLicense.test(image.license || "")) : [];
  const image = images[item.imageIndex];
  if (!image || !image.url || !image.source || !image.author || !image.alt) issues.push(`${item.id}: selected image needs reusable rights and complete attribution`);
  const url = listUrl(item);
  const caption = `${item.hook}\n\n${places.filter(Boolean).map((place) => place.name).join(" · ")}\n\n${item.prompt}\n\n${url}\n\n${campaign.hashtag}`;
  if (estimatedXLength(caption) > 280) issues.push(`${item.id}: caption exceeds the X limit`);
  return {
    ...item,
    places: places.filter(Boolean).map((place) => ({ id: place.id, name: place.name, source: place.source })),
    image,
    url,
    caption,
    estimatedXLength: estimatedXLength(caption),
  };
});

if (issues.length) {
  console.error(JSON.stringify({ campaign: campaign.id, issues }, null, 2));
  process.exit(1);
}

const generated = { campaign: { ...campaign, lists: undefined }, lists };
const generatedDir = path.join(root, "data/generated/discovery-campaigns");
fs.mkdirSync(generatedDir, { recursive: true });
fs.writeFileSync(path.join(generatedDir, `${campaign.id}.json`), `${JSON.stringify(generated, null, 2)}\n`);

const cards = lists.map((item) => `
  <article class="discovery-card" id="${escapeHtml(item.id)}">
    <a class="discovery-card-image" href="${escapeHtml(siteRelative(item.url))}">
      <img src="/_vercel/image?url=${encodeURIComponent(item.image.url)}&w=828&q=78" alt="${escapeHtml(item.image.alt)}" loading="lazy" decoding="async" />
      <span>${item.places.length} places</span>
    </a>
    <div class="discovery-card-copy">
      <p class="kicker">Explore together</p>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.hook)}</p>
      <p>${item.places.map((place) => escapeHtml(place.name)).join(" · ")}</p>
      <div class="discovery-card-actions"><a href="${escapeHtml(siteRelative(item.url))}">Open and share this list</a></div>
      <small>Photo: ${escapeHtml(item.image.author)} · ${escapeHtml(item.image.license)} · <a href="${escapeHtml(item.image.source)}">source</a></small>
    </div>
  </article>`).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Raleigh Places to Explore Together | AuditMap</title>
  <meta name="description" content="Shareable Raleigh public-place collections for family days, art and open space, and smaller local discoveries." />
  <link rel="canonical" href="https://www.auditmap.org/discover/raleigh/together/" />
  <meta property="og:title" content="Pick a few Raleigh places. Explore one together." />
  <meta property="og:description" content="Small public-place collections made for deciding, sharing, and getting outside." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.auditmap.org/discover/raleigh/together/" />
  <meta property="og:image" content="https://www.auditmap.org/_vercel/image?url=${encodeURIComponent(lists[0].image.url)}&w=1400&q=78" />
  <link rel="stylesheet" href="/styles.css?v=20260807-42" />
  <link rel="stylesheet" href="/discovery.css?v=20260807-01" />
</head>
<body class="discovery-page" data-campaign="${escapeHtml(campaign.campaign)}">
  <header class="site-header"><a class="brand" href="/index.html"><img src="/logo.svg" alt="" /><span>AuditMap</span></a><a class="state-label" href="/discover/raleigh/">Raleigh discoveries</a></header>
  <main>
    <section class="discovery-hero"><p class="kicker">A Raleigh planning experiment</p><h1>${escapeHtml(campaign.headline)}</h1><p>${escapeHtml(campaign.summary)}</p><div><a href="#lists">See the lists</a><a href="/index.html?city=raleigh-nc">Open the Raleigh map</a></div></section>
    <section class="discovery-intro"><p>Choosing can be the hardest part. Each small list opens in AuditMap, where anyone can compare the places, keep them, or send the same possibilities to somebody else.</p><strong>Find your way. Share what you find.</strong></section>
    <section class="discovery-grid" id="lists" aria-label="Raleigh public-place lists">${cards}</section>
  </main>
  <script src="/_vercel/insights/script.js" defer></script>
  <script src="/discovery.js?v=20260807-01" defer></script>
</body>
</html>`;
const publicDir = path.join(root, "discover/raleigh/together");
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, "index.html"), html);

const queue = lists.map((item, index) => `## Post ${index + 1}: ${item.id}\n\n**Status:** Review required  \n**Places:** ${item.places.map((place) => place.name).join(", ")}  \n**Place sources:** ${item.places.map((place) => `[${place.name}](${place.source})`).join(", ")}  \n**Sources checked:** ${campaign.checkedAt}  \n**Image:** ${item.image.author}, ${item.image.license}, [source](${item.image.source})  \n**Estimated X length:** ${item.estimatedXLength}/280\n\n${item.caption}\n`).join("\n---\n\n");
fs.writeFileSync(path.join(root, "preview", `${campaign.id}-social-queue.md`), `# ${campaign.market} Shared-list Pilot\n\nGenerated drafts only. A person must review every place, image, link, and current condition before posting. Collection labels are editorial, not evidence.\n\n${queue}`);

console.log(JSON.stringify({ campaign: campaign.id, lists: lists.length, page: "discover/raleigh/together", queue: `preview/${campaign.id}-social-queue.md` }, null, 2));
