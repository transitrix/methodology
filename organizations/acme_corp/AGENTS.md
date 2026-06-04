# AGENTS.md — adopter-repo agent guide

> **Draft.** This file is shipped as part of the `acme_corp` template, so every adopter starts with sensible agent guidance out of the box. After you clone `acme_corp` into your own repo, edit the placeholders marked `ADOPTER-FILL-ME` to fit your situation. Treat this draft as a starting point, not a finished policy.

This file tells **any AI coding assistant** — Claude Code, Cursor, GitHub Copilot, Windsurf, Gemini CLI, or another — operating inside an **adopter's** Transitrix repository how to behave. It is intentionally tool-neutral. It does **not** apply to assistants working on the methodology canon itself — that's a different repository with its own agent guide.

## Using this guide with your assistant

`AGENTS.md` is the single, canonical, assistant-neutral guide for this repository — there is one source of truth, regardless of which assistant you use. Point your assistant at it:

- **Assistants that read `AGENTS.md` natively** — use this file directly, no setup.
- **GitHub Copilot** — a pointer at [`.github/copilot-instructions.md`](.github/copilot-instructions.md) redirects here; it ships with the template.
- **Other assistants** (Claude Code → `CLAUDE.md`, Cursor → `.cursor/rules/`, …) — add a one-line pointer file in that tool's location that says *"Read `AGENTS.md` in the repo root and follow it."* Keep the guidance here; the per-tool file is only a redirect.

---

## 1. Repository purpose and scope

This repository is a **text-native enterprise architecture model** authored in the Transitrix notation set. It is not a codebase, it is not documentation about the methodology, and it is not a fork of the methodology canon.

What lives here:

- `canon/` — the **validated model** (the authoritative zone): `views/<notation>/` (model files in the canonical Transitrix notations) and `elements/` (reusable architecture elements by ArchiMate layer `01_motivation/` … `04_technology/`).
- `field/` — **raw, unprocessed inputs**: interviews, surveys, observations, drafts.
- `codex/` — **external constraints** (laws, regulations) and **internal authority documents** (policies, standards).
- `transitrix.yaml` — the adopter manifest: which methodology version, notations, and zones this repo uses.
- `.templates/` — starter files the adopter copies when creating new elements / views.
- `README.md`, `GETTING_STARTED.md`, `CONVENTIONS.md` — adopter-facing onboarding docs.

The agent's job is to **maintain the model** — validate, refactor, extend, and explain it. The agent does not invent the methodology; it consults the canon at [github.com/transitrix/methodology](https://github.com/transitrix/methodology) when in doubt.

---

## 2. Authority of the methodology

