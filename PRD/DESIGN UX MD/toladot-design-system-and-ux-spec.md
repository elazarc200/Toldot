# Toladot Design System & UX Specification

**Document ID:** `toladot-design-system-and-ux-spec`\
**Product:** Toladot (תולדות)\
**Status:** Design baseline for implementation\
**Language direction:** Hebrew-first, RTL-first\
**Primary implementation context:** Existing Toladot Next.js
application\
**Design implementation workflow:** Design specification → visual
implementation/prototype → architecture review → production integration

------------------------------------------------------------------------

## 1. Purpose

This document is the source of truth for the public-facing UX and visual
design of Toladot.

It defines how Toladot should look, behave, organize information, and
communicate historical knowledge across its public experience. It is
intentionally implementation-oriented: a design or coding agent should
be able to use this specification to produce a faithful interface
without redesigning the product, changing its information architecture,
or inventing new product behavior.

This specification does **not** replace the existing technical
architecture. It sits above the implementation layer and governs the
presentation and interaction model.

### Non-negotiable rule

> A design or coding agent may improve visual execution inside this
> specification, but it may not silently change product behavior, entity
> semantics, data contracts, publication rules, historical uncertainty
> rules, or application architecture.

------------------------------------------------------------------------

# 2. Product UX North Star

Toladot is a Hebrew-first contextual knowledge and historical
exploration platform.

Its experience should help a user move naturally through:

**Find → Understand → Discover → Follow → Reorient → Discover again**

Toladot should not behave like a generic encyclopedia, dashboard, social
feed, or AI recommendation product.

Discovery should emerge from historical context itself.

A user reading about Hillel should naturally encounter Shammai, the
period, places, stories, teachings, and historical context because those
relationships explain Hillel --- not because an algorithm decided to
recommend another page.

### Core principle

> Context creates discovery.

### Experience depths

Toladot supports three levels of engagement:

1.  **Quick Understanding** --- within approximately 10--20 seconds,
    understand who or what the entity is and why it matters.
2.  **Exploration** --- move through biography, chronology, geography,
    relationships, stories, teachings, events, and context.
3.  **Evidence & Deepening** --- inspect sources, evidence, uncertainty,
    disputes, and research context when desired.

The interface must support all three without forcing every user into the
deepest layer.

------------------------------------------------------------------------

# 3. Brand & Visual Character

## 3.1 Desired character

Toladot should feel like a:

**Premium Digital Knowledge Exploration Experience**

The visual language should be:

-   intelligent
-   calm
-   inviting
-   authoritative
-   contemporary
-   distinctly Hebrew
-   historically aware
-   information-rich without visual noise
-   crafted rather than decorative

"Premium" must not mean excessive whitespace, luxury ornament, or
oversized marketing typography.

> Premium = excellent hierarchy inside information density.

A user should feel comfortable exploring Toladot for 30 minutes, not
merely admiring a landing page for 30 seconds.

## 3.2 Visual direction

The approved directional blend is:

-   **70% Living History**
-   **20% Editorial Heritage**
-   **10% Contemporary Knowledge Atlas**

### Living History

Maps, people, chronology, geographic context, historical exploration,
subtle period atmosphere.

### Editorial Heritage

Restraint, credibility, warm paper-like surfaces, careful composition,
historical seriousness.

### Knowledge Atlas

Clear data visualization, lines, coordinates, temporal structures, map
systems, structured information.

## 3.3 What Toladot must avoid

Do not use:

-   parchment UI
-   fake ancient scrolls
-   excessive gold
-   generic Judaica decoration
-   Stars of David as default decoration
-   ornamental "biblical" fonts
-   dark museum-like interfaces as the primary experience
-   SaaS dashboard aesthetics
-   excessive card grids
-   excessive rounded rectangles
-   oversized empty whitespace
-   visual complexity that competes with the content
-   decorative historical imagery that implies unsupported facts

Historical identity should emerge from **content, Hebrew typography,
maps, portraits, chronology, sources, illustration, and composition**.

------------------------------------------------------------------------

# 4. Typography

## 4.1 Primary typeface

**Heebo** is the approved primary interface and editorial typeface.

It should be used across:

-   navigation
-   headings
-   long-form Hebrew reading
-   entity identity areas
-   maps
-   Seder HaDorot
-   search
-   forms
-   controls
-   labels
-   source interfaces

Do not introduce a Hebrew serif as the default editorial font.

Historical character should come from the surrounding visual system
rather than from typographic nostalgia.

## 4.2 Typographic hierarchy

The implementation should define a responsive type scale rather than
hard-code page-specific font sizes.

