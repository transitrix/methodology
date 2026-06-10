# `canon/views/activity-card/`

Single-project narrative cards. Each card binds to one project Activity (`project: ACTIVITY-…`) and adds narrative milestones; the motivation chain and child activities are pulled by reference from the FGCA and Activities documents rather than duplicated.

## File convention

`*.activity-card.transitrix.yaml`

See [`notations/views/18-activity-card.md`](../../../../../notations/views/18-activity-card.md) for the full spec.

## Lifecycle

The card is a view, not an element — it carries no lifecycle. The project Activity it binds to and any `delivers_changes: [CHANGE-…]` it names bear their lifecycle on their own canonical files.

## See also

- [`notations/views/18-activity-card.md`](../../../../../notations/views/18-activity-card.md) — the notation spec
- [`notations/examples/activity-card/`](../../../../../notations/examples/activity-card/) — worked example
- [`../activities/`](../activities/) — the activity network the card's project lives in
