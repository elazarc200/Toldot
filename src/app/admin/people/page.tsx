import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  approvePersonAction,
  createPersonAction,
  createPersonNameAction,
  publishPersonAction,
} from "@/application/admin-actions";

export const dynamic = "force-dynamic";

async function createAction(formData: FormData) {
  "use server";
  await createPersonAction(formData);
}

async function approveAction(formData: FormData) {
  "use server";
  await approvePersonAction(String(formData.get("id")));
}

async function publishAction(formData: FormData) {
  "use server";
  await publishPersonAction(String(formData.get("id")));
}

async function addNameAction(formData: FormData) {
  "use server";
  await createPersonNameAction(formData);
}

export default async function AdminPeoplePage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: people, error }, { data: names }] = await Promise.all([
    supabase
      .from("people")
      .select(
        "id, primary_display_name, sort_name, disambiguation_label, lifecycle_status, published_aggregate_id, identity_status, title_honorific",
      )
      .order("sort_name"),
    supabase
      .from("person_names")
      .select("id, person_id, name_text, name_kind")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  return (
    <main className="shell">
      <p className="nav">
        <Link href="/admin">← לוח עריכה</Link>
      </p>
      <h1 className="brand" style={{ fontSize: "1.8rem" }}>
        אנשים
      </h1>

      {error ? (
        <div className="alert alert-error" role="alert">
          שגיאה בטעינת אנשים: {error.message}
        </div>
      ) : null}

      <section className="panel">
        <h2>יצירת אדם</h2>
        <form className="form" action={createAction}>
          <label>
            שם תצוגה
            <input name="primary_display_name" required />
          </label>
          <label>
            כינוי/תואר
            <input name="title_honorific" />
          </label>
          <label>
            שם למיון (ללא תואר)
            <input name="sort_name" placeholder="ימולא אוטומטית אם ריק" />
          </label>
          <label>
            תווית הבחנה
            <input name="disambiguation_label" />
          </label>
          <label>
            תיאור זהות קצר
            <input name="short_identity_description" />
          </label>
          <button className="button" type="submit">
            יצירה
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>שמות / כינויים / וריאציות</h2>
        <form className="form" action={addNameAction}>
          <label>
            אדם
            <select name="person_id" required>
              {(people ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.primary_display_name}
                  {p.disambiguation_label ? ` (${p.disambiguation_label})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            טקסט שם
            <input name="name_text" required />
          </label>
          <label>
            סוג
            <select name="name_kind" defaultValue="alias">
              <option value="primary">primary</option>
              <option value="alias">alias</option>
              <option value="spelling_variant">spelling_variant</option>
              <option value="alternate">alternate</option>
              <option value="title_honorific">title_honorific</option>
            </select>
          </label>
          <button className="button" type="submit">
            הוספת שם
          </button>
        </form>
        <ul>
          {(names ?? []).map((n) => (
            <li key={n.id}>
              <strong>{n.name_text}</strong>
              <span className="muted"> — {n.name_kind}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>רשימה</h2>
        <ul>
          {(people ?? []).map((p) => (
            <li key={p.id} style={{ marginBlockEnd: "1rem" }}>
              <div>
                <strong>{p.primary_display_name}</strong>
                {p.title_honorific ? (
                  <span className="muted"> · {p.title_honorific}</span>
                ) : null}
                {p.disambiguation_label ? (
                  <span className="muted"> — {p.disambiguation_label}</span>
                ) : null}
              </div>
              <div className="muted ltr-isolate">
                sort={p.sort_name} · {p.lifecycle_status} · {p.identity_status}
              </div>
              <div className="nav">
                <Link href={`/admin/people/${p.id}/ai`}>סביבת AI</Link>
                <form action={approveAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="button button-secondary" type="submit">
                    אישור
                  </button>
                </form>
                <form action={publishAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="button" type="submit">
                    פרסום
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
