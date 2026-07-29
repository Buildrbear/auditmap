import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  formatCoverageReport,
  validateDataset,
} from "../scripts/validate-place-data.mjs";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(TEST_DIR, "..");
const FIXTURE_DIR = path.join(TEST_DIR, "fixtures", "place-data");
const FIXED_OPTIONS = { asOf: "2026-07-29", maxAgeDays: 365 };

async function readFixture(name) {
  return JSON.parse(await readFile(path.join(FIXTURE_DIR, name), "utf8"));
}

test("valid place data passes and produces stable city coverage", async () => {
  const input = await readFixture("valid.json");
  const result = validateDataset(input, FIXED_OPTIONS);

  assert.deepEqual(result.diagnostics, []);
  assert.equal(
    formatCoverageReport(result),
    [
      "City coverage (as of 2026-07-29; sources must be <= 365 days old)",
      "City | Records | Sources | Current dates | Coordinates | Attributed images",
      "--- | ---: | ---: | ---: | ---: | ---:",
      "Raleigh, NC | 1 | 1/1 (100%) | 1/1 (100%) | 1/1 (100%) | 1/1 (100%)",
    ].join("\n"),
  );
});

test("invalid fixture covers source, location, duplicate, contact, date, image, and conflict errors", async () => {
  const input = await readFixture("invalid.json");
  const result = validateDataset(input, FIXED_OPTIONS);
  const codes = new Set(result.diagnostics.map((item) => item.code));

  for (const expectedCode of [
    "field.required",
    "id.invalid",
    "city_slug.invalid",
    "coordinates.invalid",
    "date.stale",
    "contact.phone_invalid",
    "contact.email_invalid",
    "contact.website_invalid",
    "image.metadata_missing",
    "image.url_invalid",
    "image.alt_unhelpful",
    "cost.contradictory",
    "access.contradictory",
    "accessibility.contradictory",
    "duplicate.id",
    "duplicate.place",
  ]) {
    assert.ok(codes.has(expectedCode), `expected diagnostic ${expectedCode}`);
  }
  assert.ok(result.diagnostics.every((item) => item.recordId && item.repair));
});

test("likely same-city duplicates are warnings", () => {
  const base = {
    id: "lake-johnson-park",
    name: "Lake Johnson Park",
    type: "Park",
    city: "Raleigh",
    state: "NC",
    country: "US",
    citySlug: "raleigh-nc",
    address: "4601 Avent Ferry Road",
    latitude: 35.7527,
    longitude: -78.7155,
    sourceLabel: "City of Raleigh",
    source: "https://raleighnc.gov/parks-and-recreation/places/lake-johnson-park",
    verifiedAt: "2026-07-20",
  };
  const result = validateDataset([
    base,
    {
      ...base,
      id: "lake-johnson-prk",
      name: "Lake Johnson Prk",
      address: "4601 Avent Ferry Rd",
    },
  ], FIXED_OPTIONS);

  assert.equal(
    result.diagnostics.filter((item) => item.code === "duplicate.likely").length,
    1,
  );
  assert.equal(
    result.diagnostics.find((item) => item.code === "duplicate.likely").severity,
    "warning",
  );
});

test("validation does not mutate input records", async () => {
  const input = await readFixture("invalid.json");
  const before = JSON.stringify(input);

  validateDataset(input, FIXED_OPTIONS);

  assert.equal(JSON.stringify(input), before);
});

test("command exits non-zero and prints repair guidance for invalid data", () => {
  const result = spawnSync(
    process.execPath,
    [
      "scripts/validate-place-data.mjs",
      "--file",
      "tests/fixtures/place-data/invalid.json",
      "--as-of",
      "2026-07-29",
    ],
    { cwd: REPOSITORY_ROOT, encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Repair:/);
  assert.match(result.stdout, /Validation summary: \d+ error\(s\), \d+ warning\(s\)\./);
});
