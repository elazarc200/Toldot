import { describe, expect, it } from "vitest";
import { isDirectionalFamily } from "@/domain/knowledge";
import { hebrewAlphaLetter } from "@/domain/seder-placement";
import { assignRenderLanes } from "@/domain/seder-render-layout";
import { loadSederVisualFixture } from "@/fixtures/seder-visual-fixture";
import { SEDER_VISUAL_VARIANTS } from "@/lib/seder-visual-tokens";

describe("Phase 3 relationship directionality + visual fixture", () => {
  it("directional families are teacher_student and parent_child only", () => {
    expect(isDirectionalFamily("teacher_student")).toBe(true);
    expect(isDirectionalFamily("parent_child")).toBe(true);
    expect(isDirectionalFamily("spouse")).toBe(false);
    expect(isDirectionalFamily("sibling")).toBe(false);
    expect(isDirectionalFamily("bar_plugta")).toBe(false);
  });

  it("fixture includes all relationship families and disputed edges", () => {
    const { edges, nodes } = loadSederVisualFixture();
    expect(nodes.length).toBeGreaterThanOrEqual(30);
    expect(nodes.length).toBeLessThanOrEqual(50);
    const families = new Set(edges.map((e) => e.family));
    expect(families.has("teacher_student")).toBe(true);
    expect(families.has("parent_child")).toBe(true);
    expect(families.has("spouse")).toBe(true);
    expect(families.has("sibling")).toBe(true);
    expect(families.has("bar_plugta")).toBe(true);
    expect(edges.some((e) => e.knowledge_state === "disputed")).toBe(true);
    expect(nodes.some((n) => n.spans_multiple)).toBe(true);
  });

  it("three visual variants exist", () => {
    expect(SEDER_VISUAL_VARIANTS).toEqual([1, 2, 3]);
  });

  it("hebrew alpha uses sort_name letter", () => {
    expect(hebrewAlphaLetter("עקיבא")).toBe("ע");
    expect(hebrewAlphaLetter("גמליאל")).toBe("ג");
  });

  it("render lanes do not mutate historical Y", () => {
    const input = [
      { person_id: "a", y_start_norm: 0.1, y_end_norm: 0.2 },
      { person_id: "b", y_start_norm: 0.15, y_end_norm: 0.25 },
    ];
    const lanes = assignRenderLanes(input);
    expect(input[0]?.y_start_norm).toBe(0.1);
    expect(lanes.get("a")).toBeDefined();
    expect(lanes.get("b")).toBeDefined();
  });
});
