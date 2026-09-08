# Phase 3 — Relationship Visual Prototype Gate

## Fixture

[`src/fixtures/seder-visual-fixture.ts`](../src/fixtures/seder-visual-fixture.ts) — 35 Persons, shared across all variants.

Includes:

- Teacher–Student (A=teacher, B=student)
- Parent–Child (A=parent, B=child)
- Spouse, Sibling, Bar Plugta (non-directional)
- Disputed / uncertain edges
- Multi-generation Persons
- Dense overlapping edges

## Lab

`/admin/seder-visual-lab` — variants 1 / 2 / 3 via [`src/lib/seder-visual-tokens.ts`](../src/lib/seder-visual-tokens.ts).

## Evaluation (gate outcome)

| Criterion | Variant 1 | Variant 2 | Variant 3 | Winner |
| --- | --- | --- | --- | --- |
| Semantic comprehension | Strong dashed family + solid teacher | Heavier weights | Marker-first | **1** |
| Direction comprehension | Arrowheads on directional only | Chevrons | Endpoint glyphs | **1** |
| Type vs certainty | Certainty = opacity/dash secondary | Certainty = pattern | Certainty = badges | **1** |
| RTL safety | Structural A→B | Same | Same | Tie |
| Dense readability | Best default clutter | Heavier | Noisy markers | **1** |
| Selected-Person focus | Clear dimming | Clear | Clear | Tie |
| Accessibility (non-color) | Dash + markers | Weight + dash | Glyphs | **1** |
| Mobile viability | Lab desktop; mobile uses lists | — | — | N/A |
| Cognitive load | Lowest | Medium | Highest | **1** |

## Locked production tokens

**Variant 1** locked for production Seder explorer after this gate.

Color is never the sole semantic carrier.

**Date:** 2026-09-07
