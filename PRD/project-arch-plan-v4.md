# Toladot --- Project Architecture Plan v2

## 1. Document Purpose

This document defines the product architecture, data model, system
boundaries, AI editorial model, user experience principles, technical
requirements, and phased implementation plan for **Toladot**.

Toladot is designed as a long-term historical knowledge platform. The
first public scope focuses on the period from the end of the Tanakh
through the completion of the Talmud, while the architecture must
support future expansion to the Geonim, Rishonim, Acharonim, and later
Jewish history without requiring a structural redesign.

This document is an architectural source of truth. Implementation
decisions should be reviewed against it before development proceeds.

------------------------------------------------------------------------

# 2. Product Overview

## Product Name

**Toladot**

## Short Description

Toladot is a Hebrew-first, public historical knowledge and exploration
platform focused on the leading Jewish sages and central Jewish figures
across generations.

Its purpose is not to replace primary-text libraries. Instead, it helps
users understand the broader historical picture by connecting people,
places, periods, events, teachings, relationships, and sources.

## Primary Goal

Provide users with a fast, broad, reliable, and visually intuitive
understanding of Jewish historical continuity while encouraging further
study.

## Core Product Principle

> Toladot is a contextual knowledge and exploration platform, not a
> primary-text library.

## Initial Historical Scope

The initial editorial scope covers:

-   Ezra and the Men of the Great Assembly
-   Shimon HaTzadik
-   The Zugot
-   Tannaim
-   Amoraim
-   The period through the completion of the Talmud

The architecture must not be limited to these eras.

Future expansion may include:

-   Geonim
-   Rishonim
-   Acharonim
-   Modern Jewish sages and major Jewish historical figures

## Target Audience

Primary audience:

-   General Hebrew-speaking public
-   Students
-   Teachers
-   People interested in Jewish history and Torah

Secondary/future audience:

-   Educators
-   Researchers
-   Academic users
-   Institutions such as schools or educational organizations

The public experience should remain accessible and simple while allowing
deeper source inspection for advanced users.

------------------------------------------------------------------------

# 3. Core Problem

Jewish historical knowledge is usually fragmented across:

-   Encyclopedias
-   Primary texts
-   Books
-   Academic research
-   Timelines
-   Maps
-   Individual biographies

Users often encounter a sage without understanding:

-   When the person lived
-   Which generation they belonged to
-   Who taught them
-   Who their students were
-   Where they lived or taught
-   Which major historical events overlapped their life
-   Which political regime existed at the time
-   Which claims are certain and which are disputed

Existing resources often present information as isolated articles.

Toladot should instead present a connected historical system.

------------------------------------------------------------------------

# 4. Product Experience Principles

## 4.1 Search First, Explore Second

The homepage should begin with a prominent search bar.

The first release should support accurate entity search, not
conversational AI search.

Primary search targets:

-   People
-   Places
-   Historical periods
-   Historical episodes/events

Future architecture must allow an AI-powered "Ask Toladot" experience
without replacing or redesigning the core search system.

## 4.2 Three Levels of Depth

Every major page should support progressive discovery.

### Level 1 --- Quick Understanding

Within seconds, the user should understand who or what the page is
about.

### Level 2 --- Exploration

The user can explore:

-   Biography
-   Timeline
-   Places
-   Relationships
-   Historical context
-   Selected teachings
-   Maps

### Level 3 --- Evidence and Deepening

The user can inspect:

-   Exact references
-   Disputes
-   Historical uncertainty
-   External links
-   Research notes where appropriate

## 4.3 Connected Knowledge

Every major object should connect to related objects.

Examples:

-   Person → Place
-   Person → Teacher
-   Person → Student
-   Person → Historical Period
-   Person → Historical Episode
-   Claim → Source
-   Relationship → Source
-   Place → People
-   Period → Places
-   Period → People
-   Event → People

Information must not be duplicated manually between different pages.

------------------------------------------------------------------------

# 5. Main User Flows

## 5.1 First-Time User

1.  User opens the homepage.
2.  User sees a large search field.
3.  User may search directly or choose one of three exploration paths:
    -   Map
    -   Seder HaDorot
    -   Periods
4.  User opens a person, place, period, or event.
5.  User explores connected information.
6.  User follows links to other entities or external sources.

No registration is required.

## 5.2 Core Usage Flow

1.  Search for a sage or historical subject.
2.  Open the relevant page.
3.  Understand the subject at a glance.
4.  Explore timeline, places, relationships, teachings, and context.
5.  Inspect sources or disputes where needed.
6.  Continue to connected pages.

## 5.3 Returning User

In the first release, returning users remain anonymous.

Future registered users may:

-   Save favorites
-   Create reading lists
-   Save pages
-   Follow topics
-   Build learning collections
-   Participate in approved community features

------------------------------------------------------------------------

# 6. Public Information Architecture

## Homepage

Primary hierarchy:

1.  Large search field
2.  Map
3.  Seder HaDorot
4.  Periods

Potential future homepage modules:

-   Sage of the Day
-   Quote of the Day
-   Today in Daf Yomi
-   Featured historical topic

These are future extensions and are not required for the core release.

------------------------------------------------------------------------

# 7. Core Entity Model

Toladot must use structured entities rather than storing each page as
one large article.

## 7.1 Person

A public Toladot person represents a major Jewish figure relevant to the
historical story.

Examples include:

-   Sages
-   Torah leaders
-   Important Jewish women
-   Queens or leaders when central to Jewish history
-   Other major Jewish figures

Examples:

-   Rabbi Akiva
-   Beruriah
-   Queen Shlomtzion

A Person may have multiple roles.

Possible roles:

-   Sage
-   Teacher
-   Student
-   Leader
-   Queen
-   Scholar
-   Community leader
-   Other editorially approved roles

Not every historical ruler becomes a Person page.

For example, Hadrian or Titus may be referenced as historical rulers
without receiving a full Toladot person page.

## 7.2 Place

A Place is a first-class entity.

Examples:

-   Yavne
-   Lod
-   Usha
-   Tzipori
-   Tiberias
-   Bnei Brak
-   Nehardea
-   Sura
-   Pumbedita

A Place may include:

-   Historical name
-   Modern identification
-   Coordinates
-   Geographic uncertainty
-   Alternative identifications
-   Historical description
-   Periods of importance
-   Related people
-   Related events
-   Sources

## 7.3 Rabbinic Generation

Represents rabbinic chronological organization.

Examples:

-   Men of the Great Assembly
-   Zugot
-   Tannaim
-   Amoraim
-   Internal generations where needed

This must remain separate from political rule.

## 7.4 Political Rule / Historical Regime

Examples:

-   Persian rule
-   Hellenistic rule
-   Hasmonean rule
-   Roman rule

These entities provide political context.

They should not be used as a replacement for rabbinic chronological
classification.

## 7.5 Historical Period

A broader historical time range containing people, places, political
context, and historical developments.

## 7.6 Historical Episode

A multi-year historical process.

Examples:

-   Great Revolt
-   Bar Kokhba Revolt
-   Destruction period surrounding the Second Temple

An episode may contain smaller events.

## 7.7 Historical Event

A more specific event with a relatively bounded date or time range.

## 7.8 Source

Represents a cited source.

Source types may include:

-   Mishnah
-   Tosefta
-   Babylonian Talmud
-   Jerusalem Talmud
-   Approved Midrashic works
-   Geonic literature in future
-   Rishonic literature in future
-   Later rabbinic sources
-   Academic research
-   Historical research
-   External reference resources

Wikipedia and HaMichlol may be used for discovery, but not as evidence
sources for factual claims.

## 7.9 Claim

A Claim represents a factual or interpretive statement that may require
evidence.

Examples:

-   Person A studied under Person B
-   Person A lived in Place B
-   Person A was active during a specific period

A Claim should support:

-   Source references
-   Editorial status
-   Confidence
-   Dispute status
-   Notes

## 7.10 Relationship

Relationships are first-class knowledge objects.

Possible relationship types:

-   Teacher of
-   Student of
-   Parent of
-   Child of
-   Spouse of
-   Sibling of
-   Family relation
-   Active in
-   Associated with
-   Contemporary of

A relationship should support:

-   Evidence
-   Source
-   Confidence
-   Dispute state
-   Editorial note
-   Publication state

Published relationships should not exist without evidence or explicit
editorial justification.

------------------------------------------------------------------------

# 8. Historical Uncertainty Model

Toladot must never invent false precision.

Dates may be stored as:

-   Exact date/year
-   Estimated year
-   Date range
-   Generation only
-   Historical period only
-   Unknown

Places may have:

-   Exact location
-   Approximate location
-   Multiple candidate locations
-   Uncertain identification

The public interface should communicate uncertainty subtly.

Examples:

-   Tooltip
-   Hover
-   Tap
-   Small uncertainty indicator
-   Expandable evidence panel

Disputes should remain visible without overwhelming the primary reading
experience.

------------------------------------------------------------------------

# 9. Source Policy

## 9.1 Core Principle

Primary Jewish/rabbinic sources receive priority in the main editorial
presentation.

Modern academic or historical research may provide:

-   Context
-   Alternative dating
-   Disputes
-   Archaeological context
-   Secondary interpretation

Conflicting traditions should not be silently merged.

## 9.2 Evidence Model

The preferred structure is:

**Claim → Source → Confidence/Status → Dispute**

## 9.3 External Source Links

The first release will not contain a full primary-text library.

Instead, source references should include:

-   Work name
-   Tractate/book
-   Chapter/page/passage where applicable
-   Exact citation
-   External link where available

Toladot is an exploration tool, not a replacement for primary-text
platforms.

------------------------------------------------------------------------

# 10. Person Page

The Person Page is the central public content unit.

## Required Sections

### Identity

-   Name
-   Alternative names
-   Titles
-   Roles
-   Generation
-   Approximate life dates
-   Profile illustration

### Visual Representation

Every Person should receive a default AI-generated artistic portrait.

Requirements:

-   Clearly marked as artistic illustration
-   Does not claim historical visual accuracy
-   Visually distinct from other portraits
-   Editable by administrator

Admin options:

-   Regenerate AI portrait
-   Choose another variation
-   Upload replacement image
-   Use a different media type

Future media may include:

-   Burial-site photography
-   Place photography
-   Manuscript imagery
-   Historical imagery where available

### Biography

Concise but substantive life story.

### Personal Timeline

Major known life events and historical overlaps.

### Places

Embedded map with locations associated with the person.

### Teachers and Students

Structured relationships with clickable people.

### Family

Structured family relationships.

### Selected Teachings

A curated set of sayings or teachings.

Primary emphasis:

-   Ethics
-   Worldview
-   Character
-   Spiritual teaching
-   Leadership
-   Memorable teachings

Toladot should not attempt to index every halakhic discussion.

### Historical Context

Relevant:

-   Political rule
-   Rabbinic generation
-   Historical episodes
-   Major events

### Sources

Exact references with external links.

### Disputes and Research Notes

Progressive-disclosure interface for uncertainty or disagreement.

------------------------------------------------------------------------

# 11. Place Page

Each important historical location may have a dedicated page.

Possible sections:

-   Historical overview
-   Modern geographic identification
-   Historical map
-   Modern map overlay
-   Related sages
-   Important events
-   Active periods
-   Local historical timeline
-   Sources
-   Geographic uncertainty

------------------------------------------------------------------------

# 12. Period Pages

Period pages should be rich historical experiences rather than simple
index pages.

## Periods Landing Page

Each historical period may receive a visually immersive card or hero
section using:

-   Motion
-   Illustrations
-   Architecture
-   Maps
-   Writing systems
-   Atmospheric visuals

AI-generated or artistic visuals must be labeled when they are not
historically verified reconstructions.

Each period includes a clear call to action:

**Discover the Period**

## Individual Period Page

Possible sections:

-   Overview
-   Date range
-   Political rulers
-   Major events
-   Sages
-   Jewish centers
-   Map filtered to the period
-   Timeline
-   Sources

------------------------------------------------------------------------

# 13. Seder HaDorot Explorer

The Seder HaDorot experience is a major interactive application.

## Core Design

-   Vertical historical timeline
-   Scroll from earlier to later history
-   Background historical period context
-   Person nodes
-   Relationship lines
-   Search
-   Filters
-   Zoom

## Person Nodes

Node size may reflect editorial prominence.

Initial prominence score may use:

-   Number of mentions in approved corpus
-   Number of relationships
-   Content depth
-   Other editorial metrics

Admin override is allowed.

## Relationship Lines

Different visual styles may represent:

-   Teacher/student
-   Family
-   Disputed relationship

Hover or tap should expose:

-   Relationship type
-   Source
-   Confidence
-   Dispute note

## Mobile

Mobile interaction should use a simplified interface.

The desktop graph must not simply be compressed into a small screen.

------------------------------------------------------------------------

# 14. Geographic Map Explorer

The geographic system must not be limited to Israel.

## Initial Geographic Emphasis

-   Land of Israel
-   Babylonia
-   Other major Jewish centers relevant to the Tannaitic and Amoraic
    periods

## Future Geographic Expansion

The same architecture must support:

-   Iraq
-   Persia
-   North Africa
-   Spain
-   France
-   Germany
-   Italy
-   Eastern Europe
-   Other future historical centers

## Map Layers

The map should support configurable layers.

Initial or future layers may include:

-   Historical places
-   Modern map
-   Torah centers
-   Historical events
-   Political boundaries
-   Historical routes
-   Burial sites

## Historical / Modern Overlay

Users should be able to compare historical geography with the modern
map.

Possible interaction patterns:

-   Layer toggle
-   Opacity slider
-   Historical/modern comparison control

The purpose is orientation, not false cartographic precision.

## Burial Sites

Future optional layer.

Burial traditions may be displayed with appropriate uncertainty when
historical certainty is limited.

------------------------------------------------------------------------

# 15. Search Architecture

## Initial Release

Use fast structured entity search.

Search across:

-   People
-   Places
-   Periods
-   Episodes/events

Support:

-   Alternative spellings
-   Aliases
-   Common abbreviations
-   Hebrew naming variations

## Future AI Search

A future "Ask Toladot" system may answer natural-language questions
using approved Toladot data.

AI answers should rely primarily on published, approved platform
knowledge rather than unconstrained model memory.

The initial search architecture must not prevent this future extension.

------------------------------------------------------------------------

# 16. Public Access and Authentication

## Initial Public Experience

All public content is accessible without registration.

Users do not need accounts to:

-   Search
-   Read pages
-   Browse maps
-   Use Seder HaDorot
-   Explore periods

## Admin Access

Only authenticated editors/admins may access editorial tools.

## Future Registered Users

Future account features may include:

-   Favorites
-   Saved pages
-   Reading lists
-   Learning collections
-   Personal history
-   Community content

These are not required for the first release.

------------------------------------------------------------------------

# 17. AI-Assisted Editorial Workspace

The editorial system is a core product component.

AI acts as:

-   Research assistant
-   Drafting assistant
-   Source discovery assistant
-   Relationship proposal engine
-   Editing assistant

AI must not autonomously publish encyclopedia content.

## Example Workflow

1.  Admin creates a new person.
2.  AI launches a research job.
3.  AI searches approved sources and allowed external research sources.
4.  AI proposes structured content.
5.  Proposed content appears in an editorial workspace.
6.  Admin reviews claims, relationships, dates, places, and sources.
7.  Admin converses with AI about the specific entity.
8.  AI revises proposals.
9.  Admin approves or rejects.
10. Approved version is published.

## Entity-Scoped AI Conversation

The AI conversation should be contextually bound to the entity currently
being edited.

Example requests:

-   Re-check this teacher relationship.
-   Find a rabbinic source for this claim.
-   Remove this modern source.
-   Shorten the biography.
-   Re-evaluate the dating.
-   Find evidence that this sage was active in Lod.
-   Mark this relationship as disputed.

## AI Publication Rule

AI may propose.

Editors approve.

