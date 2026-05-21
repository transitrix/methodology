# Process Blueprint

A wide, single-page blueprint of a value chain. Each stage is a column carrying its goal, its result, and the supporting **systems**, **actors**, **equipment**, and **information entities**. Rendered as a horizontal grid of nested boxes via the shared diagram engine (the same one that renders the Goals tree) — **not** via Svgbob.

**File extension:** `*.process-blueprint.transitrix.yaml`
**Spec:** [`notations/13-process-blueprint.md`](../../13-process-blueprint.md)

## Minimal structure

```yaml
notation: process-blueprint
spec_version: "0.1"

process_blueprint:
  id: PROCESS_BLUEPRINT-<DOMAIN>-<N>
  name: "<blueprint name>"

  stages:
    - id: STAGE-1
      name: "<stage name>"
      goal: "<what the stage should achieve>"
      result: "<deliverable that exits the stage>"

  systems:
    - id: APPLICATION-<...>      # optional cross-ref to the applications catalogue
      name: "<system name>"
      stages: [STAGE-1]

  actors:
    - id: ROLE-<...>             # optional cross-ref to a role
      name: "<actor name>"
      stages: [STAGE-1]

  equipment:
    - name: "<equipment name>"   # no canonical TYPE prefix yet — free-form for v0.1
      stages: [STAGE-1]

  information_entities:
    - name: "<entity name>"      # no canonical TYPE prefix yet — free-form for v0.1
      stages: [STAGE-1]
```

## Rules

- The horizontal order of stages is the array order of `stages[]`.
- Each aspect entry's `stages: [...]` lists every stage the entry appears in (M:N). The same system or actor often spans multiple stages.
- `systems[].id` MUST use the `APPLICATION-` prefix when present; `actors[].id` MUST use `ROLE-`. `equipment[]` and `information_entities[]` are notation-local labels in v0.1.
- The blueprint is not a flowchart — for procedural detail within a stage, link to a BPMN file from the process catalogue.

## Examples in this folder

| File | Description |
|---|---|
| `order-fulfilment.process-blueprint.transitrix.yaml` | Five-stage order fulfilment blueprint with systems, actors, equipment, and information entities. |
