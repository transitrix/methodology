# Compliance Impact notation — examples

File extension: **`.compliance-impact.transitrix.yaml`**

The compliance-impact view is a **report-configuration surface** over the compliance overlay derived from `ASSERTION` ([`../../elements/16-assertion.md`](../../elements/16-assertion.md)), process flow ([`../../ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.5 / §7.20), and `REQUIREMENT` status ([`../../elements/15-requirement.md`](../../elements/15-requirement.md)). The view document declares which slice of the (obligation × subject) matrix to render — it carries no canonical content of its own. See [`../../views/21-compliance-impact.md`](../../views/21-compliance-impact.md) for the view spec and the render contract.

## Files in this folder

| File | Description |
|---|---|
| [`retail-gdpr.compliance-impact.transitrix.yaml`](retail-gdpr.compliance-impact.transitrix.yaml) | Compliance overlay for one product (`PRODUCT-RETAIL-1`) against the GDPR slice of canon. Rows are obligations; columns are product × stage × task. Demonstrates the default empty-cell label "No mapped obligation (current model)" — the §5.3 distinction from the canonical `n_a` cell. |

## Notation header

Every file starts with:

```yaml
notation: compliance-impact
```

## Shape

A compliance-impact view file carries the shared envelope (`notation:`, `spec_version:`, `methodology_version:`) plus a single `view` object. The `view` names the subjects (products and/or processes), the obligations (an explicit `include` list or a `filter` against the codex source), grouping knobs for rows and columns, status display rules, and the empty-cell labels.

```yaml
notation: compliance-impact
spec_version: "0.1"
methodology_version: "2.1.0"

view:
  id: COMPLIANCE_IMPACT-<NAME>-1
  name: "..."
  subjects:
    products: [PRODUCT-...]      # or processes: [PROCESS-...]
  obligations:
    filter:
      derived_from_codex: [REGULATION-...]
  grouping:
    rows: "obligation"
    columns: "product-stage-task"
  empty_cells:
    no_obligation_label: "No mapped obligation (current model)"
```

The full field set, the render contract, and the validation rules are in [`../../views/21-compliance-impact.md`](../../views/21-compliance-impact.md).

## Preview

Open any `.compliance-impact.transitrix.yaml` file in VS Code with Transitrix Studio installed once the compliance-views renderer ships (consumer-side, tracked separately).
