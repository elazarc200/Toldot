# Phase 3 — Performance Benchmarks

Synthetic client harness notes (Custom Canvas Seder + MapLibre). Recorded during Phase 3 implementation on a mid-tier Windows desktop (Chrome).

| Scenario | Metric | Result |
| --- | --- | --- |
| Fixture 35 Persons dense | First paint explorer | &lt; 200ms local |
| 500 placement nodes (synthetic arrays) | Assign lanes + draw frame | &lt; 50ms |
| 2,000 nodes LOD (edges suppressed zoomed out) | Pan frame | ≥ 30fps typical |
| 10,000 nodes viewport cull | Interaction | Usable with LOD; full edge draw not attempted |
| Focus 1-hop apply | Client state update | &lt; 16ms |
| Map 200 clustered points | MapLibre interactive | &lt; 2s after style load |

Ordinary publish incremental sync is O(entity + degree), not O(corpus). Structural rebuild cost scales with published corpus and is admin-triggered.

Mobile Seder uses list UX — canvas 10k not targeted on phone.

**Do not claim unbounded scalability;** LOD is mandatory above mid zoom-out.
