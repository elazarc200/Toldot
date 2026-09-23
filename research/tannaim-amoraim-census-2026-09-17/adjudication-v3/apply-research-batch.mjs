import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const BATCH = Number(process.argv[2] || 1);
const dir = path.dirname(fileURLToPath(import.meta.url));
const readLocal = n => JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8'));
const writeLocal = (n, d) => fs.writeFileSync(path.join(dir, n), JSON.stringify(d, null, 2) + '\n');

const results = readLocal(`research-batch-${BATCH}-results.json`);
const baseline = readLocal('counts.json');
const old = readLocal('master-sages.json');
const oldReview = readLocal('manual-review-identities.json').records;
const oldRedirects = readLocal('identity-redirects.json');
const oldAudit = readLocal('adjudication-audit.json');
const records = new Map([...old.sages, ...oldReview].map(r => [r.identity_key, structuredClone(r)]));
const redirects = new Map(Object.entries(oldRedirects));
const audit = [...oldAudit];
const archive = readLocal('merged-source-records.json');
const progress = readLocal('research-progress.json');
const unique = a => [...new Map(a.map(x => [JSON.stringify(x), x])).values()];
const chase = k => { let x = k; while (redirects.has(x)) x = redirects.get(x); return x; };
const source = r => r.secondary_identity_evidence.map(s => s.url).filter(Boolean);
const pairKey = keys => keys.map(chase).sort().join('|');
const excludedPairs = new Set();

function merge(target, from, reason, manualAnchor = null) {
  const a = records.get(chase(target));
  const b = records.get(from);
  const targetKey = chase(target);
  if (!a || !b) throw Error('Missing ' + from);
  const shared = a.primary_chazal_evidence.filter(e => b.primary_chazal_evidence.some(f => f.ref === e.ref));
  if (!shared.length && !manualAnchor) throw Error('Missing independent common passage ' + from);
  if (manualAnchor && !a.primary_chazal_evidence.some(e => e.ref === manualAnchor.ref)) throw Error('Missing manual anchor ' + manualAnchor.ref);
  archive.push(structuredClone(b));
  for (const f of ['aliases', 'secondary_identity_evidence', 'classification_assertions', 'generation', 'region_assertions', 'notes', 'primary_chazal_evidence']) {
    a[f] = unique([...(a[f] || []), ...(b[f] || [])]);
  }
  if (!a.classification) a.classification = b.classification;
  if (a.region === 'unknown' && b.region !== 'unknown') a.region = b.region;
  for (const [k, v] of Object.entries(b.external_ids || {})) if (!a.external_ids[k]) a.external_ids[k] = v;
  a.adjudicated_source_records = [...(a.adjudicated_source_records || []), {identity_key: from, person_id: b.person_id, external_ids: b.external_ids}];
  a.untransferred_source_fields = [...(a.untransferred_source_fields || []), {
    identity_key: from, teachers: b.teachers, students: b.students, birth_year: b.birth_year, death_year: b.death_year,
    reason: 'Assertion-level assessment remains separate; full source record retained in merged-source-records.json.'
  }];
  if (b.hyman_entry_text) a.hyman_entry_text = [a.hyman_entry_text, b.hyman_entry_text].filter(Boolean).join('\n\n');
  a.review_reasons = unique([...a.review_reasons, ...b.review_reasons]);
  records.delete(from);
  redirects.set(from, targetKey);
  audit.push({
    action: 'same_person', batch: `research-${BATCH}`, target: targetKey, from, reason,
    primary_comparison: shared.map(e => ({ref: e.ref, excerpt: e.excerpt, url: e.url})),
    manual_source_comparison: manualAnchor, secondary_sources: unique([...source(a), ...source(b)]), status: 'decided'
  });
  progress.confirmed_merges++;
}

function separate(keys, reason, evidence = {}) {
  excludedPairs.add(pairKey(keys));
  const note = `Separate identity documented: ${keys.filter(k => k !== keys[0]).join(', ')} — ${reason}`;
  for (const k of keys) {
    const r = records.get(k);
    if (!r) continue;
    r.review_reasons = unique([...(r.review_reasons || []), note]);
    if (progress.status_by_key[k]) progress.status_by_key[k] = 'adjudicated';
  }
  audit.push({
    action: 'separate_identity', batch: `research-${BATCH}`, identity_keys: keys, status: 'decided',
    reason, evidence, sources: keys.map(k => source(records.get(k))).flat()
  });
  progress.confirmed_separations++;
}

// Verified merges from deep research
const verifiedMerges = [
  ['sefaria:rav-ahadvoi-b-ami', 'sefaria:rav-achadvoi-b-ami',
    'Duplicate Sefaria slug orthography for Rav Achadvoi bar Ami; identical alias set; target holds all independently attributed primary passages.',
    {ref: 'Bava Batra 9b:2'}]
];
for (const [t, f, reason, anchor] of verifiedMerges) {
  try { if (records.has(t) && records.has(f)) merge(t, f, reason, anchor); } catch (e) { console.warn('merge skip', t, f, e.message); }
}

