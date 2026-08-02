-- Public sharing: a plan can be marked public (viewable by anyone with the
-- link, unauthenticated). Public viewers see only NON-personal data
-- (title, base, days, stops, nearby places) — never owner/member profiles.

alter table public.plans
  add column if not exists is_public boolean not null default false;

-- SECURITY DEFINER helper (bypasses RLS → no recursion).
create or replace function public.is_plan_public(pid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.plans where id = pid and is_public);
$$;

-- Let the anonymous role read public plan data (table privileges; RLS below
-- restricts to public rows only).
grant usage on schema public to anon;
grant select on
  public.plans, public.days, public.stops, public.nearby_places
  to anon;

-- Public-read policies. These are additive/permissive: for authenticated users
-- they OR with the existing owner/member policies; for anon they are the only
-- way in, and only for public plans. profiles is intentionally NOT exposed.
drop policy if exists plans_public_read on public.plans;
create policy plans_public_read on public.plans
  for select to anon, authenticated using (is_public);

drop policy if exists days_public_read on public.days;
create policy days_public_read on public.days
  for select to anon, authenticated using (public.is_plan_public(plan_id));

drop policy if exists stops_public_read on public.stops;
create policy stops_public_read on public.stops
  for select to anon, authenticated
  using (public.is_plan_public(public.day_plan(day_id)));

drop policy if exists nearby_public_read on public.nearby_places;
create policy nearby_public_read on public.nearby_places
  for select to anon, authenticated using (public.is_plan_public(plan_id));
