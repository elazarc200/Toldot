/**
 * Phase 2 hosted publication projection + public boundary tests.
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
const nonEditorEmail = process.env.RLS_TEST_NON_EDITOR_EMAIL!;
const nonEditorPassword = process.env.RLS_TEST_NON_EDITOR_PASSWORD!;

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

describe("Phase 2 public projections (hosted)", () => {
  beforeAll(() => {
    expect(url).toBeTruthy();
    expect(serviceKey).toBeTruthy();
    expect(editorEmail).toBeTruthy();
  });

  it("anon cannot mutate published_search_documents", async () => {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.from("published_search_documents").insert({
      aggregate_type: "person",
      aggregate_id: "00000000-0000-4000-8000-000000000001",
      snapshot_id: "00000000-0000-4000-8000-000000000002",
      primary_name: "x",
      search_blob: "x",
      href_path: "/person/x",
    });
    expect(error).toBeTruthy();
  });

  it("publish person creates coherent snapshot+search+slug; draft edit does not change active payload", async () => {
    const a = admin();
    const editor = await authed(editorEmail, editorPassword);
    const stamp = Date.now();

    const { data: place } = await a
      .from("places")
      .insert({
        primary_historical_name: `מקום-p2-${stamp}`,
        sort_name: `מקום-p2-${stamp}`,
        lifecycle_status: "draft",
      })
      .select("id")
      .single();

    const { data: placeSnap, error: placePub } = await editor.rpc("publish_place", {
      p_place_id: place!.id,
    });
    expect(placePub).toBeNull();
    expect(placeSnap).toBeTruthy();

    const { data: person } = await a
      .from("people")
      .insert({
        primary_display_name: `אדם-p2-${stamp}`,
        sort_name: `אדם-p2-${stamp}`,
        identity_status: "resolved",
        lifecycle_status: "approved",
        biography_md: "ביוגרפיה בטוחה",
      })
      .select("id")
      .single();

    await a.from("person_names").insert({
      person_id: person!.id,
      name_text: `כינוי-p2-${stamp}`,
      name_kind: "alias",
      normalized_name: `כינוי-p2-${stamp}`,
    });

    await a.from("person_places").insert({
      person_id: person!.id,
      place_id: place!.id,
      knowledge_state: "known",
    });

    const { data: snap1, error: pubErr } = await editor.rpc("publish_person", {
      p_person_id: person!.id,
    });
    expect(pubErr).toBeNull();

    const { data: slugRow } = await a
      .from("published_entity_slugs")
      .select("slug, snapshot_id")
      .eq("aggregate_type", "person")
      .eq("aggregate_id", person!.id)
      .single();
    expect(slugRow?.snapshot_id).toBe(snap1);

    const { data: searchRow } = await a
      .from("published_search_documents")
      .select("primary_name, href_path, snapshot_id, is_active")
      .eq("aggregate_type", "person")
      .eq("aggregate_id", person!.id)
      .is("parent_period_id", null)
      .single();
    expect(searchRow?.is_active).toBe(true);
    expect(searchRow?.snapshot_id).toBe(snap1);
    expect(searchRow?.href_path).toContain("/person/");

    const { data: before } = await a
      .from("published_aggregate_snapshots")
      .select("payload")
      .eq("id", snap1)
      .single();
    const oldBio = (before?.payload as { person?: { biography_md?: string } })?.person
      ?.biography_md;

    await a
      .from("people")
      .update({ biography_md: "טיוטה חדשה שלא אמורה להופיע" })
      .eq("id", person!.id);

    const { data: still } = await a
      .from("published_aggregate_snapshots")
      .select("payload, is_active")
      .eq("id", snap1)
      .single();
    expect(still?.is_active).toBe(true);
    expect(
      (still?.payload as { person?: { biography_md?: string } })?.person?.biography_md,
    ).toBe(oldBio);

    // Alias searchable
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: hits } = await anon
      .from("published_search_documents")
      .select("aggregate_id")
      .eq("is_active", true)
      .ilike("search_blob", `%כינוי-p2-${stamp}%`);
    expect((hits ?? []).some((h) => h.aggregate_id === person!.id)).toBe(true);

    await editor.auth.signOut();
  });

  it("period publish replaces event search docs; failed republish keeps prior state", async () => {
    const a = admin();
    const editor = await authed(editorEmail, editorPassword);
    const stamp = Date.now();

    const { data: period } = await a
      .from("historical_periods")
      .insert({
        code: `per_${stamp}`,
        name_he: `תקופה-${stamp}`,
        overview: "סקירה",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();

    const { data: ev1 } = await a
      .from("historical_events")
      .insert({
        name_he: `אירוע-ישן-${stamp}`,
        period_id: period!.id,
        lifecycle_status: "draft",
      })
      .select("id")
      .single();

    const { data: snap1, error: pub1 } = await editor.rpc("publish_period", {
      p_period_id: period!.id,
    });
    expect(pub1).toBeNull();

    const { data: evHits1 } = await a
      .from("published_search_documents")
      .select("aggregate_id, primary_name")
      .eq("parent_period_id", period!.id)
      .eq("aggregate_type", "event");
    expect((evHits1 ?? []).some((h) => h.aggregate_id === ev1!.id)).toBe(true);

    await a.from("historical_events").delete().eq("id", ev1!.id);
    const { data: ev2 } = await a
      .from("historical_events")
      .insert({
        name_he: `אירוע-חדש-${stamp}`,
        period_id: period!.id,
        lifecycle_status: "draft",
      })
      .select("id")
      .single();

    const { data: snap2, error: pub2 } = await editor.rpc("publish_period", {
      p_period_id: period!.id,
    });
    expect(pub2).toBeNull();
    expect(snap2).not.toBe(snap1);

    const { data: evHits2 } = await a
      .from("published_search_documents")
      .select("aggregate_id")
      .eq("parent_period_id", period!.id)
      .eq("aggregate_type", "event");
    expect((evHits2 ?? []).some((h) => h.aggregate_id === ev1!.id)).toBe(false);
    expect((evHits2 ?? []).some((h) => h.aggregate_id === ev2!.id)).toBe(true);

    // Simulate failed publish by using non-editor
    const nonEditor = await authed(nonEditorEmail, nonEditorPassword);
    const { error: failPub } = await nonEditor.rpc("publish_period", {
      p_period_id: period!.id,
    });
    expect(failPub).toBeTruthy();

    const { data: active } = await a
      .from("published_aggregate_snapshots")
      .select("id")
      .eq("aggregate_type", "period")
      .eq("aggregate_id", period!.id)
      .eq("is_active", true)
      .maybeSingle();
    expect(active?.id).toBe(snap2);

    await editor.auth.signOut();
    await nonEditor.auth.signOut();
  });

  it("non-editor cannot publish or rollback", async () => {
    const client = await authed(nonEditorEmail, nonEditorPassword);
    const { error: p } = await client.rpc("publish_period", {
      p_period_id: "00000000-0000-4000-8000-000000000001",
    });
    expect(p).toBeTruthy();
    const { error: r } = await client.rpc("rollback_period_snapshot", {
      p_snapshot_id: "00000000-0000-4000-8000-000000000001",
    });
    expect(r).toBeTruthy();
    await client.auth.signOut();
  });

  it("anon sees only active search docs and cannot see draft people via editorial table", async () => {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: people } = await anon.from("people").select("id").limit(1);
    expect(people ?? []).toEqual([]);
    const { data: docs } = await anon
      .from("published_search_documents")
      .select("id, is_active")
      .eq("is_active", false)
      .limit(1);
    expect(docs ?? []).toEqual([]);
  });
});
