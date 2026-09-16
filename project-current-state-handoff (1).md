# Toladot --- Project Current State Handoff

**Document:** `project-current-state-handoff.md`\
**Project:** Toladot (תולדות)\
**Status date:** 2026-09-08\
**Purpose:** Context handoff for new planning conversations.

## 1. Product Identity

Toladot is a Hebrew-first contextual knowledge and exploration platform
focused on Jewish historical figures, sages, places, periods, events,
relationships, teachings, stories, and sources.

Toladot is not intended to replace a primary-text library. Its purpose
is to connect people, places, periods, events, relationships and sources
into a coherent historical picture.

The initial historical scope begins around the end of the Tanakh / early
Second Temple transition and is designed to grow through the Men of the
Great Assembly, Zugot, Tannaim, Amoraim and completion/signing of the
Talmud, with later expansion to Geonim, Rishonim, Acharonim and later
periods.

The current content-pilot strategy is to begin with the sages and
relevant figures of Pirkei Avot.

## 2. Audience and Experience

Primary audience: general Hebrew-speaking public. Future audiences
include students, teachers, educational institutions, researchers and
academics.

The public encyclopedia is open without registration; authentication is
primarily for editors/admins.

Toladot should support three depths: 1. **Quick Understanding** ---
understand who a person was and why they matter in roughly 10--20
seconds. 2. **Exploration** --- biography, chronology, map, places,
relationships, teachings, stories and historical context. 3. **Evidence
and Deepening** --- sources, evidence, uncertainty, disputes and
research context.

Homepage principle: **Search First, Explore Second.**

## 3. Knowledge Architecture

Toladot is built around structured entities and relationships rather
than standalone articles.

Core concepts include: - Person - Place - Rabbinic Generation / Period -
Political Rule / Historical Period - Historical Episode - Historical
Event - Story / Narrative - Teaching / Saying - Theme - Source - Claim -
Evidence - Relationship - Region - Media (future)

The same structured data should power Person pages, maps, Seder HaDorot,
search and relationship exploration without duplicate manual entry.

## 4. Person Pages

A Person page is a central interactive knowledge page and may contain: -
Identity card - Short summary - Substantive biography - Life/activity
chronology - Embedded map - Places - Teachers and students - Family -
Intellectual counterparts - Selected teachings - Stories - Historical
events - Rabbinic generation - Political/historical context - Sources -
Research/dispute notes - Contemporaries - "The world during their
lifetime" - "Jump to position in Seder HaDorot"

Important Jewish women and major Jewish leaders should be full Persons
when historically relevant. Non-Jewish rulers can generally remain
structured contextual historical entities.

## 5. Relationships and Identity

Relationships are first-class structured data with type, source entity,
target entity, evidence, confidence/uncertainty, dispute state,
editorial note and publication state.

Examples include Teacher → Student, Parent → Child, Spouse, Sibling and
Bar Plugta.

Rules: - Same-name people must never be automatically merged. - AI must
not automatically establish historical relationships as fact. - Literary
sequence in Pirkei Avot must not automatically become a teacher--student
relationship. - Relationship semantics belong in the database, not in
visual styling.

## 6. Historical Uncertainty

Toladot explicitly represents uncertainty instead of inventing
precision.

Dates can be exact, estimated, ranges, generation-only, unknown or
disputed. Life Range and Activity Range can be distinct. Places can also
be known, estimated, disputed, multiple candidates or unknown.

Core principle: **Toladot should know what it does not know.**

## 7. Stories and Teachings

Stories/Narratives are structured entities connecting people, places,
historical context, sources and themes.

Story editorial rule: 1. Start from a historical/rabbinic source. 2.
Extract the factual/narrative structure. 3. Create an original Toladot
Hebrew editorial retelling.

AI retellings must not simply copy third-party translations.

Selected teachings should emphasize worldview, ethics, character,
spiritual thought, leadership and major intellectual ideas, with precise
sources.

