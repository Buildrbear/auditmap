const dataUrl = "./data/institutions.json";
const ncAreasUrl = "./data/nc-areas.json";

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

async function loadPlaces() {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error("Could not load place data.");
  const curatedPlaces = await response.json();
  const discoveredPlaces = getLocalRecord("auditmap:discovered-places", []).map(
    normalizeCommunityRecord,
  );
  let sharedPlaces = [];
  try {
    const sharedResponse = await fetch("./api/places?limit=250");
    if (sharedResponse.ok) {
      const sharedPayload = await sharedResponse.json();
      sharedPlaces = sharedPayload.places || [];
    }
  } catch {
    sharedPlaces = [];
  }
  return mergePlaceRecords(
    mergePlaceRecords(curatedPlaces, discoveredPlaces),
    sharedPlaces,
  );
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
  return `./place.html?city=${encodeURIComponent(citySlug(place))}&id=${encodeURIComponent(place.id)}`;
}

function placeKey(place) {
  return `${citySlug(place)}:${place.id}`;
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

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
      `./api/feed?placeId=${encodeURIComponent(placeId)}`,
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
    }));
  } catch {
    return [];
  }
}

async function loadPlaceKnowledge(placeId) {
  try {
    const response = await fetch(`./api/knowledge?placeId=${encodeURIComponent(placeId)}`);
    if (!response.ok) return [];
    return (await response.json()).questions || [];
  } catch {
    return [];
  }
}

async function loadPlaceFeatures(placeId) {
  try {
    const response = await fetch(`./api/features?placeId=${encodeURIComponent(placeId)}`);
    if (!response.ok) return { features: [] };
    return response.json();
  } catch {
    return { features: [] };
  }
}

function featureCategory(feature) {
  if (["entrance", "parking", "transit"].includes(feature.feature_type)) return "Arrival";
  if (["restroom", "elevator", "accessible_route", "service"].includes(feature.feature_type)) {
    return "Services";
  }
  return "Destinations";
}

