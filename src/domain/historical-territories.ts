import type {TimeFilter} from '@/domain/toladot-map';
import {periods, validTime} from '@/domain/toladot-map';

export type TerritoryProps = {
  nameHe: string;
  entityType: string;
  politicalController: string | null;
  parentEntity: string | null;
  startYear: number;
  endYear: number;
  periodIds?: string[];
  geometryConfidence: 'established' | 'approximate' | 'uncertain';
  sourceIds: string[];
  sourceNotes?: string[];
  notes?: string;
};

export function activeYearFromTime(time: TimeFilter): number | null {
  if (!validTime(time)) return null;
  if (time.from && time.to) return Math.round((Number(time.from) + Number(time.to)) / 2);
  if (time.from) return Number(time.from);
  if (time.to) return Number(time.to);
  if (time.period) {
    const order = periods.find((p) => p.id === time.period)?.order;
    // Rough midpoints for pilot period bands (schematic).
    const mid: Record<number, number> = {
      0: -350, 1: -280, 2: -180, 3: -120, 4: -80, 5: -40, 6: -10,
      7: 60, 8: 90, 9: 120, 10: 150, 11: 200, 12: 230, 13: 280,
    };
    if (order != null && mid[order] != null) return mid[order]!;
  }
  return null;
}

export function territoryMatchesTime(
  props: TerritoryProps,
  time: TimeFilter,
): boolean {
  if (!validTime(time)) return false;
  const year = activeYearFromTime(time);
  if (year != null) return year >= props.startYear && year <= props.endYear;
  if (time.period && props.periodIds?.length) return props.periodIds.includes(time.period);
  // No time filter: show nothing political (avoid one static forever-map).
  return false;
}

export function territoryLineDash(confidence: TerritoryProps['geometryConfidence']): number[] {
  if (confidence === 'established') return [];
  if (confidence === 'approximate') return [2, 2];
  return [1, 2.5];
}
