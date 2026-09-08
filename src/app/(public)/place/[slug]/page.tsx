import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import {
  getCanonicalSlug,
  loadPublicPlaceByAggregateId,
  resolveSlug,
} from "@/application/public-loaders";
import { EvidenceDisclosure, UncertaintyBadge } from "@/components/public-ui";
import { renderSafeMarkdown } from "@/lib/safe-markdown";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveSlug("place", slug);
  if (!resolved) return { title: "מקום לא נמצא" };
  const dto = await loadPublicPlaceByAggregateId(resolved.aggregateId);
  if (!dto) return { title: "מקום לא נמצא" };
  return {
    title: dto.primary_historical_name,
    description: `מקום מפורסם: ${dto.primary_historical_name}`,
    alternates: { canonical: `/place/${slug}` },
    openGraph: {
      title: dto.primary_historical_name,
      locale: "he_IL",
      type: "website",
    },
  };
}

export default async function PlacePage({ params }: Props) {
  const { slug } = await params;
  const resolved = await resolveSlug("place", slug);
  if (!resolved) notFound();
  const canonical = await getCanonicalSlug("place", resolved.aggregateId);
  if (canonical && canonical !== slug) permanentRedirect(`/place/${canonical}`);
  const dto = await loadPublicPlaceByAggregateId(resolved.aggregateId);
  if (!dto) notFound();

  const preferred = dto.identifications.find((i) => i.is_preferred) ?? dto.identifications[0];

  return (
    <main className="shell-wide">
      <h1 className="brand" style={{ fontSize: "2rem" }}>
        {dto.primary_historical_name}
      </h1>
      <p className="muted">
        אזורים:{" "}
        {dto.regions.map((r) => r.name_he).join(" · ") || "לא צוין"}
      </p>

      <div className="section-stack">
        <section>
          <h2>זיהוי</h2>
          {preferred ? (
            <p>
              זיהוי מודרני: {preferred.modern_name ?? "לא ידוע"}{" "}
              <UncertaintyBadge value={preferred.certainty} />
              {preferred.is_preferred ? null : (
                <span className="badge-dispute"> לא מועדף</span>
              )}
            </p>
          ) : (
            <p className="muted">אין זיהוי מפורסם.</p>
          )}
          {dto.identifications.length > 1 ? (
            <ul>
              {dto.identifications.map((i, idx) => (
                <li key={idx}>
                  {i.modern_name ?? "ללא שם מודרני"}{" "}
                  <UncertaintyBadge value={i.certainty} />
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section>
          <h2>סקירה</h2>
          {dto.notes ? (
            <div>{renderSafeMarkdown(dto.notes)}</div>
          ) : (
            <p className="muted">טרם פורסמה סקירה.</p>
          )}
        </section>

        <section>
          <h2>חכמים קשורים</h2>
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
          <h2>אוריינטציה גאוגרפית</h2>
          {preferred?.latitude != null && preferred?.longitude != null ? (
            <p className="ltr-isolate muted">
              {preferred.latitude}, {preferred.longitude}
            </p>
          ) : (
            <p className="muted">אין קואורדינטות מפורסמות.</p>
          )}
          <p className="nav">
            <Link
              className="button"
              href={`/map?place=${dto.place_id}`}
            >
              הצג במפה
            </Link>
          </p>
        </section>

        <section>
          <h2>מקורות</h2>
          <EvidenceDisclosure items={dto.evidence} />
        </section>
      </div>
    </main>
  );
}
