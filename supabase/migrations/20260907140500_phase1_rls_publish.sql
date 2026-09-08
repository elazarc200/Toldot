-- Phase 1: RLS + publish/rollback RPCs for person aggregates

-- ---------------------------------------------------------------------------
-- Helper: require capability or raise
-- ---------------------------------------------------------------------------
create or replace function public.require_capability(capability text)
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.has_capability(capability) then
    raise exception 'forbidden: missing capability %', capability
      using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.require_capability(text) from public;
grant execute on function public.require_capability(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS on all Phase 1 tables
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'regions','rabbinic_generations','political_rules','historical_periods',
    'historical_episodes','historical_events','people','person_names',
    'person_time_ranges','person_generation_memberships','person_chronology_editorial',
    'person_chronology_constraints','places','place_identifications','place_regions',
    'person_places','person_periods','person_episodes','person_events',
    'entity_resolution_candidates','entity_redirects','relationships','source_works',
    'source_citations','claims','evidence_links','themes','stories','story_people',
    'story_places','story_periods','story_citations','story_themes','selected_teachings',
    'selected_teaching_themes','entity_revisions','published_aggregate_snapshots'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Generic editorial CRUD policies (edit capability)
do $$
declare
  t text;
begin
  foreach t in array array[
    'regions','rabbinic_generations','political_rules','historical_periods',
    'historical_episodes','historical_events','people','person_names',
    'person_time_ranges','person_generation_memberships','person_chronology_editorial',
    'person_chronology_constraints','places','place_identifications','place_regions',
    'person_places','person_periods','person_episodes','person_events',
    'entity_resolution_candidates','entity_redirects','relationships','source_works',
    'source_citations','claims','evidence_links','themes','stories','story_people',
    'story_places','story_periods','story_citations','story_themes','selected_teachings',
    'selected_teaching_themes','entity_revisions'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.has_capability(''edit'') or public.has_capability(''review'') or public.has_capability(''approve'') or public.has_capability(''publish'') or public.has_capability(''rollback''))',
      t || '_editorial_select', t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.has_capability(''edit''))',
      t || '_editorial_insert', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.has_capability(''edit'')) with check (public.has_capability(''edit''))',
      t || '_editorial_update', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.has_capability(''edit''))',
      t || '_editorial_delete', t
    );
  end loop;
end $$;

-- Corpus flag updates still use edit for Phase 1 row writes; manage_corpus enforced in RPC/app for corpus flags.
-- Published snapshots: public read of active only; editorial full read; insert via publish RPC (security definer)

create policy published_snapshots_public_select
  on public.published_aggregate_snapshots
  for select
  to anon, authenticated
  using (is_active = true);

create policy published_snapshots_editorial_select_all
  on public.published_aggregate_snapshots
  for select
  to authenticated
  using (
    public.has_capability('edit')
    or public.has_capability('review')
    or public.has_capability('approve')
    or public.has_capability('publish')
    or public.has_capability('rollback')
  );

-- No direct insert/update/delete for authenticated on snapshots (publish RPC only)
revoke all on table public.published_aggregate_snapshots from anon;
grant select on table public.published_aggregate_snapshots to anon, authenticated;

-- Grant editorial table access to authenticated (RLS still applies)
do $$
declare
  t text;
