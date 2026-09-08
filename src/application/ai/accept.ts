import "server-only";
import type { AiFreshnessDecision, DependencyRef } from "@/domain/ai/types";
import { requireCapability } from "@/lib/authz/authorize";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  StaleImpactingError,
  acceptProposalFieldWithClient,
} from "@/application/ai/accept-core";

export { StaleImpactingError, acceptProposalFieldWithClient };

/**
 * There is NO force/accept-anyway API.
 */
export async function acceptProposalFieldAction(args: {
  proposalId: string;
  fieldPath: string;
  fieldDependencySet?: DependencyRef[];
}): Promise<{ freshness: AiFreshnessDecision }> {
  await requireCapability("edit");
  const supabase = await createServerSupabaseClient();
  return acceptProposalFieldWithClient(supabase, args);
}

export async function rejectProposalFieldAction(args: {
  proposalId: string;
  fieldPath: string;
  reason?: string;
}) {
  await requireCapability("edit");
  const supabase = await createServerSupabaseClient();
  const session = await supabase.auth.getUser();
  const uid = session.data.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { data: proposal } = await supabase
    .from("ai_proposals")
    .select("accepted_fields, rejected_fields")
    .eq("id", args.proposalId)
    .maybeSingle();
  if (!proposal) throw new Error("Proposal not found");

  await supabase.from("ai_proposal_field_decisions").upsert(
    {
      proposal_id: args.proposalId,
      field_path: args.fieldPath,
      decision: "rejected",
      note: args.reason ?? null,
      decided_by: uid,
    },
    { onConflict: "proposal_id,field_path" },
  );

  const rejectedFields = [
    ...new Set([...(proposal.rejected_fields as string[]), args.fieldPath]),
  ];
  const acceptedFields = (proposal.accepted_fields as string[]).filter(
    (f) => f !== args.fieldPath,
  );

  await supabase
    .from("ai_proposals")
    .update({
      rejected_fields: rejectedFields,
      accepted_fields: acceptedFields,
      reviewed_by: uid,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.proposalId);
}
