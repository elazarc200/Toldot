-- Phase 5: production security hardening for Pilot Internet environment.
-- 1) Revoke unnecessary anon/PUBLIC EXECUTE on SECURITY DEFINER RPCs
-- 2) Keep authenticated EXECUTE where editors/workers legitimately call RPCs
-- 3) Fix mutable search_path on helper functions flagged by advisors

-- ---------------------------------------------------------------------------
-- Worker auth helpers — must not be callable by anon
-- ---------------------------------------------------------------------------
revoke all on function public.ai_authorize_worker(text) from public;
revoke all on function public.ai_authorize_worker(text) from anon;
revoke all on function public.ai_authorize_worker(text) from authenticated;
revoke all on function public.ai_verify_worker_secret(text) from public;
revoke all on function public.ai_verify_worker_secret(text) from anon;
revoke all on function public.ai_verify_worker_secret(text) from authenticated;

-- Worker operational RPCs (anon already revoked in 120700; reinforce)
revoke execute on function public.claim_ai_job(text, text, int) from anon, public;
revoke execute on function public.heartbeat_ai_job(text, uuid, bigint, text, int) from anon, public;
revoke execute on function public.get_ai_job_bundle(text, uuid, bigint, text) from anon, public;
revoke execute on function public.store_ai_tool_result(text, uuid, bigint, text, text, jsonb) from anon, public;
revoke execute on function public.upsert_ai_citation_finding(text, uuid, bigint, text, jsonb) from anon, public;
revoke execute on function public.create_ai_proposal(text, uuid, bigint, text, jsonb) from anon, public;
revoke execute on function public.complete_ai_job(text, uuid, bigint, text, public.ai_job_status, text, text, int, int, numeric) from anon, public;
revoke execute on function public.record_ai_usage_event(text, jsonb) from anon, public;

grant execute on function public.claim_ai_job(text, text, int) to authenticated;
grant execute on function public.heartbeat_ai_job(text, uuid, bigint, text, int) to authenticated;
grant execute on function public.get_ai_job_bundle(text, uuid, bigint, text) to authenticated;
grant execute on function public.store_ai_tool_result(text, uuid, bigint, text, text, jsonb) to authenticated;
grant execute on function public.upsert_ai_citation_finding(text, uuid, bigint, text, jsonb) to authenticated;
grant execute on function public.create_ai_proposal(text, uuid, bigint, text, jsonb) to authenticated;
grant execute on function public.complete_ai_job(text, uuid, bigint, text, public.ai_job_status, text, text, int, int, numeric) to authenticated;
grant execute on function public.record_ai_usage_event(text, jsonb) to authenticated;

-- Editor AI RPCs — authenticated only
revoke execute on function public.enqueue_ai_job(
  text, public.ai_entity_type, uuid, uuid, text, jsonb, jsonb, text[], boolean, uuid[], text, text
) from anon, public;
grant execute on function public.enqueue_ai_job(
  text, public.ai_entity_type, uuid, uuid, text, jsonb, jsonb, text[], boolean, uuid[], text, text
) to authenticated;

revoke execute on function public.request_cancel_ai_job(uuid) from anon, public;
grant execute on function public.request_cancel_ai_job(uuid) to authenticated;

-- Publish / rollback / lifecycle — authenticated only (capability-gated inside)
revoke execute on function public.publish_person(uuid) from anon, public;
revoke execute on function public.publish_place(uuid) from anon, public;
revoke execute on function public.publish_period(uuid) from anon, public;
revoke execute on function public.rollback_person_snapshot(uuid) from anon, public;
revoke execute on function public.rollback_place_snapshot(uuid) from anon, public;
revoke execute on function public.rollback_period_snapshot(uuid) from anon, public;
revoke execute on function public.transition_person_lifecycle(uuid, public.lifecycle_status) from anon, public;

