import fs from 'node:fs';
import path from 'node:path';
import {
  dir, readLocal, writeLocal,   extractProfileFields, compareProfiles,
  corpusMentionsForKeys, triageRecord, normalizedName, hymanForRecord, hymanEntries
} from './research-lib.mjs';
import {norm} from '../lib.mjs';

const args = new Set(process.argv.slice(2));
const TRIAGE_ONLY = args.has('--triage-only');
const PHASE = Number(process.env.RESEARCH_PHASE || process.argv.find(a => a.startsWith('--phase='))?.split('=')[1] || 1);
const BATCH = Number(process.env.RESEARCH_BATCH || process.argv.find(a => a.startsWith('--batch='))?.split('=')[1] || 1);
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 80);
const PHASE2_START = Number(process.env.PHASE2_START || 57);

function loadReview() {
  return readLocal('manual-review-identities.json').records;
}

function loadPairs() {
  const redirects = readLocal('identity-redirects.json');
  const chase = k => { let x = k; while (redirects[x]) x = redirects[x]; return x; };
  const pairs = readLocal('suspected-duplicates.json').pairs.map(p => ({
    ...p,
    identity_keys: [...new Set(p.identity_keys.map(chase))]
  })).filter(p => p.identity_keys.length > 1);
  const byKey = new Map();
  for (const p of pairs) for (const k of p.identity_keys) {
    const list = byKey.get(k) || [];
    for (const o of p.identity_keys) if (o !== k && !list.includes(o)) list.push(o);
    byKey.set(k, list);
  }
  return {pairs, byKey};
}

function initProgress(total) {
  const existing = fs.existsSync(path.join(dir, 'research-progress.json'))
    ? readLocal('research-progress.json') : null;
  if (existing?.starting_unresolved === total) return existing;
  return {
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    starting_unresolved: total,
    ending_unresolved: total,
    candidates_inspected: 0,
    candidates_deeply_researched: 0,
    confirmed_merges: 0,
    confirmed_separations: 0,
    canonical_promotions: 0,
    exclusions: 0,
    reviewed_still_ambiguous: 0,
    completely_unreviewed: total,
    batches_completed: 0,
    research_sources_used: ['manual-review-identities', 'suspected-duplicates', 'hyman-entries', 'corpus-mentions.jsonl', 'primary_chazal_evidence'],
    status_by_key: {}
  };
}

function saveProgress(progress, reviewLen) {
  progress.updated_at = new Date().toISOString();
  progress.ending_unresolved = reviewLen;
  const statuses = Object.values(progress.status_by_key);
  progress.candidates_inspected = statuses.filter(s => s !== 'unreviewed').length;
  progress.candidates_deeply_researched = statuses.filter(s => ['researched', 'adjudicated', 'deferred', 'ambiguous'].includes(s)).length;
  progress.completely_unreviewed = statuses.filter(s => s === 'unreviewed').length;
  writeLocal('research-progress.json', progress);
}

function runTriage(records, byKey) {
  const triage = {};
  const summary = {A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0};
  for (const r of records) {
    const partners = byKey.get(r.identity_key) || [];
    const t = triageRecord(r, partners);
    triage[r.identity_key] = {
      category: t.category,
      label: t.label,
      priority: t.priority,
      duplicate_partners: partners,
      reviewed_at: new Date().toISOString()
    };
    summary[t.category]++;
  }
  writeLocal('research-triage.json', {generated_at: new Date().toISOString(), count: records.length, summary, records: triage});
  return {triage, summary};
}

