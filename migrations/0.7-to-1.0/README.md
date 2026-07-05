# Migration recipe — methodology 0.7 → 1.0

The on-disk migration recipe an adopter follows when upgrading from methodology
version 0.7 to 1.0. Format per [`notations/CONTRACT.md`](../../notations/CONTRACT.md)
§10.4 and [`RELEASING.md`](../../RELEASING.md); see also
[`CHANGELOG.md`](../../CHANGELOG.md) (1.0.0).

---

## What this recipe covers

1.0.0 is the first stable release. All deprecation-window aliases introduced in
pre-1.0 releases now become **hard errors**. Adopters who stayed on the canonical
forms throughout the pre-1.0 period have nothing to migrate. Adopters who used
any of the deprecated forms must apply the transforms below before bumping
`methodology_version` to `"1.0.0"`.

| Transform | Old (deprecated) | Canonical (required at 1.0) |
|---|---|---|
| **A** | `ACTIVITY-*` IDs, `notation: activity`, `activities:` root key, `*.activities.transitrix.yaml` files | `ACTION-*`, `notation: action`, `actions:`, `*.action.transitrix.yaml` |
| **A** | `activity-card` notation, `ACTIVITY_CARD` doc type, `*.activity-card.transitrix.yaml`, `activity_card:` | `action-card`, `ACTION_CARD`, `*.action-card.transitrix.yaml`, `action_card:` |
| **B** | `INFORMATION_ENTITY-*` IDs, `information_entities:` field | `BUSINESS_OBJECT-*`, `business_objects:` |
| **C** | `compliance-impact` files without `report_type` | `view.report_type: product \| process \| combined` (required) |
| **D** | Abbreviated prefix IDs: `ACT-`, `CHG-`, `FAC-`, `FACTOR-`, `SCEN-`, `SCN-` | Canonical TYPEs: `ACTION-`, `CHANGE-`, `DRIVER-`, `DRIVER-`, `SCENARIO-`, `SCENARIO-` |

**Adopters who only use elements that post-date the deprecated forms** (i.e. who
started with 0.7.0 and only used canonical forms from the start) have nothing
to migrate — run the validator to confirm:

```bash
node migrations/0.7-to-1.0/validate.mjs <adopter-root>   # exit 0 = clean
```

---

## Transform A — Complete the ACTIVITY → ACTION rename

The `ACTIVITY` primitive was renamed to `ACTION` during the 0.7 pre-release cycle
(aligning with ArchiMate 3.2 Work Package terminology). At 1.0 the deprecated
`ACTIVITY-` prefix ID form, `notation: activity`, `activities:` root array,
`activity_type:` field, and `*.activities.transitrix.yaml` file extension are
all removed.

### A.1 — Element files

For each element file in `canon/elements/05_implementation/actions/` that
carries the old form:

```yaml
# Before (deprecated; ACTIVITY-NAME-001 or ACTIVITY-001 form)
notation: action        # was: notation: activity  — correct form already landed mid-cycle
id: ACTIVITY-LAUNCH-1   # wrong prefix

# After
notation: action
id: ACTION-LAUNCH-1
```

File name must match the `id:` field. Rename:

```bash
mv canon/elements/05_implementation/actions/ACTIVITY-LAUNCH-1.yaml \
   canon/elements/05_implementation/actions/ACTION-LAUNCH-1.yaml
```

### A.2 — View files (`*.action.transitrix.yaml`)

In `*.action.transitrix.yaml` files:

```yaml
# Before
notation: activities    # deprecated alias
activities:             # deprecated root array
  - id: ACT-001
    activity_type: project

# After
notation: action
actions:
  - id: ACTION-LAUNCH-1
    type: project
```

### A.3 — File extension (`*.activities.transitrix.yaml`)

Rename to `*.action.transitrix.yaml` and update the `notation:` field inside
the file.

### A.4 — Action-card files

In `*.action-card.transitrix.yaml` files:

```yaml
# Before
notation: activity-card
activity_card:
  id: ACTION_CARD-EU-1

# After
notation: action-card
action_card:
  id: ACTION_CARD-EU-1
```

Rename `*.activity-card.transitrix.yaml` → `*.action-card.transitrix.yaml`.

### A.5 — Cross-references

