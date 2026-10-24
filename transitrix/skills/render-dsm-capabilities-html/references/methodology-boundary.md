# Core methodology and standalone renderer mapping

The merged methodology correction defines native `management_cycle_stage`
on CAPABILITY, application-owned `technical_capabilities`, and declared
capability-map view_config keys. These belong to the main specification, not
an experimental profile or an `extensions` bag. Read the bundled
[core-contract excerpts](methodology-correction.md) for the definitions.

Reviewed pre-correction baseline: `3c75d0403dd4e2dc618bc9535ea293d0495e1ec1`.
Merged contract revision: `888c03d33c2d899ec85a612901075b67811614e5`. No tagged release includes this correction
yet. The reference methodology linter enforces the new fields. Released CLI
2.11.0 does not reject malformed new stage/view settings; standalone rendering
is not proof of native CLI/DSM/Studio adoption.

## Source-to-adapter mapping

| Core model or view | Current standalone JSON / control | Boundary |
| --- | --- | --- |
| Capability `layer: business` | Not consumed as architecture placement | Never replace the canonical architectural layer with a management stage |
| Capability `management_cycle_stage` | Capability JSON `layer` | Explicit five-value mapping; null/missing stays unclassified; no inheritance |
| Common free-form `tags` | Explicit ESG/MDM/Support subset | Preserve other tags in the source; do not silently discard them there |
| APPLICATION `capabilities` | Application JSON `capabilities` | Explicit direct mappings; keep technical paths separate |
| APPLICATION `technical_capabilities[].key` | Technical JSON `id` | Application-local identity, not a new global element TYPE |
| Technical entry `name`, `capabilities` | Same-named JSON fields | Explicit source evidence and references; no guessed abilities |
| Canonical lifecycle bounds | JSON `start_date` / `end_date` | Convert endpoint conventions explicitly; adapter record bounds are inclusive |
| Sidecar current/target maturity | Explicit dated assessments in the chosen snapshot | Do not merge observation and target series or invent target achievement |
| Source snapshots/scenarios | Complete independent adapter states | Preserve evidence date, validity period, model revision and planned intent |
| Declared view_config | HTML settings / CLI arguments | Mapping is explicit; the renderer does not ingest native YAML view_config |

The core maturity scale remains 1–5. The adapter's explicit 0 No capability is
an absence diagnostic retained for legacy input, not missing data or a newly
adopted sixth canonical level. The visual legend makes the adapter scale
readable; it does not change the source maturity contract.

## Defaults that require explicit projection

Core view defaults select no coverage systems and hide backlog. The current
HTML may preselect a supplied pilot; direct SVG retains legacy backlog-on and,
without a pilot, all-system coverage defaults. Project a native view explicitly:
use --no-backlog and pass the selected system IDs rather than relying on those
legacy defaults. Core multi-tag filtering is OR over direct tags; the current
HTML selector supports one tag per view. Unsupported selection shapes must be
reported, not approximated silently. Display filters preserve muted context
and are not redaction.

## Compatibility and remaining consumer work

A direct core field supersedes the earlier proposed
extensions.management_cycle_stage convention. Preserve source history, reconcile
conflicting values and migrate explicitly; this renderer never rewrites canon.
APPLICATION technical inventory is now defined in the merged core contract,
while globally addressable technical-capability elements and new temporal REL
kinds are not introduced. New inventory and stage fields do not fabricate their
own history; dated coverage without source history must be disclosed as a snapshot.

The methodology now includes additive JSON schemas and single-file reference
validation. Native ingestion in this renderer, CLI/DSM/Studio adoption and a
methodology release remain separate work. Bundled source excerpts make the
package usable offline; their immutable public links identify the source.