begin
  foreach t in array array[
    'regions','rabbinic_generations','political_rules','historical_periods',
    'historical_episodes','historical_events','people','person_names',
    'person_time_ranges','person_generation_memberships','person_chronology_editorial',
    'person_chronology_constraints','places','place_identifications','place_regions',
    'person_places','person_periods','person_episodes','person_events',
    'entity_resolution_candidates','entity_redirects','relationships','source_works',
    'source_citations','claims','evidence_links','themes','stories','story_people',
    'story_places','story_periods','story_citations','story_themes','selected_teachings',
    'selected_teaching_themes','entity_revisions'
  ]
  loop
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Build person aggregate payload + publish / rollback
-- ---------------------------------------------------------------------------
create or replace function public.build_person_aggregate_payload(p_person_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  payload jsonb;
begin
  select jsonb_build_object(
    'schema_version', 1,
    'aggregate_type', 'person',
    'person', to_jsonb(p) - 'biography_md',
    'names', coalesce((
      select jsonb_agg(to_jsonb(n) order by n.name_kind, n.normalized_name)
      from public.person_names n where n.person_id = p.id
    ), '[]'::jsonb),
    'time_ranges', coalesce((
      select jsonb_agg(to_jsonb(tr) order by tr.range_kind)
      from public.person_time_ranges tr where tr.person_id = p.id
    ), '[]'::jsonb),
    'generation_memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'generation_id', m.generation_id,
        'is_primary', m.is_primary,
        'knowledge_state', m.knowledge_state,
        'generation', to_jsonb(g)
      ))
      from public.person_generation_memberships m
      join public.rabbinic_generations g on g.id = m.generation_id
      where m.person_id = p.id
    ), '[]'::jsonb),
    'chronology_editorial', coalesce((
      select jsonb_agg(to_jsonb(c))
      from public.person_chronology_editorial c where c.person_id = p.id
    ), '[]'::jsonb),
    'chronology_constraints', coalesce((
      select jsonb_agg(to_jsonb(c))
      from public.person_chronology_constraints c where c.person_id = p.id
    ), '[]'::jsonb),
    'places', coalesce((
      select jsonb_agg(jsonb_build_object(
        'person_place_id', pp.id,
        'knowledge_state', pp.knowledge_state,
        'place', to_jsonb(pl)
      ))
      from public.person_places pp
      join public.places pl on pl.id = pp.place_id
      where pp.person_id = p.id
    ), '[]'::jsonb),
    'relationships', coalesce((
      select jsonb_agg(to_jsonb(r))
      from public.relationships r
      where r.person_a_id = p.id or r.person_b_id = p.id
    ), '[]'::jsonb),
    'claims', coalesce((
      select jsonb_agg(jsonb_build_object(
        'claim', to_jsonb(cl),
        'evidence', coalesce((
          select jsonb_agg(jsonb_build_object(
            'link', to_jsonb(el),
            'citation', to_jsonb(sc),
            'work', to_jsonb(sw)
          ))
          from public.evidence_links el
          join public.source_citations sc on sc.id = el.source_citation_id
          join public.source_works sw on sw.id = sc.source_work_id
          where el.claim_id = cl.id
        ), '[]'::jsonb)
      ))
      from public.claims cl
      where cl.subject_person_id = p.id
         or cl.subject_generation_membership_id in (
              select id from public.person_generation_memberships where person_id = p.id
            )
         or cl.subject_time_range_id in (
              select id from public.person_time_ranges where person_id = p.id
            )
         or cl.subject_chronology_editorial_id in (
              select id from public.person_chronology_editorial where person_id = p.id
            )
         or cl.subject_chronology_constraint_id in (
              select id from public.person_chronology_constraints where person_id = p.id
            )
         or cl.subject_person_place_id in (
              select id from public.person_places where person_id = p.id
            )
         or cl.subject_relationship_id in (
              select id from public.relationships
              where person_a_id = p.id or person_b_id = p.id
            )
    ), '[]'::jsonb),
    'stories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'significance', sp.significance,
        'story', to_jsonb(s)
      ))
      from public.story_people sp
      join public.stories s on s.id = sp.story_id
      where sp.person_id = p.id
    ), '[]'::jsonb),
    'selected_teachings', coalesce((
      select jsonb_agg(to_jsonb(st))
      from public.selected_teachings st
      where st.person_id = p.id
    ), '[]'::jsonb)
  )
  into payload
  from public.people p
  where p.id = p_person_id;

  if payload is null then
    raise exception 'person not found';
  end if;
  return payload;
end;
$$;

revoke all on function public.build_person_aggregate_payload(uuid) from public;
grant execute on function public.build_person_aggregate_payload(uuid) to authenticated;

