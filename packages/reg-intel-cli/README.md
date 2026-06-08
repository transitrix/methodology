# @transitrix/reg-intel-cli

Deterministic CLI for the [Transitrix Reg-Intel skill](../../transitrix/skills/reg-intel/SKILL.md) — the regulatory-intelligence data-collection process. The skill's `SKILL.md` shells out to this CLI and never reimplements its logic, so behaviour is identical under Claude and GitHub Copilot.

**The one rule:** this CLI *proposes*. It reads the codex registry, runs the change-signal gate, snapshots / segments / classifies regulatory text, and stages a review digest. It **never writes `canon/`** and **never silently flips** an existing `active` canon element. A human admits.

> **Status — built incrementally.** The package ships in increments mirroring the ingest-cli roll-out. **Landed: the scheduler core** (`list-due`, `update-scan`). The rest of the [SKILL.md](../../transitrix/skills/reg-intel/SKILL.md) pipeline (`check-signal`, `fetch-snapshot`, `segment`, `classify`, `validate`, `amendment`, `digest`) lands in later increments.

## Commands

| Command | Status | Purpose |
|---|---|---|
| `--version` / `--help` | ✅ | Version (the skill's Step-0 pre-check) and usage. |
| `list-due [org-root] [--as-of YYYY-MM-DD] [--json]` | ✅ | List codex sources due for a scan: `monitoring_needed: true` artefacts whose `scan.next_scan_due <= as-of` (or never scanned), plus the `monitor_instead[]` counterparts of static sources. One run filters by date — not N schedules. |
| `update-scan <CODEX-ID\|file> [--today YYYY-MM-DD] [--frequency daily\|weekly\|monthly\|quarterly] [--change "<summary>"] [--review]` | ✅ | Write the codex `scan` block (`last_scanned_at`, `next_scan_due` from the cadence, `change_detected`, `change_description`, `review_needed`) — operating state only; never touches any other field. |
| `check-signal` / `fetch-snapshot` / `segment` / `classify` / `validate` / `amendment` / `digest` | ⏳ | Later increments. |

`next_scan_due` math: `daily` +1d, `weekly` +7d, `monthly` +1 month, `quarterly` +3 months; month additions clamp to the target month's last day (Jan 31 + monthly → Feb 28/29). All UTC, so results are host-timezone independent. Dates compare as ISO-8601 strings.

## Layout

```
packages/reg-intel-cli/
  reg-intel.mjs       # dispatcher / entry point (bin: transitrix-reg-intel)
  src/
    yaml.mjs           # zero-dep codex YAML reader (top scalars, scan block, monitor_instead)
    schedule.mjs       # scan_frequency enum + next_scan_due date math + isDue
    codex.mjs          # discover codex artefacts; the due set (list-due); find by ID
    update-scan.mjs    # write/replace the codex scan block in place (Step 8)
```

The "source registry" is **the codex artefacts the repo already carries** (`14-codex.md` §3.4–3.5), not a separate database — the schedule rides on each codex YAML's `scan` block, so scan history is auditable via git. Zero runtime dependencies, Node ≥ 18.

## Tests

A deterministic, no-API-key, no-network integrity test drives the scheduler core end-to-end:

```
python transitrix/skills/reg-intel/tests/test_reg_intel_integrity.py
```