Recommended initial token direction:

  Token        Desktop intent   Mobile intent
  ------------ ---------------- ---------------
  Display      48--56px         36--42px
  H1           38--46px         30--36px
  H2           28--34px         24--28px
  H3           21--25px         19--22px
  Body Large   18--20px         17--19px
  Body         16--18px         16--17px
  Supporting   14--15px         14--15px
  Metadata     12--13px         12--13px

These values are starting constraints, not permission to create large
marketing-style typography.

Long-form Hebrew content should prioritize comfortable line length and
generous line height.

Recommended body line-height: approximately **1.65--1.85**, depending on
final font size.

## 4.3 Reading width

Long-form narrative uses a **focused reading column**.

It should not be blog-narrow, but it must remain substantially narrower
than the full application canvas.

Contextual knowledge modules may expand beyond the reading column.

This creates the core page rhythm:

> **Reading Column + Expanding Knowledge Layers**

------------------------------------------------------------------------

# 5. Color System

The final palette should preserve the approved direction rather than
copy temporary prototype values literally.

## 5.1 Core palette

### Deep Ink / Navy

Primary authority color.

Use for:

-   major headings
-   primary text emphasis
-   navigation
-   selected states
-   important map/Seder elements
-   high-contrast controls

Initial reference: `#19335A`

### Warm Ivory

Primary page surface.

Use instead of sterile pure white where appropriate.

Initial reference: `#FBF9F4`

### Paper

Raised editorial surface.

Initial reference: `#FFFEFA`

### Warm Ochre / Historical Gold

Restrained accent.

Use for:

-   selected historical accents
-   small dividers
-   focus details
-   temporal markers
-   highlighted editorial metadata

Initial reference range: `#B98D4D` -- `#BD9353`

Never allow gold to dominate the interface.

### Pale Historical Blue

Geographic/water/map atmosphere.

Initial reference: `#D5E6ED`

### Muted Ink / Stone

Secondary text and supporting metadata.

Initial reference range: `#536174` -- `#727979`

## 5.2 Semantic colors

Semantic states must be defined separately from historical/brand colors:

-   success
-   warning
-   error
-   informational
-   disabled
-   focus

Historical uncertainty must **not** rely on warning colors alone.

Color must never be the only carrier of meaning.

------------------------------------------------------------------------

# 6. Surfaces, Shape & Composition

Toladot should not be built as a stack of rectangular cards.

Use containers only when they provide a meaningful grouping or
interaction boundary.

Prefer:

-   editorial sections
-   overlapping layers
-   map-backed compositions
-   quiet dividers
-   controlled changes of background surface
-   asymmetrical but disciplined desktop layouts
-   occasional soft organic shapes
-   contextual modules that break out from the reading column

Avoid:

-   identical card treatment for every content type
-   excessive shadows
-   large floating dashboard panels
-   repeated boxes around plain text
-   unnecessary borders

## Radius

Rounded corners should be moderate and purposeful.

Small controls may use compact radii. Larger editorial surfaces may use
softer shapes. Do not apply one large radius to every object.

## Shadows

Shadows should be subtle and primarily indicate elevation or overlay
behavior.

They are not a default decoration.

------------------------------------------------------------------------

# 7. Spacing & Density

Toladot is intentionally information-rich.

Use spacing to establish hierarchy, not to create emptiness.

### Density principles

-   Related information should remain visibly related.
-   Narrative paragraphs should breathe without becoming isolated
    islands.
-   Metadata should be compact.
-   Desktop should use available width intelligently.
-   Large visualizations may expand to wide canvases.
-   Long-form reading should remain focused.
-   Mobile should preserve hierarchy rather than merely shrink desktop.

A consistent spacing token system should be used, preferably based on a
4px or 8px foundation.

------------------------------------------------------------------------

# 8. Global Layout System

Use three conceptual widths:

### Reading Width

For biography, historical narrative, stories, and long-form explanation.

### Content Width

For mixed editorial and structured modules.

### Exploration Width

For Seder HaDorot, maps, relationship visualizations, and wide
interactive experiences.

Pages may move between these widths intentionally.

A single page does not need to stay inside one rigid container.

------------------------------------------------------------------------

# 9. Global Navigation

## Desktop navigation

Primary navigation:

**\[Toladot logo\] \| חכמים ואישים \| סדר הדורות \| מפה \| תקופות \|
חיפוש**

The Toladot logo returns to the homepage.

Do not add Stories, Events, Sources, or AI as primary navigation items.

Navigation should remain visually quiet and short.

## Mobile navigation

Mobile navigation must preserve direct access to:

-   People
-   Seder HaDorot
-   Map
-   Periods
-   Search

Use a compact mobile navigation pattern rather than compressing the
desktop navigation into unreadable horizontal links.

Search must remain easy to reach.

------------------------------------------------------------------------

