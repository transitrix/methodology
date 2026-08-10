---
title: "Domain Packages — optional, removable vocabulary extensions"
version: "0.2"
author: "Valerii Korobeinikov"
last_updated: "2026-08-04"
status: "draft"
---

# Domain Packages

**Scope:** The mechanism an adopter uses to add an **optional, removable domain package** on top of the core vocabulary — a bounded extension shaped for one domain (e.g. a requirements-interchange layer, a compliance regime) that ships its own object types, its own validator, and its own removal procedure, without touching core.

A repository that declares no packages is unaffected by this document: no additional TYPE is admitted, no additional validator rule runs, nothing renders. Packages are strictly additive to a repository that opts in.

---

## 1. Where a package is declared

A package is declared at the repository root in `transitrix.yaml` under the `packages` key — a flat list, sibling to `coverage_profile`, not nested inside it. A list entry takes one of two shapes, one per package class (§7):

```yaml
transitrix: 1
methodology_version: "3.4.0"
notations: [dgca, goals, activities, capability-map]
zones: [canon, field]
coverage_profile: core
packages: [reqif]              # optional — zero or more shipped package names
```

- **Shipped** (§7.1) — a bare name, e.g. `reqif` above. The name must be one the pinned `methodology_version` ships.
- **Externally-distributed** (§7.2) — a map, carrying its own version and a declared compatibility range against core:

```yaml
packages:
  - reqif                      # a shipped package can sit alongside an external one
  - name: acme-widgets
    distribution: external
    version: "1.2.0"
    compatible_with: ">=3.1.0 <4.0.0"
    validator: "acme-widgets/validate.mjs"
```

`packages` absent, or an empty list, means no package is active — equivalent and interchangeable.

---

## 2. Two dimensions, not one

`coverage_profile` (depth) and `packages` (breadth) bound the vocabulary along two independent axes:

| Axis | Question it answers | Governed by |
|---|---|---|
| **Depth** — `coverage_profile` | How much of the *core* registry is in scope? | [`COVERAGE_PROFILES.md`](COVERAGE_PROFILES.md) — unchanged by this document. |
| **Breadth** — `packages` | Which *optional domain extensions*, if any, sit alongside the core? | This document. |

The two axes are orthogonal. A repository on `coverage_profile: minimal` may still declare `packages: [reqif]` — a package does not require `core` or `full`, and does not widen or narrow the core coverage profile. Conversely, `coverage_profile: full` implies nothing about which packages are active; `full` bounds the core registry, not the package list.

---

## 3. What a package is

A package is:

- **A top-level folder** in the adopter repository, at the same level as `canon/`, `field/`, `codex/` — e.g. `reqif/` — named after the package's declared name in `packages:`.
- **Not a zone.** [`CONTRACT.md`](CONTRACT.md) §5's zone model (`canon` / `field` / `codex`, each with its own trust contract) does not extend to packages. A package is a fourth kind of thing: optional, self-contained, and removable in a way no zone is (data is never migrated between zones, but a package folder can simply be deleted).
- **Self-describing.** A package ships its own spec document (§6), its own object types, and its own validator/tooling. Core specs, core validators, and core tooling carry zero package-specific logic (§4.2).
- **Either shipped by the methodology, or independently declared.** A *shipped* package name works the same way a coverage-profile preset does ([`COVERAGE_PROFILES.md`](COVERAGE_PROFILES.md) §3): an adopter cannot declare an arbitrary bare name — only one the pinned `methodology_version` ships (§7.1). An *externally-distributed* package (§7.2) is maintained outside a core release; it declares its own name, version, and compatibility range instead of appearing in core's shipped-package registry.

---

## 4. The reversibility contract

A package must be removable — delete the folder, remove the name from `packages:`, and the repository is valid with zero trace of the package having existed. Three rules make this true.

### 4.1 References point one way only

A package object may reference a core element by ID (a ReqIF `SpecObject` citing a core `REQUIREMENT`, for instance). **No core element, view, admission record, or tool output may reference a package object.** The dependency graph is a DAG with a single direction: package → canon, never canon → package.

This is not a new validation rule — it falls out of two things the core registry already guarantees:

