# Transitrix Reg-Intel Skill

The **regulatory-side data-collection process** of a Transitrix repository: it watches the codex sources the repo already carries (laws, regulations, policies, internal standards flagged `monitoring_needed: true`), runs a cheap change-signal gate before any expensive extraction, and on signal-moved emits `SEGMENT-*` field chunks, `proposed` `REQUIREMENT-*` / `CONSTRAINT-*` canon candidates, and `AMENDMENT-*` records when an existing source has drifted — then stages everything in a review digest for human admission. It is the operational counterpart to the methodology's codex / SEGMENT / AMENDMENT / REQUIREMENT notation work.

This directory is the **`reg-intel` skill** within the `transitrix` plugin (the plugin root is [`transitrix/`](../../), which carries the shared [`.claude-plugin/plugin.json`](../../.claude-plugin/plugin.json) manifest, with one `skills/<name>/` directory per skill). Invoked as `/transitrix:reg-intel`.

> **Status — design v0.** The agent-facing protocol ([`SKILL.md`](SKILL.md)) is published; the deterministic CLI (`@transitrix/reg-intel-cli`) is the next increment. Until the CLI ships, Step 0 of the skill stops cleanly in any environment without it.

---

## The two rules

1. **Propose, never write canon.** The skill emits `field`-zone SEGMENT and AMENDMENT artefacts plus `proposed` REQUIREMENT / CONSTRAINT canon candidates, runs them through the canonical validators, and produces a review digest. It never writes into `canon/`, and it never silently flips an `active` canon element. Admission stays a deliberate human gate (`admitted_by`).
2. **Cheap signal before expensive extraction.** Every scan begins with a change-signal check (`ETag` / `Last-Modified`, API "updated" field, source "last amended" date). The expensive SEGMENT / CLASSIFY / AMENDMENT pass runs only when the signal has actually moved. A source whose signal has not moved gets its `next_scan_due` bumped and nothing else.

## Two axes of trust, never merged

- **`source_quality`** — trust in the *source* (`authoritative` / `corroborated` / `single_source` / `unverified`, [CONTRACT §11.2](../../../notations/CONTRACT.md)). A codex artefact is authoritative by construction and carries no `source_quality`; a SEGMENT / AMENDMENT extracted from the canonical regulator URL is typically `authoritative`.
- **`extraction_confidence`** — "did the model read the segment and classify it correctly". A separate review flag on each candidate. Surfaces in the digest, never folded into `source_quality`, never persisted into canon ([CONTRACT §11.8](../../../notations/CONTRACT.md)).

## What it ships (v0 — this increment)

- [`SKILL.md`](SKILL.md) — the agent-facing, agent-neutral protocol: the nine-step pipeline (`list-due → check-signal → fetch-snapshot → segment → classify → validate → amendment → update-scan → digest`), the two rules, the run loop, and the scope guards.

## What it ships (planned, fast-follow)

- `schemas/` — JSON Schemas for the operational artefacts the CLI writes that aren't yet first-class notation TYPEs (the per-run digest; the registry view the CLI exposes over the codex `scan` blocks).
- `prompts/` — segmentation and classification prompts (the per-source extraction prompts the CLI hands to the agent).
- `templates/` — operational templates (an adopter-facing README for `_intake/snapshots/`, an example daily-scheduler systemd unit / cron line).
- `tests/` — a no-API-key integrity test (bundle + dry CLI run on a fixture snapshot of a public regulation), mirroring the ingest skill's harness.

## Why the deterministic logic is a Node CLI

All heavy logic — registry read over the codex `scan` blocks, signal check, fetch, snapshot, segmentation, classification, validator pass, AMENDMENT emission, `scan`-block update, digest assembly — lives in `@transitrix/reg-intel-cli`. Node, same trade-off the ingest skill made: the canonical validators (`scripts/check-notations.mjs`, `scripts/check-skill-cheatsheet.mjs`) are already Node, the CLI is `npx`-able without a per-adopter virtualenv, and there are no native deps. JS-rendered sources are handled inside a single subcommand (`fetch-snapshot --render js`); the rest of the pipeline is pure Node and behaves identically under either agent.

