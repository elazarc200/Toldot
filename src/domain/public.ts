/** Public encyclopedia DTOs — published-safe fields only. */

export type UncertaintyDto = {
  state: "known" | "estimated" | "disputed" | "unknown";
  label_he: string;
};

export type CitationDto = {
  display: string;
  work_title: string | null;
  external_url: string | null;
};

export type PublicEvidenceItemDto = {
  statement: string;
  stance: string | null;
  knowledge_state: UncertaintyDto;
  dispute: boolean;
  citation: CitationDto | null;
  editorial_note: string | null;
};

export type PublicRelationshipDto = {
  id: string;
  family: string;
  role_label_he: string;
  counterpart_name: string;
  counterpart_disambiguation: string | null;
  counterpart_id: string | null;
  knowledge_state: UncertaintyDto;
  disputed: boolean;
  directional: boolean;
};

export type PublicStoryCardDto = {
  id: string;
  title: string;
  retelling: string;
  significance: "primary" | "major" | "supporting" | "mentioned";
  editorial_explanation: string | null;
};

export type PublicTeachingDto = {
  id: string;
  title: string | null;
  text: string;
  citation: CitationDto;
};

export type PublicSearchHitDto = {
  aggregate_type: string;
  aggregate_id: string;
  primary_name: string;
  disambiguation: string | null;
  href_path: string;
  anchor: string | null;
};

export type PublicPersonPageDto = {
  snapshot_id: string;
  schema_version: number;
  canonical_person_id: string;
  primary_display_name: string;
  title_honorific: string | null;
  sort_name: string;
  disambiguation_label: string | null;
  short_identity_description: string | null;
  biography_md: string | null;
  names: { text: string; kind: string }[];
  time_ranges: {
    range_kind: string;
    start_year: number | null;
    end_year: number | null;
    knowledge_state: UncertaintyDto;
    textual_label: string | null;
  }[];
  generations: { name_he: string; is_primary: boolean; knowledge_state: UncertaintyDto }[];
  places: { id: string; name: string; knowledge_state: UncertaintyDto; slug_hint: string | null }[];
  relationships: PublicRelationshipDto[];
  stories: PublicStoryCardDto[];
  teachings: PublicTeachingDto[];
  evidence: PublicEvidenceItemDto[];
  contemporaries: { id: string; name: string; disambiguation: string | null }[];
  periods: { id: string; name_he: string }[];
  events: { id: string; name_he: string }[];
  chronology_editorial: { band: string; note: string | null; knowledge_state: UncertaintyDto }[];
};

export type PublicPlacePageDto = {
  snapshot_id: string;
  schema_version: number;
  place_id: string;
  primary_historical_name: string;
  sort_name: string;
  notes: string | null;
  regions: { name_he: string; is_primary: boolean }[];
  identifications: {
    modern_name: string | null;
    latitude: number | null;
    longitude: number | null;
    certainty: UncertaintyDto;
    is_preferred: boolean;
    note: string | null;
  }[];
  people: { id: string; name: string; disambiguation: string | null }[];
  evidence: PublicEvidenceItemDto[];
};

export type PublicPeriodPageDto = {
  snapshot_id: string;
  schema_version: number;
  period_id: string;
  code: string;
  name_he: string;
  overview: string | null;
  start_year: number | null;
  end_year: number | null;
  knowledge_state: UncertaintyDto;
  textual_label: string | null;
  episodes: { id: string; name_he: string; overview: string | null }[];
  events: { id: string; name_he: string; overview: string | null }[];
  people: { id: string; name: string; disambiguation: string | null }[];
  evidence: PublicEvidenceItemDto[];
};

export function uncertaintyLabel(state: string | null | undefined): UncertaintyDto {
  const s = (state ?? "unknown") as UncertaintyDto["state"];
  const map: Record<UncertaintyDto["state"], string> = {
    known: "ידוע",
    estimated: "משוער",
    disputed: "שנוי במחלוקת",
    unknown: "לא ידוע",
  };
  const normalized: UncertaintyDto["state"] = map[s] ? s : "unknown";
  return { state: normalized, label_he: map[normalized] };
}
