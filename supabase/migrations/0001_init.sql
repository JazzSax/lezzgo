-- Lezzgo — initial schema, RLS, and auth trigger
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  base_name text,
  base_lat double precision,
  base_lng double precision,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.plan_shares (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  shared_with uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'viewer',
  status text not null default 'pending', -- pending | accepted | declined
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (plan_id, shared_with)
);

create table if not exists public.days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  day_number int not null,
  title text,
  date date,
  created_at timestamptz not null default now()
);

create table if not exists public.stops (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days (id) on delete cascade,
  position int not null default 0,
  name text not null,
  label text,
  lat double precision not null,
  lng double precision not null,
  notes text,
  arrival_time time,        -- reserved for Phase 2 timing (unused in MVP UI)
  dwell_minutes int,        -- reserved for Phase 2 timing (unused in MVP UI)
  created_at timestamptz not null default now()
);

create table if not exists public.nearby_places (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  category text not null default 'general',
  name text not null,
  lat double precision not null,
  lng double precision not null,
  notes text,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_plans_owner on public.plans (owner_id);
create index if not exists idx_shares_shared_with on public.plan_shares (shared_with);
create index if not exists idx_shares_plan on public.plan_shares (plan_id);
create index if not exists idx_days_plan on public.days (plan_id);
create index if not exists idx_stops_day on public.stops (day_id);
create index if not exists idx_nearby_plan on public.nearby_places (plan_id);

-- ---------------------------------------------------------------------------
-- Access helpers (SECURITY DEFINER so they bypass RLS and cannot recurse)
-- ---------------------------------------------------------------------------

create or replace function public.is_plan_owner(pid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.plans where id = pid and owner_id = auth.uid()
  );
$$;

create or replace function public.can_view_plan(pid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.plans where id = pid and owner_id = auth.uid()
  ) or exists (
    select 1 from public.plan_shares
    where plan_id = pid and shared_with = auth.uid() and status = 'accepted'
  );
$$;

create or replace function public.day_plan(did uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select plan_id from public.days where id = did;
$$;

-- Returns pending invites for the current user with just enough plan metadata
-- to render an invite card (title + owner). Deliberately does NOT expose stops.
create or replace function public.get_pending_invites()
returns table (
  share_id uuid,
  plan_id uuid,
  plan_title text,
  start_date date,
  end_date date,
  owner_name text,
  owner_avatar text,
  invited_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select s.id, p.id, p.title, p.start_date, p.end_date,
         pr.display_name, pr.avatar_url, s.created_at
  from public.plan_shares s
  join public.plans p on p.id = s.plan_id
  join public.profiles pr on pr.id = p.owner_id
  where s.shared_with = auth.uid() and s.status = 'pending'
  order by s.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Auth trigger: mirror new auth.users into profiles (with OAuth avatar/name)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    new.email
  )
  on conflict (id) do update set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    email = coalesce(excluded.email, public.profiles.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

-- Grant base table privileges to the authenticated role. RLS still restricts
-- WHICH rows each user can touch; without the grant, PostgREST would reject
-- the request before RLS is even evaluated.
grant usage on schema public to authenticated;
grant select, insert, update, delete
  on public.profiles, public.plans, public.plan_shares,
     public.days, public.stops, public.nearby_places
  to authenticated;

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.plan_shares enable row level security;
alter table public.days enable row level security;
alter table public.stops enable row level security;
alter table public.nearby_places enable row level security;

-- profiles: any authenticated user can read (to render shared members' avatars);
-- users may only write their own row.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- plans
drop policy if exists plans_select on public.plans;
create policy plans_select on public.plans
  for select to authenticated using (public.can_view_plan(id));

drop policy if exists plans_insert on public.plans;
create policy plans_insert on public.plans
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists plans_update on public.plans;
create policy plans_update on public.plans
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists plans_delete on public.plans;
create policy plans_delete on public.plans
  for delete to authenticated using (owner_id = auth.uid());

-- plan_shares
drop policy if exists shares_select on public.plan_shares;
create policy shares_select on public.plan_shares
  for select to authenticated
  using (shared_with = auth.uid() or public.is_plan_owner(plan_id));

drop policy if exists shares_insert on public.plan_shares;
create policy shares_insert on public.plan_shares
  for insert to authenticated
  with check (public.is_plan_owner(plan_id) and invited_by = auth.uid());

-- invited user may accept/decline (update their own row); owner may update too.
drop policy if exists shares_update on public.plan_shares;
create policy shares_update on public.plan_shares
  for update to authenticated
  using (shared_with = auth.uid() or public.is_plan_owner(plan_id))
  with check (shared_with = auth.uid() or public.is_plan_owner(plan_id));

-- owner removes a share; a member may remove (leave) their own.
drop policy if exists shares_delete on public.plan_shares;
create policy shares_delete on public.plan_shares
  for delete to authenticated
  using (public.is_plan_owner(plan_id) or shared_with = auth.uid());

-- days
drop policy if exists days_select on public.days;
create policy days_select on public.days
  for select to authenticated using (public.can_view_plan(plan_id));

drop policy if exists days_write on public.days;
create policy days_write on public.days
  for all to authenticated
  using (public.is_plan_owner(plan_id))
  with check (public.is_plan_owner(plan_id));

-- stops (parent plan resolved via day_plan())
drop policy if exists stops_select on public.stops;
create policy stops_select on public.stops
  for select to authenticated using (public.can_view_plan(public.day_plan(day_id)));

drop policy if exists stops_write on public.stops;
create policy stops_write on public.stops
  for all to authenticated
  using (public.is_plan_owner(public.day_plan(day_id)))
  with check (public.is_plan_owner(public.day_plan(day_id)));

-- nearby_places
drop policy if exists nearby_select on public.nearby_places;
create policy nearby_select on public.nearby_places
  for select to authenticated using (public.can_view_plan(plan_id));

drop policy if exists nearby_write on public.nearby_places;
create policy nearby_write on public.nearby_places
  for all to authenticated
  using (public.is_plan_owner(plan_id))
  with check (public.is_plan_owner(plan_id));
