# Phase 2 — Public Encyclopedia

## Public read boundary

Public routes consume **only**:

- active `published_aggregate_snapshots`
- `published_search_documents`
- `published_entity_slugs`
- `published_slug_redirects`
- Phase 3 visualization projections for the **active** build (see [`seder-hadorot.md`](seder-hadorot.md), [`geographic-explorer.md`](geographic-explorer.md))

Loaders live in [`src/application/public-loaders.ts`](../src/application/public-loaders.ts) and use the anon client ([`src/lib/supabase/public.ts`](../src/lib/supabase/public.ts)). They must not query editorial tables (`people`, `places`, `claims`, …).

## DTO contracts

Typed DTOs in [`src/domain/public.ts`](../src/domain/public.ts); Zod mapping in [`src/application/public-mappers.ts`](../src/application/public-mappers.ts). Invalid snapshot payloads fail closed (page not found / empty), not silent corrupt render.

## Projection ownership

Canonical typed tables remain editable SoT. Snapshots/search/slugs/redirects are **derived** and written only inside SECURITY DEFINER publish/rollback transactions. No admin CRUD on projection tables.

## Atomic publish

`publish_person` / `publish_place` / `publish_period` (and matching rollbacks) in one DB transaction:

1. validate  
2. build payload  
3. audit revision  
4. activate snapshot  
5. sync slug + redirects  
6. replace search docs (Period republish deletes prior Event/Episode docs for that period first)

Failure aborts the transaction; prior public state remains.

## Cache correctness

- **Layer A:** active snapshot resolution — short in-process TTL (~15s) or live read.  
- **Layer B:** immutable payload by `snapshot_id` — long TTL cache OK.  
- **`revalidatePath`:** optional optimization after Next-based publish actions — **not** required for correctness.

## Search / slugs

Hebrew-safe slugs via `slugify_he` + disambiguation; uniqueness per aggregate type; redirects on rename. Aliases feed search_blob only.

## Markdown security

[`src/lib/safe-markdown.tsx`](../src/lib/safe-markdown.tsx): strip raw HTML, allowlist inline Markdown, validate link schemes (`http`/`https`/`mailto`/relative). No unsanitized `dangerouslySetInnerHTML` for editorial content. (JSON-LD uses `JSON.stringify` of DTO fields only.)

## Public routing

`/`, `/search`, `/person/[slug]`, `/place/[slug]`, `/period/[slug]`, `/periods`, `/map`, `/seder-hadorot`  
UUID fallback: `/person|place|period/id/[uuid]` → canonical slug (308).

## Phase 3 deep-link contract

`/seder-hadorot?person=<canonical-person-uuid>&intent=focus`  
`/seder-hadorot?mode=alpha` — alphabetical index  
`/map?place=<uuid>` · `/map?person=<uuid>` · `/map?period=<uuid>`

Production Seder renderer: custom Canvas chronology (not Sigma). Visual relationship tokens have lab variants 1|2|3 (`/admin/seder-visual-lab`); public default is variant 1.

## Deferred

AI, vector search, portraits/media lifecycle, standalone Story/Event pages.

## Known limitations

- Empty catalog until editors publish content.  
- Embedded stories/teachings refresh only on Person republish.  
- Place↔Person public links may use `/person/id/{uuid}` redirect until slug join is enriched in UI.  
- SEO is baseline only.