grant execute on function public.publish_person(uuid) to authenticated;
grant execute on function public.publish_place(uuid) to authenticated;
grant execute on function public.publish_period(uuid) to authenticated;
grant execute on function public.rollback_person_snapshot(uuid) to authenticated;
grant execute on function public.rollback_place_snapshot(uuid) to authenticated;
grant execute on function public.rollback_period_snapshot(uuid) to authenticated;
grant execute on function public.transition_person_lifecycle(uuid, public.lifecycle_status) to authenticated;

-- Structural / incremental visualization — authenticated only
revoke execute on function public.activate_visualization_build(uuid) from anon, public;
revoke execute on function public.ensure_active_visualization_build() from anon, public;
revoke execute on function public.structural_rebuild_and_activate(text) from anon, public;
revoke execute on function public.structural_rebuild_visualization_projections(text) from anon, public;
revoke execute on function public.incremental_remove_seder_person(uuid) from anon, public;
revoke execute on function public.incremental_sync_map_person_places(uuid, jsonb) from anon, public;
revoke execute on function public.incremental_sync_map_person_places_to_build(uuid, uuid, jsonb) from anon, public;
revoke execute on function public.incremental_sync_map_place(uuid, uuid, jsonb) from anon, public;
revoke execute on function public.incremental_sync_map_place_to_build(uuid, uuid, uuid, jsonb) from anon, public;
revoke execute on function public.incremental_sync_seder_person(uuid, uuid, jsonb) from anon, public;
revoke execute on function public.incremental_sync_seder_person_to_build(uuid, uuid, uuid, jsonb) from anon, public;

grant execute on function public.activate_visualization_build(uuid) to authenticated;
grant execute on function public.ensure_active_visualization_build() to authenticated;
grant execute on function public.structural_rebuild_and_activate(text) to authenticated;
grant execute on function public.structural_rebuild_visualization_projections(text) to authenticated;
grant execute on function public.incremental_remove_seder_person(uuid) to authenticated;
grant execute on function public.incremental_sync_map_person_places(uuid, jsonb) to authenticated;
grant execute on function public.incremental_sync_map_person_places_to_build(uuid, uuid, jsonb) to authenticated;
grant execute on function public.incremental_sync_map_place(uuid, uuid, jsonb) to authenticated;
grant execute on function public.incremental_sync_map_place_to_build(uuid, uuid, uuid, jsonb) to authenticated;
grant execute on function public.incremental_sync_seder_person(uuid, uuid, jsonb) to authenticated;
grant execute on function public.incremental_sync_seder_person_to_build(uuid, uuid, uuid, jsonb) to authenticated;

-- Aggregate builders are internal to publish paths — revoke client EXECUTE
revoke execute on function public.build_person_aggregate_payload(uuid) from anon, public, authenticated;
revoke execute on function public.build_place_aggregate_payload(uuid) from anon, public, authenticated;
revoke execute on function public.build_period_aggregate_payload(uuid) from anon, public, authenticated;

-- Capability helpers — authenticated may call; anon must not
revoke execute on function public.require_capability(text) from anon, public;
grant execute on function public.require_capability(text) to authenticated;

revoke execute on function public.has_capability(text) from anon, public;
grant execute on function public.has_capability(text) to authenticated;

revoke execute on function public.is_editorial() from anon, public;
grant execute on function public.is_editorial() to authenticated;

-- ---------------------------------------------------------------------------
-- Fix mutable search_path on helpers (advisor WARN)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'slugify_he',
        'allocate_public_slug',
        'upsert_entity_slug',
        'replace_search_doc',
        'sync_projections_from_person_snapshot',
        'sync_projections_from_place_snapshot',
        'sync_projections_from_period_snapshot',
        'hebrew_alpha_letter'
      )
  loop
    execute format('alter function %s set search_path = pg_catalog, public', r.sig);
  end loop;
end $$;

comment on function public.ai_authorize_worker(text) is
  'Internal worker gate only. No EXECUTE for anon/authenticated clients.';
