import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createPlaceAction,
  createPlaceIdentificationAction,
  createPlaceRegionAction,
  publishPlaceAction,
} from "@/application/admin-actions";

export const dynamic = "force-dynamic";

export default async function AdminPlacesPage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: places }, { data: regions }, { data: identifications }] =
    await Promise.all([
      supabase
        .from("places")
        .select("id, primary_historical_name, sort_name, lifecycle_status")
        .order("sort_name"),
      supabase.from("regions").select("id, name_he").order("name_he"),
      supabase
        .from("place_identifications")
        .select("id, place_id, modern_name, latitude, longitude, is_preferred, location_certainty")
        .limit(40),
    ]);

  async function createAction(formData: FormData) {
    "use server";
    await createPlaceAction(formData);
  }

  async function addIdentification(formData: FormData) {
    "use server";
    await createPlaceIdentificationAction(formData);
  }

  async function addRegionLink(formData: FormData) {
    "use server";
    await createPlaceRegionAction(formData);
  }

  return (
    <main className="shell">
      <p className="nav">
        <Link href="/admin">← לוח עריכה</Link>
      </p>
      <h1 className="brand" style={{ fontSize: "1.8rem" }}>
        מקומות
      </h1>
      <section className="panel">
        <h2>יצירת מקום</h2>
        <form className="form" action={createAction}>
          <label>
            שם היסטורי
            <input name="primary_historical_name" required />
          </label>
          <label>
            שם למיון
            <input name="sort_name" />
          </label>
          <label>
            הערות
            <input name="notes" />
          </label>
          <button className="button" type="submit">
            יצירה
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>זיהוי מודרני / קואורדינטות</h2>
        <form className="form" action={addIdentification}>
          <label>
            מקום
            <select name="place_id" required>
              {(places ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.primary_historical_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            שם מודרני
            <input name="modern_name" />
          </label>
          <label>
            קו רוחב
            <input name="latitude" inputMode="decimal" />
          </label>
          <label>
            קו אורך
            <input name="longitude" inputMode="decimal" />
          </label>
          <label>
            ודאות
            <select name="location_certainty" defaultValue="unknown">
              <option value="known">known</option>
              <option value="estimated">estimated</option>
              <option value="disputed">disputed</option>
              <option value="unknown">unknown</option>
            </select>
          </label>
          <label>
            <input name="is_preferred" type="checkbox" /> מועדף
          </label>
          <button className="button" type="submit">
            הוספת זיהוי
          </button>
        </form>
        <ul>
          {(identifications ?? []).map((i) => (
            <li key={i.id} className="muted">
              {i.modern_name ?? "—"} · {i.latitude ?? "?"},{i.longitude ?? "?"} ·{" "}
              {i.location_certainty}
              {i.is_preferred ? " · preferred" : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>שיוך לאזור</h2>
        <form className="form" action={addRegionLink}>
          <label>
            מקום
            <select name="place_id" required>
              {(places ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.primary_historical_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            אזור
            <select name="region_id" required>
              {(regions ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name_he}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input name="is_primary" type="checkbox" /> ראשי
          </label>
          <button className="button" type="submit">
            שיוך
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>רשימה</h2>
        <ul>
          {(places ?? []).map((p) => (
            <li key={p.id}>
              <strong>{p.primary_historical_name}</strong>
              <span className="muted"> · {p.lifecycle_status}</span>
              <form
                action={async () => {
                  "use server";
                  await publishPlaceAction(p.id);
                }}
              >
                <button className="button button-secondary" type="submit">
                  פרסום מקום
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
