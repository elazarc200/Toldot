# Adjudication v3 Checkpoint Analysis — Pre-Batch 4

Generated: 2026-09-18 (overnight run)

## Executive summary

The adjudication-v3 checkpoint is **internally consistent** and safe to continue. All structural validation checks pass. The methodology from v2 is preserved in `decide.mjs`; v3 applied 23 evidence-backed merges and promoted 23 identities into the canonical counted set.

---

## 1. Current canonical sage count

| Metric | Count |
|--------|------:|
| **Total unique sages (canonical)** | **810** |
| Tannaim | 213 |
| Amoraim | 597 |
| — Eretz Israel | 78 |
| — Babylonia | 127 |
| — mixed/unknown region | 392 |
| High confidence | 293 |
| Medium confidence | 517 |

Source: `counts.json`, `master-sages.json`

---

## 2–4. Tannaim / Amoraim / Unresolved counts

- **Tannaim:** 213 (in `master-sages.json`, `classification === 'Tanna'`)
- **Amoraim:** 597 (in `master-sages.json`, `classification === 'Amora'`)
- **Unresolved candidate records:** 3,443 (in `manual-review-identities.json`)

**Important:** 3,443 is the count of *candidate records awaiting review*, not 3,443 additional historical people. The README explicitly states this distinction.

---

## 5. Confirmed merge / redirect count

| Pass | Merges | Redirects in `identity-redirects.json` |
|------|-------:|---------------------------------------:|
| v2 (baseline input to v3) | 16+ (from prior passes) | carried forward |
| v3 (`decide.mjs`) | 23 | 23 |

v3 redirects include: Sumkhos, Rabbi Zerika, Amemar, Karna, Zeiri, Ilfa, Eifa, Beruriah, Admon, Peleimu, Meremar, Hulphana, Bali, Rav Aha bar Rav, Rabbi Shabbethai, Rav Haga, Hutzpit, Abba Yose Hali-kofri, Rabbi Yeshevav, Abba Eleazar ben Dulaai, Ashyan, Rav Hinak, and others.

Input record conservation: **4,276 in = 4,276 out** ✓

---

## 6. Evidence / adjudication representation

Each sage record carries:

- `primary_chazal_evidence[]` — verified Hebrew occurrence at independently attributed passage (ref, excerpt, url, export coordinates)
- `secondary_identity_evidence[]` — encyclopedia / Sefaria / Hyman / Bonayich identity references
- `classification_assertions[]` — explicit Tanna/Amora claims with source provenance
- `review_reasons[]` — flags blocking promotion to canonical count
- `adjudicated_source_records[]` / `untransferred_source_fields[]` — merge provenance; relationships retained separately

Adjudication decisions are logged in `adjudication-audit.json` with actions:

- `same_person` — merge with `primary_comparison`, `reason`, `secondary_sources`
- `classify_named_mishnaic_authority` — explicit Mishnah teaching establishes Tannaitic authority
- `correct_role_vs_period` — role label (e.g. תנא דרבי אמי) vs historical period
- `one_person_period_unknown` — identity resolved, classification explicitly unknown

Merged source bodies archived in `merged-source-records.json`.

---

## 7. `decide.mjs` behavior

- **Input:** reads `adjudication-v2/master-sages.json` and `manual-review-identities.json`
- **Does not modify v2** — writes only to `adjudication-v3/`
- **Merge gate:** requires shared independently attributed primary passage (`primary_comparison`) OR explicit `manualAnchor` ref; throws if missing
- **Recomputes:** master vs review split, suspected-duplicate pairs, counts, redirects, audit, change-report
- **Promotion rule:** `classification` + `primary_chazal_evidence.length` + empty `review_reasons` → `master-sages.json`
- **23 hard-coded merges** from manual evidence review (not name-only)

---

## 8. `validate.mjs` behavior

Structural checks against downloaded corpus (`corpus-manifest.json`, `raw/corpus/*.json`):

