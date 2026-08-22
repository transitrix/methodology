---
title: "Relations — first-class time-aware links"
version: "0.2"
author: "Valerii Korobeinikov"
last_updated: "2026-08-22"
status: "draft"
---

# Relations — Reference

**Scope:** The `REL` element type — first-class **time-aware relations** between two canonical primitives. A relation file records that *primitive A is in relation X with primitive B during a defined window*. The shared header / zone / admission / lifecycle / sidecar contracts are defined in [CONTRACT.md](../CONTRACT.md); the TYPE registry sits in [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1.

Relations are canon-zone artefacts that live in a **flat folder** at the canon-zone root: `canon/relations/`. Each relation is a single YAML file named by its canonical ID, carrying the admission record ([CONTRACT.md](../CONTRACT.md) §6, `zone: canon`), the primitive lifecycle ([CONTRACT.md](../CONTRACT.md) §7), and the relation-specific frontmatter below.

---

## 1. What a relation is

A relation is a directed link from a `from` primitive to a `to` primitive, tagged with a `type` that names the kind of link. A relation has its **own lifecycle** (`valid_from` / `valid_to`): the link is in effect for the window the relation file declares, independently of the lifecycles of either endpoint.

This is the difference from inline cross-references: an inline reference field (`activity.goals: [GOAL-…]`) is timeless within its host file — it asserts the link exists for the host's entire lifetime. A first-class relation records *when the link itself took effect and when it ended*. A capability re-parented in 2026, an activity re-aimed at a different goal in mid-stream, a CRM application that started supporting a new capability — these are temporal events that lose information when inlined.

The choice between **inline** and **first-class** is per relation-kind, declared in each notation spec. Not every relation needs to be first-class; only those where the temporal dimension matters.

---

## 2. Frontmatter — canonical schema

```yaml
notation: relation
id: REL-CAP-V1-PARENT-1
type: parent                            # required; from the closed enum in §3
from: CAPABILITY-V1.1                   # required; the dependent / child / source primitive
to: CAPABILITY-V1                       # required; the target / parent / destination primitive

# Admission record (CONTRACT.md §6)
zone: canon
admitted_at: "2026-05-28"
admitted_by: "v.korobeinikov"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

# Primitive lifecycle (CONTRACT.md §7) — the relation's own window
valid_from: "2024-01-01"
valid_to: null
```

| Field | Required | Type | Semantics |
|---|---|---|---|
| `notation` | yes | string | Fixed value `relation`. |
| `id` | yes | string | Canonical ID per [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §1: `REL-[<middle>-]<INTEGER>`. |
| `type` | yes | string | One of the closed enum values in §3. The enum is closed for a given methodology release; new kinds land as additive MINOR revisions (see §3). |
| `from` | yes | string | Typed canonical ID of the relation's source / dependent / child primitive. Must resolve to an admitted primitive in canon (`REL-002`). |
| `to` | yes | string | Typed canonical ID of the relation's target / parent / destination primitive. Must resolve to an admitted primitive in canon (`REL-002`). |
| `zone` | yes | string | Always `canon` for REL — see [CONTRACT.md](../CONTRACT.md) §6. |
| `admitted_at` | yes | string | Date admitted to canon — quoted ISO 8601 per [CONTRACT.md](../CONTRACT.md) §4. |
| `admitted_by` | yes | string | Person handle or tool ID that ran the admission gate. |
| `gate_checks` | yes | map | Standard canon checks (`uniqueness`, `consistency`, `completeness`). |
| `valid_from` | yes | string | Date the relation took effect — quoted ISO 8601 per [CONTRACT.md](../CONTRACT.md) §7. |
| `valid_to` | yes | string \| null | Date the relation ceased to be in effect, or `null` if still in effect — see [CONTRACT.md](../CONTRACT.md) §7. |

---

## 3. Relation `type` enum

The enum is **closed** in v1. Each value names a specific kind of link between two primitive types; the validator enforces both the enum membership and (when the catalogue is loaded) the endpoint TYPE constraints.

| `type` | Direction (from → to) | Endpoint TYPEs | Semantics |
|---|---|---|---|
| `parent` | child → parent | `CAPABILITY` → `CAPABILITY` (V/H sub-grammar applies) | Child capability sits under its parent in the capability hierarchy. Re-parenting a capability — a re-org or a capability split — produces a new relation with its own window. |
| `goal_parent` | child → parent | `GOAL` → `GOAL` | A goal's place under another goal in the Goals tree. A goal re-parented mid-stream (a tactical goal moved to a different strategic goal) produces a new relation. The relation is M:N at the machinery level — a child goal may carry several concurrent `goal_parent` relations (one REL file per parent), which is how the deferred goal→goal multi-parent DAG is expressed. |
| `target_state_satisfies_goal` | target_state → goal | `TARGET_STATE` → `GOAL` | A target state satisfies a goal — the structural snapshot reaches the intent. **M:N**: one target state may satisfy several goals (the bundle of intents the state reaches), and one goal is reachable by several target states (alternative solution options the architect varies). Each (target_state, goal) pair is its own REL file; this is the same shared REL machinery as `goal_parent`'s multi-parent form, not a one-off mechanism. Optional `degree` attribute on the REL file: closed vocabulary `partial` \| `full` (default `full` when omitted) — the completeness with which the state satisfies the goal. A target state re-framed to satisfy a different goal mix mid-stream produces a new REL file; the old one ends with `valid_to` set. |
| `assessment_influences_goal` | assessment → goal | `ASSESSMENT` → `GOAL` | An assessment (a dated finding about a `DRIVER`) influences a goal — the polarity edge of the ArchiMate motivation chain *Driver → Assessment → influences(±) → Goal*. **All polarity in the motivation model lives here**, not on the assessment node (the assessment records *what is*, this REL records *how it bears on this specific intent*). **M:N**: one assessment may bear on several goals, with opposite signs (one finding can support goal A and threaten goal B — SWOT is goal-relative), and one goal is influenced by many assessments. Required `sign` attribute on the REL file: closed vocabulary `positive` \| `negative` — the direction of the influence (DSM's up/down arrows on goals). Optional `magnitude` attribute: closed vocabulary `low` \| `medium` \| `high` — the strength of the influence; omit when unknown. Each (assessment, goal) pair is its own REL file; same shared REL machinery as `goal_parent`'s multi-parent form and `target_state_satisfies_goal`, not a one-off mechanism. A finding that ceases to bear on a goal (the goal retires, or re-measurement reverses the sign) ends with `valid_to` set; a new REL file carries the new sign. |
| `action_goal` | action → goal | `ACTION` → `GOAL` | An action serves a goal. An action re-aimed mid-stream produces a new relation. **Deprecated alias:** `activity_goal` (accepted with `ACTION-005` warning). |
| `unit_parent` | child → parent | `ACTOR(business_unit)` → `ACTOR(business_unit)` | Organisational re-parenting — a business-unit actor moved under a different parent unit. (Was `UNIT → UNIT` before the 2026-05-29 Actors decision folded `UNIT` into `ACTOR`.) |
| `employment` | person → org | `ACTOR(person)` → `ACTOR(business_unit)` | Employment of a person by a unit / organisation. Time-aware (the employment window); carries the most attributes of the engagement kinds — `contract_type`, role assignments (`roles: [ROLE-…]`). |
| `candidacy` | person → org | `ACTOR(person)` → `ACTOR(business_unit)` | A person under evaluation (pre-hire). Carries `stage`, `source`. |
| `alumni_membership` | person → org | `ACTOR(person)` → `ACTOR(business_unit)` | A former employee's continuing relationship; may reference the prior `employment`. |
| `community_membership` | person → community | `ACTOR(person)` → `ACTOR(business_unit)` | Membership of a community modelled as a `business_unit` actor (e.g. an open-source community, a user group). |
| `contracting` | contractor → org | `ACTOR(person\|business_unit)` → `ACTOR(business_unit)` | A contracting relationship; carries `contract_terms`. |
| `located_at` | actor → place | `ACTOR(person\|business_unit)` → `LOCATION` | This actor's primary work location. For a `business_unit`, its primary registered location; for a `person`, their primary work base. Time-aware — a move produces a new REL file with `valid_to` set on the old one. Always a REL file; never inline on the actor. Studio alias: `unit_located_at` maps to this kind. |
| `stakeholding` | stakeholder → object | `STAKEHOLDER` → `GOAL` \| `ACTION` \| `CAPABILITY` | A stakeholder's stake in a specific object. Optional per-stake `concern` / `influence` on the relation. The `→ ACTION` form drives the Action Card stakeholders block; `→ GOAL` is the methodology form of DSM's `goal_stakeholder`. v0.1 targets `GOAL` / `ACTION` / `CAPABILITY` only. |
| `offers` | provider → service | `ACTOR(business_unit)` or `ROLE` → `BUSINESS_SERVICE` | A business unit or role offers a business service to its consumers. Time-aware — use a REL file when the offering unit changes (e.g. a service transferred between units during a reorganisation). For a stable offering unit, the inline `offering_unit` field on the `BUSINESS_SERVICE` element is sufficient; the first-class REL records the change event. |
| `realizes` | service → capability | `BUSINESS_SERVICE` → `CAPABILITY` | A business service realizes a capability — the service is the externally visible behaviour of the capability. Time-aware — use a REL file when the capability a service realizes changes (e.g. service scope expands after a technology uplift). For a stable realization, the inline `capability` field on the `BUSINESS_SERVICE` element is sufficient. |
| `hosts` | node → service | `NODE` → `TECHNOLOGY_SERVICE` | A node (or cluster of nodes) hosts a technology service. Time-aware — a service migrated to a new node produces a new REL file with `valid_to` on the old one. For a stable, single-host configuration, the inline `node` field on `TECHNOLOGY_SERVICE` is sufficient; the `hosts` REL kind records the change event. |
| `uses` | application → service | `APPLICATION` → `TECHNOLOGY_SERVICE` | An application consumes a technology service (e.g. publishes to a Kafka topic, reads from an object store). Time-aware — use a REL file when an application starts or stops consuming a given service (a dependency change). For stable long-running dependencies a future inline `technology_services[]` field on `APPLICATION` may be specified. |
| `depends_on` | dependent → presupposed | `REQUIREMENT` → `REQUIREMENT` | A conditional dependency between obligations: `from` presupposes `to` — the dependent obligation is not meaningful, or not satisfiable, unless the target holds. **Not** an order of work (implementation sequence stays with `ACTION` / `CHANGE`) and **not** decomposition (`parent` / the stated `requirement_parent` promotion path on [15-requirement.md](15-requirement.md) §2.4 stay separate). First-class rather than inline so the link carries `admitted_at` and content identity for the suspicion mechanism ([CONTRACT.md](../CONTRACT.md)). Endpoints stay narrow in v1 (`REQUIREMENT` only); the name is generic on purpose so a later widening (e.g. to `CONSTRAINT` / `NEED`) amends one kind instead of introducing a second. **M:N**: one requirement may depend on several others, and one may be depended on by several — each pair is its own REL file. |
| `required_for` | obligation → state | `REQUIREMENT` → `RELEASE` | The obligation `from` must hold in the release `to` — a **scope statement**, naming *in which state of the subject* the obligation applies, and nothing else. Binds an obligation to one shipped state of a `PRODUCT`/`APPLICATION` ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.29) instead of to the subject as a whole, so an obligation introduced at one release does not read as retroactively binding on every earlier one. **The boundary is load-bearing — it says nothing about who does the work, in what order, or by when; see §3.1.** Time-aware because scope moves: an obligation withdrawn from a release ends with `valid_to` set rather than having its REL file deleted. **M:N**: one requirement may be required for several releases, and one release carries many obligations — each pair is its own REL file. Endpoints stay narrow in v1 (`REQUIREMENT` → `RELEASE` only); a `CONSTRAINT` or `NEED` source is a later widening of this kind, not a second kind. |

| `introduced_in` | element → state | `INTEGRATION` \| `APPLICATION` → `RELEASE` | The element `from` is part of the subject's architecture **as of** the release `to`, and stays so in that release's successors until withdrawn — the descriptive counterpart to `required_for`'s obligation scope. It records the **attachment point**, never the whole set: "which elements are in release R" is derived by the same `predecessor` walk §3.2 uses for obligations (see §3.3). **It says nothing about whether the element is compliant, correct, or complete in that release** — that is an `ASSERTION`; see §3.3. Time-aware because architecture moves: an integration dropped from a line ends with `valid_to` set rather than having its REL file deleted. **M:N**: one element may be introduced in releases of more than one subject line, and one release carries many elements — each pair is its own REL file. Endpoints stay narrow in v1 (`INTEGRATION` / `APPLICATION` sources only); `TECHNOLOGY_SERVICE`, `NODE` and `CHANGE` sources are a later widening of this kind, not a second kind. |

Adding a new `type` value is an **additive** methodology revision (MINOR). A repository that uses none of the new kind validates unchanged. The incompatibility an adopter can hit is a *pinned* older validator meeting a kind it has never heard of — answered by the vendored tagged release, not by treating every enum extension as a breaking change.

**Engagement relations (`employment` / `candidacy` / `alumni_membership` / `community_membership` / `contracting`).** Decided 2026-05-29 (Actors): a `person` actor records *identity only*; every kind of engagement with the organisation is its own first-class, time-aware relation, so the same person can be a candidate, then an employee, then an alumnus over time without losing history, and can hold several engagements at once. Each engagement kind carries only the attributes that kind needs; the relation's own `valid_from`/`valid_to` is the engagement window.

**M:N relations are unified on the REL machinery.** Several kinds in v1 are intrinsically many-to-many — `goal_parent` (in its multi-parent DAG form), `target_state_satisfies_goal`, `assessment_influences_goal`, `stakeholding`, `depends_on`, and `required_for`. None of them get a special storage mechanism: each (from, to) pair is its own REL file, the validator distinguishes them only by the `type` value, and per-relation attributes (`degree`, `sign`, `magnitude`, `concern`, `influence`, `contract_type`, …) ride on the REL file itself. The §7 limit "one `from` and one `to` per REL file" applies uniformly; M:N is expressed by writing multiple REL files, not by allowing list-valued endpoints. This is a deliberate constraint: the validator, the catalogue loader, the lifecycle window check, and any temporal renderer all work the same way for every M:N kind. A future M:N kind (e.g. capability ↔ application "supports") fits the same machinery without a new mechanism.

**Interface-semantics INTEGRATION endpoint constraint (confirmation).** An `INTEGRATION` with `interface_semantics: true` ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.8.1) is an application-layer contract: both `source` and `target` MUST resolve to admitted `APPLICATION-…` elements. A `NODE`, `TECHNOLOGY_SERVICE`, or any non-application element as an endpoint is invalid (INT-002 in §9). The infrastructure carrying the interface — e.g. a Kafka cluster (`TECHNOLOGY_SERVICE`) — is linked to the source application via the `uses` relation, not by placing the TECHNOLOGY_SERVICE directly as the integration's `source` or `target`. This constraint is not a new relation kind; it is an endpoint-type restriction on an existing element variant.

**Out of the enum in v1, by deliberate decision:**

- **`applies_to` (Codex → Canon).** Retired entirely in the compliance epic ([14-codex.md](14-codex.md) §8) — bindings now live as REQUIREMENT.`derived_from` plus ASSERTION; no `applies_to` relation kind is needed.
- **Inline relations.** Each notation spec declares which of its relation kinds stay inline (timeless within their host file) versus which become first-class REL files. The per-notation declarations are added in subsequent Wave 3 PRs.
- **View-document inline cross-references.** A view document may include inline cross-references to canon primitives via documented fields (e.g. capability-map `business_process`, process-map `capability`, BPMN `performed_by_role` / `supported_by_application`), distinct from `REL` element files. Such references are subject to canon-existence validation (per the view's own validator codes) but are **not** subject to `REL-002`, because the referring endpoint (a view-local node or label) is not itself a canon primitive — the link is one-way, and canon never points back at a view-local label.

### 3.1 `required_for` — a scope statement, not a plan

`required_for` says **in which state of the subject an obligation must hold**. That is the whole of its meaning, and the readings it excludes are as much a part of the definition as the reading it carries:

- **It does not say who does the work.** No assignee, no owning unit, no team. Ownership of the work that makes an obligation hold is an `ACTION` concern.
- **It does not say in what order.** A release having three obligations implies nothing about which is addressed first. Sequence lives in `ACTION` / `CHANGE`, and in the schedule documents built on them.
- **It does not say by when.** The relation's `valid_from` / `valid_to` is the window during which *the scope statement itself* holds — the period over which this obligation is in scope for this release — never a due date, a target date, or a commitment. A release's own ship date is `RELEASE.released_at` ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.29), which this relation neither sets nor constrains.
- **It is not a plan, and a set of them is not a plan either.** "Everything required for release R" answers *what must be true of R*, not *what we intend to do about R*. A reader who wants the second question answered is asking about `ACTION` / `CHANGE`, and the model should send them there rather than let a scope statement stand in for a commitment it never made.

The distinction matters because a scope statement and a plan degrade differently. A scope statement that turns out wrong is a modelling correction — retire the relation, write a new one. A plan that turns out wrong is a delivery problem. Conflating them makes a compliance model look like a project plan, and makes a missed date look like a compliance failure.

This is the same boundary `depends_on` draws (a conditional dependency between statements, not an order of work); the two kinds sit either side of the obligation — `depends_on` says what an obligation rests on, `required_for` says where it applies.

### 3.2 Derived query — what must hold in release R

The obligations in scope for a release are **derived**, never stored: nothing accumulates on the `RELEASE` element (it carries no list of its own contents, §7.29) and nothing accumulates on the `REQUIREMENT`. The answer is recomputed from the relation files each time it is asked.

**Inputs.** A release id `R`, the canon catalogue, and an *as-at* date (the date of the query; §7.5 of [CONTRACT.md](../CONTRACT.md) — "Today is the date of the query or render").

**Computation.**

1. **Walk the chain.** Starting at `R`, follow `predecessor` ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.29) to build the ancestor list `R`, `R.predecessor`, `R.predecessor.predecessor`, … — `R` at depth 0. The walk is cycle-safe: an id already seen ends that branch (`RELEASE-004` reports the cycle; the query does not hang on one).
2. **Collect.** Take every admitted `required_for` REL whose `to` is any release in that list. An obligation attached to an ancestor is **inherited** by `R` — a requirement that entered scope at v1 is still in scope at v2 unless something ended it. This is the only sense in which release order is used anywhere, and it comes from `predecessor` links, never from comparing `version` strings.
3. **Filter by window,** evaluated at the as-at date, dropping a candidate if either:
   - the **relation** is not in effect — `valid_from` is later than the as-at date, or `valid_to` is set and earlier than it; or
   - the **`REQUIREMENT`** has retired — its own `valid_to` is set and earlier than the as-at date.
