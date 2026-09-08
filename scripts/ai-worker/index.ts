/**
 * Toladot AI worker — least privilege (hosted Supabase).
 *
 * Trust boundary:
 * - Signs in as dedicated Auth user (AI_WORKER_EMAIL / AI_WORKER_PASSWORD)
 * - Calls SECURITY DEFINER AI operational RPCs with AI_WORKER_SECRET
 * - RPCs require auth.uid() == ai_worker_config.worker_user_id AND secret hash match
 * - Never uses service-role key
 * - Never writes canonical/public tables; never calls publish_*
 * - Anon cannot execute worker RPCs
 *
 * Configure credentials via: npm run bootstrap:ai-worker
 */
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";

loadDotenv({ path: ".env.local" });
loadDotenv({ path: ".env" });

import { getTaskDefinition, AI_RATE_LIMITS } from "../src/lib/ai/registry";
import { createLlmProvider } from "../src/lib/ai/providers";
import { getActivePromptTemplate, buildSafeMessages } from "../src/lib/ai/prompts";
import { parseAiProposalStructured } from "../src/domain/ai/schemas";
import { fingerprintDependencies, type DependencyRef } from "../src/domain/ai/types";
import { getRetrievalAdapter } from "../src/lib/ai/retrieval";
import { FakeLlmProvider } from "../src/lib/ai/providers/fake";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const workerSecret = process.env.AI_WORKER_SECRET;
const workerEmail = process.env.AI_WORKER_EMAIL;
const workerPassword = process.env.AI_WORKER_PASSWORD;
const workerId = process.env.AI_WORKER_ID || `worker-${randomUUID().slice(0, 8)}`;
const pollMs = Number(process.env.AI_WORKER_POLL_MS || 2000);

if (!url || !anonKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY required");
  process.exit(1);
}
if (!workerSecret || workerSecret.length < 24) {
  console.error("AI_WORKER_SECRET required (min 24 chars); no insecure fallback");
  process.exit(1);
}
if (workerSecret === "toladot-dev-ai-worker-secret") {
  console.error("Refusing known insecure default AI_WORKER_SECRET");
  process.exit(1);
}
if (!workerEmail || !workerPassword) {
  console.error("AI_WORKER_EMAIL and AI_WORKER_PASSWORD required for worker Auth session");
  process.exit(1);
}

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureWorkerSession() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: workerEmail!,
    password: workerPassword!,
  });
  if (error || !data.session) {
    throw new Error(`Worker Auth sign-in failed: ${error?.message || "no session"}`);
  }
}
type JobRow = {
  id: string;
  task_type: string;
  entity_type: string;
  entity_id: string;
  conversation_id: string | null;
  status: string;
  provider: string | null;
  model_id: string | null;
  fencing_token: number;
  assembled_context: Record<string, unknown>;
  dependency_set: DependencyRef[];
  allowed_tool_ids: string[];
  allow_external_research: boolean;
  cancel_requested: boolean;
  attempt_count: number;
  max_attempts: number;
};

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function completeWithRetries<T>(
  fn: () => Promise<T>,
  maxRetries: number,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      const retryable = code === "rate_limit" || code === "provider_outage" || code === "timeout";
      if (!retryable || attempt >= maxRetries) throw err;
      attempt += 1;
      await sleep(Math.min(8000, 500 * 2 ** attempt));
    }
  }
}

