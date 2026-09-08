/**
 * Localization-ready message helper (Hebrew only in Phase 0).
 * Future locales can swap catalogs without redesigning call sites.
 */
const he = {
  "app.name": "תולדות",
  "app.phase0.tagline": "תשתית טכנית — עדיין ללא אנציקלופדיה",
  "auth.login": "התחברות",
  "admin.title": "לוח עריכה",
  "error.unauthenticated": "נדרשת התחברות",
  "error.forbidden": "אין הרשאה לבצע פעולה זו",
} as const;

export type MessageKey = keyof typeof he;

export function t(key: MessageKey): string {
  return he[key];
}
