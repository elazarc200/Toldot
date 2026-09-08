/**
 * Phase 4 RLS — AI operational tables and capability.
 */
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const editorEmail = process.env.RLS_TEST_EDITOR_EMAIL;
const editorPassword = process.env.RLS_TEST_EDITOR_PASSWORD;

describe("Phase 4 AI RLS against hosted Supabase", () => {
  beforeAll(() => {
    expect(url).toBeTruthy();
    expect(anonKey).toBeTruthy();
    expect(serviceKey).toBeTruthy();
  });

  it("run_ai_research capability exists", async () => {
    const admin = createClient(url!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin
      .from("editorial_capabilities")
      .select("code")
      .eq("code", "run_ai_research")
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.code).toBe("run_ai_research");
  });

  it("anonymous cannot read AI operational tables", async () => {
    const anon = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const tables = [
      "ai_jobs",
      "ai_proposals",
      "ai_conversations",
      "ai_citation_findings",
      "ai_worker_config",
    ] as const;
    for (const table of tables) {
      const { data, error } = await anon.from(table).select("*").limit(1);
      expect(error, `anon select ${table}`).toBeTruthy();
      expect(data === null || data.length === 0).toBe(true);
    }
  });

  it("anonymous cannot enqueue AI job", async () => {
    const anon = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.rpc("enqueue_ai_job", {
      p_task_type: "coverage.gaps",
      p_entity_type: "person",
      p_entity_id: "00000000-0000-0000-0000-000000000001",
      p_conversation_id: null,
      p_idempotency_key: `anon-test-${Date.now()}`,
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

  it("anonymous cannot call worker claim RPC (EXECUTE revoked)", async () => {
    const anon = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.rpc("claim_ai_job", {
      p_worker_secret: "any-secret-value-here-long",
      p_worker_id: "test-worker",
      p_lease_seconds: 30,
    });
    expect(error).toBeTruthy();
  });

  it("editor with capability can select AI tables when credentials provided", async () => {
    expect(editorEmail, "RLS_TEST_EDITOR_EMAIL").toBeTruthy();
    expect(editorPassword, "RLS_TEST_EDITOR_PASSWORD").toBeTruthy();
    const client = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signErr } = await client.auth.signInWithPassword({
      email: editorEmail!,
      password: editorPassword!,
    });
    expect(signErr).toBeNull();
    const { error } = await client.from("ai_jobs").select("id").limit(1);
    expect(error).toBeNull();
  });
});