# 10. Homepage

The homepage structure is approved and must **not** be expanded without
explicit product approval.

## Exact information architecture

**Large Israel Map Hero → Search → 3 Exploration Gateways → One Dynamic
Editorial Banner → Footer**

Nothing else is required.

## 10.1 Hero

The hero should be dominated by a visual composition based on the Land
of Israel.

The map is part of the UI composition, not merely a decorative
background image.

Visual direction:

-   warm cream land
-   pale blue sea
-   deep navy typography
-   restrained ochre/gold
-   subtle geographic or historical linework
-   bright/open atmosphere

The hero contains:

-   Toladot identity
-   concise product headline
-   optional short supporting sentence
-   prominent central search

Do not explain the entire product in the hero.

## 10.2 Search

Search is a primary homepage action.

It should feel central, immediate, and simple.

Placeholder examples may reference:

-   a sage
-   a place
-   a period
-   an event

Search behavior is deterministic and database-backed. It must not
require AI.

## 10.3 Three exploration gateways

Exactly three primary launch points appear immediately after or
partially overlapping the hero.

### Gateway 1 --- חקור במפה

Destination: **Global Map**

This is navigation, not a content card.

### Gateway 2 --- גלה את החכמים

Destination: **Seder HaDorot**

This is the primary visual gateway into people, generations,
contemporaries, and relationships.

### Gateway 3 --- נווט לפי ציר זמן

Destination: **Periods / chronological journey**

This allows the user to move through historical periods and enter
relevant Period pages.

### Gateway interaction rule

The entire gateway is clickable/tappable.

Each gateway may contain:

-   one icon/visual cue
-   title
-   one short explanatory line
-   subtle destination/action indication

Do not turn gateways into mini content sections.

## 10.4 Dynamic Editorial Banner

Exactly one editorial/contextual spotlight follows the gateways.

It may feature:

-   a Person
-   a Period
-   an Event
-   date-relevant historical content
-   editorially selected content

Future logic may use the Hebrew date, anniversary, current day, or
editorial scheduling.

This is **not** an algorithmic recommendation feed.

The banner should be visually editorial rather than a generic card.

It may combine:

-   portrait
-   map fragment
-   short historical context
-   title
-   one action

## 10.5 Footer

Keep the footer compact.

Do not use it to compensate for missing navigation by creating a giant
sitemap unless later required.

------------------------------------------------------------------------

# 11. Entity Page Composition System

Important entity pages should have a **narrative spine with structured
context around it**.

### Narrative spines

-   Person → Life Story
-   Place → Historical Story of the Place
-   Period → Story of the Period
-   Story → Narrative itself
-   Event → concise contextual explanation

Structured data and visualizations should enrich the narrative.

They must not replace it.

> Life Story is the spine. Contextual modules live around it.

Desktop pages may place contextual modules beside the reading column or
allow them to break out wider.

Mobile linearizes the same hierarchy.

Do not implement every entity page as a fixed vertical stack of cards.

------------------------------------------------------------------------

# 12. Person Page

## 12.1 Purpose

The Person page should answer quickly:

-   Who is this person?
-   When did they live?
-   Where were they active?
-   Why do they matter?

Then allow deep exploration without forcing the user to leave the page
repeatedly.

## 12.2 High-level hierarchy

1.  Rich Identity
2.  Life Story
3.  Contextual Knowledge
4.  Stories / Teachings / Sources
5.  Small Continue Exploring area

This is a hierarchy, not a rigid component order.

## 12.3 Rich Identity

Use a rich but restrained identity area.

Include approximately 3--4 high-value facts depending on the person:

-   period/generation
-   approximate dates
-   primary geography
-   primary significance
-   another highly relevant fact when justified

Avoid résumé styling.

## 12.4 Portrait

Portrait direction:

-   classic head/bust
-   consistent painterly language
-   clean background
-   small-to-medium scale
-   never presented as an authentic historical photograph

Avoid props, costumes, architecture, or scenery that invent unsupported
historical facts.

Future AI-generated portraits must be clearly understood as artistic
interpretations.

## 12.5 Life Story

The biography is the primary narrative spine.

Use:

-   continuous high-quality Hebrew prose
-   meaningful section headings
-   strong reading hierarchy
-   restrained inline contextual linking

Do not fragment the biography into a dashboard.

Contextual links inside the biography may, where useful, focus or reveal
a related module on the same page rather than always navigating away.

## 12.6 Section navigation

Desktop may use a quiet sticky anchor navigation.

Example:

**סיפור חייו \| ציר זמן \| אנשים בחייו \| מפה \| סיפורים \| מימרות \|
מקורות**

This is not a tab system. Content remains part of one continuous page.

The active section may be subtly highlighted.

