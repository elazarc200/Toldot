# Toladot — corpus-wide research census

The number of individually identifiable Tannaim and Amoraim found according to the Toladot methodology and processed source corpus.

**790 resolved, source-backed records under the current conservative rules. This is a lower-bound research result, not a completed identification of every historical Tanna and Amora.** The full selected corpus was scanned; 3799 candidate records remain outside the unique-person count. They include possible aliases, contemporaries, unresolved classification, and missing/disputed identity evidence. They must not be added to the count as people.

| Measure | Count |
|---|---:|
| Tannaim | 199 |
| Amoraim | 591 |
| Amoraim — Eretz Israel | 75 |
| Amoraim — Babylonia | 121 |
| Amoraim — mixed/unknown | 395 |
| Total unique sages in the resolved dataset | 790 |
| High-confidence identities | 268 |
| Medium-confidence identities | 522 |
| Manual-review candidate records (not unique people) | 3799 |
| Suspected duplicate pairs | 569 |
| Records involved in suspected duplicate pairs | 982 |
| Counted records with direct primary Chazal evidence | 790 |

## Deliverables

- [Master machine-readable dataset](master-sages.json)
- [Manual-review identities](manual-review-identities.json)
- [Possible duplicates](suspected-duplicates.json)
- [Source coverage](source-coverage-report.md) and [JSON](source-coverage-report.json)
- [Validation](validation-report.md) and [JSON](validation-report.json)
- [Methodology](methodology.md)
- [Merge decisions and proof](merge-audit.json)
- [Explicit disambiguation decisions](identity-decisions.json)
- [All discovered name occurrences](discovered-name-occurrences.json) — discovery inventory, not people

## Isolation

All files in this folder are research artifacts. No live database, map/UI, migrations, or existing project files were changed by this census. No import was performed.

## Reproduce

Run `node full-census.mjs` in this folder for the offline processing and reports. Run with `--collect` to collect missing public-source cache files first (network access required). Raw files, source revisions, URLs, export coordinates and corpus SHA-256 values are retained.

## Remaining work

Resolve the manual-review queue before treating this as a comprehensive final person census. Priority is source-backed duplicate reconciliation and unclassified rare sages, followed by missing transcription/variant evidence. A blank field is unknown, not evidence that no such relationship exists.
