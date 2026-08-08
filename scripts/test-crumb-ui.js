const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const place = fs.readFileSync(path.join(root, "place.html"), "utf8");
const feature = fs.readFileSync(path.join(root, "feature.html"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const placeLiveApi = fs.readFileSync(path.join(root, "api/place-live.js"), "utf8");
const feedApi = fs.readFileSync(path.join(root, "api/feed.js"), "utf8");

for (const contract of [
  "What do you know about this place?",
  "What would you like to do?",
  "Fix or confirm",
  "data-community-filter",
  'data-crumb-target="location"',
  'data-crumb-target="pin"',
  'value="photo_360"',
  "startAuditMapCrumbPin",
  "Crumb received",
  "Saved on this device",
  "pannellum.viewer",
  "findPreviousUploads",
  "showCommunityProfile",
  "openPlace360Viewer",
  "Viewer demo",
  "place360MediaItems",
  "openAuditMapSiteMap",
  "360° views",
]) assert.ok(app.includes(contract), `Crumbs UI is missing: ${contract}`);

assert.match(place, /id="open-site-map-button"/);
assert.match(place, /is-explorer-action/);
assert.match(place, /<span>Explore<\/span>/);
assert.match(app, /place-dock-explorer/);
assert.match(app, /function explorerEligible\(place\)/);
assert.match(app, /mappedPlaceFeatures\(place\)\.length >= 2/);
assert.doesNotMatch(app, /const explorerPilot = place\.id === "dix-park"/);
assert.match(app, /Navigate with Google/);
assert.match(app, /within 1 mile of a mapped destination/);
assert.match(app, /previewLocationMode/);
assert.match(place, /id="expand-site-map-button"/);
assert.match(place, /id="launch-place-explorer"/);
assert.match(place, /Explore the grounds/);
assert.match(app, /launchExplorerLink/);
assert.match(app, /has-place-explorer/);
assert.match(app, /internal-feature-marker.*small/s);
assert.match(place, /id="funding-panel"/);
assert.match(place, /Photos, access, trailheads, hours\.\.\./);
assert.match(place, /id="knowledge-source-toggle"/);
assert.match(place, /id="community-feed"/);
assert.match(place, /id="community-feed-toolbar"/);
assert.match(place, /What people are noticing/);
assert.match(place, /class="funding-cadence"/);

for (const contract of [
  "initDialogViewportLock",
  "--auditmap-visual-viewport-height",
  "has-open-site-dialog",
  "weatherGraphMarkup",
  "place-event-track",
  "openAuditMapFunding",
  "Your places. Your conversations. Your impact.",
  'openAccountDialog("conversation")',
]) assert.ok(app.includes(contract), `Mobile dialog lock is missing: ${contract}`);

for (const contract of [
  "body.has-open-site-dialog",
  ".funding-dialog [hidden]",
  ".funding-dialog .funding-amounts input",
  "overscroll-behavior: none",
  ".comment-thread",
  ".weather-temperature-graph",
  ".crumb-share-options",
  ".community-feed-toolbar",
  "body.has-map-explorer .map-page",
  "max-height: 600px",
]) assert.ok(styles.includes(contract), `Mobile funding layout is missing: ${contract}`);

assert.match(placeLiveApi, /hourlyPeriods\.slice\(0, 96\)/);
assert.match(feedApi, /display_name,avatar_url/);
assert.match(feedApi, /avatarUrl: profile\.avatar_url/);
assert.match(feedApi, /authenticatedUser\(request, \{ requireActive: true \}\)/);
assert.doesNotMatch(feedApi, /GUEST_CONTRIBUTIONS_ENABLED/);

assert.match(place, /tus-js-client@4\.3\.1/);
assert.match(place, /pannellum@2\.5\.7/);
assert.match(feature, /tus-js-client@4\.3\.1/);
assert.match(feature, /pannellum@2\.5\.7/);

console.log("Community composer, place log, map, fallback, and viewer UI checks passed.");
