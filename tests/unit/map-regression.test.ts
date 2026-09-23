import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import pilot from '@/components/knowledge/pilot.json';
import pilotMap from '@/components/knowledge/pilot-map.json';
import { calculatePlaceCentrality, effectivePinMinZoom } from '@/domain/map-centrality';
import { territoryMatchesTime } from '@/domain/historical-territories';
import { emptyTime, placeSummary, regimeAt } from '@/domain/toladot-map';

describe('map data parity after pilot-map split', () => {
  it('keeps full geography payload required for map UX', () => {
    expect(pilotMap.geography.places).toHaveLength(pilot.geography.places.length);
    expect(pilotMap.geography.personPlaces).toHaveLength(pilot.geography.personPlaces.length);
    expect(pilotMap.geography.burials).toHaveLength(pilot.geography.burials.length);
    expect(pilotMap.geography.roads).toHaveLength(pilot.geography.roads.length);
    const fullKeys = Object.keys(pilot.geography.places[0]!).sort().join(',');
    const mapKeys = Object.keys(pilotMap.geography.places[0]!).sort().join(',');
    expect(mapKeys).toBe(fullKeys);
  });

  it('keeps place summaries and overview text for hover cards', () => {
    const jerusalem = pilotMap.geography.places.find((p) => p.slug === 'jerusalem')!;
    expect(placeSummary(jerusalem).length).toBeGreaterThan(20);
    expect(jerusalem.overview.length).toBeGreaterThan(20);
  });

  it('does not embed citations in the map bundle', () => {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'src/components/knowledge/pilot-map.json'),
      'utf8',
    );
    expect(raw.includes('"citations"')).toBe(false);
    expect(pilot.citations.length).toBeGreaterThan(100);
  });
});

describe('map interaction helpers', () => {
  it('exposes centrality tiers and zoom gates for major places', () => {
    const jerusalem = pilotMap.geography.places.find((p) => p.slug === 'jerusalem')!;
    const c = calculatePlaceCentrality(jerusalem.id, emptyTime);
    expect(c.tier).toBe('major');
    expect(effectivePinMinZoom(c.tier, true)).toBeLessThanOrEqual(7);
  });

  it('matches historical territories for pilot periods', () => {
    const geo = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'public/maps/historical-territories.geojson'), 'utf8'),
    );
    const hasmonean = geo.features.filter((f: { properties: { periodIds?: string[] } }) =>
      f.properties.periodIds?.includes('zug3'),
    );
    expect(hasmonean.length).toBeGreaterThan(0);
    expect(
      hasmonean.some((f: { properties: Record<string, unknown> }) =>
        territoryMatchesTime(f.properties as never, { ...emptyTime, period: 'zug3' }),
      ),
    ).toBe(true);
  });

  it('provides regime context copy for period filters', () => {
    expect(regimeAt({ ...emptyTime, period: 'zug3' })).toMatch(/חשמונ|הלניסט/);
    expect(regimeAt({ ...emptyTime, period: 'early' })).toMatch(/רומ/);
  });
});
