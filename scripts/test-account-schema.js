const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const schema = fs.readFileSync(path.join(root, "supabase/schema.sql"), "utf8");
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20260804000000_account_saved_places.sql"),
  "utf8",
);

const requiredStatements = [
  "create table if not exists public.user_saved_places",
  "references auth.users(id) on delete cascade",
  "alter table public.user_saved_places enable row level security",
  'create policy "Users read their saved places"',
  'create policy "Users save places"',
  'create policy "Users remove their saved places"',
  "create or replace function public.replace_user_saved_places(saved_place_ids text[])",
  "security invoker",
  "grant execute on function public.replace_user_saved_places(text[]) to authenticated",
];

for (const statement of requiredStatements) {
  assert.ok(schema.includes(statement), `Canonical schema is missing: ${statement}`);
  assert.ok(migration.includes(statement), `Account migration is missing: ${statement}`);
}

assert.match(schema, /primary key \(user_id, place_id\)/);
assert.match(migration, /coalesce\(array_length\(saved_place_ids, 1\), 0\) > 1000/);
assert.match(migration, /where saved\.user_id = account_user_id/);

console.log("Account database schema checks passed.");
