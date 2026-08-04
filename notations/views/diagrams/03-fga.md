---
notation: "FGA Strategy-to-Execution Chain (deprecated)"
version: "0.3"
author: "Valerii Korobeinikov"
last_updated: "2026-06-23"
status: "deprecated"
file_extension: "*.fga.transitrix.yaml"
dsm_status: "not implemented — superseded by dgca with layers.changes: off"
---

# FGA Notation — Deprecated

> **This notation is superseded.** FGA (`*.fga.transitrix.yaml`, `notation: fga`) is replaced by the DGCA notation with the Changes layer toggled off.
>
> **Migrate:** rename your file to `*.dgca.transitrix.yaml`, change `notation: fga` → `notation: dgca`, and add:
>
> ```yaml
> view_config:
>   layers:
>     changes: off
> ```
>
> This produces a Driver → Goal → Activity view inside the unified DGCA notation. See [`02-dgca.md`](./02-dgca.md) for the full spec.

`fga` was the pre-2026-06 notation key for the 3-layer Driver → Goal → Activity chain. It is now a degenerate case of `dgca` with the Changes layer disabled via `view_config.layers.changes: off`.
