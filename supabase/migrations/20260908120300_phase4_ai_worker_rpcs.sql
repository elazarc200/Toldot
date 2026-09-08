-- Phase 4: least-privilege worker role + SECURITY DEFINER RPCs
-- Worker must NOT write canonical/public tables or call publish_*.

create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create role toladot_ai_worker nologin noinherit;
exception when duplicate_object then null;
end $$;

create or replace function public.ai_verify_worker_secret(p_secret text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  expected text;
begin
  if p_secret is null or length(trim(p_secret)) = 0 then
    return false;
  end if;
  select secret_hash into expected from public.ai_worker_config where id = 1;
  if expected is null then
    return false;
  end if;
  return encode(extensions.digest(p_secret, 'sha256'), 'hex') = expected;
end;
$$;

revoke all on function public.ai_verify_worker_secret(text) from public;

create or replace function public.enqueue_ai_job(
  p_task_type text,
  p_entity_type public.ai_entity_type,
  p_entity_id uuid,
  p_conversation_id uuid,
  p_idempotency_key text,
  p_assembled_context jsonb,
  p_dependency_set jsonb,
  p_allowed_tool_ids text[],
  p_allow_external_research boolean,
  p_allowed_collection_ids uuid[],
  p_provider text,
  p_model_id text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null or not public.has_capability('run_ai_research') then
    raise exception 'not authorized to enqueue AI job';
  end if;

  insert into public.ai_jobs (
    task_type, entity_type, entity_id, conversation_id, requested_by,
    idempotency_key, assembled_context, dependency_set, allowed_tool_ids,
    allow_external_research, allowed_collection_ids, provider, model_id, status
  ) values (
    p_task_type, p_entity_type, p_entity_id, p_conversation_id, v_uid,
    p_idempotency_key, coalesce(p_assembled_context, '{}'::jsonb),
    coalesce(p_dependency_set, '[]'::jsonb), coalesce(p_allowed_tool_ids, '{}'),
    coalesce(p_allow_external_research, false),
    coalesce(p_allowed_collection_ids, '{}'), p_provider, p_model_id, 'queued'
  )
  on conflict (idempotency_key) do update
    set updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.enqueue_ai_job(
  text, public.ai_entity_type, uuid, uuid, text, jsonb, jsonb, text[], boolean, uuid[], text, text
) from public;
grant execute on function public.enqueue_ai_job(
  text, public.ai_entity_type, uuid, uuid, text, jsonb, jsonb, text[], boolean, uuid[], text, text
) to authenticated;

create or replace function public.claim_ai_job(
  p_worker_secret text,
  p_worker_id text,
  p_lease_seconds int default 120
)
returns public.ai_jobs
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_job public.ai_jobs;
begin
  if not public.ai_verify_worker_secret(p_worker_secret) then
    raise exception 'invalid worker secret';
  end if;

  select j.* into v_job
  from public.ai_jobs j
  where j.status = 'queued'
     or (
       j.status = 'running'
       and j.lease_expires_at is not null
       and j.lease_expires_at < now()
       and j.cancel_requested = false
     )
  order by j.queued_at
  for update skip locked
  limit 1;

  if v_job.id is null then
    return null;
  end if;

  update public.ai_jobs
  set
    status = 'running',
    attempt_count = attempt_count + 1,
    lease_owner = p_worker_id,
    lease_expires_at = now() + make_interval(secs => greatest(coalesce(p_lease_seconds, 120), 30)),
    fencing_token = fencing_token + 1,
    started_at = coalesce(started_at, now()),
    updated_at = now()
  where id = v_job.id
  returning * into v_job;

  return v_job;
end;
$$;

revoke all on function public.claim_ai_job(text, text, int) from public;
grant execute on function public.claim_ai_job(text, text, int) to toladot_ai_worker;

create or replace function public.heartbeat_ai_job(
  p_worker_secret text,
  p_job_id uuid,
  p_fencing_token bigint,
  p_worker_id text,
  p_lease_seconds int default 120
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if not public.ai_verify_worker_secret(p_worker_secret) then
    raise exception 'invalid worker secret';
  end if;

  update public.ai_jobs
  set
    lease_expires_at = now() + make_interval(secs => greatest(coalesce(p_lease_seconds, 120), 30)),
    updated_at = now()
  where id = p_job_id
    and lease_owner = p_worker_id
    and fencing_token = p_fencing_token
    and status = 'running';

  return found;
end;
$$;

revoke all on function public.heartbeat_ai_job(text, uuid, bigint, text, int) from public;
grant execute on function public.heartbeat_ai_job(text, uuid, bigint, text, int) to toladot_ai_worker;

create or replace function public.get_ai_job_bundle(
  p_worker_secret text,
  p_job_id uuid,
  p_fencing_token bigint,
  p_worker_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_job public.ai_jobs;
begin
  if not public.ai_verify_worker_secret(p_worker_secret) then
    raise exception 'invalid worker secret';
  end if;

  select * into v_job from public.ai_jobs
  where id = p_job_id
    and lease_owner = p_worker_id
    and fencing_token = p_fencing_token
    and status = 'running';

  if v_job.id is null then
    raise exception 'job lease not held';
  end if;

  return jsonb_build_object(
    'job', to_jsonb(v_job),
    'note', 'canonical tables are not writable via worker path'
  );
end;
$$;

revoke all on function public.get_ai_job_bundle(text, uuid, bigint, text) from public;
grant execute on function public.get_ai_job_bundle(text, uuid, bigint, text) to toladot_ai_worker;

create or replace function public.store_ai_tool_result(
  p_worker_secret text,
  p_job_id uuid,
  p_fencing_token bigint,
  p_worker_id text,
  p_tool_id text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_id uuid;
begin
  if not public.ai_verify_worker_secret(p_worker_secret) then
    raise exception 'invalid worker secret';
  end if;

  if not exists (
    select 1 from public.ai_jobs
    where id = p_job_id
      and lease_owner = p_worker_id
      and fencing_token = p_fencing_token
      and status = 'running'
  ) then
    raise exception 'job lease not held';
  end if;

  insert into public.ai_tool_results (job_id, tool_id, untrusted, payload)
  values (p_job_id, p_tool_id, true, coalesce(p_payload, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.store_ai_tool_result(text, uuid, bigint, text, text, jsonb) from public;
grant execute on function public.store_ai_tool_result(text, uuid, bigint, text, text, jsonb) to toladot_ai_worker;

create or replace function public.upsert_ai_citation_finding(
  p_worker_secret text,
  p_job_id uuid,
  p_fencing_token bigint,
  p_worker_id text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_id uuid;
begin
  if not public.ai_verify_worker_secret(p_worker_secret) then
    raise exception 'invalid worker secret';
  end if;

  if not exists (
    select 1 from public.ai_jobs
    where id = p_job_id
      and lease_owner = p_worker_id
      and fencing_token = p_fencing_token
      and status = 'running'
  ) then
    raise exception 'job lease not held';
  end if;

  insert into public.ai_citation_findings (
    job_id, entity_type, entity_id, resolution_status, origin_kind,
    raw_citation_text, retrieval_adapter_code, provider_ref, provider_url,
    confidence, warnings
  ) values (
    p_job_id,
    nullif(p_payload->>'entity_type', '')::public.ai_entity_type,
    nullif(p_payload->>'entity_id', '')::uuid,
    coalesce(nullif(p_payload->>'resolution_status', '')::public.ai_citation_resolution_status, 'discovered'),
    coalesce(p_payload->>'origin_kind', 'retrieved'),
    coalesce(p_payload->>'raw_citation_text', ''),
    p_payload->>'retrieval_adapter_code',
    p_payload->>'provider_ref',
    p_payload->>'provider_url',
    p_payload->>'confidence',
    coalesce(p_payload->'warnings', '[]'::jsonb)
  )
  returning id into v_id;

  update public.ai_jobs
  set result_citation_finding_ids = array_append(result_citation_finding_ids, v_id),
      updated_at = now()
  where id = p_job_id;

  return v_id;
end;
$$;

revoke all on function public.upsert_ai_citation_finding(text, uuid, bigint, text, jsonb) from public;
grant execute on function public.upsert_ai_citation_finding(text, uuid, bigint, text, jsonb) to toladot_ai_worker;

create or replace function public.create_ai_proposal(
  p_worker_secret text,
  p_job_id uuid,
  p_fencing_token bigint,
  p_worker_id text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_job public.ai_jobs;
  v_id uuid;
begin
  if not public.ai_verify_worker_secret(p_worker_secret) then
    raise exception 'invalid worker secret';
  end if;

  select * into v_job from public.ai_jobs
  where id = p_job_id
    and lease_owner = p_worker_id
    and fencing_token = p_fencing_token
    and status = 'running';

  if v_job.id is null then
    raise exception 'job lease not held';
  end if;

  insert into public.ai_proposals (
    entity_type, entity_id, task_type, proposal_kind, job_id, conversation_id,
    status, provider, model_id, model_version, prompt_template_id, prompt_template_version,
    structured_output, confidence, warnings, dependency_set, dependency_fingerprint,
    citation_finding_ids, created_by
  ) values (
    v_job.entity_type,
    v_job.entity_id,
    v_job.task_type,
    coalesce(p_payload->>'proposal_kind', 'generic'),
    v_job.id,
    v_job.conversation_id,
    'needs_review',
    coalesce(p_payload->>'provider', coalesce(v_job.provider, 'unknown')),
    coalesce(p_payload->>'model_id', coalesce(v_job.model_id, 'unknown')),
    p_payload->>'model_version',
    p_payload->>'prompt_template_id',
    nullif(p_payload->>'prompt_template_version', '')::int,
    coalesce(p_payload->'structured_output', '{}'::jsonb),
    p_payload->>'confidence',
    coalesce(p_payload->'warnings', '[]'::jsonb),
    coalesce(p_payload->'dependency_set', v_job.dependency_set),
    coalesce(p_payload->>'dependency_fingerprint', 'unknown'),
    coalesce(
      (select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(p_payload->'citation_finding_ids', '[]'::jsonb)) t(x)),
      '{}'
    ),
    v_job.requested_by
  )
  returning id into v_id;

  update public.ai_jobs
  set result_proposal_ids = array_append(result_proposal_ids, v_id),
      updated_at = now()
  where id = p_job_id;

  return v_id;
end;
$$;

revoke all on function public.create_ai_proposal(text, uuid, bigint, text, jsonb) from public;
grant execute on function public.create_ai_proposal(text, uuid, bigint, text, jsonb) to toladot_ai_worker;

create or replace function public.complete_ai_job(
  p_worker_secret text,
  p_job_id uuid,
  p_fencing_token bigint,
  p_worker_id text,
  p_status public.ai_job_status,
  p_error_code text default null,
  p_error_message text default null,
  p_tokens_in int default 0,
  p_tokens_out int default 0,
  p_cost_usd numeric default 0
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if not public.ai_verify_worker_secret(p_worker_secret) then
    raise exception 'invalid worker secret';
  end if;

  if p_status not in ('awaiting_review', 'completed', 'failed', 'cancelled') then
    raise exception 'invalid terminal status';
  end if;

  update public.ai_jobs
  set
    status = p_status,
    error_code = p_error_code,
    error_message = p_error_message,
    tokens_in = coalesce(p_tokens_in, 0),
    tokens_out = coalesce(p_tokens_out, 0),
    cost_usd = coalesce(p_cost_usd, 0),
    completed_at = now(),
    lease_expires_at = null,
    updated_at = now()
  where id = p_job_id
    and lease_owner = p_worker_id
    and fencing_token = p_fencing_token
    and status = 'running';

  return found;
end;
$$;

revoke all on function public.complete_ai_job(text, uuid, bigint, text, public.ai_job_status, text, text, int, int, numeric) from public;
grant execute on function public.complete_ai_job(text, uuid, bigint, text, public.ai_job_status, text, text, int, int, numeric) to toladot_ai_worker;

create or replace function public.record_ai_usage_event(
  p_worker_secret text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_id uuid;
begin
  if not public.ai_verify_worker_secret(p_worker_secret) then
    raise exception 'invalid worker secret';
  end if;

  insert into public.ai_usage_events (
    job_id, conversation_id, provider, model_id, adapter_code, task_type,
    tokens_in, tokens_out, estimated_cost_usd, duration_ms
  ) values (
    nullif(p_payload->>'job_id', '')::uuid,
    nullif(p_payload->>'conversation_id', '')::uuid,
    p_payload->>'provider',
    p_payload->>'model_id',
    p_payload->>'adapter_code',
    p_payload->>'task_type',
    coalesce((p_payload->>'tokens_in')::int, 0),
    coalesce((p_payload->>'tokens_out')::int, 0),
    coalesce((p_payload->>'estimated_cost_usd')::numeric, 0),
    nullif(p_payload->>'duration_ms', '')::int
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_ai_usage_event(text, jsonb) from public;
grant execute on function public.record_ai_usage_event(text, jsonb) to toladot_ai_worker;

-- Allow authenticated editors to request cancel / read via RLS; helper for cancel:
create or replace function public.request_cancel_ai_job(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or not public.has_capability('run_ai_research') then
    raise exception 'not authorized';
  end if;

  update public.ai_jobs
  set cancel_requested = true, updated_at = now()
  where id = p_job_id
    and requested_by = auth.uid()
    and status in ('queued', 'running');

  return found;
end;
$$;

revoke all on function public.request_cancel_ai_job(uuid) from public;
grant execute on function public.request_cancel_ai_job(uuid) to authenticated;

-- Bridge for Node worker that authenticates via secret over PostgREST:
-- Grant EXECUTE also via a SECURITY DEFINER wrapper callable with secret
-- from roles that hold the secret (worker connects with dedicated DB user
-- OR uses service-less path below).
-- For hosted Supabase without LOGIN role password: allow anon to call
-- worker RPCs ONLY when secret validates (webhook pattern). Still no
-- canonical write path.

grant execute on function public.claim_ai_job(text, text, int) to anon, authenticated;
grant execute on function public.heartbeat_ai_job(text, uuid, bigint, text, int) to anon, authenticated;
grant execute on function public.get_ai_job_bundle(text, uuid, bigint, text) to anon, authenticated;
grant execute on function public.store_ai_tool_result(text, uuid, bigint, text, text, jsonb) to anon, authenticated;
grant execute on function public.upsert_ai_citation_finding(text, uuid, bigint, text, jsonb) to anon, authenticated;
grant execute on function public.create_ai_proposal(text, uuid, bigint, text, jsonb) to anon, authenticated;
grant execute on function public.complete_ai_job(text, uuid, bigint, text, public.ai_job_status, text, text, int, int, numeric) to anon, authenticated;
grant execute on function public.record_ai_usage_event(text, jsonb) to anon, authenticated;

comment on role toladot_ai_worker is
  'Least-privilege AI worker role: EXECUTE on AI operational RPCs only; no canonical/public DML.';
