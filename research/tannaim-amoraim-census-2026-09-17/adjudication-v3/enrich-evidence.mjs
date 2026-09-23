import fs from 'node:fs';
import path from 'node:path';
import {read, flatRef, norm, clean} from '../lib.mjs';
import {dir, readLocal, writeLocal, dafRef} from './research-lib.mjs';

const pointers = read('hyman-primary-citation-pointers.json');
const manifest = read('corpus-manifest.json');
const review = readLocal('manual-review-identities.json').records;
const byKey = new Map(review.map(r => [r.identity_key, r]));
const corpusCache = new Map();
let enriched = 0;

function corpusBook(ref) {
  const bookTitle = ref.split(' ')[0] === 'Jerusalem' ? ref.split(', ').slice(0, 2).join(', ') : ref.split(' ')[0];
  return manifest.books.find(b => b.title === bookTitle || ref.startsWith(b.title));
}

function segmentForRef(book, ref) {
  const data = corpusCache.get(book.key) || read('raw/corpus/' + book.key + '.json');
  corpusCache.set(book.key, data);
  for (const [key] of Object.entries(data.text || {})) {
    if (flatRef(data, key) === ref || dafRef(flatRef(data, key)) === dafRef(ref)) return {data, key, flat: flatRef(data, key)};
  }
  return null;
}

for (const p of pointers) {
  const r = byKey.get(p.identity_key);
  if (!r) continue;
  const existing = new Set(r.primary_chazal_evidence.map(e => dafRef(e.ref)));
  if (existing.has(dafRef(p.ref))) continue;
  const book = corpusBook(p.ref);
  if (!book) continue;
  const seg = segmentForRef(book, p.ref);
  if (!seg) continue;
  const text = seg.data.text[seg.key];
  if (!text?.trim()) continue;
  const alias = r.aliases.find(a => a.language === 'he')?.name || r.canonical_name_he;
  if (!norm(text).includes(norm(alias))) continue;
  r.primary_chazal_evidence.push({
    ref: seg.flat, url: 'https://www.sefaria.org/' + encodeURIComponent(seg.flat.replaceAll(' ', '_')),
    book: book.title, corpus: book.categories, export_source: book.cltk_flat_url,
    export_segment_key: seg.key, mention: alias,
    excerpt: clean(text).slice(0, 500), excerpt_is_normalized: true,
    identity_attribution: 'Hyman/Wikipedia citation plus Hebrew subject-name occurrence',
    evidence_stratum: 'primary_corpus', secondary_identity_anchor: p.source,
    secondary_citation_template: p.original_reference
  });
  enriched++;
}

writeLocal('manual-review-identities.json', {count_unit: 'candidate records, not people', records: review});
console.log('Enriched', enriched, 'primary evidence records from Hyman citation pointers');
