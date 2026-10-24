# State on a date — adapter/renderer 6

Use explicit state periods for historical, current and planned views. A date
selects a supplied period; it does not interpolate between Current and Target,
recover missing history or infer deployment from a plan.

## Period and date inputs

Each dated state has `effective_from` (inclusive ISO date) and optional
`effective_to` (exclusive ISO date). A null/absent end explicitly means open-ended.
State `kind` is `historical`, `current` or `target`; it records source intent,
not a label inferred from the computer's clock. `as_of` remains the supplied
snapshot/evidence basis. A descriptive `horizon_label` never becomes a date.

```json
{
  "view_date": "2026-10-23",
  "states": [
    {"id":"history", "label":"Historical snapshot", "kind":"historical",
     "as_of":"2026-06-01", "effective_from":"2026-06-01",
     "effective_to":"2026-10-01", "capabilities":["...complete records..."],
     "applications":["...complete applications and explicit mappings..."]},
    {"id":"current", "label":"Current snapshot", "kind":"current",
     "as_of":"2026-10-22", "effective_from":"2026-10-01",
     "effective_to":"2027-01-01", "capabilities":["...complete records..."],
     "applications":["...complete applications and explicit mappings..."]},
    {"id":"plan", "label":"Approved planning scenario", "kind":"target",
     "as_of":"2027-01-01", "effective_from":"2027-01-01",
     "effective_to":"2028-01-01", "capabilities":["...complete records..."],
     "applications":["...complete applications and explicit mappings..."]}
  ]
}
```

The snippet illustrates the wrapper; replace placeholder strings with valid
records. Every state supplies a complete independent snapshot. Do not copy links
or attributes across states implicitly. Periods must not overlap; alternative
scenarios need separate timelines or undated manually selected states. Gaps are
allowed and mean no supplied data, including before the first and after a finite
last period. A current snapshot covering a future date remains a snapshot-based
projection, not evidence that the future happened. Targets are explicitly marked
`Planned scenario; not an observed outcome`, even when inspected at a later date.

Optional top-level `view_date` chooses the initial HTML date, or the default
direct SVG date when no explicit state is selected. Without it, dated HTML starts
on the browser's local Today. A caller may override with `--date YYYY-MM-DD` or
Python `view_date='YYYY-MM-DD'`. An explicit `--state` must match the period when
combined with `--date`. Date gaps fail direct SVG generation and clear the HTML
map, disabling Download/Print rather than exporting the previous valid map.

Undated legacy states remain available through State. Selecting one clears the
date and displays snapshot mode. `--as-of` retains its legacy current-state
fallback meaning; it does not choose a timeline period. Use `--date` for that.
A timeline's `effective_from` supplies an evaluation date when `as_of` is absent,
while snapshot-basis metadata remains not specified.

## Changes inside a period

Capabilities retain their existing inclusive `start_date`/`end_date` lifetimes
and dated maturity assessments. APPLICATION and nested technical-capability
entries may now have the same optional inclusive lifetime fields. An inactive
system contributes no direct labels, highlight or polygon; inactive technical
abilities contribute no technical links. Missing lifetimes mean open bounds.
All declared references still validate against the complete source state; a
mapping to a currently inactive capability creates no visible coverage.

Within a state, names, classification, coordinates and mapping lists are the
supplied values. Represent changes to these values by another complete dated
state. Do not turn string mapping IDs into unvalidated dated relationship
objects. The renderer does not merge snapshots or invent link histories.

For any selected date, include only active capabilities, require active parents
and vertical lane roots, and select the latest maturity assessment on/before
that date. Reject reversed lifetimes and conflicting assessments. Include
validity start days and end days; remove on the day after an inclusive end.
State periods instead switch on the exclusive `effective_to` boundary.

HTML precomputes geometry only at explicit change boundaries: state starts,
lifetime starts, the day after lifetime ends, and maturity changes. It embeds
the same 64 geometry variants per segment as direct SVG. Every date within a
segment shares business geometry and evaluated mappings; its exact chosen date
replaces the visible date caption and metadata. No per-day expansion or second
browser-side layout algorithm is needed.

## Controls and exports

View date accepts past, present and future dates. The Timeline slider moves by
one calendar day and updates on input while dragging, coalescing redraws to
animation frames. It has date output, range endpoints and ticks at supplied
changes. Keyboard arrows move one day; Home/End select the displayed bounds.
The date picker, slider and navigation buttons stay synchronized. UTC day
numbers avoid daylight-saving drift; Today uses the browser's local calendar.

For finite timelines the slider initially spans the earliest period start through
the last included date. An open final period gets an initial display window up
to one year beyond the latest of Today, initial date and final segment start;
this is a UI window, not a limit on model validity. Entering a date beyond the
shown range extends it, including dates with no supplied data. Legacy undated
models disable the slider. Within an unchanged segment and geometry selection,
the SVG is retained and only date captions/metadata/view selection update;
explicit event boundaries select the matching native geometry and mappings.
Capabilities and coverage change at those supplied boundaries, not by
interpolation.

Controls are grouped into Time, Capability view, Systems & coverage and Export.
Detailed diagram notes are collapsed initially so the map remains visible. Previous/Next change moves to supplied segment boundaries. State also
provides direct snapshot selection; for dated states it selects the snapshot
basis date when inside the period, otherwise the period start. Other view
settings and coverage-system checkboxes survive date changes. Systems absent or
inactive at a date are disabled with choices remembered for their return. Colors
come from all declared systems across all states, including inactive systems.

SVG records `view_date` (also in `view.view_date`), evaluated `as_of`, original
`snapshot_as_of`, selected state/kind and `[effective_from,effective_to)`. The
native date caption distinguishes requested date from snapshot basis. It also
marks planned scenarios. Export retains only the selected date's native geometry,
visible coverage variants and selected source mappings. HTML contains all supplied
periods and variants; date selection is not data redaction.

## Methodology boundary

State periods are this JSON adapter's representation of dated projections.
The merged core methodology now defines dated capability-map view semantics;
see [the mapping](methodology-boundary.md). This does not create a bitemporal
schema, temporal relation kind or prove released DSM/Studio support. Canonical lifecycle bounds must be mapped explicitly, including
the different inclusive record and exclusive state-period endpoints. Source
observation/recording time and model-validity time remain separate; this local
renderer is not a bitemporal audit/history store.
