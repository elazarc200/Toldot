-- Phase 3: visualization projection foundation
-- Historical Placement tables + map projections + build manifest.
-- Rendering layout (lanes/offsets) is NOT stored here as historical truth.

create type public.seder_placement_status as enum (
  'resolved',
  'approximate_band',
  'generation_only',
  'unresolved'
);

create type public.map_placement_kind as enum (
  'point',
  'multi_candidate',
  'region_context',
  'unlocated'
);

create type public.visualization_build_status as enum (
  'building',
  'ready',
  'active',
  'failed',
  'retired'
);

create type public.seder_band_kind as enum (
  'rabbinic_generation',
  'political_rule',
  'historical_period'
);

-- ---------------------------------------------------------------------------
-- Manifest: public reads ONLY the active build
-- ---------------------------------------------------------------------------
create table public.published_visualization_builds (
  build_id uuid primary key default gen_random_uuid(),
  status public.visualization_build_status not null default 'building',
  schema_version int not null default 1,
  engine_version int not null default 1,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  activated_at timestamptz,
  activated_by uuid references auth.users (id) on delete set null,
  notes text,
  constraint published_visualization_builds_ready_or_active check (
    status <> 'active' or activated_at is not null
  )
);

create unique index published_visualization_builds_one_active
  on public.published_visualization_builds ((status))
  where status = 'active';

create table public.published_visualization_manifest (
  id int primary key default 1 check (id = 1),
  active_build_id uuid references public.published_visualization_builds (build_id) on delete restrict,
  updated_at timestamptz not null default now()
);

insert into public.published_visualization_manifest (id, active_build_id)
values (1, null);

-- Seed empty active build so incremental sync has a target after first structural rebuild.
-- Until first structural rebuild activates a build, public explorers read empty sets safely.

-- ---------------------------------------------------------------------------
-- Historical Placement (Seder) — NO x_lane / collision / routing
-- ---------------------------------------------------------------------------
create table public.published_seder_placement_bands (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.published_visualization_builds (build_id) on delete cascade,
  band_kind public.seder_band_kind not null,
  source_id uuid not null,
  label_he text not null,
  sequence_index int,
  y_start_norm numeric not null,
  y_end_norm numeric not null,
  schema_version int not null default 1,
  engine_version int not null default 1,
  created_at timestamptz not null default now(),
  constraint published_seder_placement_bands_y check (y_start_norm <= y_end_norm),
  unique (build_id, band_kind, source_id)
);

create index published_seder_placement_bands_build_idx
  on public.published_seder_placement_bands (build_id);

create table public.published_seder_placement_nodes (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.published_visualization_builds (build_id) on delete cascade,
  person_id uuid not null,
  snapshot_id uuid references public.published_aggregate_snapshots (id) on delete set null,
  schema_version int not null default 1,
  engine_version int not null default 1,
  primary_generation_id uuid,
  generation_ids uuid[] not null default '{}',
  placement_status public.seder_placement_status not null,
  placement_knowledge_state public.knowledge_state not null default 'unknown',
  y_start_norm numeric not null,
  y_end_norm numeric not null,
  block_length_norm numeric not null,
  prominence_score_effective numeric not null default 0,
  prominence_source text not null default 'derived'
    check (prominence_source in ('derived', 'override')),
  sort_name text not null,
  display_name text not null,
  disambiguation text,
  href_path text not null,
  continues_into_next boolean not null default false,
  spans_multiple boolean not null default false,
  search_blob text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_seder_placement_nodes_y check (y_start_norm <= y_end_norm),
  unique (build_id, person_id)
);

create index published_seder_placement_nodes_build_y_idx
  on public.published_seder_placement_nodes (build_id, y_start_norm, y_end_norm);
create index published_seder_placement_nodes_sort_idx
  on public.published_seder_placement_nodes (build_id, sort_name);

