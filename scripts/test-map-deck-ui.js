const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const preview = fs.readFileSync(path.join(root, "preview", "map-deck.html"), "utf8");

for (const contract of [
  'data-sheet-state="peek"',
  "sheet-handle-copy",
  "sheet-header",
  "sheet-map-return",
  "Explore this area",
  "map-gesture-hint",
  "Step closer",
  "Tracking both points",
  "map-explorer-panel",
  "Exploring inside",
  "Directions",
  "Area map",
  "filter-dialog-body",
  "filter-results-preview",
]) assert.ok(index.includes(contract), `Map deck markup is missing: ${contract}`);

for (const contract of [
  'sidebar.dataset.sheetState = expanded ? "browse" : "peek"',
  'sidebar.dataset.sheetState = "focus"',
  "favorites-changed",
  "dragging: true",
  "touchZoom: true",
  "userLocationMarkerMarkup",
  "auditmap:map-pin-note-requested",
  "auditmap:map-info-requested",
  "pinnedNotesStorageKey",
  "Save pinned note",
  "Remove this pin",
  "About this view",
  "mobile-preview-fact",
  "mobile-preview-swipe-cue",
  "mobile-preview-explorer",
  "Explore inside",
  "map-preview-explorer",
  "completePreviewGesture",
  'mobilePlacePreview.addEventListener("touchstart"',
  'mobilePlacePreview.addEventListener("touchend"',
  "guideDirection",
  "guideBearing",
  "guideDistanceLabel",
  "renderGuide",
  "Guidance stopped",
  'target="_top">Details',
  "enterExplorerMode",
  "exitExplorerMode",
  "explorerArrivalPromptVisible",
  "explorerMarkersAnimated",
  "explorerReturnPlace",
  "explorerFeatureReady",
  "explorerPlaceFeatures",
  "sortedExplorerFeatures",
  "explorerFeatureImage",
  "map-explorer-thumbnail",
  "map-explorer-marker-popover",
  "map-explorer-marker-photo",
  "requestedExplorerId",
  'searchParams.set("explore", place.id)',
  'searchParams.delete("explore")',
  "showing ${features.length} nearest of",
  "Show all ${totalFeatureCount}",
  "google.com/maps/dir",
  "Share your location when the browser asks.",
  "previewGuideMode",
  "Preview position",
  "Getting warmer",
  "A little off course",
  "You're here",
  "--location-bearing",
  "destinationImage",
  "guideMapInsets",
  "guideTracking",
  "Tracking paused",
  "map-guide-beacon",
  "completeSheetGesture",
  'sheetHandle.addEventListener("touchstart"',
  'sheetHandle.addEventListener("touchend"',
  'sheetHandle.addEventListener("touchcancel"',
  'sheetMapReturn?.addEventListener("click"',
  "const rankSuggestions = (left, right)",
  "const confidentLocationMatch",
  'url.searchParams.set("city", suggestion.city.slug)',
  "else searchForm.requestSubmit();",
  "syncMobileMapSelection",
  'beginProgrammaticMapMovement("selection"',
  'mapMovementSource !== "user"',
  "mobileMapSafeArea",
  "mobileSelectionLayer",
  "mobile-selection-marker is-selected",
  "placeTypeFilterRules",
  "usesLocalStaticPreview",
  "updateFilterResultsPreview",
  "filterScopePlaces",
  "createUserLocationIcon",
  "auditmap:profile-avatar",
  "user-location-avatar",
  'placesSidebar.addEventListener("touchstart"',
  'placesSidebar.addEventListener("touchend"',
]) assert.ok(app.includes(contract), `Map deck behavior is missing: ${contract}`);

assert.match(
  app,
  /if \(usesLocalStaticPreview\(\)\) \{\s*return `src="\$\{escapeHtml\(url\)\}"/,
  "A plain local server must load source images directly instead of calling Vercel's optimizer.",
);

for (const contract of [
  "--map-deck-forest",
  ".sheet-grabber",
  ".sheet-handle-copy",
  ".sheet-header",
  ".sheet-map-return",
  ".mobile-preview-community",
  ".mobile-preview-actions",
  ".mobile-preview-explorer",
  ".map-preview-explorer",
  ".map-gesture-hint",
  ".user-location-label",
  ".map-pinned-note",
  ".map-info-legend",
  ".mobile-action-context",
  ".map-guide-status",
  ".map-guide-destination",
  ".mobile-preview-actions button.is-guiding",
  ".mobile-preview-guide-status",
  ".map-guide-compass",
  ".map-guide-progress",
  ".map-guide-actions",
  ".map-guide-beacon",
  ".map-guide-mode",
  ".map-explorer-panel",
  ".map-explorer-destination",
  ".map-explorer-marker",
  ".map-explorer-thumbnail",
  ".map-explorer-marker-popover",
  ".map-explorer-marker-photo",
  "body.has-map-explorer",
  ".numbered-marker.is-selection-pulsing",
  ".filter-result-action",
  ".user-location-heading",
  ".user-location-avatar",
]) assert.ok(styles.includes(contract), `Map deck styling is missing: ${contract}`);

assert.ok(!app.includes('className: "map-guide-line"'), "Compass guidance must not imply an unverified route.");
assert.ok(!app.includes('class="mobile-preview-community"'), "The compact map preview must not duplicate the community section.");
assert.ok(!app.includes('class="mobile-preview-actions"'), "The compact map preview must not duplicate place-page actions.");
assert.match(
  styles,
  /body\[data-page="map"\] \.search-field\s*\{[^}]*overflow:\s*visible;/s,
  "The map search field must not clip its suggestion dropdown.",
);
assert.ok(
  !index.includes('id="toolbar-filter-button"'),
  "The mobile map toolbar should reserve its width for location and search.",
);
assert.ok(
  !index.includes('class="map-legend"'),
  "The map should explain marker state contextually instead of reserving space for a legend.",
);
assert.ok(
  !app.includes('class="user-location-heading" aria-hidden="true"><svg'),
  "The personal location marker should remain circular without a protruding direction triangle.",
);
assert.ok(
  styles.includes("#0a84ff"),
  "The personal location marker needs a high-contrast navigation color.",
);
assert.match(
  index,
  /<div class="sheet-header">\s*<span class="sheet-grabber"/,
  "The drawer grabber must center against the full header, not the flexible text button.",
);
assert.ok(
  !app.includes("paintSuggestions();\n    render();"),
  "Typing suggestions must not rerender results before a search is selected.",
);
assert.match(
  app,
  /if \(!explorerArrivalPromptVisible\) \{\s*mapExplorerArrival\.hidden = true;/,
  "Explorer must remain a browsing mode until the visitor explicitly asks for guidance.",
);

assert.ok(preview.includes('allow="geolocation"'), "Map deck preview must allow location guidance.");
assert.ok(preview.includes("previewGuide=1"), "Map deck preview must provide a labeled demo position.");

console.log("Map deck states, touch gestures, location puck, pinned notes, map information, community, and action contracts passed.");
