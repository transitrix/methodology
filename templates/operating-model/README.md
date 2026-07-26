# Operating model — a composition, not a new artefact

A forkable starter that demonstrates a claim, not just a pattern: **"your operating model" is not a separate artefact to author.** It is a view composed from building blocks you already express in Transitrix notation — motivation, capabilities, value streams, processes, organisation, information, products, and applications. This template runs **one** minimal, coherent scenario (a generic company's customer-onboarding operating slice) through all eight building blocks so the composition can be seen end to end, cross-referenced by real canonical IDs.

No client or organisation data — every ID, name, and description below is generic and reusable. See [`../README.md`](../README.md) for how this differs from `notations/examples/` and from the `acme-corp` worked example.

## Fork and go

1. Copy [`canon/`](canon/) into your own repository (or fork this one and delete everything outside `templates/operating-model/`).
2. Rename the `ONBOARDING` domain tag and the `1` sequence numbers to your own scenario's IDs — keep the `<TYPE>-<INTEGER>` grammar ([`../../notations/IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md) §1).
3. Edit each element file under `canon/elements/` for your own goal, capability, process, roles, business object, product, and application. Edit the matching view under `canon/views/` to match — the view's inline fields should mirror the element's stable fields (see "The layout convention" below for which notations this applies to).
4. Validate every file: `npx @transitrix/cli validate <file>` (Windows PowerShell: `npx.cmd`), and the whole set at once with `npx @transitrix/cli validate --scope=repo --root .` from inside `templates/operating-model/`.
5. Grow from here: add more capabilities, a second process stage, a richer org tree — the composition scales the same way your real operating model does, one building block at a time.

## The eight building blocks

| # | Building block | Notation | File(s) |
|---|---|---|---|
| 1 | Motivation & goals | Goals tree | `canon/elements/01_motivation/goals/GOAL-ONBOARDING-1.yaml` + `canon/views/goals/onboarding.goals.transitrix.yaml` |
| 2 | Capabilities | Capability Map | `canon/elements/02_business/capabilities/CAPABILITY-V1.yaml` + `canon/views/capabilities/onboarding.capability-map.transitrix.yaml` |
| 3 | Value streams | Process Blueprint | `canon/views/process-blueprint/onboarding.process-blueprint.transitrix.yaml` |
| 4 | Processes | BPMN | `canon/elements/02_business/processes/PROCESS-ONBOARDING-1.yaml` + `canon/views/bpmn/onboarding.bpmn.transitrix.yaml` |
| 5 | Organisation | Nested Block Diagram | `canon/views/blocks/onboarding.blocks.transitrix.yaml` (tree form, §4 of [`08-blocks.md`](../../notations/views/08-blocks.md) — not the matrix subset the RACI template uses) |
| 6 | Information | Business Object, shown in the Process Blueprint | `canon/elements/02_business/business-objects/BUSINESS_OBJECT-CUSTOMER-PROFILE-1.yaml`, referenced from the same process-blueprint file as row 3 |
| 7 | Products & services | Products catalogue | `canon/elements/02_business/products/PRODUCT-ONBOARDING-1.yaml` + `canon/views/products/onboarding.products.transitrix.yaml` |
| 8 | Applications | Applications catalogue | `canon/elements/03_application/applications/APPLICATION-ONBOARDING-1.yaml` + `canon/views/applications/onboarding.applications.transitrix.yaml` |

Row 6 is deliberately not a separate file: the point of the composition is that "information" is not its own notation, it is a Business Object surfaced inside the Process Blueprint that already carries row 3.

## The layout convention

This template mirrors the real adopter file convention — the same one `transitrix/acme-corp` uses — rather than inlining everything into one file per notation:

- **Standalone element files**, one per element, under `canon/elements/<NN>_<layer>/<plural-type>/<ID>.yaml`. Each carries the full envelope: header, admission record ([`CONTRACT.md`](../../notations/CONTRACT.md) §6), and primitive lifecycle (§7). This is the authoritative record for that element — the "elements are the complete and sufficient source of truth" invariant ([`ELEMENT_PRIMITIVES.md`](../../notations/ELEMENT_PRIMITIVES.md) §1.1).
- **View files** under `canon/views/<notation>/`, each carrying only the presentation layer plus cross-references by ID.

That second point splits into two shapes depending on the notation, because the notations themselves are at different points in the same migration:

- **Goals** (row 1) is a **pure projection** (`view_config` only, no inline element data) — mandatory since methodology `2.0.0` (`CHANGELOG.md`, 2026-07-12): a `goals[]` array inline in the view is a validator error (`GOALS-008`). This is the shape every notation is expected to converge on.
- **Capability Map, Products, Applications** (rows 2, 7, 8) are still **inline aggregator catalogues** in the current spec: the view's `capabilities[]` / `products[]` / `applications[]` entries duplicate the referenced element's stable fields rather than pointing at it by bare ID. This is the documented v1 shape (`05-capability-map.md` §12, `09-products.md` §4, `10-applications.md` §4) — not a shortcut this template took.
- **Process Blueprint and Nested Blocks** (rows 3 and 5) were never element-backed catalogues to begin with — they are cross-cutting views whose stages/aspects/blocks are document-local, optionally cross-linking into element catalogues by canonical ID (`APPLICATION-…`, `ROLE-…`, `BUSINESS_OBJECT-…`) when the referenced element exists. This template's entries do carry those IDs, so a renderer can resolve them.
- **BPMN** (row 4) is a **derived projection** of the `PROCESS` element's own `flow` field — the element is genuinely the only source of truth (`01-bpmn.md`, "Relationship to the PROCESS element"). This repository does not run the Studio generator that would derive `canon/views/bpmn/onboarding.bpmn.transitrix.yaml` automatically, so it is hand-authored here to mirror `PROCESS-ONBOARDING-1.yaml`'s `flow` — keep the two in sync if you edit either.

## The modelling rule / relation vocabulary this template applies

Every cross-reference in this template is a real field a notation spec already defines — no relation kind was invented to make the composition read cleanly:

- `CAPABILITY.business_process` / `CAPABILITY.applications` (capability → process, capability → applications)
- `PROCESS.capability` / `PROCESS.participants` (process → capability, process → roles)
- `PRODUCT.capabilities` / `PRODUCT.processes` / `PRODUCT.supporting_apps` (product ← delivered by capability/process/application)
- `APPLICATION.capabilities` / `APPLICATION.products` (application → capability, application → product)
- Process Blueprint `systems[].id` / `actors[].id` / `business_objects[].id` (value stream → application/role/business object)
- BPMN lane/element `performed_by_role` / `supported_by_application` (process step → role/application)
- Nested block `id` matching a registered `TYPE-…` prefix (org block → role)

**No `canon/relations/` folder.** The closed `REL` `type` enum ([`elements/17-relations.md`](../../notations/elements/17-relations.md) §3 — `parent`, `goal_parent`, `action_goal`, `unit_parent`, `employment`, `offers`, `realizes`, `hosts`, `uses`, …) only applies where two elements of the *same* kind need a time-aware link (a capability re-parented, a goal re-aimed, an org unit re-organised). This template keeps exactly one instance per building block, so none of that enum's kinds has a natural second element to link to. Fork this template and add a second capability, goal, or org unit, and the relevant `REL-…` file becomes the right home for that link — don't fabricate one here just to populate the folder.

There is also no `GOAL → CAPABILITY` cross-reference field anywhere in this template. That is not an oversight: as of this writing, no notation spec defines one (`GOAL`'s fields are `type`, `level`, `parent`, `factors`; `CAPABILITY`'s fields carry `business_process` and `applications`, not `goals`). The motivation and capability building blocks here are tied together by the shared "customer onboarding" scenario and by prose, not by a schema-level link — an honest reflection of what the methodology currently expresses, not a gap this template silently patches over.

## Implementation status — known CLI/spec gaps

Run `npx @transitrix/cli validate <file>` (or `--scope=repo`) against every file in `canon/` before you extend this template; here is what to expect on the unmodified template itself (verified 2026-07-26):

- **Standalone element files are not yet CLI-validated file-by-file.** `canon/elements/**/*.yaml` (notation values `goal`, `capability`, `process`, `product`, `application`, `role`, `business_object`) each print `notation "<x>" is not yet validated by the CLI` and exit `0` — informational, not a failure. Whole-canon checks do cover them: `npx @transitrix/cli validate --scope=repo --root .` from inside `templates/operating-model/` passes clean (`"valid": true`, zero findings) against this template as shipped.
- **The goals projection view needs `--scope=repo`.** `canon/views/goals/onboarding.goals.transitrix.yaml` is a pure `view_config` projection; single-file validation has no `canon/elements/**` to resolve `GOAL-ONBOARDING-1` against, so it prints a notice rather than pass/fail. `--scope=repo` resolves it.
- **Capability Map's `current_maturity` is required inline by the shipped validator, contradicting the spec.** `05-capability-map.md` §13–14 designates `current_maturity` time-varying (sidecar-only, `<id>.history.yaml`, per [`CONTRACT.md`](../../notations/CONTRACT.md) §9) — inlining it is documented as triggering `VERSIONED-004`. The shipped CLI validator (`packages/diagrams/src/capability-map/validate.ts` in `transitrix-studio`, rule `CMAP-003`) has not caught up: it requires `current_maturity` inline and does not know about sidecars or `VERSIONED-004` at all. `canon/views/capabilities/onboarding.capability-map.transitrix.yaml` inlines `current_maturity` so it validates against the CLI that actually ships today; the standalone element file `CAPABILITY-V1.yaml` omits it (per spec) since standalone `capability` elements are not yet CLI-validated (see above) — no VERSIONED-004 risk either way in the current CLI. Repro: delete `current_maturity` from the view's `capabilities[0]` entry and re-run `validate` — it fails with `CMAP-003`.
- **Process Blueprint's shipped validator does not yet recognise `business_objects[]`.** The notation spec (`13-process-blueprint.md` §5.3) renamed `information_entities[]` to `business_objects[]`; the shipped validator (`packages/diagrams/src/process-blueprint/validate.ts`) still only checks `systems` / `actors` / `equipment` / `information_entities`. This is not a failure — an unrecognised category key is silently skipped, not rejected — but it means `business_objects[]` in `canon/views/process-blueprint/onboarding.process-blueprint.transitrix.yaml` gets no structural checking from the CLI today (ID-prefix and stage-reference checks that do run for `systems[]` / `actors[]` do not run for it). Confirm it by eye until the validator catches up.

All six view files that the shipped CLI *does* validate at file scope — `applications`, `blocks`, `bpmn`, `capability-map`, `process-blueprint`, `products` — pass with zero errors and zero warnings as shipped.

## What this is not

This is **not** a full worked example like `transitrix/acme-corp`. `acme-corp` is a single, coherent, full-organisation model built for depth — many capabilities, many processes, a real maturity history, compliance chains. This template is a **minimal composition proof**: exactly one instance per building block, enough to show the eight rows are real, cross-referenced, and independently valid — not enough to run a transformation programme against. Extend it, don't read it as a reference architecture.
