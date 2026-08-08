const WEATHER_HEADERS = {
  Accept: "application/geo+json, application/json",
  "User-Agent": "AuditMap/1.0 (https://www.auditmap.org; hello@auditmap.org)",
};

const EVENT_SOURCES = {
  "dix-park": {
    type: "dix",
    url: "https://www.dixpark.org/events",
  },
  "pullen-park": {
    type: "raleigh",
    url: "https://raleighnc.gov/parks-and-recreation/places/pullen-park-amusements",
  },
  "downtown-cary-park": {
    type: "cary",
    url: "https://downtowncarypark.com/wp-json/nmc-feeds/v1/events",
    calendarUrl: "https://downtowncarypark.com/calendar",
  },
  "launch-ny-new-york-city-central-park": {
    type: "central-park",
    url: "https://www.centralparknyc.org/activities.json?category=events",
    calendarUrl: "https://www.centralparknyc.org/events",
  },
};

const CARY_FALLBACK_EVENTS = [
  {
    title: "Live at The Bark Bar: Tanner Michelle",
    description: "Free live music at the weather-dependent open-air Bark Bar.",
    start: "2026-08-19T18:00:00-04:00",
    date: "August 19, 2026",
    time: "6:00 PM - 9:00 PM",
    location: "The Bark Bar",
    url: "https://downtowncarypark.com/calendar",
    image: "",
    featured: false,
  },
  {
    title: "CaryLIVE! featuring Delta Rae",
    description: "Free CaryLIVE! concert on the Great Lawn; bring a blanket or folding chair.",
    start: "2026-08-22T19:00:00-04:00",
    date: "August 22, 2026",
    time: "See official listing for event time",
    location: "Great Lawn & Pavilion",
    url: "https://downtowncarypark.com/carylive",
    image: "",
    featured: true,
  },
  {
    title: "CaryLIVE! October Concert",
    description: "Free CaryLIVE! fall concert on the Great Lawn; the artist announcement is still forthcoming.",
    start: "2026-10-17T19:00:00-04:00",
    date: "October 17, 2026",
    time: "See official listing for event time",
    location: "Great Lawn & Pavilion",
    url: "https://downtowncarypark.com/carylive",
    image: "",
    featured: true,
  },
];

function plainText(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 6500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function parseDixEvents(html) {
  return [...String(html || "").matchAll(/<article\b[^>]*class="[^"]*c-teaser--event[^"]*"[^>]*data-href="([^"]+)"[^>]*>([\s\S]*?)<\/article>/gi)]
    .map((match) => {
      const body = match[2];
      const title = plainText(
        body.match(/class="e-link__text"[^>]*>([\s\S]*?)<\/span>/i)?.[1],
      );
      const description = plainText(
        body.match(/class="c-teaser__text"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i)?.[1],
      );
      const tags = [...body.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((item) => plainText(item[1]).replace(/Event (dates|times|location)$/i, "").trim());
      const image = body.match(/<img\b[^>]*src="([^"]+)"[^>]*>/i)?.[1] || "";
      return {
        title,
        description,
        date: tags[0] || "",
        time: tags[1] || "",
        location: tags[2] || "",
        url: new URL(match[1], "https://www.dixpark.org").href,
        image: image ? new URL(image, "https://www.dixpark.org").href : "",
        featured: /kirby derby/i.test(title),
      };
    })
    .filter((event) => event.title && event.date);
}

function parseRaleighEvents(html) {
  return [...String(html || "").matchAll(/<article\b[^>]*class="[^"]*c-event-teaser[^"]*"[^>]*>([\s\S]*?)<\/article>/gi)]
    .map((match) => {
      const body = match[1];
      const link = body.match(/<a\b[^>]*href="([^"]+)"[^>]*class="[^"]*c-event-teaser__title-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
      const start = body.match(/<time\b[^>]*datetime="([^"]+)"[^>]*>([\s\S]*?)<\/time>/i);
      if (!link || !start) return null;
      const parsed = new Date(start[1]);
      const location = plainText(
        body.match(/class="[^"]*c-event-teaser__subtitle[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)?.[1],
      );
      const image = body.match(/<img\b[^>]*(?:data-src|src)="([^"]+)"[^>]*>/i)?.[1] || "";
      return {
        title: plainText(link[2]),
        description: "",
        start: start[1],
        date: Number.isNaN(parsed.getTime())
          ? ""
          : new Intl.DateTimeFormat("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "America/New_York",
            }).format(parsed),
        time: plainText(start[2]).replace("•", "-"),
        location: location || "Pullen Park Amusements",
        url: new URL(link[1], "https://raleighnc.gov").href,
        image: image ? new URL(image.replaceAll("&amp;", "&"), "https://raleighnc.gov").href : "",
        featured: /movie|holiday express/i.test(plainText(link[2])),
      };
    })
    .filter(Boolean);
}

