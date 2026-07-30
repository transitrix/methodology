# @transitrix/reg-intel-cli

Deterministic CLI for the [Transitrix Reg-Intel skill](../../transitrix/skills/reg-intel/SKILL.md) — the regulatory-intelligence data-collection process. The skill's `SKILL.md` shells out to this CLI and never reimplements its logic, so behaviour is identical under Claude and GitHub Copilot.

**The one rule:** this CLI *proposes*. It reads the codex registry, runs the change-signal gate, snapshots / segments / classifies regulatory text, and stages a review digest. It **never writes `canon/`** and **never silently flips** an existing `active` canon element. A human admits.

> **Status — all nine run-loop commands live.** `list-due` · `check-signal` · `fetch-snapshot` · `segment` · `classify` · `validate` · `amendment` · `update-scan` · `digest`. Remaining polish: coverage-profile awareness in `validate` (needs a shared coverage resolver — a cross-CLI refactor).

## Commands

| Command | Status | Purpose |
|---|---|---|
| `--version` / `--help` | ✅ | Version (the skill's Step-0 pre-check) and usage. |
| `list-due [org-root] [--as-of YYYY-MM-DD] [--json]` | ✅ | List codex sources due for a scan: `monitoring_needed: true` artefacts whose `scan.next_scan_due <= as-of` (or never scanned), plus the `monitor_instead[]` counterparts of static sources. One run filters by date — not N schedules. |
| `update-scan <CODEX-ID\|file> [--today YYYY-MM-DD] [--frequency daily\|weekly\|monthly\|quarterly] [--change "<summary>"] [--review]` | ✅ | Write the codex `scan` block (`last_scanned_at`, `next_scan_due` from the cadence, `change_detected`, `change_description`, `review_needed`) — operating state only; never touches any other field. |
| `check-signal <CODEX-ID\|file> --observed <value> [--method etag\|last_modified\|api_version\|amended_date\|fragment_hash] [--accept-no-signal] [--today YYYY-MM-DD]` | ✅ | The cheap change-signal gate (network-free — caller supplies the observed value). Compares to the last-seen value in `operations/state/reg-intel/signal-cache.json`: `unchanged` → bump scan; `moved` / `no_signal` → proceed. |
| `fetch-snapshot <CODEX-ID\|file> --from <fetched-file> [--ext <ext>] [--today YYYY-MM-DD]` | ✅ | Snapshot the caller-fetched bytes to `_intake/snapshots/<id>-<date>.<ext>`, fingerprint (`source_hash: sha256:…`), and detect `captured` / `changed` / `cosmetic_change` (bytes differ but normative text unchanged — markup/whitespace/tracker churn) / `bytes_identical` (cross-checkout via the committed cache). Network-free — the caller fetches. |
| `segment <snapshot> --from <result.json> [--source <CODEX-ID>] [--today YYYY-MM-DD]` | ✅ | Shape the segment agent's `{segments:[…]}` result into proposed `SEGMENT-*` field artefacts under `_intake/processing/segments/` (canonical ids, `text_hash`, `source`/`source_hash` from the snapshot, the field-zone proposed admission record). Network-free; locator-less / text-less segments flagged + skipped. |
| `classify [segments-dir] --from <result.json> [--today YYYY-MM-DD]` | ✅ | Shape the classify agent's `{candidates:[…]}` into proposed `REQUIREMENT-*` / `CONSTRAINT-*` candidates under `_intake/processing/candidates/` (ids per source slug, `derived_from` → SEGMENT, `obligation_level` + `category`, `ambiguous_alt` on low confidence, `gate_checks` pending). Network-free; bad-kind / no-`derived_from` flagged + skipped. |
| `validate [org-root] [--json]` | ✅ | Validate staged SEGMENTs + candidates against the contract (`23-segment.md` `SEGMENT-001..008`, ID grammar, candidate field rules; `SEGMENT-002` resolves `source` against `codex/`). Flags with codes + severity, never drops; exit 1 when review is needed. *(Coverage-profile check deferred — see SKILL Step 6.)* |
| `amendment <CODEX-ID\|file> --change "<what moved>" [--name N] [--amended-at YYYY-MM-DD] [--likely-impacted ID,ID] [--from <result.json>] [--today]` | ✅ | Emit a proposed `AMENDMENT-*` field artefact (`22-amendment.md`) recording source drift: `source` + `detected_at`, `segment_refs` auto-collected from the run's staged SEGMENTs of this source, `likely_impacted` hints, `motivates: []`. Rejects a static source. |
| `digest [org-root] [--run-id <id>] [--as-of YYYY-MM-DD] [--out <path>] [--scope <word>]` | ✅ | Assemble the human review digest (`review-digest.yaml`) — staged SEGMENT / candidate / AMENDMENT artefacts grouped by codex source (candidates via `derived_from` → SEGMENT), with each source's scan block + a tally. `gate.admits_to_canon: false`. Non-destructive default: a re-run keeps updating `review-digest.yaml` at the flat path in place as long as the content actually changes; a re-run that would produce byte-identical output — nothing moved since it was last written — is read as a genuinely concurrent run and lands under its own dated `review-digest-<scope>-YYYYMMDD-<seq>/` directory instead (`--scope` defaults to `batch`; see `@transitrix/ingest-cli`'s README "Multi-batch naming", same mechanism — HUB-837). Schema: [`schemas/review-digest.schema.json`](../../transitrix/skills/reg-intel/schemas/review-digest.schema.json). |

