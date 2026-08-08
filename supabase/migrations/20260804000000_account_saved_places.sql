create table if not exists public.user_saved_places (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  place_id text not null check (char_length(place_id) between 1 and 160),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, place_id)
);

alter table public.user_saved_places enable row level security;

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

grant select, insert, delete on public.user_saved_places to authenticated;
grant execute on function public.replace_user_saved_places(text[]) to authenticated;