function parseCaryEvents(payload) {
  const records = Array.isArray(payload) ? payload : payload?.events || [];
  return records.map((record) => {
    const start = record.start || record.start_date || record.date || "";
    const parsed = new Date(start);
    const extended = record.extendedProps || record.extended_props || {};
    return {
      title: plainText(record.title?.rendered || record.title),
      description: plainText(record.description || extended.description || record.excerpt?.rendered),
      start,
      date: Number.isNaN(parsed.getTime())
        ? plainText(record.date_display || extended.date)
        : new Intl.DateTimeFormat("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "America/New_York",
          }).format(parsed),
      time: plainText(record.time || extended.time || "See official listing for event time"),
      location: plainText(record.location || extended.location || "Downtown Cary Park"),
      url: record.url || record.link || "https://downtowncarypark.com/calendar",
      image: record.image || extended.image || "",
      featured: /carylive|movie|festival|signature/i.test(`${record.title || ""} ${extended.category || ""}`),
    };
  }).filter((event) => event.title && event.date);
}

function centralParkEventLocation(record) {
  const text = `${record.title || ""} ${plainText(record.summary || "")}`;
  const matches = [
    [/harlem meer/i, "Harlem Meer & Dana Discovery Center"],
    [/davis center|gottesman/i, "Davis Center at the Harlem Meer"],
    [/conservatory garden/i, "Conservatory Garden"],
    [/north woods/i, "North Woods & Blockhouse No. 1"],
    [/the ramble|ramble/i, "The Ramble"],
    [/bethesda/i, "Bethesda Terrace & Fountain"],
    [/great lawn/i, "Great Lawn & Arthur Ross Pinetum"],
    [/reservoir/i, "Jacqueline Kennedy Onassis Reservoir & Running Track"],
    [/sheep meadow/i, "Sheep Meadow & Tavern on the Green"],
    [/summerstage|rumsey/i, "Rumsey Playfield & SummerStage"],
  ];
  return matches.find(([pattern]) => pattern.test(text))?.[1] || "Central Park";
}

function parseCentralParkEvents(payload) {
  const now = Date.now();
  return (payload?.data || []).map((record) => {
    const instances = (record.eventInstances || [])
      .filter((instance) => Number.isFinite(Date.parse(instance.instanceDate)))
      .sort((left, right) => Date.parse(left.instanceDate) - Date.parse(right.instanceDate));
    const instance = instances.find((candidate) => Date.parse(candidate.instanceDate) >= now)
      || (record.startDate && Date.parse(record.startDate) >= now ? { instanceDate: record.startDate } : null);
    if (!instance) return null;
    const parsed = new Date(instance.instanceDate);
    return {
      title: plainText(record.title),
      description: `${plainText(record.summary)}${instance.isSoldOut ? " This occurrence is marked sold out." : ""}`.trim(),
      start: instance.instanceDate,
      date: new Intl.DateTimeFormat("en-US", {
        month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York",
      }).format(parsed),
      time: new Intl.DateTimeFormat("en-US", {
        hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
      }).format(parsed),
      location: centralParkEventLocation(record),
      url: record.url,
      image: record.thumbnailSrc || "",
      featured: /festival|performance|concert|summerstage|movie/i.test(`${record.title || ""} ${record.type || ""}`),
    };
  }).filter((event) => event?.title);
}

