import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {norm} from '../lib.mjs';
import {extractProfileFields, compareProfiles, normalizedName, dafRef} from './research-lib.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const readLocal = n => JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8'));
const writeLocal = (n, d) => fs.writeFileSync(path.join(dir, n), JSON.stringify(d, null, 2) + '\n');

const master = readLocal('master-sages.json').sages;
const review = readLocal('manual-review-identities.json').records;
const redirects = readLocal('identity-redirects.json');
const chase = k => { let x = k; while (redirects[x]) x = redirects[x]; return x; };

const findings = {
  weak_primary: [],
  missing_classification: [],
  missing_aliases: [],
  canonical_name_collisions: [],
  suspicious_canonical_pairs: [],
  orphan_redirects: [],
  chronology_conflicts: []
};

for (const r of master) {
  if (!r.primary_chazal_evidence?.length) findings.weak_primary.push({key: r.identity_key, name: r.canonical_name_he});
  if (!r.classification) findings.missing_classification.push({key: r.identity_key, name: r.canonical_name_he});
  if (!(r.aliases || []).length) findings.missing_aliases.push({key: r.identity_key, name: r.canonical_name_he});
}

const byName = new Map();
for (const r of master) {
  const n = normalizedName(r);
  if (!n) continue;
  const list = byName.get(n) || [];
  list.push(r.identity_key);
  byName.set(n, list);
}
for (const [name, keys] of byName) {
  if (keys.length > 1) findings.canonical_name_collisions.push({name, keys});
}

for (let i = 0; i < master.length; i++) {
  for (let j = i + 1; j < master.length; j++) {
    const a = master[i], b = master[j];
    const pa = extractProfileFields(a), pb = extractProfileFields(b);
    const cmp = compareProfiles(pa, pb);
    if (cmp.shared_refs.length >= 1 && normalizedName(a) === normalizedName(b)) {
      findings.suspicious_canonical_pairs.push({
        keys: [a.identity_key, b.identity_key],
        name: a.canonical_name_he,
        shared_refs: cmp.shared_refs,
        negative: cmp.negative_evidence
      });
    }
  }
}

for (const [from, to] of Object.entries(redirects)) {
  if (!master.some(r => r.identity_key === chase(to)) && !review.some(r => r.identity_key === chase(to))) {
    findings.orphan_redirects.push({from, to});
  }
}

for (const r of master) {
  const gens = (r.generation || []).filter(g => /Sefaria/i.test(g.source || ''));
  const vals = gens.map(g => g.value);
  if (vals.length > 1 && new Set(vals).size > 1) {
    findings.chronology_conflicts.push({key: r.identity_key, name: r.canonical_name_he, generations: vals});
  }
}

writeLocal('canonical-audit.json', {
  generated_at: new Date().toISOString(),
  canonical_count: master.length,
  review_count: review.length,
  summary: Object.fromEntries(Object.entries(findings).map(([k, v]) => [k, v.length])),
  findings
});
console.log('Canonical audit written:', Object.fromEntries(Object.entries(findings).map(([k, v]) => [k, v.length])));
