-- LinkedPost Supabase schema
-- Run this in the Supabase SQL Editor.
-- This matches the current app:
-- - Microsoft login
-- - Dashboard
-- - Templates
-- - Scheduler
-- - Calendar
-- - History
-- - Analytics

create extension if not exists pgcrypto;

-- Drop old objects
drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.update_updated_at_column() cascade;

drop table if exists public.approval_events cascade;
drop table if exists public.post_templates cascade;
drop table if exists public.users cascade;

-- Users
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  role text not null default 'employee' check (role in ('employee', 'admin', 'manager')),
  microsoft_id text unique,
  linkedin_urn text,
  linkedin_access_token text,
  linkedin_connected boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Templates / posts
create table public.post_templates (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.users(id) on delete cascade,
  title text not null,
  body text not null,
  hashtags text[] not null default '{}',
  tone text default 'professional',
  image_url text,
  ai_generated boolean not null default false,
  status text not null default 'pending_review' check (
    status in ('draft', 'pending_review', 'approved', 'rejected', 'scheduled', 'published', 'failed')
  ),
  rejection_reason text,
  scheduled_at timestamptz,
  published_at timestamptz,
  linkedin_post_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Approval / audit trail
create table public.approval_events (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.post_templates(id) on delete cascade,
  reviewer_id uuid not null references public.users(id) on delete cascade,
  action text not null check (action in ('submitted', 'approved', 'rejected', 'scheduled', 'published', 'failed', 'cancelled')),
  comment text,
  acted_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_microsoft_id on public.users(microsoft_id);
create index if not exists idx_post_templates_created_by on public.post_templates(created_by);
create index if not exists idx_post_templates_status on public.post_templates(status);
create index if not exists idx_post_templates_scheduled_at on public.post_templates(scheduled_at);
create index if not exists idx_post_templates_published_at on public.post_templates(published_at);
create index if not exists idx_approval_events_template_id on public.approval_events(template_id);

-- updated_at trigger
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_users_updated_at
before update on public.users
for each row
execute procedure public.update_updated_at_column();

create trigger update_post_templates_updated_at
before update on public.post_templates
for each row
execute procedure public.update_updated_at_column();

-- Auto-create a public.users row when a Supabase auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    name,
    role,
    microsoft_id
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'employee'),
    new.raw_user_meta_data->>'microsoft_id'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = coalesce(excluded.name, public.users.name),
    microsoft_id = coalesce(excluded.microsoft_id, public.users.microsoft_id);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- RLS
alter table public.users enable row level security;
alter table public.post_templates enable row level security;
alter table public.approval_events enable row level security;

-- Remove old policies if rerunning
drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_select_admin_manager" on public.users;
drop policy if exists "users_insert_own" on public.users;
drop policy if exists "users_update_own" on public.users;
drop policy if exists "users_update_admin" on public.users;

drop policy if exists "templates_select_own" on public.post_templates;
drop policy if exists "templates_select_admin_manager" on public.post_templates;
drop policy if exists "templates_insert_own" on public.post_templates;
drop policy if exists "templates_update_own" on public.post_templates;
drop policy if exists "templates_update_admin_manager" on public.post_templates;
drop policy if exists "templates_delete_own" on public.post_templates;
drop policy if exists "templates_delete_admin_manager" on public.post_templates;

drop policy if exists "approval_events_select_auth" on public.approval_events;
drop policy if exists "approval_events_insert_auth" on public.approval_events;

-- Users policies
create policy "users_select_own"
on public.users
for select
using (auth.uid() = id);

create policy "users_select_admin_manager"
on public.users
for select
using (auth.uid() is not null);

create policy "users_insert_own"
on public.users
for insert
with check (auth.uid() = id);

create policy "users_update_own"
on public.users
for update
using (auth.uid() = id);

create policy "users_update_admin"
on public.users
for update
using (auth.uid() is not null);

-- Template policies
create policy "templates_select_own"
on public.post_templates
for select
using (auth.uid() = created_by);

create policy "templates_select_admin_manager"
on public.post_templates
for select
using (auth.uid() is not null);

create policy "templates_insert_own"
on public.post_templates
for insert
with check (auth.uid() = created_by);

create policy "templates_update_own"
on public.post_templates
for update
using (auth.uid() = created_by);

create policy "templates_update_admin_manager"
on public.post_templates
for update
using (auth.uid() is not null);

create policy "templates_delete_own"
on public.post_templates
for delete
using (auth.uid() = created_by);

create policy "templates_delete_admin_manager"
on public.post_templates
for delete
using (auth.uid() is not null);

-- Approval events policies
create policy "approval_events_select_auth"
on public.approval_events
for select
using (auth.uid() is not null);

create policy "approval_events_insert_auth"
on public.approval_events
for insert
with check (auth.uid() is not null);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  description text,
  status text not null default 'planning' check (status in ('planning', 'active', 'completed', 'archived')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  manager_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Project Members
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member',
  added_at timestamptz not null default now(),
  unique(project_id, user_id)
);

-- Add relation to post_templates if missing
alter table public.post_templates add column if not exists project_id uuid references public.projects(id) on delete cascade;

-- Ensure RLS on new tables
alter table public.projects enable row level security;
alter table public.project_members enable row level security;

-- Basic RLS for projects
drop policy if exists "projects_select_auth" on public.projects;
create policy "projects_select_auth" on public.projects for select using (auth.uid() is not null);
drop policy if exists "projects_insert_auth" on public.projects;
create policy "projects_insert_auth" on public.projects for insert with check (auth.uid() is not null);
drop policy if exists "projects_update_auth" on public.projects;
create policy "projects_update_auth" on public.projects for update using (auth.uid() is not null);
drop policy if exists "projects_delete_auth" on public.projects;
create policy "projects_delete_auth" on public.projects for delete using (auth.uid() is not null);

-- Basic RLS for project members
drop policy if exists "members_select_auth" on public.project_members;
create policy "members_select_auth" on public.project_members for select using (auth.uid() is not null);
drop policy if exists "members_insert_auth" on public.project_members;
create policy "members_insert_auth" on public.project_members for insert with check (auth.uid() is not null);
drop policy if exists "members_update_auth" on public.project_members;
create policy "members_update_auth" on public.project_members for update using (auth.uid() is not null);
drop policy if exists "members_delete_auth" on public.project_members;
create policy "members_delete_auth" on public.project_members for delete using (auth.uid() is not null);

