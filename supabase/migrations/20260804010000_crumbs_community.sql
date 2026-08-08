-- AuditMap Crumbs: location-aware contributions, moderated media, and trust-first recognition.

alter table public.contributions
add column if not exists latitude double precision;
alter table public.contributions
add column if not exists longitude double precision;
alter table public.contributions
add column if not exists location_scope text not null default 'place';
alter table public.contributions
add column if not exists location_accuracy_meters numeric(10, 2);
alter table public.contributions
add column if not exists observed_at timestamptz;
alter table public.contributions
add column if not exists fresh_until timestamptz;
alter table public.contributions
add column if not exists verification_status text not null default 'unverified';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contributions_location_scope_check'
  ) then
    alter table public.contributions add constraint contributions_location_scope_check
      check (location_scope in ('place', 'feature', 'pin'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'contributions_coordinates_check'
  ) then
    alter table public.contributions add constraint contributions_coordinates_check
      check (
        (latitude is null and longitude is null) or
        (latitude between -90 and 90 and longitude between -180 and 180)
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'contributions_verification_status_check'
  ) then
    alter table public.contributions add constraint contributions_verification_status_check
      check (verification_status in ('unverified', 'supported', 'verified', 'outdated'));
  end if;
end $$;

alter table public.media
add column if not exists contribution_id uuid references public.contributions(id) on delete cascade;
alter table public.media
add column if not exists feature_id uuid references public.place_features(id) on delete set null;
alter table public.media
add column if not exists media_kind text not null default 'photo';
alter table public.media
add column if not exists mime_type text;
alter table public.media
add column if not exists width integer;
alter table public.media
add column if not exists height integer;
alter table public.media
add column if not exists byte_size bigint;
alter table public.media
add column if not exists checksum text;
alter table public.media
add column if not exists storage_state text not null default 'intent';
alter table public.media
add column if not exists captured_at timestamptz;
alter table public.media
add column if not exists preview_path text;
alter table public.media
add column if not exists derivative_path text;
alter table public.media
add column if not exists expires_at timestamptz not null default (timezone('utc', now()) + interval '24 hours');
alter table public.media
add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'media_kind_check'
  ) then
    alter table public.media add constraint media_kind_check
      check (media_kind in ('photo', 'panorama', 'photo_360'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'media_storage_state_check'
  ) then
    alter table public.media add constraint media_storage_state_check
      check (storage_state in ('intent', 'uploaded', 'processing', 'ready', 'published', 'rejected', 'abandoned'));
  end if;
end $$;

create table if not exists public.community_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_slug text not null unique,
  display_name text not null check (char_length(display_name) between 2 and 40),
  profile_status text not null default 'public'
    check (profile_status in ('public', 'private', 'suspended')),
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
create trigger set_community_profiles_updated_at
before update on public.community_profiles
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
values (
  'community-media-inbox',
  'community-media-inbox',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
