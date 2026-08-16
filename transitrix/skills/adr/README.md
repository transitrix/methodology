# Transitrix ADR Skill

Helps a user go from "we decided X" to a committed, `scripts/check-adl.mjs`-clean
Architecture Decision Record — the entry point to the agent-authored decision flow
[`method/07-decisions.md`](../../../method/07-decisions.md)
specifies but ships no workflow for.

This directory is the **`adr` skill** within the `transitrix` plugin (the plugin root
is [`transitrix/`](../../), which carries the shared
[`.claude-plugin/plugin.json`](../../.claude-plugin/plugin.json) manifest, one
`skills/<name>/` directory per skill). Invoked as `/transitrix:adr`.

## Why it exists

`method/07-decisions.md` §2
defines the per-repo Architecture Decision Record format, its `author`/`source`
provenance fields, the ratification gate that keeps an agent from self-accepting its
own decisions, and the harvest job that aggregates records across repos into a central
enterprise log. None of that ships a workflow for actually *authoring* a record — a
user (or an autonomous agent) still had to hand-write the front-matter, derive the id
from today's date and a slug, and remember the invariants. This skill is that
workflow.

## What it is not

- Not a promotion mechanism — it marks a record `scope:`-eligible; the harvest job
  (`scripts/adl-harvest.mjs`, run from the *central* architecture repo) does the
  actual copying, on its own schedule.
- Not a ratification tool — it never sets `status: accepted`. That stays a separate,
  human-reviewed change.
- Not a body editor for accepted records — a course change is always a new record
  plus a status-pointer flip on the old one (supersession), never an in-place edit.

## Usage

Describe the decision in plain language ("we decided to pin the object catalog to
2.3.0 for service-x") or ask to supersede an existing one ("supersede ADR-0003 — we're
reversing that call"). See [`SKILL.md`](SKILL.md) for the full step-by-step protocol.
