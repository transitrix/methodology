# SDD notation — examples

File extension: **`.sdd.transitrix.yaml`**

The SDD (Software Design Description) view is a **document-rendering configuration** over `APPLICATION` ([`../../ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.7), `NODE` ([`../../elements/25-nodes.md`](../../elements/25-nodes.md)), and `TECHNOLOGY_SERVICE` ([`../../elements/26-technology-services.md`](../../elements/26-technology-services.md)) — it groups admitted design elements under themselves, and lists under each the `REQUIREMENT`s it realises, traced one hop through `ASSERTION.realised_via` → `ASSERTION.about` ([`../../elements/16-assertion.md`](../../elements/16-assertion.md)). The view document declares which slice to render — it carries no canonical content of its own. See [`../../views/documents/31-sdd.md`](../../views/documents/31-sdd.md) for the view spec and the render contract.

**Pattern, not adopter instance.** The scenario (a customer self-service portal's data-export capability) is a generic, invented example — it names no real product, organisation, or adopter, and is deliberately distinct from the outage-notification scenario the MRD worked example uses.

## Files in this folder

| File | Description |
|---|---|
| [`data-export.sdd.transitrix.yaml`](data-export.sdd.transitrix.yaml) | SDD document config over all three design-element TYPEs, scoped to `legislative`-origin requirements. Renders three sections: two design elements that trace to the requirement, one that does not. |
| [`canon/elements/01_motivation/requirements/REQUIREMENT-DATA-EXPORT-SLA-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-DATA-EXPORT-SLA-1.yaml) | The `REQUIREMENT` the design elements below realise — a 30-day personal-data export obligation. |
| [`canon/elements/02_business/products/PRODUCT-CUSTOMER-PORTAL-1.yaml`](canon/elements/02_business/products/PRODUCT-CUSTOMER-PORTAL-1.yaml) | The `PRODUCT` that is the assertion's compliance-unit `subject` ([`16-assertion.md`](../../elements/16-assertion.md) §2, `ASSERT-003`) — not itself an SDD design element; included so the `ASSERTION` below resolves. |
| [`canon/elements/03_application/applications/APPLICATION-DATA-EXPORT-SERVICE-1.yaml`](canon/elements/03_application/applications/APPLICATION-DATA-EXPORT-SERVICE-1.yaml) | An `APPLICATION` design element that realises the requirement. |
| [`canon/elements/04_technology/services/TECHNOLOGY_SERVICE-EXPORT-QUEUE-1.yaml`](canon/elements/04_technology/services/TECHNOLOGY_SERVICE-EXPORT-QUEUE-1.yaml) | A `TECHNOLOGY_SERVICE` design element that also realises the requirement, exercising a second design-element TYPE under the same document. |
| [`canon/elements/04_technology/nodes/NODE-EXPORT-QUEUE-HOST-1.yaml`](canon/elements/04_technology/nodes/NODE-EXPORT-QUEUE-HOST-1.yaml) | A `NODE` design element hosting the technology service above — deliberately **not** referenced by any `ASSERTION.realised_via`, so it renders with `view.empty_section_label` and exercises `view.include_untraced_elements`. |
| [`canon/assertions/ASSERTION-CUSTOMER-PORTAL-DATA-EXPORT-1.yaml`](canon/assertions/ASSERTION-CUSTOMER-PORTAL-DATA-EXPORT-1.yaml) | The `ASSERTION` connecting the requirement to its realising design elements — `about` the requirement, `subject` the product, `realised_via` the application and the technology service. |

Unlike the `canon/` fragment under [`../mrd/`](../mrd/) (whose subject is exercising the document-view engine over motivation-layer elements), this folder's `canon/` tree spans four layers — motivation, business, application, and technology — because the SDD trace itself spans them: `REQUIREMENT` (motivation) ← `ASSERTION` (canon-zone, `subject` at the business layer) → `realised_via` (application / technology layer). This folder's top-level file is the **view document**; the `canon/` tree exists only so the view has admitted elements to render, mirroring how a `.sdd.transitrix.yaml` file would sit alongside the rest of an adopter's canon.

## Notation header

Every file starts with:

```yaml
notation: sdd
```

## Shape

An SDD view file carries the shared envelope (`notation:`, `spec_version:`, `methodology_version:`) plus a single `view` object. The `view` names the design-element scope (an explicit `include` list or a `filter` on TYPE), the requirement scope (an explicit `include` list or a `filter` on `origin`), and the ordering knobs for sections and the requirements within them.

```yaml
notation: sdd
spec_version: "0.1"
methodology_version: "3.6.0"

view:
  id: SDD-<NAME>-1
  name: "..."
  scope:
    design_elements:
      filter:
        type: [APPLICATION, NODE, TECHNOLOGY_SERVICE]
    requirements:
      filter:
        origin: [legislative]
  include_untraced_elements: true
```

The full field set, the render contract, and the validation rules are in [`../../views/documents/31-sdd.md`](../../views/documents/31-sdd.md).

## Preview

Open any `.sdd.transitrix.yaml` file in VS Code with Transitrix Studio installed once the document-view engine ships (consumer-side, tracked separately).
