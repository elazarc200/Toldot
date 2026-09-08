-- Phase 4: AI capability + enums (operational AI layer; not historical SoT)

insert into public.editorial_capabilities (code, description)
values ('run_ai_research', 'Enqueue and conduct entity-scoped AI research conversations')
on conflict (code) do nothing;

insert into public.role_capabilities (role_id, capability_code)
select r.id, 'run_ai_research'
from public.editorial_roles r
where r.code = 'full_editor'
on conflict do nothing;

do $$ begin
  create type public.ai_entity_type as enum (
    'person', 'place', 'period', 'episode', 'event', 'story', 'teaching'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ai_job_status as enum (
    'queued', 'running', 'awaiting_review', 'completed', 'failed', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ai_proposal_status as enum (
    'generated',
    'needs_review',
    'partially_accepted',
    'accepted',
    'rejected',
    'superseded',
    'failed',
    'stale_impacting'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ai_citation_resolution_status as enum (
    'discovered',
    'resolved',
    'editor_reviewed',
    'accepted_as_evidence',
    'unresolved',
    'conflicting',
    'rejected'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ai_freshness_decision as enum (
    'fresh',
    'stale_non_impacting',
    'stale_impacting'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ai_message_role as enum (
    'editor', 'assistant', 'system_notice', 'tool_summary'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.source_authority_class as enum (
    'rabbinic_primary',
    'classical_secondary',
    'modern_academic',
    'historical_external',
    'discovery_only'
  );
exception when duplicate_object then null;
end $$;
