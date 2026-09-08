-- Phase 1: publish_place so Person publish preconditions can be satisfied

create or replace function public.publish_place(p_place_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  place_row public.places%rowtype;
  payload jsonb;
  revision_id uuid;
  revision_no int;
  snapshot_id uuid;
begin
  perform public.require_capability('publish');

  select * into place_row from public.places where id = p_place_id for update;
  if not found then
    raise exception 'place not found';
  end if;

  payload := jsonb_build_object(
    'schema_version', 1,
    'aggregate_type', 'place',
    'place', to_jsonb(place_row),
    'identifications', coalesce((
      select jsonb_agg(to_jsonb(i)) from public.place_identifications i where i.place_id = p_place_id
    ), '[]'::jsonb),
    'regions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'is_primary', pr.is_primary,
        'region', to_jsonb(r)
      ))
      from public.place_regions pr
      join public.regions r on r.id = pr.region_id
      where pr.place_id = p_place_id
    ), '[]'::jsonb)
  );

  select coalesce(max(revision_no), 0) + 1 into revision_no
  from public.entity_revisions
  where entity_type = 'place' and entity_id = p_place_id;

  insert into public.entity_revisions (
    entity_type, entity_id, revision_no, snapshot, lifecycle_at_save, change_summary, created_by
  ) values (
    'place', p_place_id, revision_no, payload, 'published', 'publish', auth.uid()
  ) returning id into revision_id;

  update public.published_aggregate_snapshots
  set is_active = false
  where aggregate_type = 'place' and aggregate_id = p_place_id and is_active = true;

  insert into public.published_aggregate_snapshots (
    aggregate_type, aggregate_id, schema_version, payload, published_by, source_revision_ids, is_active
  ) values (
    'place', p_place_id, 1, payload, auth.uid(), array[revision_id], true
  ) returning id into snapshot_id;

  update public.places
  set lifecycle_status = 'published',
      published_aggregate_id = snapshot_id,
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_place_id;

  return snapshot_id;
end;
$$;

revoke all on function public.publish_place(uuid) from public;
grant execute on function public.publish_place(uuid) to authenticated;
