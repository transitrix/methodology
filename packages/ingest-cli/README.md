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
| `emit-candidates` | ⏳ | Emit typed canon candidates (entity-strong, relation-conservative). |
| `validate` | ⏳ | Validate candidates against the schemas + coverage profile. |
| `review-queue` | ⏳ | Stage the human review queue. |

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
```
