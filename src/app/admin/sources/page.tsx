import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/authz/authorize";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: works }, { data: citations }] = await Promise.all([
    supabase.from("source_works").select("id, canonical_title, source_type, is_discovery_only, is_approved_corpus"),
    supabase.from("source_citations").select("id, citation_display, source_work_id").limit(50),
  ]);

  async function createWork(formData: FormData) {
    "use server";
    await requireCapability("edit");
    const client = await createServerSupabaseClient();
    const { error } = await client.from("source_works").insert({
      canonical_title: String(formData.get("canonical_title")),
      source_type: String(formData.get("source_type")),
      is_discovery_only: formData.get("is_discovery_only") === "on",
      is_approved_corpus: formData.get("is_approved_corpus") === "on",
      lifecycle_status: "draft",
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/sources");
  }

  async function createCitation(formData: FormData) {
    "use server";
    await requireCapability("edit");
    const client = await createServerSupabaseClient();
    const { error } = await client.from("source_citations").insert({
      source_work_id: String(formData.get("source_work_id")),
      citation_display: String(formData.get("citation_display")),
      tractate: String(formData.get("tractate") || "") || null,
      chapter: String(formData.get("chapter") || "") || null,
      page_or_daf: String(formData.get("page_or_daf") || "") || null,
      external_url: String(formData.get("external_url") || "") || null,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/sources");
  }

  return (
    <main className="shell">
      <p className="nav">
        <Link href="/admin">← לוח עריכה</Link>
      </p>
      <h1 className="brand" style={{ fontSize: "1.8rem" }}>
        מקורות
      </h1>
      <section className="panel">
        <h2>חיבור</h2>
        <form className="form" action={createWork}>
          <label>
            כותרת
            <input name="canonical_title" required />
          </label>
          <label>
            סוג
            <input name="source_type" required defaultValue="talmud_bavli" dir="ltr" />
          </label>
          <label>
            <input name="is_approved_corpus" type="checkbox" /> קורפוס מאושר
          </label>
          <label>
            <input name="is_discovery_only" type="checkbox" /> לגילוי בלבד
          </label>
          <button className="button" type="submit">
            יצירת חיבור
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>ציטוט</h2>
        <form className="form" action={createCitation}>
          <label>
            חיבור
            <select name="source_work_id" required>
              {(works ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.canonical_title}
                </option>
              ))}
            </select>
          </label>
          <label>
            תצוגת ציטוט
            <input name="citation_display" required />
          </label>
          <label>
            מסכת
            <input name="tractate" />
          </label>
          <label>
            פרק
            <input name="chapter" />
          </label>
          <label>
            דף/עמוד
            <input name="page_or_daf" />
          </label>
          <label>
            קישור
            <input name="external_url" dir="ltr" />
          </label>
          <button className="button" type="submit">
            יצירת ציטוט
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>ציטוטים אחרונים</h2>
        <ul>
          {(citations ?? []).map((c) => (
            <li key={c.id}>{c.citation_display}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
