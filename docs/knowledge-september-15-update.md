# Straight connections, identity review, and short biographies

The graph uses straight line segments. Generation rows expand horizontally rather than wrapping every seven people. Pairs remain adjacent. A deterministic layout moves nodes to reduce unrelated line/circle collisions, with small vertical offsets inside a generation band for otherwise collinear relationships. The current pilot and population/relationship filters were tested against a 38-unit circle clearance (maximum displayed radius: 36).

Filtering recalculates layout. Common filter layouts are generated ahead of time in layouts.json, avoiding a pause during normal filter changes. Local neighbor views use the same algorithm on the smaller set. After changing pilot.json or the layout algorithm, run node work/avot/precompute-layouts.cjs from the workspace root.

Undated people with a visible related person are provisionally placed near that person's generation; their rank remains null. Their dashed outline and card explicitly distinguish proximity from historical dating. The population selector includes records requiring identity/period review. Generation placement does not resolve a disputed identity.

Research: corrected Yanai to the tannaitic article explicitly referring to Avot 4:15; kept the amora separate. Corrected Jacob's disambiguation link to the tanna article, preserving disputed ancestry. Proposed a period for Yosef the Babylonian based on identification with Issi ben Yehuda. Remaining original unresolved records were reviewed and annotated in extensions.identity_review. Hyman's entry for Halafta connects the Avot sage with the report in Bava Metzia 94a:7; the new edge is estimated and records that indirect transmission alone does not prove personal discipleship. Tosefta Sanhedrin 2:2 was inspected for Yanai's report in the name of Rabban Shimon ben Gamliel.

All 72 core records now have short editorial biographies and source lists, persisted in the research export and database. They remain draft summaries; scarce evidence or disputed identity is stated explicitly. This does not represent an exhaustive biography or primary-source audit. Other people do not receive invented biographies.

Build order: index-wiki-references.cjs (when refreshing article links), complete-reading.cjs, clean-reading-links.cjs, build.cjs, export-graph.cjs, precompute-layouts.cjs, render.cjs, under work/avot. The original desktop repository and production data were not changed.

Validation: TypeScript, targeted ESLint, 14 tests, database structural validation. Browser verification covered the paired Hillel/Shammai row with straight lines and Yanai's card with its new summary and corrected reading links.
