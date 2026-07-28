---
name: Transitrix Ingest
description: Turn raw organisational material (interviews, policies, org charts, spreadsheets, notes) into Transitrix field artefacts and typed canon candidates at scale, with source-quality scoring and a human review queue. Operates the field→canon derivation pipeline — convert a document, emit a field artefact with provenance and a proposed source_quality, extract typed elements and conservative relations that each cite their field source via derived_from, validate them against the canonical schemas and the adopter's coverage profile, and produce a review queue a human gates before anything is admitted to canon. Never writes canon directly.
when_to_use: User says "ingest these documents", "extract a model from this interview / policy / spreadsheet", "fill the field zone from raw material", "turn these notes into canon candidates", "set up the intake pipeline", or drops raw files into an adopter repo's `_intake/inbox/` and wants them processed into field artefacts + reviewable canon candidates. BA-facing shortcut — user says "extract requirements from this interview / project brief / SOP", "get REQUIREMENT / CONSTRAINT candidates out of this writeup", or "run the ingest pipeline motivation-only" — same pipeline, agent runs only `prompts/01_motivation.md` (see [BA quickstart](#ba-quickstart--requirements-from-an-interview)).
min_version: "1.0.0"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch
---

# Transitrix Ingest Skill

The **front door** to a Transitrix repository: it turns raw material into `field`-zone artefacts and typed `canon` *candidates*, at scale, and routes everything through a human review gate. It is the operational counterpart to the per-layer extraction prompts — the part that converts documents, scores source trust, runs the validators, and stages a review queue.

