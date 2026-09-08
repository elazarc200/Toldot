/**
 * Real hosted non-production Supabase RLS / authz verification.
 *
 * Requires in env (e.g. .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 * Optional for editor path:
 *   RLS_TEST_EDITOR_EMAIL / RLS_TEST_EDITOR_PASSWORD
 *   RLS_TEST_NON_EDITOR_EMAIL / RLS_TEST_NON_EDITOR_PASSWORD
 *
 * Run: npm run test:rls
 */
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasBase = Boolean(url && anonKey && serviceKey);

describe("Phase 0 RLS against hosted Supabase", () => {
  beforeAll(() => {
    expect(url, "NEXT_PUBLIC_SUPABASE_URL required").toBeTruthy();
    expect(anonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY required").toBeTruthy();
    expect(serviceKey, "SUPABASE_SERVICE_ROLE_KEY required").toBeTruthy();
  });

  it("expected authz objects exist (service role)", async () => {
    const admin = createClient(url!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: caps, error: capsError } = await admin
      .from("editorial_capabilities")
      .select("code")
      .order("code");
    expect(capsError).toBeNull();
    expect(caps?.map((row) => row.code).sort()).toEqual(
      [
        "approve",
        "edit",
        "manage_corpus",
        "manage_editorial_membership",
        "merge_entities",
        "publish",
        "review",
        "rollback",
        "run_ai_research",
      ].sort(),
    );

    const { data: roles, error: rolesError } = await admin
      .from("editorial_roles")
      .select("code")
      .eq("code", "full_editor");
    expect(rolesError).toBeNull();
    expect(roles?.length).toBe(1);
  });

  it("anonymous cannot read editorial authorization tables", async () => {
    const anon = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const tables = [
      "editorial_capabilities",
      "editorial_roles",
      "role_capabilities",
      "editorial_memberships",
    ] as const;

    for (const table of tables) {
      const { data, error } = await anon.from(table).select("*");
      expect(error, `anon select ${table} should be denied`).toBeTruthy();
      expect(data === null || data.length === 0).toBe(true);
    }
  });

  it("anonymous has_capability is false / denied", async () => {
    const anon = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anon.rpc("has_capability", {
      capability: "edit",
    });
    // EXECUTE granted to authenticated only — anon should error or return false.
    if (error) {
      expect(error.message.length).toBeGreaterThan(0);
    } else {
      expect(data).toBe(false);
    }
  });

  it("anonymous cannot insert memberships", async () => {
    const anon = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.from("editorial_memberships").insert({
      user_id: "00000000-0000-0000-0000-000000000001",
      role_id: "00000000-0000-0000-0000-000000000002",
    });
    expect(error).toBeTruthy();
  });
});

const editorEmail = process.env.RLS_TEST_EDITOR_EMAIL;
const editorPassword = process.env.RLS_TEST_EDITOR_PASSWORD;
const nonEditorEmail = process.env.RLS_TEST_NON_EDITOR_EMAIL;
const nonEditorPassword = process.env.RLS_TEST_NON_EDITOR_PASSWORD;

const APPROVED_CAPABILITIES = [
  "edit",
  "review",
  "approve",
  "publish",
  "rollback",
  "merge_entities",
  "manage_corpus",
  "manage_editorial_membership",
] as const;

describe("editor capability path", () => {
  it("requires editor test credentials", () => {
    expect(hasBase).toBe(true);
    expect(editorEmail).toBeTruthy();
    expect(editorPassword).toBeTruthy();
  });

  it("bootstrapped editor has approved capabilities and cannot mutate authz", async () => {
    const client = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email: editorEmail!,
      password: editorPassword!,
    });
    expect(signInError).toBeNull();

    for (const capability of APPROVED_CAPABILITIES) {
      const { data, error } = await client.rpc("has_capability", { capability });
      expect(error).toBeNull();
      expect(data).toBe(true);
    }

    const { error: deleteMembershipError } = await client
      .from("editorial_memberships")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    expect(deleteMembershipError).toBeTruthy();

    const { error: insertRoleError } = await client
      .from("editorial_roles")
      .insert({ code: "rogue_role", description: "should fail" });
    expect(insertRoleError).toBeTruthy();

    const { error: insertCapError } = await client
      .from("editorial_capabilities")
      .insert({ code: "rogue_cap", description: "should fail" });
    expect(insertCapError).toBeTruthy();

    await client.auth.signOut();
  });
});

describe("authenticated non-editor path", () => {
  it("requires non-editor test credentials", () => {
    expect(hasBase).toBe(true);
    expect(nonEditorEmail).toBeTruthy();
    expect(nonEditorPassword).toBeTruthy();
  });

  it("non-editor has_capability false and cannot mutate authz", async () => {
    const client = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email: nonEditorEmail!,
      password: nonEditorPassword!,
    });
    expect(signInError).toBeNull();

    const { data, error } = await client.rpc("has_capability", {
      capability: "edit",
    });
    expect(error).toBeNull();
    expect(data).toBe(false);

    const { data: membershipRows, error: membershipReadError } = await client
      .from("editorial_memberships")
      .select("*");
    expect(
      membershipReadError ||
        membershipRows === null ||
        membershipRows.length === 0,
    ).toBeTruthy();

    const { error: mutateError } = await client
      .from("editorial_memberships")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    expect(mutateError).toBeTruthy();

    await client.auth.signOut();
  });
});
