-- Community safety: attributable reports, account suspension, and moderation history.

alter table public.reports
add column if not exists target_type text not null default 'place';
alter table public.reports
add column if not exists contribution_id uuid references public.contributions(id) on delete set null;
alter table public.reports
add column if not exists reported_user_id uuid references auth.users(id) on delete set null;
alter table public.reports
add column if not exists details text;
alter table public.reports
add column if not exists reporter_hash text;
alter table public.reports
add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.reports
add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reports_target_type_check'
  ) then
    alter table public.reports add constraint reports_target_type_check
      check (target_type in ('place', 'contribution', 'profile', 'media'));
  end if;
end $$;

create index if not exists reports_status_created_idx
on public.reports (status, created_at desc);
create index if not exists reports_contribution_idx
on public.reports (contribution_id, status);
create index if not exists reports_reported_user_idx
on public.reports (reported_user_id, status);

