-- Phase 1: regions + rabbinic/political/period taxonomy

create table public.regions (
  id uuid primary key default gen_random_uuid(),
  parent_region_id uuid references public.regions (id) on delete set null,
  code text not null unique,
  name_he text not null,
  region_kind text not null default 'historical_area',
  notes text,
  lifecycle_status public.lifecycle_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint regions_code_nonempty check (length(trim(code)) > 0),
  constraint regions_name_nonempty check (length(trim(name_he)) > 0)
);

create index regions_parent_idx on public.regions (parent_region_id);
create index regions_lifecycle_idx on public.regions (lifecycle_status);

create table public.rabbinic_generations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_he text not null,
  sequence_index int not null,
  parent_generation_id uuid references public.rabbinic_generations (id) on delete set null,
  notes text,
  lifecycle_status public.lifecycle_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint rabbinic_generations_code_nonempty check (length(trim(code)) > 0)
);

create unique index rabbinic_generations_sequence_uidx
  on public.rabbinic_generations (sequence_index);

create table public.political_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_he text not null,
  start_year int,
  end_year int,
  time_precision public.time_precision not null default 'unknown',
  knowledge_state public.knowledge_state not null default 'unknown',
  textual_label text,
  notes text,
  lifecycle_status public.lifecycle_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create table public.historical_periods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_he text not null,
  start_year int,
  end_year int,
  time_precision public.time_precision not null default 'unknown',
  knowledge_state public.knowledge_state not null default 'unknown',
  textual_label text,
  overview text,
  lifecycle_status public.lifecycle_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create table public.historical_episodes (
  id uuid primary key default gen_random_uuid(),
  name_he text not null,
  period_id uuid references public.historical_periods (id) on delete set null,
  start_year int,
  end_year int,
  time_precision public.time_precision not null default 'unknown',
  knowledge_state public.knowledge_state not null default 'unknown',
  textual_label text,
  overview text,
  lifecycle_status public.lifecycle_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create table public.historical_events (
  id uuid primary key default gen_random_uuid(),
  name_he text not null,
  episode_id uuid references public.historical_episodes (id) on delete set null,
  period_id uuid references public.historical_periods (id) on delete set null,
  start_year int,
  end_year int,
  time_precision public.time_precision not null default 'unknown',
  knowledge_state public.knowledge_state not null default 'unknown',
  textual_label text,
  overview text,
  lifecycle_status public.lifecycle_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null
);

create index historical_episodes_period_idx on public.historical_episodes (period_id);
create index historical_events_episode_idx on public.historical_events (episode_id);
create index historical_events_period_idx on public.historical_events (period_id);
