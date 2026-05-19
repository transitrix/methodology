# Scenarios notation — examples

File extension: **`.scenarios.transitrix.yaml`**

## Format overview

A scenario represents an alternative strategic development path for an organisation. Each scenario carries its own scoped set of goals, capabilities, activities, products, processes, applications, and a view over the shared factor catalogue. Use scenarios to model and compare optimistic, baseline, or pessimistic strategic options before committing.

## Files in this folder

| File | Description |
|---|---|
| [`optimistic-2027.scenarios.transitrix.yaml`](optimistic-2027.scenarios.transitrix.yaml) | Compact scenario with vision, three factors, and reference lists |
| [`omnichannel-2028.scenarios.transitrix.yaml`](omnichannel-2028.scenarios.transitrix.yaml) | Realistic retail omnichannel scenario; references the NorthBay capability and process maps |

## Notation header

Every file must start with:

```yaml
notation: scenarios
```

## Required fields

| Field | Description |
|---|---|
| `scenario.id` | Unique scenario ID |
| `scenario.name` | Human-readable name |
| `scenario.status` | One of: `Draft`, `Active`, `Archived` |

## Optional fields

| Field | Description |
|---|---|
| `scenario.description` | Short description of the strategic premise |
| `scenario.created_at` | Date in `YYYY-MM-DD` format |
| `scenario.vision` | Narrative description of the future under this scenario |
| `scenario.factors_view` | Per-scenario relevance and impact for factors from the shared catalogue |
| `scenario.goals` / `capabilities` / `activities` / `products` / `processes` / `applications` | Reference lists with `{goal_id, capability_id, ...}` entries |

Factor relevance, if specified, must be one of `High`, `Medium`, `Low`.

## Preview

Open any `.scenarios.transitrix.yaml` file in VS Code with Transitrix Studio installed — the preview panel opens automatically showing the vision, factors-view table, and reference sections.
