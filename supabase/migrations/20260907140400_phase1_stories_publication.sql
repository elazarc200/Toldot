-- Phase 1: themes, stories, teachings, revisions, published snapshots

create table public.themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_he text not null unique,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  constraint themes_slug_nonempty check (length(trim(slug)) > 0),
  constraint themes_name_nonempty check (length(trim(name_he)) > 0)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  retelling text not null,
  editorial_explanation text,
  dispute_notes text,
  lifecycle_status public.lifecycle_status not null default 'draft',
  published_aggregate_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint stories_title_nonempty check (length(trim(title)) > 0)
);

create table public.story_people (
  story_id uuid not null references public.stories (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  significance public.narrative_significance not null,
  primary key (story_id, person_id)
);

create table public.story_places (
  story_id uuid not null references public.stories (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  primary key (story_id, place_id)
);

create table public.story_periods (
  story_id uuid not null references public.stories (id) on delete cascade,
  period_id uuid not null references public.historical_periods (id) on delete cascade,
  primary key (story_id, period_id)
);

create table public.story_citations (
  story_id uuid not null references public.stories (id) on delete cascade,
  source_citation_id uuid not null references public.source_citations (id) on delete restrict,
  primary key (story_id, source_citation_id)
);

create table public.story_themes (
  story_id uuid not null references public.stories (id) on delete cascade,
  theme_id uuid not null references public.themes (id) on delete restrict,
  primary key (story_id, theme_id)
);

create table public.selected_teachings (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  teaching_text text not null,
  source_citation_id uuid references public.source_citations (id) on delete restrict,
  editorial_note text,
  lifecycle_status public.lifecycle_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint selected_teachings_text_nonempty check (length(trim(teaching_text)) > 0)
);

create table public.selected_teaching_themes (
  teaching_id uuid not null references public.selected_teachings (id) on delete cascade,
  theme_id uuid not null references public.themes (id) on delete restrict,
  primary key (teaching_id, theme_id)
);

create table public.entity_revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  revision_no int not null,
  snapshot jsonb not null,
  lifecycle_at_save public.lifecycle_status not null,
  change_summary text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  unique (entity_type, entity_id, revision_no)
);

create index entity_revisions_entity_idx
  on public.entity_revisions (entity_type, entity_id);

create table public.published_aggregate_snapshots (
  id uuid primary key default gen_random_uuid(),
  aggregate_type public.aggregate_type not null,
  aggregate_id uuid not null,
  schema_version int not null default 1,
  payload jsonb not null,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users (id) on delete set null,
  source_revision_ids uuid[] not null default '{}',
  is_active boolean not null default false
);

-- At most one active snapshot per aggregate
create unique index published_aggregate_snapshots_active_uidx
  on public.published_aggregate_snapshots (aggregate_type, aggregate_id)
  where is_active;

create index published_aggregate_snapshots_lookup_idx
  on public.published_aggregate_snapshots (aggregate_type, aggregate_id, published_at desc);

-- Wire people/places/stories published pointers after snapshots exist
alter table public.people
  add constraint people_published_aggregate_fk
  foreign key (published_aggregate_id)
  references public.published_aggregate_snapshots (id)
  on delete set null;

alter table public.places
  add constraint places_published_aggregate_fk
  foreign key (published_aggregate_id)
  references public.published_aggregate_snapshots (id)
  on delete set null;

alter table public.stories
  add constraint stories_published_aggregate_fk
  foreign key (published_aggregate_id)
  references public.published_aggregate_snapshots (id)
  on delete set null;
