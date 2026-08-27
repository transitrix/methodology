# MRD notation — examples

File extension: **`.mrd.transitrix.yaml`**

The MRD (Marketing Requirements Document) view is a **document-rendering configuration** over `NEED` ([`../../ELEMENT_PRIMITIVES.md`](../../ELEMENT_PRIMITIVES.md) §7.28) and `REQUIREMENT` ([`../../elements/15-requirement.md`](../../elements/15-requirement.md)) — it groups admitted requirements under the stakeholder/user need each one serves, via `REQUIREMENT.serves`. The view document declares which slice to render — it carries no canonical content of its own. See [`../../views/documents/29-mrd.md`](../../views/documents/29-mrd.md) for the view spec and the render contract.

**Pattern, not adopter instance.** The scenario (customers needing timely notice of a service outage) is a generic, invented example — the same fixture already used by the [`../validation/`](../validation/) worked example — chosen to exercise the MRD layout's grouping behaviour with more than one requirement under one need. It names no real product, organisation, or adopter.

## Files in this folder

| File | Description |
|---|---|
| [`incident-status.mrd.transitrix.yaml`](incident-status.mrd.transitrix.yaml) | MRD document config for one need (`NEED-TIMELY-OUTAGE-STATUS-1`), scoped to `project-product`-origin requirements. Renders one section with two requirements grouped under it. |
| [`canon/elements/01_motivation/needs/NEED-TIMELY-OUTAGE-STATUS-1.yaml`](canon/elements/01_motivation/needs/NEED-TIMELY-OUTAGE-STATUS-1.yaml) | The `NEED` this document is scoped to — reused from [`../validation/`](../validation/), which exercises the same fixture for the `NEED` → `VALIDATION` leg. |
| [`canon/elements/01_motivation/requirements/REQUIREMENT-OUTAGE-STATUS-PAGE-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-OUTAGE-STATUS-PAGE-1.yaml) | A `REQUIREMENT` serving the need above — reused from [`../validation/`](../validation/). |
| [`canon/elements/01_motivation/requirements/REQUIREMENT-OUTAGE-STATUS-EMAIL-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-OUTAGE-STATUS-EMAIL-1.yaml) | A second, new `REQUIREMENT` serving the same need — added so the worked example demonstrates the layout grouping more than one requirement under a single need section. |
| [`canon/elements/01_motivation/stakeholders/STAKEHOLDER-ENTERPRISE-CUSTOMERS-1.yaml`](canon/elements/01_motivation/stakeholders/STAKEHOLDER-ENTERPRISE-CUSTOMERS-1.yaml) | The `STAKEHOLDER` the need's `stakeholder` field resolves to — reused from [`../validation/`](../validation/). |
| [`canon/elements/02_business/actors/ACTOR-ENTERPRISE-CUSTOMERS-1.yaml`](canon/elements/02_business/actors/ACTOR-ENTERPRISE-CUSTOMERS-1.yaml) | The `ACTOR` the stakeholder's identity resolves to (`STAKEHOLDER.actor` is required) — reused from [`../validation/`](../validation/). |

Unlike the `canon/` fragment under [`../validation/`](../validation/) and [`../verification/`](../verification/) (whose subject is the element notations themselves), this folder's top-level file is the **view document** — the `canon/` tree here exists only so the view has admitted `NEED` / `REQUIREMENT` elements to render, mirroring how a `.mrd.transitrix.yaml` file would sit alongside the rest of an adopter's canon.

## Notation header

Every file starts with:

```yaml
notation: mrd
```

## Shape

An MRD view file carries the shared envelope (`notation:`, `spec_version:`, `methodology_version:`) plus a single `view` object. The `view` names the need scope (an explicit `include` list or a `filter` on stakeholder), the requirement scope (an explicit `include` list or a `filter` on `origin`), and the ordering knobs for sections and the requirements within them.

```yaml
notation: mrd
spec_version: "0.1"
methodology_version: "4.2.0"

view:
  id: MRD-<NAME>-1
  name: "..."
  scope:
    needs:
      include: [NEED-...]
    requirements:
      filter:
        origin: [project-product]
  include_unserved_needs: true
```

The full field set, the render contract, and the validation rules are in [`../../views/documents/29-mrd.md`](../../views/documents/29-mrd.md).

## Preview

Open any `.mrd.transitrix.yaml` file in VS Code with Transitrix Studio installed once the document-view engine ships (consumer-side, tracked separately).
