# Architecture — Toladot (Phases 0–5)

## Product authority

[`PRD/project-arch-plan-v4.md`](../PRD/project-arch-plan-v4.md) is the product baseline.

## Shape

Modular monolith:

- **Public surface:** `/` and public entity pages (anonymous; published projections only)
- **Editorial surface:** `/admin` (capability-gated)
- **Auth helper UI:** `/login` (not a security boundary by itself)
- **Data plane:** PostgreSQL via hosted Supabase (canonical system of record)
- **AI worker:** Postgres-backed job queue + portable poller (`scripts/ai-worker/`); see [background-jobs.md](background-jobs.md) and [ai-editorial.md](ai-editorial.md)

## Phase reality (0–5)

| Phase | Delivered |
|-------|-----------|
| **0** | Auth, capability-based editorial authz, RTL shell |
| **1** | Canonical knowledge engine (people/places/periods, claims, publish snapshots) |
| **2** | Public encyclopedia (projections, search, slugs) |
| **3** | Visualizations (relationships, map, Seder HaDorot projections) |
| **4** | AI editorial research (jobs, proposals, retrieval adapters, worker RPCs) |
| **5** | Production readiness for **Pilot Internet**: security hardening, ops, deploy, non-index visibility, observability MVP |

Phase 5 does **not** populate corpus content and does **not** create Future Public Production.

## Environments (`TOLADOT_ENV`)

| Value | Meaning |
|-------|---------|
| `local` | Development / CI |
| `pilot` | Internet-accessible Pilot Internet Environment (not public launch) |
| `production` | Future public production (deferred; supported for forward-compat) |

Set `TOLADOT_ENV` and `NEXT_PUBLIC_TOLADOT_ENV`. Pilot must remain non-indexed (`shouldDisallowSearchIndexing`). See [operations.md](operations.md).

### Pilot Internet topology

- **Web:** Next.js on Vercel (HTTPS)
- **Data:** Current hosted Supabase (pilot)
- **Worker:** Fly.io process running `npx tsx scripts/ai-worker/index.ts`
- **No** Redis / vector / graph DB in this architecture

## Repository layout

| Path | Role |
|------|------|
| `src/app` | Routes (thin) |
| `src/lib/supabase` | Browser anon + user-scoped server clients only |
| `src/lib/authz` | Session + capability wrappers (DB is authority) |
| `src/lib/ai` | Editorial AI application + retrieval (no service role) |
| `scripts/` | Isolated privileged bootstrap + AI worker entry (service role only in bootstrap) |
| `supabase/migrations` | Versioned schema — only source of DB changes |
| `tests/` | Unit, e2e, real RLS |

## Canonical knowledge rule

Editorial/canonical knowledge is the source of truth. Public projections are rebuildable and not independently editable. AI proposals never publish autonomously.

## Supabase setup

1. Use the dedicated **pilot** (non–public-production) Supabase project for Pilot Internet.
2. Copy project URL + anon key into `.env.local` / host secret stores.
3. Link CLI (optional): `npx supabase link --project-ref <ref>`
4. Push migrations forward-only: `npx supabase db push` (never `db reset` on pilot).
5. Confirm tables + `has_capability` + AI worker RPCs exist.
6. Bootstrap first editor / AI worker via `npm run bootstrap:editor` and `npm run bootstrap:ai-worker` (operator machine only).

Local Docker Supabase is **not** required.

## Migration workflow

- Add new SQL under `supabase/migrations/` with a timestamp prefix.
- Never make manual dashboard schema changes without a matching migration.
- Forward-only on pilot; intentional historical gap at `…120500…` (no file) is expected — see CI migration integrity check.

## Related ops

Deploy order, credentials, backup/recovery, and owner actions: [operations.md](operations.md).
