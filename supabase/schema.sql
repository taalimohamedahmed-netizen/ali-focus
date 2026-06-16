-- Ali Focus V2 — Supabase schema
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: uses "if not exists" / idempotent guards where possible.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- users  (simple name + password login, NOT Supabase Auth)
-- ---------------------------------------------------------------------------
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  password    text not null,
  created_at  timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid references users(id) on delete set null,
  created_at  timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- day_plans  (one plan per calendar date, shared by the whole team)
-- ---------------------------------------------------------------------------
create table if not exists day_plans (
  id              uuid primary key default gen_random_uuid(),
  work_date       date unique not null,
  target_minutes  integer not null default 0,
  created_by      uuid references users(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- sessions  (manual focus blocks under a day plan)
-- ---------------------------------------------------------------------------
create table if not exists sessions (
  id                uuid primary key default gen_random_uuid(),
  day_plan_id       uuid references day_plans(id) on delete cascade,
  title             text not null,
  duration_minutes  integer not null default 0,
  completed_minutes integer not null default 0,
  status            text not null default 'not_started'
                      check (status in ('not_started','running','paused','completed')),
  started_by        uuid references users(id) on delete set null,
  started_at        timestamptz,
  paused_by         uuid references users(id) on delete set null,
  paused_at         timestamptz,
  finished_by       uuid references users(id) on delete set null,
  finished_at       timestamptz,
  created_at        timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table if not exists tasks (
  id            uuid primary key default gen_random_uuid(),
  work_date     date not null,
  project_id    uuid references projects(id) on delete set null,
  project_name  text,
  title         text not null,
  priority      text not null default 'medium' check (priority in ('high','medium','low')),
  type          text not null default 'optional' check (type in ('must_finish','optional')),
  status        text not null default 'open' check (status in ('open','completed')),
  created_by    uuid references users(id) on delete set null,
  completed_by  uuid references users(id) on delete set null,
  completed_at  timestamptz,
  created_at    timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- deadlines
-- ---------------------------------------------------------------------------
create table if not exists deadlines (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references projects(id) on delete set null,
  project_name  text,
  title         text not null,
  priority      text not null default 'medium' check (priority in ('high','medium','low')),
  status        text not null default 'open' check (status in ('open','completed')),
  deadline_date date not null,
  created_by    uuid references users(id) on delete set null,
  completed_by  uuid references users(id) on delete set null,
  completed_at  timestamptz,
  created_at    timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- daily_notes  (one shared note per date)
-- ---------------------------------------------------------------------------
create table if not exists daily_notes (
  id          uuid primary key default gen_random_uuid(),
  work_date   date unique not null,
  content     text default '',
  updated_by  uuid references users(id) on delete set null,
  updated_at  timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- activity_log  (who did what)
-- ---------------------------------------------------------------------------
create table if not exists activity_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  created_at  timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- This is a SHARED team workspace with no Supabase Auth. The anon key is the
-- only credential, so we allow it full access. Do NOT store sensitive data.
-- ---------------------------------------------------------------------------
alter table users        disable row level security;
alter table projects     disable row level security;
alter table day_plans    disable row level security;
alter table sessions     disable row level security;
alter table tasks        disable row level security;
alter table deadlines    disable row level security;
alter table daily_notes  disable row level security;
alter table activity_log disable row level security;

-- ---------------------------------------------------------------------------
-- Seed default projects only if the table is empty
-- ---------------------------------------------------------------------------
insert into projects (name)
select v.name
from (values
  ('GG Theme'),
  ('Client Theme 2'),
  ('Client Theme 3'),
  ('English'),
  ('AI Automation'),
  ('Portfolio')
) as v(name)
where not exists (select 1 from projects);
