import {atlas, emptyTime, matchesTime, type TimeFilter} from '@/domain/toladot-map';

export type CentralityTier = 'major' | 'important' | 'secondary' | 'minor';

export type PlaceCentrality = {
  score: number;
  tier: CentralityTier;
  calculatedScore: number;
  editorialOverride: number | null;
  reasons: string[];
};

/** Manual editorial overrides (0–100). Prefer historical centrality, not modern size. */
const EDITORIAL_OVERRIDE: Record<string, number> = {
  jerusalem: 98,
  yavne: 82,
  lod: 78,
  tiberias: 80,
  zippori: 76,
  'bet-shearim': 68,
  'bnei-brak': 70,
  sikhnin: 55,
  rome: 48,
  pekiin: 42,
  'brur-hayil': 50,
  arav: 52,
  usha: 60,
  alexandria: 45,
  arbel: 40,
  emmaus: 38,
  beitar: 58,
  modiim: 36,
  gamzu: 30,
};

const importanceWeight = {central: 12, meaningful: 7, minor: 3} as const;

export function calculatePlaceCentrality(placeId: string, time: TimeFilter = emptyTime): PlaceCentrality {
  const place = atlas.places.find((p) => p.id === placeId || p.slug === placeId);
  const slug = place?.slug || placeId;
  const reasons: string[] = [];
  let score = 0;

  const activities = atlas.personPlaces.filter((r) => r.placeId === (place?.id || placeId) && matchesTime(r, time));
  const sages = new Set(activities.map((a) => a.personId));
  score += Math.min(40, sages.size * 6);
  if (sages.size) reasons.push(`${sages.size} חכמים מתועדים`);

  for (const a of activities) {
    const w = importanceWeight[a.importance as keyof typeof importanceWeight] ?? 4;
    score += Math.min(w, 12);
  }
  const centrals = activities.filter((a) => a.importance === 'central').length;
  if (centrals) reasons.push(`${centrals} קשרים מרכזיים`);

  const primarySources = new Set(activities.flatMap((a) => a.sourceIds || []));
  // Cap source contribution so duplicate citations cannot dominate.
  const sourceBoost = Math.min(18, primarySources.size * 2.5);
  score += sourceBoost;
  if (primarySources.size) reasons.push(`${primarySources.size} מקורות מצורפים`);

  const events = atlas.events.filter((e) => e.placeId === (place?.id || placeId) && matchesTime(e, time));
  score += Math.min(15, events.length * 6);
  if (events.length) reasons.push(`${events.length} אירועים`);

  const institutions = atlas.institutions.filter((i) => i.placeId === (place?.id || placeId) && matchesTime(i, time));
  score += Math.min(20, institutions.length * 10);
  if (institutions.length) reasons.push(`${institutions.length} מוסדות`);

  const calculatedScore = Math.max(0, Math.min(100, Math.round(score)));
  const editorialOverride = EDITORIAL_OVERRIDE[slug] ?? null;
  const final = editorialOverride ?? calculatedScore;
  if (editorialOverride != null) reasons.push('עריכה ידנית של מרכזיות');

  const tier: CentralityTier =
    final >= 85 ? 'major' : final >= 65 ? 'important' : final >= 40 ? 'secondary' : 'minor';

  return {score: final, tier, calculatedScore, editorialOverride, reasons};
}

export function pinSizeForTier(tier: CentralityTier, focusBoost = false): number {
  const base = {major: 34, important: 26, secondary: 18, minor: 12}[tier];
  return focusBoost ? Math.max(base, 22) : base;
}

/** Minimum zoom to show a place pin by historical centrality. */
export function pinMinZoom(tier: CentralityTier): number {
  return {major: 4.6, important: 6.0, secondary: 7.2, minor: 8.6}[tier];
}

/** Labels appear slightly later than pins of the same tier. */
export function labelMinZoom(tier: CentralityTier): number {
  return {major: 5.0, important: 6.5, secondary: 7.6, minor: 9.0}[tier];
}

/**
 * Isolated places (no nearby competitors on screen) may appear earlier,
 * still ordered by centrality — never earlier than a soft floor.
 */
export function effectivePinMinZoom(tier: CentralityTier, isolated: boolean): number {
  const base = pinMinZoom(tier);
  if (!isolated) return base;
  return Math.max(3.8, base - 2.4);
}

export function effectiveLabelMinZoom(tier: CentralityTier, isolated: boolean): number {
  const base = labelMinZoom(tier);
  if (!isolated) return base;
  return Math.max(4.2, base - 2.2);
}
