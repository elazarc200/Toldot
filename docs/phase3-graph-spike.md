# Phase 3 — Graph Technology Spike

## Candidates evaluated

1. **SVG + React** — strong a11y; poor at 2k–10k interactive edges
2. **Cytoscape.js (Canvas)** — custom layouts; CPU-bound at dense 10k
3. **Sigma.js + graphology (WebGL)** — leading scale candidate; point/node oriented
4. **Custom Canvas Chronology View** — Toladot-owned drawing of generation bands + Person **blocks/spans**

## Toladot-specific requirements tested

- Vertically constrained chronology spine
- Person blocks/spans (not points-only)
- Precomputed Historical Placement (no physics as SoT)
- Dense 30–50 Person region (fixture lab)
- Selected-Person focus + filters
- RTL interaction (semantic A→B edges, not text arrows)
- Accessibility companion lists
- Mobile: dedicated non-canvas mode required regardless of desktop renderer

## Synthetic scale notes

| Dataset | Observation |
| --- | --- |
| Dense 35-node fixture | All candidates usable; Custom Canvas clearest for block height = historical span |
| ~500 / ~2k logical nodes | Custom Canvas + LOD (suppress edges when zoomed out) remains interactive in exploratory harness |
| ~10k | Requires aggressive LOD / viewport culling; Sigma scales edges better but span encoding needs custom WebGL programs |

## Decision

**Production graph renderer: Custom Canvas Chronology View**

Rationale: chronology model fit (bands + block spans + uncertainty chrome) outweighs generic WebGL node throughput. Projection DTOs stay renderer-independent. Accessibility uses semantic lists, not canvas.

Sigma.js remains installed for optional experiments but is **not** a second production stack.

**Date:** 2026-09-07
