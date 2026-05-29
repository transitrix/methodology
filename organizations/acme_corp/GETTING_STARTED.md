# Getting started with Transitrix

A first modelling session in the Transitrix **architecture-as-text** methodology. You'll author a view, create an element primitive it references, and validate — all as plain YAML under Git.

The fastest path for a brand-new repo is the **onboarding Skill** (`/transitrix-onboard`), which scaffolds the zoned layout and walks you through your first file. This guide is the manual equivalent against the worked `acme_corp` repo.

## Prerequisites

- Git.
- VS Code with **Transitrix Studio** — live diagram preview + inline validation as you edit (recommended).
- Basic YAML.
- *Optional:* `npx @transitrix/cli validate <file>` for command-line validation.

## Step 1 — Understand the layout

A Transitrix repo has three parallel **zones** ([`notations/CONTRACT.md`](../../notations/CONTRACT.md) §5):

- **`canon/`** — the authoritative model. View documents in `canon/views/<notation>/`; element primitives in `canon/elements/<NN>_<layer>/<plural-type>/`; first-class relations in `canon/relations/`.
- **`field/`** — raw inputs (interviews, surveys, …); not authoritative.
- **`codex/`** — external laws/regulations + internal policies/standards, faithful to source.

Read [`notations/README.md`](../../notations/README.md) for the notation index and family selection.

## Step 2 — Author your first view (a Goals tree)

The Goals tree is the simplest starting point. The onboarding Skill copies a starter template (`templates/goals.goals.transitrix.yaml` from its bundle) into `canon/views/goals/<domain>.goals.transitrix.yaml`; in this repo a worked example already lives under [`canon/views/goals/`](canon/views/goals/). Keep the `notation: goals` / `spec_version:` header — it's required ([`CONTRACT.md`](../../notations/CONTRACT.md) §1). Fill the `FILL-ME` placeholders. A Goals tree is flat top-level arrays — `goal_types[]` + `goals[]`, hierarchy via `parent: GOAL-…` ([`notations/views/04-goals.md`](../../notations/views/04-goals.md)).

## Step 3 — Create an element primitive

Elements referenced across documents get a standalone file. Create a `GOAL` under the motivation layer:

```bash
cp .templates/elements/01_motivation_template.yaml \
   canon/elements/01_motivation/goals/GOAL-REVENUE-1.yaml
```

Set the canonical envelope ([`notations/ELEMENT_PRIMITIVES.md`](../../notations/ELEMENT_PRIMITIVES.md) §3): `notation: goal`, a canonical `id` (`GOAL-REVENUE-1` — no leading zeros), `name`, the per-TYPE fields (§7.2), the **admission record** (`zone`/`admitted_at`/`admitted_by`/`gate_checks`, §6) and the **primitive lifecycle** (`valid_from`/`valid_to`, §7). See the worked examples already in `canon/elements/01_motivation/goals/`.

The view then references the element by ID — it doesn't duplicate it.

## Step 4 — Relationships

Two ways to link, depending on whether time matters ([`ELEMENT_PRIMITIVES.md`](../../notations/ELEMENT_PRIMITIVES.md) §3, [`elements/17-relations.md`](../../notations/elements/17-relations.md)):

- **Inline cross-reference** — a typed-ID field: `owner_role: ROLE-…`, `goal.factors: [FACTOR-…]`, `activity.goals: [GOAL-…]`, `rule.applies_to: [PROCESS-…]`. Plural → array, singular → one ID ([`IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md) §5). Timeless within the host file. This covers most links.
- **First-class time-aware relation (`REL`)** — a `canon/relations/REL-…yaml` file with its own `valid_from`/`valid_to`. Use it only for the links where history matters. The `type` enum is **closed**: `parent`, `goal_parent`, `activity_goal`, `unit_parent` ([`17-relations.md`](../../notations/elements/17-relations.md) §3). A re-parenting is two REL files (one ended, one new) — see `canon/relations/REL-CAP-V11-PARENT-*.yaml`.

## Step 5 — Validate

- **Studio** previews and validates on save.
- **CLI:** `npx @transitrix/cli validate canon/views/goals/strategy-2026.goals.transitrix.yaml`.
- The rules: the shared header (`HDR-001..004`, [`CONTRACT.md`](../../notations/CONTRACT.md) §2), lifecycle (`LIFECYCLE-001..004`, §7), element placement (`ELEM-001..005`, [`ELEMENT_PRIMITIVES.md`](../../notations/ELEMENT_PRIMITIVES.md) §9), plus each notation's own "Validation rules" table.

## Step 6 — Commit and open a PR

```bash
git checkout -b feature/strategy-2026-goals
git add canon/
git commit -m "docs(canon): add 2026 goals tree + revenue goal"
git push origin feature/strategy-2026-goals
```

Architecture changes review as a diff, like code.

## Step 7 — What next

Based on what you built, add the adjacent artefact ([`notations/README.md`](../../notations/README.md) family selection):

- Built a **Goals tree** → add an **FGCA**/**FGA** to link goals to driving factors and delivery activities.
- Built **FGCA** → add a **Capability map** for the same domain.
- Built a **Capability map** → add an **Applications catalogue**.

## Naming conventions

Every typed ID is `<TYPE>-[<middle>-]<INTEGER>` — uppercase TYPE from the registry ([`IDS_AND_REFERENCES.md`](../../notations/IDS_AND_REFERENCES.md) §1, §3.1), no leading zeros (`GOAL-REVENUE-1`, not `GOAL-REVENUE-001`). `CAPABILITY` uses the V/H sub-grammar (`CAPABILITY-V1.2`). Element files are named `<ID>.yaml`. Full conventions: [`CONVENTIONS.md`](CONVENTIONS.md).

## Getting help

- Methodology canon: [`notations/`](../../notations/) (start at [`README.md`](../../notations/README.md)).
- Element-primitive schema: [`notations/ELEMENT_PRIMITIVES.md`](../../notations/ELEMENT_PRIMITIVES.md).
- This repo's agent guide: [`AGENTS.md`](AGENTS.md).

---

**Happy architecting! 🏗️**
