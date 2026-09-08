import type {
  ResearchRetrievalAdapter,
  RetrievalHit,
  RetrievalQuery,
} from "@/lib/ai/retrieval/types";
import { NO_RETRIEVAL_PATH_MESSAGE } from "@/lib/ai/retrieval/types";

/** Catalog metadata only — no body text. */
export class CatalogMetadataRetrievalAdapter implements ResearchRetrievalAdapter {
  readonly meta = {
    code: "catalog_metadata",
    retrievalMethod: "catalog_read",
    citationResolutionCapability: "metadata_match" as const,
    trustClass: "catalog_metadata" as const,
    isDiscoveryOnly: false,
    evidenceEligible: false,
    mayRetainFullText: false,
    maxExcerptChars: 0,
    timeoutMs: 5_000,
  };

  async retrieve(query: RetrievalQuery): Promise<RetrievalHit[]> {
    return [
      {
        adapterCode: this.meta.code,
        providerRef: null,
        providerUrl: null,
        suggestedCanonicalCitationHe: query.canonicalWorkHint ?? null,
        excerpt: null,
        untrusted: true,
        isDiscoveryOnly: false,
        evidenceEligible: false,
        warnings: query.canonicalWorkHint
          ? []
          : [NO_RETRIEVAL_PATH_MESSAGE],
      },
    ];
  }
}