function renderPlaceFeatures(place, payload) {
  const features = (payload.features || []).filter(
    (feature) => Number.isFinite(Number(feature.latitude)) &&
      Number.isFinite(Number(feature.longitude)),
  );
  if (!features.length) return;
  window.setAuditMapAskFeatures?.(features);

  const section = document.querySelector("#place-explorer");
  const filters = document.querySelector("#feature-filters");
  const list = document.querySelector("#feature-list");
  const count = document.querySelector("#feature-browser-count");
  const sourceLink = document.querySelector("#explorer-source");
  const levels = [...new Set(features.map((feature) => feature.level_label).filter(Boolean))];
  const filterValues = levels.length
    ? ["All", ...levels]
    : ["All", ...new Set(features.map(featureCategory))];
  let activeFilter = "All";
  let selectedId = features[0].id;
  let focusedFeatureId = null;
  let cardScrollTimer = null;
  const mapElement = document.querySelector("#internal-map");

  section.hidden = false;
  document.querySelector("#explorer-kicker").textContent =
    levels.length ? "Building guide" : "Explore the grounds";
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
        ><span>${index + 1}</span></button>`;
      })
      .join("")}
    <span class="internal-user-location" aria-label="Your location" hidden>
      <span class="user-location-marker">
        <span class="user-location-pulse"></span>
        <span class="user-location-dot"></span>
      </span>
    </span>
    </div>
    <span class="internal-map-label">Swipe places to explore · Pinch to zoom</span>
    <span class="internal-map-attribution">
      © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>
    </span>
  `;

  const tileLayer = mapElement.querySelector(".internal-map-tiles");
  const markerElements = [...mapElement.querySelectorAll("[data-feature-marker]")];
  const userLocationElement = mapElement.querySelector(".internal-user-location");
  let mapZoom = null;
  let minimumMapZoom = 12;
  let pinchDistance = null;
  let userLocation = null;
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

    let fittedZoom = 18;
    let fittedPoints = features.map((feature) =>
      project(Number(feature.latitude), Number(feature.longitude), fittedZoom),
    );
    const fits = () => {
      const xs = fittedPoints.map((point) => point.x);
      const ys = fittedPoints.map((point) => point.y);
      return Math.max(...xs) - Math.min(...xs) <= width - 72 &&
        Math.max(...ys) - Math.min(...ys) <= height - 72;
    };
    while (fittedZoom > 12 && !fits()) {
      fittedZoom -= 1;
      fittedPoints = features.map((feature) =>
        project(Number(feature.latitude), Number(feature.longitude), fittedZoom),
      );
    }

    minimumMapZoom = fittedZoom;
    mapZoom = Math.min(Math.max(mapZoom ?? fittedZoom, fittedZoom), Math.min(fittedZoom + 4, 19));
    const projected = features.map((feature) =>
      project(Number(feature.latitude), Number(feature.longitude), mapZoom),
    );
    const focusedIndex = features.findIndex((feature) => feature.id === focusedFeatureId);
    const useFocusedCenter = focusedIndex >= 0 && mapZoom > minimumMapZoom;
    const centerX = useFocusedCenter
      ? projected[focusedIndex].x
      : (Math.min(...projected.map((point) => point.x)) +
        Math.max(...projected.map((point) => point.x))) / 2;
    const centerY = useFocusedCenter
      ? projected[focusedIndex].y
      : (Math.min(...projected.map((point) => point.y)) +
        Math.max(...projected.map((point) => point.y))) / 2;
    const originX = centerX - width / 2;
    const originY = centerY - height / 2;
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
    tileLayer.innerHTML = tiles.join("");
    markerElements.forEach((marker, index) => {
      marker.style.left = `${projected[index].x - originX}px`;
      marker.style.top = `${projected[index].y - originY}px`;
    });
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
        return `
          <article class="feature-card${feature.id === selectedId ? " is-selected" : ""}" data-feature-id="${escapeHtml(feature.id)}" tabindex="0">
            <a
              class="feature-card-navigate"
              href="${navigateUrl}"
              target="_blank"
              rel="noreferrer"
              aria-label="Navigate to ${escapeHtml(feature.name)}"
              title="Navigate"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.4 3.6 3.8 10.4c-.8.3-.8 1.5.1 1.7l6.8 1.3 1.3 6.8c.2.9 1.4.9 1.7.1l6.8-16.6c.3-.7-.4-1.4-1.1-1.1Z"></path>
                <path d="m10.7 13.3 4.2-4.2"></path>
              </svg>
            </a>
            <button
              class="feature-card-media${imageUrl ? " has-image" : ""}"
              type="button"
              data-feature-photo="${escapeHtml(feature.id)}"
              aria-label="Add a picture of ${escapeHtml(feature.name)}"
            >
              ${imageUrl
                ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(feature.name)}" loading="lazy" />`
                : `<span class="feature-photo-prompt"><b>+</b>Add a picture</span>`}
              <span class="feature-card-number">${index}</span>
            </button>
            <div class="feature-card-body">
              <p>${escapeHtml(featureCategory(feature))}${feature.level_label ? ` · ${escapeHtml(feature.level_label)}` : ""}</p>
              <h3>${escapeHtml(feature.name)}</h3>
              <span>${escapeHtml(feature.description || "Community details welcome.")}</span>
            </div>
          </article>
        `;
      })
      .join("");
    list.querySelectorAll("[data-feature-id]").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (!event.target.closest("a, button") && list.dataset.scrolling !== "true") {
          window.location.href = `./feature.html?place=${encodeURIComponent(place.id)}&feature=${encodeURIComponent(card.dataset.featureId)}`;
        }
      });
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          window.location.href = `./feature.html?place=${encodeURIComponent(place.id)}&feature=${encodeURIComponent(card.dataset.featureId)}`;
        }
      });
    });
    list.querySelectorAll("[data-feature-photo]").forEach((button) => {
      button.addEventListener("click", () => {
        const feature = features.find((item) => item.id === button.dataset.featurePhoto);
        const disclosure = document.querySelector(".contribution-disclosure");
        const form = document.querySelector("#contribution-form");
        const photoInput = form?.elements.photos;
        if (!feature || !disclosure || !form || !photoInput) return;
        selectFeature(feature.id, true, true);
        disclosure.open = true;
        form.dataset.featureId = feature.id;
        form.dataset.featureName = feature.name;
        photoInput.click();
      });
    });
    list.onscroll = () => {
      list.dataset.scrolling = "true";
      window.clearTimeout(cardScrollTimer);
      cardScrollTimer = window.setTimeout(() => {
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
          selectFeature(closest.card.dataset.featureId, false, true);
        }
        window.setTimeout(() => {
          delete list.dataset.scrolling;
        }, 120);
      }, 90);
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

  renderList();
}

function renderPlaceKnowledge(place, questions) {
  const section = document.querySelector("#place-knowledge");
  if (!section || !questions.length) return;
  section.hidden = false;
  document.querySelector("#knowledge-count").textContent =
    `${questions.length} ${questions.length === 1 ? "answer" : "answers"}`;
  document.querySelector("#knowledge-list").innerHTML = questions
    .map((item) => {
      const sources = Array.isArray(item.answer_sources) ? item.answer_sources : [];
      const checked = item.answered_at
        ? new Date(item.answered_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Not recorded";
      return `
        <details class="knowledge-item">
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
        </details>
      `;
    })
    .join("");

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

async function submitSharedContribution(place, contribution) {
  try {
    const response = await fetch("./api/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const response = await fetch("./api/stewards", {
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

function cardMedia(place) {
  const coverImage = place.image || place.images?.[0];
  if (!coverImage?.url) return "";
  return `
    <span class="card-image-wrap">
      <img class="card-image" src="${escapeHtml(coverImage.url)}" alt="" loading="lazy" />
    </span>
  `;
}

function askPlaceContext(place) {
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
    amenities: place.amenities || [],
    features: window.auditMapAskFeatures || [],
    url: placeUrl(place),
  };
}

function initAskAuditMap() {
  const shell = document.createElement("section");
  shell.className = "ask-auditmap";
  shell.innerHTML = `
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
        <button class="ask-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="ask-messages" aria-live="polite">
        <div class="ask-message is-assistant">Select a place to ask a question.</div>
      </div>
      <form class="ask-form">
        <label class="sr-only" for="ask-input">Ask AuditMap a question</label>
        <input id="ask-input" name="question" maxlength="500" autocomplete="off" placeholder="Ask any question" required />
        <button type="submit" aria-label="Send question">↑</button>
      </form>
      <p class="ask-note">Answers use available records and may be incomplete. Check cited sources before visiting.</p>
    </div>
  `;
  document.body.append(shell);

  const launcher = shell.querySelector(".ask-launcher");
  const panel = shell.querySelector(".ask-panel");
  const close = shell.querySelector(".ask-close");
  const form = shell.querySelector(".ask-form");
  const input = shell.querySelector("#ask-input");
  const messages = shell.querySelector(".ask-messages");
  const submit = form.querySelector("button");
  const history = [];
  let currentPlace = null;
  window.setAuditMapAskFeatures = (features) => {
    window.auditMapAskFeatures = (features || []).map((feature) => ({
      name: feature.name,
      type: feature.feature_type,
      description: feature.description,
      level: feature.level_label,
      source: feature.source_url,
    }));
  };

  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    if (open) window.setTimeout(() => input.focus(), 50);
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

  window.setAuditMapAskPlace = (place) => {
    currentPlace = place || null;
    setOpen(false);
    launcher.hidden = !currentPlace;
    history.length = 0;
    input.value = "";
    if (!currentPlace) return;
    const question = `What would you like to know about ${currentPlace.name}?`;
    panel.querySelector(".ask-heading h2").textContent = question;
    messages.innerHTML = "";
    addMessage(
      `${question} Ask about hours, cost, accessibility, children, pets, or planning a visit.`,
      "assistant",
    );
    input.placeholder = `Ask about ${currentPlace.name}`;
  };

  launcher.addEventListener("click", () => setOpen(panel.hidden));
  close.addEventListener("click", () => setOpen(false));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    addMessage(question, "visitor");
    input.value = "";
    submit.disabled = true;
    submit.textContent = "…";
    const context = currentPlace ? [askPlaceContext(currentPlace)] : [];
    try {
      const response = await fetch("./api/ask", {
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
      submit.textContent = "↑";
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
    place.type,
    place.hours,
    place.cost,
    place.accessibility,
    place.transit,
    ...(place.amenities || []),
    ...(place.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
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
  dogs: (place) => /\b(dog park|dogs? allowed|pet friendly)\b/.test(placeSearchText(place)),
  accessible: (place) => {
    const accessibility = String(place.accessibility || "").toLowerCase();
    return (
      /\b(accessible|wheelchair|step-free)\b/.test(accessibility) &&
      !/\b(need|unknown|verify|check|not yet)\b/.test(accessibility)
    );
  },
};

function mapPopupContent(place) {
  const coverImage = place.image || place.images?.[0];
  const rating = getPlaceRating(place);
  return `
    <article class="map-preview${coverImage?.url ? " has-image" : ""}">
      <div class="map-preview-copy">
        <p class="map-preview-type">${escapeHtml(place.type)} · ${escapeHtml(place.neighborhood)}</p>
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
        <dl>
          <div><dt>Hours</dt><dd>${escapeHtml(place.hours || "Not yet documented")}</dd></div>
          <div><dt>Cost</dt><dd>${escapeHtml(place.cost || "Not yet documented")}</dd></div>
        </dl>
        <span class="map-preview-link">View full place</span>
      </div>
      ${coverImage?.url ? `<img src="${escapeHtml(coverImage.url)}" alt="" />` : ""}
    </article>
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
  const filterLaunchButtons = [
    document.querySelector("#toolbar-filter-button"),
    document.querySelector("#card-filter-button"),
  ];
  const filterCountBadges = [...document.querySelectorAll("[data-filter-count]")];
  const locationButton = document.querySelector("#location-button");
  const locationButtonLabel = document.querySelector("#location-button-label");
  const locationStatus = document.querySelector("#location-status");
  const searchAreaButton = document.querySelector("#search-area-button");
  const sheetHandle = document.querySelector("#sheet-handle");
  const mobilePlacePreview = document.querySelector("#mobile-place-preview");
  let places = await loadPlaces();
  let ncAreas = [];
  try {
    const areasResponse = await fetch(ncAreasUrl);
    if (areasResponse.ok) ncAreas = await areasResponse.json();
  } catch {
    ncAreas = [];
  }
  let cities = [...new Map(places.map((place) => [citySlug(place), place])).entries()];
  const placeTypes = [...new Set([...places.map((place) => place.type), "Dog park"])].sort();
  const requestedCity = new URLSearchParams(window.location.search).get("city");
  const storedMapView = getLocalRecord("auditmap:last-map-view", null);
  const storedSearchArea = getLocalRecord("auditmap:last-search-area", null);
  const hasStoredMapView =
    !requestedCity &&
    Number.isFinite(storedMapView?.latitude) &&
    Number.isFinite(storedMapView?.longitude) &&
    storedMapView.latitude >= 33.75 &&
    storedMapView.latitude <= 36.59 &&
    storedMapView.longitude >= -84.33 &&
    storedMapView.longitude <= -75.4;
  let activeCity = cities.some(([slug]) => slug === requestedCity)
    ? requestedCity
    : cities[0]?.[0];
  const activeVisitFilters = new Set();
  const activeTypeFilters = new Set();
  let activeMinRating = 0;
  let userLocation = null;
  let userLocationMarker = null;
  let locationWatchId = null;
  let locationLoadInProgress = false;
  let nearbyMode = false;
  let viewportMode = hasStoredMapView;
  let currentArea = {
    name: hasStoredMapView ? storedMapView.name : initialAreaName(),
    label: hasStoredMapView ? storedMapView.label : initialAreaName(),
  };
  let mapMoveTimer = null;
  let areaRequestId = 0;
  let suppressMoveResponse = false;
  let selectedMobilePlace = null;
  let sheetPointerStart = null;
  let previewPointerStart = null;
  let mobileCarouselPlaces = [];
  let sheetWasDragged = false;
  const maxRenderedResults = 50;

  const quickFilters = [
    ["open", "Open now"],
    ["free", "Free"],
    ["kids", "Kids"],
    ["dogs", "Dogs"],
    ["accessible", "Accessible"],
  ];
  filterRow.innerHTML = `
    ${quickFilters
      .map(
        ([value, label]) =>
          `<button class="filter-button" type="button" data-visit-filter="${value}" aria-pressed="false">${label}</button>`,
      )
      .join("")}
    <button class="filter-button more-filter-button" type="button" id="more-filter-button">
      More <span id="more-filter-count" hidden></span>
    </button>
    <button class="clear-filter-chip" type="button" id="clear-filter-chip" hidden>Clear</button>
  `;
  const quickFilterButtons = [...filterRow.querySelectorAll("[data-visit-filter]")];
  const moreFilterButton = document.querySelector("#more-filter-button");
  const moreFilterCount = document.querySelector("#more-filter-count");
  const clearFilterChip = document.querySelector("#clear-filter-chip");
  visitFilterOptions.innerHTML = quickFilters
    .map(
      ([value, label]) => `
        <label class="filter-option">
          <input type="checkbox" name="visit-filter" value="${value}" />
          <span>${label}</span>
        </label>
      `,
    )
    .join("");
  typeFilterOptions.innerHTML = placeTypes
    .map(
      (type) => `
        <label class="filter-option">
          <input type="checkbox" name="place-type" value="${escapeHtml(type)}" />
          <span>${escapeHtml(type)}</span>
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
    return initialPlace?.city || "North Carolina";
  }

  renderCityOptions();

  const initialPlaces = places.filter((place) => citySlug(place) === activeCity);
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
    : 12;
  const map = L.map("map", { zoomControl: true }).setView(initialCenter, initialZoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);
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
  const markersByPlace = new Map();
  const mobileLayout = window.matchMedia("(max-width: 860px)");
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

  function setMapCenter(latitude, longitude, zoom = 12) {
    suppressMoveResponse = true;
    map.setView([latitude, longitude], zoom);
    setLocalRecord("auditmap:last-map-view", {
      latitude,
      longitude,
      zoom,
      name: currentArea.name,
      label: currentArea.label,
    });
    window.setTimeout(() => {
      suppressMoveResponse = false;
    }, 450);
  }

  function renderStateGateways() {
    regionLayer.clearLayers();
    if (map.getZoom() > 8 || !northCarolinaBounds.overlaps(map.getBounds())) return;

    ncAreas.forEach((area) => {
      const areaPlaces = places.filter(
        (place) => place.city.toLowerCase() === area.name.toLowerCase(),
      );
      const detail = areaPlaces.length
        ? `${areaPlaces.length} ${areaPlaces.length === 1 ? "place" : "places"}`
        : "Explore";
      const icon = L.divIcon({
        className: "region-gateway-wrap",
        html: `
          <span class="region-gateway${areaPlaces.length ? " has-records" : ""}">
            <strong>${escapeHtml(area.name)}</strong>
            <small>${escapeHtml(detail)}</small>
          </span>
        `,
        iconSize: [116, 48],
        iconAnchor: [58, 24],
      });
      L.marker([area.latitude, area.longitude], {
        icon,
        title: `Explore ${area.name}`,
        keyboard: true,
        zIndexOffset: areaPlaces.length ? 100 : 0,
      })
        .addTo(regionLayer)
        .on("click", () => discoverNorthCarolina(area.name));
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
    if (!northCarolinaBounds.contains(center)) {
      currentArea = { name: "Outside North Carolina", label: "Outside North Carolina" };
      searchAreaButton.hidden = true;
      render();
      return;
    }

    try {
      const response = await fetch(
        `./api/area?lat=${center.lat.toFixed(4)}&lon=${center.lng.toFixed(4)}`,
      );
      const area = await response.json();
      if (!response.ok || requestId !== areaRequestId) return;
      currentArea = {
        name: area.name || "North Carolina",
        label: area.label || area.name || "North Carolina",
      };
      setLocalRecord("auditmap:last-map-view", {
        ...getLocalRecord("auditmap:last-map-view", {}),
        name: currentArea.name,
        label: currentArea.label,
      });
      render();
    } catch {
      if (requestId === areaRequestId) render();
    }
  }

  function handleMapMoved() {
    if (suppressMoveResponse) return;
    if (nearbyMode && userLocation) {
      updateUserLocationMarkerScale();
      searchAreaButton.hidden =
        map.getZoom() < 9 || !northCarolinaBounds.contains(map.getCenter());
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
    viewportMode = true;
    nearbyMode = false;
    userLocation = null;
    userLocationMarker = null;
    search.value = "";
    locationLayer.clearLayers();
    locationButton.classList.remove("is-active");
    locationButtonLabel.textContent = "Near me";
    locationStatus.textContent = "";
    searchAreaButton.hidden =
      map.getZoom() < 9 || !northCarolinaBounds.contains(map.getCenter());
    const center = map.getCenter();
    if (map.getZoom() <= 8 && northCarolinaBounds.overlaps(map.getBounds())) {
      currentArea = { name: "North Carolina", label: "North Carolina" };
    }
    setLocalRecord("auditmap:last-map-view", {
      latitude: center.lat,
      longitude: center.lng,
      zoom: map.getZoom(),
      name: currentArea.name,
      label: currentArea.label,
    });
    if (map.getZoom() <= 8 && northCarolinaBounds.overlaps(map.getBounds())) {
      searchAreaButton.hidden = true;
      render();
      return;
    }
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
    window.location.href = placeUrl(place);
  }

  async function loadStatewidePlaces(latitude, longitude, cityName = "", radius = 16000) {
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      radius: String(radius),
    });
    if (cityName) params.set("city", cityName);
    try {
      const sharedResponse = await fetch(
        `./api/places?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&radius=${encodeURIComponent(radius)}&limit=250`,
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

    const response = await fetch(`./api/nc-places?${params}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not load nearby public places.");
    places = mergePlaceRecords(places, payload.places || []);
    const discoveredPlaces = places.filter((place) => place.discoveryStatus);
    setLocalRecord("auditmap:discovered-places", discoveredPlaces.slice(-500));
    renderCityOptions();
    return payload.places || [];
  }

  async function discoverNorthCarolina(query) {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return;
    count.textContent = "Searching across North Carolina...";
    searchForm.querySelector("button").disabled = true;
    try {
      const geocodeResponse = await fetch(
        `./api/geocode?v=2&q=${encodeURIComponent(normalizedQuery)}`,
      );
      const location = await geocodeResponse.json();
      if (!geocodeResponse.ok) throw new Error(location.error || "Location not found.");
      const discovered = await loadStatewidePlaces(
        location.latitude,
        location.longitude,
        location.name,
        20000,
      );
      const targetSlug = slugify(`${location.name}-NC`);
      const matchingCity = cities.find(([slug]) => slug === targetSlug);
      activeCity = matchingCity?.[0] || citySlug(discovered[0] || places[0]);
      nearbyMode = false;
      viewportMode = true;
      userLocation = null;
      userLocationMarker = null;
      locationLoadInProgress = false;
      stopLocationWatch();
      locationLayer.clearLayers();
      locationButton.classList.remove("is-active");
      locationButtonLabel.textContent = "Near me";
      currentArea = { name: location.name, label: location.name };
      search.value = "";
      const url = new URL(window.location.href);
      url.searchParams.set("city", activeCity);
      window.history.replaceState({}, "", url);
      setMapCenter(location.latitude, location.longitude, 12);
      showSearchBoundary(location);
      render();
      searchAreaButton.hidden = true;
      if (mobileLayout.matches) setSheetExpanded(true);
    } catch (error) {
      count.textContent = error.message;
    } finally {
      searchForm.querySelector("button").disabled = false;
    }
  }

  function setSheetExpanded(expanded) {
    list.closest(".places-sidebar").classList.toggle("is-expanded", expanded);
    sheetHandle.setAttribute("aria-expanded", String(expanded));
    sheetHandle.querySelector(".sr-only").textContent =
      expanded ? "Collapse place results" : "Expand place results";
    window.setTimeout(() => map.invalidateSize(), 240);
  }

  function updateUserLocationMarkerScale() {
    if (!userLocationMarker) return;
    const zoom = map.getZoom();
    const size = zoom <= 9 ? 24 : zoom <= 11 ? 30 : zoom <= 14 ? 38 : 44;
    const element = userLocationMarker.getElement();
    element?.style.setProperty("--location-size", `${size}px`);
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
    window.setAuditMapAskPlace?.(null);
    const sidebar = list.closest(".places-sidebar");
    sidebar.classList.remove("has-place-preview", "is-opening-place", "is-expanded");
    mobilePlacePreview.hidden = true;
    mobilePlacePreview.innerHTML = "";
    sheetHandle.setAttribute("aria-expanded", "false");
    sheetHandle.querySelector(".sr-only").textContent = "Expand place results";
  }

  function showMobilePlacePreview(place, swipeDirection = 0) {
    selectedMobilePlace = place;
    window.setAuditMapAskPlace?.(place);
    const sidebar = list.closest(".places-sidebar");
    const coverImage = place.image || place.images?.[0];
    const rating = getPlaceRating(place);
    const carouselIndex = Math.max(
      0,
      mobileCarouselPlaces.findIndex(
        (item) => placeKey(item) === placeKey(place),
      ),
    );
    const detailItems = [
      place.hours && !place.hours.toLowerCase().includes("not yet")
        ? place.hours
        : null,
      place.cost && !place.cost.toLowerCase().includes("not yet")
        ? place.cost
        : null,
    ].filter(Boolean);

    mobilePlacePreview.innerHTML = `
      <button class="mobile-preview-close" type="button" aria-label="Return to place list">×</button>
      <button class="mobile-preview-main${coverImage?.url ? " has-image" : ""}${swipeDirection ? ` is-swipe-${swipeDirection > 0 ? "next" : "previous"}` : ""}" type="button">
        ${
          coverImage?.url
            ? `<span class="mobile-preview-image"><img src="${escapeHtml(coverImage.url)}" alt="" /></span>`
            : ""
        }
        <span class="mobile-preview-copy">
          <span class="mobile-preview-type">${escapeHtml(place.type)} · ${escapeHtml(place.neighborhood || place.city)}</span>
          <strong>${escapeHtml(place.name)}</strong>
          ${
            rating.value
              ? `<span class="mobile-preview-rating">${rating.value.toFixed(1)} ★ · ${escapeHtml(rating.label)}</span>`
              : `<span class="mobile-preview-rating">Not yet rated</span>`
          }
          ${detailItems.length ? `<span class="mobile-preview-details">${escapeHtml(detailItems.join(" · "))}</span>` : ""}
          <span class="mobile-preview-hint">Tap or swipe up for the full place</span>
          ${
            mobileCarouselPlaces.length > 1
              ? `<span class="mobile-preview-position">${carouselIndex + 1} of ${mobileCarouselPlaces.length} nearby · Swipe left or right</span>`
              : ""
          }
        </span>
      </button>
    `;
    mobilePlacePreview.hidden = false;
    sidebar.classList.remove("is-expanded", "is-opening-place");
    sidebar.classList.add("has-place-preview");
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
      .querySelector(".mobile-preview-close")
      .addEventListener("click", clearMobilePlacePreview);
    window.setTimeout(() => map.invalidateSize(), 220);
  }

  function selectPlaceOnMap(place) {
    if (mobileLayout.matches) {
      showMobilePlacePreview(place);
      markersByPlace.get(placeKey(place))?.closePopup();
      return;
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
    markersByPlace.get(placeKey(place))?.openPopup();
  }

  function render(options = {}) {
    const cityPlaces = places.filter((place) => citySlug(place) === activeCity);
    const city = cityPlaces[0];
    const query = search.value.trim().toLowerCase();
    const mapBounds = map.getBounds().pad(0.12);
    const viewportPlaces = places.filter((place) =>
      mapBounds.contains([place.latitude, place.longitude]),
    );
    const searchablePlaces = nearbyMode || query
      ? places
      : viewportMode
        ? viewportPlaces
        : cityPlaces;
    const matchedPlaces = searchablePlaces.filter((place) => {
      const matchesType =
        activeTypeFilters.size === 0 || activeTypeFilters.has(place.type);
      const matchesVisit = [...activeVisitFilters].every((filter) =>
        visitFilterRules[filter]?.(place),
      );
      const matchesRating =
        activeMinRating === 0 || getPlaceRating(place).value >= activeMinRating;
      const haystack = [
        place.name,
        place.type,
        place.city,
        place.state,
        place.neighborhood,
        place.address,
        ...(place.tags || []),
      ]
        .join(" ")
        .toLowerCase();
      return matchesType && matchesVisit && matchesRating && haystack.includes(query);
    });
    const rankedPlaces = userLocation && nearbyMode
      ? matchedPlaces
          .map((place) => ({
            ...place,
            distance: distanceMiles(userLocation, place),
          }))
          .sort((left, right) => left.distance - right.distance)
      : matchedPlaces;
    const visiblePlaces = rankedPlaces.slice(0, maxRenderedResults);
    mobileCarouselPlaces = visiblePlaces;
    const statewideView =
      map.getZoom() <= 8 && northCarolinaBounds.overlaps(map.getBounds());

    cityHeading.textContent = statewideView
      ? "North Carolina"
      : nearbyMode
      ? "Near you"
      : query
        ? "Search results"
        : viewportMode
          ? currentArea.name
          : city?.city || "North Carolina";
    const resultScope = rankedPlaces.length > visiblePlaces.length
      ? `Showing ${visiblePlaces.length} of ${rankedPlaces.length}`
      : `${visiblePlaces.length}`;
    const activeFilterCount =
      activeVisitFilters.size + activeTypeFilters.size + (activeMinRating ? 1 : 0);
    count.textContent = statewideView
      ? `${ncAreas.length} areas to explore`
      : `${resultScope} ${rankedPlaces.length === 1 ? "place" : "places"}${nearbyMode ? " ranked by distance" : ""}${activeFilterCount ? ` · ${activeFilterCount} ${activeFilterCount === 1 ? "filter" : "filters"}` : ""}`;
    areaSummary.textContent = statewideView
      ? "Choose a city to reveal its public places"
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
          <button class="place-card${place.image?.url || place.images?.[0]?.url ? " has-media" : ""}" type="button" data-place-id="${escapeHtml(place.id)}" data-city-slug="${escapeHtml(citySlug(place))}">
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
    if (statewideView) {
      list.innerHTML = ncAreas
        .map((area) => {
          const areaPlaces = places.filter(
            (place) => place.city.toLowerCase() === area.name.toLowerCase(),
          );
          const needsLocalCheck = areaPlaces.filter(
            (place) => documentationScore(place) < 72,
          ).length;
          return `
            <button class="area-card" type="button" data-area-name="${escapeHtml(area.name)}">
              <span class="area-progress${areaPlaces.length ? " has-records" : ""}"></span>
              <span>
                <h2>${escapeHtml(area.name)}</h2>
                <p>${escapeHtml(area.region)}</p>
              </span>
              <span class="area-card-detail">
                ${areaPlaces.length ? `${areaPlaces.length} places${needsLocalCheck ? `<br>${needsLocalCheck} could use a local check` : ""}` : "Explore"}
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
    visiblePlaces.forEach((place, index) => {
      const number = index + 1;
      const icon = L.divIcon({
        className: "numbered-marker",
        html: `<span class="marker-pin${place.discoveryStatus ? " is-seed" : " is-curated"}">${number}</span>`,
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
          maxWidth: 300,
          minWidth: 260,
          offset: [0, -12],
        })
        .on("mouseover", (event) => event.target.openPopup())
        .on("mouseout", (event) => event.target.closePopup())
        .on("click", () => {
          if (mobileLayout.matches) {
            selectPlaceOnMap(place);
          } else {
            openPlace(place);
          }
        });
      markerLayer.addLayer(marker);
      markersByPlace.set(placeKey(place), marker);
    });
    if (map.getZoom() <= 8) {
      map.removeLayer(markerLayer);
    } else if (!map.hasLayer(markerLayer)) {
      map.addLayer(markerLayer);
    }
    renderStateGateways();

    if (options.fitMap && visiblePlaces.length) {
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
      const marker = place ? markersByPlace.get(placeKey(place)) : null;
      const showPreview = () => marker?.openPopup();
      const hidePreview = () => marker?.closePopup();
      card.addEventListener("mouseenter", showPreview);
      card.addEventListener("mouseleave", hidePreview);
      card.addEventListener("focus", showPreview);
      card.addEventListener("blur", hidePreview);
      card.addEventListener("click", () => {
        if (place) openPlace(place);
      });
    });
    list.querySelectorAll("[data-area-name]").forEach((card) => {
      card.addEventListener("click", () => discoverNorthCarolina(card.dataset.areaName));
    });
  }

  let activeSuggestionIndex = -1;
  let currentSuggestions = [];

  function suggestedSearches(query) {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length < 2) return [];
    const matches = (value) => String(value || "").toLowerCase().includes(normalizedQuery);
    const startsFirst = (left, right) => {
      const leftStarts = left.primary.toLowerCase().startsWith(normalizedQuery);
      const rightStarts = right.primary.toLowerCase().startsWith(normalizedQuery);
      return Number(rightStarts) - Number(leftStarts) || left.primary.localeCompare(right.primary);
    };
    const placeSuggestions = places
      .filter(
        (place) =>
          matches(place.name) ||
          matches(place.address) ||
          matches(place.neighborhood) ||
          matches(place.type),
      )
      .map((place) => ({
        kind: "place",
        primary: place.name,
        secondary: `${place.type} · ${place.city}`,
        place,
      }))
      .sort(startsFirst)
      .slice(0, 5);
    const areaSuggestions = ncAreas
      .filter((area) => matches(area.name) || matches(area.region))
      .map((area) => ({
        kind: "area",
        primary: area.name,
        secondary: `${area.region} · North Carolina`,
        area,
      }))
      .sort(startsFirst)
      .slice(0, 3);
    const neighborhoodSuggestions = [
      ...new Set(places.map((place) => place.neighborhood).filter(Boolean)),
    ]
      .filter(matches)
      .map((neighborhood) => ({
        kind: "term",
        primary: neighborhood,
        secondary: "Neighborhood",
      }))
      .sort(startsFirst)
      .slice(0, 2);
    const typeSuggestions = placeTypes
      .filter(matches)
      .map((type) => ({
        kind: "term",
        primary: type,
        secondary: "Place type",
      }))
      .sort(startsFirst)
      .slice(0, 2);
    return [...placeSuggestions, ...areaSuggestions, ...neighborhoodSuggestions, ...typeSuggestions]
      .filter(
        (suggestion, index, suggestions) =>
          suggestions.findIndex(
            (candidate) =>
              candidate.kind === suggestion.kind && candidate.primary === suggestion.primary,
          ) === index,
      )
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
            <span class="suggestion-icon" aria-hidden="true">${suggestion.kind === "place" ? "●" : suggestion.kind === "area" ? "⌖" : "#"}</span>
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

  function chooseSuggestion(index) {
    const suggestion = currentSuggestions[index];
    if (!suggestion) return;
    closeSuggestions();
    search.value = suggestion.primary;
    if (suggestion.kind === "area") {
      discoverNorthCarolina(suggestion.area.name);
      return;
    }
    if (suggestion.kind === "place") {
      activeCity = citySlug(suggestion.place);
      setMapCenter(suggestion.place.latitude, suggestion.place.longitude, 14);
    }
    render();
  }

  search.addEventListener("input", () => {
    activeSuggestionIndex = -1;
    currentSuggestions = suggestedSearches(search.value);
    paintSuggestions();
    render();
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
    } else if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      chooseSuggestion(activeSuggestionIndex);
    } else if (event.key === "Escape") {
      closeSuggestions();
    }
  });
  search.addEventListener("blur", () => window.setTimeout(closeSuggestions, 120));
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    closeSuggestions();
    discoverNorthCarolina(search.value);
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
  sheetHandle.addEventListener("pointerdown", (event) => {
    sheetPointerStart = event.clientY;
    sheetWasDragged = false;
    sheetHandle.setPointerCapture(event.pointerId);
  });
  sheetHandle.addEventListener("pointerup", (event) => {
    if (sheetPointerStart === null) return;
    const distance = event.clientY - sheetPointerStart;
    sheetPointerStart = null;
    if (Math.abs(distance) < 30) return;
    sheetWasDragged = true;
    if (selectedMobilePlace) {
      if (distance < 0) {
        openMobilePlace(selectedMobilePlace);
      } else {
        clearMobilePlacePreview();
      }
      return;
    }
    setSheetExpanded(distance < 0);
  });
  mobilePlacePreview.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".mobile-preview-close")) return;
    previewPointerStart = {
      x: event.clientX,
      y: event.clientY,
      axis: null,
    };
    sheetWasDragged = false;
    mobilePlacePreview.setPointerCapture(event.pointerId);
  });
  mobilePlacePreview.addEventListener("pointermove", (event) => {
    if (!previewPointerStart || !selectedMobilePlace) return;
    const horizontalDistance = event.clientX - previewPointerStart.x;
    const verticalDistance = event.clientY - previewPointerStart.y;
    if (
      !previewPointerStart.axis &&
      Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance)) > 10
    ) {
      previewPointerStart.axis =
        Math.abs(horizontalDistance) >= Math.abs(verticalDistance)
          ? "horizontal"
          : "vertical";
    }
    if (previewPointerStart.axis !== "horizontal") return;
    const card = mobilePlacePreview.querySelector(".mobile-preview-main");
    if (card) {
      card.style.transform = `translateX(${horizontalDistance * 0.35}px)`;
      card.style.opacity = String(Math.max(0.72, 1 - Math.abs(horizontalDistance) / 600));
    }
  });
  mobilePlacePreview.addEventListener("pointerup", (event) => {
    if (!previewPointerStart || !selectedMobilePlace) return;
    const horizontalDistance = event.clientX - previewPointerStart.x;
    const verticalDistance = event.clientY - previewPointerStart.y;
    const gestureAxis =
      previewPointerStart.axis ||
      (Math.abs(horizontalDistance) >= Math.abs(verticalDistance)
        ? "horizontal"
        : "vertical");
    previewPointerStart = null;
    const card = mobilePlacePreview.querySelector(".mobile-preview-main");
    if (card) {
      card.style.transform = "";
      card.style.opacity = "";
    }
    if (Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance)) < 30) return;
    sheetWasDragged = true;
    if (gestureAxis === "horizontal") {
      const currentIndex = mobileCarouselPlaces.findIndex(
        (place) => placeKey(place) === placeKey(selectedMobilePlace),
      );
      if (currentIndex < 0 || mobileCarouselPlaces.length < 2) return;
      const direction = horizontalDistance < 0 ? 1 : -1;
      const nextIndex =
        (currentIndex + direction + mobileCarouselPlaces.length) %
        mobileCarouselPlaces.length;
      const nextPlace = mobileCarouselPlaces[nextIndex];
      showMobilePlacePreview(nextPlace, direction);
      return;
    }
    if (verticalDistance < 0) {
      openMobilePlace(selectedMobilePlace);
    } else {
      clearMobilePlacePreview();
    }
  });
  mobilePlacePreview.addEventListener("pointercancel", () => {
    previewPointerStart = null;
    const card = mobilePlacePreview.querySelector(".mobile-preview-main");
    if (card) {
      card.style.transform = "";
      card.style.opacity = "";
    }
  });
  searchAreaButton.addEventListener("click", async () => {
    const center = map.getCenter();
    const searchedBounds = map.getBounds();
    showViewportBoundary(searchedBounds, currentArea.name);
    searchAreaButton.disabled = true;
    searchAreaButton.textContent = "Loading places...";
    count.textContent = `Finding public places around ${currentArea.name}...`;
    try {
      await loadStatewidePlaces(
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
      searchAreaButton.textContent = "Search this area";
    }
  });
  locationButton.addEventListener("click", () => {
    if (nearbyMode) {
      nearbyMode = false;
      viewportMode = true;
      userLocation = null;
      userLocationMarker = null;
      stopLocationWatch();
      locationLayer.clearLayers();
      locationButton.classList.remove("is-active");
      locationButtonLabel.textContent = "Near me";
      locationStatus.textContent = "";
      render();
      return;
    }

    if (!navigator.geolocation) {
      locationStatus.textContent = "Location is not supported in this browser.";
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
          return;
        }
        userLocation = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
        if (locationLoadInProgress) return;
        locationLoadInProgress = true;
        try {
          locationStatus.textContent = "Loading nearby NC places...";
          const coarseLatitude = Math.round(coords.latitude * 1000) / 1000;
          const coarseLongitude = Math.round(coords.longitude * 1000) / 1000;
          await loadStatewidePlaces(coarseLatitude, coarseLongitude);
        } catch (error) {
          userLocation = null;
          locationLoadInProgress = false;
          stopLocationWatch();
          locationButton.disabled = false;
          locationButtonLabel.textContent = "Near me";
          locationStatus.textContent = error.message;
          return;
        }
        nearbyMode = true;
        locationLoadInProgress = false;
        viewportMode = false;
        search.value = "";
        locationButton.disabled = false;
        locationButton.classList.add("is-active");
        locationButtonLabel.textContent = "Showing nearby";
        locationStatus.textContent = "Tap again to return to the map view.";
        locationLayer.clearLayers();
        userLocationMarker = null;
        const userLocationIcon = L.divIcon({
          className: "user-location-marker-wrap",
          html: `
            <span class="user-location-marker">
              <span class="user-location-pulse"></span>
              <span class="user-location-dot"></span>
            </span>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
        userLocationMarker = L.marker([userLocation.latitude, userLocation.longitude], {
          icon: userLocationIcon,
          title: "Your location",
          keyboard: false,
          zIndexOffset: 1000,
        })
          .bindTooltip("Your location")
          .addTo(locationLayer);
        const nearbyBounds = L.latLng(userLocation.latitude, userLocation.longitude)
          .toBounds(32000);
        showViewportBoundary(nearbyBounds, "Places near you");
        setMapCenter(userLocation.latitude, userLocation.longitude, 13);
        render();
        window.setTimeout(() => {
          updateUserLocationMarkerScale();
          map.panTo([userLocation.latitude, userLocation.longitude], {
            animate: true,
            duration: 0.35,
          });
        }, 80);
      },
      () => {
        locationLoadInProgress = false;
        stopLocationWatch();
        locationButton.disabled = false;
        locationButtonLabel.textContent = "Near me";
        locationStatus.textContent = "Location could not be accessed.";
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  });
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
    filterDialogForm
      .querySelectorAll('input[name="minimum-rating"]')
      .forEach((input) => {
        input.checked = Number(input.value) === activeMinRating;
      });
    const moreOnlyFilterCount =
      activeTypeFilters.size + (activeMinRating ? 1 : 0);
    moreFilterButton.classList.toggle("is-active", moreOnlyFilterCount > 0);
    moreFilterCount.hidden = moreOnlyFilterCount === 0;
    moreFilterCount.textContent = moreOnlyFilterCount || "";
    const activeFilterCount =
      activeVisitFilters.size + activeTypeFilters.size + (activeMinRating ? 1 : 0);
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
  });
  filterLaunchButtons.forEach((button) => {
    button.addEventListener("click", () => {
      syncFilterControls();
      filterDialog.showModal();
    });
  });
  clearFilterChip.addEventListener("click", clearAllFilters);
  document.querySelector("#clear-all-filters").addEventListener("click", () => {
    clearAllFilters();
    filterDialog.close();
  });
  filterDialog
    .querySelector("[data-close-filter-dialog]")
    .addEventListener("click", () => filterDialog.close());
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
    activeMinRating = Number(formData.get("minimum-rating")) || 0;
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
  render({ fitMap: !viewportMode });
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

  function commentMarkup(comment, isReply = false) {
    const replies = comments.filter((candidate) => candidate.parentId === comment.id);
    return `
            <article class="comment${isReply ? " is-reply" : ""}${comment.isAi ? " is-ai-reply" : ""}" data-comment-id="${escapeHtml(comment.id)}">
              <div class="review-heading">
                <div>
                  <strong>${escapeHtml(comment.author)}${comment.isAi ? ' <span class="ai-author-mark" aria-label="AI generated">AI</span>' : ""}</strong>
                  <span class="discussion-type">${escapeHtml(
                    {
                      question: "Question",
                      observation: "Visit update",
                      confirmation: "Confirmation",
                      correction: "Correction",
                      review: "Review",
                      reply: "Reply",
                    }[comment.context] || (comment.rating ? "Review" : "Local context"),
                  )}</span>
                  ${
                    comment.isAi
                      ? `<span class="ai-answer-state">${
                          comment.answerStatus === "answered"
                            ? "From sourced record"
                            : comment.answerStatus === "partial"
                              ? "Partial answer"
                              : "Needs verification"
                        }</span>`
                      : ""
                  }
                </div>
                ${
                  comment.rating
                    ? `<span class="review-rating" aria-label="${Number(comment.rating)} out of 5 stars">${"★".repeat(Number(comment.rating))}${"☆".repeat(5 - Number(comment.rating))}</span>`
                    : ""
                }
              </div>
              <p>${escapeHtml(comment.text)}</p>
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
            </article>
            ${replies.map((reply) => commentMarkup(reply, true)).join("")}
    `;
  }

  commentList.innerHTML = comments.length
    ? rootComments.map((comment) => commentMarkup(comment)).join("")
    : '<div class="empty-state">No posts yet. Ask the first question or share a useful update.</div>';

  commentList.querySelectorAll("[data-helpful-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const comment = contributions.comments.find(
        (item) => item.id === button.dataset.helpfulId,
      );
      if (!comment || comment.helpfulByViewer) return;
      comment.helpful = Number(comment.helpful || 0) + 1;
      comment.helpfulByViewer = true;
      setLocalRecord(`auditmap:${place.id}`, contributions);
      renderReviews(place, contributions);
    });
  });
  commentList.querySelectorAll("[data-reply-id]").forEach((button) => {
    button.addEventListener("click", () => {
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
  const sourcedImages = [place.image, ...(place.images || [])].filter(
    (image, index, images) =>
      image?.url && images.findIndex((candidate) => candidate?.url === image.url) === index,
  );
  const seedPhotos = sourcedImages.map((image) => ({
    data: image.url,
    alt: image.alt || place.name,
    credit: `${image.author} · ${image.license}`,
    source: image.source,
  }));
  return [...seedPhotos, ...contributions.photos];
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

  if (!photos.length) {
    gallery.hidden = true;
    return;
  }

  let activeIndex = Math.min(requestedIndex, photos.length - 1);
  gallery.hidden = false;

  function show(index, direction = 0) {
    const previousIndex = activeIndex;
    activeIndex = (index + photos.length) % photos.length;
    const photo = photos[activeIndex];
    image.src = photo.data;
    image.alt = photo.alt || `${place.name} photo ${activeIndex + 1}`;
    credit.innerHTML = photo.credit
      ? `<a href="${escapeHtml(photo.source)}" target="_blank" rel="noreferrer">${escapeHtml(photo.credit)}</a>`
      : "Community photo";
    dots.querySelectorAll("button").forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === activeIndex);
      dot.setAttribute("aria-current", dotIndex === activeIndex ? "true" : "false");
    });
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

  dots.innerHTML =
    photos.length > 1
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

function isDocumentedFact(value) {
  if (!value) return false;
  if (typeof value !== "string") return true;
  return !/need(s)? (community )?(verification|documentation)|not yet documented|not recorded/i.test(
    value,
  );
}

function getPlaceFacts(place) {
  return [
    ["Hours", place.hours],
    ["Access", place.accessibility],
    ["Cost", place.cost],
    ["Transit", place.transit],
    ["Amenities", (place.amenities || place.tags || []).join(", ")],
    ["Contact", place.contact || "Official contact links are provided on this page"],
  ];
}

function renderFacts(place) {
  const facts = getPlaceFacts(place);
  const documentedCount = facts.filter(([, value]) => isDocumentedFact(value)).length;
  document.querySelector("#verified-count").textContent =
    `${documentedCount} of ${facts.length} sourced`;
  document.querySelector("#fact-grid").innerHTML = facts
    .map(
      ([label, value]) => `
        <div class="fact ${isDocumentedFact(value) ? "is-documented" : "needs-check"}">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value || "Not yet documented")}</strong>
          <small>${isDocumentedFact(value) ? "Sourced information" : "Community check needed"}</small>
        </div>
      `,
    )
    .join("");
}

function renderVerificationPrompts(place, contributions) {
  const fieldIcons = {
    hours: "◷",
    access: "♿",
    cost: "$",
    transit: "↗",
    amenities: "•",
  };
  const prompts = getPlaceFacts(place)
    .filter(([label]) => label !== "Contact")
    .map(([label, value]) => ({
      field: label.toLowerCase(),
      question: isDocumentedFact(value)
        ? `Is this ${label.toLowerCase()} information still accurate?`
        : `Can you help document ${label.toLowerCase()} for this place?`,
      value: isDocumentedFact(value) ? value : "No reliable information yet",
    }))
    .slice(0, 4);
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
        <article class="verification-row${response?.answer || response?.note ? " is-answered" : ""}">
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
        submitSharedContribution(place, {
          authorName: "Local visitor",
          type: "observation",
          body: `${field}: ${note}`,
          submittedAt: new Date().toISOString(),
        });
      }
      renderVerificationPrompts(place, contributions);
    });
  });
}

