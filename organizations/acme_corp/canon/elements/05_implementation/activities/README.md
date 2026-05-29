# `canon/elements/05_implementation/activities/`

Activity element primitives — each file is one initiative / workstream (an ArchiMate 3.2 *Work Package*) on the **Implementation & Migration** layer. Activities are recursive: an initiative aggregates programmes → projects → tasks, all one TYPE via `parent`. They are arranged by the activities view (`../../../views/activities/`) as a precedence network, and by the FGCA / FGA chains.

TYPE registry: [`notations/IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §3.1 (`ACTIVITY`). Layer rationale: [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §6.1.

## File convention

`<id>.yaml`, where `<id>` follows `ACTIVITY-[<middle>-]<INTEGER>` from [`IDS_AND_REFERENCES.md`](../../../../../../notations/IDS_AND_REFERENCES.md) §1. Examples: `ACTIVITY-DISCOVERY-1.yaml`.

## Schema

Defined in [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.4 over the common envelope §3:

- Identity + activity fields: `notation: activity`, `id`, `name`, `duration_days`, `goals: [GOAL-…]`, `delivers_changes: [CHANGE-…]`, `predecessors: [ACTIVITY-…]`, `parent: ACTIVITY-…`, schedule/cost fields, `description`.
- Admission record ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §6) and primitive lifecycle ([`CONTRACT.md`](../../../../../../notations/CONTRACT.md) §7).

`goals` is a first-class time-aware relation (`activity_goal`) in the temporal model; inline `goals` is v0.x transitional. `predecessors` stays inline/timeless. The element-lifecycle `valid_from`/`valid_to` are **distinct** from the schedule `start_date`/`end_date` — see [`notations/views/07-activities.md`](../../../../../../notations/views/07-activities.md).

## Examples in this folder

| File | Notes |
|---|---|
| `ACTIVITY-CRM-EU-1.yaml` | Delivers `CHANGE-EU-CRM-1` (FGCA chain) |
| `ACTIVITY-SUPPORT-1.yaml` | Serves `GOAL-OPS-1` (FGA chain) |
| `ACTIVITY-DISCOVERY-1.yaml` … `ACTIVITY-LAUNCH-1.yaml` | Onboarding precedence network, linked by `predecessors` |

## See also

- Element-primitive schema: [`notations/ELEMENT_PRIMITIVES.md`](../../../../../../notations/ELEMENT_PRIMITIVES.md) §7.4, layer §6.1.
- Activities notation: [`notations/views/07-activities.md`](../../../../../../notations/views/07-activities.md).
- Sibling changes catalogue: [`../changes/`](../changes/).
