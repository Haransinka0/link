-- 1. Create Projects Table
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

-- 2. Create Project Members Table (for role and access tracking)
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member',
  added_at timestamptz not null default now(),
  unique(project_id, user_id)
);

-- 3. Update Templates Table to reference Projects
alter table public.post_templates add column if not exists project_id uuid references public.projects(id) on delete cascade;

-- 4. Enable Row Level Security (RLS)
alter table public.projects enable row level security;
alter table public.project_members enable row level security;

-- 5. Basic RLS for projects
drop policy if exists "projects_select_auth" on public.projects;
create policy "projects_select_auth" on public.projects for select using (auth.uid() is not null);
drop policy if exists "projects_insert_auth" on public.projects;
create policy "projects_insert_auth" on public.projects for insert with check (auth.uid() is not null);
drop policy if exists "projects_update_auth" on public.projects;
create policy "projects_update_auth" on public.projects for update using (auth.uid() is not null);
drop policy if exists "projects_delete_auth" on public.projects;
create policy "projects_delete_auth" on public.projects for delete using (auth.uid() is not null);

-- 6. Basic RLS for project members
drop policy if exists "members_select_auth" on public.project_members;
create policy "members_select_auth" on public.project_members for select using (auth.uid() is not null);
drop policy if exists "members_insert_auth" on public.project_members;
create policy "members_insert_auth" on public.project_members for insert with check (auth.uid() is not null);
drop policy if exists "members_update_auth" on public.project_members;
create policy "members_update_auth" on public.project_members for update using (auth.uid() is not null);
drop policy if exists "members_delete_auth" on public.project_members;
create policy "members_delete_auth" on public.project_members for delete using (auth.uid() is not null);
