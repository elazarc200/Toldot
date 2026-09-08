import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  approvePersonAction,
  publishPersonAction,
  rollbackPersonAction,
  structuralRebuildVisualizationAction,
} from "@/application/admin-actions";

export const dynamic = "force-dynamic";

async function approveAction(formData: FormData) {
  "use server";
  await approvePersonAction(String(formData.get("id")));
}

async function publishAction(formData: FormData) {
  "use server";
  await publishPersonAction(String(formData.get("id")));
}

async function rollbackAction(formData: FormData) {
  "use server";
  await rollbackPersonAction(String(formData.get("id")));
}

async function rebuildAction() {
  "use server";
  await structuralRebuildVisualizationAction();
}

export default async function AdminPublishPage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: people }, { data: revisions }, { data: snapshots }, { data: manifest }] =
    await Promise.all([
      supabase
        .from("people")
        .select(
          "id, primary_display_name, lifecycle_status, identity_status, published_aggregate_id",
        )
        .order("updated_at", { ascending: false })
        .limit(40),
      supabase
        .from("entity_revisions")
        .select("id, entity_type, entity_id, revision_no, created_at, change_summary")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("published_aggregate_snapshots")
        .select(
          "id, aggregate_type, aggregate_id, schema_version, is_active, created_at, published_by",
        )
        .eq("aggregate_type", "person")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("published_visualization_manifest")
        .select("active_build_id, updated_at")
        .eq("id", 1)
        .maybeSingle(),
    ]);

  return (
    <main className="shell">
      <p className="nav">
        <Link href="/admin">← לוח עריכה</Link>
      </p>
      <h1 className="brand" style={{ fontSize: "1.8rem" }}>
        מחזור חיים, פרסום וגלגול לאחור
      </h1>
      <p className="lede">
        אישור · פרסום אטומי · rollback. סנכרון ויזואליזציה רגיל הוא incremental; rebuild
        מבני נפרד ומפעיל build_id אטומית.
      </p>

      <section className="panel">
        <h2>בנייה מבנית של פרויקציות ויזואליזציה</h2>
        <p className="muted">
          דורש manage_corpus. כותב ל-staging ומפעיל אטומית. הציבור רואה רק build פעיל.
        </p>
        <p className="ltr-isolate muted">
          active_build_id: {manifest?.active_build_id ?? "null"}
        </p>
        <form action={rebuildAction}>
          <button className="button" type="submit">
            Structural rebuild + activate
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>אנשים — סטטוס</h2>
        <ul>
          {(people ?? []).map((p) => (
            <li key={p.id} style={{ marginBlockEnd: "1rem" }}>
              <strong>{p.primary_display_name}</strong>
              <div className="muted ltr-isolate">
                {p.lifecycle_status} · identity={p.identity_status}
                {p.published_aggregate_id
                  ? ` · snap=${p.published_aggregate_id.slice(0, 8)}`
                  : ""}
              </div>
              <div className="nav">
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

      <section className="panel">
        <h2>צילומי פרסום (person)</h2>
        <ul>
          {(snapshots ?? []).map((s) => (
            <li key={s.id} style={{ marginBlockEnd: "0.75rem" }}>
              <span className="ltr-isolate">
                {s.id.slice(0, 8)} · {s.schema_version} ·{" "}
                {s.is_active ? "ACTIVE" : "inactive"}
              </span>
              {!s.is_active ? (
                <form
                  action={rollbackAction}
                  style={{ display: "inline", marginInlineStart: "0.5rem" }}
                >
                  <input type="hidden" name="id" value={s.id} />
                  <button className="button button-secondary" type="submit">
                    שחזור פעיל
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>ביקורת גרסאות (immutable)</h2>
        <ul>
          {(revisions ?? []).map((r) => (
            <li key={r.id} className="muted ltr-isolate">
              {r.entity_type}/{r.entity_id.slice(0, 8)} rev#{r.revision_no} —{" "}
              {r.change_summary ?? "—"}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
