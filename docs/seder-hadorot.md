# Phase 3 — Seder HaDorot

## Purpose

Interactive chronological explorer and Hebrew alphabetical index over **published** Persons and relationships.

## Historical Placement vs Rendering Layout

| Layer | Role | Stored? |
| --- | --- | --- |
| **Historical Placement** | `y_start_norm` / `y_end_norm`, generation membership, uncertainty, spans | `published_seder_placement_*` |
| **Rendering Layout** | `x_lane`, label offsets, collision packing | Client `assignRenderLanes` (discardable); optional `published_seder_render_layout` |

Rendering layout **never** rewrites historical Y. Coordinates are not historical truth.

## Incremental sync vs structural rebuild

- **Incremental:** runs inside ordinary `publish_person` after Phase 2 slug/search sync. Upserts one Person node, alpha row, incident edges to other published peers, map person↔place links. Bounded — does not remap the full spine.
- **Structural:** `structural_rebuild_visualization_projections` → staging `build_id` → `activate_visualization_build` flips `published_visualization_manifest.active_build_id` atomically. Public RLS exposes **active build only**. Failed rebuilds never activate.

Admin: `/admin/publish` → Structural rebuild + activate (`manage_corpus`).

## Public read path

Allowlisted tables only (see [`src/lib/supabase/public.ts`](../src/lib/supabase/public.ts)). Loaders: [`src/application/visualization-loaders.ts`](../src/application/visualization-loaders.ts).

## Routes

- `/seder-hadorot` — chronological explorer
- `/seder-hadorot?mode=alpha` — alphabetical index (`sort_name`, honorific-insensitive)
- `/seder-hadorot?person=<uuid>&intent=focus` — deep-link focus by canonical UUID

## Graph renderer decision

See [`docs/phase3-graph-spike.md`](phase3-graph-spike.md).

**Production:** Custom Canvas Chronology View (Person blocks/spans + vertical chronology).

**Not used in production:** second full renderer stack (Cytoscape/Sigma dual). Semantic HTML lists are the accessibility degradation path.

## Relationship visual language

Prototype gate: `/admin/seder-visual-lab` with three variants on shared fixture [`src/fixtures/seder-visual-fixture.ts`](../src/fixtures/seder-visual-fixture.ts).

See [`docs/phase3-relationship-visual-gate.md`](phase3-relationship-visual-gate.md). Production tokens default to variant 1 after gate documentation.

## Mobile

Dedicated `MobileSederView` (generation browsing + cards + sheet). Not a shrunk desktop canvas.

## Accessibility

Always-on Person list + relationship list; keyboard selection; non-color edge semantics; `prefers-reduced-motion` for camera.

## Phase 4 boundary

No live AI. Future chronology proposals write to editorial workflow only, then republish → incremental/structural projection update.
