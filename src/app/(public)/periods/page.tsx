import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedPeriods } from "@/application/public-loaders";

export const metadata: Metadata = {
  title: "תקופות",
  description: "תקופות היסטוריות מפורסמות בתולדות",
};

export default async function PeriodsIndexPage() {
  const periods = await listPublishedPeriods();
  return (
    <main className="shell-wide">
      <h1 className="brand" style={{ fontSize: "2rem" }}>
        תקופות
      </h1>
      <p className="lede">העולם ההיסטורי של החכמים — תקופות מפורסמות בלבד.</p>
      <ul className="hit-list" style={{ marginBlockStart: "1.5rem" }}>
        {periods.map((p) => (
          <li key={p.aggregate_id}>
            <Link href={p.href_path}>
              <strong>{p.primary_name}</strong>
              {p.disambiguation ? (
                <span className="muted"> — {p.disambiguation}</span>
              ) : null}
            </Link>
          </li>
        ))}
        {!periods.length ? (
          <li className="muted">טרם פורסמו תקופות. ערכו באזור העריכה ואז פרסמו.</li>
        ) : null}
      </ul>
    </main>
  );
}
