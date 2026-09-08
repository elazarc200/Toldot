/** Historical Placement engine — pure deterministic chronology. No Next/Supabase. */
import type { KnowledgeState } from "@/domain/knowledge";

export const PLACEMENT_STATUSES = [
  "resolved",
  "approximate_band",
  "generation_only",
  "unresolved",
] as const;
export type PlacementStatus = (typeof PLACEMENT_STATUSES)[number];

export const CHRONOLOGY_BANDS = [
  "older",
  "middle",
  "younger",
  "custom",
  "unresolved",
] as const;
export type ChronologyBand = (typeof CHRONOLOGY_BANDS)[number];

export const TIME_PRECISIONS = [
  "exact",
  "year",
  "range",
  "generation_only",
  "period_only",
  "unknown",
] as const;
export type TimePrecision = (typeof TIME_PRECISIONS)[number];

export type TimeRangeInput = {
  range_kind: "life" | "activity";
  start_year: number | null;
  end_year: number | null;
  time_precision: TimePrecision;
  knowledge_state: KnowledgeState;
};

export type GenerationMembershipInput = {
  generation_id: string;
  is_primary: boolean;
  knowledge_state: KnowledgeState;
};

export type ChronologyEditorialInput = {
  generation_id: string | null;
  band: ChronologyBand;
  activity_portion: string | null;
  continues_into_next: boolean;
  spans_multiple: boolean;
  knowledge_state: KnowledgeState;
};

export type ChronologyConstraintInput = {
  related_person_id: string;
  constraint_kind: "before" | "after";
  knowledge_state: KnowledgeState;
};

/** Ordered generation taxonomy item for the chronology spine. */
export type GenerationSpineItem = {
  generation_id: string;
  label_he: string;
  sequence_index: number;
  /** Optional conceptual year bounds for mapping activity/life into the band. */
  start_year?: number | null;
  end_year?: number | null;
};

export type PersonPlacementInput = {
  person_id: string;
  sort_name: string;
  display_name: string;
  disambiguation?: string | null;
  href_path: string;
  memberships: GenerationMembershipInput[];
  time_ranges: TimeRangeInput[];
  editorial: ChronologyEditorialInput | null;
  /** Soft before/after hints; never assign generation. */
  constraints?: ChronologyConstraintInput[];
  prominence_override: boolean;
  prominence_score: number | null;
  relationship_count: number;
  content_depth: number;
};

export type PlacementBandResult = {
  band_kind: "rabbinic_generation";
  source_id: string;
  label_he: string;
  sequence_index: number;
  y_start_norm: number;
  y_end_norm: number;
  start_year?: number | null;
  end_year?: number | null;
};

/**
 * Historical placement for one Person.
 * Must never include render-layout fields (x_lane, offsets, routes).
 */
export type PlacementNodeResult = {
  person_id: string;
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
  /** Soft within-band ordering from editorial band + before/after constraints. */
  order_key: number;
};

const HEBREW_LETTER_RE = /[\u05D0-\u05EA]/u;

/** First Hebrew letter of sort_name (already honorific-stripped), or "אחר". */
export function hebrewAlphaLetter(sortName: string): string {
  const match = sortName.trim().match(HEBREW_LETTER_RE);
  return match ? match[0]! : "אחר";
}

export function bandRelativePosition(
  band: ChronologyBand,
): number {
  switch (band) {
    case "older":
      return 0.2;
    case "younger":
      return 0.8;
    case "middle":
    case "custom":
    case "unresolved":
      return 0.5;
  }
}

/**
 * Presentation prominence only — never feeds placement Y math.
 * Override wins when flag is set and score is present; otherwise derive.
 */
export function computeProminence(input: {
  override: boolean;
  score: number | null;
  relationshipCount: number;
  contentDepth: number;
}): { score: number; source: "derived" | "override" } {
  if (input.override && input.score != null && Number.isFinite(input.score)) {
    return { score: input.score, source: "override" };
  }
  const raw = input.relationshipCount * 0.05 + input.contentDepth * 0.1;
  return { score: Math.min(1, Math.max(0, raw)), source: "derived" };
}

/** Equal Y slices along [0,1] ordered by sequence_index. */
export function buildGenerationBands(
  gens: GenerationSpineItem[],
): PlacementBandResult[] {
  const ordered = [...gens].sort((a, b) => a.sequence_index - b.sequence_index);
  const n = ordered.length;
  if (n === 0) return [];
  return ordered.map((g, i) => ({
    band_kind: "rabbinic_generation" as const,
    source_id: g.generation_id,
    label_he: g.label_he,
    sequence_index: g.sequence_index,
    y_start_norm: i / n,
    y_end_norm: (i + 1) / n,
    start_year: g.start_year ?? null,
    end_year: g.end_year ?? null,
  }));
}

