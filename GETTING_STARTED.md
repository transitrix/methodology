# Getting started with Transitrix

A first modelling session in the Transitrix **architecture-as-text** methodology. You'll author a view, create an element primitive it references, and validate — all as plain YAML under Git.

The fastest path for a brand-new repo is the **onboarding Skill** (`/transitrix:onboard`), which scaffolds the zoned layout and walks you through your first file. This guide is the manual equivalent, illustrated against the worked [`transitrix/acme-corp`](https://github.com/transitrix/acme-corp) example repo.

## Prerequisites

- Git.
- VS Code with **Transitrix Studio** — live diagram preview + inline validation as you edit (recommended).
- Basic YAML.
- *Optional:* `npx @transitrix/cli validate <file>` for command-line validation. On Windows PowerShell with a restricted execution policy, use `npx.cmd` instead of `npx` — see Step 5.

## Step 1 — Understand the layout

A Transitrix repo has three parallel **zones** ([`notations/CONTRACT.md`](notations/CONTRACT.md) §5):

- **`canon/`** — the authoritative model. Element primitives in `canon/elements/<NN>_<layer>/<plural-type>/`; first-class relations in `canon/relations/`.
- **`views/`** — derived projections over canonical elements and relations. View documents in `views/<notation>/`.
- **`field/`** — raw inputs (interviews, surveys, …); not authoritative.
- **`codex/`** — external laws/regulations + internal policies/standards, faithful to source.

Read [`notations/README.md`](notations/README.md) for the notation index and family selection. Full repository layout, including the multi-tenant `organizations/<org_slug>/` structure: [`method/02-repository.md`](method/02-repository.md).

**Scaffolding a brand-new organisation from scratch** (rather than adding to an existing one) is the same onboarding Skill mentioned above, run once per organisation:

1. Scaffold with `/transitrix:onboard`, or copy the structure from the [acme-corp reference repo](https://github.com/transitrix/acme-corp) as a starting point.
2. Create `organizations/<your_org_slug>/` (multi-tenant repo) or use the repo root (single-tenant).
3. Adapt `.templates/` to local conventions and overrides.
4. Add the first elements to `canon/elements/` — Steps 2–3 below walk through the first one.
5. Open a pull request to introduce the organisation; the validators check the structure.

## Step 2 — Author your first view (a Goals tree)

The Goals tree is the simplest starting point. The onboarding Skill copies a starter template (`templates/goals.dgca.transitrix.yaml` from its bundle) into `views/goals/<domain>.dgca.transitrix.yaml`; the `transitrix/acme-corp` worked example already has one under [`views/goals/`](https://github.com/transitrix/acme-corp/tree/main/views/goals). Keep the `notation: goals` / `spec_version:` header — it's required ([`CONTRACT.md`](notations/CONTRACT.md) §1). Fill the `FILL-ME` placeholders. A Goals tree is flat top-level arrays — `goal_types[]` + `goals[]`, hierarchy via `parent: GOAL-…` ([`notations/views/04-goals.md`](./notations/views/diagrams/04-goals.md)).

## Step 3 — Create an element primitive

Elements referenced across documents get a standalone file. Scaffold a `GOAL` under the motivation layer with the CLI — it computes the rest of the envelope for you, so you supply only the element's own content:

```bash
npx @transitrix/cli new goal --id GOAL-REVENUE-1 --name "Triple EU revenue" --description "Grow EU revenue 3x over three years."
```

(Windows PowerShell with a restricted execution policy: `npx.cmd` in place of `npx` — see Step 5.) `--dry-run` previews the file without writing it; `--author` overrides the default committer identity; `--valid-from` overrides today's date if the goal has been true since earlier. Run `transitrix new goal --help` for the full option list, and `transitrix new <driver|constraint|requirement> --help` for the other motivation-layer TYPEs. See the worked examples in `transitrix/acme-corp`'s [`canon/elements/01_motivation/goals/`](https://github.com/transitrix/acme-corp/tree/main/canon/elements/01_motivation/goals).

Already have a hand-authored file that's missing fields? `npx @transitrix/cli validate <file> --fix` fills them in place and reports what it filled.

The view then references the element by ID — it doesn't duplicate it.

## Step 4 — Relationships

Two ways to link, depending on whether time matters ([`ELEMENT_PRIMITIVES.md`](notations/ELEMENT_PRIMITIVES.md) §3, [`elements/17-relations.md`](notations/elements/17-relations.md)):

- **Inline cross-reference** — a typed-ID field: `owner_role: ROLE-…`, `goal.factors: [DRIVER-…]`, `action.goals: [GOAL-…]`, `rule.applies_to: [PROCESS-…]`. Plural → array, singular → one ID ([`IDS_AND_REFERENCES.md`](notations/IDS_AND_REFERENCES.md) §5). Timeless within the host file. This covers most links.
- **First-class time-aware relation (`REL`)** — a `canon/relations/REL-…yaml` file with its own `valid_from`/`valid_to`. Use it only for the links where history matters. The `type` enum is **closed**: `parent`, `goal_parent`, `action_goal`, `unit_parent` ([`17-relations.md`](notations/elements/17-relations.md) §3). A re-parenting is two REL files (one ended, one new) — see the worked example's `canon/relations/REL-CAP-V11-PARENT-*.yaml`.

## Step 5 — Validate

- **Studio** previews and validates on save.
- **CLI:** `npx @transitrix/cli validate views/goals/strategy-2026.dgca.transitrix.yaml`. All canonical `*.<short-name>.transitrix.yaml` extensions are accepted without `--ext`; pass `--ext <notation-name>` only for a non-canonical extension outside the built-in registry.
- **On Windows PowerShell** with a restricted execution policy (the default on many workstations), invoke as `npx.cmd @transitrix/cli validate <file>` — the unsuffixed `npx` resolves to a `.ps1` wrapper that the policy refuses to launch. From `cmd.exe`, WSL, or a shell on macOS/Linux, plain `npx` is fine.
- The rules: the shared header (`HDR-001..004`, [`CONTRACT.md`](notations/CONTRACT.md) §2), lifecycle (`LIFECYCLE-001..004`, §7), element placement (`ELEM-001..005`, [`ELEMENT_PRIMITIVES.md`](notations/ELEMENT_PRIMITIVES.md) §9), plus each notation's own "Validation rules" table.

## Step 6 — Commit and open a PR

```bash
git checkout -b feature/strategy-2026-goals
git add canon/
git commit -m "docs(canon): add 2026 goals tree + revenue goal"
git push origin feature/strategy-2026-goals
```

Architecture changes review as a diff, like code.

## Step 7 — What next

Based on what you built, add the adjacent artefact ([`notations/README.md`](notations/README.md) family selection):

- Built a **Goals tree** → add a **DGCA** or **DGA** chain to link goals to driving drivers and delivery actions.
- Built **DGCA** → add a **Capability map** for the same domain.
- Built a **Capability map** → add an **Applications catalogue**.

## Naming conventions

Every typed ID is `<TYPE>-[<middle>-]<INTEGER>` — uppercase TYPE from the registry ([`IDS_AND_REFERENCES.md`](notations/IDS_AND_REFERENCES.md) §1, §3.1), no leading zeros (`GOAL-REVENUE-1`, not `GOAL-REVENUE-001`). `CAPABILITY` uses the V/H sub-grammar (`CAPABILITY-V1.2`). Element files are named `<ID>.yaml`. Full conventions: [`notations/CONVENTIONS.md`](notations/CONVENTIONS.md).

## Getting help

- Methodology canon: [`notations/`](notations/) (start at [`README.md`](notations/README.md)).
- Element-primitive schema: [`notations/ELEMENT_PRIMITIVES.md`](notations/ELEMENT_PRIMITIVES.md).
- An adopter repo's own agent guide is scaffolded by the onboarding Skill from [`transitrix/skills/onboard/templates/AGENTS.md`](transitrix/skills/onboard/templates/AGENTS.md).
- Task procedures beyond a first session — modelling capabilities, modelling complex processes, adopting the Architecture Decision Log, how a model-backed document prints, how a model-backed document is versioned: [`guides/`](guides/).

---

**Happy architecting! 🏗️**
