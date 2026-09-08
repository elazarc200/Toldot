/**
 * Phase 3 hosted visualization projection RLS + publish sync tests.
 */
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: true });
loadDotenv({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const editorEmail = process.env.RLS_TEST_EDITOR_EMAIL!;
const editorPassword = process.env.RLS_TEST_EDITOR_PASSWORD!;

function admin() {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authed(email: string, password: string) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  expect(error).toBeNull();
  return client;
}

describe("Phase 3 visualization projections (hosted)", () => {
  beforeAll(() => {
    expect(url).toBeTruthy();
    expect(serviceKey).toBeTruthy();
    expect(editorEmail).toBeTruthy();
  });

  it("anon cannot insert seder placement nodes", async () => {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.from("published_seder_placement_nodes").insert({
      build_id: "00000000-0000-4000-8000-000000000099",
      person_id: "00000000-0000-4000-8000-000000000001",
      placement_status: "unresolved",
      y_start_norm: 0.4,
      y_end_norm: 0.6,
      block_length_norm: 0.2,
      sort_name: "x",
      display_name: "x",
      href_path: "/person/x",
    });
    expect(error).toBeTruthy();
  });

  it("anon cannot read non-active visualization builds", async () => {
    const a = admin();
    const { data: building } = await a
      .from("published_visualization_builds")
      .insert({
        status: "building",
        notes: `rls-test-building-${Date.now()}`,
      })
      .select("build_id")
      .single();

    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await anon
      .from("published_visualization_builds")
      .select("build_id")
      .eq("build_id", building!.build_id);
    expect(data ?? []).toHaveLength(0);

    await a.from("published_visualization_builds").delete().eq("build_id", building!.build_id);
  });

  it("publish person incrementally creates seder node on active build", async () => {
    const a = admin();
    const editor = await authed(editorEmail, editorPassword);
    const stamp = Date.now();

    // Ensure active build exists
    await editor.rpc("structural_rebuild_and_activate", {
      p_notes: `phase3-test-bootstrap-${stamp}`,
    });

    const { data: gen } = await a
      .from("rabbinic_generations")
      .select("id")
      .order("sequence_index")
      .limit(1)
      .maybeSingle();

    const { data: place } = await a
      .from("places")
      .insert({
        primary_historical_name: `מקום-p3-${stamp}`,
        sort_name: `מקום-p3-${stamp}`,
        lifecycle_status: "draft",
      })
      .select("id")
      .single();

    const { error: placePub } = await editor.rpc("publish_place", {
      p_place_id: place!.id,
    });
    expect(placePub).toBeNull();

    const { data: person } = await a
      .from("people")
      .insert({
        primary_display_name: `רבי בדיקה ${stamp}`,
        sort_name: `בדיקה ${stamp}`,
        lifecycle_status: "draft",
      })
      .select("id")
      .single();

    if (gen?.id) {
      await a.from("person_generation_memberships").insert({
        person_id: person!.id,
        generation_id: gen.id,
        is_primary: true,
        knowledge_state: "estimated",
      });
    }

    const { error: personPub } = await editor.rpc("publish_person", {
      p_person_id: person!.id,
    });
    expect(personPub).toBeNull();

    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: nodes } = await anon
      .from("published_seder_placement_nodes")
      .select("person_id, placement_status, sort_name")
      .eq("person_id", person!.id);
    expect(nodes?.length).toBe(1);
    expect(nodes?.[0]?.sort_name).toContain("בדיקה");

    const { data: alpha } = await anon
      .from("published_seder_alpha_index")
      .select("letter, person_id")
      .eq("person_id", person!.id);
    expect(alpha?.length).toBe(1);
    expect(alpha?.[0]?.letter).toBe("ב");

    const { data: mapPlace } = await anon
      .from("published_map_places")
      .select("place_id, placement_kind")
      .eq("place_id", place!.id);
    expect(mapPlace?.length).toBe(1);
    expect(mapPlace?.[0]?.placement_kind).toBe("unlocated");
  });
});