> **Status — operational.** The deterministic CLI (`@transitrix/ingest-cli`, see [§ The CLI](#the-cli)) implements every subcommand below — `scaffold-intake`, `convert`, `privacy-scan`, `admit-source` (field + codex routes), `emit-candidates`, `validate`, `review-queue`, `suggest-profile`, `check-placement`, `resolve-placement` — and is exercised end-to-end by the bundle's integrity test. Run the **CLI-presence pre-check** (Step 0) first; if the CLI is not on PATH in this install, install it before proceeding.

The methodology is canon at `github.com/transitrix/methodology`; this skill is the agent-facing protocol for operating the field→canon pipeline against it. It runs **agent-neutrally** under Claude and GitHub Copilot — all heavy logic is in the CLI, and this `SKILL.md` only sequences it.

---

## The one rule that governs everything

**Propose, never write admitted canon.** This skill emits `field` artefacts and canon *candidates* and runs them through the existing validators. It MUST NOT write **admitted** canon — admitted elements, views, or anything carrying an admission record. Admission stays a deliberate, auditable human gate (`admitted_by`). (The skill MAY write `proposed` — non-admitted — entries to the `canon/unresolved/` holding area, Step 7; it never writes an admission record there. An *admitted-but-untyped* entry, §13.1, is written only by the human gate. So this rule is not weakened.) A hallucinated element or relation reaching canon unreviewed is the worst-case failure, and the whole design exists to prevent it. Every step below is built around keeping that gate intact.

---

## Step 0 — CLI-presence pre-check

The deterministic work (document conversion, coverage-profile read, validator pass, artefact + candidate emission, `_intake/` moves) is done by the CLI, never reimplemented in the agent. Confirm it is available:

```
transitrix-ingest --version             # primary — local install
# or, once the package is published to npm:
npx @transitrix/ingest-cli --version    # equivalent — same binary
```

- **Present** under either name → proceed. Use whichever form resolved; both invoke the same CLI, and the rest of this protocol shows the primary form. If only the `npx` form is reachable, substitute it for `transitrix-ingest` in the commands below — the subcommands and flags are identical.
- **Absent** under both → the CLI is not installed in this environment. Stop and tell the user; do not hand-roll the pipeline, because hand-rolled extraction has no deterministic validator gate and risks the one rule above. Pre-1.0 the package is **not yet on npm**, so the expected install path is local: clone the methodology repo and `npm install -g ./packages/ingest-cli` (which provides the `transitrix-ingest` bin); the `npx @transitrix/ingest-cli` form starts to resolve once the CLI is published from its own tooling repo at the ~1.0 extraction.

Also confirm you are operating inside a Transitrix adopter repository (a `transitrix.yaml` manifest at the repo root; see [MANIFEST](https://raw.githubusercontent.com/transitrix/methodology/main/notations/MANIFEST.md)). If there is no repo yet, the user wants `/transitrix:onboard` first.

> **After a methodology upgrade** — reinstall the CLI before running the pipeline. A cached or globally-installed binary from a prior release does not auto-update; it may run against stale validators, a stale profile resolver, or stale `review-queue` logic. Re-run your install command and confirm the version above reflects the new release.

---

## Step 1 — Scaffold the intake folder

`_intake/` is an **operational** folder at the organisation root — *not a zone*. Zones (`canon/`, `field/`, `codex/`) stay parallel; `_intake/` sits beside them as the pipeline's workspace:

```
<org>/
  _intake/              # operational intake pipeline — not a zone
    inbox/              # raw dropped files, untouched
    processing/         # currently being extracted (artefacts + candidates in flight)
    processed/          # source files whose ingest is complete (retained for traceability)
  canon/  field/  codex/
```

```
transitrix-ingest scaffold-intake <org-root>
```

Idempotent — it never overwrites existing intake content. A source file flows `inbox/ → processing/ → processed/`. `_intake/` is a **per-user, private workspace** — its contents are git-ignored and not shared with other modellers, so nothing that participates in the model lives here (an untyped object goes to the shared `canon/unresolved/`, Step 7, never to `_intake/`). `scaffold-intake` drops a `.gitkeep` in each of `inbox/` / `processing/` / `processed/` so the folder skeleton stays in version control while the working files are ignored — the adopter's `.gitignore` carries `_intake/inbox/*`, `_intake/processing/*`, `_intake/processed/*` and `!_intake/**/.gitkeep` (the onboarding skill seeds these). In v0 the `_intake/` convention is **skill-local**: it is documented here and in [`templates/_intake.README.md`](templates/_intake.README.md), not yet reserved in the methodology MANIFEST/CONTRACT. (Promotion to a reserved org-structure convention is a separate proposal once the skill stabilises.)

---

## Step 2 — Convert the source to Markdown

Office documents are converted to Markdown with **MS Markitdown** before extraction (per project convention), unless illustrations must be preserved. The CLI shells out to Markitdown; `.md` / `.txt` inputs pass through unchanged.

```
transitrix-ingest convert <_intake/inbox/file>   # → _intake/processing/<file>.md
```

Markitdown is a Python tool (`pip install "markitdown[all]"`); install it into the environment you run the CLI from, and if you use a virtualenv, activate it first. The CLI looks for the `markitdown` console-script and **falls back to `python -m markitdown` / `python3 -m markitdown`** — so it still works inside a venv where only the interpreter is on PATH. On Windows, if `markitdown`/`npx` are blocked by the PowerShell execution policy, run `python -m markitdown` directly or `Set-ExecutionPolicy -Scope Process RemoteSigned`. If Markitdown cannot be reached at all the CLI exits with an actionable message naming the install step. Conversion is the only point of contact with Markitdown — the rest of the pipeline is pure Node and runs identically under either agent.

---

## Step 2b — Privacy pre-admission scan

Before a converted document can be admitted as a field artefact (Step 3), it passes through the **privacy pre-admission gate** — a fail-closed check that detects and blocks personal and medical data by default.

```
transitrix-ingest privacy-scan <processing/file.md>
```

**Fail-closed.** The gate must exit with outcome `CLEAN` or `STRIPPED` before `admit-source` is called. A `REJECTED` or `ERROR` outcome halts the pipeline — do not call `admit-source` on a document that has not cleared the gate.

### Detection — Phase 1 (rule-based, deterministic)

The gate applies deterministic pattern + dictionary matching across a closed set of detection categories. Every blocked fragment is tagged with a reason code:

| Code | Category | Examples |
|---|---|---|
| `PII-001` | National identifier | SSN, NI number, national-ID-shaped tokens |
| `PII-002` | Date of birth | DOB phrases combined with date-shaped tokens in a personal context |
| `PII-003` | Medical / health terms | Diagnosis codes, medication names, clinical and diagnostic vocabulary |
| `PII-004` | Contact PII beyond allowlist | Personal email, personal phone (non-work) |
| `PII-005` | Financial personal | Credit / debit card numbers, personal bank account numbers |
| `PII-006` | Biometric / government identifier | Passport numbers, biometric descriptors |

Reason codes are emitted in the **privacy report** (see below). A scan that fires any code (and the fragment is not cleared by the allowlist) produces a `STRIPPED` or `REJECTED` outcome; a scan that fires none produces `CLEAN`.

### Allowlist — always admitted

A narrow, explicit list of business-contact fields on `ACTOR` / `ORG` element records is never blocked. The default allowlist:

| Field | Permitted on |
|---|---|
| `first_name` | `ACTOR`, `ORG` |
| `last_name` | `ACTOR`, `ORG` |
| `work_phone` | `ACTOR`, `ORG` |
| `work_email` | `ACTOR`, `ORG` |

The allowlist is **never inferred from context** — it is extended only by deliberate edit in the config.

### Outcomes

| Outcome | Meaning | Next step |
|---|---|---|
| `CLEAN` | No blocked content found | Proceed to `admit-source` (Step 3) |
| `STRIPPED` | Blocked fragments redacted; clean copy ready | Proceed to `admit-source` on the redacted copy |
| `REJECTED` | Document blocked entirely (e.g. predominantly PII) | Do not admit; human reviews privacy report |
| `ERROR` | Scan could not complete (config error, unreadable file) | Do not admit; fix the issue and re-scan |

For `STRIPPED`: the CLI writes `<file>.redacted.md` alongside the original. `admit-source` is run on the redacted copy; `raw_source` on the resulting field artefact still points to the original retained in `_intake/processed/` — the original is never discarded. The privacy report records what was stripped.

### Configuration

The gate is **enabled by default** (`enabled: true`). Configure it in `transitrix.yaml` under `ingest.privacy_gate`:

```yaml
ingest:
  privacy_gate:
    enabled: true          # default: true — fail-closed; set false only with explicit adopter decision
    on_detection: strip    # strip (default): redact fragments, admit clean copy
                           # reject: block the entire document
    allowlist:
      - field: first_name
        on: [ACTOR, ORG]
      - field: last_name
        on: [ACTOR, ORG]
      - field: work_phone
        on: [ACTOR, ORG]
      - field: work_email
        on: [ACTOR, ORG]
```

### Privacy report

The CLI writes a **`privacy-report.yaml`** per ingest run, alongside the `review-queue.yaml`. Schema: [`schemas/privacy-report.schema.json`](schemas/privacy-report.schema.json).

The report lists every document scanned with its outcome. For `STRIPPED` and `REJECTED` outcomes it records the blocked fragments with reason codes — truncated previews only, never verbatim PII — so a human can audit false positives and false negatives and adjust the allowlist or detection rules if needed.

---

## Step 3 — Emit the field artefact (with proposed source_quality)

Each converted document becomes one `field` artefact carrying a complete **admission record** — provenance (who / when / in what setting) and a **proposed** `source_quality`. The field artefact is what lives in `field/`; the original raw bytes stay in `_intake/processed/` so the artefact is traceable to its source.

```
transitrix-ingest admit-source --zone field <processing/file.md> \
    --type INTERVIEW|SURVEY|OBSERVATION|DRAFT --role "<role>" --date YYYY-MM-DD
```

The CLI fills the admission record (`zone: field`, `gate_checks.provenance`) and **proposes** a `source_quality` from the document type. It also fingerprints the raw bytes as `source_hash: sha256:<hex>` alongside `raw_source` — tamper-evidence for adopters with audit needs (GDPR / SOX / ISO 27001) and source-replacement detection: a re-saved "same" file is caught by hash mismatch, not by silent drift. The schema is [`schemas/field-artefact.schema.json`](schemas/field-artefact.schema.json); the canonical contract is [CONTRACT §6](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md) (admission record) and [§11.2](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md) (the source-trust scale).

The same `source_hash` deduplicates: if the identical content was already admitted to the zone, `admit-source` **skips** it (naming the existing artefact) rather than minting a second one — pass `--force` to admit a deliberate duplicate. (When two artefacts share a hash, `review-queue` surfaces the cluster under `duplicate_sources`.) This applies to both the `field` and `codex` routes.

**Proposed `source_quality` by document character** — closed set, the human confirms at admission:

| Document character | Proposed `source_quality` | Weight |
|---|---|---|
| Signed policy, system of record, the accountable owner stating it directly | `authoritative` | 1.0 |
| The same fact confirmed across more than one independent field source | `corroborated` | 0.8 |
| One uncorroborated informant or observation | `single_source` | 0.5 |
| Draft, assumption, inference, hearsay | `unverified` | 0.25 |

The skill **proposes**; a human **confirms**. Never silently bake a higher trust than the source warrants.

**Codex sources — laws, regulations, policies, standards — take the parallel `codex` route:** `transitrix-ingest admit-source --zone codex <processing/file.md> --type LAW|REGULATION|POLICY|INTERNAL_STANDARD --effective-date YYYY-MM-DD [--jurisdiction <code>] [--source-authority <who>]`. A codex artefact is *authoritative by construction* — it carries **no** `source_quality`, records a snapshot of the source + a `source_hash`, and lands in `codex/external/<jurisdiction>/` (LAW/REGULATION) or `codex/internal/` (POLICY/INTERNAL_STANDARD) per [14-codex.md](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/14-codex.md). Its obligations are derived in Step 4 as `REQUIREMENT` + `ASSERTION` candidates that cite it via `derived_from`.

---

## Step 4 — Extract typed candidates (entity-strong, relation-conservative)

The agent runs the per-layer extraction prompts in [`prompts/`](prompts/) over the field artefact; the CLI receives the result and emits typed canon **candidates**. Each candidate:

- uses a canonical ID (`<TYPE>-[<middle>-]<INTEGER>`, [IDS](https://raw.githubusercontent.com/transitrix/methodology/main/notations/IDS_AND_REFERENCES.md) §1);
- carries `derived_from: [<FIELD-ARTEFACT-ID>]` citing its field source;
- carries `admitted_to: pending` — the human gate completes admission;
- carries an **`extraction_confidence`** flag (`high | medium | low`) — see the two-axes rule below.

```
transitrix-ingest emit-candidates <field/artefact.yaml>   # → _intake/processing/candidates/
```

Schema: [`schemas/candidate.schema.json`](schemas/candidate.schema.json).

**Relations are the risky part.** Extracting entities is tractable; extracting *correctly typed* relations of a closed kind is not. v0 is **entity-strong and relation-conservative**: a relation (closed REL kind) is only emitted as a candidate above a high confidence threshold. Everything below threshold goes to the review queue as a *suggestion*, not a candidate. Entities flow normally.

### Two axes of trust — never merge them

- **`source_quality`** — trust in the *source* (Step 3). A closed ordinal label on the field artefact's admission record. Fixed once a human confirms it.
- **`extraction_confidence`** — "did the model read the document correctly". A separate **review flag** on the candidate. It surfaces in the review queue and is **never** folded into `source_quality` and **never** persisted into canon ([CONTRACT §11.8](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md)).

These are different questions with different fixes (get a better source vs. re-read the document). The schemas keep them in separate fields; collapsing them is a defect.

### Tiered approval — routing by `extraction_confidence`

`extraction_confidence` also drives **reviewer-authority routing** (tiered approval — [CONTRACT §6.2](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md)). Admitted canon carries a `reviewer_authority` tier, `ai_reviewed` < `expert_confirmed`, and the tier a draft is eligible for is decided by its extraction confidence:

- **High `extraction_confidence`** → the draft is eligible for tool admission to **`ai_reviewed`** — the lower canon tier, marked as reviewed by a tool (`admitted_by` = the tool id), surfaced distinctly in views and coverage. The threshold is **adopter-configured** in the manifest (`transitrix.yaml`); below it, nothing auto-admits.
- **Medium / low `extraction_confidence`** → routed to the **expert review queue** unchanged. Tool admission is forbidden; a human admits to **`expert_confirmed`**.

The hard rule is unchanged in spirit (see [the one rule](#the-one-rule-that-governs-everything)): **a tool never writes `expert_confirmed`.** It may only mark the lower tier and route the draft; the human gate keeps exclusive authority over the top tier. `ai_reviewed` is still admitted canon — it is *provisional confirmation*, not a bypass — so it must clear the same structural validators (Step 5) before admission.

> **Not yet wired into the CLI.** This routing is the **defined policy**; the current `@transitrix/ingest-cli` still only *proposes* (it never auto-admits), and the manifest `extraction_confidence` threshold schema is a downstream follow-up (per the ADR's out-of-scope). Until both land, every candidate continues through the human gate (Step 6); the tier is recorded by whoever admits.

---

## Step 5 — Validate (coverage-profile aware)

Every candidate is run through the canonical validators — ID grammar, TYPE registry, closed REL kinds, lifecycle fields — and the adopter's **coverage profile**.

```
transitrix-ingest validate <processing/candidates/>
```

The CLI reads the repo's `coverage_profile` ([COVERAGE_PROFILES](https://raw.githubusercontent.com/transitrix/methodology/main/notations/COVERAGE_PROFILES.md)) and **resolves membership** before classifying each candidate: it ships the preset definitions (§3 / §3.1) and resolves all three declared forms — a **short-form preset** (`coverage_profile: core`), a **custom map** (`extends:` a preset + per-layer `add`/`remove`/`disabled` deltas, §4), and the **absent** default (`full`). A TYPE / REL kind in the resolved profile is `in_profile`; one outside it is flagged `out_of_profile` per `CP-003`. `ASSERTION` and codex artefacts are never bounded by the profile (§2.1). Out-of-profile or invalid candidates are **flagged with an actionable reason** — not silently emitted into canon, and not silently dropped. A flagged candidate is a review-queue item, not a rejection.

If a profile is **present but cannot be resolved** (unknown preset, missing `extends:`, malformed), the CLI does **not** silently treat the repo as `full`: it resolves permissively but emits an explicit **WARNING** (in CLI output and as `coverage_warning` in the review queue), so the unreliable coverage signal is visible rather than hidden.

When a corpus keeps surfacing the same out-of-profile TYPE, **`suggest-profile`** turns that signal into a concrete proposal instead of a manual profile edit:

```
transitrix-ingest suggest-profile <processing/candidates/>   # read-only; prints to stdout
```

It scans the candidates, collects the out-of-profile element TYPEs and relation kinds, and prints a paste-ready `coverage_profile` delta (`extends:` the active base + the TYPEs grouped under their layer). It **never widens the profile itself** — the profile is the guardrail; the human reviews the proposal and edits `transitrix.yaml` deliberately. TYPEs whose layer the CLI cannot derive are listed under `unplaceable` to site by hand.

---

## Step 6 — Produce the review queue

```
transitrix-ingest review-queue <processing/candidates/>   # → review-queue.yaml
```

The queue is the human gate. It lists every field artefact (with its proposed `source_quality`), every candidate element and relation (with `derived_from`, `extraction_confidence`, and any validation/coverage flags), and the relation *suggestions* that fell below threshold. Schema: [`schemas/review-queue.schema.json`](schemas/review-queue.schema.json).

**The queue is idempotent against canon.** `review-queue` reads `canon/` (read-only — it never writes there) and excludes any candidate already admitted — matched by `id` for elements/assertions, and by the `(type, from, to)` triple for relations. So re-running after admitting one source, or ingesting a second source while the first's candidates still sit in `processing/`, surfaces only the not-yet-admitted candidates instead of re-listing admitted ones for re-approval. Excluded candidates are summarised under `excluded_admitted` for the audit trail.

**Nothing lands in `canon/` from this skill.** A human reviews the queue, confirms or revises each proposed `source_quality`, and runs the canon admission gate (`uniqueness`, `consistency`, `completeness` — [CONTRACT §6](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md)) to admit candidates. When ingest is complete for a source, its raw file moves to `_intake/processed/`.

### Multi-batch naming — a stable filename, a dated directory when a batch is already unresolved

`review-queue.yaml` is a **stable package filename**: the first batch for an org lands at the flat legacy path `_intake/processing/review-queue.yaml`, unchanged from every prior release. Re-running `review-queue` against the same candidates — the everyday idempotent-refresh workflow, admit a few, re-run to see what's left — keeps updating that same file in place: the exclusion list changing is real progress on the same batch, not a new one. Only when a re-run would produce **byte-identical** output to what's already there — nothing has moved since it was last written — is the existing file read as untouched/unresolved, and a genuinely concurrent batch instead gets its own **human-facing batch directory**, `type-scope-date-seq`:

```
_intake/processing/review-queue-<scope>-YYYYMMDD-<seq>/review-queue.yaml
```

`<scope>` comes from `--scope <word>` (a generic word — never an org-identifying string) or defaults to `batch`; `<seq>` disambiguates same-day, same-scope batches. `transitrix-ingest workflow-status` discovers both the flat path and every dated directory, using the directory name as the batch's display id.

### Placement is deterministic — pinned to ELEMENT_PRIMITIVES §4

Where an admitted element lands is **not** a judgement call. Every element TYPE has a canonical **materialisation mode + layer + folder** in [`ELEMENT_PRIMITIVES.md` §4](https://raw.githubusercontent.com/transitrix/methodology/main/notations/ELEMENT_PRIMITIVES.md); the CLI resolves it so equals are treated equally — `ACTOR`, `ROLE`, `PROCESS`, `PRODUCT`, `APPLICATION` are all `standalone` and each gets its own per-TYPE folder, never inline-by-accident.

- The review queue annotates each element candidate with its resolved `placement` (`mode`, `layer`, `folder`). Admit a `standalone` element to exactly that folder, one file per element.
- Check any TYPE on demand: `transitrix-ingest resolve-placement <TYPE>`.
- **Honour the §1 promotion rule explicitly.** A `view-defined` / `contained` TYPE (`INTEGRATION`, `STEP`, `EQUIPMENT`, `INFORMATION_ENTITY`, registry rows) stays **inline** in its host/view document and is promoted to its own catalogue file **only when a second document references it** — the id never changes on promotion. Do not pre-create a standalone file for a still-single-reference element.
- After admitting, verify placement: `transitrix-ingest check-placement [org-root]` flags any admitted element sitting outside its §4 folder (and any `view-defined` TYPE wrongly given its own catalogue file). Read-only over `canon/`.

---

## Step 7 — Zero information loss (`extensions:` and `canon/unresolved/`)

Real source rows always carry more than the schema defines. Two mechanisms ([CONTRACT §12](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md) / [§13](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md)) guarantee nothing is silently dropped — the pipeline never discards source data it cannot map, and it never guesses a TYPE to make the data fit.

**Mechanism 1 — `extensions:` on a known entity.** When a candidate IS a known entity (`PRODUCT`, `ROLE`, …) but the source row has fields that map to no schema field, those fields are preserved in an open `extensions:` bag on the candidate. They ride through admission verbatim onto the entity — the validator passes `extensions:` through untouched (`EXT-001`), so an extended entity validates cleanly.

```yaml
type: PRODUCT
id: PROD-001
name: Widget Pro
extensions:
  materials: ["Steel 316L", "Rubber gasket B12"]
  source_table: product_equipment_matrix
```

**Mechanism 2 — `canon/unresolved/` for an untyped object.** When the object itself has no known TYPE — and is not merely an attribute of a known object — it is parked in `canon/unresolved/` with its ingestion provenance, **never** force-fitted to a TYPE and **never** dropped.

```yaml
# canon/unresolved/UNRES-001.yaml
ingest_status: unresolved
ingest_source: product_equipment_matrix.xlsx
ingest_field: materials
ingest_date: "2026-06-10"
related_to: [PROD-001]
data: ["Steel 316L", "Rubber gasket B12"]
```

`canon/unresolved/` holds **canon-grade content whose only gap is an unresolved TYPE** — *not* low-trust material ([CONTRACT §13.1](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md)). Type resolution is a second axis, orthogonal to admission: an entry MAY be `proposed`-untyped (just ingested) or **admitted-but-untyped** (a human confirmed the content is accurate, but no TYPE is assigned yet). It is segregated from typed canon only because the canon machinery is TYPE-keyed (`<TYPE>-N` ids, per-TYPE placement, TYPE-keyed views) — so an untyped entry never renders in a typed view and is skipped by every typed canon walker, while its content stays authoritative. Because it carries real model knowledge it lives in **shared, committed `canon/unresolved/`**, never in the per-user, private `_intake/` workspace. The skill itself only ever *emits* `proposed` (non-admitted) entries here; admitting one to admitted-but-untyped is the human gate's act — so [the one rule](#the-one-rule-that-governs-everything) holds.

**Routing — which mechanism applies:**

| Situation | Action |
|---|---|
| Known object, unknown fields | `extensions:` on the object |
| Unknown fields clearly belonging to a known object | `extensions:` on the parent |
| Object is a law / rule / standard | `codex` zone (Step 3 codex route) — *never* `canon/unresolved/` |
| Standalone object, unknown TYPE | `canon/unresolved/` |
| Same unknown TYPE recurs across ingestions | Propose a new entity TYPE in the methodology |

The reviewer resolves each `canon/unresolved/` entry to exactly one of **promote** (admit as a real TYPE through the §6 gate), **fold** (move into a parent's `extensions:`), or **discard**.

> **Wired in the CLI.** `emit-candidates` does both mechanically from the extraction result: it carries each element's `extensions:` onto its candidate (verbatim, `EXT-001`), and it shapes the result's `unresolved[]` items into `canon/unresolved/UNRES-NNN.yaml` holding files (the §13.2 fields; non-admitted — no admission record). An item missing `ingest_field` / `data` is dropped with a warning, never emitted malformed. `validate` flags `EXT-002` (an `extensions:` key shadowing a defined field); `repo-check` reports the holding count and flags malformed entries (`UNRES-001..003`); and every typed canon walker (`buildCanonIndex`, `check-placement`, `repo-check`'s typed tally) skips `canon/unresolved/` so an untyped entry is never counted as a typed element (`UNRES-004`).

---

## The CLI

All deterministic behaviour lives in **`@transitrix/ingest-cli`** — document conversion, coverage-profile read, validator pass, field-artefact + candidate emission, and the `_intake/` moves. This keeps the deterministic guarantees independent of which agent drives the skill (the same principle as the methodology's CI validators): neither Claude nor Copilot reimplements the logic, and both get identical results.

The CLI is resolved as a **standalone package** — installed locally (it provides the `transitrix-ingest` bin) and, once published from its own tooling repo at the ~1.0 extraction, equivalently via `npx @transitrix/ingest-cli`. It is **not** vendored per skill and **not** referenced by a sibling path — a sibling-path reference would dangle when only this skill directory ships into a Copilot `.github/skills/` install. Its subcommands are the contract above: `scaffold-intake`, `convert`, `privacy-scan`, `admit-source` (`--zone field|codex`; `field-artefact` / `codex-artefact` remain as deprecated aliases for one release), `emit-candidates`, `validate`, `review-queue`, `suggest-profile`, `check-placement`, `resolve-placement`.

---

## Portability — Claude + GitHub Copilot

This skill is one shared `SKILL.md` in the converged **Agent Skills** format. It is auto-loaded by Claude (as `/transitrix:ingest`) and picked up by Copilot from `.github/skills/ingest/` or `~/.copilot/skills/ingest/`. Discipline that keeps it portable:

- All heavy logic is in the CLI, not in agent-specific tool calls.
- This `SKILL.md` is **agent-neutral** — it references the CLI and the procedure, with no Claude-only or Copilot-only assumptions.
- The skill directory is self-contained: prompts and schemas live in the bundle, never referenced from a sibling skill.

---

## BA quickstart — requirements from an interview

A common shortcut for the BA persona: an interview writeup (or a project brief, or an SOP) is already Markdown, and only **motivation-layer** candidates are wanted — `REQUIREMENT`, `CONSTRAINT`, and the surrounding `GOAL` / `STAKEHOLDER` context. The four business/application/implementation layers are not needed. The full pipeline still applies; the only change is scope.

**Scope-narrowing is agent-side, not CLI-side.** The CLI never runs the prompts itself — it receives a JSON extraction *result* from the agent (see [Step 4](#step-4--extract-typed-candidates-entity-strong-relation-conservative)). The four per-layer prompts under [`prompts/`](prompts/) are independent and self-contained ([`prompts/README.md`](prompts/README.md)); running only [`prompts/01_motivation.md`](prompts/01_motivation.md) and skipping `02_business.md` / `03_application.md` / `04_implementation.md` is the supported shortcut. No CLI flag is needed and none exists — the agent simply omits the other prompts.

Motivation-only run (assumes `_intake/` already scaffolded; source file is already `.md`, so `convert` is skipped):

1. Drop the writeup into `_intake/inbox/` and move it to `_intake/processing/` (or just save it there directly).
2. **Admit** as a field artefact:
   ```
   transitrix-ingest admit-source --zone field _intake/processing/<file>.md \
       --type INTERVIEW --role "<role>" --date YYYY-MM-DD
   ```
   The type is `INTERVIEW` for a transcript, `DRAFT` for a brief/spec/SOP (the source-quality proposal follows the [Step 3](#step-3--emit-the-field-artefact-with-proposed-source_quality) table).
3. **Extract, motivation-only.** Feed the field artefact body to [`prompts/01_motivation.md`](prompts/01_motivation.md) as the system prompt and save the JSON extraction result (single object with `elements[]` / `relations[]` / `unresolved[]`, per [`prompts/README.md`](prompts/README.md)). The prompt sets `origin` on every `REQUIREMENT` from source-document context — a project brief yields `origin: project-product`, an SOP `origin: process-product`, a law/regulation/policy `origin: legislative` (see the origin table in [`prompts/01_motivation.md`](prompts/01_motivation.md)). Do **not** run `02`/`03`/`04` for this persona.
4. **Emit candidates + review queue** (unchanged from the main pipeline):
   ```
   transitrix-ingest emit-candidates <field/artefact.yaml> --from <result.json>
   transitrix-ingest validate         _intake/processing/candidates/
   transitrix-ingest review-queue     _intake/processing/candidates/
   ```

Everything downstream — validation, coverage-profile flags, the human review gate, [the one rule](#the-one-rule-that-governs-everything) — is identical. Nothing is admitted to canon; the reviewer confirms `origin` alongside `source_quality` on the field artefact and each candidate.

### Worked example — project brief → project-product REQUIREMENT

Source (an excerpt from `_intake/processing/customer-portal-brief.md`, admitted as `--type DRAFT --role "Product Manager"`):

> The customer portal must expose a self-service password reset flow. Users must be able to reset their password without contacting support. The reset must complete within 3 minutes end-to-end.

Motivation-only extraction result the agent produces from `prompts/01_motivation.md`:

```json
{
  "elements": [
    { "id": "REQUIREMENT-PORTAL-1", "name": "Self-service password reset",
      "element_type": "REQUIREMENT",
      "extraction_confidence": "high",
      "extraction_notes": "explicit \"must\" in a project brief for the customer portal",
      "origin": "project-product" },
    { "id": "REQUIREMENT-PORTAL-2", "name": "Password reset completes within 3 minutes",
      "element_type": "REQUIREMENT",
      "extraction_confidence": "high",
      "origin": "project-product" }
  ]
}
```

After `emit-candidates`, each becomes a candidate under `_intake/processing/candidates/` with `derived_from: [<the field artefact id>]`, `admitted_to: pending`, `origin: project-product`, and the `extraction_confidence` review flag preserved. The review queue lists them for the human gate; nothing lands in `canon/` until admitted.

For a **process-product** origin, swap the source: an SOP passage like "the returns process shall produce a completed refund confirmation within 24 hours" yields a `REQUIREMENT` with `origin: process-product` under the same steps. For a **legislative** origin, use the codex route ([Step 3](#step-3--emit-the-field-artefact-with-proposed-source_quality) — `admit-source --zone codex --type LAW|REGULATION|POLICY|INTERNAL_STANDARD`) instead of the field route; the motivation-only extraction still applies.

---

## What this skill does NOT do

- It does **not** write **admitted** canon. Ever. It emits candidates and a review queue; a human admits. (It MAY emit `proposed`, non-admitted entries to `canon/unresolved/` — Step 7 — but the admission record on an admitted-but-untyped entry is written only by the human gate.)
- It does **not** ship the methodology canon. It reads the published specs (via `WebFetch` when deeper than this protocol).
- It does **not** fold `extraction_confidence` into `source_quality`, or persist either extraction-confidence value into canon.
- It does **not** emit TYPEs or REL kinds outside the adopter's coverage profile — out-of-profile material is flagged for review.
- It does **not** auto-admit, auto-reaffirm, or move data between zones. `derived_from` is a citation, not a migration.
- It does **not** bypass the privacy gate. No document reaches `admit-source` unless `privacy-scan` exits `CLEAN` or `STRIPPED`. The gate is fail-closed and enabled by default; disabling it requires an explicit adopter decision in `transitrix.yaml`.
