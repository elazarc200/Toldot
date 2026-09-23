# Validation

Result: **PASSED_STRUCTURAL_CHECKS_WITH_RESEARCH_LIMITATIONS**

| Check | Result |
|---|---|
| duplicate_person_ids | pass |
| duplicate_identity_keys | pass |
| duplicate_canonical_people_in_counted_dataset | pass |
| duplicate_external_person_id_wikidata | pass |
| duplicate_external_person_id_hewiki_pageid | pass |
| duplicate_external_person_id_bonayich | pass |
| tanna_amora_conflicts_in_counted_dataset | pass |
| generation_conflicts | pass |
| impossible_chronology | pass_with_missing_data |
| primary_source_segment_and_name_verification | pass |
| counted_records_without_primary_or_identity_sources | pass |
| suspicious_merges | reviewable_audit |
| count_reconciliation | pass |

Detailed findings, tested chronology coverage and caveats are in [validation-report.json](validation-report.json).

Structural checks do not certify that all historical identities have been resolved. 3799 candidate records are quarantined from the count.

## Review reasons

| Reason | Candidate records |
|---|---:|
| Tanna/Amora classification not established; do not infer from honorific or occurrence in the Talmud. | 3472 |
| No primary Chazal passage independently attributed to this identity was verified; lexical occurrences alone are insufficient. | 1988 |
| Possible duplicate | 1128 |
| Reference identifies a person/contemporary but does not establish Tanna or Amora status. | 503 |
| Cross-reference-only Hyman entry. A see-reference is not proof of identity (e.g. Avtalyon → Shemaiah). | 276 |
| Traditional reference entry: classification and identity reconciliation pending source-text assessment. | 274 |
| Wikipedia categories span both Tannaim and Amoraim; resolve transition/classification. | 6 |
| Multiple Wikipedia persons refer to the same Hyman entry. | 6 |
| Several Sefaria identities link to this same Wikipedia page; disambiguation required. | 3 |
| Same section marker occurs on nonadjacent print pages; verify identity and segmentation. | 3 |
| Shared Wikipedia identity page 756610 | 2 |
| Shared Wikipedia identity page 873860 | 2 |
| Shared Wikipedia identity page 492723 | 2 |
| Wikipedia disambiguation page, not a single resolved person. | 2 |
| Kahana, teacher of Rav, is a distinct Bonayich record; Wikipedia's first Kahana biography also describes Rav learning traditions from him. Determine whether this is an additional person or an alternative traditional identification before counting it separately. | 1 |
