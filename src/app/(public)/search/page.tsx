import type { Metadata } from "next";
import Link from "next/link";
import { searchPublished } from "@/application/public-loaders";

export const metadata: Metadata = {
  title: "חיפוש",
  robots: { index: true, follow: true },
};

type Props = { searchParams: Promise<{ q?: string }> };

const typeLabel: Record<string, string> = {
  person: "אדם",
  place: "מקום",
  period: "תקופה",
  event: "אירוע",
  episode: "פרק",
};

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const hits = q.trim() ? await searchPublished(q.trim()) : [];

  return (
    <main className="shell-wide">
      <h1 className="brand" style={{ fontSize: "2rem" }}>
        חיפוש
      </h1>
      <form className="hero-search" action="/search" method="get" role="search">
        <label htmlFor="q">
          <span className="sr-only">חיפוש</span>
          <input id="q" name="q" type="search" defaultValue={q} required />
        </label>
        <button className="button" type="submit">
          חיפוש
        </button>
      </form>

      {!q.trim() ? (
        <p className="muted">הקלידו שם אדם, כינוי, מקום או תקופה.</p>
      ) : hits.length === 0 ? (
        <p className="muted">לא נמצאו תוצאות מפורסמות עבור &quot;{q}&quot;.</p>
      ) : (
        <ul className="hit-list" style={{ marginBlockStart: "1.5rem" }}>
          {hits.map((h) => {
            const href = h.anchor ? `${h.href_path}#${h.anchor}` : h.href_path;
            return (
              <li key={`${h.aggregate_type}-${h.aggregate_id}-${h.anchor ?? ""}`}>
                <Link href={href}>
                  <strong>{h.primary_name}</strong>
                  <span className="muted">
                    {" "}
                    · {typeLabel[h.aggregate_type] ?? h.aggregate_type}
                    {h.disambiguation ? ` — ${h.disambiguation}` : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
