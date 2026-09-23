# Adjudication v2 methodology

The number of individually identifiable Tannaim and Amoraim found according to the Toladot methodology and processed source corpus.

The count is the currently accepted research subset, not a final census of all historical sages. Unresolved candidate records are excluded, and are not equivalent to additional people.

1. Preserve the original dataset and all source snapshots. Rebuild this directory from those inputs.
2. Separate bibliographic see-references, patronymic name indexes and collective headings from individual identities. A see-reference never means the two names are the same person.
3. Merge only documented cases: consecutive fragments of a single biography, explicit alias equations, or manually compared names, primary teachings and biographical context. Honorific normalization only discovers candidates.
4. Recover historical classification only from explicit headings/subtitles. Do not classify a reciter of baraitot as a historical Tanna merely because he is called a tanna. Preserve variant-text cautions.
5. Separate profile identity from passage attribution. Quarantine contaminated annotation sets; do not transfer them wholesale to another homonym.
6. Retain independent generation schemes and source assertions. Do not invent dates, identifiers or teacher relationships. Relationships from merged records are retained as untransferred source fields pending assertion-level review.
7. Reopen formerly accepted identities when a new possible duplicate appears. Count accuracy takes priority over increasing the total.
8. Keep a source-backed decision audit, old-to-new ID redirects, excluded evidence and a prioritized queue for every surviving unresolved candidate.

Run from this directory: node adjudicate.mjs; node validate.mjs; node reports.mjs. All outputs remain research-only. The baseline, application and live database are unchanged.
