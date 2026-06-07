# Transitrix Ingest Skill

The **front door** of a Transitrix repository: it turns raw organisational material — interviews, policies, org charts, spreadsheets, notes — into `field`-zone artefacts and typed `canon` *candidates*, at scale, and routes everything through a human review gate. It is the operational counterpart to the onboarding skill's per-layer extraction prompts: the part that converts documents, scores source trust, runs the validators, and stages a review queue.

This directory is the **`ingest` skill** within the `transitrix` plugin (the plugin root is [`transitrix/`](../../), which carries the shared [`.claude-plugin/plugin.json`](../../.claude-plugin/plugin.json) manifest, with one `skills/<name>/` directory per skill). Invoked as `/transitrix:ingest`.

> **Status — operational.** Beyond the agent-facing protocol ([`SKILL.md`](SKILL.md)), JSON schemas ([`schemas/`](schemas/)), and the `_intake/` convention ([`templates/_intake.README.md`](templates/_intake.README.md)), the deterministic CLI ([`@transitrix/ingest-cli`](../../../packages/ingest-cli/)) implements all subcommands and is covered by a no-API-key integrity test (see [Roadmap](#roadmap)). The skill's Step 0 pre-check still stops cleanly if the CLI is not installed in a given environment.

---

## The one rule

**Propose, never write canon.** The skill emits `field` artefacts and canon *candidates*, runs them through the existing validators, and produces a review queue. It never writes into `canon/`. Admission stays a deliberate, auditable human gate (`admitted_by`). A hallucinated element or relation reaching canon unreviewed is the worst-case failure; every design choice here exists to prevent it.

## Two axes of trust, never merged

- **`source_quality`** — trust in the *source* (signed policy → `authoritative`; meeting note → `single_source`). A closed ordinal label on the field artefact's admission record ([CONTRACT §11.2](../../../notations/CONTRACT.md)). The skill proposes it from document type; a human confirms.
- **`extraction_confidence`** — "did the model read the document correctly". A separate review flag on each candidate. It surfaces in the review queue and is **never** folded into `source_quality`, and **never** persisted into canon ([CONTRACT §11.8](../../../notations/CONTRACT.md)).

## What it ships

- [`SKILL.md`](SKILL.md) — the agent-facing, agent-neutral protocol: a six-step pipeline (`scaffold-intake → convert → admit-source → emit-candidates → validate → review-queue`) plus the hard constraints.
- [`schemas/`](schemas/) — JSON Schemas for the three artefacts the pipeline produces: a `field` artefact, a canon candidate, and the review queue.
- [`templates/_intake.README.md`](templates/_intake.README.md) — the documentation the CLI drops into an adopter's `_intake/` folder describing the `inbox → processing → processed` flow.

---

## Why the deterministic logic is a Node CLI

All heavy logic — Markitdown conversion, coverage-profile read, validator pass, field-artefact + candidate emission, the `_intake/` moves — lives in a CLI (`@transitrix/ingest-cli`), not in this `SKILL.md`. The CLI is **Node** (`.mjs`), chosen by the following balance:

| Criterion | Node CLI | Python CLI |
|---|---|---|
| Consistency with the repo's deterministic guarantees | The canonical validators (`scripts/check-notations.mjs`, `scripts/check-skill-cheatsheet.mjs`) are already Node — "deterministic guarantees never depend on the runtime" is established on Node. | diverges from the validators |
| Adopter delivery (`.github/skills/`) + invocation | `npx`-able, no per-adopter virtualenv | needs a Python env on the adopter machine |
| "No native deps" | pure JS | PyYAML is an external dependency |
| Office → Markdown (Markitdown is a Python tool) | shelled out to the `markitdown` CLI inside the `convert` command only — a single, isolated point of contact | imported natively |

Python in this repo is used **only in the onboarding skill's tests**, not in shipped deterministic logic. Markitdown stays a shell-out from one subcommand; the rest of the pipeline is pure Node and behaves identically under either agent.

### CLI resolution — a published package

The CLI is resolved as a **published package** (installed / invoked via `npx`), not vendored per skill and not referenced by a repo-relative sibling path. A sibling-path reference would dangle when only this skill directory ships into a Copilot `.github/skills/ingest/` install; a published package is the single versioned source for both skills and both agents.

---

## Portability — Claude + GitHub Copilot

One shared `SKILL.md` in the converged **Agent Skills** format. Claude auto-loads it as `/transitrix:ingest`; Copilot picks the same directory up from `.github/skills/ingest/` or `~/.copilot/skills/ingest/`. The skill stays portable because:

- all heavy logic is in the CLI, not in agent-specific tool calls;
- `SKILL.md` is agent-neutral — it references the CLI and the procedure, with no Claude-only or Copilot-only assumptions;
- the skill directory is self-contained — prompts and schemas live in the bundle, never referenced from a sibling skill.

---

## The `_intake/` convention (skill-local in v0)

`_intake/` is an **operational** folder at the organisation root — *not a zone*. Zones (`canon/`, `field/`, `codex/`) stay parallel; `_intake/` sits beside them as the pipeline workspace, with `inbox/ → processing/ → processed/`. The admitted `field` artefact lives in `field/` (with its admission record and `source_quality`); the original raw file is retained in `_intake/processed/` so the artefact is traceable to its source.

In v0 this convention is **skill-local** — documented here and in [`templates/_intake.README.md`](templates/_intake.README.md), deliberately *not* yet reserved in the methodology `MANIFEST.md` / `CONTRACT.md`. Whether `_intake/` becomes a reserved org-structure convention is a separate proposal, taken once the skill stabilises.

---

## Roadmap

| Increment | Contents |
|---|---|
| **Skeleton** ✓ landed | `SKILL.md`, JSON schemas, `_intake/` convention, plugin wiring. |
| **CLI** ✓ landed | `@transitrix/ingest-cli` — the deterministic subcommands (`scaffold-intake`, `convert`, `admit-source`/`field-artefact`/`codex-artefact`, `emit-candidates`, `validate`, `review-queue`) + the forked extraction prompts in `prompts/`. |
| **Tests + CI** ✓ landed | A no-API-key integrity test (bundle + dry CLI run on a fixture) and a weekly LLM-drive, plus a workflow — mirroring the onboarding skill's test harness. |

---

## What this skill does NOT do

- It does **not** write to `canon/`. It emits candidates and a review queue; a human admits.
- It does **not** ship the methodology canon. It reads the published specs (via `WebFetch`).
- It does **not** fold `extraction_confidence` into `source_quality`, or persist either extraction-confidence value into canon.
- It does **not** emit TYPEs or REL kinds outside the adopter's coverage profile — out-of-profile material is flagged for review, never silently emitted or dropped.
- It does **not** auto-admit or move data between zones. `derived_from` is a citation, not a migration.
