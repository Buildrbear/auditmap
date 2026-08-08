const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "data", "nc-expansion-punchlist.json");

const boundariesApi =
  "https://linc.osbm.nc.gov/api/explore/v2.1/catalog/datasets/municipalities-2020/records";
const estimatesApi =
  "https://linc.osbm.nc.gov/api/explore/v2.1/catalog/datasets/2024-standard-population-estimates/records";
const censusDesignatedPlacesApi =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/5/query";

// The OSBM boundary layer omits county attributes for these inactive incorporated towns.
const municipalityCountyOverrides = {
  Dellview: "Gaston",
  "Spencer Mountain": "Gaston"
};

const districtCounties = {
  1: ["Bertie", "Camden", "Chowan", "Currituck", "Dare", "Gates", "Hertford", "Martin", "Pasquotank", "Perquimans", "Tyrrell", "Washington"],
  2: ["Beaufort", "Carteret", "Craven", "Hyde", "Jones", "Onslow", "Pamlico"],
  3: ["Bladen", "Brunswick", "Columbus", "Duplin", "New Hanover", "Pender", "Sampson"],
  4: ["Greene", "Johnston", "Lenoir", "Pitt", "Wayne", "Wilson"],
  5: ["Edgecombe", "Franklin", "Halifax", "Nash", "Northampton", "Warren"],
  6: ["Alamance", "Caswell", "Chatham", "Durham", "Granville", "Orange", "Person", "Vance", "Wake"],
  7: ["Cumberland", "Harnett", "Hoke", "Lee", "Moore", "Robeson", "Scotland"],
  8: ["Anson", "Cabarrus", "Mecklenburg", "Montgomery", "Richmond", "Stanly", "Union"],
  9: ["Davidson", "Davie", "Forsyth", "Guilford", "Randolph", "Rockingham", "Rowan", "Stokes"],
  10: ["Alexander", "Alleghany", "Ashe", "Avery", "Caldwell", "Iredell", "Surry", "Watauga", "Wilkes", "Yadkin"],
  11: ["Burke", "Catawba", "Cleveland", "Gaston", "Lincoln", "McDowell", "Rutherford"],
  12: ["Buncombe", "Cherokee", "Clay", "Graham", "Haywood", "Henderson", "Jackson", "Macon", "Madison", "Mitchell", "Polk", "Swain", "Transylvania", "Yancey"]
};

const countyDistrict = new Map(
  Object.entries(districtCounties).flatMap(([district, counties]) =>
    counties.map((county) => [county, Number(district)])
  )
);

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function fetchAll(baseUrl, parameters = {}) {
  const limit = 100;
  const firstUrl = new URL(baseUrl);
  Object.entries({ ...parameters, limit, offset: 0 }).forEach(([key, value]) =>
    firstUrl.searchParams.set(key, value)
  );
  const first = await fetch(firstUrl);
  if (!first.ok) throw new Error(`Request failed (${first.status}): ${firstUrl}`);
  const firstPage = await first.json();
  const records = [...firstPage.results];

  for (let offset = limit; offset < firstPage.total_count; offset += limit) {
    const url = new URL(baseUrl);
    Object.entries({ ...parameters, limit, offset }).forEach(([key, value]) =>
      url.searchParams.set(key, value)
    );
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
    const page = await response.json();
    records.push(...page.results);
  }
  return records;
}

async function fetchCensusDesignatedPlaces() {
  const url = new URL(censusDesignatedPlacesApi);
  url.searchParams.set("where", "STATE='37'");
  url.searchParams.set(
    "outFields",
    "BASENAME,NAME,GEOID,PLACE,CENTLAT,CENTLON,INTPTLAT,INTPTLON"
  );
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("f", "json");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`TIGERweb request failed: ${payload.error.message}`);
  return (payload.features || []).map((feature) => feature.attributes);
}

function rolloutWave(population, name) {
  if (name === "Raleigh") return 0;
  if (population >= 100000) return 1;
  if (population >= 25000) return 2;
  if (population >= 10000) return 3;
  if (population >= 2500) return 4;
  return 5;
}