The canonical Transitrix methodology lives at [github.com/transitrix/methodology](https://github.com/transitrix/methodology). It is the source of truth for:

- Notation schemas (`notations/<NN>-<name>.md`).
- Shared header contract (`notations/CONTRACT.md`).
- ID grammar and TYPE registry (`notations/IDS_AND_REFERENCES.md`).
- Notation index (`notations/README.md`).

**Resolution order when a local file and the canon disagree:**

1. The canon wins. Always.
2. Update the local file to conform, or open a PR proposing the change.
3. If the canon itself appears wrong or incomplete (a genuine gap, not a typo), raise an issue against `transitrix/methodology` rather than diverging silently.

The agent reads the canon as **read-only**. It never edits methodology files from this repo, and it never copies methodology content into this repo wholesale (link to it instead).

If the Transitrix onboarding Skill (`/transitrix:onboard`) is available, the agent may use its cheat sheet as a quick reference, but the canon remains the source of truth for any conflict.

---

## 3. Repository layout

The canonical layout an adopter inherits from the `acme_corp` template:

```
<repo-root>/
├── transitrix.yaml                 # adopter manifest — methodology version, notations, zones
├── AGENTS.md                       # this file — assistant-neutral agent guide
├── .github/
│   └── copilot-instructions.md     # pointer → AGENTS.md (GitHub Copilot)
├── README.md
├── GETTING_STARTED.md
├── CONVENTIONS.md
├── .templates/                     # starter files to copy (not zoned)
│   ├── elements/
│   ├── relations/
│   └── bpmn/
├── canon/                          # validated model — the authoritative zone
│   ├── elements/                   # elements by ArchiMate layer
│   │   ├── 01_motivation/          # GOAL, PRINCIPLE, CONSTRAINT, DRIVER, OUTCOME, VALUE
│   │   ├── 02_business/            # ROLE, ACTOR, PROCESS, FUNCTION, SERVICE
│   │   ├── 03_application/         # APPLICATION, SERVICE, INTERFACE, DATA_OBJECT
│   │   └── 04_technology/          # NODE, ARTIFACT, DEVICE, …
│   └── views/                      # one subfolder per notation (extensions in canon/views/README.md)
│       ├── bpmn/   fgca/   fga/   goals/   capabilities/   processmap/
│       ├── activities/   blocks/   scenarios/
│       └── applications/   products/   issues/   process-blueprint/
├── field/                          # raw inputs — interviews, surveys, observations, drafts
└── codex/                          # external laws/regulations + internal policies/standards
    ├── external/<jurisdiction>/    # ge/  de/  eu/  …
    └── internal/
```

The `canon/views/` folder names are intentionally shorter than the canonical short names in places (`capabilities/`, `processmap/`) — this is the adopter-side convention and is documented in `canon/views/README.md`.

The agent does **not** change this layout without a deliberate decision recorded in the adopter's PR. Adopter-specific top-level additions (e.g. a `decisions/` ADR folder, a `glossary/` directory) are fine; renaming or removing the canonical folders is not.

### 3.1 Zones

This repo separates three kinds of knowledge, each with its own trust contract (defined in the canon, `notations/CONTRACT.md` §5):

- **`canon/`** — validated truth the organisation asserts about itself. Internally consistent and unique; the authoritative model. `elements/` and `views/` live here.
- **`field/`** — raw, unprocessed material (interviews, surveys, observations, drafts). Contradictions allowed; provenance is the point; **not** authoritative. A Canon record may *cite* a Field artefact via `derived_from:` — a citation, never a migration.
- **`codex/`** — external constraints (laws, regulations, under `external/<jurisdiction>/`) and internal authority documents (policies, standards, under `internal/`), *given to* the organisation rather than authored by it.

Every artefact carries an **admission record** (`zone`, `admitted_at`, `admitted_by`, `gate_checks`, optional `derived_from`) — see `notations/CONTRACT.md` §6. The agent does not move artefacts between zones; it admits a new artefact to the correct zone.

### 3.2 Single-entity vs holding layout

- **Single legal entity** — the repo root *is* the organisation: `canon/`, `field/`, `codex/`, and `transitrix.yaml` sit at the root (the `acme_corp` shape above).
- **Holding (multiple entities)** — the repo root holds one folder per entity, each with its own `canon/` / `field/` / `codex/`, plus a `_shared/` folder for group-level codex/field that binds several entities:

  ```
  <repo-root>/
  ├── transitrix.yaml
  ├── acme_retail/      canon/  field/  codex/
  ├── acme_logistics/   canon/  field/  codex/
  └── _shared/          codex/  field/
  ```

  The agent keeps each entity's zones self-contained and puts only genuinely group-wide artefacts in `_shared/`.

### 3.3 The `transitrix.yaml` manifest

The root `transitrix.yaml` pins which methodology release this repo conforms to and what it uses. Adopters do **not** vendor a copy of `notations/` — they follow the published specs at the pinned version. Schema: `notations/MANIFEST.md`.

```yaml
transitrix: 1
methodology_version: "0.5.0"
notations: [fgca, goals, activities, issues, capability-map, codex]
zones: [canon, field, codex]
```

---

## 4. File extensions and naming

Every notation file follows the per-notation contract in `notations/CONTRACT.md`:

```yaml
notation: <short-name>      # required header — must match the file extension
spec_version: "0.1"         # accepted; will become required at notation v1.0
# … rest of the document
```

The file extension is always `*.<short-name>.transitrix.yaml`. The validator rejects extension/content mismatch (rule `HDR-003`).

Naming convention for view files: `<DOMAIN>.<short-name>.transitrix.yaml`, where `<DOMAIN>` is a short kebab-case or upper-snake-case label for the area (e.g. `order-fulfilment.bpmn.transitrix.yaml`, `RETENTION-2026.fgca.transitrix.yaml`). One canonical instance per notation per domain.

The agent never strips the `notation:` and `spec_version:` headers, and never introduces alias extensions (`*.bpmn.yaml`, `*.fgca.yml`) — they fail validation.

---

## 5. IDs and cross-references

Every typed element ID follows the canonical grammar in `notations/IDS_AND_REFERENCES.md`:

```
<TYPE>-[<middle segment(s)>-]<INTEGER>
```

- **TYPE** — uppercase, letters / digits / underscore, starts with a letter (`FACTOR`, `GOAL`, `PROCESS_BLUEPRINT`, `INFORMATION_ENTITY`).
- **Middle segments** — optional, notation-specific, for disambiguation (`GOAL-RETENTION-12`, `ACTIVITY-Q3-2026-7`).
- **INTEGER** — terminal positive integer, **no leading zeros** (`-1`, not `-001`).
- **Exception:** `CAPABILITY-V1.2`, `CAPABILITY-H1.2.3` — capabilities use V/H diagram addresses instead of plain integers (capped at three levels).

The agent uses **only** the TYPE prefixes listed in `notations/IDS_AND_REFERENCES.md` §3. It does **not** invent new TYPE prefixes. If a needed concept is missing from the registry, the agent proposes it upstream (issue against `transitrix/methodology`), then waits for the registry to land before using it locally.

Deprecated three-letter abbreviations (`ACT`, `CHG`, `FAC`, `CAP`, `SCN`) — do not introduce in new files. Migrate when touching old ones.

---

## 6. Validation

Every notation file is validated before commit. Two sanctioned paths:

- **Transitrix Studio (VS Code extension)** — install from the Marketplace (`transitrix.transitrix-studio`). The extension validates on save and shows error annotations in the editor.
- **Transitrix CLI** — `npx @transitrix/cli validate path/to/your.fgca.transitrix.yaml`. Use in CI or when working without VS Code.

The agent does **not** commit files with `error`-level validation findings. `warning`-level findings are surfaced to the adopter and committed only with explicit acknowledgement. The agent does not auto-suppress validation rules.

Every notation spec carries its own validation-codes table (e.g. `FGCA-001..015`, `GOALS-001..013`, `BL-001..009`, `ISS-001..006`). When surfacing a validation error to the adopter, the agent includes the canonical code so the rule is traceable to the spec.

---

## 7. Language convention

- **Canonical fields** — IDs, TYPE prefixes, notation short names, enum values, status vocabularies — are in **English**, as defined in `notations/IDS_AND_REFERENCES.md` and the per-notation specs.
- **Prose / display names** — `name:`, `description:`, narrative fields — are the adopter's choice. Default to English when the adopter has not stated a preference.
- The agent does **not** translate canonical fields. It does **not** invent localised TYPE prefixes.

`ADOPTER-FILL-ME` — record the adopter's primary working language for prose fields here. Default: English. If the adopter works bilingually, name both and which one is primary for narrative fields.

---

## 8. Confidentiality and identity

`ADOPTER-FILL-ME` — record the adopter's confidentiality and commit-author policy here. The placeholder questions:

- **Is this repository public, private, or internal-only?** If public, name what must never be committed (client names, internal URLs, headcount numbers, financials, etc.).
- **Are client / customer / partner names masked in the model?** If yes, define the masking convention (e.g. `CUSTOMER-A`, `CLIENT-NORTH`) and where the mapping is kept.
- **Commit-author identity.** Does the adopter require commits under a specific identity (work email, GitHub noreply alias, organisational signing key)? The agent uses whatever identity is configured in the local `git config`; raise it explicitly if it looks like a personal email is leaking into a public repo.

The agent does **not** publish externally-visible artefacts (PR descriptions, public comments, marketplace listings) from inside this repo without an explicit instruction from the adopter.

---

## 9. Task source and task flow

`ADOPTER-FILL-ME` — record the adopter's task source here. Common patterns:

- **GitHub Issues on this repo.** Tasks live as issues on the adopter's repo; the agent reads them via `gh issue list -R <owner>/<repo>` and reports back via `gh issue comment`.
- **Linear / Jira / Asana.** Tasks live in a project management tool; the agent reads tickets via the tool's API or pasted-in URLs; PRs link back via the tool's convention.
- **Self-hosted issues register.** Tasks live in this repo as a `.issues.transitrix.yaml` file under `canon/views/issues/` per `notations/views/12-issues.md`. The agent reads and updates the YAML directly.

**Example — self-hosted issues register.** Place a file at `canon/views/issues/<DOMAIN>.issues.transitrix.yaml`:

```yaml
notation: issues
spec_version: "0.1"

issues_catalogue:
  id: ISSUES_CAT-OPS-1
  name: "Architecture issues — operations"
  updated_at: "2026-05-26"

  issues:
    - issue_id: ISSUE-1
      name: "Order-fulfilment SLA gap"
      status: open                          # open | in_progress | blocked | resolved | closed
      description: "p95 latency regressed after the new payment-routing release."
      relates_to: [ACTIVITY-1, GOAL-1]
      owner_role: ROLE-1
```

The agent reads, edits, and validates this file the same way as any other notation file.

---

## 10. What the agent does NOT do

- Does **not** edit files under the methodology canon at `transitrix/methodology` from inside this repo.
- Does **not** invent new notations, new TYPE prefixes, or new validation rules. Those decisions happen upstream.
- Does **not** change the canonical repository layout — `canon/views/<notation>/`, `canon/elements/<NN>_<layer>/`, `.templates/` — without an explicit adopter decision recorded in the PR.
- Does **not** strip the `notation:` / `spec_version:` headers, rename canonical extensions, or rewrite files into alias formats (`*.bpmn.yaml`, `*.fgca.yml`).
- Does **not** auto-merge PRs. All PRs go through the gating in §11.
- Does **not** push to `main` directly. Use a feature branch + PR every time.
- Does **not** run destructive operations (`git push --force`, `git reset --hard`, deleting branches that aren't local-only) without an explicit instruction from the adopter.

---

## 11. Gating

Every non-trivial change goes through PR review by the adopter:

1. Branch from `main` for the task.
2. Make the smallest change that satisfies the task. One concern per commit, one task per PR.
3. Validate every changed notation file (Studio or `npx @transitrix/cli validate`) before pushing.
4. Open a PR with a short summary and a test-plan checklist.
5. The adopter — or a reviewer the adopter designates — merges. The agent does **not** merge its own PRs, even when permissions allow it.

Trivial changes (typo fixes inside a description string, README polish) may be committed directly to `main` if the adopter has explicitly opted into a direct-commit workflow. Default: PR every time.

---

## Reconciliation note

This guide is assistant-neutral and reflects the zoned (`canon/` / `field/` / `codex/`) layout. The onboarding Skill (`/transitrix:onboard`, a Claude Code skill) scaffolds the same shape — `AGENTS.md` as the agent guide, `transitrix.yaml` as the manifest, `canon/` + `field/` + `codex/` zones — by copying templates from its bundle.

The agent treats this file as **provisional**. If it conflicts with the canon, the canon wins. If it conflicts with a later adopter-supplied policy, the adopter wins.
