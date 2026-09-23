# Research Run Final Report (Phase 2)

Generated: 2026-09-18

## Executive summary

Continued adjudication-v3 with **deeper evidence research** as directed. Merge evidence threshold was **not** lowered. All 3,412 starting candidate records were inspected; 3,218 received deep research (pair comparison, Hyman disambiguation, corpus lookup, or structured profiling). One additional high-confidence merge was applied after passage-level recheck.

**The census is not complete.** 3,410 candidate records remain unresolved, but **zero records are completely unreviewed**.

---

## Progress metrics

| Metric | Value |
|--------|------:|
| **STARTING UNRESOLVED** | **3,412** |
| **CANDIDATES ACTUALLY INSPECTED** | **3,412** (100%) |
| **CANDIDATES DEEPLY RESEARCHED** | **3,218** (researched + ambiguous pair work) |
| **CONFIRMED MERGES** | **2** (research session: Achadvoi slug + Rav Huna/Hyman) |
| **CONFIRMED SEPARATIONS** | **4** (Hama bar Bisa Tanna/Amora; Tzadok I/II; Avimi I/Amora Avimi; Ravnai/Rava variant) |
| **NEW CANONICAL SAGES** | **+4** net (814 → 818, incl. overnight promotions) |
| **EXCLUSIONS** | 0 |
| **REVIEWED BUT STILL AMBIGUOUS** | **730** |
| **COMPLETELY UNREVIEWED** | **0** |
| **ENDING UNRESOLVED** | **3,410** |

### Canonical counts

| Classification | Count |
|----------------|------:|
| Tannaim | 214 |
| Amoraim | 604 |
| **Total canonical** | **818** |

---

## Research batches completed: 78

### Phase 1 (batches 1–38)
- Full triage of all 3,412 records
- 167 duplicate-pair researches (batches 1–3)
- 1,419+ structured profile builds (batches 7–38)
- Apply batch 1: Achadvoi merge, 2 separations, 4 promotions

### Phase 2a (batches 39–56) — superseded
- Initial phase-2 group ordering bug caused profile rebuilds instead of pair recheck; results retained for audit but pair offset reset at batch 57.

### Phase 2b (batches 57–78)
- **620 suspected-duplicate pair rechecks** (all 426 duplicate pairs re-researched with enriched profiles)
- **527 Hyman disambiguation** researches (category C: multiple Hyman sections per record)
- **19 promotion reviews** (category F; all blocked by shared Wikipedia pages or unresolved duplicate flags)
- **1 high-confidence merge applied:** `sefaria:rav-huna` ← `hyman-section:32a37ab9d57da53aa0d0` (3 shared primary passages: Arakhin 16b, Beitzah 21a, Bekhorot 17a)

### Pair research outcomes (batches 57–78)

| Recommendation | Count |
|----------------|------:|
| `research_merge_candidate` | 506 |
| `ambiguous` | 113 |
| `merge` (high confidence) | 1 |

506 pairs show corpus co-occurrence at shared refs but **lack independently attributed shared primary passages** — correctly left unresolved.

---

## Level 6 canonical audit

| Finding | Count |
|---------|------:|
| Weak primary evidence (canonical) | 0 |
| Missing classification | 0 |
| Canonical name collisions | 21 |
| Suspicious canonical pairs (shared refs + same name) | 10 |
| Orphan redirects | 0 |
| Chronology conflicts | 0 |

Output: `canonical-audit.json`

---

## Confirmed decisions (evidence-backed)

### Merges
| Target | From | Basis |
|--------|------|-------|
| `sefaria:rav-ahadvoi-b-ami` | `sefaria:rav-achadvoi-b-ami` | Sefaria slug duplicate; manual anchor Bava Batra 9b:2 |
| `sefaria:rav-huna` | `hyman-section:32a37ab9d57da53aa0d0` | 3 shared independently attributed primary passages |

