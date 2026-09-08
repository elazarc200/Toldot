/**
 * Synthetic Seder placement fixture for the admin visual lab.
 * No DB required — covers all relationship families, disputed/uncertain,
 * multi-generation spans, and dense local edges.
 */

import { assignRenderLanes } from "@/domain/seder-render-layout";
import type {
  SederHistoricalPlacementBandDto,
  SederHistoricalPlacementEdgeDto,
  SederHistoricalPlacementNodeDto,
  SederRenderLayoutDto,
} from "@/domain/visualization";

function pid(n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex}`;
}

const NAMES: { display: string; sort: string; letter: string }[] = [
  { display: "רבי עקיבא", sort: "עקיבא", letter: "ע" },
  { display: "רבי טרפון", sort: "טרפון", letter: "ט" },
  { display: "רבי ישמעאל", sort: "ישמעאל", letter: "י" },
  { display: "רבי מאיר", sort: "מאיר", letter: "מ" },
  { display: "רבי יהודה", sort: "יהודה", letter: "י" },
  { display: "רבי יוסי", sort: "יוסי", letter: "י" },
  { display: "רבי שמעון", sort: "שמעון", letter: "ש" },
  { display: "רבי אלעזר", sort: "אלעזר", letter: "א" },
  { display: "רבן גמליאל", sort: "גמליאל", letter: "ג" },
  { display: "רבי יהושע", sort: "יהושע", letter: "י" },
  { display: "רבי אליעזר", sort: "אליעזר", letter: "א" },
  { display: "רבי נתן", sort: "נתן", letter: "נ" },
  { display: "רבי חייא", sort: "חייא", letter: "ח" },
  { display: "רבי אושעיא", sort: "אושעיא", letter: "א" },
  { display: "רב", sort: "אבא אריכא", letter: "א" },
  { display: "שמואל", sort: "שמואל", letter: "ש" },
  { display: "רב הונא", sort: "הונא", letter: "ה" },
  { display: "רב יהודה", sort: "יהודה ב", letter: "י" },
  { display: "רבה", sort: "רבה", letter: "ר" },
  { display: "רב יוסף", sort: "יוסף", letter: "י" },
  { display: "אבַיֵי", sort: "אביי", letter: "א" },
  { display: "רבא", sort: "רבא", letter: "ר" },
  { display: "רב פפא", sort: "פפא", letter: "פ" },
  { display: "רב אשי", sort: "אשי", letter: "א" },
  { display: "רבינא", sort: "רבינא", letter: "ר" },
  { display: "רב נחמן", sort: "נחמן", letter: "נ" },
  { display: "רב חסדא", sort: "חסדא", letter: "ח" },
  { display: "עולא", sort: "עולא", letter: "ע" },
  { display: "רב ששת", sort: "ששת", letter: "ש" },
  { display: "רב קטינא", sort: "קטינא", letter: "ק" },
  { display: "רב המנונא", sort: "המנונא", letter: "ה" },
  { display: "רבי זירא", sort: "זירא", letter: "ז" },
  { display: "רב דימי", sort: "דימי", letter: "ד" },
  { display: "רבין", sort: "רבין", letter: "ר" },
  { display: "מר זוטרא", sort: "זוטרא", letter: "ז" },
];

const GEN_BANDS = [
  { id: "gen-tanna-3", label: "תנאים — דור ג׳", y0: 0.02, y1: 0.18 },
  { id: "gen-tanna-4", label: "תנאים — דור ד׳", y0: 0.18, y1: 0.34 },
  { id: "gen-tanna-5", label: "תנאים — דור ה׳", y0: 0.34, y1: 0.48 },
  { id: "gen-amora-1", label: "אמוראים — דור א׳", y0: 0.48, y1: 0.62 },
  { id: "gen-amora-2", label: "אמוראים — דור ב׳", y0: 0.62, y1: 0.74 },
  { id: "gen-amora-3", label: "אמוראים — דור ג׳", y0: 0.74, y1: 0.86 },
  { id: "gen-amora-4", label: "אמוראים — דור ד׳", y0: 0.86, y1: 0.98 },
];

function genForIndex(i: number): (typeof GEN_BANDS)[number] {
  const idx = Math.min(
    GEN_BANDS.length - 1,
    Math.floor((i / NAMES.length) * GEN_BANDS.length),
  );
  return GEN_BANDS[idx]!;
}

function buildNodes(): SederHistoricalPlacementNodeDto[] {
  return NAMES.map((n, i) => {
    const band = genForIndex(i);
    const span = i % 7 === 0;
    const nextBand = GEN_BANDS[Math.min(GEN_BANDS.length - 1, GEN_BANDS.indexOf(band) + 1)]!;
    const yStart = band.y0 + 0.02 + (i % 3) * 0.015;
    const yEnd = span
      ? Math.min(0.97, nextBand.y1 - 0.02)
      : Math.min(band.y1 - 0.01, yStart + 0.06 + (i % 4) * 0.01);
    const personId = pid(i + 1);
    const prominence = 0.35 + ((i * 17) % 60) / 100;
    return {
      person_id: personId,
      snapshot_id: null,
      primary_generation_id: band.id,
      generation_ids: span ? [band.id, nextBand.id] : [band.id],
      placement_status: i % 11 === 0 ? "approximate_band" : "resolved",
      placement_knowledge_state:
        i % 9 === 0 ? "estimated" : i % 13 === 0 ? "disputed" : "known",
      y_start_norm: yStart,
      y_end_norm: yEnd,
      block_length_norm: yEnd - yStart,
      prominence_score_effective: prominence,
      prominence_source: "derived" as const,
      sort_name: n.sort,
      display_name: n.display,
      disambiguation: i % 5 === 0 ? `דגם ${i + 1}` : null,
      href_path: `/person/id/${personId}`,
      continues_into_next: span,
      spans_multiple: span,
      search_blob: `${n.display} ${n.sort}`,
    };
  });
}

function buildEdges(
  nodes: SederHistoricalPlacementNodeDto[],
): SederHistoricalPlacementEdgeDto[] {
  const id = (i: number) => nodes[i]!.person_id;
  const edges: SederHistoricalPlacementEdgeDto[] = [];
  let rid = 1;

  const push = (
    a: number,
    b: number,
    family: SederHistoricalPlacementEdgeDto["family"],
    opts?: Partial<SederHistoricalPlacementEdgeDto>,
  ) => {
    edges.push({
      relationship_id: pid(9000 + rid++),
      family,
      is_directional: family === "teacher_student" || family === "parent_child",
      person_a_id: id(a),
      person_b_id: id(b),
      knowledge_state: "known",
      dispute_state: null,
      importance: "primary",
      ...opts,
    });
  };

  // Teacher–student chains
  push(0, 3, "teacher_student");
  push(0, 4, "teacher_student");
  push(0, 5, "teacher_student");
  push(1, 6, "teacher_student");
  push(2, 7, "teacher_student");
  push(3, 11, "teacher_student");
  push(4, 12, "teacher_student");
  push(8, 9, "teacher_student");
  push(8, 10, "teacher_student");
  push(14, 16, "teacher_student");
  push(14, 17, "teacher_student");
  push(15, 16, "teacher_student");
  push(16, 18, "teacher_student");
  push(17, 19, "teacher_student");
  push(18, 20, "teacher_student");
  push(19, 21, "teacher_student");
  push(20, 22, "teacher_student");
  push(21, 22, "teacher_student");
  push(21, 23, "teacher_student");
  push(23, 24, "teacher_student");

  // Family
  push(3, 4, "sibling");
  push(5, 6, "sibling", { importance: "secondary" });
  push(20, 21, "sibling");
  push(9, 11, "parent_child");
  push(14, 26, "parent_child");
  push(15, 25, "spouse");
  push(16, 27, "spouse", { importance: "minor" });

  // Bar plugta (dense cluster)
  push(20, 21, "bar_plugta");
  push(3, 2, "bar_plugta");
  push(4, 7, "bar_plugta");
  push(18, 19, "bar_plugta");
  push(8, 10, "bar_plugta", {
    knowledge_state: "disputed",
    dispute_state: "open",
  });

  // Disputed / uncertain
  push(0, 1, "teacher_student", {
    knowledge_state: "disputed",
    dispute_state: "open",
    importance: "secondary",
  });
  push(12, 13, "teacher_student", {
    knowledge_state: "estimated",
  });
  push(28, 29, "sibling", { knowledge_state: "unknown" });
  push(30, 31, "bar_plugta", {
    knowledge_state: "disputed",
    dispute_state: "noted",
  });
  push(32, 33, "parent_child", { knowledge_state: "estimated" });
  push(22, 34, "teacher_student");
  push(25, 28, "teacher_student", { importance: "minor" });
  push(26, 29, "spouse");
  push(27, 30, "sibling");

  return edges;
}

function buildBands(): SederHistoricalPlacementBandDto[] {
  return GEN_BANDS.map((b, i) => ({
    band_kind: "rabbinic_generation" as const,
    source_id: b.id,
    label_he: b.label,
    sequence_index: i + 1,
    y_start_norm: b.y0,
    y_end_norm: b.y1,
  }));
}

export type SederVisualFixtureBundle = {
  bands: SederHistoricalPlacementBandDto[];
  nodes: SederHistoricalPlacementNodeDto[];
  edges: SederHistoricalPlacementEdgeDto[];
  renderLayout: SederRenderLayoutDto[];
};

export function loadSederVisualFixture(): SederVisualFixtureBundle {
  const bands = buildBands();
  const nodes = buildNodes();
  const edges = buildEdges(nodes);
  const laneMap = assignRenderLanes(
    nodes.map((n) => ({
      person_id: n.person_id,
      y_start_norm: n.y_start_norm,
      y_end_norm: n.y_end_norm,
    })),
  );
  const renderLayout: SederRenderLayoutDto[] = nodes.map((n) => ({
    person_id: n.person_id,
    x_lane: laneMap.get(n.person_id) ?? 0,
    label_offset_x: 0,
    label_offset_y: 0,
  }));
  return { bands, nodes, edges, renderLayout };
}
