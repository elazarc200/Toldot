-- Phase 3: Historical placement incremental sync + structural rebuild/activate
-- Ordinary publish stays bounded. Structural rebuild uses staging build_id.

create or replace function public.visualization_active_build_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select m.active_build_id
  from public.published_visualization_manifest m
  where m.id = 1;
$$;

revoke all on function public.visualization_active_build_id() from public;
grant execute on function public.visualization_active_build_id() to anon, authenticated;

create or replace function public.ensure_active_visualization_build()
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  bid uuid;
begin
  select active_build_id into bid from public.published_visualization_manifest where id = 1;
  if bid is not null then
    return bid;
  end if;

  insert into public.published_visualization_builds (status, schema_version, engine_version, notes, activated_at, activated_by)
  values ('active', 1, 1, 'bootstrap empty active build', now(), auth.uid())
  returning build_id into bid;

  update public.published_visualization_manifest
  set active_build_id = bid, updated_at = now()
  where id = 1;

  return bid;
end;
$$;

revoke all on function public.ensure_active_visualization_build() from public;

-- Hebrew alphabetical letter from sort_name
create or replace function public.hebrew_alpha_letter(p_sort_name text)
returns text
language plpgsql
immutable
as $$
declare
  ch text;
begin
  ch := substr(trim(coalesce(p_sort_name, '')), 1, 1);
  if ch ~ '[א-ת]' then
    return ch;
  end if;
  return 'אחר';
end;
$$;

