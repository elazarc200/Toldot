import { describe, expect, it } from "vitest";
import {
  bandRelativePosition,
  buildGenerationBands,
  computeProminence,
  hebrewAlphaLetter,
  placePerson,
  type GenerationSpineItem,
  type PersonPlacementInput,
  type PlacementBandResult,
  type PlacementNodeResult,
} from "@/domain/seder-placement";
import { assignRenderLanes } from "@/domain/seder-render-layout";

const gens: GenerationSpineItem[] = [
  {
    generation_id: "gen-1",
    label_he: "דור א",
    sequence_index: 1,
    start_year: 100,
    end_year: 200,
  },
  {
    generation_id: "gen-2",
    label_he: "דור ב",
    sequence_index: 2,
    start_year: 200,
    end_year: 300,
  },
  {
    generation_id: "gen-3",
    label_he: "דור ג",
    sequence_index: 3,
    start_year: 300,
    end_year: 400,
  },
];

function bands(): PlacementBandResult[] {
  return buildGenerationBands(gens);
}

function basePerson(
  overrides: Partial<PersonPlacementInput> = {},
): PersonPlacementInput {
  return {
    person_id: "p-1",
    sort_name: "עקיבא",
    display_name: "רבי עקיבא",
    disambiguation: null,
    href_path: "/person/akiva",
    memberships: [
      {
        generation_id: "gen-1",
        is_primary: true,
        knowledge_state: "known",
      },
    ],
    time_ranges: [],
    editorial: {
      generation_id: "gen-1",
      band: "middle",
      activity_portion: null,
      continues_into_next: false,
      spans_multiple: false,
      knowledge_state: "known",
    },
    constraints: [],
    prominence_override: false,
    prominence_score: null,
    relationship_count: 2,
    content_depth: 1,
    ...overrides,
  };
}

function assertNoXLane(result: PlacementNodeResult) {
  expect(result).not.toHaveProperty("x_lane");
  expect("x_lane" in result).toBe(false);
}

describe("hebrewAlphaLetter", () => {
  it("uses first Hebrew letter of sort_name (honorific already stripped)", () => {
    expect(hebrewAlphaLetter("עקיבא")).toBe("ע");
    expect(hebrewAlphaLetter("יוחנן")).toBe("י");
    expect(hebrewAlphaLetter("  שמעון")).toBe("ש");
  });

  it("falls back to אחר when no Hebrew letter", () => {
    expect(hebrewAlphaLetter("Akiva")).toBe("אחר");
    expect(hebrewAlphaLetter("")).toBe("אחר");
  });
});

describe("bandRelativePosition", () => {
  it("maps editorial bands to fixed relative positions", () => {
    expect(bandRelativePosition("older")).toBe(0.2);
    expect(bandRelativePosition("middle")).toBe(0.5);
    expect(bandRelativePosition("younger")).toBe(0.8);
    expect(bandRelativePosition("custom")).toBe(0.5);
    expect(bandRelativePosition("unresolved")).toBe(0.5);
  });
});

describe("computeProminence", () => {
  it("uses override score when override flag is set", () => {
    expect(
      computeProminence({
        override: true,
        score: 0.9,
        relationshipCount: 100,
        contentDepth: 100,
      }),
    ).toEqual({ score: 0.9, source: "override" });
  });

  it("derives from relationship and content counts when not overridden", () => {
    const derived = computeProminence({
      override: false,
      score: 0.9,
      relationshipCount: 4,
      contentDepth: 3,
    });
    expect(derived.source).toBe("derived");
    expect(derived.score).toBeCloseTo(4 * 0.05 + 3 * 0.1);
  });

  it("falls back to derived when override is set but score is null", () => {
    const derived = computeProminence({
      override: true,
      score: null,
      relationshipCount: 2,
      contentDepth: 1,
    });
    expect(derived.source).toBe("derived");
  });
});

describe("buildGenerationBands", () => {
  it("slices [0,1] equally by sequence_index", () => {
    const result = bands();
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      band_kind: "rabbinic_generation",
      source_id: "gen-1",
      y_start_norm: 0,
      y_end_norm: 1 / 3,
    });
    expect(result[1]!.y_start_norm).toBeCloseTo(1 / 3);
    expect(result[1]!.y_end_norm).toBeCloseTo(2 / 3);
    expect(result[2]!.y_start_norm).toBeCloseTo(2 / 3);
    expect(result[2]!.y_end_norm).toBe(1);
  });
});