4. **Deduplicate by requirement.** One requirement required for both `R` and an ancestor appears once, attributed to the **nearest** attachment (lowest depth). The release the surviving relation actually points at is the attachment point; `depth > 0` means the obligation was inherited rather than introduced at `R`.

A window is **inclusive at both ends**: in effect at date `d` iff `valid_from ≤ d` and (`valid_to` is null or `d ≤ valid_to`). This follows `LIFECYCLE-004`'s reading ([CONTRACT.md](../CONTRACT.md) §7.3), which treats a reference as dangling only when the referenced `valid_to` is *earlier than* the referrer's `valid_from` — so a `valid_to` equal to the date in question is still in effect on that date.

**The release and the as-at date are independent axes.** The release picks which chain is read; the as-at date picks which scope statements were current. The query filters on the two windows named in step 3 and no others — it does not additionally require the release itself to be in effect at the as-at date. Asking what must hold in a release as at a date before it shipped is therefore a coherent question ("what was in scope for this line as things stood in April"), and it is answered from the statements current at that date, not from today's.

**Removing an obligation from scope** is done by closing the relation's window (`valid_to`), not by deleting the REL file: the file records that the obligation *was* in scope for that release, which is exactly what an audit of a shipped release needs. A closed relation is excluded from the query at any as-at date after its `valid_to`, and still returned by a query as at a date inside its window.

