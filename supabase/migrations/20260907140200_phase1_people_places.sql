-- Phase 1: people, names, chronology inputs, places, region links

create table public.people (
  id uuid primary key default gen_random_uuid(),
  primary_display_name text not null,
  sort_name text not null,
  title_honorific text,
  short_identity_description text,
  disambiguation_label text,
  biography_md text,
  prominence_score numeric,
  prominence_override boolean not null default false,
  identity_status public.identity_status not null default 'resolved',
  lifecycle_status public.lifecycle_status not null default 'draft',
  published_aggregate_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint people_display_name_nonempty check (length(trim(primary_display_name)) > 0),
  constraint people_sort_name_nonempty check (length(trim(sort_name)) > 0)
);

create index people_sort_name_idx on public.people (sort_name);
create index people_sort_name_trgm_idx on public.people using gin (sort_name gin_trgm_ops);
create index people_display_trgm_idx on public.people using gin (primary_display_name gin_trgm_ops);
create index people_lifecycle_idx on public.people (lifecycle_status);

create table public.person_names (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  name_text text not null,
  name_kind public.name_kind not null,
  normalized_name text not null,
  script_hint text,
  is_searchable boolean not null default true,
  created_at timestamptz not null default now(),
  constraint person_names_text_nonempty check (length(trim(name_text)) > 0),
  unique (person_id, name_kind, normalized_name)
);

create index person_names_normalized_trgm_idx
  on public.person_names using gin (normalized_name gin_trgm_ops);
create index person_names_person_idx on public.person_names (person_id);

create table public.person_time_ranges (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  range_kind public.time_range_kind not null,
  start_year int,
  end_year int,
  time_precision public.time_precision not null default 'unknown',
  knowledge_state public.knowledge_state not null default 'unknown',
  textual_label text,
  editorial_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint person_time_ranges_bounds check (
    start_year is null or end_year is null or start_year <= end_year
  )
);

create index person_time_ranges_person_idx on public.person_time_ranges (person_id);

create table public.person_generation_memberships (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  generation_id uuid not null references public.rabbinic_generations (id) on delete restrict,
  is_primary boolean not null default false,
  knowledge_state public.knowledge_state not null default 'unknown',
  editorial_note text,
  created_at timestamptz not null default now(),
  unique (person_id, generation_id)
);

create index person_generation_memberships_person_idx
  on public.person_generation_memberships (person_id);

create table public.person_chronology_editorial (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  generation_id uuid references public.rabbinic_generations (id) on delete set null,
  band public.chronology_band not null default 'unresolved',
  activity_portion text,
  continues_into_next boolean not null default false,
  spans_multiple boolean not null default false,
  free_text_note text,
  knowledge_state public.knowledge_state not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index person_chronology_editorial_person_idx
  on public.person_chronology_editorial (person_id);

create table public.person_chronology_constraints (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  related_person_id uuid not null references public.people (id) on delete cascade,
  constraint_kind public.chronology_constraint_kind not null,
  knowledge_state public.knowledge_state not null default 'unknown',
  editorial_note text,
  created_at timestamptz not null default now(),
  constraint person_chronology_constraints_not_self check (person_id <> related_person_id),
  unique (person_id, related_person_id, constraint_kind)
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  primary_historical_name text not null,
  sort_name text not null,
  notes text,
  lifecycle_status public.lifecycle_status not null default 'draft',
  published_aggregate_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint places_name_nonempty check (length(trim(primary_historical_name)) > 0),
  constraint places_sort_nonempty check (length(trim(sort_name)) > 0)
);

create index places_sort_trgm_idx on public.places using gin (sort_name gin_trgm_ops);
create index places_lifecycle_idx on public.places (lifecycle_status);

create table public.place_identifications (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  modern_name text,
  latitude double precision,
  longitude double precision,
  location_certainty public.knowledge_state not null default 'unknown',
  is_preferred boolean not null default false,
  editorial_note text,
  created_at timestamptz not null default now()
);

create unique index place_identifications_one_preferred_uidx
  on public.place_identifications (place_id)
  where is_preferred;

create table public.place_regions (
  place_id uuid not null references public.places (id) on delete cascade,
  region_id uuid not null references public.regions (id) on delete cascade,
  is_primary boolean not null default false,
  primary key (place_id, region_id)
);

create table public.person_places (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete restrict,
  association_note text,
  knowledge_state public.knowledge_state not null default 'unknown',
  created_at timestamptz not null default now(),
  unique (person_id, place_id)
);

create table public.person_periods (
  person_id uuid not null references public.people (id) on delete cascade,
  period_id uuid not null references public.historical_periods (id) on delete cascade,
  knowledge_state public.knowledge_state not null default 'unknown',
  primary key (person_id, period_id)
);

create table public.person_episodes (
  person_id uuid not null references public.people (id) on delete cascade,
  episode_id uuid not null references public.historical_episodes (id) on delete cascade,
  knowledge_state public.knowledge_state not null default 'unknown',
  primary key (person_id, episode_id)
);

create table public.person_events (
  person_id uuid not null references public.people (id) on delete cascade,
  event_id uuid not null references public.historical_events (id) on delete cascade,
  knowledge_state public.knowledge_state not null default 'unknown',
  primary key (person_id, event_id)
);

create table public.entity_resolution_candidates (
  id uuid primary key default gen_random_uuid(),
  left_person_id uuid not null references public.people (id) on delete cascade,
  right_person_id uuid not null references public.people (id) on delete cascade,
  status text not null default 'open',
  rationale text,
  created_at timestamptz not null default now(),
  constraint entity_resolution_not_self check (left_person_id <> right_person_id),
  constraint entity_resolution_ordered check (left_person_id < right_person_id),
  unique (left_person_id, right_person_id)
);

create table public.entity_redirects (
  from_person_id uuid primary key references public.people (id) on delete cascade,
  to_person_id uuid not null references public.people (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint entity_redirects_not_self check (from_person_id <> to_person_id)
);
