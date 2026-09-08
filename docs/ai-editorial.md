# Phase 4 — AI Editorial Research

## Scope

Entity-scoped AI research for editors. Person workspace is fully implemented; other entity types are schema-ready.

Governing rule: **Research aggressively. Infer cautiously. Never convert uncertainty into fact.**

## Lifecycle

AI Research → AI Proposal → Editorial Review → Draft → **explicit Publish** → Public projections.

Accepting a proposal is **not** publication.

## Separation

| Concept | Table(s) |
| --- | --- |
| Conversation | `ai_conversations`, `ai_conversation_messages` |
| Job | `ai_jobs` |
| Proposal | `ai_proposals` (+ field decisions, acceptance events) |

## Source Catalog ≠ Retrieval

- Canonical citations live in `source_works` / `source_citations` (Hebrew display owned by Toladot).
- Retrieval adapters (`catalog_metadata`, `sefaria`, `open_web_discovery`) locate material.
- Provider refs/URLs are resolution metadata (`source_citation_external_links`, citation findings) — not evidence identity.
- Sefaria is not required as a public destination and is not mirrored as a full corpus.

## Citation lifecycle

`discovered` → `resolved` → `editor_reviewed` → `accepted_as_evidence`  
also: `unresolved` | `conflicting` | `rejected`

## Worker

`npm run bootstrap:ai-worker` — configures dedicated Auth user id + SHA-256 secret hash (service-role script only).

`npm run ai-worker` — signs in as that Auth user and calls SECURITY DEFINER AI RPCs with `AI_WORKER_SECRET`.

**Trust boundary:** `auth.uid() === ai_worker_config.worker_user_id` AND secret hash match. Anon cannot EXECUTE worker RPCs. No service-role in the worker process. No default/fallback secret. No canonical/public writes.

Env:

- `AI_WORKER_EMAIL` / `AI_WORKER_PASSWORD` / `AI_WORKER_SECRET` (min 24)
- `AI_LLM_PROVIDER=openai|fake`
- `OPENAI_API_KEY` when using OpenAI

## Admin UX

`/admin/people/[id]/ai`

## Story retellings

Original Toladot Hebrew editorial language; do not copy Sefaria/Wikisource wording. Preserve variant traditions.

## Out of scope (Phase 5 / later)

Public Ask Toladot, vector DB, portraits, full Place/Period AI UIs, autonomous publish.
