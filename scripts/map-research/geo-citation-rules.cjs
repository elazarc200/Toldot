/**
 * Conservative geography-citation rules.
 *
 * A source supports a specific claim. Token overlap with a person or a place is not evidence.
 * This module is the single matcher used by the verifier, the repair pass, and regression tests.
 */
const NIKUD = /[\u0591-\u05C7]/g;
const TITLES = /^(רבי|רבן|רב|ר|רבנו|אבא|אבה|מר|בן|בר|איש|של|ה)$/;
const DISPLAY_SUFFIX = /\s*[—–].*$/;
const AVOT_REF_TOKEN = /^(אבות|עדויות|כלים)$/;
const VARIANTS = new Map([['אליעזר', 'אלעזר'], ['יהושוע', 'יהושע']]);

function clean(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u05BE\u05C0\u05C3\u05C6–—-]/g, ' ')
    .replace(NIKUD, '')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[׳'`״"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function readable(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(NIKUD, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stem(word) {
  const mapped = VARIANTS.get(word);
  if (mapped) return stem(mapped);
  return word.replace(/[אהוי]+$/, '');
}

function tokens(value) {
  return clean(value)
    .replace(/[^\u0590-\u05FFa-zA-Z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function searchable(text) {
  return ` ${tokens(text).map((word) => VARIANTS.get(word) || word).join(' ')} `;
}

/** Strip biblical citations so a verse mentioning a city is not place evidence. */
function withoutQuotedScripture(text) {
  return String(text || '')
    .replace(/שנאמר\s*(?:\([^)]*\))?[^.]{0,240}/g, ' ')
    .replace(/שנ['׳]\s*(?:\([^)]*\))?[^.]{0,240}/g, ' ')
    .replace(/(?:ו?כתיב|דכתיב)\s*(?:\([^)]*\))?[^.]{0,240}/g, ' ');
}

function nameCore(name) {
  return String(name || '').replace(DISPLAY_SUFFIX, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function distinctiveWords(name) {
  return tokens(nameCore(name)).filter((word) => (
    word.length > 1
    && !TITLES.test(word)
    && !AVOT_REF_TOKEN.test(word)
    && !/^\d+$/.test(word)
  ));
}

function distinctiveTokens(name) {
  return distinctiveWords(name).map(stem);
}

/**
 * Identifying mention of a sage: every distinctive token, in order, with titles/בן allowed between.
 * "שמעון בן שטח" does not match "שמעון הצדיק".
 * "יהודה בן טבאי" does not match "רבי שמעון בן יהודה".
 */
function sageMention(name) {
  const words = distinctiveTokens(name);
  if (!words.length) return {words, pattern: null};
  const between = '(?:\\s+(?:רבי|רבן|רב|ר|בן|בר|איש)\\s+|\\s+)';
  const parts = words.map((word, index) => `${index === 0 ? '[בלמוהשכד]{0,2}' : ''}${escapeRe(word)}[אהויםן]{0,2}`);
  return {words, pattern: new RegExp(`(^|\\s)${parts.join(between)}(\\s|$)`, 'u')};
}

function phraseMatcher(phrase) {
  const words = tokens(phrase).map(stem).filter(Boolean);
  if (!words.length) return null;
  const parts = words.map((word, index) => `${index === 0 ? '[בלמוהשכד]{0,2}' : '[בלמוהשכד]{0,1}'}${escapeRe(word)}[אהויםן]{0,2}`);
  return new RegExp(`(^|\\s)${parts.join('\\s+')}(\\s|$)`, 'u');
}

const PLACE_ALIASES = {
  'ירושלים': ['ירושלים', 'ירושלם', 'לשכת הגזית', 'הר הבית', 'בית המקדש', 'עיר הקודש'],
  'בית שערים': ['בית שערים', 'בית שריי'],
  'ציפורי': ['ציפורי', 'צפורי', 'ציפורין'],
  'טבריה': ['טבריה', 'טיבריה', 'טברייה'],
  'קיסרין': ['קיסרין', 'קיסריה', 'קסרין'],
  'אמאוס': ['אמאוס', 'אמאום', 'עמאוס'],
  'נהרדעא': ['נהרדעא', 'נהרדע'],
  'מודיעים': ['מודיעים', 'מודיעית', 'מודעית'],
  'אלכסנדריה': ['אלכסנדריה', 'אלכסנדריא'],
  'רומי': ['רומי', 'רומא'],
  'עכברא': ['עכברא', 'עכבריא'],
  'כפר חנניה': ['כפר חנניה', 'כפר חנניא'],
  'צידן': ['צידן', 'צידון'],
  'צידון': ['צידון', 'צידן'],
  'בבל': ['בבל'],
  'אושא': ['אושא'],
  'סוכו': ['סוכו', 'סוכו'],
  'צרדה': ['צרדה', 'צרידה'],
};
const CONFUSABLE = {'רומי': /(^|\s)מרומ(ים|ה|ות|יא)(\s|$)/u};
const SHORT_PLACE = new Set(['לוד', 'אושא', 'ערב', 'בבל', 'רומי', 'רומא']);

function placeNames(place) {
  if (!place) return [];
  if (typeof place === 'string') return [place];
  const names = [place.name, ...(place.locations || []).map((l) => l.label)].filter(Boolean);
  const aliases = PLACE_ALIASES[place.name] || [];
  return [...new Set([...names, ...aliases])];
}

function placeMentioned(text, place) {
  const hay = searchable(withoutQuotedScripture(text));
  const veto = CONFUSABLE[(place && place.name) || place] || null;
  const pool = veto ? hay.replace(new RegExp(veto.source, 'gu'), ' ') : hay;
  return placeNames(place).some((name) => {
    const test = phraseMatcher(name);
    if (!test) return false;
    if (SHORT_PLACE.has(name) && !test.test(pool)) return false;
    return test.test(pool);
  });
}

function sageMentioned(text, name) {
  const matcher = sageMention(name);
  if (!matcher.pattern) return false;
  return matcher.pattern.test(searchable(text));
}

const DISPLAYABLE = new Set(['VALID_DIRECT', 'VALID_INDIRECT']);

/**
 * Classify whether `text` supports a sage-at-place (or place-only) claim.
 * Never infers a place from a neighboring unit or a quoted verse.
 */
const COMMON_GIVEN = new Set(['יוסי', 'יהודה', 'שמעון', 'אלעזר', 'אליעזר', 'יוחנן', 'יהושע', 'חנינא', 'חייא']);

function classifyEvidence({text, sageName, place, editorial}) {
  const body = readable(text);
  if (editorial && body) {
    const sageOk = sageName ? sageMentioned(body, sageName) : true;
    const placeOk = placeMentioned(body, place);
    if (sageOk && placeOk) return 'VALID_INDIRECT';
    return 'UNVERIFIED';
  }
  if (!body) return 'UNVERIFIED';
  const sageOk = sageName ? sageMentioned(body, sageName) : true;
  const placeOk = placeMentioned(body, place);
  const given = distinctiveWords(sageName || '');
  if (sageName && sageOk && placeOk && given.length === 1 && COMMON_GIVEN.has(given[0])) {
    return 'AMBIGUOUS';
  }
  if (sageName && sageOk && placeOk) return 'VALID_DIRECT';
  if (!sageName && placeOk) return 'VALID_DIRECT';
  if (sageName && sageOk && !placeOk) return 'WRONG_CLAIM';
  if (sageName && !sageOk && placeOk) return 'WRONG_PERSON';
  if (sageName && !sageOk && !placeOk) return 'IRRELEVANT';
  return 'IRRELEVANT';
}

function isDisplayable(classification) {
  return DISPLAYABLE.has(classification);
}

/**
 * A cited Sefaria address may be inspected only as itself.
 * Mishnah/Tosefta/Avot: the cited mishnah, never the chapter or tractate.
 * Talmud: the cited segment if numbered; otherwise that daf/halakha, never a facing page.
 */
function inspectionRef(ref) {
  return String(ref || '').trim();
}

function isMishnahLike(ref) {
  return /^(Pirkei Avot|Mishnah |Tosefta |Avot DeRabbi Natan)/i.test(ref);
}

module.exports = {
  clean,
  readable,
  searchable,
  tokens,
  nameCore,
  distinctiveWords,
  distinctiveTokens,
  sageMention,
  sageMentioned,
  placeMentioned,
  withoutQuotedScripture,
  classifyEvidence,
  isDisplayable,
  inspectionRef,
  isMishnahLike,
  DISPLAYABLE,
};
