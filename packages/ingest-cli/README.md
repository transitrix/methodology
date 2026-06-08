# `@transitrix/ingest-cli`

The deterministic CLI behind the **ingest skill** (`transitrix/skills/ingest/`, `/transitrix:ingest`). The skill's `SKILL.md` shells out to this CLI; it never reimplements the logic, so behaviour is identical under Claude and GitHub Copilot.

It lives here — a standalone package at the repo root, **outside** the skill bundle and the plugin payload — because it is consumed as a **published package** (`npx @transitrix/ingest-cli`), not vendored into the skill directory and not referenced by a repo-relative sibling path (which would dangle when only the skill directory ships into a Copilot `.github/skills/` install).

## The one rule

The CLI **proposes**. It writes field artefacts, candidates, and a review queue into `_intake/` and `field/`. It **never** writes into `canon/`. Admission to canon stays a human gate.

## Design

- Pure Node ESM, **no dependencies**. `npx`-able with zero install footprint.
- **MS Markitdown** is the only external touchpoint, shelled out from the `convert` command alone (Office → Markdown). The rest of the pipeline is pure Node.
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
| `field-artefact <md> --type --role --date` | ✅ | Emit a field artefact with provenance + proposed `source_quality`; retain the raw source in `_intake/processed/`. |
| `emit-candidates <field-artefact> --from <result.json>` | ✅ | Shape the agent's extraction result into candidates (entity-strong, relation-conservative; non-`high` relations become suggestions). |
| `validate <candidates-dir>` | ✅ | Validate candidate `*.json` against the contract (in code) + coverage profile; flags, never drops. |
| `review-queue <candidates-dir>` | ✅ | Stage the human review queue (`review-queue.yaml`); `gate.admits_to_canon: false`; annotates each element candidate with its §4 `placement`. |
| `resolve-placement <TYPE>` | ✅ | Print a TYPE's `ELEMENT_PRIMITIVES.md` §4 materialisation mode + layer + folder. |
| `check-placement [org-root]` | ✅ | Flag admitted elements sitting outside their §4 folder (read-only over `canon/`). |

## Layout

```
packages/ingest-cli/
  ingest.mjs        # dispatcher / entry point (bin: transitrix-ingest)
  src/
    ids.mjs            # canonical ID grammar (IDS §1)
    intake.mjs         # _intake/ scaffolding + stage moves
    convert.mjs        # document -> Markdown (Markitdown shell-out)
    yaml.mjs           # zero-dep YAML emitter + manifest scalar reader
    field-artefact.mjs # emit a field artefact + proposed source_quality
    coverage.mjs       # resolve coverage_profile (preset/custom) + classify in/out
    coverage-presets.mjs # shipped preset membership (COVERAGE_PROFILES §3/§3.1)
    placement.mjs      # TYPE -> materialisation mode/layer/folder (ELEMENT_PRIMITIVES §4)
    validate.mjs       # candidate contract checks (in code) + candidate loader
    review-queue.mjs   # assemble + emit the human review queue
    emit-candidates.mjs# shape the agent extraction result into candidates
```

The agent-facing extraction prompts that produce the `--from <result.json>` input live with the skill, at `transitrix/skills/ingest/prompts/`.
