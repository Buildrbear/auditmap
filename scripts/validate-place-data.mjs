#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_FILE = "data/institutions.json";
const DEFAULT_MAX_AGE_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIRED_TEXT_FIELDS = [
  "id",
  "name",
  "type",
  "city",
  "state",
  "country",
  "citySlug",
  "address",
  "sourceLabel",
  "source",
  "verifiedAt",
];
const PLACEHOLDER_HOSTS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "example.gov",
  "localhost",
]);

function diagnostic(severity, code, recordId, field, message, repair) {
  return { severity, code, recordId, field, message, repair };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function recordLabel(record, index) {
  return isNonEmptyString(record?.id) ? record.id : `record[${index}]`;
}

function parseIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function utcToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parsePublicUrl(value, { requireHttps = false } = {}) {
  if (!isNonEmptyString(value)) {
    return { valid: false, reason: "is missing" };
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { valid: false, reason: "is not an absolute URL" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, reason: "must use HTTP or HTTPS" };
  }
  if (requireHttps && parsed.protocol !== "https:") {
    return { valid: false, reason: "must use HTTPS" };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    PLACEHOLDER_HOSTS.has(hostname) ||
    hostname.endsWith(".example.com") ||
    hostname.endsWith(".invalid") ||
    hostname.endsWith(".local")
  ) {
    return { valid: false, reason: "uses a placeholder or local hostname" };
  }

  return { valid: true, url: parsed };
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizePlaceName(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function levenshteinDistance(left, right) {
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution = previous[rightIndex - 1] + (
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1
      );
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        substitution,
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function nameSimilarity(left, right) {
  const longest = Math.max(left.length, right.length);
  return longest === 0 ? 1 : 1 - levenshteinDistance(left, right) / longest;
}

function validateDateField(record, index, field, options, diagnostics) {
  const id = recordLabel(record, index);
  const value = record[field];
  if (!isNonEmptyString(value)) {
    return { valid: false, fresh: false };
  }

  const parsed = parseIsoDate(value);
  if (!parsed) {
    diagnostics.push(diagnostic(
      "error",
      "date.invalid",
      id,
      field,
      `"${value}" is not a real YYYY-MM-DD date.`,
      `Replace ${field} with the calendar date when the source was checked, for example 2026-07-29.`,
    ));
    return { valid: false, fresh: false };
  }

  if (parsed > options.asOf) {
    diagnostics.push(diagnostic(
      "error",
      "date.future",
      id,
      field,
      `${field} ${value} is after the as-of date ${options.asOfText}.`,
      `Use the actual source-check date, no later than ${options.asOfText}.`,
    ));
    return { valid: true, fresh: false };
  }

  const ageDays = Math.floor((options.asOf.getTime() - parsed.getTime()) / DAY_MS);
  if (ageDays > options.maxAgeDays) {
    diagnostics.push(diagnostic(
      "error",
      "date.stale",
      id,
      field,
      `${field} ${value} is ${ageDays} days old; the limit is ${options.maxAgeDays} days.`,
      "Recheck the public source and update the date. Do not change the date without reviewing the source.",
    ));
    return { valid: true, fresh: false };
  }

  return { valid: true, fresh: true };
}

function validateImage(image, record, index, field, diagnostics) {
  const id = recordLabel(record, index);
  if (!image || typeof image !== "object" || Array.isArray(image)) {
    diagnostics.push(diagnostic(
      "error",
      "image.invalid",
      id,
      field,
      "Image metadata must be an object.",
      `Provide ${field} with url, source, author, license, and useful alt text, or remove the incomplete image entry.`,
    ));
    return false;
  }

  let valid = true;
  for (const metadataField of ["url", "source", "author", "license", "alt"]) {
    if (!isNonEmptyString(image[metadataField])) {
      valid = false;
      diagnostics.push(diagnostic(
        "error",
        "image.metadata_missing",
        id,
        `${field}.${metadataField}`,
        `Image ${field} is missing ${metadataField}.`,
        "Complete all five image attribution fields (url, source, author, license, alt), or remove the image entry.",
      ));
    }
  }

  for (const urlField of ["url", "source"]) {
    if (!isNonEmptyString(image[urlField])) continue;
    const result = parsePublicUrl(image[urlField], { requireHttps: true });
    if (!result.valid) {
      valid = false;
      diagnostics.push(diagnostic(
        "error",
        "image.url_invalid",
        id,
        `${field}.${urlField}`,
        `Image ${urlField} ${result.reason}.`,
        `Use a stable public HTTPS URL for ${field}.${urlField}.`,
      ));
    }
  }

  if (isNonEmptyString(image.alt) && image.alt.trim().length < 12) {
    valid = false;
    diagnostics.push(diagnostic(
      "error",
      "image.alt_unhelpful",
      id,
      `${field}.alt`,
      "Image alt text is too short to describe the image usefully.",
      "Describe the visible place or scene in at least 12 characters; do not repeat only the place name.",
    ));
  }

  return valid;
}

function validateContactValue(value, kind, record, index, field, diagnostics) {
  if (value === undefined || value === null || value === "") return;

  const id = recordLabel(record, index);
  let valid = false;
  let expectation = "";
  if (kind === "phone") {
    valid = typeof value === "string" &&
      /^\+?[0-9()\s.-]{7,25}(?:\s*(?:x|ext\.?)\s*\d{1,6})?$/i.test(value.trim()) &&
      value.replace(/\D/g, "").length >= 7 &&
      value.replace(/\D/g, "").length <= 15;
    expectation = "a public phone number containing 7–15 digits";
  } else if (kind === "email") {
    valid = typeof value === "string" &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
    expectation = "a complete public email address";
  } else if (kind === "website") {
    valid = parsePublicUrl(value).valid;
    expectation = "a stable public HTTP or HTTPS URL";
  }

  if (!valid) {
    diagnostics.push(diagnostic(
      "error",
      `contact.${kind}_invalid`,
      id,
      field,
      `${field} is not ${expectation}.`,
      `Correct ${field} using an official public source, or remove it if it cannot be verified.`,
    ));
  }
}

function validateContradictions(record, index, diagnostics) {
  const id = recordLabel(record, index);
  if (isNonEmptyString(record.cost)) {
    const cost = record.cost.toLowerCase();
    const saysUnknown = /\b(unknown|unverified|not documented|needs? verification)\b/.test(cost);
    const saysKnown = /\b(free|no charge|fee|fees|paid|fare|costs? \$?\d|admission \$?\d)\b/.test(cost);
    if (saysUnknown && saysKnown) {
      diagnostics.push(diagnostic(
        "error",
        "cost.contradictory",
        id,
        "cost",
        "The cost field mixes an unknown/unverified status with a definite price claim.",
        "Keep only the sourced cost statement, or state that the cost needs verification without also claiming a price.",
      ));
    }
  }

  if (isNonEmptyString(record.access)) {
    const access = record.access.toLowerCase();
    const saysClosed = /\b(no public access|closed to (?:the )?public|access prohibited)\b/.test(access);
    const withoutClosedPhrases = access.replace(
      /\b(no public access|closed to (?:the )?public|access prohibited)\b/g,
      "",
    );
    const saysOpen = /\b(open to (?:the )?public|public access (?:is )?(?:allowed|available))\b/.test(
      withoutClosedPhrases,
    );
    if (saysClosed && saysOpen) {
      diagnostics.push(diagnostic(
        "error",
        "access.contradictory",
        id,
        "access",
        "The access field says the place is both open and closed to the public.",
        "Resolve the conflict against a current source and keep one clear access status.",
      ));
    }
  }

  if (isNonEmptyString(record.accessibility)) {
    const accessibility = record.accessibility.toLowerCase();
    const saysInaccessible = /\b(not wheelchair accessible|inaccessible|no accessible entrance)\b/.test(
      accessibility,
    );
    const withoutNegativePhrases = accessibility.replace(
      /\b(not wheelchair accessible|inaccessible|no accessible entrance)\b/g,
      "",
    );
    const saysAccessible = /\b(wheelchair accessible|fully accessible|accessible entrance)\b/.test(
      withoutNegativePhrases,
    );
    if (saysInaccessible && saysAccessible) {
      diagnostics.push(diagnostic(
        "error",
        "accessibility.contradictory",
        id,
        "accessibility",
        "The accessibility field contains mutually exclusive access claims.",
        "Verify the accessible feature against a current source and remove the conflicting statement.",
      ));
    }
  }
}

function validateExternalRating(record, index, options, diagnostics) {
  if (record.externalRating === undefined || record.externalRating === null) return;
  const id = recordLabel(record, index);
  const rating = record.externalRating;
  if (typeof rating !== "object" || Array.isArray(rating)) {
    diagnostics.push(diagnostic(
      "error",
      "rating.invalid",
      id,
      "externalRating",
      "External rating metadata must be an object.",
      "Provide value, count, source, url, and checkedAt together, or remove the unsupported rating.",
    ));
    return;
  }

  if (typeof rating.value !== "number" || rating.value < 0 || rating.value > 5) {
    diagnostics.push(diagnostic(
      "error",
      "rating.value_invalid",
      id,
      "externalRating.value",
      "External rating value must be a number from 0 through 5.",
      "Correct the value from the cited public page, or remove the rating.",
    ));
  }
  if (!Number.isInteger(rating.count) || rating.count < 0) {
    diagnostics.push(diagnostic(
      "error",
      "rating.count_invalid",
      id,
      "externalRating.count",
      "External rating count must be a non-negative integer.",
      "Correct the count from the cited public page, or remove the rating.",
    ));
  }
  if (!isNonEmptyString(rating.source)) {
    diagnostics.push(diagnostic(
      "error",
      "rating.source_missing",
      id,
      "externalRating.source",
      "External rating is missing a source label.",
      "Name the public page that displays the rating, or remove the rating.",
    ));
  }
  const urlResult = parsePublicUrl(rating.url);
  if (!urlResult.valid) {
    diagnostics.push(diagnostic(
      "error",
      "rating.url_invalid",
      id,
      "externalRating.url",
      `External rating URL ${urlResult.reason}.`,
      "Add the stable public page where the rating can be reviewed, or remove the rating.",
    ));
  }
  if (!isNonEmptyString(rating.checkedAt)) {
    diagnostics.push(diagnostic(
      "error",
      "rating.date_missing",
      id,
      "externalRating.checkedAt",
      "External rating is missing its source-check date.",
      "Add the real YYYY-MM-DD date when the cited rating page was checked, or remove the rating.",
    ));
  } else {
    validateDateField(
      { ...record, checkedAt: rating.checkedAt },
      index,
      "checkedAt",
      options,
      diagnostics,
    );
  }
}

function hasCompleteAttributedImage(record) {
  if (!record.image || typeof record.image !== "object" || Array.isArray(record.image)) return false;
  return ["url", "source", "author", "license", "alt"].every(
    (field) => isNonEmptyString(record.image[field]),
  ) &&
    parsePublicUrl(record.image.url, { requireHttps: true }).valid &&
    parsePublicUrl(record.image.source, { requireHttps: true }).valid &&
    record.image.alt.trim().length >= 12;
}

function hasValidCoordinates(record) {
  return typeof record.latitude === "number" &&
    Number.isFinite(record.latitude) &&
    record.latitude >= -90 &&
    record.latitude <= 90 &&
    typeof record.longitude === "number" &&
    Number.isFinite(record.longitude) &&
    record.longitude >= -180 &&
    record.longitude <= 180;
}

function hasValidPrimarySource(record) {
  return isNonEmptyString(record.sourceLabel) && parsePublicUrl(record.source).valid;
}

function buildCoverage(records, options) {
  const cities = new Map();
  records.forEach((record) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) return;
    const city = isNonEmptyString(record.city) ? record.city.trim() : "Unknown city";
    const state = isNonEmptyString(record.state) ? record.state.trim() : "—";
    const key = `${city}\u0000${state}`;
    const row = cities.get(key) ?? {
      city,
      state,
      records: 0,
      sources: 0,
      dates: 0,
      coordinates: 0,
      images: 0,
    };
    row.records += 1;
    if (hasValidPrimarySource(record)) row.sources += 1;
    const checkedAt = parseIsoDate(record.verifiedAt);
    if (
      checkedAt &&
      checkedAt <= options.asOf &&
      Math.floor((options.asOf.getTime() - checkedAt.getTime()) / DAY_MS) <= options.maxAgeDays
    ) {
      row.dates += 1;
    }
    if (hasValidCoordinates(record)) row.coordinates += 1;
    if (hasCompleteAttributedImage(record)) row.images += 1;
    cities.set(key, row);
  });

  return [...cities.values()].sort(
    (left, right) => left.state.localeCompare(right.state) || left.city.localeCompare(right.city),
  );
}

export function validateDataset(input, {
  asOf = utcToday(),
  maxAgeDays = DEFAULT_MAX_AGE_DAYS,
} = {}) {
  const asOfDate = typeof asOf === "string" ? parseIsoDate(asOf) : asOf;
  if (!(asOfDate instanceof Date) || Number.isNaN(asOfDate.getTime())) {
    throw new TypeError("asOf must be a real YYYY-MM-DD date or Date instance.");
  }
  if (!Number.isInteger(maxAgeDays) || maxAgeDays < 0) {
    throw new TypeError("maxAgeDays must be a non-negative integer.");
  }

  const options = {
    asOf: new Date(Date.UTC(
      asOfDate.getUTCFullYear(),
      asOfDate.getUTCMonth(),
      asOfDate.getUTCDate(),
    )),
    asOfText: toIsoDate(asOfDate),
    maxAgeDays,
  };
  const diagnostics = [];

  if (!Array.isArray(input)) {
    diagnostics.push(diagnostic(
      "error",
      "dataset.not_array",
      "dataset",
      "$",
      "The place-data file must contain a JSON array.",
      "Wrap place records in one top-level JSON array.",
    ));
    return { diagnostics, coverage: [], options };
  }

  input.forEach((record, index) => {
    const id = recordLabel(record, index);
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      diagnostics.push(diagnostic(
        "error",
        "record.invalid",
        id,
        `[${index}]`,
        "Each place record must be a JSON object.",
        "Replace this value with a place object or remove it from the array.",
      ));
      return;
    }

    for (const field of REQUIRED_TEXT_FIELDS) {
      if (!isNonEmptyString(record[field])) {
        diagnostics.push(diagnostic(
          "error",
          "field.required",
          id,
          field,
          `${field} is required and must be non-empty text.`,
          `Add a non-empty ${field} value backed by a public source.`,
        ));
      }
    }

    if (isNonEmptyString(record.id) && !SLUG_PATTERN.test(record.id)) {
      diagnostics.push(diagnostic(
        "error",
        "id.invalid",
        id,
        "id",
        "Place ID must be a lowercase, hyphen-separated slug.",
        `Use a stable ID such as "${slugify(record.id)}"; check references before changing an existing ID.`,
      ));
    }

    if (isNonEmptyString(record.citySlug)) {
      const expectedSlug = `${slugify(record.city)}-${slugify(record.state)}`;
      if (!SLUG_PATTERN.test(record.citySlug) || record.citySlug !== expectedSlug) {
        diagnostics.push(diagnostic(
          "error",
          "city_slug.invalid",
          id,
          "citySlug",
          `"${record.citySlug}" does not match the city and state.`,
          `Use "${expectedSlug}" for ${record.city}, ${record.state}.`,
        ));
      }
    }

    if (!hasValidCoordinates(record)) {
      diagnostics.push(diagnostic(
        "error",
        "coordinates.invalid",
        id,
        "latitude/longitude",
        "Coordinates must be finite numbers with latitude from -90 to 90 and longitude from -180 to 180.",
        "Replace both values with reviewed coordinates from a public map or official GIS source.",
      ));
    }

    if (isNonEmptyString(record.source)) {
      const sourceResult = parsePublicUrl(record.source);
      if (!sourceResult.valid) {
        diagnostics.push(diagnostic(
          "error",
          "source.url_invalid",
          id,
          "source",
          `Primary source URL ${sourceResult.reason}.`,
          "Use a stable public HTTP or HTTPS page that supports this place record.",
        ));
      }
    }

    validateDateField(record, index, "verifiedAt", options, diagnostics);

    if (record.image !== undefined && record.image !== null) {
      validateImage(record.image, record, index, "image", diagnostics);
    }
    if (record.images !== undefined && record.images !== null) {
      if (!Array.isArray(record.images)) {
        diagnostics.push(diagnostic(
          "error",
          "images.not_array",
          id,
          "images",
          "Additional images must be an array or null.",
          "Use an array of complete image attribution objects, or set images to null.",
        ));
      } else {
        record.images.forEach((image, imageIndex) => {
          validateImage(image, record, index, `images[${imageIndex}]`, diagnostics);
        });
      }
    }

    validateContactValue(record.phone, "phone", record, index, "phone", diagnostics);
    validateContactValue(record.email, "email", record, index, "email", diagnostics);
    validateContactValue(record.website, "website", record, index, "website", diagnostics);
    if (record.contact !== undefined && record.contact !== null) {
      if (typeof record.contact !== "object" || Array.isArray(record.contact)) {
        diagnostics.push(diagnostic(
          "error",
          "contact.invalid",
          id,
          "contact",
          "Contact metadata must be an object.",
          "Provide phone, email, or website fields inside a contact object, or remove it.",
        ));
      } else {
        validateContactValue(
          record.contact.phone,
          "phone",
          record,
          index,
          "contact.phone",
          diagnostics,
        );
        validateContactValue(
          record.contact.email,
          "email",
          record,
          index,
          "contact.email",
          diagnostics,
        );
        validateContactValue(
          record.contact.website,
          "website",
          record,
          index,
          "contact.website",
          diagnostics,
        );
      }
    }

    validateContradictions(record, index, diagnostics);
    validateExternalRating(record, index, options, diagnostics);
  });

  const ids = new Map();
  const exactPlaces = new Map();
  const comparablePlaces = [];
  input.forEach((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) return;
    const id = recordLabel(record, index);
    if (isNonEmptyString(record.id)) {
      const firstIndex = ids.get(record.id);
      if (firstIndex !== undefined) {
        diagnostics.push(diagnostic(
          "error",
          "duplicate.id",
          id,
          "id",
          `ID "${record.id}" is also used by record[${firstIndex}].`,
          "Give each distinct place one stable, unique ID. Merge records if they describe the same place.",
        ));
      } else {
        ids.set(record.id, index);
      }
    }

    if (
      isNonEmptyString(record.name) &&
      isNonEmptyString(record.city) &&
      isNonEmptyString(record.state)
    ) {
      const normalizedName = normalizePlaceName(record.name);
      const normalizedCity = normalizePlaceName(record.city);
      const normalizedState = normalizePlaceName(record.state);
      const key = `${normalizedName}\u0000${normalizedCity}\u0000${normalizedState}`;
      const first = exactPlaces.get(key);
      if (first) {
        diagnostics.push(diagnostic(
          "error",
          "duplicate.place",
          id,
          "name/city/state",
          `"${record.name}" matches ${first.id} in ${record.city}, ${record.state}.`,
          "Merge duplicate records, or clarify the names and addresses if these are distinct places.",
        ));
      } else {
        exactPlaces.set(key, { id, index });
      }
      comparablePlaces.push({
        id,
        index,
        name: record.name,
        normalizedName,
        normalizedCity,
        normalizedState,
      });
    }
  });

  for (let leftIndex = 0; leftIndex < comparablePlaces.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < comparablePlaces.length; rightIndex += 1) {
      const left = comparablePlaces[leftIndex];
      const right = comparablePlaces[rightIndex];
      if (
        left.normalizedCity !== right.normalizedCity ||
        left.normalizedState !== right.normalizedState ||
        left.normalizedName === right.normalizedName
      ) {
        continue;
      }
      const similarity = nameSimilarity(left.normalizedName, right.normalizedName);
      if (similarity >= 0.86) {
        diagnostics.push(diagnostic(
          "warning",
          "duplicate.likely",
          right.id,
          "name/city/state",
          `"${right.name}" is ${Math.round(similarity * 100)}% similar to "${left.name}" (${left.id}) in the same city.`,
          "Confirm that these are distinct places; otherwise merge them under one stable ID.",
        ));
      }
    }
  }

  return {
    diagnostics,
    coverage: buildCoverage(input, options),
    options,
  };
}

