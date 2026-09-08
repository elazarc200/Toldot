-- Fix person search projection sync: jsonb field access for generation name

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
    (
      select g->'generation'->>'name_he'
      from jsonb_array_elements(coalesce(p_payload->'generation_memberships', '[]'::jsonb)) g
      where coalesce((g->>'is_primary')::boolean, false)
      limit 1
    ),
    (
      select g->'generation'->>'name_he'
      from jsonb_array_elements(coalesce(p_payload->'generation_memberships', '[]'::jsonb)) g
      limit 1
    )
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
