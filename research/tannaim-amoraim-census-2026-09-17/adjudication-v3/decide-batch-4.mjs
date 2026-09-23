import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

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
    identity_key: from,
    teachers: b.teachers,
    students: b.students,
    birth_year: b.birth_year,
    death_year: b.death_year,
    reason: 'Assertion-level assessment remains separate; full source record retained in merged-source-records.json.'
  }];
  if (b.hyman_entry_text) a.hyman_entry_text = [a.hyman_entry_text, b.hyman_entry_text].filter(Boolean).join('\n\n');
  a.review_reasons = unique([...a.review_reasons, ...b.review_reasons]);
  records.delete(from);
  redirects.set(from, targetKey);
  audit.push({
    action: 'same_person',
    batch: 4,
    target: targetKey,
    from,
    reason,
    primary_comparison: shared.map(e => ({ref: e.ref, excerpt: e.excerpt, url: e.url})),
    manual_source_comparison: manualAnchor,
    secondary_sources: unique([...source(a), ...source(b)]),
    status: 'decided'
  });
}

// Tier A: classified Amora identity merges with shared primary passages
for (const [a, b, reason] of [
  ['sefaria:avimi', 'hewiki:872771', 'Second-generation Babylonian Amora and teacher of Rav Chisda; ten independently attributed shared passages including Bava Kamma 12a:4 and Ketubot 71b:7. Distinct from Hyman Avimi I (father of Ada bar Avimi).'],
  ['hewiki:2176997', 'bonayich:2657', 'Same Ravnai, brother of Rabbi Hiyya bar Abba; matching Keritot 13a and Bava Batra 99a passages.'],
  ['sefaria:rabbi-hizkiyah', 'hewiki:1493473', 'Same Rabbi Hizkiyah in Yerushalmi Beitzah 1:2:2 and Berakhot 2:1:8; compatible fourth/fifth-generation Eretz Israel Amora profile.'],
  ['sefaria:geniva', 'heiman:381635', 'Hyman identifies Geniva as a leading pupil of Rav; four shared Berakhot and Yerushalmi passages.'],
  ['sefaria:rebbi-yosana', 'bonayich:1761', 'Same Rabbi Yosana speaking in Avodah Zarah 33b:6.']
]) merge(a, b, reason);

// Tier B: unclassified identity consolidation with shared primary evidence
for (const [a, b, reason] of [
  ['sefaria:antoninus1', 'bonayich:520', 'Same Antoninus in the Avodah Zarah 10a–11a narratives and Berakhot 57b:17; seven shared primary passages.'],
  ['sefaria:antoninus1', 'heiman:333844', 'Hyman entry on Antoninus the Roman emperor, friend of Rabbi; shared Berakhot 57b:17 and Sanhedrin 91a passages with the Sefaria profile.'],
  ['bonayich:2665', 'heiman:1710092', 'Same Ronia in Bava Batra 5a and Bava Metzia 93b; Hyman biography matches the cited narratives.'],
  ['bonayich:887', 'heiman:1710512', 'Same Denku, money-changer in Rav Papa\'s time; shared Bava Kamma 99b passages.'],
  ['bonayich:1012', 'heiman:1710624', 'Same Zigod in the Tovya/Zigod proverb; shared Makkot 11a and Pesachim 113b.'],
  ['bonayich:865', 'heiman:1710480', 'Same Doratai family in Pesachim 70b; Hyman identifies Judah ben Doratai and his son.'],
  ['bonayich:406', 'heiman:333690', 'Same Alksa in Chagigah 18a; Hyman: great man in Lod in Rabbi Tarfon\'s time.'],
  ['bonayich:517', 'heiman:333838', 'Same Androlinai in Yevamot 115b; Hyman: contemporary of Samuel\'s father, not a Torah scholar.'],
  ['bonayich:173', 'heiman:333340', 'Same Ablat, gentile sage and friend of Samuel; shared Shabbat 129a passage.'],
  ['bonayich:1009', 'heiman:1710622', 'Same Zonin in Avodah Zarah 55a.'],
  ['sefaria:herod', 'heiman:1710566', 'Same Herod in Bava Batra 3b Temple narratives; two shared primary passages.'],
  ['sefaria:rabbi-zakkai', 'heiman:1710643', 'Same Rabbi Zakkai; shared Megillah 27b and Niddah 23b passages.']
]) merge(a, b, reason);

// Documented non-merge: numbered homonym retained separately
audit.push({
  action: 'separate_identity',
  batch: 4,
  identity_keys: ['sefaria:avimi', 'heiman:333278'],
  status: 'decided',
  reason: 'Hyman Avimi I (father of Ada bar Avimi / Tachlifa bar Avimi in Eruvin 9b and Pesachim 107a) is a different person from the second-generation Babylonian Amora Avimi merged above.',
  primary_refs: ['Eruvin 9b:12', 'Pesachim 107a:6'],
  sources: source(records.get('heiman:333278'))
});

audit.push({
  action: 'insufficient_evidence',
  batch: 4,
  identity_keys: ['sefaria:rabbi-hama-b-bisa', 'hewiki:2095590'],
  status: 'unresolved',
  reason: 'Three shared primary passages but conflicting Tanna (Wikipedia) vs Amora (Sefaria) classifications; cannot force merge without explicit source resolution.',
  shared_refs: ['Ketubot 62b:13', 'Niddah 14b:4', 'Niddah 14b:8']
});

let pairs = read('suspected-duplicates.json').pairs.map(p => ({
  ...p,
  identity_keys: [...new Set(p.identity_keys.map(chase))]
})).filter(p => p.identity_keys.length > 1);
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

const batchMerges = audit.filter(x => x.batch === 4 && x.action === 'same_person');
const promoted = master.filter(r => oldReview.some(x => x.identity_key === r.identity_key));

write('master-sages.json', {...old, schema_version: 'toladot-research-census-3-batch4', counts, sages: master});
write('counts.json', counts);
write('manual-review-identities.json', {count_unit: 'candidate records, not people', records: review});
write('suspected-duplicates.json', {pairs});
write('adjudication-audit.json', audit);
write('identity-redirects.json', Object.fromEntries(redirects));
write('merged-source-records.json', archive);
write('change-report.json', {
  baseline,
  current: counts,
  merged_this_pass: batchMerges.length,
  promoted_from_review: promoted.map(r => ({identity_key: r.identity_key, name: r.canonical_name_he})),
  batch: 4,
  input_conservation: {
    input: old.sages.length + oldReview.length + Object.keys(oldRedirects).length,
    output: master.length + review.length + redirects.size
  }
});
write('batch-4-report.json', {
  generated_at: new Date().toISOString(),
  merges: batchMerges.map(m => ({target: m.target, from: m.from, reason: m.reason})),
  promoted_count: promoted.length,
  promoted,
  separate_or_unresolved: audit.filter(x => x.batch === 4 && x.action !== 'same_person'),
  counts_before: baseline,
  counts_after: counts
});

console.log(JSON.stringify({batch: 4, merges: batchMerges.length, promoted: promoted.length, counts}, null, 2));
