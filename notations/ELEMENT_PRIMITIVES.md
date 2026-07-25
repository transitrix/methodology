# Element primitives — canonical file schema

This appendix defines the **element-primitive file schema**: what a standalone canon-zone element file looks like, which element TYPEs get one, where each lives on disk, and how the per-TYPE field sets are defined. It is the cross-cutting companion to the view specs (`notations/views/`), the element notations (`notations/elements/`), the ID grammar ([`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md)), and the shared contracts ([`CONTRACT.md`](CONTRACT.md)).

Recorded 2026-05-29 as the canonical decision for the methodology. Status: **documented** — the three decisions this document carries (standalone-vs-view-only mode assignment §4, the new `05_implementation` layer §6, and `name` as the single label field §3) were ratified by canon on 2026-05-29.

A view spec describes a *render-able artefact* (a diagram, a catalogue, a tree). An **element primitive** is the *thing* a view arranges and points at — a Driver, a Goal, a Capability, an Application. The same primitive can be referenced from many views; the view is a projection, the primitive is the record. This document defines the record.

---

## 1. The two materialisation modes

Every element TYPE in the registry ([`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §3.1) resolves to exactly one of two **materialisation modes**. The mode answers issue-question 1 ("standalone vs view-only") for that TYPE.

| Mode | Where the element is *defined* (its definition home) | Carries |
|---|---|---|
| **`standalone`** | One YAML file per element under `canon/elements/<NN>_<layer>/<plural-type>/<ID>.yaml`. The element file is the authoritative record; views reference it by ID. | The full envelope of §3 — header + identity + admission record ([CONTRACT.md](CONTRACT.md) §6) + primitive lifecycle ([CONTRACT.md](CONTRACT.md) §7). |
| **`view-defined`** | Inline inside a view document (`*.<short>.transitrix.yaml`). There is no separate element file; the view document is the definition home. | The element's own inline fields plus its own `valid_from` / `valid_to` per [CONTRACT.md](CONTRACT.md) §7.1. The document — not each entry — carries the single admission record. |

**The promotion rule (already canon).** [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §4 already states that the strategy-chain TYPEs (`DRIVER`, `GOAL`, `CHANGE`, `ACTIVITY`) are unique "within the DGCA / FGA / Goals / Action schedule document that defines them" **and**, "when referenced from across documents, … also be unique within the organisation's element catalogue." This document formalises that clause: a `standalone` TYPE has a defined element-file schema (§7) so that any element of that TYPE *can* be materialised in the catalogue. A view document remains a valid authoring surface; when an element is shared across documents it is **promoted** to its standalone catalogue file (its definition home), and the views reference it by ID rather than re-defining it.

A `standalone` mode therefore does not forbid inline authoring inside a single view — it fixes *where the canonical record lives once the element is shared*, and guarantees the element file shape is defined so promotion is mechanical, not a redesign. This is what unblocks the elements-population work that surfaced this task (`DRIVER` / `CHANGE` / `ACTIVITY` had no element-file shape to promote into).

**Promotion trigger — when (and only when) referenced from another document.** Canon ratified `standalone`-with-promotion over an always-standalone alternative on the grounds that the flat DGCA / FGA / Goals / Action schedule documents are *narrative artefacts*, not catalogue layouts: fragmenting a DGCA document into per-element files from day one would harm the very authoring ergonomics those notations exist for. So an element stays inline in its authoring document until a *second* document references it; at that point it is promoted to its catalogue file and both documents reference it by ID. The supporting tool work — detecting a cross-document reference, enforcing promotion at that point, and flagging an inline reference that should already have been promoted — is a validator / codemod concern tracked separately (it does not change the file schema this document defines).

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
      factors/        DRIVER-*.yaml
      goals/          GOAL-*.yaml
      constraints/    CONSTRAINT-*.yaml      # worked-example precedent
      requirements/   REQUIREMENT-*.yaml     # elements/15-requirement.md
      stakeholders/   STAKEHOLDER-*.yaml     # elements/20-stakeholders.md (actor: REQUIRED)
      assessments/    ASSESSMENT-*.yaml      # §7.16 (assesses: one DRIVER; no polarity)
      hazards/        HAZARD-*.yaml          # elements/28-hazard-risk-control.md (ISO 14971)
      risk-controls/  RISK_CONTROL-*.yaml    # elements/28-hazard-risk-control.md (mitigates HAZARD, satisfies REQUIREMENT)
    02_business/
      capabilities/   CAPABILITY-*.yaml      # views/05-capability-map.md §13
      processes/      PROCESS-*.yaml
      steps/          STEP-*.yaml            # §7.20 — promoted process-flow steps (canonical-by-containment in a PROCESS)
      products/       PRODUCT-*.yaml
      roles/          ROLE-*.yaml
      actors/         ACTOR-*.yaml           # elements/19-actors.md (person | business_unit | system)
      locations/      LOCATION-*.yaml         # elements/21-locations.md — physical/virtual places
      rules/          RULE-*.yaml             # worked-example precedent
      registries/     REGISTRY-*.yaml         # §7.19 — org-authored operating config; rows inline, promotable
    03_application/
      applications/   APPLICATION-*.yaml
      integrations/   INTEGRATION-*.yaml      # promotable; nested-in-view in v1 (§4)
    04_technology/
      equipment/    EQUIPMENT-*.yaml          # §7.14 — ADR 2026-06-08; Physical element
      nodes/        NODE-*.yaml               # §7.24 — elements/25-nodes.md
      services/     TECHNOLOGY_SERVICE-*.yaml # §7.25 — elements/26-technology-services.md
    05_implementation/                        # new layer, this document §6
      actions/        ACTION-*.yaml            # Work Package (recursive)
      changes/        CHANGE-*.yaml            # Gap (multi-scale)
      milestones/     MILESTONE-*.yaml         # Implementation Event — registration owned by the MILESTONE TYPE task; folder reserved here
      target-states/  TARGET_STATE-*.yaml      # Plateau (§7.17 — structural snapshot satisfying GOALs)
      # room reserved for DELIVERABLE if it ever becomes a first-class TYPE
  relations/          REL-*.yaml              # elements/17-relations.md (flat, not under elements/)
  assertions/         ASSERTION-*.yaml        # elements/16-assertion.md (flat, not under elements/)
  verifications/      VERIFICATION-*.yaml     # elements/27-verification.md (flat, not under elements/)
  views/              *.<short>.transitrix.yaml   # the render-able projections
```

- The **element notations** (`14-codex` / `15-requirement` / `16-assertion` / `17-relations` / `19-actors`) define specific element families with their own per-notation specs. This appendix is the *general* schema those specs specialise: REQUIREMENT (`elements/15`) and the capability element (`views/05` §13) are already-published instances of the `standalone` envelope below. Where an element notation spec exists, it remains authoritative for that TYPE's per-element fields; this document carries the cross-TYPE envelope and the placement/mode decisions, and gives the field set for the TYPEs that have no dedicated spec yet (`DRIVER`, `GOAL`, `CHANGE`, `ACTION`, `PROCESS`, `PRODUCT`, `APPLICATION`, `INTEGRATION`, `ROLE`, `CONSTRAINT`, `RULE`). `ACTOR` additionally has [elements/19-actors.md](elements/19-actors.md).
- `REL` (`canon/relations/`) and `ASSERTION` (`canon/assertions/`) are canon-zone primitives that deliberately sit **outside** the `elements/` tree (their specs say so); they carry the same admission + lifecycle envelope but are not layer-placed elements. They are out of scope for the §4 element table but listed here for completeness.
- `codex` artefacts (`LAW` / `REGULATION` / `POLICY` / `INTERNAL_STANDARD`) live in the `codex/` zone, not `canon/elements/`, and follow [`elements/14-codex.md`](elements/14-codex.md). They are not `canon` elements and are out of scope here.

---

## 3. The canonical envelope

Every `standalone` element file carries this envelope. Per-TYPE fields (§7) sit between the identity block and the admission record.

```yaml
notation: driver                  # required — element TYPE short name (lowercased TYPE)
id: DRIVER-CHURN-1                 # required — canonical ID (IDS_AND_REFERENCES.md §1/§2)
name: "Rising customer churn"      # required — human-readable label
aliases:                          # optional — non-authoritative also-known-as strings (see below)
  - "Churn rate increase"
former_ids:                        # optional — retired canonical IDs for migration bridging (see below)
  - "FACTOR-CHURN-1"
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
| `notation` | yes | string | The element TYPE's short name — the lowercased registry TYPE (`driver`, `goal`, `change`, `action`, `target-state`, `capability`, `process`, `product`, `application`, `integration`, `role`, `actor`, `location`, `business-service`, `rule`, `constraint`, `assessment`; `requirement` per [elements/15](elements/15-requirement.md); see §4 for the full list). Machine-readable type tag; redundant with the ID prefix but read by tooling that does not parse IDs. Drives `HDR-002`. |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §1 (and §2 for `CAPABILITY`). The prefix MUST be the element's registry TYPE. |
| `name` | yes | string | Human-readable label. **Canonical across every element TYPE — no TYPE-specific second authoritative label.** `name` is the sole canonical label; `aliases[]` (below) is a non-authoritative match-hint, not a second label. The §3 rule forbids a second *authoritative* label; `aliases[]` is non-authoritative and out of scope of that rule. [elements/15-requirement.md](elements/15-requirement.md) historically used `title` (inherited from IEEE/ISO requirements templates — stylistic, not functional); REQUIREMENT migrates `title` → `name` (follow-up F-3, §10). A richer naming structure (e.g. `short_title` + `long_description`) is a separate additive enhancement via *additional fields*, never a second authoritative label. |
| `aliases` | no | list of strings | Non-authoritative also-known-as surface forms — alternative labels by which the element is known (acronyms, legacy names, short forms, transliterations). Used by the ingest pipeline for cross-source entity matching: when a new source refers to an element by one of its aliases, `emit-candidates` **proposes** linking the mention to the existing element rather than minting a duplicate (F8). `name` stays the sole canonical label; `aliases[]` entries are never IDs, never rendered as the element’s identity, and never carry the element’s meaning — they are match-hints only. **Cross-catalogue uniqueness**: an alias must not collide with any other element’s `name` or alias — ambiguous aliases make entity resolution unreliable and are flagged at canon admission (`ELEM-ALIAS-001`, §9). **Placement**: aliases live inline on the element file alongside `name` (ADR Option A); there is no separate alias catalogue (Option B was rejected). Applies to all `standalone` TYPEs; which elements carry aliases in practice is an adopter decision. (Per the element-aliases architecture decision.) |
| `former_ids` | no | list of strings | Retired canonical IDs this element was previously known by — **migration bridging only**. When an element is renamed (TYPE-prefix change, e.g. `FACTOR-…` → `DRIVER-…`, or individual ID renumber), the old ID(s) are listed here so that existing REL `from:`/`to:` references continue to resolve without an immediate sweep of all relation files. The resolver checks `former_ids` entries as additional resolution targets when a literal `from`/`to` value does not match any live element `id` (cross-catalogue lookup, order: live `id` first, `former_ids` fallback). **Temporary**: entries MUST be removed once all referring relation files are updated in a dedicated sweep commit — `former_ids` is a bridge, not a permanent alias mechanism (two-phase pattern — [CONTRACT.md](CONTRACT.md) §7.4). **Uniqueness**: a `former_id` must not match any live element `id` or any other element’s `former_ids` entry (`ELEM-FORMER-ID-001`, §9). **Not rendered**: `former_ids` entries are invisible in all views and renders. |
| `type` | per-TYPE | string | Subtype value from the TYPE's controlled vocabulary (e.g. `external` / `internal` for DRIVER; `domain` / `supporting` for CAPABILITY). Required where §7 defines a subtype vocabulary; omitted where it does not. **`type` carries the *subtype*, never the element TYPE itself** — the element TYPE is carried by `notation` + the ID prefix. |
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

**Time-aware relations go to `canon/relations/`, not inline.** Where a relation kind is declared first-class time-aware ([elements/17-relations.md](elements/17-relations.md)), it lives in a `REL-…` file, not as an inline cross-reference on the element. In v1 most cross-references remain inline and timeless; §7 notes the declared first-class kinds (capability `parent`, goal `goal_parent`, action `action_goal`).

---

## 4. Materialisation decision per TYPE

The mode table. For each registry element TYPE: its mode (§1), its `notation` short name, its layer + folder (§6), and the spec that owns its per-element fields.

| TYPE | Mode | `notation` | Layer | Folder | Per-element fields owned by |
|---|---|---|---|---|---|
| `DRIVER` | standalone | `driver` | motivation | `01_motivation/factors/` | §7.1 (no dedicated spec) |
| `GOAL` | standalone | `goal` | motivation | `01_motivation/goals/` | §7.2 + [views/04-goals.md](views/04-goals.md) |
| `CONSTRAINT` | standalone | `constraint` | motivation | `01_motivation/constraints/` | §7.13 (worked-example precedent) |
| `REQUIREMENT` | standalone | `requirement` | motivation | `01_motivation/requirements/` | [elements/15-requirement.md](elements/15-requirement.md) |
| `STAKEHOLDER` | standalone | `stakeholder` | motivation | `01_motivation/stakeholders/` | §7.15 + [elements/20-stakeholders.md](elements/20-stakeholders.md) |
| `ASSESSMENT` | standalone | `assessment` | motivation | `01_motivation/assessments/` | §7.16 (no dedicated spec) |
| `CAPABILITY` | standalone | `capability` | business | `02_business/capabilities/` | [views/05-capability-map.md](views/05-capability-map.md) §13 |
| `PROCESS` | standalone | `process` | business | `02_business/processes/` | §7.5 + [views/06-process-map.md](views/06-process-map.md) |
| `STEP` | contained (in `PROCESS.flow`) → standalone (promotable) | `step` | business | `02_business/steps/` | §7.20 (inline shape: §7.5) |
| `PRODUCT` | standalone | `product` | business | `02_business/products/` | §7.6 + [views/09-products.md](views/09-products.md) |
| `ROLE` | standalone | `role` | business | `02_business/roles/` | §7.9 |
| `ACTOR` | standalone | `actor` | business | `02_business/actors/` | §7.10 + [elements/19-actors.md](elements/19-actors.md) |
| `LOCATION` | standalone | `location` | business | `02_business/locations/` | §7.22 + [elements/21-locations.md](elements/21-locations.md) |
| `BUSINESS_SERVICE` | standalone | `business-service` | business | `02_business/business-services/` | §7.23 + [elements/25-business-services.md](elements/25-business-services.md) |
| `RULE` | standalone | `rule` | business | `02_business/rules/` | §7.12 (worked-example precedent) |
| `REGISTRY` | standalone (rows inline, canonical-by-containment, promotable) | `registry` | business | `02_business/registries/` | §7.19 (no dedicated spec) |
| `APPLICATION` | standalone | `application` | application | `03_application/applications/` | §7.7 + [views/10-applications.md](views/10-applications.md) |
| `INTEGRATION` | view-defined → standalone (promotable) | `integration` | application | `03_application/integrations/` | §7.8 + [views/10-applications.md](views/10-applications.md) |
| `CHANGE` | standalone | `change` | implementation | `05_implementation/changes/` | §7.3 + [views/02-dgca.md](views/02-dgca.md) |
| `ACTION` | standalone | `action` | implementation | `05_implementation/actions/` | §7.4 + [elements/24-action.md](elements/24-action.md) |
| `TARGET_STATE` | standalone | `target-state` | implementation | `05_implementation/target-states/` | §7.17 (no dedicated spec) |
| `SCENARIO` | standalone | `scenario` | implementation | `05_implementation/scenarios/` | §7.18 (no dedicated spec) |
| `NODE` | standalone | `node` | technology | `04_technology/nodes/` | §7.24 + [elements/25-nodes.md](elements/25-nodes.md) |
| `TECHNOLOGY_SERVICE` | standalone | `technology-service` | technology | `04_technology/services/` | §7.25 + [elements/26-technology-services.md](elements/26-technology-services.md) |
| `EQUIPMENT` | view-defined | `process-blueprint` | — | (none — document-local; promotable) | [views/13-process-blueprint.md](views/13-process-blueprint.md) §5.3 |
| `INFORMATION_ENTITY` | view-defined | `process-blueprint` | — | (none — document-local; promotable) | [views/13-process-blueprint.md](views/13-process-blueprint.md) §5.3 |

### 4.1 Why these assignments

- **The strategy chain (`DRIVER` / `GOAL` / `CHANGE` / `ACTION`) is `standalone`.** All four are referenced across documents (a `GOAL` appears in the Goals tree, DGCA, FGA, Action schedule, Scenarios, and Issues; a `DRIVER` in DGCA, FGA, and Scenarios), and [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §4 mandates their catalogue uniqueness when cross-referenced. All five strategy-chain view notations — `02-dgca.md` ("No element data is authored inline"), `23-actions-tree.md` ("projection configuration, not an authoring surface"), `18-action-card.md` (explicit "View-purity" section), `04-goals.md` (pure projection, v2.0), and `07-action.md` (pure projection, v2.0) — are **pure projections over the standalone element catalogue**. Element data (name, description, goals, duration, predecessors, etc.) is authored exclusively in the standalone element files; the view documents carry only `view_config` (scope, display, schedule settings). Defining their element-file shape (§7.1–§7.4) is what enabled this complete view-purity migration.
- **The stock business/application elements (`CAPABILITY` / `PROCESS` / `PRODUCT` / `APPLICATION` / `ROLE` / `ACTOR` / `RULE`) are `standalone`.** This matches the grain already in canon: the capability-map spec states it is "a view over Capability elements stored in `elements/02_business/`" ([views/05](views/05-capability-map.md) §1); the products and applications catalogues say their entries "reference a `PRODUCT-…` / `APPLICATION-…` element"; `RULE` already has a worked element file. `ROLE` (position) and `ACTOR` (identity — `person` / `business_unit` / `system`) are the active-structure pair settled by the 2026-05-29 Actors decision; `ACTOR` subsumes the former `UNIT` / `EMPLOYEE` TYPEs (§7.10–§7.11).
- **`REGISTRY` is `standalone`, justified by ownership + lifecycle.** A registry is a curated, **org-authored** operating-configuration artefact — the list the organisation maintains to drive an operating activity (the worked example, §7.19: which regulatory sources to watch, where, how, how often). It is a maintained record with its own admission and lifecycle, referenced and re-versioned as a unit, so it is a first-class catalogue element, not an inline fragment. Its placement is settled by elimination: **not motivation** (it is operating config, not intent or a driver); **not codex** (codex is *given to* the organisation from outside — `LAW` / `REGULATION` / `POLICY` / `INTERNAL_STANDARD`; a registry is *authored by* the org to decide how it operates); **not Field** (Field is contradiction-tolerant evidence, a registry is curated and authoritative); **not a `RULE`** (a rule is decision logic, a registry is a maintained list); and **not the team `operations/` folder** (that holds the team's working artefacts, not model content). Its **rows are inline and canonical-by-containment** — each row carries a canonical-grammar ID and is promoted to its own registered standalone TYPE only when a second document references it (§1 promotion rule), exactly as a `PROCESS` flow step is (§7.5, [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §3.3). Its time-varying operating *state* is held out of the element entirely (§7.19, [CONTRACT.md](CONTRACT.md) §9.6).
- **The motivation obligations (`CONSTRAINT` / `REQUIREMENT`) are `standalone`** — already shipped as element files (`CONSTRAINT-GDPR-RESIDENCY-1`, [elements/15](elements/15-requirement.md)).
- **`ASSESSMENT` is `standalone`, justified by temporality.** An assessment is a *found fact* about a driver's state at a point in time (ArchiMate Assessment over a Driver). One `DRIVER` accrues **many** assessments as the situation is re-observed, each with its own observation date and lifecycle — so an assessment cannot be an inline field on the driver without losing that history. It is therefore its own catalogue element that references its `DRIVER` via `assesses` (§7.16). It carries **no polarity / SWOT field**: whether a finding is a strength, weakness, opportunity, or threat is a property of the `INFLUENCE` relation between elements, not of the finding itself (motivation-layer split, separate sub-task).
- **`TARGET_STATE` is `standalone`, as the object the architect varies.** A target state is a structural snapshot — the selection of `CAPABILITY` / `PROCESS` / `APPLICATION` that exists when one or more `GOAL`s are met (ArchiMate **Plateau**). It is what an architect *varies* when offering solution options to the customer, so it must be a first-class addressable element, not an inline fragment of a scenario or a goal. Composition lists (`capabilities`, `processes`, `applications`) are inline; satisfaction of `GOAL`s is an M:N relation that lands as a `REL` kind in a separate sub-task — never inline on this element.
- **`LOCATION` is `standalone`, justified by shared reference.** A location (an office, a country, a virtual zone) is referenced by many actors — multiple business units at the same site, many persons at the same office. Making it a first-class catalogue element lets each actor reference the same `LOCATION-…` ID without repeating the address, timezone, and country code. It is **not** a property of the actor (actors can move; the location persists), and it is not a motivation-layer element (no normative force — regulatory implications of location live in `CONSTRAINT` / `REQUIREMENT`). Business layer (`02_business/`) matches its grain: it describes where the organisation operates, not what it intends or how it executes.
- **`BUSINESS_SERVICE` is `standalone`, as the named behaviour the organisation offers.** A Business Service (ArchiMate §8.3.4) is the externally visible behaviour a unit or role makes available to its consumers — internal teams, external customers, or partners. It is a first-class catalogue element because it is shared: multiple processes, actors, and products may reference the same service, and its ownership (which unit offers it) and capability realisation (what it exposes) are time-aware events tracked as `offers` and `realizes` REL kinds ([elements/17-relations.md](elements/17-relations.md) §3). It is not a `PROCESS` (internal execution flow), a `CAPABILITY` (the ability to perform), or a `PRODUCT` (a packaged, versioned offering). Business layer (`02_business/`) is the correct placement — it describes what the organisation does for its environment, not what the organisation intends (`01_motivation`) or how it executes internally.
- **`STEP` is contained-then-promotable (a third shape, distinct from `view-defined`).** A process-flow step lives inline in its `PROCESS` element's `flow.steps[]` (§7.5), not in a view — so it is neither `standalone` (no element file until promoted) nor `view-defined` (its definition home is a *standalone element*, not a view document). It is **canonical-by-containment**: the PROCESS carries the single admission record and lifecycle, and the step is addressable by its `STEP-…` id (the worked example `PROCESS-ORD-FULFILL-1` already authors `STEP-ORD-FULFILL-1…7`). It is **promoted** to a standalone `02_business/steps/STEP-….yaml` only when a *second* document first references it — a step-level `CHANGE`, a `RULE.applies_to`, an `ACTIVITY` realising it, or an `ASSERTION` (`subject` / `realised_via`). This promotion trigger fired in the regulatory-intelligence build (compliance impact expressed via `ASSERTION` → flow-step ids), which is what moved this TYPE from reserved to registered. The promotion is **mechanical** (§7.20): the step's attributes move to the standalone file, its `flow.steps[]` entry reduces to a reference, and `flow.sequence` (the process-owned graph edges) is untouched — the id never changes. The BPMN node-label forms (`TASK-…` / `SE-…` / `EE-…`) are projection-local labels ([IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §3.3), **not** a step's catalogue identity; `STEP` is.
- **`INTEGRATION` is promotable.** The applications spec ([views/10](views/10-applications.md)) currently nests integrations inside an application's `integrations[]`. v1 keeps that nested-in-view form as the definition home; the standalone `03_application/integrations/` schema (§7.8) is defined so an integration that needs its own lifecycle/cross-references can be promoted without renaming.
- **`SCENARIO` is `standalone`, as the path the architect plans.** A scenario is *the path*, not the destination — an ordered set of steps (`ACTIVITY` / `CHANGE`) that moves the enterprise to one `TARGET_STATE` in service of one or more `GOAL`s (ArchiMate **Course of Action** realised by Work Packages + Gaps). It is what an architect *varies* alongside the `TARGET_STATE` when offering customer solution options — multiple paths may reach the same end-state. That makes it a first-class addressable element, not an inline fragment of a view. The earlier `view-defined` placement (a "scenario document" that scoped its own goals/capabilities/activities/etc.) conflated the path with the things it sequences and the things its end-state contains; the reclassification splits them: `TARGET_STATE` owns structural composition (§7.17), `SCENARIO` owns the ordered steps (§7.18). Scenario references — `pursues` goal list, `arrives_at` target-state ref, ordered `steps` — are **inline (B2)**; the only first-class REL in the planning model is `target_state_satisfies_goal` (declared on `TARGET_STATE`, §7.17).
- **`NODE` and `TECHNOLOGY_SERVICE` are `standalone`, as first-class infrastructure elements.** Infrastructure nodes and the platform services they expose are shared references: many applications may consume the same `TECHNOLOGY_SERVICE`, and many nodes may co-host it. Making them standalone catalogue elements lets the application layer reference `TECHNOLOGY_SERVICE-…` IDs without repeating connectivity details, and lets the infrastructure team manage node lifecycle independently of the applications built on top. They belong in `04_technology/` (ArchiMate Technology layer) — distinct from `03_application/` (software) and `02_business/` (organisational behaviour). The `hosts` and `uses` relation kinds ([elements/17-relations.md](elements/17-relations.md) §3) are the cross-layer links.
- **`EQUIPMENT` / `INFORMATION_ENTITY` are `view-defined` (document-local).** [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §4 and [views/13](views/13-process-blueprint.md) §5.3 already state these are blueprint-scoped with no organisation-wide catalogue mandated in v1 — "the IDs already conform to the canonical grammar and can be promoted … without renaming." This document leaves that decision unchanged.

### 4.2 `view-defined` is inline-content convenience, never a content home of last resort

Per the reconstruction invariant (§1.1), `view-defined` in the table above is a convenience — a *content* element authored inline inside a view document instead of in its own catalogue file — and it does not license a view to be the **only** home of canonical content. Two distinctions follow:

- **Content vs presentation config.** The element TYPEs in §4 are content (an `EQUIPMENT`, an `INFORMATION_ENTITY` — real things the organisation has). A view document *also* carries presentation configuration — which elements it shows, grouping, filtering, ordering, display options. That configuration is the view's own primary data, is not an element TYPE, and legitimately and permanently lives in the view (out of scope of this element table by construction). The rule: content is promotable to canon; presentation config stays in the view.
- **`view-defined` content must be promotable.** `EQUIPMENT` / `INFORMATION_ENTITY` already are (§4.1) — inline today, with canonical-grammar IDs ready for promotion. `SCENARIO`'s reclassification to a standalone content element (§4.1, §7.18) settled its half of this tension — the scenarios view is now a report-config rendering surface over the `SCENARIO` catalogue, not a content home. No non-promotable `view-defined` rows remain — the former `ISSUE` row was retired (2026-06-07).

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
| `01_motivation/` | Motivation | `DRIVER` (`factors/`), `GOAL` (`goals/`), `CONSTRAINT` (`constraints/`), `REQUIREMENT` (`requirements/`), `STAKEHOLDER` (`stakeholders/`), `ASSESSMENT` (`assessments/`) |
| `02_business/` | Business | `CAPABILITY` (`capabilities/`), `PROCESS` (`processes/`), `STEP` (`steps/`, when promoted), `PRODUCT` (`products/`), `ROLE` (`roles/`), `ACTOR` (`actors/`), `LOCATION` (`locations/`), `BUSINESS_SERVICE` (`business-services/`), `RULE` (`rules/`), `REGISTRY` (`registries/`) |
| `03_application/` | Application | `APPLICATION` (`applications/`), `INTEGRATION` (`integrations/`, when promoted) |
| `04_technology/` | Technology | `EQUIPMENT` (`equipment/` — ADR 2026-06-08), `NODE` (`nodes/`), `TECHNOLOGY_SERVICE` (`services/`) |
| `05_implementation/` | Implementation & Migration | `ACTION` (`actions/`), `CHANGE` (`changes/`), `TARGET_STATE` (`target-states/`), `SCENARIO` (`scenarios/`), `MILESTONE` (`milestones/` — see 6.2) |

### 6.1 New layer — `05_implementation`

This document **adds an `05_implementation/` layer**, the ArchiMate 3.2 *Implementation & Migration* layer, settling the open "`changes` / `actions` → ?" placement in the task (ratified by canon 2026-05-29). Rationale:

- An `ACTION` ("initiative / workstream") is an ArchiMate **Work Package** — a unit of transformation work, not a steady-state business element. A `CHANGE` (the BDN change layer) is a **Gap** — a required delta to reach the target state. Both belong to the *execution* half of the strategy chain, distinct from the *intent* half (`DRIVER` / `GOAL`) in `01_motivation` and from the *steady-state* business elements (`CAPABILITY` / `PROCESS` / `ROLE` / …) in `02_business`.
- Placing them in `02_business` would conflate "what the organisation is and does" with "the programme that changes it." A dedicated Implementation & Migration layer keeps the BDN execution layers together and ArchiMate-aligned, and matches the existing numbered-layer convention (`01_motivation` … `04_technology`). (The rejected alternative was to fold both into `02_business`.)

**ArchiMate 5 → Transitrix 4 + 1.** The Transitrix model maps ArchiMate's five Implementation & Migration concepts onto four primitives plus one realising selector: **ACTION** covers *Work Package + Deliverable*; **CHANGE** covers *Gap*; **TARGET_STATE** covers *Plateau* (§7.17 — the structural end-state an architect varies when offering solution options); **MILESTONE** covers *Implementation Event*. `DELIVERABLE` is the one ArchiMate concept that remains absorbed (into `ACTION`); its folder stays reserved should it ever need to be split out as a first-class TYPE. **SCENARIO** (§7.18) is the *path* primitive — ArchiMate's *Course of Action realised by Work Packages + Gaps* — sitting on top of these four (it sequences `ACTION` and `CHANGE` to reach a `TARGET_STATE`), not a sixth ArchiMate concept of its own.

Both `ACTION` and `CHANGE` are **recursive / multi-scale**: a strategic initiative aggregates programmes → projects → tasks (all one `ACTION` TYPE), and a capability-level `CHANGE` decomposes into process-level and step-level `CHANGE`s — in both cases via a `parent` relation between same-TYPE elements (see §7.3, §7.4). This matches the DSM model.

### 6.2 `MILESTONE` placement note

`MILESTONE` (= Implementation Event) belongs to this layer conceptually and the `05_implementation/milestones/` folder is reserved for it here. Its registration in [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §3.1 currently scopes it to an Action Card document ([views/18-action-card.md](views/18-action-card.md)); whether and how it is also materialised as a standalone element file is **owned by the MILESTONE TYPE task**, not decided by this document. This appendix reserves the folder and the layer assignment; it does not register a standalone MILESTONE schema (no MILESTONE row in §4 or §7).

---

## 7. Per-TYPE field schemas

Each subsection lists the per-TYPE fields that sit between the identity block and the admission record in the §3 envelope. Cross-reference fields follow [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §5 (plural field → array of typed IDs; singular field → one typed ID). Where a view spec already defines the inline shape, that spec is cited and is authoritative for field meanings; this document fixes the standalone-file form.

### 7.1 `DRIVER` — `01_motivation/factors/`

ArchiMate **Driver** — a neutral, standing force the organisation acts on (an environmental pressure, a market shift, an internal performance dimension). A DRIVER is the *thing*, not a judgement about its state: it names the dimension the organisation organises around ("EU regulatory window", "Customer churn", "Support response time"). It carries no polarity and no findings. A dated finding/judgement about a driver's current state — a measurement, a trend, an observation — is an `ASSESSMENT` (§7.16) that `assesses` the DRIVER; the assessment is what changes over time, the DRIVER is what persists. Whether a finding reads as a strength, weakness, opportunity, or threat lives on the `assessment_influences_goal` REL ([elements/17-relations.md](elements/17-relations.md) §3), not on the DRIVER or the ASSESSMENT.

| Field | Required | Type | Semantics |
|---|---|---|---|
| `type` | no | string | `external` \| `internal`. |
| `category` | no | string | **PESTLE sub-classification** for external drivers — one of `political` \| `economic` \| `social` \| `technological` \| `legal` \| `environmental`. Use on external drivers to record which PESTLE class the driver falls into (regulators / public policy → `political`; binding regulations / law → `legal`; markets / costs / demand → `economic`; demographic / cultural → `social`; technology shifts → `technological`; climate / sustainability → `environmental`). Omit on internal drivers — PESTLE does not apply. |
| `description` | recommended | string | One-paragraph elaboration of the driver — what the standing force is, not a finding about it. Keep findings (numbers, trends, observations) out of the DRIVER; put them on an `ASSESSMENT` that `assesses` this driver. |
| `references_constraint` | no | list | `CONSTRAINT-…` IDs the driver reflects. |

Inline shape: [views/02-dgca.md](views/02-dgca.md) §5.2.

### 7.2 `GOAL` — `01_motivation/goals/`

| Field | Required | Type | Semantics |
|---|---|---|---|
| `type` | no | string | A goal-type label (e.g. `Strategy`, `Strategic Goal`, `Project Goal`) — matches a `name` in the rendering view's `view_config.goal_types[]` vocabulary ([views/04-goals.md](views/04-goals.md) §5.2). |
| `level` | no | integer | Hierarchical level (Goals tree); ≥ 0. |
| `parent` | no | string | `GOAL-…` ID of the parent goal in the hierarchy. Inline `parent` is v0.x transitional — see time-aware note below. |
| `factors` | no | list | `DRIVER-…` IDs driving this goal. Legacy `FACTOR-…` IDs from before the rename remain valid. |
| `description` | recommended | string | One-paragraph elaboration. |
| `link` | no | string | URL to supplementary documentation. |

**Time-aware:** the goal `parent` (`GOAL → GOAL`) is declared first-class time-aware — its canonical home is a `REL-…` file with `type: goal_parent` ([elements/17-relations.md](elements/17-relations.md) §3). Inline `parent` is v0.x transitional; renderers prefer REL files when both are present. View spec: [views/04-goals.md](views/04-goals.md) (pure projection, v2.0).

### 7.3 `CHANGE` — `05_implementation/changes/`

A `CHANGE` is an ArchiMate **Gap**: a required delta to reach the target state, at any granularity — capability-level, process-level, or step-level. Higher-level changes decompose into lower-level changes via a `parent` relation between `CHANGE`s (multi-scale, §6.1).

| Field | Required | Type | Semantics |
|---|---|---|---|
| `goals` | no | list | `GOAL-…` IDs this change delivers. |
| `addresses` | no | list | `REQUIREMENT-…` / `CONSTRAINT-…` IDs this change responds to — the motivation-layer obligations whose gap this CHANGE closes. **Origin-agnostic** (§7.3.1): every `origin` value on the addressed REQUIREMENT/CONSTRAINT is valid (`legislative`, `process-product`, `project-product`). Each entry MUST resolve to an admitted `REQUIREMENT` or `CONSTRAINT` in canon. |
| `parent` | no | string | `CHANGE-…` — the higher-scale change this one decomposes from (capability → process → step). |
| `description` | recommended | string | One-paragraph elaboration of the transformation. |

Inline shape: [views/02-dgca.md](views/02-dgca.md) §5.4. (No subtype vocabulary — `type` omitted.)

#### 7.3.1 Origin-agnostic subject and impact via `ASSERTION`

`CHANGE` carries **no `origin`-typed field** and no other filter that binds it to a source category — the schema is uniform for every kind of change the organisation plans, and has been since the type was registered. What was missing was an explicit **subject** field naming the motivation-layer obligation(s) the change responds to; `addresses` closes that gap. A CHANGE may address:

- an `origin: legislative` REQUIREMENT (a codex-driven obligation whose interpretation shifted),
- an `origin: process-product` REQUIREMENT (an obligation on a process's output that the org has decided to tighten),
- an `origin: project-product` REQUIREMENT (a BRD-derived obligation whose scope changed mid-project), or
- a `CONSTRAINT` of any `origin` (a restriction the org has decided to lift, add, or narrow).

The addressed subject is **canon** — a REQUIREMENT/CONSTRAINT already admitted to `canon/elements/01_motivation/`. `addresses` is **inline** (not first-class time-aware) and follows the same convention as `goals` on this element: a timeless cross-reference on the CHANGE's own record, not a `REL` file.

**Impact via `ASSERTION`.** Given a CHANGE addressing one or more REQUIREMENTs, the **impact set** is the set of `ASSERTION` elements whose `about:` field names any of those REQUIREMENTs ([elements/16-assertion.md](elements/16-assertion.md) §2 — `about:` is the assertion's compliance target). The compliance impact of a CHANGE is derivable by scanning `canon/assertions/`; no new field on `ASSERTION` is required. `CONSTRAINT` compliance is not yet tracked via `ASSERTION` in v1 ([elements/16-assertion.md](elements/16-assertion.md) §1), so a CHANGE addressing only CONSTRAINTs derives an empty impact set — this is by design and requires no schema accommodation on CHANGE.

**Relation to `derived_from` and to `AMENDMENT`.** The standalone-envelope `derived_from` field (§3) records the Field/Codex **evidence** that motivated this CHANGE — an `AMENDMENT-…` for a codex-driven detection ([elements/22-amendment.md](elements/22-amendment.md) §1), or a field artefact (an interview, an observation, a BRD note) for a non-codex-driven trigger. `addresses` records the canon **subject** — the REQUIREMENT/CONSTRAINT the CHANGE responds to. The two fields are complementary and orthogonal:

- `derived_from: [AMENDMENT-…]` alone: the codex-driven flow ([elements/22-amendment.md](elements/22-amendment.md) §1's paired chain, `AMENDMENT.motivates ↔ CHANGE.derived_from`). Populated for `origin: legislative` REQUIREMENTs whose source was re-scanned.
- `addresses: [REQUIREMENT-…]` alone: the non-codex-driven flow. Populated for `origin: process-product` or `origin: project-product` REQUIREMENTs where no scanner emitted an AMENDMENT — the CHANGE names the canon subject directly.
- Both populated: a codex-driven CHANGE whose amended source and whose addressed obligation are both explicit — the most complete case; recommended when both are known.

Neither is required (both are optional per §7.3): a strategic CHANGE that predates the motivation-layer catalogue may carry only `goals[]`.

**Worked example — a `project-product` REQUIREMENT changes.** A BRD amendment tightens a delivery-time obligation from "≤ 48h" to "≤ 24h" for a mobile-order product. The obligation was captured as a `REQUIREMENT` with `origin: project-product` at project kick-off; two ASSERTIONs bind two subjects (a product and a process) to it. The CHANGE closes the gap between the old and the tightened obligation.

```yaml
# canon/elements/05_implementation/changes/CHANGE-DELIVERY-24H-1.yaml
notation: change
id: CHANGE-DELIVERY-24H-1
name: "Tighten mobile-order delivery SLA from 48h to 24h"
description: >
  The BRD was amended on 2026-06-30 to tighten the mobile-order delivery
  window from 48h to 24h. This CHANGE closes the gap between the
  legacy 48h fulfilment and the new 24h obligation.

# Non-codex-driven — no AMENDMENT chain. The subject is named directly.
addresses:
  - REQUIREMENT-MOBILE-ORDER-DELIVERY-1

goals:
  - GOAL-MOBILE-EXPERIENCE-1

# Admission record (CONTRACT.md §6)
zone: canon
admitted_at: "2026-07-03"
admitted_by: "v.korobeinikov"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass
derived_from:
  - INTERVIEW-po-brd-amendment-2026-06-30-1   # non-codex evidence, not an AMENDMENT

# Primitive lifecycle (CONTRACT.md §7)
valid_from: "2026-07-03"
valid_to: null
```

Given this CHANGE, the impact set — the ASSERTIONs whose compliance status may need re-review — is derivable by scanning `canon/assertions/` for entries with `about: REQUIREMENT-MOBILE-ORDER-DELIVERY-1`. Suppose two exist:

- `ASSERTION-PRODUCT-MOBILE-ORDER-DELIVERY-1` (subject `PRODUCT-MOBILE-ORDER-1`)
- `ASSERTION-PROCESS-FULFILLMENT-DELIVERY-1` (subject `PROCESS-ORDER-FULFILL-1`)

Both surface as impacted, without any per-CHANGE bookkeeping: the derivation follows the existing `ASSERTION.about → REQUIREMENT` link and the new `CHANGE.addresses → REQUIREMENT` link.

**Validation.** `addresses[]` entries follow the general reference-resolution rule (§3 envelope, [CONTRACT.md](CONTRACT.md) §6): each entry MUST be a well-formed typed ID and MUST resolve to an admitted `REQUIREMENT` or `CONSTRAINT` in canon. A dangling or wrong-TYPE reference is reported through the shared reference-check pass; no CHANGE-specific rule code is introduced. Cross-cutting impact queries ("which ASSERTIONs are impacted by this CHANGE?", "which CHANGEs address this REQUIREMENT?") are report-config concerns over the canon graph, not element-schema fields.

### 7.4 `ACTION` — `05_implementation/actions/`

Full spec — field set, `type` vocabulary (Initiative / Programme / Project / Task), time-aware relations, validation rules: **[elements/24-action.md](elements/24-action.md)**. View spec (pure projection, v2.0): [views/07-action.md](views/07-action.md).

### 7.5 `PROCESS` — `02_business/processes/`

The `PROCESS` element is the **complete, self-sufficient definition** of a business process. It carries not only the catalogue metadata but the process *behaviour* — the participants and the flow — so the process can be reconstructed without any view. A BPMN diagram is a **projection** of this element, not its definition home (the reconstruction invariant, §1.1; render contract in [views/01-bpmn.md](views/01-bpmn.md)).

| Field | Required | Type | Semantics |
|---|---|---|---|
| `owner_role` | no | string | `ROLE-…` accountable for the process as a whole. |
| `capability` | no | string | `CAPABILITY-…` this process realises. |
| `maturity` | no | integer | CMM level 1–5. **Time-varying** — sidecar ([CONTRACT.md](CONTRACT.md) §9), not inline. |
| `participants` | no | list | The process's lanes — each a reference to a canonical active-structure element, `ROLE-…` or `ACTOR-…` (person / business_unit / system). A participant's lane caption is **derived** from the referenced element's `name`; no caption text is stored here. List order is the rendered top-to-bottom lane order. |
| `flow` | no | object | The canonical process graph — steps, gateways, and sequence flows (see below). Sufficient to regenerate a BPMN diagram; the view adds only layout, which is computed deterministically. |
| `description` | recommended | string | One-paragraph elaboration. |

The former `bpmn_file` pointer ("path to the detailed BPMN diagram") is **removed as a source field**. The flow is no longer authored in a separate `.bpmn` file the element points at; any `.bpmn.transitrix.yaml` is a *derived projection* of `flow` (generated output), never the source — see [views/01-bpmn.md](views/01-bpmn.md).

**`flow` shape.** `flow` reuses the structural vocabulary defined once in [views/01-bpmn.md](views/01-bpmn.md) — the seven element types (`startEvent` / `endEvent` / `task` / `userTask` / `serviceTask` / `exclusiveGateway` / `parallelGateway`) and named sequence flows — but homed here as canon, not in a view. It follows the canon-wide flat-array-with-references form rule ([README](README.md) "Form rule"): a flat `steps` list, with lane membership expressed by reference rather than by nesting.

- `flow.steps` — list of nodes. Each step: `id`, `type` (one of the seven), `name` (required for tasks / gateways; optional for events), `performed_by` (a member of `participants` — `ROLE-…` or `ACTOR-…`), and optional `supported_by_application` (`APPLICATION-…`). Precedence and the "swimlane is a participant" default follow [views/01-bpmn.md](views/01-bpmn.md) §7.2; the BPMN projection derives lane grouping from `performed_by`.
- `flow.sequence` — list of `{ from, to, condition?, default? }` sequence flows between step IDs (projects to the BPMN `flows` array).

Step IDs use the canonical ID grammar ([IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §1), not the file-local BPMN labels of §3.3, so a step is **addressable**: a step-level `CHANGE` (§7.3, §6.1), a `RULE.applies_to`, an `ACTIVITY` realising a step, or an `ASSERTION` (`subject` / `realised_via`) can reference it. Steps are canonical **by containment** — the PROCESS element carries the single admission record and lifecycle (§1, inline-element rule); a step is **promoted** to its own record (the registered `STEP` TYPE, [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §3.1; element-file shape and promotion mechanic in §7.20) only if a second document references it (§1 promotion rule). The file-local-label convention of [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §3.3 now applies only to a standalone `.bpmn` projection, not to a `flow` authored inside canon.

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
| `interface_semantics` | no | boolean | When `true`, this INTEGRATION is asserting ArchiMate Application Interface semantics — a named, typed point of access. Triggers the required-field enforcement below (INT-001). Default: absent / `false`. |
| `payload_class` | conditional | string | **Required when `interface_semantics: true`.** The category of data the interface exchanges — e.g. `"domain_event"`, `"command"`, `"query"`, `"bulk_export"`. Free-form string; adopter-defined vocabulary, meaningful within their domain. |
| `sensitivity` | conditional | string | **Required when `interface_semantics: true`.** Data sensitivity classification — `public` \| `internal` \| `confidential` \| `restricted`. See §7.8.1. |
| `directionality` | conditional | string | **Required when `interface_semantics: true`.** Interface data-flow direction — `producer` \| `consumer` \| `request_reply` \| `bidirectional_stream`. Distinct from `direction` (which records inbound/outbound from the source-app perspective); `directionality` records the interface's own data-flow mode. See §7.8.1. |

#### 7.8.1 Application Interface semantics

**When to use INTEGRATION to express an Application Interface.** ArchiMate 3.2 §8.2.5 defines Application Interface as "a point of access where application services are made available to another application." Transitrix does not define a separate `APPLICATION_INTERFACE` primitive (Path B decision, 2026-06-28); instead, an INTEGRATION with `interface_semantics: true` asserts interface semantics on a standard INTEGRATION element. Use this flag when:

- The integration represents a named, typed endpoint — not just a data pipe, but a contract that specifies what operations are available, over which protocol, with which payload format and sensitivity.
- The interface is addressable and governed independently of the source application — it has a lifecycle and a spec that adopters can reference.
- Other applications or architectural views need to refer to this interface by name rather than by the generic "OMS → CRM" pattern.

Do NOT set `interface_semantics: true` for:
- Simple, point-to-point data copies with no named contract.
- Temporary integrations without a defined protocol or payload class.
- Integrations where `source` or `target` is unknown.

**Required fields when `interface_semantics: true`** (enforced by INT-001):
All five of `source`, `target`, `protocol`, `payload_class`, `sensitivity`, and `directionality` must be present. `source` and `target` are already required on all INTEGRATION elements; the remaining four become conditionally required.

**`sensitivity` vocabulary:**

| Value | Meaning |
|---|---|
| `public` | No authentication required; data is freely accessible. |
| `internal` | Intra-organisation access; authenticated but not sensitive by data category. |
| `confidential` | Access restricted to named roles or services; data may include business-sensitive or regulated content. |
| `restricted` | Highest sensitivity — PII, health, financial, or security-critical data; access tightly controlled with audit. |

**`directionality` vocabulary:**

| Value | Meaning |
|---|---|
| `producer` | The source application emits data / events; consumers receive without a synchronous reply (e.g. Kafka producer, webhook emitter). |
| `consumer` | The source application ingests data / events from the target without producing a synchronous request (e.g. Kafka consumer). |
| `request_reply` | Synchronous request–response — the source sends a request and waits for a reply (e.g. REST API call, gRPC unary). |
| `bidirectional_stream` | Both sides emit and receive within the same session (e.g. WebSocket, gRPC bidirectional streaming). |

**Example — Kafka-producer interface modelled as INTEGRATION:**

```yaml
notation: integration
id: INTEGRATION-OMS-EVENTS-1
name: "OMS Order-Events Kafka Interface"
source: APPLICATION-OMS-1
target: APPLICATION-CRM-1
protocol: "Kafka"
direction: outbound
interface_semantics: true
payload_class: "domain_event"
sensitivity: internal
directionality: producer
description: >
  Kafka producer interface exposing order-state change events from the
  Order Management System. Consumers subscribe to the `oms.orders.v1`
  topic. Events follow the CloudEvents 1.0 envelope; schema registered
  in the org's schema registry.

zone: canon
admitted_at: "2026-06-28"
admitted_by: "v.korobeinikov"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

valid_from: "2024-03-01"
valid_to: null
```

**Endpoint patterns for interface-semantics INTEGRATION.** The `source` and `target` endpoints of an interface-semantics INTEGRATION MUST both resolve to admitted `APPLICATION-…` elements ([IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §3.1). A `NODE`, `TECHNOLOGY_SERVICE`, or any non-application element as an endpoint is invalid (enforced by INT-002). The intent: Application Interface semantics is an application-layer contract; the infrastructure that carries it (a Kafka cluster, an API gateway) is represented separately via `TECHNOLOGY_SERVICE` and linked via the `uses` relation ([elements/17-relations.md](elements/17-relations.md) §3), not by pointing the integration at the infrastructure node directly.

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

**Review-due signal.** CONSTRAINT MAY carry the same optional `next_review_at` field defined for REQUIREMENT in [elements/15-requirement.md](elements/15-requirement.md) §2.3 (quoted ISO 8601 date; the review-checkpoint convention for obligations whose motivating source is not a monitorable codex artefact). `REQ-STALE-001` ([elements/15-requirement.md](elements/15-requirement.md) §4) applies symmetrically to CONSTRAINT: when `next_review_at` is set and is in the past relative to today, the constraint is stale and due for re-review. The `check-stale` command in `@transitrix/ingest-cli` walks both `01_motivation/requirements/` and `01_motivation/constraints/`.

**Hierarchy — `parent`.** CONSTRAINT MAY carry the same optional `parent` field defined for REQUIREMENT in [elements/15-requirement.md](elements/15-requirement.md) §2.4 — same-TYPE (`parent: CONSTRAINT-…`), inline, not time-aware. A broad restriction ("no personal data outside the EEA without safeguards") decomposes into narrower ones ("no PII in analytics logs sent outside the EEA", "no PII in raw log storage outside the EEA"). Same origin-agnostic semantics: any two CONSTRAINTs may be linked regardless of `origin`. Cross-TYPE hierarchies (CONSTRAINT → REQUIREMENT, or vice versa) are not supported — CONSTRAINT and REQUIREMENT are peer motivation-layer elements ([elements/15-requirement.md](elements/15-requirement.md) §1), not decompositions of one another. Structure only, no traversal semantics: an assertion mechanism against CONSTRAINT is still out of scope for v1 ([elements/16-assertion.md](elements/16-assertion.md) §1, §7), so aggregation across the hierarchy is a downstream tooling concern.

### 7.14 `EQUIPMENT` — `04_technology/equipment/`

Physical instrument, device, or facility a process stage depends on (ArchiMate Physical element). Promoted from Process Blueprint view-defined to first-class standalone in the `04_technology` layer (ADR 2026-06-08; first catalogued TYPE for this layer).

| Field | Required | Type | Semantics |
|---|---|---|---|
| `type` | no | string | Physical sub-kind: `device` \| `vehicle` \| `instrument` \| `facility` \| `infrastructure`. Open enum — extend as needed. |
| `description` | recommended | string | What the equipment is and how it is used. |
| `owner_role` | no | string | `ROLE-…` responsible for the equipment. **Time-varying** — sidecar ([CONTRACT.md](CONTRACT.md) §9), not inline. |

An `equipment[]` entry in a Process Blueprint that carries an `id` resolves to the matching `EQUIPMENT` catalogue record ([views/13-process-blueprint.md](views/13-process-blueprint.md) §5.3); a free-form entry without an `id` stays document-local (backward-compatible). EQUIPMENT IDs must conform to the canonical grammar with no leading zeros (`EQUIPMENT-…-<INTEGER>`).

### 7.15 `BUSINESS_OBJECT` — `02_business/business-objects/`

Passive information element at the business value-chain grain — an ArchiMate **Business Object** (a concept used within a business domain). Replaces `INFORMATION_ENTITY` (promoted from view-defined, renamed for ArchiMate alignment; ADR 2026-06-08).

**Scope note.** `BUSINESS_OBJECT` covers the business-layer concept ("customer order", "customs declaration", "invoice"). An application-layer data structure is a Data Object; a document's perceptible form is a Representation. Both are out-of-scope for this TYPE at the blueprint grain.

**Deprecated alias.** `INFORMATION_ENTITY` is accepted as an alias for one release (validator emits `BOBJ-D001` warning); it will be removed in the following release. Migrate: rename `element_type: INFORMATION_ENTITY` → `BUSINESS_OBJECT`, rename ID prefix `INFORMATION_ENTITY-` → `BUSINESS_OBJECT-`, rename the blueprint array field `information_entities[]` → `business_objects[]`.

| Field | Required | Type | Semantics |
|---|---|---|---|
| `type` | no | string | Information sub-kind: `record` \| `document` \| `concept` \| `data_artifact`. Open enum — extend as needed. |
| `description` | recommended | string | What business information this represents. |
| `owner_role` | no | string | `ROLE-…` responsible for maintaining it. **Time-varying** — sidecar, not inline. |

A `business_objects[]` entry in a Process Blueprint that carries an `id` resolves to the matching `BUSINESS_OBJECT` catalogue record; a free-form entry stays document-local. BUSINESS_OBJECT IDs use the prefix `BUSINESS_OBJECT-`.

### 7.16 `STAKEHOLDER` — `01_motivation/stakeholders/`

Motivation-layer interest primitive — the stake profile, with identity referenced from an `ACTOR`. Full spec: [elements/20-stakeholders.md](elements/20-stakeholders.md).

| Field | Required | Type | Semantics |
|---|---|---|---|
| `type` | yes | string | `internal` \| `external`. |
| `actor` | **yes** | string | `ACTOR-…` whose identity this stake attaches to — identity never lives on the stakeholder. |
| `concern` | recommended | string | What the stakeholder cares about. |
| `interest` | no | string | `high` \| `medium` \| `low`. |
| `influence` | no | string | `high` \| `medium` \| `low`. |
| `description` | no | string | Free-text elaboration. |

Stake in a specific `GOAL` / `ACTION` / `CAPABILITY` is a `stakeholding` relation ([elements/17-relations.md](elements/17-relations.md) §3), not an inline field.

### 7.17 `ASSESSMENT` — `01_motivation/assessments/`

Motivation-layer **finding** primitive — a dated finding/judgement about the state of a `DRIVER`. **ArchiMate mapping: Assessment**, assessing a **Driver** (the `DRIVER` it references). An assessment is a *found fact* ("support response time 8h, degrading"), not a recommendation; it justifies its own element by **temporality** — one driver accrues many assessments over time, each separately dated and lifecycled.

| Field | Required | Type | Semantics |
|---|---|---|---|
| `assesses` | **yes** | string | `DRIVER-…` (the Driver) this finding is about. Singular ref ([IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §5); resolves to one defined `DRIVER`. Legacy `FACTOR-…` IDs remain valid. |
| `description` | **yes** | string | The finding itself — the observed state of the driver ("support response time 8h, degrading"). Used in place of a normative `statement`; an assessment states what *is*, not what *must be*. |
| `observed_at` | recommended | string | Date the finding was observed / measured — quoted ISO 8601 ([CONTRACT.md](CONTRACT.md) §4). Distinct from `admitted_at` (admission to canon) and `valid_from` (when the finding took effect as a record). |
| `method` | no | string | How the finding was established — e.g. `measurement`, `survey`, `observation`, `expert_judgement`. |
| `source` | no | string | Citation / evidence pointer behind the finding (a dashboard, a report, a Field artefact reference). Field provenance proper goes in `derived_from` (§3). |

**No polarity / SWOT field.** An assessment records *what was found*, never whether it is good or bad. Whether the finding acts as a strength, weakness, opportunity, or threat — and on what — is carried by the `assessment_influences_goal` REL kind ([elements/17-relations.md](elements/17-relations.md) §3, signed `positive` \| `negative` with optional `magnitude`), not by the assessment. (No subtype vocabulary — `type` omitted.) Resolution path for views: scan `canon/relations/` for REL files with `type: assessment_influences_goal` and `from: ASSESSMENT-…` (forward — which goals this finding bears on, with which sign); the reverse direction (which findings bear on a given goal) matches on `to: GOAL-…`. A SWOT view crosses the assessed `DRIVER.type` (internal/external) with the REL's `sign` to derive S/W/O/T quadrants per goal — derived, not stored.

No view inline shape: `ASSESSMENT` is standalone-only — it is not authored inline inside any view document.

### 7.18 `TARGET_STATE` — `05_implementation/target-states/`

Implementation-layer end-state primitive — an ArchiMate **Plateau**. A target state is the structural snapshot of the `CAPABILITY` / `PROCESS` / `APPLICATION` selection that exists when one or more `GOAL`s are met. It is what an architect *varies* when offering the customer solution options — making it a first-class addressable element, not an inline fragment of a goal or a scenario. The path from today's state to a target state is a `SCENARIO`; the goals a target state satisfies are carried as a separate `REL` kind (`target_state_satisfies_goal`, [elements/17-relations.md](elements/17-relations.md) §3), never inline here.

| Field | Required | Type | Semantics |
|---|---|---|---|
| `type` | no | string | Plateau classification — `base` \| `target`. `base` marks the baseline plateau (the current-state snapshot); `target` (the default when the field is omitted, including on every target state authored before this field existed) marks a future end-state reached by a `SCENARIO`. Closed vocabulary in v1 — see below. |
| `capabilities` | no | list | `CAPABILITY-…` IDs in the target-state composition (the V/H IDs of [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §2). |
| `processes` | no | list | `PROCESS-…` IDs in the composition. |
| `applications` | no | list | `APPLICATION-…` IDs in the composition. |
| `description` | recommended | string | One-paragraph elaboration — what *is true* about the organisation in this state. |
| `link` | no | string | URL to supplementary documentation. |

- **Composition lists are inline.** The target state *is* its composition; the lists name the structural primitives present in the state, not relationships that vary independently. They are timeless on the element file — the element's own `valid_from` / `valid_to` (§3 envelope) carry the lifecycle of the state as a whole.
- **Goal satisfaction is a `REL`, not an inline field.** The `TARGET_STATE → GOAL` satisfaction relation is M:N and lives as a first-class time-aware `REL` kind — `target_state_satisfies_goal` ([elements/17-relations.md](elements/17-relations.md) §3, with optional `degree: partial | full`). Do not add a `goals:` field to this element. A view that needs the goals a given target state satisfies reads `canon/relations/` for REL files with `type: target_state_satisfies_goal` and `from: TARGET_STATE-…`; the reverse lookup (target states that reach a given goal) matches on `to: GOAL-…`.
- **Scenarios point at target states, not the other way around.** A `SCENARIO` is a *path* — the change sequence that reaches a target state. The `arrives_at` reference lives on the scenario (§7.19); this element carries no `scenarios:` back-reference. A view that needs "which scenarios reach this target state?" scans the `SCENARIO` catalogue for entries whose `arrives_at` equals this `TARGET_STATE-…`.
- **`base` is the baseline plateau — today, not a destination.** At most one `TARGET_STATE` with `type: base` is in effect at a time (`valid_to: null`); it captures the live `CAPABILITY` / `PROCESS` / `APPLICATION` composition, not a future one, so no `SCENARIO.arrives_at` should reference it — nothing needs to "arrive" at where the organisation already is. Reusing the same `target_state_satisfies_goal` REL kind from a baseline plateau closes a real gap: impact/blast-radius analysis (the Analyst's capability) can trace an operational element (`APPLICATION` / `PROCESS` / `CAPABILITY`) up through the baseline plateau's composition to the *standing* goals ("maintain 99.9% uptime") it satisfies right now, alongside the existing traversal through target plateaus for *future-reachability* goal-risk. Both traversals reuse `target_state_satisfies_goal`; no new relation kind bridges operational elements directly to `GOAL` (deliberately — see [elements/17-relations.md](elements/17-relations.md) §3, "Out of the enum in v1").

`type` distinguishes only `base` from `target` in v1; no further sub-classification of target plateaus (e.g. `intermediate` / `final` staging) is defined — an organisation that needs it can use `description` / `link` for now. The composition lists remain the only required content for a target state to be useful — name + composition is enough to render it as a structural snapshot.

There is no dedicated view spec in v1 — a target state is a *content element*, rendered as part of a Scenarios view (a path landing on it) and referenced as a composition fragment from any structural view that wants to scope itself to one state.

### 7.19 `SCENARIO` — `05_implementation/scenarios/`

Implementation-layer **path** primitive — the ordered set of steps (`ACTION` / `CHANGE` — Work Packages + Gaps) that moves the enterprise to one `TARGET_STATE` in service of one or more `GOAL`s. ArchiMate framing: *Course of Action* realised by Work Packages and Gaps (§6.1). A scenario is *the path*, not the destination; the destination (`TARGET_STATE`, §7.17) and the intent (`GOAL`) are separate elements that the scenario references. Multiple scenarios may reach the same target state (alternative paths), and one scenario reaches exactly one target state.

| Field | Required | Type | Semantics |
|---|---|---|---|
| `pursues` | **yes** | list | `GOAL-…` IDs the path's *intent* — what this path is meant to achieve. **Inline (B2).** Narrower than the goals the `TARGET_STATE` incidentally satisfies: a path may target a subset of the end-state's satisfied goals. Must be a non-empty list (a path with no intent is not a scenario). |
| `arrives_at` | **yes** | string | Singular `TARGET_STATE-…` — the end-state this path reaches. **Inline single ref ([IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §5).** Cardinality is exactly one (N:1 — a state may be reached by many paths, but each path lands on one state). |
| `steps` | **yes** | list | The ordered execution sequence. Each entry references one `ACTION-…` (Work Package) or `CHANGE-…` (Gap). **Inline, ordered (B2)** — list order is the canonical sequence of the path. A scenario with zero steps is not a path; the list must be non-empty. Each step entry is a single typed ID; richer per-step metadata (a step-local note, conditional gating) is not modelled in v1. |
| `description` | recommended | string | One-paragraph elaboration of the path's premise and shape — what changes along the way. |
| `link` | no | string | URL to supplementary documentation. |

- **All scenario references are inline (B2).** `pursues`, `arrives_at`, and `steps` live on the element file; the scenario side carries no `REL-…` records. The only first-class REL in the planning model is `target_state_satisfies_goal` ([elements/17-relations.md](elements/17-relations.md) §3), which lives on `TARGET_STATE`, not here. A scenario re-aimed at a different target state, a different goal mix, or a different step sequence is captured by versioning the scenario element itself (`valid_to` the old one, admit a new one), not by relation re-binding.
- **`pursues` is narrower than the end-state's satisfied goals.** The `TARGET_STATE` may satisfy goals incidentally (it reaches an end-state that closes goal A, B, and C); a scenario may *intend* only a subset of those (the architect's reason for offering this path). The consistency invariant `Scenario.pursues ⊆ TargetState.goals` (where `TargetState.goals` is resolved via the `target_state_satisfies_goal` REL kind) — the triangle Goal–TargetState–Scenario must commute — is a separate sub-task and is not enforced by this document.
- **`steps` are existing primitives, not new ones.** A scenario does not introduce a new step TYPE; it references existing `ACTION` / `CHANGE` elements admitted to canon under `05_implementation/actions/` and `05_implementation/changes/`. The same `ACTION` may appear in multiple scenarios (an initiative that figures in several candidate paths); that is a property of catalogue reuse, not of the scenario shape.
- **No driver / capability / process / application / product composition lives here.** Those were the v0.x view-defined scenario's content. Composition belongs to `TARGET_STATE` (the structural snapshot, §7.17); cross-layer impact analysis belongs to the DGCA / FGA chain and to the structural views. The reclassification splits those concerns out cleanly.
- **No `vision` / `factors_view` / status vocabulary.** Narrative vision and per-scenario driver relevance were v0.x conveniences mixed into the same document. With the reclassification, narrative is `description`; driver analysis lives in the motivation layer (`ASSESSMENT`, §7.16, and the `assessment_influences_goal` REL kind), not as a per-scenario projection.

No subtype vocabulary on `type`. There is no dedicated view spec in v1 — a scenario is a *content element*. The scenarios view ([views/11-scenarios.md](views/11-scenarios.md)) renders the catalogue (ordering, filtering, comparison side-by-side); it is a report-configuration surface over the `SCENARIO` elements, not a content home.

### 7.20 `REGISTRY` — `02_business/registries/`

Business-layer **operating-configuration** primitive — a curated, **org-authored** list the organisation maintains to drive an operating activity. It is model content (a real, authoritative thing the organisation keeps), but it is neither intent nor an externally-given constraint: it is the configuration the org authors to decide *how it operates*. The placement rationale (why not motivation / codex / Field / `RULE` / the team `operations/` folder) is in §4.1. There is no clean ArchiMate concept for it; it is a methodology operating-configuration primitive on the business layer.

The **worked example** is the regulatory **source registry** — the list of regulatory sources the organisation watches, where each lives, whether and how it is monitored for change, and how often. (`organizations/acme_corp/canon/elements/02_business/registries/REGISTRY-REG-SOURCES-1.yaml`.) The schema is designed so a registry of a different `type` can be added later without re-deciding the envelope.

**Element-level fields:**

| Field | Required | Type | Semantics |
|---|---|---|---|
| `type` | **yes** | string | The registry *kind* — the subtype that fixes which row schema applies. v1 vocabulary: `regulatory_source` (the worked example). Open for additive extension; a new kind defines its own row schema in this section. |
| `description` | recommended | string | One-paragraph statement of what this registry is for and how it is maintained. |
| `default_scan_frequency` | no | string | ISO 8601 duration ([CONTRACT.md](CONTRACT.md) §4 dates; durations e.g. `P1D` / `P7D` / `P30D`) applied to any row that omits `scan_frequency`. Overrides the organisation-wide default in the manifest's `operating_parameters:` ([MANIFEST.md](MANIFEST.md) §2). Resolution order for a row's effective cadence: row `scan_frequency` → this registry `default_scan_frequency` → manifest `operating_parameters.default_scan_frequency`. |
| `rows` | **yes** | list | The registry entries. Each row is inline and **canonical-by-containment** — see below. The per-row fields depend on the registry `type`. |

**Rows are inline, canonical-by-containment, promotable.** Each row carries an `id` in the canonical grammar ([IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §1), unique within the registry, and is **addressable** — a `REQUIREMENT.derived_from`, an `ASSERTION`, or a `CHANGE` may reference a row by its ID. A row stays inline (the REGISTRY element carries the single admission record and lifecycle, §1 inline-element rule) and is **promoted** to its own standalone record, registering its row TYPE, only when a *second* document references it (§1 promotion rule) — the identical mechanic to a `PROCESS` flow step (§7.5, [IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §3.3). The row TYPE prefix for the regulatory-source kind is `SOURCE` (e.g. `SOURCE-GDPR-1`); it is unregistered until promotion, exactly as `STEP-…` is for a process flow.

#### Row schema — `type: regulatory_source`

| Field | Required | Type | Semantics |
|---|---|---|---|
| `id` | **yes** | string | Canonical-grammar ID of the source row (the *source_id*), e.g. `SOURCE-GDPR-1`. Contained + promotable (above). |
| `name` | **yes** | string | Human-readable label of the source. |
| `type` | **yes** | string | Source classification — `law` \| `regulation` \| `policy` \| `standard` \| `guidance`. (Distinct from the codex artefact TYPEs: this classifies the *source* in the watch-list; it does not admit a codex artefact.) |
| `jurisdiction` | **yes** | string | The regime / jurisdiction the source belongs to, e.g. `EU`, `US-CA`, `UK`. Industry- and regime-agnostic — no sector or named regulation is privileged by the schema. |
| `citation` | recommended | string | Human citation of the source (title, article / section, issuing body). |
| `domain` | no | list | Regulatory domain categories — zero or more values from the controlled vocabulary: `data_protection` \| `cybersecurity` \| `data_governance` \| `data_residency` \| `product_regulation`. Multiple domains allowed (e.g. `[data_protection, data_residency]`). Enables domain-filtered scanning and reporting; omit for uncategorised sources. |
| `source_url` | recommended | string | Canonical URL where the source is published. **Pre-admission** (no `codex_id`) this is the live harvesting target the scanner reads. **Once `codex_id` is present** it is a harvesting hint only — the linked codex artefact's `source_url` is the authoritative watch target, and the two MUST agree (`REG-001`, §9). |
| `codex_id` | no | string | Id of the admitted **codex artefact** this source has been ingested as (e.g. `LAW-GDPR-1`), once it exists; absent ⇒ the source is not yet admitted. Marks the lifecycle hand-off (ADR Option A): a row exists *before* ingestion as the harvesting watchlist entry and persists *after* as a thin pointer. **Present ⇒ the codex artefact is authoritative** for the watch URL (`source_url`) and for scan state (its `scan` block), and this row's `scan_frequency` / `change_signal_method` are superseded by the codex `scan` block ([elements/14-codex.md](elements/14-codex.md) §3, §3.5). (Per the codex/registry monitoring source-of-truth architecture decision.) |
| `monitoring_needed` | **yes** | boolean | Whether this source is actively watched for change. `false` for a source recorded for reference but not monitored. |
| `monitor_instead` | no | list | `SOURCE-…` IDs (in this registry) that are watched in place of this one — e.g. an aggregator or consolidated text is monitored instead of each amendment. Present only where `monitoring_needed: false` because coverage comes via another row. |
| `scan_frequency` | no | string | ISO 8601 duration — how often this source is scanned. When omitted, the registry / manifest default applies (resolution order above). |
| `change_signal_method` | no | string | How a change is detected — `etag` \| `api-updated-field` \| `version-date` \| `content-hash`. Required where `monitoring_needed: true`. |

**Config vs operating state — the split (acceptance criterion).** A row's **operating state** — `last_scanned_at`, `next_scan_due`, `change_detected`, `review_needed`, and the resolved `latest_snapshot` pointer — is *runtime data written by the collector*, not authored configuration. It MUST NOT be stored inline on the REGISTRY element (which would churn the source-of-truth artefact on every scan and lose the config/state boundary). It lives in a co-located **operating-state sidecar** ([CONTRACT.md](CONTRACT.md) §9.6):

```
REGISTRY-<…>.yaml            # the registry — authored configuration only (this schema)
REGISTRY-<…>.runstate.yaml   # per-row operating state — machine-written, NOT canon
```

> **Deviation flagged for review.** The task's row-schema list placed the *latest-snapshot pointer* among the row fields. It is moved to the operating-state sidecar here because a snapshot pointer that advances on every detected change is **state**, not authored config — keeping it on the row would breach the very config/state boundary this task establishes. The runtime pointer therefore lives in `runstate.yaml` alongside the other state counters; the row schema above carries only authored configuration. Valerii gates this call at merge.

**Source-of-truth split with the codex zone (ADR 2026-06-10, Option A).** The REGISTRY and a codex artefact overlap on the watch URL when a row points at a source that has *also* been admitted as a codex artefact. The split is by **lifecycle stage**: the REGISTRY owns the *curated source list and harvesting prioritisation* (what we want to ingest, in what order, how often) and is authoritative for a row **until the source is admitted**; the codex artefact owns *monitoring of the already-ingested source* (its `source_url` as the authoritative watch target, its `scan` block as runtime state) and is authoritative **from admission onward**. The `codex_id` field makes the hand-off explicit: absent ⇒ REGISTRY-authoritative pre-admission row; present ⇒ codex-authoritative. The cross-artefact gate `REG-001` (§9) flags a row whose `source_url` disagrees with its linked codex artefact's. The scanner-agent workflow reads the codex `source_url` for admitted sources and the REGISTRY row's `source_url` for not-yet-admitted rows ([elements/14-codex.md](elements/14-codex.md) §3.5).

**Watch-list shape (ADR 2026-06-10, extended).** The `regulatory_source` REGISTRY is the organisation's central scanner watch-list. No separate `operations/config/scan-sources.yaml` is defined: the REGISTRY row's `monitoring_needed`, `scan_frequency`, `change_signal_method`, and `domain` provide the scanner's complete per-source configuration. The scanner queries all REGISTRY files whose rows carry `monitoring_needed: true`, filtering by `domain` when a domain-scoped scan is requested. One REGISTRY per organisation is typical; multiple REGISTRY files are valid and all are queried.

**Domain vocabulary for `regulatory_source` rows.**

| Value | Scope |
|---|---|
| `data_protection` | Personal-data and privacy frameworks — data-subject rights, lawful basis, controller/processor duties (e.g. GDPR, national GDPR implementations). |
| `cybersecurity` | Security controls, operational resilience, and breach-notification regimes (e.g. NIS2, DORA, Cyber Resilience Act). |
| `data_governance` | Data-lifecycle, data-sharing, and stewardship frameworks where data is an asset governed across parties (e.g. EU Data Governance Act, Open Data Directive). |
| `data_residency` | Data-localisation and cross-border transfer restrictions where the physical or jurisdictional location of processing is constrained (e.g. national localisation laws; GDPR Chapter V where the cross-border angle is primary). |
| `product_regulation` | Regulations governing the design, safety, and conformity of products and services (e.g. EU AI Act, Medical Device Regulation, Radio Equipment Directive). |

Inline shape: no view spec in v1 — a registry is a content element, authored directly as the element file. A render-able "what are we watching / what changed" view is a separate report-configuration concern (out of scope here).

### 7.21 `STEP` — `02_business/steps/` (promoted; contained-in-`PROCESS` in v1)

A process-flow **step** — a single node (task / event / gateway) in a `PROCESS` element's `flow.steps[]` (§7.5). A step's **definition home is the `PROCESS` element**, where it is authored inline and is canonical **by containment**: the PROCESS carries the single admission record and lifecycle, and the step is addressable by its `STEP-…` id (the worked example `PROCESS-ORD-FULFILL-1` already authors `STEP-ORD-FULFILL-1…7`). This subsection defines the **standalone element-file shape** a step takes **when promoted**, so promotion is mechanical, not a redesign (§4.1).

**When it promotes.** Only when a *second* document first references the step (§1 promotion rule): a step-level `CHANGE` (§7.3), a `RULE.applies_to`, an `ACTION` realising it, or an `ASSERTION` (`subject` / `realised_via`). Until then there is no `STEP` element file — the step lives only in its PROCESS. The trigger fired in the regulatory-intelligence build (stage/task-level compliance impact expressed via `ASSERTION` → flow-step ids), which moved this TYPE from reserved to registered.

**Standalone fields** (mirror the inline `flow.steps[]` shape of §7.5; the envelope is §3):

| Field | Required | Type | Semantics |
|---|---|---|---|
| `type` | **yes** | string | The node kind — one of the seven flow node types `startEvent` \| `endEvent` \| `task` \| `userTask` \| `serviceTask` \| `exclusiveGateway` \| `parallelGateway` (§7.5, [views/01-bpmn.md](views/01-bpmn.md)). Carries the subtype; the element TYPE is `STEP`. |
| `process` | **yes** | string | `PROCESS-…` this step belongs to — the container it was promoted out of. Singular ref ([IDS_AND_REFERENCES.md](IDS_AND_REFERENCES.md) §5); a promoted step must name its home process. |
| `name` | task / gateway: **yes**; event: optional | string | The step label, per §7.5. |
| `performed_by` | recommended | string | `ROLE-…` / `ACTOR-…` — the lane the step runs in (a `participant` of the process), per §7.5. |
| `supported_by_application` | no | string | `APPLICATION-…` supporting the step, per §7.5. |

**Promotion is mechanical:**

1. Create `02_business/steps/<STEP-id>.yaml` with the §3 envelope and the fields above, copying `type` / `name` / `performed_by` / `supported_by_application` from the step's `flow.steps[]` entry. Set `process:` to the home `PROCESS-…`; default `valid_from` to the process's `valid_from`.
2. In the PROCESS element, reduce that `flow.steps[]` entry to a **reference** — `{ id: <STEP-id> }`. Its attributes now live in the standalone file (no duplication, no drift).
3. Leave `flow.sequence` untouched — the graph **edges** are process-owned and keep referencing the step by id.
4. The id is **unchanged** by promotion (no rename); every existing reference keeps resolving.

**Reconstruction invariant holds (§1.1).** The process behaviour stays fully reconstructable from `canon/elements/`: graph **nodes** resolve via the promoted `STEP` files (exactly as `participants` and `supported_by_application` already resolve by reference), graph **edges** stay in `PROCESS.flow.sequence`. A renderer that needs a node's kind or label loads the `STEP` file, the same way it loads any referenced element.

No view spec — a step is a content element, authored inline in its PROCESS and (on promotion) materialised as the file above. **No promoted steps exist in the worked-example org yet**: its assertions' `realised_via` target `PROCESS` / `CAPABILITY` / `INTERNAL_STANDARD`, not steps, so every step remains canonical-by-containment in `PROCESS-ORD-FULFILL-1`. The `02_business/steps/` folder documents the shape and skeleton for when promotion first fires.

### 7.22 `LOCATION` — `02_business/locations/`

A physical or virtual **place** where actors operate (ArchiMate Location). A location is the referent for `located_at` relations from `ACTOR(person|business_unit)` to a named, addressable place. Catalogue spec: [elements/21-locations.md](elements/21-locations.md).

**Required fields** (beyond the §3 envelope): `notation: location`, `type` (controlled vocabulary).

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Fixed value `location`. |
| `type` | yes | string | `country` \| `region` \| `city` \| `site` \| `office` \| `virtual`. |
| `address` | no | string | Postal address — free text. |
| `country_code` | no | string | ISO 3166-1 alpha-2. |
| `timezone` | no | string | IANA timezone string. |
| `parent` | no | string | `LOCATION-…` — enclosing location. Inline; not time-aware. |

**Relations:** `located_at` (`ACTOR(person|business_unit)` → `LOCATION`) is the only first-class relation kind; always a REL file, never inline. See [elements/17-relations.md](elements/17-relations.md) §3.

### 7.23 `BUSINESS_SERVICE` — `02_business/business-services/`

The externally visible behaviour a business unit or role makes available to its environment (ArchiMate Business Service §8.3.4). A business service is the *what is offered*, not the *how it is delivered*. The underlying process or capability that delivers the service is linked via the `realizes` relation; the unit or role that provides it is linked via the `offers` relation ([elements/17-relations.md](elements/17-relations.md) §3). Full spec: [elements/25-business-services.md](elements/25-business-services.md).

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Fixed value `business-service`. |
| `type` | yes | string | `internal` \| `external` \| `shared` — the service visibility discriminator. |
| `description` | recommended | string | What the service offers and to whom. |
| `offering_unit` | recommended | string | `ACTOR(business_unit)-…` or `ROLE-…` — the primary unit or role that offers this service (inline, for stable ownership; use the `offers` REL kind for time-aware tracking). |
| `capability` | no | string | `CAPABILITY-…` — the capability this service realizes (inline, for stable realizations; use the `realizes` REL kind for time-aware tracking). |
| `owner_role` | no | string | `ROLE-…` accountable for the service governance. |

**Relations:** `offers` (`ACTOR(business_unit)` or `ROLE` → `BUSINESS_SERVICE`) and `realizes` (`BUSINESS_SERVICE` → `CAPABILITY`) are first-class time-aware relation kinds ([elements/17-relations.md](elements/17-relations.md) §3). The inline `offering_unit` and `capability` fields are sufficient for stable links; move to REL files when the offering unit or realized capability changes.

### 7.24 `NODE` — `04_technology/nodes/`

An infrastructure substrate — the physical or virtual compute, network, or storage resource that hosts technology services (ArchiMate Technology Node §9.3.1). A NODE is the *where things run*; a `TECHNOLOGY_SERVICE` (§7.25) is the *platform capability that runs on it*. Full spec: [elements/25-nodes.md](elements/25-nodes.md).

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Fixed value `node`. |
| `type` | yes | string | `server` \| `cloud_instance` \| `container_platform` \| `database_server` \| `network_device`. |
| `description` | recommended | string | What the node is and what it hosts. |
| `provider` | no | string | Cloud or hosting provider (e.g. `"AWS"`, `"on-premises"`). |
| `region` | no | string | Data-centre or cloud-region identifier. |

**Relations:** `hosts` (`NODE` → `TECHNOLOGY_SERVICE`) is the primary first-class relation kind ([elements/17-relations.md](elements/17-relations.md) §3). Declared on the NODE side.

### 7.25 `TECHNOLOGY_SERVICE` — `04_technology/services/`

A platform-level service exposed by a NODE or group of NODEs to the application layer (ArchiMate Technology Service §9.3.3). Examples: Kafka cluster (event streaming), S3-compatible object storage, managed database, API gateway. Full spec: [elements/26-technology-services.md](elements/26-technology-services.md).

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Fixed value `technology-service`. |
| `type` | yes | string | `messaging` \| `storage` \| `api_gateway` \| `database` \| `compute`. |
| `description` | recommended | string | What the service offers and how it is used. |
| `node` | recommended | string | `NODE-…` — the primary hosting node (inline for stable single-host case; use the `hosts` REL for migration history). |
| `endpoint` | no | string | Connection string or base URL. |

**Relations:** `uses` (`APPLICATION` → `TECHNOLOGY_SERVICE`) records application-layer consumption; `hosts` (`NODE` → `TECHNOLOGY_SERVICE`) records infrastructure hosting. Both are first-class relation kinds ([elements/17-relations.md](elements/17-relations.md) §3). The `APPLICATION` side may also carry a `technology_services[]` inline field in a future additive revision.

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
| `ELEM-004` | error | Reserved / retired — `EQUIPMENT` and `INFORMATION_ENTITY` are no longer view-defined (ADR 2026-06-08). Use `EQUIP-001` / `BOBJ-001` for placement checks on these TYPEs. |
| `EQUIP-001` | error | An `EQUIPMENT` element file is not located under its mandated `canon/elements/04_technology/equipment/` folder (§4). |
| `BOBJ-001` | error | A `BUSINESS_OBJECT` element file is not located under its mandated `canon/elements/02_business/business-objects/` folder (§4). |
| `BOBJ-D001` | warning | An element candidate carries `element_type: INFORMATION_ENTITY` or an `INFORMATION_ENTITY-…` id prefix — the deprecated alias for `BUSINESS_OBJECT`. The validator flags it and continues; hard error in the following release. Rename `element_type` to `BUSINESS_OBJECT`, update the id prefix, and rename `information_entities[]` → `business_objects[]` in blueprints. |
| `ELEM-005` | warning | A `standalone` element carries inline a field declared `time_varying` (§7) or a cross-reference of a kind declared first-class time-aware ([elements/17](elements/17-relations.md)) — it belongs in the sidecar (`VERSIONED-004`) or a `REL-…` file (`REL-004`) respectively. Surfaced here for discoverability; the authoritative codes are `VERSIONED-004` / `REL-004`. |
| `ELEM-ALIAS-001` | error | An element's `aliases[]` entry collides (case-insensitively, trimmed) with another element's `name` or another element's `aliases[]` entry in the same `canon/` catalogue. A **cross-catalogue** gate — distinct from the per-file `ELEM-*` checks above, it requires scanning the whole catalogue. Ambiguous surface forms make F8 cross-source entity resolution unreliable, so a collision is a hard error at canon admission. A value shared with the element's *own* `name`/aliases is not a collision. (Per the element-aliases architecture decision; §3 `aliases` field.) |
| `INT-001` | error | An `INTEGRATION` element carries `interface_semantics: true` but is missing one or more of the conditionally required fields: `protocol`, `payload_class`, `sensitivity`, `directionality`. When `interface_semantics: true`, all four must be present in addition to the always-required `source` and `target`. |
| `INT-002` | error | An `INTEGRATION` element carries `interface_semantics: true` but `source` or `target` does not resolve to an admitted `APPLICATION-…` element. Interface-semantics INTEGRATION endpoints must both be application-layer elements (§7.8.1). |
| `INT-003` | error | `sensitivity` is not one of `public`, `internal`, `confidential`, `restricted`. |
| `INT-004` | error | `directionality` is not one of `producer`, `consumer`, `request_reply`, `bidirectional_stream`. |
| `LOC-001` | error | A `LOCATION` element is missing `id`, `name`, `type`, or any required envelope field; or `id` does not match `LOCATION-[<middle>-]<INTEGER>`. |
| `LOC-002` | error | `type` is not one of `country`, `region`, `city`, `site`, `office`, `virtual`. |
| `LOC-003` | error | `parent` present but does not resolve to an admitted `LOCATION` in canon. |
| `ELEM-FORMER-ID-001` | error | A `former_ids[]` entry matches the live `id` of any element in the catalogue, or matches a `former_ids[]` entry of another element. Either collision makes link resolution ambiguous — the resolver cannot determine which element a `from:`/`to:` value maps to. A **cross-catalogue** gate requiring a full catalogue scan. Resolve by removing the stale `former_id` after completing the relation-file sweep (Phase 2 of the migration pattern — [CONTRACT.md](CONTRACT.md) §7.4). |
| `BSV-001` | error | A `BUSINESS_SERVICE` element is missing `id`, `name`, `type`, or any required envelope field; or `id` does not match `BUSINESS_SERVICE-[<middle>-]<INTEGER>`. |
| `BSV-002` | error | `type` is not one of `internal`, `external`, `shared`. |
| `BSV-003` | error | `offering_unit` is present but does not resolve to an admitted `ACTOR(business_unit)` or `ROLE` in canon. |
| `BSV-004` | error | `capability` is present but does not resolve to an admitted `CAPABILITY` in canon. |
| `REG-001` | error | A `REGISTRY` row of `type: regulatory_source` carries a `codex_id` whose linked codex artefact's `source_url` differs from the row's `source_url`. A **cross-artefact** gate (REGISTRY row ↔ codex zone): once a source is admitted as a codex artefact the codex `source_url` is the authoritative watch target, so a divergent row URL is a source-of-truth conflict. Resolve by aligning the row to the codex artefact (codex is authoritative from admission). A row without `codex_id` (not yet admitted) is out of scope — its `source_url` is the live harvesting target. (Per the codex/registry monitoring source-of-truth architecture decision; §7.20 `codex_id` field.) |
| `NOD-001` | error | A `NODE` element is missing `id`, `name`, `type`, or any required envelope field; or `id` does not match `NODE-[<middle>-]<INTEGER>`. |
| `NOD-002` | error | `type` is not one of `server`, `cloud_instance`, `container_platform`, `database_server`, `network_device`. |
| `TSVC-001` | error | A `TECHNOLOGY_SERVICE` element is missing `id`, `name`, `type`, or any required envelope field; or `id` does not match `TECHNOLOGY_SERVICE-[<middle>-]<INTEGER>`. |
| `TSVC-002` | error | `type` is not one of `messaging`, `storage`, `api_gateway`, `database`, `compute`. |
| `TSVC-003` | error | `node` is present but does not resolve to an admitted `NODE` in canon. |

---

## 10. Migration and follow-ups

Backfill for existing canon files and downstream tasks. Each is a **separate PR** (one concern per commit).

- **F-1 — reconcile `.templates/elements/*_template.yaml`** to the §3 envelope: canonical IDs, `notation:` headers, admission + lifecycle blocks, `type:` for subtype only, dropped `metadata`/`properties` wrappers, one template per element TYPE (or one annotated template per layer). Touches `organizations/acme_corp/`. (§5.)
- **F-2 — backfill `notation:` + `type:`-as-subtype on the `CONSTRAINT` / `RULE` worked examples.** `CONSTRAINT-GDPR-RESIDENCY-1` and `RULE-DUAL-APPROVAL-1` currently carry `type: constraint` / `type: rule` (TYPE repeated) and no `notation:` header — they pre-date the header contract. Add `notation: constraint` / `notation: rule` and drop or re-purpose `type:`. (§3, §7.12–7.13.)
- **F-3 — migrate REQUIREMENT `title` → `name`.** Decided: `name` is the single canonical label field, no aliases (§3). [elements/15-requirement.md](elements/15-requirement.md) and the worked-example requirement files migrate via a trivial codemod (`s/^title:/name:/` over `canon/elements/01_motivation/requirements/*.yaml`, plus the field row in the spec). The transform lands in a methodology migration recipe (0.5 → 0.6, or pulled forward into 0.4 → 0.5 if that recipe is still open before tag).
- **F-4 — acme_corp worked examples** for the newly-schema'd TYPEs (`DRIVER`, `GOAL`, `CHANGE`, `ACTION`, `PROCESS`, `PRODUCT`, `APPLICATION`, `ROLE`) plus per-folder READMEs, created alongside the elements-population wave that surfaced this task. (`ACTOR` examples ship with the Actors notation.)
- **F-5 — declare `time_varying` fields per notation** (capability `current_maturity`/`owner_role`/`target_date`; application `lifecycle_stage`/`vendor`/`owner_role`/`maturity`) in the respective specs, completing the [CONTRACT.md](CONTRACT.md) §9.4 candidate list.

---

## 11. References

- ID grammar, TYPE registry, uniqueness scope, cross-references: [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md).
- Shared header, zone model, admission record, primitive lifecycle, versioned-attribute sidecar: [`CONTRACT.md`](CONTRACT.md) §1–2, §5–7, §9.
- Element notations (specialised instances of this envelope): [`elements/14-codex.md`](elements/14-codex.md), [`elements/15-requirement.md`](elements/15-requirement.md), [`elements/16-assertion.md`](elements/16-assertion.md), [`elements/17-relations.md`](elements/17-relations.md).
- Capability element fields: [`views/05-capability-map.md`](views/05-capability-map.md) §13. Strategy-chain inline shapes: [`views/02-dgca.md`](views/02-dgca.md), [`views/04-goals.md`](views/04-goals.md), [`views/07-action.md`](views/07-action.md).
- Notation catalogue and the views/elements split: [`README.md`](README.md).
