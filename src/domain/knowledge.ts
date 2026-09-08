/** Domain enums and pure helpers — no Next/Supabase imports. */

export const KNOWLEDGE_STATES = [
  "known",
  "estimated",
  "disputed",
  "unknown",
] as const;
export type KnowledgeState = (typeof KNOWLEDGE_STATES)[number];

export const LIFECYCLE_STATUSES = [
  "identified",
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
] as const;
export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

export const RELATIONSHIP_FAMILIES = [
  "teacher_student",
  "parent_child",
  "spouse",
  "sibling",
  "bar_plugta",
] as const;
export type RelationshipFamily = (typeof RELATIONSHIP_FAMILIES)[number];

export const NARRATIVE_SIGNIFICANCES = [
  "primary",
  "major",
  "supporting",
  "mentioned",
] as const;
export type NarrativeSignificance = (typeof NARRATIVE_SIGNIFICANCES)[number];

export function isDirectionalFamily(family: RelationshipFamily): boolean {
  return family === "teacher_student" || family === "parent_child";
}

/** Normalize theme / name for uniqueness comparisons. */
export function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("he");
}

export function themeSlugFromName(nameHe: string): string {
  return normalizeLabel(nameHe).replace(/\s+/g, "-");
}

/**
 * Honorifics must not drive alphabetical sort — caller supplies explicit sort_name.
 * Helper strips common Hebrew honorific prefixes when suggesting a sort name.
 */
export function suggestSortName(displayName: string, honorific?: string | null): string {
  let name = displayName.trim();
  const prefixes = [
    honorific?.trim(),
    "רבי",
    "רב",
    "רבן",
    "ר'",
    "הרב",
    "מר",
    "רבינו",
  ].filter(Boolean) as string[];

  for (const prefix of prefixes) {
    const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "u");
    name = name.replace(re, "");
  }
  return name.trim() || displayName.trim();
}

export function assertTimeRangeBounds(
  startYear: number | null | undefined,
  endYear: number | null | undefined,
): void {
  if (
    startYear != null &&
    endYear != null &&
    Number.isFinite(startYear) &&
    Number.isFinite(endYear) &&
    startYear > endYear
  ) {
    throw new Error("טווח זמן לא תקין: שנת התחלה אחרי שנת סיום");
  }
}