`next_scan_due` math: `daily` +1d, `weekly` +7d, `monthly` +1 month, `quarterly` +3 months; month additions clamp to the target month's last day (Jan 31 + monthly → Feb 28/29). All UTC, so results are host-timezone independent. Dates compare as ISO-8601 strings.

## Layout

```
packages/reg-intel-cli/
  reg-intel.mjs       # dispatcher / entry point (bin: transitrix-reg-intel)
  src/
    yaml.mjs           # zero-dep codex YAML reader (scalars, scan block, lists) + digest emitter
    schedule.mjs       # scan_frequency enum + next_scan_due date math + isDue
    codex.mjs          # discover codex artefacts; the due set (list-due); find by ID
    update-scan.mjs    # write/replace the codex scan block in place (Step 8)
    check-signal.mjs   # the change-signal gate: compare observed vs cached (Step 2)
    snapshot.mjs       # snapshot caller-fetched bytes + source_hash + diff (Step 3)
    normalize.mjs      # normative-text normalisation for cosmetic-vs-substantive diff
    segment.mjs        # shape the segment agent result into SEGMENT artefacts (Step 4)
    classify.mjs       # shape the classify agent result into REQUIREMENT/CONSTRAINT candidates (Step 5)
    validate.mjs       # contract checks over staged SEGMENTs + candidates (Step 6)
    amendment.mjs      # emit a proposed AMENDMENT on source drift (Step 7)
    signal-cache.mjs   # read/write the committed operations/state cache (signals + snapshots)
    digest.mjs         # assemble the review digest from staged run artefacts (Step 9)
    batch-path.mjs     # non-destructive batch-directory naming (HUB-837)
```

The "source registry" is **the codex artefacts the repo already carries** (`14-codex.md` §3.4–3.5), not a separate database — the schedule rides on each codex YAML's `scan` block, so scan history is auditable via git. The change-signal cache is committed operational **state** at `operations/state/reg-intel/signal-cache.json` (`method/02-team-operations.md` §3.3) — outside the model, disposable, survives clone/CI. Zero runtime dependencies, Node ≥ 18.

## Tests

A deterministic, no-API-key, no-network integrity test drives the scheduler core end-to-end:

```
python transitrix/skills/reg-intel/tests/test_reg_intel_integrity.py
```
