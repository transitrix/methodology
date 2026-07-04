---
name: Transitrix Report
description: "Produce a compliance report (obligation × subject impact matrix, or per-regime coverage metric) from a Transitrix repository, by conversation. Resolves the report's parameters — from the request, from the view spec's defaults, or from a named saved view-config — materialises a versioned view-config artefact, and renders it through the deterministic `cervin export-compliance` CLI to Markdown or PDF. The skill never computes a matrix itself; rendering stays in the CLI so the same config re-renders identically next quarter. Reports are reproducible and auditable: every report has a committed parameter artefact, and the skill states which spec defaults it assumed."
when_to_use: 'User says "give me the compliance report", "show the obligation impact for product X", "what is our GDPR coverage", "export the compliance matrix to PDF", "run the Q3 obligations matrix", "which obligations have no assertion (the gap report)", or wants a reproducible compliance/coverage report rendered from canon rather than hand-assembled.'
min_version: "0.6.0"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Transitrix Report Skill

The **conversational front-end for compliance reporting.** A user asks for a report in plain language; this skill resolves the parameters, writes them into a **declarative view-config artefact**, and shells out to the deterministic renderer CLI. It is the operator UX over the `compliance-impact` ([notations/views/21-compliance-impact.md](https://raw.githubusercontent.com/transitrix/methodology/main/notations/views/21-compliance-impact.md)) and `coverage-metric` ([notations/views/22-coverage-metric.md](https://raw.githubusercontent.com/transitrix/methodology/main/notations/views/22-coverage-metric.md)) views.

This directory is the **`report` skill** within the `transitrix` plugin (the plugin root is [`transitrix/`](../../), which carries the shared [`.claude-plugin/plugin.json`](../../.claude-plugin/plugin.json) manifest, one `skills/<name>/` directory per skill). Invoked as `/transitrix:report`.

> **Status — Step 2 of the report-skill architecture decision.** Step 1 (the deterministic `cervin export-compliance` CLI) ships in Transitrix Studio v1.4.x. This skill is the thin layer over it. All rendering is the CLI's; this `SKILL.md` and its [`scripts/report.py`](scripts/report.py) orchestrator only sequence it — so the skill loads agent-neutrally (Claude, Copilot, or a human at a shell).

---

## The one rule that governs everything

**Parameters in an artefact, rendering in the CLI — never the agent.** The report's parameters (scope, filters, grouping, ordering) live in a versioned view-config the skill writes; the matrix is computed by `cervin export-compliance` from `(view-config + canon)`. The agent MUST NOT compute, tabulate, or "fill in" a matrix itself. A report assembled by the agent in chat is not reproducible, not diffable, and not auditable — exactly what the ADR exists to prevent. If the CLI is absent, stop (Step 0) rather than hand-rolling the render.

---

## Step 0 — Renderer pre-check

The deterministic work (scan canon, build the matrix, render Markdown/PDF) is done by the CLI, never reimplemented in the agent. Confirm it is available:

```
cervin export-compliance --format md --scope matrix --root . > /dev/null
```

- **Present** → proceed. (A non-zero exit with a usage error is fine here — it means the binary exists.)
- **Absent** (`command not found`) → tell the user to install **Transitrix Studio** (the `cervin` binary, v1.4.x+). The orchestrator also tries `npx cervin`; if neither resolves, do not hand-roll the report. Set `TRANSITRIX_CLI` to override the binary name.

Also confirm you are inside a Transitrix repository (a `transitrix.yaml` manifest, with `canon/` containing `REQUIREMENT`, `ASSERTION`, `PRODUCT`, and `codex/` artefacts). With no canon there is nothing to report on.

> **PDF output** additionally requires WeasyPrint on PATH (`pipx install weasyprint`). Markdown needs nothing beyond the CLI.

---

## Step 1 — Resolve the parameters

Decide **which report** and **how scoped**, then resolve each parameter from, in order: (a) what the user said, (b) a named saved view-config they referenced, (c) the view spec's defaults.

| Report | Notation | Answers |
|---|---|---|
| Obligation × subject **impact matrix** (which obligations bind each product/stage, and each cell's status) | `compliance-impact` | "show the compliance overlay for product X" |
| Per-regime **coverage metric** (how much of each law is covered by assertions; gap counts) | `coverage-metric` | "what's our GDPR coverage", "where are the modelling gaps" |

**Re-ask at most once.** A required parameter with no safe default — e.g. the subject of a deliberately single-product report — ask once, concisely. Everything else falls back to the spec default; **do not interrogate.** The zero-config default is the full matrix over all products and all obligations (notations/views/21 §4.1, 22 §4.1).

**State what you assumed.** After resolving, tell the user which defaults you applied — e.g. *"full matrix, no jurisdiction filter — showing all products and all obligations."* The orchestrator prints this list (`applied spec defaults: …`); relay it.

---

## Step 2 — Materialise and render

Hand the resolved parameters to the orchestrator. It writes/updates the named view-config artefact, then invokes the CLI and streams the result back.

**Ad-hoc** (a one-off; nothing is saved) — for "just show me …":

```
python transitrix/skills/report/scripts/report.py render --scope matrix --format md --root <repo>
# scopes: matrix | gap | law:<LAW-ID> | product:<PRODUCT-ID>
```

**Named** (reproducible; writes a committed view-config artefact) — for "the Q3 obligations matrix", anything to keep:

```
python transitrix/skills/report/scripts/report.py render \
  --report-id COMPLIANCE_IMPACT-RETAIL-GDPR-1 \
  --name "Retail — GDPR obligations" \
  --products PRODUCT-RETAIL-1 \
  --obligations-codex REGULATION-EU-GDPR-1 \
  --format md --root <repo>
```

For a coverage report add `--notation coverage-metric` and use `--regimes <codex-ids>` instead of `--obligations*`. Add `--format pdf --output <path>` for PDF. Add `--dry-run` to preview the config without rendering.

The script:
1. **resolves the renderer** (`cervin`, or `npx cervin`, or `$TRANSITRIX_CLI`);
2. for a named report, **writes/updates** `<root>/canon/views/<notation>/<id>.<notation>.transitrix.yaml` — the canonical view-config artefact (it prints the path);
3. **states the spec defaults** it left to the renderer for every field you did not pin;
4. **invokes `cervin export-compliance`** and streams Markdown to stdout (or writes the file for `--output`/PDF);
5. **reports the config path used**, so the report is reproducible.

---

## Step 3 — Return the report and its provenance

Give the user three things:

1. **The rendered report** (the Markdown inline, or the path of the written `.pdf` / `.md`).
2. **The view-config path** the render used — this is the audit record; for a named report it is a committable artefact ("commit this to re-run the same report next quarter").
3. **The assumptions** — the applied-defaults list, in plain language.

A named view-config is **reusable**: `report.py list --root <repo>` lists saved reports; re-running `render --report-id <id>` re-renders the same committed config against current canon — reproducible and diffable over time. Materialising a view-config is a **tooling artefact**, not an admission to canon — it carries no canonical content (notations/views/21 §3), only render configuration; commit it like any other report definition.