## 12.7 Personal Timeline

Timeline combines:

-   meaningful life milestones
-   a small number of historical events that genuinely explain the
    person's life

Example for Rabbi Akiva:

-   personal milestones
-   destruction of the Second Temple where relevant
-   Yavne
-   Bar Kokhba Revolt where relevant

Do not dump all historical events into the timeline.

## 12.8 People & Relationships

Use a curated mini relationship view.

The selected Person remains central.

Surrounding nodes may include:

-   teachers
-   students
-   family
-   contemporaries
-   intellectual counterparts

Only meaningful relationships should appear.

Do not mix places, political regimes, periods, or unrelated contextual
entities into this people visualization.

Relationship type should be visible but visually restrained.

The module may expand/open into the larger Seder HaDorot context.

There should not be a redundant separate Seder module if this
interaction already provides that bridge.

## 12.9 Person Map

Use a **Focused Interactive Map**.

Show:

-   the Person
-   historically relevant places
-   only the geographic context needed to understand this Person

The map should remain stable and user-directed.

It must not automatically change because the user scrolls through
biography sections.

Explicit user actions may focus a place.

Provide an action such as **Open in full map**.

## 12.10 Stories

Show approximately 3--4 selected Story entities.

Each Story remains a standalone entity and may be connected to multiple
People and Places.

Provide access to all stories related to the Person.

## 12.11 Teachings / Sayings

Use a minimal rotating/banner-like presentation.

Show:

-   one teaching/saying prominently
-   precise source
-   manual arrows/dots when multiple items exist

No autoplay.

Provide access to all sayings/teachings related to the Person.

No standalone public Teaching page is required in the current scope.

## 12.12 Sources & Evidence

Use **Progressive Evidence**.

Keep the main reading experience clean.

Meaningful claims may expose a subtle evidence indicator that reveals:

-   source
-   confidence/status
-   dispute when relevant

A complete Sources section appears later in the page.

Do not add a citation badge to every sentence.

## 12.13 Uncertainty

Default communication should be editorial and human-readable:

-   "ככל הנראה"
-   "לפי מסורת..."
-   equivalent careful historical language

Use stronger evidence/dispute UI only when uncertainty materially
affects interpretation.

Avoid badge clutter.

## 12.14 Continue Exploring

At the end of the page, use a small contextual continuation treatment.

This is not a recommendation feed.

------------------------------------------------------------------------

# 13. Story Page

## Principle

> Story first. Context second.

The Story page is primarily a high-quality Hebrew narrative.

At the top, quiet metadata may identify:

-   relevant people
-   place
-   period

After the narrative, provide contextual extensions:

-   source
-   participants
-   place
-   period
-   historical context
-   uncertainty
-   contextual links

Do not turn the Story page into a structured-data dashboard.

------------------------------------------------------------------------

# 14. Place Page

## Narrative spine

The historical story of the Place.

## Important supporting elements

-   contextual interactive map
-   periods/events when meaningful
-   stories
-   sources

People are secondary on Place pages.

Do not create a major "people network" merely because the database
contains related people.

People should appear naturally where they explain the Place.

## Map

The Place map is more prominent than the map on a Person page.

Show:

-   selected Place
-   historically relevant nearby/related places

Provide an action to open the Global Map in the relevant context.

## Stories

Show approximately 3--4 related Story previews plus access to all
stories connected to the Place.

A separate Place timeline is not required unless the specific Place
genuinely benefits from one.

------------------------------------------------------------------------

# 15. Period Page

## Narrative spine

A continuous historical narrative explaining:

-   what happened
-   what changed
-   why the period matters

## Seder HaDorot context

A mini Seder HaDorot view is important on Period pages.

It should help answer:

-   who lived during this period?
-   how did the generations overlap?
-   what relationships matter?

## Historical events

Do not create a redundant separate event timeline by default.

A small number of major events may appear inside the chronological/Seder
context.

## Map

Every major Period page should include a contextual map.

It should communicate the important geographic centers of the period.

Provide an action to open the Global Map filtered/focused to the period.

### Period page mental model

**Narrative = what happened and why**\
**Seder = who and when**\
**Map = where**

Do not add a generic Stories section to Period pages.

------------------------------------------------------------------------

# 16. Periods Index

The Periods Index is an inviting chronological journey, not a technical
directory.

Each period may contain:

-   name
-   date range where supportable
-   one-line meaning
-   restrained visual atmosphere

Each period may have a subtle illustration/background treatment while
remaining within one consistent Toladot visual system.

This screen may be more visually expressive than knowledge pages.

It must not become a second Seder HaDorot.

------------------------------------------------------------------------

# 17. Event Page

Event pages are intentionally lightweight contextual entities.

Include:

