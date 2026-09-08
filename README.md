# תולדות (Toladot)

Hebrew-first historical knowledge platform.

**Phases 0–5:** foundation through Pilot Internet production readiness. Pilot is HTTPS-deployable for authorized editorial use — **not** an official public launch and **not** search-indexed.

## Stack

- Next.js App Router + React + TypeScript (strict)
- Supabase (hosted pilot) + PostgreSQL + Auth
- AI worker (Postgres jobs + Fly/local poller)
- Zod, Vitest, Testing Library, Playwright, ESLint
- Modular monolith

## Quick start

1. Use Node.js 20+.
2. Copy `.env.example` → `.env.local` (`TOLADOT_ENV=local`, Supabase URL + anon key).
3. Apply migrations to your dedicated non-prod / pilot Supabase project.
4. `npm install`
5. `npm run dev`

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local Next.js server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Playwright smoke |
| `npm run test:rls` | Real Supabase RLS checks (needs credentials) |
| `npm run bootstrap:editor` | One-time first editor grant (service role) |
| `npm run bootstrap:ai-worker` | Configure AI worker Auth + secret hash (service role) |
| `npm run ai-worker` | Run AI job poller (runtime worker credentials only) |

## Environment

`TOLADOT_ENV` / `NEXT_PUBLIC_TOLADOT_ENV`: `local` | `pilot` | `production` (future).  
Pilot requires `NEXT_PUBLIC_SITE_URL`. See [docs/operations.md](docs/operations.md).

## Documentation

- [Operations (Pilot Internet)](docs/operations.md)
- [Architecture](docs/architecture.md)
- [Authorization](docs/authz.md)
- [Security](docs/security.md)
- [Knowledge engine](docs/knowledge-engine.md)
- [Public encyclopedia](docs/public-encyclopedia.md)
- [AI editorial](docs/ai-editorial.md)
- [Background jobs](docs/background-jobs.md)
- [Pirkei Avot pilot readiness](docs/pirkei-avot-pilot-readiness.md)