function ratio(value, total) {
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);
  return `${value}/${total} (${percent}%)`;
}

export function formatCoverageReport(result) {
  const lines = [
    `City coverage (as of ${result.options.asOfText}; sources must be <= ${result.options.maxAgeDays} days old)`,
    "City | Records | Sources | Current dates | Coordinates | Attributed images",
    "--- | ---: | ---: | ---: | ---: | ---:",
  ];
  if (result.coverage.length === 0) {
    lines.push("No place records found.");
  } else {
    for (const row of result.coverage) {
      lines.push([
        `${row.city}, ${row.state}`,
        row.records,
        ratio(row.sources, row.records),
        ratio(row.dates, row.records),
        ratio(row.coordinates, row.records),
        ratio(row.images, row.records),
      ].join(" | "));
    }
  }
  return lines.join("\n");
}

export function formatDiagnostics(diagnostics) {
  if (diagnostics.length === 0) return "No data-quality errors or warnings.";
  return diagnostics.map((item) => [
    `${item.severity.toUpperCase()} [${item.code}] ${item.recordId} (${item.field}): ${item.message}`,
    `  Repair: ${item.repair}`,
  ].join("\n")).join("\n");
}

function usage() {
  return [
    "Usage: node scripts/validate-place-data.mjs [options]",
    "",
    `  --file <path>          JSON file to validate (default: ${DEFAULT_FILE})`,
    "  --as-of <YYYY-MM-DD>   Date used for freshness checks (default: current UTC date)",
    `  --max-age-days <days>  Maximum source age (default: ${DEFAULT_MAX_AGE_DAYS})`,
    "  --help                 Show this help",
  ].join("\n");
}

