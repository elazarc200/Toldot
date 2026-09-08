-- Phase 2: derived public projections (search, slugs, redirects) + period publish pointer
-- These are NOT editable canonical tables.

-- ---------------------------------------------------------------------------
-- published_search_documents
-- ---------------------------------------------------------------------------
create table public.published_search_documents (
  id uuid primary key default gen_random_uuid(),
  aggregate_type public.aggregate_type not null,
  aggregate_id uuid not null,
  snapshot_id uuid not null references public.published_aggregate_snapshots (id) on delete cascade,
  parent_period_id uuid null,
  primary_name text not null,
  sort_name text not null default '',
  aliases text[] not null default '{}',
  disambiguation text null,
  search_blob text not null,
  href_path text not null,
  anchor text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index published_search_documents_entity_uidx
  on public.published_search_documents (aggregate_type, aggregate_id)
  where parent_period_id is null;

create unique index published_search_documents_period_child_uidx
  on public.published_search_documents (aggregate_type, aggregate_id, parent_period_id)
  where parent_period_id is not null;

create index published_search_documents_active_trgm_idx
  on public.published_search_documents using gin (search_blob gin_trgm_ops)
  where is_active;

create index published_search_documents_parent_period_idx
  on public.published_search_documents (parent_period_id)
  where parent_period_id is not null;

create index published_search_documents_snapshot_idx
  on public.published_search_documents (snapshot_id);

-- ---------------------------------------------------------------------------
-- published_entity_slugs + redirects
-- ---------------------------------------------------------------------------
create table public.published_entity_slugs (
  aggregate_type public.aggregate_type not null,
  aggregate_id uuid not null,
  slug text not null,
  snapshot_id uuid not null references public.published_aggregate_snapshots (id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (aggregate_type, aggregate_id),
  constraint published_entity_slugs_slug_nonempty check (length(trim(slug)) > 0)
);

create unique index published_entity_slugs_slug_type_uidx
  on public.published_entity_slugs (aggregate_type, slug);

create table public.published_slug_redirects (
  id uuid primary key default gen_random_uuid(),
  aggregate_type public.aggregate_type not null,
  old_slug text not null,
  aggregate_id uuid not null,
  created_at timestamptz not null default now(),
  constraint published_slug_redirects_old_nonempty check (length(trim(old_slug)) > 0),
  unique (aggregate_type, old_slug)
);

create index published_slug_redirects_target_idx
  on public.published_slug_redirects (aggregate_type, aggregate_id);

-- Period publish pointer
alter table public.historical_periods
  add column if not exists published_aggregate_id uuid;

do $$ begin
  alter table public.historical_periods
    add constraint historical_periods_published_aggregate_fk
    foreign key (published_aggregate_id)
    references public.published_aggregate_snapshots (id)
    on delete set null;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- RLS: anon may SELECT active/public projection rows; no client writes
-- ---------------------------------------------------------------------------
alter table public.published_search_documents enable row level security;
alter table public.published_entity_slugs enable row level security;
alter table public.published_slug_redirects enable row level security;

revoke all on table public.published_search_documents from public, anon, authenticated;
revoke all on table public.published_entity_slugs from public, anon, authenticated;
revoke all on table public.published_slug_redirects from public, anon, authenticated;

grant select on table public.published_search_documents to anon, authenticated;
grant select on table public.published_entity_slugs to anon, authenticated;
grant select on table public.published_slug_redirects to anon, authenticated;

create policy published_search_public_select on public.published_search_documents
  for select to anon, authenticated
  using (is_active = true);

create policy published_search_editorial_select on public.published_search_documents
  for select to authenticated
  using (
    public.has_capability('edit')
    or public.has_capability('review')
    or public.has_capability('approve')
    or public.has_capability('publish')
    or public.has_capability('rollback')
  );

create policy published_slugs_public_select on public.published_entity_slugs
  for select to anon, authenticated
  using (true);

create policy published_redirects_public_select on public.published_slug_redirects
  for select to anon, authenticated
  using (true);

-- No insert/update/delete policies for clients — SECURITY DEFINER publish only
