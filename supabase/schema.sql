create extension if not exists pgcrypto;
create extension if not exists postgis with schema extensions;

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  region text not null,
  country_code text not null,
  latitude double precision,
  longitude double precision,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  city_id uuid references public.cities(id) on delete restrict,
  slug text not null,
  name text not null,
  type text not null,
  city text not null,
  state text not null,
  country_code text not null default 'US',
  neighborhood text,
  address text not null,
  latitude double precision,
  longitude double precision,
  summary text,
  hours text,
  cost text,
  accessibility text,
  transit text,
  amenities text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'archived')),
  verified_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (city_id, slug)
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  label text not null,
  url text not null,
  source_type text not null default 'official',
  checked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.external_ratings (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  source_name text not null,
  source_url text not null,
  rating numeric(2, 1) not null check (rating >= 1 and rating <= 5),
  rating_count integer check (rating_count >= 0),
  checked_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (institution_id, source_name)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid default auth.uid(),
  author_name text,
  rating numeric(2, 1) check (rating >= 1 and rating <= 5),
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid default auth.uid(),
  storage_path text,
  external_url text,
  source_url text,
  alt_text text,
  author_name text,
  license text,
  is_cover boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  check (storage_path is not null or external_url is not null)
);

create table if not exists public.change_suggestions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid default auth.uid(),
  message text not null,
  supporting_url text,
  proposed_changes jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid default auth.uid(),
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create table if not exists public.user_saved_places (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  place_id text not null check (char_length(place_id) between 1 and 160),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, place_id)
);

create table if not exists public.briefs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  body text not null,
  source_ids uuid[] not null default '{}',
  model text,
  prompt_version text,
  status text not null default 'draft' check (status in ('draft', 'published', 'superseded')),
  generated_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz
);

