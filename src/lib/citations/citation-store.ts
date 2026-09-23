export type PilotCitation = {
  id: string;
  label: string;
  url: string;
  text?: string;
  textKind?: string;
  support?: string;
  edition?: string;
  license?: string;
  kind?: string;
};

type CitationsFile = { citations: PilotCitation[] };

let cache: Map<string, PilotCitation> | null = null;
let loadPromise: Promise<Map<string, PilotCitation>> | null = null;

/** Preload citations synchronously (knowledge graph already has pilot.json). */
export function injectPilotCitations(citations: PilotCitation[]) {
  cache = new Map(citations.map((c) => [c.id, c]));
  loadPromise = Promise.resolve(cache);
}

function indexCitations(citations: PilotCitation[]) {
  cache = new Map(citations.map((c) => [c.id, c]));
  return cache;
}

/** Fetch the citation corpus once; reused for every source panel. */
export async function ensurePilotCitations(): Promise<Map<string, PilotCitation>> {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = fetch('/data/pilot-citations.json')
      .then((res) => {
        if (!res.ok) throw new Error(`citations fetch failed: ${res.status}`);
        return res.json() as Promise<CitationsFile>;
      })
      .then((data) => indexCitations(data.citations || []))
      .catch((err) => {
        loadPromise = null;
        throw err;
      });
  }
  return loadPromise;
}

export async function getPilotCitationsByIds(ids: string[]): Promise<PilotCitation[]> {
  const map = await ensurePilotCitations();
  const out: PilotCitation[] = [];
  for (const id of [...new Set(ids)]) {
    const c = map.get(id);
    if (c) out.push(c);
  }
  return out;
}

/** Test helper — reset between unit tests. */
export function resetPilotCitationCache() {
  cache = null;
  loadPromise = null;
}
