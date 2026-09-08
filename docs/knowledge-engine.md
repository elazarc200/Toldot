# Phase 1 — Knowledge Engine

## Canonical data model

Typed PostgreSQL tables are the **editable** source of truth (no EAV; no “everything is JSON”).

Core aggregates and supporting tables:

| Area | Tables |
| --- | --- |
| Identity | `people`, `person_names`, `entity_resolution_candidates`, `entity_redirects` |
| Places / geo | `places`, `place_identifications`, `regions`, `place_regions`, `person_places` |
| Chronology inputs | `rabbinic_generations`, `person_generation_memberships`, `person_time_ranges`, `person_chronology_editorial`, `person_chronology_constraints` |
| Politics / periods | `political_rules`, `historical_periods`, `historical_episodes`, `historical_events`, person junctions |
| Relationships | `relationships` |
| Sources / evidence | `source_works`, `source_citations`, `claims`, `evidence_links` |
| Narrative | `stories`, `story_*`, `selected_teachings`, `themes` + junctions |
| Editorial | lifecycle columns, `entity_revisions`, `published_aggregate_snapshots` |

JSON is used **only** for:

- `entity_revisions.snapshot` — immutable audit
- `published_aggregate_snapshots.payload` — immutable published aggregate DTO

There is **no** `person_chronology_derived` table in Phase 1.

## Entity relationships (high level)

- Person ↔ many names; Person ↔ many generation memberships; Person ↔ life/activity time ranges independently.
- Person ↔ Place via `person_places` (activity assertions).
- Place ↔ many Regions via `place_regions` (hierarchical `regions.parent_region_id`).
- Relationships link two people with family + independent `knowledge_state`.
- Stories link people with per-person `significance`; themes via normalized junctions.

## Evidence / claim model

Claims use **typed subject FKs** with XOR CHECK (exactly one subject). Supported subjects include person, place, relationship, generation membership, time range, chronology editorial/constraint, person_place, period, episode, event.

Evidence attaches via `evidence_links` → `claims` only. Chronology/geo assertions get provenance by creating a Claim whose subject FK points at that typed row. `evidence_links` is not an EAV escape hatch.

## Lifecycle

`identified → draft → in_review → approved → published` (+ allowed backward transitions; `archived` available).

Capabilities (Phase 0 reused): `edit`, `review`, `approve`, `publish`, `rollback`, `merge_entities`, `manage_corpus`, `manage_editorial_membership`.

AI is not implemented; design leaves room for future proposals without publish/approve authority.

## Publication snapshot model

`publish_person` / `publish_place` (SECURITY DEFINER):

1. Capability check (`publish`)
2. Validate preconditions (e.g. unresolved identity blocks publish)
3. Write audit revision
4. Insert new snapshot, deactivate previous
5. Point aggregate `published_aggregate_id`

All in one transaction. Draft edits do **not** mutate active snapshots. `rollback_person_snapshot` reactivates a prior snapshot under `rollback`.

Anon/public may SELECT **active** snapshots only. Draft domain tables are editorial-only via RLS + `has_capability(auth.uid(), …)`.

## RLS / capability mapping

| Action | Capability |
| --- | --- |
| Draft CRUD | `edit` |
| Review transitions | `review` |
| Approve | `approve` |
| Publish / create snapshot | `publish` |
| Reactivate prior snapshot | `rollback` |
| Corpus configuration | `manage_corpus` |
| Editorial membership | `manage_editorial_membership` |
| Merge candidates (no auto-merge) | `merge_entities` |

No permanent `isAdmin`. Service role remains bootstrap/scripts only.

## Uncertainty / time rules

Knowledge states: Known / Estimated / Disputed / Unknown. Never invent exact years. Life Range ≠ Activity Range. Exact years, ranges, open ranges, generation-only, and unknown bounds are all representable. Competing traditions stay as separate claims/ranges — no averaging into fake precision.

## Chronology rules

Independent axes: (1) rabbinic generation membership, (2) relative/activity placement within generation (`person_chronology_editorial`), (3) teacher–student relationships. A person may span multiple generations, continue into the next, or remain unresolved. Phase 1 stores editorial inputs only — no graph coordinates as historical truth.

## Geographic regions

First-class hierarchical `regions` + `place_regions`. No closed geographic enum. Expandable to Land of Israel, Babylonia, Persia, North Africa, Spain, France, Germany, Italy, Eastern Europe, etc. without schema redesign. Modern national borders are not assumed as historical truth.

## Admin

Hebrew RTL CRUD under `/admin/*`: people/names, places, regions, generations, taxonomy (political/periods/episodes/events), chronology + person-place, relationships, sources, claims, stories, teachings, themes, publish/revision/rollback desk. Not the Phase 2 public encyclopedia.

## Known limitations

- Phase 2 extended publish for person/place/period with public projections — see [public-encyclopedia.md](public-encyclopedia.md).
- Admin is functional, not a polished design system.
- `entity_resolution_candidates` / redirects exist for future merge workflows; no automatic merge.
- Playwright must run against a free/healthy `PLAYWRIGHT_BASE_URL` (avoid competing `next dev` on another port).

## Deferred (Phase 3+)

AI research/chat, portraits/media lifecycle, vector/NL search, community, multilingual UI, derived chronology *proposal* engine (Phase 4). Phase 3 ships Historical Placement projections + explorers — see [`seder-hadorot.md`](seder-hadorot.md).

## Architectural deviations from approved plan

None material for Phase 1. Phase 2 publication extensions supersede the earlier “person+place only” publish note.
