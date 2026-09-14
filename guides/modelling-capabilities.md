---
title: Modelling capabilities
status: active
last_reviewed: 2026-09-14
audience: public
license: MIT
---

# Modelling capabilities

A capability describes what the organisation can do. Keep its identity separate from dated assessments of maturity and ownership.

1. Choose the scope and hierarchy. Use the `CAPABILITY-V…` / `CAPABILITY-H…` ID grammar and `domain` / `supporting` classification in the [capability-map specification](../notations/views/diagrams/05-capability-map.md).
2. Admit stable capability records under `canon/elements/02_business/capabilities/`, with the shared admission envelope and lifecycle defined by [element primitives](../notations/ELEMENT_PRIMITIVES.md). Reference admitted roles, processes and applications where the schema permits them.
3. Record `current_maturity`, `target_maturity`, `owner_role` and `target_date` in each capability's co-located `.history.yaml` sidecar. Do not put them inline in the element or map. Record the assessment's effective date; a future target is not an observed current maturity.
4. Start the map from the [bundled template](../transitrix/skills/onboard/templates/capability-map.capability-map.transitrix.yaml), placed under `views/capability-map/` by onboarding. Replace placeholders and keep inline identity/lifecycle consistent with the canonical records. The template is a starter, not an admitted assessment.
5. Review the map at the intended assessment date. For each historical attribute, resolve the latest entry whose `valid_from` is on or before that date. Preserve earlier assessments when adding a new one.

For example, this sidecar belongs beside `CAPABILITY-V1.yaml`. The dates and levels are illustrative; adopt them only if supported by your assessment:

```yaml
# canon/elements/02_business/capabilities/CAPABILITY-V1.history.yaml
target: CAPABILITY-V1
attribute_versions:
  current_maturity:
    - { valid_from: "2026-09-01", value: 2 }
  target_maturity:
    - { valid_from: "2026-09-01", value: 4 }
  target_date:
    - { valid_from: "2026-09-01", value: "2027-06-30" }
```

Before accepting the map, check IDs and references, admission and lifecycle, sidecar placement, and the evidence behind each assessment. Confirm the view displays the selected date's values. A rendered diagram alone does not establish model validity. Full sidecar rules and migration guidance are in the specification's attribute-history section.
