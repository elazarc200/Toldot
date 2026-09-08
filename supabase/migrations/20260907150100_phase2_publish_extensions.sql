-- Phase 2: slug/search helpers + extended publish RPCs (person/place/period) with atomic projections

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.slugify_he(p_text text)
returns text
language plpgsql
immutable
as $$
declare
  s text;
begin
  s := lower(trim(coalesce(p_text, '')));
  s := regexp_replace(s, '\s+', '-', 'g');
  s := regexp_replace(s, '[^0-9a-z\u0590-\u05FF\-]+', '', 'g');
  s := regexp_replace(s, '-{2,}', '-', 'g');
  s := trim(both '-' from s);
  if s is null or s = '' then
    s := 'entity';
  end if;
  return s;
end;
$$;

create or replace function public.allocate_public_slug(
  p_type public.aggregate_type,
  p_aggregate_id uuid,
  p_base text,
  p_disambiguator text default null
)
returns text
language plpgsql
as $$
declare
  base_slug text;
  candidate text;
  n int := 0;
begin
  base_slug := public.slugify_he(p_base);
  if p_disambiguator is not null and length(trim(p_disambiguator)) > 0 then
    base_slug := base_slug || '-' || public.slugify_he(p_disambiguator);
  end if;
  candidate := base_slug;
  loop
    exit when not exists (
      select 1 from public.published_entity_slugs s
      where s.aggregate_type = p_type
        and s.slug = candidate
        and s.aggregate_id <> p_aggregate_id
    );
    n := n + 1;
    candidate := base_slug || '-' || n::text;
  end loop;
  return candidate;
end;
$$;

create or replace function public.upsert_entity_slug(
  p_type public.aggregate_type,
  p_aggregate_id uuid,
  p_slug text,
  p_snapshot_id uuid
)
returns void
language plpgsql
as $$
declare
  prev_slug text;
begin
  select slug into prev_slug
  from public.published_entity_slugs
  where aggregate_type = p_type and aggregate_id = p_aggregate_id;

  if prev_slug is not null and prev_slug <> p_slug then
    insert into public.published_slug_redirects (aggregate_type, old_slug, aggregate_id)
    values (p_type, prev_slug, p_aggregate_id)
    on conflict (aggregate_type, old_slug) do update
      set aggregate_id = excluded.aggregate_id;
  end if;

  insert into public.published_entity_slugs (aggregate_type, aggregate_id, slug, snapshot_id, updated_at)
  values (p_type, p_aggregate_id, p_slug, p_snapshot_id, now())
  on conflict (aggregate_type, aggregate_id) do update
    set slug = excluded.slug,
        snapshot_id = excluded.snapshot_id,
        updated_at = now();

  -- Drop redirect that would loop to same slug
  delete from public.published_slug_redirects
  where aggregate_type = p_type
    and old_slug = p_slug
    and aggregate_id = p_aggregate_id;
end;
$$;

create or replace function public.replace_search_doc(
  p_type public.aggregate_type,
  p_aggregate_id uuid,
  p_snapshot_id uuid,
  p_primary_name text,
  p_sort_name text,
  p_aliases text[],
  p_disambiguation text,
  p_href_path text,
  p_parent_period_id uuid default null,
  p_anchor text default null
)
returns void
language plpgsql
as $$
declare
  blob text;
begin
  blob := coalesce(p_primary_name, '') || ' ' ||
          coalesce(p_sort_name, '') || ' ' ||
          coalesce(p_disambiguation, '') || ' ' ||
          coalesce(array_to_string(p_aliases, ' '), '');

  if p_parent_period_id is null then
    delete from public.published_search_documents
    where aggregate_type = p_type
      and aggregate_id = p_aggregate_id
      and parent_period_id is null;
  else
    delete from public.published_search_documents
    where aggregate_type = p_type
      and aggregate_id = p_aggregate_id
      and parent_period_id = p_parent_period_id;
  end if;

  insert into public.published_search_documents (
    aggregate_type, aggregate_id, snapshot_id, parent_period_id,
    primary_name, sort_name, aliases, disambiguation, search_blob,
    href_path, anchor, is_active, updated_at
  ) values (
    p_type, p_aggregate_id, p_snapshot_id, p_parent_period_id,
    p_primary_name, coalesce(p_sort_name, ''), coalesce(p_aliases, '{}'),
    p_disambiguation, blob, p_href_path, p_anchor, true, now()
  );
