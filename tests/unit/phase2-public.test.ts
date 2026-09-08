import { describe, expect, it } from "vitest";
import { isSafeHref, sanitizeMarkdownForTest, stripRawHtml } from "@/lib/safe-markdown";
import { mapPersonPayload } from "@/application/public-mappers";
import { uncertaintyLabel } from "@/domain/public";
import {
  clearPublicReadCachesForTests,
  getCachedPayload,
  setCachedPayload,
} from "@/lib/public-cache";

describe("safe markdown", () => {
  it("strips script tags", () => {
    const cleaned = stripRawHtml('<script>alert(1)</script>שלום');
    expect(cleaned).not.toContain("<script>");
    expect(cleaned).toContain("שלום");
  });

  it("strips event-handler HTML", () => {
    const cleaned = sanitizeMarkdownForTest('<img src=x onerror="alert(1)">טקסט');
    expect(cleaned).not.toMatch(/onerror/i);
    expect(cleaned).not.toContain("<img");
  });

  it("rejects javascript: links", () => {
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("https://example.com")).toBe(true);
    expect(isSafeHref("/person/test")).toBe(true);
  });
});

describe("public person mapper", () => {
  it("orders stories by narrative significance", () => {
    const dto = mapPersonPayload("snap-1", {
      schema_version: 2,
      aggregate_type: "person",
      canonical_person_id: "00000000-0000-4000-8000-000000000001",
      person: {
        id: "00000000-0000-4000-8000-000000000001",
        primary_display_name: "רבי בדיקה",
        sort_name: "בדיקה",
      },
      stories: [
        {
          significance: "mentioned",
          story: { id: "s1", title: "מ", retelling: "מ" },
        },
        {
          significance: "primary",
          story: { id: "s2", title: "ראשי", retelling: "ר" },
        },
        {
          significance: "supporting",
          story: { id: "s3", title: "ת", retelling: "ת" },
        },
      ],
      selected_teachings: [
        {
          teaching: {
            id: "t1",
            teaching_text: "אמרה",
          },
          citation: { citation_display: "שבת יב", external_url: "javascript:alert(1)" },
          work: { canonical_title: "בבלי" },
        },
      ],
      relationships: [],
      names: [],
      time_ranges: [
        {
          range_kind: "life",
          start_year: null,
          end_year: null,
          knowledge_state: "unknown",
        },
      ],
    });

    expect(dto.stories.map((s) => s.significance)).toEqual([
      "primary",
      "supporting",
      "mentioned",
    ]);
    expect(dto.teachings[0]?.citation.external_url).toBeNull();
    expect(dto.time_ranges[0]?.start_year).toBeNull();
    expect(dto.time_ranges[0]?.knowledge_state.state).toBe("unknown");
  });

  it("labels teacher/student roles explicitly", () => {
    const teacherId = "00000000-0000-4000-8000-0000000000aa";
    const studentId = "00000000-0000-4000-8000-0000000000bb";
    const dto = mapPersonPayload("snap", {
      schema_version: 2,
      person: {
        id: teacherId,
        primary_display_name: "רב",
        sort_name: "רב",
      },
      canonical_person_id: teacherId,
      relationships: [
        {
          id: "r1",
          family: "teacher_student",
          is_directional: true,
          knowledge_state: "known",
          dispute_state: "open",
          person_a_id: teacherId,
          person_b_id: studentId,
          person_a: { id: teacherId, primary_display_name: "רב" },
          person_b: { id: studentId, primary_display_name: "תלמיד" },
        },
      ],
    });
    expect(dto.relationships[0]?.role_label_he).toContain("רב");
    expect(dto.relationships[0]?.disputed).toBe(true);
  });

  it("works with no portrait/media fields", () => {
    const dto = mapPersonPayload("snap", {
      schema_version: 2,
      person: {
        id: "00000000-0000-4000-8000-000000000099",
        primary_display_name: "ללא דיוקן",
        sort_name: "ללא",
      },
    });
    expect(dto.primary_display_name).toBe("ללא דיוקן");
    expect((dto as { portrait?: unknown }).portrait).toBeUndefined();
  });
});

describe("uncertainty", () => {
  it("maps unknown without inventing precision", () => {
    expect(uncertaintyLabel("unknown").label_he).toBe("לא ידוע");
  });
});

describe("public cache helpers", () => {
  it("immutable snapshot payload cache returns by snapshot_id", () => {
    clearPublicReadCachesForTests();
    setCachedPayload("snap-abc", { hello: "world" });
    expect(getCachedPayload("snap-abc")).toEqual({ hello: "world" });
  });

  it("clearing caches works without Next invalidation", () => {
    setCachedPayload("snap-x", { a: 1 });
    clearPublicReadCachesForTests();
    expect(getCachedPayload("snap-x")).toBeNull();
  });
});
