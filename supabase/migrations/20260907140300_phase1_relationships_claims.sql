-- Phase 1: relationships, sources, claims (typed subjects), evidence_links

create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  family public.relationship_family not null,
  person_a_id uuid not null references public.people (id) on delete cascade,
  person_b_id uuid not null references public.people (id) on delete cascade,
  is_directional boolean not null,
  knowledge_state public.knowledge_state not null default 'unknown',
  dispute_state public.dispute_state not null default 'none',
  importance public.relationship_importance not null default 'secondary',
  editorial_note text,
  lifecycle_status public.lifecycle_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint relationships_not_self check (person_a_id <> person_b_id),
  constraint relationships_directionality check (
    (
      family in ('teacher_student', 'parent_child') and is_directional = true
    ) or (
      family in ('spouse', 'sibling', 'bar_plugta') and is_directional = false
    )
  )
);

-- Directional: unique oriented edge
create unique index relationships_directional_uidx
  on public.relationships (family, person_a_id, person_b_id)
  where is_directional;

-- Non-directional: prevent A-B and B-A duplicates
create unique index relationships_nondirectional_uidx
  on public.relationships (
    family,
    least(person_a_id, person_b_id),
    greatest(person_a_id, person_b_id)
  )
  where not is_directional;

create index relationships_a_idx on public.relationships (person_a_id);
create index relationships_b_idx on public.relationships (person_b_id);

create table public.source_works (
  id uuid primary key default gen_random_uuid(),
  canonical_title text not null,
  source_type text not null,
  corpus_priority int not null default 100,
  is_approved_corpus boolean not null default false,
  is_discovery_only boolean not null default false,
  editorial_notes text,
  lifecycle_status public.lifecycle_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint source_works_title_nonempty check (length(trim(canonical_title)) > 0)
);

create index source_works_title_trgm_idx
  on public.source_works using gin (canonical_title gin_trgm_ops);

create table public.source_citations (
  id uuid primary key default gen_random_uuid(),
  source_work_id uuid not null references public.source_works (id) on delete restrict,
  tractate text,
  chapter text,
  page_or_daf text,
  passage text,
  edition text,
  external_url text,
  citation_display text not null,
  editorial_notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  constraint source_citations_display_nonempty check (length(trim(citation_display)) > 0)
);

create index source_citations_work_idx on public.source_citations (source_work_id);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  statement_text text not null,
  knowledge_state public.knowledge_state not null default 'unknown',
  dispute_state public.dispute_state not null default 'none',
  lifecycle_status public.lifecycle_status not null default 'draft',
  editorial_note text,
  subject_person_id uuid references public.people (id) on delete cascade,
  subject_place_id uuid references public.places (id) on delete cascade,
  subject_period_id uuid references public.historical_periods (id) on delete cascade,
  subject_episode_id uuid references public.historical_episodes (id) on delete cascade,
  subject_event_id uuid references public.historical_events (id) on delete cascade,
  subject_relationship_id uuid references public.relationships (id) on delete cascade,
  subject_generation_membership_id uuid references public.person_generation_memberships (id) on delete cascade,
  subject_time_range_id uuid references public.person_time_ranges (id) on delete cascade,
  subject_chronology_editorial_id uuid references public.person_chronology_editorial (id) on delete cascade,
  subject_chronology_constraint_id uuid references public.person_chronology_constraints (id) on delete cascade,
  subject_person_place_id uuid references public.person_places (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint claims_statement_nonempty check (length(trim(statement_text)) > 0),
  constraint claims_exactly_one_subject check (
    (
      (subject_person_id is not null)::int +
      (subject_place_id is not null)::int +
      (subject_period_id is not null)::int +
      (subject_episode_id is not null)::int +
      (subject_event_id is not null)::int +
      (subject_relationship_id is not null)::int +
      (subject_generation_membership_id is not null)::int +
      (subject_time_range_id is not null)::int +
      (subject_chronology_editorial_id is not null)::int +
      (subject_chronology_constraint_id is not null)::int +
      (subject_person_place_id is not null)::int
    ) = 1
  )
);

create index claims_person_subject_idx on public.claims (subject_person_id);
create index claims_lifecycle_idx on public.claims (lifecycle_status);

create table public.evidence_links (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  source_citation_id uuid not null references public.source_citations (id) on delete restrict,
  stance public.evidence_stance not null,
  knowledge_state public.knowledge_state not null default 'known',
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  unique (claim_id, source_citation_id, stance)
);

create index evidence_links_claim_idx on public.evidence_links (claim_id);
create index evidence_links_citation_idx on public.evidence_links (source_citation_id);
