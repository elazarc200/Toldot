"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  SederHistoricalPlacementBandDto,
  SederHistoricalPlacementEdgeDto,
  SederHistoricalPlacementNodeDto,
} from "@/domain/visualization";
import { FAMILY_LABELS_HE } from "@/lib/seder-visual-tokens";

export type MobileSederViewProps = {
  bands: SederHistoricalPlacementBandDto[];
  nodes: SederHistoricalPlacementNodeDto[];
  edges: SederHistoricalPlacementEdgeDto[];
  selectedPersonId: string | null;
  onSelectPerson: (personId: string | null) => void;
  searchQuery: string;
  onSearchQuery: (q: string) => void;
};

export function MobileSederView({
  bands,
  nodes,
  edges,
  selectedPersonId,
  onSelectPerson,
  searchQuery,
  onSearchQuery,
}: MobileSederViewProps) {
  const [sheetOpen, setSheetOpen] = useState(Boolean(selectedPersonId));

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase("he");
    if (!q) return nodes;
    return nodes.filter(
      (n) =>
        n.display_name.toLocaleLowerCase("he").includes(q) ||
        n.sort_name.toLocaleLowerCase("he").includes(q) ||
        (n.search_blob ?? "").toLocaleLowerCase("he").includes(q),
    );
  }, [nodes, searchQuery]);

  const byBand = useMemo(() => {
    const genBands = bands
      .filter((b) => b.band_kind === "rabbinic_generation")
      .sort((a, b) => a.y_start_norm - b.y_start_norm);
    const groups: {
      band: SederHistoricalPlacementBandDto | null;
      people: SederHistoricalPlacementNodeDto[];
    }[] = genBands.map((band) => ({
      band,
      people: filtered.filter((n) =>
        n.generation_ids?.includes(band.source_id),
      ),
    }));
    const placed = new Set(groups.flatMap((g) => g.people.map((p) => p.person_id)));
    const orphan = filtered.filter((n) => !placed.has(n.person_id));
    if (orphan.length) groups.push({ band: null, people: orphan });
    return groups.filter((g) => g.people.length > 0);
  }, [bands, filtered]);

  const selected = selectedPersonId
    ? nodes.find((n) => n.person_id === selectedPersonId) ?? null
    : null;

  const related = useMemo(() => {
    if (!selectedPersonId) return [] as SederHistoricalPlacementEdgeDto[];
    return edges.filter(
      (e) =>
        e.person_a_id === selectedPersonId ||
        e.person_b_id === selectedPersonId,
    );
  }, [edges, selectedPersonId]);

  const nameOf = (id: string) =>
    nodes.find((n) => n.person_id === id)?.display_name ?? id;

  return (
    <div className="seder-mobile">
      <label className="seder-search">
        <span className="sr-only">חיפוש אדם</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchQuery(e.target.value)}
          placeholder="חיפוש לפי שם…"
          dir="rtl"
        />
      </label>

      <div className="seder-mobile-list" role="list">
        {byBand.map((group) => (
          <section
            key={group.band?.source_id ?? "other"}
            className="seder-mobile-gen"
            aria-label={group.band?.label_he ?? "ללא דור"}
          >
            <h3>{group.band?.label_he ?? "ללא שיוך דור"}</h3>
            <ul className="seder-mobile-cards">
              {group.people.map((p) => (
                <li key={p.person_id}>
                  <button
                    type="button"
                    className={
                      p.person_id === selectedPersonId
                        ? "seder-card seder-card-selected"
                        : "seder-card"
                    }
                    onClick={() => {
                      onSelectPerson(p.person_id);
                      setSheetOpen(true);
                    }}
                  >
                    <strong>{p.display_name}</strong>
                    {p.disambiguation ? (
                      <span className="muted">{p.disambiguation}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!filtered.length ? (
          <p className="muted">לא נמצאו אנשים התואמים לחיפוש.</p>
        ) : null}
      </div>

      {sheetOpen && selected ? (
        <div
          className="seder-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seder-sheet-title"
        >
          <div className="seder-sheet-handle" aria-hidden="true" />
          <header className="seder-sheet-header">
            <h2 id="seder-sheet-title">{selected.display_name}</h2>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setSheetOpen(false);
                onSelectPerson(null);
              }}
            >
              סגור
            </button>
          </header>
          {selected.disambiguation ? (
            <p className="muted">{selected.disambiguation}</p>
          ) : null}
          <p className="nav">
            <Link className="button" href={selected.href_path}>
              לערך האדם
            </Link>
            <Link
              className="button button-secondary"
              href={`/map?person=${selected.person_id}`}
            >
              הצג במפה
            </Link>
          </p>
          <h3>קשרים</h3>
          <ul className="rel-list">
            {related.map((e) => {
              const other =
                e.person_a_id === selected.person_id
                  ? e.person_b_id
                  : e.person_a_id;
              return (
                <li key={e.relationship_id}>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => onSelectPerson(other)}
                  >
                    {FAMILY_LABELS_HE[e.family]} — {nameOf(other)}
                  </button>
                </li>
              );
            })}
            {!related.length ? (
              <li className="muted">אין קשרים מוצגים.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