create index if not exists institutions_city_id_idx on public.institutions (city_id);
create index if not exists institutions_type_idx on public.institutions (type);
create index if not exists institutions_coordinates_idx
on public.institutions (latitude, longitude);
create index if not exists institutions_search_idx
on public.institutions using gin (
  to_tsvector(
    'english',
    coalesce(name, '') || ' ' ||
    coalesce(type, '') || ' ' ||
    coalesce(city, '') || ' ' ||
    coalesce(state, '') || ' ' ||
    coalesce(neighborhood, '') || ' ' ||
    coalesce(address, '')
  )
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_cities_updated_at on public.cities;
create trigger set_cities_updated_at
before update on public.cities
for each row execute function public.set_updated_at();

drop trigger if exists set_institutions_updated_at on public.institutions;
create trigger set_institutions_updated_at
before update on public.institutions
for each row execute function public.set_updated_at();

drop trigger if exists set_comments_updated_at on public.comments;
create trigger set_comments_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

alter table public.cities enable row level security;
alter table public.institutions enable row level security;
alter table public.sources enable row level security;
alter table public.external_ratings enable row level security;
alter table public.comments enable row level security;
alter table public.media enable row level security;
alter table public.change_suggestions enable row level security;
alter table public.reports enable row level security;
alter table public.briefs enable row level security;
alter table public.user_saved_places enable row level security;

drop policy if exists "Public reads active cities" on public.cities;
create policy "Public reads active cities" on public.cities
for select to anon, authenticated using (status = 'active');

drop policy if exists "Public reads published places" on public.institutions;
create policy "Public reads published places" on public.institutions
for select to anon, authenticated using (status = 'published');

drop policy if exists "Authenticated users submit places" on public.institutions;
create policy "Authenticated users submit places" on public.institutions
for insert to authenticated with check (auth.uid() = created_by);

drop policy if exists "Public reads place sources" on public.sources;
create policy "Public reads place sources" on public.sources
for select to anon, authenticated using (true);

drop policy if exists "Public reads external ratings" on public.external_ratings;
create policy "Public reads external ratings" on public.external_ratings
for select to anon, authenticated using (true);

drop policy if exists "Public reads published comments" on public.comments;
create policy "Public reads published comments" on public.comments
for select to anon, authenticated using (status = 'published');

drop policy if exists "Authenticated users submit comments" on public.comments;
create policy "Authenticated users submit comments" on public.comments
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Public reads published media" on public.media;
create policy "Public reads published media" on public.media
for select to anon, authenticated using (status = 'published');

drop policy if exists "Authenticated users submit media" on public.media;
create policy "Authenticated users submit media" on public.media
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Authenticated users submit edits" on public.change_suggestions;
create policy "Authenticated users submit edits" on public.change_suggestions
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Authenticated users submit reports" on public.reports;
create policy "Authenticated users submit reports" on public.reports
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users read their saved places" on public.user_saved_places;
create policy "Users read their saved places" on public.user_saved_places
for select to authenticated using (
  (select auth.uid()) is not null and (select auth.uid()) = user_id
);

drop policy if exists "Users save places" on public.user_saved_places;
create policy "Users save places" on public.user_saved_places
for insert to authenticated with check (
  (select auth.uid()) is not null and (select auth.uid()) = user_id
);

drop policy if exists "Users remove their saved places" on public.user_saved_places;
create policy "Users remove their saved places" on public.user_saved_places
for delete to authenticated using (
  (select auth.uid()) is not null and (select auth.uid()) = user_id
);

create or replace function public.replace_user_saved_places(saved_place_ids text[])
returns table (place_id text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  account_user_id uuid := (select auth.uid());
begin
  if account_user_id is null then
    raise exception 'An authenticated account is required.';
  end if;
  if coalesce(array_length(saved_place_ids, 1), 0) > 1000 then
    raise exception 'Saved place limit exceeded.';
  end if;

  delete from public.user_saved_places saved
  where saved.user_id = account_user_id;

  insert into public.user_saved_places (user_id, place_id)
  select account_user_id, candidate.place_id
  from (
    select distinct btrim(value) as place_id
    from unnest(coalesce(saved_place_ids, '{}'::text[])) as value
  ) candidate
  where candidate.place_id ~ '^[A-Za-z0-9][A-Za-z0-9:_./-]{0,159}$'
  on conflict (user_id, place_id) do nothing;

  return query
  select saved.place_id
  from public.user_saved_places saved
  where saved.user_id = account_user_id
  order by saved.created_at asc;
end;
$$;

drop policy if exists "Public reads published briefs" on public.briefs;
create policy "Public reads published briefs" on public.briefs
for select to anon, authenticated using (status = 'published');

-- Durable geographic identity and source-level knowledge model.
alter table public.institutions
add column if not exists public_id text;

update public.institutions
set public_id = coalesce(public_id, city || '-' || slug)
where public_id is null;

create unique index if not exists institutions_public_id_idx
on public.institutions (public_id);

alter table public.institutions
add column if not exists location extensions.geography(point, 4326);

alter table public.institutions
add column if not exists enrichment_status text not null default 'not_started'
  check (enrichment_status in ('not_started', 'queued', 'processing', 'review_needed', 'complete', 'failed'));

alter table public.institutions
add column if not exists completeness_score integer not null default 0
  check (completeness_score between 0 and 100);

alter table public.institutions
add column if not exists quality_tier text not null default 'needs_work'
  check (quality_tier in ('needs_work', 'baseline', 'ready'));

alter table public.institutions
add column if not exists last_enriched_at timestamptz;

create or replace function public.sync_institution_location()
returns trigger
language plpgsql
as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location = extensions.st_setsrid(
      extensions.st_makepoint(new.longitude, new.latitude),
      4326
    )::extensions.geography;
  else
    new.location = null;
  end if;
  return new;
end;
$$;

update public.institutions
set location = extensions.st_setsrid(
  extensions.st_makepoint(longitude, latitude),
  4326
)::extensions.geography
where latitude is not null and longitude is not null;

drop trigger if exists sync_institution_location on public.institutions;
create trigger sync_institution_location
before insert or update of latitude, longitude on public.institutions
for each row execute function public.sync_institution_location();

create index if not exists institutions_location_idx
on public.institutions using gist (location);

create table if not exists public.place_facts (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  predicate text not null,
  value jsonb not null,
  source_id uuid references public.sources(id) on delete set null,
  confidence numeric(4, 3) not null default 0.5 check (confidence between 0 and 1),
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'disputed', 'superseded')),
  observed_at timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid default auth.uid(),
  author_name text,
  contribution_type text not null default 'observation'
    check (contribution_type in ('observation', 'review', 'correction', 'confirmation', 'question')),
  body text not null,
  rating numeric(2, 1) check (rating between 1 and 5),
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'published', 'rejected')),
  analysis_status text not null default 'queued'
    check (analysis_status in ('queued', 'processing', 'complete', 'failed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  contribution_id uuid references public.contributions(id) on delete set null,
  predicate text not null,
  value jsonb not null,
  claim_text text not null,
  confidence numeric(4, 3) not null default 0.5 check (confidence between 0 and 1),
  verification_status text not null default 'unreviewed'
    check (verification_status in ('unreviewed', 'supported', 'conflicting', 'accepted', 'rejected', 'outdated')),
  model text,
  prompt_version text,
  extracted_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz
);

create table if not exists public.claim_evidence (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  source_id uuid references public.sources(id) on delete set null,
  contribution_id uuid references public.contributions(id) on delete set null,
  relation text not null check (relation in ('supports', 'contradicts', 'context')),
  excerpt text,
  confidence numeric(4, 3) not null default 0.5 check (confidence between 0 and 1),
  created_at timestamptz not null default timezone('utc', now()),
  check (source_id is not null or contribution_id is not null)
);

create table if not exists public.enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete set null,
  public_id text not null,
  trigger text not null default 'admin'
    check (trigger in ('admin', 'import', 'refresh', 'scheduled')),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'review_needed', 'complete', 'failed')),
  input_snapshot jsonb not null default '{}'::jsonb,
  output_snapshot jsonb not null default '{}'::jsonb,
  completeness_score integer check (completeness_score between 0 and 100),
  quality_tier text check (quality_tier in ('needs_work', 'baseline', 'ready')),
  model text,
  prompt_version text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.contributions