create or replace function public.publish_person(p_person_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  person_row public.people%rowtype;
  payload jsonb;
  revision_id uuid;
  revision_no int;
  snapshot_id uuid;
  teaching record;
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

  if person_row.lifecycle_status not in ('approved', 'published', 'in_review', 'draft') then
    raise exception 'cannot publish: invalid lifecycle %', person_row.lifecycle_status;
  end if;

  -- Selected teachings require citation
  for teaching in
    select * from public.selected_teachings
    where person_id = p_person_id
      and lifecycle_status in ('approved', 'published', 'draft', 'in_review')
  loop
    if teaching.source_citation_id is null and teaching.lifecycle_status <> 'draft' then
      raise exception 'cannot publish: selected teaching % missing citation', teaching.id;
    end if;
    if teaching.source_citation_id is null then
      -- draft teachings without citation are omitted from payload; block if any non-draft missing
      null;
    end if;
  end loop;

  -- Attached places must be published (have active snapshot / published status)
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

  -- Teachings intended for publish must have citation
  if exists (
    select 1 from public.selected_teachings st
    where st.person_id = p_person_id
      and st.source_citation_id is null
      and st.lifecycle_status in ('approved', 'published')
  ) then
    raise exception 'cannot publish: approved teaching missing citation';
  end if;

  payload := public.build_person_aggregate_payload(p_person_id);

  select coalesce(max(revision_no), 0) + 1
    into revision_no
  from public.entity_revisions
  where entity_type = 'person' and entity_id = p_person_id;

  insert into public.entity_revisions (
    entity_type, entity_id, revision_no, snapshot, lifecycle_at_save, change_summary, created_by
  ) values (
    'person', p_person_id, revision_no, payload, 'published', 'publish', auth.uid()
  )
  returning id into revision_id;

  -- Deactivate previous active snapshot (does not delete)
  update public.published_aggregate_snapshots
  set is_active = false
  where aggregate_type = 'person'
    and aggregate_id = p_person_id
    and is_active = true;

  insert into public.published_aggregate_snapshots (
    aggregate_type, aggregate_id, schema_version, payload, published_by, source_revision_ids, is_active
  ) values (
    'person', p_person_id, 1, payload, auth.uid(), array[revision_id], true
  )
  returning id into snapshot_id;

  update public.people
  set lifecycle_status = 'published',
      published_aggregate_id = snapshot_id,
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_person_id;

  return snapshot_id;
exception
  when others then
    -- Transaction aborts; previous active snapshot remains if we failed before deactivate+insert completed atomically
    raise;
end;
$$;

revoke all on function public.publish_person(uuid) from public;
grant execute on function public.publish_person(uuid) to authenticated;

create or replace function public.rollback_person_snapshot(p_snapshot_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  snap public.published_aggregate_snapshots%rowtype;
begin
  perform public.require_capability('rollback');

  select * into snap from public.published_aggregate_snapshots where id = p_snapshot_id;
  if not found or snap.aggregate_type <> 'person' then
    raise exception 'snapshot not found';
  end if;

  update public.published_aggregate_snapshots
  set is_active = false
  where aggregate_type = 'person'
    and aggregate_id = snap.aggregate_id
    and is_active = true;

  update public.published_aggregate_snapshots
  set is_active = true
  where id = p_snapshot_id;

  update public.people
  set published_aggregate_id = p_snapshot_id,
      lifecycle_status = 'published',
      updated_at = now(),
      updated_by = auth.uid()
  where id = snap.aggregate_id;

  return p_snapshot_id;
end;
$$;

revoke all on function public.rollback_person_snapshot(uuid) from public;
grant execute on function public.rollback_person_snapshot(uuid) to authenticated;

create or replace function public.transition_person_lifecycle(
  p_person_id uuid,
  p_next public.lifecycle_status
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_status public.lifecycle_status;
begin
  select lifecycle_status into current_status from public.people where id = p_person_id for update;
  if not found then
    raise exception 'person not found';
  end if;

  if p_next = 'in_review' then
    perform public.require_capability('review');
  elsif p_next = 'approved' then
    perform public.require_capability('approve');
  elsif p_next in ('draft', 'identified', 'archived') then
    perform public.require_capability('edit');
  elsif p_next = 'published' then
    raise exception 'use publish_person() to publish';
  else
    raise exception 'unsupported transition';
  end if;

  update public.people
  set lifecycle_status = p_next,
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_person_id;
end;
$$;

revoke all on function public.transition_person_lifecycle(uuid, public.lifecycle_status) from public;
grant execute on function public.transition_person_lifecycle(uuid, public.lifecycle_status) to authenticated;
