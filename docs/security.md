# Security — Toladot (through Phase 5)

## Credential boundaries

| Client | Location | Keys |
|--------|----------|------|
| Browser | `src/lib/supabase/browser.ts` | URL + anon |
| Authenticated server | `src/lib/supabase/server.ts`, middleware | URL + anon + user JWT cookies |
| Bootstrap only | `scripts/supabase-service.ts` | URL + **service role** |
| AI worker runtime | `scripts/ai-worker/` | Anon + worker Auth session + `AI_WORKER_SECRET` (+ OpenAI when live) |

There is **no** service-role module under `src/`.

The web env schema (`src/lib/env.ts`) must not require `SUPABASE_SERVICE_ROLE_KEY`.  
Bootstrap env (`scripts/env.ts`) does.

### Credential classes (Phase 5)

| Class | Use |
|-------|-----|
| **WEB PUBLIC** | `NEXT_PUBLIC_*` only |
| **RUNTIME WEB** | Vercel / Next server — never service role |
| **RUNTIME WORKER** | Fly / `ai-worker` — Auth user + `AI_WORKER_SECRET`; never service role |
| **BOOTSTRAP ADMIN** | Operator machine only — service role for one-time grants/config |

See `.env.example` and [operations.md](operations.md).

## Pilot Internet

- Treat pilot as **internet-exposed**: HTTPS public web + capability-gated admin.
- Pilot is **not** public launch: `TOLADOT_ENV=pilot` keeps search indexing disabled.
- Limit distribution of pilot URLs; strong editor passwords.
- Secrets live in Vercel / Fly secret stores or local `.env.local` — never in git.

## Phase 5 ACL notes

Migration `20260908130000_phase5_security_hardening.sql` (and Phase 4 AI revoke migrations):

- Anon / `PUBLIC` must not `EXECUTE` worker auth helpers or operational AI RPCs.
- Authenticated `EXECUTE` retained where editors/workers legitimately call SECURITY DEFINER RPCs; capability / worker secret checks remain inside the functions.
- Publish / rollback / structural visualization DEFINER RPCs: revoke from anon; grant to authenticated only.
- Worker trust boundary: `auth.uid() === ai_worker_config.worker_user_id` **and** secret hash match; fail-closed while `secret_hash = UNCONFIGURED_REQUIRES_BOOTSTRAP`.
- Open-web retrieval: allowlist + private/metadata IP blocking (SSRF hardening).

## RLS

Authz and knowledge tables use RLS (deny-by-default for `anon` / `authenticated` where policies do not grant access).

- Table privileges revoked from `anon` / `authenticated` except intentional public-read surfaces
- Service role (bootstrap scripts only) bypasses RLS for one-time membership / worker config
- Capability checks go through `has_capability` (`SECURITY DEFINER`, fixed `search_path`)
- `FORCE ROW LEVEL SECURITY` is intentionally not used so the definer function and service role remain reliable on hosted Supabase

## Secrets in Git

- `.gitignore` excludes `.env`, `.env.local`, etc.
- Only `.env.example` placeholders are committed
- Never log access tokens, refresh tokens, service-role keys, worker secrets, OpenAI keys, or passwords
- Logger redaction covers `service_role`, `AI_WORKER_SECRET`, and related paths

## Middleware

Session refresh only. Authorization for `/admin` is enforced in the server layout via `requireEditorialAccess()`.

## Manual Auth (dashboard)

### OWNER ACTION REQUIRED

Enable **leaked password protection** in the Supabase Auth settings for the pilot project. This is a dashboard step; it is not applied by migrations. Details: [operations.md](operations.md).
