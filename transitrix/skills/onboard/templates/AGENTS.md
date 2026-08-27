# AGENTS.md — adopter-repo agent guide

> **Draft.** This file is scaffolded by the Transitrix onboarding Skill so every adopter starts with sensible agent guidance out of the box. After scaffolding, edit the placeholders marked `ADOPTER-FILL-ME` to fit your situation. Treat this draft as a starting point, not a finished policy.

This file tells **any AI coding assistant** — Claude Code, Cursor, GitHub Copilot, Windsurf, Gemini CLI, or another — operating inside an **adopter's** Transitrix repository how to behave. It is intentionally tool-neutral. It does **not** apply to assistants working on the methodology canon itself — that's a different repository with its own agent guide.

---

## Role split — choosing the right agent

This repository ships with a **recommended set of specialised roles**. An assistant working inside this repo should pick the role that matches the task, because reading the model and writing the model need opposite context:

| Role | File | Use when… |
|---|---|---|
| **Ingest** | [`INGEST.md`](INGEST.md) | Turning raw material — interviews, policies, spreadsheets, notes — into `field` artefacts and canon candidates, at scale. Source in → candidate elements → through the human review gate; never writes admitted canon. |
| **Modeler** | This file (`AGENTS.md`) | Authoring or editing model files *within this repo* — creating elements, views, relations; validating files. |
| **Analyst** | [`ANALYST.md`](ANALYST.md) | Answering questions *about the organisation* — who owns X, what capabilities support goal Y, what breaks if app Z changes. Read-only; business language; cited retrieval from `canon/`. |
| **Validator** | [`VALIDATOR.md`](VALIDATOR.md) | Reviewing a change before it lands — checking structure, relations, required fields, blast radius. Read-only; does not merge. |

**Routing rule:** if the request is turning raw material into candidate elements → use Ingest. If it's a question about the organisation → use the Analyst. If it involves writing or changing any file → use the Modeler (this guide). If it's reviewing a change before it merges → use the Validator. When in doubt, start with the Analyst; it will redirect you if the task requires writing.

**Repo setup is a one-time step, not a role.** Scaffolding a brand-new adopter repository runs once, via `/transitrix:onboard`, before any of the roles above apply. A client-side adopter typically joins a repo that already exists (Orient/Contribute mode); the Modeler authors *within* that repo and does not scaffold new ones. Turning raw material into candidate elements is its own role — see `INGEST.md` where scaffolded.

The Analyst requires a one-time MCP setup — see `ANALYST.md` §6 and the `.mcp.json` file at the repo root. The Validator uses the same repo-wide file tools as the Modeler — no extra setup.

**Cross-cutting, not a fifth role:** every role above can hit something outside its own lane while doing its actual job. [`FINDINGS.md`](FINDINGS.md) is the shared propose → route → scrub protocol for raising that as a finding instead of silently fixing or dropping it — see §14 below and the matching section in each other role guide.

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
- `.templates/` *(optional)* — starter files the adopter copies when creating new elements / views.
- `README.md` — adopter-facing overview (purpose, layout, how to contribute).

The agent's job is to **maintain the model** — validate, refactor, extend, and explain it. The agent does not invent the methodology; it consults the canon at [github.com/transitrix/methodology](https://github.com/transitrix/methodology) when in doubt.

---

## 2. Authority of the methodology