-   event name
-   date/range
-   place where relevant
-   concise explanation
-   why it matters
-   related People
-   related Period
-   related Places
-   sources when required

Do not automatically expand Event pages into full encyclopedic essays.

------------------------------------------------------------------------

# 18. Teaching / Saying

There is no standalone public Teaching/Saying page in the current design
scope.

Teachings are supporting content primarily on Person pages and
potentially future collection experiences.

------------------------------------------------------------------------

# 19. People Directory

Primary navigation label: **חכמים ואישים**

The directory answers:

> Who is available to explore?

Seder HaDorot answers:

> Who lived when, alongside whom, and in what historical relationship?

These experiences must remain distinct.

## Layout

Use portrait-first compact entries:

-   portrait
-   name
-   short period/generation label

Do not include mini biographies on every card.

Desktop should be relatively dense --- approximately 5--6 people per row
where viewport width allows.

### Principle

> High information density, low visual noise.

## Filters

Where data supports them:

-   Men of Great Assembly
-   Zugot
-   Tannaim
-   Amoraim
-   generation
-   period
-   region
-   alphabet

Do not create multiple competing "people browsing" pages when one
filtered directory is sufficient.

------------------------------------------------------------------------

# 20. Search

Search is deterministic, fast, and entity-aware.

It should use the existing application search/data layer.

AI is not required for normal public search.

## Autocomplete

Autocomplete should be compact and rich enough to distinguish entities.

Possible entity groups:

-   People
-   Places
-   Periods
-   Events

## Search results

Do not produce one undifferentiated Google-style list.

Group or filter by entity type.

Suggested filters:

**הכול \| אנשים \| מקומות \| תקופות \| אירועים**

Each result should include:

-   name
-   entity type
-   one-line context

Avoid large image-heavy result cards.

Natural-language semantic AI search is a separate future capability and
should not be silently mixed into this interface.

------------------------------------------------------------------------

# 21. Global Map

The Global Map is a major exploration environment.

It is not a graphical menu.

## Default state

Do not expose every database pin immediately.

Open with:

-   curated central places
-   an active historical/time context

Users may deliberately switch to:

-   all places
-   all periods

## Time filtering

Time is a first-class map filter.

Additional filters should only exist when they answer real historical
exploration questions.

## Place selection

Selecting a marker opens a compact **Map Place Preview** without
immediately navigating away.

Preview may include:

-   place name
-   one-line historical meaning
-   relevant periods
-   action to open Place page

## Context handoff

Local maps on Person, Place, and Period pages may open the Global Map
already focused or filtered to the current context.

------------------------------------------------------------------------

# 22. Seder HaDorot

Seder HaDorot is one of Toladot's central exploration experiences.

It should feel like a comprehensible historical network --- not a
generic graph visualization.

## 22.1 Core visual model

1.  **Vertical direction = chronology/time**
2.  **Horizontal grouping = contemporaries / same temporal
    neighborhood**
3.  **Lines = actual relationships only**
4.  **Background bands = periods/generations**
5.  **Selection = focused historical context**

### Critical semantic rule

> Position communicates time. Lines communicate relationships.

Two people positioned near each other must not visually imply a
relationship unless a relationship line exists.

## 22.2 Nodes

Close zoom may show:

-   artistic portrait
-   name
-   selected state
-   relevant relationship emphasis

Selected Person becomes visually dominant while surrounding historical
context remains visible.

## 22.3 Relationships

Lines represent actual structured relationships only.

Examples:

-   Teacher → Student
-   Parent → Child
-   Spouse
-   Sibling
-   Bar Plugta / intellectual counterpart where modeled

Do not infer relationships from proximity or literary sequence.

Selecting/hovering a relationship may open a compact **Relationship
Preview** containing:

-   Person A
-   Person B
-   relationship type
-   source/confidence when relevant

Both nodes and edges should be investigable.

## 22.4 Contemporaries

People who lived at the same time may share a horizontal level or
neighborhood without any connecting line.

This distinction must remain visually obvious.

## 22.5 Period and Generation Bands

Use subtle background bands.

Band height is driven by layout/readability and does **not** necessarily
represent exact historical duration.

Chronological duration should be communicated separately.

Use two parallel side strips/axes:

### Historical Period Strip

Example:

**תקופת התנאים · date range**

### Rabbinic Generation Strip

Example:

**דור שני · date range**

Both strips are secondary to the network.

Uncertain ranges must remain honest.

People spanning generations may visually overlap a boundary.

## 22.6 Historical Landmarks

Use curated historical events as contextual landmarks.

Example:

**חורבן בית שני · 70**

Represent these as thin horizontal markers distinct from relationship
lines.

Do not render every Event entity.

Landmark density may change with zoom level.

