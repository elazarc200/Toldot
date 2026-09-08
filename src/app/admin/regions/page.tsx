import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createRegionAction } from "@/application/admin-actions";

export const dynamic = "force-dynamic";

export default async function AdminRegionsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: regions } = await supabase
    .from("regions")
    .select("id, code, name_he, region_kind, parent_region_id, lifecycle_status")
    .order("name_he");

  async function createAction(formData: FormData) {
    "use server";
    await createRegionAction(formData);
  }

  return (
    <main className="shell">
      <p className="nav">
        <Link href="/admin">← לוח עריכה</Link>
      </p>
      <h1 className="brand" style={{ fontSize: "1.8rem" }}>
        אזורים
      </h1>
      <section className="panel">
        <h2>אזור חדש</h2>
        <form className="form" action={createAction}>
          <label>
            קוד יציב
            <input name="code" required dir="ltr" />
          </label>
          <label>
            שם בעברית
            <input name="name_he" required />
          </label>
          <label>
            סוג
            <input name="region_kind" defaultValue="historical_area" />
          </label>
          <label>
            אב (מזהה)
            <select name="parent_region_id" defaultValue="">
              <option value="">ללא</option>
              {(regions ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name_he}
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
          {(regions ?? []).map((r) => (
            <li key={r.id}>
              <strong>{r.name_he}</strong>
              <span className="ltr-isolate muted"> ({r.code})</span>
              <span className="muted"> · {r.region_kind}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
