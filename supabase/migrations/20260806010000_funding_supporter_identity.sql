-- Backer identity is optional: signed-in supporters can receive account history,
-- while guest checkout remains available. Payment status is still written only
-- by trusted server-side webhook handling.
alter table if exists public.funding_interest
add column if not exists supporter_user_id uuid references auth.users(id) on delete set null;

alter table if exists public.funding_contributions
add column if not exists supporter_user_id uuid references auth.users(id) on delete set null;

do $$
begin
  if to_regclass('public.funding_interest') is not null then
    execute 'create index if not exists funding_interest_supporter_idx
      on public.funding_interest (supporter_user_id, created_at desc)
      where supporter_user_id is not null';
  end if;

  if to_regclass('public.funding_contributions') is not null then
    execute 'create index if not exists funding_contributions_supporter_idx
      on public.funding_contributions (supporter_user_id, created_at desc)
      where supporter_user_id is not null';
  end if;
end
$$;
