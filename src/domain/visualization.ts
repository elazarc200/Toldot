/** Public visualization DTOs — renderer-independent. */

import type { KnowledgeState, RelationshipFamily } from "@/domain/knowledge";
import type { PlacementStatus } from "@/domain/seder-placement";

export type SederHistoricalPlacementNodeDto = {
  person_id: string;
  snapshot_id: string | null;
  primary_generation_id: string | null;
  generation_ids: string[];
  placement_status: PlacementStatus;
  placement_knowledge_state: KnowledgeState;
  y_start_norm: number;
  y_end_norm: number;
  block_length_norm: number;
  prominence_score_effective: number;
  prominence_source: "derived" | "override";
  sort_name: string;
  display_name: string;
  disambiguation: string | null;
  href_path: string;
  continues_into_next: boolean;
  spans_multiple: boolean;
  search_blob: string;
};

export type SederHistoricalPlacementEdgeDto = {
  relationship_id: string;
  family: RelationshipFamily;
  is_directional: boolean;
  person_a_id: string;
  person_b_id: string;
  knowledge_state: KnowledgeState;
  dispute_state: string | null;
  importance: "primary" | "secondary" | "minor";
};

export type SederHistoricalPlacementBandDto = {
  band_kind: "rabbinic_generation" | "political_rule" | "historical_period";
  source_id: string;
  label_he: string;
  sequence_index: number | null;
  y_start_norm: number;
  y_end_norm: number;
};

export type SederAlphaIndexRowDto = {
  person_id: string;
  letter: string;
  sort_name: string;
  display_name: string;
  disambiguation: string | null;
  href_path: string;
  generation_label: string | null;
};

/** Discardable render layout — never historical truth. */
export type SederRenderLayoutDto = {
  person_id: string;
  x_lane: number;
  label_offset_x: number;
  label_offset_y: number;
};

export type MapPlaceDto = {
  place_id: string;
  primary_name: string;
  sort_name: string;
  href_path: string;
  placement_kind: "point" | "multi_candidate" | "region_context" | "unlocated";
  preferred_lat: number | null;
  preferred_lng: number | null;
  knowledge_state: KnowledgeState;
  primary_region_ids: string[];
  region_labels: string[];
  period_ids: string[];
};

export type MapPlaceCandidateDto = {
  place_id: string;
  identification_id: string;
  latitude: number | null;
  longitude: number | null;
  location_certainty: KnowledgeState;
  modern_name: string | null;
  is_preferred: boolean;
};

export type MapPersonPlaceDto = {
  person_id: string;
  place_id: string;
  knowledge_state: KnowledgeState;
  person_display_name: string;
  place_display_name: string;
  person_href: string;
  place_href: string;
};
