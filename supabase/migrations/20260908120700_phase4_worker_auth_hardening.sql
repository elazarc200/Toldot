-- Phase 4 remediation: least-privilege worker auth for hosted Supabase.
-- Trust boundary:
--   Worker must authenticate as dedicated Auth user (auth.uid() = worker_user_id)
--   AND present AI_WORKER_SECRET matching secret_hash.
--   EXECUTE revoked from anon. No default/reusable migration secret.
--   Still no service-role in the worker process; still no canonical/public writes.

alter table public.ai_worker_config
  add column if not exists worker_user_id uuid references auth.users (id) on delete set null;

-- Invalidate any previously seeded default/dev secret so it cannot be reused.
update public.ai_worker_config
set
  secret_hash = 'UNCONFIGURED_REQUIRES_BOOTSTRAP',
  worker_user_id = null,
  updated_at = now()
where id = 1;

create or replace function public.ai_authorize_worker(p_secret text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  cfg record;
  acting uuid := auth.uid();
  digest_hex text;
begin
  if acting is null then
    return false;
  end if;
  if p_secret is null or length(trim(p_secret)) = 0 then
    return false;
  end if;

  select worker_user_id, secret_hash into cfg
  from public.ai_worker_config
  where id = 1;

  if cfg.worker_user_id is null then
    return false;
  end if;
  if cfg.secret_hash is null
     or cfg.secret_hash = 'UNCONFIGURED_REQUIRES_BOOTSTRAP'
     or length(cfg.secret_hash) <> 64 then
    return false;
  end if;
  if acting <> cfg.worker_user_id then
    return false;
  end if;

  digest_hex := encode(extensions.digest(p_secret, 'sha256'), 'hex');
  return digest_hex = cfg.secret_hash;
end;
$$;

revoke all on function public.ai_authorize_worker(text) from public;

-- Keep old name as wrapper for clarity in older comments; same rules.
create or replace function public.ai_verify_worker_secret(p_secret text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  return public.ai_authorize_worker(p_secret);
end;
$$;

revoke all on function public.ai_verify_worker_secret(text) from public;

-- Replace worker RPC bodies to use ai_authorize_worker (via existing ai_verify_worker_secret wrapper).
-- Revoke anon EXECUTE entirely — authenticated worker JWT + secret only.

revoke execute on function public.claim_ai_job(text, text, int) from anon;
revoke execute on function public.heartbeat_ai_job(text, uuid, bigint, text, int) from anon;
revoke execute on function public.get_ai_job_bundle(text, uuid, bigint, text) from anon;
revoke execute on function public.store_ai_tool_result(text, uuid, bigint, text, text, jsonb) from anon;
revoke execute on function public.upsert_ai_citation_finding(text, uuid, bigint, text, jsonb) from anon;
revoke execute on function public.create_ai_proposal(text, uuid, bigint, text, jsonb) from anon;
revoke execute on function public.complete_ai_job(text, uuid, bigint, text, public.ai_job_status, text, text, int, int, numeric) from anon;
revoke execute on function public.record_ai_usage_event(text, jsonb) from anon;

-- authenticated retains EXECUTE; authorization inside functions still requires worker_user_id + secret.
grant execute on function public.claim_ai_job(text, text, int) to authenticated;
grant execute on function public.heartbeat_ai_job(text, uuid, bigint, text, int) to authenticated;
grant execute on function public.get_ai_job_bundle(text, uuid, bigint, text) to authenticated;
grant execute on function public.store_ai_tool_result(text, uuid, bigint, text, text, jsonb) to authenticated;
grant execute on function public.upsert_ai_citation_finding(text, uuid, bigint, text, jsonb) to authenticated;
grant execute on function public.create_ai_proposal(text, uuid, bigint, text, jsonb) to authenticated;
grant execute on function public.complete_ai_job(text, uuid, bigint, text, public.ai_job_status, text, text, int, int, numeric) to authenticated;
grant execute on function public.record_ai_usage_event(text, jsonb) to authenticated;

comment on function public.ai_authorize_worker(text) is
  'Worker gate: auth.uid() must equal ai_worker_config.worker_user_id and secret must match SHA-256 hash. Anon cannot pass.';
