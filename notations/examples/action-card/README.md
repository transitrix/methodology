# Action Card

Single-project narrative view. One document per project, naming the project Action it summarises plus a list of narrative milestones (decision gates, certifications, programme-level markers). The card pulls the rest of its content — name, dates, motivation chain, child actions — by reference from sibling DGCA and Action documents.

**File extension:** `*.action-card.transitrix.yaml`
**Spec:** [`notations/views/18-action-card.md`](../../views/18-action-card.md)

## Minimal structure

```yaml
notation: action-card
spec_version: "0.1"

action_card:
  id: ACTION_CARD-<DOMAIN>-<N>
  project: ACTION-<DOMAIN>-<N>            # existing project Action; must resolve

  description: >
    One-paragraph executive summary. Concise — the full description lives
    on the referenced Action.

  milestones:
    - id: MILESTONE-<MIDDLE>-<N>            # document-scoped
      name: "<milestone label>"
      date: "<YYYY-MM-DD>"
      description: >
        Optional longer-form context.
      delivers_changes:
        - CHANGE-<...>                      # must appear in the project Action's delivers_changes[]
```

## Rules

- One project per card document. The `action_card.project:` field MUST resolve to an Action whose `type:` is `Project` (`PC-001` / `PC-002`).
- `MILESTONE-…` IDs are **document-scoped** — uniqueness is enforced within the card, not across the organisation ([IDS_AND_REFERENCES.md §4](../../IDS_AND_REFERENCES.md)).
- Each `milestones[].delivers_changes[]` entry MUST resolve to a `CHANGE-…` that is also listed in the project Action's `delivers_changes:` (`PC-003`) — the milestone delivers a strict subset of the project's overall changes.
- Action-card milestones are **distinct** from the zero-duration "schedule milestones" defined in [`07-action.md`](../../views/07-action.md) §5.9. The two coexist by design: schedule milestones drive critical-path computation; action-card milestones anchor narrative gates. The reconciliation is documented in [18-action-card.md §8](../../views/18-action-card.md).

## Examples in this folder

| File | Description |
|---|---|
| `eu-programme.action-card.transitrix.yaml` | EU regulatory-conformity programme — one project Action, two narrative milestones (certification gate + market launch). Mirrors the running example in the spec. |
