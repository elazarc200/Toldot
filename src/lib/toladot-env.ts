/**
 * Toladot deployment environment identity.
 * local  — development / deterministic CI
 * pilot  — internet-accessible editorial pilot (NOT public launch)
 * production — future public production (deferred; supported for forward-compat)
 */
export type ToladotEnv = "local" | "pilot" | "production";

export function getToladotEnv(): ToladotEnv {
  const raw = (process.env.TOLADOT_ENV || process.env.NEXT_PUBLIC_TOLADOT_ENV || "local")
    .trim()
    .toLowerCase();
  if (raw === "pilot" || raw === "production" || raw === "local") {
    return raw;
  }
  return "local";
}

export function isPilotEnv(env: ToladotEnv = getToladotEnv()): boolean {
  return env === "pilot";
}

export function isProductionEnv(env: ToladotEnv = getToladotEnv()): boolean {
  return env === "production";
}

/** Pilot and non-production must not be search-indexed. */
export function shouldDisallowSearchIndexing(
  env: ToladotEnv = getToladotEnv(),
): boolean {
  return env !== "production";
}

export function pilotBannerHe(env: ToladotEnv = getToladotEnv()): string | null {
  if (env === "pilot") {
    return "סביבת פיילוט עריכתית — אינה השקה ציבורית רשמית";
  }
  if (env === "local") {
    return "סביבת פיתוח מקומית";
  }
  return null;
}