Two obligations are deliberately **not** answered here: whether the obligation is *met* in that release (an `ASSERTION` / `VERIFICATION` question) and what work would make it hold (`ACTION` / `CHANGE`). A reference implementation of this query is [`scripts/release-obligations.mjs`](../../scripts/release-obligations.mjs); the worked example is [`examples/relations/required-for/`](../examples/relations/required-for/).

### 3.3 `introduced_in` — a descriptive fact, not a claim about it

`required_for` binds an **obligation** to a release. `introduced_in` binds a **fact about the architecture** to a release, and the two must not be read as the same statement in different clothes.

Before this kind existed, an `INTEGRATION` or `APPLICATION` fact could be dated (the element's own `valid_from`) but not **versioned**: there was no way to say which shipped state of a subject first carried it. A date and a release are different axes — a date is continuous and global, a release is discrete and per-subject-line — and a regulated documentation package, which is written per release, needs the second one. The archaeology is usually feasible (`git log -S`, `git tag --contains`); what was missing was somewhere to put the answer.

What it says, and what it refuses to say:

- **It does not say the element was created then.** When the element began to exist is its own `valid_from` ([CONTRACT.md](../CONTRACT.md) §7). An integration built months before the release that first shipped it has the earlier date and the later release, and both are correct.
- **It does not say the element works, or is compliant.** `introduced_in` is descriptive; whether an obligation is *met* in that release is an `ASSERTION` (§2.4 of [16-assertion.md](16-assertion.md)), and whether it *must* be met is `required_for`. Three different statements about one release, deliberately kept in three places.
- **It does not say who built it or in what order.** As with `required_for` (§3.1), that is `ACTION` / `CHANGE`.
- **It does not enumerate a release's contents.** Nothing accumulates on the `RELEASE` element, which carries no list of its own contents by design ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.29).

**Not self-referential.** The `to` release MUST NOT be a release *of the `from` element itself* — `APPLICATION-PAYMENTS-GATEWAY-1` "introduced in" a `RELEASE` whose `of` is `APPLICATION-PAYMENTS-GATEWAY-1` states nothing (an application is trivially present in its own releases). The useful forms point across subjects: an `APPLICATION` introduced in a release of the `PRODUCT` it forms part of, or an `INTEGRATION` introduced in a release of either endpoint's subject.

**Derived query — what is in release R.** Identical in shape to §3.2, and deliberately so: starting at `R`, walk `predecessor` to build the ancestor list; collect every admitted `introduced_in` REL whose `to` is any release in that list; filter by window at the as-at date, dropping a candidate whose relation is not in effect or whose `from` element has retired; deduplicate by element, attributing each to the **nearest** attachment point. An element introduced at an ancestor is **inherited** by `R` — introduced once at v1, still present at v2 unless something ended it. Withdrawal is recorded by closing the relation's window, never by deleting the REL file: an audit of a shipped release needs the record that the element *was* part of it.

---

## 4. File location and naming

```
canon/relations/<ID>.yaml
```

One artefact per file, named by its canonical ID. The folder is flat — relations are not organised by `type` or by endpoint TYPE in the folder structure; the typing lives in the `type` field. Examples:

- `canon/relations/REL-CAP-V1-PARENT-1.yaml`
- `canon/relations/REL-ACT-Q3-GOAL-EU-1.yaml`
- `canon/relations/REL-GOAL-EU-PARENT-1.yaml`
- `canon/relations/REL-COMPLIANCE-REPORTING-DEPENDS-ON-RESIDENCY-1.yaml` (worked example: [`examples/relations/depends-on/`](../examples/relations/depends-on/))
- `canon/relations/REL-AVAILABILITY-REQUIRED-FOR-GATEWAY-1-1.yaml` (worked example: [`examples/relations/required-for/`](../examples/relations/required-for/))

A typical naming convention encodes the endpoints and kind in the middle segments (`REL-<FROM-HINT>-<KIND>-<N>` or `REL-<FROM-HINT>-<TO-HINT>-<N>`); the canonical grammar imposes only `REL-[<middle>-]<INTEGER>`.

---

## 5. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `REL-001` | error | `type` is missing or not one of the closed enum values in §3. |
| `REL-002` | error | `from` or `to` is missing, malformed, or does not resolve to an admitted primitive in canon. If the validator has the catalogue loaded, the endpoint's resolved TYPE must also match the `type`-specific endpoint constraints in §3. |
| `REL-003` | error | The relation's `[valid_from, valid_to]` window falls outside the lifecycle of either endpoint — i.e. `valid_from` predates the endpoint's `valid_from`, or `valid_to` postdates the endpoint's `valid_to`. A relation cannot be in effect before either of its endpoints existed or after either retired. |
| `REL-004` | error | A relation kind declared time-aware in its host notation spec is used inline (as an inline cross-reference field) instead of as a first-class REL file. The host notation's spec is the source of truth for which kinds are time-aware. |
| `REL-005` | error | A `depends_on` relation has `from` equal to `to` (self-reference). Single-file — no catalogue load required. |
| `REL-006` | warning | A cycle exists in the `depends_on` graph among admitted REL files (A depends on B … depends on A). Cross-cutting — fires when the catalogue is loaded. Warning rather than error because genuine mutual conditionality between obligations is unusual but not always wrong. |

**`required_for` adds no rule code of its own.** Its endpoint constraint (`REQUIREMENT` → `RELEASE`, §3) is exactly what `REL-002` already checks once the catalogue is loaded — a `required_for` whose `from` is not a `REQUIREMENT`, or whose `to` is not an admitted `RELEASE`, is a `REL-002` error like any other endpoint-type mismatch. Its lifecycle containment is `REL-003`, and the `RELEASE` side's own structural rules (`RELEASE-001`…`-005`, [CONTRACT.md](../CONTRACT.md) §8) already cover the predecessor chain the §3.2 query walks. Adding a code here would duplicate a check that exists, and give two names to one failure.

**`introduced_in` adds no rule code of its own either**, for the same reason: its endpoint constraint (§3) is what `REL-002` already checks with the catalogue loaded, and its window containment is `REL-003`. One constraint it does **not** inherit — `REL-002` cannot catch the self-referential form §3.3 forbids (`from` an `APPLICATION`, `to` a `RELEASE` whose `of` is that same application), because both endpoints are individually well-typed and the defect is in their relationship. That form is vacuous rather than malformed, so it is stated as a constraint here and filed as a validator follow-up (§7) rather than claimed as already-checked.

The shared header (`HDR-001..004`, [CONTRACT.md](../CONTRACT.md) §2) and primitive-lifecycle (`LIFECYCLE-001..004`, [CONTRACT.md](../CONTRACT.md) §7.3) rules apply to REL files in addition to the REL-* rules above. The sidecar rules (`VERSIONED-001..005`, [CONTRACT.md](../CONTRACT.md) §9.3) do not apply to relations — a relation's own state is its endpoints + lifecycle window; if the relation's attributes need versioning, the relation is its own primitive and gets its own sidecar.

---

## 6. Migration — what moves to first-class

Each notation spec declares its relation kinds as either **inline (timeless)** or **first-class (time-aware)** in a follow-up PR per family. v1 first-class candidates (from the temporal-model epic body):

- Capability map ([05-capability-map.md](../views/diagrams/05-capability-map.md)) — `parent` on capabilities.
- Goals tree ([04-goals.md](../views/diagrams/04-goals.md)) — `parent` on goals (re-parenting goals); `action_goal` link from actions to goals.
- Target state ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.17) — `target_state_satisfies_goal` from a target state to each goal it satisfies. Per §7.17 the satisfaction is *never* inline on the `TARGET_STATE` element (no `goals:` field); it lives only in REL files. The catalogue resolves "which goals does `TARGET_STATE-…` satisfy?" by scanning `canon/relations/` for REL files with `type: target_state_satisfies_goal` and `from: TARGET_STATE-…`; the reverse direction (which target states reach `GOAL-…`) matches on `to: GOAL-…`. The REL's own `[valid_from, valid_to]` is when the satisfaction holds — separate from the lifecycles of either endpoint.
- Assessment ([ELEMENT_PRIMITIVES.md](../ELEMENT_PRIMITIVES.md) §7.16) — `assessment_influences_goal` from each assessment to each goal it bears on, carrying the `sign` (`positive` \| `negative`) and optional `magnitude` (`low` \| `medium` \| `high`). Per §7.16 the influence is *never* inline on the `ASSESSMENT` element (no `goals:` field, no polarity field on the assessment node); it lives only in REL files. The catalogue resolves "which goals does `ASSESSMENT-…` influence and how?" by scanning `canon/relations/` for REL files with `type: assessment_influences_goal` and `from: ASSESSMENT-…`; the reverse direction (which assessments bear on `GOAL-…`, with which signs) matches on `to: GOAL-…`. A SWOT view consumes this kind as `driver.type` (internal/external on the assessed `DRIVER`) × `sign` → S/W/O/T quadrant, goal-relative; the SWOT view is derived, not stored.