## 8. Sources and Evidence

Core model: **Claim → Source → Confidence/Status → Dispute**

Rabbinic/traditional primary sources receive priority in the main
presentation. Modern scholarship can provide secondary/contextual
analysis. Genuine disagreements must not be flattened.

Wikipedia/HaMichlol may assist discovery but are not automatically
evidence. Open-web research may assist discovery and cross-checking but
a web finding is not automatically evidence.

Toladot owns provider-independent canonical citations. Sefaria is a
retrieval adapter, not the canonical citation system.

Evidence lifecycle:
`discovered → resolved → editor_reviewed → accepted_as_evidence`

Other valid outcomes include unresolved, conflicting and rejected.

## 9. Seder HaDorot and Maps

"Seder HaDorot" is a major Toladot feature, not the product brand.

The chronology is primarily vertical/top-to-bottom and supports
historical/generational navigation, person placement, search, zoom,
filters, mobile behavior, alphabetical mode, deep-linking and uncertain
placement.

Person pages can offer "Jump to position in Seder HaDorot."

Relative placement can express older/middle/younger parts of a
generation or spanning generations without asking editors to invent
percentages.

Map architecture is global, initially emphasizing the Land of Israel and
Babylonia. Places are first-class entities. The map must not invent
coordinates for uncertain historical locations. MapLibre is selected.

## 10. Technical Architecture

Current stack: - Next.js App Router - React - TypeScript strict mode -
Server-first architecture - Supabase - PostgreSQL - Supabase Auth -
Supabase Storage where needed - Vercel for the web application - OpenAI
as first AI provider behind an abstraction - MapLibre - Custom Canvas
renderer for Seder HaDorot

PostgreSQL is the canonical source of truth.

Explicit decisions: - No graph database currently required. - No vector
database by default. - Public reads and editorial writes are
separated. - Hebrew/RTL is first-class. - Architecture remains
localization-ready. - PostgreSQL search is sufficient initially.

# 11. Completed Development Phases

## Phase 0 --- Technical Foundation --- COMPLETE

Created the technical foundation: Next.js, React, strict TypeScript,
Hebrew RTL, Supabase, authentication, permissions/capabilities,
migrations, tests and security foundations.

## Phase 1 --- Knowledge Engine --- COMPLETE

Built the structured knowledge model: people, places,
periods/generations, claims, evidence, relationships, chronology,
stories, teachings, themes, regions, editorial/publication states,
database security and admin-oriented data capabilities.

This phase is fundamental to the future large-database strategy.

## Phase 2 --- Public Encyclopedia --- COMPLETE

Built the public Hebrew encyclopedia: Person/Place/Period pages, search,
safe content rendering, SEO foundations, published-data projections and
public/editorial separation.

## Phase 3 --- Exploration & Visualization --- COMPLETE

Built Seder HaDorot chronology, historical placement logic, Custom
Canvas rendering, relationship visualization prototypes, MapLibre map,
search/filter interactions, mobile/accessibility behavior and
publication synchronization.

Three relationship visual variants were explored; Variant 1 was selected
at the time.

Minor deferred items include political/period band population and some
unused experimental dependencies/functions.

## Phase 4 --- AI Research & Editorial System --- COMPLETE WITH MINOR DEFERRED ITEMS

Built AI-assisted editorial architecture: - Conversation - AI Job -
Proposal - Provider abstraction - OpenAI first provider - Background job
queue - AI research workspace - Source Catalog - Research Retrieval -
Sefaria adapter - Controlled open-web research - Citation lifecycle -
Proposal validation - Dependency-aware stale detection -
Identity-resolution safeguards - Cost tracking - Auditability -
AI-assisted story/teaching/chronology proposals

Rule: **AI proposes; editors approve; explicit publication makes content
public.**

A dedicated AI Worker was implemented. Security hardening includes
dedicated worker identity, no runtime service-role key, worker-secret
validation, RPC hardening, self-edge relationship rejection and
editorial-isolation tests.

