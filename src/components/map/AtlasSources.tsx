import {CitationPreview} from '@/components/citations/CitationPreview';

/** Map atlas wrapper — same expand-in-app / open-external pattern as the Rabbi Tree. */
export function AtlasSources({ids, explanations}:{ids:string[]; explanations?:Record<string,string>}){
  return explanations
    ? <CitationPreview ids={ids} explanations={explanations} variant="atlas"/>
    : <CitationPreview ids={ids} variant="atlas"/>;
}