async function processJob(job: JobRow) {
  const fence = job.fencing_token;
  const secret = workerSecret;

  if (job.attempt_count > job.max_attempts) {
    await rpc("complete_ai_job", {
      p_worker_secret: secret,
      p_job_id: job.id,
      p_fencing_token: fence,
      p_worker_id: workerId,
      p_status: "failed",
      p_error_code: "max_attempts",
      p_error_message: `Exceeded max_attempts=${job.max_attempts}`,
    });
    return;
  }

  if (job.cancel_requested) {
    await rpc("complete_ai_job", {
      p_worker_secret: secret,
      p_job_id: job.id,
      p_fencing_token: fence,
      p_worker_id: workerId,
      p_status: "cancelled",
    });
    return;
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
      await rpc("complete_ai_job", {
        p_worker_secret: secret,
        p_job_id: job.id,
        p_fencing_token: fence,
        p_worker_id: workerId,
        p_status: "failed",
        p_error_code: "daily_cost_ceiling",
        p_error_message: `Daily AI cost ceiling ${dailyCeiling} USD reached`,
      });
      return;
    }
  }

  const task = getTaskDefinition(job.task_type);
  const prompt = getActivePromptTemplate(job.task_type);

  // Tool allowlist is from job (frozen at enqueue) — never expanded by model.
  const allowedTools = new Set(job.allowed_tool_ids || []);
  const toolResults: Array<{ toolId: string; payload: unknown }> = [];

  const editorMessage =
    (job.assembled_context.editor_message as string) ||
    `בצע משימה ${job.task_type}`;

  // Run allowed retrieval tools (server-side), max iterations
  let iterations = 0;
  for (const toolId of allowedTools) {
    if (iterations >= AI_RATE_LIMITS.maxToolIterationsPerJob) break;
    iterations++;

    const { data: fresh } = await supabase
      .from("ai_jobs")
      .select("cancel_requested")
      .eq("id", job.id)
      .maybeSingle();
    if (fresh?.cancel_requested) {
      await rpc("complete_ai_job", {
        p_worker_secret: secret,
        p_job_id: job.id,
        p_fencing_token: fence,
        p_worker_id: workerId,
        p_status: "cancelled",
      });
      return;
    }

    if (toolId === "retrieval.catalog") {
      const adapter = getRetrievalAdapter("catalog_metadata");
      const hits = await adapter!.retrieve({
        query: String(
          (job.assembled_context.person as { primary_display_name?: string })
            ?.primary_display_name || "",
        ),
        canonicalWorkHint: null as unknown as string | undefined,
      });
      await rpc("store_ai_tool_result", {
        p_worker_secret: secret,
        p_job_id: job.id,
        p_fencing_token: fence,
        p_worker_id: workerId,
        p_tool_id: toolId,
        p_payload: { hits, untrusted: true },
      });
      toolResults.push({ toolId, payload: { hits } });
    }

    if (toolId === "retrieval.sefaria") {
      const adapter = getRetrievalAdapter("sefaria");
      const hint =
        (job.assembled_context.sefaria_ref as string) ||
        (job.assembled_context.editor_message as string) ||
        "";
      // Only call Sefaria if message looks like a ref; otherwise skip with note
      const hits = hint.match(/[A-Za-z].*\d/)
        ? await adapter!.retrieve({ query: hint.split(/\n/)[0].slice(0, 80) })
        : [
            {
              adapterCode: "sefaria",
              providerRef: null,
              providerUrl: null,
              suggestedCanonicalCitationHe: null,
              excerpt: null,
              untrusted: true as const,
              isDiscoveryOnly: false,
              evidenceEligible: true,
              warnings: [
                "No Sefaria ref in context; adapter ready but not invoked with a location.",
              ],
            },
          ];
      for (const hit of hits) {
        if (hit.suggestedCanonicalCitationHe || hit.providerRef) {
          await rpc("upsert_ai_citation_finding", {
            p_worker_secret: secret,
            p_job_id: job.id,
            p_fencing_token: fence,
            p_worker_id: workerId,
            p_payload: {
              entity_type: job.entity_type,
              entity_id: job.entity_id,
              resolution_status: hit.providerRef ? "discovered" : "unresolved",
              origin_kind: "retrieved",
              raw_citation_text:
                hit.suggestedCanonicalCitationHe ||
                hit.providerRef ||
                "unresolved",
              retrieval_adapter_code: "sefaria",
              provider_ref: hit.providerRef,
              provider_url: hit.providerUrl,
              warnings: hit.warnings,
            },
          });
        }
      }
      await rpc("store_ai_tool_result", {
        p_worker_secret: secret,
        p_job_id: job.id,
        p_fencing_token: fence,
        p_worker_id: workerId,
        p_tool_id: toolId,
        p_payload: { hits, untrusted: true },
      });
      toolResults.push({ toolId, payload: { hits } });
    }

    if (
      toolId === "retrieval.open_web" &&
      job.allow_external_research
    ) {
      const adapter = getRetrievalAdapter("open_web_discovery");
      const urlCandidate = String(job.assembled_context.open_web_url || "");
      const hits = await adapter!.retrieve({ query: urlCandidate || "https://he.wikipedia.org/wiki/" });
      await rpc("store_ai_tool_result", {
        p_worker_secret: secret,
        p_job_id: job.id,
        p_fencing_token: fence,
        p_worker_id: workerId,
        p_tool_id: toolId,
        p_payload: { hits, untrusted: true },
      });
      toolResults.push({ toolId, payload: { hits } });
    }

    await rpc("heartbeat_ai_job", {
      p_worker_secret: secret,
      p_job_id: job.id,
      p_fencing_token: fence,
      p_worker_id: workerId,
      p_lease_seconds: 120,
    });
  }

  const { data: preLlm } = await supabase
    .from("ai_jobs")
    .select("cancel_requested")
    .eq("id", job.id)
    .maybeSingle();
  if (preLlm?.cancel_requested) {
    await rpc("complete_ai_job", {
      p_worker_secret: secret,
      p_job_id: job.id,
      p_fencing_token: fence,
      p_worker_id: workerId,
      p_status: "cancelled",
    });
    return;
  }

  const provider = createLlmProvider(
    process.env.AI_LLM_PROVIDER || job.provider || "openai",
  );

  // Seed fake fixtures for common tasks when using fake provider
  if (provider instanceof FakeLlmProvider) {
    seedFakeFixtures(provider, job.task_type, job.entity_id);
  }

  const messages = buildSafeMessages({
    editorRequest: editorMessage,
    contextJson: JSON.stringify(job.assembled_context).slice(0, 60_000),
    toolResultsUntrusted: toolResults,
  });

  const result = await completeWithRetries(
    () =>
      provider.completeStructured({
        taskType: job.task_type,
        system: prompt.systemInstructions,
        messages,
        jsonSchemaName: task.outputSchemaId,
        jsonSchema: { type: "object", additionalProperties: true },
        timeoutMs: task.timeoutMs,
        maxTokens: task.maxTokens,
        modelId: job.model_id || task.defaultModelId,
      }),
    task.maxRetries,
  );

  if (result.estimatedCostUsd > task.monetaryCeilingUsd) {
    await rpc("complete_ai_job", {
      p_worker_secret: secret,
      p_job_id: job.id,
      p_fencing_token: fence,
      p_worker_id: workerId,
      p_status: "failed",
      p_error_code: "budget_exceeded",
      p_error_message: "Job exceeded monetary ceiling",
      p_tokens_in: result.tokensIn,
      p_tokens_out: result.tokensOut,
      p_cost_usd: result.estimatedCostUsd,
    });
    return;
  }

  let structured: unknown = result.content;
  try {
    structured = parseAiProposalStructured(result.content);
  } catch (err) {
    // Soft wrap coverage if schema fails for discovery tasks
    if (job.task_type === "research.person.discovery" || job.task_type === "coverage.gaps") {
      structured = {
        proposal_kind: "coverage",
        gaps: [
          {
            code: "validation_fallback",
            description_he: "פלט המודל לא עבר ולידציה מלאה",
            severity: "warning",
          },
        ],
      };
      structured = parseAiProposalStructured(structured);
    } else {
      await rpc("complete_ai_job", {
        p_worker_secret: secret,
        p_job_id: job.id,
        p_fencing_token: fence,
        p_worker_id: workerId,
        p_status: "failed",
        p_error_code: "invalid_json",
        p_error_message: err instanceof Error ? err.message : "schema validation failed",
        p_tokens_in: result.tokensIn,
        p_tokens_out: result.tokensOut,
        p_cost_usd: result.estimatedCostUsd,
      });
      return;
    }
  }

  const deps = (job.dependency_set || []) as DependencyRef[];
  await rpc("create_ai_proposal", {
    p_worker_secret: secret,
    p_job_id: job.id,
    p_fencing_token: fence,
    p_worker_id: workerId,
    p_payload: {
      proposal_kind: (structured as { proposal_kind: string }).proposal_kind,
      provider: result.provider,
      model_id: result.modelId,
      model_version: result.modelVersion,
      prompt_template_id: prompt.templateId,
      prompt_template_version: String(prompt.version),
      structured_output: structured,
      confidence: "estimated",
      warnings: [],
      dependency_set: deps,
      dependency_fingerprint: fingerprintDependencies(deps),
      citation_finding_ids: [],
    },
  });

  await rpc("record_ai_usage_event", {
    p_worker_secret: secret,
    p_payload: {
      job_id: job.id,
      conversation_id: job.conversation_id,
      provider: result.provider,
      model_id: result.modelId,
      task_type: job.task_type,
      tokens_in: result.tokensIn,
      tokens_out: result.tokensOut,
      estimated_cost_usd: result.estimatedCostUsd,
    },
  });

  await rpc("complete_ai_job", {
    p_worker_secret: secret,
    p_job_id: job.id,
    p_fencing_token: fence,
    p_worker_id: workerId,
    p_status: "awaiting_review",
    p_tokens_in: result.tokensIn,
    p_tokens_out: result.tokensOut,
    p_cost_usd: result.estimatedCostUsd,
  });
}