The canonical Transitrix methodology lives at [github.com/transitrix/methodology](https://github.com/transitrix/methodology). It is the source of truth for:

- Notation schemas (`notations/<NN>-<name>.md`).
- Shared header contract (`notations/CONTRACT.md`).
- ID grammar and TYPE registry (`notations/IDS_AND_REFERENCES.md`).
- Adopter manifest schema (`notations/MANIFEST.md`).
- Notation index (`notations/README.md`).
- Notation selection guide (`notations/NOTATION_SELECTION_GUIDE.md`) — use this when the user's request names a diagram/view but it's unclear which notation fits, or asks for something Mermaid/PlantUML could also draw; if the request itself is too vague to apply the guide (e.g. "make me a diagram"), ask a clarifying question first per its §1.1 before picking anything.
- Deployment patterns (`patterns/<name>.md`) — the "when to use / how to start" guide for a deployment scenario (multi-repo ADR aggregation, knowledge store, personal vs enterprise memory, …). This is the authority for **how-to / deployment** questions — see §2A below.

**Resolution order when a local file and the canon disagree:**

1. The canon wins. Always.
2. Update the local file to conform, or open a PR proposing the change.
3. If the canon itself appears wrong or incomplete (a genuine gap, not a typo), raise an issue against `transitrix/methodology` rather than diverging silently.

The agent reads the canon as **read-only**. It never edits methodology files from this repo, and it never copies methodology content into this repo wholesale (link to it instead).

If the Transitrix onboarding Skill (`/transitrix:onboard`) is available, the agent may use its cheat sheet as a quick reference, but the canon remains the source of truth for any conflict.

---

## 2A. Question-class router

Not every question is "what does our model say" (§13) or a request to author/edit a file (the rest of this guide). Route by question class before answering — this table is **cross-cutting**: every role below uses the same routing, only the follow-through differs.

| Question class | Home | Example |
|---|---|---|
| How-to / deployment — "how do we set up X with Transitrix", "how do we keep ADRs", "one repo or several?" | `patterns/` in the methodology canon — start at `patterns/index.md`'s "Common questions" table | "How do we stand up an ADL?" → `patterns/enterprise-adr-registry.md` |
| Notation / schema — "what fields does a GOAL element have", "why did this file fail validation" | `notations/` — the per-notation specs and `CONTRACT.md` | "Why is my BPMN file failing `HDR-003`?" → `notations/CONTRACT.md` |
| Concept / vocabulary — canonical terms, ontology-level questions | `concepts/` *(stub — not yet published in the methodology; deferred)* | — |
| About the organisation itself | `canon/` / `codex/` / `field/` — see §13 | "Who owns capability X?" |

**The follow-through differs by role, once routed:**

- **Modeler** (this guide) — acts on it: scaffolds what the pattern describes (e.g. creates `operations/decisions/` and the first ADR record per [`enterprise-adr-registry.md`](https://github.com/transitrix/methodology/blob/main/patterns/enterprise-adr-registry.md)).
- **Analyst** (`ANALYST.md`) — routes rather than acts: names the pattern and hands off to the Modeler. A how-to/deployment question was never going to be *in* the model, so "not modelled yet" (§13) is the wrong answer for it — that phrase is reserved for genuine questions about the organisation.
- **Validator** (`VALIDATOR.md`) / **Ingest** (`INGEST.md`) — out of scope for either; redirect to the Modeler.

---

## 3. Repository layout

The canonical layout an adopter inherits when scaffolded by `/transitrix:onboard`:

```
<repo-root>/
├── transitrix.yaml                 # adopter manifest — methodology version, notations, zones
├── AGENTS.md                       # this file — assistant-neutral agent guide
├── .github/
│   └── copilot-instructions.md     # pointer → AGENTS.md (GitHub Copilot)
├── README.md
├── canon/                          # validated model — the authoritative zone
│   ├── elements/                   # elements by ArchiMate layer
│   │   ├── 01_motivation/          # GOAL, CONSTRAINT, DRIVER, …
│   │   ├── 02_business/            # ROLE, PROCESS, CAPABILITY, RULE, …
│   │   ├── 03_application/         # APPLICATION, INTEGRATION, …
│   │   └── 04_technology/          # NODE, ARTIFACT, …
│   └── views/                      # one subfolder per notation
│       ├── bpmn/   dgca/   goals/   capabilities/   processmap/
│       ├── activities/   blocks/   scenarios/
│       └── applications/   products/   issues/   process-blueprint/
├── field/                          # raw inputs — interviews, surveys, observations, drafts
│   ├── interviews/   surveys/   observations/   drafts/
└── codex/                          # external laws/regulations + internal policies/standards
    ├── external/<jurisdiction>/    # ge/  de/  eu/  … (ISO 3166-1 alpha-2, or `eu` / `intl`)
    └── internal/
```

The `views/` folder names are intentionally shorter than the canonical short names in places (`capabilities/`, `processmap/`) — this is the adopter-side convention.

The agent does **not** change this layout without a deliberate decision recorded in the adopter's PR. Adopter-specific top-level additions (e.g. a `decisions/` ADR folder, a `glossary/` directory) are fine; renaming or removing the canonical folders is not.

### 3.1 Zones

This repo separates three kinds of knowledge, each with its own trust contract (defined in the canon, `notations/CONTRACT.md` §5):

- **`canon/`** — validated truth the organisation asserts about itself. Internally consistent and unique; the authoritative model. `elements/` and `views/` live here.
- **`field/`** — raw, unprocessed material (interviews, surveys, observations, drafts). Contradictions allowed; provenance is the point; **not** authoritative. A Canon record may *cite* a Field artefact via `derived_from:` — a citation, never a migration.
- **`codex/`** — external constraints (laws, regulations, under `external/<jurisdiction>/`) and internal authority documents (policies, standards, under `internal/`), *given to* the organisation rather than authored by it.

Every artefact carries an **admission record** (`zone`, `admitted_at`, `admitted_by`, `gate_checks`, optional `derived_from`) — see `notations/CONTRACT.md` §6. The agent does not move artefacts between zones; it admits a new artefact to the correct zone.

### 3.2 Single-entity vs holding layout

- **Single legal entity** — the repo root *is* the organisation: `canon/`, `field/`, `codex/`, and `transitrix.yaml` sit at the root (the shape above).
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
methodology_version: "4.1.0"
notations: [dgca, goals, activities, issues, capability-map, codex]
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

Naming convention for view files: `<DOMAIN>.<short-name>.transitrix.yaml`, where `<DOMAIN>` is a short kebab-case or upper-snake-case label for the area (e.g. `order-fulfilment.bpmn.transitrix.yaml`, `RETENTION-2026.dgca.transitrix.yaml`). One canonical instance per notation per domain.

Codex artefacts are an exception: they are zone primitives, not view documents. They live at `codex/external/<jurisdiction>/<ID>.yaml` or `codex/internal/<ID>.yaml`, named by their canonical ID, and carry no `notation:` header. Schema: `notations/elements/14-codex.md`.

The agent never strips the `notation:` and `spec_version:` headers from view files, and never introduces alias extensions (`*.bpmn.yaml`, `*.dgca.yml`) — they fail validation.

---

## 5. IDs and cross-references

Every typed element ID follows the canonical grammar in `notations/IDS_AND_REFERENCES.md`:

```
<TYPE>-[<middle segment(s)>-]<INTEGER>
```

- **TYPE** — uppercase, letters / digits / underscore, starts with a letter (`DRIVER`, `GOAL`, `PROCESS_BLUEPRINT`, `BUSINESS_OBJECT`).
- **Middle segments** — optional, notation-specific, for disambiguation (`GOAL-RETENTION-12`, `ACTIVITY-Q3-2026-7`).
- **INTEGER** — terminal positive integer, **no leading zeros** (`-1`, not `-001`).
- **Exception:** `CAPABILITY-V1.2`, `CAPABILITY-H1.2.3` — capabilities use V/H diagram addresses instead of plain integers (capped at three levels).

The agent uses **only** the TYPE prefixes listed in `notations/IDS_AND_REFERENCES.md` §3. It does **not** invent new TYPE prefixes. If a needed concept is missing from the registry, the agent proposes it upstream (issue against `transitrix/methodology`), then waits for the registry to land before using it locally.

Deprecated three-letter abbreviations (`ACT`, `CHG`, `FAC`, `CAP`, `SCN`) — do not introduce in new files. Migrate when touching old ones.

---

## 6. Validation

Every notation file is validated before commit. Two sanctioned paths:

- **Transitrix Studio (VS Code extension)** — install from the Marketplace (`transitrix.transitrix-studio`). The extension validates on save and shows error annotations in the editor.
- **Transitrix CLI** — `npx @transitrix/cli validate path/to/your.dgca.transitrix.yaml`. Use in CI or when working without VS Code. All canonical `*.transitrix.yaml` notation extensions are accepted without `--ext`; pass `--ext <notation-name>` only for a non-canonical extension outside the built-in registry. On Windows PowerShell with a restricted execution policy, invoke as `npx.cmd @transitrix/cli validate <file>` — plain `npx` resolves to a `.ps1` wrapper that the policy refuses to launch.

For Mermaid diagrams embedded in `.md` files (ADRs, architecture notes), also install **Markdown Preview Mermaid Support** (`bierner.markdown-mermaid`) — VS Code Marketplace and Open VSX — to render them inline. Not a validator: a preview aid only.

The agent does **not** commit files with `error`-level validation findings. `warning`-level findings are surfaced to the adopter and committed only with explicit acknowledgement. The agent does not auto-suppress validation rules.

Every notation spec carries its own validation-codes table (e.g. `DGCA-001..018`, `GOALS-001..013`, `BL-001..009`, `CODEX-001..003`). When surfacing a validation error to the adopter, the agent includes the canonical code so the rule is traceable to the spec.

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
- **Self-hosted issues register.** Tasks live in this repo as a `.issues.transitrix.yaml` file under `views/issues/` per `notations/views/12-issues.md`. The agent reads and updates the YAML directly.

---

## 10. What the agent does NOT do

- Does **not** edit files under the methodology canon at `transitrix/methodology` from inside this repo.
- Does **not** invent new notations, new TYPE prefixes, or new validation rules. Those decisions happen upstream.
- Does **not** change the canonical repository layout — `views/<notation>/`, `canon/elements/<NN>_<layer>/`, `codex/external/<jurisdiction>/`, `codex/internal/`, `field/<sub>/` — without an explicit adopter decision recorded in the PR.
- Does **not** strip the `notation:` / `spec_version:` headers, rename canonical extensions, or rewrite files into alias formats (`*.bpmn.yaml`, `*.dgca.yml`).
- Does **not** auto-merge PRs. All PRs go through the gating in §11.
- Does **not** push to `main` directly. Use a feature branch + PR every time.
- Does **not** run destructive operations (`git push --force`, `git reset --hard`, deleting branches that aren't local-only) without an explicit instruction from the adopter.

---

## 11. Gating

Every non-trivial change goes through PR review by the adopter:

1. Branch from `main` for the task.
2. Make the smallest change that satisfies the task. One concern per commit, one task per PR.
3. Validate every changed notation file (Studio or `npx @transitrix/cli validate`; on Windows PowerShell use `npx.cmd @transitrix/cli validate`) before pushing.
4. Open a PR with a short summary and a test-plan checklist.
5. The adopter — or a reviewer the adopter designates — merges. The agent does **not** merge its own PRs, even when permissions allow it.

Trivial changes (typo fixes inside a description string, README polish) may be committed directly to `main` if the adopter has explicitly opted into a direct-commit workflow. Default: PR every time.

---

## 12. Recommended IDE extensions

Two VS Code extensions make this repo far more usable:

| Extension | Purpose | Install |
|---|---|---|
| **Transitrix Studio** (`transitrix.transitrix-studio`) | Live preview + validation for every Transitrix notation | `code --install-extension transitrix.transitrix-studio` |
| **Markdown Preview Mermaid Support** (`bierner.markdown-mermaid`) | Renders Mermaid diagrams embedded in `.md` files (ADRs, architecture notes) | `code --install-extension bierner.markdown-mermaid` |

**Surface this proactively, once per session — don't wait for the user to hit a wall.** At the start of a session (or the first time the agent opens or edits a notation file), check what's already installed with `code --list-extensions` (swap `code` for `cursor` / `codium` if that's the detected editor; on Windows PowerShell with a restricted execution policy use `code.cmd` / `cursor.cmd`). If either extension is missing, show the exact install command(s) above right away, before doing any other work in the session.

The agent does **not** run the install command itself — it surfaces it prominently and lets the adopter run it. Both extensions are read-only with respect to the model: they render and validate, they never modify files.

---

## 13. Answering questions about the organization

When the adopter (or anyone else) asks a question *about the organization itself* — "what does capability X depend on", "are we covered for GDPR", "what's our biggest process risk" — the agent answers from the **zoned sources of truth**, in this order:

1. **`canon/`** first — the validated model (`canon/elements/`, `views/`). This is the authoritative answer. Cite the specific artefact ID(s) and file path(s) so the answer is verifiable.
2. **`codex/`** for anything about external obligations (laws, regulations) or internal policy — cite the artefact's canonical ID.
3. **`field/`** only if canon/codex don't cover the question, and only with an explicit caveat that it's raw, unvalidated material, not an organizational fact (see §3.1). Never present a `field/` artefact's content as if it were admitted truth.

**Do not** answer by grepping arbitrary top-level folders (scratch notes, an adopter's personal `docs/`, `_intake/`, chat logs) as if they were canon — those are not zoned sources and carry no admission record. If the question genuinely isn't covered by `canon/` or `codex/`, say so explicitly ("not modelled yet" / "no admitted artefact answers this") rather than synthesizing an answer from whatever files happen to be nearby.

If a broader repo search is genuinely needed (e.g. "where is X mentioned anywhere in this repo"), that's fine as an explicit, separate action — just don't let it substitute for checking canon/codex first, and don't present unzoned matches with the same confidence as an admitted canon fact.

---

## 14. Raising a finding

If, while authoring or editing, the Modeler notices something outside the requested change — a neighbouring element with a wrong attribute or relation it wasn't asked to touch, or a gap in the notation itself — it does not silently fix it and does not drop it. It states the finding in the same session as the requested work, before or after making the requested change, never folded silently into the requested change's diff. Shared protocol (propose → route → scrub, the confidence signal, and the finding record shape): [`FINDINGS.md`](FINDINGS.md).
