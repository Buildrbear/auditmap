(() => {
  const places = JSON.parse(document.querySelector("#passport-data")?.textContent || "[]");
  const allowed = new Set(places.map((place) => place.id));
  const storageKey = "auditmap:passport:raleigh:v1";
  const params = new URLSearchParams(window.location.search);
  const campaignContents = new Set(["progress_challenge", "exploring_person", "leave_a_breadcrumb"]);
  const requestedContent = String(params.get("utm_content") || "").replace(/_share$/, "");
  const attributionContent = campaignContents.has(requestedContent) ? requestedContent : null;
  const shared = String(params.get("found") || "").split(",").filter((id) => allowed.has(id)).slice(0, places.length);
  const sharedMode = shared.length > 0;
  const loadOwn = () => {
    try { return JSON.parse(localStorage.getItem(storageKey))?.filter((id) => allowed.has(id)) || []; } catch { return []; }
  };
  let explored = new Set(sharedMode ? shared : loadOwn());
  if (attributionContent) {
    document.querySelectorAll("[data-passport-place]").forEach((card) => {
      const place = card.dataset.passportPlace;
      card.querySelectorAll('a[href^="/us/"]').forEach((link) => {
        const destination = new URL(link.href);
        destination.searchParams.set("utm_content", attributionContent);
        destination.searchParams.set("utm_term", place);
        link.href = destination.toString();
      });
    });
  }
  const track = (name, stage, properties = {}) => {
    window.va = window.va || function queue() { (window.vaq = window.vaq || []).push(arguments); };
    window.va("event", name, { campaign: "raleigh_explorer_passport", content: attributionContent || "passport_direct", loop: "explorer-passport", stage, ...properties });
  };
  const trackOncePerSession = (name, stage, properties = {}) => {
    const key = `auditmap:passport-event:${name}:${attributionContent || "passport_direct"}:${sharedMode ? "shared" : "own"}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    track(name, stage, properties);
  };
  const save = () => {
    if (sharedMode) return;
    try { localStorage.setItem(storageKey, JSON.stringify([...explored])); } catch {}
  };
  const render = () => {
    document.querySelectorAll("[data-passport-place]").forEach((card) => {
      const marked = explored.has(card.dataset.passportPlace);
      card.classList.toggle("is-explored", marked);
      card.querySelector("[data-passport-status]").textContent = marked ? "Explored" : "Ready to explore";
      const button = card.querySelector("[data-mark-explored]");
      button.textContent = marked ? "Marked explored" : "I've explored this";
      button.setAttribute("aria-pressed", String(marked));
      card.querySelector("[data-passport-contribute]").hidden = !marked;
    });
    document.querySelector("[data-passport-count]").textContent = `${explored.size} of ${places.length}`;
    document.querySelector("[data-passport-bar]").style.width = `${explored.size / places.length * 100}%`;
  };
  document.querySelectorAll("[data-mark-explored]").forEach((button) => button.addEventListener("click", () => {
    if (sharedMode) return;
    const id = button.closest("[data-passport-place]").dataset.passportPlace;
    explored.has(id) ? explored.delete(id) : explored.add(id);
    save(); render(); track("Explorer place marked", "activation", { place: id, marked: explored.has(id) });
  }));
  document.querySelectorAll("[data-passport-contribute]").forEach((link) => link.addEventListener("click", () => {
    const place = link.closest("[data-passport-place]").dataset.passportPlace;
    track("Explorer contribution opened", "contribution-intent", { place });
  }));
  document.querySelector("[data-share-passport]").addEventListener("click", async () => {
    if (!explored.size) { document.querySelector("[data-passport-message]").textContent = "Mark at least one place before sharing your progress."; return; }
    const url = new URL("/discover/raleigh/passport/", window.location.origin);
    url.searchParams.set("found", [...explored].join(","));
    url.searchParams.set("utm_source", "auditmap_share");
    url.searchParams.set("utm_medium", "passport");
    url.searchParams.set("utm_campaign", "raleigh_explorer_passport");
    url.searchParams.set("utm_content", attributionContent ? `${attributionContent}_share` : "passport_direct_share");
    try {
      if (navigator.share) await navigator.share({ title: "My Raleigh explorer passport", text: `I've explored ${explored.size} Raleigh public ${explored.size === 1 ? "place" : "places"}.`, url: url.toString() });
      else await navigator.clipboard.writeText(url.toString());
      document.querySelector("[data-passport-message]").textContent = navigator.share ? "Progress shared." : "Progress link copied.";
      track("Explorer progress shared", "distribution", { places: explored.size });
    } catch (error) { if (error?.name !== "AbortError") document.querySelector("[data-passport-message]").textContent = "Sharing was unavailable. Try again."; }
  });
  if (sharedMode) {
    document.querySelector("[data-shared-passport]").hidden = false;
    document.querySelector("[data-reset-passport]").hidden = false;
    document.querySelectorAll("[data-mark-explored]").forEach((button) => { button.disabled = true; });
    document.querySelector("[data-reset-passport]").addEventListener("click", () => { window.location.href = "/discover/raleigh/passport/"; });
    trackOncePerSession("Shared passport opened", "referral", { places: explored.size });
  } else {
    trackOncePerSession("Explorer passport opened", "landing");
  }
  render();
})();