function researchPair(a, b, corpusA, corpusB) {
  const pa = extractProfileFields(a);
  const pb = extractProfileFields(b);
  const cmp = compareProfiles(pa, pb);
  const corpusShared = (corpusA || []).filter(x => (corpusB || []).some(y => y.ref === x.ref));
  const ha = hymanForRecord(a), hb = hymanForRecord(b);
  const hymanLink = ha.some(x => hb.some(y => x.key === y.key || norm(x.title) === norm(y.title)));
  const findings = [];
  let recommendation = 'ambiguous';
  let confidence = 'low';

  if (cmp.negative_evidence.some(n => ['classification_conflict', 'generation_mismatch'].includes(n.kind))) {
    recommendation = 'separate';
    confidence = cmp.shared_refs.length ? 'medium' : 'high';
    findings.push('Negative: incompatible classification/generation between profiles.');
  } else if (cmp.shared_refs.length >= 2) {
    recommendation = 'merge';
    confidence = 'high';
    findings.push(`Positive: ${cmp.shared_refs.length} shared independently attributed primary passages.`);
  } else if (cmp.shared_refs.length === 1 && !cmp.negative_evidence.length) {
    recommendation = 'merge';
    confidence = 'medium';
    findings.push('Positive: one shared primary passage; profiles otherwise compatible.');
  } else if (corpusShared.length >= 2 && pa.classification === pb.classification && pa.classification) {
    recommendation = 'research_merge_candidate';
    confidence = 'medium';
    findings.push(`Corpus research: ${corpusShared.length} shared lexical occurrences at same refs.`);
  } else if (hymanLink && (a.hyman_entry_text || b.hyman_entry_text)) {
    recommendation = 'research_merge_candidate';
    confidence = 'medium';
    findings.push('Hyman: same biography section linked to both records.');
  } else if (normalizedName(a) === normalizedName(b) && pa.classification && pb.classification && pa.classification === pb.classification) {
    recommendation = 'ambiguous';
    confidence = 'low';
    findings.push('Same normalized name and classification but no shared primary passage found yet.');
  } else if (cmp.negative_evidence.length) {
    recommendation = 'separate';
    confidence = 'medium';
    findings.push('Negative evidence in profile comparison.');
  } else {
    findings.push('Insufficient evidence for merge or separation.');
  }

  return {
    a: a.identity_key, b: b.identity_key,
    name: a.canonical_name_he,
    recommendation, confidence, findings,
    comparison: cmp,
    corpus_shared: corpusShared,
    profiles: {a: pa, b: pb}
  };
}

function researchPromotionCandidate(r) {
  const p = extractProfileFields(r);
  const blockers = [...(r.review_reasons || [])];
  const onlyDup = blockers.length > 0 && blockers.every(x => x.startsWith('Possible duplicate identity:'));
  const kinds = new Set((r.secondary_identity_evidence || []).map(x => x.kind));
  const promotable = r.classification && r.primary_chazal_evidence?.length && (blockers.length === 0 || onlyDup);
  return {
    identity_key: r.identity_key,
    name: r.canonical_name_he,
    promotable,
    blockers,
    profile: p,
    confidence: kinds.has('hebrew_wikipedia') && (kinds.has('sefaria_identity') || kinds.has('hyman_1910_transcription')) ? 'high' : 'medium'
  };
}