function seedFakeFixtures(provider: FakeLlmProvider, taskType: string, entityId: string) {
  const fixtures: Record<string, unknown> = {
    "draft.person.biography": {
      proposal_kind: "biography",
      short_summary: "תקציר בדיקה",
      substantive_biography_md: "ביוגרפיה בעברית לצורכי בדיקה.",
      annotations: [],
      insufficient_evidence: false,
    },
    "extract.relationships": {
      proposal_kind: "relationship",
      subject_person_id: entityId,
      target_person_id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
      relationship_family: "teacher_student",
      knowledge_state: "estimated",
      supporting_citation_finding_ids: [],
      explanation: "הצעת בדיקה — יעד דמה; יש לאשר רק אם היעד קיים",
      editorial_warning: "fixture uses a placeholder target id",
    },
    "extract.stories": {
      proposal_kind: "story",
      title_he: "סיפור בדיקה",
      retelling_he: "עריכת תולדות מקורית בעברית נגישה — לא העתקה מספקית.",
      factual_structure: ["עובדה א", "עובדה ב"],
      source_versions: [],
      participants: [{ person_id: entityId, significance: "primary" }],
      preserve_variant_traditions: true,
    },
    "extract.teachings": {
      proposal_kind: "teaching",
      summary_he: "הוראה נבחרת לבדיקה",
      theme_names: ["מידות"],
      knowledge_state: "estimated",
      citation_finding_ids: [],
    },
    "chronology.propose": {
      proposal_kind: "chronology",
      generation_ids: [],
      relative_band: "middle",
      continues_into_next: false,
      before_after_constraints: [],
      conflicts: [],
      knowledge_state: "estimated",
      plain_language_he: "פעיל באמצע הדור לפי הערכת עורך.",
    },
    "identity.resolve": {
      proposal_kind: "identity",
      outcome: "ambiguous",
      candidate_person_ids: [],
      reasons: ["שם דומה ללא די ראיות"],
      editorial_message_he: "זהות לא הוכרעה — דרושה בדיקת עורך",
    },
    "duplicate.suggest": {
      proposal_kind: "duplicate",
      entity_type: "person",
      candidates: [],
      recommendation: "unresolved",
    },
    "coverage.gaps": {
      proposal_kind: "coverage",
      gaps: [
        {
          code: "missing_sources",
          description_he: "חסרים מקורות מאומתים",
          severity: "warning",
        },
      ],
    },
    "research.person.discovery": {
      proposal_kind: "coverage",
      gaps: [
        {
          code: "discovery",
          description_he: "נדרש מחקר נוסף",
          severity: "info",
        },
      ],
    },
    "claim.evaluate": {
      proposal_kind: "claim",
      statement_text: "טענת בדיקה",
      knowledge_state: "unknown",
      subject_person_id: entityId,
      supporting_citation_finding_ids: [],
      contradictory_citation_finding_ids: [],
    },
    "research.source.trace": {
      proposal_kind: "claim",
      statement_text: "מעקב מקור — בדיקה",
      knowledge_state: "unknown",
      subject_person_id: entityId,
      supporting_citation_finding_ids: [],
      contradictory_citation_finding_ids: [],
    },
  };
  if (fixtures[taskType]) provider.setFixture(taskType, fixtures[taskType]);
}