Published knowledge must have an editorial approval state.

------------------------------------------------------------------------

# 18. Editorial Dashboard

The administration system should show the state of the encyclopedia.

Example metrics:

### People

-   Published
-   In review
-   Draft
-   Not researched

### Places

-   Published
-   In review
-   Missing details

### Relationships

-   Approved
-   Disputed
-   Awaiting review

### Sources

-   Approved
-   Missing link
-   Missing exact reference

### AI Jobs

-   Running
-   Completed
-   Needs review
-   Failed

## Content Pipeline

Possible content statuses:

-   Identified
-   Research pending
-   AI researching
-   Draft generated
-   Editor review
-   Changes requested
-   Approved
-   Published
-   Archived

The exact status model should remain simple enough for editors to
understand.

------------------------------------------------------------------------

# 19. Content Growth Model

Toladot should not wait until the entire historical corpus is complete
before becoming usable.

The platform should support continuous editorial expansion.

The first release should be considered successful when:

-   Core system architecture is stable
-   Real entities can be created
-   AI-assisted research works
-   Editorial approval works
-   Public pages work
-   Search works
-   Relationships work
-   Maps and timeline can consume the same knowledge model
-   New content can be added continuously without structural changes

The content library can expand over time.

------------------------------------------------------------------------

# 20. Official Source Corpus

Toladot requires an explicitly managed approved-source list.

The source corpus should eventually define which works are considered
part of the official editorial base.

Possible groups:

-   Mishnah
-   Tosefta
-   Babylonian Talmud
-   Jerusalem Talmud
-   Approved Midrashic collections
-   Later rabbinic works when relevant
-   Academic/historical research sources as secondary layers

The exact corpus list is an editorial decision and should be
configurable rather than hard-coded.

------------------------------------------------------------------------

# 21. AI Architecture

## Provider Strategy

The system should not tightly couple the product to one AI vendor.

The architecture should use a provider abstraction so that future models
may come from:

-   OpenAI
-   Anthropic
-   Google
-   Other approved providers

## AI Task Mapping

Possible AI tasks:

-   Research assistance
-   Claim extraction
-   Relationship extraction
-   Source normalization
-   Biography drafting
-   Selected teaching suggestions
-   Dispute identification
-   Place identification
-   Structured data proposals
-   Image prompt generation
-   Entity portrait generation

## Output Validation

AI-generated structured data must be validated before database
insertion.

Validation should check:

-   Required fields
-   Entity references
-   Invalid dates
-   Duplicate entities
-   Unsupported relationship types
-   Missing evidence
-   Malformed source citations

## Error Handling

AI failures should never corrupt published knowledge.

Failed jobs should be:

-   Logged
-   Retryable
-   Visible to admins
-   Isolated from published data

------------------------------------------------------------------------

# 22. Data Architecture

## Recommended Primary Database

**PostgreSQL via Supabase**

Why:

-   Strong relational model
-   Structured relationships
-   Source provenance
-   Flexible search
-   Geospatial extensions if needed
-   Future vector search support
-   Mature authentication/storage ecosystem

A graph database is not required for the first architecture.

Relationship tables in PostgreSQL are sufficient unless future scale
proves otherwise.

## Core Conceptual Tables

Possible entities include:

-   users
-   people
-   person_roles
-   person_names
-   places
-   place_identifications
-   rabbinic_generations
-   political_rules
-   historical_periods
-   historical_episodes
-   historical_events
-   sources
-   source_references
-   claims
-   claim_sources
-   relationships
-   relationship_sources
-   media
-   entity_media
-   editorial_versions
-   editorial_notes
-   ai_jobs
-   ai_proposals
-   audit_logs

Exact schema design belongs to the implementation phase.

------------------------------------------------------------------------

# 23. Localization

## First Release

Hebrew only.

## UI Direction

RTL-first.

## Future Requirement

The data structure must support future translations.

Translatable content should not be designed in a way that requires
database restructuring later.

Potential future languages:

-   English
-   Additional languages as needed

------------------------------------------------------------------------

# 24. UX / UI Guidelines

## Visual Tone

-   Historical
-   Contemporary
-   Trustworthy
-   Accessible
-   Warm but not childish
-   Rich without feeling crowded

## Navigation

Primary public navigation should prioritize:

-   Search
-   Map
-   Seder HaDorot
-   Periods

## Responsive Design

Desktop:

-   Rich visual exploration
-   Hover interactions
-   Complex map and relationship views

Mobile:

-   Tap-based interactions
-   Reduced visual density
-   Simplified timeline/relationship presentations

## Accessibility

Support:

-   Keyboard navigation where practical
-   Sufficient contrast
-   Semantic headings
-   Screen-reader friendly labels
-   Touch-friendly controls
-   Reduced-motion preferences

## Feedback States

Every data-dependent screen should support:

-   Loading
-   Empty
-   Error
-   Partial-data
-   Uncertain-data states

------------------------------------------------------------------------

# 25. Technical Direction

## Development Environment

Primary recommended development environment:

**Cursor**

Other engineering agents may be used where useful:

-   Claude Code
-   Codex

Google AI Studio may be useful for prototyping AI behavior but is not
recommended as the primary long-term development environment for this
system.

## Source Control

Git repository required.

## Backend

Recommended:

-   Supabase
-   PostgreSQL
-   Supabase Auth
-   Object storage for media

## Frontend

Recommended implementation direction:

-   React
-   TypeScript
-   Next.js or equivalent production-capable React framework

The exact frontend implementation should be locked during Phase 0 before
application development begins.

## Search

Initial search:

-   PostgreSQL full-text search
-   Normalized Hebrew names
-   Alias lookup
-   Fuzzy matching where useful

Future:

-   Semantic search
-   pgvector or equivalent
-   AI question answering

## Maps

Mapping implementation must support:

-   Global coordinates
-   Historical data layers
-   Modern basemap
-   Layer toggles
-   Custom markers
-   Mobile behavior
-   Uncertainty display

The exact map library should be selected during implementation planning.

------------------------------------------------------------------------

# 26. Security

## Public Content

Read-only public access.

## Editorial System

Protected access only.

Require:

-   Authentication
-   Role-based authorization
-   Server-side permission checks
-   Protected administrative routes

## AI Security

AI prompts must not expose private credentials.

External API keys must remain server-side.

## Auditability

Important editorial changes should be logged.

------------------------------------------------------------------------

# 27. Versioning and Publishing

Published content must not be overwritten directly by AI.

Recommended conceptual model:

**AI Proposal → Editorial Draft → Approved Draft → Published Version**

The system should retain:

-   Previous versions
-   Who approved changes
-   When changes were published
-   Source/evidence changes
-   Relationship changes

Rollback should be possible.

------------------------------------------------------------------------

# 28. Performance and Cost Control

The system should avoid unnecessary AI calls.

Principles:

-   AI research is admin-triggered or workflow-triggered
-   Public page rendering should not require live AI generation
-   Published content should be stored
-   Cache public content where useful
-   Use background-style server jobs where supported, with visible job
    state to admin
-   Track AI usage and failures
-   Avoid regenerating unchanged content

AI cost must not scale directly with every public page view.

------------------------------------------------------------------------

# 29. Future Extensions

The architecture should allow, but not currently require:

-   User registration
-   Favorites
-   Saved reading lists
-   AI "Ask Toladot"
-   Community-submitted source sheets
-   Teaching activities
-   Educator workflows
-   Burial-site map layer
-   Daf Yomi integration
-   Sage of the Day
-   Quote of the Day
-   English interface
-   Additional historical eras
-   More advanced research views
-   Semantic search

Community content must remain separate from editorial encyclopedia
content.

------------------------------------------------------------------------

# 30. Success Criteria

## Adoption

Users can quickly find and understand key historical figures.

## Usage

Users move between connected pages rather than consuming isolated
articles only.

## Retention

Users return to explore additional people, places, generations, and
periods.

## Reliability

Published information has clear editorial provenance.

## Output Quality

AI-generated proposals consistently reduce editorial work without
bypassing human review.

