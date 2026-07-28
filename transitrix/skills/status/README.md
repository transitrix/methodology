# Transitrix Status Skill

A **read-only, on-demand view** of what is waiting behind every human gate in a Transitrix adopter repository — ADR, Work Item, canon element, REQUIREMENT/CONSTRAINT review-overdue, and ingest-batch phases, each with a count, in one table.

This directory is the **`status` skill** within the `transitrix` plugin (the plugin root is [`transitrix/`](../../), which carries the shared [`.claude-plugin/plugin.json`](../../.claude-plugin/plugin.json) manifest, with one `skills/<name>/` directory per skill). Invoked as `/transitrix:status`.

> **Status — operational.** The deterministic CLI (`@transitrix/ingest-cli`) implements the `workflow-status` subcommand; the agent-facing protocol ([`SKILL.md`](SKILL.md)) only sequences it. The Step 0 pre-check stops cleanly if the CLI is not installed in a given environment.

## Why it exists

Each human gate the methodology defines is specified on its own, but none was counted in one place: ADR ratification, work-item tracking, canon element status, stale-review checks, and ingest-batch review each needed a separate command or scattered coverage. `workflow-status` answers "what is standing behind every gate, in which phase, how many" in a single invocation, and this skill is the conversational front door to it.

## What it is not

- It is **not** a writer — it never touches a zone, an operations record, or a batch; re-running is always safe (idempotent).
- It is **not** a clock — no ages, no thresholds, no "oldest" figure. Phases and counts only.
- It does **not** compute anything itself — if the CLI is absent, the skill says so rather than hand-assembling the table.

## Usage

```
transitrix-ingest workflow-status [org-root]    # defaults to the current repo; prints Markdown to stdout
transitrix-ingest workflow-status --format yaml
transitrix-ingest workflow-status --data-free
transitrix-ingest workflow-status --out status.md
```

The CLI is also reachable as `npx @transitrix/ingest-cli workflow-status ...` once the package is published to npm; until then, the local-install form is primary.

See [`SKILL.md`](SKILL.md) for the agent-facing protocol and the report's field reference.
