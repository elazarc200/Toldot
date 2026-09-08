"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  SederHistoricalPlacementBandDto,
  SederHistoricalPlacementEdgeDto,
  SederHistoricalPlacementNodeDto,
  SederRenderLayoutDto,
} from "@/domain/visualization";
import type { RelationshipFamily } from "@/domain/knowledge";
import {
  FAMILY_LABELS_HE,
  type SederVisualVariant,
} from "@/lib/seder-visual-tokens";
import { MobileSederView } from "@/components/seder/MobileSederView";
import { SederChronologyCanvas } from "@/components/seder/SederChronologyCanvas";

const FAMILY_FILTERS: {
  key: string;
  label: string;
  families: RelationshipFamily[];
}[] = [
  {
    key: "teacher_student",
    label: "רב–תלמיד",
    families: ["teacher_student"],
  },
  {
    key: "family",
    label: "משפחה",
    families: ["parent_child", "spouse", "sibling"],
  },
  {
    key: "bar_plugta",
    label: "בר פלוגתא",
    families: ["bar_plugta"],
  },
];

const MOBILE_MQ = "(max-width: 720px)";

export type SederExplorerClientProps = {
  bands: SederHistoricalPlacementBandDto[];
  nodes: SederHistoricalPlacementNodeDto[];
  edges: SederHistoricalPlacementEdgeDto[];
  renderLayout: SederRenderLayoutDto[];
  focusPersonId?: string | null;
  visualVariant?: SederVisualVariant;
  /** When true, show variant label (admin lab). */
  showVariantBadge?: boolean;
};

