---
notation: "FGA Strategy-to-Execution Chain (deprecated)"
version: "0.3"
author: "Valerii Korobeinikov"
last_updated: "2026-06-23"
status: "deprecated"
removed_in: "4.0.0"
file_extension: "*.fga.transitrix.yaml"
dsm_status: "not implemented — superseded by dgca with layers.changes: off"
---

# FGA Notation — Deprecated

> **This notation is superseded and scheduled for removal in `4.0.0`.** FGA (`*.fga.transitrix.yaml`, `notation: fga`) is replaced by the DGCA notation with the Changes layer toggled off. It was deprecated in `2.0.0` (2026-07-12); the one-major window (CONTRACT.md §10.6) is satisfied as of `3.0.0`, so removal is scheduled for the next major release. Removal is not performed inside a `MINOR` or `PATCH` release.
>
> **Migrate:** see the recipe under [`migrations/3.1-to-4.0/`](../../../migrations/3.1-to-4.0/) — rename your file to `*.dgca.transitrix.yaml`, change `notation: fga` → `notation: dgca`, and add:
>
> ```yaml
> view_config:
>   layers:
>     changes: off
> ```
>
> This produces a Driver → Goal → Activity view inside the unified DGCA notation. See [`02-dgca.md`](./02-dgca.md) for the full spec.

`fga` was the pre-2026-06 notation key for the 3-layer Driver → Goal → Activity chain. It is now a degenerate case of `dgca` with the Changes layer disabled via `view_config.layers.changes: off`.
