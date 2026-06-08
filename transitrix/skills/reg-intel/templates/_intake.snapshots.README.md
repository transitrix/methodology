# `_intake/snapshots/` — regulatory source snapshots

This folder is **operational**, not a zone. It is part of the shared `_intake/` workspace (see the ingest skill's [`_intake.README.md`](../../ingest/templates/_intake.README.md)); the **reg-intel** skill (`/transitrix:reg-intel`) uses it to hold point-in-time captures of the codex sources it watches.

```
_intake/
  snapshots/    # point-in-time captures of fetched source bodies (this folder)
  processing/
    segments/     # proposed SEGMENT-* field artefacts
    candidates/   # proposed REQUIREMENT-* / CONSTRAINT-* candidates
    amendments/   # proposed AMENDMENT-* field artefacts
    review-digest.yaml
```

## What lives here

One file per fetch, named by the codex source ID and the fetch date:

```
_intake/snapshots/<CODEX-ID>-<YYYY-MM-DD>.<ext>
# e.g. REGULATION-GDPR-2016-1-2026-06-08.html
```

`<ext>` follows the source format (`.html`, `.pdf`, `.json`, `.xml`). The bytes are the source body the agent fetched; `fetch-snapshot` fingerprints them as `source_hash: sha256:<hex>` and records that hash in the committed operations cache (`operations/state/reg-intel/signal-cache.json`), so a later run can tell whether the source moved even in a fresh clone / CI checkout.

## How it is used

`fetch-snapshot` writes a snapshot here only when the change-signal gate said the source moved. It then compares the bytes to the prior snapshot:

- **captured** — first harvest of this source;
- **changed** — bytes differ → the SEGMENT / CLASSIFY pass runs against this snapshot;
- **bytes_identical** — the publisher re-stamped without changing bytes → the run stops and reports "signal moved, bytes identical".

## What this is *not*

- **Not the canonical snapshot.** The human-admitted, canonical copy of a codex source is the codex artefact's `snapshot_file` under `codex/.../sources/` ([`14-codex.md`](https://raw.githubusercontent.com/transitrix/methodology/main/notations/elements/14-codex.md) §3.1). These `_intake/snapshots/` files are in-flight operational captures; on admission a human promotes the relevant snapshot to the codex `sources/` folder.
- **Not version-of-record.** It is a workspace. Losing it is safe — the committed `operations/state/` cache still drives change detection (a cache miss degrades the gate to "treat as moved / always fetch", never wrong).

## Retention

Snapshots are operational and may be large. A team that does not need a per-run snapshot history may `.gitignore` `_intake/snapshots/`; change detection does **not** depend on these files persisting (it falls back to the committed operations cache). A team that wants an auditable fetch history commits them. Either way, the durable records are the codex `sources/` snapshot (after admission) and the committed signal/snapshot hashes in `operations/state/`.
