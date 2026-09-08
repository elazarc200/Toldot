/**
 * Phase 5: full editorial lifecycle with REAL accept application path.
 * Fake AI provider only — no live OpenAI/Sefaria.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { acceptProposalFieldWithClient } from "@/application/ai/accept-core";
import { FakeLlmProvider } from "@/lib/ai/providers/fake";
import { parseAiProposalStructured } from "@/domain/ai/schemas";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const editorEmail = process.env.RLS_TEST_EDITOR_EMAIL!;
const editorPassword = process.env.RLS_TEST_EDITOR_PASSWORD!;

const workerEmail = `ai-life-${Date.now()}@toladot.local`;
const workerPassword = `Ww-${randomBytes(12).toString("hex")}`;
const workerSecret = `Ws-${randomBytes(24).toString("hex")}`;
const secretHash = createHash("sha256").update(workerSecret, "utf8").digest("hex");

let admin: SupabaseClient;
let workerUserId: string;
let previousWorkerConfig: {
  worker_user_id: string | null;
  secret_hash: string;
} | null = null;
let personId: string;
let proposalId: string | null = null;
let priorPublishedAggregateId: string | null = null;

describe("Phase 5 full editorial lifecycle (real accept + publish)", () => {
  beforeAll(async () => {
    expect(url).toBeTruthy();
    expect(serviceKey).toBeTruthy();
    expect(editorEmail).toBeTruthy();

    admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: prior } = await admin
      .from("ai_worker_config")
      .select("worker_user_id, secret_hash")
      .eq("id", 1)
      .maybeSingle();
    previousWorkerConfig = prior
      ? {
          worker_user_id: prior.worker_user_id,
          secret_hash: prior.secret_hash,
        }
      : null;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: workerEmail,
      password: workerPassword,
      email_confirm: true,
    });
    expect(createErr).toBeNull();
    workerUserId = created.user!.id;

    const { error: cfgErr } = await admin.from("ai_worker_config").upsert({
      id: 1,
      worker_user_id: workerUserId,
      secret_hash: secretHash,
      updated_at: new Date().toISOString(),
    });
    expect(cfgErr).toBeNull();

    const { data: person, error: personErr } = await admin
      .from("people")
      .insert({
        primary_display_name: `Lifecycle ${Date.now()}`,
        sort_name: `lifecycle-${Date.now()}`,
        biography_md: "BEFORE_LIFECYCLE",
        lifecycle_status: "draft",
      })
      .select("id, published_aggregate_id")
      .single();
    expect(personErr).toBeNull();
    personId = person!.id;
    priorPublishedAggregateId = person!.published_aggregate_id;
  }, 60_000);

  afterAll(async () => {
    if (!admin) return;
    if (proposalId) {
      await admin.from("ai_proposal_field_decisions").delete().eq("proposal_id", proposalId);
      await admin.from("ai_acceptance_events").delete().eq("proposal_id", proposalId);
      await admin.from("ai_proposals").delete().eq("id", proposalId);
    }
    if (personId) {
      await admin.from("ai_jobs").delete().eq("entity_id", personId);
      await admin.from("ai_conversations").delete().eq("entity_id", personId);
      await admin.from("people").delete().eq("id", personId);
    }
    if (previousWorkerConfig) {
      await admin.from("ai_worker_config").upsert({
        id: 1,
        worker_user_id: previousWorkerConfig.worker_user_id,
        secret_hash: previousWorkerConfig.secret_hash,
        updated_at: new Date().toISOString(),
      });
    }
    if (workerUserId) {
      await admin.auth.admin.deleteUser(workerUserId);
    }
  }, 60_000);

  it("anon cannot enqueue", async () => {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.rpc("enqueue_ai_job", {
      p_task_type: "draft.person.biography",
      p_entity_type: "person",
      p_entity_id: personId,
      p_conversation_id: null,
      p_idempotency_key: `life-anon-${Date.now()}`,
      p_assembled_context: {},
      p_dependency_set: [],
      p_allowed_tool_ids: [],
      p_allow_external_research: false,
      p_allowed_collection_ids: [],
      p_provider: "fake",
      p_model_id: "fake",
    });
    expect(error).toBeTruthy();
  });

  it("editor → worker → proposal → REAL accept → draft; then publish updates public", async () => {
    const editor = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signErr } = await editor.auth.signInWithPassword({
      email: editorEmail,
      password: editorPassword,
    });
    expect(signErr).toBeNull();
    const editorId = (await editor.auth.getUser()).data.user!.id;

    const { data: conv, error: convErr } = await editor
      .from("ai_conversations")
      .insert({
        entity_type: "person",
        entity_id: personId,
        created_by: editorId,
        title: "lifecycle",
      })
      .select("id")
      .single();
    expect(convErr).toBeNull();

    const { data: jobId, error: enqErr } = await editor.rpc("enqueue_ai_job", {
      p_task_type: "draft.person.biography",
      p_entity_type: "person",
      p_entity_id: personId,
      p_conversation_id: conv!.id,
      p_idempotency_key: `life-editor-${Date.now()}`,
      p_assembled_context: { fake: true },
      p_dependency_set: [],
      p_allowed_tool_ids: ["retrieval.catalog"],
      p_allow_external_research: false,
      p_allowed_collection_ids: [],
      p_provider: "fake",
      p_model_id: "fake",
    });
    expect(enqErr).toBeNull();
    expect(jobId).toBeTruthy();

    const worker = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await worker.auth.signInWithPassword({
      email: workerEmail,
      password: workerPassword,
    });

    const { data: claimed, error: claimErr } = await worker.rpc("claim_ai_job", {
      p_worker_secret: workerSecret,
      p_worker_id: "life-worker",
      p_lease_seconds: 60,
    });
    expect(claimErr).toBeNull();
    expect(claimed?.id).toBeTruthy();

    // Fake provider structured output (deterministic)
    const fake = new FakeLlmProvider();
    fake.setFixture("draft.person.biography", {
      proposal_kind: "biography",
      short_summary: "תקציר מחזור חיים",
      substantive_biography_md: "AFTER_REAL_ACCEPT_DRAFT",
      annotations: [],
      insufficient_evidence: false,
    });
    const structured = parseAiProposalStructured(
      (
        await fake.completeStructured({
          taskType: "draft.person.biography",
          system: "t",
          messages: [],
          jsonSchemaName: "biography",
          jsonSchema: {},
          timeoutMs: 1000,
          maxTokens: 100,
          modelId: "fake",
        })
      ).content,
    );

    const { data: newProposalId, error: propErr } = await worker.rpc(
      "create_ai_proposal",
      {
        p_worker_secret: workerSecret,
        p_job_id: claimed.id,
        p_fencing_token: claimed.fencing_token,
        p_worker_id: "life-worker",
        p_payload: {
          proposal_kind: "biography",
          provider: "fake",
          model_id: "fake",
          structured_output: structured,
          dependency_set: [],
          dependency_fingerprint: "life",
          warnings: [],
          citation_finding_ids: [],
        },
      },
    );
    expect(propErr).toBeNull();
    proposalId = newProposalId as string;

    await worker.rpc("complete_ai_job", {
      p_worker_secret: workerSecret,
      p_job_id: claimed.id,
      p_fencing_token: claimed.fencing_token,
      p_worker_id: "life-worker",
      p_status: "awaiting_review",
      p_tokens_in: 1,
      p_tokens_out: 1,
      p_cost_usd: 0,
    });

    // Worker cannot publish / write people / mutate snapshots
    expect(
      (
        await worker.rpc("publish_person", { p_person_id: personId })
      ).error,
    ).toBeTruthy();
    expect(
      (
        await worker.from("people").insert({
          primary_display_name: "x",
          sort_name: "x",
          lifecycle_status: "draft",
        })
      ).error,
    ).toBeTruthy();
    expect(
      (
        await worker.from("published_aggregate_snapshots").insert({
          aggregate_type: "person",
          aggregate_id: personId,
          schema_version: 1,
          payload: {},
          is_active: true,
        })
      ).error,
    ).toBeTruthy();

    // REAL accept application path
    const acceptResult = await acceptProposalFieldWithClient(editor, {
      proposalId: proposalId!,
      fieldPath: "substantive_biography_md",
    });
    expect(acceptResult.freshness).toBe("fresh");

    const { data: afterAccept } = await editor
      .from("people")
      .select("biography_md, published_aggregate_id, lifecycle_status")
      .eq("id", personId)
      .single();
    expect(afterAccept!.biography_md).toBe("AFTER_REAL_ACCEPT_DRAFT");
    expect(afterAccept!.published_aggregate_id).toBe(priorPublishedAggregateId);

    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: snapsBefore } = await anon
      .from("published_aggregate_snapshots")
      .select("id")
      .eq("aggregate_id", personId)
      .eq("is_active", true);
    expect(snapsBefore ?? []).toEqual([]);

    // Explicit publish
    const { error: pubErr } = await editor.rpc("publish_person", {
      p_person_id: personId,
    });
    expect(pubErr).toBeNull();

    const { data: afterPub } = await editor
      .from("people")
      .select("published_aggregate_id, lifecycle_status")
      .eq("id", personId)
      .single();
    expect(afterPub!.published_aggregate_id).toBeTruthy();
    expect(afterPub!.published_aggregate_id).not.toBe(priorPublishedAggregateId);

    const { data: snapsAfter } = await anon
      .from("published_aggregate_snapshots")
      .select("id, is_active")
      .eq("aggregate_id", personId)
      .eq("is_active", true);
    expect((snapsAfter ?? []).length).toBeGreaterThan(0);
  }, 90_000);
});
