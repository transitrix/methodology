# Health Profile Skill

An on-demand, informational snapshot of a single Transitrix catalogue. The report retains the [six-indicator profile](../../../guides/adoption-health-profile.md): denominator, validity, coverage, freshness, assertion queue and connectedness. It implements a bounded subset, with explicit unavailable/unknown results. It is not an adoption score or certification, and findings never fail a build.

## Run

Requires Python 3.10+ and PyYAML 6.x (`python3 -m pip install 'PyYAML>=6,<7'`). The Node entry point additionally requires Node 18+ and runs the same Python collector synchronously. Set `PYTHON` to an interpreter executable if needed (on Windows it defaults to `python`, elsewhere `python3`). Keep this directory with the repository's `tools/lint.py` to enable the existing rule checks; a copied skill without that file reports those checks unavailable.

From the methodology checkout:

```sh
python3 transitrix/skills/health-profile/health_profile.py --repo /path/to/catalogue --effective-date 2026-04-01
node transitrix/skills/health-profile/scan.mjs --repo /path/to/catalogue --effective-date 2026-04-01 --format json --out health-report.json
```

Both accept the same flags. `--repo` defaults to `.` and must contain `transitrix.yaml` directly; parent and nested catalogue roots are not inferred. `--effective-date` defaults to today in UTC. `--out` writes a snapshot; otherwise output goes to stdout. `--format` is `markdown` (default) or `json`. `/transitrix:health-profile` uses this same collector through the [skill procedure](SKILL.md).

Findings return exit 0. Invalid invocation, missing dependencies, invalid configuration or failure to write the report are execution errors, not health findings. JSON preserves counts, unknowns, exclusions, per-record freshness evidence and source hashes; Markdown wraps that same result without dropping evidence. Reports contain model IDs and paths; share only with the adopter's permission.

## Supported subset

| Indicator | Collected now | Limits |
| --- | --- | --- |
| Denominator | YAML/YML discovery, four file classes, parse/read failures, distinct parsed canonical IDs and duplicates; notation distribution | Read means parsed, not validated. No inference of an active cohort or full schema support. |
| Validity | YAML parsing and the shipped linter's existing atomicity check over unique parsed elements | Batch finding, not a per-element schema pass rate. No full CLI, admission or notation validation claim. |
| Coverage | Explicit unavailable result | No declared business-scope comparison. Notation counts are an inventory diagnostic. |
| Freshness | CONTRACT §11 decay using canonical `admitted_at`, complete recorded admission gate and explicitly configured `confidence_decay` | Unknown without evidence/policy. No mtime, Git edit-age, implicit thresholds, knowledge-object or workflow-review collector. Recorded evidence does not independently prove a review occurred. |
| Assertion queue | Explicit unavailable result | No workflow integration, timestamps, review targets or SLA assumptions. |
| Connectedness | Shipped linter's existing relation `from`/`to` and inline `parent`, `goals`, `delivers_changes`, `predecessors`, `owner_role` reference checks | Scoped batch finding only. Other relation types, full opportunity ratios, reachability, orphan age and requirement-verification coverage are unavailable. Unsupported inline value shapes remain explicit. |

The linter itself and its validation semantics are unchanged. These checks reuse its existing methods; broader validation still belongs to the adopter's normal validation command. Configuration is not evidence that a check ran, and two counts from this collector are not independent observations.

## Population and calculation

Discovery visits `.yaml` and `.yml` files, excluding hidden files/trees, dependencies, symlinks and nested catalogue roots. Skipped trees are named; their contents are not counted. The four file classes are disjoint:

- **Read:** mappings under `canon/elements/` or `canon/relations/` with nonempty string `id` and `notation`. This establishes collector readability only.
- **Out of scope:** files matched by the selected `SCOPE.yaml` `exclude` regex list (matched from the start of the relative POSIX path), plus YAML symlinks.
- **Unread marker:** unsupported marked files, malformed/unreadable YAML (whose marker state may itself be unknown), or canonical files the collector cannot interpret. Read failures are also listed separately, not silently lost.
- **Foreign:** parsed files without a supported record or Transitrix marker, including ordinary configuration.

Use `--scope /path/to/catalogue/organisations/example/SCOPE.yaml` to select an existing scope file. A sole `organisations/*/SCOPE.yaml` is selected automatically; multiple candidates require selection. Invalid exclusions stop collection. File masks are not a declared business scope. Views, Field artefacts and other marked formats remain unread-marker in this subset, even if another validator supports them.

The denominator reports distinct parsed IDs over parsed records (elements and relations, all lifecycle states), plus every class and duplicate path. It is a reconciliation, not a success ratio. Duplicate IDs prevent the validator batch and remain unknown for freshness. Empty populations are **not applicable**; unread or ambiguous input makes inventory partial.

Each result inherits the report context: effective date, UTC observation time, Git revision/dirty state when available, input SHA-256 hashes, selected scope/exclusions, collector rule identity/hash and executed linter version/hash. Git HEAD alone does not identify modified or untracked inputs. Collection failures and exclusions qualify every result. Comparisons require the same population, scope and rules.

Validation and reference results use **one checked batch** as denominator and **one batch without findings** as numerator (0 or 1), never a record pass percentage. With no applicable elements/references, the denominator is zero and the result is not applicable. Existing linter diagnostic paths may be synthesized; the inventory records actual input paths. An excluded reference target can produce a finding in the declared scope, not proof the target is absent everywhere.

Freshness uses unique parsed canonical elements with `admission_state: active` or absent, regardless of lifecycle dates; this is an admitted inventory, **not an active-at-date cohort**. Relations and proposed/rejected elements are excluded with reasons. It requires `zone: canon`, a nonempty `admitted_by`, the standard `uniqueness`, `consistency`, `completeness` checks and every additional recorded check equal to `pass`, plus quoted `admitted_at: YYYY-MM-DD` no later than the effective date. No field is changed by collection.

The existing manifest's `confidence_decay.defaults` and `confidence_decay.by_type.<NOTATION_IN_UPPERCASE>` supply `fresh_days`, `stale_days` and `floor`; per-type values override defaults. The collector requires explicit finite values with `0 <= fresh_days < stale_days` and `0 <= floor <= 1`, inventing no fallback policy. Per-record decay follows [CONTRACT §11](../../../notations/CONTRACT.md#113-freshness-decay). The reported fraction is **within fresh_days / elements with qualified date and policy**, alongside unknown count and excluded records. Zero known evidence is unavailable (or not applicable when the population is empty), never 100% fresh. This is not a composite score.

## Reproducible synthetic pilot

The shipped tests build temporary, synthetic catalogues and run both real entry points. They demonstrate stale evidence surviving timestamp changes, qualified reaffirmation refreshing it, and missing policy/evidence staying unknown. They also exercise scope, duplicates, empty populations, parse failures and positive/negative existing linter checks:

```sh
python3 transitrix/skills/health-profile/tests/test_health_profile.py
```

This supports a synthetic pilot of the subset above. Business-scope comparison, actual workflow collection, verification traceability, broader validation and consumer installation/propagation remain separate work; a successful pilot does not establish organisation-wide adoption.