### CLI resolution — a published package

The CLI is resolved as a **published package** (installed / invoked via `npx`), not vendored per skill and not referenced by a repo-relative sibling path. A sibling-path reference would dangle when only this skill directory ships into a Copilot `.github/skills/reg-intel/` install; a published package is the single versioned source for both skills and both agents.

---

## Portability — Claude + GitHub Copilot

One shared `SKILL.md` in the converged **Agent Skills** format. Claude auto-loads it as `/transitrix:reg-intel`; Copilot picks the same directory up from `.github/skills/reg-intel/` or `~/.copilot/skills/reg-intel/`. The skill stays portable because:

- all heavy logic is in the CLI, not in agent-specific tool calls;
- `SKILL.md` is agent-neutral — it references the CLI and the procedure, with no Claude-only or Copilot-only assumptions;
- the skill directory is self-contained — prompts and schemas live in the bundle, never referenced from a sibling skill.

---

## Relation to the ingest skill

The two skills are siblings, not subordinate. They share `_intake/` as their operational workspace (the ingest skill's [`templates/_intake.README.md`](../ingest/templates/_intake.README.md) documents the convention) and they share the canonical zone model (field / canon / codex) and admission gates. They differ in what they consume:

| | **ingest** | **reg-intel** |
|---|---|---|
| **Consumes** | Raw organisational material — interviews, policies, org charts, spreadsheets, notes — dropped into `_intake/inbox/` | Codex sources already in the repo (`monitoring_needed: true`) — laws, regulations, policies, internal standards |
| **Triggered by** | A human dropping files in / running the skill on demand | A daily scheduled tick that filters by `next_scan_due` |
| **Primary outputs** | Field artefacts (INTERVIEW / SURVEY / OBSERVATION / DRAFT / codex), typed canon candidates, review queue | SEGMENT field artefacts, REQUIREMENT / CONSTRAINT canon candidates, AMENDMENT field artefacts, codex `scan`-block updates, review digest |
| **Cardinality** | One run per batch of dropped files | One run per daily tick, fan-out over due codex sources |

Both skills share the same rule: propose, never write canon. Both produce a human-gated review surface; the ingest skill's is `review-queue.yaml`, the reg-intel skill's is `review-digest.yaml`. Both are stable package filenames that fall back to a dated batch directory when a run is concurrent with an unresolved one — see `@transitrix/ingest-cli`'s README "Multi-batch naming" (vkgeorgia/strategy#837).

---

## Roadmap

| Increment | Contents |
|---|---|
| **Design** ✓ landing now | `SKILL.md`, `README.md`, plugin discovery. |
| **CLI** | `@transitrix/reg-intel-cli` — the deterministic subcommands and the segmentation / classification prompts in `prompts/`. |
| **Tests + CI** | A no-API-key integrity test (bundle + dry CLI run on a fixture snapshot of a public regulation) and a workflow, mirroring the ingest skill's harness. |
| **Operational templates** | `_intake/snapshots/` README, an example daily-scheduler unit, fetch-mode and signal-source recipes per source family (eCFR, EUR-Lex, Federal Register, …). |

---

## What this skill does NOT do

- It does **not** write to `canon/`. It emits candidates and a digest; a human admits.
- It does **not** auto-flip an existing `active` canon element to `deprecated` / `retired` / `superseded`.
- It does **not** discover new codex sources. URLs in scope are exactly the `source_url` / `monitor_instead[]` of admitted codex artefacts; new-source discovery is a separate human-driven harvest.
- It does **not** follow links within fetched pages to crawl outward.
- It does **not** scan sources outside the adopter's coverage profile or jurisdiction policy.
- It does **not** scan Russia-based or Russia-disinfo sources — a project-level constraint that survives source selection.
- It does **not** fold `extraction_confidence` into `source_quality`, or persist either extraction-confidence value into canon.
- It does **not** interpret legal ambiguity — an ambiguous passage gets `extraction_confidence: low` and surfaces on the digest with both classifications flagged; the human picks.