## Editorial Scalability

The admin can continuously add new people, places, relationships, and
periods without developer intervention.

## Architectural Scalability

Expanding to Geonim, Rishonim, Acharonim, and additional geographies
does not require redesigning the core entity model.

------------------------------------------------------------------------

# 31. Key Risks and Governance

## Critical Risk --- Unsourced AI Hallucination

Cause:

AI may produce plausible but unsupported historical claims.

Consequence:

Loss of trust and publication of false information.

Mitigation:

-   AI cannot publish directly
-   Claims support source links
-   Editorial approval
-   Dispute/uncertainty model
-   Audit trail

## Critical Risk --- Weak Data Model

Cause:

Building pages as isolated documents instead of connected structured
entities.

Consequence:

Maps, timelines, relationships, search, and future expansion become
inconsistent.

Mitigation:

-   Entity-first architecture
-   Relationship tables
-   Claims and sources as structured objects
-   One shared knowledge model

## Major Risk --- False Historical Precision

Cause:

Forcing uncertain people or places into exact years or coordinates.

Consequence:

Misleading public presentation.

Mitigation:

-   Date ranges
-   Confidence levels
-   Approximate geography
-   Multiple candidate locations
-   Visible uncertainty

## Major Risk --- Editorial Overload

Cause:

AI generates more material than editors can reasonably review.

Consequence:

Large backlog and low trust.

Mitigation:

-   Prioritized review queues
-   Clear statuses
-   Batch workflows where safe
-   AI-assisted source validation
-   Dashboard coverage metrics

## Major Risk --- Visual Historical Misrepresentation

Cause:

AI portraits may be interpreted as historically accurate.

Mitigation:

-   Consistent artistic-illustration label
-   Admin replacement controls
-   No claim of likeness authenticity

## Major Risk --- Architectural Drift During Vibe Coding

Cause:

Development agents may implement shortcuts outside the approved model.

Mitigation:

Every implementation plan must be reviewed against this architecture
before execution.

------------------------------------------------------------------------

# 32. Development Roadmap

The roadmap builds the system in isolated, reviewable phases.

Each phase must be planned before implementation.

------------------------------------------------------------------------

## Phase 0 --- Architecture Foundation

### Objectives

Create the technical foundation and prevent architectural drift.

### Features

-   Repository setup
-   Frontend framework decision
-   Supabase project structure
-   Environment configuration
-   RTL/Hebrew baseline
-   Core design tokens
-   Authentication foundation
-   Initial database architecture
-   Entity/status conventions
-   Development standards

### Inputs

-   This architecture document
-   Supabase project credentials
-   Git repository
-   UI direction

### Outputs

-   Running application shell
-   Connected development database
-   Initial schema migrations
-   Auth-ready architecture
-   RTL interface foundation
-   Architecture documentation

### Acceptance Criteria

-   Application runs locally
-   Database connection works
-   Admin/public boundaries are defined
-   Schema supports future eras
-   No entity model is hard-coded to Tannaim/Amoraim only
-   Hebrew/RTL works correctly

### Validation Checklist

-   [ ] Git repository exists
-   [ ] Supabase connection verified
-   [ ] Environment secrets are not exposed client-side
-   [ ] Core schema reviewed
-   [ ] Public/admin separation defined
-   [ ] RTL baseline validated
-   [ ] Architecture review approved before Phase 1

------------------------------------------------------------------------

## Phase 1 --- Core Knowledge and Editorial Data Model

### Objectives

Build the structured knowledge foundation.

### Features

-   Person entities
-   Places
-   Generations
-   Political rules
-   Periods
-   Episodes/events
-   Sources
-   Claims
-   Relationships
-   Media
-   Draft/published states
-   Basic admin CRUD

### Inputs

-   Phase 0 architecture
-   Entity definitions
-   Editorial rules

### Outputs

-   Functional structured knowledge database
-   Admin can create/edit entities
-   Relationships and sources can be attached
-   Publication states work

### Acceptance Criteria

-   One person can connect to multiple places, relationships, periods,
    and sources
-   Disputed relationships are representable
-   Uncertain dates and places are representable
-   AI is not required to operate the basic editorial model
-   Data does not need duplication between pages

### Validation Checklist

-   [ ] Core entities created
-   [ ] Relationships are structured
-   [ ] Sources attach to claims/relationships
-   [ ] Draft vs published states validated
-   [ ] Historical uncertainty tested
-   [ ] Admin editing tested

------------------------------------------------------------------------

## Phase 2 --- Public Core Experience

### Objectives

Create the first usable public Toladot experience.

### Features

-   Homepage
-   Exact search
-   Person page
-   Place page
-   Period page
-   Episode/event presentation
-   Internal navigation
-   Source links
-   AI portrait display
-   Responsive design

### Inputs

-   Published data from Phase 1
-   UX rules
-   Initial editorial content

### Outputs

-   Public website usable without registration
-   Connected navigation between entities
-   Searchable content

### Acceptance Criteria

-   Search finds entities accurately
-   Person pages render from structured data
-   Related places/people are clickable
-   Sources open external links
-   Uncertainty is visible through progressive disclosure
-   Mobile experience is usable

### Validation Checklist

-   [ ] Homepage hierarchy matches product plan
-   [ ] Search tested in Hebrew
-   [ ] Person page tested
-   [ ] Place page tested
-   [ ] Period page tested
-   [ ] Mobile RTL tested
-   [ ] Accessibility baseline tested

------------------------------------------------------------------------

## Phase 3 --- Maps and Seder HaDorot

### Objectives

Build the primary visual exploration systems.

### Features

-   Geographic map
-   Historical/modern map layers
-   Place markers
-   Uncertainty display
-   Global geographic support
-   Vertical Seder HaDorot timeline
-   Person nodes
-   Relationship lines
-   Filters
-   Search
-   Period backgrounds
-   Mobile adaptations

### Inputs

-   Structured knowledge graph
-   Place coordinates
-   Date ranges
-   Relationship data

### Outputs

-   Interactive historical map
-   Interactive generations explorer

### Acceptance Criteria

-   Both visualizations use the same core data model
-   No duplicated historical data is maintained separately
-   Israel and Babylonia can both be represented
-   Future global expansion does not require map redesign
-   Disputed relationships display differently
-   Modern map overlay works

### Validation Checklist

-   [ ] Map reads canonical place data
-   [ ] Historical/modern layers validated
-   [ ] Seder HaDorot uses canonical relationship data
-   [ ] Node scaling reviewed
-   [ ] Mobile behavior reviewed
-   [ ] Performance tested

------------------------------------------------------------------------

## Phase 4 --- AI Editorial Research System

### Objectives

Create the AI-assisted content-production engine.

### Features

-   AI research job
-   Entity-scoped AI conversation
-   Structured proposals
-   Claim extraction
-   Relationship proposals
-   Source proposals
-   Biography drafting
-   Selected-teaching suggestions
-   Editorial approval
-   AI job status
-   Failure handling
-   Version history
-   Portrait generation workflow

### Inputs

-   Approved source corpus
-   Existing entity data
-   AI provider configuration
-   Editorial rules

### Outputs

-   Admin can create an entity and request AI research
-   AI produces structured draft proposals
-   Admin can refine proposals conversationally
-   Approved content can be published

### Acceptance Criteria

-   AI cannot publish directly
-   AI output is schema-validated
-   Every proposal has provenance where relevant
-   Failed jobs do not affect published data
-   Admin can reject individual claims
-   AI conversation remains entity-specific
-   Portrait can be regenerated or replaced

### Validation Checklist

-   [ ] AI provider abstraction implemented
-   [ ] Proposal schema validated
-   [ ] Admin approval required
-   [ ] Source references reviewable
-   [ ] Failure states tested
-   [ ] Version history tested
-   [ ] Audit logging tested

------------------------------------------------------------------------

## Phase 5 --- Production Readiness

### Objectives

Prepare Toladot for reliable public operation.

### Features

