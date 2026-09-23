import {createRequire} from 'node:module';
import {expect, it} from 'vitest';

const require = createRequire(import.meta.url);
const rules = require('../../scripts/map-research/geo-citation-rules.cjs') as {
  classifyEvidence: (input: {text: string; sageName?: string; place: {name: string} | string; editorial?: boolean}) => string;
  sageMentioned: (text: string, name: string) => boolean;
  placeMentioned: (text: string, place: {name: string} | string) => boolean;
  isDisplayable: (classification: string) => boolean;
  nameCore: (name: string) => string;
};

const avot13 = 'אנטיגנוס איש סוכו קבל משמעון הצדיק. הוא היה אומר, אל תהיו כעבדים המשמשין את הרב על מנת לקבל פרס.';
const avot18 = 'יהודה בן טבאי ושמעון בן שטח קבלו מהם. יהודה בן טבאי אומר, אל תעש עצמך כעורכי הדינין.';
const avot14 = 'יוסי בן יועזר איש צרדה ויוסי בן יוחנן איש ירושלים קבלו מהם.';
const avot68 = 'רבי שמעון בן יהודה משום רבי שמעון בן יוחאי אומר, הנוי והכח והעשר והכבוד והחכמה והזקנה והשיבה והבנים, נאה לצדיקים ונאה לעולם, שנאמר (ישעיהו כד) והיה לבנה ובושה החמה כי מלך ה׳ צבאות בהר ציון ובירושלים.';

it('does not treat a first-name collision as the sage', () => {
  expect(rules.sageMentioned(avot13, 'שמעון בן שטח')).toBe(false);
  expect(rules.sageMentioned(avot13, 'שמעון הצדיק')).toBe(true);
  expect(rules.classifyEvidence({text: avot13, sageName: 'שמעון בן שטח', place: {name: 'ירושלים'}})).toBe('IRRELEVANT');
});

it('does not treat a patronymic collision as Yehuda ben Tabbai', () => {
  expect(rules.sageMentioned(avot68, 'יהודה בן טבאי')).toBe(false);
  expect(rules.classifyEvidence({text: avot68, sageName: 'יהודה בן טבאי', place: {name: 'ירושלים'}})).not.toBe('VALID_DIRECT');
});

it('does not let a neighboring mishnah supply the missing place', () => {
  expect(rules.classifyEvidence({text: avot18, sageName: 'יהודה בן טבאי', place: {name: 'ירושלים'}})).toBe('WRONG_CLAIM');
  expect(rules.classifyEvidence({text: avot14, sageName: 'יהודה בן טבאי', place: {name: 'ירושלים'}})).toBe('WRONG_PERSON');
});

it('does not treat a place name inside a quoted biblical verse as location evidence', () => {
  expect(rules.placeMentioned(avot68, {name: 'ירושלים'})).toBe(false);
  expect(rules.classifyEvidence({text: avot68, sageName: 'רבי שמעון בן יהודה', place: {name: 'ירושלים'}})).toBe('WRONG_CLAIM');
});

it('allows the same Sefaria passage to support one claim and fail another', () => {
  const socho = rules.classifyEvidence({text: avot13, sageName: 'אנטיגנוס איש סוכו', place: {name: 'סוכו'}});
  const jerusalem = rules.classifyEvidence({text: avot13, sageName: 'שמעון בן שטח', place: {name: 'ירושלים'}});
  expect(socho).toBe('VALID_DIRECT');
  expect(jerusalem).not.toBe('VALID_DIRECT');
  expect(rules.isDisplayable(socho)).toBe(true);
  expect(rules.isDisplayable(jerusalem)).toBe(false);
});

it('does not invent a replacement source when the cited unit fails', () => {
  const cited = rules.classifyEvidence({text: avot18, sageName: 'שמעון בן שטח', place: {name: 'ירושלים'}});
  expect(cited).toBe('WRONG_CLAIM');
  expect(rules.isDisplayable(cited)).toBe(false);
});

it('does not validate Avot 1:3 as Jerusalem evidence', () => {
  expect(rules.classifyEvidence({text: avot13, sageName: 'אנטיגנוס איש סוכו', place: {name: 'ירושלים'}})).toBe('WRONG_CLAIM');
  expect(rules.classifyEvidence({text: avot13, sageName: 'שמעון הצדיק', place: {name: 'ירושלים'}})).toBe('WRONG_CLAIM');
});

it('does not validate Avot 6:8 as Yehuda ben Tabbai in Jerusalem', () => {
  expect(rules.classifyEvidence({text: avot68, sageName: 'יהודה בן טבאי', place: {name: 'ירושלים'}})).toBe('IRRELEVANT');
});

it('ignores display suffixes such as אבות א:טז when matching a sage', () => {
  expect(rules.nameCore('רבן גמליאל — אבות א:טז')).toBe('רבן גמליאל');
  expect(rules.sageMentioned(avot68, 'רבן גמליאל — אבות א:טז')).toBe(false);
});

it('treats a lone common given name plus a place as ambiguous, not identifying', () => {
  const baraita = 'אחר רבי יוסי לציפורי אחר רבי עקיבא לבני ברק';
  expect(rules.classifyEvidence({
    text: baraita,
    sageName: 'רבי יוסי — אבות ד:ו',
    place: {name: 'ציפורי'},
  })).toBe('AMBIGUOUS');
  expect(rules.isDisplayable('AMBIGUOUS')).toBe(false);
});
