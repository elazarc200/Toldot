import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';
import {norm, clean, read as parentRead} from '../lib.mjs';

export const dir = path.dirname(fileURLToPath(import.meta.url));
export const censusRoot = path.join(dir, '..');
export const readLocal = n => JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8'));
export const writeLocal = (n, d) => fs.writeFileSync(path.join(dir, n), JSON.stringify(d, null, 2) + '\n');
export const readCensus = n => parentRead(n.startsWith('raw/') || ['corpus-manifest.json', 'hyman-entries.json', 'hyman-primary-citation-pointers.json', 'identity-key-map.json'].includes(n) ? n : path.join('..', n).replace(/\\/g, '/').replace(/^\.\.\//, ''));

const hymanEntries = parentRead('hyman-entries.json');
const hymanByTitle = new Map();
for (const e of hymanEntries) {
  const t = norm(e.title.replace(/\s*\([^)]*\)\s*/g, ''));
  if (!hymanByTitle.has(t)) hymanByTitle.set(t, []);
  hymanByTitle.get(t).push(e);
}

const RELATION_PATTERNS = [
  {field: 'teachers', re: /תלמיד(?:ו|יו|יה)?\s+(?:ד)?([^\s,;.]{2,40})/g},
  {field: 'teachers', re: /רב(?:ו|ותיו)?\s+([^\s,;.]{2,40})/g},
  {field: 'students', re: /תלמיד(?:יו|יה)?\s+([^\s,;.]{2,40})/g},
  {field: 'colleagues', re: /חבר(?:ו|יו|יה)?\s+([^\s,;.]{2,40})/g},
  {field: 'family', re: /אח(?:יו|יה)?\s+(?:ד)?([^\s,;.]{2,40})/g},
  {field: 'family', re: /בנ(?:ו|יה)?\s+([^\s,;.]{2,40})/g},
  {field: 'family', re: /אב(?:יו|יה)?\s+([^\s,;.]{2,40})/g}
];

export function normalizedName(r) {
  return norm((r.canonical_name_he || '').replace(/\s*\([^)]*\)\s*/g, ''));
}

export function hymanForRecord(r) {
  const out = [];
  if (r.hyman_section_key) {
    const e = hymanEntries.find(x => x.key === r.hyman_section_key);
    if (e) out.push(e);
  }
  if (r.hyman_entry_text) {
    out.push({key: r.identity_key, title: r.canonical_name_he, text: r.hyman_entry_text, classification: null});
  }
  const byTitle = hymanByTitle.get(normalizedName(r)) || [];
  for (const e of byTitle) if (!out.some(x => x.key === e.key)) out.push(e);
  return out;
}

export function extractProfileFields(r) {
  const hyman = hymanForRecord(r);
  const htext = hyman.map(x => x.text || '').join('\n');
  const passages = (r.primary_chazal_evidence || []).map(e => ({
    ref: e.ref, mention: e.mention, excerpt: e.excerpt, url: e.url
  }));
  const relations = {teachers: [], students: [], colleagues: [], family: []};
  for (const src of [htext, ...(r.notes || [])]) {
    const text = clean(src);
    for (const {field, re} of RELATION_PATTERNS) {
      for (const m of text.matchAll(re)) {
        const name = norm(m[1]);
        if (name.length > 2 && !relations[field].includes(name)) relations[field].push(name);
      }
    }
  }
  for (const t of r.teachers || []) if (t.target_identity_key) relations.teachers.push(t.target_identity_key);
  for (const s of r.students || []) if (s.target_identity_key) relations.students.push(s.target_identity_key);
  return {
    identity_key: r.identity_key,
    canonical_name_he: r.canonical_name_he,
    aliases: (r.aliases || []).map(a => a.name),
    classification: r.classification,
    classification_assertions: (r.classification_assertions || []).map(x => x.value),
    generation: (r.generation || []).map(g => ({scheme: g.scheme, value: g.value, source: g.source})),
    region: r.region,
    region_assertions: (r.region_assertions || []).map(x => x.value),
    teachers: relations.teachers,
    students: relations.students,
    colleagues: relations.colleagues,
    family: relations.family,
    locations: (r.locations || []).map(l => l.name || l),
    primary_passages: passages,
    passage_refs: passages.map(p => p.ref),
    characteristic_traditions: passages.slice(0, 5).map(p => p.excerpt?.slice(0, 120) || ''),
    hyman_sections: hyman.map(x => ({key: x.key, title: x.title, classification: x.classification, identity_caution: x.identity_caution})),
    hyman_excerpt: htext.slice(0, 600) || null,
    external_ids: r.external_ids || {},
    review_reasons: r.review_reasons || [],
    source_prefix: r.identity_key.split(':')[0]
  };
}

export function dafRef(ref) {
  if (!ref) return ref;
  const m = ref.match(/^(.+?\s+\d+[ab])(?::\d+)?$/i);
  return m ? m[1] : ref;
}

