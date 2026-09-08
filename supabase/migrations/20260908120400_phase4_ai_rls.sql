-- Phase 4: RLS for AI operational + catalog extension tables
-- Deny-by-default for anon; editors via has_capability.

alter table public.ai_source_collections enable row level security;
alter table public.ai_source_collection_members enable row level security;
alter table public.source_citation_external_links enable row level security;
alter table public.ai_retrieval_adapters enable row level security;
alter table public.ai_retrieval_adapter_collections enable row level security;
alter table public.ai_external_domain_allowlist enable row level security;
alter table public.ai_worker_config enable row level security;
alter table public.ai_prompt_templates enable row level security;
alter table public.ai_prompt_template_revisions enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_conversation_messages enable row level security;
alter table public.ai_jobs enable row level security;
alter table public.ai_proposals enable row level security;
alter table public.ai_proposal_field_decisions enable row level security;
alter table public.ai_citation_findings enable row level security;
alter table public.ai_acceptance_events enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.ai_external_captures enable row level security;
alter table public.ai_tool_results enable row level security;

-- Worker config: no direct client access
-- (bootstrap/service role only; worker uses secret via RPC)

-- Catalog / adapters: editors with manage_corpus or run_ai_research may read
create policy ai_source_collections_select on public.ai_source_collections
  for select to authenticated
  using (public.has_capability('run_ai_research') or public.has_capability('manage_corpus'));

create policy ai_source_collections_write on public.ai_source_collections
  for all to authenticated
  using (public.has_capability('manage_corpus'))
  with check (public.has_capability('manage_corpus'));

create policy ai_source_collection_members_select on public.ai_source_collection_members
  for select to authenticated
  using (public.has_capability('run_ai_research') or public.has_capability('manage_corpus'));

create policy ai_source_collection_members_write on public.ai_source_collection_members
  for all to authenticated
  using (public.has_capability('manage_corpus'))
  with check (public.has_capability('manage_corpus'));

create policy source_citation_external_links_select on public.source_citation_external_links
  for select to authenticated
  using (public.has_capability('edit') or public.has_capability('run_ai_research'));

create policy source_citation_external_links_write on public.source_citation_external_links
  for all to authenticated
  using (public.has_capability('edit') or public.has_capability('manage_corpus'))
  with check (public.has_capability('edit') or public.has_capability('manage_corpus'));

create policy ai_retrieval_adapters_select on public.ai_retrieval_adapters
  for select to authenticated
  using (public.has_capability('run_ai_research') or public.has_capability('manage_corpus'));

create policy ai_retrieval_adapters_write on public.ai_retrieval_adapters
  for all to authenticated
  using (public.has_capability('manage_corpus'))
  with check (public.has_capability('manage_corpus'));

create policy ai_retrieval_adapter_collections_select on public.ai_retrieval_adapter_collections
  for select to authenticated
  using (public.has_capability('run_ai_research') or public.has_capability('manage_corpus'));

create policy ai_retrieval_adapter_collections_write on public.ai_retrieval_adapter_collections
  for all to authenticated
  using (public.has_capability('manage_corpus'))
  with check (public.has_capability('manage_corpus'));

create policy ai_external_domain_allowlist_select on public.ai_external_domain_allowlist
  for select to authenticated
  using (public.has_capability('run_ai_research') or public.has_capability('manage_corpus'));

create policy ai_external_domain_allowlist_write on public.ai_external_domain_allowlist
  for all to authenticated
  using (public.has_capability('manage_corpus'))
  with check (public.has_capability('manage_corpus'));

create policy ai_prompt_templates_select on public.ai_prompt_templates
  for select to authenticated
  using (public.has_capability('run_ai_research') or public.has_capability('manage_corpus'));

create policy ai_prompt_templates_write on public.ai_prompt_templates
  for all to authenticated
  using (public.has_capability('manage_corpus'))
  with check (public.has_capability('manage_corpus'));

create policy ai_prompt_template_revisions_select on public.ai_prompt_template_revisions
  for select to authenticated
  using (public.has_capability('run_ai_research') or public.has_capability('manage_corpus'));

-- Conversations / messages
create policy ai_conversations_select on public.ai_conversations
  for select to authenticated
  using (public.has_capability('run_ai_research'));

create policy ai_conversations_insert on public.ai_conversations
  for insert to authenticated
  with check (
    public.has_capability('run_ai_research')
    and created_by = auth.uid()
  );

create policy ai_conversations_update on public.ai_conversations
  for update to authenticated
  using (public.has_capability('run_ai_research') and created_by = auth.uid())
  with check (public.has_capability('run_ai_research') and created_by = auth.uid());

create policy ai_conversation_messages_select on public.ai_conversation_messages
  for select to authenticated
  using (
    public.has_capability('run_ai_research')
    and exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id
    )
  );

create policy ai_conversation_messages_insert on public.ai_conversation_messages
  for insert to authenticated
  with check (
    public.has_capability('run_ai_research')
    and exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id
    )
  );

-- Jobs: editors see entity-scoped research jobs; inserts via enqueue RPC
create policy ai_jobs_select on public.ai_jobs
  for select to authenticated
  using (public.has_capability('run_ai_research'));

create policy ai_jobs_update_cancel on public.ai_jobs
  for update to authenticated
  using (public.has_capability('run_ai_research') and requested_by = auth.uid())
  with check (public.has_capability('run_ai_research') and requested_by = auth.uid());

-- Proposals / findings / decisions
create policy ai_proposals_select on public.ai_proposals
  for select to authenticated
  using (public.has_capability('run_ai_research') or public.has_capability('edit'));

create policy ai_proposals_update on public.ai_proposals
  for update to authenticated
  using (public.has_capability('edit'))
  with check (public.has_capability('edit'));

create policy ai_proposal_field_decisions_select on public.ai_proposal_field_decisions
  for select to authenticated
  using (public.has_capability('run_ai_research') or public.has_capability('edit'));

create policy ai_proposal_field_decisions_write on public.ai_proposal_field_decisions
  for all to authenticated
  using (public.has_capability('edit'))
  with check (public.has_capability('edit'));

create policy ai_citation_findings_select on public.ai_citation_findings
  for select to authenticated
  using (public.has_capability('run_ai_research') or public.has_capability('edit'));

create policy ai_citation_findings_update on public.ai_citation_findings
  for update to authenticated
  using (public.has_capability('edit'))
  with check (public.has_capability('edit'));

create policy ai_acceptance_events_select on public.ai_acceptance_events
  for select to authenticated
  using (public.has_capability('edit') or public.has_capability('run_ai_research'));

create policy ai_acceptance_events_insert on public.ai_acceptance_events
  for insert to authenticated
  with check (public.has_capability('edit') and decided_by = auth.uid());

create policy ai_usage_events_select on public.ai_usage_events
  for select to authenticated
  using (public.has_capability('run_ai_research') or public.has_capability('manage_corpus'));

create policy ai_external_captures_select on public.ai_external_captures
  for select to authenticated
  using (public.has_capability('run_ai_research') or public.has_capability('edit'));

create policy ai_tool_results_select on public.ai_tool_results
  for select to authenticated
  using (public.has_capability('run_ai_research'));
