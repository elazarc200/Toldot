import {readLocal, writeLocal, normalizedName, hymanEntries} from './research-lib.mjs';
import {norm} from '../lib.mjs';

const review = readLocal('manual-review-identities.json').records;
const triage = readLocal('research-triage.json').records;
let linked = 0, classified = 0;

const sectionByTitle = new Map();
for (const e of hymanEntries) {
  const t = norm(e.title.replace(/\s*\([^)]*\)\s*/g, ''));
  if (!sectionByTitle.has(t)) sectionByTitle.set(t, e);
}

for (const r of review) {
  const t = triage[r.identity_key];
  if (!t || !['C', 'E'].includes(t.category)) continue;
  if (r.hyman_section_key) continue;
  const name = normalizedName(r);
  const section = sectionByTitle.get(name);
  if (!section) continue;
  r.hyman_section_key = section.key;
  if (!r.hyman_entry_text && section.text) r.hyman_entry_text = section.text;
  if (!r.classification && section.classification) {
    r.classification = section.classification;
    r.classification_assertions.push({
      value: section.classification,
      source: {kind: 'hyman_1910_transcription', url: section.parts?.[0]?.url, detail: section.title},
      quotation: section.classification_basis,
      assessment: 'Explicit Tanna/Amora heading in Hyman biography opening.'
    });
    classified++;
  }
  linked++;
}

writeLocal('manual-review-identities.json', {count_unit: 'candidate records, not people', records: review});
console.log(JSON.stringify({linked, classified}, null, 2));
