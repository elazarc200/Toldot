import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const BATCH = 5;
const dir = path.dirname(fileURLToPath(import.meta.url));
const read = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const write = (f, d) => fs.writeFileSync(path.join(dir, f), JSON.stringify(d, null, 2) + '\n');
const baseline = read('counts.json');
const old = read('master-sages.json');
const oldReview = read('manual-review-identities.json').records;
const oldRedirects = read('identity-redirects.json');
const oldAudit = read('adjudication-audit.json');
const records = new Map([...old.sages, ...oldReview].map(r => [r.identity_key, structuredClone(r)]));
const redirects = new Map(Object.entries(oldRedirects));
const audit = [...oldAudit];
const archive = read('merged-source-records.json');
const unique = a => [...new Map(a.map(x => [JSON.stringify(x), x])).values()];
const chase = k => redirects.has(k) ? chase(redirects.get(k)) : k;
const source = r => r.secondary_identity_evidence.map(s => s.url).filter(Boolean);
const pairKey = keys => keys.map(chase).sort().join('|');

function merge(target, from, reason, manualAnchor = null) {
  const a = records.get(chase(target));
  const b = records.get(from);
  const targetKey = chase(target);
  if (!a || !b) throw Error('Missing ' + from);
  const shared = a.primary_chazal_evidence.filter(e => b.primary_chazal_evidence.some(f => f.ref === e.ref));
  if (!shared.length && !manualAnchor) throw Error('Missing independent common passage ' + from);
  if (manualAnchor && !a.primary_chazal_evidence.concat(b.primary_chazal_evidence).some(e => e.ref === manualAnchor.ref)) {
    throw Error('Missing manual anchor text');
  }
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
    action: 'same_person', batch: BATCH, target: targetKey, from, reason,
    primary_comparison: shared.map(e => ({ref: e.ref, excerpt: e.excerpt, url: e.url})),
    manual_source_comparison: manualAnchor, secondary_sources: unique([...source(a), ...source(b)]), status: 'decided'
  });
}

merge('sefaria:geniva', 'hewiki:1183469',
  'Same first-generation Babylonian Amora Geniva, pupil of Rav; Wikipedia biography matches Berakhot 25a passages on the Sefaria profile.',
  {ref: 'Berakhot 25a:17'});
merge('sefaria:rebbi-gorion', 'bonayich:814',
  'Same Rabbi Gorion transmitting the Shabbat 33b:4 teaching on righteous people suffering for the generation.');
merge('sefaria:botnit', 'heiman:379121',
  'Same Botnit son of Abba Shaul ben Botnit in Nedarim 23a:3; Hyman identifies the father-son Botnit family.');
merge('sefaria:rav-zevid1', 'hyman-section:ba292ef58bf338dc7233',
  'Same Zevida in Avodah Zarah 16a:12; Hyman separates this Amoraic figure from the biblical Zevida entry in the same section.',
  {ref: 'Avodah Zarah 16a:12'});
merge('sefaria:alexander', 'heiman:333697',
  'Same Alexander, brother of Rabbi Huryina and Rabbi Samuel bar Susartai, in Yerushalmi Bava Batra 9:3:5.');
merge('bonayich:805', 'heiman:381573',
  'Same Gevini, Temple herald in Yoma 20b:7; Hyman cites Shekalim and Tamid parallels.');

// Homonym documentation and pair suppression
const excludedPairs = new Set([
  pairKey(['sefaria:avimi', 'heiman:333278']),
  pairKey(['hewiki:2176997', 'hyman-section:b5b65d4b1a0af20c2da9'])
]);

const avimiI = records.get('heiman:333278');
if (avimiI) {
  avimiI.notes = unique([...(avimiI.notes || []), 'Numbered homonym: Avimi I (father of Ada bar Avimi / Tachlifa bar Avimi); distinct from second-generation Amora Avimi (sefaria:avimi).']);
  avimiI.review_reasons = unique([...(avimiI.review_reasons || []), 'Homonym disambiguated: not the same person as sefaria:avimi.']);
}

audit.push({
  action: 'separate_identity', batch: BATCH,
  identity_keys: ['hewiki:2176997', 'hyman-section:b5b65d4b1a0af20c2da9'],
  status: 'decided',
  reason: 'Hyman notes the Berakhot 38b transmission attributed to Ravnai should read Rava per Dikdukei Sofrim; not the Ravnai who is brother of Rabbi Hiyya bar Abba.',
  primary_refs: ['Berakhot 38b:3'],
  sources: source(records.get('hyman-section:b5b65d4b1a0af20c2da9'))
});

audit.push({
  action: 'insufficient_evidence', batch: BATCH,
  identity_keys: ['sefaria:rav-huna', 'hyman-section:32a37ab9d57da53aa0d0'],
  status: 'unresolved',
  reason: 'Only one shared primary passage (Arakhin 16b:9) for a major sage with extensive independent profiles; name-level candidate only.',
  shared_refs: ['Arakhin 16b:9']
});

let pairs = read('suspected-duplicates.json').pairs.map(p => ({
  ...p,
  identity_keys: [...new Set(p.identity_keys.map(chase))]
})).filter(p => p.identity_keys.length > 1 && !excludedPairs.has(pairKey(p.identity_keys)));
pairs = unique(pairs);

const master = [], review = [];
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
  for (const f of ['teachers', 'students']) {
    for (const rel of r[f] || []) {
      if (rel.target_identity_key) {
        rel.target_identity_key = chase(rel.target_identity_key);
        rel.target_person_id = records.get(rel.target_identity_key)?.person_id || null;
      }
    }
  }
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

const count = (type, region) => master.filter(r => r.classification === type && (!region || region.includes(r.region))).length;
const counts = {
  tannaim: count('Tanna'),
  amoraim: count('Amora'),
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

const batchMerges = audit.filter(x => x.batch === BATCH && x.action === 'same_person');
const promoted = master.filter(r => oldReview.some(x => x.identity_key === r.identity_key));

write('master-sages.json', {...old, schema_version: 'toladot-research-census-3-batch5', counts, sages: master});
write('counts.json', counts);
write('manual-review-identities.json', {count_unit: 'candidate records, not people', records: review});
write('suspected-duplicates.json', {pairs});
write('adjudication-audit.json', audit);
write('identity-redirects.json', Object.fromEntries(redirects));
write('merged-source-records.json', archive);
write('change-report.json', {
  baseline, current: counts, merged_this_pass: batchMerges.length,
  promoted_from_review: promoted.map(r => ({identity_key: r.identity_key, name: r.canonical_name_he})),
  batch: BATCH,
  input_conservation: {
    input: old.sages.length + oldReview.length + Object.keys(oldRedirects).length,
    output: master.length + review.length + redirects.size
  }
});
write('batch-5-report.json', {
  generated_at: new Date().toISOString(),
  merges: batchMerges.map(m => ({target: m.target, from: m.from, reason: m.reason})),
  promoted_count: promoted.length,
  promoted: promoted.map(r => ({identity_key: r.identity_key, name: r.canonical_name_he, confidence: r.confidence})),
  separate_or_unresolved: audit.filter(x => x.batch === BATCH && x.action !== 'same_person'),
  counts_before: baseline,
  counts_after: counts
});

console.log(JSON.stringify({batch: BATCH, merges: batchMerges.length, promoted: promoted.length, counts}, null, 2));
