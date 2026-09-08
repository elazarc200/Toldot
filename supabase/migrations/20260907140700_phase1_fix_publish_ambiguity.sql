-- Fix ambiguous revision_no in publish RPCs

create or replace function public.publish_place(p_place_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  place_row public.places%rowtype;
  payload jsonb;
  new_revision_id uuid;
  next_revision_no int;
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

  select coalesce(max(er.revision_no), 0) + 1 into next_revision_no
  from public.entity_revisions er
  where er.entity_type = 'place' and er.entity_id = p_place_id;

  insert into public.entity_revisions (
    entity_type, entity_id, revision_no, snapshot, lifecycle_at_save, change_summary, created_by
  ) values (
    'place', p_place_id, next_revision_no, payload, 'published', 'publish', auth.uid()
  ) returning id into new_revision_id;

  update public.published_aggregate_snapshots
  set is_active = false
  where aggregate_type = 'place' and aggregate_id = p_place_id and is_active = true;

  insert into public.published_aggregate_snapshots (
    aggregate_type, aggregate_id, schema_version, payload, published_by, source_revision_ids, is_active
  ) values (
    'place', p_place_id, 1, payload, auth.uid(), array[new_revision_id], true
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

create or replace function public.publish_person(p_person_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  person_row public.people%rowtype;
  payload jsonb;
  new_revision_id uuid;
  next_revision_no int;
  snapshot_id uuid;
  place_link record;
begin
  perform public.require_capability('publish');

  select * into person_row from public.people where id = p_person_id for update;
  if not found then
    raise exception 'person not found';
  end if;

  if person_row.identity_status = 'unresolved' then
    raise exception 'cannot publish: identity unresolved';
  end if;

  for place_link in
    select pl.*
    from public.person_places pp
    join public.places pl on pl.id = pp.place_id
    where pp.person_id = p_person_id
  loop
    if place_link.lifecycle_status <> 'published' or place_link.published_aggregate_id is null then
      raise exception 'cannot publish: place % is not published', place_link.id;
    end if;
  end loop;

  if exists (
    select 1 from public.selected_teachings st
    where st.person_id = p_person_id
      and st.source_citation_id is null
      and st.lifecycle_status in ('approved', 'published')
  ) then
    raise exception 'cannot publish: approved teaching missing citation';
  end if;

  payload := public.build_person_aggregate_payload(p_person_id);

  select coalesce(max(er.revision_no), 0) + 1
    into next_revision_no
  from public.entity_revisions er
  where er.entity_type = 'person' and er.entity_id = p_person_id;

  insert into public.entity_revisions (
    entity_type, entity_id, revision_no, snapshot, lifecycle_at_save, change_summary, created_by
  ) values (
    'person', p_person_id, next_revision_no, payload, 'published', 'publish', auth.uid()
  )
  returning id into new_revision_id;

  update public.published_aggregate_snapshots
  set is_active = false
  where aggregate_type = 'person'
    and aggregate_id = p_person_id
    and is_active = true;

  insert into public.published_aggregate_snapshots (
    aggregate_type, aggregate_id, schema_version, payload, published_by, source_revision_ids, is_active
  ) values (
    'person', p_person_id, 1, payload, auth.uid(), array[new_revision_id], true
  )
  returning id into snapshot_id;

  update public.people
  set lifecycle_status = 'published',
      published_aggregate_id = snapshot_id,
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_person_id;

  return snapshot_id;
end;
$$;