-   Security review
-   Performance optimization
-   Caching
-   Monitoring
-   Backups
-   Logging
-   Audit review
-   Search tuning
-   Mobile QA
-   Accessibility QA
-   SEO
-   Error handling
-   Cost controls
-   Editorial operational documentation

### Inputs

-   Completed previous phases
-   Production environment
-   Real editorial data

### Outputs

-   Production-ready platform
-   Operational checklist
-   Security baseline
-   Monitoring and recovery process

### Acceptance Criteria

-   Public site remains functional under expected traffic
-   Admin routes are protected
-   Database backup plan exists
-   AI cost is measurable
-   Errors are observable
-   Core pages are indexable
-   Recovery process is documented

### Validation Checklist

-   [ ] Production secrets reviewed
-   [ ] Permissions reviewed
-   [ ] Backups tested
-   [ ] Performance tested
-   [ ] SEO tested
-   [ ] Accessibility tested
-   [ ] Mobile tested
-   [ ] Monitoring verified
-   [ ] Architecture compliance review completed

------------------------------------------------------------------------

# 33. Implementation Governance

Development should proceed one phase at a time.

For every phase:

1.  Generate a phase-specific implementation prompt.
2.  Paste it into Cursor in Plan mode.
3.  Do not ask Cursor to implement immediately.
4.  Review Cursor's proposed plan against this document.
5.  Reject or correct architectural drift.
6.  Only then approve implementation.
7.  Validate acceptance criteria before moving to the next phase.

Never combine multiple phases into one implementation request.

------------------------------------------------------------------------

# 34. Plain-Language Glossary

## MVP

The first version that provides real value and can genuinely be used.

## Migration

A structural database or system change that modifies existing stored
information.

## Entity

A structured object the system recognizes independently, such as a
person, place, period, source, or event.

## Knowledge Graph

The network of entities and the relationships between them.

## Admin

The private management area used by approved editors.

## Draft

Content that exists in the system but is not yet public.

## Publish

Make approved content visible to the public.

## Source Corpus

The approved collection of works and source types the editorial system
is allowed to use as its official evidence base.

## Phase

One isolated stage of system development.

------------------------------------------------------------------------

# 35. Architectural Decision Summary

The following decisions are currently considered approved:

-   Product name: Toladot
-   Hebrew-first and RTL-first
-   Public access without registration
-   Future user accounts supported
-   Initial scope through completion of the Talmud
-   Future expansion to Geonim, Rishonim, Acharonim, and beyond
-   Structured knowledge model
-   People, places, periods, episodes, events, claims, sources, and
    relationships are structured
-   Major non-Jewish rulers do not require public person pages
-   AI portraits are created by default for Toladot people
-   Admin may replace or regenerate portraits
-   Exact/fuzzy entity search first
-   AI conversational search later
-   External source links rather than full source-text library
-   Geographic architecture is global
-   Initial map emphasis is Israel and Babylonia
-   Historical and modern map comparison supported
-   Future burial-site map layer supported
-   Selected teachings only, with emphasis on worldview, ethics, and
    spiritual thought
-   AI assists research and editing
-   AI does not publish without human approval
-   Supabase/PostgreSQL is the recommended primary data platform
-   Cursor is the recommended primary development environment
-   Development proceeds phase by phase

# 36. PRD v2 --- Approved Product Upgrades

This section is normative and overrides earlier wording where a conflict
exists.

## 36.1 Person Stories / Narratives

Every Person Page may contain a dedicated **Stories** section, separate
from the main biography and from Selected Teachings.

Stories should be selected from the approved source corpus and should
primarily illuminate:

-   Character
-   Conduct
-   Middot / ethical qualities
-   Leadership
-   Personality
-   Faith
-   Torah devotion
-   Meaningful historical experience

A story does not need to be a major chronological milestone in the
person's biography.

A Story is a reusable structured entity rather than duplicated page
text.

A Story may relate to:

-   One or more people
-   Places
-   Historical periods
-   Historical episodes/events
-   Sources
-   Themes

### Person-Specific Narrative Significance

A person's participation in a Story must include a significance level:

-   Primary
-   Major
-   Supporting
-   Mentioned

This determines how prominently the Story appears on each Person Page.

A story centered on Rabbi Shimon bar Yochai, for example, may be
`Primary` for him while another sage appearing in the same narrative may
be `Supporting` or `Mentioned`.

AI may propose this classification. Editors may override it.

Each Story should support:

-   Title
-   Accessible editorial retelling
-   Short significance/explanation
-   Exact source reference
-   External source link where available
-   Themes/tags
-   Related entities
-   Editorial status

## 36.2 Seder HaDorot --- Timeline and Hebrew Alphabetical Index

Seder HaDorot must support two distinct navigation modes over the same
canonical Person dataset.

### Timeline View

The primary historical experience, organized chronologically.

### Hebrew Alphabetical Index

A Hebrew alphabetical directory for finding people by name.

Honorifics must not determine alphabetical sorting.

Examples:

-   Rabbi Akiva → sorted under Akiva
-   Rabban Gamliel → sorted under Gamliel
-   Rav Huna → sorted under Huna

Store a dedicated normalized `sort_name` rather than repeatedly deriving
sorting behavior in the UI.

The alphabetical view must not rearrange the historical graph into
alphabetical order. It is a separate index.

Users should be able to open a Person Page from the index and, where
useful, jump to that person's position in the chronological Seder
HaDorot view.

## 36.3 Same-Name People and Identity Safety

A person's name is not the person's identity.

Multiple historical people may share the same or similar names. Every
Person must have a unique internal identifier.

The system must never merge two people merely because their names match.

Person identity metadata should support:

-   Display name
-   Sort name
-   Titles
-   Alternative names
-   Aliases
-   Spelling variants
-   Rabbinic generation/category
-   Approximate activity period
-   Geography
-   Known relationships
-   Disambiguation label

Search results must disambiguate same-name people using useful
contextual labels, for example:

**Rabbi Yohanan** --- Amora · Land of Israel · Second generation

**Rabbi Yohanan** --- Tanna · \[relevant generation/context\]

AI entity resolution must use contextual evidence from the source and
existing knowledge graph.

If identity remains ambiguous, the required result is:

`Identity unresolved — editorial review required`

AI must not guess.

Potential duplicate detection is required before creation of reusable
entities such as People, Places, Stories, and Sources.

Ambiguous entities must never be automatically merged. Any future merge
operation must preserve provenance and be auditable.

## 36.4 AI Research Policy

The governing research principle is:

> **Research aggressively. Infer cautiously. Never convert uncertainty
> into fact.**

AI should actively attempt to find missing information rather than
passively leaving every gap untouched.

However, valid research outcomes include:

-   Supported
-   Estimated
-   Disputed
-   Conflicting sources
-   Unknown
-   No sufficient source found
-   Secondary claim found but primary evidence not located
-   Identity unresolved

These are legitimate outcomes.

The AI must not fabricate a conclusion merely to make a Person Page
appear complete.

## 36.5 Knowledge States

Claims, relationships, dates, locations, and identifications should
support explicit knowledge states such as:

-   Known
-   Estimated
-   Disputed
-   Unknown

Uncertainty is part of the historical model, not a UI error.

## 36.6 Life Range vs Activity Range

Model separately:

-   `life_range` --- birth/death or estimated lifespan when supported
-   `activity_range` --- period during which the person is known to have
    been active

The system must not invent birth or death years merely to position a
person on a timeline.

When life dates are unknown but activity is known, the Seder HaDorot
visualization should use the supported activity range or generation.

## 36.7 Person Page --- Contemporaries

Person Pages should include a concise **Contemporaries** section showing
selected people whose supported activity/life ranges overlap.

Provide a direct navigation action such as:

**Show in Seder HaDorot**

## 36.8 Person Page --- The World During Their Lifetime

Person Pages should include a concise contextual module showing
relevant:

-   Rabbinic generation
-   Political rule
-   Major historical episodes/events
-   Major Jewish centers

Applicable items should be navigable.

This module should provide orientation without replacing the full Period
Page.

## 36.9 Period Experience and Historical Events

The homepage retains the primary hierarchy:

