import Link from "next/link";
import { getSessionUser } from "@/lib/authz/session";
import { hasCapability } from "@/lib/authz/authorize";
import { CAPABILITIES } from "@/lib/authz/capabilities";

const sections = [
  { href: "/admin/people", title: "אנשים", desc: "זהות, שמות וכינויים" },
  { href: "/admin/places", title: "מקומות", desc: "מקומות וזיהויים" },
  { href: "/admin/regions", title: "אזורים", desc: "היררכיית אזורים היסטוריים" },
  { href: "/admin/generations", title: "דורות", desc: "דורות רבניים" },
  { href: "/admin/taxonomy", title: "תקופות ואירועים", desc: "שלטון, תקופות, פרקים, אירועים, פרסום תקופה" },
  { href: "/admin/chronology", title: "כרונולוגיה", desc: "דורות, טווחי זמן, אדם–מקום" },
  { href: "/admin/relationships", title: "קשרים", desc: "רב–תלמיד, משפחה, בר פלוגתא" },
  { href: "/admin/sources", title: "מקורות", desc: "חיבורים וציטוטים" },
  { href: "/admin/claims", title: "טענות וראיות", desc: "Claims + Evidence" },
  { href: "/admin/stories", title: "סיפורים", desc: "נרטיבים וחשיבות" },
  { href: "/admin/teachings", title: "תורות נבחרות", desc: "אמרות עם מקור" },
  { href: "/admin/themes", title: "נושאים", desc: "תגיות מנורמלות" },
  { href: "/admin/publish", title: "פרסום וביקורת", desc: "lifecycle, snapshots, rollback" },
  {
    href: "/admin/seder-visual-lab",
    title: "מעבדת חזות סדר הדורות",
    desc: "השוואת וריאנטי קווים על נתוני דמה",
  },
];

export default async function AdminHomePage() {
  const user = await getSessionUser();
  const capabilityStates = await Promise.all(
    CAPABILITIES.map(async (capability) => ({
      capability,
      allowed: await hasCapability(capability),
    })),
  );

  return (
    <main className="shell">
      <h1 className="brand" style={{ fontSize: "2rem" }}>
        לוח עריכה
      </h1>
      <p className="lede">מנוע ידע · Phase 1 — ניהול ידע מבני קנוני (ללא אתר ציבורי Phase 2).</p>

      <section className="panel">
        <h2>זהות מחוברת</h2>
        <p>
          מזהה משתמש:{" "}
          <span className="ltr-isolate">{user?.id ?? "לא ידוע"}</span>
        </p>
      </section>

      <section className="panel">
        <h2>יכולות פעילות</h2>
        <ul>
          {capabilityStates.map(({ capability, allowed }) => (
            <li key={capability}>
              <span className="ltr-isolate">{capability}</span>
              {allowed ? " — מאושר" : " — נדחה"}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>ישויות ידע</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
          {sections.map((s) => (
            <li key={s.href}>
              <Link href={s.href}>
                <strong>{s.title}</strong>
              </Link>
              <span className="muted"> — {s.desc}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="nav">
        <Link href="/">חזרה לציבורי</Link>
      </p>
    </main>
  );
}
