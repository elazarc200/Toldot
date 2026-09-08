
/**
 * Research Retrieval adapter boundary.
 * Catalog ≠ Retrieval. Provider refs are resolution metadata only.
 */

export type RetrievalTrustClass =
  | "catalog_metadata"
  | "structured_corpus"
  | "discovery_web"
  | "licensed_local";

export type CitationResolutionCapability =
  | "none"
  | "metadata_match"
  | "location_confirm";

export type RetrievalQuery = {
  query: string;
  /** Toladot canonical work hint, not provider id */
  canonicalWorkHint?: string;
  maxExcerptChars?: number;
};

export type RetrievalHit = {
  adapterCode: string;
  /** Provider-specific ref — NOT canonical citation identity */
  providerRef: string | null;
  providerUrl: string | null;
  /** Suggested Toladot display citation (Hebrew), independent of provider */
  suggestedCanonicalCitationHe: string | null;
  excerpt: string | null;
  untrusted: true;
  isDiscoveryOnly: boolean;
  evidenceEligible: boolean;
  warnings: string[];
};

export type RetrievalAdapterMeta = {
  code: string;
  retrievalMethod: string;
  citationResolutionCapability: CitationResolutionCapability;
  trustClass: RetrievalTrustClass;
  isDiscoveryOnly: boolean;
  evidenceEligible: boolean;
  mayRetainFullText: boolean;
  maxExcerptChars: number;
  timeoutMs: number;
};

export interface ResearchRetrievalAdapter {
  readonly meta: RetrievalAdapterMeta;
  retrieve(query: RetrievalQuery): Promise<RetrievalHit[]>;
}

export const NO_RETRIEVAL_PATH_MESSAGE =
  "Source is catalogued but no research retrieval path is currently available.";