1.  Search
2.  Map
3.  Seder HaDorot
4.  Periods

The **Periods** area is broader than a list of ruling powers.

Each period is a historical exploration environment connecting:

-   Political rule
-   Jewish historical developments
-   Major historical episodes
-   Major events
-   Important sages
-   Jewish centers
-   Maps
-   Timeline

For example, the Hellenistic/Greek period may surface the decrees of
Antiochus, the Hasmonean Revolt, Hanukkah, relevant locations, and the
transition toward Hasmonean rule.

Historical episodes and events exist to contextualize the core Jewish
historical narrative. Non-Jewish rulers may be represented as structured
historical context without receiving full public Person Pages.

## 36.10 Editorial Coverage and Missing-Knowledge Dashboard

The Admin system must help editors identify incomplete knowledge, not
merely count published pages.

Examples of useful findings:

-   Published Person with unsupported relationship
-   Place referenced by many entities but lacking a completed Place Page
-   Person referenced by relationships but not yet researched
-   Person with no selected Stories
-   Claim missing an exact source
-   Ambiguous identity awaiting review
-   Potential duplicate entities
-   AI research job requiring editorial decision

The system must distinguish:

-   genuinely unknown historical information
-   unresolved research
-   incomplete editorial work

## 36.11 Entity Resolution and Duplicate Prevention

Before creating a new reusable entity, the system should search for
possible existing matches.

For Person entities, matching may consider:

-   Names and aliases
-   Generation
-   Activity period
-   Geography
-   Teachers/students
-   Family
-   Source context

Possible outcomes:

-   Existing entity confirmed
-   New entity confirmed
-   Possible duplicate --- editorial review required
-   Identity unresolved --- editorial review required

This is a core data-integrity control.

## 36.12 AI Portrait Direction

Every core Toladot Person should receive a default AI-generated profile
illustration.

Visual direction:

-   Realistic painted portrait
-   Clearly an artwork rather than a historical photograph
-   Human and emotionally engaging
-   Visually distinct across people
-   No claim that facial features are historically authentic

The AI is allowed to invent the face.

The purpose is human connection, not visual reconstruction.

Admin controls must allow:

-   Regenerate portrait
-   Select another generated portrait
-   Upload a replacement image
-   Replace the media later

Public UI should use a subtle consistent label such as **Artistic
Illustration**.

## 36.13 Updated Conceptual Data Model Additions

The conceptual schema should additionally support structures equivalent
to:

-   person_identity_aliases
-   normalized person sort names
-   stories
-   story_people
-   story_sources
-   story_places
-   story_themes
-   person life ranges
-   person activity ranges
-   entity-resolution candidates
-   duplicate-review state

Exact table names are implementation decisions, but these capabilities
are architectural requirements.

## 36.14 Updated AI Task Mapping

AI tasks may additionally include:

-   Story discovery
-   Story summarization
-   Narrative-significance classification
-   Entity resolution
-   Duplicate detection
-   Identity ambiguity detection
-   Missing-knowledge detection
-   Contextual relationship research

## 36.15 Critical Risk --- Historical Identity Collision

### Cause

Multiple people may share the same or similar names, and automated
research may assign evidence to the wrong Person.

### Consequence

Biographies, relationships, stories, sources, maps, and timelines may
become silently corrupted.

### Severity

**Critical**

### Required Mitigation

-   Unique internal Person IDs
-   Contextual identity metadata
-   Alias model
-   Duplicate detection
-   AI entity-resolution workflow
-   Explicit unresolved state
-   Human review for ambiguous identity or merge decisions
-   Auditable merge behavior

### Approval Effect

Any implementation that automatically merges ambiguous historical people
based primarily on name similarity must be rejected.

## 36.16 Phase Impact

These additions modify the existing roadmap as follows.

### Phase 1 --- Core Knowledge and Editorial Data Model

Must additionally include:

-   Person aliases and normalized sort names
-   Same-name identity safeguards
-   Stories and Story-to-Person significance
-   Life range vs activity range
-   Duplicate detection foundations
-   Explicit knowledge states

### Phase 2 --- Public Core Experience

Must additionally include:

-   Person Stories section
-   Contemporaries
-   "World During Their Lifetime" context
-   Same-name search disambiguation
-   Richer Period pages connecting episodes/events

### Phase 3 --- Maps and Seder HaDorot

Must additionally include:

-   Hebrew alphabetical Person index
-   Honorific-insensitive sorting
-   Jump from alphabetical index to chronological view

### Phase 4 --- AI Editorial Research System

Must additionally include:

-   Story discovery and significance proposals
-   Entity-resolution workflow
-   Duplicate warnings
-   Explicit unresolved/unknown AI outcomes
-   Missing-knowledge detection

------------------------------------------------------------------------

# 37. Updated Architectural Decision Summary

The following decisions are approved:

-   Product name: Toladot
-   Hebrew-first and RTL-first
-   Public encyclopedia-style access without registration
-   Future user accounts for favorites and related personal features
-   Initial historical scope through completion of the Talmud
-   Architecture supports Geonim, Rishonim, Acharonim, and later eras
-   Structured entity-first knowledge model
-   Core public people are major Jewish sages and relevant major Jewish
    figures
-   Important non-Jewish rulers provide historical context but do not
    require full Person Pages
-   Exact/fuzzy structured search first; conversational AI search later
-   Same-name people must be explicitly disambiguated
-   Honorifics do not determine Hebrew alphabetical sorting
-   Seder HaDorot includes chronological and Hebrew alphabetical
    navigation modes
-   Geographic architecture is global, initially emphasizing Israel and
    Babylonia
-   Historical and modern map comparison is supported
-   Future map layers may include burial sites
-   Person Pages include biography, timeline, places, relationships,
    historical context, selected teachings, Stories, sources, and
    uncertainty
-   Stories are reusable structured entities
-   Story prominence is person-specific
-   Selected teachings emphasize worldview, ethics, character, and
    spiritual thought rather than exhaustive halakhic indexing
-   Life dates and activity dates are separate
-   Knowledge may explicitly be known, estimated, disputed, or unknown
-   AI actively researches but does not fabricate certainty
-   AI never publishes encyclopedia content autonomously
-   AI-generated portraits are realistic paintings and may use invented
    faces
-   Portraits remain replaceable by editors
-   Admin dashboard surfaces editorial coverage gaps and identity
    ambiguity
-   External source references and links are used instead of building a
    full primary-text library in the first release
-   Supabase/PostgreSQL remains the recommended primary data platform
-   Cursor remains the recommended primary development environment
-   Development proceeds one reviewed phase at a time

# 38. Smart Generational Chronology Extension

This section is a normative extension to the existing Toladot
architecture. It does not replace the existing Rabbinic Generation,
Person, Relationship, Seder HaDorot, or editorial workflow models.

## 38.1 Product Requirement

For Tannaim, Amoraim, and future categories where generational placement
is editorially useful, Toladot must model more than a broad generation
assignment.

Each applicable Person may also have a **relative chronological position
within the generation**. The system must represent knowledge such as:

-   Among the older, middle, or younger figures of the generation
-   Active only during an early, middle, or late portion of the
    generation
-   Continued to live or remain active into the following generation
-   Spanned more than one generation
-   Known to precede or follow another Person
-   Chronologically constrained by teacher/student relationships
-   Chronologically unresolved

The architecture must preserve three separate concepts:

1.  **Rabbinic Generation**
2.  **Relative Position / Activity Within a Generation**
3.  **Teacher--Student Relationship**

These concepts may inform one another during AI-assisted reasoning, but
they must never be collapsed into one field. A student may belong to the
same generation as a teacher, and a Person may span more than one
generation.

## 38.2 Editorial UX --- Simple-Language Chronology Input

Editors must not be required to enter percentages, graph coordinates,
normalized scores, or arbitrary numeric chronology values.

The Admin interface should collect chronology knowledge using
simple-language questions such as:

-   "Was this person among the older, middle, or younger figures of the
    generation?"
-   "Was this person active throughout the generation or only during
    part of it?"
