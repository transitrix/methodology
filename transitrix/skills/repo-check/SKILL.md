---
name: Transitrix Repo-Check
description: "Read-only health check (\"doctor\") for a Transitrix adopter repository. Emits a short, DATA-FREE report — methodology version, resolved coverage profile, per-zone and per-TYPE counts, an adoption-level indicator, integrity red flags (invalid IDs, misplaced canon elements, unresolved profile), and a tooling check. Reports aggregates and statuses only — never object ids, names, or contents — so the report is safe to share outside the organisation. Idempotent and non-mutating: it reads the zones and never writes one."
when_to_use: 'User says "check my Transitrix repo", "is my model healthy", "run the repo doctor", "give me a status of the canon", "what state is this adopter repo in", or wants a shareable, data-free summary of a repository''s shape and integrity without exposing any model contents.'
min_version: "1.0.0"
allowed-tools: Read, Bash, Glob, Grep
---

# Transitrix Repo-Check Skill

A **read-only doctor** for a Transitrix adopter repository. It answers "what state is this repo in, and is anything obviously wrong?" with a **short, data-free report** — counts and statuses only, never the model's contents — so it is safe to paste into a ticket, a status update, or a support thread.

This directory is the **`repo-check` skill** within the `transitrix` plugin (the plugin root is [`transitrix/`](../../), which carries the shared [`.claude-plugin/plugin.json`](../../.claude-plugin/plugin.json) manifest, one `skills/<name>/` directory per skill). Invoked as `/transitrix:repo-check`.

> **Status — operational.** The deterministic CLI (`@transitrix/ingest-cli`) implements `repo-check`; this `SKILL.md` only sequences it. Run the Step 0 pre-check first.

---

## The one rule

**Read-only, and data-free.** `repo-check` never writes a zone and never emits object ids, names, or file contents — only aggregate counts, the methodology version, the resolved coverage-profile name, TYPE-vocabulary counts, and status flags. That is what makes the report safe to share externally. If you need the underlying detail, use the zone files directly; this skill deliberately does not surface them.

---

## Step 0 — CLI-presence pre-check

The work is done by the CLI, never reimplemented in the agent:

```
transitrix-ingest --version             # primary — local install
# or, once the package is published to npm:
npx @transitrix/ingest-cli --version    # equivalent — same binary
```

- **Present** under either name → proceed. Use whichever form resolved (the subcommands and flags below are identical between the two).
- **Absent** under both → tell the user to install the CLI; do not hand-roll the scan. Pre-1.0 the package is **not yet on npm**, so the expected install path is local: clone the methodology repo and `npm install -g ./packages/ingest-cli` (which provides the `transitrix-ingest` bin); the `npx @transitrix/ingest-cli` form starts to resolve once the CLI is published from its own tooling repo at the ~1.0 extraction.

---

## Step 1 — Run the doctor

```
transitrix-ingest repo-check [org-root]    # defaults to the current repo
```

It prints a YAML report to stdout:

- `methodology_version` + `manifest_present` — read from `transitrix.yaml`.
- `coverage_profile` — the resolved profile display (`full` / a preset / `extends:<preset>`), plus a `coverage_warning` if it could not be resolved.
- `zones` — for each of `canon` / `field` / `codex`: whether present, file count, and a per-**TYPE** count (TYPE vocabulary only — the prefix of a grammar-valid id; a malformed id is counted under `invalid_ids`, never by name).
- `adoption_level` — a coarse indicator derived from how populated `canon` is (`empty` → `seeded` → `in use` → `established`).
- `integrity` — `invalid_ids`, `misplaced_canon_elements` (elements outside their `ELEMENT_PRIMITIVES` §4 folder), `canon_elements_scanned`, and a `red_flags` list of short status strings.
- `tooling` — `cli_presets_version` (the methodology version the CLI's built-in presets target), `methodology_version_match` (whether that matches the version declared in `transitrix.yaml`), and `ok` (`false` when there is a version mismatch).

---

## Step 2 — Read the report back

Summarise the `adoption_level` and any `red_flags` for the user in plain language, and point at the relevant repair command:

- invalid IDs → fix the offending ids by hand (the report does not name them — by design; locate them with the validators or `git grep` locally).
- misplaced canon elements → `transitrix-ingest check-placement [org-root]` lists them locally (that command **does** name ids — keep its output local, it is not the data-free report).
- unresolved `coverage_profile` → fix `transitrix.yaml` per `COVERAGE_PROFILES.md` (CP-001).
- `tooling.ok: false` / version mismatch → the installed CLI binary targets a different methodology version than `transitrix.yaml` declares. Reinstall the CLI (see the adopter upgrade procedure in `RELEASING.md`) and re-run `repo-check` to confirm the flag clears.

Nothing here mutates the repo; re-running is always safe and gives the same answer for the same tree.
