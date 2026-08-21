const DAY_MS = 24 * 60 * 60 * 1000;

const INTENTS = {
  parking: {
    label: "Parking and arrival",
    question: (name) => `Where should I park for ${name}, and what should I know when arriving?`,
    weight: 100,
    freshnessDays: 7,
  },
  entrance: {
    label: "Entrances",
    question: (name) => `Which entrance should I use for ${name}?`,
    weight: 94,
    freshnessDays: 30,
  },
  restroom: {
    label: "Restrooms",
    question: (name) => `Where are the nearest restrooms at ${name}, and when are they available?`,
    weight: 98,
    freshnessDays: 7,
  },
  accessibility: {
    label: "Accessibility",
    question: (name) => `What accessibility details should visitors know at ${name}?`,
    weight: 97,
    freshnessDays: 30,
  },
  closures: {
    label: "Closures and availability",
    question: (name) => `Is anything at ${name} closed, seasonal, or temporarily unavailable?`,
    weight: 96,
    freshnessDays: 3,
  },
  fees: {
    label: "Fees",
    question: (name) => `What costs, reservations, or separate activity fees apply at ${name}?`,
    weight: 90,
    freshnessDays: 30,
  },
  transit: {
    label: "Transit",
    question: (name) => `How can visitors reach ${name} without a car?`,
    weight: 82,
    freshnessDays: 30,
  },
  "trail-surface": {
    label: "Walking surfaces and terrain",
    question: (name) => `What are the walking surfaces, slopes, and trail conditions at ${name}?`,
    weight: 80,
    freshnessDays: 90,
  },
  playground: {
    label: "Playgrounds",
    question: (name) => `What playgrounds are at ${name}, and what ages or abilities do they serve?`,
    weight: 79,
    freshnessDays: 90,
  },
  "splash-pad": {
    label: "Water play",
    question: (name) => `Is there a splash pad or water play at ${name}, and when does it operate?`,
    weight: 78,
    freshnessDays: 14,
  },
  "dog-area": {
    label: "Dog areas and rules",
    question: (name) => `Where can dogs go at ${name}, and what rules apply?`,
    weight: 72,
    freshnessDays: 90,
  },
  picnic: {
    label: "Picnic areas",
    question: (name) => `Where are picnic areas at ${name}, and do any require reservations?`,
    weight: 68,
    freshnessDays: 90,
  },
  shade: {
    label: "Shade and weather comfort",
    question: (name) => `Where can visitors find shade or weather shelter at ${name}?`,
    weight: 64,
    freshnessDays: 180,
  },
  "public-art": {
    label: "Landmarks and public art",
    question: (name) => `Where are the landmarks or public art at ${name}, and how do visitors find them?`,
    weight: 60,
    freshnessDays: 180,
  },
};

const PLACE_PROFILES = {
  park: [
    "parking", "entrance", "restroom", "accessibility", "closures", "fees",
    "transit", "trail-surface", "playground", "splash-pad", "dog-area",
    "picnic", "shade", "public-art",
  ],
  "community center": [
    "parking", "entrance", "restroom", "accessibility", "closures", "fees",
    "transit", "playground",
  ],
  library: ["parking", "entrance", "restroom", "accessibility", "closures", "fees", "transit"],
  transit: ["parking", "entrance", "restroom", "accessibility", "closures", "fees", "transit"],
  museum: ["parking", "entrance", "restroom", "accessibility", "closures", "fees", "transit"],
  "city office": ["parking", "entrance", "restroom", "accessibility", "closures", "fees", "transit"],
  "civic resource": ["parking", "entrance", "restroom", "accessibility", "closures", "fees", "transit"],
};

const KEY_ALIASES = {
  cost: "fees",
  "dog-park": "dog-area",
};

function canonicalKey(value) {
  const key = String(value || "").trim().toLowerCase();
  return KEY_ALIASES[key] || key;
}

function expectedIntents(type) {
  return PLACE_PROFILES[String(type || "").toLowerCase()] || [
    "parking", "entrance", "restroom", "accessibility", "closures", "fees", "transit",
  ];
}

function validDate(value) {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : null;
}

function sourceTargets(place) {
  const targets = [];
  if (place.officialSource?.url) {
    targets.push({
      label: place.officialSource.label || "Official listing",
      url: place.officialSource.url,
      sourceType: "official",
    });
  }
  for (const fact of place.facts || []) {
    if (!fact.sourceUrl || targets.some((target) => target.url === fact.sourceUrl)) continue;
    targets.push({
      label: fact.sourceLabel || "Official source",
      url: fact.sourceUrl,
      sourceType: fact.sourceType || "official",
    });
  }
  return targets.slice(0, 8);
}