create table public.published_seder_placement_edges (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.published_visualization_builds (build_id) on delete cascade,
  relationship_id uuid not null,
  family public.relationship_family not null,
  is_directional boolean not null,
  person_a_id uuid not null,
  person_b_id uuid not null,
  knowledge_state public.knowledge_state not null default 'unknown',
  dispute_state text,
  importance public.relationship_importance not null default 'secondary',
  schema_version int not null default 1,
  created_at timestamptz not null default now(),
  unique (build_id, relationship_id)
);

create index published_seder_placement_edges_build_a_idx
  on public.published_seder_placement_edges (build_id, person_a_id);
create index published_seder_placement_edges_build_b_idx
  on public.published_seder_placement_edges (build_id, person_b_id);

create table public.published_seder_alpha_index (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.published_visualization_builds (build_id) on delete cascade,
  person_id uuid not null,
  letter text not null,
  sort_name text not null,
  display_name text not null,
  disambiguation text,
  href_path text not null,
  generation_label text,
  search_blob text not null default '',
  schema_version int not null default 1,
  unique (build_id, person_id)
);

create index published_seder_alpha_index_letter_idx
  on public.published_seder_alpha_index (build_id, letter, sort_name);

-- Optional discardable render layout (never historical SoT)
create table public.published_seder_render_layout (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.published_visualization_builds (build_id) on delete cascade,
  person_id uuid not null,
  x_lane numeric not null default 0,
  label_offset_x numeric not null default 0,
  label_offset_y numeric not null default 0,
  schema_version int not null default 1,
  updated_at timestamptz not null default now(),
  unique (build_id, person_id)
);

-- ---------------------------------------------------------------------------
-- Map projections
-- ---------------------------------------------------------------------------
create table public.published_map_places (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.published_visualization_builds (build_id) on delete cascade,
  place_id uuid not null,
  snapshot_id uuid references public.published_aggregate_snapshots (id) on delete set null,
  schema_version int not null default 1,
  primary_name text not null,
  sort_name text not null,
  href_path text not null,
  placement_kind public.map_placement_kind not null,
  preferred_lat double precision,
  preferred_lng double precision,
  knowledge_state public.knowledge_state not null default 'unknown',
  primary_region_ids uuid[] not null default '{}',
  region_labels text[] not null default '{}',
  period_ids uuid[] not null default '{}',
  search_blob text not null default '',
  updated_at timestamptz not null default now(),
  unique (build_id, place_id)
);

create index published_map_places_build_idx on public.published_map_places (build_id);
create index published_map_places_geo_idx
  on public.published_map_places (build_id, preferred_lat, preferred_lng)
  where preferred_lat is not null and preferred_lng is not null;

create table public.published_map_place_candidates (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.published_visualization_builds (build_id) on delete cascade,
  place_id uuid not null,
  identification_id uuid not null,
  latitude double precision,
  longitude double precision,
  location_certainty public.knowledge_state not null default 'unknown',
  modern_name text,
  is_preferred boolean not null default false,
  unique (build_id, identification_id)
);

create index published_map_place_candidates_place_idx
  on public.published_map_place_candidates (build_id, place_id);

create table public.published_map_person_places (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.published_visualization_builds (build_id) on delete cascade,
  person_id uuid not null,
  place_id uuid not null,
  knowledge_state public.knowledge_state not null default 'unknown',
  person_display_name text not null,
  place_display_name text not null,
  person_href text not null,
  place_href text not null,
  unique (build_id, person_id, place_id)
);

create index published_map_person_places_person_idx
  on public.published_map_person_places (build_id, person_id);
create index published_map_person_places_place_idx
  on public.published_map_person_places (build_id, place_id);

