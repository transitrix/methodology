# DGCA diagram

**Driver → Goal → Change → Action** — a four-column strategy decomposition chain.
Shows how external drivers push goals, which require changes, which are delivered through actions.

Layer toggle: individual columns (D, G, C, A) can be disabled via `view_config.layers`. The DGA variant (`layers.changes: off`) maps actions directly to goals without an intermediate change step.

**File extension:** `*.dgca.transitrix.yaml`

See the canonical spec: [`../../views/02-dgca.md`](../../views/02-dgca.md).

## Minimal structure — full DGCA (4 layers)

```yaml
notation: dgca
spec_version: "0.1"

id: DGCA-SAMPLE-1
name: "Sample DGCA chain"

factors:
  - id: DRIVER-1
    name: "External driver pushing change"
    type: external

goals:
  - id: GOAL-1
    name: "Strategic goal"
    factors: [DRIVER-1]            # one or more DRIVER-… IDs

changes:
  - id: CHANGE-1
    name: "Transformation programme"
    goals: [GOAL-1]                # one or more GOAL-… IDs this change delivers

actions:
  - id: ACTION-1
    name: "Research phase"
    changes: [CHANGE-1]            # one or more CHANGE-… IDs this action delivers
  - id: ACTION-2
    name: "Rollout phase"
    changes: [CHANGE-1]
```

## DGA mode — Changes layer off (3 layers)

```yaml
notation: dgca
spec_version: "0.1"

id: DGCA-SAMPLE-DGA-1
name: "Sample DGA chain"

view_config:
  layers:
    changes: off          # Driver → Goal → Action; changes[] may be omitted

factors:
  - id: DRIVER-1
    name: "External driver"
    type: external

goals:
  - id: GOAL-1
    name: "Strategic goal"
    factors: [DRIVER-1]

actions:
  - id: ACTION-1
    name: "Initiative"
    goals: [GOAL-1]       # direct link to goal — no changes[] needed
```

## Optional document-root fields

```yaml
description: "Short description"
period: "2026"
version: "0.1"
date: "2026-05-26"
author: "Your Name"
```

## Rules

- All IDs follow the canonical `<TYPE>-[<middle>-]<INTEGER>` grammar per [`../../IDS_AND_REFERENCES.md`](../../IDS_AND_REFERENCES.md). IDs are unique within their layer.
- A goal MAY reference multiple drivers via `factors: [DRIVER-…, DRIVER-…]`.
- A change MAY reference multiple goals via `goals: [GOAL-…, GOAL-…]`.
- An action MAY reference multiple changes via `changes: [CHANGE-…, CHANGE-…]`.
- In DGA mode (`view_config.layers.changes: off`), actions link directly via `goals: [GOAL-…]`.

## Examples in this folder

| File | Form | Description |
|---|---|---|
| `startup.dgca.transitrix.yaml` | **Inline (Simple)** | Primary example — self-contained, no `elements/` folder. All element data authored in this file. |
| `strategy-2026.dgca.transitrix.yaml` | Projection (Full) | Full-tier example — projection-only `view_config`; element data lives in the `elements/` subfolder. |
| `constraint-driven.dgca.transitrix.yaml` | Projection (Full) | Full-tier example — constraint-driven chain, GDPR data-residency scenario; elements in `elements/`. |
| `strategy-2026-dga.dgca.transitrix.yaml` | Projection (Full) | Full-tier DGA mode example — Changes layer off; elements in `elements/`. |