### Current AI Worker Decision

The Worker exists in the code, but the current plan is **not to deploy a
permanent Fly.io worker yet**.

Toladot is a slowly changing encyclopedia. AI is expected to be heavily
used during content research/population, while ordinary public reading
should not require AI calls.

Current hypothesis: AI should primarily operate as a
content-production/research pipeline, potentially running only when
needed.

Do not delete the Worker architecture. It may become useful when content
operations scale.

## Phase 5 --- Production Readiness --- CODE & ARCHITECTURE COMPLETE

Implemented environment separation, security hardening, SSRF
protections, AI rate/retry/cancel controls, AI cost ceilings, evidence
lifecycle improvements, real accept + explicit publish lifecycle
testing, observability/logging, pilot noindex behavior, backup/recovery
documentation and deployment scaffolding.

### Deployment Status

**Vercel Web: DEPLOYED AND WORKING**

GitHub repository: `elazarc200/Toldot`

The internet-accessible pilot passed an initial manual smoke test: -
Homepage opened - Periods opened - Seder HaDorot opened

**Fly.io: NOT DEPLOYED**

This is intentional pending the decision about whether a continuously
hosted AI Worker is needed.

The Vercel deployment should be treated as a **pilot**, not final public
launch.

Remaining operational work before full production includes final
backup/restore verification, selected Supabase security-owner settings,
worker deployment if eventually required, final production smoke tests,
real-domain/public-indexing configuration and account/security hardening
such as 2FA.

# 12. Current Content Strategy

A strategic adjustment is under consideration:

**AI Research → Structured Dataset → Validation → PostgreSQL/Supabase →
Toladot**

Once approved knowledge is in the database, public users should not
require AI to explore it.

Do not perform one uncontrolled "research everything and import
everything" operation.

Recommended first validation batch: **5--10 real Pirkei Avot figures.**

Validate data quality, sources, uncertainty, relationships and visual
output before expanding.

## Pirkei Avot Pilot

Pirkei Avot is the selected initial content backbone.

**Core:** major sages and relevant Jewish figures represented in Pirkei
Avot.

**Context:** places, periods, political regimes, events/episodes,
relationships and sources necessary to understand them.

**Expansion:** additional entities discovered through meaningful
relationships become later expansion candidates.

The pilot should exercise Person pages, biography, teachings, stories,
sources, relationships, generations, periods, events, map, Seder
HaDorot, smart chronology and historical uncertainty.

# 13. New Priority Workstreams

Before large-scale content population, three focused workstreams have
been identified.

## Workstream A --- Toladot Design System & UX/UI

Goal: create a complete visual and interaction language, not isolated
cosmetic changes.

Discovery should cover: - Brand personality - Visual references - Hebrew
typography - Color system - Spacing and density - Grid/layout - Cards
and controls - Navigation and search - Icons/illustrations - Historical
visual language - Person/Place/Period pages - Sources - Stories and
teachings - Relationships - Maps - Seder HaDorot - Historical
uncertainty - Loading/empty/error states - Mobile/tablet/desktop - RTL
behavior - Accessibility - Motion and feedback - Design tokens -
Component system

Process: 1. Conduct structured design discovery. 2. Ask the product
owner one question at a time, preferably with concrete options/examples.
3. Review current screenshots/UI. 4. Explore visual directions. 5.
Define the Design System. 6. Define key-screen UX. 7. Produce
implementation-ready specifications. 8. Only then choose the
coding/implementation workflow.

An external coding/design AI must implement the approved specification
rather than silently redesigning the product.

## Workstream B --- Toladot Admin Information Architecture & UX

Goal: design Admin as a professional editorial workspace, not merely
CRUD tables.

Areas to explore: - Dashboard - People - Places - Periods -
Generations - Events/Episodes - Stories - Teachings - Sources -
Claims/evidence - Relationships - Themes - Research - Drafts - Review
queue - Publication - Version history - Duplicate candidates -
Uncertainty/conflicts - Data-quality problems - Coverage dashboard -
Users/roles - Settings - AI-assisted research where appropriate

