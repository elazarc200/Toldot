/** Phase 4 AI domain enums and pure helpers — no Next/Supabase imports. */

export const AI_ENTITY_TYPES = [
  "person",
  "place",
  "period",
  "episode",
  "event",
  "story",
  "teaching",
] as const;
export type AiEntityType = (typeof AI_ENTITY_TYPES)[number];

export const AI_JOB_STATUSES = [
  "queued",
  "running",
  "awaiting_review",
  "completed",
  "failed",
  "cancelled",
] as const;
export type AiJobStatus = (typeof AI_JOB_STATUSES)[number];

export const AI_PROPOSAL_STATUSES = [
  "generated",
  "needs_review",
  "partially_accepted",
  "accepted",
  "rejected",
  "superseded",
  "failed",
  "stale_impacting",
] as const;
export type AiProposalStatus = (typeof AI_PROPOSAL_STATUSES)[number];

export const AI_CITATION_STATUSES = [
  "discovered",
  "resolved",
  "editor_reviewed",
  "accepted_as_evidence",
  "unresolved",
  "conflicting",
  "rejected",
] as const;
export type AiCitationResolutionStatus = (typeof AI_CITATION_STATUSES)[number];

export const AI_FRESHNESS = [
  "fresh",
  "stale_non_impacting",
  "stale_impacting",
] as const;
export type AiFreshnessDecision = (typeof AI_FRESHNESS)[number];

export type DependencyRef = {
  table: string;
  id: string;
  version_token: string;
  field_paths?: string[];
};

export function fingerprintDependencies(deps: DependencyRef[]): string {
  const normalized = [...deps]
    .map((d) => `${d.table}:${d.id}:${d.version_token}`)
    .sort();
  return simpleHash(normalized.join("|"));
}

/** Deterministic non-crypto hash for fingerprints (not a security boundary). */
export function simpleHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Compare proposal dependencies to current versions.
 * Only dependencies listed on the proposal/field matter.
 */
export function evaluateFreshness(
  proposalDeps: DependencyRef[],
  currentByKey: Map<string, string>,
): AiFreshnessDecision {
  if (proposalDeps.length === 0) {
    return "fresh";
  }

  let anyMissingOrChanged = false;
  for (const dep of proposalDeps) {
    const key = `${dep.table}:${dep.id}`;
    const current = currentByKey.get(key);
    if (current === undefined || current !== dep.version_token) {
      anyMissingOrChanged = true;
      break;
    }
  }

  if (!anyMissingOrChanged) {
    return "fresh";
  }

  // Caller distinguishes non-impacting vs impacting by which deps are attached
  // to the field being accepted. At this helper level, changed listed deps => impacting.
  return "stale_impacting";
}

/**
 * Field-scoped freshness: if field deps unchanged => fresh (even if other entity
 * state changed). If field deps changed => stale_impacting.
 * If proposal has no field deps but entity-level unrelated change => stale_non_impacting
 * when `unrelatedChanged` is true and field deps empty/match.
 */
export function evaluateFieldFreshness(args: {
  fieldDeps: DependencyRef[];
  currentByKey: Map<string, string>;
  unrelatedCanonicalChanged: boolean;
}): AiFreshnessDecision {
  if (args.fieldDeps.length === 0) {
    return args.unrelatedCanonicalChanged ? "stale_non_impacting" : "fresh";
  }
  for (const dep of args.fieldDeps) {
    const key = `${dep.table}:${dep.id}`;
    const current = args.currentByKey.get(key);
    if (current === undefined || current !== dep.version_token) {
      return "stale_impacting";
    }
  }
  return args.unrelatedCanonicalChanged ? "stale_non_impacting" : "fresh";
}

export function citationCanBecomeEvidence(
  status: AiCitationResolutionStatus,
): boolean {
  return status === "editor_reviewed" || status === "accepted_as_evidence";
}

export function isDirectionalRelationshipFamily(
  family: string,
): boolean {
  return family === "teacher_student" || family === "parent_child";
}
