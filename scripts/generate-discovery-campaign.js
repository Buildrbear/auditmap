const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaignPath = process.argv[2] || "data/discovery-campaigns/raleigh-pilot.json";
const campaign = JSON.parse(fs.readFileSync(path.join(root, campaignPath), "utf8"));
const institutionData = JSON.parse(fs.readFileSync(path.join(root, "data/institutions.json"), "utf8"));
const launchData = JSON.parse(fs.readFileSync(path.join(root, "data/generated/launch-map-places.json"), "utf8"));
const records = new Map([...institutionData, ...launchData].map((place) => [place.id, place]));
const reusableLicense = /\b(public domain|cc0|cc by|cc-by|creative commons)\b/i;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function categorySegment(place) {
  const category = slugify(place.searchCategory || "place");
  if (category === "park") return "parks";
  if (category === "library") return "libraries";
  return category.endsWith("s") ? category : `${category}s`;
}

function placePath(place) {
  return place.canonicalPath || `/us/${slugify(place.state)}/${slugify(place.city)}/${categorySegment(place)}/${place.slug || slugify(place.name)}`;
}

function firstSentence(value, limit = 132) {
  const sentence = String(value || "").match(/^.*?[.!?](?:\s|$)/)?.[0] || String(value || "");
  if (sentence.length <= limit) return sentence.trim();
  return `${sentence.slice(0, limit - 1).replace(/\s+\S*$/, "")}…`;
}

function estimatedXLength(value) {
  return String(value).replace(/https?:\/\/\S+/g, "x".repeat(23)).length;
}

function trackedUrl(pathname, post) {
  const query = new URLSearchParams({
    utm_source: campaign.channel,
    utm_medium: "organic_social",
    utm_campaign: campaign.campaign,
    utm_content: post.id,
  });
  return `https://www.auditmap.org${pathname}?${query}`;
}

function optimizedImage(url, width = 828) {
  return `/_vercel/image?url=${encodeURIComponent(url)}&w=${width}&q=78`;
}