export function SederExplorerClient({
  bands,
  nodes,
  edges,
  renderLayout,
  focusPersonId = null,
  visualVariant = 1,
  showVariantBadge = false,
}: SederExplorerClientProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(
    focusPersonId,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKeys, setFilterKeys] = useState<Set<string>>(
    () => new Set(FAMILY_FILTERS.map((f) => f.key)),
  );
  const [showDisputed, setShowDisputed] = useState(true);
  const [showUncertain, setShowUncertain] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (focusPersonId) setSelectedPersonId(focusPersonId);
  }, [focusPersonId]);

  const visibleFamilies = useMemo(() => {
    const set = new Set<string>();
    for (const f of FAMILY_FILTERS) {
      if (filterKeys.has(f.key)) {
        for (const fam of f.families) set.add(fam);
      }
    }
    return set;
  }, [filterKeys]);

  const selected = selectedPersonId
    ? nodes.find((n) => n.person_id === selectedPersonId) ?? null
    : null;

  const searchHits = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase("he");
    if (!q) return [] as SederHistoricalPlacementNodeDto[];
    return nodes
      .filter(
        (n) =>
          n.display_name.toLocaleLowerCase("he").includes(q) ||
          n.sort_name.toLocaleLowerCase("he").includes(q) ||
          (n.search_blob ?? "").toLocaleLowerCase("he").includes(q) ||
          (n.disambiguation ?? "").toLocaleLowerCase("he").includes(q),
      )
      .slice(0, 12);
  }, [nodes, searchQuery]);

  const relatedEdges = useMemo(() => {
    if (!selectedPersonId) return [] as SederHistoricalPlacementEdgeDto[];
    return edges.filter(
      (e) =>
        visibleFamilies.has(e.family) &&
        (e.person_a_id === selectedPersonId ||
          e.person_b_id === selectedPersonId),
    );
  }, [edges, selectedPersonId, visibleFamilies]);

  const nameOf = (id: string) =>
    nodes.find((n) => n.person_id === id)?.display_name ?? id;

  const toggleFilter = (key: string) => {
    setFilterKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (isMobile) {
    return (
      <div className="seder-explorer seder-explorer-mobile">
        <MobileSederView
          bands={bands}
          nodes={nodes}
          edges={edges}
          selectedPersonId={selectedPersonId}
          onSelectPerson={setSelectedPersonId}
          searchQuery={searchQuery}
          onSearchQuery={setSearchQuery}
        />
        <SemanticLists
          nodes={nodes}
          edges={edges}
          onSelect={setSelectedPersonId}
          nameOf={nameOf}
        />
      </div>
    );
  }

  return (
    <div className="seder-explorer">
      <aside className="seder-sidebar" aria-label="כלי סינון וחיפוש">
        {showVariantBadge ? (
          <p className="muted">וריאנט חזותי: {visualVariant}</p>
        ) : null}

        <label className="seder-search">
          <span>חיפוש</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="שם, כינוי…"
            dir="rtl"
          />
        </label>
        {searchHits.length ? (
          <ul className="seder-search-hits">
            {searchHits.map((h) => (
              <li key={h.person_id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPersonId(h.person_id);
                    setSearchQuery("");
                  }}
                >
                  {h.display_name}
                  {h.disambiguation ? ` — ${h.disambiguation}` : ""}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <fieldset className="seder-filters">
          <legend>סוגי קשרים</legend>
          {FAMILY_FILTERS.map((f) => (
            <label key={f.key} className="seder-filter-row">
              <input
                type="checkbox"
                checked={filterKeys.has(f.key)}
                onChange={() => toggleFilter(f.key)}
              />
              {f.label}
            </label>
          ))}
          <label className="seder-filter-row">
            <input
              type="checkbox"
              checked={showDisputed}
              onChange={(e) => setShowDisputed(e.target.checked)}
            />
            מחלוקת
          </label>
          <label className="seder-filter-row">
            <input
              type="checkbox"
              checked={showUncertain}
              onChange={(e) => setShowUncertain(e.target.checked)}
            />
            לא ודאי / משוער
          </label>
        </fieldset>

        <div className="seder-legend" aria-label="מקרא">
          <h3>מקרא</h3>
          <ul>
            <li>
              <span className="seder-legend-swatch seder-legend-solid" /> רב–תלמיד
              (קו מלא + חץ)
            </li>
            <li>
              <span className="seder-legend-swatch seder-legend-dash" /> משפחה
              (מקווקו)
            </li>
            <li>
              <span className="seder-legend-swatch seder-legend-dot" /> בר פלוגתא
            </li>
            <li className="muted">צבע הוא חיזוק בלבד — לא סמן יחיד</li>
          </ul>
        </div>

        {selected ? (
          <section className="seder-preview" aria-live="polite">
            <h3>{selected.display_name}</h3>
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
            <h4>קשרים קרובים</h4>
            <ul className="rel-list">
              {relatedEdges.map((e) => {
                const other =
                  e.person_a_id === selected.person_id
                    ? e.person_b_id
                    : e.person_a_id;
                return (
                  <li key={e.relationship_id}>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => setSelectedPersonId(other)}
                    >
                      {FAMILY_LABELS_HE[e.family]} — {nameOf(other)}
                    </button>
                  </li>
                );
              })}
              {!relatedEdges.length ? (
                <li className="muted">אין קשרים תחת הסינון הנוכחי.</li>
              ) : null}
            </ul>
          </section>
        ) : (
          <p className="muted">בחרו אדם בגרף או בחיפוש.</p>
        )}
      </aside>

      <div className="seder-canvas-wrap">
        <SederChronologyCanvas
          bands={bands}
          nodes={nodes}
          edges={edges}
          renderLayout={renderLayout}
          selectedPersonId={selectedPersonId}
          focusPersonId={focusPersonId}
          visualVariant={visualVariant}
          visibleFamilies={visibleFamilies}
          showDisputed={showDisputed}
          showUncertain={showUncertain}
          onSelectPerson={setSelectedPersonId}
        />
      </div>

      <SemanticLists
        nodes={nodes}
        edges={edges}
        onSelect={setSelectedPersonId}
        nameOf={nameOf}
      />
    </div>
  );
}

function SemanticLists({
  nodes,
  edges,
  onSelect,
  nameOf,
}: {
  nodes: SederHistoricalPlacementNodeDto[];
  edges: SederHistoricalPlacementEdgeDto[];
  onSelect: (id: string) => void;
  nameOf: (id: string) => string;
}) {
  return (
    <div className="seder-a11y-lists">
      <section aria-labelledby="seder-people-list-title">
        <h2 id="seder-people-list-title">רשימת אנשים</h2>
        <ul>
          {nodes.map((n) => (
            <li key={n.person_id}>
              <button type="button" onClick={() => onSelect(n.person_id)}>
                {n.display_name}
                {n.disambiguation ? ` — ${n.disambiguation}` : ""}
              </button>
              <Link href={n.href_path}> לערך</Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="seder-rel-list-title">
        <h2 id="seder-rel-list-title">רשימת קשרים</h2>
        <ul>
          {edges.map((e) => (
            <li key={e.relationship_id}>
              {FAMILY_LABELS_HE[e.family]}: {nameOf(e.person_a_id)} —{" "}
              {nameOf(e.person_b_id)}
              {e.knowledge_state === "disputed" || e.dispute_state
                ? " (מחלוקת)"
                : ""}
              {e.knowledge_state === "estimated" ||
              e.knowledge_state === "unknown"
                ? " (לא ודאי)"
                : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
