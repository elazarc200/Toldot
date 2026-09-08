import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "תולדות",
  description:
    "תולדות היא פלטפורמת ידע והקשר היסטורי — לא ספריית טקסטים ראשוניים. חפשו אנשים, מקומות ותקופות.",
  openGraph: {
    title: "תולדות",
    description: "ידע והקשר היסטורי בעברית — חיפוש תחילה, חקירה אחר כך.",
    locale: "he_IL",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <main className="shell-wide">
      <h1 className="brand">תולדות</h1>
      <p className="lede">
        פלטפורמת ידע והקשר היסטורי בעברית. עוזרת להבין כיצד אנשים, מקומות, תקופות,
        קשרים, סיפורים ומקורות מתחברים לתמונה אחת — לא ספריית טקסטים ראשוניים.
      </p>

      <form className="hero-search" action="/search" method="get" role="search">
        <label htmlFor="q">
          <span className="sr-only">חיפוש</span>
          <input
            id="q"
            name="q"
            type="search"
            placeholder="חיפוש אדם, מקום או תקופה…"
            autoComplete="off"
            required
          />
        </label>
        <button className="button" type="submit">
          חיפוש
        </button>
      </form>

      <section className="gateway-grid" aria-label="שערי חקירה">
        <Link className="gateway-card" href="/map">
          <strong>מפה</strong>
          <span className="muted">חקירה גאוגרפית של מקומות ופעילות</span>
        </Link>
        <Link className="gateway-card" href="/seder-hadorot">
          <strong>סדר הדורות</strong>
          <span className="muted">כרונולוגיה רבנית אינטראקטיבית</span>
        </Link>
        <Link className="gateway-card" href="/periods">
          <strong>תקופות</strong>
          <span className="muted">העולם ההיסטורי של החכמים</span>
        </Link>
      </section>
    </main>
  );
}
