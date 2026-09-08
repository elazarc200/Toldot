"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SederAlphaIndexRowDto } from "@/domain/visualization";

export function SederAlphaIndexClient({
  rows,
}: {
  rows: SederAlphaIndexRowDto[];
}) {
  const letters = useMemo(() => {
    const set = new Set(rows.map((r) => r.letter));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "he"));
  }, [rows]);

  const [active, setActive] = useState<string | null>(letters[0] ?? null);

  const visible = useMemo(() => {
    if (!active) return rows;
    return rows.filter((r) => r.letter === active);
  }, [active, rows]);

  return (
    <div className="seder-alpha">
      <nav className="seder-alpha-rail" aria-label="אינדקס אלפביתי">
        {letters.map((letter) => (
          <button
            key={letter}
            type="button"
            className={
              letter === active
                ? "seder-alpha-letter seder-alpha-letter-active"
                : "seder-alpha-letter"
            }
            onClick={() => setActive(letter)}
            aria-current={letter === active ? "true" : undefined}
          >
            {letter}
          </button>
        ))}
      </nav>

      <div className="seder-alpha-rows">
        {!visible.length ? (
          <p className="muted">אין רשומות לאות זו.</p>
        ) : (
          <ul className="hit-list">
            {visible.map((row) => (
              <li key={row.person_id}>
                <div className="seder-alpha-row">
                  <Link href={row.href_path}>
                    <strong>{row.display_name}</strong>
                    {row.disambiguation ? (
                      <span className="muted"> — {row.disambiguation}</span>
                    ) : null}
                    {row.generation_label ? (
                      <span className="muted"> · {row.generation_label}</span>
                    ) : null}
                  </Link>
                  <Link
                    className="button button-secondary"
                    href={`/seder-hadorot?person=${row.person_id}&intent=focus`}
                  >
                    הצג בסדר הדורות
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
