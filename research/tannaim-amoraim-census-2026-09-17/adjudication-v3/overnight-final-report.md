# Overnight Adjudication Final Report

Generated: 2026-09-18

## Summary

Autonomous overnight adjudication continued from the adjudication-v3 checkpoint. Two controlled batches (4 and 5) were completed with full validation after each batch. The checkpoint was internally consistent at start; no structural blockers were found.

**The census is not complete.** 3,416 candidate records remain unresolved. Accuracy was prioritized over merge volume.

---

## Counts

| Metric | Start (v3 checkpoint) | End (after batch 5) | Δ |
|--------|----------------------:|--------------------:|--:|
| **Canonical sages** | **810** | **814** | **+4** |
| Tannaim | 213 | 213 | 0 |
| Amoraim | 597 | 601 | +4 |
| — Eretz Israel | 78 | 79 | +1 |
| — Babylonia | 127 | 129 | +2 |
| — mixed/unknown | 392 | 393 | +1 |
| High confidence | 293 | 296 | +3 |
| Medium confidence | 517 | 518 | +1 |
| Unresolved candidate records | 3,443 | 3,416 | −27 |
| Suspected duplicate pairs | 460 | 429 | −31 |

---

## Overnight adjudication activity

| Category | Count |
|----------|------:|
| Batches completed | 2 (batch 4, batch 5) |
| Confirmed merges (same person) | 23 |
| New canonical promotions | 4 |
| Documented separate identities | 2 |
| Left ambiguous (insufficient evidence) | 2 |
| Excluded as non-sages / out-of-scope | 0 (no new exclusions) |

### Promotions to canonical count (this run)

1. **רִבִּי יוֹסָנָא** (`sefaria:rebbi-yosana`) — batch 4, high confidence
2. **אבימי** (`sefaria:avimi`) — batch 5, high confidence (after homonym disambiguation from Avimi I)
3. **גניבא** (`sefaria:geniva`) — batch 5, high confidence
4. **רִבִּי גּוּרִיוֹן** (`sefaria:rebbi-gorion`) — batch 5, medium confidence

### Notable merges (identity resolved, still in review)

- **רבנאי** (`hewiki:2176997` ← `bonayich:2657`) — merged but blocked from promotion by unresolved Hyman bibliography stubs
- **רבי חזקיה** (`sefaria:rabbi-hizkiyah` ← `hewiki:1493473`) — merged; Hyman stub partner remains flagged
- **אנטונינוס** (`sefaria:antoninus1` ← Bonayich + Hyman) — consolidated; no Tanna/Amora classification (correctly uncounted as sage)
- 12 additional Bonayich/Hyman/Sefaria consolidations for minor figures (Ronia, Denku, Zigod, Doratai, Alksa, Androlinai, Ablat, Zonin, Herod, Rabbi Zakkai, Botnit, Zevida, Alexander, Gevini)

### Documented separate identities (not merged)

| Keys | Reason |
|------|--------|
| `sefaria:avimi` / `heiman:333278` | Hyman Avimi I (father of Ada/Tachlifa bar Avimi) ≠ second-generation Amora Avimi |
| `hewiki:2176997` / `hyman-section:b5b65d4b1a0af20c2da9` | Berakhot 38b Ravnai variant should read Rava per Dikdukei Sofrim; not Ravnai brother of R. Hiyya bar Abba |

### Left ambiguous (insufficient evidence)

| Keys | Reason |
|------|--------|
| `sefaria:rabbi-hama-b-bisa` / `hewiki:2095590` | 3 shared passages but conflicting Tanna vs Amora classifications |
| `sefaria:rav-huna` / `hyman-section:32a37ab9d57da53aa0d0` | Major sage; only 1 shared passage — name-level candidate insufficient |

---

## Validation

All structural checks **pass** after batch 5:

- Input record conservation: 4,276 ✓
- Primary source segment verification: 9,368+ records ✓
- No duplicate person IDs, identity keys, or external IDs in counted set ✓
- Count reconciliation: tannaim + amoraim = total ✓

Result: `PASSED_STRUCTURAL_CHECKS_WITH_RESEARCH_LIMITATIONS`

---

## Remaining high-priority unresolved cases

171 classified records have **only** duplicate-identity flags but **zero shared primary passages** with their flagged partners — these are name-normalization candidates requiring manual passage comparison (e.g. Rav Bibi, R. Hiyya bar Ami, R. Mesharshiya). **Not auto-merged** to preserve evidence standard.

From `priority-research-cases.json` (unchanged, still open):

- **Rav Hamnuna numbering** — cross-source numbering disagreement; no safe crosswalk
- **Rabbi Yehudah ben Beteira I/II** — Wikipedia distinguishes; Sefaria links both to first article
- **Rabbi Yitzhak** — profile resolved; mixed passage quarantine retained

---

## Source / tool status

| Item | Status |
|------|--------|
| `node decide-batch-4.mjs` | OK |
| `node decide-batch-5.mjs` | OK |
| `node validate.mjs` | OK (after each batch) |
| Cursor npm task-detection warning | Ignored per instructions; scripts invoked directly with `node` |
| Network / external sources | Not required; used cached corpus and downloaded snapshots |

No failures blocked progress.

---

## Files modified

### New files
- `checkpoint-analysis-pre-batch-4.md`
- `decide-batch-4.mjs`
- `decide-batch-5.mjs`
- `batch-4-report.json`
- `batch-5-report.json`
- `overnight-final-report.md` (this file)
- `checkpoints/pre-batch-4/` (snapshot)
- `checkpoints/pre-batch-5/` (snapshot)

### Updated data files
- `master-sages.json`
- `counts.json`
- `manual-review-identities.json`
- `identity-redirects.json`
- `adjudication-audit.json`
- `merged-source-records.json`
- `suspected-duplicates.json`
- `change-report.json`
- `validation-report.json`

### Not modified
- `adjudication-v2/` (baseline preserved)
- `package.json` (per instructions)
- Live Toladot database / application

---

## Checkpoint / output location

```
research/tannaim-amoraim-census-2026-09-17/adjudication-v3/
```

Recoverable checkpoints:
- `checkpoints/pre-batch-4/`
- `checkpoints/pre-batch-5/`

---

## Final canonical lists (counts only)

| Classification | Count |
|----------------|------:|
| **Tannaim** | **213** |
| **Amoraim** | **601** |
| **Total** | **814** |

Full lists: `master-sages.json` (filter by `classification`).

---

## Conclusion

Overnight work productively advanced adjudication with **23 evidence-backed merges** and **4 new canonical sages**, while explicitly documenting homonym separations and classification conflicts. The remaining 3,416 unresolved records are predominantly name-level duplicate candidates and bibliographic stubs that require passage-level review. **The census remains incomplete by design** until those cases receive individual evidence assessment.
