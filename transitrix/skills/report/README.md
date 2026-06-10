# `report` skill

The conversational front-end for **compliance reporting** over a Transitrix repository. A user asks for a report in plain language; the skill resolves the parameters into a declarative **view-config artefact** and renders it through the deterministic `cervin export-compliance` CLI — to Markdown or PDF.

It is the operator UX for two derived views:

- **`compliance-impact`** ([notations/views/21-compliance-impact.md](../../../notations/views/21-compliance-impact.md)) — the obligation × subject matrix, each cell's compliance status.
- **`coverage-metric`** ([notations/views/22-coverage-metric.md](../../../notations/views/22-coverage-metric.md)) — per-regime assertion coverage and modelling-gap counts.

## Design

Per [ADR 2026-06-09 — *Reports are rendered from declarative view-configs; a thin conversational skill is the front-end*](../../../docs/decisions/2026-06-09-report-skill-over-declarative-views.md):

- **Parameters live in a versioned artefact**, not in chat — so a report is reproducible, diffable, and auditable.
- **Rendering lives in the CLI**, never in the agent — so the same config re-renders identically under any runtime.
- **The skill is thin and script-backed** — [`SKILL.md`](SKILL.md) sequences [`scripts/report.py`](scripts/report.py); both are agent-neutral.

This is **Step 2** of the ADR's sequenced delivery. Step 1 — the `cervin export-compliance` renderer — ships in Transitrix Studio v1.4.x.

## Files

| Path | Role |
|---|---|
| [`SKILL.md`](SKILL.md) | The agent-facing protocol: pre-check → resolve parameters → materialise + render → return report + provenance. |
| [`scripts/report.py`](scripts/report.py) | Dependency-free, cross-platform orchestrator over `cervin export-compliance`. Subcommands: `render`, `list`. |

## Quick start

```bash
# Ad-hoc: full obligation × subject matrix, Markdown to stdout
python scripts/report.py render --scope matrix --root <repo>

# Gap report — obligations with no admitted assertion
python scripts/report.py render --scope gap --root <repo>

# Named, reproducible report → writes a committed view-config artefact
python scripts/report.py render \
  --report-id COMPLIANCE_IMPACT-RETAIL-GDPR-1 \
  --name "Retail — GDPR obligations" \
  --products PRODUCT-RETAIL-1 --obligations-codex REGULATION-EU-GDPR-1 \
  --format pdf --output retail-gdpr.pdf --root <repo>

# Coverage metric instead of impact matrix
python scripts/report.py render --notation coverage-metric \
  --report-id COVERAGE_METRIC-RETAIL-1 --name "Retail — coverage" \
  --regimes REGULATION-EU-GDPR-1 --root <repo>

# List saved report view-configs
python scripts/report.py list --root <repo>

# Preview the materialised config without rendering
python scripts/report.py render --report-id … --name … --dry-run --root <repo>
```

`render` resolves the renderer as `cervin`, then `npx cervin`, then `$TRANSITRIX_CLI`. Named reports are written to `<root>/canon/views/<notation>/<id>.<notation>.transitrix.yaml`. PDF output requires WeasyPrint on PATH (`pipx install weasyprint`).

## Prerequisites

- **Transitrix Studio** (the `cervin` binary), v1.4.x or later — the renderer.
- **Python 3.8+** — the orchestrator (stdlib only; no packages to install).
- **WeasyPrint** — only for `--format pdf`.