-   "Did this person continue into the next generation?"
-   "Who is known to have been active before this person?"
-   "Who is known to have been active after this person?"
-   "Who were this person's teachers?"
-   "Who were this person's students?"

The editor may also provide a free-text chronological description.

The interface must remain understandable to a non-technical editor.

## 38.3 AI-Assisted Chronology Interpretation

AI should translate qualitative editorial input, approved historical
evidence, existing relationships, generation assignments, and known
life/activity ranges into an internal chronology proposal.

AI may derive implementation-oriented values such as:

-   Relative ordering rank
-   Approximate internal position within a generation
-   Proposed activity span across one or more generations
-   Proposed visual start/end position
-   Chronological constraints relative to other people
-   Confidence and explanation

Editors should not be required to calculate these internal values
manually.

AI chronology reasoning must follow the existing Toladot rule:

> **Research aggressively. Infer cautiously. Never convert uncertainty
> into fact.**

## 38.4 Chronology Proposal and Approval UX

Before chronology-derived placement becomes approved editorial data, the
Admin interface must present the proposal visually and in plain
language.

The editor should be able to review:

-   Assigned generation(s)
-   Relative placement inside the generation
-   Proposed activity span
-   Whether the Person extends into another generation
-   Relevant before/after constraints
-   Relevant teacher/student relationships
-   Confidence or unresolved conflicts
-   Proposed Seder HaDorot placement and block length

The editor must be able to approve, correct, add clarification, request
AI re-evaluation, or leave the placement unresolved.

AI must not silently overwrite editor-approved chronology.

## 38.5 Chronological Conflict Detection

The system should detect and surface contradictions such as:

-   A proposed placement incompatible with supported dates
-   Conflicting before/after constraints
-   Activity-span conflicts
-   AI placement that contradicts an approved generation
-   Teacher/student evidence that creates a chronological concern

A detected contradiction is a review finding. It does not authorize AI
to rewrite evidence automatically.

## 38.6 Data Model Requirements

Extend the existing model to support equivalents of:

-   Primary rabbinic generation
-   Additional/overlapping generation where applicable
-   Relative generational band: older / middle / younger / custom /
    unresolved
-   Partial-generation activity descriptor
-   Continues-into-next-generation state
-   Structured activity range
-   Relative before/after constraints between People
-   Free-text editorial chronology note
-   AI-derived internal chronology score/rank
-   AI-derived proposed visual start/end positions
-   Chronology confidence/status
-   Chronology proposal state
-   Editor approval state
-   Chronology provenance
-   Chronology revision history

Exact database field/table names remain implementation decisions.

Numeric ranking and visual-position values are **derived system data**,
not the primary historical truth. The historical/editorial inputs that
produced them must remain available and auditable.

## 38.7 Seder HaDorot Visual Placement

Approved chronology data should drive:

-   Relative placement of a Person
-   Ordering among people in the same generation
-   Visual length of the Person node/block
-   Cross-generation continuation
-   Relationship rendering context

The visualization must not assume that all members of a generation
occupy the same chronological position or identical time span.

Teacher/student edges remain relationship data. The layout engine may
use them as contextual constraints, but relationship direction alone
must not define generation assignment.

## 38.8 Technical Requirements --- Chronology Engine

Implementation must:

-   Separate editorial facts from AI-derived layout values
-   Preserve editor-approved chronology
-   Recompute derived placement when relevant approved inputs change
-   Avoid unnecessary recomputation of unrelated People
-   Detect contradictory constraints
-   Support unresolved chronology
-   Preserve revision/audit history
-   Support People spanning multiple generations
-   Support same-generation teacher/student relationships
-   Expose a stable Person-to-Seder-HaDorot navigation target

Public rendering must not depend on a live AI call. Approved chronology
and derived placement should be persisted or deterministically
computable from persisted approved data.

------------------------------------------------------------------------

# 39. "Jump to Seder HaDorot Position" Extension

## 39.1 Public Person Page UX

Every applicable Tanna/Amora Person Page must include a prominent action
labeled:

**קפוץ למיקום בסדר הדורות**

## 39.2 Navigation Behavior

On activation, the application must:

1.  Navigate to the Seder HaDorot explorer.
2.  Preserve the target using the Person's unique canonical identifier.
3.  Load the relevant chronological region.
4.  Expand any collapsed/grouped region required to expose the target.
5.  Scroll/pan to the target Person.
6.  Adjust zoom when necessary.
7.  Temporarily highlight the target node/block for several seconds.
8.  Leave the explorer in its normal interactive state so the user can
    continue browsing.

The target must never be resolved by display name alone.

## 39.3 UX Requirements

The transition should feel like contextual navigation.

The highlight must be noticeable without blocking interaction. Animated
movement and zoom must respect reduced-motion accessibility preferences.

If exact placement is unresolved, the UI must not silently fail. It
should open the closest known generation/region, explain that exact
placement is not yet determined, and allow normal exploration.

## 39.4 Group and Cluster Expansion

Deep-link navigation must reveal targets hidden inside collapsed groups,
clusters, generation sections, or virtualized regions.

The navigation controller should:

-   Identify containing group(s)
-   Expand required group(s)
-   Wait until the target is rendered
-   Center/focus the target
-   Apply temporary highlighting

The same mechanism should support arrival from Person Pages, the Hebrew
alphabetical index, search results, and future internal links.

## 39.5 Technical Requirements --- Stable Deep Linking

Seder HaDorot must expose a stable navigation contract based on
canonical Person identity.

Support:

-   Direct Person targeting
-   Browser refresh without losing the intended target where practical
-   Back/forward navigation
-   Expansion of collapsed ancestors/groups
-   Programmatic pan/scroll
-   Programmatic zoom
-   Temporary highlighting
-   Graceful fallback for unresolved placement
-   Mobile-compatible target focusing

The exact URL structure is an implementation decision.

## 39.6 Data Model Requirements

The model must support data needed to resolve a Person into Seder
HaDorot, potentially including:

-   Canonical Person ID
-   Approved generation assignment
-   Approved/derived chronology placement
-   Containing group/section identifiers
-   Visual placement metadata
-   Placement status
-   Layout/version identifier where needed

Visual coordinates must never become the historical source of truth.
Historical chronology produces the visualization, not the reverse.

------------------------------------------------------------------------

# 40. Roadmap Impact of Extensions 38--39

These requirements extend the existing phases without changing the
roadmap structure.

## Phase 1 --- Core Knowledge and Editorial Data Model

Add:

-   Relative generational chronology model
-   Cross-generation activity representation
-   Before/after chronological constraints
-   Separation of generation, chronology position, and teacher/student
    relationships
-   Free-text chronology notes
-   Chronology proposal/approval state
-   Chronology provenance and revision history

## Phase 2 --- Public Core Experience

Add:

-   Prominent "קפוץ למיקום בסדר הדורות" action on applicable Person
    Pages
-   Stable Person-to-Seder-HaDorot navigation intent
-   Graceful fallback when exact chronology is unresolved

## Phase 3 --- Maps and Seder HaDorot

Add:

-   Chronology-aware intra-generation layout
-   Variable Person block length based on approved activity span
-   Cross-generation Person rendering
-   Same-generation teacher/student support
-   Deep-link target resolution
-   Automatic group expansion
-   Programmatic scroll/pan and zoom
-   Temporary target highlighting
-   Reduced-motion behavior
-   Browser-navigation compatibility

## Phase 4 --- AI Editorial Research System

Add:

-   Natural-language chronology questionnaire
-   Free-text chronology interpretation
-   AI-derived internal chronology proposal
-   Chronological constraint reasoning
-   Conflict detection
-   Visual placement preview before approval
-   Editor correction/re-evaluation workflow

------------------------------------------------------------------------

# 41. Additional Acceptance Criteria

## Smart Generational Chronology

-   Editor can describe older/middle/younger placement without numeric
    percentages.
-   Editor can indicate continuation into the next generation.
-   A Person can span multiple generations.
-   Teacher and student can belong to the same generation.
-   Generation, intra-generation position, and teacher/student
    relationship remain separately editable.