> Historical events are contextual landmarks, not another data layer.

## 22.7 Semantic Zoom

### Close

-   portraits
-   names
-   relationship lines
-   detailed selection context

### Medium

-   smaller nodes
-   major names
-   fewer visible edges
-   clearer generational structure

### Far

-   periods
-   generations
-   density
-   major figures

Zoom must change semantic detail, not merely scale pixels.

## 22.8 Focus behavior

Selecting a Person:

-   emphasizes selected node
-   strengthens relevant relationships
-   fades unrelated surrounding network
-   preserves enough context for orientation
-   may open a compact Person preview

An explicit action opens the full Person page.

## 22.9 Accessibility

Seder HaDorot must not depend on canvas visuals alone for meaning.

Implementation must provide accessible equivalents for:

-   selected Person
-   nearby/contemporary People
-   relationships
-   period/generation
-   navigation actions

Keyboard navigation and visible focus states are required.

Relationship meaning must not depend on color alone.

------------------------------------------------------------------------

# 23. Historical Uncertainty UX

Toladot must communicate uncertainty without making every page feel like
a research database.

### Default hierarchy

1.  honest editorial wording
2.  subtle evidence affordance
3.  expanded evidence/dispute details when necessary

Possible historical states include:

-   exact
-   estimated
-   range
-   generation-only
-   unknown
-   disputed

Places may similarly be:

-   known
-   estimated
-   disputed
-   multiple candidates
-   unknown

Do not invent visual precision where historical precision does not
exist.

------------------------------------------------------------------------

# 24. Sources & Evidence UX

The public interface should support progressive disclosure.

Users should be able to read naturally without opening research
metadata, while advanced users can inspect evidence.

Evidence UI may expose:

-   canonical citation
-   source
-   claim connection
-   confidence/status
-   dispute
-   editorial note where appropriate

Provider-specific retrieval links must not visually replace canonical
citations.

Do not expose internal editorial workflow states unless they are
meaningful to the public experience.

------------------------------------------------------------------------

# 25. Portrait & Illustration Direction

Portraits should feel:

-   painterly
-   consistent
-   restrained
-   dignified
-   clearly interpretive

They should not pretend to be photographs.

Avoid visually specific invented details that imply historical
certainty.

Portraits should support recognition and continuity across:

-   Person pages
-   Seder HaDorot
-   People Directory
-   editorial banners
-   relationship views

Consistency is more important than cinematic spectacle.

------------------------------------------------------------------------

# 26. Iconography

Use a consistent contemporary icon system.

Icons should be:

-   simple
-   readable
-   restrained
-   culturally neutral unless a cultural symbol is genuinely meaningful

Do not decorate the interface with historical/Jewish symbols simply to
signal identity.

Map, time, person, relationship, source, search, expand, filter, and
navigation icons should remain functionally recognizable.

------------------------------------------------------------------------

# 27. Controls & Components

The component system should include at minimum:

-   primary/secondary/quiet buttons
-   text links
-   search input
-   entity autocomplete
-   filter controls
-   chips only where semantically justified
-   section anchor navigation
-   tooltip
-   popover
-   evidence disclosure
-   compact preview
-   drawer/sheet where appropriate
-   modal only when interruption is justified
-   loading state
-   empty state
-   error state
-   disabled state
-   focus state
-   selected state

Avoid using chips and badges as decoration.

Avoid placing every action inside a filled button.

Text links are appropriate for editorial navigation.

------------------------------------------------------------------------

# 28. Responsive Design

Toladot is desktop and mobile first-class.

Mobile is not a reduced desktop screenshot.

## General mobile rules

-   preserve narrative hierarchy
-   linearize multi-column editorial layouts
-   keep search easy to access
-   use touch-safe controls
-   avoid tiny metadata
-   preserve contextual exploration
-   use sheets/drawers where desktop popovers are unsuitable
-   maintain RTL interaction logic
-   avoid horizontal overflow except intentional exploration canvases

## Person mobile

Identity → narrative → contextual modules should remain coherent.

Sticky section navigation may become a compact horizontal anchor control
or other mobile-appropriate navigation.

## Map mobile

Map remains usable as an exploration surface.

Selected Place preview should use a mobile-appropriate bottom sheet or
compact overlay.

## Seder mobile

Do not force the entire desktop network into the viewport.

Allow intentional pan/zoom and focus-based exploration.

Selection and orientation must remain understandable.

------------------------------------------------------------------------

# 29. RTL Requirements

RTL is a structural requirement, not a CSS afterthought.

Validate:

-   reading order
-   navigation order
-   icon direction
-   arrows
-   breadcrumbs
-   drawers
-   popovers
-   charts
-   map overlays
-   timeline labels
-   Seder labels
-   mixed Hebrew/Latin content
-   dates
-   source citations

