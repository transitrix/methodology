# Element primitives — canonical file schema

This appendix defines the **element-primitive file schema**: what a standalone canon-zone element file looks like, which element TYPEs get one, where each lives on disk, and how the per-TYPE field sets are defined. It is the cross-cutting companion to the view specs (`notations/views/`), the element notations (`notations/elements/`), the ID grammar ([`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md)), and the shared contracts ([`CONTRACT.md`](CONTRACT.md)).

Recorded 2026-05-29 as the canonical decision for the methodology. Status: **documented** — the three decisions this document carries (standalone-vs-view-only mode assignment §4, the new `05_implementation` layer §6, and `name` as the single label field §3) were ratified by canon on 2026-05-29.

A view spec describes a *render-able artefact* (a diagram, a catalogue, a tree). An **element primitive** is the *thing* a view arranges and points at — a Factor, a Goal, a Capability, an Application. The same primitive can be referenced from many views; the view is a projection, the primitive is the record. This document defines the record.

---

## 1. The two materialisation modes

Every element TYPE in the registry ([`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §3.1) resolves to exactly one of two **materialisation modes**. The mode answers issue-question 1 ("standalone vs view-only") for that TYPE.

| Mode | Where the element is *defined* (its definition home) | Carries |
|---|---|---|
| **`standalone`** | One YAML file per element under `canon/elements/<NN>_<layer>/<plural-type>/<ID>.yaml`. The element file is the authoritative record; views reference it by ID. | The full envelope of §3 — header + identity + admission record ([CONTRACT.md](CONTRACT.md) §6) + primitive lifecycle ([CONTRACT.md](CONTRACT.md) §7). |
| **`view-defined`** | Inline inside a view document (`*.<short>.transitrix.yaml`). There is no separate element file; the view document is the definition home. | The element's own inline fields plus its own `valid_from` / `valid_to` per [CONTRACT.md](CONTRACT.md) §7.1. The document — not each entry — carries the single admission record. |

**The promotion rule (already canon).** [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §4 already states that the strategy-chain TYPEs (`FACTOR`, `GOAL`, `CHANGE`, `ACTIVITY`) are unique "within the FGCA / FGA / Goals / Activities document that defines them" **and**, "when referenced from across documents, … also be unique within the organisation's element catalogue." This document formalises that clause: a `standalone` TYPE has a defined element-file schema (§7) so that any element of that TYPE *can* be materialised in the catalogue. A view document remains a valid authoring surface; when an element is shared across documents it is **promoted** to its standalone catalogue file (its definition home), and the views reference it by ID rather than re-defining it.

A `standalone` mode therefore does not forbid inline authoring inside a single view — it fixes *where the canonical record lives once the element is shared*, and guarantees the element file shape is defined so promotion is mechanical, not a redesign. This is what unblocks the elements-population work that surfaced this task (`FACTOR` / `CHANGE` / `ACTIVITY` had no element-file shape to promote into).

**Promotion trigger — when (and only when) referenced from another document.** Canon ratified `standalone`-with-promotion over an always-standalone alternative on the grounds that the flat FGCA / FGA / Goals / Activities documents are *narrative artefacts*, not catalogue layouts: fragmenting an FGCA into per-element files from day one would harm the very authoring ergonomics those notations exist for. So an element stays inline in its authoring document until a *second* document references it; at that point it is promoted to its catalogue file and both documents reference it by ID. The supporting tool work — detecting a cross-document reference, enforcing promotion at that point, and flagging an inline reference that should already have been promoted — is a validator / codemod concern tracked separately (it does not change the file schema this document defines).

A `view-defined` TYPE has **no** standalone element-file schema in v1: its only definition home is the view/document that declares it (§4 lists which, and why).

### 1.1 The reconstruction invariant — `Views = render(Elements, view_config)`

The split between `canon/elements/` and `canon/views/` is governed by one invariant: **the elements are the complete and sufficient source of truth for the organisation's behaviour; a view is a projection over them.** Formally, a view is `render(Elements, view_config)` — it takes the canonical elements plus its own *presentation configuration* (which elements to show, grouping, filtering, ordering, display options) and renders them. The two folders own disjoint things:

- **No behaviour lives only in a view.** Every fact about how the organisation works — a process's steps and flow, a goal hierarchy, a capability's maturity — must be reconstructable from `canon/elements/`. Delete `canon/views/` entirely and no knowledge is lost; the views regenerate.
- **No view configuration lives in `canon/elements/`.** Which rows a Process Blueprint shows, a capability-map's orientation, a saved report's selection and filters — these are the view's own primary data and are not derivable from the elements. They are not behaviour; they stay in the view.

**View-purity corollary.** A view carries *no non-derivable information beyond its configuration* — no hand-tuned layout, no view-only annotations, no canonical content that exists nowhere else. (Layout is already computed deterministically per notation, so it carries no information — consistent with this rule.) BPMN is the case this resolves: a process's flow is behaviour and belongs in the `PROCESS` element (§7.5); the BPMN file is a projection of it.

This invariant scopes the materialisation modes of §4: `view-defined` must never mean "behaviour that lives only in a view" (§4.2).

---

## 2. Relationship to the views, the element notations, and `canon/`

```
canon/
  elements/                         # standalone element primitives (this document)
    01_motivation/
      factors/        FACTOR-*.yaml
      goals/          GOAL-*.yaml
      constraints/    CONSTRAINT-*.yaml      # worked-example precedent
      requirements/   REQUIREMENT-*.yaml     # elements/15-requirement.md
      stakeholders/   STAKEHOLDER-*.yaml     # elements/20-stakeholders.md (actor: REQUIRED)
    02_business/
      capabilities/   CAPABILITY-*.yaml      # views/05-capability-map.md §13
      processes/      PROCESS-*.yaml
      products/       PRODUCT-*.yaml
      roles/          ROLE-*.yaml
      actors/         ACTOR-*.yaml           # elements/19-actors.md (person | business_unit | system)
      rules/          RULE-*.yaml             # worked-example precedent
    03_application/
      applications/   APPLICATION-*.yaml
      integrations/   INTEGRATION-*.yaml      # promotable; nested-in-view in v1 (§4)
    04_technology/    (no registry element TYPEs yet — see IDS_AND_REFERENCES.md)
    05_implementation/                        # new layer, this document §6
      activities/     ACTIVITY-*.yaml          # Work Package (recursive)
      changes/        CHANGE-*.yaml            # Gap (multi-scale)
      milestones/     MILESTONE-*.yaml         # Implementation Event — registration owned by the MILESTONE TYPE task; folder reserved here
      target-states/  TARGET_STATE-*.yaml      # Plateau (§7.17 — structural snapshot satisfying GOALs)
      # room reserved for DELIVERABLE if it ever becomes a first-class TYPE
  relations/          REL-*.yaml              # elements/17-relations.md (flat, not under elements/)
  assertions/         ASSERTION-*.yaml        # elements/16-assertion.md (flat, not under elements/)
  views/              *.<short>.transitrix.yaml   # the render-able projections
```

- The **element notations** (`14-codex` / `15-requirement` / `16-assertion` / `17-relations` / `19-actors`) define specific element families with their own per-notation specs. This appendix is the *general* schema those specs specialise: REQUIREMENT (`elements/15`) and the capability element (`views/05` §13) are already-published instances of the `standalone` envelope below. Where an element notation spec exists, it remains authoritative for that TYPE's per-element fields; this document carries the cross-TYPE envelope and the placement/mode decisions, and gives the field set for the TYPEs that have no dedicated spec yet (`FACTOR`, `GOAL`, `CHANGE`, `ACTIVITY`, `PROCESS`, `PRODUCT`, `APPLICATION`, `INTEGRATION`, `ROLE`, `CONSTRAINT`, `RULE`). `ACTOR` additionally has [elements/19-actors.md](elements/19-actors.md).
- `REL` (`canon/relations/`) and `ASSERTION` (`canon/assertions/`) are canon-zone primitives that deliberately sit **outside** the `elements/` tree (their specs say so); they carry the same admission + lifecycle envelope but are not layer-placed elements. They are out of scope for the §4 element table but listed here for completeness.
- `codex` artefacts (`LAW` / `REGULATION` / `POLICY` / `INTERNAL_STANDARD`) live in the `codex/` zone, not `canon/elements/`, and follow [`elements/14-codex.md`](elements/14-codex.md). They are not `canon` elements and are out of scope here.

---

## 3. The canonical envelope

Every `standalone` element file carries this envelope. Per-TYPE fields (§7) sit between the identity block and the admission record.

```yaml
notation: factor                  # required — element TYPE short name (lowercased TYPE)
id: FACTOR-CHURN-1                 # required — canonical ID (IDS_AND_REFERENCES.md §1/§2)
name: "Rising customer churn"      # required — human-readable label
type: external                     # per-TYPE subtype vocabulary; required where the TYPE defines one
layer: motivation                  # optional — derived from folder placement (§6); documentation only
description: >                     # recommended — one-paragraph elaboration
  …

# ── per-TYPE fields (§7) ──
# e.g. references_constraint, goals, applications, …

# Admission record (CONTRACT.md §6) — required
zone: canon
admitted_at: "2026-05-29"
admitted_by: "v.korobeinikov"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass
derived_from:                      # optional — Field/Codex provenance (CONTRACT.md §6)
  - INTERVIEW-cfo-onboarding-2026-04-15-1

# Primitive lifecycle (CONTRACT.md §7) — required
valid_from: "2026-01-01"
valid_to: null
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | The element TYPE's short name — the lowercased registry TYPE (`factor`, `goal`, `change`, `activity`, `target-state`, `capability`, `process`, `product`, `application`, `integration`, `role`, `actor`, `rule`, `constraint`; `requirement` per [elements/15](elements/15-requirement.md)). Machine-readable type tag; redundant with the ID prefix but read by tooling that does not parse IDs. Drives `HDR-002`. |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §1 (and §2 for `CAPABILITY`). The prefix MUST be the element's registry TYPE. |
| `name` | yes | string | Human-readable label. **Canonical across every element TYPE — no TYPE-specific aliases.** [elements/15-requirement.md](elements/15-requirement.md) historically used `title` (inherited from IEEE/ISO requirements templates — stylistic, not functional); REQUIREMENT migrates `title` → `name` (follow-up F-3, §10). A richer naming structure (e.g. `short_title` + `long_description`) is a separate additive enhancement via *additional fields*, never via an alias for `name`. |
| `type` | per-TYPE | string | Subtype value from the TYPE's controlled vocabulary (e.g. `external` / `internal` for FACTOR; `domain` / `supporting` for CAPABILITY). Required where §7 defines a subtype vocabulary; omitted where it does not. **`type` carries the *subtype*, never the element TYPE itself** — the element TYPE is carried by `notation` + the ID prefix. |
| `layer` | no | string | One of `motivation` / `business` / `application` / `technology` / `implementation`. Redundant with folder placement (§6); kept for documentation and tooling that reads a file out of its folder context. Not required; the folder is authoritative (`ELEM-003`). |
| `description` | recommended | string | One-paragraph elaboration. Some TYPEs use `statement` instead for a normative sentence (RULE, CONSTRAINT — §7). |
| `zone` | yes | string | Always `canon` for an element primitive — [CONTRACT.md](CONTRACT.md) §6. |
| `admitted_at` | yes | string | Date admitted to canon — quoted ISO 8601 ([CONTRACT.md](CONTRACT.md) §4). |
| `admitted_by` | yes | string | Person handle or tool ID that ran the admission gate. |
| `gate_checks` | yes | map | Standard canon checks (`uniqueness`, `consistency`, `completeness`) — [CONTRACT.md](CONTRACT.md) §6. |
| `derived_from` | no | list | Typed IDs of the Field / Codex artefacts this element was derived from — [CONTRACT.md](CONTRACT.md) §6. A citation, never a migration. |
| `valid_from` | yes | string | Date the element took effect — [CONTRACT.md](CONTRACT.md) §7. |
| `valid_to` | yes | string \| null | Date the element ceased to be in effect, or `null` if still in effect — [CONTRACT.md](CONTRACT.md) §7. |
| `status` | no | string | Organisation-defined workflow state (e.g. `active`, `draft`, `deprecated`). **Distinct** from the Planned/Active/Retired state *derived* from `valid_from`/`valid_to` (see [views/05-capability-map.md](views/05-capability-map.md) §7). Optional; where present it records authoring/governance state, not temporal validity. |
| `owner_role` | no | string | Typed `ROLE-…` ID of the accountable role. Replaces the legacy free-text `owner` (§5). Some TYPEs declare `owner_role` **time-varying** (sidecar-bound — [CONTRACT.md](CONTRACT.md) §9); §7 notes which. |
| `tags` | no | list | Free-form classifier strings. |

**Time-varying fields go to the sidecar, not inline.** Where a TYPE declares a field `time_varying` ([CONTRACT.md](CONTRACT.md) §9.4 — e.g. capability `current_maturity`, application `lifecycle_stage` / `vendor`), that field lives in `<ID>.history.yaml`, never inline on the element file (`VERSIONED-004`).

**Time-aware relations go to `canon/relations/`, not inline.** Where a relation kind is declared first-class time-aware ([elements/17-relations.md](elements/17-relations.md)), it lives in a `REL-…` file, not as an inline cross-reference on the element. In v1 most cross-references remain inline and timeless; §7 notes the declared first-class kinds (capability `parent`, goal `goal_parent`, activity `activity_goal`).

---

## 4. Materialisation decision per TYPE

The mode table. For each registry element TYPE: its mode (§1), its `notation` short name, its layer + folder (§6), and the spec that owns its per-element fields.

| TYPE | Mode | `notation` | Layer | Folder | Per-element fields owned by |
|---|---|---|---|---|---|
| `FACTOR` | standalone | `factor` | motivation | `01_motivation/factors/` | §7.1 (no dedicated spec) |
| `GOAL` | standalone | `goal` | motivation | `01_motivation/goals/` | §7.2 + [views/04-goals.md](views/04-goals.md) |
| `CONSTRAINT` | standalone | `constraint` | motivation | `01_motivation/constraints/` | §7.13 (worked-example precedent) |
| `REQUIREMENT` | standalone | `requirement` | motivation | `01_motivation/requirements/` | [elements/15-requirement.md](elements/15-requirement.md) |
| `STAKEHOLDER` | standalone | `stakeholder` | motivation | `01_motivation/stakeholders/` | §7.15 + [elements/20-stakeholders.md](elements/20-stakeholders.md) |
| `CAPABILITY` | standalone | `capability` | business | `02_business/capabilities/` | [views/05-capability-map.md](views/05-capability-map.md) §13 |
| `PROCESS` | standalone | `process` | business | `02_business/processes/` | §7.5 + [views/06-process-map.md](views/06-process-map.md) |
| `PRODUCT` | standalone | `product` | business | `02_business/products/` | §7.6 + [views/09-products.md](views/09-products.md) |
| `ROLE` | standalone | `role` | business | `02_business/roles/` | §7.9 |
| `ACTOR` | standalone | `actor` | business | `02_business/actors/` | §7.10 + [elements/19-actors.md](elements/19-actors.md) |
| `RULE` | standalone | `rule` | business | `02_business/rules/` | §7.12 (worked-example precedent) |
| `APPLICATION` | standalone | `application` | application | `03_application/applications/` | §7.7 + [views/10-applications.md](views/10-applications.md) |
| `INTEGRATION` | view-defined → standalone (promotable) | `integration` | application | `03_application/integrations/` | §7.8 + [views/10-applications.md](views/10-applications.md) |
| `CHANGE` | standalone | `change` | implementation | `05_implementation/changes/` | §7.3 + [views/02-fgca.md](views/02-fgca.md) |
| `ACTIVITY` | standalone | `activity` | implementation | `05_implementation/activities/` | §7.4 + [views/07-activities.md](views/07-activities.md) |
| `TARGET_STATE` | standalone | `target-state` | implementation | `05_implementation/target-states/` | §7.17 (no dedicated spec) |
| `SCENARIO` | view-defined | `scenarios` | — | (none — `views/<…>.scenarios.transitrix.yaml`) | [views/11-scenarios.md](views/11-scenarios.md) |
| `ISSUE` | view-defined | `issues` | — | (none — `views/<…>.issues.transitrix.yaml`) | [views/12-issues.md](views/12-issues.md) |
| `EQUIPMENT` | view-defined | `process-blueprint` | — | (none — document-local; promotable) | [views/13-process-blueprint.md](views/13-process-blueprint.md) §5.3 |
| `INFORMATION_ENTITY` | view-defined | `process-blueprint` | — | (none — document-local; promotable) | [views/13-process-blueprint.md](views/13-process-blueprint.md) §5.3 |

### 4.1 Why these assignments

- **The strategy chain (`FACTOR` / `GOAL` / `CHANGE` / `ACTIVITY`) is `standalone`.** All four are referenced across documents (a `GOAL` appears in the Goals tree, FGCA, FGA, Activities, Scenarios, and Issues; a `FACTOR` in FGCA, FGA, and Scenarios), and [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §4 already mandates their catalogue uniqueness when cross-referenced. The flat FGCA/FGA/Goals/Activities documents remain the authoring surface (README "Form rule"); the catalogue file is the canonical record once an element is shared. Defining their element-file shape (§7.1–§7.4) is exactly what unblocks the elements-population that surfaced this task.
- **The stock business/application elements (`CAPABILITY` / `PROCESS` / `PRODUCT` / `APPLICATION` / `ROLE` / `ACTOR` / `RULE`) are `standalone`.** This matches the grain already in canon: the capability-map spec states it is "a view over Capability elements stored in `elements/02_business/`" ([views/05](views/05-capability-map.md) §1); the products and applications catalogues say their entries "reference a `PRODUCT-…` / `APPLICATION-…` element"; `RULE` already has a worked element file. `ROLE` (position) and `ACTOR` (identity — `person` / `business_unit` / `system`) are the active-structure pair settled by the 2026-05-29 Actors decision; `ACTOR` subsumes the former `UNIT` / `EMPLOYEE` TYPEs (§7.10–§7.11).
- **The motivation obligations (`CONSTRAINT` / `REQUIREMENT`) are `standalone`** — already shipped as element files (`CONSTRAINT-GDPR-RESIDENCY-1`, [elements/15](elements/15-requirement.md)).
- **`TARGET_STATE` is `standalone`, as the object the architect varies.** A target state is a structural snapshot — the selection of `CAPABILITY` / `PROCESS` / `APPLICATION` that exists when one or more `GOAL`s are met (ArchiMate **Plateau**). It is what an architect *varies* when offering solution options to the customer, so it must be a first-class addressable element, not an inline fragment of a scenario or a goal. Composition lists (`capabilities`, `processes`, `applications`) are inline; satisfaction of `GOAL`s is the M:N relation declared on epic [strategy#122](https://github.com/vkgeorgia/strategy/issues/122) and lands as a `REL` kind in a separate sub-task — never inline on this element.
- **`INTEGRATION` is promotable.** The applications spec ([views/10](views/10-applications.md)) currently nests integrations inside an application's `integrations[]`. v1 keeps that nested-in-view form as the definition home; the standalone `03_application/integrations/` schema (§7.8) is defined so an integration that needs its own lifecycle/cross-references can be promoted without renaming.
- **`SCENARIO` / `ISSUE` are `view-defined`.** [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §4 scopes `SCENARIO` to "within the organisation" via its scenarios document and `ISSUE` to "within the issues catalogue document." A scenario is itself a container/projection over other elements; an issue register is a document-scoped tree. Neither is materialised as a standalone catalogue element in v1.
- **`EQUIPMENT` / `INFORMATION_ENTITY` are `view-defined` (document-local).** [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §4 and [views/13](views/13-process-blueprint.md) §5.3 already state these are blueprint-scoped with no organisation-wide catalogue mandated in v1 — "the IDs already conform to the canonical grammar and can be promoted … without renaming." This document leaves that decision unchanged.

### 4.2 `view-defined` is inline-content convenience, never a content home of last resort

Per the reconstruction invariant (§1.1), `view-defined` in the table above is a convenience — a *content* element authored inline inside a view document instead of in its own catalogue file — and it does not license a view to be the **only** home of canonical content. Two distinctions follow:

- **Content vs presentation config.** The element TYPEs in §4 are content (an `EQUIPMENT`, an `INFORMATION_ENTITY` — real things the organisation has). A view document *also* carries presentation configuration — which elements it shows, grouping, filtering, ordering, display options. That configuration is the view's own primary data, is not an element TYPE, and legitimately and permanently lives in the view (out of scope of this element table by construction). The rule: content is promotable to canon; presentation config stays in the view.
- **`view-defined` content must be promotable.** `EQUIPMENT` / `INFORMATION_ENTITY` already are (§4.1) — inline today, with canonical-grammar IDs ready for promotion. The remaining non-promotable `view-defined` rows (`SCENARIO`, `ISSUE`) sit in tension with §1.1: a register of issues and an alternative-path scenario are content, not presentation. Reconciling each into a content element plus a report-configuration view is filed separately and is out of scope here.

---

## 5. Reconciliation with the legacy `.templates/elements/*` shape

The four templates under `organizations/acme_corp/.templates/elements/*_template.yaml` predate [`CONTRACT.md`](CONTRACT.md) and [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md). They use ArchiMate-style type names (`Goal`, `BusinessRole`, `ApplicationComponent`), zero-padded non-canonical IDs (`GOAL-XXX-001`), and a `metadata{…}` / `properties{…}` wrapper. The published canon worked examples (`CONSTRAINT-GDPR-RESIDENCY-1`, `RULE-DUAL-APPROVAL-1`, `REQUIREMENT-DATA-ERASURE-1`, `CAPABILITY-V1`) use the flat, contract-aligned envelope of §3. The canonical envelope follows the **worked examples**; the templates are stale. The mapping:

| Legacy template field | Canonical envelope (§3) | Disposition |
|---|---|---|
| `id: "GOAL-XXX-001"` | `id: GOAL-…` per [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) (no zero-padding, numeric terminal) | **Changed** — ID grammar is now canonical. |
| `type: "Goal"` / `"BusinessRole"` (ArchiMate class) | `notation: goal` + `type:` for the *subtype* only | **Changed** — element TYPE moves to `notation:` + ID prefix; `type:` is reserved for subtype. |
| `layer: "Motivation"` | `layer: motivation` (lowercase, optional, folder-derived) | **Kept, demoted** — optional, derived from folder (§6). |
| `metadata.status` | top-level `status` (optional) | **Flattened.** |
| `metadata.owner` | `owner_role: ROLE-…` (typed reference) | **Replaced** — typed role reference, not a free-text handle. |
| `metadata.created_at` / `metadata.updated_at` | `admitted_at` ([CONTRACT.md](CONTRACT.md) §6) + git history; `valid_from`/`valid_to` for temporal validity | **Replaced** — admission record + lifecycle + git supersede authoring timestamps. |
| `metadata.tags` | top-level `tags` (optional) | **Flattened.** |
| `properties.{…}` wrapper | per-TYPE fields at the top level (§7) | **Flattened** — no `properties:` wrapper; matches all canon worked examples. |
| `references.{…}` wrapper | per-TYPE cross-reference fields at the top level (plural → array, singular → single — [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §5) | **Flattened.** |
| *(absent)* | `zone` / `admitted_at` / `admitted_by` / `gate_checks` ([CONTRACT.md](CONTRACT.md) §6) | **Added** — admission record now required. |
| *(absent)* | `valid_from` / `valid_to` ([CONTRACT.md](CONTRACT.md) §7) | **Added** — primitive lifecycle now required. |

**Template reconciliation is a noted follow-up** (per the issue's acceptance criteria, which permits "or a follow-up noted"). Rewriting the four templates to the flat envelope — correct canonical IDs, `notation:` headers, admission + lifecycle blocks, dropped `metadata`/`properties` wrappers, and one template per element TYPE rather than per ArchiMate layer — touches `organizations/acme_corp/` and is a distinct concern from this schema definition. It is filed as follow-up **F-1** (§10) and kept out of this PR to honour the one-commit-one-concern rule.

---

## 6. Layer and folder placement

A `standalone` element lives at:

```
canon/elements/<NN>_<layer>/<plural-type>/<ID>.yaml
```

`<NN>_<layer>` is the numbered layer folder; `<plural-type>` is the lowercased plural of the element TYPE. The folder is **authoritative** for the element's layer — the optional `layer:` field (§3) must agree with it (`ELEM-003`).

| `NN_layer` folder | ArchiMate layer | Element TYPEs placed here |
|---|---|---|
| `01_motivation/` | Motivation | `FACTOR` (`factors/`), `GOAL` (`goals/`), `CONSTRAINT` (`constraints/`), `REQUIREMENT` (`requirements/`), `STAKEHOLDER` (`stakeholders/`) |
| `02_business/` | Business | `CAPABILITY` (`capabilities/`), `PROCESS` (`processes/`), `PRODUCT` (`products/`), `ROLE` (`roles/`), `ACTOR` (`actors/`), `RULE` (`rules/`) |
| `03_application/` | Application | `APPLICATION` (`applications/`), `INTEGRATION` (`integrations/`, when promoted) |
| `04_technology/` | Technology | *(no registry element TYPE in §3.1 yet; the layer folder exists for templates / future TYPEs)* |
| `05_implementation/` | Implementation & Migration | `ACTIVITY` (`activities/`), `CHANGE` (`changes/`), `TARGET_STATE` (`target-states/`), `MILESTONE` (`milestones/` — see 6.2) |

### 6.1 New layer — `05_implementation`

This document **adds an `05_implementation/` layer**, the ArchiMate 3.2 *Implementation & Migration* layer, settling the open "`changes` / `activities` → ?" placement in the task (ratified by canon 2026-05-29). Rationale:

- An `ACTIVITY` ("initiative / workstream") is an ArchiMate **Work Package** — a unit of transformation work, not a steady-state business element. A `CHANGE` (the BDN change layer) is a **Gap** — a required delta to reach the target state. Both belong to the *execution* half of the strategy chain, distinct from the *intent* half (`FACTOR` / `GOAL`) in `01_motivation` and from the *steady-state* business elements (`CAPABILITY` / `PROCESS` / `ROLE` / …) in `02_business`.
- Placing them in `02_business` would conflate "what the organisation is and does" with "the programme that changes it." A dedicated Implementation & Migration layer keeps the BDN execution layers together and ArchiMate-aligned, and matches the existing numbered-layer convention (`01_motivation` … `04_technology`). (The rejected alternative was to fold both into `02_business`.)

**ArchiMate 5 → Transitrix 4.** The Transitrix model collapses ArchiMate's five Implementation & Migration concepts into four TYPEs: **ACTIVITY** covers *Work Package + Deliverable*; **CHANGE** covers *Gap*; **TARGET_STATE** covers *Plateau* (§7.17 — the structural end-state an architect varies when offering solution options); **MILESTONE** covers *Implementation Event*. `DELIVERABLE` is the one ArchiMate concept that remains absorbed (into `ACTIVITY`); its folder stays reserved should it ever need to be split out as a first-class TYPE.

Both `ACTIVITY` and `CHANGE` are **recursive / multi-scale**: a strategic initiative aggregates programmes → projects → tasks (all one `ACTIVITY` TYPE), and a capability-level `CHANGE` decomposes into process-level and step-level `CHANGE`s — in both cases via a `parent` relation between same-TYPE elements (see §7.3, §7.4). This matches the DSM model.

### 6.2 `MILESTONE` placement note

`MILESTONE` (= Implementation Event) belongs to this layer conceptually and the `05_implementation/milestones/` folder is reserved for it here. Its registration in [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §3.1 currently scopes it to an Activity Card document ([views/18-activity-card.md](views/18-activity-card.md)); whether and how it is also materialised as a standalone element file is **owned by the MILESTONE TYPE task**, not decided by this document. This appendix reserves the folder and the layer assignment; it does not register a standalone MILESTONE schema (no MILESTONE row in §4 or §7).

---

## 7. Per-TYPE field schemas

Each subsection lists the per-TYPE fields that sit between the identity block and the admission record in the §3 envelope. Cross-reference fields follow [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §5 (plural field → array of typed IDs; singular field → one typed ID). Where a view spec already defines the inline shape, that spec is cited and is authoritative for field meanings; this document fixes the standalone-file form.

### 7.1 `FACTOR` — `01_motivation/factors/`

| Field | Required | Type | Semantics |
|---|---|---|---|
| `type` | no | string | `external` \| `internal`. |
| `description` | recommended | string | One-paragraph elaboration of the driver. |
| `references_constraint` | no | list | `CONSTRAINT-…` IDs the factor reflects. |

Inline shape: [views/02-fgca.md](views/02-fgca.md) §5.2.

### 7.2 `GOAL` — `01_motivation/goals/`

| Field | Required | Type | Semantics |
|---|---|---|---|
| `type` | no | string | A goal-type label (e.g. `Strategy`, `Strategic Goal`, `Project Goal`) — drawn from the Goals-tree `goal_types[]` vocabulary ([views/04-goals.md](views/04-goals.md)). |
| `level` | no | integer | Hierarchical level (Goals tree); ≥ 0. |
| `factors` | no | list | `FACTOR-…` IDs driving this goal. |
| `description` | recommended | string | One-paragraph elaboration. |
| `link` | no | string | URL to supplementary documentation. |

**Time-aware:** the goal `parent` (`GOAL → GOAL`) is declared first-class time-aware — it lives in a `REL-…` file with `type: goal_parent` ([elements/17-relations.md](elements/17-relations.md) §3), not as an inline `parent` field. Inline `parent` is v0.x transitional. Inline shape: [views/04-goals.md](views/04-goals.md), [views/02-fgca.md](views/02-fgca.md) §5.3.

### 7.3 `CHANGE` — `05_implementation/changes/`

A `CHANGE` is an ArchiMate **Gap**: a required delta to reach the target state, at any granularity — capability-level, process-level, or step-level. Higher-level changes decompose into lower-level changes via a `parent` relation between `CHANGE`s (multi-scale, §6.1).

| Field | Required | Type | Semantics |
|---|---|---|---|
| `goals` | no | list | `GOAL-…` IDs this change delivers. |
| `parent` | no | string | `CHANGE-…` — the higher-scale change this one decomposes from (capability → process → step). |
| `description` | recommended | string | One-paragraph elaboration of the transformation. |

Inline shape: [views/02-fgca.md](views/02-fgca.md) §5.4. (No subtype vocabulary — `type` omitted.)

### 7.4 `ACTIVITY` — `05_implementation/activities/`

| Field | Required | Type | Semantics |
|---|---|---|---|
| `duration` | no | number | Duration in time units (required for CPM; recommended for Gantt). |
| `activity_type` | no | string | Reference to an activity-type element. |
| `goals` | no | list | `GOAL-…` IDs the activity serves. **Time-aware** — first-class via `REL` `type: activity_goal` ([elements/17](elements/17-relations.md) §3); inline `goals` is v0.x transitional. |
| `delivers_changes` | no | list | `CHANGE-…` IDs (BDN linkage). |
| `predecessors` | no | list | `ACTIVITY-…` IDs that must complete first. **Stays inline/timeless.** |
| `parent` | no | string | `ACTIVITY-…` — the aggregating work package (recursive: initiative → programme → project → task, all one TYPE; §6.1). Subsumes WBS grouping. |
| `scenario` | no | string | `SCENARIO-…` this activity belongs to. |
| `owner` | no | string | `ACTOR-…` responsible for the activity. Replaces the old parallel `owner`(free-text) / `unit` / `employee` fields, collapsed into one typed reference by the 2026-05-29 Actors decision. |
| `start_date` / `end_date` | no | string | Planned dates — quoted ISO 8601 ([CONTRACT.md](CONTRACT.md) §4). |
| `labor_cost` / `resources_cost` / `effort` | no | number | Cost / effort signals. |
| `score` / `sort` | no | integer | Prioritisation / display ordering. |
| `tags` | no | list | Free-text tags. |
| `link` | no | string | URL. |
| `description` | recommended | string | Multi-line description. |

Inline shape: [views/07-activities.md](views/07-activities.md) §5.2, [views/02-fgca.md](views/02-fgca.md) §5.5. (No subtype vocabulary on `type`; `activity_type` carries the classifier instead.)

### 7.5 `PROCESS` — `02_business/processes/`

The `PROCESS` element is the **complete, self-sufficient definition** of a business process. It carries not only the catalogue metadata but the process *behaviour* — the participants and the flow — so the process can be reconstructed without any view. A BPMN diagram is a **projection** of this element, not its definition home (the reconstruction invariant, §1.1; render contract in [views/01-bpmn.md](views/01-bpmn.md)).

| Field | Required | Type | Semantics |
|---|---|---|---|
| `owner_role` | no | string | `ROLE-…` accountable for the process as a whole. |
| `capability` | no | string | `CAPABILITY-…` this process realises. |
| `maturity` | no | integer | CMM level 1–5. |
| `participants` | no | list | The process's lanes — each a reference to a canonical active-structure element, `ROLE-…` or `ACTOR-…` (person / business_unit / system). A participant's lane caption is **derived** from the referenced element's `name`; no caption text is stored here. List order is the rendered top-to-bottom lane order. |
| `flow` | no | object | The canonical process graph — steps, gateways, and sequence flows (see below). Sufficient to regenerate a BPMN diagram; the view adds only layout, which is computed deterministically. |
| `description` | recommended | string | One-paragraph elaboration. |

The former `bpmn_file` pointer ("path to the detailed BPMN diagram") is **removed as a source field**. The flow is no longer authored in a separate `.bpmn` file the element points at; any `.bpmn.transitrix.yaml` is a *derived projection* of `flow` (generated output), never the source — see [views/01-bpmn.md](views/01-bpmn.md).

**`flow` shape.** `flow` reuses the structural vocabulary defined once in [views/01-bpmn.md](views/01-bpmn.md) — the seven element types (`startEvent` / `endEvent` / `task` / `userTask` / `serviceTask` / `exclusiveGateway` / `parallelGateway`) and named sequence flows — but homed here as canon, not in a view. It follows the canon-wide flat-array-with-references form rule ([README](README.md) "Form rule"): a flat `steps` list, with lane membership expressed by reference rather than by nesting.

- `flow.steps` — list of nodes. Each step: `id`, `type` (one of the seven), `name` (required for tasks / gateways; optional for events), `performed_by` (a member of `participants` — `ROLE-…` or `ACTOR-…`), and optional `supported_by_application` (`APPLICATION-…`). Precedence and the "swimlane is a participant" default follow [views/01-bpmn.md](views/01-bpmn.md) §7.2; the BPMN projection derives lane grouping from `performed_by`.
- `flow.sequence` — list of `{ from, to, condition?, default? }` sequence flows between step IDs (projects to the BPMN `flows` array).

Step IDs use the canonical ID grammar ([IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §1), not the file-local BPMN labels of §3.3, so a step is **addressable**: a step-level `CHANGE` (§7.3, §6.1), a `RULE.applies_to`, or an `ACTIVITY` realising a step can reference it. Steps are canonical **by containment** — the PROCESS element carries the single admission record and lifecycle (§1, inline-element rule); a step is **promoted** to its own record only if a second document references it (§1 promotion rule). The file-local-label convention of [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §3.3 now applies only to a standalone `.bpmn` projection, not to a `flow` authored inside canon.

Inline shape (as referenced from the map): [views/06-process-map.md](views/06-process-map.md) §5. The process-map view references `PROCESS-…` by `process_id`; the element file is the definition home.

### 7.6 `PRODUCT` — `02_business/products/`

| Field | Required | Type | Semantics |
|---|---|---|---|
| `type` | yes | string | `digital_product` \| `service` \| `platform` \| `bundle`. |
| `domain` | no | string | Business domain. |
| `owner_role` | no | string | `ROLE-…`. |
| `maturity` | no | integer | CMM level 1–5. |
| `capabilities` | no | list | `CAPABILITY-…` IDs. |
| `processes` | no | list | `PROCESS-…` IDs. |
| `supporting_apps` | no | list | `APPLICATION-…` IDs. |
| `description` | recommended | string | Short product description. |

Inline shape (catalogue entry): [views/09-products.md](views/09-products.md) §5.

### 7.7 `APPLICATION` — `03_application/applications/`

| Field | Required | Type | Semantics |
|---|---|---|---|
| `type` | yes | string | `application` \| `integration` \| `platform` \| `data_store`. |
| `domain` | no | string | Business domain. |
| `capabilities` | no | list | `CAPABILITY-…` IDs supported. |
| `products` | no | list | `PRODUCT-…` IDs supported. |
| `description` | recommended | string | Short description. |
| `owner_role` | no | string | `ROLE-…`. **Time-varying** — sidecar ([CONTRACT.md](CONTRACT.md) §9), not inline. |
| `vendor` | no | string | **Time-varying** — sidecar. |
| `lifecycle_stage` | no | string | `planned` / `active` / `sunset`. **Time-varying** — sidecar. |
| `maturity` | no | integer | CMM level 1–5. **Time-varying** — sidecar. |

Inline shape (catalogue entry): [views/10-applications.md](views/10-applications.md) §5. The catalogue's operational `status` and the time-varying fields above follow [CONTRACT.md](CONTRACT.md) §9.

### 7.8 `INTEGRATION` — `03_application/integrations/` (promotable; nested-in-view in v1)

In v1 an integration is a nested entry under its source application's `integrations[]` ([views/10-applications.md](views/10-applications.md) §5), sharing the application's lifecycle. The standalone form, for promotion:

| Field | Required | Type | Semantics |
|---|---|---|---|
| `source` | yes | string | Source `APPLICATION-…`. |
| `target` | yes | string | Target `APPLICATION-…`. |
| `direction` | no | string | `inbound` \| `outbound` \| `bidirectional`. |
| `protocol` | no | string | Integration protocol (REST, Kafka, gRPC, …). |
| `description` | recommended | string | One-paragraph elaboration. |

### 7.9 `ROLE` — `02_business/roles/`

`ROLE` is a **position / responsibility** — distinct from the `ACTOR` (§7.10) that fills it (ArchiMate Business Role vs Business Actor).

| Field | Required | Type | Semantics |
|---|---|---|---|
| `description` | recommended | string | What the role is accountable for. |
| `unit` | no | string | `ACTOR-…` of `type: business_unit` the role sits in (was `UNIT-…` before the 2026-05-29 Actors decision). |
| `responsibility_area` | no | string | Domain / function area. |

### 7.10 `ACTOR` — `02_business/actors/`

The active-structure identity primitive — *who or what exists and performs work* (ArchiMate Business Actor). A single TYPE with a `type` discriminator unifies the old `owner` / `unit` / `employee` ownership fields. Decided 2026-05-29 (strategy proposal): `ACTOR` is the identity; engagement (employment, candidacy, …) and stakes are separate `REL` records that point at it, never inline.

| Field | Required | Type | Semantics |
|---|---|---|---|
| `type` | yes | string | `person` \| `business_unit` \| `system` — the identity discriminator. |
| `description` | recommended | string | Who / what this actor is. |
| `contact` | no | string | Contact handle (for `person` / `business_unit`). |
| `external_ref` | no | string | External identifier or URL — e.g. a `system`'s integration endpoint, or an external organisation's reference. |

- **Identity only.** A `person` actor is *who someone is*, independent of engagement. Employment, candidacy, alumni status, community membership, and contracting are **first-class time-aware `REL` records** ([elements/17-relations.md](elements/17-relations.md) §3), not fields here — a person can exist in the org's scope (candidate, alumnus, contractor, community member) without being an employee.
- **Org hierarchy.** A `business_unit` actor's parent unit is a time-aware `REL` of `type: unit_parent` (`ACTOR(business_unit) → ACTOR(business_unit)`), not an inline field.
- **Role assignment.** Which `ROLE` an actor fills is carried on the relevant engagement `REL` (e.g. `employment` carries role assignments), not inline on the actor.

> **Note:** `person` actors name real people; adopters apply their own data-protection rules (and the worked-example org redacts real names). See [CONTRACT.md](CONTRACT.md) §5 on the trust contract of canon.

### 7.11 Removed TYPEs — `UNIT`, `EMPLOYEE`

`UNIT` and `EMPLOYEE` were registered (schema-only) on 2026-05-29 and **removed the same day** by the Actors decision, before any primitives were populated:

- `UNIT` → `ACTOR` with `type: business_unit`.
- `EMPLOYEE` → `ACTOR` with `type: person` **plus** an `employment` `REL` (the employment relationship, with its dates and role assignments). The split keeps identity (the person) separate from engagement (the employment).

The deprecation + mapping is recorded in the `0.5 → 0.6` migration recipe for any adopter who populated these between registration and the next cut.

### 7.12 `RULE` — `02_business/rules/`

Already shipped (worked example `RULE-DUAL-APPROVAL-1`).

| Field | Required | Type | Semantics |
|---|---|---|---|
| `statement` | yes | string | The normative sentence (used in place of `description`). |
| `applies_to` | no | list | Typed IDs (`PROCESS-…`, `APPLICATION-…`, …) the rule governs. |
| `source` | no | string | Citation of the authority behind the rule. |
| `owner_role` | no | string | `ROLE-…`. |
| `severity` | no | string | e.g. `mandatory`. |
| `rationale` | no | string | Why the rule exists. |

### 7.13 `CONSTRAINT` — `01_motivation/constraints/`

Already shipped (worked example `CONSTRAINT-GDPR-RESIDENCY-1`). Same field set as `RULE` (§7.12) — `statement`, `applies_to`, `source`, `owner_role`, `severity`, `rationale` — distinguished from `RULE` by layer (motivation vs business) and from `REQUIREMENT` by the form of the obligation ([elements/15-requirement.md](elements/15-requirement.md) §1: CONSTRAINT = restriction, REQUIREMENT = positive obligation).

### 7.14 View-defined TYPEs (no standalone schema in v1)

`SCENARIO`, `ISSUE`, `EQUIPMENT`, `INFORMATION_ENTITY` have no standalone element-file schema. Their per-element fields are owned by their view specs: [views/11-scenarios.md](views/11-scenarios.md), [views/12-issues.md](views/12-issues.md), [views/13-process-blueprint.md](views/13-process-blueprint.md) §5.3. Each inline entry carries its own `valid_from` / `valid_to` per [CONTRACT.md](CONTRACT.md) §7.1.

### 7.15 `STAKEHOLDER` — `01_motivation/stakeholders/`

Motivation-layer interest primitive — the stake profile, with identity referenced from an `ACTOR`. Full spec: [elements/20-stakeholders.md](elements/20-stakeholders.md).

| Field | Required | Type | Semantics |
|---|---|---|---|
| `type` | yes | string | `internal` \| `external`. |
| `actor` | **yes** | string | `ACTOR-…` whose identity this stake attaches to — identity never lives on the stakeholder. |
| `concern` | recommended | string | What the stakeholder cares about. |
| `interest` | no | string | `high` \| `medium` \| `low`. |
| `influence` | no | string | `high` \| `medium` \| `low`. |
| `description` | no | string | Free-text elaboration. |

Stake in a specific `GOAL` / `ACTIVITY` / `CAPABILITY` is a `stakeholding` relation ([elements/17-relations.md](elements/17-relations.md) §3), not an inline field.

### 7.17 `TARGET_STATE` — `05_implementation/target-states/`

Implementation-layer end-state primitive — an ArchiMate **Plateau**. A target state is the structural snapshot of the `CAPABILITY` / `PROCESS` / `APPLICATION` selection that exists when one or more `GOAL`s are met. It is what an architect *varies* when offering the customer solution options — making it a first-class addressable element, not an inline fragment of a goal or a scenario. The path from today's state to a target state is a `SCENARIO`; the goals a target state satisfies are carried as a separate `REL` kind (epic [strategy#122](https://github.com/vkgeorgia/strategy/issues/122), TargetState↔Goal sub-task), never inline here.

| Field | Required | Type | Semantics |
|---|---|---|---|
| `capabilities` | no | list | `CAPABILITY-…` IDs in the target-state composition (the V/H IDs of [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §2). |
| `processes` | no | list | `PROCESS-…` IDs in the composition. |
| `applications` | no | list | `APPLICATION-…` IDs in the composition. |
| `description` | recommended | string | One-paragraph elaboration — what *is true* about the organisation in this state. |
| `link` | no | string | URL to supplementary documentation. |

- **Composition lists are inline.** The target state *is* its composition; the lists name the structural primitives present in the state, not relationships that vary independently. They are timeless on the element file — the element's own `valid_from` / `valid_to` (§3 envelope) carry the lifecycle of the state as a whole.
- **Goal satisfaction is a `REL`, not an inline field.** The `TARGET_STATE → GOAL` satisfaction relation is M:N and lands as a first-class time-aware `REL` kind on a separate sub-task of epic [strategy#122](https://github.com/vkgeorgia/strategy/issues/122). Do not add a `goals:` field to this element.
- **Scenarios point at target states, not the other way around.** A `SCENARIO` is a *path* — the change sequence that reaches a target state. The `target_state` reference lives on the scenario per the SCENARIO reclassification sub-task; this element carries no `scenarios:` back-reference.

No subtype vocabulary on `type`. (`base` / `intermediate` / `final` is one classification an organisation might use; v1 leaves it open.) The composition lists are the only required content for a target state to be useful — name + composition is enough to render it as a structural snapshot.

There is no dedicated view spec in v1 — a target state is a *content element*, rendered as part of a Scenarios view (a path landing on it) and referenced as a composition fragment from any structural view that wants to scope itself to one state.

---

## 8. Alignment with the ID grammar and TYPE registry

- **ID grammar.** Every element file's `id` follows [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §1 — `<TYPE>-[<middle>-]<INTEGER>`, no leading zeros, numeric terminal, uppercase TYPE. `CAPABILITY` uses the V/H sub-grammar (§2). The file is named exactly `<ID>.yaml`.
- **TYPE prefix = registry TYPE.** The ID prefix and the `notation:` value are the element's registry TYPE from [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §3.1; abbreviations (`ACT`, `CHG`, `FAC`, `CAP`, `SCN`) are deprecated (§6 migration checklist).
- **Cross-references.** Every cross-reference field resolves to a defined element of the correct TYPE; plural field → array, singular → single ([`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §5). A wrong-TYPE prefix is an error.
- **Uniqueness scope.** Per [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §4 — `standalone` TYPEs are unique within their `canon/elements/<layer>/` catalogue; `view-defined` TYPEs are unique within their defining document.

---

## 9. Validation rules

Element-primitive-specific rules. The shared header (`HDR-001..004`, [CONTRACT.md](CONTRACT.md) §2), lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](CONTRACT.md) §7.3), and sidecar (`VERSIONED-001..005`, [CONTRACT.md](CONTRACT.md) §9.3) rules apply to element files in addition to these.

| Rule | Severity | Description |
|---|---|---|
| `ELEM-001` | error | `id` is missing or does not match the canonical grammar for the file's TYPE ([IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §1/§2), or a required envelope field (§3: `notation`, `name`, `zone`, `admitted_at`, `admitted_by`, `gate_checks`, `valid_from`, `valid_to`) is missing. |
| `ELEM-002` | error | The element's `type` (subtype) value is outside the controlled vocabulary §7 defines for its TYPE, or a required `type` (PRODUCT, APPLICATION) is missing. |
| `ELEM-003` | error | A `standalone` element file's folder placement does not match its TYPE's mandated `canon/elements/<NN>_<layer>/<plural-type>/` (§4, §6), or a present `layer:` field disagrees with the folder. |
| `ELEM-004` | error | A `view-defined` TYPE (`SCENARIO`, `ISSUE`, `EQUIPMENT`, `INFORMATION_ENTITY`) appears as a standalone file under `canon/elements/`. In v1 these have no standalone element-file schema (§4). |
| `ELEM-005` | warning | A `standalone` element carries inline a field declared `time_varying` (§7) or a cross-reference of a kind declared first-class time-aware ([elements/17](elements/17-relations.md)) — it belongs in the sidecar (`VERSIONED-004`) or a `REL-…` file (`REL-004`) respectively. Surfaced here for discoverability; the authoritative codes are `VERSIONED-004` / `REL-004`. |

---

## 10. Migration and follow-ups

Backfill for existing canon files and downstream tasks. Each is a **separate PR** (one concern per commit).

- **F-1 — reconcile `.templates/elements/*_template.yaml`** to the §3 envelope: canonical IDs, `notation:` headers, admission + lifecycle blocks, `type:` for subtype only, dropped `metadata`/`properties` wrappers, one template per element TYPE (or one annotated template per layer). Touches `organizations/acme_corp/`. (§5.)
- **F-2 — backfill `notation:` + `type:`-as-subtype on the `CONSTRAINT` / `RULE` worked examples.** `CONSTRAINT-GDPR-RESIDENCY-1` and `RULE-DUAL-APPROVAL-1` currently carry `type: constraint` / `type: rule` (TYPE repeated) and no `notation:` header — they pre-date the header contract. Add `notation: constraint` / `notation: rule` and drop or re-purpose `type:`. (§3, §7.12–7.13.)
- **F-3 — migrate REQUIREMENT `title` → `name`.** Decided: `name` is the single canonical label field, no aliases (§3). [elements/15-requirement.md](elements/15-requirement.md) and the worked-example requirement files migrate via a trivial codemod (`s/^title:/name:/` over `canon/elements/01_motivation/requirements/*.yaml`, plus the field row in the spec). The transform lands in a methodology migration recipe (0.5 → 0.6, or pulled forward into 0.4 → 0.5 if that recipe is still open before tag).
- **F-4 — acme_corp worked examples** for the newly-schema'd TYPEs (`FACTOR`, `GOAL`, `CHANGE`, `ACTIVITY`, `PROCESS`, `PRODUCT`, `APPLICATION`, `ROLE`) plus per-folder READMEs, created alongside the elements-population wave that surfaced this task. (`ACTOR` examples ship with the Actors notation.)
- **F-5 — declare `time_varying` fields per notation** (capability `current_maturity`/`owner_role`/`target_date`; application `lifecycle_stage`/`vendor`/`owner_role`/`maturity`) in the respective specs, completing the [CONTRACT.md](CONTRACT.md) §9.4 candidate list.

---

## 11. References

- ID grammar, TYPE registry, uniqueness scope, cross-references: [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md).
- Shared header, zone model, admission record, primitive lifecycle, versioned-attribute sidecar: [`CONTRACT.md`](CONTRACT.md) §1–2, §5–7, §9.
- Element notations (specialised instances of this envelope): [`elements/14-codex.md`](elements/14-codex.md), [`elements/15-requirement.md`](elements/15-requirement.md), [`elements/16-assertion.md`](elements/16-assertion.md), [`elements/17-relations.md`](elements/17-relations.md).
- Capability element fields: [`views/05-capability-map.md`](views/05-capability-map.md) §13. Strategy-chain inline shapes: [`views/02-fgca.md`](views/02-fgca.md), [`views/03-fga.md`](views/03-fga.md), [`views/04-goals.md`](views/04-goals.md), [`views/07-activities.md`](views/07-activities.md).
- Notation catalogue and the views/elements split: [`README.md`](README.md).
