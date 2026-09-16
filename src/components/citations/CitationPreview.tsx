import pilot from '@/components/knowledge/pilot.json';

type Citation = (typeof pilot.citations)[number];

/** Shared Toladot citation preview: expand in-app, open full source externally. */
export function CitationPreview({
  ids,
  explanations,
  variant = 'atlas',
}: {
  ids: string[];
  /** Optional per-citation contextual note (citation id → Hebrew explanation). */
  explanations?: Record<string, string>;
  variant?: 'atlas' | 'knowledge';
}) {
  const className = variant === 'knowledge' ? 'kg-source' : 'atlas-sources-item';
  const linkLabel = 'עיון במקור ↗';
  return (
    <div className={variant === 'knowledge' ? undefined : 'atlas-sources'}>
      {[...new Set(ids)].map((id) => {
        const c = pilot.citations.find((x) => x.id === id) as Citation | undefined;
        if (!c) return null;
        const explain = explanations?.[id];
        return (
          <details key={id} className={className}>
            <summary>{c.label}</summary>
            {c.text ? <p className="citation-excerpt">{c.text}</p> : <p>אפשר לעיין במקור ובהקשר המלא בקישור.</p>}
            {explain ? <p className="citation-context">{explain}</p> : null}
            {variant === 'knowledge' && (c.edition || c.license) ? (
              <small>
                {[c.edition, c.license].filter(Boolean).join(' · ')}
              </small>
            ) : null}
            {'kind' in c && (c as {kind?: string}).kind ? (
              <small className="citation-kind">
                {(c as {kind?: string}).kind === 'secondary' || (c as {kind?: string}).kind === 'inscription'
                  ? 'מקור משני / חיצוני'
                  : 'מקור רבני ראשוני'}
              </small>
            ) : null}
            <a href={c.url} target="_blank" rel="noopener noreferrer">
              {linkLabel}
            </a>
          </details>
        );
      })}
    </div>
  );
}