-   AI can propose internal chronology from qualitative input.
-   Editor sees the proposed placement before approval.
-   Unresolved/conflicting chronology can remain unresolved.
-   Approved chronology has revision/audit history.

## Jump to Seder HaDorot

-   Applicable Person Page exposes the required button.
-   Navigation targets canonical Person ID, not name.
-   Explorer reveals a target hidden in a collapsed group.
-   Explorer scrolls/pans and zooms to make the target visible.
-   Target receives a temporary highlight.
-   User can immediately continue normal exploration.
-   Reduced-motion preferences are respected.
-   Missing exact placement produces an explicit fallback state.

# 42. Relationship Visual Language Extension

This is a normative extension to the existing Relationship and Seder
HaDorot architecture. It does not replace the existing structure.

## 42.1 Core Relationship Families

The initial Seder HaDorot visualization should support four primary
relationship families:

1.  **Teacher--Student** --- directional, semantically from teacher to
    student.
2.  **Parent--Child** --- directional, semantically from parent to
    child.
3.  **Spouse / Sibling** --- non-directional family relationships;
    stored as distinct subtypes.
4.  **Bar Plugta / Significant Intellectual Counterpart** ---
    non-directional and reserved for a meaningful recurring or
    editorially significant intellectual/disputational relationship. A
    single disagreement must not automatically create this relationship.

Additional relationship types may exist in the data model later, but are
not required as primary Seder HaDorot visual connections now.

## 42.2 Relationship Type and Certainty Are Separate

Relationship meaning and historical certainty are separate dimensions.

Examples:

-   Teacher--Student + Supported
-   Teacher--Student + Disputed
-   Parent--Child + Estimated
-   Bar Plugta + Supported

A disputed relationship is not a separate relationship type.

Relationships should support type, subtype, directionality, importance,
evidence/sources, certainty, dispute state, editorial note, publication
state, provenance, and revision history.

## 42.3 Visual Encoding --- Final Design Intentionally Open

Relationship families must be visually distinguishable, but the PRD does
**not** yet lock final colors, arrowheads, line shapes, endpoint
symbols, or exact styling.

The final visual language may combine:

-   Line style
-   Endpoint markers
-   Direction markers
-   Symbols
-   Line weight
-   Color
-   Opacity

Color must not be the only carrier of meaning.

Final styling must be validated on a representative dense Seder HaDorot
prototype before becoming a fixed design-system rule.

## 42.4 Uncertainty and Dispute Visualization

Supported, estimated, and disputed relationships must be distinguishable
without hiding the underlying relationship type.

Possible prototype techniques include patterned/dashed treatment,
opacity, an uncertainty marker, or another secondary visual signal.

The exact treatment remains a UX prototype decision.

Hover/tap/focus must always state certainty explicitly in text.

## 42.5 Person-Level Uncertainty

Uncertainty may also apply to Person identity, dating, or generational
placement independently of relationship uncertainty.

The UI should support a subtle Person-level uncertainty indicator and an
accessible explanation.

Exact styling remains open for prototype validation.

## 42.6 Selected-Person Focus

When a user selects a Person:

-   Direct relationships become prominent.
-   Unrelated connections become visually subdued.
-   The selected Person remains clearly identifiable.
-   Relationships remain inspectable through hover/tap/focus.
-   Normal exploration remains available.

This focus behavior is a primary mechanism for reducing dense-graph
overload.

## 42.7 Relationship Filters

Initial visibility controls should support:

-   Teacher--Student
-   Family
-   Bar Plugta
-   Disputed / uncertain relationships

Family may optionally expose subfilters for Parent--Child, Spouse, and
Sibling.

The default must prioritize readability rather than showing every
available edge simultaneously.

## 42.8 Legend

Seder HaDorot must include an accessible legend explaining active
relationship families, directionality, certainty/dispute treatment, and
any symbols used.

Users must not be expected to memorize unexplained visual codes.

## 42.9 Relationship Details

Hover on desktop and tap/focus on touch/keyboard interfaces should
expose:

-   Relationship type
-   People involved
-   Explicit roles for directional relationships
-   Certainty/status
-   Sources
-   Short editorial note where relevant
-   Dispute explanation where relevant

Directional relationships must be described with explicit role labels
rather than relying on arrow orientation alone.

Example:

-   Teacher: Person A
-   Student: Person B

or:

-   Parent: Person A
-   Child: Person B

## 42.10 RTL Direction Safety

Because Toladot is Hebrew-first and RTL-first, semantic direction must
never depend on text-arrow glyphs or DOM directionality.

Direction must be stored structurally.

Rendering determines graphical direction independently from Hebrew text
flow.

This is mandatory for Teacher--Student and Parent--Child relationships.

## 42.11 Prototype Gate

Before final relationship styling is locked, test at least three
visual-language variants using the same representative graph of
approximately 30--50 People with realistic mixtures of:

-   Teacher--Student
-   Family
-   Bar Plugta
-   Supported and disputed relationships
-   Same-generation relationships
-   Cross-generation relationships

Evaluate immediate comprehension, clutter, selected-Person tracing,
relationship distinction, uncertainty distinction, RTL clarity, mobile
usability, and accessibility without color dependence.

------------------------------------------------------------------------

# 43. Data Model Extension --- Relationship Presentation

Canonical Relationship data remains semantic and evidence-based.

Do not store presentation meaning such as "blue dashed arrow" as
historical data.

The presentation layer maps semantic properties to the current design
system, allowing future redesign without changing historical knowledge.

------------------------------------------------------------------------

# 44. Technical Requirements --- Relationship Rendering

The renderer must:

-   Correctly render directional and non-directional relationships
-   Remain semantically correct under RTL
-   Support multiple relationship families
-   Treat certainty independently from relationship type
-   Support filters without changing canonical data
-   Support selected-Person focus
-   Support hover, tap, keyboard focus, and accessible descriptions
-   Avoid color-only meaning
-   Handle dense graphs without displaying every edge at full prominence
-   Preserve performance as relationship counts grow
-   Use canonical Person IDs rather than names
-   Support same-generation and cross-generation relationships

------------------------------------------------------------------------

# 45. Roadmap Impact --- Relationship Visual Language

These requirements extend the existing phases without changing the
roadmap structure.

## Phase 1 --- Core Knowledge and Editorial Data Model

Add:

-   Four initial relationship families
-   Explicit directionality
-   Relationship importance
-   Certainty/dispute independent of type
-   Provenance/source support
-   RTL-safe semantic direction

## Phase 2 --- Public Core Experience

Add:

-   Human-readable relationship details
-   Explicit role labels
-   Person-level uncertainty explanation

## Phase 3 --- Maps and Seder HaDorot

Add:

-   Relationship filters
-   Legend
-   Selected-Person focus
-   Unrelated-edge de-emphasis
-   Directional/non-directional rendering
-   Uncertainty/dispute rendering
-   Three-variant dense-graph prototype gate
-   RTL, mobile, and accessibility validation

## Phase 4 --- AI Editorial Research System

Add:

-   AI relationship-type proposals
-   AI relationship-importance proposals
-   AI certainty/dispute proposals
-   Bar Plugta significance evaluation
-   Relationship evidence proposals

All AI proposals require editorial approval.

------------------------------------------------------------------------

# 46. Additional Acceptance Criteria --- Relationship System

-   Teacher--Student direction is semantically stored from teacher to
    student.
-   Parent--Child direction is semantically stored from parent to child.
-   Spouse and sibling are non-directional.
-   Bar Plugta is non-directional and requires meaningful editorial
    significance.
-   Relationship type and certainty are independently editable.
-   A disputed Teacher--Student relationship remains identifiable as
    Teacher--Student.
-   RTL cannot reverse semantic relationship meaning.
-   Selecting a Person emphasizes direct relationships and subdues
    unrelated edges.
-   Users can filter relationship families.
-   A legend explains the active visual language.
-   Hover/tap/focus provides explicit textual meaning.
-   The experience does not rely on color alone.
-   Final arrow/line styling is not approved until tested on a
    representative dense prototype.