export function compareProfiles(a, b) {
  const dafA = new Set(a.passage_refs.map(dafRef));
  const dafB = new Set(b.passage_refs.map(dafRef));
  const sharedRefs = [...dafA].filter(r => dafB.has(r));
  const sharedAliases = a.aliases.filter(x => b.aliases.some(y => norm(x) === norm(y)));
  const relationOverlap = {};
  for (const f of ['teachers', 'students', 'colleagues', 'family']) {
    relationOverlap[f] = a[f].filter(x => b[f].includes(x));
  }
  const negatives = [];
  if (a.classification && b.classification && a.classification !== b.classification) {
    negatives.push({kind: 'classification_conflict', detail: `${a.classification} vs ${b.classification}`});
  }
  const bucket = g => {
    const s = `${g.scheme || ''} ${g.source || ''}`;
    if (/Wikipedia/i.test(s)) return 'wiki';
    if (/Sefaria/i.test(s)) return 'sefaria';
    return 'other';
  };
  // Only compare generations within the same scheme; cross-scheme numbering is not a contradiction.
  for (const s of ['sefaria', 'wiki', 'other']) {
    const va = a.generation.filter(g => bucket(g) === s).map(g => g.value);
    const vb = b.generation.filter(g => bucket(g) === s).map(g => g.value);
    if (va.length && vb.length && !va.some(x => vb.includes(x))) {
      negatives.push({kind: 'generation_mismatch', detail: {scheme: s, a: va, b: vb}});
    }
  }
  if (a.region && b.region && a.region !== 'unknown' && b.region !== 'unknown' && a.region !== b.region) {
    negatives.push({kind: 'region_mismatch', detail: {a: a.region, b: b.region}});
  }
  for (const ref of sharedRefs) {
    const ea = a.primary_passages.find(p => p.ref === ref)?.excerpt || '';
    const eb = b.primary_passages.find(p => p.ref === ref)?.excerpt || '';
    const na = norm(ea), nb = norm(eb);
    if (na && nb && na !== nb && !na.includes(norm(b.canonical_name_he)) && !nb.includes(norm(a.canonical_name_he))) {
      negatives.push({kind: 'same_ref_different_context', ref, detail: 'Shared ref but excerpt attribution differs'});
    }
  }
  return {shared_refs: sharedRefs, shared_aliases: sharedAliases, relation_overlap: relationOverlap, negative_evidence: negatives};
}

export async function corpusMentionsForKeys(keys, limitPerKey = 12) {
  const wanted = new Set(keys);
  const out = new Map(keys.map(k => [k, []]));
  const file = path.join(censusRoot, 'corpus-mentions.jsonl');
  if (!fs.existsSync(file)) return out;
  const rl = readline.createInterface({input: fs.createReadStream(file), crlfDelay: Infinity});
  for await (const line of rl) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    for (const m of row.matches || []) {
      if (!wanted.has(m.key) || out.get(m.key).length >= limitPerKey) continue;
      out.get(m.key).push({ref: row.ref, book: row.book, name: m.name, kind: m.kind});
    }
  }
  return out;
}

export function triageRecord(r, dupPartners = []) {
  const reasons = r.review_reasons || [];
  const onlyDup = reasons.length > 0 && reasons.every(x => x.startsWith('Possible duplicate identity:'));
  const classConflict = r.classification && new Set((r.classification_assertions || []).map(x => x.value).filter(Boolean)).size > 1;
  const hasPrimary = (r.primary_chazal_evidence || []).length > 0;
  const hasClass = !!r.classification;
  const isCollective = /^(בית |בני |רבנן|חכמי|זקני|זקנים הראשונים|אנשי ירושלים)/.test(r.canonical_name_he || '');
  const isSeeRef = /^(heiman:|hyman-section:)/.test(r.identity_key) && !hasClass && (r.hyman_entry_text || '').trim().match(/^ערך\s+/);
  const numbered = /\((הראשון|השני|השלישי|הרביעי|החמישי|א|ב|ג|ד)\)|הראשון|השני|השלישי/.test(r.canonical_name_he || '');
  const hyman = hymanForRecord(r);

  if (isCollective) return {category: 'G', label: 'non_person_collective', priority: 3};
  if (isSeeRef) return {category: 'G', label: 'bibliographic_cross_reference', priority: 3};
  if (classConflict) return {category: 'H', label: 'classification_conflict', priority: 2};
  if (numbered && dupPartners.length) return {category: 'D', label: 'generational_collision', priority: 2};
  if (onlyDup && hasClass && hasPrimary) return {category: 'A', label: 'strong_duplicate_candidate', priority: 1};
  if (onlyDup) return {category: 'B', label: 'spelling_title_variant', priority: 1};
  if (hasClass && hasPrimary && !dupPartners.length) return {category: 'F', label: 'likely_unique_sage', priority: 1};
  if (!hasPrimary && !hasClass) return {category: 'E', label: 'insufficient_identification', priority: 2};
  if (hyman.length > 1) return {category: 'C', label: 'possible_alias', priority: 2};
  return {category: 'I', label: 'genuinely_ambiguous', priority: 3};
}

export {hymanEntries, hymanByTitle};