function eventTime(event) {
  if (event.start) {
    const start = Date.parse(event.start);
    if (Number.isFinite(start)) return start;
  }
  const parsed = Date.parse(`${event.date} 12:00:00 GMT-0400`);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

async function loadEvents(placeId, featureName) {
  const source = EVENT_SOURCES[placeId];
  if (!source) return [];
  let pages = [];
  if (source.type === "dix") {
    pages = await Promise.allSettled(
      [0, 1].map(async (page) => {
        const response = await fetchWithTimeout(`${source.url}?page=${page}`, {
          headers: { "User-Agent": WEATHER_HEADERS["User-Agent"] },
        });
        if (!response.ok) throw new Error("Event calendar unavailable");
        return parseDixEvents(await response.text());
      }),
    );
  } else if (source.type === "raleigh") {
    pages = [await Promise.resolve().then(async () => {
      const response = await fetchWithTimeout(source.url, {
        headers: { "User-Agent": WEATHER_HEADERS["User-Agent"] },
      });
      if (!response.ok) throw new Error("Event calendar unavailable");
      return { status: "fulfilled", value: parseRaleighEvents(await response.text()) };
    }).catch((reason) => ({ status: "rejected", reason }))];
  } else if (source.type === "cary") {
    pages = [await Promise.resolve().then(async () => {
      const response = await fetchWithTimeout(source.url, {
        headers: {
          Accept: "application/json",
          "User-Agent": WEATHER_HEADERS["User-Agent"],
        },
      });
      if (!response.ok) throw new Error("Event calendar unavailable");
      const text = await response.text();
      if (!text.trim()) throw new Error("Event calendar returned no data");
      return { status: "fulfilled", value: parseCaryEvents(JSON.parse(text)) };
    }).catch((reason) => ({ status: "rejected", reason }))];
  } else if (source.type === "central-park") {
    pages = [await Promise.resolve().then(async () => {
      const response = await fetchWithTimeout(source.url, {
        headers: { Accept: "application/json", "User-Agent": WEATHER_HEADERS["User-Agent"] },
      });
      if (!response.ok) throw new Error("Event calendar unavailable");
      return { status: "fulfilled", value: parseCentralParkEvents(await response.json()) };
    }).catch((reason) => ({ status: "rejected", reason }))];
  }
  const unique = new Map();
  for (const page of pages) {
    if (page.status !== "fulfilled") continue;
    for (const event of page.value) unique.set(event.url, event);
  }
  if (placeId === "downtown-cary-park" && !unique.size) {
    CARY_FALLBACK_EVENTS.forEach((event) => unique.set(event.url + event.start, event));
  }
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return [...unique.values()]
    .filter((event) => eventTime(event) >= startOfToday.getTime())
    .sort((left, right) => {
      const leftLocal = featureName && left.location.toLowerCase() === featureName.toLowerCase();
      const rightLocal = featureName && right.location.toLowerCase() === featureName.toLowerCase();
      if (leftLocal !== rightLocal) return leftLocal ? -1 : 1;
      if (left.featured !== right.featured) return left.featured ? -1 : 1;
      return eventTime(left) - eventTime(right);
    })
    .slice(0, 8);
}

function weatherPlaceImpact(placeId, kind) {
  if (placeId === "dix-park") {
    if (kind === "rain") return "Grass, troll approaches, and the dog park may be muddy; water-play operations can change.";
    if (kind === "heat") return "Open lawns have limited shade, so bring water and plan cooling breaks.";
  }
  if (placeId === "downtown-cary-park") {
    if (kind === "rain") return "The splash pad, sprayground, Bark Bar, Skywalk, and outdoor events can change or close.";
    if (kind === "heat") return "The Great Lawn is exposed; use Academy Plaza, The Nest pavilion, gardens, or Willow Isle for cooling breaks.";
  }
  if (placeId === "pullen-park") {
    if (kind === "rain") return "Ride operations, the train, playground surfaces, and lawn events can change even while the park remains open.";
    if (kind === "heat") return "Ride queues and open play areas can be hot; use shade structures and indoor campus facilities for breaks.";
  }
  if (placeId === "launch-ny-new-york-city-central-park") {
    if (kind === "rain") return "Woodland trails, rock outcrops, lawns, ballfields, playground water, boating, performances, and seasonal attractions can change or close.";
    if (kind === "heat") return "Large lawns and the Reservoir are exposed; use wooded routes, visitor facilities, and destination-specific water or cooling breaks.";
  }
  if (kind === "rain") return "Outdoor features and programs can change or close.";
  return "Bring water and plan cooling breaks in exposed areas.";
}

function weatherAdvisory(period, alerts, placeId) {
  if (alerts.length) return alerts[0].headline;
  const forecast = `${period.shortForecast || ""} ${period.detailedForecast || ""}`;
  const precipitation = Number(period.probabilityOfPrecipitation?.value || 0);
  const wind = Number(String(period.windSpeed || "").match(/\d+/)?.[0] || 0);
  if (/thunder/i.test(forecast)) return `Thunderstorms are possible. ${weatherPlaceImpact(placeId, "rain")}`;
  if (precipitation >= 50 || /rain|shower/i.test(forecast)) return `Rain is likely. ${weatherPlaceImpact(placeId, "rain")}`;
  if (Number(period.temperature) >= 90) return `Hot conditions are expected. ${weatherPlaceImpact(placeId, "heat")}`;
  if (wind >= 20) return "Breezy or windy conditions are expected. Use care around mature trees and unsecured picnic items.";
  if (Number(period.temperature) <= 40) return "Cold conditions are expected. Dress for prolonged outdoor exposure.";
  return "No weather-specific park concern is indicated right now. Conditions can still change quickly.";
}

async function loadWeather(latitude, longitude, placeId) {
  const pointResponse = await fetchWithTimeout(
    `https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`,
    { headers: WEATHER_HEADERS },
  );
  if (!pointResponse.ok) throw new Error("Weather point unavailable");
  const point = await pointResponse.json();
  const [hourlyResult, dailyResult, alertResult] = await Promise.allSettled([
    fetchWithTimeout(point.properties.forecastHourly, { headers: WEATHER_HEADERS }).then((response) => response.json()),
    fetchWithTimeout(point.properties.forecast, { headers: WEATHER_HEADERS }).then((response) => response.json()),
    fetchWithTimeout(
      `https://api.weather.gov/alerts/active?point=${latitude.toFixed(4)},${longitude.toFixed(4)}`,
      { headers: WEATHER_HEADERS },
    ).then((response) => response.json()),
  ]);
  const hourlyPeriods = hourlyResult.status === "fulfilled"
    ? hourlyResult.value.properties?.periods || []
    : [];
  const hourly = hourlyPeriods[0] || null;
  const daily = dailyResult.status === "fulfilled" ? dailyResult.value.properties?.periods?.[0] : null;
  const period = hourly || daily;
  if (!period) throw new Error("Forecast unavailable");
  const alerts = alertResult.status === "fulfilled"
    ? (alertResult.value.features || []).slice(0, 3).map((alert) => ({
        headline: alert.properties?.headline || alert.properties?.event || "Weather alert",
        severity: alert.properties?.severity || "Unknown",
        event: alert.properties?.event || "Weather alert",
        description: alert.properties?.description || "",
        instruction: alert.properties?.instruction || "",
      }))
    : [];
  const forecastOfficeCode = String(point.properties.forecastOffice || "")
    .split("/")
    .filter(Boolean)
    .pop();
  return {
    temperature: period.temperature,
    temperatureUnit: period.temperatureUnit,
    shortForecast: period.shortForecast,
    isDaytime: period.isDaytime,
    detailedForecast: daily?.detailedForecast || period.detailedForecast || "",
    windSpeed: period.windSpeed,
    windDirection: period.windDirection,
    precipitationChance: period.probabilityOfPrecipitation?.value ?? null,
    icon: period.icon || "",
    startTime: period.startTime,
    endTime: period.endTime,
    timeZone: point.properties.timeZone || "America/New_York",
    alerts,
    advisory: weatherAdvisory(period, alerts, placeId),
    source: forecastOfficeCode
      ? `https://www.weather.gov/${forecastOfficeCode.toLowerCase()}/`
      : "https://www.weather.gov/",
    sourceLabel: forecastOfficeCode
      ? `National Weather Service ${forecastOfficeCode.toUpperCase()}`
      : "National Weather Service",
    hourly: hourlyPeriods.slice(0, 96).map((item) => ({
      startTime: item.startTime,
      temperature: item.temperature,
      temperatureUnit: item.temperatureUnit,
      shortForecast: item.shortForecast,
      precipitationChance: item.probabilityOfPrecipitation?.value ?? null,
      windSpeed: item.windSpeed,
      icon: item.icon || "",
      isDaytime: item.isDaytime,
    })),
  };
}

module.exports = async function handler(request, response) {
  const latitude = Number(request.query.lat);
  const longitude = Number(request.query.lon);
  const rawPlaceId = String(request.query.placeId || "").slice(0, 100);
  const placeId = rawPlaceId.split("--")[0];
  const featureName = String(request.query.feature || "").slice(0, 120);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    response.status(400).json({ error: "A valid place location is required." });
    return;
  }

  const [weather, events] = await Promise.allSettled([
    loadWeather(latitude, longitude, placeId),
    loadEvents(placeId, featureName),
  ]);
  if (weather.status !== "fulfilled" && events.status !== "fulfilled") {
    response.status(502).json({ error: "Live place information is temporarily unavailable." });
    return;
  }
  response.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1800");
  response.status(200).json({
    checkedAt: new Date().toISOString(),
    weather: weather.status === "fulfilled" ? weather.value : null,
    events: events.status === "fulfilled" ? events.value : [],
    eventsSource: EVENT_SOURCES[placeId]?.calendarUrl || EVENT_SOURCES[placeId]?.url || null,
  });
};