### Separations
| Keys | Basis |
|------|-------|
| `sefaria:rabbi-hama-b-bisa` / `hewiki:2095590` | Tanna vs Amora classification conflict |
| `sefaria:rabbi-tzadok-(i)` / `sefaria:rabbi-tzadok-(ii)` | Sefaria T2 vs T5 numbered homonyms |
| `sefaria:avimi` / `heiman:333278` | Avimi I ≠ second-gen Amora Avimi |
| `hewiki:2176997` / `hyman-section:b5b65d4b1a0af20c2da9` | Berakhot 38b Ravnai variant = Rava |

### Correctly NOT merged
- **Aivu** (`bonayich:336` / `hewiki:1247827`): same-ref lexical overlap, different narrative contexts
- **506 research_merge_candidate pairs**: corpus lexical matches without verified shared primary attribution
- **Name-only pairs** (Rav Bibi, R. Hiyya bar Ami, etc.)

---

## Triage distribution (all 3,412)

| Cat | Label | Count |
|-----|-------|------:|
| A | strong_duplicate_candidate | 166 |
| C | possible_alias (Hyman) | 527 |
| D | generational_collision | 7 |
| E | insufficient_identification | 1,551 |
| F | likely_unique_sage | 19 |
| I | genuinely_ambiguous | 1,142 |

---

## Validation

All structural checks **pass** after research session.

---

## Research sources used

- `manual-review-identities.json`
- `suspected-duplicates.json` (426 pairs, all rechecked)
- `corpus-mentions.jsonl` (85MB lexical index)
- `hyman-entries.json` (2,349 sections)
- `hyman-primary-citation-pointers.json`
- `raw/corpus/*.json`
- Hebrew Wikipedia / Wikidata metadata
- `research-profiles.json` (3,410 profiles)
- `canonical-audit.json`

---

## Difficult unresolved groups (deferred)

| Group | Issue |
|-------|-------|
| Rav Hamnuna I/II/III | Numbering crosswalk unresolved |
| Rabbi Yehudah ben Beteira I/II | Wikipedia distinguishes; Sefaria links both |
| Rabbi Abahu | Multiple Wikipedia persons share Hyman entry |
| Rav Ada bar Ahavah (1)/(2) | Shared Wikipedia disambiguation page |
| ~160 category-A pairs | Same name + classification, no shared primary after deep research |
| 1,551 category-E | Heiman bibliography stubs needing passage attribution |
| 21 canonical name collisions | Distinct canonical sages with identical normalized names |

---

## Checkpoint locations

```
research/tannaim-amoraim-census-2026-09-17/adjudication-v3/
├── research-progress.json
├── research-triage.json
├── research-profiles.json
├── canonical-audit.json
├── research-batch-{1..78}-results.json
├── checkpoints/post-research-batch-{57,60,65,70,75,78}/
└── checkpoints/pre-batch-4/, pre-batch-5/
```

---

## Why productive automated work is exhausted

1. **All 426 suspected-duplicate pairs** have been pair-researched twice (batches 1–3 and 57–78).
2. **All 527 category-C records** received Hyman disambiguation (0 classification conflicts found; multiple sections appear to describe same person).
3. **All E/I records** have structured profiles.
4. **506 pairs** remain `research_merge_candidate` — corpus co-occurrence without shared verified primary attribution; merging would violate evidence standard.
5. **19 promotion candidates** blocked by unresolved duplicate flags or shared Wikipedia disambiguation pages.
6. Further resolution requires **manual passage-by-passage scholarly reading** or new attribution NLP beyond lexical matching.

---

## Commands to resume

```bash
node adjudication-v3/research-run.mjs --phase=2 --batch=79
node adjudication-v3/apply-research-batch.mjs 79
node adjudication-v3/enrich-evidence.mjs
node adjudication-v3/link-heiman-hyman.mjs
node adjudication-v3/build-profiles.mjs
node adjudication-v3/canonical-audit.mjs
node adjudication-v3/validate.mjs
```
