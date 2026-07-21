create extension if not exists pgcrypto;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  type text not null,
  city text not null,
  state text not null,
  address text not null,
  latitude double precision,
  longitude double precision,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  author_name text,
  rating numeric(2, 1) not null check (rating >= 1 and rating <= 5),
  summary text not null,
  comment text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.institutions
add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.reviews
add column if not exists updated_at timestamptz not null default timezone('utc', now());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_institutions_updated_at on public.institutions;
create trigger set_institutions_updated_at
before update on public.institutions
for each row
execute function public.set_updated_at();

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at
before update on public.reviews
for each row
execute function public.set_updated_at();

alter table public.institutions enable row level security;
alter table public.reviews enable row level security;

create policy "Public can read institutions"
on public.institutions
for select
to anon, authenticated
using (true);

create policy "Authenticated users can create institutions"
on public.institutions
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update their own institutions" on public.institutions;
create policy "Authenticated users can update their own institutions"
on public.institutions
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "Public can read reviews"
on public.reviews
for select
to anon, authenticated
using (true);

create policy "Authenticated users can create reviews"
on public.reviews
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can update their own reviews" on public.reviews;
create policy "Authenticated users can update their own reviews"
on public.reviews
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
