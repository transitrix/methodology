---
title: How a release records the systems it was assembled on
status: active
last_reviewed: 2026-08-26
audience: public
license: MIT
tags: [transitrix, guide, release, assembly, environment, systems]
---

# How a release records the systems it was assembled on

> How to name the identified versions of the systems a release was assembled on, as a fact about that release's build environment. This is not a list of components it contains, and it is not a claim about compatibility, approval, or support.

A **release** is a shipped state of a product or application ([`ELEMENT_PRIMITIVES.md`](../notations/ELEMENT_PRIMITIVES.md) §7.29). The **assembly environment** is the set of identified system versions that were in use when that release was built — the compiler version, the runtime platform, the infrastructure services it was tested on. An `assembled_on` link records that fact.

## What `assembled_on` is and is not

| This is an `assembled_on` link | This is not an `assembled_on` link |
| --- | --- |
| A release was built with compiler v10.2.1 | A release contains compiler libraries (composition) |
| The product was deployed on node-2.3 at go-live | The product runs on node-2.3 (architecture) |
| The application was tested against service-db v4 | The application currently uses service-db (integration) |
| This snapshot is what shipped on 2026-08-26 | An approval or compliance statement |

An `assembled_on` link is **a fact about history, not a plan or a claim about the present.** It records the environment that existed at the moment the release was cut. It does not update if a system is later patched, deprecated, or shown to be incompatible. A successor release with a different assembly environment starts with a new set of links; the old ones remain to record what the ancestor used.

## When to author `assembled_on` links

Author these links for every identified version in the **build environment of the release**, where "identified" means the version was named, tagged, or enumerated at assembly time.

**Do author links for:**
- A compiler or transpiler used to build the code (e.g., `released_in` a `TECHNOLOGY_SERVICE` release)
- A runtime platform or virtual machine the code was built for (e.g., the JVM version, the Python runtime)
- Test infrastructure or continuous-integration services the build and test ran on
- A platform-level library or framework pinned at a specific version
- Any system whose version mattered to the build, in the developer's judgment

**Do not author links for:**
- Transitive dependencies pulled in by a build tool (those are inside the build system, not a freeze of the assembly environment)
- Optional or future systems not present at build time
- Systems whose version is unknown or was not checked at the moment the release was cut
- Approval decisions, compliance status, or architectural role

## How to author `assembled_on` links

### Step 1: Admit the releases

Before you can link them, both ends must exist as admitted `RELEASE` elements:

- The **product or application release** you are recording the environment for (the `from` endpoint)
- Each **system release** (of a platform, tool, or service) that was in the assembly environment (the `to` endpoints)

A release is admitted the same way as any other canonical element — one YAML file per release, in the appropriate subject's folder under `canon/` ([`ELEMENT_PRIMITIVES.md`](../notations/ELEMENT_PRIMITIVES.md) §7.29).

```yaml
---
notation: element
type: RELEASE
id: RELEASE-PRODUCT-APP1-1
of: PRODUCT-APP1
version: "1.0.0"
released_at: "2026-08-26"
---
```

The `of` field names the subject (the product or application); the `version` field is opaque to the method — it is your semantic versioning scheme, not parsed or ordered by the validator.

### Step 2: Author the links

For each system that was in the assembly environment, create one `assembled_on` relation file from the product release to the system release:

```yaml
---
notation: relation
id: REL-APP1-1-JVM-1
type: assembled_on
from: RELEASE-PRODUCT-APP1-1
to: RELEASE-TECHNOLOGY_SERVICE-JVM-1

zone: canon
admitted_at: "2026-08-26"
admitted_by: "your.handle"
gate_checks:
  uniqueness: pass
  consistency: pass
  completeness: pass

valid_from: "2026-08-26"
valid_to: null
---
```

Each relation:
- Is a separate file in `canon/relations/`
- Has its own canonical ID (REL-…) following the ID grammar
- Links the product release (`from`) to one system release (`to`)
- Carries the relation's own `valid_from` / `valid_to` (the window during which this assembly fact was true)

**Author one relation per (product_release, system_release) pair**, even if multiple systems were used. A product assembled on JVM 11, Ruby 2.7, and PostgreSQL 13 yields three REL files, one per system.

### Step 3: Validate

Run the validator to ensure:
- Both endpoints (`from` and `to`) resolve to admitted `RELEASE` elements
- The endpoints are valid (not retired, not dangling)
- The relation's own window (`valid_from` / `valid_to`) is well-formed

```bash
npx @transitrix/cli validate .
```

The validator confirms the links exist but does not parse, compare, or sort version strings. The version field is opaque — it is your versioning scheme, not the method's.

## Version strings are opaque

This method **does not parse, compare, or order version strings.** When you write `version: "1.0.0"` and `version: "1.1.0"`, the validator sees two distinct strings. It does not know which is newer, whether one is compatible with the other, or whether a release "upgraded" a dependency. That knowledge lives in:

- **For adopter judgement:** your release notes, compatibility matrices, and integration tests
- **For systematic queries:** an `ASSERTION` element if you are making a claim about compatibility in a particular release
- **For ordering:** the `predecessor` field on the `RELEASE` element itself (see §7.29), which you update when one release succeeds another

