# Geography source repair — final report

Generated: 2026-09-17  
Scope: `pilot.geography` source associations only. `people`, `edges`, and `teachings` were not rewritten.

## What was already done before this checkpoint

- Conservative matcher in `scripts/map-research/geo-citation-rules.cjs` (full sage name, no verse-as-place, no first-name collisions).
- Verifier rewritten as a classifier, not a generator: `scripts/map-research/verify-place-citations.cjs` (no parent/tractate walk, no adjacent concatenation, no retarget, no shared-id merge).
- Restore from HEAD + `sage-place-research.json`: `scripts/map-research/repair-geography-sources.cjs`.
- Pre-repair snapshot: `docs/research/backups/geography-sources-pre-repair.json`.
- UI: sage-place sources stay on sage folders; place card “מקורות על המקום” no longer dumps every sage citation (`placeCitationIds`).
- Regression tests: `tests/unit/geo-citation-rules.test.ts` (10/10), `verify-place-citations.test.ts` (2/2), and map flatten-guard in `toladot-map.test.tsx` (9/9) — **21/21 total**.

## What remained and was finished here

1. Restore + re-verify of geography associations against the current rules (`--apply --filter-display`).
2. Mishnah boundary: a cited mishnah is specific only with chapter **and** mishnah (`1.8` / `1:3`), never a chapter (`isSpecificUnitRef` uses `/\d+[.:]\d+$/`).
3. Jerusalem / Yavne / Lod / Tzippori / Sokho sanity dump (`tools/sanity-geo-repair.cjs`).
4. This report, with before/after counts.

## Before (broken verifier, pre-repair snapshot)

From the 2026-09-17 investigation and `geography-sources-pre-repair.json`:

| Metric | Value |
|---|---|
| Geography `personPlaces` | 118 |
| Displayed sage–place source ids | **187** |
| Rows whose `sourceIds` had been rewritten vs last commit | 112 / 118 |
| Verifier retargets (old pipeline) | 199 |
| Citation ids reused across distinct sage–place claims | 31 |
| Avot 1:3 shown for | Antigonus–Socho **and** Shimon ha-Tzaddik, Shimon ben Shetach, Shemaya, Shammai in Jerusalem |
| Avot 6:8 shown for | Yehuda ben Tabbai–Jerusalem **and** Rabban Gamliel–Jerusalem |

Root cause (unchanged): `verify-place-citations.cjs` used to search the whole tractate, match a single name token, concatenate neighbors, treat a quoted verse as a place, then merge records by Sefaria ref.

## After (current display)

From `docs/research/geography-source-audit.json` (`mode: apply-filter-display`):

| Classification | Associations | Shown on the map? |
|---|---|---|
| VALID_DIRECT | 68 | yes |
| VALID_INDIRECT | 1 | yes |
| AMBIGUOUS | 6 | no |
| UNVERIFIED | 14 | no |
| WRONG_PERSON | 41 | no |
| WRONG_CLAIM | 33 | no |
| IRRELEVANT | 27 | no |
| **Total classified** | **190** | **69 shown** |
| Fetch failures | 0 | |

| Metric | After |
|---|---|
| Displayed sage–place source ids | **63** (187 → 63) |
| `personPlaces` with a review list | 118 / 118 |
| `personPlaces` with nothing displayable | 65 / 118 (ids kept on `sourceIdsReviewed`, not deleted) |
| Shared display citation ids | **4**, all same-passage claims (Sanhedrin 32b; Kiddushin 40b; Sanhedrin 14a; Sifrei Devarim 80) |
| Avot 1:3 displayed on | **Antigonus · Socho only** |
| Avot 6:8 displayed on | **none** |
| Citation records deleted | **none** (548 remain) |
| `people` / `edges` hashes | unchanged (`d51d995b…` / `5bfd9091…`) |

Hidden associations are classified on `sourceIdsReviewed`. They are not destroyed.

## The three reported examples

1. **Avot 1:3 under Jerusalem** — no longer attached to any Jerusalem sage. It remains evidence for Antigonus at Socho, and for the transmission-tree edge Antigonus ← Shimon ha-Tzaddik.
2. **Antigonus’s source on Shimon ben Shetach** — gone. Shetach–Jerusalem now displays Sotah 47a (“מני ירושלים עיר הקודש”). Avot 1:8–9 is kept but hidden as `WRONG_CLAIM` (chain of pairs, not a place).
3. **Avot 6:8 on Yehuda ben Tabbai** — gone. Yehuda–Jerusalem now displays Yerushalmi Hagigah 2:2 (appointment/return). Avot 1:8 is hidden as `WRONG_CLAIM`.

## Sanity: five places

**Sokho** — only Antigonus; Avot 1:3. Correct.

**Jerusalem (21 sages)** — no Antigonus mishnah, no Avot 6:8. Place-proving sources remain for Yose ben Yohanan, Joshua ben Perahyah, Yehuda ben Tabbai, Shetach, Shemaya, Avtalyon, Hillel, Gamliel (Peah / RH), Akiva (Makkot 24b), etc. Identity mishnayot from Avot that do not name the city are hidden.

**Yavne** — Gamliel, Shmuel ha-Katan, Leviṭas, Zadok still have displayable sources. Rabban Yohanan ben Zakkai’s Gittin 56b line is classified `WRONG_PERSON` because the inspected unit names Yavne with Gamliel/Zadok more clearly than “יוחנן בן זכאי” in the same unit. The association was **not** deleted; it is hidden pending a claim-shaped excerpt.

**Lod** — Tarfon, Akiva, Ilai, Beruriah display. Eliezer ben Hyrcanus’s Sanhedrin 32b row is hidden because the baraita says “רבי אליעזר ללוד” and the matcher requires **אליעזר + הורקנוס**. Same conservative rule.

**Tzippori** — Halafta and Levi display. Judah the Patriarch’s Ketubot 103b is hidden (`WRONG_PERSON`) because the sugya says “רבי” rather than “יהודה הנשיא”.

These last cases are **false hides**, not the original leak. The repair prefers silence over a mismatched quotation.

## Files

| File | Role |
|---|---|
| `scripts/map-research/geo-citation-rules.cjs` | claim matcher |
| `scripts/map-research/verify-place-citations.cjs` | classify + optional display filter |
| `scripts/map-research/repair-geography-sources.cjs` | restore lists from HEAD + research |
| `docs/research/backups/geography-sources-pre-repair.json` | before snapshot |
| `docs/research/geography-source-audit.json` | full classification table |
| `src/components/knowledge/pilot.json` | geography `sourceIds` / `sourceIdsReviewed` only |
| `src/domain/toladot-map.ts` | no flattening of sage sources into place mentions |

## Tests

Validated without browser or `/map` loading (2026-09-17): `node tools/sanity-geo-repair.cjs` + `npx vitest run tests/unit/geo-citation-rules.test.ts tests/unit/verify-place-citations.test.ts tests/unit/toladot-map.test.tsx` — **21 passed**.

## Not done (out of this repair)

- Rewriting hidden rows into new claim-shaped excerpts (Yavne/Zakkai, Lod/Eliezer, Tzippori/Rebbi, Shimon ha-Tzaddik/Yoma 69a).
- Changing the transmission tree.
- Deleting unused citation records.
