import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/authz/authorize";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function AdminStoriesPage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: stories }, { data: people }] = await Promise.all([
    supabase.from("stories").select("id, title, lifecycle_status").order("created_at", { ascending: false }),
    supabase.from("people").select("id, primary_display_name").order("sort_name"),
  ]);

  async function createStory(formData: FormData) {
    "use server";
    await requireCapability("edit");
    const client = await createServerSupabaseClient();
    const { data, error } = await client
      .from("stories")
      .insert({
        title: String(formData.get("title")),
        retelling: String(formData.get("retelling")),
        editorial_explanation: String(formData.get("editorial_explanation") || "") || null,
        lifecycle_status: "draft",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const personId = String(formData.get("person_id") || "");
    const significance = String(formData.get("significance") || "primary");
    if (personId) {
      await client.from("story_people").insert({
        story_id: data.id,
        person_id: personId,
        significance,
      });
    }
    revalidatePath("/admin/stories");
  }

  return (
    <main className="shell">
      <p className="nav">
        <Link href="/admin">← לוח עריכה</Link>
      </p>
      <h1 className="brand" style={{ fontSize: "1.8rem" }}>
        סיפורים
      </h1>
      <section className="panel">
        <form className="form" action={createStory}>
          <label>
            כותרת
            <input name="title" required />
          </label>
          <label>
            סיפור נגיש
            <textarea name="retelling" required rows={4} />
          </label>
          <label>
            אדם משתתף
            <select name="person_id">
              <option value="">ללא</option>
              {(people ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.primary_display_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            חשיבות
            <select name="significance" defaultValue="primary">
              <option value="primary">ראשי</option>
              <option value="major">מרכזי</option>
              <option value="supporting">תומך</option>
              <option value="mentioned">נזכר</option>
            </select>
          </label>
          <button className="button" type="submit">
            יצירה
          </button>
        </form>
      </section>
      <section className="panel">
        <ul>
          {(stories ?? []).map((s) => (
            <li key={s.id}>
              <strong>{s.title}</strong>{" "}
              <span className="muted">({s.lifecycle_status})</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
