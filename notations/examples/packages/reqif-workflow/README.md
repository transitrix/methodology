# ReqIF package — workflow-state, revisions, suspect links (worked example)

A second, minimal adopter-repo slice exercising the ReqIF package's **experimental surface** ([`notations/packages/reqif.md`](../../../packages/reqif.md) §2.9): workflow state, revision history, and suspect-link mechanics on top of the base object model from [`notations/examples/packages/reqif/`](../reqif/).

**Kept in its own folder, not added to the base worked example.** `workflow_state`, `revision`, `revisions`, and `recorded_target_revision` are top-level package-tooling fields that the converter ([`packages/reqif-cli/src/reqif-xml.mjs`](../../../../packages/reqif-cli/src/reqif-xml.mjs)) does not carry through ReqIF XML export/import in v1 — they are a tool behaviour, not part of the ReqIF standard (epic vkgeorgia/strategy#813). Adding them to the base fixture would make its `roundtrip` command fail, since a reimported object would lose fields the exporter never wrote. Isolating them here keeps [`notations/examples/packages/reqif/`](../reqif/)'s own round-trip demonstration (task #387/#828) untouched.

**Pattern, not adopter instance.** The scenario (a battery-shutdown requirement) is a generic, invented example. It names no real product, organisation, or adopter.

## Files in this folder

| File | Kind | Role |
|---|---|---|
| [`transitrix.yaml`](transitrix.yaml) | manifest | Declares `packages: [reqif]`, same as the base example. |
| [`canon/elements/01_motivation/requirements/REQUIREMENT-BATTERY-LOW-POWER-SHUTDOWN-1.yaml`](canon/elements/01_motivation/requirements/REQUIREMENT-BATTERY-LOW-POWER-SHUTDOWN-1.yaml) | core `REQUIREMENT` | The core element the package cites. |
| [`reqif/spec-objects/so-battery-shutdown-req-1.yaml`](reqif/spec-objects/so-battery-shutdown-req-1.yaml) | `spec-object` | Carries `workflow_state: reviewed` and `revision: 1` — an object that has opted into the experimental surface. |
| [`reqif/spec-objects/so-battery-shutdown-rationale-1.yaml`](reqif/spec-objects/so-battery-shutdown-rationale-1.yaml) | `spec-object` | No `workflow_state` field — demonstrates the implicit-`draft` default (reqif.md §2.9). |
| [`reqif/spec-relations/sr-battery-elaborates-1.yaml`](reqif/spec-relations/sr-battery-elaborates-1.yaml) | `spec-relation` | Carries `recorded_target_revision: 1`, matching the target's revision at fixture authoring time — not yet suspect. |
| [`reqif/spec-hierarchies/sh-root-1.yaml`](reqif/spec-hierarchies/sh-root-1.yaml) | `spec-hierarchy` | Outline over both objects. |

## What it demonstrates

Exercised end-to-end, against a temp-dir copy (never the checked-in fixture itself), by [`packages/reqif-cli/tests/test_reqif_workflow.py`](../../../../packages/reqif-cli/tests/test_reqif_workflow.py):

- **Workflow-state transitions are enforced.** `transitrix-reqif transition <dir> so-battery-shutdown-req-1 approved` succeeds (`reviewed -> approved`, the single legal next step); attempting to skip straight to `superseded` is rejected (exit 1), never silently applied.
- **Revision history is queryable.** `transitrix-reqif revise <dir> so-battery-shutdown-req-1 ReqIF.Text "<new text>"` bumps the object's `revision` and appends the pre-change `values` snapshot to `revisions`; `transitrix-reqif history <dir> so-battery-shutdown-req-1` prints "what changed, when" oldest first.
- **Suspect links fire.** Before any `revise`, `transitrix-reqif suspect <dir>` reports `sr-battery-elaborates-1` as not suspect (its `recorded_target_revision` matches the target's current `revision`). After revising the target's text, the same relation is reported `SUSPECT` — and a relation whose target doesn't resolve at all (a different failure mode, caught by `REQIF-004`) never appears in the `suspect` report, so a suspect link and "no relation exists" are never visually indistinguishable.

## References

- [`notations/packages/reqif.md`](../../../packages/reqif.md) §2.9 — the schema this fixture exercises.
- [`notations/examples/packages/reqif/`](../reqif/) — the base worked example (object model, converter, round trip).
- [`PACKAGES.md`](../../../PACKAGES.md) — the mechanism this package is shipped under.
