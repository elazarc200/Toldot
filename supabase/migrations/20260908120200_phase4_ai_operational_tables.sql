-- Phase 4: AI operational tables (Conversation / Job / Proposal separation)
-- These are NOT historical truth.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.ai_worker_config (
  id int primary key default 1 check (id = 1),
  secret_hash text not null,
  updated_at timestamptz not null default now()
);

-- No reusable default secret. Configure via scripts/bootstrap-ai-worker.ts
-- (Phase 4 remediation migration invalidates any prior seed and requires
-- worker_user_id + SHA-256 secret_hash).
insert into public.ai_worker_config (id, secret_hash)
values (1, 'UNCONFIGURED_REQUIRES_BOOTSTRAP')
on conflict (id) do nothing;

create table if not exists public.ai_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,
  task_type text not null,
  version int not null,
  system_instructions text not null,
  input_mapping jsonb not null default '{}'::jsonb,
  output_schema_id text not null,
  provider_constraints jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  unique (template_id, version),
  constraint ai_prompt_templates_template_nonempty check (length(trim(template_id)) > 0)
);

create unique index if not exists ai_prompt_templates_one_active_per_task
  on public.ai_prompt_templates (task_type)
  where is_active;

create table if not exists public.ai_prompt_template_revisions (
  id uuid primary key default gen_random_uuid(),
  prompt_template_row_id uuid not null references public.ai_prompt_templates (id) on delete cascade,
  change_note text,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  entity_type public.ai_entity_type not null,
  entity_id uuid not null,
  created_by uuid not null references auth.users (id) on delete restrict,
  title text,
  default_provider text,
  default_model text,
  allowed_collection_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_conversations_entity_idx
  on public.ai_conversations (entity_type, entity_id);

create table if not exists public.ai_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role public.ai_message_role not null,
  content text not null,
  job_id uuid,
  proposal_ids uuid[] not null default '{}',
  token_usage jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create index if not exists ai_conversation_messages_conv_idx
  on public.ai_conversation_messages (conversation_id, created_at);

create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  task_type text not null,
  entity_type public.ai_entity_type not null,
  entity_id uuid not null,
  conversation_id uuid references public.ai_conversations (id) on delete set null,
  requested_by uuid not null references auth.users (id) on delete restrict,
  status public.ai_job_status not null default 'queued',
  provider text,
  model_id text,
  model_version text,
  attempt_count int not null default 0,
  max_attempts int not null default 3,
  lease_owner text,
  lease_expires_at timestamptz,
  fencing_token bigint not null default 0,
  idempotency_key text not null,
  assembled_context jsonb not null default '{}'::jsonb,
  dependency_set jsonb not null default '[]'::jsonb,
  allowed_tool_ids text[] not null default '{}',
  allow_external_research boolean not null default false,
  allowed_collection_ids uuid[] not null default '{}',
  cancel_requested boolean not null default false,
  error_code text,
  error_message text,
  cost_usd numeric(12, 6) not null default 0,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  result_proposal_ids uuid[] not null default '{}',
  result_citation_finding_ids uuid[] not null default '{}',
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);

create index if not exists ai_jobs_status_queued_idx
  on public.ai_jobs (status, queued_at)
  where status = 'queued';

create index if not exists ai_jobs_entity_idx
  on public.ai_jobs (entity_type, entity_id);

create table if not exists public.ai_proposals (
  id uuid primary key default gen_random_uuid(),
  entity_type public.ai_entity_type not null,
  entity_id uuid not null,
  task_type text not null,
  proposal_kind text not null,
  job_id uuid references public.ai_jobs (id) on delete set null,
  conversation_id uuid references public.ai_conversations (id) on delete set null,
  status public.ai_proposal_status not null default 'needs_review',
  provider text not null,
  model_id text not null,
  model_version text,
  prompt_template_id text,
  prompt_template_version int,
  structured_output jsonb not null,
  raw_output_ref text,
  confidence text,
  warnings jsonb not null default '[]'::jsonb,
  dependency_set jsonb not null default '[]'::jsonb,
  dependency_fingerprint text not null,
  citation_finding_ids uuid[] not null default '{}',
  accepted_fields text[] not null default '{}',
  rejected_fields text[] not null default '{}',
  rejection_reason text,
  created_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists ai_proposals_entity_idx
  on public.ai_proposals (entity_type, entity_id, created_at desc);

create index if not exists ai_proposals_status_idx
  on public.ai_proposals (status);

create table if not exists public.ai_proposal_field_decisions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.ai_proposals (id) on delete cascade,
  field_path text not null,
  decision text not null check (decision in ('accepted', 'rejected', 'unresolved', 'blocked_stale')),
  freshness public.ai_freshness_decision,
  note text,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz not null default now(),
  unique (proposal_id, field_path)
);

create table if not exists public.ai_citation_findings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.ai_jobs (id) on delete set null,
  proposal_id uuid references public.ai_proposals (id) on delete set null,
  entity_type public.ai_entity_type,
  entity_id uuid,
  resolution_status public.ai_citation_resolution_status not null default 'discovered',
  origin_kind text not null
    check (origin_kind in ('model_generated', 'retrieved', 'web_discovered', 'editor_entered')),
  raw_citation_text text not null,
  retrieval_adapter_code text,
  provider_ref text,
  provider_url text,
  canonical_source_work_id uuid references public.source_works (id) on delete set null,
  canonical_source_citation_id uuid references public.source_citations (id) on delete set null,
  confidence text,
  warnings jsonb not null default '[]'::jsonb,
  resolved_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_citation_findings_status_idx
  on public.ai_citation_findings (resolution_status);

create table if not exists public.ai_acceptance_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.ai_proposals (id) on delete cascade,
  field_path text,
  freshness public.ai_freshness_decision not null,
  resulting_table text,
  resulting_row_id uuid,
  entity_revision_id uuid,
  decided_by uuid not null references auth.users (id) on delete restrict,
  decided_at timestamptz not null default now(),
  note text
);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.ai_jobs (id) on delete set null,
  conversation_id uuid references public.ai_conversations (id) on delete set null,
  provider text,
  model_id text,
  adapter_code text,
  task_type text,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  estimated_cost_usd numeric(12, 6) not null default 0,
  duration_ms int,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create table if not exists public.ai_external_captures (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.ai_jobs (id) on delete set null,
  adapter_code text not null,
  url text not null,
  domain text,
  content_hash text,
  excerpt text,
  untrusted boolean not null default true,
  fetched_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ai_tool_results (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.ai_jobs (id) on delete cascade,
  tool_id text not null,
  untrusted boolean not null default true,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- FK from messages.job_id after ai_jobs exists
do $$ begin
  alter table public.ai_conversation_messages
    add constraint ai_conversation_messages_job_fk
    foreign key (job_id) references public.ai_jobs (id) on delete set null;
exception when duplicate_object then null;
end $$;