function buildResearchGroups(records, triage, progress) {
  const byKey = new Map(records.map(r => [r.identity_key, r]));
  const phase1 = [], phase2Groups = [], promotions = [], profiles = [], hymanDisambig = [];
  const seenPairs = new Set();
  const addPair = (list, a, b, type, allowRededup = false) => {
    const pk = [a, b].sort().join('|');
    if (!allowRededup && seenPairs.has(pk) || a === b) return;
    if (allowRededup || !seenPairs.has(pk)) seenPairs.add(pk);
    if (byKey.has(a) && byKey.has(b)) list.push({type, keys: [a, b]});
  };
  const phase2 = PHASE >= 2 || BATCH >= PHASE2_START;

  const byName = new Map();
  for (const r of records) {
    const n = normalizedName(r);
    if (!n) continue;
    const list = byName.get(n) || [];
    list.push(r.identity_key);
    byName.set(n, list);
  }

  for (const r of records) {
    const t = triage[r.identity_key];
    if (!t || !['A', 'B'].includes(t.category)) continue;
    for (const partnerKey of t.duplicate_partners) addPair(phase1, r.identity_key, partnerKey, 'duplicate_pair');
  }

  const byHyman = new Map();
  for (const r of records) {
    const key = r.hyman_section_key;
    if (!key) continue;
    const list = byHyman.get(key) || [];
    list.push(r.identity_key);
    byHyman.set(key, list);
  }
  for (const keys of byHyman.values()) {
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) addPair(phase1, keys[i], keys[j], 'hyman_alias_pair');
    }
  }

  for (const keys of byName.values()) {
    if (keys.length < 2 || keys.length > 6) continue;
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const a = keys[i], b = keys[j];
        const pa = a.split(':')[0], pb = b.split(':')[0];
        if (pa === pb) continue;
        if (['heiman', 'hyman-section'].includes(pa) || ['heiman', 'hyman-section'].includes(pb)) {
          addPair(phase1, a, b, 'cross_source_pair');
        }
      }
    }
  }

  if (phase2) {
    for (const r of records) {
      const t = triage[r.identity_key];
      if (t?.category === 'C' && progress.status_by_key[r.identity_key] !== 'adjudicated') {
        const sections = hymanForRecord(r);
        if (sections.length > 1) hymanDisambig.push({type: 'hyman_disambiguation', keys: [r.identity_key], sections: sections.map(s => s.key)});
      }
      if (!t || !['C', 'D'].includes(t.category)) continue;
      for (const partnerKey of t.duplicate_partners) addPair(phase2Groups, r.identity_key, partnerKey, 'alias_pair');
      const nameKeys = byName.get(normalizedName(r)) || [];
      for (const partnerKey of nameKeys) {
        if (partnerKey === r.identity_key) continue;
        addPair(phase2Groups, r.identity_key, partnerKey, 'alias_pair');
      }
    }

    const {pairs} = loadPairs();
    for (const p of pairs) {
      const [a, b] = p.identity_keys;
      if (a && b) addPair(phase2Groups, a, b, 'suspected_duplicate_recheck', true);
    }

    for (const r of records) {
      const t = triage[r.identity_key];
      if (t?.category !== 'A') continue;
      if (!['reviewed', 'ambiguous'].includes(progress.status_by_key[r.identity_key])) continue;
      for (const partnerKey of t.duplicate_partners) addPair(phase2Groups, r.identity_key, partnerKey, 'duplicate_recheck', true);
    }
  }

  for (const r of records) {
    if (triage[r.identity_key]?.category === 'F') promotions.push({type: 'promotion', keys: [r.identity_key]});
  }

  for (const r of records) {
    const t = triage[r.identity_key];
    if (!['E', 'I'].includes(t?.category)) continue;
    const st = progress.status_by_key[r.identity_key];
    if (['researched', 'ambiguous', 'adjudicated'].includes(st)) continue;
    profiles.push({type: 'profile_build', keys: [r.identity_key]});
  }

  return phase2 ? [...phase2Groups, ...hymanDisambig, ...promotions, ...profiles] : [...phase1, ...promotions, ...profiles];
}

