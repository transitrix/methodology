---
name: Transitrix Status
description: "On-demand view of what is waiting behind every human gate in a Transitrix adopter repository — ADR proposed/accepted/superseded (author:agent broken out), Work Item phase, canon element status, REQUIREMENT/CONSTRAINT review-overdue, and ingest batches awaiting review. One table, phases and counts only (no ages, no thresholds), plus the ids in every open phase so the caller can act on them. Read-only — never writes a zone, an operations record, or a batch."
when_to_use: 'User says "what''s waiting on review", "show me the workflow status", "what''s stuck in the queue", "how many ADRs are still proposed", "give me a status of every human gate", or wants a single on-demand view of open items across ADRs, work items, canon status, overdue reviews, and ingest batches without hand-counting files.'
min_version: "2.1.0"
allowed-tools: Read, Bash, Glob, Grep
---

# Transitrix Status Skill

A **read-only, on-demand view** of everything standing behind a human gate in a Transitrix adopter repository — one table, across every gate the methodology defines, rather than five separate commands.

This directory is the **`status` skill** within the `transitrix` plugin (the plugin root is [`transitrix/`](../../), which carries the shared [`.claude-plugin/plugin.json`](../../.claude-plugin/plugin.json) manifest, one `skills/<name>/` directory per skill). Invoked as `/transitrix:status`.

> **Status — operational.** The deterministic CLI (`@transitrix/ingest-cli`) implements `workflow-status`; this `SKILL.md` only sequences it. Run the Step 0 pre-check first.

---

## The one rule

**Sequence and format only — never count.** This skill has no logic of its own: it runs `transitrix-ingest workflow-status` and relays what it prints. The agent MUST NOT walk `operations/`, `canon/`, or `_intake/` and tabulate a table itself — that produces a count that can silently drift from what the CLI would report. If the CLI is absent, say so (Step 0) rather than approximating.

---

## Step 0 — CLI-presence pre-check

The work is done by the CLI, never reimplemented in the agent:

```
transitrix-ingest --version             # primary — local install
# or, once the package is published to npm:
npx @transitrix/ingest-cli --version    # equivalent — same binary
```

- **Present** under either name → proceed. Use whichever form resolved (the subcommand and flags below are identical between the two).
- **Absent** under both → tell the user to install the CLI (clone the methodology repo, `npm install -g ./packages/ingest-cli`); do not hand-assemble the table.

---

## Step 1 — Run the report

```
transitrix-ingest workflow-status [org-root]    # defaults to the current repo; prints a Markdown table to stdout
```

Flags, all optional:

- `--out <path>` — write the report to a file instead of printing it.
- `--format md|yaml` — `yaml` for a digest job or CI; identical counts to the default Markdown table.
- `--data-free` — phases and counts only, no ids, no repo path — safe to share outside the organisation (same shareability contract as `repo-check`).

Sources scanned, each degrading gracefully to an omitted section when its folder is absent — no error:

| Object | Phase source |
|---|---|
| ADR | `operations/decisions/*.md` `status:` (`author: agent` proposed broken out as its own row — [`method/07-decisions.md`](../../../method/07-decisions.md) §2) |
| Work Item | `operations/work-items/*.md` `status:` |
| Canon element | `canon/**` top-level `status:` |
| REQUIREMENT/CONSTRAINT | overdue for review (reuses `check-stale`'s scan) |
| Ingest batch | `_intake/processing/**/review-queue.yaml` present = awaiting review |

A record whose phase field is missing or outside the vocabulary lands in an `unknown` row — never dropped, never bucketed into a valid phase.

**Time is out of scope.** The report has no age column, no threshold, no "oldest" figure — phases and counts only. Do not add one when relaying the result.

---

## Step 2 — Relay the report

Return the table (or the file path, if `--out` was used) as-is. Below the table the CLI lists the ids in every non-terminal phase with at least one record — pass that list through unedited so the user can act on it directly (open the ADR, chase the overdue review, resolve the batch).

Nothing here mutates the repo; re-running is always safe and gives the same answer for the same tree.