end;
$$;

create or replace function public.sync_projections_from_person_snapshot(
  p_person_id uuid,
  p_snapshot_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
as $$
declare
  person jsonb := p_payload->'person';
  display_name text;
  sort_name text;
  disamb text;
  slug text;
  aliases text[];
  gen_label text;
begin
  display_name := coalesce(person->>'primary_display_name', 'אדם');
  sort_name := coalesce(person->>'sort_name', display_name);
  disamb := person->>'disambiguation_label';

  select coalesce(array_agg(distinct n->>'name_text'), '{}')
  into aliases
  from jsonb_array_elements(coalesce(p_payload->'names', '[]'::jsonb)) n
  where n->>'name_kind' in ('alias', 'alternate', 'spelling_variant', 'primary');

  select coalesce(
    (select g->'generation'->>'name_he'
     from jsonb_array_elements(coalesce(p_payload->'generation_memberships', '[]'::jsonb)) g
     where coalesce((g->>'is_primary')::boolean, false)
     limit 1),
    (select g->'generation'->>'name_he'
     from jsonb_array_elements(coalesce(p_payload->'generation_memberships', '[]'::jsonb)) g
     limit 1)
  ) into gen_label;

  slug := public.allocate_public_slug('person', p_person_id, display_name, disamb);
  perform public.upsert_entity_slug('person', p_person_id, slug, p_snapshot_id);

  perform public.replace_search_doc(
    'person',
    p_person_id,
    p_snapshot_id,
    display_name,
    sort_name,
    aliases,
    nullif(trim(concat_ws(' · ', disamb, gen_label)), ''),
    '/person/' || slug,
    null,
    null
  );
end;
$$;

create or replace function public.sync_projections_from_place_snapshot(
  p_place_id uuid,
  p_snapshot_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
as $$
declare
  place jsonb := p_payload->'place';
  display_name text;
  sort_name text;
  slug text;
  aliases text[];
begin
  display_name := coalesce(place->>'primary_historical_name', 'מקום');
  sort_name := coalesce(place->>'sort_name', display_name);
  select coalesce(array_agg(distinct i->>'modern_name') filter (where i->>'modern_name' is not null), '{}')
  into aliases
  from jsonb_array_elements(coalesce(p_payload->'identifications', '[]'::jsonb)) i;

  slug := public.allocate_public_slug('place', p_place_id, display_name, null);
  perform public.upsert_entity_slug('place', p_place_id, slug, p_snapshot_id);
  perform public.replace_search_doc(
    'place', p_place_id, p_snapshot_id, display_name, sort_name, aliases, null,
    '/place/' || slug, null, null
  );
end;
$$;

create or replace function public.sync_projections_from_period_snapshot(
  p_period_id uuid,
  p_snapshot_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
as $$
declare
  period jsonb := p_payload->'period';
  display_name text;
  slug text;
  ev jsonb;
  ep jsonb;
begin
  display_name := coalesce(period->>'name_he', 'תקופה');
  slug := public.allocate_public_slug('period', p_period_id, display_name, period->>'code');
  perform public.upsert_entity_slug('period', p_period_id, slug, p_snapshot_id);

  -- Replace all search docs owned by this period (period + embedded events/episodes)
  delete from public.published_search_documents
  where parent_period_id = p_period_id
     or (aggregate_type = 'period' and aggregate_id = p_period_id);

  perform public.replace_search_doc(
    'period', p_period_id, p_snapshot_id, display_name, display_name, '{}',
    period->>'textual_label', '/period/' || slug, null, null
  );

  for ep in select * from jsonb_array_elements(coalesce(p_payload->'episodes', '[]'::jsonb))
  loop
    perform public.replace_search_doc(
      'episode',
      (ep->>'id')::uuid,
      p_snapshot_id,
      coalesce(ep->>'name_he', 'פרק'),
      coalesce(ep->>'name_he', ''),
      '{}',
      null,
      '/period/' || slug,
      p_period_id,
      'episode-' || (ep->>'id')
    );
  end loop;

  for ev in select * from jsonb_array_elements(coalesce(p_payload->'events', '[]'::jsonb))
  loop
    perform public.replace_search_doc(
      'event',
      (ev->>'id')::uuid,
      p_snapshot_id,
      coalesce(ev->>'name_he', 'אירוע'),
      coalesce(ev->>'name_he', ''),
      '{}',
      null,
      '/period/' || slug,
      p_period_id,
      'event-' || (ev->>'id')
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Person payload v2
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
    'schema_version', 2,
    'aggregate_type', 'person',
    'person', to_jsonb(p),
    'canonical_person_id', p.id,
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
        'association_note', pp.association_note,
        'place', jsonb_build_object(
          'id', pl.id,
          'primary_historical_name', pl.primary_historical_name,
          'sort_name', pl.sort_name,
          'published_aggregate_id', pl.published_aggregate_id,
          'lifecycle_status', pl.lifecycle_status
        )
      ))
      from public.person_places pp
      join public.places pl on pl.id = pp.place_id
      where pp.person_id = p.id
        and pl.lifecycle_status = 'published'
    ), '[]'::jsonb),
    'periods', coalesce((
      select jsonb_agg(jsonb_build_object(
        'knowledge_state', pp.knowledge_state,
        'period', jsonb_build_object(
          'id', hp.id,
          'code', hp.code,
          'name_he', hp.name_he,
          'lifecycle_status', hp.lifecycle_status,
          'published_aggregate_id', hp.published_aggregate_id
        )
      ))
      from public.person_periods pp
      join public.historical_periods hp on hp.id = pp.period_id
      where pp.person_id = p.id
        and hp.lifecycle_status = 'published'
    ), '[]'::jsonb),
    'episodes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'knowledge_state', pe.knowledge_state,
        'episode', to_jsonb(he)
      ))
      from public.person_episodes pe
      join public.historical_episodes he on he.id = pe.episode_id
      where pe.person_id = p.id
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'knowledge_state', pev.knowledge_state,
        'event', to_jsonb(hev)
      ))
      from public.person_events pev
      join public.historical_events hev on hev.id = pev.event_id
      where pev.person_id = p.id
    ), '[]'::jsonb),
    'relationships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'family', r.family,
        'is_directional', r.is_directional,
        'knowledge_state', r.knowledge_state,
        'dispute_state', r.dispute_state,
        'person_a_id', r.person_a_id,
        'person_b_id', r.person_b_id,
        'person_a', jsonb_build_object(
          'id', a.id,
          'primary_display_name', a.primary_display_name,
          'disambiguation_label', a.disambiguation_label,
          'lifecycle_status', a.lifecycle_status
        ),
        'person_b', jsonb_build_object(
          'id', b.id,
          'primary_display_name', b.primary_display_name,
          'disambiguation_label', b.disambiguation_label,
          'lifecycle_status', b.lifecycle_status
        )
      ))
      from public.relationships r
      join public.people a on a.id = r.person_a_id
      join public.people b on b.id = r.person_b_id
      where (r.person_a_id = p.id or r.person_b_id = p.id)
        and r.lifecycle_status in ('approved', 'published', 'in_review', 'draft')
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
              select id from public.person_generation_memberships where person_id = p.id)
         or cl.subject_time_range_id in (
              select id from public.person_time_ranges where person_id = p.id)
         or cl.subject_chronology_editorial_id in (
              select id from public.person_chronology_editorial where person_id = p.id)
         or cl.subject_chronology_constraint_id in (
              select id from public.person_chronology_constraints where person_id = p.id)
         or cl.subject_person_place_id in (
              select id from public.person_places where person_id = p.id)
         or cl.subject_relationship_id in (
              select id from public.relationships
              where person_a_id = p.id or person_b_id = p.id)
    ), '[]'::jsonb),
    'stories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'significance', sp.significance,
        'story', to_jsonb(s)
      ) order by
        case sp.significance
          when 'primary' then 1
          when 'major' then 2
          when 'supporting' then 3
          else 4
        end
      )
      from public.story_people sp
      join public.stories s on s.id = sp.story_id
      where sp.person_id = p.id
    ), '[]'::jsonb),
    'selected_teachings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'teaching', to_jsonb(st),
        'citation', to_jsonb(sc),
        'work', to_jsonb(sw)
      ))
      from public.selected_teachings st
      left join public.source_citations sc on sc.id = st.source_citation_id
      left join public.source_works sw on sw.id = sc.source_work_id
      where st.person_id = p.id
        and st.source_citation_id is not null
    ), '[]'::jsonb),
    'contemporaries', coalesce((
      select jsonb_agg(x.obj)
      from (
        select distinct jsonb_build_object(
          'id', other.id,
          'primary_display_name', other.primary_display_name,
          'disambiguation_label', other.disambiguation_label,
          'lifecycle_status', other.lifecycle_status
        ) as obj
        from public.person_generation_memberships mine
        join public.person_generation_memberships theirs
          on theirs.generation_id = mine.generation_id
         and theirs.person_id <> mine.person_id
        join public.people other on other.id = theirs.person_id
        where mine.person_id = p.id
          and other.lifecycle_status = 'published'
        limit 40
      ) x
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

-- ---------------------------------------------------------------------------
-- Place payload v2
-- ---------------------------------------------------------------------------
create or replace function public.build_place_aggregate_payload(p_place_id uuid)
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
    'schema_version', 2,
    'aggregate_type', 'place',
    'place', to_jsonb(pl),
    'identifications', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.is_preferred desc, i.created_at)
      from public.place_identifications i where i.place_id = pl.id
    ), '[]'::jsonb),
    'regions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'is_primary', pr.is_primary,
        'region', to_jsonb(r)
      ))
      from public.place_regions pr
      join public.regions r on r.id = pr.region_id
      where pr.place_id = pl.id
    ), '[]'::jsonb),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
        'knowledge_state', pp.knowledge_state,
        'person', jsonb_build_object(
          'id', pe.id,
          'primary_display_name', pe.primary_display_name,
          'disambiguation_label', pe.disambiguation_label,
          'lifecycle_status', pe.lifecycle_status
        )
      ))
      from public.person_places pp
      join public.people pe on pe.id = pp.person_id
      where pp.place_id = pl.id
        and pe.lifecycle_status = 'published'
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
      where cl.subject_place_id = pl.id
         or cl.subject_person_place_id in (
              select id from public.person_places where place_id = pl.id)
    ), '[]'::jsonb)
  )
  into payload
  from public.places pl
  where pl.id = p_place_id;

  if payload is null then
    raise exception 'place not found';
  end if;
  return payload;
