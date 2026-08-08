const intentTaxonomy = [
  {
    key: "parking",
    label: "Parking",
    timeSensitive: true,
    synonyms: [
      "parking",
      "parking lot",
      "parking deck",
      "where to park",
      "should i park",
      "ada parking",
      "accessible parking",
      "drop off",
      "drop-off",
    ],
  },
  {
    key: "entrance",
    label: "Entrance",
    timeSensitive: true,
    synonyms: [
      "entrance",
      "entry",
      "gate",
      "main gate",
      "main entrance",
      "which entrance",
      "loading zone",
      "unload",
      "unloading",
      "school bus",
    ],
  },
  {
    key: "restroom",
    label: "Restroom",
    timeSensitive: true,
    synonyms: [
      "restroom",
      "restrooms",
      "bathroom",
      "bathrooms",
      "toilet",
      "toilets",
    ],
  },
  {
    key: "playground",
    label: "Playground",
    timeSensitive: false,
    synonyms: [
      "playground",
      "play area",
      "play areas",
      "slides",
      "swing",
      "swings",
      "kids area",
      "children",
    ],
  },
  {
    key: "splash-pad",
    label: "Splash pad",
    timeSensitive: true,
    synonyms: [
      "splash pad",
      "splashpad",
      "sprayground",
      "water play",
      "water feature",
      "sprinklers",
    ],
  },
  {
    key: "dog-area",
    label: "Dog area",
    timeSensitive: true,
    synonyms: [
      "dog park",
      "dogs",
      "dog area",
      "off leash",
      "off-leash",
      "pet friendly",
      "pets",
    ],
  },
  {
    key: "trail-surface",
    label: "Trail surface",
    timeSensitive: false,
    synonyms: [
      "trail",
      "trails",
      "walking path",
      "surface",
      "paved",
      "gravel",
      "boardwalk",
      "stroller",
    ],
  },
  {
    key: "transit",
    label: "Transit",
    timeSensitive: true,
    synonyms: [
      "transit",
      "bus",
      "train",
      "shuttle",
      "public transit",
      "route",
      "stop",
    ],
  },
  {
    key: "closures",
    label: "Closures and construction",
    timeSensitive: true,
    synonyms: [
      "closed",
      "closure",
      "closures",
      "construction",
      "renovation",
      "renovations",
      "unavailable",
      "out of service",
      "running normally",
      "train running",
      "train status",
      "train canceled",
      "train cancelled",
      "train delayed",
      "service status",
      "delay",
      "delayed",
      "canceled",
      "cancelled",
      "open today",
      "is it open",
      "open now",
      "museum open",
    ],
  },
  {
    key: "fees",
    label: "Fees",
    timeSensitive: true,
    synonyms: [
      "fee",
      "fees",
      "cost",
      "costs",
      "ticket",
      "tickets",
      "price",
      "priced",
      "free",
      "paid",
    ],
  },
  {
    key: "services",
    label: "Services",
    timeSensitive: true,
    synonyms: [
      "service",
      "services",
      "help available",
      "what help",
      "resources",
      "assistance",
      "programs available",
    ],
  },
  {
    key: "workforce",
    label: "Workforce programs",
    timeSensitive: true,
    synonyms: [
      "workforce",
      "workforce program",
      "workforce programs",
      "job program",
      "job programs",
      "employment program",
      "employment programs",
      "summer youth employment",
      "partnership raleigh",
      "digital impact",
    ],
  },
  {
    key: "appointment",
    label: "Appointments and walk-in access",
    timeSensitive: true,
    synonyms: [
      "appointment",
      "appointments",
      "walk in",
      "walk-in",
      "just walk in",
      "contact before visiting",
      "call before",
      "who should i contact",
    ],
  },
  {
    key: "accessibility",
    label: "Accessibility",
    timeSensitive: false,
    synonyms: [
      "accessible",
      "accessibility",
      "wheelchair",
      "ada",
      "step free",
      "step-free",
      "mobility",
      "stroller friendly",
    ],
  },
  {
    key: "public-art",
    label: "Public art and landmarks",
    timeSensitive: false,
    synonyms: [
      "troll",
      "trolls",
      "art",
      "artwork",
      "sculpture",
      "sculptures",
      "landmark",
      "garden",
      "gardens",
      "field",
      "fields",
      "court",
      "courts",
    ],
  },
  {
    key: "shade",
    label: "Shade",
    timeSensitive: false,
    synonyms: [
      "shade",
      "shaded",
      "shaded play area",
      "shaded play areas",
      "shaded playground",
      "sun",
      "sunny",
      "tree cover",
    ],
  },
  {
    key: "picnic",
    label: "Picnic",
    timeSensitive: false,
    synonyms: [
      "picnic",
      "shelter",
      "shelters",
      "grill",
      "grills",
      "tables",
    ],
  },
];

function cleanText(value, limit = 500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function normalizeText(value) {
  return cleanText(value, 800)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phraseCount(text, phrase) {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return 0;
  if (normalizedPhrase.includes(" ")) {
    return text.includes(normalizedPhrase) ? normalizedPhrase.split(" ").length + 1 : 0;
  }
  return text.split(/\s+/).filter((word) => word === normalizedPhrase).length;
}

function topicWords(question) {
  const ignored = new Set([
    "a",
    "about",
    "and",
    "are",
    "at",
    "can",
    "do",
    "does",
    "for",
    "how",
    "i",
    "in",
    "is",
    "it",
    "know",
    "me",
    "my",
    "of",
    "on",
    "should",
    "the",
    "there",
    "this",
    "to",
    "what",
    "when",
    "where",
    "which",
    "who",
    "with",
    "you",
  ]);

  const words = new Set(
    normalizeText(question)
      .split(/[^a-z0-9-]+/)
      .filter(Boolean)
      .map((word) => word.replace(/s$/, ""))
      .filter((word) => word.length > 2 && !ignored.has(word)),
  );

  const intent = detectIntent(question);
  if (intent?.key) {
    words.add(intent.key);
  }
  return words;
}

function detectIntent(question) {
  const text = normalizeText(question);
  if (!text) return null;

  let best = null;
  for (const intent of intentTaxonomy) {
    const matchedTerms = intent.synonyms.filter((phrase) => phraseCount(text, phrase) > 0);
    if (!matchedTerms.length) continue;
    const disruptionTerms = new Set([
      "closed",
      "closure",
      "closures",
      "unavailable",
      "out of service",
      "delay",
      "delayed",
      "canceled",
      "cancelled",
    ]);
    const explicitDisruption =
      intent.key === "closures" &&
      matchedTerms.some((term) => disruptionTerms.has(term));
    const score =
      matchedTerms.reduce((total, phrase) => total + phraseCount(text, phrase), 0) +
      (explicitDisruption ? 4 : 0);
    if (!best || score > best.score) {
      best = {
        key: intent.key,
        label: intent.label,
        timeSensitive: intent.timeSensitive,
        matchedTerms,
        score,
      };
    }
  }

  return best;
}

module.exports = {
  cleanText,
  detectIntent,
  intentTaxonomy,
  normalizeText,
  topicWords,
};
