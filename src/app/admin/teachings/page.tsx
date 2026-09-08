import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/authz/authorize";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function AdminTeachingsPage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: people }, { data: citations }, { data: teachings }] = await Promise.all([
    supabase.from("people").select("id, primary_display_name").order("sort_name"),
    supabase.from("source_citations").select("id, citation_display"),
    supabase
      .from("selected_teachings")
      .select("id, teaching_text, lifecycle_status, source_citation_id")
      .order("created_at", { ascending: false }),
  ]);

  async function createTeaching(formData: FormData) {
    "use server";
    await requireCapability("edit");
    const client = await createServerSupabaseClient();
    const citation = String(formData.get("source_citation_id") || "") || null;
    const { error } = await client.from("selected_teachings").insert({
      person_id: String(formData.get("person_id")),
      teaching_text: String(formData.get("teaching_text")),
      source_citation_id: citation,
      lifecycle_status: "draft",
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/teachings");
  }

  return (
    <main className="shell">
      <p className="nav">
        <Link href="/admin">← לוח עריכה</Link>
      </p>
      <h1 className="brand" style={{ fontSize: "1.8rem" }}>
        תורות נבחרות
      </h1>
      <section className="panel">
        <form className="form" action={createTeaching}>
          <label>
            אדם
            <select name="person_id" required>
              {(people ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.primary_display_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            נוסח
            <textarea name="teaching_text" required rows={3} />
          </label>
          <label>
            ציטוט מקור
            <select name="source_citation_id">
              <option value="">ללא (טיוטה)</option>
              {(citations ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.citation_display}
                </option>
              ))}
            </select>
          </label>
          <button className="button" type="submit">
            יצירה
          </button>
        </form>
      </section>
      <section className="panel">
        <ul>
          {(teachings ?? []).map((t) => (
            <li key={t.id}>
              {t.teaching_text.slice(0, 80)}…{" "}
              <span className="muted">
                ({t.lifecycle_status}
                {t.source_citation_id ? "" : " · חסר מקור"})
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
