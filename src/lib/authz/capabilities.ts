/**
 * Approved capability vocabulary (Phase 0).
 * Authority lives in the database (`has_capability`), not these constants.
 */
export const CAPABILITIES = [
  "edit",
  "review",
  "approve",
  "publish",
  "rollback",
  "merge_entities",
  "manage_corpus",
  "manage_editorial_membership",
  "run_ai_research",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const FULL_EDITOR_ROLE = "full_editor";

export function isCapability(value: string): value is Capability {
  return (CAPABILITIES as readonly string[]).includes(value);
}
