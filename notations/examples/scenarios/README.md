# Scenarios notation — examples

File extension: **`.scenarios.transitrix.yaml`**

The scenarios view is a **report-configuration surface** over the `SCENARIO` content-element catalogue (`canon/elements/05_implementation/scenarios/`). Each `SCENARIO` element is a *path* — an ordered set of steps (`ACTIVITY` / `CHANGE`) that moves the enterprise to one `TARGET_STATE` in service of one or more `GOAL`s. See [`../../views/11-scenarios.md`](../../views/reports/11-scenarios.md) for the view spec and [`../../ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.18 for the SCENARIO element schema.

## Files in this folder

| File | Description |
|---|---|
| [`optimistic-2027.scenarios.transitrix.yaml`](optimistic-2027.scenarios.transitrix.yaml) | **v0.2 content-document shape (pending migration).** Compact scenario with vision, three factors, and reference lists. Predates the SCENARIO reclassification; migrates in a follow-up sub-task. |
| [`omnichannel-2028.scenarios.transitrix.yaml`](omnichannel-2028.scenarios.transitrix.yaml) | **v0.2 content-document shape (pending migration).** Realistic retail omnichannel scenario; references the NorthBay capability and process maps. Same pending-migration status as above. |

## Notation header

Every file starts with:

```yaml
notation: scenarios
```

## v0.3 — report-config shape (target shape after migration)

A post-reclassification scenarios view file carries no canonical content. It declares a `view` object that names which `SCENARIO` elements to render and how:

```yaml
notation: scenarios
spec_version: "0.3"
methodology_version: "4.1.0"

view:
  id: SCENARIOS-2027-CUT-1
  name: "2027 cut — candidate paths"
  scenarios:
    include: [SCENARIO-OPTIMISTIC-1, SCENARIO-CONSERVATIVE-1]
  layout: "side-by-side"
  show_steps: true
  show_target_state: true
  show_pursues: true
```

Each referenced `SCENARIO-…` is a standalone element file under `canon/elements/05_implementation/scenarios/` with inline `pursues` (goal list — intent), `arrives_at` (single `TARGET_STATE-…` ref — destination), and ordered `steps` (`ACTION-…` / `CHANGE-…`). See [`../../views/11-scenarios.md`](../../views/reports/11-scenarios.md) §3 for the full field set.

## Preview

Open any `.scenarios.transitrix.yaml` file in VS Code with Transitrix Studio installed — the preview panel opens automatically.