end;
$$;

-- ---------------------------------------------------------------------------
-- Period payload + publish
-- ---------------------------------------------------------------------------
create or replace function public.build_period_aggregate_payload(p_period_id uuid)
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
    'aggregate_type', 'period',
    'period', to_jsonb(hp),
    'episodes', coalesce((
      select jsonb_agg(to_jsonb(ep) order by ep.start_year nulls last, ep.name_he)
      from public.historical_episodes ep where ep.period_id = hp.id
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(to_jsonb(ev) order by ev.start_year nulls last, ev.name_he)
      from public.historical_events ev
      where ev.period_id = hp.id
         or ev.episode_id in (select id from public.historical_episodes where period_id = hp.id)
    ), '[]'::jsonb),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
        'knowledge_state', pp.knowledge_state,
        'person', jsonb_build_object(
          'id', pe.id,
          'primary_display_name', pe.primary_display_name,
          'disambiguation_label', pe.disambiguation_label,
          'lifecycle_status', pe.lifecycle_status
        )
      ))
      from public.person_periods pp
      join public.people pe on pe.id = pp.person_id
      where pp.period_id = hp.id
        and pe.lifecycle_status = 'published'
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
      where cl.subject_period_id = hp.id
         or cl.subject_episode_id in (select id from public.historical_episodes where period_id = hp.id)
         or cl.subject_event_id in (
              select id from public.historical_events
              where period_id = hp.id
                 or episode_id in (select id from public.historical_episodes where period_id = hp.id)
            )
    ), '[]'::jsonb)
  )
  into payload
  from public.historical_periods hp
  where hp.id = p_period_id;

  if payload is null then
    raise exception 'period not found';
  end if;
  return payload;
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
  revision_id uuid;
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
  returning id into revision_id;

  update public.published_aggregate_snapshots
  set is_active = false
  where aggregate_type = 'person'
    and aggregate_id = p_person_id
    and is_active = true;

  insert into public.published_aggregate_snapshots (
    aggregate_type, aggregate_id, schema_version, payload, published_by, source_revision_ids, is_active
  ) values (
    'person', p_person_id, 2, payload, auth.uid(), array[revision_id], true
  )
  returning id into snapshot_id;

  update public.people
  set lifecycle_status = 'published',
      published_aggregate_id = snapshot_id,
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_person_id;

  perform public.sync_projections_from_person_snapshot(p_person_id, snapshot_id, payload);

  return snapshot_id;