function parseArguments(argv) {
  const options = {
    file: DEFAULT_FILE,
    asOf: utcToday(),
    maxAgeDays: DEFAULT_MAX_AGE_DAYS,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (argument === "--file") {
      options.file = argv[++index];
      if (!options.file) throw new Error("--file requires a path.");
    } else if (argument === "--as-of") {
      const value = argv[++index];
      const parsed = parseIsoDate(value);
      if (!parsed) throw new Error("--as-of requires a real YYYY-MM-DD date.");
      options.asOf = parsed;
    } else if (argument === "--max-age-days") {
      const value = argv[++index];
      if (!/^\d+$/.test(value ?? "")) {
        throw new Error("--max-age-days requires a non-negative integer.");
      }
      options.maxAgeDays = Number(value);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

async function main() {
  let cli;
  try {
    cli = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(`Argument error: ${error.message}\n\n${usage()}`);
    process.exitCode = 2;
    return;
  }

  if (cli.help) {
    console.log(usage());
    return;
  }

  const filename = path.resolve(process.cwd(), cli.file);
  let data;
  try {
    data = JSON.parse(await readFile(filename, "utf8"));
  } catch (error) {
    console.error(`Could not read ${cli.file}: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  const result = validateDataset(data, cli);
  console.log(formatDiagnostics(result.diagnostics));
  console.log(`\n${formatCoverageReport(result)}`);

  const errors = result.diagnostics.filter((item) => item.severity === "error").length;
  const warnings = result.diagnostics.filter((item) => item.severity === "warning").length;
  console.log(`\nValidation summary: ${errors} error(s), ${warnings} warning(s).`);
  if (errors > 0) process.exitCode = 1;
}

const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  await main();
}
