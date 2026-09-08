import { CatalogMetadataRetrievalAdapter } from "@/lib/ai/retrieval/catalog";
import { OpenWebDiscoveryAdapter } from "@/lib/ai/retrieval/open-web";
import { SefariaRetrievalAdapter } from "@/lib/ai/retrieval/sefaria";
import type { ResearchRetrievalAdapter } from "@/lib/ai/retrieval/types";
import { NO_RETRIEVAL_PATH_MESSAGE } from "@/lib/ai/retrieval/types";

const adapters: Record<string, ResearchRetrievalAdapter> = {
  catalog_metadata: new CatalogMetadataRetrievalAdapter(),
  sefaria: new SefariaRetrievalAdapter(),
  open_web_discovery: new OpenWebDiscoveryAdapter(),
};

export function getRetrievalAdapter(
  code: string,
): ResearchRetrievalAdapter | null {
  return adapters[code] ?? null;
}

export function listRetrievalAdapterCodes(): string[] {
  return Object.keys(adapters);
}

export { NO_RETRIEVAL_PATH_MESSAGE };