function scorePlaceCoverage(place, options = {}) {
  const now = options.now ? new Date(options.now).getTime() : Date.now();
  const expected = expectedIntents(place.type);
  const facts = (place.facts || []).filter((fact) => fact.scope !== "feature");
  const unresolved = Array.isArray(place.unresolved) ? place.unresolved : [];
  const tasks = [];
  let coveredWeight = 0;
  let totalWeight = 0;

  for (const intentKey of expected) {
    const intent = INTENTS[intentKey];
    totalWeight += intent.weight;
    const matching = facts.filter((fact) => canonicalKey(fact.key) === intentKey);
    const current = matching.find((fact) => {
      const expiresAt = validDate(fact.expiresAt);
      return fact.value &&
        (!expiresAt || expiresAt >= now) &&
        (!fact.verificationStatus || fact.verificationStatus === "verified");
    });
    if (current) {
      coveredWeight += intent.weight;
      continue;
    }

    const partial = matching.find((fact) => {
      const expiresAt = validDate(fact.expiresAt);
      return fact.value &&
        (!expiresAt || expiresAt >= now) &&
        ["partial", "needs-verification"].includes(fact.verificationStatus);
    });
    if (partial) coveredWeight += intent.weight * 0.5;

    const expired = matching
      .filter((fact) => fact.value && validDate(fact.expiresAt) && validDate(fact.expiresAt) < now)
      .sort((left, right) => validDate(right.expiresAt) - validDate(left.expiresAt))[0];
    const queued = unresolved.find((item) => canonicalKey(item.intentKey || item.key) === intentKey);
    const priority = Math.min(
      100,
      intent.weight + (expired ? 4 : 0) + (queued ? 3 : 0),
    );
    tasks.push({
      id: `${place.id}:${intentKey}`,
      placeId: place.id,
      placeName: place.name,
      placeType: place.type,
      city: place.city,
      state: place.state,
      intentKey,
      intentLabel: intent.label,
      question: queued?.question || intent.question(place.name),
      reason: partial
        ? `The ${intent.label.toLowerCase()} answer is useful but still needs the missing detail verified.`
        : expired
        ? `The verified ${intent.label.toLowerCase()} answer expired and needs rechecking.`
        : queued?.reason || `No current, source-backed ${intent.label.toLowerCase()} answer is cataloged.`,
      action: partial ? "complete" : expired ? "refresh" : "research",
      priority,
      freshnessDays: intent.freshnessDays,
      previousAnswer: partial?.value || expired?.value || null,
      suggestedSources: sourceTargets(place),
      requiresHumanReview: true,
    });
  }

  tasks.sort((left, right) => right.priority - left.priority || left.intentKey.localeCompare(right.intentKey));
  return {
    placeId: place.id,
    placeName: place.name,
    expectedIntentCount: expected.length,
    coveredIntentCount: expected.length - tasks.length,
    coverageScore: totalWeight ? Math.round((coveredWeight / totalWeight) * 100) : 0,
    tasks,
  };
}

function buildEnrichmentQueue(catalog, options = {}) {
  const coverage = (catalog?.places || []).map((place) => scorePlaceCoverage(place, options));
  const tasks = coverage
    .flatMap((place) =>
      place.tasks.map((task) => ({
        ...task,
        placeCoverageScore: place.coverageScore,
      })),
    )
    .sort((left, right) =>
      right.priority - left.priority ||
      left.placeCoverageScore - right.placeCoverageScore ||
      left.placeName.localeCompare(right.placeName),
    );
  return {
    generatedAt: options.now ? new Date(options.now).toISOString() : new Date().toISOString(),
    policy: {
      publication: "AI findings remain proposed until a human accepts the fact and its sources.",
      prioritization: "Daily-use and safety-sensitive gaps rank above descriptive content.",
      freshness: "Expired answers become refresh tasks and are not counted as covered.",
      partialAnswers: "Useful but incomplete answers remain visible and stay queued until verified.",
    },
    summary: {
      places: coverage.length,
      averageCoverageScore: coverage.length
        ? Math.round(coverage.reduce((sum, place) => sum + place.coverageScore, 0) / coverage.length)
        : 0,
      openTasks: tasks.length,
      urgentTasks: tasks.filter((task) => task.priority >= 95).length,
    },
    coverage: coverage.map(({ tasks: ignored, ...place }) => place),
    tasks,
  };
}

module.exports = {
  INTENTS,
  buildEnrichmentQueue,
  canonicalKey,
  expectedIntents,
  scorePlaceCoverage,
};
