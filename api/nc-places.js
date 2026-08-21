const NC_BOUNDS = {
  south: 33.75,
  west: -84.33,
  north: 36.59,
  east: -75.4,
};

const categorySearches = [
  { query: "park", category: "leisure", types: ["park"], label: "Park" },
  {
    query: "dog park",
    category: "leisure",
    types: ["dog_park"],
    label: "Dog park",
  },
  { query: "library", category: "amenity", types: ["library"], label: "Library" },
  {
    query: "community center",
    category: "amenity",
    types: ["community_centre"],
    label: "Community center",
  },
  { query: "museum", category: "tourism", types: ["museum"], label: "Museum" },
  {
    query: "train station",
    category: "railway",
    types: ["station", "halt"],
    label: "Transit",
  },
];

function insideNorthCarolina(latitude, longitude) {
  return (
    latitude >= NC_BOUNDS.south &&
    latitude <= NC_BOUNDS.north &&
    longitude >= NC_BOUNDS.west &&
    longitude <= NC_BOUNDS.east
  );
}

function placeAddress(result) {
  const street = [
    result.address?.house_number,
    result.address?.road || result.address?.pedestrian,
  ]
    .filter(Boolean)
    .join(" ");
  return street || result.display_name?.split(",").slice(1, 3).join(",").trim() ||
    "Address not yet documented";
}

function cityName(result, fallbackCity) {
  return (
    result.address?.city ||
    result.address?.town ||
    result.address?.village ||
    result.address?.municipality ||
    fallbackCity
  );
}

function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function normalizedName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function shouldExclude(result) {
  const name = normalizedName(result.name);
  return (
    /\bsign$/.test(name) ||
    /\bresident dog park\b/.test(name) ||
    /\bparish center\b/.test(name) ||
    [
      "east building",
      "west building",
      "erdahl cloyd wing",
      "city of raleigh museum",
      "north carolina museum of natural sciences nature research center",
    ].includes(name)
  );
}

function commonsImage(filename, placeName) {
  const cleanFilename = String(filename || "").replace(/^File:/i, "").trim();
  if (!cleanFilename) return null;
  const encodedFilename = encodeURIComponent(cleanFilename.replaceAll(" ", "_"));
  return {
    url: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodedFilename}?width=1400`,
    source: `https://commons.wikimedia.org/wiki/File:${encodedFilename}`,
    author: "Wikimedia Commons contributor",
    license: "See source for license",
    alt: placeName,
  };
}

function plainMetadata(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[^;]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchCommonsImage(placeName, city) {
  try {
    const distinctiveWords = normalizedName(placeName)
      .split(" ")
      .filter((word) => word.length > 3 && !["park", "dog", "field", "fields", "trail"].includes(word));
    if (!distinctiveWords.length) return null;
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: `intitle:"${placeName}" "${city}" "North Carolina"`,
      gsrnamespace: "6",
      gsrlimit: "4",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "1400",
      format: "json",
      origin: "*",
    });
    const commonsResponse = await fetch(
      `https://commons.wikimedia.org/w/api.php?${params}`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "AuditMap/1.0 (https://www.auditmap.org)",
        },
      },
    );
    if (!commonsResponse.ok) return null;
    const payload = await commonsResponse.json();
    const placeWords = normalizedName(placeName).split(" ").filter((word) => word.length > 3);
    const normalizedCity = normalizedName(city);
    const pages = Object.values(payload.query?.pages || {}).sort((left, right) => {
      const score = (page) => {
        const title = normalizedName(`${page.title} ${page.imageinfo?.[0]?.extmetadata?.ImageDescription?.value || ""} ${page.imageinfo?.[0]?.extmetadata?.Categories?.value || ""}`);
        return placeWords.reduce(
          (total, word) => total + (title.includes(word) ? 1 : 0),
          title.includes(normalizedCity) ? 2 : title.includes("north carolina") ? 1 : 0,
        );
      };
      return score(right) - score(left);
    });
    const page = pages.find((candidate) => {
      const title = normalizedName(`${candidate.title} ${candidate.imageinfo?.[0]?.extmetadata?.ImageDescription?.value || ""} ${candidate.imageinfo?.[0]?.extmetadata?.Categories?.value || ""}`);
      return (
        !/\b(logo|seal|icon|map|diagram)\b/.test(title) &&
        distinctiveWords.every((word) => title.includes(word)) &&
        (title.includes(normalizedCity) || title.includes("north carolina"))
      );
    });
    const info = page?.imageinfo?.[0];
    if (!page || !info?.thumburl) return null;
    return {
      url: info.thumburl,
      source: info.descriptionurl,
      author:
        plainMetadata(info.extmetadata?.Artist?.value) ||
        "Wikimedia Commons contributor",
      license:
        plainMetadata(info.extmetadata?.LicenseShortName?.value) ||
        "See source for license",
      alt: placeName,
    };
  } catch {
    return null;
  }
}

