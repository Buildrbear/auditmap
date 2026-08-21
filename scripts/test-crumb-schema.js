const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const schema = fs.readFileSync(path.join(root, "supabase/schema.sql"), "utf8");
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20260804010000_crumbs_community.sql"),
  "utf8",
);
const impactSource = fs.readFileSync(path.join(root, "api/_lib/crumb-impact.js"), "utf8");
const required = [
  "location_accuracy_meters",
  "verification_status",
  "media_kind in ('photo', 'panorama', 'photo_360')",
  "create table if not exists public.community_profiles",
  "create table if not exists public.contribution_impact_events",
  "source_key text not null unique",
  "create table if not exists public.contributor_badges",
  'create policy "Users read their impact events"',
  "community-media-inbox",
  "file_size_limit",
];

for (const statement of required) {
  assert.ok(schema.includes(statement), `Canonical schema is missing: ${statement}`);
  assert.ok(migration.includes(statement), `Crumbs migration is missing: ${statement}`);
}
assert.doesNotMatch(schema, /impact_points\s+integer/i, "Editable impact totals must not be stored.");
assert.match(migration, /where moderation_status = 'published' and latitude is not null/);
assert.match(impactSource, /resolution=ignore-duplicates/);

console.log("Crumbs database and RLS contract checks passed.");