function renderContact(place) {
  const fullAddress = `${place.address}, ${place.city}, ${place.state}`;
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
  const fullAddress = `${place.address}, ${place.city}, ${place.state}`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${place.name}, ${fullAddress}`,
  )}`;
  const navigateLink = document.querySelector("#navigate-place-link");
  const shareButton = document.querySelector("#share-place-button");
  const favoriteButton = document.querySelector("#favorite-place-button");
  const status = document.querySelector("#place-action-status");
  const favorites = new Set(getLocalRecord("auditmap:favorites", []));
  navigateLink.href = directions;

  function syncFavorite() {
    const active = favorites.has(place.id);
    favoriteButton.classList.toggle("is-active", active);
    favoriteButton.setAttribute("aria-pressed", String(active));
    favoriteButton.querySelector("span:last-child").textContent = active ? "Saved" : "Favorite";
  }

  favoriteButton.addEventListener("click", () => {
    if (favorites.has(place.id)) {
      favorites.delete(place.id);
      status.textContent = "Removed from favorites.";
    } else {
      favorites.add(place.id);
      status.textContent = "Saved to favorites.";
    }
    setLocalRecord("auditmap:favorites", [...favorites]);
    syncFavorite();
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
      } else {
        await navigator.clipboard.writeText(window.location.href);
        status.textContent = "Link copied.";
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
        `${place.name}, ${place.address}, ${place.city}, ${place.state}`,
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

function bindDialogs(place, contributions) {
  document.querySelectorAll("[data-open-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector(`#${button.dataset.openPanel}`).showModal();
    });
  });
  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });
  document.querySelectorAll(".feedback-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      const type = form.dataset.feedbackType;
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
      disclosure.open = true;
      form.elements.type.value = type;
      message.placeholder = placeholders[type];
      disclosure.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => message.focus({ preventScroll: true }), 350);
    });
  });
}

