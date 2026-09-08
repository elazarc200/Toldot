# Operations — Pilot Internet runbook

Phase 5 ops for Toladot. **Pilot is internet-accessible for authorized editorial use — not an official public launch.**

## Environment model

| Environment | Role |
|-------------|------|
| **local** | Development + deterministic CI. Prefer `AI_LLM_PROVIDER=fake`. Risky experiments stay here. |
| **pilot** | Internet-accessible Pilot Internet Environment (Vercel + current hosted Supabase + Fly worker). Real editors, live AI/Sefaria when configured. **Not** public launch; **not** search-indexed. |
| **production** | Future public production. Deferred until pilot is validated. Separate project later. |

Set `TOLADOT_ENV` / `NEXT_PUBLIC_TOLADOT_ENV` to `local` | `pilot` | `production`. Pilot admin UI shows a clear pilot banner. `shouldDisallowSearchIndexing()` is true for every env except `production`.

## Credential classes

| Class | Where | Contents | Never |
|-------|-------|----------|-------|
| **WEB PUBLIC** | Browser / `NEXT_PUBLIC_*` | Supabase URL + anon key | Service role, worker secret |
| **RUNTIME WEB** | Vercel server env | Same public keys + server-only knobs (log level, optional AI cost ceiling) | Service role |
| **RUNTIME WORKER** | Fly secrets / local `ai-worker` | Worker Auth email/password, `AI_WORKER_SECRET`, OpenAI key | Service role |
| **BOOTSTRAP ADMIN** | Trusted operator machine only | `SUPABASE_SERVICE_ROLE_KEY` + bootstrap targets | Web app, Fly worker, git |

### BOOTSTRAP ADMIN vs RUNTIME WORKER

- **BOOTSTRAP ADMIN** — `npm run bootstrap:editor` and `npm run bootstrap:ai-worker` only. Service role is isolated under `scripts/`. Rotate by re-running bootstrap with a new secret; never paste service role into Vercel or Fly.
- **RUNTIME WORKER** — `npm run ai-worker` / Fly process. Signs in as the dedicated Auth user and calls SECURITY DEFINER RPCs with `AI_WORKER_SECRET`. **No service-role in the worker process.**

## Worker fail-closed until bootstrap

Until `ai_worker_config` has a real `worker_user_id` and a non-placeholder `secret_hash` (not `UNCONFIGURED_REQUIRES_BOOTSTRAP`):

- Worker RPCs reject authorization.
- Do **not** start the Fly worker against pilot until bootstrap has succeeded.
- No default/fallback worker secret is allowed.

## Deploy order (Pilot Internet)

1. **Backup check** — Confirm current Supabase backup posture in the dashboard (see Backup/recovery). Do not proceed if backups are unverified before valuable editorial data exists.
2. **Migrations** — Apply forward-only migrations to pilot (`npx supabase db push` or approved pipeline). No rewrite of applied migrations; no `db reset` on pilot.
3. **Bootstrap** — Editor and/or AI worker bootstrap from an operator machine if needed (`bootstrap:editor`, `bootstrap:ai-worker`).
4. **Vercel** — Set env including `TOLADOT_ENV=pilot`, `NEXT_PUBLIC_TOLADOT_ENV=pilot`, `NEXT_PUBLIC_SITE_URL`, Supabase URL/anon. Deploy Next.js.
5. **Fly worker** — Set Fly secrets (runtime worker credentials only). Deploy/start `toladot-ai-worker-pilot` (placeholder app name).
6. **Smoke** — HTTPS health, login, one admin path, worker null-poll / claim path, optional draft→publish on a throwaway entity.
7. **noindex verify** — Confirm `robots.txt` disallows indexing and HTML metadata is `noindex` when `TOLADOT_ENV=pilot`.

### Rollback

- Web: previous Vercel deployment.
- Worker: previous Fly image/release.
- DB: forward-fix migrations only (never reset pilot).
- Content: snapshot rollback RPCs (e.g. `rollback_person_snapshot`).

## Backup / recovery

**Verify actual capability in the Supabase dashboard.** Document what you see (daily backups, retention, PITR availability). **Do not claim PITR unless verified for this project’s plan.**

### Pilot RPO / RTO (working targets — not public-production SLA)

| Metric | Pilot target | Notes |
|--------|--------------|-------|
| **RPO** | ≤ 24h (or better if verified continuous backup/PITR) | Bound by verified Supabase backup frequency |
| **RTO** | ≤ 4h for restore to a usable pilot DB + redeploy | Operator availability dependent |

Revisit these when moving to Future Public Production.

### Rules

- **Forward-only migrations** on pilot. No casual migration rewrites.
- **No `db reset` / destructive wipe** against pilot.
- Risky schema experiments stay on **local**.
- **Accidental publish** → use `rollback_person_snapshot` (and place/period equivalents) to reactivate a prior snapshot; do not invent ad-hoc SQL.
- **Bad migration response** — stop applying further migrations; do not “fix” pilot with dashboard schema edits without a compensating forward migration; restore from verified backup if the DB is inconsistent; resume only with a reviewed forward migration.

### Restore drill checklist (before heavy Pirkei Avot population)

- [ ] Dashboard backup / PITR status recorded (date, plan, retention)
- [ ] Restore procedure identified (in-place PITR **or** restore to a throwaway project)
- [ ] One drill executed or formally waived with owner sign-off
- [ ] Post-restore: Auth users usable, migrations listed, smoke login + one public page
- [ ] Drill outcome recorded (date, operator, result)

## Visibility / indexing (pilot)

- `TOLADOT_ENV=pilot` → disallow search indexing (robots + metadata).
- Do not submit pilot sitemaps to Search Console.
- Limit who receives pilot URLs; admin remains capability-gated.
- Future production flips indexing only as an explicit launch decision.

## Manual Auth (Supabase dashboard)

### OWNER ACTION REQUIRED — Auth settings

In the **pilot** Supabase project dashboard:

1. Enable **leaked password protection** (HaveIBeenPwned / Auth security settings).
2. Prefer strong passwords for editors and the AI worker Auth user.
3. Confirm email / password Auth settings match how editors actually sign in.

This cannot be completed from the app repo alone.

## Hosting logins

### OWNER ACTION REQUIRED — Vercel

1. Log in to Vercel and link the Toladot repository.
2. Create the pilot project; set env vars (see `.env.example` WEB / RUNTIME WEB sections + `TOLADOT_ENV=pilot`).
3. Confirm HTTPS deploy succeeds; run smoke + noindex verify.

### OWNER ACTION REQUIRED — Fly.io

1. Log in to Fly (`fly auth login`).
2. Create/confirm app name placeholder `toladot-ai-worker-pilot` (or rename consistently in `fly.toml`).
3. Set secrets via `fly secrets set` (RUNTIME WORKER only — never service role).
4. Deploy worker image; confirm process runs `npx tsx scripts/ai-worker/index.ts` and fail-closed behavior if unbootstrapped.

## Related docs

- [Architecture](architecture.md)
- [Security](security.md)
- [Background jobs](background-jobs.md)
- [AI editorial](ai-editorial.md)
- [Pirkei Avot pilot readiness](pirkei-avot-pilot-readiness.md)
