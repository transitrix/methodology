---
title: "ReqIF-shaped requirements interchange — domain package"
version: "0.1"
author: "Valerii Korobeinikov"
last_updated: "2026-07-29"
status: "draft"
---

# ReqIF Package — Reference

**Scope:** The first domain package shipped under the [`PACKAGES.md`](../PACKAGES.md) mechanism — a requirements-interchange layer structurally isomorphic to the [ReqIF](https://www.omg.org/spec/ReqIF/) (Requirements Interchange Format) standard, stored as YAML instead of XML so the diff stays readable and PR review keeps working. This document is the package's own spec per [`PACKAGES.md`](../PACKAGES.md) §6.

This is a package, not a core notation: nothing here changes `IDS_AND_REFERENCES.md`'s core TYPE registry, and none of it is admitted, validated, or rendered by core tooling. An adopter repository that does not declare `packages: [reqif]` is unaffected by everything in this document — see [`PACKAGES.md`](../PACKAGES.md) §5.

---

## 1. Name and folder

- **Package name** (the `packages:` entry): `reqif`.
- **Folder:** a top-level `reqif/` folder in the adopter repository, at the same level as `canon/`, `field/`, `codex/`.

```yaml
transitrix: 1
methodology_version: "3.0.0"
packages: [reqif]
```

---

## 2. Object types and ID grammar

### 2.1 The four object kinds

The package's object model has exactly four kinds, matching the ReqIF core model:

| Kind | ReqIF concept | What it holds |
|---|---|---|
| `spec-object-type` | `SPEC-OBJECT-TYPE` | A type definition: a name plus a list of attribute definitions (key + datatype), as data — not as a schema file format of its own. |
| `spec-object` | `SPEC-OBJECT` | An instance of a `spec-object-type`: an id, the type it instantiates, and a `values` map keyed by attribute name. |
| `spec-relation` | `SPEC-RELATION` | A **first-class, addressable** relation between two `spec-object`s — a `source`, a `target`, and a `type` label. Never collapsed into an inline field on either endpoint. |
| `spec-hierarchy` | `SPECIFICATION` / `SPEC-HIERARCHY` | An outline tree over `spec-object`s — a root node with nested `children`, each pointing at one `spec-object`. |

### 2.2 ID grammar — disjoint from core

Per [`PACKAGES.md`](../PACKAGES.md) §4.1, a package identifier must never be shaped so it could be mistaken for a core `TYPE-NAME-<integer>` id ([`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md) §1). Core ids are TYPE-led, and TYPE always starts with an uppercase letter (`^[A-Z]`). This package's grammar is **entirely lowercase**, which is unconditionally disjoint:

```
<kind>-<slug>-<INTEGER>
```

| `<kind>` | Object kind |
|---|---|
| `sot` | `spec-object-type` |
| `so` | `spec-object` |
| `sr` | `spec-relation` |
| `sh` | `spec-hierarchy` |

- `<kind>` is one of the four literal tokens above, followed immediately by a hyphen (so `so-…` and `sot-…` never collide — the token match is exact, not a prefix test).
- `<slug>` is one or more lowercase alphanumeric segments separated by hyphens.
- `<INTEGER>` is a terminal positive integer ≥ 1, no leading zeros — same terminal-integer rule as the core grammar ([`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md) §1).

```
^(sot|so|sr|sh)-[a-z0-9]+(?:-[a-z0-9]+)*-[1-9][0-9]*$
```

**Examples:** `sot-requirement-basic-1`, `so-print-retry-req-1`, `sr-print-retry-elaborates-1`, `sh-root-1`.

### 2.3 File layout

```
reqif/
  spec-object-types/<id>.yaml
  spec-objects/<id>.yaml
  spec-relations/<id>.yaml
  spec-hierarchies/<id>.yaml
```

One object per file, named by its id. Every file carries `package: reqif` and `kind: <one of the four kinds above>` — this pair is how the package's own tooling recognises its files; core tooling never reads them (§4.2 of the mechanism doc).

### 2.4 `spec-object-type` schema

```yaml
package: reqif
kind: spec-object-type
id: sot-requirement-basic-1
name: "Requirement (basic)"
attributes:
  - key: "ReqIF.Name"
    datatype: STRING
  - key: "ReqIF.Text"
    datatype: XHTML
  - key: "Transitrix.CanonRef"
    datatype: STRING
```

| Field | Required | Semantics |
|---|---|---|
| `package` | yes | Fixed value `reqif`. |
| `kind` | yes | Fixed value `spec-object-type`. |
| `id` | yes | `sot-…` per §2.2. |
| `name` | yes | Human-readable long name (ReqIF `LONG-NAME`). |
| `attributes` | yes | List of `{ key, datatype }`. `key` is the attribute's name (free text — conventionally namespaced, e.g. `ReqIF.Name` for the standard ReqIF attributes, `Transitrix.<Name>` for package-defined ones). `datatype` is one of the supported datatypes in §2.6. |

### 2.5 `spec-object` schema

```yaml
package: reqif
kind: spec-object
id: so-print-retry-req-1
type: sot-requirement-basic-1
values:
  ReqIF.Name: "Print-queue retry on transient failure"
  ReqIF.Text: "The system shall retry a failed print job up to 3 times before flagging it for manual review."
  Transitrix.CanonRef: "REQUIREMENT-PRINT-QUEUE-RETRY-1"
```

| Field | Required | Semantics |
|---|---|---|
| `package` / `kind` | yes | `reqif` / `spec-object`. |
| `id` | yes | `so-…` per §2.2. |
| `type` | yes | The `sot-…` id of the `spec-object-type` this object instantiates. Must resolve within the package (REQIF-003, §5). |
| `values` | yes | Map of attribute key → value. Every key SHOULD be declared on the referenced type's `attributes` list; every value's shape must match its declared datatype (§2.6). |

### 2.6 Attribute datatypes (v1)

The converter (§6) supports five ReqIF datatypes in v1: `STRING`, `XHTML` (stored and round-tripped as escaped plain text — no rich-markup modelling in v1), `DATE` (ISO 8601), `INTEGER`, `BOOLEAN`. `REAL` and `ENUMERATION` are real ReqIF datatypes not yet supported by this converter — a future revision may add them; a `values` entry naming an unsupported datatype is rejected (REQIF-007, §5).

### 2.7 `spec-relation` schema — first-class, addressable

```yaml
package: reqif
kind: spec-relation
id: sr-print-retry-elaborates-1
type: "elaborates"
source: so-print-retry-rationale-1
target: so-print-retry-req-1
```

| Field | Required | Semantics |
|---|---|---|
| `package` / `kind` | yes | `reqif` / `spec-relation`. |
| `id` | yes | `sr-…` per §2.2 — the relation is its own addressable object, never an inline field on `source` or `target`. |
| `type` | yes | Free-text relation-type label (ReqIF `SPEC-RELATION-TYPE`). Not a closed enum in v1 — the package defines no fixed relation-kind vocabulary. |
| `source` | yes | `so-…` id of the originating `spec-object`. Must resolve within the package (REQIF-004, §5). |
| `target` | yes | `so-…` id of the destination `spec-object`. Must resolve within the package (REQIF-004, §5). |

### 2.8 `spec-hierarchy` schema

```yaml
package: reqif
kind: spec-hierarchy
id: sh-root-1
name: "Print-queue requirements outline"
children:
  - object: so-print-retry-req-1
    children: []
  - object: so-print-retry-rationale-1
    children: []
```

| Field | Required | Semantics |
|---|---|---|
| `package` / `kind` | yes | `reqif` / `spec-hierarchy`. |
| `id` | yes | `sh-…` per §2.2. |
| `name` | no | Human-readable long name (ReqIF `SPECIFICATION` `LONG-NAME`). |
| `children` | yes | List of outline nodes. Each node is `{ object, children }`: `object` is a `so-…` id (must resolve within the package, REQIF-006, §5); `children` is the same shape, recursively — an empty list for a leaf node. |

### 2.9 Workflow state, revisions, and suspect links — experimental surface

The epic's own experimental surface (HUB-813): tool behaviour layered on top of `spec-object` and `spec-relation`, not part of the ReqIF standard itself. **Not carried through the converter (§6) in v1** — these are top-level YAML fields the reference implementation's own tooling reads and writes; `transitrix-reqif export`/`import` do not represent them in ReqIF XML, so a folder using this surface should not be expected to round-trip identically through `transitrix-reqif roundtrip` (the worked example demonstrating this surface is kept separate from the one demonstrating round trip — see [`notations/examples/packages/reqif-workflow/`](../../notations/examples/packages/reqif-workflow/)).

**Workflow state** — a `spec-object` MAY carry `workflow_state`, one of `draft`, `reviewed`, `approved`, `baselined`, `superseded`. Absent means `draft`. Transitions are **strictly linear, one step at a time** — `draft → reviewed → approved → baselined → superseded`, no skipping and no going backward. The reference implementation's `transition` command (§6) is the only sanctioned writer of this field; it rejects any edge that is not the object's current state's single legal next step.

```yaml
package: reqif
kind: spec-object
id: so-print-retry-req-1
type: sot-requirement-basic-1
workflow_state: reviewed
values: { ... }
```

**Revisions** — a `spec-object` MAY carry `revision` (its current revision number, a positive integer; absent means `1`) and `revisions` (a list of prior snapshots, oldest first). Each snapshot is `{ revision, values, recorded_at }` — the object's `values` map exactly as it stood before the edit that ended that revision, and an ISO-8601 timestamp. The reference implementation's `revise` command (§6) is the only sanctioned writer of both fields together, so the two never drift apart; "what changed, when" (per requirement object) is answered by the `history` command, or by reading `revisions` directly.

```yaml
revision: 2
revisions:
  - revision: 1
    values: { "ReqIF.Text": "previous wording" }
    recorded_at: "2026-07-28T21:45:04Z"
```

**Suspect links** — a `spec-relation` MAY carry `recorded_target_revision` (a positive integer; absent means `1`, i.e. recorded against the target's original text). A relation is **suspect** when its target's current `revision` has moved past `recorded_target_revision` — its target's text changed after the relation was drawn. Suspicion is always **computed**, never stored as a mutable flag on the relation (a stored flag could go stale the moment a further revision happens without a matching re-check); the reference implementation's `suspect` command (§6) computes it fresh from the two revision numbers. A relation whose target does not resolve at all is a distinct failure (`REQIF-004`) and never appears in the `suspect` report — a suspect link and "no relation exists" are never visually indistinguishable.

```yaml
package: reqif
kind: spec-relation
id: sr-print-retry-elaborates-1
type: "elaborates"
source: so-print-retry-rationale-1
target: so-print-retry-req-1
recorded_target_revision: 1
```

---

## 3. The one permitted cross-reference — `Transitrix.CanonRef`

Per [`PACKAGES.md`](../PACKAGES.md) §4.1, a package object may reference a core element by id; no core element may reference a package object. This package's mechanism for that one-way reference is a plain attribute: a `spec-object` MAY carry a `values` entry keyed `Transitrix.CanonRef` whose value is a core `REQUIREMENT-…` or `CONSTRAINT-…` id. Nothing elsewhere in the package or in core reads or resolves this value automatically — it is a citation, carried the same way any other attribute value is carried, so it round-trips through the converter (§6) like any other string attribute.

The package validator checks that a `Transitrix.CanonRef` value is grammar-valid and TYPE-restricted (REQIF-005, §5); it does not — and, being package tooling with no access requirement into `canon/`, cannot be relied on to — confirm the id resolves to an admitted element. That resolution is core's job, and per [`PACKAGES.md`](../PACKAGES.md) §4.1 it already happens for free: a `Transitrix.CanonRef` value is not itself a core cross-reference field, so no core validator reads it either. The citation is documentary, not enforced — same posture as a codex `derived_from` citation before admission.

---

## 4. File location and naming

```
<adopter-repo-root>/reqif/spec-object-types/<id>.yaml
<adopter-repo-root>/reqif/spec-objects/<id>.yaml
<adopter-repo-root>/reqif/spec-relations/<id>.yaml
<adopter-repo-root>/reqif/spec-hierarchies/<id>.yaml
```

One artefact per file, named by its canonical package id (§2.2).

---

## 5. Validation rules — the package's own validator

Run by `@transitrix/reqif-cli validate <reqif-folder>` ([`packages/reqif-cli`](../../packages/reqif-cli) in this repo — the reference implementation shipped alongside this spec). Never wired into `packages/ingest-cli`, `scripts/check-notations.mjs`, or Studio's validator registry ([`PACKAGES.md`](../PACKAGES.md) §4.2) — this tooling runs only when explicitly invoked against a `reqif/` folder.

| Rule | Severity | Description |
|---|---|---|
| `REQIF-001` | error | An object's `id` does not match its kind's grammar in §2.2. |
| `REQIF-002` | error | Two objects in the package share the same `id`. |
| `REQIF-003` | error | A `spec-object.type` does not resolve to a `spec-object-type` id present in the package. |
| `REQIF-004` | error | A `spec-relation.source` or `.target` does not resolve to a `spec-object` id present in the package. |
| `REQIF-005` | error | A `Transitrix.CanonRef` attribute value is present but is not a grammar-valid core id, or its TYPE prefix is not `REQUIREMENT` or `CONSTRAINT` (§3). |
| `REQIF-006` | error | A `spec-hierarchy` node's `object` does not resolve to a `spec-object` id present in the package. |
| `REQIF-007` | error | A `spec-object-type` attribute, or a `spec-object` value keyed by one, names a datatype outside the supported set (§2.6). |
| `REQIF-008` | error | A `spec-object.workflow_state` value is present but is not one of the five states in §2.9. |
| `REQIF-009` | error | A `spec-object.revision` or a `spec-relation.recorded_target_revision` value is present but is not a positive integer (§2.9). |

No rule here reaches into `canon/`, `field/`, or `codex/` — package-internal integrity only, per [`PACKAGES.md`](../PACKAGES.md) §4.2.

---

## 6. The converter — YAML ↔ ReqIF XML

`@transitrix/reqif-cli` ([`packages/reqif-cli`](../../packages/reqif-cli)) ships a two-way converter:

- `transitrix-reqif export <reqif-folder> <out.reqif>` — reads the four object kinds from a `reqif/` folder and emits a ReqIF-conformant XML document (`REQ-IF` root, `DATATYPES` / `SPEC-TYPES` / `SPEC-OBJECTS` / `SPEC-RELATIONS` / `SPECIFICATIONS` sections).
- `transitrix-reqif import <in.reqif> <reqif-folder>` — reads a ReqIF XML document and writes the four object kinds back out as YAML files.
- `transitrix-reqif roundtrip <reqif-folder>` — exports then re-imports into memory (no disk write) and asserts the resulting object set is identical to the one loaded from `<reqif-folder>` — the package's own demonstration of the epic's round-trip success signal.
- `transitrix-reqif transition <reqif-folder> <spec-object-id> <new-state>` — advances a `spec-object`'s `workflow_state` by exactly one legal step (§2.9); rejects (exit 1, no write) any other edge.
- `transitrix-reqif revise <reqif-folder> <spec-object-id> <ReqIF.Attr> <new-value>` — changes one value, bumping `revision` and appending the pre-change `values` snapshot to `revisions` (§2.9).
- `transitrix-reqif history <reqif-folder> <spec-object-id>` — prints a `spec-object`'s revision history, oldest first.
- `transitrix-reqif suspect <reqif-folder>` — lists every `spec-relation` with its computed suspect status (§2.9).

**`Transitrix.CanonRef` in XML.** The one-way core citation (§3) is not a special XML construct — it is exported as an ordinary `ATTRIBUTE-VALUE-STRING` like any other attribute on the `spec-object`'s type, so it survives the round trip without any converter-side special case.

**The experimental surface (§2.9) is not carried through this converter in v1.** `workflow_state`, `revision`, `revisions`, and `recorded_target_revision` are top-level fields the four `export`/`import`/`validate`/`roundtrip` commands do not read or write — only `transition`, `revise`, `history`, and `suspect` do. A folder exercising the experimental surface is not expected to round-trip identically through `roundtrip`; the worked example demonstrating it ([`notations/examples/packages/reqif-workflow/`](../../notations/examples/packages/reqif-workflow/)) is kept separate from the one demonstrating round trip ([`notations/examples/packages/reqif/`](../../notations/examples/packages/reqif/)) for exactly this reason.

---

## 7. Removal procedure

Per [`PACKAGES.md`](../PACKAGES.md) §4.3, removal is the baseline two-step procedure — this package adds no package-specific step:

1. Delete the `reqif/` folder from the adopter repository root.
2. Remove `reqif` from the `packages:` list in `transitrix.yaml` (or delete the whole `packages:` line, if `reqif` was the only entry).

Nothing else changes. No `canon/`, `field/`, or `codex/` file is touched by either step, because per §4.1 no core element ever references a package object — there is nothing in `canon/` for the two steps above to leave dangling.

Demonstrated as a test, not asserted in prose ([`PACKAGES.md`](../PACKAGES.md) §4.3): [`packages/reqif-cli/tests/test_reqif_integrity.py`](../../packages/reqif-cli/tests/test_reqif_integrity.py), Part F, copies the worked example ([`notations/examples/packages/reqif`](../examples/packages/reqif)), performs both steps against the copy, and asserts (a) `canon/` references no `reqif` package id even before removal — reversibility rule 1, package → canon only; (b) the `reqif/` folder and the `packages:` line are both gone after removal; (c) every remaining `canon/` file still parses and still contains no package-id reference. Run: `python packages/reqif-cli/tests/test_reqif_integrity.py` (also wired into CI, [`.github/workflows/reqif-cli-test.yml`](../../.github/workflows/reqif-cli-test.yml)).

---

## 8. Experimental status and review date

This package is **experimental**, in full — not only its workflow-state/revisions/suspect-link surface (§2.9). Landed 2026-07-28. Reviewed by **2027-01-28** (six months out), or sooner if real adopter usage surfaces a shape problem before then.

What "review" means here: re-read this spec against how the reference implementation has actually been used, then choose one of — keep as-is (still experimental, set a new review date); promote to stable (replace this section with a statement that the package graduated); revise the object model or workflow-state mechanics based on what usage showed; or remove the package (§7 makes this the cheap option by design).

Per [`PACKAGES.md`](../PACKAGES.md) §6, core specs are never refactored to accommodate this package's experimental surface while it carries this status. Confirmed for v0.1: the mechanism task (epic `HUB-813`, PR #381) and this package's own content PRs (object model, workflow-state) between them touch no core spec file except `PACKAGES.md`'s own §7.1 shipped-packages row and `README.md`'s notation index — never `IDS_AND_REFERENCES.md`, `CONTRACT.md`, `COVERAGE_PROFILES.md`, or a core validator (`scripts/check-notations.mjs`, `packages/ingest-cli`).

---

## 9. Evolution

**Landed (v0.1, 2026-07-28):** object model (§2), the one-way canon citation (§3), the package validator (§5), and the YAML↔ReqIF-XML converter (§6) — the base ReqIF-shaped layer.

**Landed (2026-07-29):** workflow state, revision history, and suspect-link mechanics (§2.9) — the package's explicitly experimental surface. `REQIF-008`/`REQIF-009` (§5) and the `transition`/`revise`/`history`/`suspect` commands (§6). Not carried through the XML converter in v1 (§6). Worked example: [`notations/examples/packages/reqif-workflow/`](../../notations/examples/packages/reqif-workflow/).

**Landed (2026-07-29):** removal procedure (§7) and experimental-status declaration (§8) — both required by [`PACKAGES.md`](../PACKAGES.md) §6 ("required, not implied"), demonstrated against the worked example that landed with the base layer above.

---

## 10. References

- [`PACKAGES.md`](../PACKAGES.md) — the mechanism this package is shipped under: where a package is declared, the reversibility contract, absence-is-silence, what a package's spec must state.
- [`IDS_AND_REFERENCES.md`](../IDS_AND_REFERENCES.md) §1 — the core id grammar this package's grammar (§2.2) is disjoint from.
- [`MANIFEST.md`](../MANIFEST.md) §2 — the `packages:` field on `transitrix.yaml`.
- [`elements/15-requirement.md`](../elements/15-requirement.md) — the core `REQUIREMENT` type a `spec-object` may cite via `Transitrix.CanonRef` (§3).
- [ReqIF](https://www.omg.org/spec/ReqIF/) — the OMG standard this package's object model is structurally isomorphic to.
