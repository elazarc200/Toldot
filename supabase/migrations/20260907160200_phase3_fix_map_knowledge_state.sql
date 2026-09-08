-- Fix: map place sync must always set knowledge_state when unlocated / no identifications

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

  preferred_lat := null;
  preferred_lng := null;
  kstate := 'unknown';

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

  -- SELECT INTO leaves target NULL when zero rows — force default
  kstate := coalesce(kstate, 'unknown');

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
