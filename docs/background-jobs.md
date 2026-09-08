# Background jobs — Phase 4 AI worker

Phase 4 implements a portable Postgres-backed AI job queue.

- Tables: `ai_jobs` (+ lease/fencing/heartbeat)
- Bootstrap: `npm run bootstrap:ai-worker` (service-role isolated script)
- Worker: `npm run ai-worker` (`scripts/ai-worker/`)
- Auth: dedicated Supabase Auth user (`worker_user_id`) + `AI_WORKER_SECRET` verified inside SECURITY DEFINER RPCs
- **No service-role in the worker process**
- **Anon cannot EXECUTE worker RPCs**
- Role `toladot_ai_worker` retained for optional direct DB grants; hosted path uses Auth JWT + secret

## Required properties (implemented)

- Exclusive claiming
- Leases
- Fencing tokens
- Heartbeat
- Retry / backoff (attempt_count / max_attempts)
- Idempotency keys
- Cancellation (`cancel_requested` + `request_cancel_ai_job`)
- Stale-job recovery (expired lease reclaim)
- Concurrency controls (app-level per editor)

## Architectural notes

- Public page rendering must not depend on live AI generation
- Jobs must not publish encyclopedia knowledge autonomously
- Worker must not write canonical draft tables or published projections
- See [`docs/ai-editorial.md`](ai-editorial.md)