async function reusableImage(tags, placeName, city) {
  const commonsTag = String(tags.wikimedia_commons || "");
  if (/^File:/i.test(commonsTag)) return commonsImage(commonsTag, placeName);
  const wikidataId = String(tags.wikidata || "");
  if (/^Q\d+$/.test(wikidataId)) {
    try {
      const wikidataResponse = await fetch(
        `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "AuditMap/1.0 (https://www.auditmap.org)",
          },
        },
      );
      if (wikidataResponse.ok) {
        const payload = await wikidataResponse.json();
        const filename =
          payload.entities?.[wikidataId]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        const image = commonsImage(filename, placeName);
        if (image) return image;
      }
    } catch {
      // Exact-name Commons search below is the reusable-media fallback.
    }
  }
  return searchCommonsImage(placeName, city);
}

function publicAmenities(tags) {
  const amenityMap = [
    ["playground", tags.playground === "yes"],
    ["Restrooms", ["yes", "customers"].includes(tags.toilets)],
    ["Drinking water", tags.drinking_water === "yes"],
    ["Wi-Fi", ["yes", "wlan"].includes(tags.internet_access)],
    ["Picnic area", tags.picnic_table === "yes" || tags.picnic_site === "yes"],
    ["Dog friendly", ["yes", "leashed", "designated"].includes(tags.dog)],
    ["Bike parking", Boolean(tags.bicycle_parking)],
  ];
  return amenityMap.filter(([, available]) => available).map(([label]) => label);
}

module.exports = async function handler(request, response) {
  const latitude = Number(request.query.lat);
  const longitude = Number(request.query.lon);
  const radius = Math.min(Math.max(Number(request.query.radius) || 12000, 1000), 30000);
  const fallbackCity = String(request.query.city || "North Carolina").trim().slice(0, 80);
  const searches = request.query.scope === "parks" ? categorySearches.slice(0, 2) : categorySearches;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !insideNorthCarolina(latitude, longitude)
  ) {
    response.status(400).json({ error: "Choose a location within North Carolina." });
    return;
  }

  const latitudeDelta = radius / 111000;
  const longitudeDelta =
    radius / (111000 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.2));
  const viewbox = [
    longitude - longitudeDelta,
    latitude + latitudeDelta,
    longitude + longitudeDelta,
    latitude - latitudeDelta,
  ].join(",");

  try {
    const results = [];
    for (const [index, categorySearch] of searches.entries()) {
      if (index) await pause(1050);
      const params = new URLSearchParams({
        q: categorySearch.query,
        format: "jsonv2",
        limit: "10",
        countrycodes: "us",
        bounded: "1",
        viewbox,
        addressdetails: "1",
        extratags: "1",
      });
      const searchResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "AuditMap/1.0 (https://www.auditmap.org)",
          },
        },
      );
      if (!searchResponse.ok) throw new Error("Place search request failed.");
      const categoryResults = await searchResponse.json();
      categoryResults
        .filter(
          (result) =>
            result.category === categorySearch.category &&
            categorySearch.types.includes(result.type) &&
            result.name &&
            !shouldExclude(result),
        )
        .forEach((result) => results.push({ ...result, auditMapType: categorySearch.label }));
    }

    const seen = new Set();
    const basePlaces = results
      .map((result) => {
        const id = `osm-${result.osm_type}-${result.osm_id}`;
        const city = cityName(result, fallbackCity);
        const identity = `${normalizedName(result.name)}:${normalizedName(city)}`;
        if (seen.has(id) || seen.has(identity)) return null;
        seen.add(id);
        seen.add(identity);
        const publicMapUrl = `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}`;
        const tags = result.extratags || {};
        const websiteCandidate =
          tags.website || tags["contact:website"] || tags.url || "";
        const officialWebsite = /^https?:\/\//i.test(websiteCandidate)
          ? websiteCandidate
          : null;
        const wheelchairDetails = {
          yes: "Wheelchair access is listed",
          limited: "Limited wheelchair access is listed",
          no: "Not listed as wheelchair accessible",
        }[tags.wheelchair];
        const costDetails =
          tags.fee === "no"
            ? "Free according to public place information"
            : tags.fee === "yes"
              ? "A fee may apply"
              : "Cost not yet documented";
        const phone = tags.phone || tags["contact:phone"] || "";
        const email = tags.email || tags["contact:email"] || "";
        const operator = tags.operator || tags.brand || "";
        const description =
          tags["description:en"] || tags.description || tags.inscription || "";
        const amenities = publicAmenities(tags);
        return {
          id,
          name: result.name,
          type: result.auditMapType,
          city,
          state: "NC",
          country: "US",
          citySlug: `${city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-nc`,
          address: placeAddress(result),
          latitude: Number(result.lat),
          longitude: Number(result.lon),
          neighborhood:
            result.address?.suburb ||
            result.address?.neighbourhood ||
            result.address?.quarter ||
            city,
          status: "Community record",
          hours: tags.opening_hours || "Hours not yet documented",
          cost: costDetails,
          accessibility: wheelchairDetails || "Accessibility not yet documented",
          transit: "Transit access not yet documented",
          amenities,
          contact:
            [phone, email].filter(Boolean).join(" · ") ||
            (officialWebsite ? "Official website available" : "Contact not yet documented"),
          phone: phone || null,
          email: email || null,
          sourceLabel: officialWebsite ? "Official website" : "Public map source",
          sourceHistoryLabel: "OpenStreetMap contributors",
          source: officialWebsite || publicMapUrl,
          sources: [
            {
              label: "OpenStreetMap contributors",
              url: publicMapUrl,
              note: "Public location and place details",
            },
          ],
          verifiedAt: new Date().toISOString().slice(0, 10),
          summary:
            description ||
            `${result.name} is a mapped public ${result.auditMapType.toLowerCase()}${operator ? ` operated by ${operator}` : ` in ${city}`}. Available public records currently document its location${amenities.length ? ` and amenities including ${amenities.join(", ")}` : ""}; local updates can add current visit details.`,
          tags: [result.category, result.type, result.address?.county].filter(Boolean),
          comments: [],
          discoveryStatus: "community-needed",
          _sourceTags: tags,
        };
      })
      .filter(Boolean);
    const places = await Promise.all(
      basePlaces.map(async (place) => {
        const image = await reusableImage(place._sourceTags, place.name, place.city);
        const { _sourceTags, ...publicPlace } = place;
        return image
          ? {
              ...publicPlace,
              image,
              sources: [
                ...publicPlace.sources,
                {
                  label: "Wikimedia Commons",
                  url: image.source,
                  note: "Reusable public image; license and attribution at source",
                },
              ],
            }
          : publicPlace;
      }),
    );

    if (!places.length) {
      response.status(404).json({
        error: "No mapped public places were found nearby yet. Try a nearby city or add a place.",
      });
      return;
    }

    response.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    response.status(200).json({ places, source: "Public map data" });
  } catch {
    response.status(502).json({ error: "Statewide place discovery is temporarily unavailable." });
  }
};
