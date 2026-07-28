# @transitrix/decisions-cli

Deterministic CLI for the **shared human-gate admission decision contract** over the ingest and reg-intel pipelines (hub ADR `architecture/methodology/2026-07-28-ingest-admission-decision-contract.md`). Both pipelines produce a human-review presentation artifact — [`@transitrix/ingest-cli`](../ingest-cli/README.md)'s `review-queue.yaml`, [`@transitrix/reg-intel-cli`](../reg-intel-cli/README.md)'s `review-digest.yaml` — but until now recorded the human's accept/reject/defer decision only as an edit to files by hand, with no shared shape, audit trail, or apply tool. This CLI is that shared shape.

**The one rule:** `record` only ever reads/writes `decisions.reviewed.yaml`, never canon and never the presentation artifact it answers. `apply` is the one command that writes [CONTRACT §6.1](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md#61-pre-admission-lifecycle--proposed--active--rejected) admission transitions, and only onto an artefact that already carries `admission_state: proposed` — it never invents a new admission state, and it never admits anything the pipeline's own pre-admission gates have not already cleared.

## Package shape — `decisions.reviewed.yaml`

```yaml
generated_by: "@transitrix/decisions-cli"
org_root: "."
as_of: "2026-07-28"
source_gate: "_intake/processing/review-queue.yaml"   # or review-digest.yaml
gate:
  admits_to_canon: false   # this file itself is never canon
decisions:
  - item_ref: "REQUIREMENT-gdpr-3"     # candidate / segment / amendment id (or, for a
                                        # review-queue.yaml row today, the candidate file ref)
    kind: "requirement"                # optional; aids apply routing
    decision: "accept"                 # accept | reject | defer
    by: "j.reviewer"                   # required — a human handle, or a tool id when
                                        # reviewer_authority: ai_reviewed (CONTRACT ADMIT-007)
    at: "2026-07-28"                   # required, ISO-8601 date or timestamp
    reason: "matches Art. 17 obligation"   # required for reject; recommended for defer;
                                        # optional for accept
    reviewer_authority: "expert_confirmed" # optional, accept only; absent -> expert_confirmed
                                        # (same default as CONTRACT §6.2)
```

Lives beside the batch's stable presentation file (same batch directory) — `--source-gate` defaults to whichever of `review-queue.yaml` / `review-digest.yaml` is found at the flat `_intake/processing/` path; pass it explicitly for a dated batch directory ([`@transitrix/ingest-cli`'s README](../ingest-cli/README.md#multi-batch-naming), same batch-naming mechanism). Schema: [`schemas/decisions-reviewed.schema.json`](schemas/decisions-reviewed.schema.json).

Absence of a `decisions[]` row for an item means **undecided**, never rejected — the presentation artifact stays untouched by review; only `decisions.reviewed.yaml` records outcomes.

## Commands

| Command | Purpose |
|---|---|
| `--version` / `--help` | Version and usage. |
| `list-undecided <org-root> [--source-gate <path>]` | Every candidate / segment / amendment the source gate currently presents that has no matching `decisions[]` row yet. |
| `record <org-root> --item-ref <ref> --decision accept\|reject\|defer --by <id> --at <date> [--reason <text>] [--kind <k>] [--reviewer-authority ai_reviewed\|expert_confirmed] [--source-gate <path>]` | Upsert one decision row — idempotent per `item_ref`; a later `record` call for the same item replaces the earlier row. |
| `apply <org-root> [--source-gate <path>]` | Apply every `accept` / `reject` row as a CONTRACT §6.1 transition on the artefact it names; `defer` rows are left untouched (the row is the audit trail). |

## What `apply` can and cannot transition

`accept` → `admission_state: active` with `admitted_at` / `admitted_by`, every `gate_checks` entry set to `pass`, and `reviewer_authority` per [CONTRACT §6.2](https://raw.githubusercontent.com/transitrix/methodology/main/notations/CONTRACT.md#62-reviewer-authority--tiered-approval) (absent ⇒ `expert_confirmed`). `reject` → `admission_state: rejected` with `rejected_at` / `rejected_by` / `rejection_reason`. `defer` → no transition.

This only works on an artefact that is **already admission_state-bearing** — today, that means reg-intel's proposed `SEGMENT` / `REQUIREMENT` / `CONSTRAINT` / `AMENDMENT` artefacts under `_intake/processing/{segments,candidates,amendments}/<id>.yaml`. An ingest-pipeline candidate (`_intake/processing/candidates/<ref>.json`) is pre-canon and carries `admitted_to: pending`, not `admission_state` — it has no CONTRACT §6.1 lifecycle to transition yet. `record` / `list-undecided` work the same way for both pipelines; `apply` reports an ingest candidate's row as `not_admission_state_bearing` rather than silently skipping it or fabricating a transition — promoting a candidate into canon-shaped form is still a manual step (CONTRACT §6), same as before this CLI existed.

**ADMIT-007.** `apply` refuses to write `reviewer_authority: ai_reviewed` when `--by` doesn't look like a tool id, and refuses `expert_confirmed` when it does (a hyphenated `*-cli` / `*-reviewer` / `*-bot` / `*-scanner` id or an `@scope/name`). This is a footgun-catcher, not a security boundary — CONTRACT ADMIT-007 is a content-based rule about who actually admitted the record, which no string heuristic can fully verify.

## Layout

```
packages/decisions-cli/
  decisions.mjs      # dispatcher / entry point (bin: transitrix-decisions)
  src/
    yaml.mjs          # zero-dep YAML reader/emitter (own copy — see ingest-cli's batch-path.mjs
                       # for why each CLI keeps its own rather than sharing one)
    io.mjs             # load/save decisions.reviewed.yaml; default path beside the source gate
    map-in.mjs         # review-queue.yaml / review-digest.yaml -> flat gate-item list; undecided diff
    record.mjs          # upsert one decision row
    apply.mjs           # locate the admission_state artefact by item_ref; perform the §6.1 transition
  schemas/
    decisions-reviewed.schema.json
```

## Tests

A deterministic, no-API-key, no-network integrity test drives the CLI end-to-end on synthetic fixtures:

```
python packages/decisions-cli/tests/test_decisions_integrity.py
```
