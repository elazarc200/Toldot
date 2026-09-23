'use client';

import { useEffect, useState } from 'react';
import {
  getPilotCitationsByIds,
  type PilotCitation,
} from '@/lib/citations/citation-store';
import { CitationPreviewView } from './CitationPreviewView';

/** Shared Toladot citation preview — loads citation text lazily when needed. */
export function CitationPreview({
  ids,
  explanations,
  variant = 'atlas',
}: {
  ids: string[];
  explanations?: Record<string, string>;
  variant?: 'atlas' | 'knowledge';
}) {
  const [citations, setCitations] = useState<PilotCitation[] | null>(null);
  const [error, setError] = useState(false);
  const key = [...new Set(ids)].sort().join(',');

  useEffect(() => {
    let cancelled = false;
    setCitations(null);
    setError(false);
    if (!ids.length) {
      setCitations([]);
      return;
    }
    getPilotCitationsByIds(ids)
      .then((rows) => {
        if (!cancelled) setCitations(rows);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [key, ids]);

  if (error) {
    return <p className="atlas-muted">לא ניתן לטעון את המקורות כעת.</p>;
  }
  if (!citations) {
    return <p className="atlas-muted" role="status">טוען מקורות…</p>;
  }
  return explanations ? (
    <CitationPreviewView citations={citations} explanations={explanations} variant={variant} />
  ) : (
    <CitationPreviewView citations={citations} variant={variant} />
  );
}
