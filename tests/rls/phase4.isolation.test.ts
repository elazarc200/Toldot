/**
 * Phase 4 worker security + editorial isolation against hosted Supabase.
 * Requires service role + editor credentials (+ configures a temporary worker Auth user).
 * Uses fake/deterministic data only — no live OpenAI/Sefaria.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const editorEmail = process.env.RLS_TEST_EDITOR_EMAIL!;
const editorPassword = process.env.RLS_TEST_EDITOR_PASSWORD!;

const workerEmail = `ai-worker-test-${Date.now()}@toladot.local`;
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
let proposalId: string;
let priorBiography: string | null = null;
let priorPublishedAggregateId: string | null = null;

describe("Phase 4 worker security + editorial isolation", () => {
  beforeAll(async () => {
    expect(url, "NEXT_PUBLIC_SUPABASE_URL").toBeTruthy();
    expect(anonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY").toBeTruthy();
    expect(serviceKey, "SUPABASE_SERVICE_ROLE_KEY").toBeTruthy();
    expect(editorEmail, "RLS_TEST_EDITOR_EMAIL").toBeTruthy();
    expect(editorPassword, "RLS_TEST_EDITOR_PASSWORD").toBeTruthy();

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
        primary_display_name: `AI Isolation ${Date.now()}`,
        sort_name: `ai-isolation-${Date.now()}`,
        biography_md: "BEFORE_ACCEPT",
        lifecycle_status: "draft",
      })
      .select("id, biography_md, published_aggregate_id")
      .single();
    expect(personErr).toBeNull();
    personId = person!.id;
    priorBiography = person!.biography_md;
    priorPublishedAggregateId = person!.published_aggregate_id;

    const { data: proposal, error: propErr } = await admin
      .from("ai_proposals")
      .insert({
        entity_type: "person",
        entity_id: personId,
        task_type: "draft.person.biography",
        proposal_kind: "biography",
        status: "needs_review",
        provider: "fake",
        model_id: "fake",
        structured_output: {
          proposal_kind: "biography",
          short_summary: "תקציר אחרי קבלה",
          substantive_biography_md: "AFTER_ACCEPT_DRAFT_ONLY",
          annotations: [],
          insufficient_evidence: false,
        },
        dependency_set: [],
        dependency_fingerprint: "isolation-test",
        warnings: [],
      })
      .select("id")
      .single();
    expect(propErr).toBeNull();
    proposalId = proposal!.id;
  }, 60_000);

  afterAll(async () => {
    if (!admin) return;
    if (proposalId) {
      await admin.from("ai_proposal_field_decisions").delete().eq("proposal_id", proposalId);
      await admin.from("ai_acceptance_events").delete().eq("proposal_id", proposalId);
      await admin.from("ai_proposals").delete().eq("id", proposalId);
    }
    if (personId) {
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

  it("anon cannot claim jobs even with correct secret", async () => {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.rpc("claim_ai_job", {
      p_worker_secret: workerSecret,
      p_worker_id: "anon-probe",
      p_lease_seconds: 30,
    });
    expect(error).toBeTruthy();
  });

  it("missing worker secret is rejected for authenticated worker user", async () => {
    const worker = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signErr } = await worker.auth.signInWithPassword({
      email: workerEmail,
      password: workerPassword,
    });
    expect(signErr).toBeNull();
    const { error } = await worker.rpc("claim_ai_job", {
      p_worker_secret: "",
      p_worker_id: "worker-probe",
      p_lease_seconds: 30,
    });
    expect(error).toBeTruthy();
  });

  it("wrong worker secret is rejected", async () => {
    const worker = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await worker.auth.signInWithPassword({
      email: workerEmail,
      password: workerPassword,
    });
    const { error } = await worker.rpc("claim_ai_job", {
      p_worker_secret: "definitely-wrong-secret-value-xxxxx",
      p_worker_id: "worker-probe",
      p_lease_seconds: 30,
    });
    expect(error).toBeTruthy();
  });

  it("editor auth user cannot claim jobs with worker secret", async () => {
    const editor = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signErr } = await editor.auth.signInWithPassword({
      email: editorEmail,
      password: editorPassword,
    });
    expect(signErr).toBeNull();
    const { error } = await editor.rpc("claim_ai_job", {
      p_worker_secret: workerSecret,
      p_worker_id: "editor-probe",
      p_lease_seconds: 30,
    });
    expect(error).toBeTruthy();
  });

  it("authorized worker can claim (or get null when queue empty) with correct secret", async () => {
    const worker = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signErr } = await worker.auth.signInWithPassword({
      email: workerEmail,
      password: workerPassword,
    });
    expect(signErr).toBeNull();
    const { error } = await worker.rpc("claim_ai_job", {
      p_worker_secret: workerSecret,
      p_worker_id: "worker-ok",
      p_lease_seconds: 30,
    });
    // null data with no error is OK (empty queue); permission errors are not
    expect(error).toBeNull();
  });

  it("worker session cannot insert into people directly", async () => {
    const worker = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await worker.auth.signInWithPassword({
      email: workerEmail,
      password: workerPassword,
    });
    const { error } = await worker.from("people").insert({
      primary_display_name: "should-fail",
      sort_name: "should-fail",
      lifecycle_status: "draft",
    });
    expect(error).toBeTruthy();
  });

  it("worker session cannot call publish_person", async () => {
    const worker = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await worker.auth.signInWithPassword({
      email: workerEmail,
      password: workerPassword,
    });
    const { error } = await worker.rpc("publish_person", {
      p_person_id: personId,
    });
    expect(error).toBeTruthy();
  });

  it("worker session cannot mutate published snapshots", async () => {
    const worker = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await worker.auth.signInWithPassword({
      email: workerEmail,
      password: workerPassword,
    });
    const { error } = await worker.from("published_aggregate_snapshots").insert({
      aggregate_type: "person",
      aggregate_id: personId,
      schema_version: 1,
      payload: {},
      is_active: true,
    });
    expect(error).toBeTruthy();
  });

  it("editor accept updates draft biography only; published pointer unchanged", async () => {
    const editor = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signErr } = await editor.auth.signInWithPassword({
      email: editorEmail,
      password: editorPassword,
    });
    expect(signErr).toBeNull();

    // Apply via same tables the accept action uses (server action uses user client).
    const { error: updErr } = await editor
      .from("people")
      .update({
        biography_md: "AFTER_ACCEPT_DRAFT_ONLY",
        updated_at: new Date().toISOString(),
      })
      .eq("id", personId);
    expect(updErr).toBeNull();

    const { data: after, error } = await editor
      .from("people")
      .select("biography_md, published_aggregate_id, lifecycle_status")
      .eq("id", personId)
      .single();
    expect(error).toBeNull();
    expect(after!.biography_md).toBe("AFTER_ACCEPT_DRAFT_ONLY");
    expect(after!.biography_md).not.toBe(priorBiography);
    expect(after!.published_aggregate_id).toBe(priorPublishedAggregateId);
    expect(after!.lifecycle_status).toBe("draft");

    // Public projections: no active snapshot for this unpublished person
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: snaps } = await anon
      .from("published_aggregate_snapshots")
      .select("id")
      .eq("aggregate_id", personId)
      .eq("is_active", true);
    expect(snaps ?? []).toEqual([]);
  });

  it("public/anon cannot enqueue AI research", async () => {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.rpc("enqueue_ai_job", {
      p_task_type: "coverage.gaps",
      p_entity_type: "person",
      p_entity_id: personId,
      p_conversation_id: null,
      p_idempotency_key: `iso-anon-${Date.now()}`,
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

  it("editor can enqueue AI job (fake path)", async () => {
    const editor = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signErr } = await editor.auth.signInWithPassword({
      email: editorEmail,
      password: editorPassword,
    });
    expect(signErr).toBeNull();

    const { data: conv, error: convErr } = await editor
      .from("ai_conversations")
      .insert({
        entity_type: "person",
        entity_id: personId,
        created_by: (await editor.auth.getUser()).data.user!.id,
        title: "isolation",
      })
      .select("id")
      .single();
    expect(convErr).toBeNull();

    const { data: jobId, error } = await editor.rpc("enqueue_ai_job", {
      p_task_type: "coverage.gaps",
      p_entity_type: "person",
      p_entity_id: personId,
      p_conversation_id: conv!.id,
      p_idempotency_key: `iso-editor-${Date.now()}`,
      p_assembled_context: { fake: true },
      p_dependency_set: [],
      p_allowed_tool_ids: ["retrieval.catalog"],
      p_allow_external_research: false,
      p_allowed_collection_ids: [],
      p_provider: "fake",
      p_model_id: "fake",
    });
    expect(error).toBeNull();
    expect(jobId).toBeTruthy();

    // Worker claims and completes with fake proposal (no live LLM)
    const worker = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await worker.auth.signInWithPassword({
      email: workerEmail,
      password: workerPassword,
    });
    const { data: claimed, error: claimErr } = await worker.rpc("claim_ai_job", {
      p_worker_secret: workerSecret,
      p_worker_id: "iso-worker",
      p_lease_seconds: 60,
    });
    expect(claimErr).toBeNull();
    expect(claimed?.id).toBeTruthy();

    const { data: newProposalId, error: propErr } = await worker.rpc(
      "create_ai_proposal",
      {
        p_worker_secret: workerSecret,
        p_job_id: claimed.id,
        p_fencing_token: claimed.fencing_token,
        p_worker_id: "iso-worker",
        p_payload: {
          proposal_kind: "coverage",
          provider: "fake",
          model_id: "fake",
          structured_output: {
            proposal_kind: "coverage",
            gaps: [
              {
                code: "iso",
                description_he: "בדיקת בידוד",
                severity: "info",
              },
            ],
          },
          dependency_set: [],
          dependency_fingerprint: "iso",
          warnings: [],
          citation_finding_ids: [],
        },
      },
    );
    expect(propErr).toBeNull();
    expect(newProposalId).toBeTruthy();

    const { error: completeErr } = await worker.rpc("complete_ai_job", {
      p_worker_secret: workerSecret,
      p_job_id: claimed.id,
      p_fencing_token: claimed.fencing_token,
      p_worker_id: "iso-worker",
      p_status: "awaiting_review",
      p_tokens_in: 1,
      p_tokens_out: 1,
      p_cost_usd: 0,
    });
    expect(completeErr).toBeNull();

    // Accept coverage is review-only — mark field decision without canonical write
    const { error: decisionErr } = await editor
      .from("ai_proposal_field_decisions")
      .upsert({
        proposal_id: newProposalId,
        field_path: "primary",
        decision: "accepted",
        freshness: "fresh",
        note: "review_only — no canonical mutation",
        decided_by: (await editor.auth.getUser()).data.user!.id,
      });
    expect(decisionErr).toBeNull();

    const { data: personAfter } = await editor
      .from("people")
      .select("published_aggregate_id")
      .eq("id", personId)
      .single();
    expect(personAfter!.published_aggregate_id).toBe(priorPublishedAggregateId);
  });
});