| Check | Status |
|-------|--------|
| duplicate person/identity keys | pass |
| duplicate canonical names in counted set | pass |
| duplicate external IDs (wikidata, hewiki, bonayich) | pass |
| Tanna/Amora conflicts in counted set | pass (1 quarantined in review) |
| generation conflicts | pass |
| impossible chronology | pass_with_missing_data |
| primary source segment + name verification | pass (9,368 records) |
| counted records without sources | pass |
| input record conservation | pass (4276) |
| Yitzhak quarantine | pass |
| collectives not counted | pass |
| count reconciliation | pass |

Result: `PASSED_STRUCTURAL_CHECKS_WITH_RESEARCH_LIMITATIONS`

Validation does **not** certify historical completeness.

---

## 9. Next safest adjudication batch (Batch 4)

Prioritized by shared primary evidence + compatible classification:

### Tier A — classified Amora pairs, 2+ shared primary refs (promotion candidates)

| Target | From | Shared refs | Rationale |
|--------|------|------------:|-----------|
| `sefaria:avimi` | `hewiki:872771` | 10 | Same 2nd-gen Babylonian Amora, teacher of Rav Chisda; Hyman cites same passages |
| `hewiki:2176997` | `bonayich:2657` | 3 | Ravnai, brother of R. Hiyya bar Abba; matching Keritot/Bava Batra |
| `sefaria:rabbi-hizkiyah` | `hewiki:1493473` | 2 | Same Yerushalmi Beitzah/Berakhot anchors; compatible A4/A5 generation |
| `sefaria:geniva` | `heiman:381635` | 4 | Hyman: pupil of Rav; same Berakhot 25a/27a passages |
| `sefaria:rebbi-yosana` | `bonayich:1761` | 1 | Shared Avodah Zarah 33b:6 attributed teaching |

### Tier B — identity consolidation (no Tanna/Amora classification yet)

| Target | From | Shared refs | Notes |
|--------|------|------------:|-------|
| `sefaria:antoninus1` | `bonayich:520` | 7 | Roman emperor in Avodah Zarah narratives |
| `sefaria:antoninus1` | `heiman:333844` | 2+ | Hyman: Antoninus friend of Rabbi; Berakhot/Sanhedrin |
| `bonayich:2665` | `heiman:1710092` | 3 | Ronia, Bava Batra/Bava Metzia |
| `bonayich:887` | `heiman:1710512` | 2 | Denku |
| `bonayich:1012` | `heiman:1710624` | 2 | Zigod |
| `bonayich:865` | `heiman:1710480` | 2 | Doratai |
| `bonayich:406` | `heiman:333690` | 1 | Alksa |
| `bonayich:517` | `heiman:333838` | 1 | Androlinai |
| `bonayich:173` | `heiman:333340` | 1 | Ablat (Shabbat 129a) |
| `bonayich:1009` | `heiman:1710622` | 1 | Zonin |
| `sefaria:herod` | `heiman:1710566` | 2 | Herod (contemporary, unclassified) |
| `sefaria:rabbi-zakkai` | `heiman:1710643` | 2 | Rabbi Zakkai (unclassified) |

### Explicit non-merges (documented)

| Keys | Reason |
|------|--------|
| `heiman:333278` vs `sefaria:avimi` | Hyman "אבימי הראשון" = father of Ada/Tachlifa bar Avimi; **different person** from the major Amora |
| `sefaria:rabbi-hama-b-bisa` vs `hewiki:2095590` | Conflicting Tanna/Amora classifications; insufficient to force merge |
| Major figures (R. Yochanan, R. Meir, R. Zera, Rav Huna name-only pairs) | Same normalized name only; no shared primary passage equivalence established |

---

## 10. Unresolved count verification

| Source | Count |
|--------|------:|
| `counts.json` → `manual_review_candidate_records` | 3,443 |
| `validation-report.json` → `manual_review_candidate_records` | 3,443 |
| `manual-review-identities.json` → `records.length` | 3,443 |
| `change-report.json` baseline (v2) | 3,489 |
| v3 delta | −46 (23 merges × 2 records consolidated, net −23 from review + 23 promoted to master) |

**Conclusion:** Codex's reported 3,443 is accurate and consistent across all files.

---

## Structural consistency verdict

**SAFE TO CONTINUE.** No blockers found. Proceeding automatically to Batch 4 adjudication.
