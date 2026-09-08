-- Phase 4: Source Catalog extensions + Retrieval Adapter registry
-- Catalog ≠ Retrieval. Provider URLs are resolution metadata only.

alter table public.source_works
  add column if not exists authority_class public.source_authority_class;

update public.source_works
set authority_class = case
  when is_discovery_only then 'discovery_only'::public.source_authority_class
  else 'rabbinic_primary'::public.source_authority_class
end
where authority_class is null;

alter table public.source_works
  alter column authority_class set default 'rabbinic_primary';

alter table public.source_works
  alter column authority_class set not null;

create table if not exists public.ai_source_collections (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_he text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  constraint ai_source_collections_code_nonempty check (length(trim(code)) > 0),
  constraint ai_source_collections_name_nonempty check (length(trim(name_he)) > 0)
);

create table if not exists public.ai_source_collection_members (
  collection_id uuid not null references public.ai_source_collections (id) on delete cascade,
  source_work_id uuid not null references public.source_works (id) on delete cascade,
  primary key (collection_id, source_work_id)
);

-- Optional public/external resolution links — NOT canonical citation identity
create table if not exists public.source_citation_external_links (
  id uuid primary key default gen_random_uuid(),
  source_citation_id uuid not null references public.source_citations (id) on delete cascade,
  provider_code text not null,
  provider_ref text not null,
  public_url text,
  is_preferred_public boolean not null default false,
  created_at timestamptz not null default now(),
  unique (source_citation_id, provider_code, provider_ref),
  constraint source_citation_external_links_provider_nonempty
    check (length(trim(provider_code)) > 0)
);

create index if not exists source_citation_external_links_citation_idx
  on public.source_citation_external_links (source_citation_id);

create table if not exists public.ai_retrieval_adapters (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  retrieval_method text not null,
  citation_resolution_capability text not null
    check (citation_resolution_capability in ('none', 'metadata_match', 'location_confirm')),
  trust_class text not null
    check (trust_class in ('catalog_metadata', 'structured_corpus', 'discovery_web', 'licensed_local')),
  is_discovery_only boolean not null default false,
  evidence_eligible boolean not null default false,
  may_retain_full_text boolean not null default false,
  max_excerpt_chars int not null default 800,
  timeout_ms int not null default 15000,
  rate_limit_per_minute int not null default 30,
  is_active boolean not null default true,
  licensing_notes text,
  created_at timestamptz not null default now(),
  constraint ai_retrieval_adapters_code_nonempty check (length(trim(code)) > 0)
);

create table if not exists public.ai_retrieval_adapter_collections (
  adapter_id uuid not null references public.ai_retrieval_adapters (id) on delete cascade,
  collection_id uuid not null references public.ai_source_collections (id) on delete cascade,
  primary key (adapter_id, collection_id)
);

create table if not exists public.ai_external_domain_allowlist (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint ai_external_domain_allowlist_domain_nonempty check (length(trim(domain)) > 0)
);

insert into public.ai_retrieval_adapters (
  code, display_name, retrieval_method, citation_resolution_capability,
  trust_class, is_discovery_only, evidence_eligible, may_retain_full_text
) values
  (
    'catalog_metadata',
    'Catalog metadata only',
    'catalog_read',
    'metadata_match',
    'catalog_metadata',
    false,
    false,
    false
  ),
  (
    'sefaria',
    'Sefaria structured retrieval',
    'sefaria_api',
    'location_confirm',
    'structured_corpus',
    false,
    true,
    false
  ),
  (
    'open_web_discovery',
    'Controlled open-web discovery',
    'http_fetch_allowlisted',
    'none',
    'discovery_web',
    true,
    false,
    false
  )
on conflict (code) do nothing;

insert into public.ai_source_collections (code, name_he, description)
values
  ('core_talmud', 'תלמוד ליבה', 'אוסף בסיסי למחקר תנאי/אמוראי'),
  ('discovery', 'גילוי בלבד', 'מקורות לגילוי שאינם ראיה בפני עצמם')
on conflict (code) do nothing;

insert into public.ai_external_domain_allowlist (domain, notes) values
  ('www.sefaria.org.il', 'Sefaria Hebrew'),
  ('www.sefaria.org', 'Sefaria'),
  ('he.wikipedia.org', 'Wikipedia HE — discovery only'),
  ('www.hamichlol.org.il', 'HaMichlol — discovery only')
on conflict (domain) do nothing;