A tag on a git repository of a system's *source* (e.g., the Apache server git repo at tag `v2.4.57`) is **not** the same thing as the version string you put in your model. The version in your release record is how *you* named it at assembly time — a digest, a SemVer, a git commit hash, whatever your build logged. The method does not enforce the format. If your build system recorded "apache-2.4.57-ubuntu-jammy", that is the version string you write.

## Example: A product's assembly environment

A product release is built with three systems in play:

1. **JVM 17.0.2** — the runtime the code was compiled for
2. **PostgreSQL 15** — the database tested at assembly time
3. **Spring Framework 6.1.0** — the web framework version pinned in the build

You model them as:

**The product release itself:**
```yaml
# canon/elements/02_business/products/PRODUCT-APP1.yaml
notation: element
type: PRODUCT
id: PRODUCT-APP1
...
---
# canon/elements/system-releases/RELEASE-PRODUCT-APP1-1.yaml
notation: element
type: RELEASE
id: RELEASE-PRODUCT-APP1-1
of: PRODUCT-APP1
version: "2.0.0"
released_at: "2026-08-26"
```

**The system releases (existing `TECHNOLOGY_SERVICE` or `APPLICATION` releases in your model):**
- `RELEASE-TECHNOLOGY_SERVICE-JVM-1` — for the JVM runtime
- `RELEASE-TECHNOLOGY_SERVICE-POSTGRES-1` — for the database
- `RELEASE-APPLICATION-SPRING-1` — for the framework

**The three `assembled_on` links:**
```yaml
# canon/relations/REL-APP1-1-JVM-1.yaml
notation: relation
type: assembled_on
from: RELEASE-PRODUCT-APP1-1
to: RELEASE-TECHNOLOGY_SERVICE-JVM-1
id: REL-APP1-1-JVM-1
valid_from: "2026-08-26"
valid_to: null

# canon/relations/REL-APP1-1-POSTGRES-1.yaml
notation: relation
type: assembled_on
from: RELEASE-PRODUCT-APP1-1
to: RELEASE-TECHNOLOGY_SERVICE-POSTGRES-1
id: REL-APP1-1-POSTGRES-1
valid_from: "2026-08-26"
valid_to: null

# canon/relations/REL-APP1-1-SPRING-1.yaml
notation: relation
type: assembled_on
from: RELEASE-PRODUCT-APP1-1
to: RELEASE-APPLICATION-SPRING-1
id: REL-APP1-1-SPRING-1
valid_from: "2026-08-26"
valid_to: null
```

A successor release (v2.0.1) tested on a different PostgreSQL version would have its own set of links, with a new link to the new PostgreSQL release. The v2.0.0 release's links stay as they are, recording what the ancestor used.

## What to do when a system version changes

When you cut a successor release with a different assembly environment:

1. **Admit a new `RELEASE` for the successor** (e.g., `RELEASE-PRODUCT-APP1-2` for v2.0.1)
2. **Author new `assembled_on` links from the successor** to each system version in the *new* environment
3. **Close the old links** (from the predecessor release) by setting their `valid_to` field to the date the successor was released
4. **Keep the old links in the repository** — they record what the ancestor used

Example: v2.0.1 is built on PostgreSQL 15.1 (a patch) but everything else stays the same:

```yaml
# canon/relations/REL-APP1-2-POSTGRES-1B.yaml
# The successor v2.0.1 uses PostgreSQL 15.1 (the new RELEASE)
notation: relation
type: assembled_on
from: RELEASE-PRODUCT-APP1-2
to: RELEASE-TECHNOLOGY_SERVICE-POSTGRES-1B  # new version
id: REL-APP1-2-POSTGRES-1B
valid_from: "2026-08-27"
valid_to: null
```

And close the predecessor's link:

```yaml
# canon/relations/REL-APP1-1-POSTGRES-1.yaml — updated
valid_to: "2026-08-27"  # the date the successor shipped
```

The history is preserved: anyone asking "what was app 2.0.0 assembled on?" gets the answer from the v2.0.0 release's links; anyone asking "when did this release change its assembly environment?" can walk the `predecessor` chain and see where the `assembled_on` links change.

## Do not confuse these with other relations

- **`required_for` (obligation scope):** Names what *requirements* must hold in a release. Not what systems were used to build it.
- **`introduced_in` (architectural attachment):** Names what elements (applications, integrations) are in a release's architecture. Not the build environment.
- **Inline `requires` / `uses` fields:** An application's inline list of services or libraries it runs with. Not a release's assembly environment.
- **`predecessor` (release lineage):** The prior release in a subject's version line. Not the systems in the environment.

An `assembled_on` link freezes a single fact: *this release was built on this identified system version, on this date.*

## See also

- [`notations/elements/17-relations.md`](../notations/elements/17-relations.md) §3 — the relation type enum and its semantics
- [`notations/ELEMENT_PRIMITIVES.md`](../notations/ELEMENT_PRIMITIVES.md) §7.29 — the `RELEASE` element schema
- [`patterns/baseline-audit-trail.md`](../patterns/baseline-audit-trail.md) — using git tags as baselines
- [`method/03-modelling.md`](../method/03-modelling.md) — general guidance on authoring elements and relations

---

**Last reviewed:** 2026-08-26.
