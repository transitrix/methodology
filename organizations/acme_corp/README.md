# acme_corp — worked Transitrix adopter repository

A worked example of a Transitrix **architecture-as-text** repository: the canonical zoned layout (`canon/` + `field/` + `codex/`), populated with example element primitives and view documents that conform to the published methodology. Clone it to see both *how a view looks* and *what an element-primitive file looks like*.

The methodology canon lives at `github.com/transitrix/methodology` under [`notations/`](../../notations/). This repo **follows** the published specs at the version pinned in [`transitrix.yaml`](transitrix.yaml); it does not vendor a copy of `notations/`.

## 📁 Repository structure

```
acme_corp/
├── transitrix.yaml              # adopter manifest — methodology version, notations, zones (notations/MANIFEST.md)
├── AGENTS.md                    # assistant-neutral agent guide (canonical for all assistants)
├── canon/                       # validated model — the authoritative zone
│   ├── elements/                # element primitives, one file per element, by ArchiMate layer
│   │   ├── 01_motivation/       # FACTOR, GOAL, CONSTRAINT, REQUIREMENT
│   │   ├── 02_business/         # CAPABILITY, PROCESS, PRODUCT, ROLE, UNIT, EMPLOYEE, RULE
│   │   ├── 03_application/      # APPLICATION, INTEGRATION
│   │   ├── 04_technology/       # (no registry element TYPE yet)
│   │   └── 05_implementation/   # CHANGE, ACTIVITY
│   ├── relations/               # first-class time-aware relations (REL) — notations/elements/17-relations.md
│   ├── assertions/              # compliance assertions (ASSERTION) — notations/elements/16-assertion.md
│   └── views/                   # render-able view documents, one subfolder per notation
├── field/                       # raw inputs (interviews, surveys, observations, drafts) — not authoritative
├── codex/                       # external laws/regulations + internal policies/standards, faithful to source
│   ├── external/<jurisdiction>/ # LAW, REGULATION
│   └── internal/                # POLICY, INTERNAL_STANDARD
├── operations/                  # operational layer (NOT a zone) — the team's ADRs + Work Items
│   ├── decisions/               #   ADR-NNNN-<slug>.md
│   └── work-items/              #   WI-NNNN-<slug>.md
└── .templates/                  # copy-and-fill templates for new elements / views / relations
```

The three **zones** (`canon` / `field` / `codex`) are parallel, not stacked — see [`notations/CONTRACT.md`](../../notations/CONTRACT.md) §5. The `operations/` folder sits alongside the zones as a separate **operational layer**: it records how the team applying Transitrix runs itself (decisions and work items), not the enterprise being modelled. See [`method/team-operations.md`](../../method/team-operations.md) for the convention and [`operations/README.md`](operations/README.md) for the local rules.

## 🚀 Quick start

### 1. Create an element primitive

```bash
cp .templates/elements/02_business_template.yaml \
   canon/elements/02_business/processes/PROCESS-MY-1.yaml
# Edit: set notation/id/name, the per-TYPE fields, the admission record, and valid_from/valid_to.
```

Every element file carries the common envelope — `notation:` header, identity, **admission record** (`zone`/`admitted_at`/`admitted_by`/`gate_checks`, [`CONTRACT.md`](../../notations/CONTRACT.md) §6) and **primitive lifecycle** (`valid_from`/`valid_to`, §7). The per-TYPE field sets are defined in [`notations/ELEMENT_PRIMITIVES.md`](../../notations/ELEMENT_PRIMITIVES.md) §7.

### 2. Author a view

```bash
cp .templates/goals.goals.transitrix.yaml \
   canon/views/goals/strategy-2026.goals.transitrix.yaml
# Fill the FILL-ME placeholders; keep the notation: / spec_version: header.
```

Views reference elements by **canonical ID** (`GOAL-…`, `CAPABILITY-V1`, `PROCESS-…`); they don't duplicate them.

### 3. Validate

