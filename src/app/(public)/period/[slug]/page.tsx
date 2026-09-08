import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import {
  getCanonicalSlug,
  loadPublicPeriodByAggregateId,
  resolveSlug,
} from "@/application/public-loaders";
import { EvidenceDisclosure, UncertaintyBadge } from "@/components/public-ui";
import { renderSafeMarkdown } from "@/lib/safe-markdown";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveSlug("period", slug);
  if (!resolved) return { title: "תקופה לא נמצאה" };
  const dto = await loadPublicPeriodByAggregateId(resolved.aggregateId);
  if (!dto) return { title: "תקופה לא נמצאה" };
  return {
    title: dto.name_he,
    description: dto.overview?.slice(0, 160) ?? `תקופה: ${dto.name_he}`,
    alternates: { canonical: `/period/${slug}` },
    openGraph: { title: dto.name_he, locale: "he_IL", type: "article" },
  };
}

export default async function PeriodPage({ params }: Props) {
  const { slug } = await params;
  const resolved = await resolveSlug("period", slug);
  if (!resolved) notFound();
  const canonical = await getCanonicalSlug("period", resolved.aggregateId);
  if (canonical && canonical !== slug) permanentRedirect(`/period/${canonical}`);
  const dto = await loadPublicPeriodByAggregateId(resolved.aggregateId);
  if (!dto) notFound();

  return (
    <main className="shell-wide">
      <h1 className="brand" style={{ fontSize: "2rem" }}>
        {dto.name_he}
      </h1>
      <p className="muted">
        {dto.textual_label ||
          `${dto.start_year ?? "?"}–${dto.end_year ?? "?"}`}{" "}
        <UncertaintyBadge value={dto.knowledge_state} />
      </p>

      <div className="section-stack">
        <section>
          <h2>סקירה</h2>
          {dto.overview ? (
            <div>{renderSafeMarkdown(dto.overview)}</div>
          ) : (
            <p className="muted">אין סקירה מפורסמת.</p>
          )}
        </section>

        <section>
          <h2>פרקים</h2>
          <ul>
            {dto.episodes.map((ep) => (
              <li key={ep.id} id={`episode-${ep.id}`}>
                <strong>{ep.name_he}</strong>
                {ep.overview ? <div>{renderSafeMarkdown(ep.overview)}</div> : null}
              </li>
            ))}
            {!dto.episodes.length ? <li className="muted">אין פרקים.</li> : null}
          </ul>
        </section>

        <section>
          <h2>אירועים</h2>
          <ul>
            {dto.events.map((ev) => (
              <li key={ev.id} id={`event-${ev.id}`}>
                <strong>{ev.name_he}</strong>
                {ev.overview ? <div>{renderSafeMarkdown(ev.overview)}</div> : null}
              </li>
            ))}
            {!dto.events.length ? <li className="muted">אין אירועים.</li> : null}
          </ul>
        </section>

        <section>
          <h2>חכמים</h2>
          <ul className="rel-list">
            {dto.people.map((p) => (
              <li key={p.id}>
                <Link href={`/person/id/${p.id}`}>
                  {p.name}
                  {p.disambiguation ? ` — ${p.disambiguation}` : ""}
                </Link>
              </li>
            ))}
            {!dto.people.length ? <li className="muted">אין אנשים מפורסמים.</li> : null}
          </ul>
        </section>

        <section>
          <h2>מקורות</h2>
          <EvidenceDisclosure items={dto.evidence} />
        </section>
      </div>
    </main>
  );
}