Inline relations that stay timeless in v1 (per the same per-notation declarations):

- BPMN sequence flows ([01-bpmn.md](../views/diagrams/01-bpmn.md)) — within one process flow document.
- DGCA / FGA / Action schedule cross-layer references (`driver.references_constraint`, etc.) where the model captures *what holds today* rather than the history of changes.

Each notation that adopts a first-class relation kind:

1. Removes the inline cross-reference field from the schema.
2. Adds a row to its "Time-aware relations" subsection documenting the kind and the corresponding REL `type` value.
3. Adopters migrate by extracting each inline link into a `REL-…` file under `canon/relations/`, with `valid_from = the host primitive's valid_from` as a sensible epoch.

`REL-004` fires on inline use of a now-first-class kind.

---

## 7. Evolution

Pending design work (separate Wave 3 PRs):

- Per-notation declarations of time-aware vs timeless relation kinds (one PR per family).
- acme_corp worked example — at least one `REL-…` file demonstrating a relation with a non-trivial window (a re-parenting event captured as one ended relation + one new relation).
- Validator rule for the self-referential `introduced_in` form (§3.3) — `from` element equal to the `of` of the `to` release. Needs the catalogue loaded (it is a two-hop check, unlike `REL-005`'s single-file self-reference test), which is why it is filed rather than folded into `REL-002`.
- Cross-cutting validator rule `REL-COVERAGE-001` (warning) — flag relation kinds declared time-aware that have zero first-class instances in the catalogue (potential incomplete migration). Filed as a follow-up.

Out of scope for v1:

- **Relation-attribute versioning.** Relations have lifecycle but no attributes that vary within their window. If a relation needs versioned attributes (a weight that drifts over time), it gets its own sidecar via [CONTRACT.md](../CONTRACT.md) §9 — same pattern as any other primitive.
- **Many-way relations.** Each REL file has exactly one `from` and one `to`. Many-way relationships are modelled as multiple binary REL files sharing one endpoint.
- **Relation transitivity / inference.** If A `parent` B and B `parent` C, the validator does not infer A `parent` C. Transitive views are query-time renderer concerns.

---

## 8. References

- TYPE registry and ID grammar: [IDS_AND_REFERENCES.md](../IDS_AND_REFERENCES.md) §3.1 (entry), §1 (grammar), §4 (uniqueness scope).
- Zone model, admission record, primitive lifecycle: [CONTRACT.md](../CONTRACT.md) §5, §6, §7.
- Versioned-attribute sidecar (the Wave 2 pattern that REL files do *not* use): [CONTRACT.md](../CONTRACT.md) §9.
- Codex `applies_to` retirement (why it is not in the §3 enum): [14-codex.md](14-codex.md) §8.
