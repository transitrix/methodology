# Core methodology source excerpts

Contract revision: `888c03d33c2d899ec85a612901075b67811614e5`, merged into methodology main on 2026-10-23.
The correction is not yet included in a tagged methodology release. These
excerpts retain the wording at that revision, including its review-time status.
They are reference text, not a second independent specification.

Sources: [capability map](https://github.com/transitrix/methodology/blob/888c03d33c2d899ec85a612901075b67811614e5/notations/views/diagrams/05-capability-map.md),
[applications](https://github.com/transitrix/methodology/blob/888c03d33c2d899ec85a612901075b67811614e5/notations/views/diagrams/10-applications.md).

## 6a. Management-cycle stage and tags

A capability MAY carry `management_cycle_stage`, an optional classification
independent of architectural `layer`, decomposition, V/H orientation, maturity
and application mappings. It belongs on the canonical capability element, not
inside view configuration or an `extensions` bag. Canonical `layer` remains
`business`. Omitted or null means not classified; it does not imply an absent
ability or an incomplete domain.

The controlled values and display order are:

| Value | PDCA + Learn correspondence | Capability contribution |
| --- | --- | --- |
| `Strategic` | Act and strategic Plan | Choose direction, strategic goals, priorities and significant organisational improvements; strategic planning |
| `Learning` | Learn, the explicit addition to PDCA | Research, reflection, knowledge capture and sharing, learning and competence development |
| `Planning` | Tactical and operational Plan | Budgets, capacity, resources, scheduling and executable operational plans |
| `Execution` | Do | Perform the domain's work, including operational master-data maintenance |
| `Assurance` | Check | Monitor outcomes, quality, deviations, controls and compliance |

Strategic planning belongs to Strategic; tactical/operational planning belongs
to Planning. Classify by decision scope and represented ability, not the word
"planning" or a time horizon alone. The order is a layout convention, not a
process sequence. Local improvement can occur in every domain. A composite L1
can remain unclassified while its children occupy several stages.

Stages MUST NOT inherit from parents, tags, names, maturity or orientation.
Changing a stage requires an explicit source-model change. Dated views must not
apply a later classification retroactively when no historical source is supplied.
This field does not by itself introduce a new sidecar series.

`tags` remains the common free-form classifier array. ESG, MDM and Support are
tag values, never management stages. ESG/MDM describe subject affiliation;
Support describes a supporting role and does not automatically change the
capability's `type`. A tag does not create, remove or imply an H capability or
intersection. Actual horizontal capabilities retain their identity, hierarchy,
maturity and explicit application mappings. Tags MUST NOT inherit.

```yaml
# Fragment of a capability element; admission/lifecycle omitted.
notation: capability
id: CAPABILITY-H1.2.1
name: Customer data quality control
layer: business
management_cycle_stage: Assurance
tags: [MDM, Support]
```

A layer or tag is a source fact; whether/how to show it is view configuration
(§16). Missing classification remains visible as Not specified when grouping;
it is not silently assigned a stage. Unknown authored stage values are invalid.

---

## 16. System coverage, dated views and presentation defaults

### 16.1 Explicit coverage

An application's direct `capabilities` list and its technical inventory's
explicit capability lists ([applications catalogue §6a](https://github.com/transitrix/methodology/blob/888c03d33c2d899ec85a612901075b67811614e5/notations/views/diagrams/10-applications.md#6a-technical-capabilities-and-business-coverage))
are separate evidence paths to business capabilities. A projection MUST declare
its direct-link source and retain both paths in provenance. Conflicting inverse
lists require reconciliation, not union by assumption. Parent/child, tag and
stage classifications do not imply support. Missing mappings mean not specified,
not unsupported, absent or zero coverage. Several links from one application
count once when collecting that application's target set.

A system polygon encloses its selected visible targets. Connecting empty space,
shape and area do not add mappings or express a coverage percentage. Colored
polygons may mask unrelated boxes. Shape is either an axis-aligned bounding
rectangle or an angled enclosing hull; rounding is independent. Small margins
must not create decorative overlap between neighboring domains.

Red overlap outlines the boundary of the region inside **at least two selected
outer system polygons**: `R = union over i < j of (P_i intersection P_j)`.
Use the selected rounded/rectangular/angled shape. Ignore box cut-out masks for
this boundary; they must not introduce steps around nested capability boxes.
A triple overlap has no internal pairwise seams; disjoint components have
separate closed contours. Point/edge contact with zero area is not a region.
This is a geometric diagnostic, not proof of equivalent functions, unnecessary
duplication, measured adequacy or a recommendation to retire a system.

### 16.2 State on a date

Keep selected model-validity date, evidence/snapshot date, source revision and
observed-versus-planned intent distinct. Resolve capability/parent lifetimes and
current/target maturity from the canonical lifecycle, relation and sidecar
contracts; do not replace them with a renderer's date conventions. A target
state is planned composition, never an observed outcome because its date passed.

A renderer using full snapshot inputs must identify them as projections and
preserve source revision and evidence date. Dated snapshot windows must have
explicit boundaries; overlapping alternatives require separate scenario
selection. Gaps mean unknown/no supplied state and must not retain a stale map
for export. Missing history cannot be reconstructed by interpolation or copying
current support into a future target. If a source has no dated coverage history,
disclose snapshot-based coverage instead of asserting historical accuracy.

The standalone HTML adapter uses exclusive snapshot-period ends and inclusive
record lifetime ends. An adapter MUST state and test its conversion from the
source contract; no universal reinterpretation of canonical `valid_to` is made.
Future targets, snapshot projections and date gaps must remain visible in the
rendered context. A descriptive horizon is never parsed into a calendar date.

### 16.3 view_config defaults

These keys are declared by this notation under the shared view-config contract.
They contain presentation choices only; all stages, tags, mappings and dated
assessments stay in source elements/relations/sidecars.

```yaml
view_config:
  valid_at: null                 # use capability_map.assessment_date
  scenario: null                 # optional explicit TARGET_STATE reference; null is no target selection
  management_cycle:
    group: false
    order: [Strategic, Learning, Planning, Execution, Assurance]
  tags:
    filter: []                   # all tags; nonempty values select direct matches (OR)
    show: true
  display:
    depth: 3                     # 1, 2 or 3
    backlog: false
    maturity: false
    legend: true
  systems:
    highlight: null              # optional APPLICATION reference
    labels: false
    coverage: false
    selected: []                 # explicit APPLICATION references; empty means no polygons
    shape: angled                # angled or rectangular
    rounded: false
    overlap: false               # effective only with coverage and two selected systems
```

Stage order is fixed to §6a. Tag filters retain direct matches and the muted
parent/domain/lane context required to read them; context does not inherit tags.
Grouping creates only occupied stage zones behind elements, plus missing-value
diagnostics. It must preserve L1/L2/L3 containment and explicit H/V intersections.
Visibility of a layer never depends on the existence of an H capability.

The maturity legend uses samples matching actual rendered box styles and the
canonical 1–5 scale in CONTRACT §9.4. A legacy adapter may additionally show an
explicit 0 No capability absence diagnostic, clearly distinguished from the
canonical scale; missing maturity is not 0. Hiding Maturity or Legend removes
that key and its reserved space. A general legend explains only enabled modes.
SVG exports the exact selected view, its legend and provenance. Zoom and hiding
controls affect the HTML viewport, not the model or native SVG coordinates.
Display filters are not access controls or redaction.

### 16.4 Compatibility and implementation status

The §6a/§16 additions and APPLICATION technical inventory are a core-methodology
correction prepared for review, not an optional extension profile. Existing
architectural layer, common tags, lifecycle and maturity contracts are retained.
No new globally addressable technical-capability TYPE is introduced.

The standalone renderer currently consumes adapter JSON, not canonical YAML.
It maps management_cycle_stage to its legacy JSON layer field. Its HTML pilot
selection and direct-SVG backlog/all-system defaults must be overridden when
projecting the canonical defaults above. Its bounded ESG/MDM/Support tag menu
is a subset of the common free-form tags, which must remain in the source.

The machine-readable [additive field schema](https://github.com/transitrix/methodology/blob/888c03d33c2d899ec85a612901075b67811614e5/notations/schemas/capability-map-contract.schema.json)
exposes `capabilityFields`, `applicationFields` and `viewConfig` definitions;
it does not replace the full element/view envelope. `tools/lint.py` implements
these structural checks without a new runtime dependency, application-local key
uniqueness, technical mapping references/lifetimes and view selection references.
It checks canonical elements and native files under `views/`, preserving the
single-file onboarding installation. It does not resolve assessments/history,
render coverage geometry or prove evidence truth. Existing direct APPLICATION
mapping checks remain the consuming validator's responsibility; the new
technical inventory cannot use that legacy boundary to skip its own references.

Released CLI, DSM and Studio adoption and a methodology release must still be
verified separately before claiming product support. The [compatibility check](https://github.com/transitrix/methodology/blob/888c03d33c2d899ec85a612901075b67811614e5/guides/capability-map-compatibility.md) records
which fields the released CLI actually checks; acceptance with skipped checks
is not evidence of adoption. Until that adoption, a
consumer must report unsupported fields/settings rather than silently dropping
them. Existing `extensions.management_cycle_stage` proposals migrate explicitly
to the defined field; conflicting values require reconciliation, and history is
preserved. Core view keys are no longer to be documented as arbitrary extension
keys. The methodology version pin changes only through the release procedure.

---

## 6a. Technical capabilities and business coverage

An APPLICATION MAY contain `technical_capabilities`, the named technical
abilities it supplies to support business capabilities. The inventory belongs
on the canonical application element. Its evidence and admission are owned by
the application, not authored only inside a capability-map view.

Each entry is canonical by containment, with an application-local identity.
It is not a new standalone TYPE or REL kind and must not masquerade as an
independently admitted global element. Identify an entry in its owning application projection by application ID
and local key together. This does not grant independent cross-model reference
semantics or bypass the common promotion rule. Separate technical systems do not share a local key's
identity, even if the text matches.

| Entry field | Required | Meaning |
| --- | --- | --- |
| `key` | yes | Nonempty string unique within the application |
| `name` | yes | Source-evidenced technical ability |
| `capabilities` | no | Distinct canonical business CAPABILITY references; default empty means not specified |
| `valid_from`, `valid_to` | no | Optional explicit lifetime using the shared primitive lifecycle boundary semantics; omitted bounds are open within the owning application's lifecycle |

```yaml
# Fragment of an APPLICATION element; common envelope omitted.
id: APPLICATION-CRM-1
capabilities: [CAPABILITY-V2]
technical_capabilities:
  - key: customer-data-validation
    name: Customer data validation
    capabilities: [CAPABILITY-H1.2.1]
    valid_from: "2026-10-01"
    valid_to: null
```

Direct application mappings and technical-entry mappings retain their separate
provenance. Their union is the application's business target set for a coverage
view; no parent/child inheritance is implied. All references must resolve before
view filtering. Duplicate keys, duplicate targets, missing required names/keys
and unknown targets are invalid. Missing inventory or an empty mapping does not
prove absent technical ability or unsupported business capability.

An entry's effective lifetime is the intersection of its open/explicit bounds
and the application's lifecycle. Explicit bounds outside the owner lifetime or
an end before its start are invalid; a missing bound does not require inventing
an earlier history.

A dated coverage view includes only explicitly active applications and inventory
entries. It does not recover mapping histories from today's lists. Source
snapshot/scenario intent and missing history must be disclosed as required by
[capability-map §16](https://github.com/transitrix/methodology/blob/888c03d33c2d899ec85a612901075b67811614e5/notations/views/diagrams/05-capability-map.md#16-system-coverage-dated-views-and-presentation-defaults).
Changes to existing direct-list history remain subject to the existing relation
migration contract; this field does not silently create a new temporal REL kind.
The standalone JSON renderer maps each local key to technical entry `id`; source
`valid_from`/`valid_to` require an explicit endpoint conversion to its inclusive
`start_date`/`end_date`. The defined source field is not an `extensions` field.

The additive schema and whole-model reference checks ship with the methodology
([capability-map §16.4](https://github.com/transitrix/methodology/blob/888c03d33c2d899ec85a612901075b67811614e5/notations/views/diagrams/05-capability-map.md#164-compatibility-and-implementation-status)).
Released CLI/DSM/Studio adoption must still be verified independently.

---
