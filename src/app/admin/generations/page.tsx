import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireCapability } from "@/lib/authz/authorize";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function AdminGenerationsPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("rabbinic_generations")
    .select("id, code, name_he, sequence_index, lifecycle_status")
    .order("sequence_index");

  async function createAction(formData: FormData) {
    "use server";
    await requireCapability("edit");
    const client = await createServerSupabaseClient();
    const { error } = await client.from("rabbinic_generations").insert({
      code: String(formData.get("code")),
      name_he: String(formData.get("name_he")),
      sequence_index: Number(formData.get("sequence_index")),
      lifecycle_status: "draft",
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/generations");
  }

  return (
    <main className="shell">
      <p className="nav">
        <Link href="/admin">← לוח עריכה</Link>
      </p>
      <h1 className="brand" style={{ fontSize: "1.8rem" }}>
        דורות רבניים
      </h1>
      <section className="panel">
        <form className="form" action={createAction}>
          <label>
            קוד
            <input name="code" required dir="ltr" />
          </label>
          <label>
            שם
            <input name="name_he" required />
          </label>
          <label>
            סדר
            <input name="sequence_index" type="number" required dir="ltr" />
          </label>
          <button className="button" type="submit">
            יצירה
          </button>
        </form>
      </section>
      <section className="panel">
        <ul>
          {(data ?? []).map((g) => (
            <li key={g.id}>
              {g.sequence_index}. <strong>{g.name_he}</strong>
              <span className="ltr-isolate muted"> ({g.code})</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