-- ---------------------------------------------------------------------------
-- Incremental: sync one published person into ACTIVE build only
-- ---------------------------------------------------------------------------
create or replace function public.incremental_sync_seder_person(
  p_person_id uuid,
  p_snapshot_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  bid uuid;
  person jsonb := p_payload->'person';
  display_name text;
  sort_name text;
  disamb text;
  href text;
  slug text;
  gen_ids uuid[] := '{}';
  primary_gen uuid;
  gen_seq int;
  gen_count int;
  band_start numeric;
  band_end numeric;
  y0 numeric;
  y1 numeric;
  rel_pos numeric := 0.5;
  editorial jsonb;
  band text;
  placement_status public.seder_placement_status;
  kstate public.knowledge_state;
  continues boolean := false;
  spans boolean := false;
  time_prec text;
  act_start int;
  act_end int;
  prominence numeric := 0;
  prominence_source text := 'derived';
  rel_count int;
  content_depth int;
  search_blob text;
  gen_label text;
  next_band_end numeric;
begin
  bid := public.ensure_active_visualization_build();

  display_name := coalesce(person->>'primary_display_name', 'אדם');
  sort_name := coalesce(person->>'sort_name', display_name);
  disamb := person->>'disambiguation_label';

  select s.slug into slug
  from public.published_entity_slugs s
  where s.aggregate_type = 'person' and s.aggregate_id = p_person_id;
  href := '/person/' || coalesce(slug, p_person_id::text);

  select coalesce(array_agg((g->>'generation_id')::uuid), '{}')
  into gen_ids
  from jsonb_array_elements(coalesce(p_payload->'generation_memberships', '[]'::jsonb)) g
  where g->>'generation_id' is not null;

  select (g->>'generation_id')::uuid
  into primary_gen
  from jsonb_array_elements(coalesce(p_payload->'generation_memberships', '[]'::jsonb)) g
  where coalesce((g->>'is_primary')::boolean, false)
  limit 1;

  if primary_gen is null and cardinality(gen_ids) > 0 then
    primary_gen := gen_ids[1];
  end if;

  select count(*)::int into gen_count from public.rabbinic_generations;
  if gen_count < 1 then gen_count := 1; end if;

  if primary_gen is null then
    placement_status := 'unresolved';
    kstate := 'unknown';
    y0 := 0.4; y1 := 0.6;
  else
    select rg.sequence_index, rg.name_he into gen_seq, gen_label
    from public.rabbinic_generations rg where rg.id = primary_gen;

    band_start := greatest(0, least(1, (coalesce(gen_seq, 1) - 1)::numeric / gen_count));
    band_end := greatest(band_start, least(1, coalesce(gen_seq, 1)::numeric / gen_count));

    -- ensure band row exists for this generation on active build
    insert into public.published_seder_placement_bands (
      build_id, band_kind, source_id, label_he, sequence_index, y_start_norm, y_end_norm
    ) values (
      bid, 'rabbinic_generation', primary_gen, coalesce(gen_label, 'דור'), gen_seq, band_start, band_end
    )
    on conflict (build_id, band_kind, source_id) do update
      set label_he = excluded.label_he,
          sequence_index = excluded.sequence_index,
          y_start_norm = excluded.y_start_norm,
          y_end_norm = excluded.y_end_norm;

    select e into editorial
    from jsonb_array_elements(coalesce(p_payload->'chronology_editorial', '[]'::jsonb)) e
    limit 1;

    band := coalesce(editorial->>'band', 'unresolved');
    continues := coalesce((editorial->>'continues_into_next')::boolean, false);
    spans := coalesce((editorial->>'spans_multiple')::boolean, false);
    kstate := coalesce((editorial->>'knowledge_state')::public.knowledge_state, 'unknown');

    select t->>'time_precision', nullif(t->>'start_year', '')::int, nullif(t->>'end_year', '')::int
    into time_prec, act_start, act_end
    from jsonb_array_elements(coalesce(p_payload->'time_ranges', '[]'::jsonb)) t
    where t->>'range_kind' = 'activity'
    limit 1;

    if time_prec is null then
      select t->>'time_precision', nullif(t->>'start_year', '')::int, nullif(t->>'end_year', '')::int
      into time_prec, act_start, act_end
      from jsonb_array_elements(coalesce(p_payload->'time_ranges', '[]'::jsonb)) t
      where t->>'range_kind' = 'life'
      limit 1;
    end if;

    if time_prec = 'generation_only' or (act_start is null and act_end is null and time_prec in ('generation_only', 'period_only', 'unknown')) then
      if act_start is null and act_end is null and coalesce(time_prec, 'unknown') in ('generation_only', 'period_only', 'unknown')
         and band = 'unresolved' and kstate = 'unknown' then
        placement_status := case when time_prec = 'generation_only' then 'generation_only' else 'approximate_band' end;
      else
        placement_status := case when time_prec = 'generation_only' then 'generation_only' else 'approximate_band' end;
      end if;
      y0 := band_start;
      y1 := band_end;
      if time_prec = 'generation_only' then
        placement_status := 'generation_only';
      end if;
    else
      rel_pos := case band
        when 'older' then 0.2
        when 'younger' then 0.8
        when 'middle' then 0.5
        else 0.5
      end;
      y0 := band_start + (band_end - band_start) * greatest(0, rel_pos - 0.08);
      y1 := band_start + (band_end - band_start) * least(1, rel_pos + 0.08);
      placement_status := case when act_start is not null or act_end is not null then 'resolved' else 'approximate_band' end;
    end if;

    if continues or spans then
      select b.y_end_norm into next_band_end
      from public.published_seder_placement_bands b
      where b.build_id = bid
        and b.band_kind = 'rabbinic_generation'
        and b.sequence_index = coalesce(gen_seq, 0) + 1
      limit 1;
      if next_band_end is not null then
        y1 := greatest(y1, next_band_end);
        spans := true;
      elsif spans or continues then
        y1 := least(1, y1 + (band_end - band_start));
      end if;
    end if;

    if kstate = 'disputed' then
      -- keep geometry; status may stay
      null;
    end if;
  end if;

  select count(*)::int into rel_count
  from jsonb_array_elements(coalesce(p_payload->'relationships', '[]'::jsonb));
  content_depth :=
    coalesce(jsonb_array_length(p_payload->'stories'), 0)
    + coalesce(jsonb_array_length(p_payload->'selected_teachings'), 0)
    + coalesce(jsonb_array_length(p_payload->'claims'), 0);

  if coalesce((person->>'prominence_override')::boolean, false)
     and nullif(person->>'prominence_score', '') is not null then
    prominence := (person->>'prominence_score')::numeric;
    prominence_source := 'override';
  else
    prominence := least(100, rel_count * 2 + content_depth * 3);
    prominence_source := 'derived';
  end if;

  search_blob := concat_ws(' ', display_name, sort_name, coalesce(disamb, ''), coalesce(gen_label, ''));

  insert into public.published_seder_placement_nodes (
    build_id, person_id, snapshot_id, primary_generation_id, generation_ids,
    placement_status, placement_knowledge_state, y_start_norm, y_end_norm, block_length_norm,
    prominence_score_effective, prominence_source, sort_name, display_name, disambiguation,
    href_path, continues_into_next, spans_multiple, search_blob, updated_at
  ) values (
    bid, p_person_id, p_snapshot_id, primary_gen, gen_ids,
    placement_status, kstate, y0, y1, greatest(0.01, y1 - y0),
    prominence, prominence_source, sort_name, display_name, disamb,
    href, continues, spans, search_blob, now()
  )
  on conflict (build_id, person_id) do update set
    snapshot_id = excluded.snapshot_id,
    primary_generation_id = excluded.primary_generation_id,
    generation_ids = excluded.generation_ids,
    placement_status = excluded.placement_status,
    placement_knowledge_state = excluded.placement_knowledge_state,
    y_start_norm = excluded.y_start_norm,
    y_end_norm = excluded.y_end_norm,
    block_length_norm = excluded.block_length_norm,
    prominence_score_effective = excluded.prominence_score_effective,
    prominence_source = excluded.prominence_source,
    sort_name = excluded.sort_name,
    display_name = excluded.display_name,
    disambiguation = excluded.disambiguation,
    href_path = excluded.href_path,
    continues_into_next = excluded.continues_into_next,
    spans_multiple = excluded.spans_multiple,
    search_blob = excluded.search_blob,
    updated_at = now();

  insert into public.published_seder_alpha_index (
    build_id, person_id, letter, sort_name, display_name, disambiguation, href_path, generation_label, search_blob
  ) values (
    bid, p_person_id, public.hebrew_alpha_letter(sort_name), sort_name, display_name, disamb, href, gen_label, search_blob
  )
  on conflict (build_id, person_id) do update set
    letter = excluded.letter,
    sort_name = excluded.sort_name,
    display_name = excluded.display_name,
    disambiguation = excluded.disambiguation,
    href_path = excluded.href_path,
    generation_label = excluded.generation_label,
    search_blob = excluded.search_blob;

  -- incident edges: only if BOTH endpoints published and present as nodes in this build
  delete from public.published_seder_placement_edges e
  where e.build_id = bid
    and (e.person_a_id = p_person_id or e.person_b_id = p_person_id);

  insert into public.published_seder_placement_edges (
    build_id, relationship_id, family, is_directional, person_a_id, person_b_id,
    knowledge_state, dispute_state, importance
  )
  select
    bid,
    (r->>'id')::uuid,
    (r->>'family')::public.relationship_family,
    coalesce((r->>'is_directional')::boolean, false),
    (r->>'person_a_id')::uuid,
    (r->>'person_b_id')::uuid,
    coalesce((r->>'knowledge_state')::public.knowledge_state, 'unknown'),
    r->>'dispute_state',
    coalesce((r->>'importance')::public.relationship_importance, 'secondary')
  from jsonb_array_elements(coalesce(p_payload->'relationships', '[]'::jsonb)) r
  where (
      (r->>'person_a_id')::uuid = p_person_id
      or (r->>'person_b_id')::uuid = p_person_id
    )
    and exists (
      select 1 from public.published_seder_placement_nodes n
      where n.build_id = bid and n.person_id = (r->>'person_a_id')::uuid
    )
    and exists (
      select 1 from public.published_seder_placement_nodes n
      where n.build_id = bid and n.person_id = (r->>'person_b_id')::uuid
    )
  on conflict (build_id, relationship_id) do update set
    family = excluded.family,
    is_directional = excluded.is_directional,
    knowledge_state = excluded.knowledge_state,
    dispute_state = excluded.dispute_state,
    importance = excluded.importance;
end;
$$;

create or replace function public.incremental_remove_seder_person(p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  bid uuid;
begin
  bid := public.visualization_active_build_id();
  if bid is null then return; end if;
  delete from public.published_seder_placement_edges
  where build_id = bid and (person_a_id = p_person_id or person_b_id = p_person_id);
  delete from public.published_seder_placement_nodes where build_id = bid and person_id = p_person_id;
  delete from public.published_seder_alpha_index where build_id = bid and person_id = p_person_id;
  delete from public.published_seder_render_layout where build_id = bid and person_id = p_person_id;
  delete from public.published_map_person_places where build_id = bid and person_id = p_person_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Incremental map place sync
-- ---------------------------------------------------------------------------
create or replace function public.incremental_sync_map_place(
  p_place_id uuid,
  p_snapshot_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  bid uuid;
  place jsonb := p_payload->'place';
  display_name text;
  sort_name text;
  slug text;
  href text;
  preferred_lat double precision;
  preferred_lng double precision;
  kstate public.knowledge_state := 'unknown';
  placement_kind public.map_placement_kind;
  cand_count int;
  coord_count int;
  region_ids uuid[] := '{}';
  region_labels text[] := '{}';
begin
  bid := public.ensure_active_visualization_build();
  display_name := coalesce(place->>'primary_historical_name', 'מקום');
  sort_name := coalesce(place->>'sort_name', display_name);
  select s.slug into slug from public.published_entity_slugs s
  where s.aggregate_type = 'place' and s.aggregate_id = p_place_id;
  href := '/place/' || coalesce(slug, p_place_id::text);

  select coalesce(array_agg((r->'region'->>'id')::uuid) filter (where r->'region'->>'id' is not null), '{}'),
         coalesce(array_agg(r->'region'->>'name_he') filter (where r->'region'->>'name_he' is not null), '{}')
  into region_ids, region_labels
  from jsonb_array_elements(coalesce(p_payload->'regions', '[]'::jsonb)) r;

  select count(*)::int,
         count(*) filter (
           where nullif(i->>'latitude','') is not null and nullif(i->>'longitude','') is not null
         )::int
  into cand_count, coord_count
  from jsonb_array_elements(coalesce(p_payload->'identifications', '[]'::jsonb)) i;

  select nullif(i->>'latitude','')::float8, nullif(i->>'longitude','')::float8,
         coalesce((i->>'location_certainty')::public.knowledge_state, 'unknown')
  into preferred_lat, preferred_lng, kstate
  from jsonb_array_elements(coalesce(p_payload->'identifications', '[]'::jsonb)) i
  where coalesce((i->>'is_preferred')::boolean, false)
  limit 1;

  if preferred_lat is null then
    select nullif(i->>'latitude','')::float8, nullif(i->>'longitude','')::float8,
           coalesce((i->>'location_certainty')::public.knowledge_state, 'unknown')
    into preferred_lat, preferred_lng, kstate
    from jsonb_array_elements(coalesce(p_payload->'identifications', '[]'::jsonb)) i
    where nullif(i->>'latitude','') is not null
    limit 1;
  end if;

  if coord_count = 0 then
    if cardinality(region_ids) > 0 then
      placement_kind := 'region_context';
    else
      placement_kind := 'unlocated';
    end if;
  elsif coord_count > 1 then
    placement_kind := 'multi_candidate';
  else
    placement_kind := 'point';
  end if;

  insert into public.published_map_places (
    build_id, place_id, snapshot_id, primary_name, sort_name, href_path, placement_kind,
    preferred_lat, preferred_lng, knowledge_state, primary_region_ids, region_labels, search_blob, updated_at
  ) values (
    bid, p_place_id, p_snapshot_id, display_name, sort_name, href, placement_kind,
    preferred_lat, preferred_lng, kstate, region_ids, region_labels,
    concat_ws(' ', display_name, sort_name), now()
  )
  on conflict (build_id, place_id) do update set
    snapshot_id = excluded.snapshot_id,
    primary_name = excluded.primary_name,
    sort_name = excluded.sort_name,
    href_path = excluded.href_path,
    placement_kind = excluded.placement_kind,
    preferred_lat = excluded.preferred_lat,
    preferred_lng = excluded.preferred_lng,
    knowledge_state = excluded.knowledge_state,
    primary_region_ids = excluded.primary_region_ids,
    region_labels = excluded.region_labels,
    search_blob = excluded.search_blob,
    updated_at = now();

  delete from public.published_map_place_candidates where build_id = bid and place_id = p_place_id;

  insert into public.published_map_place_candidates (
    build_id, place_id, identification_id, latitude, longitude, location_certainty, modern_name, is_preferred
  )
  select
    bid,
    p_place_id,
    (i->>'id')::uuid,
    nullif(i->>'latitude','')::float8,
    nullif(i->>'longitude','')::float8,
    coalesce((i->>'location_certainty')::public.knowledge_state, 'unknown'),
    i->>'modern_name',
    coalesce((i->>'is_preferred')::boolean, false)
  from jsonb_array_elements(coalesce(p_payload->'identifications', '[]'::jsonb)) i
  where i->>'id' is not null;
end;
$$;

create or replace function public.incremental_sync_map_person_places(
  p_person_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  bid uuid;
  person_name text;
  person_href text;
  slug text;
begin
  bid := public.ensure_active_visualization_build();
  person_name := coalesce(p_payload->'person'->>'primary_display_name', 'אדם');
  select s.slug into slug from public.published_entity_slugs s
  where s.aggregate_type = 'person' and s.aggregate_id = p_person_id;
  person_href := '/person/' || coalesce(slug, p_person_id::text);

  delete from public.published_map_person_places where build_id = bid and person_id = p_person_id;

  insert into public.published_map_person_places (
    build_id, person_id, place_id, knowledge_state,
    person_display_name, place_display_name, person_href, place_href
  )
  select
    bid,
    p_person_id,
    (pl->'place'->>'id')::uuid,
    coalesce((pl->>'knowledge_state')::public.knowledge_state, 'unknown'),
    person_name,
    coalesce(pl->'place'->>'primary_historical_name', 'מקום'),
    person_href,
    coalesce(
      (select '/place/' || s.slug from public.published_entity_slugs s
       where s.aggregate_type = 'place' and s.aggregate_id = (pl->'place'->>'id')::uuid),
      '/place/id/' || (pl->'place'->>'id')
    )
  from jsonb_array_elements(coalesce(p_payload->'places', '[]'::jsonb)) pl
  where pl->'place'->>'id' is not null
    and exists (
      select 1 from public.published_map_places mp
      where mp.build_id = bid and mp.place_id = (pl->'place'->>'id')::uuid
    );
end;
$$;

-- Wire into Phase 2 sync helpers (bounded incremental after encyclopedia projections)
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

  -- Phase 3 bounded incremental visualization sync
  perform public.incremental_sync_seder_person(p_person_id, p_snapshot_id, p_payload);
  perform public.incremental_sync_map_person_places(p_person_id, p_payload);
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

  perform public.incremental_sync_map_place(p_place_id, p_snapshot_id, p_payload);
end;
$$;

-- ---------------------------------------------------------------------------
-- Structural rebuild: staging build + atomic activate
-- ---------------------------------------------------------------------------
create or replace function public.structural_rebuild_visualization_projections(p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  staging uuid;
  snap record;
  gen record;
  gen_count int;
  band_start numeric;
  band_end numeric;
begin
  perform public.require_capability('manage_corpus');

  insert into public.published_visualization_builds (
    status, schema_version, engine_version, notes, created_by
  ) values (
    'building', 1, 1, coalesce(p_notes, 'structural rebuild'), auth.uid()
  )
  returning build_id into staging;

  select count(*)::int into gen_count from public.rabbinic_generations;
  if gen_count < 1 then gen_count := 1; end if;

  for gen in
    select * from public.rabbinic_generations order by sequence_index
  loop
    band_start := greatest(0, (gen.sequence_index - 1)::numeric / gen_count);
    band_end := least(1, gen.sequence_index::numeric / gen_count);
    insert into public.published_seder_placement_bands (
      build_id, band_kind, source_id, label_he, sequence_index, y_start_norm, y_end_norm
    ) values (
      staging, 'rabbinic_generation', gen.id, gen.name_he, gen.sequence_index, band_start, band_end
    );
  end loop;

  -- Political/period background bands are contextual; year→Y mapping without
  -- inventing false precision is deferred. Generation spine only in engine v1.

  -- Replay active snapshots into staging via force_build_id GUC:
  for snap in
    select * from public.published_aggregate_snapshots
    where is_active and aggregate_type = 'place'
  loop
    perform public.incremental_sync_map_place_to_build(staging, snap.aggregate_id, snap.id, snap.payload);
  end loop;

  for snap in
    select * from public.published_aggregate_snapshots
    where is_active and aggregate_type = 'person'
  loop
    perform public.incremental_sync_seder_person_to_build(staging, snap.aggregate_id, snap.id, snap.payload);
    perform public.incremental_sync_map_person_places_to_build(staging, snap.aggregate_id, snap.payload);
  end loop;

  update public.published_visualization_builds
  set status = 'ready'
  where build_id = staging;

  return staging;
exception when others then
  update public.published_visualization_builds
  set status = 'failed', notes = coalesce(notes, '') || ' | failed: ' || SQLERRM
  where build_id = staging;
  raise;
end;
$$;

-- Build-targeted variants used by structural rebuild (same logic, explicit build_id)
create or replace function public.incremental_sync_seder_person_to_build(
  p_build_id uuid,
  p_person_id uuid,
  p_snapshot_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Reuse active-path by temporarily ensuring build exists then writing with override:
  -- Simplest approach: call ensure path after swapping manifest is unsafe.
  -- Instead duplicate write using a session GUC consumed by a thin wrapper.
  perform set_config('toladot.force_build_id', p_build_id::text, true);
  perform public.incremental_sync_seder_person(p_person_id, p_snapshot_id, p_payload);
  perform set_config('toladot.force_build_id', '', true);
end;
$$;

-- Patch ensure_active to honor force_build_id during structural rebuild writes
create or replace function public.ensure_active_visualization_build()
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  bid uuid;
  forced text;
begin
  forced := nullif(current_setting('toladot.force_build_id', true), '');
  if forced is not null then
    return forced::uuid;
  end if;

  select active_build_id into bid from public.published_visualization_manifest where id = 1;
  if bid is not null then
    return bid;
  end if;

  insert into public.published_visualization_builds (status, schema_version, engine_version, notes, activated_at, activated_by)
  values ('active', 1, 1, 'bootstrap empty active build', now(), auth.uid())
  returning build_id into bid;

  update public.published_visualization_manifest
  set active_build_id = bid, updated_at = now()
  where id = 1;

  return bid;
end;
$$;

create or replace function public.incremental_sync_map_place_to_build(
  p_build_id uuid,
  p_place_id uuid,
  p_snapshot_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform set_config('toladot.force_build_id', p_build_id::text, true);
  perform public.incremental_sync_map_place(p_place_id, p_snapshot_id, p_payload);
  perform set_config('toladot.force_build_id', '', true);
end;
$$;

create or replace function public.incremental_sync_map_person_places_to_build(
  p_build_id uuid,
  p_person_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform set_config('toladot.force_build_id', p_build_id::text, true);
  perform public.incremental_sync_map_person_places(p_person_id, p_payload);
  perform set_config('toladot.force_build_id', '', true);
end;
$$;

create or replace function public.activate_visualization_build(p_build_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  st public.visualization_build_status;
  prev uuid;
begin
  perform public.require_capability('manage_corpus');

  select status into st from public.published_visualization_builds where build_id = p_build_id for update;
  if not found then
    raise exception 'build not found';
  end if;
  if st not in ('ready', 'active') then
    raise exception 'build not ready for activation: %', st;
  end if;

  select active_build_id into prev from public.published_visualization_manifest where id = 1 for update;

  if prev is not null and prev <> p_build_id then
    update public.published_visualization_builds
    set status = 'retired'
    where build_id = prev and status = 'active';
  end if;

  update public.published_visualization_builds
  set status = 'active', activated_at = now(), activated_by = auth.uid()
  where build_id = p_build_id;

  update public.published_visualization_manifest
  set active_build_id = p_build_id, updated_at = now()
  where id = 1;
end;
$$;

create or replace function public.structural_rebuild_and_activate(p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  staging uuid;
begin
  staging := public.structural_rebuild_visualization_projections(p_notes);
  perform public.activate_visualization_build(staging);
  return staging;
end;
$$;

revoke all on function public.structural_rebuild_visualization_projections(text) from public;
revoke all on function public.activate_visualization_build(uuid) from public;
revoke all on function public.structural_rebuild_and_activate(text) from public;
grant execute on function public.structural_rebuild_visualization_projections(text) to authenticated;
grant execute on function public.activate_visualization_build(uuid) to authenticated;
grant execute on function public.structural_rebuild_and_activate(text) to authenticated;
