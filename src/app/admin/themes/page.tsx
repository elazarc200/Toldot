import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createThemeAction } from "@/application/admin-actions";

export const dynamic = "force-dynamic";

export default async function AdminThemesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: themes } = await supabase
    .from("themes")
    .select("id, slug, name_he, description")
    .order("name_he");

  async function createAction(formData: FormData) {
    "use server";
    await createThemeAction(formData);
  }

  return (
    <main className="shell">
      <p className="nav">
        <Link href="/admin">← לוח עריכה</Link>
      </p>
      <h1 className="brand" style={{ fontSize: "1.8rem" }}>
        נושאים
      </h1>
      <section className="panel">
        <form className="form" action={createAction}>
          <label>
            שם בעברית
            <input name="name_he" required />
          </label>
          <label>
            תיאור
            <input name="description" />
          </label>
          <button className="button" type="submit">
            יצירה
          </button>
        </form>
      </section>
      <section className="panel">
        <ul>
          {(themes ?? []).map((t) => (
            <li key={t.id}>
              <strong>{t.name_he}</strong>{" "}
              <span className="ltr-isolate muted">({t.slug})</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
