# Integration Map notation — examples

File extension: **`.integration-map.transitrix.yaml`**

The integration-map view is a **selection / rendering configuration** over the application-cooperation graph derived from `INTEGRATION` ([`../../ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.8, [`../../views/diagrams/10-applications.md`](../../views/diagrams/10-applications.md)) and, optionally, the `uses` relation to `TECHNOLOGY_SERVICE` ([`../../elements/17-relations.md`](../../elements/17-relations.md) §3). The view document declares which applications and integrations to render — it carries no canonical content of its own, and no field on it can express an edge canon doesn't already carry. See [`../../views/diagrams/12-integration-map.md`](../../views/diagrams/12-integration-map.md) for the view spec, the render contract, and the schema guarantee (§5.3).

## Files in this folder

| File | Description |
|---|---|
| [`enterprise.integration-map.transitrix.yaml`](enterprise.integration-map.transitrix.yaml) | Three applications (`APPLICATION-OMS-1`, `APPLICATION-CRM-1`, `APPLICATION-BILLING-1`), filtered to Kafka/REST integrations, with the Kafka platform dependency shown via `technology_services.show: true`. |
| [`rule-violations/`](rule-violations/) | **Deliberately invalid.** Demonstrates that `INTMAP-004` fires when an author tries to place an edge — a `source:`/`target:` object — directly into a reference list instead of pointing at an admitted `INTEGRATION`. Do not copy from this folder; copy from the file above instead. |

## Notation header

Every file starts with:

```yaml
notation: integration-map
```

## Shape

An integration-map view file carries the shared envelope (`notation:`, `spec_version:`, `methodology_version:`) plus a single `view` object. The `view` names the applications in scope (an explicit `include` list or a `filter`), the integrations to draw as edges (`include` / `filter` / `exclude` — always by reference to an admitted `INTEGRATION`, never inline), and optional technology-service and presentation knobs.

```yaml
notation: integration-map
spec_version: "0.1"
methodology_version: "3.7.0"

view:
  id: INTEGRATION_MAP-<NAME>-1
  name: "..."
  applications:
    include: [APPLICATION-..., APPLICATION-...]
  integrations:
    filter:
      protocol: [Kafka, REST]
  technology_services:
    show: true
    include: [TECHNOLOGY_SERVICE-...]
```

The full field set, the render contract, and the validation rules are in [`../../views/diagrams/12-integration-map.md`](../../views/diagrams/12-integration-map.md).

## Preview

Open any `.integration-map.transitrix.yaml` file in VS Code with Transitrix Studio installed once the renderer ships (planned).
