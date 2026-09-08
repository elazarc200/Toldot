import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClaimAction } from "@/application/admin-actions";
import { requireCapability } from "@/lib/authz/authorize";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function AdminClaimsPage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: people }, { data: claims }, { data: citations }] = await Promise.all([
    supabase.from("people").select("id, primary_display_name").order("sort_name"),
    supabase
      .from("claims")
      .select("id, statement_text, knowledge_state, subject_person_id")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("source_citations").select("id, citation_display").limit(40),
  ]);

  async function createAction(formData: FormData) {
    "use server";
    await createClaimAction(formData);
  }

  async function attachEvidence(formData: FormData) {
    "use server";
    await requireCapability("edit");
    const client = await createServerSupabaseClient();
    const { error } = await client.from("evidence_links").insert({
      claim_id: String(formData.get("claim_id")),
      source_citation_id: String(formData.get("source_citation_id")),
      stance: String(formData.get("stance")),
      knowledge_state: "known",
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/claims");
  }

  return (
    <main className="shell">
      <p className="nav">
        <Link href="/admin">← לוח עריכה</Link>
      </p>
      <h1 className="brand" style={{ fontSize: "1.8rem" }}>
        טענות וראיות
      </h1>
      <section className="panel">
        <h2>טענה על אדם</h2>
        <form className="form" action={createAction}>
          <label>
            ניסוח
            <input name="statement_text" required />
          </label>
          <label>
            אדם (נושא)
            <select name="subject_person_id" required>
              {(people ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.primary_display_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            ודאות
            <select name="knowledge_state" defaultValue="estimated">
              <option value="known">ידוע</option>
              <option value="estimated">משוער</option>
              <option value="disputed">שנוי במחלוקת</option>
              <option value="unknown">לא ידוע</option>
            </select>
          </label>
          <button className="button" type="submit">
            יצירת טענה
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>צירוף ראיה</h2>
        <form className="form" action={attachEvidence}>
          <label>
            טענה
            <select name="claim_id" required>
              {(claims ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.statement_text.slice(0, 60)}
                </option>
              ))}
            </select>
          </label>
          <label>
            ציטוט
            <select name="source_citation_id" required>
              {(citations ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.citation_display}
                </option>
              ))}
            </select>
          </label>
          <label>
            עמדה
            <select name="stance" defaultValue="supports">
              <option value="supports">תומך</option>
              <option value="contradicts">סותר</option>
              <option value="contextual">הקשרי</option>
            </select>
          </label>
          <button className="button" type="submit">
            הוספת ראיה
          </button>
        </form>
      </section>
      <section className="panel">
        <ul>
          {(claims ?? []).map((c) => (
            <li key={c.id}>
              {c.statement_text}{" "}
              <span className="muted">({c.knowledge_state})</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
