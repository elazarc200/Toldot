# Phase 3 — Map Technology Spike

## Candidates

1. **Leaflet + raster OSM** — simple; DOM markers scale poorly
2. **MapLibre GL JS + open tiles** — WebGL, clustering, style spec, overlay path
3. **Mapbox GL proprietary** — rejected as hard dependency

## Requirements tested

- Marker clustering
- Multi-candidate / disputed places
- Unlocated + region_context without fake pins
- RTL UI chrome around the map
- Mobile bottom sheet + list companion
- Open/self-hostable basemap path (Carto positron GL style / demotiles-compatible)
- Future historical overlay extensibility via layer registry

## Decision

**Production map renderer: MapLibre GL JS**

List/sheet is the required degradation path. Leaflet is **not** maintained as a second production stack.

**Date:** 2026-09-07
