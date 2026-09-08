import { z } from "zod";
import {
  KNOWLEDGE_STATES,
  LIFECYCLE_STATUSES,
  NARRATIVE_SIGNIFICANCES,
  RELATIONSHIP_FAMILIES,
  isDirectionalFamily,
  normalizeLabel,
  themeSlugFromName,
} from "@/domain/knowledge";

export const createPersonInputSchema = z.object({
  primary_display_name: z.string().trim().min(1),
  sort_name: z.string().trim().min(1),
  title_honorific: z.string().trim().optional().nullable(),
  short_identity_description: z.string().trim().optional().nullable(),
  disambiguation_label: z.string().trim().optional().nullable(),
});

export const createPlaceInputSchema = z.object({
  primary_historical_name: z.string().trim().min(1),
  sort_name: z.string().trim().min(1),
  notes: z.string().trim().optional().nullable(),
});

export const createRegionInputSchema = z.object({
  code: z.string().trim().min(1),
  name_he: z.string().trim().min(1),
  region_kind: z.string().trim().default("historical_area"),
  parent_region_id: z.string().uuid().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const createThemeInputSchema = z.object({
  name_he: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
});

export const createRelationshipInputSchema = z
  .object({
    family: z.enum(RELATIONSHIP_FAMILIES),
    person_a_id: z.string().uuid(),
    person_b_id: z.string().uuid(),
    knowledge_state: z.enum(KNOWLEDGE_STATES).default("unknown"),
    editorial_note: z.string().trim().optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.person_a_id === val.person_b_id) {
      ctx.addIssue({
        code: "custom",
        message: "לא ניתן לקשר אדם לעצמו",
      });
    }
  });

export const createClaimInputSchema = z.object({
  statement_text: z.string().trim().min(1),
  knowledge_state: z.enum(KNOWLEDGE_STATES).default("unknown"),
  subject_person_id: z.string().uuid().optional().nullable(),
  subject_place_id: z.string().uuid().optional().nullable(),
  subject_relationship_id: z.string().uuid().optional().nullable(),
  subject_generation_membership_id: z.string().uuid().optional().nullable(),
  subject_time_range_id: z.string().uuid().optional().nullable(),
  subject_chronology_editorial_id: z.string().uuid().optional().nullable(),
  subject_chronology_constraint_id: z.string().uuid().optional().nullable(),
  subject_person_place_id: z.string().uuid().optional().nullable(),
  subject_period_id: z.string().uuid().optional().nullable(),
  subject_episode_id: z.string().uuid().optional().nullable(),
  subject_event_id: z.string().uuid().optional().nullable(),
});

export function relationshipIsDirectional(
  family: (typeof RELATIONSHIP_FAMILIES)[number],
): boolean {
  return isDirectionalFamily(family);
}

export function buildThemeRow(nameHe: string): { name_he: string; slug: string } {
  const name_he = normalizeLabel(nameHe);
  return { name_he, slug: themeSlugFromName(nameHe) };
}

export {
  KNOWLEDGE_STATES,
  LIFECYCLE_STATUSES,
  NARRATIVE_SIGNIFICANCES,
  RELATIONSHIP_FAMILIES,
};
