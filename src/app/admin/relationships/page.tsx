import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createRelationshipAction } from "@/application/admin-actions";

export const dynamic = "force-dynamic";

export default async function AdminRelationshipsPage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: people }, { data: relationships }] = await Promise.all([
    supabase.from("people").select("id, primary_display_name").order("sort_name"),
    supabase
      .from("relationships")
      .select("id, family, person_a_id, person_b_id, is_directional, knowledge_state")
      .order("created_at", { ascending: false }),
  ]);

  async function createAction(formData: FormData) {
    "use server";
    await createRelationshipAction(formData);
  }

  const nameById = new Map((people ?? []).map((p) => [p.id, p.primary_display_name]));

  return (
    <main className="shell">
      <p className="nav">
        <Link href="/admin">← לוח עריכה</Link>
      </p>
      <h1 className="brand" style={{ fontSize: "1.8rem" }}>
        קשרים
      </h1>
      <section className="panel">
        <form className="form" action={createAction}>
          <label>
            משפחה
            <select name="family" required>
              <option value="teacher_student">רב–תלמיד</option>
              <option value="parent_child">הורה–ילד</option>
              <option value="spouse">בן/בת זוג</option>
              <option value="sibling">אחאות</option>
              <option value="bar_plugta">בר פלוגתא</option>
            </select>
          </label>
          <label>
            אדם א (מקור לכיווני)
            <select name="person_a_id" required>
              {(people ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.primary_display_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            אדם ב (יעד לכיווני)
            <select name="person_b_id" required>
              {(people ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.primary_display_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            ודאות
            <select name="knowledge_state" defaultValue="unknown">
              <option value="known">ידוע</option>
              <option value="estimated">משוער</option>
              <option value="disputed">שנוי במחלוקת</option>
              <option value="unknown">לא ידוע</option>
            </select>
          </label>
          <button className="button" type="submit">
            יצירה
          </button>
        </form>
      </section>
      <section className="panel">
        <ul>
          {(relationships ?? []).map((r) => (
            <li key={r.id}>
              <span className="ltr-isolate">{r.family}</span>:{" "}
              {nameById.get(r.person_a_id) ?? r.person_a_id} →{" "}
              {nameById.get(r.person_b_id) ?? r.person_b_id}{" "}
              <span className="muted">({r.knowledge_state})</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
