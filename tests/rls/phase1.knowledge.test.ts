/**
 * Phase 1 hosted RLS / knowledge integrity tests.
 * Requires .env.local with Supabase + editor/non-editor credentials.
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

describe("Phase 1 knowledge engine (hosted)", () => {
  beforeAll(() => {
    expect(url).toBeTruthy();
    expect(serviceKey).toBeTruthy();
    expect(editorEmail).toBeTruthy();
    expect(nonEditorEmail).toBeTruthy();
  });

  it("same display names remain distinct people", async () => {
    const a = admin();
    const name = `רבי בדיקה ${Date.now()}`;
    const { data: p1, error: e1 } = await a
      .from("people")
      .insert({
        primary_display_name: name,
        sort_name: "בדיקה-א",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { data: p2, error: e2 } = await a
      .from("people")
      .insert({
        primary_display_name: name,
        sort_name: "בדיקה-ב",
        disambiguation_label: "דור אחר",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    expect(e1).toBeNull();
    expect(e2).toBeNull();
    expect(p1!.id).not.toBe(p2!.id);
  });

  it("anon cannot read draft people; can read active snapshots only", async () => {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: peopleRows, error: peopleErr } = await anon
      .from("people")
      .select("id")
      .limit(1);
    // RLS with no anon policy → empty result (not necessarily an error)
    expect(peopleErr || (peopleRows ?? []).length === 0).toBeTruthy();
    expect(peopleRows ?? []).toEqual([]);

    const { data: snaps, error: snapErr } = await anon
      .from("published_aggregate_snapshots")
      .select("id, is_active")
      .eq("is_active", true)
      .limit(5);
    expect(snapErr).toBeNull();
    expect(Array.isArray(snaps)).toBe(true);
  });

  it("non-editor cannot insert people", async () => {
    const client = await authed(nonEditorEmail, nonEditorPassword);
    const { error } = await client.from("people").insert({
      primary_display_name: "לא עורך",
      sort_name: "לא-עורך",
      lifecycle_status: "draft",
    });
    expect(error).toBeTruthy();
    await client.auth.signOut();
  });

  it("claim requires exactly one typed subject and FK integrity", async () => {
    const a = admin();
    const { data: person } = await a
      .from("people")
      .insert({
        primary_display_name: "נושא טענה",
        sort_name: "נושא-טענה",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();

    const { error: okErr } = await a.from("claims").insert({
      statement_text: "טענה תקינה",
      subject_person_id: person!.id,
      knowledge_state: "estimated",
      lifecycle_status: "draft",
    });
    expect(okErr).toBeNull();

    const { error: missingErr } = await a.from("claims").insert({
      statement_text: "ללא נושא",
      knowledge_state: "unknown",
      lifecycle_status: "draft",
    });
    expect(missingErr).toBeTruthy();

    const { error: badFk } = await a.from("claims").insert({
      statement_text: "נושא לא קיים",
      subject_person_id: "00000000-0000-4000-8000-000000000099",
      knowledge_state: "unknown",
      lifecycle_status: "draft",
    });
    expect(badFk).toBeTruthy();
  });

  it("non-directional relationships reject reverse duplicates", async () => {
    const a = admin();
    const { data: p1 } = await a
      .from("people")
      .insert({
        primary_display_name: "אח א",
        sort_name: "אח-א",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { data: p2 } = await a
      .from("people")
      .insert({
        primary_display_name: "אח ב",
        sort_name: "אח-ב",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();

    const { error: e1 } = await a.from("relationships").insert({
      family: "sibling",
      person_a_id: p1!.id,
      person_b_id: p2!.id,
      is_directional: false,
      knowledge_state: "known",
      lifecycle_status: "draft",
    });
    expect(e1).toBeNull();

    const { error: e2 } = await a.from("relationships").insert({
      family: "sibling",
      person_a_id: p2!.id,
      person_b_id: p1!.id,
      is_directional: false,
      knowledge_state: "known",
      lifecycle_status: "draft",
    });
    expect(e2).toBeTruthy();
  });

  it("regions expand without enum change", async () => {
    const a = admin();
    const code = `test_region_${Date.now()}`;
    const { error } = await a.from("regions").insert({
      code,
      name_he: "אזור בדיקה",
      region_kind: "historical_area",
      lifecycle_status: "draft",
    });
    expect(error).toBeNull();
  });

  it("themes enforce unique normalized names", async () => {
    const a = admin();
    const name = `מידה-${Date.now()}`;
    const { error: e1 } = await a.from("themes").insert({
      name_he: name,
      slug: name,
    });
    expect(e1).toBeNull();
    const { error: e2 } = await a.from("themes").insert({
      name_he: name,
      slug: `${name}-2`,
    });
    expect(e2).toBeTruthy();
  });

  it("publish snapshot stays stable after draft edit; rollback works", async () => {
    const editor = await authed(editorEmail, editorPassword);
    const a = admin();

    const { data: place } = await a
      .from("places")
      .insert({
        primary_historical_name: `מקום-${Date.now()}`,
        sort_name: "מקום-בדיקה",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();

    const { data: placeSnap, error: placePubErr } = await editor.rpc(
      "publish_place",
      { p_place_id: place!.id },
    );
    expect(placePubErr).toBeNull();
    expect(placeSnap).toBeTruthy();

    const { data: person } = await a
      .from("people")
      .insert({
        primary_display_name: `מפורסם-${Date.now()}`,
        sort_name: "מפורסם",
        identity_status: "resolved",
        lifecycle_status: "approved",
      })
      .select("id")
      .single();

    await a.from("person_places").insert({
      person_id: person!.id,
      place_id: place!.id,
      knowledge_state: "known",
    });

    const { data: snap1, error: pubErr } = await editor.rpc("publish_person", {
      p_person_id: person!.id,
    });
    expect(pubErr).toBeNull();

    const { data: before } = await a
      .from("published_aggregate_snapshots")
      .select("id, payload, is_active")
      .eq("id", snap1)
      .single();
    expect(before?.is_active).toBe(true);
    const oldName = (before?.payload as { person?: { primary_display_name?: string } })
      ?.person?.primary_display_name;

    await a
      .from("people")
      .update({ primary_display_name: "שם טיוטה חדש שלא צריך להופיע בציבור" })
      .eq("id", person!.id);

    const { data: still } = await a
      .from("published_aggregate_snapshots")
      .select("payload, is_active")
      .eq("id", snap1)
      .single();
    expect(still?.is_active).toBe(true);
    expect(
      (still?.payload as { person?: { primary_display_name?: string } })?.person
        ?.primary_display_name,
    ).toBe(oldName);

    const { data: snap2, error: pub2Err } = await editor.rpc("publish_person", {
      p_person_id: person!.id,
    });
    expect(pub2Err).toBeNull();
    expect(snap2).not.toBe(snap1);

    const { data: rolled, error: rollErr } = await editor.rpc(
      "rollback_person_snapshot",
      { p_snapshot_id: snap1 },
    );
    expect(rollErr).toBeNull();
    expect(rolled).toBe(snap1);

    const { data: active } = await a
      .from("published_aggregate_snapshots")
      .select("id, is_active")
      .eq("aggregate_id", person!.id)
      .eq("is_active", true)
      .maybeSingle();
    expect(active?.id).toBe(snap1);

    await editor.auth.signOut();
  });

  it("editor without going through publish capability path: non-editor cannot publish", async () => {
    const client = await authed(nonEditorEmail, nonEditorPassword);
    const { error } = await client.rpc("publish_person", {
      p_person_id: "00000000-0000-4000-8000-000000000001",
    });
    expect(error).toBeTruthy();
    await client.auth.signOut();
  });

  it("life and activity ranges are independent rows", async () => {
    const a = admin();
    const { data: person } = await a
      .from("people")
      .insert({
        primary_display_name: "טווחים",
        sort_name: "טווחים",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { error: e1 } = await a.from("person_time_ranges").insert({
      person_id: person!.id,
      range_kind: "life",
      time_precision: "unknown",
      knowledge_state: "unknown",
    });
    const { error: e2 } = await a.from("person_time_ranges").insert({
      person_id: person!.id,
      range_kind: "activity",
      start_year: 100,
      end_year: 130,
      time_precision: "range",
      knowledge_state: "estimated",
    });
    expect(e1).toBeNull();
    expect(e2).toBeNull();
  });

  it("supporting and contradicting evidence can coexist", async () => {
    const a = admin();
    const { data: work } = await a
      .from("source_works")
      .insert({
        canonical_title: `חיבור-${Date.now()}`,
        source_type: "test",
        is_approved_corpus: true,
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { data: c1 } = await a
      .from("source_citations")
      .insert({ source_work_id: work!.id, citation_display: "א" })
      .select("id")
      .single();
    const { data: c2 } = await a
      .from("source_citations")
      .insert({ source_work_id: work!.id, citation_display: "ב" })
      .select("id")
      .single();
    const { data: person } = await a
      .from("people")
      .insert({
        primary_display_name: "ראיות",
        sort_name: "ראיות",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { data: claim } = await a
      .from("claims")
      .insert({
        statement_text: "טענה עם מחלוקת",
        subject_person_id: person!.id,
        knowledge_state: "disputed",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { error: e1 } = await a.from("evidence_links").insert({
      claim_id: claim!.id,
      source_citation_id: c1!.id,
      stance: "supports",
    });
    const { error: e2 } = await a.from("evidence_links").insert({
      claim_id: claim!.id,
      source_citation_id: c2!.id,
      stance: "contradicts",
    });
    expect(e1).toBeNull();
    expect(e2).toBeNull();
  });

  it("aliases resolve to the owning person", async () => {
    const a = admin();
    const { data: person } = await a
      .from("people")
      .insert({
        primary_display_name: `עיקרי-${Date.now()}`,
        sort_name: "עיקרי",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const alias = `כינוי-${Date.now()}`;
    const { error } = await a.from("person_names").insert({
      person_id: person!.id,
      name_text: alias,
      name_kind: "alias",
      normalized_name: alias.toLocaleLowerCase("he"),
    });
    expect(error).toBeNull();
    const { data: hit } = await a
      .from("person_names")
      .select("person_id")
      .eq("normalized_name", alias.toLocaleLowerCase("he"))
      .maybeSingle();
    expect(hit?.person_id).toBe(person!.id);
  });

  it("person may belong to multiple generations", async () => {
    const a = admin();
    const stamp = Date.now();
    const { data: g1 } = await a
      .from("rabbinic_generations")
      .insert({
        code: `g1_${stamp}`,
        name_he: "דור א",
        sequence_index: 900000 + (stamp % 1000),
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { data: g2 } = await a
      .from("rabbinic_generations")
      .insert({
        code: `g2_${stamp}`,
        name_he: "דור ב",
        sequence_index: 900100 + (stamp % 1000),
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { data: person } = await a
      .from("people")
      .insert({
        primary_display_name: `רב-דורות-${stamp}`,
        sort_name: "רב-דורות",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { error: e1 } = await a.from("person_generation_memberships").insert({
      person_id: person!.id,
      generation_id: g1!.id,
      is_primary: true,
    });
    const { error: e2 } = await a.from("person_generation_memberships").insert({
      person_id: person!.id,
      generation_id: g2!.id,
      is_primary: false,
    });
    expect(e1).toBeNull();
    expect(e2).toBeNull();
  });

  it("teacher_student stores directional teacher→student semantics", async () => {
    const a = admin();
    const { data: teacher } = await a
      .from("people")
      .insert({
        primary_display_name: "רב מורה",
        sort_name: "מורה",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { data: student } = await a
      .from("people")
      .insert({
        primary_display_name: "תלמיד",
        sort_name: "תלמיד",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { data: rel, error } = await a
      .from("relationships")
      .insert({
        family: "teacher_student",
        person_a_id: teacher!.id,
        person_b_id: student!.id,
        is_directional: true,
        knowledge_state: "estimated",
        lifecycle_status: "draft",
      })
      .select("person_a_id, person_b_id, is_directional, knowledge_state, family")
      .single();
    expect(error).toBeNull();
    expect(rel!.person_a_id).toBe(teacher!.id);
    expect(rel!.person_b_id).toBe(student!.id);
    expect(rel!.is_directional).toBe(true);
    expect(rel!.knowledge_state).toBe("estimated");
    expect(rel!.family).toBe("teacher_student");
  });

  it("chronology and person-place assertions can carry claim evidence", async () => {
    const a = admin();
    const { data: person } = await a
      .from("people")
      .insert({
        primary_display_name: "עדות-כרונו",
        sort_name: "עדות",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { data: gen } = await a
      .from("rabbinic_generations")
      .insert({
        code: `evg_${Date.now()}`,
        name_he: "דור עדות",
        sequence_index: 910000 + (Date.now() % 1000),
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { data: membership } = await a
      .from("person_generation_memberships")
      .insert({
        person_id: person!.id,
        generation_id: gen!.id,
      })
      .select("id")
      .single();
    const { data: place } = await a
      .from("places")
      .insert({
        primary_historical_name: `מקום-עדות-${Date.now()}`,
        sort_name: "מקום-עדות",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { data: pp } = await a
      .from("person_places")
      .insert({
        person_id: person!.id,
        place_id: place!.id,
      })
      .select("id")
      .single();
    const { data: work } = await a
      .from("source_works")
      .insert({
        canonical_title: `מקור-עדות-${Date.now()}`,
        source_type: "test",
        is_approved_corpus: true,
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { data: citation } = await a
      .from("source_citations")
      .insert({
        source_work_id: work!.id,
        citation_display: "עדות א",
      })
      .select("id")
      .single();

    const { data: claimChrono } = await a
      .from("claims")
      .insert({
        statement_text: "שיוך לדור",
        subject_generation_membership_id: membership!.id,
        knowledge_state: "estimated",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { data: claimPlace } = await a
      .from("claims")
      .insert({
        statement_text: "פעילות במקום",
        subject_person_place_id: pp!.id,
        knowledge_state: "known",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();

    const { error: e1 } = await a.from("evidence_links").insert({
      claim_id: claimChrono!.id,
      source_citation_id: citation!.id,
      stance: "supports",
    });
    const { error: e2 } = await a.from("evidence_links").insert({
      claim_id: claimPlace!.id,
      source_citation_id: citation!.id,
      stance: "supports",
    });
    expect(e1).toBeNull();
    expect(e2).toBeNull();
  });

  it("story participant significance differs by person", async () => {
    const a = admin();
    const stamp = Date.now();
    const { data: p1 } = await a
      .from("people")
      .insert({
        primary_display_name: `סיפור-א-${stamp}`,
        sort_name: "סיפור-א",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { data: p2 } = await a
      .from("people")
      .insert({
        primary_display_name: `סיפור-ב-${stamp}`,
        sort_name: "סיפור-ב",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { data: story } = await a
      .from("stories")
      .insert({
        title: `סיפור-${stamp}`,
        retelling: "תוכן",
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    const { error: e1 } = await a.from("story_people").insert({
      story_id: story!.id,
      person_id: p1!.id,
      significance: "primary",
    });
    const { error: e2 } = await a.from("story_people").insert({
      story_id: story!.id,
      person_id: p2!.id,
      significance: "mentioned",
    });
    expect(e1).toBeNull();
    expect(e2).toBeNull();
  });

  it("failed publish leaves prior active snapshot unchanged", async () => {
    const editor = await authed(editorEmail, editorPassword);
    const a = admin();
    const { data: person } = await a
      .from("people")
      .insert({
        primary_display_name: `כישלון-פרסום-${Date.now()}`,
        sort_name: "כישלון",
        identity_status: "resolved",
        lifecycle_status: "approved",
      })
      .select("id")
      .single();
    const { data: snap1, error: pub1 } = await editor.rpc("publish_person", {
      p_person_id: person!.id,
    });
    expect(pub1).toBeNull();

    await a
      .from("people")
      .update({ identity_status: "unresolved", lifecycle_status: "draft" })
      .eq("id", person!.id);

    const { error: pubFail } = await editor.rpc("publish_person", {
      p_person_id: person!.id,
    });
    expect(pubFail).toBeTruthy();

    const { data: active } = await a
      .from("published_aggregate_snapshots")
      .select("id, is_active")
      .eq("aggregate_id", person!.id)
      .eq("is_active", true)
      .maybeSingle();
    expect(active?.id).toBe(snap1);
    await editor.auth.signOut();
  });
});