function preferTimeRange(ranges: TimeRangeInput[]): TimeRangeInput | null {
  if (ranges.length === 0) return null;
  const activity = ranges.filter((r) => r.range_kind === "activity");
  const pool = activity.length > 0 ? activity : ranges;
  const withYears = pool.find(
    (r) => r.start_year != null || r.end_year != null,
  );
  return withYears ?? pool[0] ?? null;
}

function bandHasYears(band: PlacementBandResult): boolean {
  return (
    band.start_year != null &&
    band.end_year != null &&
    Number.isFinite(band.start_year) &&
    Number.isFinite(band.end_year) &&
    band.start_year < band.end_year
  );
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function mapYearToBandY(
  year: number,
  band: PlacementBandResult,
): number {
  const span = band.end_year! - band.start_year!;
  const t = clamp01((year - band.start_year!) / span);
  return band.y_start_norm + t * (band.y_end_norm - band.y_start_norm);
}

function centerBlock(
  center: number,
  halfWidth: number,
  band: PlacementBandResult,
): { y_start: number; y_end: number } {
  const lo = band.y_start_norm;
  const hi = band.y_end_norm;
  let y_start = center - halfWidth;
  let y_end = center + halfWidth;
  if (y_start < lo) {
    y_end = Math.min(hi, y_end + (lo - y_start));
    y_start = lo;
  }
  if (y_end > hi) {
    y_start = Math.max(lo, y_start - (y_end - hi));
    y_end = hi;
  }
  if (y_start > y_end) {
    y_start = lo;
    y_end = hi;
  }
  return { y_start, y_end };
}

function resolveKnowledgeState(input: PersonPlacementInput): KnowledgeState {
  if (input.editorial?.knowledge_state === "disputed") return "disputed";
  const range = preferTimeRange(input.time_ranges);
  if (range?.knowledge_state === "disputed") return "disputed";
  if (input.memberships.some((m) => m.knowledge_state === "disputed")) {
    return "disputed";
  }
  if (input.editorial?.knowledge_state) return input.editorial.knowledge_state;
  if (range?.knowledge_state) return range.knowledge_state;
  const primary = input.memberships.find((m) => m.is_primary) ?? input.memberships[0];
  return primary?.knowledge_state ?? "unknown";
}

function softOrderKey(
  relative: number,
  constraints: ChronologyConstraintInput[] | undefined,
  personId: string,
): number {
  let bias = 0;
  for (const c of constraints ?? []) {
    if (c.constraint_kind === "before") bias -= 0.05;
    else bias += 0.05;
  }
  // Stable tiny tie-break from person_id code units (deterministic, not cryptographic).
  let tie = 0;
  for (let i = 0; i < personId.length; i++) {
    tie = (tie + personId.charCodeAt(i) * (i + 1)) % 997;
  }
  return relative + bias + tie / 100_000;
}

function findBand(
  bands: PlacementBandResult[],
  generationId: string,
): PlacementBandResult | undefined {
  return bands.find((b) => b.source_id === generationId);
}

function nextBandAfter(
  bands: PlacementBandResult[],
  band: PlacementBandResult,
): PlacementBandResult | undefined {
  const ordered = [...bands].sort((a, b) => a.sequence_index - b.sequence_index);
  const idx = ordered.findIndex((b) => b.source_id === band.source_id);
  return idx >= 0 ? ordered[idx + 1] : undefined;
}

/**
 * Deterministic historical placement for one Person.
 * Does not assign x_lane / collision — that belongs in render layout.
 * Teacher–student is not an input; constraints are soft order only.
 */
export function placePerson(
  input: PersonPlacementInput,
  bands: PlacementBandResult[],
): PlacementNodeResult {
  const prominence = computeProminence({
    override: input.prominence_override,
    score: input.prominence_score,
    relationshipCount: input.relationship_count,
    contentDepth: input.content_depth,
  });

  const continues =
    input.editorial?.continues_into_next === true;
  const spansMultiple = input.editorial?.spans_multiple === true;
  const generationIds = [
    ...new Set(input.memberships.map((m) => m.generation_id)),
  ];
  const primaryMembership =
    input.memberships.find((m) => m.is_primary) ?? input.memberships[0] ?? null;
  const primaryGenerationId = primaryMembership?.generation_id ?? null;
  const primaryBand = primaryGenerationId
    ? findBand(bands, primaryGenerationId)
    : undefined;

  const editorialBand: ChronologyBand =
    input.editorial?.band ?? "unresolved";
  const relative = bandRelativePosition(editorialBand);
  const knowledge = resolveKnowledgeState(input);
  const range = preferTimeRange(input.time_ranges);

  const baseMeta = {
    person_id: input.person_id,
    primary_generation_id: primaryGenerationId,
    generation_ids: generationIds,
    prominence_score_effective: prominence.score,
    prominence_source: prominence.source,
    sort_name: input.sort_name,
    display_name: input.display_name,
    disambiguation: input.disambiguation ?? null,
    href_path: input.href_path,
    continues_into_next: continues,
    spans_multiple: spansMultiple,
  };

  // No generation membership → unresolved approximate region (no fake precision).
  if (!primaryBand) {
    const y_start_norm = 0.4;
    const y_end_norm = 0.6;
    return {
      ...baseMeta,
      primary_generation_id: null,
      generation_ids: [],
      placement_status: "unresolved",
      placement_knowledge_state: knowledge === "disputed" ? "disputed" : "unknown",
      y_start_norm,
      y_end_norm,
      block_length_norm: y_end_norm - y_start_norm,
      order_key: softOrderKey(0.5, input.constraints, input.person_id),
    };
  }

  const bandWidth = primaryBand.y_end_norm - primaryBand.y_start_norm;
  let y_start: number;
  let y_end: number;
  let status: PlacementStatus;

  const precision = range?.time_precision ?? "unknown";
  const isGenerationOnly =
    precision === "generation_only" || precision === "period_only";

  if (isGenerationOnly) {
    y_start = primaryBand.y_start_norm;
    y_end = primaryBand.y_end_norm;
    status = "generation_only";
  } else if (
    range &&
    bandHasYears(primaryBand) &&
    (range.start_year != null || range.end_year != null)
  ) {
    const startY =
      range.start_year != null
        ? mapYearToBandY(range.start_year, primaryBand)
        : mapYearToBandY(range.end_year!, primaryBand);
    const endY =
      range.end_year != null
        ? mapYearToBandY(range.end_year, primaryBand)
        : mapYearToBandY(range.start_year!, primaryBand);
    const lo = Math.min(startY, endY);
    const hi = Math.max(startY, endY);
    const tight = precision === "exact" || precision === "year";
    if (tight && Math.abs(hi - lo) < bandWidth * 0.02) {
      const center = (lo + hi) / 2;
      const block = centerBlock(center, bandWidth * 0.04, primaryBand);
      y_start = block.y_start;
      y_end = block.y_end;
      status =
        range.knowledge_state === "known" || range.knowledge_state === "estimated"
          ? "resolved"
          : "approximate_band";
    } else {
      y_start = lo;
      y_end = Math.max(hi, lo + bandWidth * 0.02);
      y_start = Math.max(y_start, primaryBand.y_start_norm);
      y_end = Math.min(y_end, primaryBand.y_end_norm);
      status =
        tight && range.knowledge_state === "known"
          ? "resolved"
          : "approximate_band";
    }
  } else {
    // Editorial relative position within band (no year inventing).
    const center =
      primaryBand.y_start_norm + relative * bandWidth;
    const half =
      editorialBand === "unresolved" || precision === "unknown"
        ? bandWidth * 0.15
        : bandWidth * 0.1;
    const block = centerBlock(center, half, primaryBand);
    y_start = block.y_start;
    y_end = block.y_end;
    // Editorial / unknown years: approximate within band — never invent fake precision.
    status = "approximate_band";
  }

  // spans_multiple: cover all membership bands when available.
  if (spansMultiple && generationIds.length > 1) {
    for (const gid of generationIds) {
      const b = findBand(bands, gid);
      if (!b) continue;
      y_start = Math.min(y_start, b.y_start_norm);
      y_end = Math.max(y_end, b.y_end_norm);
    }
  }

  // continues_into_next / spans_multiple: extend into the next band after primary.
  if (continues || (spansMultiple && generationIds.length <= 1)) {
    const next = nextBandAfter(bands, primaryBand);
    if (next) {
      const mid =
        next.y_start_norm + (next.y_end_norm - next.y_start_norm) * 0.5;
      y_end = Math.max(y_end, mid);
    }
  }

  y_start = clamp01(y_start);
  y_end = clamp01(Math.max(y_end, y_start));

  return {
    ...baseMeta,
    placement_status: status,
    placement_knowledge_state: knowledge,
    y_start_norm: y_start,
    y_end_norm: y_end,
    block_length_norm: y_end - y_start,
    order_key: softOrderKey(relative, input.constraints, input.person_id),
  };
}