- The core TYPE registry ([`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §3.1) is closed. A package's own object types and ID grammar MUST be visibly disjoint from it — a package identifier must never be shaped so that it could be mistaken for a core `TYPE-NAME-<integer>` ID.
- Existing referential-integrity checking already requires every cross-reference inside `canon/` to resolve to an admitted object of a known core TYPE. A reference to a package object cannot resolve (package objects are outside the core registry by construction), so it is already rejected by the checks a core validator runs today — no package-aware code is needed in core tooling to catch this.

### 4.2 Package validator rules live in the package

No package-specific check is ever wired into a core validator (`packages/ingest-cli`, `scripts/check-notations.mjs`, or Studio's validator registry). A package's own tooling runs only when the package is declared; when it is not, that tooling is simply never invoked — there is no flag to check, because there is no code path that knows the package exists.

This is what makes absence silent (§5): a core validator that has never heard of a package cannot warn about it.

**Discovery is a lookup, not a check.** `@transitrix/ingest-cli`'s `check-packages` command resolves, for each declared package, the path to its own validator entry point — from the shipped-package registry (§7.1) for a shipped name, or from the declaration itself (§7.2, `validator:`) for an externally-distributed one — and, if that path exists, runs it as a subprocess. `check-packages` reads an exit code and stdout; it never parses what a validator checks. This is the same boundary a name → membership table already keeps for a coverage preset (`coverage-presets.mjs` knows a preset's TYPE list, never why a TYPE belongs to it) — a name → path table carries no more package-specific knowledge than a name → membership table does. No package-specific rule (an `if` on a package name, a hardcoded field name) ever appears in core.

### 4.3 Removal is tested, not just documented

A package's own spec document (§6) states its removal procedure. The baseline procedure — delete the package folder, remove its name from `packages:` — is the same for every package; a package MAY add package-specific steps (e.g. clearing a generated cache) but MUST NOT require any change to a file outside its own folder plus the one line in `transitrix.yaml`. The procedure is demonstrated as a test against a worked instance of the package, not asserted in prose alone.

---

## 5. Absence is silence

A repository whose `packages:` list omits a given package name behaves, for that package, exactly as if the package did not exist:

- No object type the package defines is admitted anywhere in `canon/`, `field/`, or `codex/` (§4.1 — there is nowhere for such a reference to resolve).
- No package validator rule runs (§4.2).
- No view renders package content — a package's own views are defined and shipped inside the package; core view notations know nothing of them.
- **No warning is emitted.** An undeclared package is not a gap to flag — it is the default. This mirrors how an out-of-profile core TYPE is a silent absence under `coverage_profile` ([`COVERAGE_PROFILES.md`](COVERAGE_PROFILES.md) §6.1), with one difference: an out-of-profile core TYPE still gets a `CP-003` rejection if someone writes one anyway, because the core validator knows the full core registry. A package TYPE gets no equivalent rejection message from core tooling, because core tooling does not know the package's registry at all (§4.2) — the package's own validator is the only thing that could reject it, and that validator does not run unless the package is declared.

---

## 6. What a package's own spec must state

Each shipped or externally-distributed package ships a spec document (convention: `notations/packages/<name>.md` for a shipped package; wherever the external package's own repository keeps it) that states, at minimum:

| Element | Requirement |
|---|---|
| **Name and folder** | The `packages:` name and the top-level folder it governs. |
| **Object types and ID grammar** | The package's own registry of object types and their identifier shape — visibly disjoint from the core `TYPE-NAME-<integer>` grammar (§4.1). |
| **Validator** | What the package's own tooling checks, and where that tooling lives. |
| **Removal procedure** | The baseline two-step procedure (§4.3) plus any package-specific addition. |
| **Experimental status and review date** | Whether the package is experimental, and the date its status is next reviewed. **Required, not implied** — a package that says nothing about its status is not thereby stable; silence is not a valid value here. Core specs are never refactored to accommodate a package's experimental surface — an experimental package's rough edges stay contained inside the package. |
| **Core envelope** | Does this package's own object types carry [`CONTRACT.md`](CONTRACT.md)'s core envelope — the required header (§2), admission record (§6), and lifecycle (§7) — yes or no. **Required, not implied**; silence is invalid here for the same reason it is above. Answering "yes" means **citing** `CONTRACT.md` §2/§6/§7, never restating their field lists — the package's own validator enforces those core rule codes against the package's objects. Answering "no" requires one explicit sentence saying why not (e.g. an interchange-format package whose objects arrive pre-admission and are never themselves admitted). Either way, no parallel core-envelope-shaped rule is invented inside the package. |

---

## 7. Version pinning

Two package classes, distinguished by the declaration shape a `packages:` entry uses (§1).

### 7.1 Shipped packages

Like a coverage-profile preset, the set of *shipped* packages a methodology version carries is part of that version's registry. A bare `packages:` entry naming a package the pinned `methodology_version` does not ship is rejected (§8, `PKG-001`) — the same discipline [`COVERAGE_PROFILES.md`](COVERAGE_PROFILES.md) §7 applies to preset names. A shipped package's own version and compatibility travel with the methodology release that carries it (§9) — it carries no independent `version:`/`compatible_with:` of its own.

| `packages:` name | Spec | Status |
|---|---|---|
| `reqif` | [`packages/reqif.md`](packages/reqif.md) | object model + workflow-state/revisions/suspect-links landed; experimental, reviewed by 2027-01-28 ([`reqif.md`](packages/reqif.md) §8) |

### 7.2 Externally-distributed packages

A package maintained outside a core release — not in the §7.1 table — is declared as a map, not a bare string (§1):

```yaml
packages:
  - name: acme-widgets
    distribution: external
    version: "1.2.0"
    compatible_with: ">=3.1.0 <4.0.0"
    validator: "acme-widgets/validate.mjs"
```

| Key | Required | Semantics |
|---|---|---|
| `name` | yes | The package's own name — the same role a shipped package's bare `packages:` entry plays; used for its top-level folder (§3) and to correlate with its own spec (§6). |
| `distribution` | yes | Fixed value `external` — the class marker; a map entry lacking it, or spelling any required key wrong, is still typo-rejected (§8, `PKG-001`), never silently accepted as some third shape. |
| `version` | yes | The package's own SemVer version — independent of `methodology_version` (§9's "out of scope" restriction on independent versioning applies only to shipped packages, §7.1). |
| `compatible_with` | yes | A SemVer range the pinned `methodology_version` must satisfy for this declaration to be valid — comparator terms space-separated (`>=3.1.0 <4.0.0`). A repo whose `methodology_version` falls outside the range is rejected (§8, `PKG-002`). |
| `validator` | yes | A path, relative to the adopter repo root, to the package's own validator entry point (§4.2's discovery note) — a script `check-packages` runs if the path exists, and silently skips if it does not (declared-but-not-installed is absence, not an error). |

A required key missing or unparseable is `PKG-001` (§8) — the same rule a shipped-name typo trips, so an adopter sees one class of error for "this `packages:` entry does not resolve," regardless of which shape it took.

---

## 8. Validation rules

| Rule | Severity | Description |
|---|---|---|
| `PKG-001` | error | `packages` is present and either not a list, or names a bare entry that is not a package shipped by the pinned `methodology_version` (§7.1), or is a map entry (§7.2) missing/malformed one of `name`, `distribution`, `version`, `compatible_with`, `validator`. |
| `PKG-002` | error | An externally-distributed package's `compatible_with` range (§7.2) does not admit the repo's pinned `methodology_version`, or the range itself does not parse. |

No other rule is defined here. A one-way-reference violation is caught by existing core referential-integrity checking (§4.1); a package's internal consistency is governed entirely by that package's own spec and tooling (§4.2), never by a core rule code. Implementation: `@transitrix/ingest-cli`'s `check-packages` command (`packages/ingest-cli/src/packages.mjs`).

---

## 9. Out of scope (v1)

- **Cross-package references.** Two packages referencing each other's objects is undefined; each shipped package's own spec must say whether it permits this (default: no).
- **Per-package coverage profiles.** A package either is or isn't declared; there is no partial/profiled adoption of a package's own vocabulary in v1.
- **Independent versioning for a *shipped* package.** A shipped package's spec ships and versions together with the methodology release that carries it (§7.1); it does not carry its own independent SemVer line in v1. (An *externally-distributed* package does — that is the point of the class, §7.2 — so this restriction does not extend to it.)

---

## 10. References

- [`MANIFEST.md`](MANIFEST.md) §2 — the `packages:` field on `transitrix.yaml`.
- [`COVERAGE_PROFILES.md`](COVERAGE_PROFILES.md) — the depth axis (§2 of this document draws the boundary between the two).
- [`CONTRACT.md`](CONTRACT.md) §5 — the zone model packages sit outside of; §2/§6/§7 — the core envelope a package's own spec states its relationship to (§6).
- [`IDS_AND_REFERENCES.md`](IDS_AND_REFERENCES.md) §3.1 — the closed core TYPE registry a package's ID grammar must stay disjoint from.
- [`packages/ingest-cli/src/packages.mjs`](../packages/ingest-cli/src/packages.mjs) — `check-packages`: declaration parsing, `PKG-001`/`PKG-002`, and package-agnostic validator-entry-point discovery (§4.2).
