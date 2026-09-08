import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createChronologyConstraintAction,
  createPersonChronologyEditorialAction,
  createPersonGenerationMembershipAction,
  createPersonPlaceAction,
  createPersonTimeRangeAction,
  updatePersonProminenceAction,
} from "@/application/admin-actions";

export const dynamic = "force-dynamic";

async function addMembership(formData: FormData) {
  "use server";
  await createPersonGenerationMembershipAction(formData);
}

async function addTimeRange(formData: FormData) {
  "use server";
  await createPersonTimeRangeAction(formData);
}

async function addEditorial(formData: FormData) {
  "use server";
  await createPersonChronologyEditorialAction(formData);
}

async function addPersonPlace(formData: FormData) {
  "use server";
  await createPersonPlaceAction(formData);
}

async function addConstraint(formData: FormData) {
  "use server";
  await createChronologyConstraintAction(formData);
}

async function setProminence(formData: FormData) {
  "use server";
  await updatePersonProminenceAction(formData);
}

export default async function AdminChronologyPage() {
  const supabase = await createServerSupabaseClient();
  const [
    { data: people },
    { data: generations },
    { data: places },
    { data: memberships },
    { data: ranges },
    { data: personPlaces },
    { data: constraints },
  ] = await Promise.all([
    supabase.from("people").select("id, primary_display_name").order("sort_name"),
    supabase
      .from("rabbinic_generations")
      .select("id, name_he, sequence_index")
      .order("sequence_index"),
    supabase.from("places").select("id, primary_historical_name").order("sort_name"),
    supabase
      .from("person_generation_memberships")
      .select("id, person_id, generation_id, is_primary")
      .limit(40),
    supabase
      .from("person_time_ranges")
      .select("id, person_id, range_kind, start_year, end_year, knowledge_state")
      .limit(40),
    supabase.from("person_places").select("id, person_id, place_id, knowledge_state").limit(40),
    supabase
      .from("person_chronology_constraints")
      .select("id, person_id, related_person_id, constraint_kind, knowledge_state")
      .limit(40),
  ]);

  return (
    <main className="shell">
      <p className="nav">
        <Link href="/admin">← לוח עריכה</Link>
      </p>
      <h1 className="brand" style={{ fontSize: "1.8rem" }}>
        כרונולוגיה ופעילות במקום
      </h1>
      <p className="lede">
        קלטי עריכה בלבד — Historical Placement נגזר בפרסום. טווח חיים וטווח פעילות
        נפרדים.
      </p>

      <section className="panel">
        <h2>שיוך לדור</h2>
        <form className="form" action={addMembership}>
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
            דור
            <select name="generation_id" required>
              {(generations ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.sequence_index}. {g.name_he}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input name="is_primary" type="checkbox" /> דור ראשי
          </label>
          <button className="button" type="submit">
            הוספה
          </button>
        </form>
        <ul>
          {(memberships ?? []).map((m) => (
            <li key={m.id} className="ltr-isolate muted">
              {m.person_id.slice(0, 8)} → {m.generation_id.slice(0, 8)}
              {m.is_primary ? " · primary" : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>טווח זמן (חיים / פעילות)</h2>
        <form className="form" action={addTimeRange}>
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
            סוג
            <select name="range_kind" defaultValue="activity">
              <option value="life">life</option>
              <option value="activity">activity</option>
            </select>
          </label>
          <label>
            התחלה
            <input name="start_year" inputMode="numeric" />
          </label>
          <label>
            סיום
            <input name="end_year" inputMode="numeric" />
          </label>
          <label>
            דיוק
            <select name="time_precision" defaultValue="unknown">
              <option value="exact">exact</option>
              <option value="year">year</option>
              <option value="range">range</option>
              <option value="generation_only">generation_only</option>
              <option value="period_only">period_only</option>
              <option value="unknown">unknown</option>
            </select>
          </label>
          <label>
            מצב ידע
            <select name="knowledge_state" defaultValue="unknown">
              <option value="known">known</option>
              <option value="estimated">estimated</option>
              <option value="disputed">disputed</option>
              <option value="unknown">unknown</option>
            </select>
          </label>
          <label>
            תווית טקסטואלית
            <input name="textual_label" />
          </label>
          <button className="button" type="submit">
            הוספה
          </button>
        </form>
        <ul>
          {(ranges ?? []).map((r) => (
            <li key={r.id}>
              {r.range_kind}: {r.start_year ?? "?"}–{r.end_year ?? "?"} ({r.knowledge_state})
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>קלטי כרונולוגיה איכותיים</h2>
        <form className="form" action={addEditorial}>
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
            דור (אופציונלי)
            <select name="generation_id">
              <option value="">ללא</option>
              {(generations ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name_he}
                </option>
              ))}
            </select>
          </label>
          <label>
            פס
            <select name="band" defaultValue="unresolved">
              <option value="older">older</option>
              <option value="middle">middle</option>
              <option value="younger">younger</option>
              <option value="custom">custom</option>
              <option value="unresolved">unresolved</option>
            </select>
          </label>
          <label>
            חלק מהדור
            <input name="activity_portion" placeholder="early / middle / late" />
          </label>
          <label>
            <input name="continues_into_next" type="checkbox" /> ממשיך לדור הבא
          </label>
          <label>
            <input name="spans_multiple" type="checkbox" /> חוצה כמה דורות
          </label>
          <label>
            הערה
            <textarea name="free_text_note" rows={2} />
          </label>
          <button className="button" type="submit">
            הוספה
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>אילוצי לפני / אחרי</h2>
        <form className="form" action={addConstraint}>
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
            אדם קשור
            <select name="related_person_id" required>
              {(people ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.primary_display_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            סוג
            <select name="constraint_kind" defaultValue="before">
              <option value="before">before</option>
              <option value="after">after</option>
            </select>
          </label>
          <label>
            מצב ידע
            <select name="knowledge_state" defaultValue="unknown">
              <option value="known">known</option>
              <option value="estimated">estimated</option>
              <option value="disputed">disputed</option>
              <option value="unknown">unknown</option>
            </select>
          </label>
          <button className="button" type="submit">
            הוספה
          </button>
        </form>
        <ul>
          {(constraints ?? []).map((c) => (
            <li key={c.id} className="muted ltr-isolate">
              {c.person_id.slice(0, 8)} {c.constraint_kind}{" "}
              {c.related_person_id.slice(0, 8)}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>בולטות (prominence)</h2>
        <form className="form" action={setProminence}>
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
            ציון
            <input name="prominence_score" inputMode="decimal" />
          </label>
          <label>
            <input name="prominence_override" type="checkbox" /> דריסת חישוב אוטומטי
          </label>
          <button className="button" type="submit">
            עדכון
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>פעילות אדם–מקום</h2>
        <form className="form" action={addPersonPlace}>
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
            מקום
            <select name="place_id" required>
              {(places ?? []).map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.primary_historical_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            מצב ידע
            <select name="knowledge_state" defaultValue="unknown">
              <option value="known">known</option>
              <option value="estimated">estimated</option>
              <option value="disputed">disputed</option>
              <option value="unknown">unknown</option>
            </select>
          </label>
          <button className="button" type="submit">
            הוספה
          </button>
        </form>
        <ul>
          {(personPlaces ?? []).map((pp) => (
            <li key={pp.id} className="muted">
              {pp.knowledge_state}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
