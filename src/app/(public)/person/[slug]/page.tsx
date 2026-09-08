import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import {
  getCanonicalSlug,
  loadPublicPersonByAggregateId,
  resolveSlug,
} from "@/application/public-loaders";
import { EvidenceDisclosure, PortraitFallback, UncertaintyBadge } from "@/components/public-ui";
import { renderSafeMarkdown } from "@/lib/safe-markdown";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveSlug("person", slug);
  if (!resolved) return { title: "אדם לא נמצא" };
  const dto = await loadPublicPersonByAggregateId(resolved.aggregateId);
  if (!dto) return { title: "אדם לא נמצא" };
  const title = dto.primary_display_name;
  const description =
    dto.short_identity_description ??
    `ערך מפורסם על ${dto.primary_display_name} במאגר תולדות.`;
  return {
    title,
    description,
    alternates: { canonical: `/person/${slug}` },
    openGraph: { title, description, locale: "he_IL", type: "profile" },
  };
}

export default async function PersonPage({ params }: Props) {
  const { slug } = await params;
  const resolved = await resolveSlug("person", slug);
  if (!resolved) notFound();

  const canonical = await getCanonicalSlug("person", resolved.aggregateId);
  if (canonical && canonical !== slug) {
    permanentRedirect(`/person/${canonical}`);
  }

  const dto = await loadPublicPersonByAggregateId(resolved.aggregateId);
  if (!dto) notFound();

  const teachers = dto.relationships.filter((r) => r.family === "teacher_student");
  const family = dto.relationships.filter((r) =>
    ["parent_child", "spouse", "sibling"].includes(r.family),
  );
  const barPlugta = dto.relationships.filter((r) => r.family === "bar_plugta");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: dto.primary_display_name,
    alternateName: dto.names.map((n) => n.text),
    description: dto.short_identity_description,
  };

  return (
    <main className="shell-wide">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="identity-row">
        <PortraitFallback name={dto.primary_display_name} />
        <div>
          <h1 className="brand" style={{ fontSize: "2rem" }}>
            {dto.title_honorific ? `${dto.title_honorific} ` : ""}
            {dto.primary_display_name}
          </h1>
          {dto.disambiguation_label ? (
            <p className="muted">{dto.disambiguation_label}</p>
          ) : null}
          {dto.short_identity_description ? (
            <p>{dto.short_identity_description}</p>
          ) : null}
          <p className="muted">
            {dto.generations.map((g) => g.name_he).filter(Boolean).join(" · ") ||
              "דור לא צוין"}
          </p>
        </div>
      </div>

      <div className="section-stack">
        <section aria-labelledby="quick">
          <h2 id="quick">בקצרה</h2>
          <p>
            {dto.short_identity_description ||
              `${dto.primary_display_name} — ערך מפורסם בתולדות.`}
          </p>
        </section>

        <section aria-labelledby="bio">
          <h2 id="bio">ביוגרפיה</h2>
          {dto.biography_md ? (
            <div className="prose">{renderSafeMarkdown(dto.biography_md)}</div>
          ) : (
            <p className="muted">טרם פורסם סיפור חיים מפורט.</p>
          )}
        </section>

        <section aria-labelledby="timeline">
          <h2 id="timeline">ציר זמן אישי</h2>
          <ul>
            {dto.time_ranges.map((tr, i) => (
              <li key={i}>
                {tr.range_kind === "life" ? "חיים" : "פעילות"}:{" "}
                {tr.textual_label ||
                  `${tr.start_year ?? "?"}–${tr.end_year ?? "?"}`}{" "}
                <UncertaintyBadge value={tr.knowledge_state} />
              </li>
            ))}
            {dto.chronology_editorial.map((c, i) => (
              <li key={`c-${i}`}>
                פס כרונולוגי: {c.band}
                {c.note ? ` — ${c.note}` : ""}{" "}
                <UncertaintyBadge value={c.knowledge_state} />
              </li>
            ))}
            {!dto.time_ranges.length && !dto.chronology_editorial.length ? (
              <li className="muted">אין נתוני זמן מפורסמים (לא ידוע הוא ערך תקף).</li>
            ) : null}
          </ul>
        </section>

        <section aria-labelledby="places">
          <h2 id="places">מקומות פעילות</h2>
          <ul className="rel-list">
            {dto.places.map((p) => (
              <li key={p.id}>
                <Link href={`/place/id/${p.id}`}>{p.name}</Link>{" "}
                <UncertaintyBadge value={p.knowledge_state} />
              </li>
            ))}
            {!dto.places.length ? <li className="muted">אין מקומות מפורסמים.</li> : null}
          </ul>
        </section>

        <section aria-labelledby="teachers">
          <h2 id="teachers">רבנים ותלמידים</h2>
          <ul className="rel-list">
            {teachers.map((r) => (
              <li key={r.id}>
                <strong>{r.role_label_he}:</strong> {r.counterpart_name}
                {r.counterpart_disambiguation
                  ? ` (${r.counterpart_disambiguation})`
                  : ""}{" "}
                <UncertaintyBadge value={r.knowledge_state} />
                {r.disputed ? <span className="badge-dispute">מחלוקת</span> : null}
              </li>
            ))}
            {!teachers.length ? <li className="muted">אין קשרי הוראה מפורסמים.</li> : null}
          </ul>
        </section>

        <section aria-labelledby="family">
          <h2 id="family">משפחה</h2>
          <ul className="rel-list">
            {family.map((r) => (
              <li key={r.id}>
                <strong>{r.role_label_he}:</strong> {r.counterpart_name}{" "}
                <UncertaintyBadge value={r.knowledge_state} />
                {r.disputed ? <span className="badge-dispute">מחלוקת</span> : null}
              </li>
            ))}
            {!family.length ? <li className="muted">אין קשרי משפחה מפורסמים.</li> : null}
          </ul>
        </section>

        <section aria-labelledby="bar">
          <h2 id="bar">בר פלוגתא</h2>
          <ul className="rel-list">
            {barPlugta.map((r) => (
              <li key={r.id}>
                {r.counterpart_name} <UncertaintyBadge value={r.knowledge_state} />
                {r.disputed ? <span className="badge-dispute">מחלוקת</span> : null}
              </li>
            ))}
            {!barPlugta.length ? <li className="muted">אין רשומות.</li> : null}
          </ul>
        </section>

        <section aria-labelledby="teachings">
          <h2 id="teachings">תורות נבחרות</h2>
          <ul className="story-list">
            {dto.teachings.map((t) => (
              <li key={t.id} className="panel" style={{ margin: 0 }}>
                {t.title ? <h3>{t.title}</h3> : null}
                <div>{renderSafeMarkdown(t.text)}</div>
                <p className="muted">
                  מקור: {t.citation.work_title ? `${t.citation.work_title} — ` : ""}
                  {t.citation.display}
                </p>
              </li>
            ))}
            {!dto.teachings.length ? <li className="muted">אין תורות נבחרות מפורסמות.</li> : null}
          </ul>
        </section>

        <section aria-labelledby="stories">
          <h2 id="stories">סיפורים</h2>
          <ul className="story-list">
            {dto.stories.map((s) => (
              <li key={s.id} className="panel" style={{ margin: 0 }}>
                <h3>{s.title}</h3>
                <p className="muted">חשיבות לערך זה: {s.significance}</p>
                <div>{renderSafeMarkdown(s.retelling)}</div>
              </li>
            ))}
            {!dto.stories.length ? <li className="muted">אין סיפורים מפורסמים.</li> : null}
          </ul>
        </section>

        <section aria-labelledby="world">
          <h2 id="world">העולם בזמנם</h2>
          <ul>
            {dto.periods.map((p) => (
              <li key={p.id}>
                <Link href={`/period/id/${p.id}`}>{p.name_he}</Link>
              </li>
            ))}
            {dto.events.map((e) => (
              <li key={e.id}>{e.name_he}</li>
            ))}
            {!dto.periods.length && !dto.events.length ? (
              <li className="muted">אין הקשר תקופתי מפורסם.</li>
            ) : null}
          </ul>
        </section>

        <section aria-labelledby="contemporaries">
          <h2 id="contemporaries">בני דור</h2>
          <ul className="rel-list">
            {dto.contemporaries.map((c) => (
              <li key={c.id}>
                <Link href={`/person/id/${c.id}`}>
                  {c.name}
                  {c.disambiguation ? ` — ${c.disambiguation}` : ""}
                </Link>
              </li>
            ))}
            {!dto.contemporaries.length ? (
              <li className="muted">אין בני דור מפורסמים.</li>
            ) : null}
          </ul>
        </section>

        <section aria-labelledby="evidence">
          <h2 id="evidence">מקורות וראיות</h2>
          <EvidenceDisclosure items={dto.evidence} />
        </section>

        <section aria-labelledby="seder">
          <h2 id="seder">סדר הדורות ומפה</h2>
          <p className="nav">
            <Link
              className="button"
              href={`/seder-hadorot?person=${dto.canonical_person_id}&intent=focus`}
            >
              קפוץ למיקום בסדר הדורות
            </Link>
            <Link
              className="button button-secondary"
              href={`/map?person=${dto.canonical_person_id}`}
            >
              הצג במפה
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
