const dataUrl = "/data/institutions.json";
const page = document.body.dataset.page;

function campaignAttribution() {
  const params = new URLSearchParams(window.location.search);
  const current = {
    source: params.get("utm_source"),
    medium: params.get("utm_medium"),
    campaign: params.get("utm_campaign"),
    content: params.get("utm_content"),
  };
  if (current.campaign) {
    const sanitized = Object.fromEntries(Object.entries(current).map(([key, value]) => [
      key,
      String(value || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 80) || null,
    ]));
    sessionStorage.setItem("auditmap:campaign-attribution", JSON.stringify(sanitized));
    return sanitized;
  }
  try {
    return JSON.parse(sessionStorage.getItem("auditmap:campaign-attribution")) || {};
  } catch {
    return {};
  }
}

function trackAuditMapEvent(name, properties = {}) {
  const attribution = campaignAttribution();
  const loop = properties.loop || growthLoopForEvent(name, attribution.campaign);
  window.va = window.va || function queueAnalyticsEvent() {
    (window.vaq = window.vaq || []).push(arguments);
  };
  window.va("event", name, {
    campaign: attribution.campaign || "organic",
    content: attribution.content || page || "unknown",
    ...(loop ? { loop } : {}),
    ...(growthLoopStage(name) ? { stage: growthLoopStage(name) } : {}),
    ...properties,
  });
}

function growthLoopForEvent(name, campaign) {
  if (campaign === "raleigh_explorer_passport") return "explorer-passport";
  if (["Verified answer shared", "Shared answer opened"].includes(name) || campaign === "verified_answer_loop") return "verified-answer-sharing";
  if (["Saved list shared", "Shared list opened", "Shared list guide opened", "Shared list saved"].includes(name) || campaign === "saved_list_loop" || campaign === "raleigh_planning_pilot") return "shared-planning-list";
  if (name.startsWith("Return contribution prompt")) return "directions-return";
  if (campaign === "answered_by_auditmap") return "question-to-reviewed-answer";
  if (campaign && campaign !== "organic") return "place-discovery";
  return null;
}

function growthLoopStage(name) {
  return ({
    "Campaign landing": "landing",
    "Verified answer shared": "distribution",
    "Shared answer opened": "referral",
    "Saved list shared": "distribution",
    "Shared list opened": "referral",
    "Shared list guide opened": "activation",
    "Shared list saved": "retention",
    "Return contribution prompt shown": "prompt",
    "Return contribution prompt accepted": "activation",
    "Return contribution prompt dismissed": "dismissal",
    "Crumb started": "inquiry",
    "Crumb submitted": "contribution",
    "Directions opened": "visit-intent",
    "Place saved": "retention",
    "Place shared": "distribution",
  })[name] || null;
}

function trackAttributedLanding() {
  const attribution = campaignAttribution();
  if (!attribution.campaign) return;
  const key = `auditmap:landing:${window.location.pathname}:${attribution.campaign}:${attribution.content || "unknown"}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // Analytics remains best-effort when storage is unavailable.
  }
  trackAuditMapEvent("Campaign landing");
}

const directionsReturnVariants = {
  "help-next-person": {
    heading: "If you visited, help the next person.",
    detail: "A photo, current condition, or one useful detail is enough.",
    action: "Share what you found",
  },
  "leave-breadcrumb": {
    heading: "Leave a breadcrumb for the next explorer.",
    detail: "If you noticed something useful, add a photo, condition, or quick detail.",
    action: "Leave a breadcrumb",
  },
};

function directionsReturnVariant() {
  const key = "auditmap:return-prompt-variant:v1";
  try {
    const saved = sessionStorage.getItem(key);
    if (directionsReturnVariants[saved]) return saved;
    const values = new Uint8Array(1);
    window.crypto?.getRandomValues?.(values);
    const variant = values[0] % 2 ? "leave-breadcrumb" : "help-next-person";
    sessionStorage.setItem(key, variant);
    return variant;
  } catch {
    return "help-next-person";
  }
}

function rememberDirectionsIntent(placeId, featureId = null) {
  if (!placeId) return;
  try {
    sessionStorage.setItem(`auditmap:directions:${placeId}`, JSON.stringify({
      openedAt: Date.now(),
      featureId: featureId || null,
    }));
    window.setTimeout(() => {
      document.dispatchEvent(new Event("auditmap:directions-return-check"));
    }, 15_000);
  } catch {
    // Direction links must still work when browser storage is unavailable.
  }
}

function takeRecentDirectionsIntent(placeId) {
  try {
    const key = `auditmap:directions:${placeId}`;
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    if (!value?.openedAt) return null;
    const age = Date.now() - Number(value.openedAt);
    if (age < 15_000) return null;
    sessionStorage.removeItem(key);
    return age <= 24 * 60 * 60 * 1000 ? value : null;
  } catch {
    return null;
  }
}
const demoSessionId = new URLSearchParams(window.location.search).get("demoSession")
  ?.replace(/[^a-z0-9-]/gi, "")
  .slice(0, 40) || "";
const favoritesRecordKey = demoSessionId
  ? `auditmap:favorites:${demoSessionId}`
  : "auditmap:favorites";

function rootPath(path) {
  return path.startsWith("/") ? path : `/${String(path || "").replace(/^\.?\//, "")}`;
}

function optimizedImageUrl(url, width, quality = 78) {
  if (!url || /^data:|^blob:/i.test(url)) return url || "";
  return `/_vercel/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
}

function responsiveImageAttributes(url, {
  widths = [320, 480, 640, 828, 1080, 1400],
  sizes = "100vw",
  priority = false,
} = {}) {
  if (!url || /^data:|^blob:/i.test(url)) {
    return `src="${escapeHtml(url || "")}"${priority ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"'} decoding="async"`;
  }
  const srcset = widths
    .map((width) => `${optimizedImageUrl(url, width)} ${width}w`)
    .join(", ");
  return `src="${optimizedImageUrl(url, widths[Math.min(widths.length - 1, 3)])}" srcset="${escapeHtml(srcset)}" sizes="${escapeHtml(sizes)}"${priority ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"'} decoding="async"`;
}

function stateSlugSegment(value) {
  return slugify(String(value || "").toLowerCase());
}

function cityRouteSegment(place) {
  return slugify(place.city || "");
}

function placeRouteSegment(place) {
  return place.slug || slugify(place.name || place.id || "");
}

function isSearchPark(place) {
  return place.searchCategory === "park";
}

function discoveryPriority(place) {
  const identity = `${place.name || ""} ${place.type || ""} ${place.searchCategory || ""}`;
  if (/\b(park|dog park|greenway|trail|garden|playground|nature preserve)\b/i.test(identity)) return 0;
  if (/\blibrar(?:y|ies)\b/i.test(identity)) return 2;
  return 1;
}

function isPublishablePlace(place) {
  if (["excluded", "deferred"].includes(place.publishStatus)) return false;
  const identity = `${place.name || ""} ${place.type || ""} ${place.searchCategory || ""}`;
  const ordinaryMunicipalBuilding = /\b(city|town|municipal|county)\s+(hall|office|offices|building|administration|administrative center)|\bgovernment\s+(center|office|offices|building)\b/i.test(identity);
  const administrativeType = /\b(city office|municipal office|government office|civic resource)\b/i.test(identity);
  const publicDestination = /\b(park|plaza|garden|museum|gallery|historic|landmark|memorial|trail|greenway|library|playground|recreation)\b/i.test(identity);
  return (!ordinaryMunicipalBuilding && !administrativeType) || publicDestination || place.publicDestination === true;
}

function searchCategorySegment(place) {
  const category = slugify(place.searchCategory || "");
  if (category === "library") return "libraries";
  if (category === "park") return "parks";
  return category.endsWith("s") ? category : `${category}s`;
}

function canonicalPlacePath(place) {
  if (place.canonicalPath) return place.canonicalPath;
  if (!place.searchCategory) return null;
  return `/us/${stateSlugSegment(place.state)}/${cityRouteSegment(place)}/${searchCategorySegment(place)}/${placeRouteSegment(place)}`;
}

function canonicalFeaturePath(place, feature) {
  const parentPath = place.parentPlace?.path || canonicalPlacePath(place);
  if (!parentPath) return null;
  return `${parentPath}/${feature.slug || slugify(feature.name || feature.id)}`;
}

function canonicalCityParksPath(place) {
  if (!isSearchPark(place)) return null;
  return `/us/${stateSlugSegment(place.state)}/${cityRouteSegment(place)}/parks`;
}

function normalizeCommunityRecord(place) {
  if (!place.discoveryStatus) return place;
  const legacySummary = /openstreetmap|statewide discovery record/i.test(place.summary || "");
  const publicMapSource = /openstreetmap/i.test(place.source || "")
    ? {
        label: "OpenStreetMap contributors",
        url: place.source,
        note: "Public location and place details",
      }
    : null;
  return {
    ...place,
    status: "Community record",
    sourceHistoryLabel:
      place.sourceHistoryLabel ||
      (/openstreetmap/i.test(place.source || "") ? "OpenStreetMap contributors" : place.sourceLabel),
    sourceLabel: /openstreetmap/i.test(place.source || "")
      ? "Public map source"
      : place.sourceLabel || "Public source",
    sources: [
      ...(place.sources || []),
      ...(publicMapSource &&
      !(place.sources || []).some((source) => source.url === publicMapSource.url)
        ? [publicMapSource]
        : []),
    ],
    summary: legacySummary
      ? "A public place with mapped location and basic visit information. Community notes, current photos, and cited public sources can make this record more useful over time."
      : place.summary,
  };
}

async function loadPlaces({ sharedTimeoutMs = null } = {}) {
  const curatedRequest = fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error("Could not load place data.");
    return response.json();
  });
  const launchRequest = fetch("/data/generated/launch-map-places.json")
    .then((response) => (response.ok ? response.json() : []))
    .catch(() => []);
  const sharedRequest = fetch("/api/places?limit=250")
    .then(async (response) => {
      if (!response.ok) return [];
      const payload = await response.json();
      return payload.places || [];
    })
    .catch(() => []);

  const sharedPlacesRequest = Number.isFinite(sharedTimeoutMs)
    ? Promise.race([
        sharedRequest,
        new Promise((resolve) => window.setTimeout(() => resolve([]), sharedTimeoutMs)),
      ])
    : sharedRequest;

  const [curatedPlaces, launchPlaces, sharedPlaces] = await Promise.all([
    curatedRequest,
    launchRequest,
    sharedPlacesRequest,
  ]);
  const discoveredPlaces = getLocalRecord("auditmap:discovered-places", []).map(
    normalizeCommunityRecord,
  );
  const researchedPlaces = mergePlaceRecords(curatedPlaces, launchPlaces);
  return mergePlaceRecords(
    mergePlaceRecords(
      researchedPlaces,
      removeSupersededDiscoveries(researchedPlaces, discoveredPlaces),
    ),
    sharedPlaces,
  ).filter(isPublishablePlace);
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

function citySlug(place) {
  return place.citySlug || slugify(`${place.city}-${place.state}`);
}

function placeUrl(place) {
  return `/place.html?city=${encodeURIComponent(citySlug(place))}&id=${encodeURIComponent(place.id)}`;
}

function placeKey(place) {
  return `${citySlug(place)}:${place.id}`;
}

function placeIdentityKey(place) {
  return `${citySlug(place)}:${slugify(place.name || "")}`;
}

function removeSupersededDiscoveries(currentPlaces, discoveredPlaces) {
  const curatedIdentities = new Set(
    currentPlaces
      .filter((place) => !place.discoveryStatus)
      .map(placeIdentityKey),
  );
  return discoveredPlaces.filter(
    (place) => !curatedIdentities.has(placeIdentityKey(place)),
  );
}

function mergePlaceRecords(currentPlaces, incomingPlaces) {
  const records = new Map();
  for (const place of [...currentPlaces, ...incomingPlaces]) {
    const key = placeKey(place);
    const current = records.get(key);
    if (!current) {
      records.set(key, place);
      continue;
    }
    records.set(key, {
      ...current,
      ...place,
      image: place.image || current.image,
      images: place.images?.length ? place.images : current.images,
      sources: place.sources?.length ? place.sources : current.sources,
      comments: place.comments?.length ? place.comments : current.comments,
      source: current.source || place.source,
      sourceLabel: current.sourceLabel || place.sourceLabel,
    });
  }
  return [...records.values()];
}

function distanceMiles(from, to) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const latitude1 = toRadians(from.latitude);
  const latitude2 = toRadians(to.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const genericDiscoveryTerms = new Set([
  "park",
  "parks",
  "public",
  "place",
  "places",
  "destination",
  "destinations",
  "recreation",
]);

function discoveryTerms(place) {
  return new Set(
    [
      place.type,
      place.searchCategory,
      ...(place.amenities || []),
      ...(place.tags || []),
    ]
      .filter((value) => typeof value === "string")
      .map((value) => slugify(value).replaceAll("-", " "))
      .filter(Boolean),
  );
}

function discoveryFeatureCandidates(places) {
  return places.flatMap((parent) =>
    (parent.features || [])
      .filter(
        (feature) =>
          Number.isFinite(Number(feature.latitude)) &&
          Number.isFinite(Number(feature.longitude)),
      )
      .map((feature) => ({
        id: `${parent.id}--${feature.slug || feature.id}`,
        parentId: parent.id,
        parentPlace: {
          id: parent.id,
          name: parent.name,
          path: canonicalPlacePath(parent) || placeUrl(parent),
        },
        canonicalPath:
          canonicalFeaturePath(parent, feature) ||
          `/feature.html?place=${encodeURIComponent(parent.id)}&feature=${encodeURIComponent(feature.id)}`,
        name: feature.name,
        type: feature.feature_type || "Park destination",
        searchCategory: parent.searchCategory,
        city: parent.city,
        state: parent.state,
        citySlug: parent.citySlug,
        neighborhood: parent.name,
        latitude: Number(feature.latitude),
        longitude: Number(feature.longitude),
        summary: feature.description || `A destination within ${parent.name}.`,
        amenities: feature.tags || [],
        tags: feature.tags || [],
        image: feature.details?.imageUrl
          ? {
              url: feature.details.imageUrl,
              alt: feature.details.imageAlt || `${feature.name} at ${parent.name}`,
            }
          : null,
        isSubsiteCandidate: true,
      })),
  );
}

function discoveryCandidateImage(place) {
  return place.image?.url || (place.images || []).find((image) => image?.url)?.url || "";
}

function discoveryCandidatePath(place) {
  return place.canonicalPath || canonicalPlacePath(place) || placeUrl(place);
}

function discoveryTypeLabel(place) {
  const rawType = String(place.type || "").trim();
  if (rawType && rawType.length <= 34 && rawType.split(/\s+/).length <= 5) return rawType;
  const category = slugify(place.searchCategory || "");
  const categoryLabels = {
    park: "Park",
    museum: "Museum",
    library: "Library",
    trail: "Trail",
    garden: "Garden",
    plaza: "Public plaza",
    "transit-hub": "Transit",
  };
  return categoryLabels[category] || "Public place";
}

function discoveryDistanceLabel(distance) {
  if (distance < 0.1) return "Less than 0.1 mi";
  if (distance < 10) return `${distance.toFixed(1)} mi`;
  return `${Math.round(distance)} mi`;
}

function discoveryTermLabel(term) {
  const labels = {
    "dog park": "dog-friendly space",
    greenway: "greenway access",
    playground: "play space",
    "walking trail": "walking trails",
    trails: "trails",
    trail: "trails",
    accessible: "accessibility details",
    accessibility: "accessibility details",
  };
  return labels[term] || term;
}

function placeDiscoveryRecommendations(place, places) {
  if (
    !Number.isFinite(Number(place.latitude)) ||
    !Number.isFinite(Number(place.longitude))
  ) return { nearby: [], similar: [] };

  const currentPath = discoveryCandidatePath(place);
  const currentTerms = discoveryTerms(place);
  const currentType = slugify(place.type || "");
  const currentCategory = slugify(place.searchCategory || "");
  const uniqueCandidates = new Map();

  [...places, ...discoveryFeatureCandidates(places)].forEach((candidate) => {
    if (
      !candidate?.name ||
      !Number.isFinite(Number(candidate.latitude)) ||
      !Number.isFinite(Number(candidate.longitude))
    ) return;
    const path = discoveryCandidatePath(candidate);
    if (candidate.id === place.id || path === currentPath) return;
    if (!uniqueCandidates.has(path)) uniqueCandidates.set(path, candidate);
  });

  const ranked = [...uniqueCandidates.values()]
    .map((candidate) => {
      const distance = distanceMiles(place, candidate);
      const terms = discoveryTerms(candidate);
      const sharedTerms = [...terms].filter(
        (term) => currentTerms.has(term) && !genericDiscoveryTerms.has(term),
      );
      const sameType = currentType && slugify(candidate.type || "") === currentType;
      const sameCategory =
        currentCategory && slugify(candidate.searchCategory || "") === currentCategory;
      const relationship = candidate.parentId === place.id
        ? "inside"
        : place.parentId && candidate.id === place.parentId
          ? "parent"
          : place.parentId && candidate.parentId === place.parentId
            ? "sibling"
            : null;
      const similarity =
        sharedTerms.length * 2 +
        (sameType ? 5 : 0) +
        (sameCategory ? 2 : 0) +
        (relationship ? 3 : 0);
      return {
        candidate,
        distance,
        relationship,
        sameType,
        sharedTerms,
        similarity,
      };
    })
    .filter((item) => item.distance <= 75 || item.relationship);

  const externalCandidates = ranked.filter((item) => item.relationship !== "inside");
  const discoveryPool = !place.parentId && externalCandidates.length >= 3
    ? externalCandidates
    : ranked;
  const nearby = [...discoveryPool]
    .sort((left, right) =>
      left.distance - right.distance ||
      Number(Boolean(discoveryCandidateImage(right.candidate))) -
        Number(Boolean(discoveryCandidateImage(left.candidate))) ||
      right.similarity - left.similarity,
    )
    .slice(0, 8);
  const localSimilarCandidates = discoveryPool.filter((item) => item.distance <= 25);
  const similarPool = localSimilarCandidates.filter((item) => item.similarity >= 3).length >= 3
    ? localSimilarCandidates
    : discoveryPool;
  const similar = [...similarPool]
    .filter((item) => item.similarity >= 3)
    .sort((left, right) =>
      right.similarity - left.similarity || left.distance - right.distance,
    )
    .slice(0, 8);

  return { nearby, similar };
}

function discoveryReason(place, item, mode) {
  if (item.relationship === "inside") return `Inside ${place.name}`;
  if (item.relationship === "parent") return "Explore the whole place";
  if (item.relationship === "sibling") return `Also inside ${place.parentPlace?.name || item.candidate.parentPlace?.name}`;
  const usefulTerms = item.sharedTerms.slice(0, 2).map(discoveryTermLabel);
  if (mode === "similar" && usefulTerms.length) {
    return `Shares ${usefulTerms.join(" and ")}`;
  }
  if (mode === "similar" && item.sameType) {
    return `Another ${String(item.candidate.type || "public place").toLowerCase()}`;
  }
  return `${discoveryDistanceLabel(item.distance)} from here`;
}

function renderNearbyDiscovery(place, places) {
  const section = document.querySelector("#nearby-discovery");
  const track = document.querySelector("#nearby-place-track");
  if (!section || !track) return;

  const recommendations = placeDiscoveryRecommendations(place, places);
  const availableModes = ["nearby", "similar"].filter(
    (mode) => recommendations[mode].length,
  );
  if (!availableModes.length) return;

  let activeMode = availableModes.includes("nearby") ? "nearby" : availableModes[0];
  const intro = document.querySelector("#nearby-discovery-intro");
  const mapLink = document.querySelector("#nearby-map-link");
  const previousButton = section.querySelector('[data-nearby-scroll="previous"]');
  const nextButton = section.querySelector('[data-nearby-scroll="next"]');

  mapLink.href = `/index.html?city=${encodeURIComponent(citySlug(place))}`;
  section.querySelectorAll("[data-nearby-mode]").forEach((button) => {
    button.disabled = !recommendations[button.dataset.nearbyMode].length;
  });

  const updateScrollButtons = () => {
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    previousButton.disabled = track.scrollLeft <= 4;
    nextButton.disabled = track.scrollLeft >= maxScroll - 4;
  };

  const renderMode = (mode) => {
    activeMode = mode;
    const items = recommendations[mode];
    intro.textContent = mode === "nearby"
      ? `Public places and destinations around ${place.name}.`
      : "Places with similar activities, character, or documented features.";
    section.querySelectorAll("[data-nearby-mode]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.nearbyMode === mode));
    });
    track.innerHTML = items
      .map((item) => {
        const candidate = item.candidate;
        const imageUrl = discoveryCandidateImage(candidate);
        const href = discoveryCandidatePath(candidate);
        const location = candidate.parentPlace?.name || candidate.neighborhood || candidate.city;
        return `
          <article class="nearby-place-card" role="listitem">
            <a class="nearby-place-media${imageUrl ? " has-image" : ""}" href="${escapeHtml(href)}" aria-label="Explore ${escapeHtml(candidate.name)}">
              ${
                imageUrl
                  ? `<img ${responsiveImageAttributes(imageUrl, { widths: [320, 480, 640], sizes: "(max-width: 760px) 78vw, 270px" })} alt="${escapeHtml(candidate.image?.alt || candidate.name)}" />`
                  : `<span aria-hidden="true">${escapeHtml(discoveryTypeLabel(candidate).slice(0, 1).toUpperCase())}</span>`
              }
            </a>
            <div class="nearby-place-card-body">
              <p class="nearby-place-type">${escapeHtml(discoveryTypeLabel(candidate))}</p>
              <h3><a href="${escapeHtml(href)}">${escapeHtml(candidate.name)}</a></h3>
              <p class="nearby-place-location">${escapeHtml(discoveryDistanceLabel(item.distance))} · ${escapeHtml(location || `${candidate.city}, ${candidate.state}`)}</p>
              <p class="nearby-place-reason"><span>Why it fits</span>${escapeHtml(discoveryReason(place, item, mode))}</p>
            </div>
          </article>
        `;
      })
      .join("");
    track.scrollLeft = 0;
    track.querySelectorAll("img").forEach((image) => {
      image.addEventListener("error", () => {
        image.closest(".nearby-place-media")?.classList.add("is-missing");
        image.remove();
      }, { once: true });
    });
    window.requestAnimationFrame(updateScrollButtons);
  };

  section.querySelectorAll("[data-nearby-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!button.disabled) renderMode(button.dataset.nearbyMode);
    });
  });
  section.querySelectorAll("[data-nearby-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.dataset.nearbyScroll === "previous" ? -1 : 1;
      track.scrollBy({
        left: direction * Math.max(240, track.clientWidth * 0.82),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
  });
  track.addEventListener("scroll", updateScrollButtons, { passive: true });
  track.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    track.scrollBy({ left: direction * Math.max(240, track.clientWidth * 0.82), behavior: "smooth" });
  });
  window.addEventListener("resize", updateScrollButtons);

  section.hidden = false;
  renderMode(activeMode);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseAuditDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date(`${text}T12:00:00-04:00`);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatAuditDate(value) {
  const parsed = parseAuditDate(value);
  if (!parsed) return "Not recorded";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getLocalRecord(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function setLocalRecord(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getStoredContributions(placeId) {
  return getLocalRecord(`auditmap:${placeId}`, {
    comments: [],
    photos: [],
    edits: [],
    reports: [],
    verifications: [],
    stewardApplications: [],
  });
}

function normalizeContributions(value) {
  return {
    comments: value.comments || [],
    photos: value.photos || [],
    edits: value.edits || [],
    reports: value.reports || [],
    verifications: value.verifications || [],
    stewardApplications: value.stewardApplications || [],
  };
}

async function loadSharedContributions(placeId) {
  try {
    const response = await fetch(
      `/api/feed?placeId=${encodeURIComponent(placeId)}`,
    );
    if (!response.ok) return [];
    const payload = await response.json();
    return (payload.contributions || []).map((item) => ({
      id: item.id,
      author: item.author_name || "Local contributor",
      text: item.body,
      rating: item.rating ? Number(item.rating) : null,
      submittedAt: item.created_at,
      context: item.contribution_type,
      featureId: item.feature_id || null,
      parentId: item.parent_id || null,
      isAi: Boolean(item.metadata?.aiGenerated),
      answerStatus: item.metadata?.answerStatus || null,
      sources: Array.isArray(item.metadata?.sources) ? item.metadata.sources : [],
      knowledgeIntent: item.metadata?.verificationIntent || null,
      knowledgeQuestion: item.metadata?.verificationPrompt || null,
      topic: item.metadata?.topic || "evergreen",
      latitude: item.latitude == null ? null : Number(item.latitude),
      longitude: item.longitude == null ? null : Number(item.longitude),
      locationScope: item.location_scope || "place",
      locationLabel: item.metadata?.locationLabel || null,
      observedAt: item.observed_at || null,
      freshUntil: item.fresh_until || null,
      verificationStatus: item.verification_status || "unverified",
      isFresh: item.isFresh !== false,
      media: Array.isArray(item.media) ? item.media : [],
      helpful: Number(item.helpful || 0),
      contributor: item.contributor || null,
    }));
  } catch {
    return [];
  }
}

function localKnowledgeQuestions(place) {
  return (place?.searchAnswers || []).map((answer, index) => ({
    id: `${place.id}-local-answer-${index + 1}`,
    sample_question: answer.question,
    ask_count: Number(answer.askCount || 1),
    canonical_answer: answer.answer,
    answer_status: answer.answerStatus || "answered",
    answer_sources: answer.source
      ? [
          {
            title: answer.sourceLabel || "Official source",
            url: answer.source,
          },
        ]
      : [],
    answered_at: answer.checkedAt || place.verifiedAt || null,
    expires_at: answer.expiresAt || null,
    last_asked_at: answer.checkedAt || place.verifiedAt || null,
    intent_key: answer.intentKey || null,
    needs_enrichment: false,
    metadata: {
      sourceType: answer.sourceType || "official",
    },
  }));
}

async function loadPlaceKnowledge(placeId, place = null) {
  try {
    const response = await fetch(`/api/knowledge?placeId=${encodeURIComponent(placeId)}`);
    if (!response.ok) return localKnowledgeQuestions(place);
    const questions = (await response.json()).questions || [];
    return questions.length ? questions : localKnowledgeQuestions(place);
  } catch {
    return localKnowledgeQuestions(place);
  }
}

function localPlaceFeatures(place) {
  if (!Array.isArray(place?.features)) return { features: [] };
  return {
    place: {
      id: place.id,
      name: place.name,
      hiddenFeatureIds: place.hiddenFeatureIds || [],
    },
    features: place.features,
  };
}

function mergePlaceFeatures(localPayload, sharedPayload) {
  const records = new Map();
  const hiddenFeatureIds = new Set(localPayload?.place?.hiddenFeatureIds || []);
  for (const feature of [
    ...(localPayload?.features || []),
    ...(sharedPayload?.features || []),
  ]) {
    const key = feature.id || feature.slug || slugify(feature.name || "");
    if (hiddenFeatureIds.has(key)) continue;
    const current = records.get(key);
    if (!current) {
      records.set(key, feature);
      continue;
    }
    const sharedHasPosition =
      Number.isFinite(Number(feature.latitude)) &&
      Number.isFinite(Number(feature.longitude));
    records.set(key, {
      ...current,
      ...feature,
      latitude: sharedHasPosition ? feature.latitude : current.latitude,
      longitude: sharedHasPosition ? feature.longitude : current.longitude,
      details: {
        ...(current.details || {}),
        ...(feature.details || {}),
      },
    });
  }
  return {
    place: sharedPayload?.place || localPayload?.place,
    features: [...records.values()],
  };
}

async function loadPlaceFeatures(placeId, place = null) {
  const localPayload = localPlaceFeatures(place);
  try {
    const response = await fetch(`/api/features?placeId=${encodeURIComponent(placeId)}`);
    if (!response.ok) return localPayload;
    const payload = await response.json();
    return mergePlaceFeatures(localPayload, payload);
  } catch {
    return localPayload;
  }
}

function featureCategory(feature) {
  if (feature.details?.category) return feature.details.category;
  if (["entrance", "parking", "transit"].includes(feature.feature_type)) return "Arrival";
  if (["restroom", "elevator", "accessible_route", "service"].includes(feature.feature_type)) {
    return "Services";
  }
  return "Destinations";
}

function mappedPlaceFeatures(place) {
  const seenIds = new Set();
  return (place?.features || []).filter((feature) => {
    const latitude = Number(feature?.latitude);
    const longitude = Number(feature?.longitude);
    const id = String(feature?.id || "").trim();
    const name = String(feature?.name || "").trim();
    const validPosition =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180 &&
      !(latitude === 0 && longitude === 0);
    if (!id || !name || !validPosition || seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });
}

function explorerFeatureImage(feature) {
  return feature?.details?.imageUrl ||
    feature?.details?.photoUrl ||
    feature?.image_url ||
    feature?.details?.images?.[0]?.url ||
    feature?.images?.[0]?.url ||
    "";
}

function explorerFeatureReady(feature) {
  const details = feature?.details || {};
  const sourceUrl = feature?.source_url || details.informationSourceUrl || details.officialMapUrl;
  const checkedAt = feature?.verified_at || details.informationCheckedAt || details.verifiedAt;
  const coordinateProvenance = details.positionQuality || details.coordinateSource;
  return Boolean(explorerFeatureImage(feature) && sourceUrl && checkedAt && coordinateProvenance);
}

function explorerPlaceFeatures(place) {
  return mappedPlaceFeatures(place).filter(explorerFeatureReady);
}

function explorerEligible(place) {
  return explorerPlaceFeatures(place).length >= 2;
}

function explorerArrivalPoint(place) {
  const explicitArrival = place?.arrivalCoordinates || place?.arrival_coordinates;
  const latitude = Number(
    explicitArrival?.latitude ?? place?.arrivalLatitude ?? place?.arrival_latitude ?? place?.latitude,
  );
  const longitude = Number(
    explicitArrival?.longitude ?? place?.arrivalLongitude ?? place?.arrival_longitude ?? place?.longitude,
  );
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude }
    : null;
}

function explorerDirectionsUrl(place) {
  const arrival = explorerArrivalPoint(place);
  const destination = arrival
    ? `${arrival.latitude},${arrival.longitude}`
    : [place?.name, formatPlaceAddress(place)].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

function liveDateLabel(value, options = {}) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function weatherDayKey(value, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function compactWeatherPeriods(periods, maximum = 9) {
  if (periods.length <= maximum) return periods;
  const result = [];
  for (let index = 0; index < maximum; index += 1) {
    result.push(periods[Math.round((index * (periods.length - 1)) / (maximum - 1))]);
  }
  return result;
}

function weatherConditionIcon(forecast, isDaytime = true) {
  const text = String(forecast || "").toLowerCase();
  let kind = "sun";
  if (/thunder|storm/.test(text)) kind = "storm";
  else if (/snow|sleet|ice|freezing/.test(text)) kind = "snow";
  else if (/rain|shower|drizzle/.test(text)) kind = "rain";
  else if (/fog|haze|smoke/.test(text)) kind = "fog";
  else if (/wind|breezy|gust/.test(text)) kind = "wind";
  else if (/partly|mostly sunny|mostly clear|few clouds/.test(text)) {
    kind = isDaytime === false ? "partly-night" : "partly";
  } else if (/cloud|overcast/.test(text)) kind = "cloud";
  else if (isDaytime === false) kind = "moon";

  const paths = {
    sun: '<circle cx="12" cy="12" r="3.6"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
    moon: '<path d="M19.2 15.4A8 8 0 0 1 8.6 4.8 8.1 8.1 0 1 0 19.2 15.4Z"/>',
    cloud: '<path d="M6.3 18h11a3.7 3.7 0 0 0 .4-7.4A6.1 6.1 0 0 0 6 9.2 4.4 4.4 0 0 0 6.3 18Z"/>',
    partly: '<circle cx="8" cy="8" r="3"/><path d="M8 2.5v1.2M3.2 8H2M11.9 4.1l.9-.9M4.1 4.1l-.9-.9M7 18h10a3.5 3.5 0 0 0 .2-7 5.4 5.4 0 0 0-10.3 1.1A3 3 0 0 0 7 18Z"/>',
    "partly-night": '<path d="M10.8 3.5A5 5 0 0 0 7.3 11a5.1 5.1 0 0 0 3.5.3A5.5 5.5 0 0 1 10.8 3.5Z"/><path d="M7 19h10a3.5 3.5 0 0 0 .2-7 5.4 5.4 0 0 0-10.3 1.1A3 3 0 0 0 7 19Z"/>',
    rain: '<path d="M6.3 15.5h11a3.7 3.7 0 0 0 .4-7.4A6.1 6.1 0 0 0 6 6.7a4.4 4.4 0 0 0 .3 8.8Z"/><path d="m8 18-1 2M13 18l-1 2M18 18l-1 2"/>',
    storm: '<path d="M6.3 14.5h11a3.7 3.7 0 0 0 .4-7.4A6.1 6.1 0 0 0 6 5.7a4.4 4.4 0 0 0 .3 8.8Z"/><path d="m13 15.5-2 3h2l-1 3 4-4h-2l1-2Z"/>',
    snow: '<path d="M6.3 14.5h11a3.7 3.7 0 0 0 .4-7.4A6.1 6.1 0 0 0 6 5.7a4.4 4.4 0 0 0 .3 8.8Z"/><path d="M8 18h.01M13 20h.01M18 18h.01"/>',
    fog: '<path d="M5 9h14M3 13h15M6 17h15"/>',
    wind: '<path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5M3 12h16a2 2 0 1 1-2 2M3 16h8"/>',
  };
  return `<svg class="weather-condition-icon is-${kind}" viewBox="0 0 24 24" aria-hidden="true">${paths[kind]}</svg>`;
}

function weatherGraphMarkup(periods, index, timeZone) {
  const sampled = compactWeatherPeriods(periods);
  const temperatures = sampled.map((item) => Number(item.temperature));
  const minimum = Math.min(...temperatures);
  const maximum = Math.max(...temperatures);
  const temperatureRange = Math.max(1, maximum - minimum);
  const points = sampled.map((item, pointIndex) => {
    const x = sampled.length === 1 ? 150 : 14 + (pointIndex * 272) / (sampled.length - 1);
    const y = 47 - ((Number(item.temperature) - minimum) / temperatureRange) * 30;
    return { item, x, y };
  });
  const rain = Math.max(...periods.map((item) => Number(item.precipitationChance || 0)));
  const label = index === 0
    ? "Today"
    : index === 1
      ? "Tomorrow"
      : new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone }).format(new Date(periods[0].startTime));
  const representative = periods.find((period) => period.isDaytime) || periods[0];
  const condition = representative?.shortForecast || "Hourly forecast";
  return `
    <article class="weather-day-panel" role="listitem" aria-label="${escapeHtml(label)} hourly forecast">
      <header>
        <strong>${escapeHtml(label)}</strong>
        <span class="weather-day-condition">${weatherConditionIcon(condition, representative?.isDaytime)}<span>${escapeHtml(condition)}</span></span>
      </header>
      <svg class="weather-temperature-graph" viewBox="0 0 300 62" role="img" aria-label="Temperature from ${minimum} to ${maximum} degrees">
        <line x1="14" y1="49" x2="286" y2="49"></line>
        <polyline points="${points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")}"></polyline>
        ${points.map((point) => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="2.8"></circle><text x="${point.x.toFixed(1)}" y="${Math.max(9, point.y - 7).toFixed(1)}">${Number(point.item.temperature)}°</text>`).join("")}
      </svg>
      <div class="weather-hour-labels">${points.map((point) => `<span>${escapeHtml(new Intl.DateTimeFormat(undefined, { hour: "numeric", timeZone }).format(new Date(point.item.startTime)).replace(" ", ""))}</span>`).join("")}</div>
      <div class="weather-day-summary"><span>Low ${minimum}°</span><span>High ${maximum}°</span><span>${rain}% max rain</span></div>
    </article>
  `;
}

async function initPlaceLive(place, focusedFeature = null) {
  const shell = document.querySelector("#place-live");
  const weatherCard = document.querySelector("#place-weather-card");
  const eventList = document.querySelector("#place-event-list");
  const updated = document.querySelector("#place-live-updated");
  if (!shell || !weatherCard || !eventList || !updated) return;
  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
  try {
    const params = new URLSearchParams({
      placeId: place.parentId || place.id,
      lat: String(latitude),
      lon: String(longitude),
    });
    if (focusedFeature?.name || place.parentPlace) {
      params.set("feature", focusedFeature?.name || place.name);
    }
    const response = await fetch(`/api/place-live?${params}`);
    if (!response.ok) return;
    const payload = await response.json();
    const weather = payload.weather;
    if (weather) {
      const alert = weather.alerts?.[0];
      const timeZone = weather.timeZone || "America/New_York";
      const weatherDays = new Map();
      (weather.hourly || []).forEach((period) => {
        const key = weatherDayKey(period.startTime, timeZone);
        if (!weatherDays.has(key) && weatherDays.size >= 4) return;
        const list = weatherDays.get(key) || [];
        list.push(period);
        weatherDays.set(key, list);
      });
      const dayEntries = [...weatherDays.values()].filter(Boolean);
      weatherCard.hidden = false;
      weatherCard.innerHTML = `
        <summary>
          ${weatherConditionIcon(weather.shortForecast, weather.isDaytime)}
          <span class="place-weather-label">Weather</span>
          <strong>${escapeHtml(`${weather.temperature}°`)}</strong>
          <span>${escapeHtml(weather.shortForecast || "Current conditions")}</span>
          <span class="hours-carrot" aria-hidden="true">⌄</span>
        </summary>
        <div class="place-weather-expanded">
          <div class="place-weather-intro">
            <p class="place-weather-advisory${alert ? " is-alert" : ""}">${escapeHtml(weather.advisory)}</p>
            ${[weather.windDirection, weather.windSpeed].filter(Boolean).length ? `<span>${escapeHtml([weather.windDirection, weather.windSpeed].filter(Boolean).join(" "))}</span>` : ""}
          </div>
          ${dayEntries.length ? `<div class="weather-forecast-track" role="list" tabindex="0" aria-label="Hourly forecast. Swipe to see upcoming days.">${dayEntries.map((periods, index) => weatherGraphMarkup(periods, index, timeZone)).join("")}</div>` : ""}
          <div class="place-weather-meta">
            <span>Forecast for ${escapeHtml(place.city)} local time</span>
            <a href="${escapeHtml(weather.source)}" target="_blank" rel="noreferrer">National Weather Service ↗</a>
          </div>
        </div>
      `;
      const hoursDetails = document.querySelector("#place-hours-details");
      const liveDetails = [hoursDetails, weatherCard].filter(Boolean);
      liveDetails.forEach((details) => {
        details.querySelector("summary")?.addEventListener("click", () => {
          liveDetails.forEach((other) => {
            if (other !== details) other.open = false;
          });
        });
        details.addEventListener("toggle", () => {
          if (!details.open) return;
          liveDetails.forEach((other) => {
            if (other !== details) other.open = false;
          });
        });
      });
    }
    const events = payload.events || [];
    eventList.innerHTML = events.length
      ? `<div class="place-event-heading"><strong>Coming up</strong><a href="${escapeHtml(payload.eventsSource || "#")}" target="_blank" rel="noreferrer">Full calendar</a></div>
        <div class="place-event-track" role="list" tabindex="0" aria-label="Upcoming events. Swipe to explore.">
          ${events.map((event) => `
            <a class="place-event-card${event.featured ? " is-featured" : ""}" role="listitem" href="${escapeHtml(event.url)}" target="_blank" rel="noreferrer">
              <span>
                <b>${escapeHtml(event.featured ? "Featured event" : event.location || "Public event")}</b>
                <strong>${escapeHtml(event.title)}</strong>
                <small>${escapeHtml([event.date, event.time].filter(Boolean).join(" · "))}</small>
                ${event.location ? `<em>${escapeHtml(event.location)}</em>` : ""}
              </span>
            </a>
          `).join("")}
        </div>`
      : "";
    if (!events.length) {
      shell.hidden = true;
      return;
    }
    updated.textContent = `Calendar checked ${liveDateLabel(payload.checkedAt, { hour: "numeric", minute: "2-digit" })}`;
    shell.hidden = false;
  } catch {
    shell.hidden = true;
  }
}

function needsPlaceSubmap(place) {
  const placeViews = place?.media360 || [];
  const featureViews = (place?.features || []).flatMap(
    (feature) => feature.details?.media360 || [],
  );
  const hasMapped360 = [...placeViews, ...featureViews].some((item) =>
    Number.isFinite(Number(item.latitude ?? place?.latitude)) &&
    Number.isFinite(Number(item.longitude ?? place?.longitude)),
  );
  return mappedPlaceFeatures(place).length >= 2 || hasMapped360;
}

function clusterPinnedCrumbs(comments, thresholdMeters = 24) {
  const radians = (value) => (Number(value) * Math.PI) / 180;
  const distance = (left, right) => {
    const latitudeDelta = radians(right.latitude - left.latitude);
    const longitudeDelta = radians(right.longitude - left.longitude);
    const latitude = radians((left.latitude + right.latitude) / 2);
    return 6_371_000 * Math.hypot(latitudeDelta, longitudeDelta * Math.cos(latitude));
  };
  const clusters = [];
  for (const crumb of comments) {
    const cluster = clusters.find((candidate) => distance(candidate, crumb) <= thresholdMeters);
    if (cluster) {
      cluster.items.push(crumb);
      cluster.latitude = cluster.items.reduce((sum, item) => sum + item.latitude, 0) / cluster.items.length;
      cluster.longitude = cluster.items.reduce((sum, item) => sum + item.longitude, 0) / cluster.items.length;
    } else {
      clusters.push({ latitude: crumb.latitude, longitude: crumb.longitude, items: [crumb] });
    }
  }
  return clusters;
}

function place360MediaItems(place, comments = [], includeLocalDemo = true) {
  const sourcedItems = [
    ...(place.media360 || []).map((media) => ({ media, feature: null })),
    ...(place.features || []).flatMap((feature) =>
      (feature.details?.media360 || []).map((media) => ({ media, feature })),
    ),
  ].map(({ media, feature }, index) => ({
    ...media,
    id: media.id || `sourced-360-${place.id}-${feature?.id || "place"}-${index}`,
    kind: "photo_360",
    title: media.title || `${feature?.name || place.name} in 360°`,
    context: media.context || [media.author, media.capturedAt ? `Captured ${formatAuditDate(media.capturedAt)}` : null, media.license]
      .filter(Boolean)
      .join(" · "),
    sourceUrl: media.sourceUrl || media.source || null,
    latitude: Number(media.latitude ?? feature?.latitude ?? place.latitude),
    longitude: Number(media.longitude ?? feature?.longitude ?? place.longitude),
    isDemo: false,
    isSourced: true,
  }));
  const communityItems = comments.flatMap((comment) =>
    comment.moderationPending
      ? []
      : (comment.media || [])
          .filter((media) => media.kind === "photo_360" && (media.url || media.previewUrl))
          .map((media, index) => ({
            ...media,
            id: media.id || `${comment.id || "community-360"}-${index}`,
            title: `${place.name} community 360°`,
            context: `${comment.contributor?.displayName || comment.author || "Community contributor"}${media.capturedAt ? ` · Captured ${formatAuditDate(media.capturedAt)}` : ""}`,
            sourceUrl: null,
            latitude: comment.latitude == null ? Number.NaN : Number(comment.latitude),
            longitude: comment.longitude == null ? Number.NaN : Number(comment.longitude),
            commentId: comment.id || null,
            isDemo: false,
          })),
  );
  const localDemo = includeLocalDemo &&
    place.id === "dix-park" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? [{
        id: "dix-park-local-360-demo",
        kind: "photo_360",
        url: "/assets/test-media/grand-canyon-trail-of-time-360.jpg",
        previewUrl: "/assets/test-media/grand-canyon-trail-of-time-360.jpg",
        title: "Trail of Time viewer demo",
        context: "Grand Canyon National Park · NPS / M. Quinn · CC BY 2.0",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Along_the_Trail_of_Time_-_Grand_Canyon_National_Park_-_R0010515_-_30270508138.jpg",
        latitude: Number(place.latitude),
        longitude: Number(place.longitude),
        isDemo: true,
      }]
    : [];
  return [...sourcedItems, ...communityItems, ...localDemo].filter(
    (item, index, candidates) =>
      candidates.findIndex((candidate) => candidate.id === item.id) === index,
  );
}

function renderPlaceFeatures(place, payload, communityComments = []) {
  const features = (payload.features || []).filter(
    (feature) => Number.isFinite(Number(feature.latitude)) &&
      Number.isFinite(Number(feature.longitude)),
  );
  const all360Items = place360MediaItems(place, communityComments);
  if (!features.length && !all360Items.some((item) =>
    Number.isFinite(item.latitude) && Number.isFinite(item.longitude))) return;
  const crumbClusters = clusterPinnedCrumbs(
    communityComments.filter(
      (comment) => comment.isFresh !== false && Number.isFinite(comment.latitude) && Number.isFinite(comment.longitude),
    ),
  );
  crumbClusters.forEach((cluster) => {
    cluster.media360 = place360MediaItems(place, cluster.items, false)
      .filter((item) => !item.isSourced);
  });
  all360Items
    .filter((item) =>
      (item.isDemo || item.isSourced) &&
      Number.isFinite(item.latitude) &&
      Number.isFinite(item.longitude))
    .forEach((item) => crumbClusters.push({
      latitude: item.latitude,
      longitude: item.longitude,
      items: [],
      media360: [item],
      isDemo: item.isDemo,
      isSourced: item.isSourced,
    }));
  window.setAuditMapAskFeatures?.(features);

  const section = document.querySelector("#place-explorer");
  const filters = document.querySelector("#feature-filters");
  const list = document.querySelector("#feature-list");
  const count = document.querySelector("#feature-browser-count");
  const sourceLink = document.querySelector("#explorer-source");
  const levels = [...new Set(features.map((feature) => feature.level_label).filter(Boolean))];
  const filterValues = levels.length
    ? ["All", ...levels]
    : features.length
      ? ["All", ...new Set(features.map(featureCategory))]
      : [];
  let activeFilter = "All";
  let selectedId = features[0]?.id || null;
  let focusedFeatureId = null;
  let focusedPhotoLocation = null;
  let cardScrollFrame = null;
  let cardScrollEndTimer = null;
  const mapElement = document.querySelector("#internal-map");

  section.hidden = false;
  document.body.classList.add("has-place-explorer");
  const openMapButton = document.querySelector("#open-site-map-button");
  const expandMapButton = document.querySelector("#expand-site-map-button");
  const siteMapSummary = document.querySelector("#site-map-summary");
  const launchExplorerLink = document.querySelector("#launch-place-explorer");
  const explorerAvailable = explorerEligible({ ...place, features });
  const mapped360Count = all360Items.filter(
    (item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude),
  ).length;
  section.classList.toggle("has-only-360", !features.length && mapped360Count > 0);
  if (openMapButton) {
    openMapButton.hidden = false;
    openMapButton.classList.toggle("is-explorer-action", explorerAvailable);
    const openMapLabel = openMapButton.querySelector("span");
    if (openMapLabel) openMapLabel.textContent = explorerAvailable ? "Explore" : "Site map";
  }
  if (launchExplorerLink && explorerAvailable) {
    launchExplorerLink.href = `/?city=${encodeURIComponent(citySlug(place))}&explore=${encodeURIComponent(place.id)}`;
    launchExplorerLink.hidden = false;
  }
  if (siteMapSummary) {
    siteMapSummary.textContent = features.length
      ? `${features.length} ${features.length === 1 ? "place" : "places"} · ${mapped360Count} 360° ${mapped360Count === 1 ? "view" : "views"}`
      : `${mapped360Count} mapped 360° ${mapped360Count === 1 ? "view" : "views"}`;
  }
  const explorerTitle = document.querySelector("#explorer-title");
  if (explorerTitle) explorerTitle.textContent = "Explore the grounds";
  document.querySelector("#explorer-kicker").textContent = `${place.name} field guide`;
  const officialSource = features.find((feature) => feature.details?.officialMapUrl);
  if (officialSource) {
    sourceLink.href = officialSource.details.officialMapUrl;
  } else {
    sourceLink.hidden = true;
  }

  mapElement.innerHTML = `
    <div class="internal-map-tiles" aria-hidden="true"></div>
    <div class="internal-map-markers">
    <span class="internal-map-compass" aria-hidden="true">N</span>
    ${features
      .map((feature, index) => {
        return `<button
          class="internal-feature-marker${index === 0 ? " is-selected" : ""}"
          type="button"
          data-feature-marker="${escapeHtml(feature.id)}"
          aria-label="${escapeHtml(feature.name)}"
        ><span>${index + 1}</span><small>${escapeHtml(feature.name)}</small></button>`;
      })
      .join("")}
    ${crumbClusters.map((cluster, index) => `<button
      class="internal-crumb-marker${cluster.media360?.length ? " has-360" : ""}${cluster.isDemo ? " is-demo" : ""}${cluster.isSourced ? " is-sourced" : ""}"
      type="button"
      data-crumb-marker="${index}"
      aria-label="${cluster.media360?.length ? `${cluster.media360.length} interactive 360 degree ${cluster.media360.length === 1 ? "view" : "views"}${cluster.isDemo ? ", viewer demo not captured here" : ""}` : cluster.items.length === 1 ? "Community crumb" : `${cluster.items.length} community crumbs`}"
    ><span>${cluster.media360?.length ? "360°" : cluster.items.length > 1 ? cluster.items.length : "•"}</span>${cluster.isDemo ? "<small>Demo</small>" : ""}</button>`).join("")}
    <span class="internal-crumb-draft" aria-label="New crumb location" hidden><span></span></span>
    <span class="internal-photo-location" aria-label="Photo location" hidden>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h3l1.4-2h5.2L16 8h3v10H5V8Z"/><circle cx="12" cy="13" r="3"/></svg>
    </span>
    <span class="internal-user-location" aria-label="Your location" hidden>
      ${userLocationMarkerMarkup()}
    </span>
    </div>
    <div class="internal-map-controls" aria-label="Site map controls">
      <button type="button" data-site-map-zoom="in" aria-label="Zoom in">+</button>
      <button type="button" data-site-map-zoom="out" aria-label="Zoom out">−</button>
      <button type="button" data-site-map-fit>Fit site</button>
      <button type="button" data-site-map-expand aria-label="Open full site map">↗</button>
    </div>
    <span class="internal-map-label">Pinch or use controls to zoom</span>
    <span class="internal-map-attribution">
      © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>
    </span>
  `;

  const tileLayer = mapElement.querySelector(".internal-map-tiles");
  let lastTileMarkup = "";
  const markerElements = [...mapElement.querySelectorAll("[data-feature-marker]")];
  const crumbElements = [...mapElement.querySelectorAll("[data-crumb-marker]")];
  const draftCrumbElement = mapElement.querySelector(".internal-crumb-draft");
  const photoLocationElement = mapElement.querySelector(".internal-photo-location");
  const userLocationElement = mapElement.querySelector(".internal-user-location");
  let mapZoom = null;
  let minimumMapZoom = 12;
  let pinchDistance = null;
  let userLocation = null;
  let draftCrumb = null;
  let dropPinCallback = null;
  let dropPinCancel = null;
  let currentProjection = null;
  let locationWatchId = null;
  const project = (latitude, longitude, zoom) => {
    const worldSize = 256 * 2 ** zoom;
    const sine = Math.min(Math.max(Math.sin((latitude * Math.PI) / 180), -0.9999), 0.9999);
    return {
      x: ((longitude + 180) / 360) * worldSize,
      y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * worldSize,
    };
  };

  function drawStaticFeatureMap() {
    const width = mapElement.clientWidth;
    const height = mapElement.clientHeight;
    if (!width || !height) return;

    const fitLocations = [
      ...features,
      ...crumbClusters.map((cluster) => ({
        latitude: cluster.latitude,
        longitude: cluster.longitude,
      })),
      ...(focusedPhotoLocation ? [focusedPhotoLocation] : []),
    ];
    let fittedZoom = 18;
    let fittedPoints = fitLocations.map((point) =>
      project(Number(point.latitude), Number(point.longitude), fittedZoom),
    );
    const fits = () => {
      const xs = fittedPoints.map((point) => point.x);
      const ys = fittedPoints.map((point) => point.y);
      return Math.max(...xs) - Math.min(...xs) <= width - 72 &&
        Math.max(...ys) - Math.min(...ys) <= height - 72;
    };
    while (fittedZoom > 12 && !fits()) {
      fittedZoom -= 1;
      fittedPoints = fitLocations.map((point) =>
        project(Number(point.latitude), Number(point.longitude), fittedZoom),
      );
    }

    minimumMapZoom = fittedZoom;
    mapZoom = Math.min(Math.max(mapZoom ?? fittedZoom, fittedZoom), Math.min(fittedZoom + 4, 19));
    const projected = features.map((feature) =>
      project(Number(feature.latitude), Number(feature.longitude), mapZoom),
    );
    const projectedBounds = fitLocations.map((point) =>
      project(Number(point.latitude), Number(point.longitude), mapZoom),
    );
    const focusedIndex = features.findIndex((feature) => feature.id === focusedFeatureId);
    const projectedPhotoLocation = focusedPhotoLocation
      ? project(focusedPhotoLocation.latitude, focusedPhotoLocation.longitude, mapZoom)
      : null;
    const usePhotoCenter = projectedPhotoLocation && mapZoom > minimumMapZoom;
    const useFocusedCenter = !usePhotoCenter && focusedIndex >= 0 && mapZoom > minimumMapZoom;
    const centerX = useFocusedCenter
      ? projected[focusedIndex].x
      : usePhotoCenter
        ? projectedPhotoLocation.x
      : (Math.min(...projectedBounds.map((point) => point.x)) +
        Math.max(...projectedBounds.map((point) => point.x))) / 2;
    const centerY = useFocusedCenter
      ? projected[focusedIndex].y
      : usePhotoCenter
        ? projectedPhotoLocation.y
      : (Math.min(...projectedBounds.map((point) => point.y)) +
        Math.max(...projectedBounds.map((point) => point.y))) / 2;
    const originX = centerX - width / 2;
    const originY = centerY - height / 2;
    currentProjection = { originX, originY, zoom: mapZoom };
    const firstTileX = Math.floor(originX / 256);
    const lastTileX = Math.floor((originX + width) / 256);
    const firstTileY = Math.floor(originY / 256);
    const lastTileY = Math.floor((originY + height) / 256);
    const tiles = [];

    for (let tileY = firstTileY; tileY <= lastTileY; tileY += 1) {
      for (let tileX = firstTileX; tileX <= lastTileX; tileX += 1) {
        tiles.push(`
          <img
            src="https://tile.openstreetmap.org/${mapZoom}/${tileX}/${tileY}.png"
            alt=""
            draggable="false"
            style="left:${Math.round(tileX * 256 - originX)}px;top:${Math.round(tileY * 256 - originY)}px"
          />
        `);
      }
    }
    const tileMarkup = tiles.join("");
    if (tileMarkup !== lastTileMarkup) {
      tileLayer.innerHTML = tileMarkup;
      lastTileMarkup = tileMarkup;
    }
    markerElements.forEach((marker, index) => {
      marker.style.left = `${projected[index].x - originX}px`;
      marker.style.top = `${projected[index].y - originY}px`;
    });
    crumbElements.forEach((marker, index) => {
      const projectedCrumb = project(crumbClusters[index].latitude, crumbClusters[index].longitude, mapZoom);
      marker.style.left = `${projectedCrumb.x - originX}px`;
      marker.style.top = `${projectedCrumb.y - originY}px`;
    });
    if (draftCrumb) {
      const projectedDraft = project(draftCrumb.latitude, draftCrumb.longitude, mapZoom);
      draftCrumbElement.style.left = `${projectedDraft.x - originX}px`;
      draftCrumbElement.style.top = `${projectedDraft.y - originY}px`;
      draftCrumbElement.hidden = false;
    } else {
      draftCrumbElement.hidden = true;
    }
    if (projectedPhotoLocation) {
      photoLocationElement.style.left = `${projectedPhotoLocation.x - originX}px`;
      photoLocationElement.style.top = `${projectedPhotoLocation.y - originY}px`;
      photoLocationElement.hidden = false;
    } else {
      photoLocationElement.hidden = true;
    }
    if (userLocation) {
      const projectedUser = project(userLocation.latitude, userLocation.longitude, mapZoom);
      const userX = projectedUser.x - originX;
      const userY = projectedUser.y - originY;
      userLocationElement.style.left = `${userX}px`;
      userLocationElement.style.top = `${userY}px`;
      userLocationElement.hidden =
        userX < -24 || userX > width + 24 || userY < -24 || userY > height + 24;
    }
  }

  function changeMapZoom(direction) {
    const maximumMapZoom = Math.min(minimumMapZoom + 4, 19);
    const nextZoom = Math.min(
      Math.max((mapZoom ?? minimumMapZoom) + direction, minimumMapZoom),
      maximumMapZoom,
    );
    if (nextZoom === mapZoom) return;
    mapZoom = nextZoom;
    drawStaticFeatureMap();
  }

  function fitSiteMap() {
    focusedFeatureId = null;
    focusedPhotoLocation = null;
    mapZoom = null;
    drawStaticFeatureMap();
  }

  function setSiteMapExpanded(expanded) {
    section.classList.toggle("is-map-expanded", expanded);
    document.body.classList.toggle("has-site-map-open", expanded);
    expandMapButton?.setAttribute("aria-expanded", String(expanded));
    if (expandMapButton) expandMapButton.textContent = expanded ? "Close full map" : "Open full map";
    mapElement.querySelector("[data-site-map-expand]")?.setAttribute(
      "aria-label",
      expanded ? "Close full site map" : "Open full site map",
    );
    window.requestAnimationFrame(fitSiteMap);
  }

  window.openAuditMapSiteMap = () => {
    setSiteMapExpanded(true);
    mapElement.tabIndex = -1;
    window.setTimeout(() => mapElement.focus({ preventScroll: true }), 120);
  };
  if (expandMapButton) {
    expandMapButton.onclick = () =>
      setSiteMapExpanded(!section.classList.contains("is-map-expanded"));
  }
  mapElement.querySelector('[data-site-map-zoom="in"]')?.addEventListener("click", () => changeMapZoom(1));
  mapElement.querySelector('[data-site-map-zoom="out"]')?.addEventListener("click", () => changeMapZoom(-1));
  mapElement.querySelector("[data-site-map-fit]")?.addEventListener("click", fitSiteMap);
  mapElement.querySelector("[data-site-map-expand]")?.addEventListener("click", () =>
    setSiteMapExpanded(!section.classList.contains("is-map-expanded")));
  if (section.auditMapEscapeHandler) {
    document.removeEventListener("keydown", section.auditMapEscapeHandler);
  }
  section.auditMapEscapeHandler = (event) => {
    if (event.key === "Escape" && section.classList.contains("is-map-expanded")) {
      setSiteMapExpanded(false);
    }
  };
  document.addEventListener("keydown", section.auditMapEscapeHandler);

  mapElement.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      changeMapZoom(event.deltaY < 0 ? 1 : -1);
    },
    { passive: false },
  );
  mapElement.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 2) return;
      const [first, second] = event.touches;
      pinchDistance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
    },
    { passive: true },
  );
  mapElement.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length !== 2 || pinchDistance === null) return;
      event.preventDefault();
      const [first, second] = event.touches;
      const nextDistance = Math.hypot(
        second.clientX - first.clientX,
        second.clientY - first.clientY,
      );
      if (Math.abs(nextDistance - pinchDistance) < 34) return;
      changeMapZoom(nextDistance > pinchDistance ? 1 : -1);
      pinchDistance = nextDistance;
    },
    { passive: false },
  );
  mapElement.addEventListener("touchend", (event) => {
    if (event.touches.length < 2) pinchDistance = null;
  });
  if (navigator.geolocation) {
    locationWatchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        userLocation = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
        drawStaticFeatureMap();
      },
      () => {
        userLocationElement.hidden = true;
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      },
    );
    window.addEventListener(
      "pagehide",
      () => navigator.geolocation.clearWatch(locationWatchId),
      { once: true },
    );
  }
  drawStaticFeatureMap();
  const mapResizeObserver = new ResizeObserver(drawStaticFeatureMap);
  mapResizeObserver.observe(mapElement);
  mapElement.querySelectorAll("[data-feature-marker]").forEach((marker) => {
    marker.addEventListener("click", () =>
      selectFeature(marker.dataset.featureMarker, true, true));
  });
  mapElement.querySelectorAll("[data-crumb-marker]").forEach((marker) => {
    marker.addEventListener("click", () => {
      const cluster = crumbClusters[Number(marker.dataset.crumbMarker)];
      if (cluster?.media360?.length) {
        openPlace360Viewer(place, cluster.media360);
        return;
      }
      const commentId = cluster?.items[0]?.id;
      document.querySelector(`[data-comment-id="${CSS.escape(commentId || "")}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  });

  const unproject = (x, y, zoom) => {
    const worldSize = 256 * 2 ** zoom;
    const longitude = (x / worldSize) * 360 - 180;
    const mercator = Math.PI - (2 * Math.PI * y) / worldSize;
    const latitude = (180 / Math.PI) * Math.atan(Math.sinh(mercator));
    return { latitude, longitude };
  };
  mapElement.addEventListener("click", (event) => {
    if (!dropPinCallback || event.target.closest("button, a") || !currentProjection) return;
    const bounds = mapElement.getBoundingClientRect();
    draftCrumb = unproject(
      currentProjection.originX + event.clientX - bounds.left,
      currentProjection.originY + event.clientY - bounds.top,
      currentProjection.zoom,
    );
    drawStaticFeatureMap();
    dropPinCallback(draftCrumb);
  });
  mapElement.addEventListener("keydown", (event) => {
    if (!dropPinCallback || !currentProjection) return;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      const center = draftCrumb
        ? project(draftCrumb.latitude, draftCrumb.longitude, currentProjection.zoom)
        : {
            x: currentProjection.originX + mapElement.clientWidth / 2,
            y: currentProjection.originY + mapElement.clientHeight / 2,
          };
      if (event.key === "ArrowUp") center.y -= 12;
      if (event.key === "ArrowDown") center.y += 12;
      if (event.key === "ArrowLeft") center.x -= 12;
      if (event.key === "ArrowRight") center.x += 12;
      draftCrumb = unproject(center.x, center.y, currentProjection.zoom);
      drawStaticFeatureMap();
    }
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (!draftCrumb) {
        draftCrumb = unproject(
          currentProjection.originX + mapElement.clientWidth / 2,
          currentProjection.originY + mapElement.clientHeight / 2,
          currentProjection.zoom,
        );
      }
      dropPinCallback(draftCrumb);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      const cancel = dropPinCancel;
      draftCrumb = null;
      drawStaticFeatureMap();
      window.stopAuditMapCrumbPin?.();
      cancel?.();
    }
  });
  window.startAuditMapCrumbPin = (callback, onCancel) => {
    dropPinCallback = callback;
    dropPinCancel = onCancel;
    if (currentProjection) {
      draftCrumb = unproject(
        currentProjection.originX + mapElement.clientWidth / 2,
        currentProjection.originY + mapElement.clientHeight / 2,
        currentProjection.zoom,
      );
      drawStaticFeatureMap();
    }
    mapElement.classList.add("is-dropping-crumb");
    mapElement.tabIndex = 0;
    mapElement.setAttribute("aria-label", "Choose a crumb location. Use arrow keys to move the pin, then press Enter.");
    mapElement.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => mapElement.focus({ preventScroll: true }), 350);
  };
  window.stopAuditMapCrumbPin = () => {
    dropPinCallback = null;
    dropPinCancel = null;
    mapElement.classList.remove("is-dropping-crumb");
    mapElement.removeAttribute("tabindex");
    mapElement.setAttribute("aria-label", "Map of features within this place");
  };
  window.clearAuditMapCrumbPin = () => {
    draftCrumb = null;
    drawStaticFeatureMap();
  };

  function visibleFeatures() {
    if (activeFilter === "All") return features;
    return features.filter((feature) =>
      levels.length
        ? feature.level_label === activeFilter
        : featureCategory(feature) === activeFilter,
    );
  }

  function selectFeature(id, scrollCard = false, focusMap = false) {
    selectedId = id;
    focusedPhotoLocation = null;
    list.querySelectorAll("[data-feature-id]").forEach((card) => {
      card.classList.toggle("is-selected", card.dataset.featureId === id);
    });
    mapElement.querySelectorAll("[data-feature-marker]").forEach((marker) => {
      marker.classList.toggle("is-selected", marker.dataset.featureMarker === id);
    });
    if (scrollCard) {
      list.querySelector(`[data-feature-id="${CSS.escape(id)}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
    if (focusMap) {
      focusedFeatureId = id;
      mapZoom = Math.max(mapZoom ?? minimumMapZoom, minimumMapZoom + 1);
      drawStaticFeatureMap();
    }
  }

  window.focusAuditMapFeature = (id) => {
    if (!features.some((feature) => feature.id === id)) return false;
    selectFeature(id, true, true);
    explorer.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  };

  window.focusAuditMapLocation = ({ latitude, longitude, label, featureId } = {}) => {
    const photoLatitude = Number(latitude);
    const photoLongitude = Number(longitude);
    if (!Number.isFinite(photoLatitude) || !Number.isFinite(photoLongitude)) return false;
    if (featureId && features.some((feature) => feature.id === featureId)) {
      selectFeature(featureId, true, false);
    } else {
      selectedId = null;
      list.querySelectorAll("[data-feature-id]").forEach((card) => card.classList.remove("is-selected"));
      markerElements.forEach((marker) => marker.classList.remove("is-selected"));
    }
    focusedFeatureId = null;
    focusedPhotoLocation = {
      latitude: photoLatitude,
      longitude: photoLongitude,
      label: label || "Photo location",
    };
    photoLocationElement.setAttribute("aria-label", `${focusedPhotoLocation.label} photo location`);
    mapZoom = Math.max(mapZoom ?? minimumMapZoom, minimumMapZoom + 2);
    drawStaticFeatureMap();
    explorer.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  };

  function renderList() {
    const visible = visibleFeatures();
    count.textContent = `${visible.length} ${visible.length === 1 ? "feature" : "features"}`;
    list.innerHTML = visible
      .map((feature) => {
        const index = features.findIndex((item) => item.id === feature.id) + 1;
        const navigateUrl = `https://www.google.com/maps/dir/?api=1&destination=${feature.latitude},${feature.longitude}`;
        const imageUrl =
          feature.details?.imageUrl ||
          feature.details?.photoUrl ||
          feature.image_url ||
          "";
        const imageAlt = feature.details?.imageAlt || feature.name;
        const imageSourceUrl = feature.details?.imageSourceUrl || "";
        const imageCredit = feature.details?.imageAuthor || feature.source_label || "Photo source";
        const guideUrl =
          canonicalFeaturePath(place, feature) ||
          `/feature.html?place=${encodeURIComponent(place.id)}&feature=${encodeURIComponent(feature.id)}`;
        return `
          <article class="feature-card${feature.id === selectedId ? " is-selected" : ""}" data-feature-id="${escapeHtml(feature.id)}" tabindex="0">
            <a
              class="feature-card-media${imageUrl ? " has-image" : ""}"
              href="${escapeHtml(guideUrl)}"
              aria-label="View the full guide for ${escapeHtml(feature.name)}"
            >
              ${imageUrl
                ? `<img ${responsiveImageAttributes(imageUrl, { widths: [320, 480, 640], sizes: "(max-width: 720px) 82vw, 360px" })} alt="${escapeHtml(imageAlt)}" />`
                : `<span class="feature-photo-prompt"><b>+</b>Add a picture</span>`}
              <span class="feature-card-number">${index}</span>
              <span class="feature-card-kind">${escapeHtml(featureCategory(feature))}</span>
            </a>
            <div class="feature-card-body">
              <h3><a href="${escapeHtml(guideUrl)}">${escapeHtml(feature.name)}</a></h3>
              <span>${escapeHtml(feature.description || "Community details welcome.")}</span>
              <div class="feature-card-footer">
                <div class="feature-card-actions">
                  <a class="feature-card-guide" href="${escapeHtml(guideUrl)}">View guide <span aria-hidden="true">→</span></a>
                  <a class="feature-card-navigate" href="${navigateUrl}" target="_blank" rel="noreferrer" aria-label="Navigate to ${escapeHtml(feature.name)}" title="Navigate">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20.4 3.6 3.8 10.4c-.8.3-.8 1.5.1 1.7l6.8 1.3 1.3 6.8c.2.9 1.4.9 1.7.1l6.8-16.6c.3-.7-.4-1.4-1.1-1.1Z"></path>
                      <path d="m10.7 13.3 4.2-4.2"></path>
                    </svg>
                  </a>
                </div>
                ${imageSourceUrl
                  ? `<a class="feature-photo-credit" href="${escapeHtml(imageSourceUrl)}" target="_blank" rel="noreferrer">Photo: ${escapeHtml(imageCredit)}</a>`
                  : ""}
              </div>
            </div>
          </article>
        `;
      })
      .join("");
    list.querySelectorAll("[data-feature-id]").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (!event.target.closest("a, button") && list.dataset.scrolling !== "true") {
          const feature = features.find((item) => item.id === card.dataset.featureId);
          window.location.href =
            canonicalFeaturePath(place, feature) ||
            `/feature.html?place=${encodeURIComponent(place.id)}&feature=${encodeURIComponent(card.dataset.featureId)}`;
        }
      });
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          const feature = features.find((item) => item.id === card.dataset.featureId);
          window.location.href =
            canonicalFeaturePath(place, feature) ||
            `/feature.html?place=${encodeURIComponent(place.id)}&feature=${encodeURIComponent(card.dataset.featureId)}`;
        }
      });
    });
    list.querySelectorAll(".feature-card-navigate").forEach((link) => {
      link.addEventListener("click", () => {
        const featureId = link.closest("[data-feature-id]")?.dataset.featureId;
        rememberDirectionsIntent(place.id, featureId);
        trackAuditMapEvent("Directions opened", { place: place.id, feature: featureId || "unknown" });
        window.setTimeout(() => link.blur(), 0);
      });
    });
    list.querySelectorAll("[data-feature-photo]").forEach((button) => {
      button.addEventListener("click", () => {
        const feature = features.find((item) => item.id === button.dataset.featurePhoto);
        if (!feature) return;
        selectFeature(feature.id, true, true);
        window.openAuditMapCrumb?.("photo", { featureId: feature.id });
      });
    });
    list.onscroll = () => {
      list.dataset.scrolling = "true";
      window.clearTimeout(cardScrollEndTimer);
      cardScrollEndTimer = window.setTimeout(() => {
        delete list.dataset.scrolling;
      }, 80);
      if (cardScrollFrame !== null) return;
      cardScrollFrame = window.requestAnimationFrame(() => {
        cardScrollFrame = null;
        const cards = [...list.querySelectorAll("[data-feature-id]")];
        if (!cards.length) return;
        const horizontal = list.scrollWidth > list.clientWidth + 4;
        const listBounds = list.getBoundingClientRect();
        const listCenter = horizontal
          ? listBounds.left + listBounds.width / 2
          : listBounds.top + listBounds.height / 2;
        const closest = cards.reduce((nearest, card) => {
          const bounds = card.getBoundingClientRect();
          const center = horizontal
            ? bounds.left + bounds.width / 2
            : bounds.top + bounds.height / 2;
          const distance = Math.abs(center - listCenter);
          return !nearest || distance < nearest.distance ? { card, distance } : nearest;
        }, null);
        if (closest?.card.dataset.featureId !== selectedId) {
          selectFeature(closest.card.dataset.featureId, false, false);
        }
      });
    };
  }

  filters.innerHTML = filterValues
    .map(
      (value) =>
        `<button type="button" class="${value === activeFilter ? "is-active" : ""}" data-feature-filter="${escapeHtml(value)}">${escapeHtml(value)}</button>`,
    )
    .join("");
  filters.querySelectorAll("[data-feature-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.featureFilter;
      filters.querySelectorAll("button").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      mapElement.querySelectorAll("[data-feature-marker]").forEach((marker) => {
        const feature = features.find((item) => item.id === marker.dataset.featureMarker);
        const visible =
          activeFilter === "All" ||
          (levels.length
            ? feature.level_label === activeFilter
            : featureCategory(feature) === activeFilter);
        marker.hidden = !visible;
      });
      selectedId = visibleFeatures()[0]?.id;
      renderList();
      if (selectedId) selectFeature(selectedId);
    });
  });

  const ordinaryCrumbElements = crumbElements.filter((marker) => !marker.classList.contains("has-360"));
  if (ordinaryCrumbElements.length) {
    const crumbToggle = document.createElement("button");
    crumbToggle.type = "button";
    crumbToggle.className = "is-active crumb-layer-toggle";
    crumbToggle.textContent = `Crumbs ${ordinaryCrumbElements.length}`;
    crumbToggle.setAttribute("aria-pressed", "true");
    crumbToggle.addEventListener("click", () => {
      const active = crumbToggle.getAttribute("aria-pressed") !== "true";
      crumbToggle.setAttribute("aria-pressed", String(active));
      crumbToggle.classList.toggle("is-active", active);
      ordinaryCrumbElements.forEach((marker) => { marker.hidden = !active; });
    });
    filters.append(crumbToggle);
  }
  const view360Elements = crumbElements.filter((marker) => marker.classList.contains("has-360"));
  if (view360Elements.length) {
    const view360Toggle = document.createElement("button");
    view360Toggle.type = "button";
    view360Toggle.className = "is-active view-360-layer-toggle";
    view360Toggle.textContent = `360° views ${mapped360Count}`;
    view360Toggle.setAttribute("aria-pressed", "true");
    view360Toggle.addEventListener("click", () => {
      const active = view360Toggle.getAttribute("aria-pressed") !== "true";
      view360Toggle.setAttribute("aria-pressed", String(active));
      view360Toggle.classList.toggle("is-active", active);
      view360Elements.forEach((marker) => { marker.hidden = !active; });
    });
    filters.append(view360Toggle);
  }

  renderList();
}

function renderPlaceKnowledge(place, questions, contributions = { comments: [] }) {
  const section = document.querySelector("#place-knowledge");
  if (!section || !questions.length) return;
  section.hidden = false;
  const sourceToggle = document.querySelector("#knowledge-source-toggle");
  const sourceTotal = questions.reduce(
    (total, item) => total + (Array.isArray(item.answer_sources) ? item.answer_sources.length : 0),
    0,
  );
  if (sourceToggle) {
    sourceToggle.hidden = sourceTotal === 0;
    if (sourceToggle.dataset.ready !== "true") {
      sourceToggle.dataset.ready = "true";
      sourceToggle.addEventListener("click", () => {
        const visible = sourceToggle.getAttribute("aria-pressed") !== "true";
        sourceToggle.setAttribute("aria-pressed", String(visible));
        sourceToggle.textContent = visible ? "Hide sources" : "Show sources";
        section.classList.toggle("show-knowledge-sources", visible);
      });
    }
  }
  document.querySelector("#knowledge-count").textContent =
    `${questions.length} ${questions.length === 1 ? "answer" : "answers"}`;
  document.querySelector("#knowledge-list").innerHTML = questions
    .map((item) => {
      const sources = Array.isArray(item.answer_sources) ? item.answer_sources : [];
      const checked = formatAuditDate(item.answered_at);
      const intentKey = item.intent_key || slugify(item.sample_question);
      const answerKey = verifiedAnswerKey(intentKey, item.sample_question);
      const directNotes = (contributions.comments || []).filter(
        (comment) => comment.knowledgeIntent === intentKey,
      );
      const directNoteIds = new Set(directNotes.map((comment) => comment.id).filter(Boolean));
      const threadNotes = [
        ...directNotes,
        ...(contributions.comments || []).filter(
          (comment) => comment.parentId && directNoteIds.has(comment.parentId),
        ),
      ];
      return `
        <details class="knowledge-item" id="answer-${escapeHtml(answerKey)}" data-knowledge-intent="${escapeHtml(intentKey)}">
          <summary>
            <span>${escapeHtml(item.sample_question)}</span>
            <span aria-hidden="true">+</span>
          </summary>
          <p>${escapeHtml(item.canonical_answer)}</p>
          <div class="knowledge-meta">
            <span>${item.answer_status === "answered" ? "Sourced answer" : "Partial answer"}</span>
            <span>Researched ${escapeHtml(checked)}</span>
            <span>Asked ${Number(item.ask_count || 1)} ${Number(item.ask_count) === 1 ? "time" : "times"}</span>
          </div>
          ${
            sources.length
              ? `<div class="knowledge-sources">${sources
                  .map(
                    (source) =>
                      `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} ↗</a>`,
                  )
                  .join("")}</div>`
              : ""
          }
          <div class="knowledge-actions" aria-label="Respond to this answer">
            <button type="button" data-knowledge-helpful="${escapeHtml(intentKey)}">Helpful</button>
            ${item.answer_status === "answered" && sources.length ? `<button type="button" data-knowledge-share="${escapeHtml(answerKey)}">Share</button>` : ""}
            <button type="button" data-knowledge-follow-up="${escapeHtml(item.sample_question)}">Ask a follow-up</button>
            <button type="button" data-knowledge-note="${escapeHtml(intentKey)}" data-knowledge-question="${escapeHtml(item.sample_question)}">Add context</button>
            <button type="button" data-knowledge-confirm="${escapeHtml(intentKey)}" data-knowledge-question="${escapeHtml(item.sample_question)}">Confirm or update</button>
          </div>
          <details class="knowledge-thread">
            <summary>
              <span>Community notes</span>
              <span>${threadNotes.length}</span>
            </summary>
            <div class="knowledge-thread-list">
              ${
                threadNotes.length
                  ? threadNotes
                      .map(
                        (comment) => `
                          <article>
                            <div>
                              <strong>${escapeHtml(comment.author || "Local contributor")}</strong>
                              <span>${escapeHtml(
                                comment.context === "confirmation"
                                  ? "Confirmation"
                                  : comment.context === "question"
                                    ? "Follow-up"
                                    : comment.isAi
                                      ? comment.answerStatus === "needs_verification"
                                        ? "AI answer · needs review"
                                        : "Sourced AuditMap answer"
                                      : "Context",
                              )}</span>
                            </div>
                            <p>${escapeHtml(comment.text)}</p>
                          </article>
                        `,
                      )
                      .join("")
                  : '<p class="knowledge-thread-empty">No community notes yet. Add a useful detail from your visit.</p>'
              }
              <button type="button" class="knowledge-thread-add" data-knowledge-note="${escapeHtml(intentKey)}" data-knowledge-question="${escapeHtml(item.sample_question)}">Add context</button>
            </div>
          </details>
        </details>
      `;
    })
    .join("");

  const knowledgeItems = [
    ...document.querySelectorAll("#knowledge-list .knowledge-item"),
  ];
  knowledgeItems.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      knowledgeItems.forEach((otherItem) => {
        if (otherItem !== item) otherItem.open = false;
      });
    });
  });

  const helpfulState = getLocalRecord(`auditmap:helpful:${place.id}`, {});
  document.querySelectorAll("[data-knowledge-helpful]").forEach((button) => {
    const intentKey = button.dataset.knowledgeHelpful;
    button.classList.toggle("is-active", Boolean(helpfulState[intentKey]));
    button.textContent = helpfulState[intentKey] ? "Helpful ✓" : "Helpful";
    button.addEventListener("click", () => {
      helpfulState[intentKey] = !helpfulState[intentKey];
      button.classList.toggle("is-active", helpfulState[intentKey]);
      button.textContent = helpfulState[intentKey] ? "Helpful ✓" : "Helpful";
      setLocalRecord(`auditmap:helpful:${place.id}`, helpfulState);
    });
  });
  document.querySelectorAll("[data-knowledge-follow-up]").forEach((button) => {
    button.addEventListener("click", () => {
      window.openAuditMapAsk?.(
        `Can you elaborate on this answer: ${button.dataset.knowledgeFollowUp}`,
      );
    });
  });
  bindVerifiedAnswerSharing(place);
  function prepareContribution(button, type, prompt) {
    const form = document.querySelector("#contribution-form");
    const disclosure = form?.closest("details");
    if (!form || !disclosure) return;
    disclosure.open = true;
    form.elements.type.value = type;
    form.elements.comment.value = "";
    form.elements.comment.placeholder = prompt;
    form.dataset.knowledgeIntent = button.dataset.knowledgeNote || button.dataset.knowledgeConfirm;
    form.dataset.knowledgeQuestion = button.dataset.knowledgeQuestion;
    disclosure.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => form.elements.comment.focus({ preventScroll: true }), 350);
  }
  document.querySelectorAll("[data-knowledge-note]").forEach((button) => {
    button.addEventListener("click", () => {
      prepareContribution(button, "observation", "Add useful context for this specific answer...");
    });
  });
  document.querySelectorAll("[data-knowledge-confirm]").forEach((button) => {
    button.addEventListener("click", () => {
      prepareContribution(button, "confirmation", "Confirm what is accurate or explain what changed...");
    });
  });

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.sample_question,
      answerCount: item.ask_count,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.canonical_answer,
        dateCreated: item.answered_at,
        citation: (item.answer_sources || []).map((source) => source.url),
      },
    })),
  };
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(structuredData).replace(/</g, "\\u003c");
  document.head.append(script);
}

function verifiedAnswerShareUrl(intentKey) {
  const url = new URL(window.location.pathname, window.location.origin);
  url.searchParams.set("utm_source", "auditmap_share");
  url.searchParams.set("utm_medium", "answer");
  url.searchParams.set("utm_campaign", "verified_answer_loop");
  url.searchParams.set("utm_content", intentKey);
  url.hash = `answer-${intentKey}`;
  return url.toString();
}

function verifiedAnswerKey(intentKey, question) {
  let hash = 2166136261;
  for (const character of String(question || "")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${slugify(intentKey || "answer").slice(0, 24)}-${(hash >>> 0).toString(36)}`;
}

function bindVerifiedAnswerSharing(place) {
  document.querySelectorAll("[data-knowledge-share]").forEach((button) => {
    if (button.dataset.shareReady === "true") return;
    button.dataset.shareReady = "true";
    button.addEventListener("click", async () => {
      const intent = button.dataset.knowledgeShare;
      const url = verifiedAnswerShareUrl(intent);
      const intentGroup = button.closest(".knowledge-item")?.dataset.knowledgeIntent
        || intent.replace(/-[a-z0-9]+$/, "");
      const question = button.closest(".knowledge-item")?.querySelector("summary span")?.textContent?.trim() || "Sourced park answer";
      try {
        if (navigator.share) {
          await navigator.share({
            title: `${question} | ${place.name}`,
            text: `A sourced AuditMap answer about ${place.name}.`,
            url,
          });
          button.textContent = "Shared";
          trackAuditMapEvent("Verified answer shared", { place: place.id, answer: intent, intent: intentGroup, method: "native" });
        } else {
          await navigator.clipboard.writeText(url);
          button.textContent = "Link copied";
          trackAuditMapEvent("Verified answer shared", { place: place.id, answer: intent, intent: intentGroup, method: "copy" });
        }
      } catch (error) {
        if (error?.name !== "AbortError") button.textContent = "Try again";
      }
    });
  });
  const target = document.getElementById(window.location.hash.slice(1));
  if (target?.classList.contains("knowledge-item")) {
    target.open = true;
    if (campaignAttribution().campaign === "verified_answer_loop") {
      trackAuditMapEvent("Shared answer opened", {
        place: place.id,
        intent: target.dataset.knowledgeIntent
          || target.id.replace(/^answer-/, "").replace(/-[a-z0-9]+$/, ""),
      });
    }
    window.setTimeout(() => target.scrollIntoView({ block: "center" }), 0);
  }
}

async function submitSharedContribution(place, contribution) {
  if (!activeAccountSession?.accessToken) {
    openAccountDialog("conversation");
    return null;
  }
  try {
    const response = await fetch("/api/feed", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${activeAccountSession.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        place,
        ...contribution,
      }),
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function submitStewardApplication(place, application) {
  try {
    const response = await fetch("/api/stewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place, ...application }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dateInputValue(value = new Date()) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.valueOf() - offset).toISOString().slice(0, 10);
}

function stripJpegMetadata(blob) {
  return blob.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return blob;
    const chunks = [bytes.slice(0, 2)];
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      if (marker === 0xda) {
        chunks.push(bytes.slice(offset));
        offset = bytes.length;
        break;
      }
      if (marker === 0xd9) break;
      const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
      if (length < 2 || offset + length + 2 > bytes.length) break;
      if (marker !== 0xe1 && marker !== 0xfe) {
        chunks.push(bytes.slice(offset, offset + length + 2));
      }
      offset += length + 2;
    }
    return new Blob(chunks, { type: "image/jpeg" });
  });
}

async function imageSource(blob) {
  if (window.createImageBitmap) {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Safari can decode some iPhone formats through an image element but not createImageBitmap.
    }
  }
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    close: () => URL.revokeObjectURL(url),
  };
}

async function normalizeCrumbMedia(file, mediaKind) {
  const decoded = await imageSource(file);
  const maximumWidth = mediaKind === "photo" ? 3200 : 8192;
  const scale = Math.min(1, maximumWidth / decoded.width);
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));
  if (mediaKind === "photo_360" && Math.abs(width / height - 2) > 0.04) {
    decoded.close();
    throw new Error("A true 360 photo must be a 2:1 image exported by a 360 camera.");
  }
  if (mediaKind === "photo_360" && file.type === "image/jpeg" && scale === 1) {
    decoded.close();
    return { blob: await stripJpegMetadata(file), width, height, mimeType: "image/jpeg" };
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d", { alpha: false }).drawImage(decoded.source, 0, 0, width, height);
  decoded.close();
  const quality = mediaKind === "photo" ? 0.84 : 0.86;
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("This image could not be prepared.")), "image/jpeg", quality);
  });
  return { blob, width, height, mimeType: "image/jpeg" };
}

async function sha256Hex(blob) {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function resumableCrumbUpload(blob, intent, fileName, onProgress) {
  if (!window.tus?.Upload) {
    return Promise.reject(new Error("Resumable uploads are still loading. Try again in a moment."));
  }
  return new Promise((resolve, reject) => {
    const upload = new window.tus.Upload(blob, {
      endpoint: intent.endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: { "x-signature": intent.uploadToken },
      metadata: {
        bucketName: intent.bucket,
        objectName: intent.storagePath,
        contentType: blob.type || "image/jpeg",
        cacheControl: "31536000",
      },
      onError: reject,
      onProgress(bytesUploaded, bytesTotal) {
        onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100));
      },
      onSuccess: resolve,
    });
    upload.findPreviousUploads().then((uploads) => {
      if (uploads.length) upload.resumeFromPreviousUpload(uploads[0]);
      upload.start();
    }).catch(reject);
  });
}

async function uploadCrumbMedia(place, file, mediaKind, target, authorName, onProgress) {
  if (!activeAccountSession?.accessToken) throw new Error("Sign in to add media.");
  const prepared = await normalizeCrumbMedia(file, mediaKind);
  const intentResponse = await fetch("/api/media?action=intent", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${activeAccountSession.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      placeId: place.id,
      featureId: target.featureId,
      latitude: target.latitude,
      longitude: target.longitude,
      locationScope: target.scope,
      locationLabel: target.label,
      mediaKind,
      fileName: file.name || `${mediaKind}.jpg`,
      mimeType: prepared.mimeType,
      sizeBytes: prepared.blob.size,
      authorName,
      altText: `${place.name} community ${mediaKind === "photo_360" ? "360 view" : mediaKind}`,
      clientSanitized: true,
    }),
  });
  const intent = await intentResponse.json().catch(() => ({}));
  if (!intentResponse.ok) throw new Error(intent.error || "Upload could not start.");
  await resumableCrumbUpload(prepared.blob, intent, file.name, onProgress);
  const completeResponse = await fetch("/api/media?action=complete", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${activeAccountSession.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mediaId: intent.mediaId,
      width: prepared.width,
      height: prepared.height,
      checksum: await sha256Hex(prepared.blob),
      capturedAt: new Date(file.lastModified || Date.now()).toISOString(),
    }),
  });
  const completed = await completeResponse.json().catch(() => ({}));
  if (!completeResponse.ok) throw new Error(completed.error || "Upload could not be verified.");
  return {
    mediaId: intent.mediaId,
    previewUrl: URL.createObjectURL(prepared.blob),
    kind: mediaKind,
    width: prepared.width,
    height: prepared.height,
  };
}

function crumbTypeConfig(value) {
  return {
    note: { contributionType: "observation", topic: "evergreen", label: "Note or tip" },
    update: { contributionType: "observation", topic: "condition", label: "Visit update" },
    photo: { contributionType: "observation", topic: "evergreen", label: "Photo" },
    panorama: { contributionType: "observation", topic: "evergreen", label: "Panorama / 360°" },
    verify: { contributionType: "confirmation", topic: "amenity", label: "Verify or correct" },
    question: { contributionType: "question", topic: "evergreen", label: "Question" },
  }[value] || { contributionType: "observation", topic: "evergreen", label: "Note or tip" };
}

function initCrumbExperience(place, contributions, features = [], options = {}) {
  const legacy = document.querySelector(".contribution-disclosure, #feature-contribution-form");
  const discussion = document.querySelector("#discussion");
  if (!legacy || !discussion || document.querySelector("#crumb-dialog")) return;
  legacy.hidden = true;
  const card = discussion.querySelector(".community-crumb-cta") || document.createElement("section");
  card.className = "crumb-invitation";
  card.innerHTML = `
    <span class="crumb-invitation-mark" aria-hidden="true"></span>
    <div class="crumb-invitation-copy"><p class="kicker">Help the next person</p><h2>What do you know about this place?</h2><p>A useful answer, a recent change, or one corrected detail can make somebody’s visit easier.</p></div>
    <div class="crumb-quick-actions" aria-label="Contribute to this place">
      <button type="button" data-open-crumb data-crumb-launch="question"><strong>Ask</strong><span>Get a local answer</span></button>
      <button type="button" data-open-crumb data-crumb-launch="note"><strong>Share</strong><span>Add a tip or update</span></button>
      <button type="button" data-open-crumb data-crumb-launch="verify"><strong>Fix or confirm</strong><span>Improve the record</span></button>
    </div>
  `;
  if (!card.isConnected) discussion.querySelector(".community-feed")?.before(card);
  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="crumb-dialog" id="crumb-dialog" aria-labelledby="crumb-title">
      <form class="crumb-sheet" id="crumb-form">
        <div class="crumb-sheet-heading">
          <div><p class="kicker">Community for this place</p><h2 id="crumb-title">Help with ${escapeHtml(place.name)}</h2><p id="crumb-dialog-intro">Start with what you want to do. We’ll only ask for details that make it useful.</p></div>
          <button class="icon-button" type="button" data-close-crumb aria-label="Close">${navIcon("close")}</button>
        </div>
        <section class="crumb-step">
          <div><h3>What would you like to do?</h3><div class="crumb-type-grid">
            ${[
              ["question", "Ask", "Get help from people who know this place"],
              ["note", "Share", "Add a tip, update, photo, or wider view"],
              ["verify", "Fix or confirm", "Make the public record more reliable"],
            ].map(([value, label, copy]) => `<button type="button" data-crumb-type="${value}"${value === "note" ? ' class="is-active" aria-pressed="true"' : ' aria-pressed="false"'}><strong>${label}</strong><small>${copy}</small></button>`).join("")}
          </div><div class="crumb-share-options" aria-label="What would you like to share?">
            <span>Share as</span>
            ${[["note", "Tip"], ["update", "Current conditions"], ["photo", "Photo"], ["panorama", "Panorama / 360°"]].map(([value, label]) => `<button type="button" data-crumb-detail="${value}"${value === "note" ? ' class="is-active" aria-pressed="true"' : ' aria-pressed="false"'}>${label}</button>`).join("")}
          </div></div>
        </section>
        <section class="crumb-step">
          <div><h3>Where will this help?</h3><div class="crumb-target-options">
            <button type="button" class="is-active" data-crumb-target="place" aria-pressed="true">Whole park</button>
            ${features.length ? '<button type="button" data-crumb-target="feature" aria-pressed="false">Mapped area</button>' : ""}
            <button type="button" data-crumb-target="location" aria-pressed="false">Use my location</button>
            <button type="button" data-crumb-target="pin" aria-pressed="false"${window.startAuditMapCrumbPin ? "" : " disabled"}>Drop a pin</button>
          </div>
          <select id="crumb-feature" hidden aria-label="Choose a mapped area">${features.map((feature) => `<option value="${escapeHtml(feature.id)}">${escapeHtml(feature.name)}</option>`).join("")}</select>
          <p class="crumb-location-status" id="crumb-location-status">This crumb will help with the whole park.</p></div>
        </section>
        <section class="crumb-step">
          <div class="crumb-compose"><h3 id="crumb-message-heading">What should the next visitor know?</h3><textarea name="message" maxlength="4000" aria-labelledby="crumb-message-heading" placeholder="A practical detail, what changed, or what you noticed..."></textarea>
          <label>Observed on<input name="observedAt" type="date" value="${dateInputValue()}" max="${dateInputValue()}" /></label>
          <label class="crumb-topic-picker" hidden>What kind of update?<select name="topic"><option value="condition">Trail or condition update</option><option value="closure">Closure or urgent access change</option><option value="hours">Hours changed</option><option value="amenity">Amenity changed</option><option value="evergreen">A lasting tip</option></select></label>
          <div class="crumb-verification-kind" hidden><label><input type="radio" name="verificationKind" value="confirmation" checked /> Confirm a detail</label><label><input type="radio" name="verificationKind" value="correction" /> Correct something</label></div>
          <div class="crumb-media-kind" hidden><label><input type="radio" name="mediaKind" value="panorama" checked /> Wide panorama</label><label><input type="radio" name="mediaKind" value="photo_360" /> True 360°</label></div>
          <label class="crumb-media-picker" hidden><input name="media" type="file" accept="image/*" multiple /><span>${navIcon("plus")} Add from Camera, Photos, or Files</span><small>Up to 3. True 360° images must use a 2:1 format.</small></label>
          <div class="crumb-media-preview" id="crumb-media-preview"></div></div>
        </section>
        <label class="crumb-consent"><input name="consent" type="checkbox" required /><span id="crumb-consent-copy">I’m sharing this to help other visitors, and it does not expose anyone’s private information.</span></label>
        <div class="crumb-submit-row"><p class="form-status" id="crumb-status" role="status"></p><button class="submit-button" type="submit">Share with this place</button></div>
      </form>
    </dialog>
  `);

  const dialog = document.querySelector("#crumb-dialog");
  const form = document.querySelector("#crumb-form");
  const status = document.querySelector("#crumb-status");
  const featureSelect = document.querySelector("#crumb-feature");
  const mediaPicker = form.elements.media.closest("label");
  const mediaKindOptions = form.querySelector(".crumb-media-kind");
  const topicPicker = form.querySelector(".crumb-topic-picker");
  const verificationKind = form.querySelector(".crumb-verification-kind");
  const preview = document.querySelector("#crumb-media-preview");
  let selectedType = "note";
  let target = { scope: "place", label: place.name };

  const selectType = (type) => {
    const intentType = ["question", "verify"].includes(type) ? type : "note";
    selectedType = type;
    form.querySelectorAll("[data-crumb-type]").forEach((item) => {
      const active = item.dataset.crumbType === intentType;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    form.querySelector(".crumb-share-options").hidden = intentType !== "note";
    form.querySelectorAll("[data-crumb-detail]").forEach((item) => {
      const active = item.dataset.crumbDetail === type;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    const needsMedia = ["photo", "panorama"].includes(type);
    mediaPicker.hidden = !needsMedia;
    mediaKindOptions.hidden = type !== "panorama";
    topicPicker.hidden = type !== "update";
    verificationKind.hidden = type !== "verify";
    document.querySelector("#crumb-consent-copy").textContent = needsMedia
      ? "I took these images or have permission to share them. They do not expose anyone’s private information."
      : "I’m sharing this to help other visitors, and it does not expose anyone’s private information.";
    if (type === "photo") form.elements.mediaKind.value = "photo";
    const prompts = {
      question: ["What would you like to ask?", "Ask something a person who knows this place could answer..."],
      verify: ["What did you confirm or correct?", "Name the detail and what you found during your visit..."],
      update: ["What changed?", "Share current conditions, access changes, or something time-sensitive..."],
      photo: ["What does this photo help show?", "Add a short description so everyone can understand what matters..."],
      panorama: ["What does this wider view show?", "Add context about where this view was taken and what it helps explain..."],
      note: ["What should the next visitor know?", "Share a practical tip or a detail that is easy to miss..."],
    };
    document.querySelector("#crumb-message-heading").textContent = prompts[type]?.[0] || prompts.note[0];
    form.elements.message.placeholder = prompts[type]?.[1] || prompts.note[1];
  };

  const open = (type = "note", openOptions = {}) => {
    trackAuditMapEvent("Crumb started", { place: place.id, type });
    if (!activeAccountSession?.accessToken) {
      openAccountDialog("contribute");
      return;
    }
    if (openOptions.featureId && featureSelect) {
      featureSelect.value = openOptions.featureId;
      form.querySelector('[data-crumb-target="feature"]')?.click();
    }
    selectType(type);
    dialog.showModal();
  };
  window.openAuditMapCrumb = open;

  const offerReturnContribution = () => {
    if (document.visibilityState === "hidden" || document.querySelector("#directions-return-prompt")) return;
    const intent = takeRecentDirectionsIntent(place.id);
    if (!intent) return;
    const feature = features.find((item) => item.id === intent.featureId);
    const variant = directionsReturnVariant();
    const copy = directionsReturnVariants[variant];
    const prompt = document.createElement("aside");
    prompt.id = "directions-return-prompt";
    prompt.className = "directions-return-prompt";
    prompt.setAttribute("aria-label", "Share something from your visit");
    prompt.innerHTML = `
      <div><strong>${copy.heading}</strong><span>${copy.detail}</span></div>
      <button type="button" data-return-contribute>${copy.action}</button>
      <button type="button" class="directions-return-dismiss" data-return-dismiss aria-label="Dismiss">${navIcon("close")}</button>
    `;
    document.body.append(prompt);
    trackAuditMapEvent("Return contribution prompt shown", {
      place: place.id,
      feature: feature?.id || "whole-place",
      variant,
    });
    prompt.querySelector("[data-return-contribute]").addEventListener("click", () => {
      prompt.remove();
      trackAuditMapEvent("Return contribution prompt accepted", {
        place: place.id,
        feature: feature?.id || "whole-place",
        variant,
      });
      open("update", feature ? { featureId: feature.id } : {});
    });
    prompt.querySelector("[data-return-dismiss]").addEventListener("click", () => {
      prompt.remove();
      trackAuditMapEvent("Return contribution prompt dismissed", { place: place.id, variant });
    });
  };
  window.addEventListener("pageshow", offerReturnContribution);
  document.addEventListener("visibilitychange", offerReturnContribution);
  document.addEventListener("auditmap:directions-return-check", offerReturnContribution);
  window.setTimeout(offerReturnContribution, 0);
  document.querySelectorAll("[data-open-crumb]").forEach((button) => button.addEventListener("click", () => open(button.dataset.crumbLaunch || "note")));
  dialog.querySelector("[data-close-crumb]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  form.querySelector(".crumb-type-grid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-crumb-type]");
    if (!button) return;
    selectType(button.dataset.crumbType);
  });
  form.querySelector(".crumb-share-options").addEventListener("click", (event) => {
    const button = event.target.closest("[data-crumb-detail]");
    if (button) selectType(button.dataset.crumbDetail);
  });
  form.querySelector(".crumb-target-options").addEventListener("click", (event) => {
    const button = event.target.closest("[data-crumb-target]");
    if (!button || button.disabled) return;
    const mode = button.dataset.crumbTarget;
    const setActive = () => form.querySelectorAll("[data-crumb-target]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    if (mode === "place") {
      window.clearAuditMapCrumbPin?.();
      target = { scope: "place", label: place.name };
      featureSelect.hidden = true;
      setActive();
      document.querySelector("#crumb-location-status").textContent = "This crumb will help with the whole park.";
    } else if (mode === "feature") {
      window.clearAuditMapCrumbPin?.();
      const feature = features.find((item) => item.id === featureSelect.value) || features[0];
      target = { scope: "feature", featureId: feature?.id, label: feature?.name };
      featureSelect.hidden = false;
      setActive();
      document.querySelector("#crumb-location-status").textContent = `Attached to ${feature?.name}.`;
    } else if (mode === "location") {
      window.clearAuditMapCrumbPin?.();
      status.textContent = "Finding your location…";
      navigator.geolocation?.getCurrentPosition(({ coords }) => {
        target = { scope: "pin", latitude: coords.latitude, longitude: coords.longitude, accuracyMeters: coords.accuracy, label: "Contributor-confirmed location" };
        setActive();
        status.textContent = "";
        document.querySelector("#crumb-location-status").textContent = `Public pin: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} · accuracy about ${Math.round(coords.accuracy)} m`;
      }, () => { status.textContent = "Location was not available. You can drop a pin instead."; }, { enableHighAccuracy: true, timeout: 15000 });
    } else if (mode === "pin") {
      dialog.close();
      window.startAuditMapCrumbPin?.((point) => {
        target = { scope: "pin", ...point, label: "Dropped park pin" };
        setActive();
        window.stopAuditMapCrumbPin?.();
        dialog.showModal();
        document.querySelector("#crumb-location-status").textContent = `Public pin: ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
      }, () => dialog.showModal());
    }
  });
  featureSelect?.addEventListener("change", () => {
    const feature = features.find((item) => item.id === featureSelect.value);
    target = { scope: "feature", featureId: feature?.id, label: feature?.name };
    document.querySelector("#crumb-location-status").textContent = `Attached to ${feature?.name}.`;
  });
  form.elements.media.addEventListener("change", () => {
    preview.innerHTML = "";
    [...form.elements.media.files].slice(0, 3).forEach((file) => {
      const item = document.createElement("figure");
      item.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Selected contribution" /><figcaption>${escapeHtml(file.name)} · ${(file.size / 1024 / 1024).toFixed(1)} MB</figcaption>`;
      preview.append(item);
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const config = crumbTypeConfig(selectedType);
    if (selectedType === "update") config.topic = form.elements.topic.value;
    if (selectedType === "verify") config.contributionType = form.elements.verificationKind.value;
    const message = form.elements.message.value.trim();
    const files = [...form.elements.media.files].slice(0, 3);
    const mediaRequired = ["photo", "panorama"].includes(selectedType);
    if (!message && !files.length) {
      status.textContent = "Add a note or image first.";
      return;
    }
    if (mediaRequired && !files.length) {
      status.textContent = "Choose at least one image for this crumb.";
      return;
    }
    if (!activeAccountSession?.accessToken) {
      status.textContent = "Sign in to share this crumb with the community.";
      openAccountDialog("contribute");
      return;
    }
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    const uploaded = [];
    try {
      for (let index = 0; index < files.length; index += 1) {
        status.textContent = `Preparing image ${index + 1} of ${files.length}…`;
        const mediaKind = selectedType === "photo" ? "photo" : form.elements.mediaKind.value;
        uploaded.push(await uploadCrumbMedia(
          place,
          files[index],
          mediaKind,
          target,
          activeAccountUser?.user_metadata?.name || "Local contributor",
          (percent) => { status.textContent = `Uploading image ${index + 1} of ${files.length} · ${percent}%`; },
        ));
      }
      status.textContent = "Sending your crumb for review…";
      const requestBody = {
        place,
        authorName: activeAccountUser?.user_metadata?.name || "Local contributor",
        type: config.contributionType,
        topic: config.topic,
        body: message || `Added ${config.label.toLowerCase()} media.`,
        featureId: target.featureId,
        target,
        observedAt: new Date(`${form.elements.observedAt.value}T12:00:00`).toISOString(),
        mediaIds: uploaded.map((item) => item.mediaId),
        submittedAt: new Date().toISOString(),
      };
      let payload = {};
      let localOnly = false;
      try {
        const response = await fetch("/api/feed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(activeAccountSession?.accessToken ? { Authorization: `Bearer ${activeAccountSession.accessToken}` } : {}),
          },
          body: JSON.stringify(requestBody),
        });
        payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (!files.length && target.scope === "place" && response.status >= 500) localOnly = true;
          else throw new Error(payload.error || "This crumb could not be shared.");
        }
      } catch (error) {
        if (!files.length && target.scope === "place" && error instanceof TypeError) localOnly = true;
        else throw error;
      }
      const newContribution = {
        id: payload.contribution?.id || `local-${crypto.randomUUID()}`,
        author: activeAccountUser?.user_metadata?.name || "Local contributor",
        text: message || `Added ${config.label.toLowerCase()} media.`,
        context: config.contributionType,
        featureId: target.featureId || null,
        submittedAt: new Date().toISOString(),
        latitude: target.latitude,
        longitude: target.longitude,
        locationScope: target.scope,
        locationLabel: target.label,
        media: uploaded.map((item) => ({
          kind: item.kind,
          url: item.previewUrl,
          previewUrl: item.previewUrl,
          width: item.width,
          height: item.height,
          featureId: target.featureId || null,
          latitude: target.latitude,
          longitude: target.longitude,
          locationScope: target.scope,
          locationLabel: target.label,
        })),
        moderationPending: !localOnly && payload.contribution?.moderation_status !== "published",
        localOnly,
      };
      contributions.comments.unshift(newContribution);
      const storedContributions = uploaded.length
        ? { ...contributions, comments: contributions.comments.map((item) => item === newContribution ? { ...item, media: [] } : item) }
        : contributions;
      setLocalRecord(`auditmap:${place.id}`, storedContributions);
      if (options.onSubmitted) options.onSubmitted(newContribution);
      else renderReviews(place, contributions);
      status.textContent = localOnly
        ? "Crumb saved on this device. It can be shared when community publishing is connected."
        : payload.contribution?.moderation_status === "published"
        ? "Crumb shared. You made the next visit easier."
        : "Crumb received. It is waiting for a quick safety review; recognition is added after approval.";
      trackAuditMapEvent("Crumb submitted", { place: place.id, type: selectedType });
      submit.textContent = "Shared";
      window.setTimeout(() => {
        dialog.close();
        form.reset();
        submit.textContent = "Share with this place";
        status.textContent = "";
        preview.innerHTML = "";
        window.clearAuditMapCrumbPin?.();
      }, 1800);
    } catch (error) {
      status.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
  if (options.featureId && featureSelect) {
    featureSelect.value = options.featureId;
    form.querySelector('[data-crumb-target="feature"]')?.click();
  }
  const contributionParams = new URLSearchParams(window.location.search);
  const requestedContribution = contributionParams.get("contribute");
  if (["note", "update", "photo", "panorama", "verify", "question"].includes(requestedContribution)) {
    window.setTimeout(() => open(requestedContribution, {
      featureId: contributionParams.get("feature") || options.featureId,
    }), 120);
  }
}

function cardMedia(place) {
  const coverImage = place.image || place.images?.[0];
  if (!coverImage?.url) {
    return `
      <span class="card-image-wrap missing-photo-card" aria-label="This place could use a picture">
        ${missingPhotoIcon()}
        <small>Add one</small>
      </span>
    `;
  }
  return `
    <span class="card-image-wrap">
      <img class="card-image" ${responsiveImageAttributes(coverImage.url, { widths: [320, 480, 640], sizes: "(max-width: 720px) 38vw, 160px" })} alt="" />
    </span>
  `;
}

function missingPhotoIcon() {
  return `
    <svg class="missing-photo-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M9.5 17.5h7l2.8-4h9.4l2.8 4h7a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3h-29a3 3 0 0 1-3-3v-16a3 3 0 0 1 3-3Z" />
      <circle cx="24" cy="28" r="7" />
      <path class="missing-photo-spark" d="M38 7v7M34.5 10.5h7M10 7v4M8 9h4" />
    </svg>
  `;
}

function formatPlaceAddress(place) {
  const address = String(place?.address || "").trim();
  const city = String(place?.city || "").trim();
  const state = String(place?.state || "").trim();
  const normalized = address.toLowerCase();
  const parts = address ? [address] : [];
  if (city && !normalized.includes(city.toLowerCase())) parts.push(city);
  if (state && !new RegExp(`(^|[^a-z])${state.toLowerCase()}([^a-z]|$)`).test(normalized)) {
    parts.push(state);
  }
  return parts.join(", ");
}

function officialFactCatalog(place) {
  const coreFacts = [
    ["hours", "Hours", place.hours],
    ["cost", "Cost and fees", place.cost],
    ["accessibility", "Accessibility", place.accessibility],
    ["transit", "Transit and arrival", place.transit],
    ["amenities", "Amenities", (place.amenities || []).join(", ")],
    ["address", "Address", formatPlaceAddress(place)],
  ]
    .filter(([, , value]) => isDocumentedFact(value))
    .map(([key, label, value]) => {
      const factSource = place.factSources?.[key];
      return {
        key,
        label,
        value,
        scope: "place",
        sourceLabel: factSource?.label || place.sourceLabel,
        sourceUrl: factSource?.url || place.source,
        checkedAt: factSource?.checkedAt || place.verifiedAt || null,
        expiresAt: factSource?.expiresAt || null,
        sourceType: factSource?.sourceType || "official",
        verificationStatus: place.factVerificationStatus?.[key] || "verified",
      };
    });
  const answerFacts = (place.searchAnswers || []).map((answer) => ({
    key: answer.intentKey || slugify(answer.question),
    label: answer.question,
    value: answer.answer,
    scope: "place",
    sourceLabel: answer.sourceLabel || place.sourceLabel,
    sourceUrl: answer.source || place.source,
    checkedAt: answer.checkedAt || place.verifiedAt || null,
    expiresAt: answer.expiresAt || null,
    sourceType: answer.sourceType || "official",
    verificationStatus: answer.verificationStatus || "verified",
  }));
  const featureFacts = (place.features || []).flatMap((feature) => {
    const sourceLabel =
      feature.details?.informationSourceLabel || feature.source_label || place.sourceLabel;
    const sourceUrl =
      feature.details?.informationSourceUrl || feature.source_url || place.source;
    const shared = {
      scope: "feature",
      featureId: feature.id,
      featureType: feature.feature_type,
      positionQuality: feature.details?.positionQuality || null,
      sourceLabel,
      sourceUrl,
      checkedAt:
        feature.details?.informationCheckedAt || feature.verified_at || place.verifiedAt || null,
      expiresAt: null,
      sourceType: "official",
    };
    return [
      {
        ...shared,
        key: `feature-description:${feature.slug || feature.id}`,
        label: `What is ${feature.name}?`,
        value: feature.description,
      },
      ...(feature.details?.locationContext
        ? [{
            ...shared,
            key: `feature-location:${feature.slug || feature.id}`,
            label: `Where is ${feature.name} within ${place.name}?`,
            value: feature.details.locationContext,
          }]
        : []),
      ...(feature.details?.needToKnow
        ? [{
            ...shared,
            key: `feature-guidance:${feature.slug || feature.id}`,
            label: `What should visitors know about ${feature.name}?`,
            value: feature.details.needToKnow,
          }]
        : []),
      ...(feature.details?.searchAnswers || []).map((answer) => ({
        ...shared,
        key: `feature-answer:${feature.slug || feature.id}:${answer.intentKey || slugify(answer.question)}`,
        label: answer.question,
        value: answer.answer,
        sourceLabel: answer.sourceLabel || shared.sourceLabel,
        sourceUrl: answer.source || shared.sourceUrl,
        checkedAt: answer.checkedAt || shared.checkedAt,
        expiresAt: answer.expiresAt || null,
      })),
    ].filter((fact) => isDocumentedFact(fact.value));
  });
  return [...coreFacts, ...answerFacts, ...featureFacts];
}

function askPlaceContext(place, focusedFeature = null) {
  return {
    id: place.id,
    name: place.name,
    type: place.type,
    city: place.city,
    address: place.address,
    summary: place.summary,
    hours: place.hours,
    cost: place.cost,
    accessibility: place.accessibility,
    transit: place.transit,
    amenities: place.amenities || [],
    officialCatalog: officialFactCatalog(place),
    features: window.auditMapAskFeatures || [],
    focusedFeature: focusedFeature
      ? {
          id: focusedFeature.id,
          name: focusedFeature.name,
          type: focusedFeature.feature_type,
          description: focusedFeature.description,
          positionQuality: focusedFeature.details?.positionQuality,
          locationContext: focusedFeature.details?.locationContext,
          needToKnow: focusedFeature.details?.needToKnow,
          searchAnswers: focusedFeature.details?.searchAnswers || [],
          latitude: focusedFeature.latitude,
          longitude: focusedFeature.longitude,
          sourceLabel:
            focusedFeature.details?.informationSourceLabel || focusedFeature.source_label,
          source:
            focusedFeature.details?.informationSourceUrl || focusedFeature.source_url,
          checkedAt:
            focusedFeature.details?.informationCheckedAt || focusedFeature.verified_at,
        }
      : null,
    url: placeUrl(place),
  };
}

function featureNeedToKnowQuestions(place, feature) {
  const subject = feature.name;
  const parent = place.name;
  const type = String(feature.feature_type || "")
    .toLowerCase()
    .replaceAll("_", "-");
  const categoryText = `${type} ${subject}`.toLowerCase();
  const exactLocation = `Where exactly is ${subject} within ${parent}?`;
  const parking = `Where should I park and enter for ${subject}?`;
  const restroom = `Where is the nearest restroom to ${subject}?`;
  const accessible = `What is the accessible route to ${subject}?`;
  const closed = `Is ${subject} open and available today?`;

  if (/pool|aquatic center|barton springs/.test(categoryText)) {
    return [
      `What are the hours and admission details for ${subject}?`,
      `What water conditions or seasonal rules apply at ${subject}?`,
      `Are lifeguards or family areas available at ${subject}?`,
      parking,
      `Are changing areas and restrooms near ${subject}?`,
      accessible,
    ];
  }
  if (/dog/.test(categoryText)) {
    return [
      `What are the leash and entry rules at ${subject}?`,
      `Are small and large dogs separated at ${subject}?`,
      `Is water or shade available at ${subject}?`,
      parking,
      restroom,
      closed,
    ];
  }
  if (
    type === "sports" ||
    /court|active oval|golf|skating|fitness/.test(subject.toLowerCase())
  ) {
    return [
      `Do I need a reservation to use ${subject}?`,
      `What surface, equipment, or field rules apply at ${subject}?`,
      `Is ${subject} lighted or limited to certain hours?`,
      parking,
      restroom,
      accessible,
    ];
  }
  if (/playground|play-plaza|playscape/.test(categoryText)) {
    return [
      `What ages and kinds of play is ${subject} best for?`,
      `What is the play surface like at ${subject}?`,
      `Is there shade, seating, or water play near ${subject}?`,
      parking,
      restroom,
      accessible,
    ];
  }
  if (/splash|spray|water-play/.test(categoryText)) {
    return [
      `When is the water running at ${subject}?`,
      `What should families bring to ${subject}?`,
      `Are changing areas and restrooms near ${subject}?`,
      parking,
      accessible,
      closed,
    ];
  }
  if (/visitor-center|visitor center|café|cafe/.test(categoryText)) {
    return [
      `When is ${subject} open?`,
      `What visitor services are available at ${subject}?`,
      parking,
      `Where is the entrance to ${subject}?`,
      accessible,
      restroom,
    ];
  }
  if (
    /museum|zoo|observatory|science center|historic house|cottage/.test(categoryText) &&
    !/temple to music/.test(categoryText)
  ) {
    return [
      `What are the hours and admission details for ${subject}?`,
      `What should I expect to see at ${subject}?`,
      parking,
      `Where is the entrance to ${subject}?`,
      accessible,
      restroom,
    ];
  }
  if (/theatre|theater|amphitheater|pavilion|playhouse|temple to music|event-space/.test(categoryText)) {
    return [
      `What events or programs happen at ${subject}?`,
      `Can ${subject} be reserved?`,
      parking,
      restroom,
      accessible,
      closed,
    ];
  }
  if (/garden|nature|arboretum|conservatory/.test(categoryText)) {
    return [
      `What is most notable to see at ${subject}?`,
      `When is the best season to visit ${subject}?`,
      `What are the paths and terrain like at ${subject}?`,
      exactLocation,
      parking,
      accessible,
    ];
  }
  if (/art|landmark|monument|memorial|troll|public-art/.test(categoryText)) {
    return [
      exactLocation,
      `What should I look for at ${subject}?`,
      `What is the story behind ${subject}?`,
      `What is the walking surface and terrain near ${subject}?`,
      parking,
      accessible,
    ];
  }
  if (/trail|trailhead/.test(categoryText)) {
    return [
      `Which trail or route starts at ${subject}?`,
      `What are the distance, surface, and difficulty near ${subject}?`,
      `Are strollers or wheelchairs practical at ${subject}?`,
      parking,
      restroom,
      closed,
    ];
  }
  if (/water|lake|pond|beach|fountain|falls/.test(categoryText)) {
    return [
      `What activities are allowed at ${subject}?`,
      `What safety or seasonal conditions should I know at ${subject}?`,
      `How do I reach the water at ${subject}?`,
      parking,
      restroom,
      accessible,
    ];
  }
  if (/restroom/.test(categoryText)) {
    return [
      exactLocation,
      `When are the restrooms at ${subject} open?`,
      `Is ${subject} wheelchair accessible?`,
      `Are changing tables or family facilities available at ${subject}?`,
      parking,
    ];
  }
  if (/seasonal|sunflower|flower field/.test(categoryText)) {
    return [
      `When is ${subject} open or in season?`,
      `What is the best way to experience ${subject}?`,
      `What is the walking surface and terrain near ${subject}?`,
      parking,
      restroom,
      accessible,
    ];
  }
  if (/recreation/.test(type)) {
    return [
      `What activities is ${subject} best for?`,
      `Do events or reservations affect use of ${subject}?`,
      `What is the surface and terrain like at ${subject}?`,
      parking,
      restroom,
      accessible,
    ];
  }
  return [
    `What should I know before visiting ${subject}?`,
    exactLocation,
    parking,
    restroom,
    accessible,
    closed,
  ];
}
window.auditMapFeatureNeedToKnowQuestions = featureNeedToKnowQuestions;

function predictedNeedToKnow(place, feature = null) {
  if (feature) return featureNeedToKnowQuestions(place, feature);
  const subject = feature?.name || place.name;
  const type = String(feature?.feature_type || place.type || "").toLowerCase();
  const questions = [
    `Where should I park for ${subject}?`,
    `Where is the nearest restroom to ${subject}?`,
    `Is ${subject} accessible for wheelchairs or strollers?`,
  ];
  if (/play|splash|water/.test(type)) {
    questions.push(`What should families bring to ${subject}?`);
  } else if (/dog/.test(type)) {
    questions.push(`What are the dog rules at ${subject}?`);
  } else if (/trail|field|garden|art|troll/.test(type)) {
    questions.push(`What is the walking surface and terrain near ${subject}?`);
  } else {
    questions.push(`What should I know before visiting ${subject}?`);
  }
  questions.push(`Is anything at ${subject} closed or unavailable today?`);
  return questions;
}

function initAskAuditMap() {
  const shell = document.createElement("section");
  shell.className = "ask-auditmap";
  shell.innerHTML = `
    <div class="ask-backdrop" hidden></div>
    <button class="ask-launcher" type="button" aria-expanded="false" aria-controls="ask-panel" hidden>
      <span class="ask-mark" aria-hidden="true">A°</span>
      <span>Ask AuditMap</span>
    </button>
    <div class="ask-panel" id="ask-panel" hidden>
      <div class="ask-heading">
        <div>
          <p class="kicker">Ask AuditMap</p>
          <h2>What would you like to know?</h2>
        </div>
        <button class="ask-close" type="button" aria-label="Close">${navIcon("close")}</button>
      </div>
      <div class="ask-messages" aria-live="polite">
        <div class="ask-message is-assistant">Select a place to ask a question.</div>
      </div>
      <div class="ask-starters" aria-label="Need to know questions" hidden></div>
      <form class="ask-form">
        <label class="sr-only" for="ask-input">Ask AuditMap a question</label>
        <textarea id="ask-input" name="question" rows="1" maxlength="500" autocomplete="off" enterkeyhint="send" placeholder="Ask any question" required></textarea>
        <button type="submit" aria-label="Send question">${navIcon("arrowUp")}</button>
      </form>
      <p class="ask-note">Answers use available records and may be incomplete. Check cited sources before visiting.</p>
    </div>
  `;
  document.body.append(shell);

  const launcher = shell.querySelector(".ask-launcher");
  const backdrop = shell.querySelector(".ask-backdrop");
  const panel = shell.querySelector(".ask-panel");
  const close = shell.querySelector(".ask-close");
  const form = shell.querySelector(".ask-form");
  const input = shell.querySelector("#ask-input");
  const messages = shell.querySelector(".ask-messages");
  const starters = shell.querySelector(".ask-starters");
  const submit = form.querySelector("button");
  const history = [];
  let currentPlace = null;
  let currentFeature = null;
  let currentPlaces = [];
  let mapPlaces = [];
  let mapContextSignature = "";
  let currentStarters = [];
  window.setAuditMapAskFeatures = (features) => {
    window.auditMapAskFeatures = (features || []).map((feature) => ({
      id: feature.id,
      name: feature.name,
      type: feature.feature_type,
      description: feature.description,
      level: feature.level_label,
      positionQuality: feature.details?.positionQuality,
      locationContext: feature.details?.locationContext,
      needToKnow: feature.details?.needToKnow,
      latitude: feature.latitude,
      longitude: feature.longitude,
      sourceLabel: feature.details?.informationSourceLabel || feature.source_label,
      source: feature.details?.informationSourceUrl || feature.source_url,
      checkedAt: feature.details?.informationCheckedAt || feature.verified_at,
    }));
  };

  function setOpen(open) {
    panel.hidden = !open;
    backdrop.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("has-open-ask", open);
    if (open) window.setTimeout(() => input.focus(), 50);
  }

  function publishAskContext(label = "") {
    const detail = {
      ready: currentPlaces.length > 0,
      label,
      starters: currentStarters,
    };
    window.auditMapAskContext = detail;
    document.dispatchEvent(new CustomEvent("auditmap:ask-context", { detail }));
  }

  function addMessage(text, role, links = []) {
    const message = document.createElement("div");
    message.className = `ask-message is-${role}`;
    const copy = document.createElement("p");
    copy.textContent = text;
    message.append(copy);
    if (links.length) {
      const linkList = document.createElement("div");
      linkList.className = "ask-links";
      links.forEach((link) => {
        const anchor = document.createElement("a");
        anchor.href = link.url;
        anchor.textContent = link.name;
        linkList.append(anchor);
      });
      message.append(linkList);
    }
    messages.append(message);
    messages.scrollTop = messages.scrollHeight;
  }

  function setAskContext(place, feature = null) {
    if (!place && page === "map" && mapPlaces.length) {
      currentPlace = null;
      currentFeature = null;
      setOpen(false);
      setMapContext(mapPlaces, { force: true });
      return;
    }
    currentPlace = place || null;
    currentFeature = feature || null;
    currentPlaces = currentPlace ? [currentPlace] : [];
    setOpen(false);
    launcher.hidden = !currentPlace;
    history.length = 0;
    input.value = "";
    resizeAskInput();
    starters.hidden = !currentPlace;
    if (!currentPlace) {
      currentStarters = [];
      publishAskContext();
      return;
    }
    const subject = currentFeature?.name || currentPlace.name;
    const question = `What would you like to know about ${subject}?`;
    panel.querySelector(".ask-heading h2").textContent = question;
    messages.innerHTML = "";
    addMessage(
      currentFeature
        ? `${currentFeature.name} is within ${currentPlace.name}. Ask about this exact area or use the need-to-know questions below.`
        : `${question} Use a common need-to-know question below or ask anything about planning a visit.`,
      "assistant",
    );
    input.placeholder = `Ask about ${subject}`;
    currentStarters = predictedNeedToKnow(currentPlace, currentFeature);
    starters.innerHTML = currentStarters
      .map(
        (starter) =>
          `<button type="button" data-ask-starter="${escapeHtml(starter)}">${escapeHtml(starter)}</button>`,
      )
      .join("");
    publishAskContext(`Ask about ${subject}`);
  }

  function setMapContext(places, { force = false } = {}) {
    mapPlaces = (places || []).slice(0, 30);
    const signature = mapPlaces.map((place) => place.id).join("|");
    if (currentPlace) {
      mapContextSignature = signature;
      return;
    }
    if (!force && signature === mapContextSignature) return;
    mapContextSignature = signature;
    currentFeature = null;
    currentPlaces = mapPlaces;
    if (!currentPlaces.length) currentStarters = [];
    launcher.hidden = !currentPlaces.length;
    if (!panel.hidden || !currentPlaces.length) {
      publishAskContext(currentPlaces.length ? "Ask about this map" : "");
      return;
    }
    history.length = 0;
    input.value = "";
    resizeAskInput();
    panel.querySelector(".ask-heading h2").textContent = "What would you like to find?";
    messages.innerHTML = "";
    addMessage(
      `Ask about the ${currentPlaces.length} public ${currentPlaces.length === 1 ? "place" : "places"} currently in view. I will use AuditMap's available records and sources.`,
      "assistant",
    );
    input.placeholder = "Ask about this map";
    currentStarters = [
      "Which places have restrooms?",
      "Find a place for kids and grandparents",
      "Which places have accessible paths?",
      "What can I visit for free?",
    ];
    starters.hidden = false;
    starters.innerHTML = currentStarters
      .map((starter) => `<button type="button" data-ask-starter="${escapeHtml(starter)}">${escapeHtml(starter)}</button>`)
      .join("");
    publishAskContext("Ask about this map");
  }

  window.setAuditMapAskPlace = (place) => setAskContext(place);
  window.setAuditMapAskFeature = (place, feature) => setAskContext(place, feature);
  window.setAuditMapAskPlaces = (places) => setMapContext(places);
  window.openAuditMapAsk = (question = "") => {
    if (!currentPlaces.length) return false;
    input.value = question;
    resizeAskInput();
    setOpen(true);
    if (question) form.requestSubmit();
    return true;
  };

  function resizeAskInput() {
    input.style.height = "0px";
    input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
  }

  starters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-ask-starter]");
    if (!button) return;
    input.value = button.dataset.askStarter;
    form.requestSubmit();
  });

  launcher.addEventListener("click", () => setOpen(panel.hidden));
  backdrop.addEventListener("click", () => setOpen(false));
  close.addEventListener("click", () => setOpen(false));
  input.addEventListener("input", resizeAskInput);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    addMessage(question, "visitor");
    input.value = "";
    resizeAskInput();
    submit.disabled = true;
    submit.innerHTML = '<span aria-hidden="true">…</span>';
    const context = currentPlace
      ? [askPlaceContext(currentPlace, currentFeature)]
      : currentPlaces.map((place) => askPlaceContext(place));
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, places: context, history }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      const answerLinks = [
        ...(payload.sources || []).map((source) => ({
          name: source.title,
          url: source.url,
        })),
        ...(payload.links || []),
      ];
      addMessage(payload.answer, "assistant", answerLinks);
      history.push(
        { role: "visitor", text: question },
        { role: "assistant", text: payload.answer },
      );
    } catch {
      addMessage("I could not answer that right now. Please try again in a moment.", "assistant");
    } finally {
      submit.disabled = false;
      submit.innerHTML = navIcon("arrowUp");
      input.focus();
    }
  });
}

function getPlaceRating(place) {
  const contributions = normalizeContributions(getStoredContributions(place.id));
  const communityRatings = contributions.comments
    .map((comment) => Number(comment.rating))
    .filter((rating) => rating >= 1 && rating <= 5);
  if (communityRatings.length) {
    return {
      value:
        communityRatings.reduce((sum, rating) => sum + rating, 0) /
        communityRatings.length,
      label: `${communityRatings.length} AuditMap ${communityRatings.length === 1 ? "rating" : "ratings"}`,
    };
  }
  const externalCount = Number(place.externalRating?.count);
  const externalSource = place.externalRating?.source || "External rating";
  return {
    value: Number(place.externalRating?.value || place.rating || 0),
    label:
      externalCount > 0
        ? `${externalSource} · ${externalCount.toLocaleString()} reviews`
        : externalSource,
  };
}

function documentationScore(place) {
  const checks = [
    Boolean(place.image?.url || place.images?.length),
    Boolean(place.address && !place.address.toLowerCase().includes("not yet")),
    Boolean(place.hours && !place.hours.toLowerCase().includes("not yet")),
    Boolean(place.accessibility && !place.accessibility.toLowerCase().includes("not yet")),
    Boolean(place.website || place.contact?.website),
    Boolean(place.summary),
    !place.discoveryStatus,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function placeSearchText(place) {
  return [
    place.name,
    place.type,
    place.city,
    place.state,
    place.neighborhood,
    place.address,
    place.hours,
    place.cost,
    place.accessibility,
    place.transit,
    place.summary,
    place.description,
    ...(place.amenities || []),
    ...(place.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const searchStopWords = new Set([
  "a", "an", "and", "at", "for", "in", "near", "of", "or", "that", "the", "to", "with",
]);

const searchSynonyms = {
  bathroom: ["bathroom", "restroom", "toilet"],
  bathrooms: ["bathroom", "restroom", "toilet"],
  hike: ["hike", "hiking", "trail", "greenway"],
  hiking: ["hike", "hiking", "trail", "greenway"],
  kid: ["kid", "kids", "children", "family", "playground", "play area"],
  kids: ["kid", "kids", "children", "family", "playground", "play area"],
  restroom: ["bathroom", "restroom", "toilet"],
  restrooms: ["bathroom", "restroom", "toilet"],
  wheelchair: ["wheelchair", "accessible", "step-free"],
};

function searchQueryTokens(query) {
  return String(query || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !searchStopWords.has(token));
}

function placeMatchesSearch(place, query) {
  const tokens = searchQueryTokens(query);
  if (!tokens.length) return true;
  const haystack = placeSearchText(place);
  return tokens.every((token) =>
    (searchSynonyms[token] || [token]).some((candidate) => haystack.includes(candidate)),
  );
}

function isPlaceOpenNow(place) {
  if (typeof place.openNow === "boolean") return place.openNow;
  const hours = String(place.openingHours || place.hours || "")
    .toLowerCase()
    .replaceAll(".", "");
  if (!hours || /not yet|see .*current hours|vary|schedule/.test(hours)) return false;

  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const day = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (hours.includes("24/7")) return true;
  if (hours.includes("open daily")) {
    return !hours.includes("dawn to dusk") || (currentMinutes >= 360 && currentMinutes < 1200);
  }

  const dayIndexes = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };
  const dayMatches = (segment) => {
    const match = segment.match(/\b(sun|mon|tue|wed|thu|fri|sat)(?:-(sun|mon|tue|wed|thu|fri|sat))?/);
    if (!match) return false;
    const start = dayIndexes[match[1]];
    const end = dayIndexes[match[2] || match[1]];
    return start <= end ? day >= start && day <= end : day >= start || day <= end;
  };
  const toMinutes = (hour, minute, meridiem) => {
    let value = Number(hour) % 12;
    if (meridiem === "pm") value += 12;
    return value * 60 + Number(minute || 0);
  };

  return hours.split(";").some((segment) => {
    if (!dayMatches(segment)) return false;
    const match = segment.match(
      /(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/,
    );
    if (!match) return false;
    const start = toMinutes(match[1], match[2], match[3]);
    const end = toMinutes(match[4], match[5], match[6]);
    return currentMinutes >= start && currentMinutes < end;
  });
}

const visitFilterRules = {
  open: isPlaceOpenNow,
  free: (place) => /\bfree\b/.test(String(place.cost || "").toLowerCase()),
  kids: (place) => /\b(playground|play areas?|children|family|carousel)\b/.test(placeSearchText(place)),
  dogs: (place) => {
    const guidance = String(place.dogs || place.petPolicy || "").toLowerCase();
    if (/\b(no dogs|dogs? (?:are )?not allowed|prohibited)\b/.test(guidance)) return false;
    return /\b(dog park|dogs?|leash|pet friendly)\b/.test(guidance || placeSearchText(place));
  },
  accessible: (place) => {
    const accessibility = String(place.accessibility || "").toLowerCase();
    return (
      /\b(accessible|wheelchair|step-free)\b/.test(accessibility) &&
      !/\b(need|unknown|verify|check|not yet)\b/.test(accessibility)
    );
  },
  restrooms: (place) => {
    const details = String(place.restrooms || place.restroom || "").toLowerCase();
    return /\b(restrooms?|bathrooms?|toilets?)\b/.test(details) &&
      !/\b(no|none|not available|not yet|unknown|verify|check)\b/.test(details);
  },
  parking: (place) => {
    const details = String(place.parking || "").toLowerCase();
    return /\b(parking lot|on-site parking|onsite parking|street parking|parking garage|parking spaces?)\b/.test(details) &&
      !/\b(no parking|not available|not yet|unknown|verify|check)\b/.test(details);
  },
  transit: (place) => {
    const details = String(place.transit || "").toLowerCase();
    return /\b(bus|train|transit|light rail|subway|streetcar)\b/.test(details) &&
      !/\b(no transit|not available|not yet|unknown|verify|check)\b/.test(details);
  },
};

const placeTypeFilterRules = {
  parks: (place) => /\b(park|garden|arboretum|nature preserve|natural area|botanical)\b/.test(placeSearchText(place)),
  trails: (place) => /\b(trail|greenway|walking path|hiking)\b/.test(placeSearchText(place)),
  play: (place) => /\b(playground|play area|splash pad|sprayground)\b/.test(placeSearchText(place)),
  sports: (place) => /\b(sports?|athletic|ball field|soccer|tennis|basketball|golf|skate|recreation center)\b/.test(placeSearchText(place)),
  libraries: (place) => /\blibrar(?:y|ies)\b/.test(placeSearchText(place)),
  culture: (place) => /\b(museum|gallery|historic|history|memorial|monument|public art|arts? center)\b/.test(placeSearchText(place)),
  community: (place) => /\b(community center|civic center|public market|plaza|town square)\b/.test(placeSearchText(place)),
  waterfront: (place) => /\b(beach|waterfront|riverfront|lakefront|swimming|boat launch)\b/.test(placeSearchText(place)),
};

function mapPopupContent(place) {
  const coverImage = place.image || place.images?.[0];
  const mappedDestinationCount = explorerPlaceFeatures(place).length;
  const rating = getPlaceRating(place);
  const hoursStatus = dailyHoursStatus(
    place.hours,
    placeTimeZone(place),
    new Date(),
    place,
  );
  const placeContext = [place.type, place.neighborhood || place.city]
    .filter(Boolean)
    .join(" · ");
  const description =
    place.summary ||
    `A public ${String(place.type || "place").toLowerCase()} in ${place.neighborhood || place.city || "the community"}.`;
  return `
    <div class="map-preview${explorerEligible(place) ? " has-explorer" : ""}">
    <a class="map-preview-main${coverImage?.url ? " has-image" : " has-photo-prompt"}" href="${escapeHtml(`${placeUrl(place)}&from=map`)}" aria-label="Open the full listing for ${escapeHtml(place.name)}">
      <div class="map-preview-copy">
        <p class="map-preview-type">${escapeHtml(placeContext)}</p>
        <h2>${escapeHtml(place.name)}</h2>
        ${
          rating.value
            ? `<p class="map-preview-rating" aria-label="${rating.value.toFixed(1)} out of 5 stars">
                <strong>${rating.value.toFixed(1)}</strong>
                <span aria-hidden="true">★</span>
                <span>${escapeHtml(rating.label)}</span>
              </p>`
            : ""
        }
        <div class="map-preview-hours">
          <p class="map-preview-status is-${escapeHtml(hoursStatus.state)}">
            <span aria-hidden="true"></span>
            <strong>${escapeHtml(hoursStatus.label)}</strong>
            <small>${escapeHtml(hoursStatus.summary)}</small>
          </p>
          <p class="map-preview-hours-line">
            <strong>Hours</strong>
            <span>${escapeHtml(place.hours || "Not yet documented")}</span>
          </p>
        </div>
        <p class="map-preview-description">${escapeHtml(description)}</p>
        <span class="map-preview-link">View full place</span>
      </div>
      ${
        coverImage?.url
          ? `<img ${responsiveImageAttributes(coverImage.url, { widths: [320, 480, 640], sizes: "280px" })} alt="" />`
          : `<span class="missing-photo-state missing-photo-popup">
              ${missingPhotoIcon()}
              <strong>Picture this place</strong>
              <small>Be the one who puts it on the map.</small>
            </span>`
      }
    </a>
    ${explorerEligible(place) ? `
      <button class="map-preview-explorer" type="button" data-map-preview-explorer data-place-id="${escapeHtml(place.id)}" data-city-slug="${escapeHtml(citySlug(place))}">
        <span><strong>Explore inside</strong><small>${mappedDestinationCount} mapped destinations</small></span>
        <b aria-hidden="true">Inside →</b>
      </button>
    ` : ""}
    </div>
  `;
}

const mapPersonaStorageKey = "auditmap:map-persona";

function mapLocationPersona(label = "You") {
  if (label !== "You") {
    return { avatarUrl: "", initial: String(label || "P").slice(0, 1).toUpperCase() };
  }
  const storedPersona = getLocalRecord(mapPersonaStorageKey, {});
  const displayName =
    activeAccountUser?.user_metadata?.full_name ||
    activeAccountUser?.user_metadata?.name ||
    storedPersona.displayName ||
    "You";
  return {
    avatarUrl: activeAccountUser?.app_metadata?.auditmap_avatar_url || storedPersona.avatarUrl || "",
    initial: String(displayName).slice(0, 1).toUpperCase(),
  };
}

function userLocationMarkerMarkup(label = "You") {
  const persona = mapLocationPersona(label);
  return `
    <span class="user-location-marker">
      <span class="user-location-pulse"></span>
      <span class="user-location-dot${persona.avatarUrl ? " has-avatar" : ""}">
        <span class="user-location-heading" aria-hidden="true"></span>
        <span class="user-location-avatar">${persona.avatarUrl
          ? `<img src="${escapeHtml(persona.avatarUrl)}" alt="" />`
          : escapeHtml(persona.initial)}</span>
      </span>
      <span class="user-location-label">${escapeHtml(label)}</span>
    </span>
  `;
}

async function initMapPage() {
  const list = document.querySelector("#place-list");
  const count = document.querySelector("#results-count");
  const search = document.querySelector("#search-input");
  const searchForm = document.querySelector("#state-search-form");
  const searchSuggestions = document.querySelector("#search-suggestions");
  const cityHeading = document.querySelector("#city-heading");
  const areaSummary = document.querySelector("#area-summary");
  const filterRow = document.querySelector("#filter-row");
  const filterDialog = document.querySelector("#filter-dialog");
  const filterDialogForm = document.querySelector("#filter-dialog-form");
  const visitFilterOptions = document.querySelector("#visit-filter-options");
  const typeFilterOptions = document.querySelector("#type-filter-options");
  const filterResultsPreview = document.querySelector("#filter-results-preview");
  const applyFilterButton = document.querySelector("#apply-filter-button");
  const filterLaunchButtons = [
    document.querySelector("#toolbar-filter-button"),
    document.querySelector("#card-filter-button"),
    document.querySelector("#map-dock-filter"),
  ].filter(Boolean);
  const filterCountBadges = [...document.querySelectorAll("[data-filter-count]")];
  const locationButton = document.querySelector("#location-button");
  const locationButtonLabel = document.querySelector("#location-button-label");
  const locationStatus = document.querySelector("#location-status");
  const searchAreaButton = document.querySelector("#search-area-button");
  const mapZoomNote = document.querySelector("#map-zoom-note");
  const mapGestureHint = document.querySelector("#map-gesture-hint");
  const mapGuideStatus = document.querySelector("#map-guide-status");
  const mapGuideCopy = document.querySelector("#map-guide-copy");
  const mapGuideKicker = document.querySelector("#map-guide-kicker");
  const mapGuideFeedback = document.querySelector("#map-guide-feedback");
  const mapGuideProgress = document.querySelector("#map-guide-progress");
  const mapGuideCompass = document.querySelector("#map-guide-compass");
  const mapGuideMode = document.querySelector(".map-guide-mode");
  const mapGuideRecenter = document.querySelector("#map-guide-recenter");
  const mapGuideStep = document.querySelector("#map-guide-step");
  const mapGuideStop = document.querySelector("#map-guide-stop");
  const mapExplorerPanel = document.querySelector("#map-explorer-panel");
  const mapExplorerTitle = document.querySelector("#map-explorer-title");
  const mapExplorerDirections = document.querySelector("#map-explorer-directions");
  const mapExplorerExit = document.querySelector("#map-explorer-exit");
  const mapExplorerSummary = document.querySelector("#map-explorer-summary");
  const mapExplorerArrival = document.querySelector("#map-explorer-arrival");
  const mapExplorerDestinations = document.querySelector("#map-explorer-destinations");
  const mapExplorerSelection = document.querySelector("#map-explorer-selection");
  const mapDockLocate = document.querySelector("#map-dock-locate");
  const mapDockRadiusLabel = document.querySelector("#map-dock-radius-label");
  const radiusDialog = document.querySelector("#radius-dialog");
  const radiusForm = document.querySelector("#radius-form");
  const sheetHandle = document.querySelector("#sheet-handle");
  const sheetMapReturn = document.querySelector("#sheet-map-return");
  const placesSidebar = list.closest(".places-sidebar");
  const mobilePlacePreview = document.querySelector("#mobile-place-preview");
  const mapStartOverlay = document.querySelector("#map-start-overlay");
  const mapStartNearby = document.querySelector("#map-start-nearby");
  const mapStartSearchForm = document.querySelector("#map-start-search-form");
  const mapStartSearch = document.querySelector("#map-start-search-input");
  const mapStartSuggestions = document.querySelector("#map-start-suggestions");
  const mapStartStatus = document.querySelector("#map-start-status");
  const mapStartBrowse = document.querySelector("#map-start-browse");
  const earlyMapParams = new URLSearchParams(window.location.search);
  const previewGuideMode = earlyMapParams.get("previewGuide") === "1";
  const previewLocationMode = earlyMapParams.get("previewLocation") === "away"
    ? "away"
    : "nearby";
  const storedMapView = getLocalRecord("auditmap:last-map-view", null);
  const mapEntryComplete = Boolean(getLocalRecord("auditmap:map-entry-complete", false));
  const validStoredMapView =
    Number.isFinite(Number(storedMapView?.latitude)) &&
    Number.isFinite(Number(storedMapView?.longitude)) &&
    Number.isFinite(Number(storedMapView?.zoom));
  const canResumeLocalMap =
    !earlyMapParams.get("city") &&
    earlyMapParams.get("browse") !== "all" &&
    mapEntryComplete &&
    validStoredMapView &&
    Number(storedMapView.zoom) >= 9;
  const canPaintNationwideMapImmediately =
    !earlyMapParams.get("city") &&
    earlyMapParams.get("restore") !== "map" &&
    !canResumeLocalMap;
  const mapInteractionOptions = {
    zoomControl: true,
    dragging: true,
    touchZoom: true,
    doubleClickZoom: true,
    scrollWheelZoom: true,
    keyboard: true,
  };
  const earlyMap = canPaintNationwideMapImmediately
    ? L.map("map", mapInteractionOptions).setView([39.5, -98.35], 4)
    : null;
  if (earlyMap) {
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(earlyMap);
  }
  // The static nationwide catalog is enough for first paint; do not hold the map
  // behind a cold community API response.
  let places = await loadPlaces({ sharedTimeoutMs: 250 });
  const parkDirectoryLink = document.querySelector("#park-directory-link");
  if (parkDirectoryLink) {
    const nationwideParkCount = places.filter(isSearchPark).length;
    parkDirectoryLink.textContent = `Browse ${nationwideParkCount} parks`;
    parkDirectoryLink.setAttribute(
      "aria-label",
      `Browse the nationwide directory of ${nationwideParkCount} major parks`,
    );
  }
  let cities = [...new Map(places.map((place) => [citySlug(place), place])).entries()];
  const placeTypes = [...new Set([...places.map((place) => place.type), "Dog park"])].sort();
  const mapParams = earlyMapParams;
  const requestedCity = mapParams.get("city");
  const requestedExplorerId = mapParams.get("explore");
  const shouldRestoreMap = mapParams.get("restore") === "map";
  const storedSearchArea = getLocalRecord("auditmap:last-search-area", null);
  const hasStoredMapView =
    (shouldRestoreMap || canResumeLocalMap) && validStoredMapView;
  let activeCity = cities.some(([slug]) => slug === requestedCity)
    ? requestedCity
    : hasStoredMapView && cities.some(([slug]) => slug === storedMapView.activeCity)
      ? storedMapView.activeCity
      : null;
  const activeVisitFilters = new Set();
  const activeTypeFilters = new Set();
  let activeMinRating = 0;
  let userLocation = null;
  let userLocationMarker = null;
  let locationWatchId = null;
  let locationLoadInProgress = false;
  let nearbyMode = false;
  let viewportMode = hasStoredMapView;
  let nationwideMode = !requestedCity && !hasStoredMapView;
  let currentArea = {
    name: hasStoredMapView ? storedMapView.name : initialAreaName(),
    label: hasStoredMapView ? storedMapView.label : initialAreaName(),
  };
  let mapMoveTimer = null;
  let areaRequestId = 0;
  let suppressMoveResponse = false;
  let mapMovementSource = "user";
  let mapMovementResetTimer = null;
  let markerPulseTimer = null;
  let selectedMobilePlace = null;
  let activeExplorerPlace = null;
  let activeExplorerFeature = null;
  let explorerShowAll = false;
  let explorerMarkersAnimated = false;
  let explorerReturnView = null;
  let explorerReturnPlace = null;
  let sheetPointerStart = null;
  let sheetTouchStart = null;
  let sidebarTouchStart = null;
  let previewPointerStart = null;
  let previewTouchStart = null;
  let mobileCarouselPlaces = [];
  let sheetWasDragged = false;
  let lastSheetGestureAt = 0;
  let lastPreviewGestureAt = 0;
  let searchRadiusMiles = Math.min(
    50,
    Math.max(2, Number(getLocalRecord("auditmap:search-radius-miles", 10)) || 10),
  );
  const maxRenderedResults = 50;

  function rememberMapEntry(method) {
    setLocalRecord("auditmap:map-entry-complete", true);
    setLocalRecord("auditmap:last-map-entry-method", method);
  }

  function closeMapStart(method = "search") {
    if (!mapStartOverlay || mapStartOverlay.hidden) return;
    mapStartOverlay.hidden = true;
    document.body.classList.remove("has-map-start");
    document.querySelector(".map-page")?.removeAttribute("inert");
    rememberMapEntry(method);
    window.setTimeout(() => map.invalidateSize(), 120);
  }

  function showMapStartLocationFallback(message) {
    if (!mapStartOverlay || mapStartOverlay.hidden) return;
    mapStartNearby.disabled = false;
    mapStartNearby.querySelector("strong").textContent = "Use my location";
    mapStartNearby.querySelector("small").textContent = "Show public places close to me";
    mapStartStatus.textContent = message;
    mapStartSearch.focus({ preventScroll: true });
  }

  function searchRadiusMeters() {
    return Math.round(searchRadiusMiles * 1609.344);
  }

  function syncRadiusControl() {
    if (mapDockRadiusLabel) mapDockRadiusLabel.textContent = `${searchRadiusMiles} mi`;
    radiusForm
      ?.querySelectorAll('input[name="radius"]')
      .forEach((input) => { input.checked = Number(input.value) === searchRadiusMiles; });
  }

  syncRadiusControl();

  const visitFilterChoices = [
    { value: "open", label: "Open now", hint: "Based on documented hours", quick: true },
    { value: "free", label: "Free", hint: "No documented admission fee", quick: true },
    { value: "kids", label: "Good for kids", hint: "Family or play features", quick: true },
    { value: "dogs", label: "Dogs welcome", hint: "Documented dog access", quick: true },
    { value: "accessible", label: "Accessible", hint: "Documented step-free access", quick: true },
    { value: "restrooms", label: "Restrooms", hint: "Documented visitor facilities" },
    { value: "parking", label: "Parking", hint: "Documented parking options" },
    { value: "transit", label: "Public transit", hint: "Documented transit access" },
  ];
  const placeTypeFilterChoices = [
    { value: "parks", label: "Parks & nature", hint: "Parks, gardens, and preserves" },
    { value: "trails", label: "Trails & greenways", hint: "Walking, hiking, and biking routes" },
    { value: "play", label: "Play & splash", hint: "Playgrounds and water play" },
    { value: "sports", label: "Sports & recreation", hint: "Fields, courts, golf, and recreation" },
    { value: "libraries", label: "Libraries", hint: "Public libraries and reading spaces" },
    { value: "culture", label: "Arts & history", hint: "Museums, landmarks, and public art" },
    { value: "community", label: "Community spaces", hint: "Centers, markets, and plazas" },
    { value: "waterfront", label: "Waterfront", hint: "Beaches, lakes, and riverfronts" },
  ];
  const quickFilters = visitFilterChoices.filter((choice) => choice.quick);
  filterRow.innerHTML = `
    ${quickFilters
      .map(
        ({ value, label }) =>
          `<button class="filter-button" type="button" data-visit-filter="${value}" aria-pressed="false"><span>${label}</span></button>`,
      )
      .join("")}
    <button class="filter-button more-filter-button" type="button" id="more-filter-button">
      <span>Filters</span><b id="more-filter-count" hidden></b>
    </button>
    <button class="clear-filter-chip" type="button" id="clear-filter-chip" hidden>Reset</button>
  `;
  const quickFilterButtons = [...filterRow.querySelectorAll("[data-visit-filter]")];
  const moreFilterButton = document.querySelector("#more-filter-button");
  const moreFilterCount = document.querySelector("#more-filter-count");
  const clearFilterChip = document.querySelector("#clear-filter-chip");
  visitFilterOptions.innerHTML = visitFilterChoices
    .map(
      ({ value, label, hint }) => `
        <label class="filter-option">
          <input type="checkbox" name="visit-filter" value="${value}" />
          <span><span class="filter-option-copy"><strong>${label}</strong><small>${hint}</small></span></span>
        </label>
      `,
    )
    .join("");
  typeFilterOptions.innerHTML = placeTypeFilterChoices
    .map(
      ({ value, label, hint }) => `
        <label class="filter-option">
          <input type="checkbox" name="place-type" value="${value}" />
          <span><span class="filter-option-copy"><strong>${label}</strong><small>${hint}</small></span></span>
        </label>
      `,
    )
    .join("");

  function renderCityOptions() {
    cities = [...new Map(places.map((place) => [citySlug(place), place])).entries()].sort(
      ([, left], [, right]) => left.city.localeCompare(right.city),
    );
  }

  function initialAreaName() {
    const initialPlace = places.find((place) => citySlug(place) === activeCity);
    return initialPlace?.city || "United States";
  }

  renderCityOptions();

  const initialPlaces = nationwideMode
    ? places
    : places.filter((place) => citySlug(place) === activeCity);
  const initialCenter = hasStoredMapView
    ? [storedMapView.latitude, storedMapView.longitude]
    : initialPlaces.length
    ? [
        initialPlaces.reduce((sum, place) => sum + place.latitude, 0) / initialPlaces.length,
        initialPlaces.reduce((sum, place) => sum + place.longitude, 0) / initialPlaces.length,
      ]
    : [39.5, -98.35];

  const initialZoom = hasStoredMapView
    ? Math.min(Math.max(Number(storedMapView.zoom) || 12, 8), 16)
    : nationwideMode
      ? 4
      : 12;
  const map = earlyMap || L.map("map", mapInteractionOptions).setView(initialCenter, initialZoom);
  const dismissMapGestureHint = () => {
    if (mapGestureHint) mapGestureHint.hidden = true;
  };
  map.once("dragstart", dismissMapGestureHint);
  map.once("zoomstart", dismissMapGestureHint);
  map.on("dragstart", () => {
    if (activeGuidePlace && guideTracking && !suppressMoveResponse) {
      setGuideTracking(false);
    }
  });
  map.on("zoomstart", () => {
    if (activeGuidePlace && guideTracking && !suppressMoveResponse) {
      setGuideTracking(false);
    }
  });
  window.setTimeout(dismissMapGestureHint, 5000);
  if (!earlyMap) {
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
  }
  const contextLayer = L.featureGroup().addTo(map);
  const markerLayer = typeof L.markerClusterGroup === "function"
    ? L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: false,
        disableClusteringAtZoom: 14,
        maxClusterRadius: (zoom) => (zoom < 11 ? 64 : 46),
        iconCreateFunction(cluster) {
          const childMarkers = cluster.getAllChildMarkers();
          const childPlaces = childMarkers
            .map((marker) => marker.auditPlace)
            .filter(Boolean);
          const curatedCount = childPlaces.filter(
            (place) => !place.discoveryStatus,
          ).length;
          const statusClass = curatedCount === childPlaces.length
            ? "is-curated"
            : curatedCount
              ? "is-mixed"
              : "is-seed";
          return L.divIcon({
            className: "audit-cluster-wrap",
            html: `
              <span class="audit-cluster ${statusClass}">
                <strong>${childMarkers.length}</strong>
              </span>
            `,
            iconSize: [56, 56],
            iconAnchor: [28, 28],
          });
        },
      }).addTo(map)
    : L.layerGroup().addTo(map);
  const regionLayer = L.layerGroup().addTo(map);
  const locationLayer = L.layerGroup().addTo(map);
  const guideLayer = L.layerGroup().addTo(map);
  const explorerLayer = L.layerGroup().addTo(map);
  const pinnedNoteLayer = L.layerGroup().addTo(map);
  const mobileSelectionLayer = L.layerGroup().addTo(map);
  const markersByPlace = new Map();
  const mobileLayout = window.matchMedia("(max-width: 860px)");
  let selectedMapPlaceKey = null;
  let activeGuidePlace = null;
  let pendingGuidePlace = null;
  let explorerArrivalPromptVisible = false;
  let explorerArrivalPromptDismissed = false;
  let guideInitialDistance = null;
  let guidePreviousDistance = null;
  let guideTracking = false;
  let pinNoteMode = false;
  let pendingPinnedNote = null;
  let draftPinnedNoteMarker = null;
  const pinnedNotesStorageKey = demoSessionId
    ? `auditmap:map-pinned-notes:${demoSessionId}`
    : "auditmap:map-pinned-notes";
  const northCarolinaBounds = L.latLngBounds(
    [33.75, -84.33],
    [36.59, -75.4],
  );

  function boundaryStyle() {
    return {
      color: "#0b0b0b",
      weight: 2,
      opacity: 0.68,
      fillColor: "#ffffff",
      fillOpacity: 0.28,
      interactive: false,
      className: "search-area-highlight",
    };
  }

  function pinnedNoteIcon(isDraft = false) {
    return L.divIcon({
      className: `map-pinned-note-wrap${isDraft ? " is-draft" : ""}`,
      html: `<span class="map-pinned-note">${navIcon("notes")}</span>`,
      iconSize: [38, 44],
      iconAnchor: [19, 38],
    });
  }

  function renderPinnedNotes() {
    pinnedNoteLayer.clearLayers();
    const notes = getLocalRecord(pinnedNotesStorageKey, []);
    notes.forEach((note) => {
      if (!Number.isFinite(Number(note.latitude)) || !Number.isFinite(Number(note.longitude))) return;
      const kind = String(note.kind || "note").replaceAll("-", " ");
      const marker = L.marker([note.latitude, note.longitude], {
        icon: pinnedNoteIcon(),
        title: `Pinned ${kind}`,
        zIndexOffset: 850,
      }).bindPopup(`
        <article class="map-note-popup">
          <p>Pinned ${escapeHtml(kind)}</p>
          <strong>${escapeHtml(note.message || "Map note")}</strong>
          ${note.nearbyPlaceName ? `<small>Near ${escapeHtml(note.nearbyPlaceName)}</small>` : ""}
          <small>Saved on this device</small>
          <button type="button" data-delete-map-note="${escapeHtml(note.id)}">Remove this pin</button>
        </article>
      `).on("popupopen", () => {
        const removeButton = marker.getPopup()?.getElement()?.querySelector("[data-delete-map-note]");
        removeButton?.addEventListener("click", () => {
          const remaining = getLocalRecord(pinnedNotesStorageKey, [])
            .filter((item) => item.id !== note.id);
          setLocalRecord(pinnedNotesStorageKey, remaining);
          map.closePopup();
          renderPinnedNotes();
          if (mapZoomNote) mapZoomNote.textContent = "Pinned note removed";
        }, { once: true });
      }).addTo(pinnedNoteLayer);
    });
  }

  function cancelPinNoteMode() {
    pinNoteMode = false;
    map.getContainer().classList.remove("is-pinning-note");
    if (mapGestureHint) {
      mapGestureHint.hidden = true;
      mapGestureHint.textContent = "Drag to move · Pinch to zoom";
    }
  }

  function beginPinNoteMode() {
    map.closePopup();
    pinNoteMode = true;
    pendingPinnedNote = null;
    draftPinnedNoteMarker?.remove();
    draftPinnedNoteMarker = null;
    map.getContainer().classList.add("is-pinning-note");
    if (mapGestureHint) {
      mapGestureHint.textContent = "Tap the map where your note belongs · Esc to cancel";
      mapGestureHint.hidden = false;
    }
  }

  renderPinnedNotes();

  document.addEventListener("auditmap:map-pin-note-requested", beginPinNoteMode);
  document.addEventListener("auditmap:map-info-requested", () => {
    const infoDialog = document.querySelector("#map-info-dialog");
    if (!infoDialog) return;
    const center = map.getCenter();
    document.querySelector("#map-info-area").textContent = cityHeading.textContent || currentArea.name;
    document.querySelector("#map-info-results").textContent = count.textContent || "Current map coverage";
    document.querySelector("#map-info-zoom").textContent = `Level ${map.getZoom()}`;
    document.querySelector("#map-info-center").textContent = `${center.lat.toFixed(3)}, ${center.lng.toFixed(3)}`;
    document.querySelector("#map-info-radius").textContent = `${searchRadiusMiles} miles`;
    infoDialog.showModal();
  });

  map.on("click", (event) => {
    if (!pinNoteMode) return;
    cancelPinNoteMode();
    const nearbyPlace = places
      .map((place) => ({
        place,
        distance: distanceMiles(
          { latitude: event.latlng.lat, longitude: event.latlng.lng },
          place,
        ),
      }))
      .sort((left, right) => left.distance - right.distance)[0];
    pendingPinnedNote = {
      latitude: event.latlng.lat,
      longitude: event.latlng.lng,
      nearbyPlaceId: nearbyPlace?.distance <= 1 ? nearbyPlace.place.id : null,
      nearbyPlaceName: nearbyPlace?.distance <= 1 ? nearbyPlace.place.name : "",
    };
    draftPinnedNoteMarker?.remove();
    draftPinnedNoteMarker = L.marker(event.latlng, {
      icon: pinnedNoteIcon(true),
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(map);
    const coordinates = document.querySelector("#map-note-coordinates");
    if (coordinates) {
      coordinates.textContent = `${pendingPinnedNote.nearbyPlaceName ? `Near ${pendingPinnedNote.nearbyPlaceName} · ` : ""}${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)}`;
    }
    document.querySelector("#map-note-dialog")?.showModal();
  });

  const mapNoteDialog = document.querySelector("#map-note-dialog");
  const mapNoteForm = document.querySelector("#map-note-form");
  const closeMapNote = () => {
    mapNoteDialog?.close();
    pendingPinnedNote = null;
    draftPinnedNoteMarker?.remove();
    draftPinnedNoteMarker = null;
  };
  mapNoteDialog?.querySelector("[data-close-map-note]")?.addEventListener("click", closeMapNote);
  mapNoteDialog?.addEventListener("cancel", () => {
    pendingPinnedNote = null;
    draftPinnedNoteMarker?.remove();
    draftPinnedNoteMarker = null;
  });
  mapNoteForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!pendingPinnedNote) return;
    const formData = new FormData(mapNoteForm);
    const message = String(formData.get("message") || "").trim();
    if (!message) return;
    const notes = getLocalRecord(pinnedNotesStorageKey, []);
    notes.unshift({
      id: crypto.randomUUID(),
      ...pendingPinnedNote,
      kind: String(formData.get("kind") || "tip"),
      message,
      createdAt: new Date().toISOString(),
    });
    setLocalRecord(pinnedNotesStorageKey, notes.slice(0, 200));
    mapNoteForm.reset();
    closeMapNote();
    renderPinnedNotes();
    if (mapZoomNote) mapZoomNote.textContent = "Pinned note saved on this device";
  });
  document.querySelector("#map-info-dialog [data-close-map-info]")?.addEventListener("click", () => {
    document.querySelector("#map-info-dialog")?.close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && pinNoteMode) cancelPinNoteMode();
  });

  function showSearchBoundary(area, persist = true) {
    contextLayer.clearLayers();
    let boundary = null;
    if (area?.boundingBox?.length === 4) {
      const [south, north, west, east] = area.boundingBox.map(Number);
      const center = L.latLng((south + north) / 2, (west + east) / 2);
      const corner = L.latLng(north, east);
      boundary = L.circle(
        center,
        {
          ...boundaryStyle(),
          radius: Math.min(
            9500,
            Math.max(5500, center.distanceTo(corner) * 0.45),
          ),
        },
      );
    } else if (area?.geometry) {
      boundary = L.geoJSON(area.geometry, { style: boundaryStyle });
    } else if (
      Number.isFinite(Number(area?.latitude)) &&
      Number.isFinite(Number(area?.longitude))
    ) {
      boundary = L.circle(
        [Number(area.latitude), Number(area.longitude)],
        {
          ...boundaryStyle(),
          radius: 16000,
        },
      );
    }
    if (!boundary) return;
    boundary.addTo(contextLayer);
    if (persist) setLocalRecord("auditmap:last-search-area", area);
  }

  function showViewportBoundary(bounds, name) {
    const area = {
      name,
      boundingBox: [
        bounds.getSouth(),
        bounds.getNorth(),
        bounds.getWest(),
        bounds.getEast(),
      ],
    };
    showSearchBoundary(area);
  }

  if (storedSearchArea) showSearchBoundary(storedSearchArea, false);

  function beginProgrammaticMapMovement(source, duration = 550) {
    mapMovementSource = source;
    suppressMoveResponse = true;
    window.clearTimeout(mapMovementResetTimer);
    mapMovementResetTimer = window.setTimeout(() => {
      mapMovementSource = "user";
      suppressMoveResponse = false;
    }, duration);
  }

  function setMapCenter(latitude, longitude, zoom = 12) {
    beginProgrammaticMapMovement("system");
    map.setView([latitude, longitude], zoom);
    setLocalRecord("auditmap:last-map-view", {
      latitude,
      longitude,
      zoom,
      name: currentArea.name,
      label: currentArea.label,
    });
  }

  function cityGatewayGroups() {
    const bounds = map.getBounds().pad(0.08);
    const groups = new Map();
    places.forEach((place) => {
      if (
        !Number.isFinite(Number(place.latitude)) ||
        !Number.isFinite(Number(place.longitude)) ||
        !bounds.contains([place.latitude, place.longitude])
      ) return;
      const slug = citySlug(place);
      const group = groups.get(slug) || {
        slug,
        city: place.city,
        state: place.state,
        places: [],
        latitude: 0,
        longitude: 0,
      };
      group.places.push(place);
      group.latitude += Number(place.latitude);
      group.longitude += Number(place.longitude);
      groups.set(slug, group);
    });
    return [...groups.values()]
      .map((group) => ({
        ...group,
        latitude: group.latitude / group.places.length,
        longitude: group.longitude / group.places.length,
      }))
      .sort((left, right) => right.places.length - left.places.length);
  }

  function renderCityGateways() {
    regionLayer.clearLayers();
    if (map.getZoom() > 8) return;

    const occupiedPoints = [];
    cityGatewayGroups().forEach((group) => {
      const point = map.latLngToLayerPoint([group.latitude, group.longitude]);
      const overlaps = occupiedPoints.some(
        (occupied) =>
          Math.abs(occupied.x - point.x) < 104 &&
          Math.abs(occupied.y - point.y) < 48,
      );
      if (overlaps) return;
      occupiedPoints.push(point);
      const detail = `${group.places.length} ${group.places.length === 1 ? "site" : "sites"}`;
      const icon = L.divIcon({
        className: "region-gateway-wrap",
        html: `
          <span class="region-gateway has-records">
            <strong>${escapeHtml(group.city)}</strong>
            <small>${escapeHtml(detail)}</small>
          </span>
        `,
        iconSize: [116, 48],
        iconAnchor: [58, 24],
      });
      L.marker([group.latitude, group.longitude], {
        icon,
        title: `Explore ${group.city}, ${group.state}`,
        keyboard: true,
        zIndexOffset: group.places.length,
      })
        .addTo(regionLayer)
        .on("click", () => {
          activeCity = group.slug;
          nationwideMode = false;
          viewportMode = false;
          currentArea = {
            name: group.city,
            label: `${group.city}, ${group.state}`,
          };
          setMapCenter(group.latitude, group.longitude, 11);
          render();
        });
    });
  }

  function radiusForCurrentView() {
    const center = map.getCenter();
    const edge = map.getBounds().getNorthEast();
    return Math.round(Math.min(30000, Math.max(5000, center.distanceTo(edge))));
  }

  async function identifyMapArea() {
    const requestId = ++areaRequestId;
    const center = map.getCenter();
    searchAreaButton.hidden = true;
    if (map.getZoom() <= 5) {
      currentArea = { name: "United States", label: "United States" };
      searchAreaButton.hidden = true;
      render();
      return;
    }

    try {
      const response = await fetch(
        `/api/area?lat=${center.lat.toFixed(4)}&lon=${center.lng.toFixed(4)}&zoom=${map.getZoom()}`,
      );
      const area = await response.json();
      if (!response.ok || requestId !== areaRequestId) return;
      currentArea = {
        name:
          map.getZoom() <= 7
            ? `${area.state || area.name} region`
            : area.name || area.state || "Current map area",
        label: area.label || area.name || area.state || "Current map area",
      };
      setLocalRecord("auditmap:last-map-view", {
        ...getLocalRecord("auditmap:last-map-view", {}),
        name: currentArea.name,
        label: currentArea.label,
      });
      if (map.getZoom() >= 9) {
        count.textContent = `Updating public places around ${currentArea.name}...`;
        await loadNearbyPlaces(
          center.lat,
          center.lng,
          currentArea.name,
          radiusForCurrentView(),
        );
        if (requestId !== areaRequestId) return;
      }
      render();
    } catch {
      if (requestId === areaRequestId) render();
    }
  }

  function handleMapMoved() {
    if (suppressMoveResponse || mapMovementSource !== "user") return;
    if (nearbyMode && userLocation) {
      updateUserLocationMarkerScale();
      searchAreaButton.hidden = true;
      const nearbyCenter = map.getCenter();
      setLocalRecord("auditmap:last-map-view", {
        latitude: nearbyCenter.lat,
        longitude: nearbyCenter.lng,
        zoom: map.getZoom(),
        name: "Near you",
        label: "Near you",
      });
      render();
      return;
    }
    clearMobilePlacePreview();
    nationwideMode = false;
    viewportMode = true;
    nearbyMode = false;
    userLocation = null;
    userLocationMarker = null;
    search.value = "";
    locationLayer.clearLayers();
    locationButton.classList.remove("is-active");
    mapDockLocate?.classList.remove("is-active");
    locationButtonLabel.textContent = "Near me";
    locationStatus.textContent = "";
    searchAreaButton.hidden = true;
    const center = map.getCenter();
    if (map.getZoom() <= 5) {
      currentArea = { name: "United States", label: "United States" };
    } else if (map.getZoom() <= 8) {
      currentArea = { name: "Regional view", label: "Regional view" };
    }
    setLocalRecord("auditmap:last-map-view", {
      latitude: center.lat,
      longitude: center.lng,
      zoom: map.getZoom(),
      name: currentArea.name,
      label: currentArea.label,
    });
    render();
    window.clearTimeout(mapMoveTimer);
    mapMoveTimer = window.setTimeout(identifyMapArea, 450);
  }

  function openPlace(place) {
    if (place.discoveryStatus) {
      const discoveredPlaces = getLocalRecord("auditmap:discovered-places", []);
      setLocalRecord(
        "auditmap:discovered-places",
        mergePlaceRecords(discoveredPlaces, [place]),
      );
    }
    const center = map.getCenter();
    setLocalRecord("auditmap:last-map-view", {
      latitude: center.lat,
      longitude: center.lng,
      zoom: map.getZoom(),
      name: currentArea.name,
      label: currentArea.label,
      activeCity,
      selectedPlaceId: place.id,
      selectedPlaceCitySlug: citySlug(place),
    });
    window.location.href = `${placeUrl(place)}&from=map`;
  }

  async function loadNearbyPlaces(latitude, longitude, cityName = "", radius = 16000) {
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      radius: String(radius),
    });
    if (cityName) params.set("city", cityName);
    try {
      const sharedResponse = await fetch(
        `/api/places?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&radius=${encodeURIComponent(radius)}&limit=250`,
      );
      if (sharedResponse.ok) {
        const sharedPayload = await sharedResponse.json();
        if (sharedPayload.places?.length) {
          places = mergePlaceRecords(places, sharedPayload.places);
          renderCityOptions();
          return sharedPayload.places;
        }
      }
    } catch {
      // The live public-data fallback below keeps discovery available.
    }

    if (!northCarolinaBounds.contains([latitude, longitude])) return [];

    const response = await fetch(`/api/nc-places?${params}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not load nearby public places.");
    places = mergePlaceRecords(places, payload.places || []);
    const discoveredPlaces = places.filter((place) => place.discoveryStatus);
    setLocalRecord("auditmap:discovered-places", discoveredPlaces.slice(-500));
    renderCityOptions();
    return payload.places || [];
  }

  async function discoverLocation(query) {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return false;
    count.textContent = "Searching across the United States...";
    searchForm.querySelector("button").disabled = true;
    try {
      const geocodeResponse = await fetch(
        `/api/geocode?v=2&q=${encodeURIComponent(normalizedQuery)}`,
      );
      const location = await geocodeResponse.json();
      if (!geocodeResponse.ok) throw new Error(location.error || "Location not found.");
      const discovered = await loadNearbyPlaces(
        location.latitude,
        location.longitude,
        location.name,
        searchRadiusMeters(),
      );
      const targetSlug = slugify(`${location.name}-${location.state}`);
      const matchingCity = cities.find(([slug]) => slug === targetSlug);
      activeCity = matchingCity?.[0] || (discovered[0] ? citySlug(discovered[0]) : null);
      nationwideMode = false;
      nearbyMode = false;
      viewportMode = true;
      userLocation = null;
      userLocationMarker = null;
      locationLoadInProgress = false;
      stopLocationWatch();
      locationLayer.clearLayers();
      locationButton.classList.remove("is-active");
      mapDockLocate?.classList.remove("is-active");
      locationButtonLabel.textContent = "Near me";
      currentArea = {
        name: location.name,
        label: [location.name, location.state].filter(Boolean).join(", "),
      };
      search.value = "";
      const url = new URL(window.location.href);
      if (activeCity) url.searchParams.set("city", activeCity);
      else url.searchParams.delete("city");
      window.history.replaceState({}, "", url);
      setMapCenter(location.latitude, location.longitude, 12);
      showSearchBoundary(location);
      render();
      searchAreaButton.hidden = true;
      if (mobileLayout.matches) setSheetExpanded(true);
      return true;
    } catch (error) {
      count.textContent = error.message;
      return false;
    } finally {
      searchForm.querySelector("button").disabled = false;
    }
  }

  function setSheetExpanded(expanded) {
    const sidebar = list.closest(".places-sidebar");
    sidebar.classList.toggle("is-expanded", expanded);
    sidebar.dataset.sheetState = expanded ? "browse" : "peek";
    const visibleLabel = sheetHandle.querySelector(".sheet-handle-copy");
    const visibleAction = sheetHandle.querySelector(".sheet-handle-action");
    if (visibleLabel) {
      visibleLabel.innerHTML = expanded
        ? "<strong>Places in this area</strong><small>Pull down or tap Map</small>"
        : "<strong>Explore this area</strong><small>Pull up for places</small>";
    }
    if (visibleAction) visibleAction.textContent = expanded ? "Map ↓" : "Places ↑";
    sheetHandle.setAttribute("aria-expanded", String(expanded));
    sheetHandle.querySelector(".sr-only").textContent =
      expanded ? "Collapse place results" : "Expand place results";
    window.setTimeout(() => map.invalidateSize(), 240);
  }

  function createUserLocationIcon(label = "You") {
    return L.divIcon({
      className: "user-location-marker-wrap",
      html: userLocationMarkerMarkup(label),
      iconSize: [68, 72],
      iconAnchor: [34, 34],
    });
  }

  function refreshUserLocationPersona() {
    if (!userLocationMarker) return;
    userLocationMarker.setIcon(createUserLocationIcon());
    updateUserLocationMarkerScale();
    if (activeGuidePlace) renderGuide();
  }

  window.addEventListener("auditmap:profile-avatar", refreshUserLocationPersona);

  function updateUserLocationMarkerScale() {
    if (!userLocationMarker) return;
    const zoom = map.getZoom();
    const size = activeGuidePlace
      ? zoom <= 11 ? 54 : zoom <= 14 ? 62 : 70
      : zoom <= 9 ? 30 : zoom <= 11 ? 38 : zoom <= 14 ? 46 : 52;
    const element = userLocationMarker.getElement();
    element?.style.setProperty("--location-size", `${size}px`);
    element?.classList.toggle("is-guiding", Boolean(activeGuidePlace));
  }

  function guideBearing(from, to) {
    const toRadians = (value) => value * Math.PI / 180;
    const latitude1 = toRadians(from.latitude);
    const latitude2 = toRadians(to.latitude);
    const longitudeDelta = toRadians(to.longitude - from.longitude);
    const y = Math.sin(longitudeDelta) * Math.cos(latitude2);
    const x = Math.cos(latitude1) * Math.sin(latitude2) -
      Math.sin(latitude1) * Math.cos(latitude2) * Math.cos(longitudeDelta);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  function guideDirection(from, to) {
    const bearing = guideBearing(from, to);
    const directions = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
    return directions[Math.round(bearing / 45) % directions.length];
  }

  function guideDistanceLabel(miles) {
    if (miles < 0.1) return `${Math.max(25, Math.round(miles * 5280 / 25) * 25)} ft`;
    if (miles < 10) return `${miles.toFixed(1)} mi`;
    return `${Math.round(miles)} mi`;
  }

  function guideMapInsets() {
    const mapRect = map.getContainer().getBoundingClientRect();
    const guideRect = mapGuideStatus && !mapGuideStatus.hidden
      ? mapGuideStatus.getBoundingClientRect()
      : null;
    const explorerRect = mapExplorerPanel && !mapExplorerPanel.hidden
      ? mapExplorerPanel.getBoundingClientRect()
      : null;
    const edge = mobileLayout.matches ? 24 : 32;
    const markerClearance = mobileLayout.matches ? 44 : 34;
    return {
      top: Math.max(edge, guideRect ? Math.ceil(guideRect.bottom - mapRect.top + markerClearance) : edge),
      right: edge,
      bottom: Math.max(edge, explorerRect ? Math.ceil(mapRect.bottom - explorerRect.top + markerClearance) : edge),
      left: edge,
    };
  }

  function guidePointsAreVisible(insets) {
    if (!activeGuidePlace || !userLocation) return true;
    const size = map.getSize();
    const points = [
      map.latLngToContainerPoint([userLocation.latitude, userLocation.longitude]),
      map.latLngToContainerPoint([activeGuidePlace.latitude, activeGuidePlace.longitude]),
    ];
    return points.every((point) =>
      point.x >= insets.left &&
      point.x <= size.x - insets.right &&
      point.y >= insets.top &&
      point.y <= size.y - insets.bottom
    );
  }

  function updateGuideTrackingControl() {
    if (!mapGuideRecenter) return;
    mapGuideRecenter.classList.toggle("is-active", guideTracking);
    mapGuideRecenter.setAttribute("aria-pressed", String(guideTracking));
    mapGuideRecenter.textContent = guideTracking ? "Tracking" : "Track";
  }

  function setGuideTracking(tracking, refit = false) {
    guideTracking = Boolean(tracking && activeGuidePlace && userLocation);
    updateGuideTrackingControl();
    if (guideTracking && refit) fitGuideBounds(true);
    if (mapGuideMode && activeGuidePlace) {
      mapGuideMode.textContent = guideTracking
        ? "Tracking both points · Choose the safest nearby public path"
        : "Tracking paused · Tap Track to follow both points again";
    }
  }

  function fitGuideBounds(force = true) {
    if (!activeGuidePlace || !userLocation) return;
    const insets = guideMapInsets();
    if (!force && guidePointsAreVisible(insets)) return;
    suppressMoveResponse = true;
    map.fitBounds(
      L.latLngBounds([
        [userLocation.latitude, userLocation.longitude],
        [activeGuidePlace.latitude, activeGuidePlace.longitude],
      ]),
      {
        paddingTopLeft: [insets.left, insets.top],
        paddingBottomRight: [insets.right, insets.bottom],
        maxZoom: 17,
        animate: true,
        duration: 0.35,
      },
    );
    window.setTimeout(() => { suppressMoveResponse = false; }, 500);
  }

  function renderGuide() {
    guideLayer.clearLayers();
    if (!activeGuidePlace || !userLocation) {
      if (mapGuideStatus) mapGuideStatus.hidden = true;
      return;
    }
    const destination = {
      latitude: Number(activeGuidePlace.latitude),
      longitude: Number(activeGuidePlace.longitude),
    };
    const distance = distanceMiles(userLocation, destination);
    const bearing = guideBearing(userLocation, destination);
    const direction = guideDirection(userLocation, destination);
    if (!Number.isFinite(guideInitialDistance)) guideInitialDistance = Math.max(distance, 0.001);
    let movement = distance > 0.45
      ? "You aren't too far. It's worth the walk."
      : distance > 0.12
        ? "Follow nearby trails and let the map keep you oriented."
        : "Almost there. The wandering is part of the fun.";
    if (distance <= 0.015) {
      movement = "You're here. Take a look around and enjoy the find.";
      mapGuideStatus?.classList.add("has-arrived");
    } else {
      mapGuideStatus?.classList.remove("has-arrived");
      if (Number.isFinite(guidePreviousDistance)) {
        const change = guidePreviousDistance - distance;
        if (change > 0.004) movement = "Getting warmer. The travel is pretty fun too.";
        else if (change < -0.004) movement = "A little off course. Turn toward the arrow when the path allows.";
      }
    }
    const progress = Math.max(
      0,
      Math.min(100, ((guideInitialDistance - distance) / guideInitialDistance) * 100),
    );
    const destinationImage = explorerFeatureImage(activeGuidePlace);
    L.marker([destination.latitude, destination.longitude], {
      icon: L.divIcon({
        className: "map-guide-destination-wrap",
        html: `<span class="map-guide-beacon"><i></i><span class="map-guide-destination${destinationImage ? " has-image" : ""}">${destinationImage ? `<img src="${escapeHtml(destinationImage)}" alt="" decoding="async" />` : navIcon("location")}</span><small>${escapeHtml(activeGuidePlace.name)}</small></span>`,
        iconSize: [184, 86],
        iconAnchor: [92, 31],
      }),
      title: `Destination: ${activeGuidePlace.name}`,
      keyboard: false,
      zIndexOffset: 950,
    }).addTo(guideLayer);
    if (mapGuideCopy) {
      mapGuideCopy.textContent = activeGuidePlace.name;
    }
    if (mapGuideKicker) {
      mapGuideKicker.textContent = previewGuideMode
        ? "Preview guidance"
        : activeExplorerPlace
          ? "Explorer guidance"
          : "Guiding on the map";
    }
    if (mapGuideFeedback) {
      mapGuideFeedback.textContent = `${guideDistanceLabel(distance)} ${direction} · ${movement}`;
    }
    if (mapGuideMode) {
      mapGuideMode.textContent = guideTracking
        ? "Tracking both points · Choose the safest nearby public path"
        : "Arrow points toward the destination · Choose the safest nearby public path";
    }
    if (mapGuideProgress) mapGuideProgress.style.width = `${progress}%`;
    if (mapGuideCompass) mapGuideCompass.style.setProperty("--guide-bearing", `${bearing}deg`);
    const userMarkerElement = userLocationMarker?.getElement();
    userMarkerElement?.style.setProperty("--location-bearing", `${bearing}deg`);
    updateUserLocationMarkerScale();
    guidePreviousDistance = distance;
    if (mapGuideStatus) mapGuideStatus.hidden = false;
    if (guideTracking) {
      window.requestAnimationFrame(() => fitGuideBounds(false));
    }
  }

  function stopGuide() {
    const previousPlace = activeGuidePlace;
    activeGuidePlace = null;
    pendingGuidePlace = null;
    guideInitialDistance = null;
    guidePreviousDistance = null;
    guideTracking = false;
    guideLayer.clearLayers();
    const userMarkerElement = userLocationMarker?.getElement();
    userMarkerElement?.style.removeProperty("--location-bearing");
    userMarkerElement?.classList.remove("is-guiding");
    updateUserLocationMarkerScale();
    if (mapGuideStatus) mapGuideStatus.hidden = true;
    mapGuideStatus?.classList.remove("has-arrived");
    updateGuideTrackingControl();
    if (activeExplorerPlace) renderExplorerMode(false, true);
    if (mapZoomNote) mapZoomNote.textContent = "Guidance stopped · Explore the map";
    if (selectedMobilePlace && previousPlace && placeKey(selectedMobilePlace) === placeKey(previousPlace)) {
      showMobilePlacePreview(selectedMobilePlace);
    }
  }

  function startGuide(place) {
    if (!userLocation) {
      const guideStatus = mobilePlacePreview.querySelector("[data-mobile-preview-guide-status]");
      const guideButton = mobilePlacePreview.querySelector("[data-mobile-preview-guide]");
      if (previewGuideMode) {
        userLocation = {
          latitude: Number(place.latitude) - 0.006,
          longitude: Number(place.longitude) - 0.008,
        };
        nearbyMode = true;
        viewportMode = false;
        locationLayer.clearLayers();
        userLocationMarker = L.marker([userLocation.latitude, userLocation.longitude], {
          icon: createUserLocationIcon("Preview"),
          title: "Preview position",
          keyboard: false,
          zIndexOffset: 1000,
        }).bindTooltip("Preview position").addTo(locationLayer);
        locationButton.classList.add("is-active");
        locationButtonLabel.textContent = "Preview location";
        locationStatus.textContent = "Using a simulated position for this preview only.";
        startGuide(place);
        return;
      }
      if (!navigator.geolocation) {
        if (guideStatus) {
          guideStatus.hidden = false;
          guideStatus.textContent = "Location is unavailable in this browser.";
        }
        if (guideButton) guideButton.textContent = "Location unavailable";
        return;
      }
      pendingGuidePlace = place;
      if (activeExplorerPlace) {
        explorerArrivalPromptVisible = true;
        paintExplorerArrival(activeExplorerPlace);
      }
      if (guideStatus) {
        guideStatus.hidden = false;
        guideStatus.textContent = "Share your location when the browser asks.";
      }
      if (guideButton) guideButton.textContent = "Finding you…";
      locationStatus.textContent = `Share your location to guide toward ${place.name}.`;
      locationButton.click();
      return;
    }
    if (
      activeExplorerPlace &&
      !(previewGuideMode && previewLocationMode === "nearby") &&
      explorerProximity(activeExplorerPlace).state === "away"
    ) {
      pendingGuidePlace = null;
      explorerArrivalPromptVisible = true;
      explorerArrivalPromptDismissed = false;
      paintExplorerArrival(activeExplorerPlace);
      mapExplorerArrival?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    activeGuidePlace = place;
    pendingGuidePlace = null;
    explorerArrivalPromptVisible = false;
    if (mapExplorerArrival) mapExplorerArrival.hidden = true;
    guideInitialDistance = null;
    guidePreviousDistance = null;
    guideTracking = false;
    if (mobileLayout.matches && selectedMobilePlace) clearMobilePlacePreview();
    if (activeExplorerPlace) renderExplorerMode(false, true);
    renderGuide();
    setGuideTracking(true);
    window.requestAnimationFrame(() => fitGuideBounds(true));
    const guideButton = mobilePlacePreview.querySelector("[data-mobile-preview-guide]");
    if (guideButton) {
      guideButton.classList.add("is-guiding");
      guideButton.textContent = "Guiding";
    }
  }

  mapGuideStop?.addEventListener("click", stopGuide);
  mapGuideRecenter?.addEventListener("click", () => {
    setGuideTracking(!guideTracking, true);
  });
  if (mapGuideStep) {
    mapGuideStep.hidden = !previewGuideMode;
    mapGuideStep.addEventListener("click", () => {
      if (!previewGuideMode || !activeGuidePlace || !userLocation) return;
      userLocation.latitude += (Number(activeGuidePlace.latitude) - userLocation.latitude) * 0.34;
      userLocation.longitude += (Number(activeGuidePlace.longitude) - userLocation.longitude) * 0.34;
      userLocationMarker?.setLatLng([userLocation.latitude, userLocation.longitude]);
      updateUserLocationMarkerScale();
      renderGuide();
    });
  }

  function explorerFeatures(place) {
    return explorerPlaceFeatures(place);
  }

  function explorerProximity(place) {
    if (!userLocation) return { state: "unknown", distance: null };
    const distances = explorerFeatures(place).map((feature) => distanceMiles(userLocation, feature));
    const arrival = explorerArrivalPoint(place);
    if (arrival) distances.push(distanceMiles(userLocation, arrival));
    const distance = Math.min(...distances.filter(Number.isFinite));
    return {
      state: Number.isFinite(distance) && distance <= 1 ? "nearby" : "away",
      distance: Number.isFinite(distance) ? distance : null,
    };
  }

  function paintExplorerArrival(place) {
    if (!mapExplorerArrival) return;
    if (!explorerArrivalPromptVisible) {
      mapExplorerArrival.hidden = true;
      mapExplorerArrival.innerHTML = "";
      return;
    }
    const proximity = explorerProximity(place);
    const directionsUrl = explorerDirectionsUrl(place);
    mapExplorerArrival.hidden = false;
    mapExplorerArrival.className = `map-explorer-arrival is-${proximity.state}`;
    if (proximity.state === "nearby") {
      mapExplorerArrival.innerHTML = `
        <span><strong>You're close enough to explore.</strong><small>Choose a destination, then use Guide me for on-foot direction.</small></span>
      `;
      return;
    }
    if (proximity.state === "away" && !explorerArrivalPromptDismissed) {
      mapExplorerArrival.innerHTML = `
        <span><strong>You're ${escapeHtml(guideDistanceLabel(proximity.distance))} from ${escapeHtml(place.name)}.</strong><small>Use Google Maps to reach the place, then switch to Explorer when you arrive.</small></span>
        <span class="map-explorer-arrival-actions">
          <a href="${escapeHtml(directionsUrl)}" target="_blank" rel="noreferrer">Navigate with Google</a>
          <button type="button" data-explorer-preview>Preview Explorer</button>
        </span>
      `;
      mapExplorerArrival.querySelector("[data-explorer-preview]")?.addEventListener("click", () => {
        explorerArrivalPromptDismissed = true;
        paintExplorerArrival(place);
      });
      return;
    }
    if (proximity.state === "away") {
      mapExplorerArrival.innerHTML = `
        <span><strong>Previewing from away.</strong><small>On-foot guidance unlocks when you are within 1 mile of a mapped destination.</small></span>
        <a href="${escapeHtml(directionsUrl)}" target="_blank" rel="noreferrer">Navigate with Google</a>
      `;
      return;
    }
    mapExplorerArrival.innerHTML = `
      <span><strong>Are you at ${escapeHtml(place.name)}?</strong><small>Share your location for on-site guidance, or use Google Maps to get there.</small></span>
      <span class="map-explorer-arrival-actions">
        <button class="is-primary" type="button" data-explorer-find-arrival>Use my location</button>
        <a href="${escapeHtml(directionsUrl)}" target="_blank" rel="noreferrer">Google Maps</a>
      </span>
    `;
    mapExplorerArrival.querySelector("[data-explorer-find-arrival]")?.addEventListener("click", () => {
      locationButton.click();
    });
  }

  function explorerFeatureDistance(feature) {
    return userLocation ? distanceMiles(userLocation, feature) : null;
  }

  function sortedExplorerFeatures() {
    return explorerFeatures(activeExplorerPlace)
      .map((feature) => ({
        ...feature,
        explorerDistance: explorerFeatureDistance(feature),
      }))
      .sort((left, right) => {
        if (Number.isFinite(left.explorerDistance) && Number.isFinite(right.explorerDistance)) {
          return left.explorerDistance - right.explorerDistance;
        }
        return left.name.localeCompare(right.name);
      });
  }

  function setPreviewExplorerLocation(place) {
    if (!previewGuideMode || userLocation) return;
    const away = previewLocationMode === "away";
    userLocation = {
      latitude: Number(place.latitude) + (away ? 0.04 : -0.006),
      longitude: Number(place.longitude) + (away ? 0.04 : -0.008),
    };
    nearbyMode = true;
    viewportMode = false;
    locationLayer.clearLayers();
    userLocationMarker = L.marker([userLocation.latitude, userLocation.longitude], {
      icon: createUserLocationIcon("Preview"),
      title: away ? "Preview position away from the place" : "Preview position",
      keyboard: false,
      zIndexOffset: 1000,
    }).bindTooltip(away ? "Preview position away from the place" : "Preview position").addTo(locationLayer);
    locationButton.classList.add("is-active");
    locationButtonLabel.textContent = "Preview location";
    locationStatus.textContent = away
      ? "Using a simulated position away from this place for preview testing only."
      : "Using a simulated position for this preview only.";
  }

  function selectExplorerFeature(feature, focus = true) {
    if (!feature) return;
    if (activeGuidePlace && placeKey(activeGuidePlace) !== placeKey(feature)) stopGuide();
    activeExplorerFeature = feature;
    renderExplorerMode(false, true);
    if (focus) {
      suppressMoveResponse = true;
      map.setView([Number(feature.latitude), Number(feature.longitude)], Math.max(map.getZoom(), 17), {
        animate: true,
      });
      window.setTimeout(() => { suppressMoveResponse = false; }, 450);
    }
  }

  function paintExplorerPanel(features, totalFeatureCount, preserveDestinations = false) {
    if (!activeExplorerPlace || !mapExplorerPanel) return;
    mapExplorerTitle.textContent = activeExplorerPlace.name;
    mapExplorerDirections.href = explorerDirectionsUrl(activeExplorerPlace);
    paintExplorerArrival(activeExplorerPlace);
    const browseVerb = mobileLayout.matches ? "Swipe through" : "Browse";
    mapExplorerSummary.textContent = userLocation
      ? `Inside ${activeExplorerPlace.name} · ${explorerShowAll ? "showing all" : `showing ${features.length} nearest of`} ${totalFeatureCount} mapped destinations`
      : `Inside ${activeExplorerPlace.name} · ${browseVerb} ${features.length} of ${totalFeatureCount} mapped destinations`;
    const renderedFeatureIds = Array.from(
      mapExplorerDestinations.querySelectorAll("[data-explorer-feature]"),
      (button) => button.dataset.explorerFeature,
    );
    const canPreserveDestinations = preserveDestinations &&
      renderedFeatureIds.length === features.length &&
      renderedFeatureIds.every((id, index) => id === features[index].id);
    if (!canPreserveDestinations) {
      mapExplorerDestinations.innerHTML = `
        ${!userLocation ? '<button class="map-explorer-location" type="button" data-explorer-find-me><strong>Use my location</strong><small>See what is closest</small></button>' : ""}
        ${features.map((feature, index) => `
          <button
            class="map-explorer-destination${activeExplorerFeature?.id === feature.id ? " is-selected" : ""}"
            type="button"
            role="listitem"
            data-explorer-feature="${escapeHtml(feature.id)}"
          >
            <span class="map-explorer-thumbnail${explorerFeatureImage(feature) ? " has-image" : ""}">
              ${explorerFeatureImage(feature)
                ? `<img src="${escapeHtml(explorerFeatureImage(feature))}" alt="" loading="${index < 12 ? "eager" : "lazy"}" decoding="async" />`
                : `<span aria-hidden="true">${navIcon("location")}</span>`}
              <b>${index + 1}</b>
            </span>
            <span class="map-explorer-destination-copy">
              <strong>${escapeHtml(feature.name)}</strong>
              <small>${escapeHtml(featureCategory(feature))}${Number.isFinite(feature.explorerDistance) ? ` · ${guideDistanceLabel(feature.explorerDistance)}` : ""}</small>
            </span>
          </button>
        `).join("")}
        ${totalFeatureCount > 12 ? `<button class="map-explorer-location" type="button" data-explorer-show-all><strong>${explorerShowAll ? "Show nearest" : `Show all ${totalFeatureCount}`}</strong><small>${explorerShowAll ? "Return to what is closest" : "Browse the whole site"}</small></button>` : ""}
      `;
      mapExplorerDestinations.querySelector("[data-explorer-find-me]")?.addEventListener("click", () => {
        locationButton.click();
      });
      mapExplorerDestinations.querySelector("[data-explorer-show-all]")?.addEventListener("click", () => {
        explorerShowAll = !explorerShowAll;
        renderExplorerMode(true);
      });
      mapExplorerDestinations.querySelectorAll("[data-explorer-feature]").forEach((button) => {
        button.addEventListener("click", () => {
          const feature = explorerFeatures(activeExplorerPlace)
            .find((item) => item.id === button.dataset.explorerFeature);
          selectExplorerFeature(feature);
        });
      });
    } else {
      mapExplorerDestinations.querySelectorAll("[data-explorer-feature]").forEach((button) => {
        button.classList.toggle("is-selected", button.dataset.explorerFeature === activeExplorerFeature?.id);
      });
    }
    const selectedDestination = activeExplorerFeature
      ? mapExplorerDestinations.querySelector(`[data-explorer-feature="${CSS.escape(activeExplorerFeature.id)}"]`)
      : null;
    if (selectedDestination) {
      window.requestAnimationFrame(() => {
        selectedDestination.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      });
    }

    if (!activeExplorerFeature) {
      mapExplorerSelection.hidden = true;
      mapExplorerSelection.innerHTML = "";
      return;
    }
    const selectedGuideUrl = canonicalFeaturePath(activeExplorerPlace, activeExplorerFeature) ||
      `/feature.html?place=${encodeURIComponent(activeExplorerPlace.id)}&feature=${encodeURIComponent(activeExplorerFeature.id)}`;
    const selectedIsGuiding = activeGuidePlace &&
      placeKey(activeGuidePlace) === placeKey(activeExplorerFeature);
    mapExplorerSelection.hidden = false;
    mapExplorerSelection.innerHTML = `
      <span class="map-explorer-selection-actions">
        <button class="is-primary${selectedIsGuiding ? " is-guiding" : ""}" type="button" data-explorer-guide aria-pressed="${Boolean(selectedIsGuiding)}">${selectedIsGuiding ? "Guiding" : "Guide me"}</button>
        <a href="${escapeHtml(selectedGuideUrl)}" target="_top">Details</a>
        <button type="button" data-explorer-note>Pin note</button>
      </span>
    `;
    mapExplorerSelection.querySelector("[data-explorer-guide]")?.addEventListener("click", () => {
      if (selectedIsGuiding) {
        fitGuideBounds();
        return;
      }
      startGuide(activeExplorerFeature);
    });
    mapExplorerSelection.querySelector("[data-explorer-note]")?.addEventListener("click", () => {
      beginPinNoteMode();
    });
  }

  function renderExplorerMode(fit = false, preserveDestinations = false) {
    if (!activeExplorerPlace) return;
    const allFeatures = sortedExplorerFeatures();
    const features = explorerShowAll ? allFeatures : allFeatures.slice(0, 12);
    explorerLayer.clearLayers();
    markerLayer.clearLayers();
    regionLayer.clearLayers();
    features.forEach((feature, index) => {
      const selected = activeExplorerFeature?.id === feature.id;
      const guiding = activeGuidePlace && placeKey(activeGuidePlace) === placeKey(feature);
      if (guiding) return;
      const featureImage = explorerFeatureImage(feature);
      const marker = L.marker([Number(feature.latitude), Number(feature.longitude)], {
        icon: L.divIcon({
          className: `map-explorer-marker-wrap${selected ? " is-selected" : ""}${index < 3 ? " has-label" : ""}${!explorerMarkersAnimated ? " is-entering" : ""}`,
          html: `<span class="map-explorer-marker" style="--explorer-index:${index}"><b>${index + 1}</b><small>${escapeHtml(feature.name)}</small>${selected && !guiding ? `<span class="map-explorer-marker-popover"><strong>${escapeHtml(feature.name)}</strong><span class="map-explorer-marker-photo">${featureImage ? `<img src="${escapeHtml(featureImage)}" alt="" decoding="async" />` : `<span class="map-explorer-marker-popover-fallback">${navIcon("location")}</span>`}</span></span>` : ""}</span>`,
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        }),
        title: feature.name,
        keyboard: true,
        zIndexOffset: selected ? 800 : 0,
      });
      marker.on("click", () => selectExplorerFeature(feature));
      marker.addTo(explorerLayer);
    });
    explorerMarkersAnimated = true;
    paintExplorerPanel(features, allFeatures.length, preserveDestinations);
    mapExplorerPanel.hidden = false;
    if (mapZoomNote) mapZoomNote.textContent = `Inside ${activeExplorerPlace.name} · Choose a destination`;
    if (fit && features.length) {
      const boundPoints = features.map((feature) => [feature.latitude, feature.longitude]);
      if (userLocation) boundPoints.push([userLocation.latitude, userLocation.longitude]);
      const bounds = L.latLngBounds(boundPoints);
      map.fitBounds(bounds, {
        paddingTopLeft: [30, 150],
        paddingBottomRight: [30, mobileLayout.matches ? 300 : 150],
        maxZoom: 17,
      });
    }
  }

  function enterExplorerMode(place) {
    const features = explorerFeatures(place);
    if (features.length < 2) {
      openPlace(place);
      return;
    }
    if (activeGuidePlace) stopGuide();
    explorerReturnView = {
      center: map.getCenter(),
      zoom: map.getZoom(),
    };
    explorerReturnPlace = place;
    activeExplorerPlace = place;
    activeExplorerFeature = null;
    explorerShowAll = false;
    explorerMarkersAnimated = false;
    explorerArrivalPromptVisible = false;
    explorerArrivalPromptDismissed = false;
    clearMobilePlacePreview();
    setPreviewExplorerLocation(place);
    document.body.classList.add("has-map-explorer");
    window.setAuditMapAskPlace?.(place);
    const explorerUrl = new URL(window.location.href);
    explorerUrl.searchParams.set("city", citySlug(place));
    explorerUrl.searchParams.set("explore", place.id);
    window.history.replaceState({}, "", explorerUrl);
    renderExplorerMode(true);
    window.setTimeout(() => {
      if (activeExplorerPlace?.id !== place.id) return;
      map.invalidateSize();
      renderExplorerMode(true);
    }, 320);
  }

  function exitExplorerMode() {
    if (!activeExplorerPlace) return;
    const returnPlace = explorerReturnPlace;
    if (activeGuidePlace) stopGuide();
    activeExplorerPlace = null;
    activeExplorerFeature = null;
    explorerShowAll = false;
    explorerMarkersAnimated = false;
    explorerArrivalPromptVisible = false;
    explorerLayer.clearLayers();
    mapExplorerPanel.hidden = true;
    mapExplorerSelection.hidden = true;
    if (mapExplorerArrival) mapExplorerArrival.hidden = true;
    document.body.classList.remove("has-map-explorer");
    window.setAuditMapAskPlace?.(null);
    const mapUrl = new URL(window.location.href);
    mapUrl.searchParams.delete("explore");
    window.history.replaceState({}, "", mapUrl);
    render();
    if (explorerReturnView) {
      map.setView(explorerReturnView.center, explorerReturnView.zoom, { animate: false });
    }
    explorerReturnView = null;
    explorerReturnPlace = null;
    if (returnPlace) {
      window.requestAnimationFrame(() => selectPlaceOnMap(returnPlace));
    }
  }

  mapExplorerExit?.addEventListener("click", exitExplorerMode);

  map.getContainer().addEventListener("click", (event) => {
    const explorerButton = event.target.closest?.("[data-map-preview-explorer]");
    if (!explorerButton) return;
    event.preventDefault();
    event.stopPropagation();
    const place = places.find(
      (candidate) =>
        candidate.id === explorerButton.dataset.placeId &&
        citySlug(candidate) === explorerButton.dataset.citySlug,
    );
    if (!place) return;
    markersByPlace.get(placeKey(place))?.closePopup();
    enterExplorerMode(place);
  }, true);

  function updateMapZoomPresentation() {
    const zoom = map.getZoom();
    const presentation = zoom <= 5
      ? { stage: "country", text: "Country view · Choose a city" }
      : zoom <= 8
        ? { stage: "region", text: "Regional view · Zoom in to reveal places" }
        : zoom <= 11
          ? { stage: "city", text: "City view · Tap a group to get closer" }
          : zoom <= 14
            ? { stage: "neighborhood", text: "Neighborhood view · Tap a place" }
            : { stage: "place", text: "Place view · Names appear at this level" };
    map.getContainer().dataset.zoomStage = presentation.stage;
    if (mapZoomNote) {
      mapZoomNote.dataset.zoomStage = presentation.stage;
      mapZoomNote.textContent = presentation.text;
    }
  }

  function stopLocationWatch() {
    if (locationWatchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchId);
    }
    locationWatchId = null;
  }

  function openMobilePlace(place) {
    const sidebar = list.closest(".places-sidebar");
    sidebar.classList.add("is-opening-place");
    window.setTimeout(() => openPlace(place), 180);
  }

  function clearMobilePlacePreview() {
    if (!selectedMobilePlace) return;
    selectedMobilePlace = null;
    selectedMapPlaceKey = null;
    window.clearTimeout(markerPulseTimer);
    mobileSelectionLayer.clearLayers();
    markersByPlace.forEach((marker) => {
      marker.getElement()?.classList.remove("is-selected", "is-selection-pulsing");
      marker.setZIndexOffset(0);
    });
    window.setAuditMapAskPlace?.(null);
    const sidebar = list.closest(".places-sidebar");
    sidebar.classList.remove("has-place-preview", "has-explorer-preview", "is-opening-place", "is-expanded");
    sidebar.dataset.sheetState = "peek";
    mobilePlacePreview.hidden = true;
    mobilePlacePreview.innerHTML = "";
    sheetHandle.setAttribute("aria-expanded", "false");
    sheetHandle.querySelector(".sr-only").textContent = "Expand place results";
    const visibleLabel = sheetHandle.querySelector(".sheet-handle-copy");
    if (visibleLabel) visibleLabel.innerHTML = "<strong>Explore this area</strong><small>Pull up for places</small>";
    const visibleAction = sheetHandle.querySelector(".sheet-handle-action");
    if (visibleAction) visibleAction.textContent = "Places ↑";
  }

  function mobileMapSafeArea() {
    const mapRect = map.getContainer().getBoundingClientRect();
    const sidebarRect = placesSidebar.getBoundingClientRect();
    const top = Math.min(mapRect.height - 90, 96);
    const sheetTop = sidebarRect.top - mapRect.top;
    const bottom = Math.max(top + 90, Math.min(mapRect.height - 24, sheetTop - 22));
    return {
      left: 28,
      right: Math.max(100, mapRect.width - 190),
      top,
      bottom,
      center: L.point(mapRect.width / 2, top + (bottom - top) / 2),
    };
  }

  function syncMobileMapSelection(place, { keepVisible = true, pulse = true } = {}) {
    const key = placeKey(place);
    selectedMapPlaceKey = key;
    window.clearTimeout(markerPulseTimer);
    markersByPlace.forEach((marker) => {
      const element = marker.getElement();
      element?.classList.remove("is-selected");
      element?.classList.remove("is-selection-pulsing");
      marker.setZIndexOffset(0);
    });
    mobileSelectionLayer.clearLayers();
    const carouselIndex = mobileCarouselPlaces.findIndex(
      (candidate) => placeKey(candidate) === key,
    );
    const markerNumber = carouselIndex >= 0 ? carouselIndex + 1 : "•";
    const marker = L.marker([place.latitude, place.longitude], {
      icon: L.divIcon({
        className: "numbered-marker mobile-selection-marker is-selected",
        html: `<span class="marker-shell"><span class="marker-pin is-curated">${markerNumber}</span><span class="marker-place-label">${escapeHtml(place.name)}</span></span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
      title: place.name,
      keyboard: false,
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(mobileSelectionLayer);
    const markerElement = marker?.getElement();
    if (!marker || !markerElement) return;
    if (pulse) {
      window.requestAnimationFrame(() => {
        markerElement.classList.add("is-selection-pulsing");
        markerPulseTimer = window.setTimeout(
          () => markerElement.classList.remove("is-selection-pulsing"),
          950,
        );
      });
    }
    if (!keepVisible) return;
    const safeArea = mobileMapSafeArea();
    const markerPoint = map.latLngToContainerPoint(marker.getLatLng());
    const markerIsVisible =
      markerPoint.x >= safeArea.left &&
      markerPoint.x <= safeArea.right &&
      markerPoint.y >= safeArea.top &&
      markerPoint.y <= safeArea.bottom;
    if (markerIsVisible) return;
    beginProgrammaticMapMovement("selection", 700);
    map.panBy(
      [markerPoint.x - safeArea.center.x, markerPoint.y - safeArea.center.y],
      { animate: true, duration: 0.32 },
    );
  }

  function showMobilePlacePreview(place, swipeDirection = 0) {
    selectedMobilePlace = place;
    window.setAuditMapAskPlace?.(place);
    const sidebar = list.closest(".places-sidebar");
    const coverImage = place.image || place.images?.[0];
    const carouselIndex = Math.max(
      0,
      mobileCarouselPlaces.findIndex(
        (item) => placeKey(item) === placeKey(place),
      ),
    );
    const previewHours = dailyHoursStatus(place.hours, place.hoursStructured, place.timeZone);
    const previewAddress = formatPlaceAddress(place) || `${place.city}, ${place.state}`;
    const mappedDestinationCount = explorerPlaceFeatures(place).length;

    mobilePlacePreview.innerHTML = `
      <button class="mobile-preview-main${coverImage?.url ? " has-image" : " has-photo-prompt"}${swipeDirection ? ` is-swipe-${swipeDirection > 0 ? "next" : "previous"}` : ""}" type="button">
        ${
          coverImage?.url
            ? `<span class="mobile-preview-image"><img ${responsiveImageAttributes(coverImage.url, { widths: [320, 480, 640], sizes: "34vw" })} alt="" /></span>`
            : `<span class="mobile-preview-image missing-photo-state missing-photo-mobile">
                ${missingPhotoIcon()}
                <strong>Picture this place</strong>
                <small>This spot could use a photo. Be the one who puts it on the map.</small>
              </span>`
        }
        <span class="mobile-preview-copy">
          <strong>${escapeHtml(place.name)}</strong>
          <span class="mobile-preview-fact"><small>Hours</small><span><b>${escapeHtml(previewHours.label)}</b>${previewHours.summary ? ` · ${escapeHtml(previewHours.summary)}` : ""}</span></span>
          <span class="mobile-preview-fact"><small>Address</small><span>${escapeHtml(previewAddress)}</span></span>
        </span>
      </button>
      ${explorerEligible(place) ? `
        <button class="mobile-preview-explorer" type="button" data-mobile-preview-explorer>
          <span>
            <strong>Explore inside</strong>
            <small>${mappedDestinationCount} mapped destinations</small>
          </span>
          <b aria-hidden="true">Inside →</b>
        </button>
      ` : ""}
      <span class="mobile-preview-swipe-cue" aria-hidden="true"><b>←</b><span>Swipe for nearby places</span><b>→</b></span>
    `;
    mobilePlacePreview.hidden = false;
    sidebar.classList.remove("is-expanded", "is-opening-place");
    sidebar.classList.add("has-place-preview");
    sidebar.classList.toggle("has-explorer-preview", explorerEligible(place));
    sidebar.dataset.sheetState = "focus";
    const visibleLabel = sheetHandle.querySelector(".sheet-handle-copy");
    if (visibleLabel) visibleLabel.innerHTML = `<strong>Nearby places</strong><small>${carouselIndex + 1} of ${mobileCarouselPlaces.length} · swipe left or right</small>`;
    sheetHandle.setAttribute("aria-expanded", "false");
    sheetHandle.querySelector(".sr-only").textContent =
      `Swipe up to open ${place.name}, or swipe down to return to results`;
    mobilePlacePreview
      .querySelector(".mobile-preview-main")
      .addEventListener("click", () => {
        if (sheetWasDragged) {
          sheetWasDragged = false;
          return;
        }
        openMobilePlace(place);
      });
    mobilePlacePreview
      .querySelector("[data-mobile-preview-explorer]")
      ?.addEventListener("click", () => enterExplorerMode(place));
    window.requestAnimationFrame(() => syncMobileMapSelection(place));
    window.setTimeout(() => map.invalidateSize(), 220);
  }

  function selectPlaceOnMap(place) {
    if (mobileLayout.matches) {
      showMobilePlacePreview(place);
      markersByPlace.get(placeKey(place))?.closePopup();
      return;
    }
    selectedMapPlaceKey = placeKey(place);
    const shouldFocusPlace = map.getZoom() < 11;
    if (shouldFocusPlace) {
      activeCity = citySlug(place);
      nationwideMode = false;
      viewportMode = true;
      currentArea = {
        name: place.city,
        label: `${place.city}, ${place.state}`,
      };
      suppressMoveResponse = true;
      map.setView([place.latitude, place.longitude], 13, { animate: false });
      map.panBy([0, -Math.min(96, map.getSize().y * 0.14)], {
        animate: true,
        duration: 0.28,
      });
      updateMapZoomPresentation();
      cityHeading.textContent = place.city;
      areaSummary.textContent = `Selected from places matching “${search.value.trim() || place.name}”`;
      count.textContent = "Selected place";
      window.setTimeout(() => {
        suppressMoveResponse = false;
      }, 500);
    }
    list.querySelectorAll(".place-card").forEach((card) => {
      const selected =
        card.dataset.placeId === place.id &&
        card.dataset.citySlug === citySlug(place);
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-pressed", String(selected));
      if (selected) {
        setSheetExpanded(true);
        window.setTimeout(
          () => card.scrollIntoView({ behavior: "smooth", block: "nearest" }),
          260,
        );
      }
    });
    markersByPlace.forEach((marker, key) => {
      const selected = key === selectedMapPlaceKey;
      marker.getElement()?.classList.toggle("is-selected", selected);
      marker.setZIndexOffset(selected ? 900 : 0);
    });
    const selectedMarker = markersByPlace.get(selectedMapPlaceKey);
    window.setTimeout(
      () => selectedMarker?.openPopup(),
      shouldFocusPlace ? 220 : 0,
    );
  }

  function setPlaceHoverState(place, active) {
    const key = placeKey(place);
    const marker = markersByPlace.get(key);
    marker?.getElement()?.classList.toggle("is-peer-hover", active);
    marker?.setZIndexOffset(active || selectedMapPlaceKey === key ? 900 : 0);
    list.querySelectorAll(".place-card").forEach((card) => {
      const matching =
        card.dataset.placeId === place.id &&
        card.dataset.citySlug === citySlug(place);
      if (matching) card.classList.toggle("is-peer-hover", active);
    });
  }

  function clearPlaceSelection(place) {
    const key = placeKey(place);
    if (selectedMapPlaceKey !== key) return;
    selectedMapPlaceKey = null;
    list.querySelectorAll(".place-card").forEach((card) => {
      card.classList.remove("is-selected");
      card.setAttribute("aria-pressed", "false");
    });
    const marker = markersByPlace.get(key);
    marker?.getElement()?.classList.remove("is-selected");
    marker?.setZIndexOffset(0);
  }

  function render(options = {}) {
    if (activeExplorerPlace) {
      renderExplorerMode();
      return;
    }
    updateMapZoomPresentation();
    const cityPlaces = places.filter((place) => citySlug(place) === activeCity);
    const city = cityPlaces[0];
    const query = search.value.trim().toLowerCase();
    const mapBounds = map.getBounds().pad(0.12);
    const viewportPlaces = places.filter((place) =>
      mapBounds.contains([place.latitude, place.longitude]),
    );
    const nearbyPlaces = nearbyMode && userLocation
      ? places.filter((place) => distanceMiles(userLocation, place) <= searchRadiusMiles)
      : [];
    const searchablePlaces = nationwideMode
      ? places
      : nearbyMode
        ? nearbyPlaces
        : viewportMode
          ? viewportPlaces
          : query
            ? places
            : cityPlaces;
    const matchedPlaces = searchablePlaces.filter((place) => {
      const matchesType =
        activeTypeFilters.size === 0 ||
        [...activeTypeFilters].some((filter) => placeTypeFilterRules[filter]?.(place));
      const matchesVisit = [...activeVisitFilters].every((filter) =>
        visitFilterRules[filter]?.(place),
      );
      const matchesRating =
        activeMinRating === 0 || getPlaceRating(place).value >= activeMinRating;
      return matchesType && matchesVisit && matchesRating && placeMatchesSearch(place, query);
    });
    const rankedPlaces = matchedPlaces
      .map((place) => ({
        ...place,
        ...(userLocation && nearbyMode
          ? { distance: distanceMiles(userLocation, place) }
          : {}),
      }))
      .sort(
        (left, right) =>
          discoveryPriority(left) - discoveryPriority(right) ||
          (userLocation && nearbyMode ? left.distance - right.distance : 0),
      );
    const visiblePlaces = rankedPlaces.slice(0, maxRenderedResults);
    window.setAuditMapAskPlaces?.(visiblePlaces);
    const markerPlaces = nationwideMode ? rankedPlaces : visiblePlaces;
    mobileCarouselPlaces = visiblePlaces;
    const gatewayView = map.getZoom() <= 8 && !query && !nearbyMode;

    cityHeading.textContent = nationwideMode
      ? "United States"
      : gatewayView
      ? currentArea.name
      : nearbyMode
      ? "Near you"
      : query
        ? "Search results"
        : viewportMode
          ? currentArea.name
          : city?.city || "Public places";
    search.placeholder = nationwideMode
      ? "City, neighborhood, or public place"
      : nearbyMode
        ? "Search near me"
        : `Search near ${currentArea.name || city?.city || "this area"}`;
    const resultScope = rankedPlaces.length > visiblePlaces.length
      ? `Showing ${visiblePlaces.length} of ${rankedPlaces.length}`
      : `${visiblePlaces.length}`;
    const activeFilterCount =
      activeVisitFilters.size + activeTypeFilters.size + (activeMinRating ? 1 : 0);
    count.textContent = gatewayView
      ? `${cityGatewayGroups().length} cities in view`
      : nationwideMode
      ? `${rankedPlaces.length} places nationwide`
      : `${resultScope} ${rankedPlaces.length === 1 ? "place" : "places"}${nearbyMode ? " ranked by distance" : ""}${activeFilterCount ? ` · ${activeFilterCount} ${activeFilterCount === 1 ? "filter" : "filters"}` : ""}`;
    const mapActionContext = document.querySelector("#map-action-context");
    if (mapActionContext) {
      mapActionContext.textContent = `${cityHeading.textContent} · ${count.textContent}`;
    }
    areaSummary.textContent = gatewayView
      ? "Zoom in or choose a city to reveal its public sites"
      : nationwideMode
      ? "Major public parks across all 50 states"
      : query
      ? "Matching saved and discovered places"
      : nearbyMode
        ? "Closest public places, ranked by distance"
        : `${resultScope} public ${rankedPlaces.length === 1 ? "place" : "places"} in this map view`;
    list.innerHTML = visiblePlaces
      .map((place, index) => {
        const number = index + 1;
        const locationLine = nearbyMode || query
          ? `${place.type} · ${place.city}, ${place.state}`
          : `${place.type} · ${place.neighborhood}`;
        return `
          <button class="place-card has-media${place.image?.url || place.images?.[0]?.url ? "" : " is-missing-photo"}" type="button" data-place-id="${escapeHtml(place.id)}" data-city-slug="${escapeHtml(citySlug(place))}">
            <span class="place-number place-number-standalone">${number}</span>
            <span>
              <h2>${escapeHtml(place.name)}</h2>
              <p>${escapeHtml(locationLine)}</p>
              <p>${escapeHtml(place.address)}</p>
              ${typeof place.distance === "number" ? `<p class="distance-label">${place.distance.toFixed(place.distance < 10 ? 1 : 0)} miles away</p>` : ""}
            </span>
            ${cardMedia(place)}
          </button>
        `;
      })
      .join("");
    if (gatewayView) {
      list.innerHTML = cityGatewayGroups()
        .map((group) => {
          const needsLocalCheck = group.places.filter(
            (place) => documentationScore(place) < 72,
          ).length;
          return `
            <button class="area-card" type="button" data-city-gateway="${escapeHtml(group.slug)}">
              <span class="area-progress has-records"></span>
              <span>
                <h2>${escapeHtml(group.city)}</h2>
                <p>${escapeHtml(group.state)}</p>
              </span>
              <span class="area-card-detail">
                ${group.places.length} sites${needsLocalCheck ? `<br>${needsLocalCheck} could use a local check` : ""}
              </span>
            </button>
          `;
        })
        .join("");
    } else if (!visiblePlaces.length) {
      list.innerHTML = `
        <div class="empty-state search-empty">
          <strong>No confirmed matches in this view.</strong>
          <span>Some places may be missing the details needed for these filters.</span>
        </div>
      `;
    }

    markerLayer.clearLayers();
    markersByPlace.clear();
    const showMarkerLabels = map.getZoom() >= 15;
    markerPlaces.forEach((place, index) => {
      const number = index + 1;
      const icon = L.divIcon({
        className: `numbered-marker${showMarkerLabels ? " has-place-label" : ""}`,
        html: `<span class="marker-shell"><span class="marker-pin${place.discoveryStatus ? " is-seed" : " is-curated"}">${number}</span><span class="marker-place-label">${escapeHtml(place.name)}</span></span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const marker = L.marker([place.latitude, place.longitude], {
        icon,
        title: place.name,
        keyboard: true,
      });
      marker.auditPlace = place;
      marker
        .bindPopup(mapPopupContent(place), {
          className: "place-map-popup",
          closeButton: false,
          autoPan: false,
          maxWidth: 370,
          minWidth: 348,
          offset: [0, -14],
        })
        .on("mouseover", () => setPlaceHoverState(place, true))
        .on("mouseout", () => setPlaceHoverState(place, false))
        .on("click", () => {
          selectPlaceOnMap(place);
        })
        .on("popupopen", () => {
          document.body.classList.add("has-map-place-popup");
          const popup = marker.getPopup()?.getElement();
          const preview = popup?.querySelector(".map-preview-main");
          preview?.addEventListener("click", (event) => {
            event.preventDefault();
            openPlace(place);
          }, { once: true });
        })
        .on("popupclose", () => {
          document.body.classList.remove("has-map-place-popup");
          clearPlaceSelection(place);
        });
      markerLayer.addLayer(marker);
      markersByPlace.set(placeKey(place), marker);
    });
    if (gatewayView && map.hasLayer(markerLayer)) {
      map.removeLayer(markerLayer);
    } else if (!gatewayView && !map.hasLayer(markerLayer)) {
      map.addLayer(markerLayer);
    }
    renderCityGateways();

    if (options.fitMap && visiblePlaces.length && !nationwideMode) {
      const boundPoints = visiblePlaces.map((place) => [place.latitude, place.longitude]);
      if (nearbyMode && userLocation) {
        boundPoints.push([userLocation.latitude, userLocation.longitude]);
      }
      const bounds = L.latLngBounds(boundPoints);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 13 });
    } else if (options.fitMap && city) {
      map.setView(
        [
          cityPlaces.reduce((sum, place) => sum + place.latitude, 0) / cityPlaces.length,
          cityPlaces.reduce((sum, place) => sum + place.longitude, 0) / cityPlaces.length,
        ],
        12,
      );
    }

    list.querySelectorAll("[data-place-id]").forEach((card) => {
      const place = places.find(
        (item) =>
          item.id === card.dataset.placeId &&
          citySlug(item) === card.dataset.citySlug,
      );
      const showHover = () => place && setPlaceHoverState(place, true);
      const hideHover = () => place && setPlaceHoverState(place, false);
      card.addEventListener("mouseenter", showHover);
      card.addEventListener("mouseleave", hideHover);
      card.addEventListener("focus", showHover);
      card.addEventListener("blur", hideHover);
      card.addEventListener("click", () => {
        if (place) selectPlaceOnMap(place);
      });
    });
    list.querySelectorAll("[data-city-gateway]").forEach((card) => {
      card.addEventListener("click", () => {
        const group = cityGatewayGroups().find(
          (candidate) => candidate.slug === card.dataset.cityGateway,
        );
        if (!group) return;
        activeCity = group.slug;
        nationwideMode = false;
        viewportMode = false;
        currentArea = {
          name: group.city,
          label: `${group.city}, ${group.state}`,
        };
        setMapCenter(group.latitude, group.longitude, 11);
        render();
      });
    });
  }

  let activeSuggestionIndex = -1;
  let currentSuggestions = [];

  function rememberSearch(value) {
    const normalized = String(value || "").trim();
    if (normalized.length < 2) return;
    const recent = getLocalRecord("auditmap:recent-searches", [])
      .filter((item) => item.toLowerCase() !== normalized.toLowerCase());
    setLocalRecord("auditmap:recent-searches", [normalized, ...recent].slice(0, 5));
  }

  function suggestedSearches(query) {
    const normalizeSearchValue = (value) => String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
    const normalizedQuery = normalizeSearchValue(query);
    if (!normalizedQuery) {
      return getLocalRecord("auditmap:recent-searches", []).map((primary) => ({
        kind: "recent",
        primary,
        secondary: "Recent search",
      }));
    }
    if (normalizedQuery.length < 2) return [];
    const matchScore = (value) => {
      const normalizedValue = normalizeSearchValue(value);
      if (!normalizedValue) return Number.POSITIVE_INFINITY;
      if (normalizedValue === normalizedQuery) return 0;
      if (normalizedValue.startsWith(`${normalizedQuery} `)) return 1;
      if (normalizedValue.startsWith(normalizedQuery)) return 2;
      if (normalizedValue.split(" ").some((word) => word.startsWith(normalizedQuery))) return 3;
      if (normalizedValue.includes(normalizedQuery)) return 4;
      return Number.POSITIVE_INFINITY;
    };
    const bestScore = (...values) => Math.min(...values.map(matchScore));
    const matches = (value) => Number.isFinite(matchScore(value));
    const kindPriority = { city: 0, place: 1, term: 2, recent: 3 };
    const rankSuggestions = (left, right) =>
      left.score - right.score ||
      (kindPriority[left.kind] ?? 4) - (kindPriority[right.kind] ?? 4) ||
      discoveryPriority(left.place || {}) - discoveryPriority(right.place || {}) ||
      left.primary.localeCompare(right.primary);
    const placeSuggestions = places
      .filter(
        (place) =>
          matches(place.name) ||
          matches(place.address) ||
          matches(place.neighborhood) ||
          matches(place.type) ||
          matches(place.city) ||
          matches(place.state),
      )
      .map((place) => ({
        kind: "place",
        primary: place.name,
        secondary: `${place.type} · ${place.city}`,
        place,
        score: bestScore(
          place.name,
          place.city,
          place.neighborhood,
          place.address,
          place.type,
          place.state,
        ),
      }))
      .sort(rankSuggestions)
      .slice(0, 6);
    const citySuggestions = cities
      .map(([slug, place]) => ({ slug, place }))
      .filter(({ place }) => matches(place.city) || matches(place.state))
      .map(({ slug, place }) => ({
        kind: "city",
        primary: place.city,
        secondary: `${place.state} · ${places.filter((item) => citySlug(item) === slug).length} places`,
        city: { slug, latitude: place.latitude, longitude: place.longitude },
        score: bestScore(place.city, `${place.city} ${place.state}`, place.state),
      }))
      .sort(rankSuggestions)
      .slice(0, 4);
    const neighborhoodSuggestions = [
      ...new Set(places.map((place) => place.neighborhood).filter(Boolean)),
    ]
      .filter(matches)
      .map((neighborhood) => ({
        kind: "term",
        primary: neighborhood,
        secondary: "Neighborhood",
        score: matchScore(neighborhood),
      }))
      .sort(rankSuggestions)
      .slice(0, 2);
    const typeSuggestions = placeTypes
      .filter(matches)
      .map((type) => ({
        kind: "term",
        primary: type,
        secondary: "Place type",
        score: matchScore(type),
      }))
      .sort(rankSuggestions)
      .slice(0, 2);
    return [...citySuggestions, ...placeSuggestions, ...neighborhoodSuggestions, ...typeSuggestions]
      .filter(
        (suggestion, index, suggestions) =>
          suggestions.findIndex(
            (candidate) =>
              candidate.kind === suggestion.kind && candidate.primary === suggestion.primary,
          ) === index,
      )
      .sort(rankSuggestions)
      .slice(0, 7);
  }

  function paintSuggestions() {
    searchSuggestions.hidden = currentSuggestions.length === 0;
    search.setAttribute("aria-expanded", String(currentSuggestions.length > 0));
    search.removeAttribute("aria-activedescendant");
    searchSuggestions.innerHTML = currentSuggestions
      .map(
        (suggestion, index) => `
          <button
            class="search-suggestion${index === activeSuggestionIndex ? " is-active" : ""}"
            id="search-suggestion-${index}"
            type="button"
            role="option"
            aria-selected="${index === activeSuggestionIndex}"
            data-suggestion-index="${index}"
          >
            <span class="suggestion-icon is-${suggestion.kind}" aria-hidden="true">
              ${suggestion.kind === "city"
                ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>'
                : suggestion.kind === "place"
                  ? '<svg viewBox="0 0 24 24"><path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></svg>'
                  : '<svg viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h14"/></svg>'}
            </span>
            <span>
              <strong>${escapeHtml(suggestion.primary)}</strong>
              <small>${escapeHtml(suggestion.secondary)}</small>
            </span>
          </button>
        `,
      )
      .join("");
    if (activeSuggestionIndex >= 0) {
      search.setAttribute("aria-activedescendant", `search-suggestion-${activeSuggestionIndex}`);
    }
    searchSuggestions.querySelectorAll("[data-suggestion-index]").forEach((button) => {
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => chooseSuggestion(Number(button.dataset.suggestionIndex)));
    });
  }

  function closeSuggestions() {
    currentSuggestions = [];
    activeSuggestionIndex = -1;
    paintSuggestions();
  }

  function applySearchSuggestion(suggestion) {
    if (!suggestion) return;
    search.value = suggestion.primary;
    rememberSearch(suggestion.primary);
    if (suggestion.kind === "city") {
      activeCity = suggestion.city.slug;
      nationwideMode = false;
      nearbyMode = false;
      viewportMode = false;
      userLocation = null;
      userLocationMarker = null;
      stopLocationWatch();
      locationLayer.clearLayers();
      locationButton.classList.remove("is-active");
      mapDockLocate?.classList.remove("is-active");
      currentArea = { name: suggestion.primary, label: `${suggestion.primary}, ${suggestion.secondary.split(" · ")[0]}` };
      search.value = "";
      const url = new URL(window.location.href);
      url.searchParams.set("city", suggestion.city.slug);
      url.searchParams.delete("explore");
      window.history.replaceState({}, "", url);
      setMapCenter(suggestion.city.latitude, suggestion.city.longitude, 11);
      render({ fitMap: true });
      return;
    }
    if (suggestion.kind === "place") {
      activeCity = citySlug(suggestion.place);
      nationwideMode = false;
      viewportMode = false;
      currentArea = {
        name: suggestion.place.city,
        label: `${suggestion.place.city}, ${suggestion.place.state}`,
      };
      search.value = "";
      const url = new URL(window.location.href);
      url.searchParams.set("city", citySlug(suggestion.place));
      url.searchParams.delete("explore");
      window.history.replaceState({}, "", url);
      setMapCenter(suggestion.place.latitude, suggestion.place.longitude, 14);
    }
    render();
  }

  function chooseSuggestion(index) {
    const suggestion = currentSuggestions[index];
    if (!suggestion) return;
    closeSuggestions();
    applySearchSuggestion(suggestion);
  }

  let mapStartSuggestionItems = [];

  function featuredMapStartSuggestions() {
    const recent = suggestedSearches("");
    const featuredNames = ["Raleigh", "Charlotte", "Durham", "Asheville"];
    const featured = featuredNames
      .map((name) => cities.find(([, place]) => place.city === name))
      .filter(Boolean)
      .map(([slug, place]) => ({
        kind: "city",
        primary: place.city,
        secondary: `${place.state} · ${places.filter((item) => citySlug(item) === slug).length} places`,
        city: { slug, latitude: place.latitude, longitude: place.longitude },
      }));
    return [...recent, ...featured]
      .filter(
        (suggestion, index, suggestions) =>
          suggestions.findIndex(
            (candidate) => candidate.primary.toLowerCase() === suggestion.primary.toLowerCase(),
          ) === index,
      )
      .slice(0, 4);
  }

  function paintMapStartSuggestions() {
    if (!mapStartSuggestions) return;
    mapStartSearch.setAttribute("aria-expanded", String(mapStartSuggestionItems.length > 0));
    mapStartSuggestions.innerHTML = mapStartSuggestionItems
      .map(
        (suggestion, index) => `
          <button type="button" role="option" data-map-start-suggestion="${index}">
            <span class="map-start-suggestion-icon" aria-hidden="true">
              ${suggestion.kind === "place"
                ? '<svg viewBox="0 0 24 24"><path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></svg>'
                : '<svg viewBox="0 0 24 24"><path d="M4 6.5 9 4l6 2.5L20 4v13.5L15 20l-6-2.5L4 20V6.5Z"/><path d="M9 4v13.5M15 6.5V20"/></svg>'}
            </span>
            <span><strong>${escapeHtml(suggestion.primary)}</strong><small>${escapeHtml(suggestion.secondary)}</small></span>
            <svg class="map-start-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
          </button>
        `,
      )
      .join("");
    mapStartSuggestions
      .querySelectorAll("[data-map-start-suggestion]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const suggestion = mapStartSuggestionItems[Number(button.dataset.mapStartSuggestion)];
          closeMapStart(suggestion.kind === "city" ? "city" : "search");
          if (suggestion.kind === "city" || suggestion.kind === "place") {
            applySearchSuggestion(suggestion);
            return;
          }
          search.value = suggestion.primary;
          searchForm.requestSubmit();
        });
      });
  }

  function openMapStart() {
    if (!mapStartOverlay) return;
    mapStartOverlay.hidden = false;
    document.body.classList.add("has-map-start");
    document.querySelector(".map-page")?.setAttribute("inert", "");
    mapStartSuggestionItems = featuredMapStartSuggestions();
    paintMapStartSuggestions();
  }

  mapStartSearch?.addEventListener("input", () => {
    mapStartStatus.textContent = "";
    mapStartSuggestionItems = mapStartSearch.value.trim()
      ? suggestedSearches(mapStartSearch.value).sort((left, right) => {
          const priority = { city: 0, place: 1, recent: 2, term: 3 };
          return (priority[left.kind] ?? 4) - (priority[right.kind] ?? 4);
        })
      : featuredMapStartSuggestions();
    paintMapStartSuggestions();
  });
  mapStartSearchForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = mapStartSearch.value.trim();
    if (query.length < 2) {
      mapStartStatus.textContent = "Enter a city, neighborhood, park, or address.";
      mapStartSearch.focus();
      return;
    }
    const exactSuggestion = suggestedSearches(query).find(
      (suggestion) =>
        (suggestion.kind === "city" || suggestion.kind === "place") &&
        suggestion.primary.toLowerCase() === query.toLowerCase(),
    );
    if (exactSuggestion) {
      closeMapStart(exactSuggestion.kind === "city" ? "city" : "search");
      applySearchSuggestion(exactSuggestion);
      return;
    }
    const submitButton = mapStartSearchForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    mapStartStatus.textContent = `Looking around ${query}...`;
    const found = await discoverLocation(query);
    submitButton.disabled = false;
    if (found) {
      closeMapStart("search");
    } else {
      mapStartStatus.textContent = "We could not find that area. Try a city, neighborhood, or address.";
      mapStartSearch.focus();
    }
  });
  mapStartNearby?.addEventListener("click", () => {
    mapStartNearby.disabled = true;
    mapStartNearby.querySelector("strong").textContent = "Finding you...";
    mapStartNearby.querySelector("small").textContent = "Your browser may ask for permission";
    mapStartStatus.textContent = "";
    locationButton.click();
  });
  mapStartBrowse?.addEventListener("click", () => {
    closeMapStart("browse");
    window.setTimeout(() => map.invalidateSize(), 80);
  });

  search.addEventListener("input", () => {
    activeSuggestionIndex = -1;
    currentSuggestions = suggestedSearches(search.value);
    paintSuggestions();
  });
  search.addEventListener("focus", () => {
    activeSuggestionIndex = -1;
    currentSuggestions = suggestedSearches(search.value);
    paintSuggestions();
  });
  search.addEventListener("keydown", (event) => {
    if (!currentSuggestions.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      activeSuggestionIndex =
        (activeSuggestionIndex + direction + currentSuggestions.length) %
        currentSuggestions.length;
      paintSuggestions();
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeSuggestionIndex >= 0) chooseSuggestion(activeSuggestionIndex);
      else searchForm.requestSubmit();
    } else if (event.key === "Escape") {
      closeSuggestions();
    }
  });
  search.addEventListener("focus", () => {
    if (!mobileLayout.matches) return;
    if (selectedMobilePlace) clearMobilePlacePreview();
    else setSheetExpanded(false);
  });
  search.addEventListener("blur", () => window.setTimeout(closeSuggestions, 120));
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = search.value.trim();
    if (query.length < 2) {
      search.focus();
      return;
    }
    rememberSearch(query);
    const rankedSuggestions = suggestedSearches(query);
    const leadingSuggestion = rankedSuggestions[0];
    const normalizedQuery = slugify(query).replaceAll("-", " ");
    const normalizedLeading = slugify(leadingSuggestion?.primary || "").replaceAll("-", " ");
    const confidentLocationMatch =
      leadingSuggestion &&
      (leadingSuggestion.kind === "city" || leadingSuggestion.kind === "place") &&
      (normalizedLeading === normalizedQuery || normalizedLeading.startsWith(`${normalizedQuery} `));
    if (confidentLocationMatch) {
      closeSuggestions();
      applySearchSuggestion(leadingSuggestion);
      return;
    }
    closeSuggestions();
    const directMatches = places.filter((place) => placeMatchesSearch(place, query));
    if (directMatches.length) {
      nationwideMode = false;
      nearbyMode = false;
      viewportMode = false;
      activeCity = null;
      userLocation = null;
      userLocationMarker = null;
      stopLocationWatch();
      locationLayer.clearLayers();
      locationButton.classList.remove("is-active");
      mapDockLocate?.classList.remove("is-active");
      currentArea = { name: "Search results", label: `Results for ${query}` };
      const url = new URL(window.location.href);
      url.searchParams.delete("city");
      url.searchParams.delete("explore");
      window.history.replaceState({}, "", url);
      render({ fitMap: true });
      if (mobileLayout.matches) setSheetExpanded(true);
      return;
    }
    discoverLocation(query);
  });
  sheetHandle.addEventListener("click", () => {
    if (sheetWasDragged) {
      sheetWasDragged = false;
      return;
    }
    if (selectedMobilePlace) {
      openMobilePlace(selectedMobilePlace);
      return;
    }
    setSheetExpanded(!list.closest(".places-sidebar").classList.contains("is-expanded"));
  });
  sheetMapReturn?.addEventListener("click", () => {
    if (selectedMobilePlace) clearMobilePlacePreview();
    else setSheetExpanded(false);
    window.setTimeout(() => map.invalidateSize(), 240);
  });
  function completeSheetGesture(distance) {
    if (Math.abs(distance) < 30 || Date.now() - lastSheetGestureAt < 220) return false;
    lastSheetGestureAt = Date.now();
    sheetWasDragged = true;
    if (selectedMobilePlace) {
      if (distance < 0) openMobilePlace(selectedMobilePlace);
      else clearMobilePlacePreview();
      return true;
    }
    setSheetExpanded(distance < 0);
    return true;
  }
  sheetHandle.addEventListener("pointerdown", (event) => {
    sheetPointerStart = event.clientY;
    sheetWasDragged = false;
    try {
      sheetHandle.setPointerCapture(event.pointerId);
    } catch {
      // Native touch events below preserve swiping when Safari declines capture.
    }
  });
  sheetHandle.addEventListener("pointerup", (event) => {
    if (sheetPointerStart === null) return;
    const distance = event.clientY - sheetPointerStart;
    sheetPointerStart = null;
    completeSheetGesture(distance);
  });
  sheetHandle.addEventListener("pointercancel", () => {
    sheetPointerStart = null;
  });
  sheetHandle.addEventListener("touchstart", (event) => {
    sheetTouchStart = event.touches[0]?.clientY ?? null;
  }, { passive: true });
  sheetHandle.addEventListener("touchmove", (event) => {
    if (sheetTouchStart !== null) event.preventDefault();
  }, { passive: false });
  sheetHandle.addEventListener("touchend", (event) => {
    if (sheetTouchStart === null) return;
    const distance = (event.changedTouches[0]?.clientY ?? sheetTouchStart) - sheetTouchStart;
    sheetTouchStart = null;
    completeSheetGesture(distance);
  }, { passive: true });
  sheetHandle.addEventListener("touchcancel", () => {
    sheetTouchStart = null;
  });
  placesSidebar.addEventListener("touchstart", (event) => {
    if (
      !placesSidebar.classList.contains("is-expanded") ||
      placesSidebar.scrollTop > 2 ||
      event.target.closest(".sheet-header")
    ) {
      sidebarTouchStart = null;
      return;
    }
    const touch = event.touches[0];
    sidebarTouchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }, { passive: true });
  placesSidebar.addEventListener("touchmove", (event) => {
    if (!sidebarTouchStart || placesSidebar.scrollTop > 2) return;
    const touch = event.touches[0];
    if (!touch) return;
    const horizontalDistance = touch.clientX - sidebarTouchStart.x;
    const verticalDistance = touch.clientY - sidebarTouchStart.y;
    if (verticalDistance > 8 && verticalDistance > Math.abs(horizontalDistance)) {
      event.preventDefault();
    }
  }, { passive: false });
  placesSidebar.addEventListener("touchend", (event) => {
    if (!sidebarTouchStart) return;
    const start = sidebarTouchStart;
    sidebarTouchStart = null;
    const touch = event.changedTouches[0];
    const horizontalDistance = (touch?.clientX ?? start.x) - start.x;
    const verticalDistance = (touch?.clientY ?? start.y) - start.y;
    if (verticalDistance > 36 && verticalDistance > Math.abs(horizontalDistance)) {
      completeSheetGesture(verticalDistance);
    }
  }, { passive: true });
  placesSidebar.addEventListener("touchcancel", () => {
    sidebarTouchStart = null;
  });
  function resetPreviewGesture() {
    previewPointerStart = null;
    previewTouchStart = null;
    const card = mobilePlacePreview.querySelector(".mobile-preview-main");
    if (card) {
      card.style.transform = "";
      card.style.opacity = "";
    }
  }
  function movePreviewGesture(horizontalDistance, verticalDistance, start) {
    if (!start.axis && Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance)) > 10) {
      start.axis = Math.abs(horizontalDistance) >= Math.abs(verticalDistance)
        ? "horizontal"
        : "vertical";
    }
    if (start.axis !== "horizontal") return;
    const card = mobilePlacePreview.querySelector(".mobile-preview-main");
    if (card) {
      card.style.transform = `translateX(${horizontalDistance * 0.35}px)`;
      card.style.opacity = String(Math.max(0.72, 1 - Math.abs(horizontalDistance) / 600));
    }
  }
  function completePreviewGesture(horizontalDistance, verticalDistance, axis) {
    resetPreviewGesture();
    if (
      Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance)) < 30 ||
      Date.now() - lastPreviewGestureAt < 220
    ) return;
    lastPreviewGestureAt = Date.now();
    sheetWasDragged = true;
    const gestureAxis = axis || (Math.abs(horizontalDistance) >= Math.abs(verticalDistance)
      ? "horizontal"
      : "vertical");
    if (gestureAxis === "horizontal") {
      const currentIndex = mobileCarouselPlaces.findIndex(
        (place) => placeKey(place) === placeKey(selectedMobilePlace),
      );
      if (currentIndex < 0 || mobileCarouselPlaces.length < 2) return;
      const direction = horizontalDistance < 0 ? 1 : -1;
      const nextIndex = (currentIndex + direction + mobileCarouselPlaces.length) % mobileCarouselPlaces.length;
      showMobilePlacePreview(mobileCarouselPlaces[nextIndex], direction);
      return;
    }
    if (verticalDistance < 0) openMobilePlace(selectedMobilePlace);
    else clearMobilePlacePreview();
  }
  mobilePlacePreview.addEventListener("pointerdown", (event) => {
    previewPointerStart = {
      x: event.clientX,
      y: event.clientY,
      axis: null,
    };
    sheetWasDragged = false;
    try {
      mobilePlacePreview.setPointerCapture(event.pointerId);
    } catch {
      // Native touch events below preserve swiping when Safari declines capture.
    }
  });
  mobilePlacePreview.addEventListener("pointermove", (event) => {
    if (!previewPointerStart || !selectedMobilePlace) return;
    const horizontalDistance = event.clientX - previewPointerStart.x;
    const verticalDistance = event.clientY - previewPointerStart.y;
    movePreviewGesture(horizontalDistance, verticalDistance, previewPointerStart);
  });
  mobilePlacePreview.addEventListener("pointerup", (event) => {
    if (!previewPointerStart || !selectedMobilePlace) return;
    const horizontalDistance = event.clientX - previewPointerStart.x;
    const verticalDistance = event.clientY - previewPointerStart.y;
    completePreviewGesture(horizontalDistance, verticalDistance, previewPointerStart.axis);
  });
  mobilePlacePreview.addEventListener("pointercancel", resetPreviewGesture);
  mobilePlacePreview.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    previewTouchStart = touch ? { x: touch.clientX, y: touch.clientY, axis: null } : null;
    sheetWasDragged = false;
  }, { passive: true });
  mobilePlacePreview.addEventListener("touchmove", (event) => {
    if (!previewTouchStart || !selectedMobilePlace) return;
    const touch = event.touches[0];
    if (!touch) return;
    const horizontalDistance = touch.clientX - previewTouchStart.x;
    const verticalDistance = touch.clientY - previewTouchStart.y;
    movePreviewGesture(horizontalDistance, verticalDistance, previewTouchStart);
    if (previewTouchStart.axis) event.preventDefault();
  }, { passive: false });
  mobilePlacePreview.addEventListener("touchend", (event) => {
    if (!previewTouchStart || !selectedMobilePlace) return;
    const start = previewTouchStart;
    const touch = event.changedTouches[0];
    const horizontalDistance = (touch?.clientX ?? start.x) - start.x;
    const verticalDistance = (touch?.clientY ?? start.y) - start.y;
    completePreviewGesture(horizontalDistance, verticalDistance, start.axis);
  }, { passive: true });
  mobilePlacePreview.addEventListener("touchcancel", () => {
    resetPreviewGesture();
  });
  searchAreaButton?.addEventListener("click", async () => {
    const center = map.getCenter();
    const searchedBounds = map.getBounds();
    showViewportBoundary(searchedBounds, currentArea.name);
    searchAreaButton.disabled = true;
    searchAreaButton.textContent = "Loading places...";
    count.textContent = `Finding public places around ${currentArea.name}...`;
    try {
      await loadNearbyPlaces(
        center.lat,
        center.lng,
        currentArea.name,
        radiusForCurrentView(),
      );
      viewportMode = true;
      render();
      searchAreaButton.hidden = true;
    } catch (error) {
      count.textContent = error.message;
    } finally {
      searchAreaButton.disabled = false;
      searchAreaButton.textContent = "Update places here";
    }
  });
  locationButton.addEventListener("click", () => {
    if (nearbyMode && userLocation) {
      setMapCenter(userLocation.latitude, userLocation.longitude, searchRadiusMiles <= 5 ? 13 : 12);
      locationStatus.textContent = `Showing places within ${searchRadiusMiles} miles.`;
      render();
      return;
    }

    if (!navigator.geolocation) {
      locationStatus.textContent = "Location is not supported in this browser.";
      showMapStartLocationFallback("Location is not available here. Search a city or address instead.");
      return;
    }

    locationButton.disabled = true;
    locationButtonLabel.textContent = "Finding you...";
    locationStatus.textContent = "";
    locationWatchId = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        if (nearbyMode && userLocationMarker) {
          userLocation = {
            latitude: coords.latitude,
            longitude: coords.longitude,
          };
          userLocationMarker.setLatLng([
            userLocation.latitude,
            userLocation.longitude,
          ]);
          updateUserLocationMarkerScale();
          render();
          renderGuide();
          return;
        }
        userLocation = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
        if (locationLoadInProgress) return;
        locationLoadInProgress = true;
        try {
          locationStatus.textContent = "Loading nearby public places...";
          const coarseLatitude = Math.round(coords.latitude * 1000) / 1000;
          const coarseLongitude = Math.round(coords.longitude * 1000) / 1000;
          await loadNearbyPlaces(
            coarseLatitude,
            coarseLongitude,
            "",
            searchRadiusMeters(),
          );
        } catch (error) {
          const failedGuidePlace = pendingGuidePlace;
          userLocation = null;
          pendingGuidePlace = null;
          locationLoadInProgress = false;
          stopLocationWatch();
          locationButton.disabled = false;
          locationButtonLabel.textContent = "Near me";
          locationStatus.textContent = error.message;
          if (failedGuidePlace && selectedMobilePlace && placeKey(failedGuidePlace) === placeKey(selectedMobilePlace)) {
            const guideStatus = mobilePlacePreview.querySelector("[data-mobile-preview-guide-status]");
            const guideButton = mobilePlacePreview.querySelector("[data-mobile-preview-guide]");
            if (guideStatus) {
              guideStatus.hidden = false;
              guideStatus.textContent = "We could not load nearby places for guidance. Try again.";
            }
            if (guideButton) guideButton.textContent = "Try guide again";
          }
          showMapStartLocationFallback("We could not load this area. Search a city or address instead.");
          return;
        }
        nearbyMode = true;
        locationLoadInProgress = false;
        viewportMode = false;
        search.value = "";
        locationButton.disabled = false;
        locationButton.classList.add("is-active");
        mapDockLocate?.classList.add("is-active");
        locationButtonLabel.textContent = "Showing nearby";
        locationStatus.textContent = `Showing places within ${searchRadiusMiles} miles.`;
        locationLayer.clearLayers();
        userLocationMarker = null;
        const userLocationIcon = createUserLocationIcon();
        userLocationMarker = L.marker([userLocation.latitude, userLocation.longitude], {
          icon: userLocationIcon,
          title: "Your location",
          keyboard: false,
          zIndexOffset: 1000,
        })
          .bindTooltip("Your location")
          .addTo(locationLayer);
        const nearbyBounds = L.latLng(userLocation.latitude, userLocation.longitude)
          .toBounds(searchRadiusMeters() * 2);
        showViewportBoundary(nearbyBounds, "Places near you");
        closeMapStart("location");
        setMapCenter(
          userLocation.latitude,
          userLocation.longitude,
          searchRadiusMiles <= 5 ? 13 : searchRadiusMiles <= 10 ? 12 : 10,
        );
        render();
        const requestedGuide = pendingGuidePlace;
        if (requestedGuide) startGuide(requestedGuide);
        window.setTimeout(() => {
          updateUserLocationMarkerScale();
          if (!activeGuidePlace) {
            map.panTo([userLocation.latitude, userLocation.longitude], {
              animate: true,
              duration: 0.35,
            });
          }
        }, 80);
      },
      (error) => {
        const failedGuidePlace = pendingGuidePlace;
        locationLoadInProgress = false;
        pendingGuidePlace = null;
        stopLocationWatch();
        locationButton.disabled = false;
        locationButtonLabel.textContent = "Near me";
        const denied = error?.code === 1;
        locationStatus.textContent = denied
          ? "Location was not shared. Search an area instead."
          : "Location could not be accessed.";
        if (failedGuidePlace && selectedMobilePlace && placeKey(failedGuidePlace) === placeKey(selectedMobilePlace)) {
          const guideStatus = mobilePlacePreview.querySelector("[data-mobile-preview-guide-status]");
          const guideButton = mobilePlacePreview.querySelector("[data-mobile-preview-guide]");
          if (guideStatus) {
            guideStatus.hidden = false;
            guideStatus.textContent = denied
              ? "Location was not shared. Guide me needs your position."
              : "Your location could not be found. Try again.";
          }
          if (guideButton) guideButton.textContent = "Try guide again";
        }
        showMapStartLocationFallback(
          denied
            ? "No problem. Search a city, neighborhood, or address instead."
            : "We could not find your location. Search an area instead.",
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  });
  radiusDialog
    ?.querySelector("[data-close-radius-dialog]")
    ?.addEventListener("click", () => radiusDialog.close());
  radiusForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    searchRadiusMiles = Number(new FormData(radiusForm).get("radius")) || 10;
    setLocalRecord("auditmap:search-radius-miles", searchRadiusMiles);
    syncRadiusControl();
    radiusDialog.close();
    const center = userLocation && nearbyMode
      ? L.latLng(userLocation.latitude, userLocation.longitude)
      : map.getCenter();
    count.textContent = `Finding public places within ${searchRadiusMiles} miles...`;
    try {
      await loadNearbyPlaces(
        center.lat,
        center.lng,
        nearbyMode ? "" : currentArea.name,
        searchRadiusMeters(),
      );
      if (nearbyMode && userLocation) {
        const bounds = L.latLng(userLocation.latitude, userLocation.longitude)
          .toBounds(searchRadiusMeters() * 2);
        showViewportBoundary(bounds, "Places near you");
        setMapCenter(
          userLocation.latitude,
          userLocation.longitude,
          searchRadiusMiles <= 5 ? 13 : searchRadiusMiles <= 10 ? 12 : 10,
        );
      } else {
        viewportMode = true;
      }
      render();
    } catch (error) {
      count.textContent = error.message;
    }
  });
  if (!requestedCity && !hasStoredMapView && mapEntryComplete && navigator.permissions?.query) {
    navigator.permissions
      .query({ name: "geolocation" })
      .then(({ state }) => {
        if (state === "granted" && !nearbyMode) locationButton.click();
      })
      .catch(() => {});
  }

  function filterScopePlaces() {
    const query = search.value.trim();
    const mapBounds = map.getBounds().pad(0.12);
    const scope = nationwideMode
      ? places
      : nearbyMode && userLocation
        ? places.filter((place) => distanceMiles(userLocation, place) <= searchRadiusMiles)
        : viewportMode
          ? places.filter((place) => mapBounds.contains([place.latitude, place.longitude]))
          : query
            ? places
            : places.filter((place) => citySlug(place) === activeCity);
    return scope.filter((place) => placeMatchesSearch(place, query));
  }

  function filterFormSelection() {
    const formData = new FormData(filterDialogForm);
    return {
      visits: new Set(formData.getAll("visit-filter")),
      types: new Set(formData.getAll("place-type")),
    };
  }

  function placeMatchesFilterSelection(place, selection) {
    const matchesVisits = [...selection.visits].every(
      (filter) => visitFilterRules[filter]?.(place),
    );
    const matchesTypes =
      selection.types.size === 0 ||
      [...selection.types].some((filter) => placeTypeFilterRules[filter]?.(place));
    return matchesVisits && matchesTypes;
  }

  function updateFilterResultsPreview() {
    const selection = filterFormSelection();
    const matches = filterScopePlaces().filter(
      (place) => placeMatchesFilterSelection(place, selection),
    ).length;
    const label = `${matches} ${matches === 1 ? "place" : "places"}`;
    filterResultsPreview.textContent = `${label} match this map`;
    applyFilterButton.textContent = `Show ${label}`;
  }

  function syncFilterControls() {
    quickFilterButtons.forEach((button) => {
      const active = activeVisitFilters.has(button.dataset.visitFilter);
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    typeFilterOptions.querySelectorAll("input").forEach((input) => {
      input.checked = activeTypeFilters.has(input.value);
    });
    visitFilterOptions.querySelectorAll("input").forEach((input) => {
      input.checked = activeVisitFilters.has(input.value);
    });
    const activeFilterCount =
      activeVisitFilters.size + activeTypeFilters.size + (activeMinRating ? 1 : 0);
    moreFilterButton.classList.toggle("is-active", activeFilterCount > 0);
    moreFilterCount.hidden = activeFilterCount === 0;
    moreFilterCount.textContent = activeFilterCount || "";
    filterLaunchButtons.forEach((button) => {
      button.classList.toggle("is-active", activeFilterCount > 0);
      button.setAttribute(
        "aria-label",
        activeFilterCount
          ? `Filter places, ${activeFilterCount} active`
          : "Filter places",
      );
    });
    filterCountBadges.forEach((badge) => {
      badge.hidden = activeFilterCount === 0;
      badge.textContent = activeFilterCount || "";
    });
    clearFilterChip.hidden =
      activeVisitFilters.size === 0 &&
      activeTypeFilters.size === 0 &&
      activeMinRating === 0;
    updateFilterResultsPreview();
  }

  function clearAllFilters() {
    activeVisitFilters.clear();
    activeTypeFilters.clear();
    activeMinRating = 0;
    syncFilterControls();
    render();
  }

  quickFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.visitFilter;
      if (activeVisitFilters.has(filter)) {
        activeVisitFilters.delete(filter);
      } else {
        activeVisitFilters.add(filter);
      }
      syncFilterControls();
      render();
    });
  });
  moreFilterButton.addEventListener("click", () => {
    syncFilterControls();
    filterDialog.showModal();
    window.setTimeout(updateFilterResultsPreview, 0);
  });
  filterLaunchButtons.forEach((button) => {
    button.addEventListener("click", () => {
      syncFilterControls();
      filterDialog.showModal();
      window.setTimeout(updateFilterResultsPreview, 0);
    });
  });
  clearFilterChip.addEventListener("click", clearAllFilters);
  document.querySelector("#clear-all-filters").addEventListener("click", () => {
    filterDialogForm.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.checked = false;
    });
    updateFilterResultsPreview();
  });
  filterDialog
    .querySelector("[data-close-filter-dialog]")
    .addEventListener("click", () => filterDialog.close());
  filterDialogForm.addEventListener("change", updateFilterResultsPreview);
  filterDialogForm.addEventListener("submit", (event) => {
    event.preventDefault();
    activeVisitFilters.clear();
    activeTypeFilters.clear();
    const formData = new FormData(filterDialogForm);
    formData
      .getAll("visit-filter")
      .forEach((filter) => activeVisitFilters.add(filter));
    formData
      .getAll("place-type")
      .forEach((type) => activeTypeFilters.add(type));
    activeMinRating = 0;
    syncFilterControls();
    filterDialog.close();
    render();
  });
  syncFilterControls();

  const addDialog = document.querySelector("#add-place-dialog");
  const addForm = document.querySelector("#add-place-form");
  document.querySelector("#add-place-button").addEventListener("click", () => {
    const activePlace = places.find((place) => citySlug(place) === activeCity);
    addForm.elements.city.value = activePlace?.city || "";
    addForm.elements.state.value = activePlace?.state || "";
    addDialog.showModal();
  });
  addDialog.querySelector("[data-close-dialog]").addEventListener("click", () => addDialog.close());
  addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(addForm));
    const drafts = getLocalRecord("auditmap:place-drafts", []);
    drafts.push({
      ...values,
      id: crypto.randomUUID(),
      status: "pending",
      submittedAt: new Date().toISOString(),
    });
    setLocalRecord("auditmap:place-drafts", drafts);
    document.querySelector("#add-place-status").textContent =
      "Draft saved. It is ready for a future moderation queue.";
    addForm.reset();
  });

  map.on("moveend", handleMapMoved);
  if (!viewportMode) {
    suppressMoveResponse = true;
    window.setTimeout(() => {
      suppressMoveResponse = false;
    }, 450);
  }
  // The nationwide base map is already at the intended framing. Refitting after
  // catalog load replaces visible tiles and creates a needless second paint.
  render({ fitMap: !viewportMode && !nationwideMode });
  if (requestedExplorerId) {
    const requestedExplorerPlace = places.find(
      (place) => place.id === requestedExplorerId && explorerEligible(place),
    );
    if (requestedExplorerPlace) {
      window.setTimeout(() => enterExplorerMode(requestedExplorerPlace), 180);
    }
  }
  if (shouldRestoreMap && storedMapView?.selectedPlaceId) {
    const restoredPlace = places.find(
      (place) =>
        place.id === storedMapView.selectedPlaceId &&
        (!storedMapView.selectedPlaceCitySlug ||
          citySlug(place) === storedMapView.selectedPlaceCitySlug),
    );
    if (restoredPlace) {
      window.setTimeout(() => selectPlaceOnMap(restoredPlace), 180);
    }
  }
  if (
    !requestedCity &&
    !hasStoredMapView &&
    !mapEntryComplete &&
    mapParams.get("browse") !== "all"
  ) {
    openMapStart();
  }
  window.requestAnimationFrame(() => document.body.classList.add("is-map-ready"));
}

async function showCommunityProfile(slug) {
  let dialog = document.querySelector("#community-profile-dialog");
  if (!dialog) {
    document.body.insertAdjacentHTML("beforeend", `<dialog class="site-dialog community-profile-dialog" id="community-profile-dialog"><div class="nav-dialog-inner"><div class="dialog-heading"><div><p class="kicker">Community impact</p><h2>Loading contributor…</h2></div><button class="icon-button" type="button" aria-label="Close">${navIcon("close")}</button></div><div class="community-profile-content"></div></div></dialog>`);
    dialog = document.querySelector("#community-profile-dialog");
    dialog.querySelector(".icon-button").addEventListener("click", () => dialog.close());
  }
  dialog.showModal();
  const content = dialog.querySelector(".community-profile-content");
  content.innerHTML = '<p class="dialog-copy">Gathering the crumbs they have shared…</p>';
  try {
    const response = await fetch(`/api/profile?slug=${encodeURIComponent(slug)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    const profile = payload.profile;
    dialog.querySelector("h2").textContent = profile.displayName;
    const profileMark = profile.avatarUrl
      ? `<span class="has-photo"><img src="${escapeHtml(profile.avatarUrl)}" alt="" /></span>`
      : `<span>${escapeHtml(profile.level.label.slice(0, 1))}</span>`;
    content.innerHTML = `<div class="community-profile-level">${profileMark}<div><strong>${escapeHtml(profile.level.label)}</strong><small>Helping public places become easier to explore</small></div></div><div class="community-impact-grid"><div><strong>${Number(profile.approvedCrumbs || 0)}</strong><span>approved crumbs</span></div><div><strong>${Number(profile.verifiedCrumbs || 0)}</strong><span>verified</span></div><div><strong>${Number(profile.placesHelped || 0)}</strong><span>places helped</span></div><div><strong>${Number(profile.thanks || 0)}</strong><span>thanks</span></div></div><div class="community-badge-list">${(profile.badges || []).map((badge) => `<span>${escapeHtml(String(badge.badge_key).replaceAll("_", " "))}</span>`).join("") || '<span>First badge on the way</span>'}</div>`;
  } catch (error) {
    content.innerHTML = `<p class="dialog-copy">${escapeHtml(error.message || "This profile is unavailable right now.")}</p>`;
  }
}

function renderReviews(place, contributions) {
  const commentList = document.querySelector("#comment-list");
  const seedComments = (place.comments || []).map((comment, index) => ({
    ...comment,
    id: comment.id || `seed-${place.id}-${index}`,
  }));
  contributions.comments.forEach((comment, index) => {
    if (!comment.id) comment.id = `local-${place.id}-${index}`;
  });
  const comments = [...seedComments, ...contributions.comments];
  const commentIds = new Set(comments.map((comment) => comment.id));
  const rootComments = comments.filter(
    (comment) => !comment.parentId || !commentIds.has(comment.parentId),
  );
  const ratings = contributions.comments
    .map((comment) => Number(comment.rating))
    .filter((rating) => rating >= 1 && rating <= 5);
  const average = ratings.length
    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    : null;

  renderPlaceRating(place, average, ratings.length);
  document.querySelector("#review-count").textContent =
    `${comments.length} ${comments.length === 1 ? "post" : "posts"}`;
  const feedCount = document.querySelector("#community-feed-count");
  if (feedCount) feedCount.textContent = `${rootComments.length} ${rootComments.length === 1 ? "thread" : "threads"}`;
  const feedToolbar = document.querySelector("#community-feed-toolbar");
  const communityKind = (comment) => {
    if (comment.context === "question") return "questions";
    if (["confirmation", "correction"].includes(comment.context) || (comment.verificationStatus && comment.verificationStatus !== "unverified")) return "verified";
    return "updates";
  };
  const activeFilter = feedToolbar?.dataset.activeFilter || "all";
  if (feedToolbar) {
    const counts = rootComments.reduce((totals, comment) => {
      totals[communityKind(comment)] += 1;
      return totals;
    }, { questions: 0, updates: 0, verified: 0 });
    feedToolbar.innerHTML = [
      ["all", "All", rootComments.length],
      ["questions", "Questions", counts.questions],
      ["updates", "Updates", counts.updates],
      ["verified", "Confirmed", counts.verified],
    ].map(([value, label, count]) => `<button type="button" data-community-filter="${value}" class="${value === activeFilter ? "is-active" : ""}" aria-pressed="${value === activeFilter}">${label}<span>${count}</span></button>`).join("");
  }

  function commentMarkup(comment, isReply = false) {
    const replies = comments.filter((candidate) => candidate.parentId === comment.id);
    const contributor = comment.contributor;
    const authorName = contributor?.displayName || comment.author || "Local contributor";
    const initials = authorName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "A";
    const avatarMarkup = contributor?.avatarUrl
      ? `<span class="comment-avatar has-photo"><img src="${escapeHtml(contributor.avatarUrl)}" alt="" /></span>`
      : `<span class="comment-avatar${comment.isAi ? " is-auditmap" : ""}" aria-hidden="true">${escapeHtml(comment.isAi ? "A" : initials)}</span>`;
    const typeLabel = comment.isAi
      ? comment.answerStatus === "needs_verification"
        ? "AI answer · needs review"
        : "Sourced AuditMap answer"
      : comment.knowledgeIntent
      ? "Answer context"
      : {
          question: "Question",
          observation: "Visit update",
          confirmation: "Confirmation",
          correction: "Correction",
          review: "Review",
          reply: "Reply",
        }[comment.context] || (comment.rating ? "Review" : "Local context");
    const badge = contributor?.badges?.[0]?.badge_key
      ? String(contributor.badges[0].badge_key).replaceAll("_", " ")
      : "";
    const identityMarkup = `
      ${avatarMarkup}
      <span class="comment-identity">
        <span class="comment-author-line">
          <strong>${contributor?.slug ? `<button class="comment-profile-link" type="button" data-profile-slug="${escapeHtml(contributor.slug)}">${escapeHtml(authorName)}</button>` : escapeHtml(authorName)}${comment.isAi ? ' <span class="ai-author-mark" aria-label="AI generated">AI</span>' : ""}</strong>
          ${comment.rating ? `<span class="review-rating" aria-label="${Number(comment.rating)} out of 5 stars">${"★".repeat(Number(comment.rating))}${"☆".repeat(5 - Number(comment.rating))}</span>` : ""}
        </span>
        <span class="comment-identity-meta">
          <span class="discussion-type">${escapeHtml(typeLabel)}</span>
          ${contributor?.level ? `<span class="contributor-level">${escapeHtml(contributor.level)}</span>` : ""}
          ${badge ? `<span class="contributor-badge">${escapeHtml(badge)}</span>` : ""}
          ${contributor?.verifiedCrumbs ? `<span>${Number(contributor.verifiedCrumbs)} verified</span>` : ""}
          ${comment.submittedAt ? `<time datetime="${escapeHtml(comment.submittedAt)}">${escapeHtml(formatAuditDate(comment.submittedAt))}</time>` : ""}
        </span>
      </span>
    `;
    const mediaMarkup = (comment.media || []).length
      ? `<div class="crumb-media-strip">${comment.media.map((media, index) => {
          const url = media.url || media.previewUrl;
          if (media.kind === "photo_360") {
            return `<div class="crumb-360-view" data-panorama-url="${escapeHtml(url)}"><img src="${escapeHtml(media.previewUrl || url)}" alt="${escapeHtml(media.alt || "360 degree community view")}" /><button type="button">Look around in 360°</button>${media.capturedAt ? `<span>360° · Captured ${escapeHtml(formatAuditDate(media.capturedAt))}</span>` : ""}</div>`;
          }
          return `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer" class="crumb-community-image${media.kind === "panorama" ? " is-panorama" : ""}"><img src="${escapeHtml(media.previewUrl || url)}" alt="${escapeHtml(media.alt || `Community photo ${index + 1}`)}" /><span>${media.kind === "panorama" ? "Panorama" : "Photo"}${media.capturedAt ? ` · Captured ${escapeHtml(formatAuditDate(media.capturedAt))}` : ""}</span></a>`;
        }).join("")}</div>`
      : "";
    const crumbMeta = !comment.isAi && (comment.locationLabel || comment.observedAt || comment.verificationStatus || comment.moderationPending || comment.localOnly)
      ? `<div class="crumb-community-meta">${comment.locationLabel ? `<span>${navIcon("location")} ${escapeHtml(comment.locationLabel)}</span>` : ""}${comment.observedAt ? `<span>Observed ${escapeHtml(formatAuditDate(comment.observedAt))}</span>` : ""}${comment.verificationStatus && comment.verificationStatus !== "unverified" ? `<span>${navIcon("check")} ${escapeHtml(comment.verificationStatus)}</span>` : ""}${comment.moderationPending ? "<span>Waiting for review</span>" : ""}${comment.localOnly ? "<span>Saved on this device</span>" : ""}</div>`
      : "";
    const bodyMarkup = `
              ${isReply ? `<div class="comment-reply-identity">${identityMarkup}</div>` : ""}
              <p class="comment-full-text">${escapeHtml(comment.text)}</p>
              ${mediaMarkup}
              ${crumbMeta}
              ${
                comment.isAi && comment.sources?.length
                  ? `<div class="ai-reply-sources" aria-label="Sources">
                      ${comment.sources
                        .map(
                          (source) =>
                            `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)} ↗</a>`,
                        )
                        .join("")}
                    </div>`
                  : ""
              }
              <div class="comment-actions">
                ${
                  contributions.comments.some((item) => item.id === comment.id)
                    ? `<button class="helpful-button" type="button" data-helpful-id="${escapeHtml(comment.id)}">
                      Helpful${comment.helpful ? ` · ${comment.helpful}` : ""}
                    </button>`
                    : ""
                }
                ${
                  !comment.isAi && /^[0-9a-f-]{36}$/i.test(comment.id)
                    ? `<button class="report-button" type="button" data-report-id="${escapeHtml(comment.id)}">Report</button>`
                    : ""
                }
                ${
                  !isReply
                    ? `<button class="reply-button" type="button" data-reply-id="${escapeHtml(comment.id)}">
                        Reply${replies.length ? ` · ${replies.length}` : ""}
                      </button>`
                    : ""
                }
              </div>
              ${
                !isReply
                  ? `<div class="reply-composer" data-reply-composer="${escapeHtml(comment.id)}" hidden>
                      <input maxlength="120" placeholder="Name or nickname" aria-label="Your name" />
                      <textarea maxlength="1200" placeholder="Write a helpful reply..."></textarea>
                      <div>
                        <button type="button" data-submit-reply="${escapeHtml(comment.id)}">Post reply</button>
                        <button type="button" data-cancel-reply="${escapeHtml(comment.id)}">Cancel</button>
                      </div>
                    </div>`
                  : ""
              }
    `;
    if (isReply) {
      return `<article class="comment is-reply${comment.isAi ? " is-ai-reply" : ""}" data-comment-id="${escapeHtml(comment.id)}">${bodyMarkup}</article>`;
    }
    return `
      <details class="comment-thread${comment.isAi ? " is-ai-thread" : ""}" data-comment-id="${escapeHtml(comment.id)}" data-community-kind="${communityKind(comment)}">
        <summary>
          ${identityMarkup}
          <span class="comment-preview">${escapeHtml(comment.text)}</span>
          <span class="comment-thread-hint">${replies.length ? `${replies.length} ${replies.length === 1 ? "reply" : "replies"}` : "Open note"}</span>
        </summary>
        <div class="comment-thread-body">
          ${bodyMarkup}
          ${replies.length ? `<div class="comment-replies"><p>${replies.length} ${replies.length === 1 ? "reply" : "replies"}</p>${replies.map((reply) => commentMarkup(reply, true)).join("")}</div>` : ""}
        </div>
      </details>
    `;
  }

  commentList.innerHTML = comments.length
    ? rootComments.map((comment) => commentMarkup(comment)).join("")
    : '<div class="empty-state">No posts yet. Ask the first question or share a useful update.</div>';

  const applyCommunityFilter = (filter) => {
    if (feedToolbar) feedToolbar.dataset.activeFilter = filter;
    commentList.querySelectorAll(".comment-thread").forEach((thread) => {
      thread.hidden = filter !== "all" && thread.dataset.communityKind !== filter;
    });
    feedToolbar?.querySelectorAll("[data-community-filter]").forEach((button) => {
      const active = button.dataset.communityFilter === filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const visibleThreads = [...commentList.querySelectorAll(".comment-thread")].filter((thread) => !thread.hidden);
    let emptyState = commentList.querySelector(".community-filter-empty");
    if (!visibleThreads.length && comments.length) {
      if (!emptyState) {
        emptyState = document.createElement("div");
        emptyState.className = "empty-state community-filter-empty";
        commentList.append(emptyState);
      }
      emptyState.textContent = "Nothing in this view yet. You can help start it.";
    } else {
      emptyState?.remove();
    }
  };
  feedToolbar?.querySelectorAll("[data-community-filter]").forEach((button) => {
    button.addEventListener("click", () => applyCommunityFilter(button.dataset.communityFilter));
  });
  applyCommunityFilter(activeFilter);

  commentList.querySelectorAll("[data-profile-slug]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showCommunityProfile(button.dataset.profileSlug);
    });
  });
  commentList.querySelectorAll("[data-report-id]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!activeAccountSession?.accessToken) {
        openAccountDialog("safety");
        return;
      }
      const panel = document.querySelector("#report-panel");
      const form = panel?.querySelector("form");
      if (!panel || !form) return;
      form.dataset.contributionId = button.dataset.reportId;
      form.querySelector(".form-status").textContent = "";
      panel.showModal();
    });
  });
  commentList.querySelectorAll(".crumb-360-view button").forEach((button) => {
    button.addEventListener("click", () => {
      const container = button.closest(".crumb-360-view");
      if (!window.pannellum?.viewer) return;
      container.innerHTML = "";
      window.pannellum.viewer(container, {
        type: "equirectangular",
        panorama: container.dataset.panoramaUrl,
        autoLoad: true,
        showControls: true,
        compass: false,
      });
    });
  });

  commentList.querySelectorAll("[data-helpful-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const comment = contributions.comments.find(
        (item) => item.id === button.dataset.helpfulId,
      );
      if (!comment || comment.helpfulByViewer) return;
      if (/^[0-9a-f-]{36}$/i.test(comment.id)) {
        if (!activeAccountSession?.accessToken) {
          openAccountDialog("thanks");
          return;
        }
        const response = await fetch("/api/feed?action=thank", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${activeAccountSession.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ contributionId: comment.id }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) return;
        comment.helpful = payload.helpful;
      } else {
        comment.helpful = Number(comment.helpful || 0) + 1;
      }
      comment.helpfulByViewer = true;
      setLocalRecord(`auditmap:${place.id}`, contributions);
      renderReviews(place, contributions);
    });
  });
  commentList.querySelectorAll("[data-reply-id]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!activeAccountSession?.accessToken) {
        openAccountDialog("conversation");
        return;
      }
      const composer = commentList.querySelector(
        `[data-reply-composer="${CSS.escape(button.dataset.replyId)}"]`,
      );
      composer.hidden = false;
      composer.querySelector("textarea").focus();
    });
  });
  commentList.querySelectorAll("[data-cancel-reply]").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest(".reply-composer").hidden = true;
    });
  });
  commentList.querySelectorAll("[data-submit-reply]").forEach((button) => {
    button.addEventListener("click", async () => {
      const composer = button.closest(".reply-composer");
      const text = composer.querySelector("textarea").value.trim();
      if (!text) return;
      const reply = {
        id: `local-${crypto.randomUUID()}`,
        parentId: button.dataset.submitReply,
        author: composer.querySelector("input").value.trim() || "Local contributor",
        text,
        context: "reply",
        submittedAt: new Date().toISOString(),
      };
      contributions.comments.push(reply);
      setLocalRecord(`auditmap:${place.id}`, contributions);
      renderReviews(place, contributions);
      if (isUuid(reply.parentId)) {
        await submitSharedContribution(place, {
          authorName: reply.author,
          type: "observation",
          parentId: reply.parentId,
          body: reply.text,
          submittedAt: reply.submittedAt,
        });
      }
    });
  });
}

function renderPlaceRating(place, communityAverage, communityRatingCount) {
  const rating = communityAverage || Number(place.externalRating?.value || place.rating);
  const ratingElement = document.querySelector("#place-rating");

  if (!rating || rating < 1 || rating > 5) {
    ratingElement.innerHTML = '<span class="rating-empty">Not yet rated</span>';
    return;
  }

  const externalSource = getExternalRatingSource(place);
  const sourceLabel = communityAverage
    ? "AuditMap community"
    : externalSource.label;
  const sourceUrl = communityAverage
    ? "#comment-list"
    : externalSource.url;
  const sourceNote = communityAverage
    ? `${communityRatingCount} ${communityRatingCount === 1 ? "rating" : "ratings"}`
    : [
        place.externalRating?.count
          ? `${Number(place.externalRating.count).toLocaleString()} reviews`
          : "external rating",
        place.externalRating?.checkedAt
          ? `checked ${place.externalRating.checkedAt}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

  ratingElement.innerHTML = `
    <span class="rating-score">${rating.toFixed(1)}</span>
    <span class="star-rating" role="img" aria-label="${rating.toFixed(1)} out of 5 stars">
      <span class="star-rating-base" aria-hidden="true">★★★★★</span>
      <span class="star-rating-fill" aria-hidden="true" style="width: ${rating * 20}%">★★★★★</span>
    </span>
    <a href="${escapeHtml(sourceUrl)}"${communityAverage ? "" : ' target="_blank" rel="noreferrer"'}>
      ${escapeHtml(sourceLabel)}
    </a>
    <span class="rating-note">· ${escapeHtml(sourceNote)}</span>
  `;
}

function getGalleryPhotos(place, contributions) {
  const subsiteImages = place.parentPlace
    ? []
    : (place.features || [])
        .filter(
          (feature) =>
            feature.details?.imageUrl && feature.details?.includeInParentGallery !== false,
        )
        .map((feature) => ({
          url: feature.details.imageUrl,
          source:
            feature.details.imageSourceUrl ||
            feature.source_url ||
            place.source,
          author:
            feature.details.imageAuthor ||
            feature.source_label ||
            place.sourceLabel,
          license: feature.details.imageLicense || "Source terms apply",
          alt: feature.details.imageAlt || `${feature.name} at ${place.name}`,
          label: feature.name,
          origin: "subsite",
          featureId: feature.id,
          latitude: Number(feature.latitude),
          longitude: Number(feature.longitude),
        }));
  const sourcedImages = [
    place.image,
    ...(place.images || []),
    ...subsiteImages,
  ].filter(
    (image, index, images) =>
      image?.url && images.findIndex((candidate) => candidate?.url === image.url) === index,
  );
  const seedPhotos = sourcedImages.map((image) => ({
    data: image.url,
    alt: image.alt || place.name,
    credit: [image.label, image.author, image.license].filter(Boolean).join(" · "),
    source: image.source || place.source,
    featureId: image.featureId || image.location?.featureId || null,
    latitude: Number(image.latitude ?? image.location?.latitude),
    longitude: Number(image.longitude ?? image.location?.longitude),
  }));
  const communityPhotos = (contributions.comments || []).flatMap((comment) =>
    (comment.media || [])
      .filter((media) => ["photo", "panorama"].includes(media.kind) && (media.url || media.previewUrl))
      .map((media, index) => ({
        data: media.url || media.previewUrl,
        alt: media.alt || `${place.name} community photo ${index + 1}`,
        credit: [
          comment.contributor?.displayName || comment.author || "Community contributor",
          media.capturedAt ? `Captured ${formatAuditDate(media.capturedAt)}` : null,
        ].filter(Boolean).join(" · "),
        source: null,
        featureId: media.featureId || comment.featureId || null,
        latitude: Number(media.latitude ?? comment.latitude),
        longitude: Number(media.longitude ?? comment.longitude),
      })),
  );
  return [...seedPhotos, ...(contributions.photos || []), ...communityPhotos];
}

function renderGallery(place, contributions, requestedIndex = 0) {
  const gallery = document.querySelector("#place-gallery");
  const frame = gallery.querySelector(".gallery-frame");
  const image = document.querySelector("#gallery-image");
  const credit = document.querySelector("#gallery-credit");
  const dots = document.querySelector("#gallery-dots");
  const previous = document.querySelector("#gallery-previous");
  const next = document.querySelector("#gallery-next");
  const photos = getGalleryPhotos(place, contributions);
  const panoramaLaunch = document.querySelector("#gallery-360-launch");
  const gallery360 = place360MediaItems(place, contributions.comments || []);

  if (!photos.length && gallery360.length) {
    const first360 = gallery360[0];
    photos.push({
      data: first360.previewUrl || first360.url,
      alt: first360.title || `${place.name} 360 degree view`,
      credit: first360.context || "Community 360°",
      source: first360.sourceUrl || null,
    });
  }

  if (panoramaLaunch) {
    panoramaLaunch.hidden = !gallery360.length;
    if (gallery360.length) {
      panoramaLaunch.innerHTML = gallery360[0].isDemo
        ? "<span>360°</span><strong>Viewer demo</strong><small>Not captured here</small>"
        : `<span>360°</span><strong>Look around</strong><small>${gallery360.length} immersive ${gallery360.length === 1 ? "view" : "views"}</small>`;
      panoramaLaunch.onclick = () => openPlace360Viewer(place, gallery360);
    }
  }

  if (!photos.length) {
    gallery.hidden = false;
    gallery.classList.add("is-missing-photo");
    frame.querySelector(".gallery-photo-cta")?.remove();
    image.hidden = true;
    credit.hidden = true;
    previous.hidden = true;
    next.hidden = true;
    dots.hidden = true;
    let emptyState = frame.querySelector(".missing-photo-detail");
    if (!emptyState) {
      frame.insertAdjacentHTML(
        "afterbegin",
        `<button class="missing-photo-detail" type="button" aria-label="Add a photo of ${escapeHtml(place.name)}">
          ${missingPhotoIcon()}
          <strong>Picture this place</strong>
          <span>This site could use a photo. Be the one who puts it on the map.</span>
          <small>Add a photo</small>
        </button>`,
      );
      emptyState = frame.querySelector(".missing-photo-detail");
    }
    emptyState.onclick = () => window.openAuditMapCrumb?.("photo");
    return;
  }

  let activeIndex = Math.min(requestedIndex, photos.length - 1);
  gallery.hidden = false;
  gallery.classList.remove("is-missing-photo");
  frame.querySelector(".missing-photo-detail")?.remove();
  image.hidden = false;
  credit.hidden = false;
  dots.hidden = false;
  let photoCta = frame.querySelector(".gallery-photo-cta");
  if (!photoCta) {
    frame.insertAdjacentHTML(
      "beforeend",
      `<button class="gallery-photo-cta" type="button" aria-label="Add your photos of ${escapeHtml(place.name)}">
        ${missingPhotoIcon()}
        <span>Add photos</span>
      </button>`,
    );
    photoCta = frame.querySelector(".gallery-photo-cta");
  }
  photoCta.onclick = () => window.openAuditMapCrumb?.("photo");
  let photoMap = frame.querySelector(".gallery-photo-map");
  if (!photoMap) {
    frame.insertAdjacentHTML(
      "beforeend",
      `<button class="gallery-photo-map" type="button" hidden>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z"/><path d="M9 4v14M15 6v14"/></svg>
        <span>Show on map</span>
      </button>`,
    );
    photoMap = frame.querySelector(".gallery-photo-map");
  }

  function show(index, direction = 0) {
    const previousIndex = activeIndex;
    activeIndex = (index + photos.length) % photos.length;
    const photo = photos[activeIndex];
    const hasPhotoPin =
      photo.featureId ||
      (Number.isFinite(photo.latitude) && Number.isFinite(photo.longitude));
    photoMap.hidden = !hasPhotoPin;
    photoMap.onclick = () => {
      if (
        Number.isFinite(photo.latitude) &&
        Number.isFinite(photo.longitude) &&
        window.focusAuditMapLocation
      ) {
        const focused = window.focusAuditMapLocation({
          latitude: photo.latitude,
          longitude: photo.longitude,
          label: photo.alt || `${place.name} photo`,
          featureId: photo.featureId || null,
        });
        if (focused) return;
      }
      if (photo.featureId && window.focusAuditMapFeature) {
        const focused = window.focusAuditMapFeature(photo.featureId);
        if (focused) return;
      }
      if (Number.isFinite(photo.latitude) && Number.isFinite(photo.longitude)) {
        window.open(
          `https://www.google.com/maps/search/?api=1&query=${photo.latitude},${photo.longitude}`,
          "_blank",
          "noopener,noreferrer",
        );
      }
    };
    if (image.dataset.sourceUrl !== photo.data) {
      image.srcset = /^data:|^blob:/i.test(photo.data)
        ? ""
        : [480, 640, 828, 1080, 1400]
            .map((width) => `${optimizedImageUrl(photo.data, width)} ${width}w`)
            .join(", ");
      image.sizes = "(max-width: 760px) 100vw, min(68vw, 1040px)";
      image.src = optimizedImageUrl(photo.data, 828);
      image.loading = activeIndex === 0 ? "eager" : "lazy";
      image.fetchPriority = activeIndex === 0 ? "high" : "auto";
      image.decoding = "async";
      image.dataset.sourceUrl = photo.data;
    }
    image.alt = photo.alt || `${place.name} photo ${activeIndex + 1}`;
    credit.innerHTML = photo.credit
      ? photo.source
        ? `<a href="${escapeHtml(photo.source)}" target="_blank" rel="noreferrer" title="${escapeHtml(photo.credit)}" aria-label="Photo source: ${escapeHtml(photo.credit)}">Photo source ↗</a>`
        : escapeHtml(photo.credit)
      : "Community photo";
    dots.querySelectorAll("button").forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === activeIndex);
      dot.setAttribute("aria-current", dotIndex === activeIndex ? "true" : "false");
    });
    const counter = dots.querySelector("span");
    if (counter) counter.textContent = `${activeIndex + 1} / ${photos.length}`;
    const motionDirection =
      direction || (activeIndex === previousIndex ? 0 : activeIndex > previousIndex ? 1 : -1);
    if (
      motionDirection &&
      image.animate &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      image.animate(
        [
          {
            opacity: 0.62,
            transform: `translate3d(${motionDirection * 12}%, 0, 0) scale(1.015)`,
          },
          { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
        ],
        {
          duration: 360,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      );
    }
  }

  dots.classList.toggle("is-counter", photos.length > 12);
  dots.innerHTML = photos.length > 12
    ? `<span aria-live="polite">${activeIndex + 1} / ${photos.length}</span>`
    : photos.length > 1
      ? photos
          .map(
            (_, index) =>
              `<button type="button" aria-label="Show photo ${index + 1}"${index === activeIndex ? ' class="is-active" aria-current="true"' : ""}></button>`,
          )
          .join("")
      : "";
  dots.querySelectorAll("button").forEach((dot, index) => {
    dot.addEventListener("click", () => show(index, index > activeIndex ? 1 : -1));
  });
  previous.hidden = photos.length < 2;
  next.hidden = photos.length < 2;
  previous.onclick = () => show(activeIndex - 1, -1);
  next.onclick = () => show(activeIndex + 1, 1);
  let swipeStart = null;
  frame.onpointerdown = (event) => {
    if (event.pointerType === "mouse" || event.target.closest("button")) return;
    swipeStart = {
      x: event.clientX,
      y: event.clientY,
      currentX: event.clientX,
      pointerId: event.pointerId,
    };
    frame.classList.add("is-swiping");
    frame.setPointerCapture(event.pointerId);
  };
  frame.onpointermove = (event) => {
    if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;
    swipeStart.currentX = event.clientX;
    const horizontalDistance = event.clientX - swipeStart.x;
    const verticalDistance = event.clientY - swipeStart.y;
    if (Math.abs(horizontalDistance) <= Math.abs(verticalDistance)) return;
    const resistedDistance = horizontalDistance * 0.28;
    image.style.transform = `translate3d(${resistedDistance}px, 0, 0) scale(0.995)`;
    image.style.opacity = String(Math.max(0.78, 1 - Math.abs(horizontalDistance) / 900));
  };
  frame.onpointerup = (event) => {
    if (!swipeStart || swipeStart.pointerId !== event.pointerId) return;
    const horizontalDistance = event.clientX - swipeStart.x;
    const verticalDistance = event.clientY - swipeStart.y;
    swipeStart = null;
    frame.classList.remove("is-swiping");
    image.style.transform = "";
    image.style.opacity = "";
    if (
      photos.length > 1 &&
      Math.abs(horizontalDistance) >= 44 &&
      Math.abs(horizontalDistance) > Math.abs(verticalDistance)
    ) {
      const direction = horizontalDistance < 0 ? 1 : -1;
      show(activeIndex + direction, direction);
    } else if (
      Math.abs(horizontalDistance) > Math.abs(verticalDistance) &&
      image.animate &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      image.animate(
        [
          { transform: `translate3d(${horizontalDistance * 0.28}px, 0, 0) scale(0.995)` },
          { transform: "translate3d(0, 0, 0) scale(1)" },
        ],
        { duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }
  };
  frame.onpointercancel = () => {
    swipeStart = null;
    frame.classList.remove("is-swiping");
    image.style.transform = "";
    image.style.opacity = "";
  };
  show(activeIndex);
}

function openPlace360Viewer(place, mediaItems, requestedIndex = 0) {
  let dialog = document.querySelector("#place-360-dialog");
  if (!dialog) {
    document.body.insertAdjacentHTML("beforeend", `
      <dialog class="place-360-dialog" id="place-360-dialog" aria-labelledby="place-360-title">
        <div class="place-360-shell">
          <header class="place-360-heading">
            <div><p class="kicker">See the place before you go</p><h2 id="place-360-title">360° view</h2><p id="place-360-context"></p></div>
            <button class="icon-button" type="button" data-close-360 aria-label="Close">${navIcon("close")}</button>
          </header>
          <div class="place-360-demo-note" id="place-360-demo-note" hidden><strong>Viewer prototype</strong><span>This scene is not ${escapeHtml(place.name)}. It tests how an approved community 360 will appear here.</span></div>
          <div class="place-360-stage" id="place-360-stage" aria-label="Interactive 360 degree view"></div>
          <footer class="place-360-footer"><div class="place-360-picker" id="place-360-picker"></div><a id="place-360-source" href="#" target="_blank" rel="noreferrer" hidden>Source and license ↗</a></footer>
        </div>
      </dialog>
    `);
    dialog = document.querySelector("#place-360-dialog");
    dialog.querySelector("[data-close-360]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }
  let viewer = null;
  const show = (index) => {
    const item = mediaItems[index];
    viewer?.destroy?.();
    const stage = dialog.querySelector("#place-360-stage");
    stage.innerHTML = "";
    dialog.querySelector("#place-360-title").textContent = item.title || `${place.name} in 360°`;
    dialog.querySelector("#place-360-context").textContent = item.context || "Interactive 360° view";
    dialog.querySelector("#place-360-demo-note").hidden = !item.isDemo;
    const source = dialog.querySelector("#place-360-source");
    source.hidden = !item.sourceUrl;
    if (item.sourceUrl) source.href = item.sourceUrl;
    dialog.querySelectorAll("[data-place-360-index]").forEach((button) => {
      const active = Number(button.dataset.place360Index) === index;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (!window.pannellum?.viewer) {
      stage.innerHTML = '<p class="place-360-error">The 360 viewer could not load. Open the source image instead.</p>';
      return;
    }
    viewer = window.pannellum.viewer(stage, {
      type: "equirectangular",
      panorama: item.url || item.previewUrl,
      autoLoad: true,
      showControls: true,
      compass: false,
      hfov: 105,
    });
  };
  const picker = dialog.querySelector("#place-360-picker");
  picker.innerHTML = mediaItems.length > 1
    ? mediaItems.map((item, index) => `<button type="button" data-place-360-index="${index}" aria-pressed="${index === requestedIndex}">${item.isDemo ? "Demo" : `View ${index + 1}`}</button>`).join("")
    : "";
  picker.querySelectorAll("[data-place-360-index]").forEach((button) => {
    button.addEventListener("click", () => show(Number(button.dataset.place360Index)));
  });
  dialog.showModal();
  show(Math.min(requestedIndex, mediaItems.length - 1));
  dialog.addEventListener("close", () => viewer?.destroy?.(), { once: true });
}

function isDocumentedFact(value) {
  if (!value) return false;
  if (typeof value !== "string") return true;
  return !/need(s)? (community )?(verification|documentation)|not yet documented|not recorded/i.test(
    value,
  );
}

function factIcon(label) {
  const icons = {
    Hours: '<circle cx="12" cy="12" r="8"></circle><path d="M12 7v5l3 2"></path>',
    Access: '<path d="M9 5h6M12 3v4M8 9h8l-1 12M9 21 8 9M8 14h8"></path>',
    Cost: '<circle cx="12" cy="12" r="8"></circle><path d="M14.5 8.5c-.7-.7-1.5-1-2.6-1-1.4 0-2.4.7-2.4 1.8 0 2.8 5 1.4 5 4.3 0 1.1-1 1.9-2.6 1.9-1.1 0-2.1-.4-2.9-1.2M12 5.5v13"></path>',
    Transit: '<path d="M6 17h12M7 17V8c0-2 2-3 5-3s5 1 5 3v9M8 10h8M9 20l-1-3M15 20l1-3"></path>',
    Amenities: '<path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z"></path>',
    Contact: '<path d="M8 12h8M12 8v8"></path><circle cx="12" cy="12" r="8"></circle>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[label] || icons.Contact}</svg>`;
}

function factPoints(label, value) {
  if (!value) return ["Not yet documented"];
  if (label === "Amenities") {
    return String(value).split(/,\s*/).map((item) => item.trim()).filter(Boolean);
  }
  const sentences = String(value)
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((item) => item.trim())
    .filter(Boolean);
  return sentences.length ? sentences : [String(value)];
}

function getPlaceFacts(place) {
  return [
    { key: "hours", label: "Hours", value: place.hours },
    { key: "accessibility", label: "Access", value: place.accessibility },
    { key: "cost", label: "Cost", value: place.cost },
    { key: "transit", label: "Transit", value: place.transit },
    { key: "amenities", label: "Amenities", value: (place.amenities || place.tags || []).join(", ") },
    { key: "contact", label: "Contact", value: place.contact || "Official contact links are provided on this page" },
  ];
}

function renderFacts(place) {
  const facts = getPlaceFacts(place);
  document.querySelector("#fact-grid").innerHTML = facts
    .map(
      ({ key, label, value }) => {
        const source = place.factSources?.[key] || {
          label: place.sourceLabel,
          url: place.source,
          checkedAt: place.verifiedAt,
        };
        return `
        <section class="fact ${isDocumentedFact(value) ? "is-documented" : "needs-check"}" data-fact-key="${escapeHtml(key)}">
          <div class="fact-heading">
            <span class="fact-icon">${factIcon(label)}</span>
            <h3>${escapeHtml(label)}</h3>
          </div>
          <ul>
            ${factPoints(label, value).map((point) => `
              <li><span class="fact-check" aria-hidden="true">${isDocumentedFact(value) ? "✓" : "?"}</span><span>${escapeHtml(point)}</span></li>
            `).join("")}
          </ul>
          <div class="fact-source" hidden>
            ${source?.url
              ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label || "Official source")}</a>`
              : `<span>${escapeHtml(source?.label || "Source pending")}</span>`}
            ${source?.checkedAt ? `<span>Checked ${escapeHtml(formatAuditDate(source.checkedAt))}</span>` : ""}
          </div>
          <div class="fact-community" data-fact-community="${escapeHtml(key)}"></div>
        </section>
      `;
      },
    )
    .join("");
  const sourceToggle = document.querySelector("#verified-sources-toggle");
  sourceToggle?.addEventListener("click", () => {
    const expanded = sourceToggle.getAttribute("aria-expanded") !== "true";
    sourceToggle.setAttribute("aria-expanded", String(expanded));
    sourceToggle.querySelector("span").textContent = expanded ? "Hide sources" : "Sources";
    document.querySelectorAll("#fact-grid .fact-source").forEach((source) => {
      source.hidden = !expanded;
    });
    const recordMeta = document.querySelector("#verified-record-meta");
    if (recordMeta) recordMeta.hidden = !expanded;
  });
}

function parseClock(value, meridiem) {
  const [hoursText, minutesText = "0"] = String(value).split(":");
  let hours = Number(hoursText);
  const minutes = Number(minutesText);
  const period = String(meridiem || "").toLowerCase();
  if (period.startsWith("p") && hours !== 12) hours += 12;
  if (period.startsWith("a") && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function formatMinutes(value) {
  const hours = Math.floor(value / 60) % 24;
  const minutes = value % 60;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: minutes ? "2-digit" : undefined,
  }).format(new Date(2020, 0, 1, hours, minutes));
}

function placeTimeZone(place) {
  if (place.timeZone) return place.timeZone;
  const zonesByState = {
    AK: "America/Anchorage",
    AL: "America/Chicago",
    AR: "America/Chicago",
    AZ: "America/Phoenix",
    CA: "America/Los_Angeles",
    CO: "America/Denver",
    CT: "America/New_York",
    DC: "America/New_York",
    DE: "America/New_York",
    FL: "America/New_York",
    GA: "America/New_York",
    HI: "Pacific/Honolulu",
    IA: "America/Chicago",
    ID: "America/Boise",
    IL: "America/Chicago",
    IN: "America/Indiana/Indianapolis",
    KS: "America/Chicago",
    KY: "America/New_York",
    LA: "America/Chicago",
    MA: "America/New_York",
    MD: "America/New_York",
    ME: "America/New_York",
    MI: "America/Detroit",
    MN: "America/Chicago",
    MO: "America/Chicago",
    MS: "America/Chicago",
    MT: "America/Denver",
    NC: "America/New_York",
    ND: "America/Chicago",
    NE: "America/Chicago",
    NH: "America/New_York",
    NJ: "America/New_York",
    NM: "America/Denver",
    NV: "America/Los_Angeles",
    NY: "America/New_York",
    OH: "America/New_York",
    OK: "America/Chicago",
    OR: "America/Los_Angeles",
    PA: "America/New_York",
    RI: "America/New_York",
    SC: "America/New_York",
    SD: "America/Chicago",
    TN: "America/Chicago",
    TX: "America/Chicago",
    UT: "America/Denver",
    VA: "America/New_York",
    VT: "America/New_York",
    WA: "America/Los_Angeles",
    WI: "America/Chicago",
    WV: "America/New_York",
    WY: "America/Denver",
  };
  return zonesByState[String(place.state || "").toUpperCase()] || "America/New_York";
}

function localTimeInZone(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(values.hour) * 60 + Number(values.minute);
}

function localDateInZone(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function solarEventTime(place, timeZone, now, sunrise, dayOffset = 0) {
  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const localDate = localDateInZone(now, timeZone);
  const targetDate = new Date(
    Date.UTC(localDate.year, localDate.month - 1, localDate.day + dayOffset),
  );
  const yearStart = Date.UTC(targetDate.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((targetDate.getTime() - yearStart) / 86_400_000);
  const longitudeHour = longitude / 15;
  const approximateTime =
    dayOfYear + ((sunrise ? 6 : 18) - longitudeHour) / 24;
  const meanAnomaly = 0.9856 * approximateTime - 3.289;
  const trueLongitude =
    (meanAnomaly +
      1.916 * Math.sin((Math.PI / 180) * meanAnomaly) +
      0.02 * Math.sin((Math.PI / 90) * meanAnomaly) +
      282.634 +
      360) %
    360;
  let rightAscension =
    ((180 / Math.PI) *
      Math.atan(0.91764 * Math.tan((Math.PI / 180) * trueLongitude)) +
      360) %
    360;
  rightAscension +=
    Math.floor(trueLongitude / 90) * 90 -
    Math.floor(rightAscension / 90) * 90;
  rightAscension /= 15;
  const sinDeclination =
    0.39782 * Math.sin((Math.PI / 180) * trueLongitude);
  const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const cosHourAngle =
    (Math.cos((Math.PI / 180) * 90.833) -
      sinDeclination * Math.sin((Math.PI / 180) * latitude)) /
    (cosDeclination * Math.cos((Math.PI / 180) * latitude));
  if (cosHourAngle > 1 || cosHourAngle < -1) return null;
  const hourAngle =
    (sunrise
      ? 360 - (180 / Math.PI) * Math.acos(cosHourAngle)
      : (180 / Math.PI) * Math.acos(cosHourAngle)) / 15;
  const localMeanTime =
    hourAngle + rightAscension - 0.06571 * approximateTime - 6.622;
  const utcHours = (localMeanTime - longitudeHour + 24) % 24;
  let event = new Date(targetDate.getTime() + utcHours * 3_600_000);
  const targetKey = targetDate.toISOString().slice(0, 10);
  let eventLocal = localDateInZone(event, timeZone);
  let eventKey = `${eventLocal.year}-${String(eventLocal.month).padStart(2, "0")}-${String(eventLocal.day).padStart(2, "0")}`;
  if (eventKey < targetKey) event = new Date(event.getTime() + 86_400_000);
  if (eventKey > targetKey) event = new Date(event.getTime() - 86_400_000);
  return event;
}

function formatTimeInZone(value, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function structuredHoursStatus(schedule, timeZone, now) {
  if (!schedule || typeof schedule !== "object") return null;
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
  }).format(now).toLowerCase();
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const weekdayIndex = weekdays.indexOf(weekday);
  if (weekdayIndex < 0) return null;
  const parseTime = (value) => {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  };
  const periodsFor = (day) => (schedule[day] || [])
    .map((period) => [parseTime(period[0]), parseTime(period[1])])
    .filter(([opens, closes]) => Number.isFinite(opens) && Number.isFinite(closes));
  const current = localTimeInZone(now, timeZone);
  const todayPeriods = periodsFor(weekday);
  const active = todayPeriods.find(([opens, closes]) => current >= opens && current < closes);
  if (active) {
    return { state: "open", label: "Open now", summary: `until ${formatMinutes(active[1])}` };
  }
  const laterToday = todayPeriods.find(([opens]) => opens > current);
  if (laterToday) {
    return { state: "closed", label: "Closed now", summary: `opens at ${formatMinutes(laterToday[0])}` };
  }
  for (let offset = 1; offset <= 7; offset += 1) {
    const nextDay = weekdays[(weekdayIndex + offset) % 7];
    const nextPeriod = periodsFor(nextDay)[0];
    if (!nextPeriod) continue;
    return {
      state: "closed",
      label: "Closed now",
      summary: offset === 1
        ? `opens tomorrow at ${formatMinutes(nextPeriod[0])}`
        : `opens ${nextDay[0].toUpperCase()}${nextDay.slice(1)} at ${formatMinutes(nextPeriod[0])}`,
    };
  }
  return { state: "schedule", label: "Hours unavailable", summary: "view details" };
}

function isDaylightSavingTime(now, timeZone) {
  const zoneName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value;
  return /(?:EDT|CDT|MDT|PDT|AKDT|HDT)$/i.test(String(zoneName || ""));
}

function dailyHoursStatus(hoursText, timeZone, now = new Date(), place = {}) {
  if (place.temporarilyClosed === true) {
    return {
      state: "closed",
      label: "Closed now",
      summary: "temporarily closed",
    };
  }
  const structuredStatus = structuredHoursStatus(place.hoursSchedule, timeZone, now);
  if (structuredStatus) return structuredStatus;
  if (place.hoursSchedule === false) {
    return { state: "schedule", label: "Hours vary", summary: "view details" };
  }
  const text = String(hoursText || "");
  const daylightSavingHoursMatch = text.match(
    /(?:daily|every day)[^0-9]*(\d{1,2}(?::\d{2})?)\s*(a\.?m\.?|p\.?m\.?)\s*(?:-|–|to)\s*(\d{1,2}(?::\d{2})?)\s*(a\.?m\.?|p\.?m\.?).*?daylight-saving season.*?and\s*(\d{1,2}(?::\d{2})?)\s*(a\.?m\.?|p\.?m\.?)\s*(?:-|–|to)\s*(\d{1,2}(?::\d{2})?)\s*(a\.?m\.?|p\.?m\.?).*?standard-time season/i,
  );
  if (daylightSavingHoursMatch) {
    const offset = isDaylightSavingTime(now, timeZone) ? 1 : 5;
    const opens = parseClock(daylightSavingHoursMatch[offset], daylightSavingHoursMatch[offset + 1]);
    const closes = parseClock(daylightSavingHoursMatch[offset + 2], daylightSavingHoursMatch[offset + 3]);
    const current = localTimeInZone(now, timeZone);
    if (current >= opens && current < closes) {
      return { state: "open", label: "Open now", summary: `until ${formatMinutes(closes)}` };
    }
    return {
      state: "closed",
      label: "Closed now",
      summary: current < opens ? `opens at ${formatMinutes(opens)}` : `opens tomorrow at ${formatMinutes(opens)}`,
    };
  }
  const match = text.match(
    /(?:daily|every day)[^0-9]*(?:from\s*)?(\d{1,2}(?::\d{2})?)\s*(a\.?m\.?|p\.?m\.?)\s*(?:-|–|to)\s*(\d{1,2}(?::\d{2})?)\s*(a\.?m\.?|p\.?m\.?)/i,
  );
  if (!match) {
    const daylightMatch = text.match(
      /(\d{1,2}(?::\d{2})?)\s*(a\.?m\.?|p\.?m\.?).*?(?:until|to|-|–)\s*(?:dark|dusk|sunset)/i,
    );
    if (daylightMatch) {
      const opens = parseClock(daylightMatch[1], daylightMatch[2]);
      const current = localTimeInZone(now, timeZone);
      const sunset = solarEventTime(place, timeZone, now, false);
      if (current < opens) {
        return {
          state: "closed",
          label: "Closed now",
          summary: `opens at ${formatMinutes(opens)}`,
        };
      }
      if (sunset && now < sunset) {
        return {
          state: "open",
          label: "Open now",
          summary: `until around ${formatTimeInZone(sunset, timeZone)}`,
        };
      }
      return {
        state: "closed",
        label: "Closed now",
        summary: `opens tomorrow at ${formatMinutes(opens)}`,
      };
    }
    if (/(?:dawn|sunrise).*(?:midnight|12(?::00)?\s*a\.?m\.?)/i.test(text)) {
      const sunrise = solarEventTime(place, timeZone, now, true);
      if (sunrise) {
        if (now < sunrise) {
          return {
            state: "closed",
            label: "Closed now",
            summary: `opens around ${formatTimeInZone(sunrise, timeZone)}`,
          };
        }
        return { state: "open", label: "Open now", summary: "until midnight" };
      }
      return { state: "schedule", label: "Daily hours", summary: "dawn to midnight" };
    }
    if (/(?:dawn|sunrise).*(?:dusk|sunset)|sunset.*sunrise/i.test(text)) {
      const sunrise = solarEventTime(place, timeZone, now, true);
      const sunset = solarEventTime(place, timeZone, now, false);
      if (sunrise && sunset) {
        if (now < sunrise) {
          return {
            state: "closed",
            label: "Closed now",
            summary: `opens around ${formatTimeInZone(sunrise, timeZone)}`,
          };
        }
        if (now < sunset) {
          return {
            state: "open",
            label: "Open now",
            summary: `until around ${formatTimeInZone(sunset, timeZone)}`,
          };
        }
        const tomorrowSunrise = solarEventTime(place, timeZone, now, true, 1);
        return {
          state: "closed",
          label: "Closed now",
          summary: tomorrowSunrise
            ? `opens tomorrow around ${formatTimeInZone(tomorrowSunrise, timeZone)}`
            : "opens around dawn",
        };
      }
      return { state: "schedule", label: "Daily hours", summary: "dawn to dusk" };
    }
    return { state: "schedule", label: "Hours unavailable", summary: "view details" };
  }
  const opens = parseClock(match[1], match[2]);
  const closes = parseClock(match[3], match[4]);
  const current = localTimeInZone(now, timeZone);
  const isOpen = closes > opens
    ? current >= opens && current < closes
    : current >= opens || current < closes;
  if (isOpen) {
    return { state: "open", label: "Open now", summary: `until ${formatMinutes(closes)}` };
  }
  return {
    state: "closed",
    label: "Closed now",
    summary: current < opens
      ? `opens at ${formatMinutes(opens)}`
      : `opens tomorrow at ${formatMinutes(opens)}`,
  };
}

function renderHoursStatus(place) {
  const timeZone = placeTimeZone(place);
  const status = dailyHoursStatus(place.hours, timeZone, new Date(), place);
  const details = document.querySelector("#place-hours-details");
  document.querySelector("#place-hours-status").textContent = status.label;
  document.querySelector("#place-hours-summary").textContent = status.summary;
  details.dataset.hoursState = status.state;
  const timeZoneName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value;
  document.querySelector("#place-hours-time-zone").textContent =
    status.state === "schedule"
      ? `Published hours for ${place.city} local time${timeZoneName ? ` (${timeZoneName})` : ""}. A live status needs a complete official schedule.`
      : `Open/closed status uses ${place.city} local time${timeZoneName ? ` (${timeZoneName})` : ""}, not your device's time zone.`;
}

function placeVerificationPromptsByFact() {
  const list = document.querySelector("#verification-list");
  const section = document.querySelector("#quick-community-check");
  if (!list || !section) return;
  document.querySelectorAll("[data-fact-community]").forEach((target) => {
    const row = list.querySelector(
      `[data-verification-field="${CSS.escape(target.dataset.factCommunity)}"]`,
    );
    if (row) target.replaceChildren(row);
  });
  const verifiedSection = document.querySelector(".verified-information-section");
  const helpToggle = document.querySelector("#verified-help-toggle");
  const contributionMode = helpToggle?.getAttribute("aria-expanded") === "true";
  verifiedSection?.classList.toggle("is-contributing", contributionMode);
  const remaining = list.querySelectorAll("[data-verification-field]").length;
  section.hidden = remaining === 0;
  if (remaining) {
    const title = section.querySelector(".section-title");
    const intro = section.querySelector(".section-intro");
    if (title) title.textContent = "Help verify other details";
    if (intro) {
      intro.textContent =
        "These open questions do not yet have a natural home in the verified record.";
    }
  }
}

function setupVerifiedHelpToggle() {
  const toggle = document.querySelector("#verified-help-toggle");
  const section = document.querySelector(".verified-information-section");
  if (!toggle || !section || toggle.dataset.ready === "true") return;
  toggle.dataset.ready = "true";
  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.querySelector("span").textContent = expanded ? "Done verifying" : "Help us verify";
    section.classList.toggle("is-contributing", expanded);
  });
}

function renderVerificationPrompts(place, contributions) {
  const fieldIcons = {
    hours: "◷",
    access: "♿",
    cost: "$",
    transit: "↗",
    amenities: "•",
  };
  const evidencePrompts = {
    parking: "Share the visitor lot or deck name, entrance, price, and any accessible spaces you saw.",
    entrance: "Describe the public entrance, the street or lot it faces, and any door or security instructions.",
    restroom: "Share the floor or landmark, public hours, and any accessible, family, or changing-table features.",
    accessibility: "Describe the route from accessible parking or transit to the entrance and destination, including barriers.",
    closures: "Share what was open or closed, the date and time, and any posted reopening information.",
    fees: "Share the exact service or activity, price, payment method, and date you saw it.",
    transit: "Share the stop name, route, side of the street, and walking route to the entrance.",
  };
  const unresolvedPrompts = (place.searchAnswers || [])
    .filter(
      (answer) =>
        answer.verificationStatus &&
        answer.verificationStatus !== "verified",
    )
    .map((answer) => ({
      field: answer.intentKey || slugify(answer.question),
      question: `Can you verify: ${answer.question}`,
      value:
        evidencePrompts[answer.intentKey] ||
        "Share what you observed, when you visited, and any sign or source that supports it.",
      priority: answer.verificationStatus === "needs-verification" ? 0 : 1,
    }))
    .sort((left, right) => left.priority - right.priority);
  const unresolvedFields = new Set(unresolvedPrompts.map((prompt) => prompt.field));
  const generalPrompts = getPlaceFacts(place)
    .filter(({ label }) => label !== "Contact")
    .map(({ key, label, value }) => ({
      field: key,
      question: isDocumentedFact(value)
        ? `Is this ${label.toLowerCase()} information still accurate?`
        : `Can you help document ${label.toLowerCase()} for this place?`,
      value: isDocumentedFact(value) ? value : "No reliable information yet",
      priority: 2,
    }))
    .filter((prompt) => !unresolvedFields.has(prompt.field));
  const prompts = [...unresolvedPrompts, ...generalPrompts].slice(0, 6);
  const latestByField = new Map(
    contributions.verifications.map((verification) => [
      verification.field,
      verification,
    ]),
  );
  const completed = prompts.filter((prompt) => latestByField.has(prompt.field)).length;
  document.querySelector("#verification-count").textContent =
    completed ? `${completed} updated by you` : `${prompts.length} quick checks`;
  const list = document.querySelector("#verification-list");
  list.innerHTML = prompts
    .map((prompt) => {
      const response = latestByField.get(prompt.field);
      return `
        <article class="verification-row${response?.answer || response?.note ? " is-answered" : ""}" data-verification-field="${escapeHtml(prompt.field)}">
          <span class="verification-icon" aria-hidden="true">${fieldIcons[prompt.field] || "•"}</span>
          <div class="verification-copy">
            <span class="verification-field">${escapeHtml(prompt.field)}</span>
            <h3>${escapeHtml(prompt.question)}</h3>
            <p>${escapeHtml(prompt.value)}</p>
          </div>
          <div class="verification-actions">
            ${[
              ["Confirmed", "✓", "accurate"],
              ["Not accurate", "×", "incorrect"],
              ["Not sure", "?", "unsure"],
            ]
              .map(
                ([answer, icon, label]) => `
                  <button
                    type="button"
                    class="${response?.answer === answer ? "is-selected" : ""}"
                    aria-label="${response?.answer === answer ? "Clear" : "Mark"} ${escapeHtml(prompt.field)} as ${label}"
                    aria-pressed="${response?.answer === answer}"
                    title="${label[0].toUpperCase()}${label.slice(1)}"
                    data-verify-field="${escapeHtml(prompt.field)}"
                    data-verify-answer="${answer}"
                  >${icon}</button>
                `,
              )
              .join("")}
          </div>
          <div class="verification-note">
            <button class="verification-note-toggle" type="button" data-note-field="${escapeHtml(prompt.field)}">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
              </svg>
              ${response?.note ? "Edit note" : "Add note"}
            </button>
            ${response?.note ? `<p class="verification-note-preview">${escapeHtml(response.note)}</p>` : ""}
            <div class="verification-note-editor" data-note-editor="${escapeHtml(prompt.field)}" hidden>
              <textarea maxlength="500" placeholder="What did you notice?">${escapeHtml(response?.note || "")}</textarea>
              <div>
                <button type="button" data-save-note="${escapeHtml(prompt.field)}">Save note</button>
                <button type="button" data-cancel-note="${escapeHtml(prompt.field)}">Cancel</button>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
  list.querySelectorAll("[data-verify-field]").forEach((button) => {
    button.addEventListener("click", () => {
      const existing = contributions.verifications.find(
        (item) => item.field === button.dataset.verifyField,
      );
      if (existing?.answer === button.dataset.verifyAnswer) {
        if (existing.note) {
          existing.answer = null;
          existing.submittedAt = new Date().toISOString();
        } else {
          contributions.verifications = contributions.verifications.filter(
            (item) => item.field !== button.dataset.verifyField,
          );
        }
        setLocalRecord(`auditmap:${place.id}`, contributions);
        renderVerificationPrompts(place, contributions);
        return;
      }
      const verification = {
        field: button.dataset.verifyField,
        answer: button.dataset.verifyAnswer,
        note: existing?.note || "",
        submittedAt: new Date().toISOString(),
      };
      contributions.verifications = contributions.verifications.filter(
        (item) => item.field !== verification.field,
      );
      contributions.verifications.push(verification);
      setLocalRecord(`auditmap:${place.id}`, contributions);
      submitSharedContribution(place, {
        authorName: "Local visitor",
        type: verification.answer === "Confirmed" ? "confirmation" : "correction",
        body: `${verification.field}: ${verification.answer}`,
        submittedAt: verification.submittedAt,
        metadata: {
          verificationIntent: verification.field,
          verificationAnswer: verification.answer,
          verificationPrompt: prompts.find((prompt) => prompt.field === verification.field)?.question,
          evidenceRequest: prompts.find((prompt) => prompt.field === verification.field)?.value,
          observedAt: verification.submittedAt,
        },
      });
      renderVerificationPrompts(place, contributions);
    });
  });
  list.querySelectorAll("[data-note-field]").forEach((button) => {
    button.addEventListener("click", () => {
      const editor = list.querySelector(
        `[data-note-editor="${CSS.escape(button.dataset.noteField)}"]`,
      );
      editor.hidden = false;
      editor.querySelector("textarea").focus();
    });
  });
  list.querySelectorAll("[data-cancel-note]").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest(".verification-note-editor").hidden = true;
    });
  });
  list.querySelectorAll("[data-save-note]").forEach((button) => {
    button.addEventListener("click", () => {
      const field = button.dataset.saveNote;
      const editor = button.closest(".verification-note-editor");
      const note = editor.querySelector("textarea").value.trim();
      let verification = contributions.verifications.find(
        (item) => item.field === field,
      );
      if (!verification && note) {
        verification = {
          field,
          answer: null,
          submittedAt: new Date().toISOString(),
        };
        contributions.verifications.push(verification);
      }
      if (verification) {
        verification.note = note;
        verification.submittedAt = new Date().toISOString();
        if (!verification.answer && !note) {
          contributions.verifications = contributions.verifications.filter(
            (item) => item.field !== field,
          );
        }
      }
      setLocalRecord(`auditmap:${place.id}`, contributions);
      if (note) {
        const observedAt = new Date().toISOString();
        submitSharedContribution(place, {
          authorName: "Local visitor",
          type: "observation",
          body: `${field}: ${note}`,
          submittedAt: observedAt,
          metadata: {
            verificationIntent: field,
            verificationAnswer: verification?.answer || null,
            verificationPrompt: prompts.find((prompt) => prompt.field === field)?.question,
            evidenceRequest: prompts.find((prompt) => prompt.field === field)?.value,
            observedAt,
          },
        });
      }
      renderVerificationPrompts(place, contributions);
    });
  });
  placeVerificationPromptsByFact();
}

function focusRequestedVerification() {
  const field = new URLSearchParams(window.location.search).get("verify");
  if (!field) return;
  const row = document.querySelector(
    `[data-verification-field="${CSS.escape(field)}"]`,
  );
  const noteButton = row?.querySelector("[data-note-field]");
  if (!row || !noteButton) return;
  const helpToggle = document.querySelector("#verified-help-toggle");
  if (
    row.closest(".fact-community") &&
    helpToggle?.getAttribute("aria-expanded") !== "true"
  ) {
    helpToggle.click();
  }
  row.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => noteButton.click(), 350);
}

function renderContact(place) {
  const fullAddress = formatPlaceAddress(place);
  document.querySelector("#contact-website").href = place.source;
  document.querySelector("#contact-address").textContent = fullAddress;
  const detail = document.querySelector("#contact-detail");
  const contactParts = [place.phone, place.email].filter(Boolean);
  if (contactParts.length) {
    detail.textContent = contactParts.join(" · ");
    detail.hidden = false;
  }
}

function bindPlaceActions(place) {
  const normalizedName = String(place.name || "").trim().toLowerCase();
  const normalizedAddress = String(place.address || "").trim().toLowerCase();
  const hasFeaturePosition =
    Boolean(place.parentPlace) &&
    Number.isFinite(Number(place.latitude)) &&
    Number.isFinite(Number(place.longitude));
  const directionsDestination = hasFeaturePosition
    ? `${Number(place.latitude)},${Number(place.longitude)}`
    : [
        place.name,
        normalizedAddress && normalizedAddress !== normalizedName
          ? formatPlaceAddress(place)
          : null,
      ]
        .filter(Boolean)
        .join(", ");
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    directionsDestination,
  )}`;
  const navigateLink = document.querySelector("#navigate-place-link");
  const shareButton = document.querySelector("#share-place-button");
  const favoriteButton = document.querySelector("#favorite-place-button");
  const siteMapButton = document.querySelector("#open-site-map-button");
  const dockExplorerLink = document.querySelector("#place-dock-explorer");
  const dockFavoriteButton = document.querySelector("#place-dock-save");
  const dockDirectionsLink = document.querySelector("#place-dock-directions");
  const addressLink = document.querySelector("#place-address-link");
  const status = document.querySelector("#place-action-status");
  const favorites = new Set(getLocalRecord(favoritesRecordKey, []));
  const explorerAvailable = explorerEligible(place);
  const explorerUrl = `/index.html?city=${encodeURIComponent(citySlug(place))}&explore=${encodeURIComponent(place.id)}`;
  navigateLink.href = directions;
  if (dockExplorerLink) {
    dockExplorerLink.href = explorerAvailable ? explorerUrl : "/index.html?restore=map";
    dockExplorerLink.classList.toggle("is-primary", explorerAvailable);
    const dockExplorerTitle = dockExplorerLink.querySelector("strong");
    const dockExplorerDetail = dockExplorerLink.querySelector("small");
    if (dockExplorerTitle) dockExplorerTitle.textContent = explorerAvailable ? "Explore" : "Map";
    if (dockExplorerDetail) {
      dockExplorerDetail.textContent = explorerAvailable
        ? "Open the map inside this place"
        : "Back to discovery";
    }
  }
  if (dockDirectionsLink) dockDirectionsLink.href = directions;
  if (addressLink) addressLink.href = directions;

  function syncFavorite() {
    const active = favorites.has(place.id);
    favoriteButton.classList.toggle("is-active", active);
    favoriteButton.setAttribute("aria-pressed", String(active));
    const label = favoriteButton.querySelector("span:last-child");
    if (label) {
      label.textContent = active ? "Saved" : "Favorite";
    } else {
      favoriteButton.textContent = active ? "Saved" : "Favorite";
    }
    if (dockFavoriteButton) {
      dockFavoriteButton.classList.toggle("is-active", active);
      dockFavoriteButton.setAttribute("aria-pressed", String(active));
      const dockLabel = dockFavoriteButton.querySelector("[data-action-label]");
      if (dockLabel) dockLabel.textContent = active ? "Saved" : "Save";
    }
  }

  favoriteButton.addEventListener("click", () => {
    if (favorites.has(place.id)) {
      favorites.delete(place.id);
      status.textContent = "Removed from favorites.";
    } else {
      favorites.add(place.id);
      status.textContent = "Saved to favorites.";
    }
    setLocalRecord(favoritesRecordKey, [...favorites]);
    syncFavorite();
    document.dispatchEvent(new CustomEvent("auditmap:favorites-changed", {
      detail: { placeIds: [...favorites] },
    }));
    trackAuditMapEvent("Place saved", { place: place.id, saved: favorites.has(place.id) });
  });
  document.addEventListener("auditmap:favorites-synced", (event) => {
    favorites.clear();
    (event.detail?.placeIds || []).forEach((id) => favorites.add(id));
    syncFavorite();
  });
  dockFavoriteButton?.addEventListener("click", () => favoriteButton.click());
  [navigateLink, dockDirectionsLink, addressLink].filter(Boolean).forEach((link) => {
    link.addEventListener("click", () => {
      rememberDirectionsIntent(place.id, place.parentPlace ? place.id : null);
      trackAuditMapEvent("Directions opened", { place: place.id });
    });
  });
  siteMapButton?.addEventListener("click", () => {
    if (explorerAvailable) {
      window.location.href = explorerUrl;
      return;
    }
    if (window.openAuditMapSiteMap) {
      window.openAuditMapSiteMap();
      return;
    }
    document.querySelector("#place-explorer")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });

  shareButton.addEventListener("click", async () => {
    const shareData = {
      title: `${place.name} | AuditMap`,
      text: `See community-audited information for ${place.name}.`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        status.textContent = "Shared.";
        trackAuditMapEvent("Place shared", { place: place.id, method: "native" });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        status.textContent = "Link copied.";
        trackAuditMapEvent("Place shared", { place: place.id, method: "copy" });
      }
    } catch (error) {
      if (error.name !== "AbortError") status.textContent = "Could not share this link.";
    }
  });

  syncFavorite();
}

function getExternalRatingSource(place) {
  if (!place.externalRating?.value && !place.rating) return null;
  return {
    label: place.externalRating?.source || "External rating",
    url:
      place.externalRating?.url ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${place.name}, ${formatPlaceAddress(place)}`,
      )}`,
    note: place.externalRating?.checkedAt
      ? `External rating checked ${place.externalRating.checkedAt}`
      : "External rating reference",
  };
}

function renderSources(place) {
  const ratingSource = getExternalRatingSource(place);
  const sources = [
    {
      label: place.sourceLabel,
      url: place.source,
      note: "Official place record",
    },
    ...(ratingSource ? [ratingSource] : []),
    ...(place.sources || []),
    ...(place.searchAnswers || []).map((answer) => ({
      label: answer.sourceLabel || `Official source for ${answer.question}`,
      url: answer.source || place.source,
      note: `${answer.intentKey || "Visit information"} · checked ${formatAuditDate(answer.checkedAt || place.verifiedAt)}`,
    })),
    ...(place.features || []).map((feature) => ({
      label: feature.source_label || `${feature.name} official source`,
      url: feature.source_url || place.source,
      note: `${feature.name} · checked ${formatAuditDate(feature.verified_at || place.verifiedAt)}`,
    })),
  ];
  [place.image, ...(place.images || [])].filter(Boolean).forEach((image) => {
    sources.push({
      label: `Photo by ${image.author}`,
      url: image.source,
      note: image.license,
    });
  });
  const uniqueSources = [...new Map(sources.map((source) => [source.url, source])).values()];
  document.querySelector("#source-count").textContent =
    `${uniqueSources.length} ${uniqueSources.length === 1 ? "source" : "sources"}`;
  document.querySelector("#source-list").innerHTML = uniqueSources
    .map(
      (source) => `
        <div class="source-item">
          <div>
            <strong>${escapeHtml(source.label)}</strong>
            <span>${escapeHtml(source.note || "Public reference")}</span>
          </div>
          <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Open ↗</a>
        </div>
      `,
    )
    .join("");
}

function renderLivingBrief(place, contributions) {
  const communityCount = contributions.comments.length + contributions.photos.length;
  document.querySelector("#living-brief").textContent = place.summary;
  const synopsisLabel = document.querySelector("#synopsis-label");
  if (place.discoveryStatus) {
    synopsisLabel.textContent = contributions.comments.length
      ? "Community context"
      : "About this place";
    document.querySelector("#brief-disclosure").innerHTML = `
      Base details assembled from cited public information${contributions.comments.length ? ', with <a href="#comment-list">AuditMap community context</a>' : ""}.
      <a href="#source-list">View sources and history</a>.
    `;
  } else {
    const ratingSource = getExternalRatingSource(place);
    synopsisLabel.textContent = "What people say";
    document.querySelector("#brief-disclosure").innerHTML = ratingSource
      ? `
        Synopsis based on
        <a href="${escapeHtml(ratingSource.url)}" target="_blank" rel="noreferrer">${escapeHtml(ratingSource.label)}</a>,
        the <a href="${escapeHtml(place.source)}" target="_blank" rel="noreferrer">${escapeHtml(place.sourceLabel)}</a>${contributions.comments.length ? ', and <a href="#comment-list">AuditMap community reviews</a>' : ""}.
      `
      : `
        Synopsis based on the
        <a href="${escapeHtml(place.source)}" target="_blank" rel="noreferrer">${escapeHtml(place.sourceLabel)}</a>${contributions.comments.length ? ' and <a href="#comment-list">AuditMap community reviews</a>' : ""}. No reliably matched external rating was found.
      `;
  }

  const completenessFields = [
    place.hours,
    place.source,
    place.image?.url,
    place.accessibility,
    place.cost,
    place.transit,
    place.amenities?.length,
  ];
  const isDocumented = (value) => {
    if (!value) return false;
    if (typeof value !== "string") return true;
    return !/need(s)? (community )?(verification|documentation)|not yet documented/i.test(value);
  };
  const completeness = Math.round(
    (completenessFields.filter(isDocumented).length / completenessFields.length) * 100,
  );
  document.querySelector("#brief-updated").textContent =
    `Last source check: ${place.verifiedAt || "Not recorded"}`;
  document.querySelector("#brief-completeness").textContent =
    completeness >= 72 ? "Core details documented" : "A local check would help";
  document.querySelector("#record-status").textContent =
    communityCount > 0
      ? "Community updated"
      : place.discoveryStatus
        ? "Community record"
        : "Sourced record";
}

function fundingMilestoneForPlace(place) {
  const missing = [];
  const needsDocumentation = (value) =>
    !value ||
    (typeof value === "string" &&
      /need(s)? (community )?(verification|documentation)|not yet documented/i.test(value));

  if (!place.image?.url && !(place.images || []).length) missing.push("photos");
  if (needsDocumentation(place.accessibility)) missing.push("accessibility details");
  if (needsDocumentation(place.hours)) missing.push("current hours");
  if (!(place.features || []).length) missing.push("entrances and amenities");

  if (missing.includes("photos")) {
    return {
      title: "Add a useful photo and source pack",
      description: "Source, review, attribute, and publish useful images that help people recognize and plan for this place.",
      target: 25,
    };
  }
  if (missing.includes("accessibility details")) {
    return {
      title: "Document arrival and accessibility",
      description: "Research parking, entrances, surfaces, restrooms, and arrival details, then publish what can be verified.",
      target: 250,
    };
  }
  if (missing.includes("entrances and amenities")) {
    return {
      title: "Map entrances and useful amenities",
      description: "Add parking, restrooms, trailheads, playgrounds, and other useful destinations from reliable sources.",
      target: 150,
    };
  }
  return {
    title: "Six answers visitors should not have to hunt for",
    description: "We will track down the practical details, check the sources, and add six clear answers right here.",
    target: 75,
  };
}

function renderPlaceFunding(place) {
  const section = document.querySelector("#place-funding");
  const panel = document.querySelector("#funding-panel");
  const form = document.querySelector("#funding-interest-form");
  if (!section || !panel || !form) return;

  const milestone = fundingMilestoneForPlace(place);
  const stored = getLocalRecord(`auditmap:funding-interest:${place.id}`, []);
  const storedEntries = Array.isArray(stored) ? stored : [];
  const oneTimeEntries = storedEntries.filter((item) => item.cadence !== "monthly");
  const monthlySupporters = storedEntries.filter((item) => item.cadence === "monthly").length;
  const interest = oneTimeEntries.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const displayedInterest = Math.min(interest, milestone.target);
  const percent = Math.min(100, Math.round((displayedInterest / milestone.target) * 100));
  const backerCount = oneTimeEntries.length;
  const remaining = Math.max(0, milestone.target - displayedInterest);

  document.querySelector("#funding-place-name").textContent = place.name;
  document.querySelector("#funding-title").textContent =
    milestone.target === 75 ? `Help make ${place.name} easier to explore.` : milestone.title;
  document.querySelector("#funding-milestone-title").textContent = milestone.title;
  document.querySelector("#funding-milestone-description").textContent = milestone.description;
  document.querySelector("#funding-active-step").textContent = milestone.title;
  document.querySelector("#funding-progress-label").textContent =
    `$${displayedInterest} of $${milestone.target}`;
  document.querySelector("#funding-progress-amount").textContent = `${percent}%`;
  document.querySelector("#funding-community-line").textContent = backerCount
    ? `${backerCount} ${backerCount === 1 ? "person is" : "people are"} in · just $${remaining} to make it happen${monthlySupporters ? ` · ${monthlySupporters} monthly` : ""}`
    : monthlySupporters
      ? `${monthlySupporters} monthly ${monthlySupporters === 1 ? "supporter" : "supporters"} helping AuditMap stay public`
      : "Be the first to get this upgrade moving";
  const progress = section.querySelector(".funding-progress");
  progress.setAttribute("aria-valuemax", String(milestone.target));
  progress.setAttribute("aria-valuenow", String(displayedInterest));
  document.querySelector("#funding-progress-bar").style.width = `${percent}%`;

  const amountInputs = [...form.querySelectorAll('input[name="amount"]')];
  const standardAmountInputs = amountInputs.filter((input) => input.value !== "custom");
  const setCadence = (cadence) => {
    const monthly = cadence === "monthly";
    const values = monthly ? [2, 5, 10] : [5, 15, 25];
    form.querySelector(`input[name="cadence"][value="${cadence}"]`).checked = true;
    standardAmountInputs.forEach((input, index) => {
      input.value = String(values[index]);
      input.nextElementSibling.textContent = monthly ? `$${values[index]}/mo` : `$${values[index]}`;
    });
    document.querySelector("#funding-amount-legend").textContent = monthly
      ? "Choose a monthly amount"
      : "What would you contribute?";
    form.querySelector(".dialog-copy").textContent = monthly
      ? "Small monthly support helps keep public-place information free, current, and independent. No charge today; this records your interest."
      : "Pick an amount you would chip in. No charge today; your response helps us choose which public upgrades to launch first.";
  };
  const openPanel = (amount = null, cadence = "one_time") => {
    setCadence(cadence);
    const preferredAmount = amount || (cadence === "monthly" ? "2" : "15");
    if (preferredAmount) {
      const selected = form.querySelector(`input[name="amount"][value="${preferredAmount}"]`);
      if (selected) selected.checked = true;
      document.querySelector("#funding-custom-amount").hidden = preferredAmount !== "custom";
    }
    panel.showModal();
  };
  window.openAuditMapFunding = openPanel;
  document.querySelector("#open-funding-panel").addEventListener("click", () => openPanel("15"));
  document.querySelectorAll("[data-funding-amount]").forEach((button) => {
    button.addEventListener("click", () => openPanel(button.dataset.fundingAmount));
  });
  document.querySelectorAll("[data-community-support]").forEach((button) => {
    button.addEventListener("click", () => openPanel(null, button.dataset.communitySupport));
  });
  form.querySelectorAll('input[name="cadence"]').forEach((input) => {
    input.addEventListener("change", () => {
      setCadence(input.value);
      standardAmountInputs[0].checked = true;
      document.querySelector("#funding-custom-amount").hidden = true;
    });
  });
  amountInputs.forEach((input) => {
    input.addEventListener("change", () => {
      document.querySelector("#funding-custom-amount").hidden = input.value !== "custom";
    });
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const selectedAmount = values.amount === "custom"
      ? Number(values.customAmount)
      : Number(values.amount);
    if (!Number.isFinite(selectedAmount) || selectedAmount < 1) {
      form.querySelector("#funding-form-status").textContent = "Choose an amount of at least $1.";
      return;
    }
    const entries = Array.isArray(getLocalRecord(`auditmap:funding-interest:${place.id}`, []))
      ? getLocalRecord(`auditmap:funding-interest:${place.id}`, [])
      : [];
    entries.push({
      amount: selectedAmount,
      cadence: values.cadence || "one_time",
      email: values.email || "",
      note: values.note || "",
      milestone: milestone.title,
      createdAt: new Date().toISOString(),
    });
    setLocalRecord(`auditmap:funding-interest:${place.id}`, entries);
    form.querySelector("#funding-form-status").textContent =
      values.cadence === "monthly"
        ? "Monthly support interest saved. No payment was collected today."
        : "You are in. No payment was collected today.";
    window.setTimeout(() => {
      panel.close();
      const newOneTimeEntries = entries.filter((item) => item.cadence !== "monthly");
      const newMonthlySupporters = entries.filter((item) => item.cadence === "monthly").length;
      const newInterest = newOneTimeEntries.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const newDisplayedInterest = Math.min(newInterest, milestone.target);
      const newBackerCount = newOneTimeEntries.length;
      document.querySelector("#funding-progress-label").textContent =
        `$${newDisplayedInterest} of $${milestone.target}`;
      document.querySelector("#funding-progress-amount").textContent =
        `${Math.min(100, Math.round((newDisplayedInterest / milestone.target) * 100))}%`;
      document.querySelector("#funding-community-line").textContent =
        newBackerCount
          ? `${newBackerCount} ${newBackerCount === 1 ? "person is" : "people are"} in · just $${Math.max(0, milestone.target - newDisplayedInterest)} to make it happen${newMonthlySupporters ? ` · ${newMonthlySupporters} monthly` : ""}`
          : `${newMonthlySupporters} monthly ${newMonthlySupporters === 1 ? "supporter" : "supporters"} helping AuditMap stay public`;
      progress.setAttribute("aria-valuenow", String(newDisplayedInterest));
      document.querySelector("#funding-progress-bar").style.width =
        `${Math.min(100, Math.round((newDisplayedInterest / milestone.target) * 100))}%`;
      form.reset();
    }, 900);
  }, { once: true });
}

function bindDialogs(place, contributions) {
  document.querySelectorAll("[data-open-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = document.querySelector(`#${button.dataset.openPanel}`);
      if (panel?.id === "report-panel") {
        const form = panel.querySelector("form");
        if (form) delete form.dataset.contributionId;
      }
      panel?.showModal();
    });
  });
  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });
  document.querySelectorAll(".feedback-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      const type = form.dataset.feedbackType;
      if (type === "report") {
        const status = form.querySelector(".form-status");
        if (!activeAccountSession?.accessToken) {
          status.textContent = "Sign in first so reports cannot be used to harass contributors.";
          openAccountDialog("safety");
          return;
        }
        const submit = form.querySelector('[type="submit"]');
        submit.disabled = true;
        status.textContent = "Sending privately...";
        try {
          const response = await fetch("/api/reports", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${activeAccountSession.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              placeId: place.id,
              contributionId: form.dataset.contributionId || null,
              reason: values.reason,
              details: values.message,
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || "The report could not be sent.");
          status.textContent = payload.message;
          form.reset();
          delete form.dataset.contributionId;
        } catch (error) {
          status.textContent = error.message;
        } finally {
          submit.disabled = false;
        }
        return;
      }
      const collection =
        type === "edit"
          ? "edits"
          : type === "steward"
            ? "stewardApplications"
          : "reports";
      contributions[collection].push({
        ...values,
        submittedAt: new Date().toISOString(),
        status: "pending",
      });
      setLocalRecord(`auditmap:${place.id}`, contributions);
      if (type === "steward") {
        submitStewardApplication(place, {
          name: values.name,
          relationship: values.relationship,
          message: values.message,
          sourceUrl: values.source || "",
        });
      } else {
        submitSharedContribution(place, {
          authorName: values.name || "Local contributor",
          type: type === "edit" ? "correction" : "observation",
          body: values.message,
          sourceUrl: values.source || "",
          submittedAt: new Date().toISOString(),
        });
      }
      form.querySelector(".form-status").textContent =
        type === "edit"
          ? "Suggestion saved for review."
          : type === "steward"
            ? "Thank you. Your steward interest is saved for independent review."
            : "Report saved for review.";
      form.reset();
    });
  });
}

function bindDiscussionStarters() {
  const disclosure = document.querySelector(".contribution-disclosure");
  const form = document.querySelector("#contribution-form");
  const message = form.elements.comment;
  const placeholders = {
    question: "What would you like to know about this place?",
    observation: "What changed, or what should visitors know today?",
    confirmation: "Share one practical tip from your visit...",
  };
  document.querySelectorAll("[data-discussion-type]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.discussionType;
      if (window.openAuditMapCrumb) {
        window.openAuditMapCrumb(type === "question" ? "question" : type === "confirmation" ? "verify" : "update");
        return;
      }
      disclosure.open = true;
      form.elements.type.value = type;
      message.placeholder = placeholders[type];
      disclosure.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => message.focus({ preventScroll: true }), 350);
    });
  });
}

async function initPlacePage() {
  const embeddedPlace = embeddedSearchPlace();
  const id = new URLSearchParams(window.location.search).get("id") || embeddedPlace?.id;
  const places = await loadPlaces().catch(() => embeddedPlace ? [embeddedPlace] : []);
  const place = embeddedPlace || places.find((item) => item.id === id);
  const content = document.querySelector("#place-content");

  if (!place) {
    content.innerHTML = `
      <section class="not-found">
        <h1>Place not found.</h1>
        <p><a href="/index.html">Return to the map</a></p>
      </section>
    `;
    return;
  }

  window.setAuditMapAskPlace?.(place);

  document.title = `${place.name} | AuditMap`;
  const backLink = document.querySelector(".back-link");
  const openedFromMap =
    new URLSearchParams(window.location.search).get("from") === "map";
  backLink.href = place.parentPlace?.path ||
    (openedFromMap
      ? "/index.html?restore=map"
      : `/index.html?city=${encodeURIComponent(citySlug(place))}`);
  if (place.parentPlace) backLink.textContent = `← Back to ${place.parentPlace.name}`;
  else if (openedFromMap) backLink.textContent = `← Back to the ${place.city} map`;
  document.querySelector("#place-type").textContent = place.type;
  document.querySelector("#place-name").textContent = place.name;
  const officialName = document.querySelector("#place-official-name");
  if (officialName && place.officialName && place.officialName !== place.name) {
    officialName.textContent = `Officially: ${place.officialName}`;
    officialName.hidden = false;
  }
  const neighborhood = document.querySelector("#place-neighborhood");
  if (neighborhood) neighborhood.textContent = place.neighborhood;
  document.querySelector("#place-address").textContent =
    formatPlaceAddress(place);
  document.querySelector("#place-hours").textContent = place.hours;
  renderHoursStatus(place);
  window.setInterval(() => renderHoursStatus(place), 60_000);
  const placeStatus = document.querySelector("#place-status");
  if (placeStatus) placeStatus.textContent = place.status;
  const sourceLink = document.querySelector("#place-source");
  if (sourceLink) {
    sourceLink.href = place.source;
    sourceLink.textContent = place.sourceLabel;
  }

  const contributions = normalizeContributions(getStoredContributions(place.id));
  const [sharedComments, knowledge, featurePayload] = await Promise.all([
    loadSharedContributions(place.id),
    loadPlaceKnowledge(place.id, place),
    loadPlaceFeatures(place.id, place),
  ]);
  place.features = featurePayload.features || place.features || [];
  const existingCommentIds = new Set(
    contributions.comments.map((comment) => comment.id).filter(Boolean),
  );
  sharedComments.forEach((comment) => {
    if (!existingCommentIds.has(comment.id)) contributions.comments.push(comment);
  });
  renderGallery(place, contributions);
  renderPlaceFeatures(place, featurePayload, contributions.comments);
  renderNearbyDiscovery(place, places);
  renderPlaceKnowledge(place, knowledge, contributions);
  renderLivingBrief(place, contributions);
  renderPlaceFunding(place);
  renderFacts(place);
  setupVerifiedHelpToggle();
  renderVerificationPrompts(place, contributions);
  renderContact(place);
  bindPlaceActions(place);
  initPlaceLive(place);
  renderSources(place);
  renderReviews(place, contributions);
  initCrumbExperience(place, contributions, featurePayload.features || []);
  bindDialogs(place, contributions);
  bindDiscussionStarters();
  focusRequestedVerification();

  const form = document.querySelector("#contribution-form");
  const status = document.querySelector("#form-status");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = formData.get("name").trim();
    const comment = formData.get("comment").trim();
    const rating = formData.get("rating");
    const type = formData.get("type") || "observation";
    const files = [...formData.getAll("photos")].filter((file) => file.size);
    const featureId = form.dataset.featureId || null;
    const featureName = form.dataset.featureName || null;

    if (!comment && !rating && files.length === 0) {
      status.textContent = "Add a review, rating, or at least one photo first.";
      return;
    }

    let localContribution = null;
    if (comment || rating) {
      localContribution = {
        author: name || "Local contributor",
        text: comment || "Rated this place.",
        rating: rating ? Number(rating) : null,
        context: type,
        submittedAt: new Date().toISOString(),
        knowledgeIntent: form.dataset.knowledgeIntent || null,
        knowledgeQuestion: form.dataset.knowledgeQuestion || null,
      };
      contributions.comments.push(localContribution);
    }

    for (const file of files.slice(0, 3)) {
      if (!file.type.startsWith("image/") || file.size > 1_500_000) continue;
      contributions.photos.push({
        data: await fileToDataUrl(file),
        alt: `${featureName || place.name} community photo`,
        featureId,
        featureName,
        submittedAt: new Date().toISOString(),
      });
    }

    try {
      setLocalRecord(`auditmap:${place.id}`, contributions);
      renderReviews(place, contributions);
      renderPlaceKnowledge(place, knowledge, contributions);
      renderGallery(place, contributions);
      renderLivingBrief(place, contributions);
      form.reset();
      const shared = await submitSharedContribution(place, {
        authorName: name || "Local contributor",
        type,
        body:
          comment ||
          (files.length
            ? `Added a photo of ${featureName || place.name}.`
            : "Rated this place."),
        rating: rating ? Number(rating) : null,
        featureId,
        metadata: form.dataset.knowledgeIntent
          ? {
              verificationIntent: form.dataset.knowledgeIntent,
              verificationPrompt: form.dataset.knowledgeQuestion,
            }
          : undefined,
        submittedAt: new Date().toISOString(),
      });
      if (shared?.contribution && localContribution) {
        localContribution.id = shared.contribution.id;
      }
      if (shared?.aiReply) {
        contributions.comments.push({
          id: shared.aiReply.id,
          parentId: shared.aiReply.parent_id,
          author: shared.aiReply.author_name,
          text: shared.aiReply.body,
          context: "reply",
          submittedAt: shared.aiReply.created_at,
          isAi: true,
          answerStatus: shared.aiReply.metadata?.answerStatus || "needs_verification",
          sources: shared.aiReply.metadata?.sources || [],
        });
        setLocalRecord(`auditmap:${place.id}`, contributions);
        renderReviews(place, contributions);
        renderPlaceKnowledge(place, knowledge, contributions);
      }
      status.textContent = shared
        ? shared.aiReply
          ? "Added to the community record. AuditMap Assistant replied below."
          : "Added here and sent for shared moderation. Thank you."
        : "Added on this device. Shared publishing will sync when connected.";
      delete form.dataset.featureId;
      delete form.dataset.featureName;
      delete form.dataset.knowledgeIntent;
      delete form.dataset.knowledgeQuestion;
    } catch {
      status.textContent = "That photo is too large to save here. Try a smaller image.";
    }
  });
}

function featureCommentMarkup(comment) {
  const label = {
    question: "Question",
    observation: "Visit update",
    confirmation: "Confirmation",
    correction: "Correction",
  }[comment.context] || "Local context";
  const date = comment.submittedAt ? formatAuditDate(comment.submittedAt) : "";
  return `
    <article class="feature-comment">
      <div>
        <strong>${escapeHtml(comment.author || "Local contributor")}</strong>
        <span>${escapeHtml(label)}${date ? ` · ${escapeHtml(date)}` : ""}</span>
      </div>
      <p>${escapeHtml(comment.text)}</p>
    </article>
  `;
}

async function initFeaturePage() {
  const params = new URLSearchParams(window.location.search);
  const placeId = params.get("place");
  const featureId = params.get("feature");
  const [places, initialFeaturePayload, sharedComments] = await Promise.all([
    loadPlaces(),
    loadPlaceFeatures(placeId),
    loadSharedContributions(placeId),
  ]);
  const place = places.find((item) => item.id === placeId);
  const featurePayload = place
    ? mergePlaceFeatures(localPlaceFeatures(place), initialFeaturePayload)
    : initialFeaturePayload;
  const feature = (featurePayload.features || []).find((item) => item.id === featureId);
  const content = document.querySelector("#feature-content");
  if (!place || !feature) {
    content.innerHTML = `
      <section class="not-found">
        <h1>Area not found.</h1>
        <p><a href="/index.html">Return to the map</a></p>
      </section>
    `;
    return;
  }
  window.setAuditMapAskFeatures?.(featurePayload.features || []);
  window.setAuditMapAskFeature?.(place, feature);

  const parentUrl =
    canonicalPlacePath(place) ||
    `/place.html?id=${encodeURIComponent(place.id)}#place-explorer`;
  const parentLink = document.querySelector("#feature-parent-link");
  parentLink.href = parentUrl;
  parentLink.textContent = `← Back to ${place.name}`;
  document.querySelector("#feature-parent-name").textContent = `Within ${place.name}`;
  document.querySelector("#feature-name").textContent = feature.name;
  document.querySelector("#feature-description").textContent =
    feature.description || "Community details are welcome for this part of the place.";
  document.querySelector("#feature-context").textContent =
    feature.description || "Share practical details that can help someone find and use this area.";
  document.querySelector("#feature-location-context").textContent =
    feature.details?.locationContext ||
    `${feature.name} is mapped within ${place.name}. Use the map and navigation link for its exact position.`;
  document.querySelector("#feature-need-to-know").textContent =
    feature.details?.needToKnow ||
    `Conditions and availability can change. Check the cited source before a time-sensitive visit to ${feature.name}.`;
  document.querySelector("#feature-question-list").innerHTML = featureNeedToKnowQuestions(place, feature)
    .map(
      (question) =>
        `<button type="button" class="feature-question-pill" data-feature-question="${escapeHtml(question)}">${escapeHtml(question)}</button>`,
    )
    .join("");
  document.querySelectorAll("[data-feature-question]").forEach((button) => {
    button.addEventListener("click", () => {
      window.openAuditMapAsk?.(button.dataset.featureQuestion);
    });
  });
  document.querySelector("#feature-position-quality").textContent =
    feature.details?.positionQuality || "Approximate mapped location";
  const parentContextLink = document.querySelector("#feature-parent-context-link");
  parentContextLink.href = parentUrl;
  parentContextLink.textContent = place.name;
  const sourceLink = document.querySelector("#feature-source");
  sourceLink.href = feature.source_url || place.source;
  sourceLink.textContent = feature.source_label || place.sourceLabel || "Public source";
  document.querySelector("#feature-navigate").href =
    `https://www.google.com/maps/dir/?api=1&destination=${feature.latitude},${feature.longitude}`;
  document.title = `${feature.name} at ${place.name} | AuditMap`;

  const stored = normalizeContributions(getStoredContributions(place.id));
  const localComments = stored.comments.filter((comment) => comment.featureId === feature.id);
  const sharedFeatureComments = sharedComments.filter((comment) => comment.featureId === feature.id);
  const knownIds = new Set(localComments.map((comment) => comment.id).filter(Boolean));
  const comments = [
    ...localComments,
    ...sharedFeatureComments.filter((comment) => !knownIds.has(comment.id)),
  ];
  const featurePhotos = stored.photos.filter((photo) => photo.featureId === feature.id);
  const imageUrl =
    featurePhotos[0]?.data ||
    feature.details?.imageUrl ||
    feature.details?.photoUrl ||
    feature.image_url;
  const imageAlt = feature.details?.imageAlt || feature.name;
  const hasCommunityPhoto = Boolean(featurePhotos[0]?.data);
  const imageSourceUrl = !hasCommunityPhoto ? feature.details?.imageSourceUrl : "";
  const imageCredit = feature.details?.imageAuthor || feature.source_label || "Photo source";
  const imageLicense = feature.details?.imageLicense || "";
  const media = document.querySelector("#feature-detail-media");
  if (imageUrl) {
    media.innerHTML = `
      <img ${responsiveImageAttributes(imageUrl, { sizes: "(max-width: 760px) 100vw, min(68vw, 1040px)", priority: true })} alt="${escapeHtml(imageAlt)}" />
      ${imageSourceUrl
        ? `<a class="feature-detail-photo-credit" href="${escapeHtml(imageSourceUrl)}" target="_blank" rel="noreferrer">Photo: ${escapeHtml(imageCredit)}${imageLicense ? ` · ${escapeHtml(imageLicense)}` : ""} ↗</a>`
        : ""}
    `;
  } else {
    media.innerHTML = `
      <button class="feature-detail-media-placeholder missing-photo-detail" type="button" aria-label="Add a photo of ${escapeHtml(feature.name)}">
        ${missingPhotoIcon()}
        <strong>Picture this place</strong>
        <span>This site could use a photo. Be the one who puts it on the map.</span>
        <small>Add a photo</small>
      </button>
    `;
    media.querySelector(".feature-detail-media-placeholder").addEventListener("click", () => {
      window.openAuditMapCrumb?.("photo", { featureId: feature.id });
    });
  }

  const commentList = document.querySelector("#feature-comment-list");
  const postCount = document.querySelector("#feature-post-count");
  function renderFeatureComments() {
    postCount.textContent = `${comments.length} ${comments.length === 1 ? "post" : "posts"}`;
    commentList.innerHTML = comments.length
      ? comments.map(featureCommentMarkup).join("")
      : '<div class="empty-state">No posts yet. Ask the first question or share a useful detail.</div>';
  }
  renderFeatureComments();
  initCrumbExperience(place, stored, [feature], {
    featureId: feature.id,
    onSubmitted(comment) {
      if (!comments.some((item) => item.id === comment.id)) comments.unshift(comment);
      renderFeatureComments();
    },
  });

  document.querySelector("#feature-share").addEventListener("click", async () => {
    const shareData = {
      title: `${feature.name} at ${place.name}`,
      text: feature.description,
      url: window.location.href,
    };
    if (navigator.share) {
      await navigator.share(shareData).catch(() => {});
    } else {
      await navigator.clipboard?.writeText(window.location.href);
    }
  });

  const form = document.querySelector("#feature-contribution-form");
  const status = document.querySelector("#feature-form-status");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const text = String(formData.get("comment") || "").trim();
    const author = String(formData.get("name") || "").trim() || "Local contributor";
    const type = formData.get("type") || "observation";
    const files = [...formData.getAll("photos")].filter((file) => file.size);
    if (!text && !files.length) {
      status.textContent = "Add a message or picture first.";
      return;
    }
    const submittedAt = new Date().toISOString();
    if (text) {
      const localComment = {
        id: `local-${crypto.randomUUID()}`,
        author,
        text,
        context: type,
        featureId: feature.id,
        submittedAt,
      };
      stored.comments.push(localComment);
      comments.unshift(localComment);
    }
    for (const file of files.slice(0, 3)) {
      if (!file.type.startsWith("image/") || file.size > 1_500_000) continue;
      stored.photos.push({
        data: await fileToDataUrl(file),
        alt: `${feature.name} community photo`,
        featureId: feature.id,
        featureName: feature.name,
        submittedAt,
      });
    }
    setLocalRecord(`auditmap:${place.id}`, stored);
    form.reset();
    renderFeatureComments();
    const shared = await submitSharedContribution(place, {
      authorName: author,
      type,
      body: text || `Added a photo of ${feature.name}.`,
      featureId: feature.id,
      submittedAt,
    });
    status.textContent = shared
      ? "Added to this area’s community record."
      : "Saved on this device. Shared publishing will sync when connected.";
  });
}

function embeddedSearchPlace() {
  const node = document.querySelector("#search-place-data");
  if (!node) return null;
  try {
    return JSON.parse(node.textContent);
  } catch {
    return null;
  }
}

function hydrateStaticSearchAnswers(place) {
  if (!place) return null;
  if ((place.searchAnswers || []).length) return place;
  const answers = [...document.querySelectorAll("#knowledge-list .knowledge-item")]
    .map((item) => {
      const question = item.querySelector("summary span")?.textContent?.trim();
      const answerText = item.querySelector(":scope > p")?.textContent?.trim();
      const source = item.querySelector(".knowledge-sources a");
      const intentKey = item.querySelector("[data-knowledge-helpful]")?.dataset.knowledgeHelpful;
      if (!question || !answerText) return null;
      return {
        intentKey: intentKey || slugify(question),
        question,
        answer: answerText,
        source: source?.href || place.source || null,
        sourceLabel: source?.textContent?.replace(/↗/g, "").trim() || place.sourceLabel,
        sourceType: "official",
        checkedAt: place.verifiedAt || null,
      };
    })
    .filter(Boolean);
  return answers.length ? { ...place, searchAnswers: answers } : place;
}

function searchCommentMarkup(comment) {
  const label = {
    question: "Question",
    observation: "Visit update",
    confirmation: "Confirmation",
    correction: "Correction",
    review: "Review",
    reply: "AuditMap reply",
  }[comment.context] || "Community note";
  const date = comment.submittedAt ? formatAuditDate(comment.submittedAt) : "";
  return `
    <article class="search-community-item">
      <div>
        <strong>${escapeHtml(comment.author || "Local contributor")}</strong>
        <span>${escapeHtml(label)}${date ? ` · ${escapeHtml(date)}` : ""}</span>
      </div>
      <p>${escapeHtml(comment.text)}</p>
    </article>
  `;
}

function searchKnowledgeMarkup(question) {
  const checked = formatAuditDate(question.answered_at);
  const source = Array.isArray(question.answer_sources) ? question.answer_sources[0] : null;
  return `
    <article class="search-knowledge-item">
      <h3>${escapeHtml(question.sample_question)}</h3>
      <p>${escapeHtml(question.canonical_answer)}</p>
      <div class="search-knowledge-meta">
        <span>${escapeHtml(question.intent_key || "park-answer")}</span>
        <span>Checked ${escapeHtml(checked)}</span>
      </div>
      ${
        source?.url
          ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title || "Source")} ↗</a>`
          : ""
      }
    </article>
  `;
}

async function initSearchPlacePage() {
  const place = hydrateStaticSearchAnswers(embeddedSearchPlace());
  if (!place) return;

  window.setAuditMapAskPlace?.(place);
  window.setAuditMapAskFeatures?.(place.features || []);
  bindPlaceActions(place);
  initPlaceLive(place);

  const utilityLink = document.querySelector("#search-live-map-link");
  if (utilityLink) {
    utilityLink.href = `/place.html?city=${encodeURIComponent(citySlug(place))}&id=${encodeURIComponent(place.id)}`;
  }

  const commentsTarget = document.querySelector("#seo-community-list");
  const commentsCount = document.querySelector("#seo-community-count");
  const questionsTarget = document.querySelector("#seo-knowledge-list");
  const questionsCount = document.querySelector("#seo-knowledge-count");
  const local = normalizeContributions(getStoredContributions(place.id));

  const [sharedComments, knowledge, places] = await Promise.all([
    loadSharedContributions(place.id),
    loadPlaceKnowledge(place.id, place),
    loadPlaces({ sharedTimeoutMs: 250 }),
  ]);
  const knownCommentIds = new Set((local.comments || []).map((comment) => comment.id).filter(Boolean));
  sharedComments.forEach((comment) => {
    if (!knownCommentIds.has(comment.id)) local.comments.push(comment);
  });
  if (needsPlaceSubmap(place)) renderPlaceFeatures(place, localPlaceFeatures(place), local.comments);
  renderGallery(place, local);
  renderNearbyDiscovery(place, places);
  renderReviews(place, local);
  initCrumbExperience(place, local, place.features || []);
  bindVerifiedAnswerSharing(place);

  if (questionsTarget) {
    questionsTarget.innerHTML = knowledge.length
      ? knowledge.slice(0, 6).map(searchKnowledgeMarkup).join("")
      : '<p class="search-empty-copy">AuditMap is still building sourced park answers for this page.</p>';
  }
  if (questionsCount) {
    questionsCount.textContent = `${knowledge.length} ${knowledge.length === 1 ? "live answer" : "live answers"}`;
  }

  if (commentsTarget) {
    const localComments = (local.comments || []).filter((comment) => !comment.featureId);
    const known = new Set(localComments.map((comment) => comment.id).filter(Boolean));
    const merged = [
      ...sharedComments.filter((comment) => !known.has(comment.id)),
      ...localComments,
    ].slice(0, 6);
    commentsTarget.innerHTML = merged.length
      ? merged.map(searchCommentMarkup).join("")
      : '<p class="search-empty-copy">No published community notes yet. Ask the first question on the live place page.</p>';
    if (commentsCount) {
      commentsCount.textContent = `${merged.length} ${merged.length === 1 ? "community note" : "community notes"}`;
    }
  }
}

function initVercelAnalytics() {
  if (document.querySelector('script[src="/_vercel/insights/script.js"]')) return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = "/_vercel/insights/script.js";
  document.head.appendChild(script);
}

const accountStorageKey = "auditmap:account-session";
const favoritesStorageKey = favoritesRecordKey;
let resolvedAuthConfig;
let authRedirectError = "";
let activeAccountSession = null;
let activeAccountUser = null;
let favoritesSyncTimer = null;
let favoritesSyncQueue = Promise.resolve();

const accountPromptContent = {
  default: {
    title: "Your places. Your conversations. Your impact.",
    copy: "Sign in to join conversations, sync saved places, and see the impact of what you share. Browsing and public information always stay open.",
  },
  conversation: {
    title: "Join the public-space chatter.",
    copy: "Sign in to post and reply while keeping the conversation attributable, useful, and safer for everyone.",
  },
  contribute: {
    title: "Share what you notice.",
    copy: "Sign in to ask, share, fix, or confirm details and build a record of the places you help improve.",
  },
  safety: {
    title: "Help keep this place useful.",
    copy: "Sign in to send a private report. Account-based reports help protect contributors from harassment and misuse.",
  },
  thanks: {
    title: "Thank a helpful neighbor.",
    copy: "Sign in to recognize useful contributions and add to a contributor’s community impact.",
  },
};

function openAccountDialog(context = "default") {
  const dialog = document.querySelector("#account-dialog");
  if (!dialog) return;
  if (!activeAccountUser) {
    const content = accountPromptContent[context] || accountPromptContent.default;
    const title = document.querySelector("#account-dialog-title");
    const copy = document.querySelector("#account-dialog-copy");
    if (title) title.textContent = content.title;
    if (copy) copy.textContent = content.copy;
  }
  if (!dialog.open) dialog.showModal();
}

function auditMapAuthConfig() {
  const config = window.AUDITMAP_CONFIG || {};
  const providers = Array.isArray(config.authProviders)
    ? config.authProviders
    : config.authProvider
      ? [config.authProvider]
      : [];
  return config.supabaseUrl && config.supabasePublishableKey
    ? {
        url: config.supabaseUrl.replace(/\/$/, ""),
        key: config.supabasePublishableKey,
        provider: providers[0] || null,
        providers,
      }
    : null;
}

async function resolveAuthConfig() {
  if (resolvedAuthConfig !== undefined) return resolvedAuthConfig;
  const browserConfig = auditMapAuthConfig();
  if (browserConfig) {
    resolvedAuthConfig = { ...browserConfig, mode: "browser" };
    return resolvedAuthConfig;
  }
  try {
    const response = await fetch("/api/auth?action=config");
    const payload = await response.json();
    const providers = Array.isArray(payload.providers)
      ? payload.providers
      : payload.provider
        ? [payload.provider]
        : [];
    resolvedAuthConfig = response.ok && payload.configured
      ? { provider: providers[0] || null, providers, mode: "server" }
      : null;
  } catch {
    resolvedAuthConfig = null;
  }
  return resolvedAuthConfig;
}

function storedAccountSession() {
  if (!demoSessionId) return getLocalRecord(accountStorageKey, null);
  try {
    return JSON.parse(sessionStorage.getItem(accountStorageKey)) || null;
  } catch {
    return null;
  }
}

function saveAccountSession(session) {
  const storage = demoSessionId ? sessionStorage : localStorage;
  if (session) storage.setItem(accountStorageKey, JSON.stringify(session));
  else storage.removeItem(accountStorageKey);
}

function renderAccountAvatar(avatarUrl, displayName = "Explorer") {
  const profileMark = document.querySelector("#account-profile-mark");
  const profileAvatar = document.querySelector("#account-profile-avatar");
  const drawerMark = document.querySelector("#drawer-account-mark");
  const drawerAvatar = document.querySelector("#drawer-account-avatar");
  const hasPhoto = Boolean(avatarUrl);
  if (profileMark) {
    profileMark.hidden = hasPhoto;
    profileMark.textContent = displayName.slice(0, 1).toUpperCase();
  }
  if (profileAvatar) {
    profileAvatar.hidden = !hasPhoto;
    if (hasPhoto) profileAvatar.src = avatarUrl;
  }
  if (drawerAvatar) {
    drawerAvatar.hidden = !hasPhoto;
    if (hasPhoto) drawerAvatar.src = avatarUrl;
  }
  drawerMark?.classList.toggle("has-photo", hasPhoto);
  setLocalRecord(mapPersonaStorageKey, { avatarUrl: avatarUrl || "", displayName });
  window.dispatchEvent(new CustomEvent("auditmap:profile-avatar", {
    detail: { avatarUrl: avatarUrl || "", displayName },
  }));
}

async function profilePhotoDataUrl(file) {
  const imageFilename = /\.(?:jpe?g|png|webp|heic|heif)$/i.test(file?.name || "");
  if (!file || (!String(file.type || "").startsWith("image/") && !imageFilename)) {
    throw new Error("Choose a photo from Camera, Photos, or Files.");
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("Choose a photo smaller than 20MB.");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("That photo format could not be opened on this device."));
      image.src = objectUrl;
    });
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d", { alpha: false });
    context.drawImage(
      image,
      Math.max(0, (image.naturalWidth - size) / 2),
      Math.max(0, (image.naturalHeight - size) / 2),
      size,
      size,
      0,
      0,
      512,
      512,
    );
    const webp = canvas.toDataURL("image/webp", 0.82);
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.84);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function authApi(path, options = {}) {
  const config = await resolveAuthConfig();
  if (!config) throw new Error("Account sign-in is not configured yet.");
  const response = config.mode === "server"
    ? await fetch("/api/auth", {
        ...options,
        method: options.method || "POST",
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        body: path === "otp"
          ? JSON.stringify({
              action: "otp",
              email: JSON.parse(options.body || "{}").email,
              redirectTo: window.location.href,
            })
          : path === "password"
            ? JSON.stringify({
                action: "password",
                email: JSON.parse(options.body || "{}").email,
                password: JSON.parse(options.body || "{}").password,
              })
          : path === "refresh"
            ? JSON.stringify({
                action: "refresh",
                refreshToken: JSON.parse(options.body || "{}").refreshToken,
              })
          : JSON.stringify({ action: path }),
      })
    : await fetch(`${config.url}/auth/v1/${path}`, {
        ...options,
        headers: {
          apikey: config.key,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || payload.msg || payload.error_description || payload.message || "Sign-in failed.");
  return payload;
}

function sessionFromAuthPayload(payload, fallback = {}) {
  const accessToken = payload?.access_token || payload?.accessToken;
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: payload.refresh_token || payload.refreshToken || fallback.refreshToken || "",
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000,
  };
}

function consumeAuthRedirect() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  authRedirectError = params.get("error_description") || params.get("error") || "";
  const accessToken = params.get("access_token");
  if (!accessToken) {
    if (authRedirectError && window.location.hash) {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    return storedAccountSession();
  }
  const session = sessionFromAuthPayload({
    access_token: accessToken,
    refresh_token: params.get("refresh_token"),
    expires_in: params.get("expires_in"),
  });
  saveAccountSession(session);
  history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  return session;
}

async function refreshAccountSession(session) {
  if (!session?.refreshToken) return null;
  const config = await resolveAuthConfig();
  const payload = config?.mode === "server"
    ? await authApi("refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      })
    : await authApi("token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      });
  const refreshed = sessionFromAuthPayload(payload, session);
  if (!refreshed) return null;
  Object.assign(session, refreshed);
  saveAccountSession(session);
  return session;
}

async function loadAccountUser(session) {
  if (!session?.accessToken || !(await resolveAuthConfig())) return null;
  if (session.expiresAt && session.expiresAt <= Date.now() + 60_000) {
    try {
      if (!(await refreshAccountSession(session))) throw new Error("Session refresh failed.");
    } catch {
      saveAccountSession(null);
      return null;
    }
  }
  try {
    return await authApi("user", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
  } catch {
    try {
      if (!(await refreshAccountSession(session))) throw new Error("Session refresh failed.");
      return await authApi("user", {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
    } catch {
      saveAccountSession(null);
      return null;
    }
  }
}

function normalizeFavoriteIds(value) {
  return Array.isArray(value)
    ? [...new Set(value.map((id) => String(id).trim()).filter(Boolean))].slice(0, 1000)
    : [];
}

async function accountFavoritesApi(method, session, user, placeIds = []) {
  const config = await resolveAuthConfig();
  if (!config || !session?.accessToken || !user?.id) throw new Error("Sign in to sync saved places.");
  if (config.mode === "server") {
    const response = await fetch("/api/account", {
      method,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: method === "PUT" ? JSON.stringify({ placeIds }) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Saved places could not sync.");
    return normalizeFavoriteIds(payload.placeIds);
  }

  const resource = `${config.url}/rest/v1/user_saved_places`;
  const headers = {
    apikey: config.key,
    Authorization: `Bearer ${session.accessToken}`,
    "Content-Type": "application/json",
  };
  if (method === "GET") {
    const response = await fetch(`${resource}?select=place_id&order=created_at.asc`, { headers });
    const rows = await response.json().catch(() => []);
    if (!response.ok) throw new Error(rows.message || "Saved places could not sync.");
    return normalizeFavoriteIds(rows.map((row) => row.place_id));
  }

  const replaced = await fetch(`${config.url}/rest/v1/rpc/replace_user_saved_places`, {
    method: "POST",
    headers,
    body: JSON.stringify({ saved_place_ids: placeIds }),
  });
  const rows = await replaced.json().catch(() => []);
  if (!replaced.ok) throw new Error(rows.message || "Saved places could not sync.");
  return normalizeFavoriteIds(rows.map((row) => row.place_id));
}

function broadcastFavoriteSync(placeIds) {
  const normalized = normalizeFavoriteIds(placeIds);
  setLocalRecord(favoritesStorageKey, normalized);
  document.dispatchEvent(new CustomEvent("auditmap:favorites-synced", {
    detail: { placeIds: normalized },
  }));
}

async function mergeAccountFavorites(session, user) {
  const remote = await accountFavoritesApi("GET", session, user);
  const local = normalizeFavoriteIds(getLocalRecord(favoritesStorageKey, []));
  const merged = [...new Set([...remote, ...local])];
  broadcastFavoriteSync(merged);
  if (merged.length !== remote.length || merged.some((id, index) => id !== remote[index])) {
    await accountFavoritesApi("PUT", session, user, merged);
  }
  return merged;
}

function queueAccountFavoritesSync(placeIds) {
  if (!activeAccountSession || !activeAccountUser) return;
  const normalized = normalizeFavoriteIds(placeIds);
  window.clearTimeout(favoritesSyncTimer);
  favoritesSyncTimer = window.setTimeout(() => {
    favoritesSyncQueue = favoritesSyncQueue
      .catch(() => {})
      .then(() => accountFavoritesApi("PUT", activeAccountSession, activeAccountUser, normalized))
      .catch(() => {});
  }, 180);
}

function navIcon(name) {
  const icons = {
    explore: '<path d="m12 3 2.35 6.65L21 12l-6.65 2.35L12 21l-2.35-6.65L3 12l6.65-2.35L12 3Z"/>',
    saved: '<path d="M7.25 4.5h9.5c.69 0 1.25.56 1.25 1.25v14l-6-3.75-6 3.75v-14c0-.69.56-1.25 1.25-1.25Z"/>',
    notes: '<path d="M5.5 4.5h13A1.5 1.5 0 0 1 20 6v9a1.5 1.5 0 0 1-1.5 1.5H10L5 20v-3.75A1.5 1.5 0 0 1 4 14.84V6a1.5 1.5 0 0 1 1.5-1.5Z"/><path d="M8 9h8M8 12.5h5"/>',
    account: '<circle cx="12" cy="8.25" r="3.25"/><path d="M5.75 20c.55-3.45 2.63-5.25 6.25-5.25s5.7 1.8 6.25 5.25"/>',
    menu: '<path d="M5 8h14M5 16h14"/>',
    location: '<path d="m19.5 4.5-6.2 15-2.15-6.65L4.5 10.7l15-6.2Z"/>',
    search: '<circle cx="10.75" cy="10.75" r="6.25"/><path d="m15.5 15.5 4.25 4.25"/>',
    radius: '<circle cx="12" cy="12" r="8.25"/><circle cx="12" cy="12" r="2.25"/><path d="M12 3.75v2M20.25 12h-2M12 20.25v-2M3.75 12h2"/>',
    filters: '<path d="M4.5 6.5h15M4.5 12h15M4.5 17.5h15"/><circle cx="9" cy="6.5" r="1.75"/><circle cx="15.5" cy="12" r="1.75"/><circle cx="11" cy="17.5" r="1.75"/>',
    map: '<path d="m4 6.5 5-2.25 6 2.25 5-2.25v13.25l-5 2.25-6-2.25-5 2.25V6.5Z"/><path d="M9 4.25v13.25M15 6.5v13.25"/>',
    directions: '<path d="m19.75 4.25-6.3 15.5-2.25-6.95-6.95-2.25 15.5-6.3Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>',
    arrowUp: '<path d="M12 19V5M6.5 10.5 12 5l5.5 5.5"/>',
    chevronRight: '<path d="m9 5 7 7-7 7"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.75 12h16.5M12 3.5c2.2 2.3 3.3 5.13 3.3 8.5S14.2 18.2 12 20.5C9.8 18.2 8.7 15.37 8.7 12S9.8 5.8 12 3.5Z"/>',
    check: '<path d="m5.5 12.5 4.1 4.1 8.9-9.1"/>',
    camera: '<path d="M4.5 8.25h3l1.4-2h6.2l1.4 2h3A1.5 1.5 0 0 1 21 9.75v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-7.75a1.5 1.5 0 0 1 1.5-1.5Z"/><circle cx="12" cy="13" r="3.25"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 10.5v6M12 7.5h.01"/>',
    pinNote: '<path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z"/><path d="M9 10h6M12 7v6"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
}

function currentExploreHref() {
  return page === "map" ? "#map" : "/index.html";
}

function currentNotesHref() {
  return ["place", "search-place", "feature"].includes(page)
    ? "#discussion"
    : "/index.html?add=note";
}

function sharedPlaceIdsFromUrl() {
  const value = new URLSearchParams(window.location.search).get("list") || "";
  return [...new Set(value.split(",")
    .map((id) => id.trim().replace(/[^a-z0-9_-]/gi, "").slice(0, 100))
    .filter(Boolean))]
    .slice(0, 12);
}

function savedListShareUrl(ids) {
  const url = new URL("/index.html", window.location.origin);
  url.searchParams.set("list", ids.slice(0, 12).join(","));
  url.searchParams.set("utm_source", "auditmap_share");
  url.searchParams.set("utm_medium", "shared_list");
  url.searchParams.set("utm_campaign", "saved_list_loop");
  url.searchParams.set("utm_content", `places_${Math.min(ids.length, 12)}`);
  return url.toString();
}

async function renderSavedPlaces() {
  const target = document.querySelector("#saved-place-list");
  if (!target) return;
  const sharedIds = sharedPlaceIdsFromUrl();
  const ids = sharedIds.length ? sharedIds : getLocalRecord(favoritesStorageKey, []);
  const heading = document.querySelector("#saved-places-title");
  const intro = document.querySelector("#saved-places-intro");
  const shareButton = document.querySelector("[data-share-saved-list]");
  const saveButton = document.querySelector("[data-save-shared-list]");
  if (heading) heading.textContent = sharedIds.length ? "Places to explore" : "Saved places";
  if (intro) {
    intro.textContent = sharedIds.length
      ? "Someone shared these public places with you. Open any guide or keep the list for later."
      : "Keep a few possibilities together, then send the list to someone you want to explore with.";
  }
  if (shareButton) shareButton.hidden = sharedIds.length > 0 || ids.length === 0;
  if (saveButton) saveButton.hidden = sharedIds.length === 0;
  if (!ids.length) {
    target.innerHTML = '<div class="nav-empty"><strong>No saved places yet.</strong><p>Tap Favorite on any guide to build a list for later.</p></div>';
    return;
  }
  const places = await loadPlaces();
  const byId = new Map(places.map((place) => [place.id, place]));
  target.innerHTML = ids.map((id) => {
    const place = byId.get(id);
    if (!place) return "";
    const href = place.canonicalPath || `/place.html?id=${encodeURIComponent(place.id)}`;
    return `<a class="saved-place-row" href="${escapeHtml(href)}"><span><strong>${escapeHtml(place.name)}</strong><small>${escapeHtml(place.city)}, ${escapeHtml(place.state)}</small></span><span class="row-chevron">${navIcon("chevronRight")}</span></a>`;
  }).join("") || '<div class="nav-empty"><strong>Your saved places will appear here.</strong></div>';
  if (sharedIds.length) {
    target.querySelectorAll(".saved-place-row").forEach((link, index) => {
      link.addEventListener("click", () => trackAuditMapEvent("Shared list guide opened", {
        place: ids[index],
        places: sharedIds.length,
      }));
    });
  }
}

async function initSiteNavigation() {
  const header = document.querySelector(".site-header");
  if (!header || document.querySelector("#site-menu-button")) return;

  const menuButton = document.createElement("button");
  menuButton.id = "site-menu-button";
  menuButton.className = "site-menu-button";
  menuButton.type = "button";
  menuButton.setAttribute("aria-label", "Open AuditMap menu");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.innerHTML = navIcon("menu");
  const headerActions = header.querySelector(".header-actions");
  (headerActions || header).appendChild(menuButton);

  const mobileActionTiles = page === "map"
    ? `
      <button class="mobile-action-tile is-primary" type="button" data-map-pin-note>
        <span class="mobile-action-icon">${navIcon("pinNote")}</span><span><strong>Pin a note</strong><small>Attach an observation to an exact spot</small></span>
      </button>
      <button class="mobile-action-tile" type="button" data-map-info>
        <span class="mobile-action-icon">${navIcon("info")}</span><span><strong>About this map</strong><small>Coverage, symbols, sources, and current view</small></span>
      </button>`
    : ["place", "search-place"].includes(page)
      ? `
        <a class="mobile-action-tile" id="place-dock-explorer" href="/index.html?restore=map">
          <span class="mobile-action-icon">${navIcon("map")}</span><span><strong>Map</strong><small>Back to discovery</small></span>
        </a>
        <button class="mobile-action-tile" type="button" id="place-dock-save" data-place-save>
          <span class="mobile-action-icon">${navIcon("saved")}</span><span><strong data-action-label>Save</strong><small>Keep for later</small></span>
        </button>
        <a class="mobile-action-tile" id="place-dock-directions" href="#" target="_blank" rel="noreferrer">
          <span class="mobile-action-icon">${navIcon("directions")}</span><span><strong>Directions</strong><small>Open your maps app</small></span>
        </a>
        <button class="mobile-action-tile" type="button" data-open-crumb>
          <span class="mobile-action-icon">${navIcon("notes")}</span><span><strong>Leave a note</strong><small>Help the next visitor</small></span>
        </button>`
      : page === "feature"
        ? `
          <a class="mobile-action-tile" href="/index.html?restore=map">
            <span class="mobile-action-icon">${navIcon("map")}</span><span><strong>Map</strong><small>Back to discovery</small></span>
          </a>
          <button class="mobile-action-tile" type="button" data-open-saved>
            <span class="mobile-action-icon">${navIcon("saved")}</span><span><strong>Saved places</strong><small>Your places for later</small></span>
          </button>
          <button class="mobile-action-tile" type="button" data-open-account>
            <span class="mobile-action-icon">${navIcon("account")}</span><span><strong>Account</strong><small>Conversations, saves, and impact</small></span>
          </button>
          <button class="mobile-action-tile" type="button" data-open-crumb>
            <span class="mobile-action-icon">${navIcon("notes")}</span><span><strong>Leave a note</strong><small>Help the next visitor</small></span>
          </button>`
        : "";

  const mobileCommandSurface = mobileActionTiles
    ? `
      <div class="mobile-action-scrim" id="mobile-action-scrim" hidden></div>
      <section class="mobile-action-sheet" id="mobile-action-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-action-title" aria-hidden="true">
        <div class="mobile-action-heading">
          <div><p class="kicker">${page === "map" ? "Map tools" : "Quick actions"}</p><h2 id="mobile-action-title">${page === "map" ? "Add context to the map" : "Use this place"}</h2></div>
          <button class="icon-button" type="button" data-close-mobile-actions aria-label="Close quick actions">${navIcon("close")}</button>
        </div>
        ${page === "map" ? '<p class="mobile-action-context" id="map-action-context">Current view · Loading map details…</p>' : ""}
        <div class="mobile-action-grid">${mobileActionTiles}</div>
        ${page === "map" || page === "feature" ? "" : `<div class="mobile-action-footer"><button type="button" data-open-saved>${navIcon("saved")}<span>Saved</span></button><button type="button" data-open-account>${navIcon("account")}<span>Account</span></button></div>`}
      </section>
      <div class="mobile-ask-scrim" id="mobile-ask-scrim" hidden></div>
      <div class="mobile-command-surface">
        <div class="mobile-ask-suggestions" id="mobile-ask-suggestions" aria-label="Suggested questions" hidden></div>
        <form class="mobile-command-bar" id="mobile-ask-form" aria-label="Ask AuditMap">
          <button class="mobile-command-plus" type="button" data-open-mobile-actions aria-label="Open quick actions" aria-expanded="false" aria-controls="mobile-action-sheet">${navIcon("plus")}</button>
          <label class="sr-only" for="mobile-ask-input">Ask AuditMap</label>
          <textarea id="mobile-ask-input" name="question" rows="1" maxlength="500" autocomplete="off" enterkeyhint="send" placeholder="Loading AuditMap…" disabled></textarea>
          <button class="mobile-command-send" type="submit" aria-label="Send to Ask AuditMap" disabled>${navIcon("arrowUp")}</button>
        </form>
      </div>
      ${page === "map" ? `<div class="mobile-search-scrim" id="mobile-search-scrim" hidden></div>
      <dialog class="site-dialog radius-dialog" id="radius-dialog">
        <form class="radius-dialog-form" id="radius-form">
          <div class="dialog-heading">
            <div><p class="kicker">Search distance</p><h2>How far should we look?</h2></div>
            <button class="icon-button" type="button" data-close-radius-dialog aria-label="Close">${navIcon("close")}</button>
          </div>
          <p class="dialog-copy">The distance follows you near home or the city you searched.</p>
          <div class="radius-options" role="radiogroup" aria-label="Search radius">
            ${[2, 5, 10, 25, 50].map((miles) => `<label><input type="radio" name="radius" value="${miles}"${miles === 10 ? " checked" : ""}/><span><strong>${miles}</strong> miles</span></label>`).join("")}
          </div>
          <button class="submit-button" type="submit">Search this distance</button>
        </form>
      </dialog>
      <dialog class="site-dialog map-note-dialog" id="map-note-dialog">
        <form class="map-note-form" id="map-note-form">
          <div class="dialog-heading">
            <div><p class="kicker">Pinned to the map</p><h2>What should someone know here?</h2></div>
            <button class="icon-button" type="button" data-close-map-note aria-label="Close">${navIcon("close")}</button>
          </div>
          <p class="map-note-coordinates" id="map-note-coordinates"></p>
          <label>Kind of note<select name="kind"><option value="tip">Tip</option><option value="condition">Current condition</option><option value="access">Access detail</option><option value="question">Question</option><option value="correction">Correction</option></select></label>
          <label>Your note<textarea name="message" rows="4" maxlength="1200" required placeholder="A practical detail, what changed, or what you noticed…"></textarea></label>
          <p class="map-note-privacy">This prototype saves the pin on this device. Community publishing and review come next.</p>
          <div class="map-note-submit"><p class="form-status" id="map-note-status" role="status"></p><button class="submit-button" type="submit">Save pinned note</button></div>
        </form>
      </dialog>
      <dialog class="site-dialog map-info-dialog" id="map-info-dialog">
        <div class="map-info-inner">
          <div class="dialog-heading">
            <div><p class="kicker">Living map</p><h2>About this view</h2></div>
            <button class="icon-button" type="button" data-close-map-info aria-label="Close">${navIcon("close")}</button>
          </div>
          <div class="map-info-summary"><strong id="map-info-area">Current area</strong><span id="map-info-results">Loading coverage…</span></div>
          <dl class="map-info-stats"><div><dt>Zoom</dt><dd id="map-info-zoom">—</dd></div><div><dt>Center</dt><dd id="map-info-center">—</dd></div><div><dt>Search distance</dt><dd id="map-info-radius">—</dd></div></dl>
          <div class="map-info-legend" aria-label="Map marker meanings"><p><i class="legend-dot is-curated"></i><span><strong>Established</strong><small>Catalogued place with a developed record</small></span></p><p><i class="legend-dot is-seed"></i><span><strong>Local info welcome</strong><small>A known place that needs stronger community context</small></span></p><p><i class="map-note-legend-pin">+</i><span><strong>Pinned note</strong><small>An observation attached to exact coordinates</small></span></p></div>
          <p class="map-info-source">Base geography and map tiles are provided by OpenStreetMap contributors. AuditMap adds public-place records, community context, and coverage signals on top.</p>
        </div>
      </dialog>` : ""}`
    : "";

  document.body.insertAdjacentHTML("beforeend", `
    <div class="site-drawer-scrim" id="site-drawer-scrim" hidden></div>
    <aside class="site-drawer" id="site-drawer" aria-label="AuditMap menu" aria-hidden="true">
      <div class="site-drawer-heading">
        <div><p class="kicker">The public's guide</p><h2>Browse. Explore.<br/>Leave a note.</h2></div>
        <button type="button" data-close-site-drawer aria-label="Close menu">${navIcon("close")}</button>
      </div>
      <button class="drawer-account" type="button" data-open-account>
        <span class="drawer-account-mark" id="drawer-account-mark"><img id="drawer-account-avatar" alt="" hidden />${navIcon("account")}</span>
        <span><strong id="drawer-account-title">Sign in</strong><small id="drawer-account-copy">Join conversations and keep your places with you</small></span>
        <span class="drawer-chevron">${navIcon("chevronRight")}</span>
      </button>
      <nav class="drawer-links">
        <a href="${currentExploreHref()}"><span class="drawer-link-icon">${navIcon("map")}</span><span>Explore the map</span><span class="drawer-chevron">${navIcon("chevronRight")}</span></a>
        <button type="button" data-open-saved><span class="drawer-link-icon">${navIcon("saved")}</span><span>Saved places</span><span class="drawer-chevron">${navIcon("chevronRight")}</span></button>
        <a href="/us"><span class="drawer-link-icon">${navIcon("globe")}</span><span>Browse nationwide</span><span class="drawer-chevron">${navIcon("chevronRight")}</span></a>
        <a href="${currentNotesHref()}"><span class="drawer-link-icon">${navIcon("notes")}</span><span>Leave a note</span><span class="drawer-chevron">${navIcon("chevronRight")}</span></a>
      </nav>
      <div class="drawer-community">
        <p class="kicker">Help build AuditMap</p>
        <a href="/index.html#map-mission-title">How it works</a>
        <button type="button" data-drawer-add-place>Add a public place</button>
        <a href="/place.html?id=dix-park#place-funding">Support the project</a>
      </div>
      <p class="drawer-note">Public places deserve more than a pin on a map.</p>
    </aside>
    ${mobileCommandSurface}
    <dialog class="site-dialog nav-dialog" id="saved-places-dialog">
      <div class="nav-dialog-inner">
        <div class="dialog-heading"><div><p class="kicker">Plan an adventure</p><h2 id="saved-places-title">Saved places</h2></div><button class="icon-button" type="button" data-close-nav-dialog aria-label="Close">${navIcon("close")}</button></div>
        <p class="saved-places-intro" id="saved-places-intro"></p>
        <div class="saved-place-list" id="saved-place-list"></div>
        <div class="saved-list-actions">
          <button type="button" data-share-saved-list>Share this list</button>
          <button type="button" data-save-shared-list hidden>Save all places</button>
        </div>
        <p class="form-status" id="saved-list-status" role="status"></p>
      </div>
    </dialog>
    <dialog class="site-dialog nav-dialog account-dialog" id="account-dialog">
      <div class="nav-dialog-inner">
        <div class="dialog-heading"><div><p class="kicker">Your AuditMap</p><h2 id="account-dialog-title">Your places. Your conversations. Your impact.</h2></div><button class="icon-button" type="button" data-close-nav-dialog aria-label="Close">${navIcon("close")}</button></div>
        <div id="account-signed-out">
          <p class="dialog-copy" id="account-dialog-copy">Sign in to join conversations, sync saved places, and see the impact of what you share. Browsing and public information always stay open.</p>
          <div class="account-value-grid" aria-label="Account benefits">
            <div>${navIcon("notes")}<span><strong>Join place communities</strong><small>Ask, share, reply, and thank helpful neighbors</small></span></div>
            <div>${navIcon("saved")}<span><strong>Keep your places</strong><small>Bring saved places across your devices</small></span></div>
            <div>${navIcon("check")}<span><strong>See your impact</strong><small>Build a history of places you help improve</small></span></div>
          </div>
          <div class="account-provider-list" id="account-provider-list" aria-label="Single sign-on options"></div>
          <div class="account-divider" id="account-provider-divider"><span>or</span></div>
          <form id="account-email-form" class="account-email-form">
            <label>Email address<input name="email" type="email" required placeholder="you@example.com" /></label>
            <button class="submit-button" type="submit">Email me a sign-in link</button>
          </form>
          <details class="account-password-login">
            <summary>Sign in with a password</summary>
            <form id="account-password-form" class="account-email-form">
              <label>Email address<input name="email" type="email" autocomplete="username" required placeholder="you@example.com" /></label>
              <label>Password<input name="password" type="password" autocomplete="current-password" minlength="8" required /></label>
              <button class="submit-button" type="submit">Sign in</button>
            </form>
          </details>
          <p class="form-status" id="account-status" role="status"></p>
          <p class="account-privacy">Browsing stays open without an account. We never require sign-in to view public information.</p>
        </div>
        <div id="account-signed-in" hidden>
          <div class="account-profile"><label class="account-avatar-picker" for="account-avatar-input" title="Change profile photo"><span id="account-profile-mark">A</span><img id="account-profile-avatar" alt="" hidden /><i aria-hidden="true">${navIcon("camera")}</i><input class="sr-only" id="account-avatar-input" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" aria-label="Upload profile photo" /></label><div><strong id="account-profile-name">Explorer</strong><small id="account-profile-email"></small><small class="account-role" id="account-profile-role" hidden></small><small class="account-avatar-hint">Tap photo to change</small></div></div>
          <div class="account-benefits"><div>${navIcon("check")}<span>Join place communities</span></div><div>${navIcon("check")}<span>Saved places sync</span></div><div>${navIcon("check")}<span>Community impact grows</span></div></div>
          <section class="account-impact" id="account-impact" hidden><div class="account-impact-heading"><div><p class="kicker">Your community impact</p><h3 id="account-impact-level">New Explorer</h3></div><span id="account-impact-progress">0 crumbs</span></div><div class="community-impact-grid" id="account-impact-grid"></div><div class="community-badge-list" id="account-impact-badges"></div><div class="account-recent-crumbs" id="account-recent-crumbs" hidden></div><a class="account-admin-link" id="account-admin-link" href="/admin.html" hidden>Open the review inbox ${navIcon("chevronRight")}</a><form id="account-nickname-form"><label>Community nickname<input name="displayName" minlength="2" maxlength="40" /></label><button type="submit">Update</button></form></section>
          <p class="form-status account-sync-status" id="account-sync-status" role="status"></p>
          <p class="account-avatar-privacy">Profile photos are public. AuditMap keeps a small copy and removes the original photo metadata before upload.</p>
          <button class="outline-button" id="account-sign-out" type="button">Sign out</button>
        </div>
      </div>
    </dialog>
  `);

  const drawer = document.querySelector("#site-drawer");
  const scrim = document.querySelector("#site-drawer-scrim");
  const mobileActionSheet = document.querySelector("#mobile-action-sheet");
  const mobileActionScrim = document.querySelector("#mobile-action-scrim");
  const mobileActionButton = document.querySelector("[data-open-mobile-actions]");
  const mobileAskScrim = document.querySelector("#mobile-ask-scrim");
  const mobileAskSuggestions = document.querySelector("#mobile-ask-suggestions");
  const mobileAskInput = document.querySelector("#mobile-ask-input");
  const setMobileAskActive = (open) => {
    if (!mobileAskInput) return;
    document.body.classList.toggle("has-active-mobile-ask", open);
    if (mobileAskScrim) mobileAskScrim.hidden = !open;
    if (mobileAskSuggestions) {
      mobileAskSuggestions.hidden = !open || !mobileAskSuggestions.children.length;
    }
    if (!open) mobileAskInput.blur();
  };
  const setMobileActions = (open) => {
    if (!mobileActionSheet || !mobileActionButton) return;
    if (open) setMobileAskActive(false);
    mobileActionSheet.setAttribute("aria-hidden", String(!open));
    mobileActionButton.setAttribute("aria-expanded", String(open));
    if (mobileActionScrim) mobileActionScrim.hidden = !open;
    document.body.classList.toggle("has-open-mobile-actions", open);
  };
  const setDrawer = (open) => {
    if (open) {
      setMobileActions(false);
      setMobileAskActive(false);
    }
    drawer.setAttribute("aria-hidden", String(!open));
    menuButton.setAttribute("aria-expanded", String(open));
    scrim.hidden = !open;
    document.body.classList.toggle("has-open-drawer", open);
  };
  menuButton.addEventListener("click", () => setDrawer(true));
  scrim.addEventListener("click", () => setDrawer(false));
  document.querySelector("[data-close-site-drawer]").addEventListener("click", () => setDrawer(false));
  mobileActionButton?.addEventListener("click", () => {
    const open = mobileActionSheet?.getAttribute("aria-hidden") === "true";
    setDrawer(false);
    if (open) document.querySelector("#mobile-ask-input")?.blur();
    setMobileActions(open);
  });
  mobileActionScrim?.addEventListener("click", () => setMobileActions(false));
  mobileAskScrim?.addEventListener("click", () => setMobileAskActive(false));
  document.querySelector("[data-close-mobile-actions]")?.addEventListener("click", () => setMobileActions(false));
  mobileActionSheet?.addEventListener("click", (event) => {
    if (event.target.closest("a, button") && !event.target.closest("[data-close-mobile-actions]")) {
      setMobileActions(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setDrawer(false);
      setMobileActions(false);
      setMobileAskActive(false);
    }
  });

  const mobileAskForm = document.querySelector("#mobile-ask-form");
  const mobileAskSend = document.querySelector(".mobile-command-send");
  const resizeMobileAskInput = () => {
    if (!mobileAskInput) return;
    mobileAskInput.style.height = "0px";
    mobileAskInput.style.height = `${Math.min(mobileAskInput.scrollHeight, 132)}px`;
  };
  const syncMobileAskContext = (context = window.auditMapAskContext || {}) => {
    if (!mobileAskInput || !mobileAskSend) return;
    mobileAskInput.disabled = !context.ready;
    mobileAskInput.placeholder = context.ready ? (context.label || "Ask AuditMap") : "Loading AuditMap…";
    mobileAskSend.disabled = !context.ready || !mobileAskInput.value.trim();
    if (mobileAskSuggestions) {
      mobileAskSuggestions.innerHTML = (context.starters || [])
        .map((question) => `<button type="button" data-mobile-ask-starter="${escapeHtml(question)}">${escapeHtml(question)}</button>`)
        .join("");
      mobileAskSuggestions.hidden =
        !document.body.classList.contains("has-active-mobile-ask") ||
        !mobileAskSuggestions.children.length;
    }
    resizeMobileAskInput();
  };
  document.addEventListener("auditmap:ask-context", (event) => syncMobileAskContext(event.detail));
  mobileAskInput?.addEventListener("focus", () => setMobileAskActive(true));
  mobileAskInput?.addEventListener("input", () => syncMobileAskContext());
  mobileAskInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      mobileAskForm.requestSubmit();
    }
  });
  mobileAskSuggestions?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mobile-ask-starter]");
    if (!button || !mobileAskInput) return;
    mobileAskInput.value = button.dataset.mobileAskStarter;
    syncMobileAskContext();
    mobileAskForm.requestSubmit();
  });
  mobileAskForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = mobileAskInput.value.trim();
    if (!question) return;
    setMobileAskActive(false);
    if (window.openAuditMapAsk?.(question)) {
      mobileAskInput.value = "";
      syncMobileAskContext();
    }
  });
  syncMobileAskContext();

  document.querySelectorAll("[data-close-nav-dialog]").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });
  document.querySelectorAll("[data-open-saved]").forEach((button) => {
    button.addEventListener("click", async () => {
      setDrawer(false);
      await renderSavedPlaces();
      document.querySelector("#saved-places-dialog").showModal();
    });
  });
  document.querySelector("[data-share-saved-list]")?.addEventListener("click", async () => {
    const ids = normalizeFavoriteIds(getLocalRecord(favoritesStorageKey, [])).slice(0, 12);
    if (!ids.length) return;
    const url = savedListShareUrl(ids);
    const status = document.querySelector("#saved-list-status");
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Places to explore | AuditMap",
          text: "A few public places we could explore together.",
          url,
        });
        status.textContent = "List shared.";
        trackAuditMapEvent("Saved list shared", { places: ids.length, method: "native" });
      } else {
        await navigator.clipboard.writeText(url);
        status.textContent = "List link copied.";
        trackAuditMapEvent("Saved list shared", { places: ids.length, method: "copy" });
      }
    } catch (error) {
      if (error?.name !== "AbortError") status.textContent = "The list could not be shared yet.";
    }
  });
  document.querySelector("[data-save-shared-list]")?.addEventListener("click", () => {
    const sharedIds = sharedPlaceIdsFromUrl();
    if (!sharedIds.length) return;
    const merged = normalizeFavoriteIds([
      ...getLocalRecord(favoritesStorageKey, []),
      ...sharedIds,
    ]);
    setLocalRecord(favoritesStorageKey, merged);
    document.dispatchEvent(new CustomEvent("auditmap:favorites-changed", { detail: { placeIds: merged } }));
    document.querySelector("#saved-list-status").textContent = `${sharedIds.length} ${sharedIds.length === 1 ? "place" : "places"} saved.`;
    trackAuditMapEvent("Shared list saved", { places: sharedIds.length });
  });
  if (sharedPlaceIdsFromUrl().length) {
    window.setTimeout(async () => {
      await renderSavedPlaces();
      document.querySelector("#saved-places-dialog")?.showModal();
      trackAuditMapEvent("Shared list opened", { places: sharedPlaceIdsFromUrl().length });
    }, 0);
  }

  const accountDialog = document.querySelector("#account-dialog");
  document.querySelectorAll("[data-open-account]").forEach((button) => {
    button.addEventListener("click", () => {
      setDrawer(false);
      openAccountDialog("default");
    });
  });

  document.querySelector("[data-map-locate]")?.addEventListener("click", () => {
    document.querySelector("#location-button")?.click();
  });
  document.querySelector("[data-map-filter]")?.addEventListener("click", () => {
    document.querySelector("#toolbar-filter-button")?.click();
  });
  document.querySelector("[data-map-radius]")?.addEventListener("click", () => {
    document.querySelector("#radius-dialog")?.showModal();
  });
  document.querySelector("[data-map-pin-note]")?.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("auditmap:map-pin-note-requested"));
  });
  document.querySelector("[data-map-info]")?.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("auditmap:map-info-requested"));
  });
  const mobileSearchScrim = document.querySelector("#mobile-search-scrim");
  const closeMobileSearch = () => {
    document.body.classList.remove("has-mobile-search");
    if (mobileSearchScrim) mobileSearchScrim.hidden = true;
  };
  document.querySelector("[data-map-search]")?.addEventListener("click", () => {
    document.body.classList.add("has-mobile-search");
    if (mobileSearchScrim) mobileSearchScrim.hidden = false;
    window.setTimeout(() => document.querySelector("#search-input")?.focus(), 80);
  });
  mobileSearchScrim?.addEventListener("click", closeMobileSearch);
  document.querySelector("[data-close-mobile-search]")?.addEventListener("click", closeMobileSearch);
  document.querySelector("#state-search-form")?.addEventListener("submit", closeMobileSearch);

  const addPlaceTrigger = document.querySelector("[data-drawer-add-place]");
  addPlaceTrigger.addEventListener("click", () => {
    setDrawer(false);
    const existing = document.querySelector("#add-place-dialog");
    if (existing) existing.showModal();
    else window.location.href = "/index.html?add=place";
  });
  const requestedAction = new URLSearchParams(window.location.search).get("add");
  if (page === "map" && requestedAction === "place") {
    window.setTimeout(() => document.querySelector("#add-place-dialog")?.showModal(), 0);
  }

  document.addEventListener("auditmap:favorites-changed", (event) => {
    queueAccountFavoritesSync(event.detail?.placeIds || []);
  });

  const session = consumeAuthRedirect();
  const authConfig = await resolveAuthConfig();
  const providerList = document.querySelector("#account-provider-list");
  const providerLabels = {
    apple: "Apple",
    azure: "Microsoft",
    github: "GitHub",
    google: "Google",
    linkedin_oidc: "LinkedIn",
  };
  const startProviderSignIn = (provider) => {
    const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    window.location.href = authConfig.mode === "server"
      ? `/api/auth?action=oauth&provider=${encodeURIComponent(provider)}&redirectTo=${encodeURIComponent(redirectTo)}`
      : `${authConfig.url}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(redirectTo)}`;
  };
  if (authConfig) {
    const providers = authConfig.providers || (authConfig.provider ? [authConfig.provider] : []);
    providerList.hidden = providers.length === 0;
    document.querySelector("#account-provider-divider").hidden = providers.length === 0;
    providers.forEach((provider) => {
      const button = document.createElement("button");
      button.className = `account-provider-button is-${provider}`;
      button.type = "button";
      button.textContent = `Continue with ${providerLabels[provider] || "your account"}`;
      button.addEventListener("click", () => startProviderSignIn(provider));
      providerList.appendChild(button);
    });
  }
  if (!authConfig) {
    const unavailableButton = document.createElement("button");
    unavailableButton.className = "account-provider-button";
    unavailableButton.type = "button";
    unavailableButton.disabled = true;
    unavailableButton.textContent = "Single sign-on unavailable";
    providerList.appendChild(unavailableButton);
    document.querySelector("#account-status").textContent = "Account sync is being connected. You can still browse and save places on this device.";
    document.querySelector("#account-email-form button").disabled = true;
    document.querySelector('#account-email-form input[name="email"]').disabled = true;
  } else if (authRedirectError) {
    document.querySelector("#account-status").textContent = authRedirectError;
  }
  document.querySelector("#account-email-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.querySelector("#account-status");
    const email = new FormData(event.currentTarget).get("email").trim();
    status.textContent = "Sending your sign-in link...";
    try {
      await authApi("otp", {
        method: "POST",
        body: JSON.stringify({ email, options: { emailRedirectTo: window.location.href } }),
      });
      status.textContent = "Check your email for a secure sign-in link.";
      event.currentTarget.reset();
    } catch (error) {
      status.textContent = error.message;
    }
  });
  document.querySelector("#account-password-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.querySelector("#account-status");
    const values = new FormData(event.currentTarget);
    status.textContent = "Signing you in...";
    try {
      const payload = await authApi("password", {
        method: "POST",
        body: JSON.stringify({ email: values.get("email"), password: values.get("password") }),
      });
      const passwordSession = sessionFromAuthPayload(payload);
      if (!passwordSession) throw new Error("The account session could not be created.");
      saveAccountSession(passwordSession);
      window.location.reload();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  const user = await loadAccountUser(session);
  if (user) {
    activeAccountSession = session;
    activeAccountUser = user;
    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Explorer";
    document.querySelector("#account-signed-out").hidden = true;
    document.querySelector("#account-signed-in").hidden = false;
    document.querySelector("#account-dialog-title").textContent = "Your AuditMap";
    document.querySelector("#account-profile-name").textContent = name;
    document.querySelector("#account-profile-email").textContent = user.email || "Signed in";
    renderAccountAvatar(user.app_metadata?.auditmap_avatar_url || null, name);
    document.querySelector("#drawer-account-title").textContent = name;
    document.querySelector("#drawer-account-copy").textContent = "Your saved places are available here";
    const syncStatus = document.querySelector("#account-sync-status");
    try {
      favoritesSyncQueue = mergeAccountFavorites(session, user);
      const mergedFavorites = await favoritesSyncQueue;
      syncStatus.textContent = `${mergedFavorites.length} saved ${mergedFavorites.length === 1 ? "place" : "places"} synced to your account.`;
      document.querySelector("#drawer-account-copy").textContent = mergedFavorites.length
        ? `${mergedFavorites.length} saved ${mergedFavorites.length === 1 ? "place" : "places"} across your devices`
        : "Save a place and find it on any device";
    } catch (error) {
      syncStatus.textContent = `Signed in. ${error.message}`;
    }
    try {
      const profileResponse = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const profilePayload = await profileResponse.json();
      if (profileResponse.ok) {
        const profile = profilePayload.profile;
        renderAccountAvatar(profile.avatarUrl, profile.displayName);
        if (demoSessionId) {
          document.title = `${profile.displayName} · ${profile.level.label} | AuditMap Demo`;
        }
        const impact = document.querySelector("#account-impact");
        impact.hidden = false;
        document.querySelector("#account-impact-level").textContent = profile.level.label;
        document.querySelector("#account-impact-progress").textContent = `${profile.approvedCrumbs} ${profile.approvedCrumbs === 1 ? "crumb" : "crumbs"}`;
        document.querySelector("#account-impact-grid").innerHTML = `<div><strong>${profile.verifiedCrumbs}</strong><span>verified</span></div><div><strong>${profile.placesHelped}</strong><span>places helped</span></div><div><strong>${profile.thanks}</strong><span>thanks</span></div><div><strong>${profile.nextLevel ? Math.max(0, profile.nextLevel.points - profile.progressPoints) : 0}</strong><span>${profile.nextLevel ? `to ${escapeHtml(profile.nextLevel.label)}` : "top level"}</span></div>`;
        document.querySelector("#account-impact-badges").innerHTML = (profile.badges || []).map((badge) => `<span>${escapeHtml(badge.badge_key.replaceAll("_", " "))}</span>`).join("") || "<span>First badge on the way</span>";
        document.querySelector('#account-nickname-form input[name="displayName"]').value = profile.displayName;
        const roleLabel = document.querySelector("#account-profile-role");
        if (profile.isDemo || profile.role !== "member") {
          roleLabel.hidden = false;
          roleLabel.textContent = [profile.isDemo ? "Demo member" : "", profile.role === "super_admin" ? "Super administrator" : ""].filter(Boolean).join(" · ");
        }
        document.querySelector("#account-admin-link").hidden = profile.role !== "super_admin";
        const recent = document.querySelector("#account-recent-crumbs");
        if (profile.recentCrumbs?.length) {
          recent.hidden = false;
          recent.innerHTML = `<div class="account-recent-heading"><p class="kicker">Recent crumbs</p><span>Private demo activity</span></div>${profile.recentCrumbs.map((crumb) => {
            const media = crumb.media?.[0];
            const mediaMarkup = !media ? "" : media.kind === "photo_360"
              ? `<div class="account-crumb-media is-360"><img src="${escapeHtml(media.url)}" alt="${escapeHtml(media.alt || "Demo 360 view")}" /><span>360°</span></div>`
              : `<div class="account-crumb-media"><img src="${escapeHtml(media.url)}" alt="${escapeHtml(media.alt || "Demo contribution")}" /></div>`;
            return `<article class="account-crumb-card">${mediaMarkup}<div><span>${escapeHtml(crumb.placeName || "Public place")} · ${escapeHtml(crumb.status)}</span><strong>${escapeHtml(crumb.body)}</strong></div></article>`;
          }).join("")}`;
        }
      }
    } catch {
      // Saved-place sync remains available if profile setup is not deployed yet.
    }
    const bottomAccountLabel = document.querySelector("#bottom-account-label");
    if (bottomAccountLabel) bottomAccountLabel.textContent = "Me";
  }
  document.querySelector("#account-nickname-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeAccountSession?.accessToken) return;
    const displayName = new FormData(event.currentTarget).get("displayName");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${activeAccountSession.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    const payload = await response.json().catch(() => ({}));
    document.querySelector("#account-sync-status").textContent = response.ok
      ? "Community nickname updated."
      : payload.error || "Nickname could not be updated.";
    if (response.ok) {
      document.querySelector("#account-profile-name").textContent = payload.profile.displayName;
      document.querySelector("#drawer-account-title").textContent = payload.profile.displayName;
      renderAccountAvatar(payload.profile.avatarUrl, payload.profile.displayName);
    }
  });
  document.querySelector("#account-avatar-input")?.addEventListener("change", async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || !activeAccountSession?.accessToken) return;
    const syncStatus = document.querySelector("#account-sync-status");
    const displayName = document.querySelector("#account-profile-name")?.textContent || "Explorer";
    input.disabled = true;
    syncStatus.textContent = "Preparing your profile photo…";
    try {
      const dataUrl = await profilePhotoDataUrl(file);
      syncStatus.textContent = "Uploading your profile photo…";
      const response = await fetch("/api/profile-avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeAccountSession.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dataUrl }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Profile photo upload failed.");
      renderAccountAvatar(payload.avatarUrl, displayName);
      syncStatus.textContent = "Profile photo updated.";
    } catch (error) {
      syncStatus.textContent = error.message;
    } finally {
      input.disabled = false;
      input.value = "";
    }
  });
  document.querySelector("#account-sign-out").addEventListener("click", async () => {
    if (session?.accessToken && authConfig) {
      await authApi("logout", { method: "POST", headers: { Authorization: `Bearer ${session.accessToken}` } }).catch(() => {});
    }
    saveAccountSession(null);
    window.location.reload();
  });
}

function initDialogViewportLock() {
  let lockState = null;

  const syncViewportHeight = () => {
    const height = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty(
      "--auditmap-visual-viewport-height",
      `${Math.round(height)}px`,
    );
  };

  const syncLock = () => {
    const hasOpenDialog = Boolean(document.querySelector("dialog[open]"));
    if (hasOpenDialog && !lockState) {
      lockState = {
        scrollY: window.scrollY,
        position: document.body.style.position,
        top: document.body.style.top,
        right: document.body.style.right,
        left: document.body.style.left,
        width: document.body.style.width,
        overflow: document.body.style.overflow,
      };
      document.documentElement.classList.add("has-open-site-dialog");
      document.body.classList.add("has-open-site-dialog");
      Object.assign(document.body.style, {
        position: "fixed",
        top: `-${lockState.scrollY}px`,
        right: "0",
        left: "0",
        width: "100%",
        overflow: "hidden",
      });
      return;
    }
    if (!hasOpenDialog && lockState) {
      const previous = lockState;
      lockState = null;
      document.documentElement.classList.remove("has-open-site-dialog");
      document.body.classList.remove("has-open-site-dialog");
      Object.assign(document.body.style, {
        position: previous.position,
        top: previous.top,
        right: previous.right,
        left: previous.left,
        width: previous.width,
        overflow: previous.overflow,
      });
      window.scrollTo(0, previous.scrollY);
    }
  };

  syncViewportHeight();
  window.visualViewport?.addEventListener("resize", syncViewportHeight);
  window.addEventListener("orientationchange", syncViewportHeight);
  new MutationObserver(syncLock).observe(document.body, {
    attributes: true,
    attributeFilter: ["open"],
    subtree: true,
  });
  document.addEventListener("close", syncLock, true);
  document.addEventListener("cancel", () => window.setTimeout(syncLock, 0), true);
}

initVercelAnalytics();
trackAttributedLanding();
initDialogViewportLock();
initSiteNavigation().catch(() => {});
initAskAuditMap();

if (page === "map") {
  initMapPage().catch((error) => {
    document.querySelector("#results-count").textContent = error.message;
  });
}

if (page === "place") {
  initPlacePage().catch(() => {
    document.querySelector("#place-content").innerHTML = `
      <section class="not-found">
        <h1>We could not load this place.</h1>
        <p><a href="/index.html">Return to the map</a></p>
      </section>
    `;
  });
}

if (page === "feature") {
  initFeaturePage().catch(() => {
    document.querySelector("#feature-content").innerHTML = `
      <section class="not-found">
        <h1>We could not load this area.</h1>
        <p><a href="/index.html">Return to the map</a></p>
      </section>
    `;
  });
}

if (page === "search-place") {
  initPlacePage().catch(() => {});
}
