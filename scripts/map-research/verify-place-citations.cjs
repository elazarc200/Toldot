/**
 * Verifies geography citations against the claim they are attached to.
 *
 * This is a VERIFIER, not a source generator:
 * - inspects only the cited unit (the mishnah / the cited daf-or-segment)
 * - never searches the chapter, tractate, or neighboring units
 * - never concatenates adjacent segments into one evidence window
 * - never retargets a citation to a "better" ref
 * - never merges claims that happen to share a Sefaria address
 * - never blanks a citation record (the transmission tree may share it)
 *
 * A failing citation is classified and, with --apply --filter-display, removed from
 * the geography holder's displayed sourceIds. The original ids stay in sourceIdsReviewed.
 */
const fs = require('fs');
const path = require('path');
const rules = require('./geo-citation-rules.cjs');

const root = path.join(__dirname, '../..');
const pilotPath = path.join(root, 'src/components/knowledge/pilot.json');
const cacheDir = path.join(root, 'docs/research/source-cache');
const reportPath = path.join(root, 'docs/research/geography-source-audit.json');
fs.mkdirSync(cacheDir, {recursive: true});

const APPLY = process.argv.includes('--apply');
const FILTER = process.argv.includes('--filter-display');
const TODAY = new Date().toISOString().slice(0, 10);

const REF_FIXES = [
  [/^Jerusalem Talmud Hagigah/, 'Jerusalem Talmud Chagigah'],
  [/^Jerusalem Talmud Peah/, 'Jerusalem Talmud Peah'],
];

function refFromUrl(url) {
  try {
    const parsed = new URL(url);
    if (!/sefaria\.org$/.test(parsed.hostname.replace(/^www\./, ''))) return '';
    const raw = decodeURIComponent(parsed.pathname.slice(1));
    if (/^(topics|sheets|search|categories|texts)\b/i.test(raw)) return '';
    let ref = raw.replace(/_/g, ' ');
    for (const [pattern, replacement] of REF_FIXES) ref = ref.replace(pattern, replacement);
    return ref;
  } catch {
    return '';
  }
}