function targetDepth(wave) {
  return {
    0: "full-buildout-complete",
    1: "full-buildout",
    2: "major-and-intermediate-public-sites",
    3: "major-local-destinations-first",
    4: "anchor-public-sites-first",
    5: "discovery-first"
  }[wave];
}

function progressStatus(name, existingCount) {
  if (name === "Raleigh") return "full-buildout-complete";
  if (existingCount > 0) return "seeded";
  return "not-started";
}

function loadExistingCoverage() {
  const institutions = JSON.parse(
    fs.readFileSync(path.join(root, "data", "institutions.json"), "utf8")
  );
  const launchData = JSON.parse(
    fs.readFileSync(path.join(root, "data", "generated", "launch-map-places.json"), "utf8")
  );
  const launchPlaces = Array.isArray(launchData) ? launchData : launchData.places || [];
  const counts = new Map();
  for (const place of [...institutions, ...launchPlaces]) {
    if (place.state !== "NC" || !place.city) continue;
    counts.set(place.city, (counts.get(place.city) || 0) + 1);
  }
  return counts;
}

function loadWaveOneProgress() {
  const campaignPath = path.join(root, "data", "nc-wave-1-rollout.json");
  if (!fs.existsSync(campaignPath)) return new Map();
  const campaign = JSON.parse(fs.readFileSync(campaignPath, "utf8"));
  return new Map((campaign.cities || []).map((city) => [city.name, city]));
}