Directional icons must reflect Hebrew navigation semantics where
appropriate.

Components should remain localization-ready for possible future LTR
support.

------------------------------------------------------------------------

# 30. Accessibility

Target at least **WCAG 2.2 AA** for the public experience.

Required principles:

-   sufficient text contrast
-   keyboard operability
-   visible focus
-   semantic HTML where possible
-   accessible names for controls
-   touch target sizing
-   no meaning communicated only by color
-   reduced-motion support
-   screen-reader alternatives for complex visualization
-   meaningful heading hierarchy
-   form labels
-   error messages that explain recovery
-   avoid motion that interferes with reading

Historical visualization complexity is not an exemption from
accessibility.

------------------------------------------------------------------------

# 31. Motion & Feedback

Motion should communicate state and spatial continuity.

Use subtle motion for:

-   opening contextual previews
-   focus transitions
-   map selection
-   Seder focus
-   disclosure
-   navigation state

Avoid:

-   autoplay carousels
-   decorative parallax
-   constant ambient animation
-   dramatic page transitions
-   motion that competes with reading

Respect `prefers-reduced-motion`.

------------------------------------------------------------------------

# 32. Loading, Empty & Error States

Every data-driven component must define:

-   loading
-   empty
-   partial-data
-   error
-   unavailable
-   retry/recovery where relevant

Historical missing data should not automatically look like a system
failure.

Example:

"Location unknown" is historical information.

"Failed to load location data" is a technical error.

These states must look and read differently.

------------------------------------------------------------------------

# 33. Design Tokens

Implementation should centralize reusable tokens for:

-   typography
-   colors
-   semantic colors
-   spacing
-   radii
-   borders
-   shadows
-   content widths
-   breakpoints
-   z-index/elevation
-   motion duration/easing
-   focus styles

Do not scatter one-off visual values throughout page components.

The final token values may be tuned during implementation, but changes
must preserve the visual principles in this specification.

------------------------------------------------------------------------

# 34. Component Governance

A component should exist when a visual/interaction pattern is
meaningfully reusable.

Do not force different historical concepts into the same component
merely because they look superficially similar.

Component variants must preserve semantic meaning.

Examples of legitimate reusable patterns:

-   Entity Identity
-   Person Portrait
-   Contextual Map
-   Story Preview
-   Evidence Disclosure
-   Relationship Preview
-   Map Place Preview
-   Editorial Spotlight
-   Exploration Gateway
-   Period/Generation Label
-   Section Navigation

------------------------------------------------------------------------

# 35. Public UX Guardrails

The following rules are mandatory:

1.  PostgreSQL remains the canonical product data source.
2.  UI work must not change historical entity semantics.
3.  Public and editorial states remain separated.
4.  AI-generated material must not silently become published historical
    fact.
5.  Historical uncertainty must remain representable.
6.  Same-name people must never be visually or functionally auto-merged.
7.  Relationship visualization must reflect actual approved relationship
    data.
8.  Visual position is not historical evidence.
9.  Public reading should not unnecessarily trigger paid AI.
10. Canonical citations must remain provider-independent.
11. UI work must not introduce a graph database requirement.
12. UI work must not introduce a vector database requirement.
13. Hebrew RTL remains first-class.
14. Design/implementation tools may not silently rewrite the existing
    architecture.
15. New content/data should not be imported at scale merely to make a
    prototype look populated.

------------------------------------------------------------------------

# 36. AI & Design Tool Boundaries

A visual implementation tool may:

-   interpret this design system
-   propose visual refinements
-   implement responsive layouts
-   create reusable presentational components
-   create realistic prototype data when clearly isolated from
    production
-   improve spacing, typography, and visual craft inside approved
    constraints

It may not:

-   redesign navigation
-   invent new public entity types
-   merge pages
-   add recommendation feeds
-   introduce AI search into standard search
-   add new backend services
-   change database schema without explicit architectural review
-   change authentication/authorization
-   alter publication workflow
-   infer historical relationships
-   invent historical certainty
-   replace production data contracts with mock-specific structures

------------------------------------------------------------------------

# 37. Implementation Workflow

The UI should be implemented incrementally.

Do **not** ask a coding/design agent to redesign the entire application
in one pass.

Recommended sequence:

### Phase UI-0 --- Foundation

-   tokens
-   typography
-   surfaces
-   responsive grid
-   global navigation
-   primitive controls
-   accessibility baseline

### Phase UI-1 --- Homepage

-   map-driven hero
-   search presentation
-   three navigation gateways
-   editorial spotlight
-   responsive behavior

### Phase UI-2 --- Core Knowledge Pages

