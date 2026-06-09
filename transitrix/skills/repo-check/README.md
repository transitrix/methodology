# Transitrix Repo-Check Skill

A **read-only "doctor"** for a Transitrix adopter repository. It emits a short, **data-free** health report — methodology version, resolved coverage profile, per-zone and per-TYPE counts, an adoption-level indicator, integrity red flags (invalid IDs, misplaced canon elements, unresolved profile), and a tooling check. Aggregates and statuses only — never object ids, names, or contents — so the report is safe to share outside the organisation.

This directory is the **`repo-check` skill** within the `transitrix` plugin (the plugin root is [`transitrix/`](../../), which carries the shared [`.claude-plugin/plugin.json`](../../.claude-plugin/plugin.json) manifest, with one `skills/<name>/` directory per skill). Invoked as `/transitrix:repo-check`.

> **Status — operational.** The deterministic CLI (`@transitrix/ingest-cli`) implements the `repo-check` subcommand; the agent-facing protocol ([`SKILL.md`](SKILL.md)) only sequences it. The Step 0 pre-check stops cleanly if the CLI is not installed in a given environment.

## Why it exists

Operating a Transitrix repo, you periodically want a quick, shareable answer to "what state is this repo in, and is anything obviously wrong?" — without exposing the model's contents. `repo-check` is that answer: it reuses the same validators and placement/coverage resolvers the ingest pipeline uses, and reports only counts and statuses.

## What it is not

- It is **not** a writer — it never touches a zone, and re-running is always safe (idempotent).
- It is **not** a detail view — by design it never names an object. To locate a flagged id, use `check-placement` (names ids — keep local) or the validators directly.

## Usage

```
npx @transitrix/ingest-cli repo-check [org-root]    # defaults to the current repo; prints YAML to stdout
```

See [`SKILL.md`](SKILL.md) for the agent-facing protocol and the report's field reference.
