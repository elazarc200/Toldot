import type { PilotCitation } from '@/lib/citations/citation-store';

const HEBREW_STOP_WORDS = new Set([
  'אשר', 'אבל', 'אינם', 'אינו', 'אין', 'אל', 'את', 'הוא', 'היא', 'היה',
  'היו', 'זה', 'זו', 'כי', 'כל', 'לא', 'לו', 'מה', 'מן', 'על', 'עם', 'של',
]);

function canonicalSourceKey(url: string, id: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith('sefaria.org')) {
      const normalized = decodeURIComponent(parsed.pathname)
        .replace(/^\/+/, '')
        .replace(/[_:]/g, '.')
        .replace(/\.+/g, '.')
        .toLowerCase();
      const dafKey = normalized.replace(/(\.\d+[ab])\.\d+$/, '$1');
      return `sefaria:${dafKey}`;
    }
    return `${parsed.hostname}${parsed.pathname}${parsed.search}`
      .toLowerCase()
      .replace(/\/$/, '');
  } catch {
    return id;
  }
}

function contextWords(context?: string): string[] {
  return [...new Set(
    (context?.match(/[\u0590-\u05ff]{3,}/g) || [])
      .map((word) => word.replace(/^[והבכלמש]+/, ''))
      .filter((word) => word.length > 2 && !HEBREW_STOP_WORDS.has(word)),
  )];
}

function searchable(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0591-\u05c7]/g, '')
    .toLowerCase();
}

function relevanceScore(citation: PilotCitation, context?: string): number {
  const text = searchable(citation.text || '');
  return contextWords(context).reduce(
    (score, word) => score + (text.includes(searchable(word)) ? word.length : 0),
    0,
  );
}

function compactExcerpt(text: string, context?: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= 220) return clean;

  const sentences = clean
    .split(/(?<=[.!?׃])\s+|(?<=\.)\s+(?=[\u0590-\u05ff])/)
    .filter(Boolean);
  const words = contextWords(context);
  let best = sentences[0] || clean;
  let bestScore = -1;
  for (let index = 0; index < sentences.length; index += 1) {
    const candidate = [sentences[index], sentences[index + 1]]
      .filter(Boolean)
      .join(' ');
    const searchableCandidate = searchable(candidate);
    const score = words.reduce(
      (total, word) =>
        total + (searchableCandidate.includes(searchable(word)) ? word.length : 0),
      0,
    );
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  if (best.length <= 220) return best;
  const shortened = best.slice(0, 216).replace(/\s+\S*$/, '').trim();
  return `${shortened}…`;
}

function conciseLabel(label: string): string {
  return label
    .split(/\s+—\s+[A-Za-z]/)[0]!
    .replace(/\s+\/\s+\d+\s*$/, '')
    .trim();
}

export function CitationPreviewView({
  citations,
  explanations,
  variant = 'atlas',
}: {
  citations: PilotCitation[];
  explanations?: Record<string, string>;
  variant?: 'atlas' | 'knowledge';
}) {
  const className = variant === 'knowledge' ? 'kg-source' : 'atlas-sources-item';
  const linkLabel = 'עיון במקור ↗';
  const groups = new Map<string, PilotCitation[]>();
  for (const citation of citations) {
    const key = canonicalSourceKey(citation.url, citation.id);
    const group = groups.get(key) || [];
    group.push(citation);
    groups.set(key, group);
  }

  if (!groups.size) {
    return <p className="atlas-muted">לא נמצאו מקורות להצגה.</p>;
  }

  return (
    <div className={variant === 'knowledge' ? undefined : 'atlas-sources'}>
      {[...groups.entries()].map(([key, group]) => {
        const ranked = [...group].sort((a, b) => {
          const aContext = explanations?.[a.id];
          const bContext = explanations?.[b.id];
          return relevanceScore(b, bContext) - relevanceScore(a, aContext);
        });
        const c = ranked[0]!;
        const explain =
          explanations?.[c.id] ||
          group.map((item) => explanations?.[item.id]).find(Boolean);
        const excerpt = c.text ? compactExcerpt(c.text, explain) : '';
        const editorial = c.textKind === 'editorial';
        return (
          <details key={key} className={className}>
            <summary>{conciseLabel(c.label)}</summary>
            {explain ? <p className="citation-context">{explain}</p> : null}
            {!excerpt ? (
              <p>לא הוזן עדיין קטע מדויק מאומת; אפשר לעיין במקור המלא בקישור.</p>
            ) : editorial ? (
              <p className="citation-note">הערת תיעוד: {excerpt}</p>
            ) : (
              <>
                <blockquote className="citation-excerpt">״{excerpt}״</blockquote>
                {c.support ? <small className="citation-support">בקטע נזכר: {c.support}</small> : null}
              </>
            )}
            {variant === 'knowledge' && (c.edition || c.license) ? (
              <small>
                {[c.edition, c.license].filter(Boolean).join(' · ')}
              </small>
            ) : null}
            {c.kind ? (
              <small className="citation-kind">
                {c.kind === 'secondary' || c.kind === 'inscription'
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
