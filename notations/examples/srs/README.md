# SRS notation — examples

File extension: **`.srs.transitrix.yaml`**

The SRS (Software Requirements Specification) view is a **document-rendering configuration** over `REQUIREMENT` ([`../../elements/15-requirement.md`](../../elements/15-requirement.md)) — it sections admitted software-tier requirements (`level: software`) by `kind` (`functional` / `quality`). The view document declares which slice to render — it carries no canonical content of its own. See [`../../views/documents/30-srs.md`](../../views/documents/30-srs.md) for the view spec and the render contract.

**Pattern, not adopter instance.** The scenario (a backup-power controller that must fail over to a standby node) is a generic, invented example — the same fixture already used by the [`../verification/`](../verification/) worked example — reused here and extended with `level` / `kind` to exercise the SRS layout's sectioning behaviour. It names no real product, organisation, or adopter.

## Files in this folder

| File | Description |
|---|---|
| [`backup-power.srs.transitrix.yaml`](backup-power.srs.transitrix.yaml) | SRS document config scoped to `level: software`. Renders a `Functional` section with two requirements and a `Quality` section with one. |
| [`canon/elements/01_motivation/requirements/REQUIREMENT-BACKUP-POWER-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-BACKUP-POWER-1.yaml) | Software-tier, `kind: functional` — reused from [`../verification/`](../verification/) with `level` / `kind` added. |
| [`canon/elements/01_motivation/requirements/REQUIREMENT-FAILOVER-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-FAILOVER-1.yaml) | Software-tier, `kind: functional` — reused from [`../verification-reverse-trace-gaps/`](../verification-reverse-trace-gaps/) with `level` / `kind` added. |
| [`canon/elements/01_motivation/requirements/REQUIREMENT-SESSION-TIMEOUT-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-SESSION-TIMEOUT-1.yaml) | Software-tier, `kind: quality` — reused from [`../verification-reverse-trace-gaps/`](../verification-reverse-trace-gaps/) with `level` / `kind` added. |
| [`canon/elements/01_motivation/requirements/REQUIREMENT-BACKUP-POWER-COVERAGE-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-BACKUP-POWER-COVERAGE-1.yaml) | System-tier (`level: system`), added new for this fixture — demonstrates that the `filter.level: [software]` scope excludes a requirement outside the software tier; it does not appear in the rendered document. |

Unlike the `canon/` fragment under [`../validation/`](../validation/) and [`../verification/`](../verification/) (whose subject is the element notations themselves), this folder's top-level file is the **view document** — the `canon/` tree here exists only so the view has admitted `REQUIREMENT` elements to render, mirroring how a `.srs.transitrix.yaml` file would sit alongside the rest of an adopter's canon.

## Notation header

Every file starts with:

```yaml
notation: srs
```

## Shape

An SRS view file carries the shared envelope (`notation:`, `spec_version:`, `methodology_version:`) plus a single `view` object. The `view` names the requirement scope (an explicit `include` list or a `filter` on `level`), whether an unclassified-`kind` section and empty sections still render, and the ordering knob for requirements within each section.

```yaml
notation: srs
spec_version: "0.1"
methodology_version: "5.1.0"

view:
  id: SRS-<NAME>-1
  name: "..."
  scope:
    requirements:
      filter:
        level: [software]
  include_unclassified_kind: true
  include_empty_sections: true
```

The full field set, the render contract, and the validation rules are in [`../../views/documents/30-srs.md`](../../views/documents/30-srs.md).

## Rendered result (worked through the §5 render contract)

| Section | Requirements |
|---|---|
| Functional | `REQUIREMENT-BACKUP-POWER-1`, `REQUIREMENT-FAILOVER-1` (ordered by `id`) |
| Quality | `REQUIREMENT-SESSION-TIMEOUT-1` |
| Unclassified | *(empty — every in-scope requirement carries a `kind`; renders with the empty-section label)* |

`REQUIREMENT-BACKUP-POWER-COVERAGE-1` (`level: system`) never appears — it is outside the `filter.level: [software]` scope, the expected non-error behaviour per [30-srs.md](../../views/documents/30-srs.md) §5.2.

## Preview

Open any `.srs.transitrix.yaml` file in VS Code with Transitrix Studio installed once the document-view engine ships (consumer-side, tracked separately).
