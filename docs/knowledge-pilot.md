# Knowledge graph pilot

Route: /knowledge. This isolated app reads src/components/knowledge/pilot.json and does not modify production or Supabase.

September 15, 2026: all 100 candidate records appear, including disconnected sages. The 87 dated records use documented period bands; 13 unresolved records appear in a separately labelled area. Akavya is beside Hillel and Shammai. Relationship filters affect lines; population and explicit local-focus filters affect people.

Wheel scrolling pans through generations without zoom. Side buttons control zoom. Full-window mode restores body scrolling on exit or Escape. Blank clicks clear selection. Cards contain separate teachers, students, other relationships, and further-reading sections independent of the line filter.

Wikipedia references were extracted from 96 fixed-revision articles. Further reading includes Hyman book scans or Wikisource entries for 88 records; missing entries remain explicitly marked. Some links concern related people and retain their actual bibliographic titles. Seven relationship citations now point to inspected original passages; notes distinguish reports in a sage's name from proof of personal discipleship. The early Avot chain uses its primary period evidence. This remains a draft, not an exhaustive source audit.

Research tools live in work/avot outside this checkout. Run build.cjs, export-graph.cjs, then render.cjs from the workspace root. To regenerate reading links first run index-wiki-references.cjs, then complete-reading.cjs (network required). The import candidate retains reading links and the source-preference audit.

Validation: TypeScript, targeted ESLint, 11 component/layout tests, structural database validation, HTTP 200. Browser checks confirmed full-window entry/Escape exit, vertical wheel movement at unchanged 100% zoom, and Akavya's card with separate relationship headings and HebrewBooks links.
