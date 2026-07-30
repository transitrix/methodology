# `@transitrix/ingest-cli`

The deterministic CLI behind the **ingest skill** (`transitrix/skills/ingest/`, `/transitrix:ingest`). The skill's `SKILL.md` shells out to this CLI; it never reimplements the logic, so behaviour is identical under Claude and GitHub Copilot.

It lives here — a standalone package at the repo root, **outside** the skill bundle and the plugin payload — because it is consumed as a **standalone package**, not vendored into the skill directory and not referenced by a repo-relative sibling path (which would dangle when only the skill directory ships into a Copilot `.github/skills/` install).

## Install

The package is not yet published to npm; the planned npm publish rides the CLI's extraction to its own tooling repo (`IG-7`). Today the install is local from this checkout:

```
npm install -g ./packages/ingest-cli   # provides the `transitrix-ingest` bin globally
# or, from inside packages/ingest-cli/:
npm link
```

The local install resolves the `transitrix-ingest` invocations used throughout the ingest and repo-check skills. Once the package ships to npm the equivalent shorthand becomes `npm install -g @transitrix/ingest-cli` (or `npx @transitrix/ingest-cli <command>`) — the two forms invoke the same binary, with identical subcommands and flags.

## The one rule

The CLI **proposes**. It writes field artefacts, candidates, and a review queue into `_intake/` and `field/`. It **never** writes into `canon/`. Admission to canon stays a human gate.

## Design

- Pure Node ESM, **no dependencies**. `npx`-able with zero install footprint.
- **MS Markitdown** is the only external touchpoint, shelled out from the `convert` command alone (Office → Markdown). The rest of the pipeline is pure Node. Install it with `pip install "markitdown[all]"`; `convert` looks for the `markitdown` console-script and falls back to `python -m markitdown` / `python3 -m markitdown`, so it works inside a venv where only the interpreter is on PATH. On Windows, if `markitdown`/`npx` are blocked by the PowerShell execution policy, run `python -m markitdown` directly or `Set-ExecutionPolicy -Scope Process RemoteSigned`.
- Exit codes: `0` ok · `1` usage / findings that need review · `2` error.

## Commands

```
transitrix-ingest <command> [args]
```

| Command | Status | Purpose |
|---|---|---|
| `--version` / `--help` | ✅ | Version (the skill's Step-0 pre-check) and usage. |
| `scaffold-intake <org-root>` | ✅ | Create `_intake/{inbox,processing,processed}` (idempotent). |
| `convert <inbox-file>` | ✅ | Convert a document to Markdown in `_intake/processing/` (Markitdown; `.md`/`.txt` passthrough). |
| `privacy-scan <processing/file.md>` | ✅ | Fail-closed PII/medical pre-admission gate; `CLEAN`/`STRIPPED`/`REJECTED`/`ERROR`, a `STRIPPED` run writes `<file>.redacted.md`. `admit-source --zone field` refuses without a passing, content-matching scan record. |
| `admit-source <md> --zone field\|codex` (`field-artefact` / `codex-artefact` deprecated aliases) | ✅ | Emit a field or codex artefact with provenance + (field only) proposed `source_quality`; retain the raw source in `_intake/processed/`. |
| `emit-candidates <field-artefact> --from <result.json>` | ✅ | Shape the agent's extraction result into candidates (entity-strong, relation-conservative; non-`high` relations become suggestions). |
| `validate <candidates-dir>` | ✅ | Validate candidate `*.json` against the contract (in code) + coverage profile; flags, never drops. |
| `review-queue <candidates-dir>` | ✅ | Stage the human review queue (`review-queue.yaml`); `gate.admits_to_canon: false`; annotates each element candidate with its §4 `placement`. `[--out <path>] [--scope <word>]` — non-destructive default, see "Multi-batch naming" below. |
| `resolve-placement <TYPE>` | ✅ | Print a TYPE's `ELEMENT_PRIMITIVES.md` §4 materialisation mode + layer + folder. |
| `workflow-status [org-root]` | ✅ | Report every human gate's phase + count — ADR/WI status, canon element status, REQUIREMENT/CONSTRAINT review-overdue, ingest batches awaiting review, reg-intel digests awaiting review. Read-only; phases and counts only, no age/time. `[--out <path>] [--format md\|yaml] [--data-free]`. |
| `check-placement [org-root]` | ✅ | Flag admitted elements sitting outside their §4 folder (read-only over `canon/`). |

## Multi-batch naming

`review-queue.yaml` (and the reg-intel CLI's `review-digest.yaml`) is a **stable package filename**. The first batch for an org lands at the flat legacy path `_intake/processing/review-queue.yaml`. Re-running against the same candidates keeps updating that file in place as long as the output actually changes (e.g. admitted candidates drop out of the queue) — that is a refresh of the same batch, not a new one. Only a re-run that would produce byte-identical output routes to its own dated **batch directory** instead — `_intake/processing/review-queue-<scope>-YYYYMMDD-<seq>/review-queue.yaml`, where `<scope>` is `--scope <word>` (a generic word, never an org-identifying string) or defaults to `batch`. `workflow-status` discovers both the flat path and every dated directory (HUB-837).

## Upgrading

After pulling a new methodology version, reinstall the CLI before running the pipeline. A cached or globally-installed binary from a prior release does not auto-update and may run stale validators, a stale profile resolver, or stale review-queue logic. Re-run your install command and verify `transitrix-ingest --version` reflects the new release.

## Layout

```
packages/ingest-cli/
  ingest.mjs        # dispatcher / entry point (bin: transitrix-ingest)
  src/
    ids.mjs            # canonical ID grammar (IDS §1)
    intake.mjs         # _intake/ scaffolding + stage moves
    convert.mjs        # document -> Markdown (Markitdown shell-out)
    yaml.mjs           # zero-dep YAML emitter + manifest scalar reader
    privacy-scan.mjs   # fail-closed PII pre-admission gate (detectors, sidecar records, privacy-report.yaml)
    field-artefact.mjs # emit a field artefact + proposed source_quality
    coverage.mjs       # resolve coverage_profile (preset/custom) + classify in/out
    coverage-presets.mjs # shipped preset membership (COVERAGE_PROFILES §3/§3.1)
    placement.mjs      # TYPE -> materialisation mode/layer/folder (ELEMENT_PRIMITIVES §4)
    validate.mjs       # candidate contract checks (in code) + candidate loader
    review-queue.mjs   # assemble + emit the human review queue
    batch-path.mjs     # non-destructive batch-directory naming (HUB-837)
    emit-candidates.mjs# shape the agent extraction result into candidates
    workflow-status.mjs# every human gate's phase + count, read-only (HUB-819)
```

The agent-facing extraction prompts that produce the `--from <result.json>` input live with the skill, at `transitrix/skills/ingest/prompts/`.
