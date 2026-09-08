/** In-process caches for public read correctness strategy (no Next dependency). */

const payloadCache = new Map<string, { payload: unknown; expires: number }>();
const activeResolutionCache = new Map<string, { snapshotId: string; expires: number }>();

export const PAYLOAD_TTL_MS = 1000 * 60 * 30;
export const ACTIVE_TTL_MS = 15_000;

export function getCachedPayload(snapshotId: string): unknown | null {
  const hit = payloadCache.get(snapshotId);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    payloadCache.delete(snapshotId);
    return null;
  }
  return hit.payload;
}

export function setCachedPayload(snapshotId: string, payload: unknown) {
  payloadCache.set(snapshotId, { payload, expires: Date.now() + PAYLOAD_TTL_MS });
}

export function getCachedActiveResolution(key: string): string | null {
  const cached = activeResolutionCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expires) {
    activeResolutionCache.delete(key);
    return null;
  }
  return cached.snapshotId;
}

export function setCachedActiveResolution(key: string, snapshotId: string) {
  activeResolutionCache.set(key, {
    snapshotId,
    expires: Date.now() + ACTIVE_TTL_MS,
  });
}

export function clearPublicReadCachesForTests() {
  payloadCache.clear();
  activeResolutionCache.clear();
}
