# Phase 3 — Geographic Explorer

## Purpose

Global map of published Places, Person activity links, and uncertainty-aware placement.

## Projection model

Derived tables (active build only):

- `published_map_places`
- `published_map_place_candidates`
- `published_map_person_places`

Canonical coords remain on `place_identifications`. No second geography SoT.

## Placement kinds

| Kind | Behavior |
| --- | --- |
| `point` | Preferred (or sole) lat/lng pin |
| `multi_candidate` | All candidate coords plotted; preferred distinct |
| `region_context` | List / region labels — **no invented pin** |
| `unlocated` | List/context only — **no fake coordinates** |

## Incremental vs structural

Ordinary `publish_place` / `publish_person` perform bounded map upserts into the **active** build. Structural rebuild replays all active place/person snapshots into a staging build then activates.

## Map renderer decision

See [`docs/phase3-map-spike.md`](phase3-map-spike.md).

**Production:** MapLibre GL JS + open basemap style.

**Degradation:** always-on result list / bottom sheet. No second full map stack (Leaflet) by default.

## Layers

Implemented: modern basemap, historical places, person activity.

Reserved (not implemented): political boundaries, routes, burial sites.

## Deep-links

- `/map?place=<uuid>`
- `/map?person=<uuid>`
- `/map?period=<uuid>` (filter when period ids present)

## Mobile

Touch pan/zoom, clustering, bottom sheet, layer sheet, list tab. No hover-only UX.

## Admin inputs

Place identifications + place↔region links under `/admin/places`.