end;
$$;

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
  next_revision_no int;
  snapshot_id uuid;
begin
  perform public.require_capability('publish');

  select * into place_row from public.places where id = p_place_id for update;
  if not found then
    raise exception 'place not found';
  end if;

  payload := public.build_place_aggregate_payload(p_place_id);

  select coalesce(max(er.revision_no), 0) + 1
    into next_revision_no
  from public.entity_revisions er
  where er.entity_type = 'place' and er.entity_id = p_place_id;

  insert into public.entity_revisions (
    entity_type, entity_id, revision_no, snapshot, lifecycle_at_save, change_summary, created_by
  ) values (
    'place', p_place_id, next_revision_no, payload, 'published', 'publish', auth.uid()
  )
  returning id into revision_id;

  update public.published_aggregate_snapshots
  set is_active = false
  where aggregate_type = 'place'
    and aggregate_id = p_place_id
    and is_active = true;

  insert into public.published_aggregate_snapshots (
    aggregate_type, aggregate_id, schema_version, payload, published_by, source_revision_ids, is_active
  ) values (
    'place', p_place_id, 2, payload, auth.uid(), array[revision_id], true
  )
  returning id into snapshot_id;

  update public.places
  set lifecycle_status = 'published',
      published_aggregate_id = snapshot_id,
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_place_id;

  perform public.sync_projections_from_place_snapshot(p_place_id, snapshot_id, payload);

  return snapshot_id;
