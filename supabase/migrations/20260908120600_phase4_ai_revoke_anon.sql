-- Phase 4 fix: revoke direct anon DML/SELECT on AI operational tables.
-- RLS policies alone return empty sets without error when GRANTs exist;
-- Phase 0 pattern expects anon denied (error) on editorial surfaces.

revoke all on table public.ai_source_collections from anon;
revoke all on table public.ai_source_collection_members from anon;
revoke all on table public.source_citation_external_links from anon;
revoke all on table public.ai_retrieval_adapters from anon;
revoke all on table public.ai_retrieval_adapter_collections from anon;
revoke all on table public.ai_external_domain_allowlist from anon;
revoke all on table public.ai_worker_config from anon;
revoke all on table public.ai_prompt_templates from anon;
revoke all on table public.ai_prompt_template_revisions from anon;
revoke all on table public.ai_conversations from anon;
revoke all on table public.ai_conversation_messages from anon;
revoke all on table public.ai_jobs from anon;
revoke all on table public.ai_proposals from anon;
revoke all on table public.ai_proposal_field_decisions from anon;
revoke all on table public.ai_citation_findings from anon;
revoke all on table public.ai_acceptance_events from anon;
revoke all on table public.ai_usage_events from anon;
revoke all on table public.ai_external_captures from anon;
revoke all on table public.ai_tool_results from anon;

-- Ensure authenticated retains table privileges; RLS policies gate rows.
grant select, insert, update, delete on table public.ai_source_collections to authenticated;
grant select, insert, update, delete on table public.ai_source_collection_members to authenticated;
grant select, insert, update, delete on table public.source_citation_external_links to authenticated;
grant select, insert, update, delete on table public.ai_retrieval_adapters to authenticated;
grant select, insert, update, delete on table public.ai_retrieval_adapter_collections to authenticated;
grant select, insert, update, delete on table public.ai_external_domain_allowlist to authenticated;
grant select, insert, update on table public.ai_prompt_templates to authenticated;
grant select on table public.ai_prompt_template_revisions to authenticated;
grant select, insert, update on table public.ai_conversations to authenticated;
grant select, insert on table public.ai_conversation_messages to authenticated;
grant select, update on table public.ai_jobs to authenticated;
grant select, update on table public.ai_proposals to authenticated;
grant select, insert, update, delete on table public.ai_proposal_field_decisions to authenticated;
grant select, update on table public.ai_citation_findings to authenticated;
grant select, insert on table public.ai_acceptance_events to authenticated;
grant select on table public.ai_usage_events to authenticated;
grant select on table public.ai_external_captures to authenticated;
grant select on table public.ai_tool_results to authenticated;

-- worker config remains inaccessible to clients (bootstrap / definer only)
revoke all on table public.ai_worker_config from authenticated;