Important proposed capability: **Knowledge Quality / Coverage
Dashboard**, showing issues such as people missing activity places,
relationships lacking approved evidence, disputed dates, possible
duplicate identities, missing biographies/stories/teachings and entities
requiring review.

Admin discovery should also proceed one question at a time before
locking the information architecture.

## Workstream C --- Toladot Research Corpus & Database Population

Goal: define a rigorous research specification and structured dataset
format that can become the basis of the Toladot database.

Potential research tools include OpenAI research workflows, Perplexity
and other research systems, but the output contract should be designed
before selecting a tool.

Research should produce structured knowledge, not merely long prose
documents:

**People → Aliases → Generations → Places → Periods → Relationships →
Teachings → Stories → Events/Episodes → Claims → Sources → Uncertainty**

Rules: - Do not invent missing precision. - Do not auto-merge
identities. - Do not infer teacher/student merely from literary
sequence. - Preserve disputes and uncertainty. - Distinguish primary
evidence from secondary research. - Use canonical source references. -
Separate discovered material from accepted evidence. - Prefer structured
output suitable for validation/import.

Rollout: 1. Define research specification. 2. Research 5--10 Pirkei Avot
figures. 3. Validate manually. 4. Import into Toladot. 5. Inspect Person
pages, map, chronology and relationships. 6. Correct the research/data
contract. 7. Expand to the full Pirkei Avot corpus. 8. Expand outward
only after quality is demonstrated.

# 14. Design / Media Direction Already Discussed

Future Person pages should eventually support AI-generated portraits.

Preferred direction: - Realistic but painted - Clearly artistic
illustration rather than historical photograph - Visual variety - Admin
regeneration/replacement capability - Subtle Hebrew indication that the
image is an artistic illustration

This should not block current Design System work.

# 15. Architectural Guardrails

Future AI coding tools/developers must preserve these rules unless an
explicit architectural decision changes them:

1.  PostgreSQL remains the canonical knowledge source.
2.  Structured knowledge must not collapse into giant text documents.
3.  Public content and editorial drafts remain separated.
4.  AI cannot autonomously publish historical claims.
5.  Historical uncertainty must remain representable.
6.  Same-name identities must not be auto-merged.
7.  Relationships require evidence/editorial justification.
8.  Visual coordinates are not historical truth.
9.  Public reading should not unnecessarily trigger paid AI calls.
10. Provider-specific links must not replace canonical citations.
11. No graph database without demonstrated need.
12. No vector database by default.
13. Hebrew RTL remains first-class.
14. New tools must not silently rewrite architecture while "improving"
    UI.
15. Large content imports must be validated in small batches first.

# 16. Recommended Next Conversation

Immediate focus:

## Toladot Design System & UX/UI

Suggested opening request for the new conversation:

> Read the attached Toladot Project Current State Handoff first.
>
> I want this conversation to focus only on creating and upgrading
> Toladot's Design System and UX/UI.
>
> Do not redesign the technical architecture or start coding yet.
>
> Conduct a deep design-discovery process with me. Ask me one question
> at a time, preferably with concrete options and examples.
>
> We need to define a distinctive Hebrew-first visual language for
> Toladot and eventually translate it into an implementation-ready
> Design System and screen specifications.
>
> We should review the current UI/screenshots during the process and
> compare alternative visual directions before implementation.

After Design System work, use separate focused conversations for: 1.
**Toladot Admin Information Architecture & UX** 2. **Toladot Research
Corpus & Database Population**

# 17. Current Status in One Sentence

**Toladot's technical and knowledge infrastructure is built and the
pilot web application is live on Vercel; the next priorities are the
product's Design System/UX, professional editorial Admin experience, and
controlled structured-content population methodology before scaling the
historical corpus.**
