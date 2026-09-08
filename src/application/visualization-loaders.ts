import "server-only";

import { assignRenderLanes } from "@/domain/seder-render-layout";
import type {
  MapPlaceCandidateDto,
  MapPlaceDto,
  MapPersonPlaceDto,
  SederAlphaIndexRowDto,
  SederHistoricalPlacementBandDto,
  SederHistoricalPlacementEdgeDto,
  SederHistoricalPlacementNodeDto,
  SederRenderLayoutDto,
} from "@/domain/visualization";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export async function loadActiveVisualizationBuildId(): Promise<string | null> {
  const supabase = createPublicSupabaseClient();
  const { data } = await supabase
    .from("published_visualization_manifest")
    .select("active_build_id")
    .eq("id", 1)
    .maybeSingle();
  return (data?.active_build_id as string | null) ?? null;
}

export async function loadSederPlacementBundle(): Promise<{
  bands: SederHistoricalPlacementBandDto[];
  nodes: SederHistoricalPlacementNodeDto[];
  edges: SederHistoricalPlacementEdgeDto[];
  renderLayout: SederRenderLayoutDto[];
}> {
  const supabase = createPublicSupabaseClient();
  const [bandsRes, nodesRes, edgesRes] = await Promise.all([
    supabase
      .from("published_seder_placement_bands")
      .select(
        "band_kind, source_id, label_he, sequence_index, y_start_norm, y_end_norm",
      )
      .order("y_start_norm"),
    supabase
      .from("published_seder_placement_nodes")
      .select(
        "person_id, snapshot_id, primary_generation_id, generation_ids, placement_status, placement_knowledge_state, y_start_norm, y_end_norm, block_length_norm, prominence_score_effective, prominence_source, sort_name, display_name, disambiguation, href_path, continues_into_next, spans_multiple, search_blob",
      )
      .order("y_start_norm"),
    supabase
      .from("published_seder_placement_edges")
      .select(
        "relationship_id, family, is_directional, person_a_id, person_b_id, knowledge_state, dispute_state, importance",
      ),
  ]);

  const nodes = (nodesRes.data ?? []) as SederHistoricalPlacementNodeDto[];
  const laneMap = assignRenderLanes(
    nodes.map((n) => ({
      person_id: n.person_id,
      y_start_norm: Number(n.y_start_norm),
      y_end_norm: Number(n.y_end_norm),
    })),
  );
  const renderLayout: SederRenderLayoutDto[] = nodes.map((n) => ({
    person_id: n.person_id,
    x_lane: laneMap.get(n.person_id) ?? 0,
    label_offset_x: 0,
    label_offset_y: 0,
  }));

  return {
    bands: (bandsRes.data ?? []) as SederHistoricalPlacementBandDto[],
    nodes,
    edges: (edgesRes.data ?? []) as SederHistoricalPlacementEdgeDto[],
    renderLayout,
  };
}

export async function loadSederNodeByPersonId(
  personId: string,
): Promise<SederHistoricalPlacementNodeDto | null> {
  const supabase = createPublicSupabaseClient();
  const { data } = await supabase
    .from("published_seder_placement_nodes")
    .select(
      "person_id, snapshot_id, primary_generation_id, generation_ids, placement_status, placement_knowledge_state, y_start_norm, y_end_norm, block_length_norm, prominence_score_effective, prominence_source, sort_name, display_name, disambiguation, href_path, continues_into_next, spans_multiple, search_blob",
    )
    .eq("person_id", personId)
    .maybeSingle();
  return (data as SederHistoricalPlacementNodeDto | null) ?? null;
}

export async function loadSederAlphaIndex(): Promise<SederAlphaIndexRowDto[]> {
  const supabase = createPublicSupabaseClient();
  const { data } = await supabase
    .from("published_seder_alpha_index")
    .select(
      "person_id, letter, sort_name, display_name, disambiguation, href_path, generation_label",
    )
    .order("letter")
    .order("sort_name");
  return (data ?? []) as SederAlphaIndexRowDto[];
}

export async function searchSederNodes(query: string, limit = 20) {
  const q = query.trim();
  if (!q) return [] as SederHistoricalPlacementNodeDto[];
  const supabase = createPublicSupabaseClient();
  const { data } = await supabase
    .from("published_seder_placement_nodes")
    .select(
      "person_id, snapshot_id, primary_generation_id, generation_ids, placement_status, placement_knowledge_state, y_start_norm, y_end_norm, block_length_norm, prominence_score_effective, prominence_source, sort_name, display_name, disambiguation, href_path, continues_into_next, spans_multiple, search_blob",
    )
    .or(
      `display_name.ilike.%${q}%,sort_name.ilike.%${q}%,search_blob.ilike.%${q}%,disambiguation.ilike.%${q}%`,
    )
    .limit(limit);
  return (data ?? []) as SederHistoricalPlacementNodeDto[];
}

export async function loadMapPlaces(): Promise<MapPlaceDto[]> {
  const supabase = createPublicSupabaseClient();
  const { data } = await supabase
    .from("published_map_places")
    .select(
      "place_id, primary_name, sort_name, href_path, placement_kind, preferred_lat, preferred_lng, knowledge_state, primary_region_ids, region_labels, period_ids",
    )
    .order("sort_name");
  return (data ?? []) as MapPlaceDto[];
}

export async function loadMapCandidates(
  placeId?: string,
): Promise<MapPlaceCandidateDto[]> {
  const supabase = createPublicSupabaseClient();
  let q = supabase
    .from("published_map_place_candidates")
    .select(
      "place_id, identification_id, latitude, longitude, location_certainty, modern_name, is_preferred",
    );
  if (placeId) q = q.eq("place_id", placeId);
  const { data } = await q;
  return (data ?? []) as MapPlaceCandidateDto[];
}

export async function loadMapPersonPlaces(opts?: {
  personId?: string;
  placeId?: string;
}): Promise<MapPersonPlaceDto[]> {
  const supabase = createPublicSupabaseClient();
  let q = supabase
    .from("published_map_person_places")
    .select(
      "person_id, place_id, knowledge_state, person_display_name, place_display_name, person_href, place_href",
    );
  if (opts?.personId) q = q.eq("person_id", opts.personId);
  if (opts?.placeId) q = q.eq("place_id", opts.placeId);
  const { data } = await q;
  return (data ?? []) as MapPersonPlaceDto[];
}
