import { z } from "zod";
import { KNOWLEDGE_STATES, RELATIONSHIP_FAMILIES, NARRATIVE_SIGNIFICANCES } from "@/domain/knowledge";

const uuid = z.string().uuid();
const knowledgeState = z.enum(KNOWLEDGE_STATES);

export const relationshipProposalSchema = z
  .object({
    proposal_kind: z.literal("relationship"),
    subject_person_id: uuid,
    target_person_id: uuid,
    relationship_family: z.enum(RELATIONSHIP_FAMILIES),
    knowledge_state: knowledgeState,
    confidence: z.string().optional(),
    supporting_citation_finding_ids: z.array(uuid).default([]),
    explanation: z.string().min(1),
    editorial_warning: z.string().optional(),
    bar_plugta_rationale: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.subject_person_id === val.target_person_id) {
      ctx.addIssue({
        code: "custom",
        message: "Relationship self-edge is invalid (subject_person_id must differ from target_person_id)",
        path: ["target_person_id"],
      });
    }
  });

export const claimProposalSchema = z.object({
  proposal_kind: z.literal("claim"),
  statement_text: z.string().min(1),
  knowledge_state: knowledgeState,
  subject_person_id: uuid.optional(),
  supporting_citation_finding_ids: z.array(uuid).default([]),
  contradictory_citation_finding_ids: z.array(uuid).default([]),
  explanation: z.string().optional(),
});

export const biographyProposalSchema = z.object({
  proposal_kind: z.literal("biography"),
  short_summary: z.string().min(1),
  substantive_biography_md: z.string().min(1),
  annotations: z
    .array(
      z.object({
        kind: z.enum(["sourced", "editorial_synthesis", "uncertain", "disputed"]),
        claim_ids: z.array(uuid).default([]),
        note: z.string().optional(),
      }),
    )
    .default([]),
  insufficient_evidence: z.boolean().default(false),
});

export const teachingProposalSchema = z.object({
  proposal_kind: z.literal("teaching"),
  summary_he: z.string().min(1),
  theme_names: z.array(z.string()).default([]),
  significance: z.string().optional(),
  knowledge_state: knowledgeState.default("estimated"),
  citation_finding_ids: z.array(uuid).default([]),
});

export const storyProposalSchema = z.object({
  proposal_kind: z.literal("story"),
  title_he: z.string().min(1),
  /** Newly composed Toladot editorial retelling — not provider copy. */
  retelling_he: z.string().min(1),
  factual_structure: z.array(z.string()).default([]),
  source_versions: z
    .array(
      z.object({
        label: z.string(),
        citation_finding_id: uuid.optional(),
        notes: z.string().optional(),
      }),
    )
    .default([]),
  participants: z
    .array(
      z.object({
        person_id: uuid,
        significance: z.enum(NARRATIVE_SIGNIFICANCES),
      }),
    )
    .default([]),
  uncertainty_notes: z.string().optional(),
  what_it_reveals: z.string().optional(),
  preserve_variant_traditions: z.boolean().default(true),
});

export const chronologyProposalSchema = z.object({
  proposal_kind: z.literal("chronology"),
  generation_ids: z.array(uuid).default([]),
  relative_band: z.enum([
    "older",
    "middle",
    "younger",
    "custom",
    "unresolved",
  ]),
  activity_portion: z.string().optional(),
  continues_into_next: z.boolean().default(false),
  before_after_constraints: z
    .array(
      z.object({
        related_person_id: uuid,
        constraint_kind: z.enum(["before", "after", "contemporary", "teacher_of", "student_of"]),
        note: z.string().optional(),
      }),
    )
    .default([]),
  conflicts: z
    .array(
      z.object({
        description: z.string(),
        severity: z.enum(["warning", "blocking"]).default("warning"),
      }),
    )
    .default([]),
  knowledge_state: knowledgeState.default("estimated"),
  plain_language_he: z.string().min(1),
});

export const identityProposalSchema = z.object({
  proposal_kind: z.literal("identity"),
  outcome: z.enum([
    "likely_same",
    "likely_different",
    "ambiguous",
    "insufficient_evidence",
  ]),
  candidate_person_ids: z.array(uuid).default([]),
  reasons: z.array(z.string()).default([]),
  editorial_message_he: z.string().default("זהות לא הוכרעה — דרושה בדיקת עורך"),
});

export const duplicateProposalSchema = z.object({
  proposal_kind: z.literal("duplicate"),
  entity_type: z.enum(["person", "place", "story", "source_work", "event"]),
  candidates: z
    .array(
      z.object({
        id: uuid,
        label: z.string(),
        reasons: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  recommendation: z.enum(["link_existing", "create_new", "defer", "unresolved"]),
});

export const coverageProposalSchema = z.object({
  proposal_kind: z.literal("coverage"),
  gaps: z
    .array(
      z.object({
        code: z.string(),
        description_he: z.string(),
        severity: z.enum(["info", "warning", "important"]).default("info"),
      }),
    )
    .default([]),
});

export const placeIdentifyProposalSchema = z.object({
  proposal_kind: z.literal("place_identify"),
  place_id: uuid.optional(),
  candidates: z
    .array(
      z.object({
        label: z.string(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        knowledge_state: knowledgeState.default("unknown"),
        notes: z.string().optional(),
      }),
    )
    .default([]),
  never_invent_exact_known_coords: z.literal(true).optional(),
});

export const aiProposalStructuredSchema = z.discriminatedUnion("proposal_kind", [
  relationshipProposalSchema,
  claimProposalSchema,
  biographyProposalSchema,
  teachingProposalSchema,
  storyProposalSchema,
  chronologyProposalSchema,
  identityProposalSchema,
  duplicateProposalSchema,
  coverageProposalSchema,
  placeIdentifyProposalSchema,
]);

export type AiProposalStructured = z.infer<typeof aiProposalStructuredSchema>;

export function parseAiProposalStructured(input: unknown): AiProposalStructured {
  return aiProposalStructuredSchema.parse(input);
}