describe("placePerson", () => {
  it("places exact year tightly as resolved when band has years", () => {
    const result = placePerson(
      basePerson({
        time_ranges: [
          {
            range_kind: "activity",
            start_year: 150,
            end_year: 150,
            time_precision: "exact",
            knowledge_state: "known",
          },
        ],
      }),
      bands(),
    );
    assertNoXLane(result);
    expect(result.placement_status).toBe("resolved");
    expect(result.primary_generation_id).toBe("gen-1");
    expect(result.y_start_norm).toBeGreaterThanOrEqual(0);
    expect(result.y_end_norm).toBeLessThanOrEqual(1 / 3);
    expect(result.block_length_norm).toBeCloseTo(
      result.y_end_norm - result.y_start_norm,
    );
    expect(result.block_length_norm).toBeLessThan(1 / 3);
  });

  it("places estimated range as approximate_band spanning mapped years", () => {
    const result = placePerson(
      basePerson({
        time_ranges: [
          {
            range_kind: "activity",
            start_year: 120,
            end_year: 180,
            time_precision: "range",
            knowledge_state: "estimated",
          },
        ],
        editorial: {
          generation_id: "gen-1",
          band: "middle",
          activity_portion: null,
          continues_into_next: false,
          spans_multiple: false,
          knowledge_state: "estimated",
        },
      }),
      bands(),
    );
    expect(result.placement_status).toBe("approximate_band");
    expect(result.placement_knowledge_state).toBe("estimated");
    expect(result.y_end_norm).toBeGreaterThan(result.y_start_norm);
    expect(result.y_start_norm).toBeGreaterThanOrEqual(0);
    expect(result.y_end_norm).toBeLessThanOrEqual(1 / 3 + 1e-9);
  });

  it("marks generation_only as full primary band occupancy", () => {
    const b = bands();
    const primary = b[0]!;
    const result = placePerson(
      basePerson({
        time_ranges: [
          {
            range_kind: "activity",
            start_year: null,
            end_year: null,
            time_precision: "generation_only",
            knowledge_state: "known",
          },
        ],
      }),
      b,
    );
    expect(result.placement_status).toBe("generation_only");
    expect(result.y_start_norm).toBeCloseTo(primary.y_start_norm);
    expect(result.y_end_norm).toBeCloseTo(primary.y_end_norm);
  });

  it("unknown without generation stays unresolved approximate (no fake precision)", () => {
    const result = placePerson(
      basePerson({
        memberships: [],
        time_ranges: [
          {
            range_kind: "life",
            start_year: null,
            end_year: null,
            time_precision: "unknown",
            knowledge_state: "unknown",
          },
        ],
        editorial: null,
      }),
      bands(),
    );
    expect(result.placement_status).toBe("unresolved");
    expect(result.primary_generation_id).toBeNull();
    expect(result.y_start_norm).toBe(0.4);
    expect(result.y_end_norm).toBe(0.6);
    assertNoXLane(result);
  });

  it("unresolved chronology with generation uses approximate_band", () => {
    const result = placePerson(
      basePerson({
        editorial: {
          generation_id: "gen-1",
          band: "unresolved",
          activity_portion: null,
          continues_into_next: false,
          spans_multiple: false,
          knowledge_state: "unknown",
        },
        time_ranges: [],
      }),
      bands(),
    );
    expect(result.placement_status).toBe("approximate_band");
    expect(result.placement_knowledge_state).toBe("unknown");
    expect(result.primary_generation_id).toBe("gen-1");
  });

  it("disputed chronology keeps geometry and flags knowledge disputed", () => {
    const result = placePerson(
      basePerson({
        editorial: {
          generation_id: "gen-1",
          band: "older",
          activity_portion: null,
          continues_into_next: false,
          spans_multiple: false,
          knowledge_state: "disputed",
        },
        time_ranges: [
          {
            range_kind: "activity",
            start_year: 130,
            end_year: 130,
            time_precision: "exact",
            knowledge_state: "disputed",
          },
        ],
      }),
      bands(),
    );
    expect(result.placement_knowledge_state).toBe("disputed");
    expect(result.y_end_norm).toBeGreaterThan(result.y_start_norm);
    expect(result.primary_generation_id).toBe("gen-1");
  });

  it("continues_into_next extends y_end into the next band", () => {
    const b = bands();
    const result = placePerson(
      basePerson({
        time_ranges: [
          {
            range_kind: "activity",
            start_year: null,
            end_year: null,
            time_precision: "generation_only",
            knowledge_state: "known",
          },
        ],
        editorial: {
          generation_id: "gen-1",
          band: "younger",
          activity_portion: null,
          continues_into_next: true,
          spans_multiple: false,
          knowledge_state: "known",
        },
      }),
      b,
    );
    expect(result.continues_into_next).toBe(true);
    expect(result.y_end_norm).toBeGreaterThan(b[0]!.y_end_norm);
    expect(result.y_end_norm).toBeLessThanOrEqual(b[1]!.y_end_norm);
  });

  it("spans_multiple covers all membership generation bands", () => {
    const b = bands();
    const result = placePerson(
      basePerson({
        memberships: [
          {
            generation_id: "gen-1",
            is_primary: true,
            knowledge_state: "known",
          },
          {
            generation_id: "gen-2",
            is_primary: false,
            knowledge_state: "estimated",
          },
        ],
        editorial: {
          generation_id: "gen-1",
          band: "middle",
          activity_portion: null,
          continues_into_next: false,
          spans_multiple: true,
          knowledge_state: "known",
        },
        time_ranges: [
          {
            range_kind: "activity",
            start_year: null,
            end_year: null,
            time_precision: "generation_only",
            knowledge_state: "known",
          },
        ],
      }),
      b,
    );
    expect(result.spans_multiple).toBe(true);
    expect(result.generation_ids).toEqual(
      expect.arrayContaining(["gen-1", "gen-2"]),
    );
    expect(result.y_start_norm).toBeCloseTo(b[0]!.y_start_norm);
    expect(result.y_end_norm).toBeCloseTo(b[1]!.y_end_norm);
  });

  it("teacher-student same gen does not change generation assignment", () => {
    // Placement has no teacher input; membership alone assigns generation.
    const teacher = placePerson(
      basePerson({
        person_id: "teacher",
        memberships: [
          {
            generation_id: "gen-1",
            is_primary: true,
            knowledge_state: "known",
          },
        ],
      }),
      bands(),
    );
    const student = placePerson(
      basePerson({
        person_id: "student",
        sort_name: "מאיר",
        display_name: "רבי מאיר",
        memberships: [
          {
            generation_id: "gen-1",
            is_primary: true,
            knowledge_state: "known",
          },
        ],
        editorial: {
          generation_id: "gen-1",
          band: "younger",
          activity_portion: null,
          continues_into_next: false,
          spans_multiple: false,
          knowledge_state: "known",
        },
      }),
      bands(),
    );
    expect(teacher.primary_generation_id).toBe("gen-1");
    expect(student.primary_generation_id).toBe("gen-1");
    expect(teacher.primary_generation_id).toBe(student.primary_generation_id);
  });

  it("before/after constraints soft-order via order_key within band", () => {
    const earlier = placePerson(
      basePerson({
        person_id: "a",
        editorial: {
          generation_id: "gen-1",
          band: "middle",
          activity_portion: null,
          continues_into_next: false,
          spans_multiple: false,
          knowledge_state: "known",
        },
        constraints: [
          {
            related_person_id: "b",
            constraint_kind: "before",
            knowledge_state: "known",
          },
        ],
      }),
      bands(),
    );
    const later = placePerson(
      basePerson({
        person_id: "b",
        editorial: {
          generation_id: "gen-1",
          band: "middle",
          activity_portion: null,
          continues_into_next: false,
          spans_multiple: false,
          knowledge_state: "known",
        },
        constraints: [
          {
            related_person_id: "a",
            constraint_kind: "after",
            knowledge_state: "known",
          },
        ],
      }),
      bands(),
    );
    expect(earlier.order_key).toBeLessThan(later.order_key);
    expect(earlier.primary_generation_id).toBe(later.primary_generation_id);
  });

  it("prefers activity years over life years", () => {
    const result = placePerson(
      basePerson({
        time_ranges: [
          {
            range_kind: "life",
            start_year: 110,
            end_year: 190,
            time_precision: "range",
            knowledge_state: "estimated",
          },
          {
            range_kind: "activity",
            start_year: 150,
            end_year: 150,
            time_precision: "exact",
            knowledge_state: "known",
          },
        ],
      }),
      bands(),
    );
    expect(result.placement_status).toBe("resolved");
    const mid = (result.y_start_norm + result.y_end_norm) / 2;
    // 150 is midpoint of gen-1 [100,200] → center of first third
    expect(mid).toBeCloseTo(1 / 6, 1);
  });

  it("placement result must not include x_lane", () => {
    const result = placePerson(basePerson(), bands());
    assertNoXLane(result);
  });
});

describe("assignRenderLanes", () => {
  it("packs overlapping Y intervals into distinct lanes without changing Y", () => {
    const nodes = [
      { person_id: "a", y_start_norm: 0.1, y_end_norm: 0.3 },
      { person_id: "b", y_start_norm: 0.2, y_end_norm: 0.4 },
      { person_id: "c", y_start_norm: 0.5, y_end_norm: 0.6 },
    ];
    const before = nodes.map((n) => ({ ...n }));
    const lanes = assignRenderLanes(nodes);
    expect(lanes.get("a")).toBe(0);
    expect(lanes.get("b")).toBe(1);
    expect(lanes.get("c")).toBe(0);
    expect(nodes).toEqual(before);
  });

  it("does not alter historical y_start/y_end from placement", () => {
    const placed = placePerson(basePerson(), bands());
    const lanes = assignRenderLanes([
      {
        person_id: placed.person_id,
        y_start_norm: placed.y_start_norm,
        y_end_norm: placed.y_end_norm,
      },
    ]);
    expect(lanes.get(placed.person_id)).toBe(0);
    expect(placed.y_start_norm).toBeDefined();
    expect(placed.y_end_norm).toBeDefined();
    assertNoXLane(placed);
  });
});
