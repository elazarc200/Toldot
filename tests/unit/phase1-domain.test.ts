import { describe, expect, it } from "vitest";
import {
  isDirectionalFamily,
  normalizeLabel,
  suggestSortName,
  themeSlugFromName,
  assertTimeRangeBounds,
} from "@/domain/knowledge";
import {
  buildThemeRow,
  createClaimInputSchema,
  relationshipIsDirectional,
} from "@/application/knowledge-schemas";

describe("identity and sort names", () => {
  it("keeps display name distinct from sort suggestion", () => {
    expect(suggestSortName("רבי עקיבא", "רבי")).toBe("עקיבא");
    expect(suggestSortName("רבן גמליאל", "רבן")).toBe("גמליאל");
  });

  it("does not use honorific as identity", () => {
    const a = { id: "1", name: "רבי יוחנן" };
    const b = { id: "2", name: "רבי יוחנן" };
    expect(a.name).toBe(b.name);
    expect(a.id).not.toBe(b.id);
  });
});

describe("relationships", () => {
  it("marks teacher_student and parent_child as directional", () => {
    expect(isDirectionalFamily("teacher_student")).toBe(true);
    expect(isDirectionalFamily("parent_child")).toBe(true);
    expect(relationshipIsDirectional("spouse")).toBe(false);
    expect(relationshipIsDirectional("bar_plugta")).toBe(false);
  });
});

describe("themes", () => {
  it("normalizes theme names and slugs", () => {
    const props = buildThemeRow("  מידות  ");
    expect(props.name_he).toBe(normalizeLabel("מידות"));
    expect(props.slug).toBe(themeSlugFromName("מידות"));
  });
});

describe("time ranges", () => {
  it("allows unknown bounds without inventing years", () => {
    expect(() => assertTimeRangeBounds(null, null)).not.toThrow();
  });

  it("rejects inverted ranges", () => {
    expect(() => assertTimeRangeBounds(200, 100)).toThrow();
  });
});

describe("claim subject schema", () => {
  it("accepts a single typed subject", () => {
    const parsed = createClaimInputSchema.parse({
      statement_text: "למד ביבנה",
      subject_person_id: "00000000-0000-4000-8000-000000000001",
    });
    expect(parsed.subject_person_id).toBeTruthy();
  });
});
