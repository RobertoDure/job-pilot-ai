-- JobPilot AI schema.
-- Jobs are ingested from real, public job-board APIs at runtime and stored
-- PER USER, keyed by (user_id, id). Uploading a new CV deletes the user's old
-- jobs and stores fresh ones for the new profile.
--
-- Applications are decoupled from the job catalog: each row keeps its own
-- job_data JSON snapshot, so tracked applications survive a CV re-upload and
-- remain visible in the command center even when the underlying posting is
-- not fetched again.
--
-- Apply this file once in the Supabase SQL Editor (or via the Management API).
--
-- This file is idempotent: the CREATE IF NOT EXISTS statements cover fresh
-- installs and the migration block below upgrades a legacy shared job catalog
-- (single-column primary key on id) to the per-user model.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Applications carry a job_data snapshot so they are self-contained and do not
-- depend on the jobs table staying around after a job-catalog rebuild.
create table if not exists public.applications (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id text not null,
  status text not null default 'recommended',
  match_score integer not null default 0,
  notes text,
  job_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user_id_idx on public.applications (user_id);
create index if not exists jobs_user_id_idx on public.jobs (user_id);

-- ---------------------------------------------------------------------------
-- Migration: legacy shared job catalog -> per-user jobs (idempotent).
-- ---------------------------------------------------------------------------

-- 0. Give each application a self-contained job snapshot (newer rows set this
--    on write; this backfills rows created before the column existed).
alter table public.applications add column if not exists job_data jsonb;

-- 1. Add user_id if missing, then clear rows that cannot be attributed to a
--    user (legacy shared/mock rows). Their applications cascade-delete.
alter table public.jobs add column if not exists user_id uuid;
delete from public.jobs where user_id is null;
alter table public.jobs alter column user_id set not null;

-- 2. Detach the applications foreign key before re-keying jobs.
alter table public.applications drop constraint if exists applications_job_fkey;
alter table public.applications drop constraint if exists applications_job_id_fkey;

-- 3. Re-key jobs on (user_id, id).
alter table public.jobs drop constraint if exists jobs_pkey;
alter table public.jobs add constraint jobs_pkey primary key (user_id, id);

-- 4. Backfill job snapshots from the current job catalog for any applications
--    that predate the job_data column.
update public.applications a
set job_data = j.data
from public.jobs j
where a.job_data is null
  and j.user_id = a.user_id
  and j.id = a.job_id;

-- Applications intentionally stay decoupled from jobs after this point so a
-- future CV re-upload (which deletes the old job catalog) does not cascade
-- into the tracked pipeline.

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

alter table public.jobs enable row level security;

alter table public.applications enable row level security;

drop policy if exists "profiles_own_access" on public.profiles;
create policy "profiles_own_access" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Per-user jobs: each user can only read/write their own rows.
drop policy if exists "jobs_own_access" on public.jobs;
create policy "jobs_own_access" on public.jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Remove the old shared-catalog job policies.
drop policy if exists "jobs_read_authenticated" on public.jobs;
drop policy if exists "jobs_insert_authenticated" on public.jobs;
drop policy if exists "jobs_update_authenticated" on public.jobs;
drop policy if exists "jobs_delete_authenticated" on public.jobs;

drop policy if exists "applications_own_access" on public.applications;
create policy "applications_own_access" on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Remove any legacy mock rows from an earlier seed. Real jobs use source-prefixed
-- ids (remotive-*, arbeitnow-*, jobicy-*, themuse-*, adzuna-*, jooble-*).
delete from public.jobs where id like 'job-java-%';
delete from public.applications where job_id like 'job-java-%';
