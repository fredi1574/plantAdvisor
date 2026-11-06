-- ============================================================================
-- FloraLog — Supabase PostgreSQL Schema, Profiles, Indexes, RLS & Storage
-- Run this script in your Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================================

-- 0. USER PROFILES (1:1 with `auth.users`)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default 'Gardener',
  experience_level text not null default 'enthusiast' check (
    experience_level in ('beginner', 'enthusiast', 'master_gardener')
  ),
  bio text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated
  using ((select auth.uid()) = id);

-- Automatic profile creation trigger when a new user signs up in `auth.users`
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, experience_level)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      split_part(coalesce(new.email, 'Gardener'), '@', 1)
    ),
    case
      when new.raw_user_meta_data->>'experience_level' in ('beginner', 'enthusiast', 'master_gardener')
        then new.raw_user_meta_data->>'experience_level'
      else 'enthusiast'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Prevent direct RPC invocation of the trigger function by public roles
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 1. SPECIES CATALOG
create table if not exists public.species_catalog (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  common_name text not null,
  scientific_name text not null,
  family text not null,
  plant_type text not null check (plant_type in ('succulent', 'foliage', 'propagation', 'flowering')),
  baseline_care jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists species_catalog_user_id_idx on public.species_catalog (user_id);
create index if not exists species_catalog_scientific_name_idx on public.species_catalog (scientific_name);

-- 2. USER PLANTS
create table if not exists public.user_plants (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  species_id text references public.species_catalog(id) on delete restrict,
  nickname text not null,
  species_snapshot jsonb not null,
  photo_uri text not null,
  acquired_at timestamptz not null default now(),
  location text not null,
  is_indoor boolean not null default true,
  light_exposure text not null check (
    light_exposure in ('bright_direct', 'bright_indirect', 'medium_filtered', 'low_shade', 'grow_light')
  ),
  has_drainage_hole boolean not null default true,
  pot_material text not null check (
    pot_material in ('terracotta', 'ceramic_glazed', 'plastic_nursery', 'glass_vessel', 'fabric_grow_bag')
  ),
  last_watered_at timestamptz not null default now(),
  custom_watering_interval_days integer not null default 7 check (custom_watering_interval_days >= 1),
  latest_health_assessment jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_plants_user_id_idx on public.user_plants (user_id);
create index if not exists user_plants_species_id_idx on public.user_plants (species_id);
create index if not exists user_plants_last_watered_at_idx on public.user_plants (last_watered_at);

-- 3. NOTEBOOK ENTRIES (Care & Propagation Logs)
create table if not exists public.notebook_entries (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  plant_id text not null references public.user_plants(id) on delete cascade,
  event_type text not null check (
    event_type in ('water', 'fertilize', 'repot', 'prune', 'propagation', 'note', 'ai_scan')
  ),
  timestamp timestamptz not null default now(),
  title text not null,
  notes text not null default '',
  photo_uri text,
  metrics jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notebook_entries_user_id_idx on public.notebook_entries (user_id);
create index if not exists notebook_entries_plant_id_timestamp_idx on public.notebook_entries (plant_id, timestamp desc);

-- 4. HEALTH ASSESSMENTS (AI Scan History)
create table if not exists public.health_assessments (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  plant_id text not null references public.user_plants(id) on delete cascade,
  created_at timestamptz not null default now(),
  image_uri text,
  health_status text not null check (health_status in ('thriving', 'needs_attention', 'critical')),
  detected_symptoms jsonb not null default '[]'::jsonb,
  diagnosis_summary text not null,
  follow_up_questions jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  adjusted_watering_interval_days integer not null check (adjusted_watering_interval_days >= 1),
  succulent_guardrail_applied text
);

create index if not exists health_assessments_user_id_idx on public.health_assessments (user_id);
create index if not exists health_assessments_plant_id_created_at_idx on public.health_assessments (plant_id, created_at desc);

-- ============================================================================
-- 5. DATA API GRANTS & ROW LEVEL SECURITY (RLS)
-- ============================================================================

grant select, insert, update, delete on table public.species_catalog to authenticated;
grant select, insert, update, delete on table public.user_plants to authenticated;
grant select, insert, update, delete on table public.notebook_entries to authenticated;
grant select, insert, update, delete on table public.health_assessments to authenticated;

alter table public.species_catalog enable row level security;
alter table public.user_plants enable row level security;
alter table public.notebook_entries enable row level security;
alter table public.health_assessments enable row level security;

-- Species Catalog Policies (Strict Per-User Ownership)
drop policy if exists "species_catalog_select_policy" on public.species_catalog;
create policy "species_catalog_select_policy" on public.species_catalog
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "species_catalog_insert_policy" on public.species_catalog;
create policy "species_catalog_insert_policy" on public.species_catalog
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "species_catalog_update_policy" on public.species_catalog;
create policy "species_catalog_update_policy" on public.species_catalog
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "species_catalog_delete_policy" on public.species_catalog;
create policy "species_catalog_delete_policy" on public.species_catalog
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- User Plants Policies (Strict Per-User Ownership)
drop policy if exists "user_plants_select_policy" on public.user_plants;
create policy "user_plants_select_policy" on public.user_plants
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_plants_insert_policy" on public.user_plants;
create policy "user_plants_insert_policy" on public.user_plants
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_plants_update_policy" on public.user_plants;
create policy "user_plants_update_policy" on public.user_plants
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_plants_delete_policy" on public.user_plants;
create policy "user_plants_delete_policy" on public.user_plants
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Notebook Entries Policies (Strict Per-User Ownership)
drop policy if exists "notebook_entries_select_policy" on public.notebook_entries;
create policy "notebook_entries_select_policy" on public.notebook_entries
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "notebook_entries_insert_policy" on public.notebook_entries;
create policy "notebook_entries_insert_policy" on public.notebook_entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "notebook_entries_update_policy" on public.notebook_entries;
create policy "notebook_entries_update_policy" on public.notebook_entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "notebook_entries_delete_policy" on public.notebook_entries;
create policy "notebook_entries_delete_policy" on public.notebook_entries
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Health Assessments Policies (Strict Per-User Ownership)
drop policy if exists "health_assessments_select_policy" on public.health_assessments;
create policy "health_assessments_select_policy" on public.health_assessments
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "health_assessments_insert_policy" on public.health_assessments;
create policy "health_assessments_insert_policy" on public.health_assessments
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "health_assessments_update_policy" on public.health_assessments;
create policy "health_assessments_update_policy" on public.health_assessments
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "health_assessments_delete_policy" on public.health_assessments;
create policy "health_assessments_delete_policy" on public.health_assessments
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- 6. STORAGE BUCKET FOR PLANT PHOTOS (`plant-photos`)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;

-- Storage Upsert requires SELECT + INSERT + UPDATE
drop policy if exists "plant_photos_public_select" on storage.objects;
create policy "plant_photos_public_select" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'plant-photos');

drop policy if exists "plant_photos_insert" on storage.objects;
create policy "plant_photos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'plant-photos');

drop policy if exists "plant_photos_update" on storage.objects;
create policy "plant_photos_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'plant-photos')
  with check (bucket_id = 'plant-photos');

drop policy if exists "plant_photos_delete" on storage.objects;
create policy "plant_photos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'plant-photos');
