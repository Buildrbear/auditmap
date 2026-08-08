(() => {
  const campaign = document.body.dataset.campaign || "discovery";
  const params = new URLSearchParams(window.location.search);
  const inherited = {
    utm_source: params.get("utm_source") || "auditmap",
    utm_medium: params.get("utm_medium") || "owned_discovery",
    utm_campaign: params.get("utm_campaign") || campaign,
  };

  window.va = window.va || function queueAnalyticsEvent() {
    (window.vaq = window.vaq || []).push(arguments);
  };

  document.querySelectorAll("img[data-original-src]").forEach((image) => {
    image.addEventListener("error", () => {
      if (image.src !== image.dataset.originalSrc) image.src = image.dataset.originalSrc;
    }, { once: true });
  });

  document.querySelectorAll("[data-discovery-link]").forEach((link) => {
    const url = new URL(link.href, window.location.origin);
    Object.entries(inherited).forEach(([key, value]) => {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    });
    link.href = url.toString();
    link.addEventListener("click", () => {
      window.va("event", "Discovery click", {
        campaign,
        content: link.dataset.content || "unknown",
        action: link.dataset.action || "explore",
      });
    });
  });
})();
