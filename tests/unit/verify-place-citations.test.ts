import {createRequire} from 'node:module';
import {expect, it} from 'vitest';

const require = createRequire(import.meta.url);
const verifier = require('../../scripts/map-research/verify-place-citations.cjs') as {
  unitsToInspect: (cited: string, data: {ref?: string; he?: unknown}) => {ref: string; text: string}[];
  verifyClaimSource: (
    claim: {sageName: string; place: {name: string}},
    citation: {text?: string; url?: string; textKind?: string},
  ) => Promise<{classification: string; ref: string; redirected: boolean}>;
};

const avot13 = 'אנטיגנוס איש סוכו קבל משמעון הצדיק. הוא היה אומר, אל תהיו כעבדים המשמשין את הרב על מנת לקבל פרס.';
const avot14 = 'יוסי בן יועזר איש צרדה ויוסי בן יוחנן איש ירושלים קבלו מהם.';
const avot18 = 'יהודה בן טבאי ושמעון בן שטח קבלו מהם.';

it('does not inspect neighboring mishnayot when the cited unit is specific', () => {
  const data = {
    ref: 'Pirkei Avot 1',
    he: [avot13, avot14, 'placeholder', 'placeholder', 'placeholder', 'placeholder', 'placeholder', avot18],
  };
  const units = verifier.unitsToInspect('Pirkei Avot 1:8', data);
  expect(units).toHaveLength(1);
  expect(units[0].ref).toBe('Pirkei Avot 1:8');
  expect(units[0].text).toBe(avot18);
  expect(units.some((unit) => unit.text.includes('ירושלים'))).toBe(false);
});

it('does not retarget a failed citation to a better neighboring source', async () => {
  const result = await verifier.verifyClaimSource(
    {sageName: 'שמעון בן שטח', place: {name: 'ירושלים'}},
    {
      textKind: 'editorial',
      url: 'https://www.sefaria.org/Pirkei_Avot.1.3',
      text: avot13,
    },
  );
  expect(result.redirected).toBe(false);
  expect(result.ref).toBe('https://www.sefaria.org/Pirkei_Avot.1.3');
  expect(result.classification).not.toBe('VALID_DIRECT');
  expect(result.classification).not.toBe('VALID_INDIRECT');
});