async function main() {
  const [boundaries, estimates, cdpRows] = await Promise.all([
    fetchAll(boundariesApi, {
      select:
        "name20,placefp20,geo_point_2d,namelsad20,censustype,countyname,countyna_1,countyna_2,countyna_3,year_incorporated"
    }),
    fetchAll(estimatesApi, {
      select: "muniname2,value,pfips,county,fips,multi",
      where: 'area_type="Municipality" AND year=date\'2024-07-01\''
    }),
    fetchCensusDesignatedPlaces()
  ]);

  const estimatesByPlace = new Map();
  for (const row of estimates) {
    const existing = estimatesByPlace.get(row.pfips) || {
      name: row.muniname2,
      population: row.value,
      counties: []
    };
    existing.population = Math.max(existing.population || 0, row.value || 0);
    if (row.county && !existing.counties.includes(row.county)) existing.counties.push(row.county);
    estimatesByPlace.set(row.pfips, existing);
  }

  const existingCoverage = loadExistingCoverage();
  const waveOneProgress = loadWaveOneProgress();
  const municipalities = boundaries
    .map((boundary) => {
      const estimate = estimatesByPlace.get(boundary.placefp20) || {};
      const counties = [
        boundary.countyname,
        boundary.countyna_1,
        boundary.countyna_2,
        boundary.countyna_3,
        ...(estimate.counties || [])
      ].filter(Boolean);
      const uniqueCounties = [...new Set(counties)].sort();
      const primaryCounty = boundary.countyname || uniqueCounties[0] || municipalityCountyOverrides[boundary.name20] || null;
      if (primaryCounty && !uniqueCounties.includes(primaryCounty)) uniqueCounties.push(primaryCounty);
      const population = estimate.population || null;
      const wave = rolloutWave(population || 0, boundary.name20);
      const existingListingCount = existingCoverage.get(boundary.name20) || 0;
      const campaignCity = waveOneProgress.get(boundary.name20);
      return {
        id: `nc-${slugify(boundary.name20)}`,
        name: boundary.name20,
        legalName: boundary.namelsad20,
        municipalityType: boundary.censustype,
        placeFips: boundary.placefp20,
        primaryCounty,
        counties: uniqueCounties,
        leagueDistrict: countyDistrict.get(primaryCounty) || null,
        latitude: boundary.geo_point_2d?.lat || null,
        longitude: boundary.geo_point_2d?.lon || null,
        yearIncorporated: boundary.year_incorporated || null,
        population2024: population,
        rolloutWave: wave,
        targetDepth: targetDepth(wave),
        status: progressStatus(boundary.name20, existingListingCount),
        existingListingCount,
        discoveryStatus: boundary.name20 === "Raleigh" || campaignCity ? "complete" : "not-started",
        inventoryStatus: boundary.name20 === "Raleigh" || campaignCity ? "complete" : "not-started",
        enrichmentStatus: boundary.name20 === "Raleigh" ? "complete" : "not-started",
        imageStatus: boundary.name20 === "Raleigh" ? "complete" : "not-started",
        subsiteStatus: boundary.name20 === "Raleigh" ? "complete" : "not-started",
        livePageStatus: boundary.name20 === "Raleigh" ? "complete" : "not-started",
        campaign: campaignCity ? "nc-wave-1-rollout" : null,
        candidateDestinationCount: campaignCity?.destinations?.length || 0,
        notes: []
      };
    })
    .sort((left, right) =>
      left.rolloutWave - right.rolloutWave ||
      (right.population2024 || 0) - (left.population2024 || 0) ||
      left.name.localeCompare(right.name)
    );

  const counties = [...countyDistrict.keys()]
    .sort()
    .map((county) => {
      const memberMunicipalities = municipalities
        .filter((municipality) => municipality.counties.includes(county))
        .map((municipality) => municipality.name);
      return {
        id: `nc-county-${slugify(county)}`,
        name: `${county} County`,
        leagueDistrict: countyDistrict.get(county),
        municipalities: memberMunicipalities,
        unincorporatedPlacesStatus: "not-started",
        countyParksStatus: "not-started",
        stateAndFederalLandsStatus: "not-started",
        greenwaysAndTrailsStatus: "not-started",
        publicWaterAccessStatus: "not-started",
        notes: []
      };
    });

  const censusDesignatedPlaces = cdpRows
    .map((row) => {
      const existingListingCount = existingCoverage.get(row.BASENAME) || 0;
      return {
        id: `nc-cdp-${slugify(row.BASENAME)}`,
        name: row.BASENAME,
        legalName: row.NAME,
        geoid: row.GEOID,
        placeFips: row.PLACE,
        latitude: Number(row.INTPTLAT || row.CENTLAT),
        longitude: Number(row.INTPTLON || row.CENTLON),
        status: existingListingCount > 0 ? "seeded" : "not-started",
        existingListingCount,
        discoveryStatus: "not-started",
        inventoryStatus: "not-started",
        enrichmentStatus: "not-started",
        livePageStatus: "not-started",
        countyAssignmentStatus: "pending",
        notes: []
      };
    })
    .sort(
      (left, right) =>
        right.existingListingCount - left.existingListingCount || left.name.localeCompare(right.name)
    );

  const waveSummary = [0, 1, 2, 3, 4, 5].map((wave) => {
    const members = municipalities.filter((municipality) => municipality.rolloutWave === wave);
    return {
      wave,
      targetDepth: targetDepth(wave),
      municipalityCount: members.length,
      complete: members.filter((municipality) => municipality.status === "full-buildout-complete").length,
      seeded: members.filter((municipality) => municipality.status === "seeded").length,
      notStarted: members.filter((municipality) => municipality.status === "not-started").length
    };
  });

  const output = {
    title: "AuditMap North Carolina Expansion Punchlist",
    generatedAt: new Date().toISOString(),
    sourceVintage: "NC OSBM 2020 municipal boundaries and 2024 standard population estimates",
    sources: [
      {
        label: "NC OSBM Municipalities - 2020",
        url: "https://linc.osbm.nc.gov/explore/dataset/municipalities-2020/",
        purpose: "Complete incorporated-place inventory, municipality type, county, and representative coordinates"
      },
      {
        label: "NC OSBM 2024 Standard Population Estimates",
        url: "https://linc.osbm.nc.gov/explore/dataset/2024-standard-population-estimates/",
        purpose: "Rollout prioritization by current official municipality population estimate"
      },
      {
        label: "North Carolina Association of Municipal Clerks district map",
        url: "https://ncamc.nclm.org/mission-constitution/district-map/",
        purpose: "Twelve-district county grouping for statewide work batches"
      },
      {
        label: "U.S. Census Bureau TIGERweb Census Designated Places",
        url: "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/5",
        purpose: "Current 2025-vintage inventory and representative coordinates for named unincorporated communities"
      }
    ],
    standards: {
      baselineListing: [
        "canonical page and map point",
        "official name and aliases",
        "address and arrival point",
        "hours, fees, closures, parking, restrooms, and accessibility",
        "minimum three real source-attributed images",
        "minimum ten sourced visitor questions",
        "subsites when orientation or distinct visitor intent requires them"
      ],
      exclusions: [
        "defer ordinary municipal office buildings until a later platform phase",
        "private apartment, HOA, membership-only, and commercial amenities",
        "duplicate names or superseded listings"
      ]
    },
    summary: {
      municipalities: municipalities.length,
      censusDesignatedPlaces: censusDesignatedPlaces.length,
      counties: counties.length,
      existingNcListings: [...existingCoverage.values()].reduce((total, count) => total + count, 0),
      fullBuildoutMunicipalities: municipalities.filter(
        (municipality) => municipality.status === "full-buildout-complete"
      ).length,
      seededMunicipalities: municipalities.filter((municipality) => municipality.status === "seeded").length,
      notStartedMunicipalities: municipalities.filter(
        (municipality) => municipality.status === "not-started"
      ).length,
      seededCensusDesignatedPlaces: censusDesignatedPlaces.filter(
        (place) => place.status === "seeded"
      ).length,
      notStartedCensusDesignatedPlaces: censusDesignatedPlaces.filter(
        (place) => place.status === "not-started"
      ).length,
      waves: waveSummary
    },
    statewideWorkstreams: [
      { id: "municipal-parks", label: "Municipal parks and recreation campuses", status: "active" },
      { id: "county-parks", label: "County parks and recreation campuses", status: "not-started" },
      { id: "state-parks", label: "North Carolina state parks, recreation areas, and natural areas", status: "seeded" },
      { id: "federal-and-tribal", label: "Federal and Tribal public lands and visitor sites", status: "seeded" },
      { id: "greenways", label: "Regional greenways, rail trails, and long-distance trail systems", status: "seeded" },
      { id: "water-access", label: "Public beaches, river access, lakes, paddling launches, and fishing access", status: "not-started" },
      { id: "public-culture", label: "Public museums, gardens, historic sites, and children's destinations", status: "seeded" },
      { id: "unincorporated", label: "Unincorporated communities and census-designated places", status: "active" }
    ],
    municipalities,
    censusDesignatedPlaces,
    counties
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  const csvPath = path.join(root, "data", "nc-expansion-punchlist.csv");
  const csvHeaders = [
    "place_type", "id", "name", "legal_name", "primary_county", "all_counties",
    "district", "population_2024", "rollout_wave", "target_depth", "status",
    "existing_listing_count", "latitude", "longitude"
  ];
  const csvEscape = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const csvRows = [
    ...municipalities.map((place) => [
      "municipality", place.id, place.name, place.legalName, place.primaryCounty,
      place.counties.join("; "), place.leagueDistrict, place.population2024,
      place.rolloutWave, place.targetDepth, place.status, place.existingListingCount,
      place.latitude, place.longitude
    ]),
    ...censusDesignatedPlaces.map((place) => [
      "census-designated-place", place.id, place.name, place.legalName, "", "", "",
      "", place.rolloutWave, place.targetDepth, place.status, place.existingListingCount,
      place.latitude, place.longitude
    ])
  ];
  fs.writeFileSync(
    csvPath,
    `${[csvHeaders, ...csvRows].map((row) => row.map(csvEscape).join(",")).join("\n")}\n`
  );
  console.log(JSON.stringify(output.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
