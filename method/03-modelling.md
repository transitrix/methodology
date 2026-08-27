---
title: Transitrix — modelling elements and relations
status: active
last_reviewed: 2026-08-16
audience: public
license: MIT
tags: [transitrix, methodology, yaml-dsl, ids, naming]
---

# Modelling elements and relations

> How to write an element and a relation as YAML, and the naming rules that keep them consistent across a repository.

## 1. The YAML DSL

Two file shapes do most of the work: **elements** (objects) and **relations** (connections). Every ID in either shape follows the canonical grammar defined once in [`notations/IDS_AND_REFERENCES.md`](../notations/IDS_AND_REFERENCES.md) §1 — the full-word `TYPE` from the registry, optional middle segments, and a terminal integer with no leading zeros. There is exactly one grammar; the examples below use it consistently, for both element ids and relation ids.

### 1.1 Element template

```yaml
id: "APPLICATION-ORDERS-1"          # TYPE-DOMAIN-INTEGER, uppercase, hyphens only, no leading zeros
name: "Order API"                   # Human-readable name
type: "ApplicationComponent"        # ArchiMate 3.2 type
layer: "Application"                # Motivation | Business | Application | Technology
metadata:
  status: "Active"                  # Draft | Active | Deprecated
  owner: "firstname.lastname"
  created_at: "2026-05-08"
  updated_at: "2026-05-08"
properties:
  description: "REST API for order management"
  criticality: "High"               # Critical | High | Medium | Low
  # Type-specific properties go here
```

The element file describes the object itself. It does **not** describe its relations. Putting relations in their own files (§1.2) keeps files small, diffs clean, and graph analysis straightforward. The full envelope a canonical element carries — admission record, lifecycle — is defined in [`notations/CONTRACT.md`](../notations/CONTRACT.md) §6–7; the fields shown above are the ones this template is about, not the complete list.

### 1.2 Relation template

A relation id uses the same grammar as an element id, under the `REL` TYPE — stated once, here: `REL-[<middle segment(s)>-]<INTEGER>`.

```yaml
id: "REL-ORDERS-1"
source: "APPLICATION-ORDERS-1"          # ID of the source element
target: "TECHNOLOGY_SERVICE-POSTGRES-1" # ID of the target element
type: "Access"                          # ArchiMate relation type
properties:
  access_type: "ReadWrite"              # Optional: Read | Write | ReadWrite
  description: "Reads and writes order records"
```

A relation is a typed edge between two elements. The methodology refuses to mix elements and relations in the same file — that constraint is enforced by the linter (§2).

## 2. Naming conventions

Consistency in names is a small thing that pays back daily during diff review and search. The canonical ID grammar and the full TYPE registry live in [`notations/IDS_AND_REFERENCES.md`](../notations/IDS_AND_REFERENCES.md); the fuller naming and best-practice checklist is [`notations/CONVENTIONS.md`](../notations/CONVENTIONS.md). This section states only what those two don't already own: file- and folder-naming case conventions.

| Item | Format | Examples |
| --- | --- | --- |
| YAML element files | `<ID>.yaml` (the ID itself, `UPPER_SNAKE_CASE`-compatible) | `GOAL-REVENUE-1.yaml`, `APPLICATION-ORDERS-1.yaml` |
| Documentation | `kebab-case.md` | `getting-started.md`, `project-rules.md` |
| Organisation folders | `snake_case` | `acme_corp`, `tech_innovations` |

### 2.1 Element and relation id prefixes

The canonical ID grammar and the full TYPE registry (`DRIVER`, `GOAL`, `ACTOR`, `CAPABILITY-V…`, `REQUIREMENT`, `REL`, …) are defined once in [`notations/IDS_AND_REFERENCES.md`](../notations/IDS_AND_REFERENCES.md). Refer to it rather than to a local prefix list — a duplicate would drift from the registry. Do not use an abbreviated TYPE (`APP`, `PROC`, `REQ`, …) anywhere in this repository or an adopter's canon — the grammar has one form, shown in §1 above.

### 2.2 Mandatory metadata

Every element carries the admission record and lifecycle fields defined in [`notations/CONTRACT.md`](../notations/CONTRACT.md) §6–7. The illustrative subset most often hand-authored:

```yaml
metadata:
  status: "Draft"                # Draft | Active | Deprecated
  owner: "firstname.lastname"
  created_at: "2026-05-03"
  updated_at: "2026-05-03"
  tags: ["tag1", "tag2"]
```

`owner` is mandatory for any element with status `Active`. Without an owner, the linter blocks the change.

---

**See also:**
- [`guides/how-a-release-records-the-systems-it-was-assembled-on.md`](../guides/how-a-release-records-the-systems-it-was-assembled-on.md) — authoring `assembled_on` relations to freeze a release's build environment
- [`notations/elements/17-relations.md`](../notations/elements/17-relations.md) §3 — the full relation-type enum and semantics

**Next:** [`04-notations.md`](04-notations.md) — how to express different aspects of an enterprise.

**Last reviewed:** 2026-08-16. Split from the former `01-methodology.md` §5 and §9 — see [`method/01-methodology.md`](01-methodology.md) for the redirect. §3a (the ArchiMate vocabulary reference table) is dropped in favour of [`notations/IDS_AND_REFERENCES.md`](../notations/IDS_AND_REFERENCES.md), the canonical ID authority it already pointed to. This release also corrects the element and relation ID examples, which previously mixed the canonical full-word grammar with a second, abbreviated form the naming rules explicitly forbade — every example now uses the one canonical grammar.
**Status:** Active.