-- ---------------------------------------------------------------------------
-- RLS: anon/authenticated SELECT only active-build rows; no writes
-- ---------------------------------------------------------------------------
alter table public.published_visualization_builds enable row level security;
alter table public.published_visualization_manifest enable row level security;
alter table public.published_seder_placement_bands enable row level security;
alter table public.published_seder_placement_nodes enable row level security;
alter table public.published_seder_placement_edges enable row level security;
alter table public.published_seder_alpha_index enable row level security;
alter table public.published_seder_render_layout enable row level security;
alter table public.published_map_places enable row level security;
alter table public.published_map_place_candidates enable row level security;
alter table public.published_map_person_places enable row level security;

revoke all on table public.published_visualization_builds from public, anon, authenticated;
revoke all on table public.published_visualization_manifest from public, anon, authenticated;
revoke all on table public.published_seder_placement_bands from public, anon, authenticated;
revoke all on table public.published_seder_placement_nodes from public, anon, authenticated;
revoke all on table public.published_seder_placement_edges from public, anon, authenticated;
revoke all on table public.published_seder_alpha_index from public, anon, authenticated;
revoke all on table public.published_seder_render_layout from public, anon, authenticated;
revoke all on table public.published_map_places from public, anon, authenticated;
revoke all on table public.published_map_place_candidates from public, anon, authenticated;
revoke all on table public.published_map_person_places from public, anon, authenticated;

grant select on table public.published_visualization_builds to anon, authenticated;
grant select on table public.published_visualization_manifest to anon, authenticated;
grant select on table public.published_seder_placement_bands to anon, authenticated;
grant select on table public.published_seder_placement_nodes to anon, authenticated;
grant select on table public.published_seder_placement_edges to anon, authenticated;
grant select on table public.published_seder_alpha_index to anon, authenticated;
grant select on table public.published_seder_render_layout to anon, authenticated;
grant select on table public.published_map_places to anon, authenticated;
grant select on table public.published_map_place_candidates to anon, authenticated;
grant select on table public.published_map_person_places to anon, authenticated;

-- Manifest always readable (points at active build or null)
create policy visualization_manifest_public_select
  on public.published_visualization_manifest
  for select to anon, authenticated
  using (true);

-- Builds: only active row visible publicly (staging/building/failed hidden)
create policy visualization_builds_public_select_active
  on public.published_visualization_builds
  for select to anon, authenticated
  using (status = 'active');

-- Helper expression: build_id matches active manifest
create policy seder_bands_public_select_active
  on public.published_seder_placement_bands
  for select to anon, authenticated
  using (
    build_id = (select m.active_build_id from public.published_visualization_manifest m where m.id = 1)
  );

create policy seder_nodes_public_select_active
  on public.published_seder_placement_nodes
  for select to anon, authenticated
  using (
    build_id = (select m.active_build_id from public.published_visualization_manifest m where m.id = 1)
  );

create policy seder_edges_public_select_active
  on public.published_seder_placement_edges
  for select to anon, authenticated
  using (
    build_id = (select m.active_build_id from public.published_visualization_manifest m where m.id = 1)
  );

create policy seder_alpha_public_select_active
  on public.published_seder_alpha_index
  for select to anon, authenticated
  using (
    build_id = (select m.active_build_id from public.published_visualization_manifest m where m.id = 1)
  );

create policy seder_render_public_select_active
  on public.published_seder_render_layout
  for select to anon, authenticated
  using (
    build_id = (select m.active_build_id from public.published_visualization_manifest m where m.id = 1)
  );

create policy map_places_public_select_active
  on public.published_map_places
  for select to anon, authenticated
  using (
    build_id = (select m.active_build_id from public.published_visualization_manifest m where m.id = 1)
  );

create policy map_candidates_public_select_active
  on public.published_map_place_candidates
  for select to anon, authenticated
  using (
    build_id = (select m.active_build_id from public.published_visualization_manifest m where m.id = 1)
  );

create policy map_person_places_public_select_active
  on public.published_map_person_places
  for select to anon, authenticated
  using (
    build_id = (select m.active_build_id from public.published_visualization_manifest m where m.id = 1)
  );