-   Person
-   Story
-   Place
-   Period
-   Event
-   shared entity components

### Phase UI-3 --- Discovery

-   People Directory
-   Search
-   Periods Index

### Phase UI-4 --- Exploration Surfaces

-   Global Map
-   Seder HaDorot
-   relationship interactions
-   semantic zoom
-   contextual previews

### Phase UI-5 --- Responsive & Production Polish

-   mobile validation
-   accessibility
-   loading/empty/error states
-   reduced motion
-   cross-browser validation
-   final visual consistency review

Each phase must be reviewed before the next phase begins.

------------------------------------------------------------------------

# 38. Design-Agent Working Protocol

For each implementation phase:

1.  Provide this specification.
2.  Provide the relevant existing screenshots/references.
3.  Provide only the phase-specific prompt.
4.  Ask the agent to work in **Plan Mode first** when supported.
5.  Require the agent to state:
    -   files/components it intends to change
    -   assumptions
    -   new dependencies
    -   any architecture impact
    -   responsive strategy
    -   accessibility strategy
6.  Review the plan before implementation.
7.  Implement the isolated phase.
8.  Visually review desktop and mobile.
9.  Compare implementation against this specification.
10. Only then integrate/continue.

No phase should silently expand its scope.

------------------------------------------------------------------------

# 39. Review Criteria

A UI implementation is approved only when it satisfies all relevant
criteria below.

## Product alignment

-   preserves approved page purpose
-   preserves narrative hierarchy
-   does not invent product behavior
-   contextual discovery remains contextual

## Visual alignment

-   feels like Toladot rather than generic SaaS
-   Heebo used consistently
-   historical atmosphere is restrained
-   information density remains strong
-   excessive card/rectangle usage avoided
-   maps/chronology/portraits feel integrated into composition

## Interaction alignment

-   navigation destinations are correct
-   interactive elements communicate clickability
-   overlays/previews do not unexpectedly remove user context
-   map and Seder interactions remain understandable

## RTL

-   full RTL correctness
-   directional controls correct
-   mixed content handled safely

## Responsive

-   desktop and mobile both intentionally designed
-   no accidental overflow
-   exploration surfaces remain usable

## Accessibility

-   keyboard accessible
-   focus visible
-   contrast sufficient
-   semantic alternatives for complex visuals
-   reduced motion supported

## Architecture

-   no backend redesign
-   no schema changes unless separately approved
-   no unauthorized dependencies
-   no public/editorial boundary violations
-   no new AI dependency for ordinary reading/search

------------------------------------------------------------------------

# 40. Current Visual Validation Status

The following directions have already been validated conceptually:

### Homepage

Approved structure:

**Large Israel Map Hero → Search → Three Exploration Gateways → One
Dynamic Editorial Banner → Footer**

Gateway destinations:

-   **חקור במפה** → Global Map
-   **גלה את החכמים** → Seder HaDorot
-   **נווט לפי ציר זמן** → Periods / chronological journey

### Person Page

Approved conceptual direction:

-   rich identity
-   focused reading column
-   Life Story as spine
-   contextual timeline
-   focused Person map
-   curated people relationship view
-   Story entities
-   teaching banner
-   progressive evidence
-   small contextual continuation

### Seder HaDorot

Approved conceptual direction:

-   vertical chronology
-   horizontal contemporaries
-   relationship lines only for actual relationships
-   period + generation bands
-   curated historical landmarks
-   semantic zoom
-   node and edge inspection
-   focused selection behavior

### Global Map

Approved conceptual direction:

-   curated default historical view
-   time-first filtering
-   compact Place preview
-   deliberate "all places/all periods" state
-   contextual handoff from entity pages

------------------------------------------------------------------------

# 41. Open Visual Tuning During Implementation

The following may be tuned during visual implementation without
reopening product UX:

-   exact spacing values
-   final tokenized font sizes
-   exact navy/ivory/ochre shades
-   exact border radius values
-   subtle shadow levels
-   icon family selection
-   detailed responsive breakpoints
-   final component micro-spacing
-   map visual styling
-   portrait framing treatment

These are **visual tuning decisions**, not permission to change
information architecture.

Any change affecting navigation, page hierarchy, historical semantics,
entity relationships, data behavior, or architecture requires explicit
review.

------------------------------------------------------------------------

# 42. Final Design Principle

Toladot should not feel like a database wearing a beautiful skin.

It should feel like a coherent historical world that happens to be
powered by structured knowledge.

The interface succeeds when the user can enter through a person, place,
period, map, or timeline and naturally understand how that piece belongs
to a larger historical picture --- while always knowing what is fact,
what is uncertain, where the evidence comes from, and where to explore
next.

**Context creates discovery. Narrative creates understanding. Structure
creates trust.**