async function runResearchBatch(records, triage, progress) {
  const byKey = new Map(records.map(r => [r.identity_key, r]));
  const groups = buildResearchGroups(records, triage, progress);
  const phase2 = PHASE >= 2 || BATCH >= PHASE2_START;
  const offset = phase2 ? (BATCH - PHASE2_START) * BATCH_SIZE : (BATCH - 1) * BATCH_SIZE;
  const slice = groups.slice(offset, offset + BATCH_SIZE);
  const results = {duplicate_research: [], promotion_research: [], profile_research: [], adjudication_candidates: [], total_groups: groups.length};

  const allKeys = [...new Set(slice.flatMap(g => g.keys))];
  const corpus = await corpusMentionsForKeys(allKeys);

  for (const g of slice) {
    if (['duplicate_pair', 'hyman_alias_pair', 'cross_source_pair', 'alias_pair', 'suspected_duplicate_recheck', 'duplicate_recheck'].includes(g.type)) {
      const [ka, kb] = g.keys;
      const a = byKey.get(ka), b = byKey.get(kb);
      const res = researchPair(a, b, corpus.get(ka), corpus.get(kb));
      results.duplicate_research.push(res);
      for (const k of g.keys) progress.status_by_key[k] = 'researched';
      if (['merge', 'separate'].includes(res.recommendation) && res.confidence !== 'low') {
        results.adjudication_candidates.push({
          action: res.recommendation === 'merge' ? 'same_person' : 'separate_identity',
          keys: g.keys,
          confidence: res.confidence,
          reason: res.findings.join(' '),
          evidence: {shared_refs: res.comparison.shared_refs, negative: res.comparison.negative_evidence}
        });
      } else {
        progress.status_by_key[ka] = progress.status_by_key[kb] = 'ambiguous';
        progress.reviewed_still_ambiguous += 2;
      }
    } else if (g.type === 'promotion') {
      const r = byKey.get(g.keys[0]);
      const res = researchPromotionCandidate(r);
      results.promotion_research.push(res);
      progress.status_by_key[g.keys[0]] = res.promotable ? 'researched' : 'ambiguous';
      if (res.promotable && res.blockers.length === 0) {
        results.adjudication_candidates.push({
          action: 'promote', keys: [r.identity_key], confidence: res.confidence,
          reason: 'Classification, primary evidence, and corroborating identity sources; no unresolved review flags.'
        });
      }
    } else if (g.type === 'hyman_disambiguation') {
      const r = byKey.get(g.keys[0]);
      const sections = (g.sections || []).map(k => hymanEntries.find(x => x.key === k)).filter(Boolean);
      const classifications = [...new Set(sections.map(s => s.classification).filter(Boolean))];
      const cautions = sections.filter(s => s.identity_caution).map(s => s.identity_caution);
      const res = {
        identity_key: r.identity_key,
        name: r.canonical_name_he,
        hyman_sections: sections.map(s => ({key: s.key, title: s.title, classification: s.classification})),
        classification_conflict: classifications.length > 1,
        identity_cautions: cautions,
        recommendation: classifications.length > 1 ? 'separate_homonyms' : (sections.length > 1 ? 'likely_same_person_multiple_sections' : 'ambiguous')
      };
      results.profile_research.push({...res, profile: extractProfileFields(r), category: 'C'});
      progress.status_by_key[g.keys[0]] = 'researched';
      if (res.recommendation === 'separate_homonyms' && res.confidence !== 'low') {
        results.adjudication_candidates.push({
          action: 'document_ambiguity',
          keys: [r.identity_key],
          confidence: 'medium',
          reason: `Multiple Hyman sections with conflicting classification: ${classifications.join(' vs ')}`,
          evidence: {hyman_sections: res.hyman_sections, cautions}
        });
      }
    } else if (g.type === 'profile_build') {
      const r = byKey.get(g.keys[0]);
      const p = extractProfileFields(r);
      results.profile_research.push({identity_key: r.identity_key, name: r.canonical_name_he, profile: p, category: triage[r.identity_key]?.category});
      progress.status_by_key[g.keys[0]] = 'researched';
    }
  }

  const batchPath = `research-batch-${BATCH}-results.json`;
  writeLocal(batchPath, {generated_at: new Date().toISOString(), batch: BATCH, offset, count: slice.length, results});
  progress.batches_completed = Math.max(progress.batches_completed, BATCH);
  return results;
}

async function main() {
  const records = loadReview();
  const {byKey} = loadPairs();
  let progress = initProgress(records.length);

  const {triage, summary} = runTriage(records, byKey);
  console.log('Triage summary:', summary);

  for (const r of records) {
    if (!progress.status_by_key[r.identity_key]) progress.status_by_key[r.identity_key] = 'reviewed';
  }
  progress.completely_unreviewed = 0;
  saveProgress(progress, records.length);

  if (TRIAGE_ONLY) {
    console.log('Triage complete for', records.length, 'records');
    return;
  }

  const results = await runResearchBatch(records, triage, progress);
  console.log('Batch', BATCH, 'duplicate research:', results.duplicate_research.length);
  console.log('Batch', BATCH, 'promotion research:', results.promotion_research.length);
  console.log('Batch', BATCH, 'adjudication candidates:', results.adjudication_candidates.length);
  saveProgress(progress, records.length);
}

main().catch(e => { console.error(e); process.exitCode = 1; });