Each notation has a "Validation rules" table in its spec ([`notations/views/`](../../notations/views/), [`notations/elements/`](../../notations/elements/)); the shared header (`HDR-001..004`), lifecycle (`LIFECYCLE-001..004`), and element-placement (`ELEM-001..005`) rules are in [`CONTRACT.md`](../../notations/CONTRACT.md) and [`ELEMENT_PRIMITIVES.md`](../../notations/ELEMENT_PRIMITIVES.md) §9. Transitrix Studio (VS Code) and `npx @transitrix/cli validate <file>` surface these.

### 4. Open a PR

Architecture changes review as a diff, same as code — branch, commit, PR, gated merge.

## 📋 Element TYPEs by layer

The canonical TYPE registry is [`notations/IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md) §3.1. Element primitives placed in `canon/elements/<NN>_<layer>/`:

| Layer | TYPEs |
|---|---|
| **01_motivation** | `FACTOR`, `GOAL`, `CONSTRAINT`, `REQUIREMENT` |
| **02_business** | `CAPABILITY` (V/H sub-grammar), `PROCESS`, `PRODUCT`, `ROLE`, `UNIT`, `EMPLOYEE`, `RULE` |
| **03_application** | `APPLICATION`, `INTEGRATION` |
| **04_technology** | *(no registry element TYPE yet)* |
| **05_implementation** | `CHANGE`, `ACTIVITY` |

Other registry TYPEs live outside the layered element tree: `REL` (`canon/relations/`), `ASSERTION` (`canon/assertions/`), codex artefacts (`LAW`/`REGULATION`/`POLICY`/`INTERNAL_STANDARD`, in `codex/`), and field artefacts (`INTERVIEW`/`SURVEY`/`OBSERVATION`/`DRAFT`, in `field/`).

## 🔗 Relationships

Transitrix models links two ways (see [`ELEMENT_PRIMITIVES.md`](../../notations/ELEMENT_PRIMITIVES.md) §3 and [`elements/17-relations.md`](../../notations/elements/17-relations.md)):

- **Inline cross-references** — a typed-ID field on an element or view entry (`owner_role: ROLE-…`, `goals: [GOAL-…]`, `applies_to: [PROCESS-…]`). Plural field → array, singular → one ID ([`IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md) §5). Timeless within the host file.
- **First-class time-aware relations (`REL`)** — a `canon/relations/REL-…yaml` file with its own `valid_from`/`valid_to`, for links where the temporal dimension matters. The `type` enum is **closed**: `parent`, `goal_parent`, `activity_goal`, `unit_parent` ([`17-relations.md`](../../notations/elements/17-relations.md) §3). A re-parenting is two REL files (one ended, one new).

## ✅ Validation model

- **Header** — every notation file starts with `notation: <short-name>` ([`CONTRACT.md`](../../notations/CONTRACT.md) §1–2, `HDR-001..004`).
- **Admission record** — every canon artefact records the gate that admitted it (`CONTRACT.md` §6).
- **Primitive lifecycle** — every element carries `valid_from`/`valid_to` (`CONTRACT.md` §7); the model shows the organisation *in motion*.
- **IDs & cross-references** — canonical grammar `<TYPE>-[<middle>-]<INTEGER>`, no leading zeros; cross-references resolve to a defined element of the correct TYPE ([`IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md) §1, §5).

## 📚 Documentation

- Methodology canon: [`notations/`](../../notations/) — start at [`README.md`](../../notations/README.md) (notation index + family selection).
- Element-primitive schema: [`notations/ELEMENT_PRIMITIVES.md`](../../notations/ELEMENT_PRIMITIVES.md).
- This repo's agent guide: [`AGENTS.md`](AGENTS.md). Onboarding walkthrough: [`GETTING_STARTED.md`](GETTING_STARTED.md). ID/naming conventions: [`CONVENTIONS.md`](CONVENTIONS.md).

---

**Methodology version:** pinned in [`transitrix.yaml`](transitrix.yaml) (`methodology_version`).