add column if not exists parent_id uuid references public.contributions(id) on delete cascade;

create table if not exists public.contribution_reactions (
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  reaction text not null default 'helpful' check (reaction in ('helpful')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (contribution_id, user_id, reaction)
);

create table if not exists public.place_steward_applications (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid default auth.uid(),
  applicant_name text not null,
  relationship text not null
    check (relationship in ('employee', 'volunteer', 'neighbor', 'advocate', 'other')),
  message text not null,
  verification_url text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.place_stewards (
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null,
  steward_type text not null
    check (steward_type in ('institution', 'community')),
  status text not null default 'active'
    check (status in ('active', 'paused', 'removed')),
  approved_at timestamptz not null default timezone('utc', now()),
  primary key (institution_id, user_id)
);

create table if not exists public.information_needs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  question_key text not null,
  sample_question text not null,
  ask_count integer not null default 1 check (ask_count > 0),
  status text not null default 'open'
    check (status in ('open', 'answered', 'dismissed')),
  first_asked_at timestamptz not null default timezone('utc', now()),
  last_asked_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  unique (institution_id, question_key)
);

alter table public.information_needs
add column if not exists canonical_answer text;
alter table public.information_needs
add column if not exists answer_status text
  check (answer_status in ('answered', 'partial', 'needs_verification'));
alter table public.information_needs
add column if not exists answer_sources jsonb not null default '[]'::jsonb;
alter table public.information_needs
add column if not exists answered_at timestamptz;
alter table public.information_needs
add column if not exists expires_at timestamptz;
alter table public.information_needs
add column if not exists intent_key text;
alter table public.information_needs
add column if not exists needs_enrichment boolean not null default false;
alter table public.information_needs
add column if not exists enrichment_queued_at timestamptz;

create table if not exists public.place_features (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  parent_feature_id uuid references public.place_features(id) on delete cascade,
  slug text not null,
  name text not null,
  feature_type text not null,
  description text,
  latitude double precision,
  longitude double precision,
  level_label text,
  level_order integer,
  details jsonb not null default '{}'::jsonb,
  source_label text,
  source_url text,
  verified_at timestamptz,
  status text not null default 'published'
    check (status in ('pending', 'published', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (institution_id, slug)
);

-- Community funding starts with place-level campaigns. Payment records are written
-- only by trusted server-side code after provider confirmation.
create table if not exists public.funding_campaigns (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  title text not null,
  summary text not null,
  status text not null default 'draft'
    check (status in ('draft', 'interest_test', 'active', 'paused', 'completed', 'canceled')),
  currency text not null default 'usd' check (currency = lower(currency)),
  reallocation_policy text,
  refund_policy text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.funding_milestones (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.funding_campaigns(id) on delete cascade,
  milestone_type text not null
    check (milestone_type in ('photo_pack', 'question_sprint', 'subsite_mapping', 'accessibility_audit')),
  title text not null,
  description text not null,
  public_deliverable text not null,
  target_amount_cents integer not null check (target_amount_cents > 0),
  funded_amount_cents integer not null default 0 check (funded_amount_cents >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'funded', 'in_progress', 'review', 'completed', 'canceled')),
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.funding_interest (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.funding_campaigns(id) on delete cascade,
  milestone_id uuid references public.funding_milestones(id) on delete set null,
  supporter_user_id uuid references auth.users(id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  email text,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.funding_contributions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.funding_campaigns(id) on delete restrict,
  milestone_id uuid references public.funding_milestones(id) on delete restrict,
  supporter_user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  provider_payment_id text not null unique,
  amount_cents integer not null check (amount_cents > 0),
  fee_amount_cents integer check (fee_amount_cents >= 0),
  status text not null
    check (status in ('pending', 'succeeded', 'refunded', 'disputed', 'failed')),
  donor_visibility text not null default 'anonymous'
    check (donor_visibility in ('anonymous', 'public', 'private')),
  donor_name text,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.funding_updates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.funding_campaigns(id) on delete cascade,
  milestone_id uuid references public.funding_milestones(id) on delete set null,
  title text not null,
  body text not null,
  update_type text not null default 'progress'
    check (update_type in ('progress', 'funded', 'in_progress', 'completed', 'delay', 'canceled')),
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.contributions
add column if not exists feature_id uuid references public.place_features(id) on delete set null;

create index if not exists place_features_institution_level_idx
on public.place_features (institution_id, level_order, name);

alter table public.place_features enable row level security;

create or replace function public.record_information_need(
  target_institution_id uuid,
  target_question_key text,
  target_sample_question text
)
returns public.information_needs
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.information_needs;
begin
  insert into public.information_needs (
    institution_id, question_key, sample_question
  )
  values (
    target_institution_id,
    left(target_question_key, 128),
    left(target_sample_question, 500)
  )
  on conflict (institution_id, question_key)
  do update set
    ask_count = public.information_needs.ask_count + 1,
    sample_question = excluded.sample_question,
    last_asked_at = timezone('utc', now()),
    status = case
      when public.information_needs.status = 'dismissed' then 'dismissed'
      when public.information_needs.canonical_answer is not null
        and public.information_needs.answer_status in ('answered', 'partial')
        and (
          public.information_needs.expires_at is null
          or public.information_needs.expires_at > timezone('utc', now())
        )
        then 'answered'
      else 'open'
    end
  returning * into result;
  return result;
end;
$$;

create index if not exists place_facts_institution_predicate_idx
on public.place_facts (institution_id, predicate, status);
create index if not exists contributions_institution_created_idx
on public.contributions (institution_id, created_at desc);
create index if not exists claims_institution_status_idx
on public.claims (institution_id, verification_status);
create index if not exists claim_evidence_claim_idx
on public.claim_evidence (claim_id);
create index if not exists contributions_parent_idx
on public.contributions (parent_id, created_at);
create index if not exists steward_applications_status_idx
on public.place_steward_applications (institution_id, status, created_at);
create index if not exists information_needs_priority_idx
on public.information_needs (status, ask_count desc, last_asked_at desc);
create index if not exists information_needs_intent_idx
on public.information_needs (institution_id, intent_key, status, ask_count desc);
create index if not exists enrichment_jobs_place_created_idx
on public.enrichment_jobs (public_id, created_at desc);
create index if not exists enrichment_jobs_status_created_idx
on public.enrichment_jobs (status, created_at);
create index if not exists funding_campaigns_institution_idx
on public.funding_campaigns (institution_id, status);
create unique index if not exists funding_campaigns_one_current_idx
on public.funding_campaigns (institution_id)
where status in ('draft', 'interest_test', 'active', 'paused');
create index if not exists funding_milestones_campaign_idx
on public.funding_milestones (campaign_id, sort_order);
create index if not exists funding_interest_campaign_idx
on public.funding_interest (campaign_id, created_at desc);
create index if not exists funding_interest_supporter_idx
on public.funding_interest (supporter_user_id, created_at desc)
where supporter_user_id is not null;
create index if not exists funding_contributions_campaign_idx
on public.funding_contributions (campaign_id, status, created_at desc);
create index if not exists funding_contributions_supporter_idx
on public.funding_contributions (supporter_user_id, created_at desc)
where supporter_user_id is not null;
create index if not exists funding_updates_campaign_idx
on public.funding_updates (campaign_id, published_at desc);

drop trigger if exists set_place_facts_updated_at on public.place_facts;
create trigger set_place_facts_updated_at
before update on public.place_facts
for each row execute function public.set_updated_at();

drop trigger if exists set_contributions_updated_at on public.contributions;
create trigger set_contributions_updated_at
before update on public.contributions
for each row execute function public.set_updated_at();

drop trigger if exists set_enrichment_jobs_updated_at on public.enrichment_jobs;
create trigger set_enrichment_jobs_updated_at
before update on public.enrichment_jobs
for each row execute function public.set_updated_at();

alter table public.place_facts enable row level security;
alter table public.contributions enable row level security;
alter table public.claims enable row level security;
alter table public.claim_evidence enable row level security;
alter table public.contribution_reactions enable row level security;
alter table public.place_steward_applications enable row level security;
alter table public.place_stewards enable row level security;
alter table public.information_needs enable row level security;
alter table public.enrichment_jobs enable row level security;
alter table public.funding_campaigns enable row level security;
alter table public.funding_milestones enable row level security;
alter table public.funding_interest enable row level security;
alter table public.funding_contributions enable row level security;
alter table public.funding_updates enable row level security;

drop policy if exists "Public reads visible funding campaigns" on public.funding_campaigns;
create policy "Public reads visible funding campaigns" on public.funding_campaigns
for select to anon, authenticated using (status in ('interest_test', 'active', 'completed'));

drop policy if exists "Public reads visible funding milestones" on public.funding_milestones;
create policy "Public reads visible funding milestones" on public.funding_milestones
for select to anon, authenticated using (
  exists (
    select 1 from public.funding_campaigns campaign
    where campaign.id = campaign_id
      and campaign.status in ('interest_test', 'active', 'completed')
  )
);

drop policy if exists "Public reads published funding updates" on public.funding_updates;
create policy "Public reads published funding updates" on public.funding_updates
for select to anon, authenticated using (published_at is not null);

drop policy if exists "Public reads accepted place facts" on public.place_facts;
create policy "Public reads accepted place facts" on public.place_facts
for select to anon, authenticated using (status = 'accepted');

drop policy if exists "Public reads published contributions" on public.contributions;
create policy "Public reads published contributions" on public.contributions
for select to anon, authenticated using (moderation_status = 'published');

drop policy if exists "Public reads reviewed claims" on public.claims;
create policy "Public reads reviewed claims" on public.claims
for select to anon, authenticated using (
  verification_status in ('supported', 'conflicting', 'accepted', 'outdated')
);

drop policy if exists "Public reads claim evidence" on public.claim_evidence;
create policy "Public reads claim evidence" on public.claim_evidence
for select to anon, authenticated using (true);

drop policy if exists "Public reads contribution reactions" on public.contribution_reactions;
create policy "Public reads contribution reactions" on public.contribution_reactions
for select to anon, authenticated using (true);

drop policy if exists "Authenticated users react to contributions" on public.contribution_reactions;
create policy "Authenticated users react to contributions" on public.contribution_reactions
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users submit steward applications" on public.place_steward_applications;
create policy "Users submit steward applications" on public.place_steward_applications
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Public reads active place stewards" on public.place_stewards;
create policy "Public reads active place stewards" on public.place_stewards
for select to anon, authenticated using (status = 'active');

create or replace function public.nearby_places(
  search_latitude double precision,
  search_longitude double precision,
  radius_meters integer default 16000,
  result_limit integer default 100
)
returns table (
  public_id text,
  name text,
  type text,
  city text,
  state text,
  neighborhood text,
  address text,
  latitude double precision,
  longitude double precision,
  summary text,
  hours text,
  cost text,
  accessibility text,
  transit text,
  amenities text[],
  verified_at timestamptz,
  distance_meters double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    i.public_id,
    i.name,
    i.type,
    i.city,
    i.state,
    i.neighborhood,
    i.address,
    i.latitude,
    i.longitude,
    i.summary,
    i.hours,
    i.cost,
    i.accessibility,
    i.transit,
    i.amenities,
    i.verified_at,
    extensions.st_distance(
      i.location,
      extensions.st_setsrid(
        extensions.st_makepoint(search_longitude, search_latitude),
        4326
      )::extensions.geography
    ) as distance_meters
  from public.institutions i
  where
    i.status = 'published'
    and i.location is not null
    and extensions.st_dwithin(
      i.location,
      extensions.st_setsrid(
        extensions.st_makepoint(search_longitude, search_latitude),
        4326
      )::extensions.geography,
      least(greatest(radius_meters, 500), 50000)
    )
  order by distance_meters
  limit least(greatest(result_limit, 1), 250);
$$;

-- Data API permissions are explicit because automatic table exposure is disabled.
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

grant select on public.cities, public.institutions, public.sources,
  public.external_ratings, public.comments, public.media, public.briefs,
  public.place_facts, public.contributions, public.claims,
  public.claim_evidence, public.contribution_reactions, public.place_stewards,
  public.funding_campaigns, public.funding_milestones, public.funding_updates
to anon, authenticated;

grant insert on public.institutions, public.comments, public.media,
  public.change_suggestions, public.reports, public.contributions,
  public.contribution_reactions, public.place_steward_applications,
  public.user_saved_places
to authenticated;

grant select, delete on public.user_saved_places to authenticated;

grant execute on function public.nearby_places(
  double precision, double precision, integer, integer
) to anon, authenticated;

grant execute on function public.replace_user_saved_places(text[]) to authenticated;

-- AuditMap Crumbs: location-aware contributions, moderated media, and recognition.
alter table public.reports add column if not exists target_type text not null default 'place';
alter table public.reports add column if not exists contribution_id uuid references public.contributions(id) on delete set null;
alter table public.reports add column if not exists reported_user_id uuid references auth.users(id) on delete set null;
alter table public.reports add column if not exists details text;
alter table public.reports add column if not exists reporter_hash text;
alter table public.reports add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.reports add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

alter table public.contributions add column if not exists latitude double precision;
alter table public.contributions add column if not exists longitude double precision;
alter table public.contributions add column if not exists location_scope text not null default 'place';
alter table public.contributions add column if not exists location_accuracy_meters numeric(10, 2);
alter table public.contributions add column if not exists observed_at timestamptz;
alter table public.contributions add column if not exists fresh_until timestamptz;
alter table public.contributions add column if not exists verification_status text not null default 'unverified';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contributions_location_scope_check') then
    alter table public.contributions add constraint contributions_location_scope_check
      check (location_scope in ('place', 'feature', 'pin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contributions_coordinates_check') then
    alter table public.contributions add constraint contributions_coordinates_check
      check ((latitude is null and longitude is null) or
        (latitude between -90 and 90 and longitude between -180 and 180));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contributions_verification_status_check') then
    alter table public.contributions add constraint contributions_verification_status_check
      check (verification_status in ('unverified', 'supported', 'verified', 'outdated'));
  end if;
end $$;

alter table public.media add column if not exists contribution_id uuid references public.contributions(id) on delete cascade;
alter table public.media add column if not exists feature_id uuid references public.place_features(id) on delete set null;
alter table public.media add column if not exists media_kind text not null default 'photo';
alter table public.media add column if not exists mime_type text;
alter table public.media add column if not exists width integer;
alter table public.media add column if not exists height integer;
alter table public.media add column if not exists byte_size bigint;
alter table public.media add column if not exists checksum text;
alter table public.media add column if not exists storage_state text not null default 'intent';
alter table public.media add column if not exists captured_at timestamptz;
alter table public.media add column if not exists preview_path text;
alter table public.media add column if not exists derivative_path text;
alter table public.media add column if not exists expires_at timestamptz not null default (timezone('utc', now()) + interval '24 hours');
alter table public.media add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'media_kind_check') then
    alter table public.media add constraint media_kind_check
      check (media_kind in ('photo', 'panorama', 'photo_360'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'media_storage_state_check') then
    alter table public.media add constraint media_storage_state_check
      check (storage_state in ('intent', 'uploaded', 'processing', 'ready', 'published', 'rejected', 'abandoned'));
  end if;
end $$;

create table if not exists public.community_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_slug text not null unique,
  display_name text not null check (char_length(display_name) between 2 and 40),
  avatar_url text,
  profile_status text not null default 'public' check (profile_status in ('public', 'private', 'suspended')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contribution_impact_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contribution_id uuid references public.contributions(id) on delete cascade,
  event_type text not null check (event_type in (
    'approved_text', 'useful_location', 'approved_photo', 'approved_panorama',
    'approved_360', 'accepted_verification', 'accepted_correction', 'unique_thank'
  )),
  points integer not null check (points between 0 and 20),
  source_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contributor_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null check (badge_key in (
    'first_crumb', 'eyes_on_the_trail', 'full_circle', 'detail_detective',
    'park_friend', 'neighborly', 'fresh_tracks'
  )),
  awarded_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, badge_key)
);

create index if not exists contributions_place_location_idx
on public.contributions (institution_id, latitude, longitude)
where moderation_status = 'published' and latitude is not null;
create index if not exists contributions_freshness_idx
on public.contributions (institution_id, fresh_until)
where moderation_status = 'published';
create index if not exists media_contribution_idx on public.media (contribution_id, status);
create index if not exists media_cleanup_idx on public.media (storage_state, expires_at);
create index if not exists impact_user_idx on public.contribution_impact_events (user_id, created_at desc);

drop trigger if exists set_community_profiles_updated_at on public.community_profiles;
create trigger set_community_profiles_updated_at before update on public.community_profiles
for each row execute function public.set_updated_at();

alter table public.community_profiles enable row level security;
alter table public.contribution_impact_events enable row level security;
alter table public.contributor_badges enable row level security;

drop policy if exists "Public reads community profiles" on public.community_profiles;
create policy "Public reads community profiles" on public.community_profiles
for select to anon, authenticated using (profile_status = 'public');
drop policy if exists "Users create their community profile" on public.community_profiles;
create policy "Users create their community profile" on public.community_profiles
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update their community profile" on public.community_profiles;
create policy "Users update their community profile" on public.community_profiles
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "Users read their impact events" on public.contribution_impact_events;
create policy "Users read their impact events" on public.contribution_impact_events
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Public reads contributor badges" on public.contributor_badges;
create policy "Public reads contributor badges" on public.contributor_badges
for select to anon, authenticated using (true);
drop policy if exists "Users read their pending media" on public.media;
create policy "Users read their pending media" on public.media
for select to authenticated using ((select auth.uid()) = user_id or status = 'published');

grant select on public.community_profiles, public.contributor_badges to anon, authenticated;
grant select, insert, update on public.community_profiles to authenticated;
grant select on public.contribution_impact_events to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-media-inbox', 'community-media-inbox', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-profile-avatars', 'community-profile-avatars', true, 768000,
  array['image/jpeg', 'image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
