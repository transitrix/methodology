---
title: How a release records the systems it was assembled on
status: active
last_reviewed: 2026-09-14
audience: public
license: MIT
---

# How a release records the systems it was assembled on

An `assembled_on` relation records that a release was built with or compiled against an identified system release. It preserves assembly provenance. Deployment, a successful test, approval, compatibility and support are separate statements.

## Identify both releases

Both endpoints must be admitted `RELEASE` elements. Every RELEASE has a `PRODUCT` or `APPLICATION` subject; a `TECHNOLOGY_SERVICE` cannot be used as its `of` value. Do not manufacture a different subject classification just to make a link fit. If your system has no eligible modelled subject, retain the source evidence and resolve that modelling gap before authoring the relation.

Record only versions supported by assembly evidence. Version strings are opaque labels, not values the method sorts or compares. `predecessor` orders releases of the same subject; it does not identify a build dependency.

## Author the records

Release files belong in `canon/elements/05_implementation/releases/`; relation files belong in `canon/relations/`. The following synthetic example assumes `PRODUCT-PORTAL-1` and `APPLICATION-COMPILER-1` have already been admitted. Each YAML document is a separate file. Admission results illustrate a completed review: record `pass` only after the relevant checks actually pass.

```yaml
# canon/elements/05_implementation/releases/RELEASE-PORTAL-1.yaml
notation: release
id: RELEASE-PORTAL-1
name: "Portal 1.0"
of: PRODUCT-PORTAL-1
version: "1.0"
released_at: "2026-08-26"
zone: canon
admitted_at: "2026-09-01"
admitted_by: "example.reviewer"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass
valid_from: "2026-08-26"
valid_to: null
```

```yaml
# canon/elements/05_implementation/releases/RELEASE-COMPILER-1.yaml
notation: release
id: RELEASE-COMPILER-1
name: "Compiler 10.2.1"
of: APPLICATION-COMPILER-1
version: "10.2.1"
released_at: "2026-07-01"
zone: canon
admitted_at: "2026-09-01"
admitted_by: "example.reviewer"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass
valid_from: "2026-07-01"
valid_to: null
```

```yaml
# canon/relations/REL-PORTAL-COMPILER-1.yaml
notation: relation
id: REL-PORTAL-COMPILER-1
name: "Portal 1.0 assembled with Compiler 10.2.1"
type: assembled_on
from: RELEASE-PORTAL-1
to: RELEASE-COMPILER-1
zone: canon
admitted_at: "2026-09-01"
admitted_by: "example.reviewer"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass
valid_from: "2026-08-26"
valid_to: null
```

Cite the actual source evidence through the shared provenance envelope where available; the example does not invent an observation record. Admission time is when the model accepted the record, not the historical ship or assembly date.

## Preserve the complete environment per release

Author one relation for every identified assembly-system release in scope. When Portal 1.1 ships, admit its own RELEASE and link it to every system release in its environment, including unchanged ones. Assembly links are **not inherited** along `predecessor`.

Do not close Portal 1.0's links merely because Portal 1.1 shipped: what built 1.0 remains a historical fact. A later patch to the compiler does not rewrite that fact either. If a recorded relation was wrong and is withdrawn, preserve its lifecycle and audit trail. Historical retrieval must inspect records for the original release, including withdrawn records where relevant; a current-active-only view may omit them. Which release is currently used is a separate question.

## Check before accepting

Check the RELEASE envelope, subject types, canonical IDs, resolved endpoints, lifecycle windows and provenance against [element primitives](../notations/ELEMENT_PRIMITIVES.md) and [relation semantics](../notations/elements/17-relations.md). Run the validator configured for the adopter repository and verify it covers those rules. A schema check cannot establish which compiler actually built a release; compare the recorded environment with the build evidence.

Do not use `assembled_on` for a deployment target, a test result alone, or a list of included components. Requirement scope uses `required_for`; architectural attachment uses `introduced_in`; neither records the build environment.

## Related repository guidance

[Version a changing model repository](how-to-version-a-changing-model-repository.md) explains how frequently changing content, processing tools and issued baselines remain traceable without treating every edit as a software release.
