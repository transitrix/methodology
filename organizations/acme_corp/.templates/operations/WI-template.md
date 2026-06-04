---
id: WI-NNNN
title: "FILL-ME — one-line work-item title"
status: proposed            # proposed | in_progress | blocked | done | closed
opened: "YYYY-MM-DD"
closed: null                # ISO date when status → done/closed; null otherwise
owner: "firstname.lastname" # optional — person carrying the item
relates_to: []              # optional — model entity IDs this work concerns
---

<!--
Work Item template. Convention: method/team-operations.md §3.2.

Naming:    WI-NNNN-<short-slug>.md  (NNNN = four-digit zero-padded, sequence per
           operations/work-items/, monotonically increasing).

Status:    proposed     → registered, not yet being worked
           in_progress  → actively being worked
           blocked      → cannot progress until something external is resolved
           done         → work complete; outcome recorded in body
           closed       → no longer tracked (done-and-archived / withdrawn / won't do)

Work Items are mutable while active. Keep them short — substantive course-changing
discussion belongs in an ADR, not in a long Work Item description.
-->

## Outcome

What this work is meant to land. One or two sentences.

## Checklist

- [ ] First concrete step.
- [ ] Second concrete step.
- [ ] …