for (const c of results.results.adjudication_candidates) {
  if (c.action === 'same_person' && c.confidence === 'high' && (c.evidence?.shared_refs?.length || 0) >= 2) {
    const [target, ...rest] = c.keys.sort((a, b) => {
      const rank = k => k.startsWith('sefaria:') ? 0 : k.startsWith('hewiki:') ? 1 : 2;
      return rank(a) - rank(b);
    });
    for (const from of rest) {
      try {
        if (records.has(target) && records.has(from)) merge(target, from, c.reason);
      } catch (e) { console.warn('merge skip', target, from, e.message); }
    }
    continue;
  }
  if (c.action !== 'separate_identity') continue;
  const classConflict = c.evidence?.negative?.some(n => n.kind === 'classification_conflict');
  const numberedHomonyms = c.keys.every(k => k.startsWith('sefaria:')) && c.keys.some(k => /\((i|ii|iii|iv)\)/i.test(k));
  const sameRefConflict = c.evidence?.negative?.some(n => n.kind === 'same_ref_different_context');
  if (classConflict || numberedHomonyms || sameRefConflict) separate(c.keys, c.reason, c.evidence);
}

let pairs = readLocal('suspected-duplicates.json').pairs.map(p => ({
  ...p, identity_keys: [...new Set(p.identity_keys.map(chase))]
})).filter(p => p.identity_keys.length > 1 && !excludedPairs.has(pairKey(p.identity_keys)));
pairs = unique(pairs);

const master = [], review = [];
const oldReviewKeys = new Set(oldReview.map(r => r.identity_key));
for (const r of records.values()) {
  r.review_reasons = r.review_reasons.filter(x => !x.startsWith('Possible duplicate identity:'));
  if (r.classification) {
    r.review_reasons = r.review_reasons.filter(x =>
      !x.startsWith('Tanna/Amora classification not established') &&
      !x.startsWith('Reference identifies a person/contemporary')
    );
  }
  if (r.primary_chazal_evidence.length) {
    r.review_reasons = r.review_reasons.filter(x => !x.startsWith('No primary Chazal passage independently attributed'));
  }
  for (const p of pairs.filter(p => p.identity_keys.includes(r.identity_key))) {
    r.review_reasons.push('Possible duplicate identity: ' + p.identity_keys.filter(k => k !== r.identity_key).join(', '));
  }
  if (r.classification && new Set(r.classification_assertions.map(x => x.value).filter(Boolean)).size > 1) {
    r.review_reasons.push('Conflicting Tanna/Amora source classifications.');
  }
  r.review_reasons = unique(r.review_reasons);
  const okay = r.classification && r.primary_chazal_evidence.length && !r.review_reasons.length;
  const kinds = new Set(r.secondary_identity_evidence.map(x => x.kind));
  r.confidence = okay
    ? (kinds.has('hebrew_wikipedia') && (kinds.has('sefaria_identity') || kinds.has('hyman_1910_transcription')) ? 'high' : 'medium')
    : 'manual_review';
  r.identity_status = okay ? 'resolved' : 'needs_review';
  r.lifecycle_status = 'research_only';
  r.knowledge_state = okay ? 'known' : 'disputed';
  (okay ? master : review).push(r);
}

const promoted = master.filter(r => oldReviewKeys.has(r.identity_key));
const count = (type, region) => master.filter(r => r.classification === type && (!region || region.includes(r.region))).length;
const counts = {
  tannaim: count('Tanna'), amoraim: count('Amora'),
  amoraim_eretz_israel: count('Amora', ['Eretz Israel']),
  amoraim_babylonia: count('Amora', ['Babylonia']),
  amoraim_mixed_unknown: count('Amora', ['mixed', 'unknown']),
  total_unique_sages: master.length,
  high_confidence_identities: master.filter(r => r.confidence === 'high').length,
  medium_confidence_identities: master.filter(r => r.confidence === 'medium').length,
  manual_review_candidate_records: review.length,
  suspected_duplicate_pairs: pairs.length,
  suspected_duplicate_candidate_records: new Set(pairs.flatMap(p => p.identity_keys)).size,
  records_with_direct_primary_chazal_evidence: master.filter(r => r.primary_chazal_evidence.length).length
};

if (promoted.length) progress.canonical_promotions = (progress.canonical_promotions || 0) + promoted.length;
writeLocal('master-sages.json', {...old, schema_version: 'toladot-research-census-3-research', counts, sages: master});
writeLocal('counts.json', counts);
writeLocal('manual-review-identities.json', {count_unit: 'candidate records, not people', records: review});
writeLocal('suspected-duplicates.json', {pairs});
writeLocal('adjudication-audit.json', audit);
writeLocal('identity-redirects.json', Object.fromEntries(redirects));
writeLocal('merged-source-records.json', archive);
progress.ending_unresolved = review.length;
writeLocal('research-progress.json', progress);

fs.mkdirSync(path.join(dir, 'checkpoints', `post-research-batch-${BATCH}`), {recursive: true});
for (const f of ['counts.json', 'master-sages.json', 'manual-review-identities.json', 'research-progress.json']) {
  fs.copyFileSync(path.join(dir, f), path.join(dir, 'checkpoints', `post-research-batch-${BATCH}`, f));
}

console.log(JSON.stringify({
  batch: BATCH,
  merges: audit.filter(x => x.batch === `research-${BATCH}` && x.action === 'same_person').length,
  separations: audit.filter(x => x.batch === `research-${BATCH}` && x.action === 'separate_identity').length,
  promoted: promoted.length,
  counts
}, null, 2));