end;
$$;

create or replace function public.publish_period(p_period_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  period_row public.historical_periods%rowtype;
  payload jsonb;
  revision_id uuid;
  next_revision_no int;
  snapshot_id uuid;
begin
  perform public.require_capability('publish');

  select * into period_row from public.historical_periods where id = p_period_id for update;
  if not found then
    raise exception 'period not found';
  end if;

  payload := public.build_period_aggregate_payload(p_period_id);

  select coalesce(max(er.revision_no), 0) + 1
    into next_revision_no
  from public.entity_revisions er
  where er.entity_type = 'period' and er.entity_id = p_period_id;

  insert into public.entity_revisions (
    entity_type, entity_id, revision_no, snapshot, lifecycle_at_save, change_summary, created_by
  ) values (
    'period', p_period_id, next_revision_no, payload, 'published', 'publish', auth.uid()
  )
  returning id into revision_id;

  update public.published_aggregate_snapshots
  set is_active = false
  where aggregate_type = 'period'
    and aggregate_id = p_period_id
    and is_active = true;

  insert into public.published_aggregate_snapshots (
    aggregate_type, aggregate_id, schema_version, payload, published_by, source_revision_ids, is_active
  ) values (
    'period', p_period_id, 1, payload, auth.uid(), array[revision_id], true
  )
  returning id into snapshot_id;

  update public.historical_periods
  set lifecycle_status = 'published',
      published_aggregate_id = snapshot_id,
      updated_at = now(),
      updated_by = auth.uid()
  where id = p_period_id;

  perform public.sync_projections_from_period_snapshot(p_period_id, snapshot_id, payload);

  return snapshot_id;
end;
$$;

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

  perform public.sync_projections_from_person_snapshot(snap.aggregate_id, p_snapshot_id, snap.payload);

  return p_snapshot_id;
end;
$$;

create or replace function public.rollback_place_snapshot(p_snapshot_id uuid)
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
  if not found or snap.aggregate_type <> 'place' then
    raise exception 'snapshot not found';
  end if;

  update public.published_aggregate_snapshots
  set is_active = false
  where aggregate_type = 'place'
    and aggregate_id = snap.aggregate_id
    and is_active = true;

  update public.published_aggregate_snapshots
  set is_active = true
  where id = p_snapshot_id;

  update public.places
  set published_aggregate_id = p_snapshot_id,
      lifecycle_status = 'published',
      updated_at = now(),
      updated_by = auth.uid()
  where id = snap.aggregate_id;

  perform public.sync_projections_from_place_snapshot(snap.aggregate_id, p_snapshot_id, snap.payload);

  return p_snapshot_id;
end;
$$;

create or replace function public.rollback_period_snapshot(p_snapshot_id uuid)
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
  if not found or snap.aggregate_type <> 'period' then
    raise exception 'snapshot not found';
  end if;

  update public.published_aggregate_snapshots
  set is_active = false
  where aggregate_type = 'period'
    and aggregate_id = snap.aggregate_id
    and is_active = true;

  update public.published_aggregate_snapshots
  set is_active = true
  where id = p_snapshot_id;

  update public.historical_periods
  set published_aggregate_id = p_snapshot_id,
      lifecycle_status = 'published',
      updated_at = now(),
      updated_by = auth.uid()
  where id = snap.aggregate_id;

  perform public.sync_projections_from_period_snapshot(snap.aggregate_id, p_snapshot_id, snap.payload);

  return p_snapshot_id;
end;
$$;

revoke all on function public.build_person_aggregate_payload(uuid) from public;
grant execute on function public.build_person_aggregate_payload(uuid) to authenticated;
revoke all on function public.build_place_aggregate_payload(uuid) from public;
grant execute on function public.build_place_aggregate_payload(uuid) to authenticated;
revoke all on function public.build_period_aggregate_payload(uuid) from public;
grant execute on function public.build_period_aggregate_payload(uuid) to authenticated;

revoke all on function public.publish_person(uuid) from public;
grant execute on function public.publish_person(uuid) to authenticated;
revoke all on function public.publish_place(uuid) from public;
grant execute on function public.publish_place(uuid) to authenticated;
revoke all on function public.publish_period(uuid) from public;
grant execute on function public.publish_period(uuid) to authenticated;

revoke all on function public.rollback_person_snapshot(uuid) from public;
grant execute on function public.rollback_person_snapshot(uuid) to authenticated;
revoke all on function public.rollback_place_snapshot(uuid) from public;
grant execute on function public.rollback_place_snapshot(uuid) to authenticated;
revoke all on function public.rollback_period_snapshot(uuid) from public;
grant execute on function public.rollback_period_snapshot(uuid) to authenticated;
