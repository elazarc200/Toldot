import {CitationPreview} from '@/components/citations/CitationPreview';

/** Map atlas wrapper — same expand-in-app / open-external pattern as the Rabbi Tree. */
export function AtlasSources({
  ids,
  explanations,
  context,
}: {
  ids: string[];
  explanations?: Record<string, string>;
  context?: string;
}) {
  const contextualExplanations = context
    ? Object.fromEntries(ids.map((id) => [id, context]))
    : explanations;
  return contextualExplanations
    ? <CitationPreview ids={ids} explanations={contextualExplanations} variant="atlas"/>
    : <CitationPreview ids={ids} variant="atlas"/>;
}