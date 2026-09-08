import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createHistoricalEpisodeAction,
  createHistoricalEventAction,
  createHistoricalPeriodAction,
  createPoliticalRuleAction,
  publishPeriodAction,
} from "@/application/admin-actions";

export const dynamic = "force-dynamic";

async function createRule(formData: FormData) {
  "use server";
  await createPoliticalRuleAction(formData);
}

async function createPeriod(formData: FormData) {
  "use server";
  await createHistoricalPeriodAction(formData);
}

async function createEpisode(formData: FormData) {
  "use server";
  await createHistoricalEpisodeAction(formData);
}

async function createEvent(formData: FormData) {
  "use server";
  await createHistoricalEventAction(formData);
}

async function publishPeriod(formData: FormData) {
  "use server";
  await publishPeriodAction(String(formData.get("id")));
}

export default async function AdminTaxonomyPage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: rules }, { data: periods }, { data: episodes }, { data: events }] =
    await Promise.all([
      supabase
        .from("political_rules")
        .select("id, code, name_he, lifecycle_status")
        .order("name_he"),
      supabase
        .from("historical_periods")
        .select("id, code, name_he, lifecycle_status, published_aggregate_id")
        .order("name_he"),
      supabase
        .from("historical_episodes")
        .select("id, name_he, period_id, lifecycle_status")
        .order("name_he"),
      supabase
        .from("historical_events")
        .select("id, name_he, period_id, episode_id, lifecycle_status")
        .order("name_he"),
    ]);

  return (
    <main className="shell">
      <p className="nav">
        <Link href="/admin">← לוח עריכה</Link>
      </p>
      <h1 className="brand" style={{ fontSize: "1.8rem" }}>
        תקופות ואירועים
      </h1>
      <p className="lede">שלטון פוליטי, תקופות היסטוריות, פרקים ואירועים.</p>

      <section className="panel">
        <h2>שלטון פוליטי</h2>
        <form className="form" action={createRule}>
          <label>
            קוד
            <input name="code" required dir="ltr" />
          </label>
          <label>
            שם
            <input name="name_he" required />
          </label>
          <label>
            תווית טקסטואלית
            <input name="textual_label" />
          </label>
          <button className="button" type="submit">
            יצירה
          </button>
        </form>
        <ul>
          {(rules ?? []).map((r) => (
            <li key={r.id}>
              <strong>{r.name_he}</strong>
              <span className="muted ltr-isolate"> ({r.code})</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>תקופה היסטורית</h2>
        <form className="form" action={createPeriod}>
          <label>
            קוד
            <input name="code" required dir="ltr" />
          </label>
          <label>
            שם
            <input name="name_he" required />
          </label>
          <label>
            סקירה
            <textarea name="overview" rows={2} />
          </label>
          <button className="button" type="submit">
            יצירה
          </button>
        </form>
        <ul>
          {(periods ?? []).map((p) => (
            <li key={p.id} style={{ marginBlockEnd: "0.75rem" }}>
              <strong>{p.name_he}</strong>
              <span className="muted ltr-isolate"> ({p.code} · {p.lifecycle_status})</span>
              <form action={publishPeriod} style={{ display: "inline", marginInlineStart: "0.5rem" }}>
                <input type="hidden" name="id" value={p.id} />
                <button className="button button-secondary" type="submit">
                  פרסום תקופה
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>פרק / אפיזודה</h2>
        <form className="form" action={createEpisode}>
          <label>
            שם
            <input name="name_he" required />
          </label>
          <label>
            תקופה
            <select name="period_id">
              <option value="">ללא</option>
              {(periods ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name_he}
                </option>
              ))}
            </select>
          </label>
          <button className="button" type="submit">
            יצירה
          </button>
        </form>
        <ul>
          {(episodes ?? []).map((e) => (
            <li key={e.id}>
              <strong>{e.name_he}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>אירוע</h2>
        <form className="form" action={createEvent}>
          <label>
            שם
            <input name="name_he" required />
          </label>
          <label>
            תקופה
            <select name="period_id">
              <option value="">ללא</option>
              {(periods ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name_he}
                </option>
              ))}
            </select>
          </label>
          <label>
            פרק
            <select name="episode_id">
              <option value="">ללא</option>
              {(episodes ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name_he}
                </option>
              ))}
            </select>
          </label>
          <button className="button" type="submit">
            יצירה
          </button>
        </form>
        <ul>
          {(events ?? []).map((ev) => (
            <li key={ev.id}>
              <strong>{ev.name_he}</strong>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
