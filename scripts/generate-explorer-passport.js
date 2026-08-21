const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const campaign = require("../data/discovery-campaigns/raleigh-explorer-passport.json");
const places = require("../data/institutions.json");
const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
const imageOverrides = {
  "pullen-park": {
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/Pullen%20Park%20entrance%202011.jpg?width=1400",
    source: "https://commons.wikimedia.org/wiki/File:Pullen_Park_entrance_2011.jpg",
    author: "RadioFan",
    license: "CC BY-SA 3.0",
    alt: "Entrance sign and trees at Pullen Park in Raleigh",
  },
};
const selected = campaign.placeIds.map((id) => {
  const place = places.find((item) => item.id === id);
  if (!place) throw new Error(`Explorer passport place missing: ${id}`);
  if (!place.image?.url) throw new Error(`Explorer passport image missing: ${place.name}`);
  return imageOverrides[id] ? { ...place, image: imageOverrides[id] } : place;
});
const pathFor = (place) => `/us/${place.state.toLowerCase()}/${String(place.city).toLowerCase().replace(/[^a-z0-9]+/g, "-")}/parks/${place.slug || String(place.name).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
const cards = selected.map((place, index) => {
  const guide = `${pathFor(place)}?utm_source=auditmap&utm_medium=passport&utm_campaign=${campaign.campaign}&utm_content=${place.id}`;
  const contribute = `${pathFor(place)}?contribute=note&utm_source=auditmap&utm_medium=passport&utm_campaign=${campaign.campaign}&utm_content=${place.id}#discussion`;
  return `<article class="passport-card" data-passport-place="${escapeHtml(place.id)}">
    <a class="passport-image" href="${escapeHtml(guide)}"><img src="${escapeHtml(place.image.url)}" alt="${escapeHtml(place.image.alt || place.name)}" loading="${index < 2 ? "eager" : "lazy"}" decoding="async"><span>${index + 1} of ${selected.length}</span></a>
    <div class="passport-copy">
      <p class="passport-status" data-passport-status>Ready to explore</p>
      <h2><a href="${escapeHtml(guide)}">${escapeHtml(place.name)}</a></h2>
      <p>${escapeHtml(campaign.descriptions[place.id])}</p>
      <div class="passport-actions">
        <button type="button" data-mark-explored>I've explored this</button>
        <a href="${escapeHtml(guide)}">Open guide</a>
      </div>
      <a class="passport-contribute" data-passport-contribute href="${escapeHtml(contribute)}" hidden>Leave a breadcrumb from this place</a>
      <small>Photo: ${escapeHtml(place.image.author || place.sourceLabel || "Source")} · ${escapeHtml(place.image.license || "See source")} · <a href="${escapeHtml(place.image.source || place.source)}">source</a></small>
    </div>
  </article>`;
}).join("\n");
const embedded = selected.map((place) => ({ id: place.id, name: place.name })).map((item) => JSON.stringify(item)).join(",");
const hero = selected[0].image.url;
const socialImage = /^https?:/i.test(hero) ? hero : `https://www.auditmap.org${hero}`;
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(campaign.title)} | AuditMap</title>
  <meta name="description" content="${escapeHtml(campaign.summary)}">
  <link rel="canonical" href="https://www.auditmap.org/discover/raleigh/passport/">
  <meta property="og:title" content="Five Raleigh places. How many will you explore?">
  <meta property="og:description" content="Explore public places, keep your progress, and leave useful breadcrumbs for the next person.">
  <meta property="og:image" content="${escapeHtml(socialImage)}">
  <link rel="stylesheet" href="/styles.css?v=20260807-43">
  <link rel="stylesheet" href="/explorer-passport.css?v=20260807-01">
</head>
<body class="passport-page" data-campaign="${escapeHtml(campaign.campaign)}">
  <header class="site-header"><a class="brand" href="/index.html"><img src="/logo.svg" alt=""><span>AuditMap</span></a><a class="state-label" href="/discover/raleigh/">Explore Raleigh</a></header>
  <main>
    <section class="passport-hero">
      <p class="kicker">A Raleigh exploration experiment</p>
      <h1>${escapeHtml(campaign.title)}</h1>
      <p>${escapeHtml(campaign.summary)}</p>
      <div class="passport-progress"><strong data-passport-count>0 of ${selected.length}</strong><span>marked explored</span><i><b data-passport-bar></b></i></div>
      <div class="passport-share-actions"><button type="button" data-share-passport>Share my progress</button><button type="button" data-reset-passport hidden>Start my own passport</button></div>
      <p class="passport-note" data-passport-message>Your progress stays on this device unless you choose to share it.</p>
    </section>
    <section class="passport-shared" data-shared-passport hidden><strong>An explorer shared their Raleigh progress.</strong><span>You can view it below, then start a separate passport of your own.</span></section>
    <section class="passport-grid" aria-label="Raleigh explorer passport">${cards}</section>
    <section class="passport-finish"><p class="kicker">The explorer's part</p><h2>Find your way. Share what you find.</h2><p>A current photo, parking detail, closure, accessibility note, or answer can improve the guide for everyone who comes next.</p></section>
  </main>
  <script id="passport-data" type="application/json">[${embedded}]</script>
  <script src="/_vercel/insights/script.js" defer></script>
  <script src="/explorer-passport.js?v=20260807-01" defer></script>
</body>
</html>`;
const output = path.join(root, "discover/raleigh/passport/index.html");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(JSON.stringify({ page: path.relative(root, output), places: selected.length }, null, 2));