Wherever `ACTIVITY-*` IDs appear as reference values (not in the file that
defines the element), update them to `ACTION-*`. Key locations: `delivers_changes:`,
`actions:`, `goal.actions:`, and any other cross-reference arrays.

---

## Transform B — Complete the INFORMATION_ENTITY → BUSINESS_OBJECT rename

`INFORMATION_ENTITY` was renamed to `BUSINESS_OBJECT` (aligning with ArchiMate
3.2 Business Object terminology) in the 0.5–0.6 pre-release cycle. The one-release
alias window closes at 1.0.

### B.1 — Element files

Rename element files and update their fields:

```yaml
# Before
notation: business_object    # rename: information_entity was the old value
id: INFORMATION_ENTITY-ORDER-1

# After
notation: business_object
id: BUSINESS_OBJECT-ORDER-1
```

File rename:

```bash
mv canon/elements/02_business/business-objects/INFORMATION_ENTITY-ORDER-1.yaml \
   canon/elements/02_business/business-objects/BUSINESS_OBJECT-ORDER-1.yaml
```

### B.2 — Process-blueprint views

```yaml
# Before
information_entities:
  - id: INFORMATION_ENTITY-ORDER-1
    name: "Customer order"

# After
business_objects:
  - id: BUSINESS_OBJECT-ORDER-1
    name: "Customer order"
```

---

## Transform C — Add `report_type` to compliance-impact files (manual)

Every `*.compliance-impact.transitrix.yaml` file must now declare
`view.report_type`. The codemod cannot infer the intent — add it manually:

```yaml
view:
  report_type: product        # product | process | combined
  # ...rest of view config
```

Choose `product` if the file's `subjects.products` list (or default all-products)
is the intended scope; `process` if `subjects.processes` are listed; `combined`
if both subject types are present. Validation code `COMPIMP-011` fires (error)
if the field is absent.

---

## Transform D — Deprecated abbreviated prefix IDs (hard errors at 1.0)

Several abbreviated ID prefixes were deprecated in earlier releases. At 1.0 they
are hard errors. Replace each wherever it appears in ID values:

| Deprecated prefix | Canonical form |
|---|---|
| `ACT-` | `ACTION-` |
| `CHG-` | `CHANGE-` |
| `FAC-` | `DRIVER-` |
| `FACTOR-` | `DRIVER-` (grace period from 0.7 closes at 1.0) |
| `SCEN-` | `SCENARIO-` |
| `SCN-` | `SCENARIO-` |

> **`FACTOR-*` note.** The 0.6 → 0.7 migration renamed element files and IDs from
> `FACTOR-` to `DRIVER-`. The 0.7 recipe gave a grace period for cross-reference
> *values* (allowing `factors: [FACTOR-EU-REG-1]` without a hard error until 1.0).
> That grace period now ends — replace all remaining `FACTOR-` values with `DRIVER-`.

---

## Step 1 — Run the codemod

`codemod.mjs` automates Transforms A, B, and D. Transform C (report_type) is
manual — the codemod reports compliance-impact files missing the field but does
not add it.

```bash
# Preview
node migrations/0.7-to-1.0/codemod.mjs <adopter-root> --dry-run

# Apply
node migrations/0.7-to-1.0/codemod.mjs <adopter-root>

# Post-migration check
node migrations/0.7-to-1.0/validate.mjs <adopter-root>
```

## Step 2 — Fix any `COMPIMP-011` warnings

Add `view.report_type` manually to each compliance-impact file listed by the
codemod output (Transform C above).

## Step 3 — Bump `methodology_version`

```yaml
# transitrix.yaml
methodology_version: "1.0.0"
```

## Step 4 — Re-run `repo-check`

```bash
transitrix-ingest repo-check [org-root]
```

A clean run shows `tooling.ok: true` with no version-mismatch flag and no
deprecated-ID warnings.

---

## Folder shape

```
migrations/0.7-to-1.0/
├── README.md
├── codemod.mjs       # idempotent; Transforms A, B, D; reports C misses
├── validate.mjs      # post-migration check; exits 0 on clean repo
└── fixtures/
    ├── before/       # minimal adopter repo in 0.7 deprecated form
    └── after/        # the same after codemod.mjs (C applied manually)
```