function siteRelative(url) {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

const issues = [];
const posts = campaign.posts.map((post) => {
  const place = records.get(post.placeId);
  if (!place) {
    issues.push(`${post.id}: place ${post.placeId} does not exist`);
    return null;
  }
  if (place.city !== campaign.city || place.state !== campaign.state) {
    issues.push(`${post.id}: place is outside ${campaign.market}`);
  }
  const answer = (place.searchAnswers || []).find((item) => item.intentKey === post.intentKey);
  if (!answer) issues.push(`${post.id}: missing ${post.intentKey} answer`);
  if (answer && (!answer.source || !answer.sourceLabel || !answer.checkedAt)) {
    issues.push(`${post.id}: answer is missing source, source label, or checked date`);
  }
  if (!post.socialFact || post.socialFact.length > 120) {
    issues.push(`${post.id}: socialFact is missing or longer than 120 characters`);
  }
  if (!post.visualMatch || post.visualMatch.length < 24) {
    issues.push(`${post.id}: explain how the selected image matches the post subject`);
  }
  const reusableImages = [place.image, ...(place.images || [])]
    .filter(Boolean)
    .filter((image) => reusableLicense.test(image.license || ""));
  const image = reusableImages[post.imageIndex];
  if (!image) issues.push(`${post.id}: no reusable image at index ${post.imageIndex}`);
  if (image && (!image.source || !image.author || !image.license || !image.alt)) {
    issues.push(`${post.id}: image attribution is incomplete`);
  }
  const pathname = placePath(place);
  const url = trackedUrl(pathname, post);
  const contributionQuery = new URLSearchParams({
    contribute: "note",
    utm_source: campaign.channel,
    utm_medium: "organic_social",
    utm_campaign: campaign.campaign,
    utm_content: post.id,
  });
  const contributionUrl = `https://www.auditmap.org${pathname}?${contributionQuery}#discussion`;
  const fact = post.socialFact;
  const caption = `${post.hook}\n\n${fact}\n\n${post.prompt}\n\n${url}\n\n${campaign.hashtag}`;
  return {
    ...post,
    place: { id: place.id, name: place.name, path: pathname, address: place.address },
    answer: answer ? {
      intentKey: answer.intentKey,
      question: answer.question,
      answer: answer.answer,
      source: answer.source,
      sourceLabel: answer.sourceLabel,
      checkedAt: answer.checkedAt,
    } : null,
    image,
    url,
    contributionUrl,
    caption,
    captionLength: caption.length,
    estimatedXLength: estimatedXLength(caption),
  };
}).filter(Boolean);

if (issues.length) {
  console.error(JSON.stringify({ campaign: campaign.id, issues }, null, 2));
  process.exitCode = 1;
  return;
}

const output = {
  campaign: { ...campaign, posts: undefined },
  generatedAt: new Date().toISOString(),
  postCount: posts.length,
  posts,
};
const generatedDir = path.join(root, "data/generated/discovery-campaigns");
fs.mkdirSync(generatedDir, { recursive: true });
fs.writeFileSync(path.join(generatedDir, `${campaign.id}.json`), `${JSON.stringify(output, null, 2)}\n`);

const cards = posts.map((post, index) => `
  <article class="discovery-card" id="${escapeHtml(post.id)}">
    <a class="discovery-card-image" href="${escapeHtml(siteRelative(post.url))}" data-discovery-link data-content="${escapeHtml(post.id)}">
      <img src="${escapeHtml(optimizedImage(post.image.url))}" data-original-src="${escapeHtml(post.image.url)}" alt="${escapeHtml(post.image.alt)}" loading="${index < 2 ? "eager" : "lazy"}" decoding="async" />
      <span>Day ${post.day}</span>
    </a>
    <div class="discovery-card-copy">
      <p class="kicker">${escapeHtml(post.series)}</p>
      <h2>${escapeHtml(post.hook)}</h2>
      <p>${escapeHtml(post.socialFact)}</p>
      <div class="discovery-card-actions">
        <a href="${escapeHtml(siteRelative(post.url))}" data-discovery-link data-content="${escapeHtml(post.id)}">Explore ${escapeHtml(post.place.name)}</a>
        <a href="${escapeHtml(siteRelative(post.contributionUrl))}" data-discovery-link data-content="${escapeHtml(post.id)}" data-action="contribute">Share what you find</a>
      </div>
      <small>Photo: ${escapeHtml(post.image.author)} · ${escapeHtml(post.image.license)} · <a href="${escapeHtml(post.image.source)}">source</a></small>
    </div>
  </article>`).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Explore Raleigh’s Public Places | AuditMap</title>
  <meta name="description" content="Discover useful details and overlooked public places around Raleigh, North Carolina." />
  <link rel="canonical" href="https://www.auditmap.org/discover/raleigh/" />
  <meta property="og:title" content="There’s more around Raleigh than you know." />
  <meta property="og:description" content="Find it. Explore it. Share what you find." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.auditmap.org/discover/raleigh/" />
  <meta property="og:image" content="https://www.auditmap.org${escapeHtml(optimizedImage(posts[0].image.url, 1400))}" />
  <link rel="stylesheet" href="/styles.css?v=20260807-42" />
  <link rel="stylesheet" href="/discovery.css?v=20260807-01" />
</head>
<body class="discovery-page" data-campaign="${escapeHtml(campaign.campaign)}">
  <header class="site-header"><a class="brand" href="/index.html" aria-label="AuditMap home"><img src="/logo.svg" alt="" /><span>AuditMap</span></a><a class="state-label" href="/index.html?city=raleigh-nc">Raleigh map</a></header>
  <main>
    <section class="discovery-hero">
      <p class="kicker">A Raleigh discovery experiment</p>
      <h1>${escapeHtml(campaign.headline)}</h1>
      <p>${escapeHtml(campaign.summary)}</p>
      <div><a href="#discoveries">Start exploring</a><a href="/index.html?city=raleigh-nc">Open the Raleigh map</a></div>
    </section>
    <section class="discovery-intro"><p>Public places only work when people know they’re there. These guides start with verified public information, then get better when explorers share what they notice.</p><strong>${escapeHtml(campaign.signature)}</strong></section>
    <section class="discovery-passport"><div><p class="kicker">Keep exploring</p><h2>Try the Raleigh explorer passport.</h2><p>Mark places intentionally, keep progress on your device, and share only when you choose.</p></div><a href="/discover/raleigh/passport/?utm_source=auditmap&utm_medium=discovery&utm_campaign=raleigh_explorer_passport&utm_content=discovery-hub">Open the passport</a></section>
    <section class="discovery-grid" id="discoveries" aria-label="Raleigh discoveries">${cards}</section>
    <section class="discovery-community"><p class="kicker">Help the next explorer</p><h2>Went somewhere? Leave one useful thing behind.</h2><p>A parking tip, current condition, photograph, answer, or corrected detail can make another person’s visit easier.</p><a href="${escapeHtml(siteRelative(posts[0].contributionUrl))}">Share what you found</a></section>
  </main>
  <script src="/_vercel/insights/script.js" defer></script>
  <script src="/discovery.js?v=20260807-01" defer></script>
</body>
</html>`;
const publicDir = path.join(root, "discover", slugify(campaign.city));
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, "index.html"), html);

const queue = posts.map((post) => `## Day ${post.day}: ${post.id}\n\n**Status:** Review required  \n**Place:** ${post.place.name}  \n**Evidence:** [${post.answer.sourceLabel}](${post.answer.source}), checked ${post.answer.checkedAt}  \n**Image:** ${post.image.author}, ${post.image.license}, [source](${post.image.source})  \n**Visual match:** ${post.visualMatch}  \n**Estimated X length:** ${post.estimatedXLength}/280  \n\n${post.caption}\n`).join("\n---\n\n");
const previewDir = path.join(root, "preview");
fs.mkdirSync(previewDir, { recursive: true });
fs.writeFileSync(path.join(previewDir, `${campaign.id}-social-queue.md`), `# ${campaign.market} Discovery Pilot\n\nGenerated drafts only. A person must review freshness, image rights, tone, and current conditions before posting.\n\n${queue}`);

console.log(JSON.stringify({ campaign: campaign.id, posts: posts.length, page: path.relative(root, publicDir), queue: `preview/${campaign.id}-social-queue.md` }, null, 2));
