"use server";

import { revalidatePath } from "next/cache";
import { buildPersonAiContext } from "@/application/ai/context-builder";
import {
  acceptProposalFieldAction,
  rejectProposalFieldAction,
  StaleImpactingError,
} from "@/application/ai/accept";
import { requireCapability } from "@/lib/authz/authorize";
import { getTaskDefinition, AI_RATE_LIMITS } from "@/lib/ai/registry";
import { getActivePromptTemplate } from "@/lib/ai/prompts";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { simpleHash } from "@/domain/ai/types";
import { logger } from "@/lib/logger";

export { StaleImpactingError };

export async function ensurePersonAiConversationAction(personId: string) {
  await requireCapability("run_ai_research");
  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("entity_type", "person")
    .eq("entity_id", personId)
    .eq("created_by", uid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      entity_type: "person",
      entity_id: personId,
      created_by: uid,
      title: "מחקר AI",
      default_provider: "openai",
      default_model: getTaskDefinition("coverage.gaps").defaultModelId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function postAiConversationMessageAction(args: {
  conversationId: string;
  content: string;
}) {
  await requireCapability("run_ai_research");
  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;

  const { error } = await supabase.from("ai_conversation_messages").insert({
    conversation_id: args.conversationId,
    role: "editor",
    content: args.content,
    created_by: uid,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/people/${args.conversationId}`);
}

export async function enqueuePersonAiJobAction(args: {
  personId: string;
  conversationId: string;
  taskType: string;
  editorMessage?: string;
  allowExternalResearch?: boolean;
  confirmExpensive?: boolean;
}) {
  await requireCapability("run_ai_research");
  const task = getTaskDefinition(args.taskType);
  const prompt = getActivePromptTemplate(args.taskType);

  if (
    task.monetaryCeilingUsd >= 1 &&
    !args.confirmExpensive &&
    task.externalResearchAllowed
  ) {
    throw new Error("EXPENSIVE_CONFIRM_REQUIRED");
  }

  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Not authenticated");

  // Rate: concurrent jobs
  const { count } = await supabase
    .from("ai_jobs")
    .select("id", { count: "exact", head: true })
    .eq("requested_by", uid)
    .in("status", ["queued", "running"]);

  if ((count ?? 0) >= AI_RATE_LIMITS.maxConcurrentJobsPerEditor) {
    throw new Error("Too many concurrent AI jobs");
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: hourCount } = await supabase
    .from("ai_jobs")
    .select("id", { count: "exact", head: true })
    .eq("requested_by", uid)
    .gte("created_at", hourAgo);

  if ((hourCount ?? 0) >= AI_RATE_LIMITS.maxEnqueuePerHour) {
    throw new Error("Hourly AI enqueue limit reached");
  }

  const dailyCeiling = Number(process.env.AI_DAILY_COST_CEILING_USD || 0);
  if (dailyCeiling > 0) {
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { data: usageRows } = await supabase
      .from("ai_usage_events")
      .select("estimated_cost_usd")
      .gte("created_at", dayStart.toISOString());
    const spent = (usageRows ?? []).reduce(
      (sum, row) => sum + Number(row.estimated_cost_usd || 0),
      0,
    );
    if (spent >= dailyCeiling) {
      throw new Error("Daily AI cost ceiling reached");
    }
  }

  const assembled = await buildPersonAiContext({
    supabase,
    personId: args.personId,
    taskType: args.taskType,
  });

  if (args.editorMessage) {
    await supabase.from("ai_conversation_messages").insert({
      conversation_id: args.conversationId,
      role: "editor",
      content: args.editorMessage,
      created_by: uid,
    });
  }

  const idempotencyKey = [
    args.conversationId,
    args.taskType,
    args.personId,
    assembled.dependencyFingerprint,
    prompt.version,
    simpleHash(args.editorMessage || ""),
  ].join(":");

  const tools = task.toolAllowlist;
  const allowExternal =
    Boolean(args.allowExternalResearch) && task.externalResearchAllowed;

  const { data: jobId, error } = await supabase.rpc("enqueue_ai_job", {
    p_task_type: args.taskType,
    p_entity_type: "person",
    p_entity_id: args.personId,
    p_conversation_id: args.conversationId,
    p_idempotency_key: idempotencyKey,
    p_assembled_context: {
      ...assembled.context,
      editor_message: args.editorMessage || null,
      prompt_template_id: prompt.templateId,
      prompt_template_version: prompt.version,
      retrieval_notes: assembled.retrievalNotes,
    },
    p_dependency_set: assembled.dependencySet,
    p_allowed_tool_ids: tools,
    p_allow_external_research: allowExternal,
    p_allowed_collection_ids: [],
    p_provider: "openai",
    p_model_id: task.defaultModelId,
  });

  if (error) {
    logger.error("enqueue_ai_job failed", {
      action: "enqueuePersonAiJob",
      outcome: "failure",
    });
    throw new Error(error.message);
  }

  revalidatePath(`/admin/people/${args.personId}/ai`);
  return jobId as string;
}

export async function cancelAiJobAction(jobId: string) {
  await requireCapability("run_ai_research");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("request_cancel_ai_job", {
    p_job_id: jobId,
  });
  if (error) throw new Error(error.message);
}

export async function acceptAiProposalFieldFormAction(formData: FormData) {
  const proposalId = String(formData.get("proposal_id"));
  const fieldPath = String(formData.get("field_path"));
  try {
    await acceptProposalFieldAction({ proposalId, fieldPath });
  } catch (err) {
    if (err instanceof StaleImpactingError) {
      throw err;
    }
    throw err;
  }
  revalidatePath("/admin");
}

export async function rejectAiProposalFieldFormAction(formData: FormData) {
  const reasonRaw = String(formData.get("reason") || "").trim();
  await rejectProposalFieldAction({
    proposalId: String(formData.get("proposal_id")),
    fieldPath: String(formData.get("field_path")),
    ...(reasonRaw ? { reason: reasonRaw } : {}),
  });
  revalidatePath("/admin");
}

export async function markCitationEditorReviewedFormAction(formData: FormData) {
  await markCitationEditorReviewedAction(String(formData.get("finding_id")));
  revalidatePath("/admin");
}

export async function resolveCitationToCanonicalFormAction(formData: FormData) {
  const providerCode = String(formData.get("provider_code") || "").trim();
  const providerRef = String(formData.get("provider_ref") || "").trim();
  const providerUrl = String(formData.get("provider_url") || "").trim();
  const tractate = String(formData.get("tractate") || "").trim();
  const pageOrDaf = String(formData.get("page_or_daf") || "").trim();
  await resolveCitationToCanonicalAction({
    findingId: String(formData.get("finding_id")),
    sourceWorkId: String(formData.get("source_work_id")),
    citationDisplayHe: String(formData.get("citation_display_he")),
    ...(tractate ? { tractate } : {}),
    ...(pageOrDaf ? { pageOrDaf } : {}),
    ...(providerCode ? { providerCode } : {}),
    ...(providerRef ? { providerRef } : {}),
    ...(providerUrl ? { providerUrl } : {}),
  });
  revalidatePath("/admin");
}

export async function markCitationEditorReviewedAction(findingId: string) {
  await requireCapability("edit");
  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("ai_citation_findings")
    .update({
      resolution_status: "editor_reviewed",
      reviewed_at: new Date().toISOString(),
      reviewed_by: userData.user?.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", findingId)
    .in("resolution_status", ["resolved"]);
  if (error) throw new Error(error.message);
}

export async function resolveCitationToCanonicalAction(args: {
  findingId: string;
  sourceWorkId: string;
  citationDisplayHe: string;
  tractate?: string;
  pageOrDaf?: string;
  providerCode?: string;
  providerRef?: string;
  providerUrl?: string;
}) {
  await requireCapability("edit");
  const supabase = await createServerSupabaseClient();

  const { data: citation, error: cErr } = await supabase
    .from("source_citations")
    .insert({
      source_work_id: args.sourceWorkId,
      citation_display: args.citationDisplayHe,
      tractate: args.tractate || null,
      page_or_daf: args.pageOrDaf || null,
    })
    .select("id")
    .single();
  if (cErr) throw new Error(cErr.message);

  if (args.providerCode && args.providerRef) {
    await supabase.from("source_citation_external_links").insert({
      source_citation_id: citation.id,
      provider_code: args.providerCode,
      provider_ref: args.providerRef,
      public_url: args.providerUrl || null,
      is_preferred_public: false,
    });
  }

  const { error } = await supabase
    .from("ai_citation_findings")
    .update({
      resolution_status: "resolved",
      canonical_source_work_id: args.sourceWorkId,
      canonical_source_citation_id: citation.id,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.findingId);
  if (error) throw new Error(error.message);
}
