import {
  evaluateFieldFreshness,
  type AiFreshnessDecision,
  type DependencyRef,
} from "@/domain/ai/types";
import { parseAiProposalStructured } from "@/domain/ai/schemas";
import { citationCanBecomeEvidence } from "@/domain/ai/types";
import { logger } from "@/lib/logger";
import type { SupabaseClient } from "@supabase/supabase-js";

export class StaleImpactingError extends Error {
  readonly freshness: AiFreshnessDecision = "stale_impacting";
  constructor(
    message = "Proposal dependency changed; rebase/re-run/manual reconstruction required",
  ) {
    super(message);
    this.name = "StaleImpactingError";
  }
}

export async function acceptProposalFieldWithClient(
  supabase: SupabaseClient,
  args: {
    proposalId: string;
    fieldPath: string;
    fieldDependencySet?: DependencyRef[];
  },
): Promise<{ freshness: AiFreshnessDecision }> {
  const { data: proposal, error } = await supabase
    .from("ai_proposals")
    .select("*")
    .eq("id", args.proposalId)
    .maybeSingle();

  if (error || !proposal) {
    throw new Error(error?.message || "Proposal not found");
  }

  // Validate structured payload still parses
  parseAiProposalStructured(proposal.structured_output);

  const fieldDeps = (args.fieldDependencySet ??
    (proposal.dependency_set as DependencyRef[])) as DependencyRef[];

  const currentByKey = await loadCurrentDependencyTokens(supabase, fieldDeps);
  const personToken = await loadPersonToken(
    supabase,
    proposal.entity_type as string,
    proposal.entity_id as string,
  );

  const proposalHadPerson = fieldDeps.some((d) => d.table === "people");
  const unrelatedCanonicalChanged =
    !proposalHadPerson &&
    personToken !== null &&
    Boolean(
      (proposal.dependency_set as DependencyRef[] | null)?.some(
        (d) =>
          d.table === "people" &&
          d.id === proposal.entity_id &&
          d.version_token !== personToken,
      ),
    );

  const freshness = evaluateFieldFreshness({
    fieldDeps,
    currentByKey,
    unrelatedCanonicalChanged,
  });

  if (freshness === "stale_impacting") {
    await supabase.from("ai_proposal_field_decisions").upsert(
      {
        proposal_id: args.proposalId,
        field_path: args.fieldPath,
        decision: "blocked_stale",
        freshness,
        note: "Blocked: dependency changed. Rebase, re-run, or manual reconstruction only.",
      },
      { onConflict: "proposal_id,field_path" },
    );
    throw new StaleImpactingError();
  }

  const structured = proposal.structured_output as Record<string, unknown>;
  await applyAcceptedField({
    supabase,
    proposal,
    fieldPath: args.fieldPath,
    structured,
  });

  const session = await supabase.auth.getUser();
  const uid = session.data.user?.id;
  if (!uid) throw new Error("Not authenticated");

  await supabase.from("ai_proposal_field_decisions").upsert(
    {
      proposal_id: args.proposalId,
      field_path: args.fieldPath,
      decision: "accepted",
      freshness,
      decided_by: uid,
    },
    { onConflict: "proposal_id,field_path" },
  );

  await supabase.from("ai_acceptance_events").insert({
    proposal_id: args.proposalId,
    field_path: args.fieldPath,
    freshness,
    decided_by: uid,
  });

  const acceptedFields = [
    ...new Set([...(proposal.accepted_fields as string[]), args.fieldPath]),
  ];
  const rejectedFields = (proposal.rejected_fields as string[]).filter(
    (f) => f !== args.fieldPath,
  );

  await supabase
    .from("ai_proposals")
    .update({
      accepted_fields: acceptedFields,
      rejected_fields: rejectedFields,
      status: "partially_accepted",
      reviewed_by: uid,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.proposalId);

  logger.info("ai proposal field accepted", {
    action: "acceptProposalField",
    outcome: "success",
    freshness,
  });

  return { freshness };
}


async function applyAcceptedField(args: {
  supabase: SupabaseClient;
  proposal: Record<string, unknown>;
  fieldPath: string;
  structured: Record<string, unknown>;
}) {
  const kind = args.structured.proposal_kind;
  // Apply only into draft canonical tables — never publish.
  if (kind === "biography" && args.fieldPath === "substantive_biography_md") {
    await args.supabase
      .from("people")
      .update({
        biography_md: String(args.structured.substantive_biography_md || ""),
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.proposal.entity_id);
    return;
  }
  if (kind === "biography" && args.fieldPath === "short_summary") {
    await args.supabase
      .from("people")
      .update({
        short_identity_description: String(args.structured.short_summary || ""),
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.proposal.entity_id);
    return;
  }
  if (kind === "claim" && args.fieldPath === "statement_text") {
    const findingIds = (args.structured.supporting_citation_finding_ids as string[]) || [];
    const eligibleFindings: Array<{
      id: string;
      canonical_source_citation_id: string | null;
      retrieval_adapter_code: string | null;
      resolution_status: string;
    }> = [];

    for (const fid of findingIds) {
      const { data: finding } = await args.supabase
        .from("ai_citation_findings")
        .select(
          "id, resolution_status, canonical_source_citation_id, retrieval_adapter_code",
        )
        .eq("id", fid)
        .maybeSingle();
      if (!finding) {
        throw new Error(`Citation finding not found: ${fid}`);
      }
      if (finding.retrieval_adapter_code === "open_web_discovery") {
        throw new Error(
          "Open-web discovery cannot become evidence automatically",
        );
      }
      if (
        !citationCanBecomeEvidence(
          finding.resolution_status as Parameters<typeof citationCanBecomeEvidence>[0],
        )
      ) {
        throw new Error(
          "Citation finding is not editor_reviewed/accepted_as_evidence; cannot attach as evidence",
        );
      }
      if (!finding.canonical_source_citation_id) {
        throw new Error(
          "Citation finding lacks canonical_source_citation_id; resolve to a Toladot citation first",
        );
      }
      eligibleFindings.push(finding);
    }

    const { data: claim, error: claimErr } = await args.supabase
      .from("claims")
      .insert({
        statement_text: String(args.structured.statement_text),
        knowledge_state: args.structured.knowledge_state || "estimated",
        subject_person_id: args.proposal.entity_id,
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    if (claimErr || !claim) {
      throw new Error(claimErr?.message || "Failed to insert claim");
    }

    for (const finding of eligibleFindings) {
      const { error: linkErr } = await args.supabase.from("evidence_links").insert({
        claim_id: claim.id,
        source_citation_id: finding.canonical_source_citation_id,
        stance: "supports",
        knowledge_state: "estimated",
        note: `Attached from AI citation finding ${finding.id}`,
      });
      if (linkErr) {
        throw new Error(linkErr.message);
      }
      await args.supabase
        .from("ai_citation_findings")
        .update({
          resolution_status: "accepted_as_evidence",
          updated_at: new Date().toISOString(),
        })
        .eq("id", finding.id);
    }
    return;
  }
  if (kind === "relationship" && args.fieldPath === "relationship") {
    const subject = String(args.structured.subject_person_id || "");
    const target = String(args.structured.target_person_id || "");
    if (!subject || !target || subject === target) {
      throw new Error(
        "Invalid relationship self-edge: subject_person_id must differ from target_person_id",
      );
    }
    const family = String(args.structured.relationship_family);
    const directional =
      family === "teacher_student" || family === "parent_child";
    await args.supabase.from("relationships").insert({
      family,
      person_a_id: subject,
      person_b_id: target,
      is_directional: directional,
      knowledge_state: args.structured.knowledge_state || "estimated",
      lifecycle_status: "draft",
    });
    return;
  }
  if (kind === "chronology" && args.fieldPath === "chronology_editorial") {
    await args.supabase.from("person_chronology_editorial").insert({
      person_id: args.proposal.entity_id,
      band: args.structured.relative_band || "unresolved",
      activity_portion: args.structured.activity_portion || null,
      continues_into_next: Boolean(args.structured.continues_into_next),
      knowledge_state: args.structured.knowledge_state || "estimated",
      free_text_note: args.structured.plain_language_he || null,
    });
    return;
  }
  // Other kinds: record acceptance only; editor completes via normal CRUD (manual reconstruction path).
}

async function loadCurrentDependencyTokens(
  supabase: SupabaseClient,
  deps: DependencyRef[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const dep of deps) {
    const { data } = await supabase
      .from(dep.table)
      .select("id, updated_at")
      .eq("id", dep.id)
      .maybeSingle();
    if (data) {
      map.set(
        `${dep.table}:${dep.id}`,
        String((data as { updated_at?: string }).updated_at ?? data.id),
      );
    }
  }
  return map;
}

async function loadPersonToken(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string,
): Promise<string | null> {
  if (entityType !== "person") return null;
  const { data } = await supabase
    .from("people")
    .select("updated_at")
    .eq("id", entityId)
    .maybeSingle();
  return data?.updated_at ? String(data.updated_at) : null;
}

