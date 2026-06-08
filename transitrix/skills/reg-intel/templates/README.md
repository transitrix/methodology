# `templates/` — reg-intel operational scaffolding

Starter files an adopter copies into their repo to **run** the reg-intel scan as a scheduled job. They are examples to adapt, not turnkey infrastructure — the network fetch and the LLM extraction are inherently adopter / agent steps (marked as hooks).

| File | What it is | Copy to |
|---|---|---|
| [`_intake.snapshots.README.md`](_intake.snapshots.README.md) | Explains the `_intake/snapshots/` operational workspace (naming, `source_hash`, retention, vs the codex `sources/` copy). | `_intake/snapshots/README.md` |
| [`reg-intel-daily.sh`](reg-intel-daily.sh) | The **one** daily driver: `list-due` → per due source `check-signal` → (if moved) `fetch-snapshot` → agent extraction hook → `update-scan`, then `validate` + `digest`. Two `TODO` hooks (`observe_signal`, `fetch_body`) + an extraction hook. | `operations/bin/reg-intel-daily.sh` |
| [`reg-intel-daily.service`](reg-intel-daily.service) + [`reg-intel-daily.timer`](reg-intel-daily.timer) | systemd example for the daily tick (one service, not one-per-source). | `~/.config/systemd/user/` |
| [`fetch-recipes.md`](fetch-recipes.md) | Per-source-family fetch guidance (eCFR, Federal Register, EUR-Lex/CELLAR, generic HTML) wiring the two hooks; prefer APIs/feeds over scraping. | reference |

## The shape of a run

**One scheduled task, not N.** The timer fires once a day; `reg-intel-daily.sh` calls `list-due`, which filters the watched codex sources by `scan.next_scan_due`. Per-source cadence lives on each codex artefact's `scan.scan_frequency`. The driver does the deterministic + state steps in shell; it delegates the cheap signal fetch, the body fetch, and the segment/classify extraction to the three hooks (a fetch helper + the reg-intel SKILL running under Claude / Copilot).

**Cron alternative** to the systemd timer:

```cron
0 7 * * *  cd /path/to/adopter-repo && bash operations/bin/reg-intel-daily.sh /path/to/adopter-repo >> operations/state/reg-intel/daily.log 2>&1
```

## The one rule

Every run **proposes**. It writes `_intake/` artefacts and a `review-digest.yaml`; it never writes `canon/` and never auto-admits. A human reviews the digest and runs the admission gate. Keep per-source URLs / API keys in `operations/config/reg-intel/` (committed operational settings, [`method/team-operations.md`](https://raw.githubusercontent.com/transitrix/methodology/main/method/team-operations.md) §3.3) — never hard-coded in the driver.