const cacheFile = (ref) => path.join(cacheDir, Buffer.from(ref).toString('base64url') + '.json');
const dead = new Set();
const fetchFailures = new Set();
async function fetchRef(ref) {
  if (!ref || dead.has(ref)) return null;
  const file = cacheFile(ref);
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch { /* refetch */ }
  }
  const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0&commentary=0&pad=0`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {signal: AbortSignal.timeout(30000)});
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) throw new Error((data && data.error) || `HTTP ${res.status}`);
      const payload = {requested: ref, ...data};
      fs.writeFileSync(file, JSON.stringify(payload));
      return payload;
    } catch (error) {
      if (attempt === 3) {
        dead.add(ref);
        fetchFailures.add(`${ref} — ${error.message}`);
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
    }
  }
  return null;
}

/** Flatten Sefaria `he` into cited units. Adjacent units are NOT joined. */
function segments(data) {
  if (!data) return [];
  const canonical = data.ref || data.requested;
  const he = data.he;
  if (typeof he === 'string') return he.trim() ? [{ref: canonical, text: he}] : [];
  if (!Array.isArray(he)) return [];
  const flat = [];
  he.forEach((entry, index) => {
    if (typeof entry === 'string') {
      if (entry.trim()) flat.push({ref: `${canonical}:${index + 1}`, text: entry});
      return;
    }
    if (Array.isArray(entry)) {
      entry.flat(Infinity).forEach((inner, innerIndex) => {
        if (typeof inner === 'string' && inner.trim()) {
          flat.push({ref: `${canonical}:${index + 1}:${innerIndex + 1}`, text: inner});
        }
      });
    }
  });
  return flat;
}

function isSpecificUnitRef(ref) {
  const value = String(ref || '').trim();
  if (!value) return false;
  // Mishnah-like addresses are specific only with chapter AND mishnah (1:3 or 1.8), never a chapter.
  if (rules.isMishnahLike(value) && /\d+[.:]\d+$/.test(value)) return true;
  if (/\d+[ab]:\d+/i.test(value)) return true;
  return false;
}

function unitsToInspect(cited, data) {
  const list = segments(data);
  if (!list.length && data && typeof data.he === 'string' && data.he.trim()) {
    return [{ref: cited, text: data.he}];
  }
  // Each Sefaria segment is its own unit. Sage and place must both occur inside one unit.
  // Never concatenate neighbors, never walk to a parent chapter or facing daf.
  if (isSpecificUnitRef(cited)) {
    const exact = list.filter((unit) => {
      const ref = String(unit.ref || '');
      return ref === cited || ref.startsWith(`${cited}:`);
    });
    if (exact.length) return exact;
    if (list.length === 1) return [{ref: cited, text: list[0].text}];
    return [];
  }
  return list;
}

function classifyUnit(text, claim) {
  return rules.classifyEvidence({
    text,
    sageName: claim.sageName,
    place: claim.place,
    editorial: claim.editorial,
  });
}

function rank(classification) {
  return {VALID_DIRECT: 3, VALID_INDIRECT: 2, AMBIGUOUS: 1}[classification] || 0;
}

async function verifyClaimSource(claim, citation) {
  const editorial = citation.textKind === 'editorial' || !refFromUrl(citation.url || '');
  if (editorial) {
    const classification = classifyUnit(citation.text || '', {...claim, editorial: true});
    return {classification, ref: citation.url, excerpt: rules.readable(citation.text).slice(0, 240), redirected: false};
  }
  const cited = refFromUrl(citation.url || '');
  if (!cited) {
    return {classification: 'UNVERIFIED', ref: citation.url, excerpt: '', redirected: false};
  }
  const data = await fetchRef(cited);
  if (!data) {
    const fallback = classifyUnit(citation.text || '', claim);
    return {classification: fallback === 'IRRELEVANT' ? 'UNVERIFIED' : fallback, ref: cited, excerpt: rules.readable(citation.text).slice(0, 240), redirected: false, fetchFailed: true};
  }
  const units = unitsToInspect(cited, data);
  const supplied = citation.text ? [{ref: cited, text: citation.text}] : [];
  let best = null;
  for (const unit of [...supplied, ...units]) {
    const classification = classifyUnit(unit.text, claim);
    const candidate = {classification, ref: cited, unitRef: unit.ref, excerpt: rules.readable(unit.text).slice(0, 320)};
    if (!best || rank(candidate.classification) > rank(best.classification)) best = candidate;
  }
  if (!best) {
    const fallback = classifyUnit(citation.text || '', claim);
    return {classification: fallback, ref: cited, excerpt: rules.readable(citation.text).slice(0, 240), redirected: false};
  }
  return {...best, redirected: false};
}

function loadPilot() {
  return JSON.parse(fs.readFileSync(pilotPath, 'utf8'));
}

async function run() {
  const pilot = loadPilot();
  const byId = new Map(pilot.citations.map((c) => [c.id, c]));
  const places = new Map(pilot.geography.places.map((p) => [p.id, p]));
  const sages = new Map(pilot.people.map((p) => [p.id, p]));
  const claims = [];

  for (const row of pilot.geography.personPlaces) {
    const place = places.get(row.placeId);
    const sage = sages.get(row.personId);
    if (!place || !sage) continue;
    claims.push({
      kind: 'personPlace',
      label: `${sage.name} · ${place.name}`,
      holder: row,
      key: 'sourceIds',
      sageName: sage.name,
      place,
    });
  }
  for (const row of pilot.geography.events || []) {
    const place = places.get(row.placeId);
    if (place) claims.push({kind: 'event', label: `אירוע · ${place.name} · ${row.name || ''}`, holder: row, key: 'sourceIds', sageName: '', place});
  }
  for (const row of pilot.geography.institutions || []) {
    const place = places.get(row.placeId);
    if (place) claims.push({kind: 'institution', label: `מוסד · ${place.name} · ${row.name || ''}`, holder: row, key: 'sourceIds', sageName: '', place});
  }
  for (const place of pilot.geography.places) {
    for (const key of ['sourceIds', 'overviewSourceIds']) {
      if (Array.isArray(place[key]) && place[key].length) {
        claims.push({kind: 'place', label: `מקום · ${place.name} (${key})`, holder: place, key, sageName: '', place});
      }
    }
  }

  const associations = [];
  const counts = {VALID_DIRECT: 0, VALID_INDIRECT: 0, UNVERIFIED: 0, AMBIGUOUS: 0, WRONG_PERSON: 0, WRONG_CLAIM: 0, IRRELEVANT: 0};

  for (const claim of claims) {
    const reviewed = [];
    const display = [];
    for (const id of claim.holder[claim.key] || []) {
      const citation = byId.get(id);
      if (!citation) continue;
      const result = await verifyClaimSource(claim, citation);
      counts[result.classification] = (counts[result.classification] || 0) + 1;
      associations.push({
        claim: claim.label,
        kind: claim.kind,
        citationId: id,
        classification: result.classification,
        ref: result.ref,
        excerpt: result.excerpt,
      });
      reviewed.push({id, classification: result.classification});
      if (rules.isDisplayable(result.classification)) display.push(id);
    }
    if (APPLY) {
      const reviewKey = claim.key === 'sourceIds' ? 'sourceIdsReviewed' : `${claim.key}Reviewed`;
      claim.holder[reviewKey] = reviewed;
      if (FILTER) claim.holder[claim.key] = [...new Set(display)];
    }
  }

  const report = {
    generated: TODAY,
    mode: APPLY ? (FILTER ? 'apply-filter-display' : 'apply-review-only') : 'dry-run',
    totals: {
      claims: claims.length,
      associations: associations.length,
      ...counts,
      fetchFailures: fetchFailures.size,
    },
    fetchFailures: [...fetchFailures],
    associations,
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  if (APPLY) {
    fs.writeFileSync(pilotPath, JSON.stringify(pilot));
    console.log('WROTE pilot.json');
  }
  console.log(JSON.stringify(report.totals, null, 2));
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {refFromUrl, segments, unitsToInspect, verifyClaimSource, isSpecificUnitRef};