async function loop() {
  console.log(`[ai-worker] starting ${workerId}`);
  console.log(
    `[ai-worker] secret fingerprint ${createHash("sha256").update(workerSecret!).digest("hex").slice(0, 12)}`,
  );
  await ensureWorkerSession();
  console.log("[ai-worker] Auth session established for dedicated worker user");

  for (;;) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        await ensureWorkerSession();
      }

      const claimed = await rpc<JobRow | null>("claim_ai_job", {
        p_worker_secret: workerSecret,
        p_worker_id: workerId,
        p_lease_seconds: 120,
      });

      if (!claimed || !claimed.id) {
        await new Promise((r) => setTimeout(r, pollMs));
        continue;
      }

      console.log(`[ai-worker] claimed job ${claimed.id} task=${claimed.task_type}`);
      try {
        await processJob(claimed);
        console.log(`[ai-worker] finished job ${claimed.id}`);
      } catch (err) {
        console.error(`[ai-worker] job failed`, err);
        try {
          await rpc("complete_ai_job", {
            p_worker_secret: workerSecret,
            p_job_id: claimed.id,
            p_fencing_token: claimed.fencing_token,
            p_worker_id: workerId,
            p_status: "failed",
            p_error_code: "worker_error",
            p_error_message: err instanceof Error ? err.message : "unknown",
          });
        } catch {
          /* lease may be lost */
        }
      }
    } catch (err) {
      console.error("[ai-worker] poll error", err);
      await new Promise((r) => setTimeout(r, pollMs * 2));
    }
  }
}

void loop();