async function initPlacePage() {
  const id = new URLSearchParams(window.location.search).get("id");
  const places = await loadPlaces();
  const place = places.find((item) => item.id === id);
  const content = document.querySelector("#place-content");

  if (!place) {
    content.innerHTML = `
      <section class="not-found">
        <h1>Place not found.</h1>
        <p><a href="./index.html">Return to the map</a></p>
      </section>
    `;
    return;
  }

  window.setAuditMapAskPlace?.(place);

  document.title = `${place.name} | AuditMap`;
  document.querySelector(".back-link").href = `./index.html?city=${encodeURIComponent(citySlug(place))}`;
  document.querySelector("#place-type").textContent = place.type;
  document.querySelector("#place-name").textContent = place.name;
  document.querySelector("#place-neighborhood").textContent = place.neighborhood;
  document.querySelector("#place-address").textContent =
    `${place.address}, ${place.city}, ${place.state}`;
  document.querySelector("#place-hours").textContent = place.hours;
  document.querySelector("#place-status").textContent = place.status;
  const sourceLink = document.querySelector("#place-source");
  sourceLink.href = place.source;
  sourceLink.textContent = place.sourceLabel;

  const contributions = normalizeContributions(getStoredContributions(place.id));
  const [sharedComments, knowledge, featurePayload] = await Promise.all([
    loadSharedContributions(place.id),
    loadPlaceKnowledge(place.id),
    loadPlaceFeatures(place.id),
  ]);
  const existingCommentIds = new Set(
    contributions.comments.map((comment) => comment.id).filter(Boolean),
  );
  sharedComments.forEach((comment) => {
    if (!existingCommentIds.has(comment.id)) contributions.comments.push(comment);
  });
  renderGallery(place, contributions);
  renderPlaceFeatures(place, featurePayload);
  renderPlaceKnowledge(place, knowledge);
  renderLivingBrief(place, contributions);
  renderFacts(place);
  renderVerificationPrompts(place, contributions);
  renderContact(place);
  bindPlaceActions(place);
  renderSources(place);
  renderReviews(place, contributions);
  bindDialogs(place, contributions);
  bindDiscussionStarters();

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
      }
      status.textContent = shared
        ? shared.aiReply
          ? "Added to the community record. AuditMap Assistant replied below."
          : "Added here and sent for shared moderation. Thank you."
        : "Added on this device. Shared publishing will sync when connected.";
      delete form.dataset.featureId;
      delete form.dataset.featureName;
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
  const date = comment.submittedAt
    ? new Date(comment.submittedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
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
  const [places, featurePayload, sharedComments] = await Promise.all([
    loadPlaces(),
    loadPlaceFeatures(placeId),
    loadSharedContributions(placeId),
  ]);
  const place = places.find((item) => item.id === placeId);
  const feature = (featurePayload.features || []).find((item) => item.id === featureId);
  const content = document.querySelector("#feature-content");
  if (!place || !feature) {
    content.innerHTML = `
      <section class="not-found">
        <h1>Area not found.</h1>
        <p><a href="./index.html">Return to the map</a></p>
      </section>
    `;
    return;
  }

  const parentUrl = `./place.html?id=${encodeURIComponent(place.id)}#place-explorer`;
  const parentLink = document.querySelector("#feature-parent-link");
  parentLink.href = parentUrl;
  parentLink.textContent = `← Back to ${place.name}`;
  document.querySelector("#feature-parent-name").textContent = `Within ${place.name}`;
  document.querySelector("#feature-name").textContent = feature.name;
  document.querySelector("#feature-description").textContent =
    feature.description || "Community details are welcome for this part of the place.";
  document.querySelector("#feature-context").textContent =
    feature.description || "Share practical details that can help someone find and use this area.";
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
  const media = document.querySelector("#feature-detail-media");
  if (imageUrl) {
    media.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(feature.name)}" />`;
  } else {
    media.querySelector(".feature-detail-media-placeholder").addEventListener("click", () => {
      document.querySelector('#feature-contribution-form input[type="file"]').click();
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

const page = document.body.dataset.page;

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
        <p><a href="./index.html">Return to the map</a></p>
      </section>
    `;
  });
}

if (page === "feature") {
  initFeaturePage().catch(() => {
    document.querySelector("#feature-content").innerHTML = `
      <section class="not-found">
        <h1>We could not load this area.</h1>
        <p><a href="./index.html">Return to the map</a></p>
      </section>
    `;
  });
}
