# Layout, filtering, coverage and presentation

Enable **Sort by layers** in HTML or use `--sort-layers` for direct SVG. Read
[the input contract](input-contract.md#version-4-management-cycle-layers-and-tags)
for `layer`, `tags` and legacy `property` mapping. The only stages, in order, are
**Strategic, Learning, Planning, Execution, Assurance**. Strategic includes
strategic planning and major direction changes; Planning is tactical/operational;
Learning develops knowledge and competence; Execution performs work; Assurance
checks outcomes, quality and compliance. These are management roles, not process
steps or maturity. Do not infer a stage from a name, parent or orientation.

**ESG, MDM and Support are tags on boxes and filter criteria, never layers.**
Tags do not create horizontal capabilities or inherit across hierarchy. Keep
actual horizontal capabilities as full-width containers with explicit lane
intersections. An L1 can contain multiple stages. Unclassified records use the
Not specified diagnostic group; unknown legacy properties remain visible under
Unknown property, without becoming a new stage.

Layers are colored background zones below all other elements. V-L1 frames span
the domain columns with their own headers; cycle grouping aligns their deeper
records. Each H-L1 has its own cycle groups below the vertical-domain area,
so MDM/ESG/Compliance remain separate actual capabilities. Keep every L2 inside
L1 and L3 inside L2, including across stages, using transparent parent frames.
H labels stay in the left gutter; H children retain explicit domain lanes.
Native SVG zones, tag chips, labels and containers survive exact-view export.

Use the **Tag** selector or `--tag ESG`, `--tag MDM`, `--tag Support` for SVG.
Show direct tag matches plus the parents and V-domain roots needed to keep
hierarchy/intersections understandable. Context-only boxes are muted and tagged
`data-tag-match="context"`; they do not inherit the filter tag. Unrelated branches
are removed and geometry is rebuilt. All tags restores the unfiltered diagram.
The tag filter persists through state/layout/backlog/label changes. It composes
with depth filtering and independent APPLICATION highlighting; export records
the selected tag and removes invisible content. A tag absent from a state shows
an explicit empty result. These are display filters, not security redaction.

For **state on a date**, read [date timeline](date-timeline.md).
Use explicit nonoverlapping `effective_from`/`effective_to` state periods, past,
current or planned; choose View date, scrub the daily Timeline slider, or use `--date YYYY-MM-DD`. The renderer evaluates
capability/system/technical lifetimes and dated maturity at that date, rebuilds
coverage, and preserves view controls. No data in a gap means an empty map and
no export. Plans remain marked as plans. Never infer history, date a descriptive
horizon or present a snapshot projection as a daily observation. Keep requested
date, snapshot basis and period bounds separate in SVG metadata. Legacy undated
snapshots remain manually selectable.

For **system coverage polygons**, read [system coverage](system-coverage.md).
Choose one or more APPLICATION systems in the colored Coverage systems list,
then enable Coverage polygons (off by default). Each system keeps its color
across states and layouts; its translucent name appears inside its polygon.
Coverage is the union of explicit direct and technical mappings. It never
inherits, implies unsupported status or measures sufficiency/coverage percentage.
Unlinked capability regions are cut out; connecting empty space is visual only.
The existing System selector controls direct highlighting independently.
For SVG use `--coverage --coverage-system ID` (repeat for multiple systems), or
API `coverage=True, coverage_systems=['id-a','id-b']`. Export keeps selected
systems at the selected depth with visible mapping provenance. The Acme demo
includes overlapping Data Hub, Governance Portal and Warehouse mappings; these
technical additions are illustrative, not source facts or canonical notation.
Choose **Polygon shape**: **Angled** keeps the convex hull (default), while
**Rectangular** uses its axis-aligned bounding rectangle. **Round corners** is
independent and off by default. Coverage masks and red overlap geometry follow
the chosen shape; changing these view options never changes mapping facts.
Direct SVG accepts `--coverage-shape rectangular --round-coverage`.
Enable **Functional overlap** to outline the union of geometric intersections
of two or more selected outer system polygons in red. Box cut-out masks do not
affect this contour: it is the boundary of points inside at least two polygons.
The checkbox is off by default and requires Coverage polygons and two selections.
It follows the polygon perimeter, including space between business boxes; it
never substitutes contours around shared capability boxes. Date, layout, depth
and filters recalculate geometry. Read [system coverage](system-coverage.md#functional-overlap--renderer-66)
for native SVG filters, masks and metadata; geometric overlap alone does not
prove redundant functionality.

With Maturity and Legend enabled, include six visual box samples (levels 0–5)
with their names and short descriptions. Reuse the actual maturity box classes
so opacity, border strength and the level-0 dashed line match the diagram.
Hide the visual scale when either setting is off; native SVG keeps the samples.

The **Backlog** checkbox is off by default in HTML. Enable it to show the backlog; disabling it removes the backlog column, vertical 0.Y.Z records and horizontal unplaced children with lane 0. The remaining columns close the gap. This does not remove unclassified properties or placed records named Backlog. The setting persists across state/layout changes and is included in SVG export. For direct SVG use `--no-backlog`.

The **Legend** checkbox controls a compact, context-sensitive native SVG legend.
Show explanations only for visible enabled modes: stage bands, muted tag context,
direct system labels/highlight, actually visible coverage systems (with their
colors) and displayed maturity. Omit the legend and its space when there is
nothing to explain. Do not print revisions, hashes or adapter disclaimers in the
map footer: keep them in SVG metadata and the live **Diagram notes** details.
Turning Legend off removes the legend from SVG export; provenance remains.

**Diagram only** hides the HTML control panel while preserving the selected map,
title, date/scenario caption and current legend setting, then automatically fits
the whole canvas into the available map viewport. **Show controls** or Esc
restores the panel and all settings. This is a presentation toggle, independent
of Legend; it does not remove metadata, dates, planned-scenario disclosures or
change coverage/geometry. Print hides control chrome, including the restore
button. The persistent scale toolbar offers a fit-to-screen button, zoom slider,
minus/plus and 100% reset. Fit mode follows viewport, date, layout and legend-size
changes. Manual zoom allows scrolling through larger details. Zoom scales HTML
wrappers only: SVG dimensions, coordinates and metadata stay native. SVG export
always contains the current map rather than HTML controls; print ignores zoom.

System labels are **off by default** in HTML, the Python API and direct SVG. Enable the HTML checkbox or add `--system-labels` to include actual direct system names. `--no-system-labels` remains a compatible explicit off switch; `--no-legend` hides the full lower text block. Missing mappings have no placeholder line inside a box. Omit --system to show all mappings. HTML controls select state, one application, depth 1–3, system labels, maturity, legend and layer sorting. The visible diagram is SVG; Download SVG serializes **that exact visible view**, with its state, horizon and selections. Use native shapes and text, not screenshots or foreignObject. Export removes hidden-depth nodes, disabled labels/legend and nonvisible mapping metadata, retaining selected-view provenance and the active coverage overlay's explicit visible mapping sources. Interactive HTML contains all supplied snapshots; these display filters are not a security-redaction feature. The SVG embeds its own styles and view metadata; no external fonts/resources or server requests are required.

In classic mode, render horizontal L1 capabilities as full-width horizontal bands below the vertical domains, with an unrotated address/name stack in a dedicated left gutter and at least 500px of lane content width. The gutter stays outside all vertical-domain lanes. Place intersection boxes beside it instead of below a full-width title header. Keep their L2/L3 cells aligned to the supplied vertical-domain lanes; do not turn H-L1 into a vertical card. In both layouts, keep H-L1 address, name, maturity and system labels in that gutter. Align H-L2/L3 address/name text to the left inside their own rectangles. This horizontal-title treatment is a deliberate adaptation of the classic Report’s rotated side title.

System highlighting, depth and legend selections preserve the current label-layout geometry; depth still reserves its hidden child space. **System labels and Maturity rebuild geometry** from the visible text only, so enabling them expands boxes and disabling them compacts the layout again. Omit empty system lines, missing maturity labels and unassigned-cell placeholders. Keep only normal padding. Vertical L2 cards use 80% of L1 width and L3 cards 90% of L2 width, centered in their parent; height follows content and descendants, without a portrait minimum or shrinking to a narrow text column; L1 domain frames still span their content. Layer sorting, tag filters and backlog visibility also change geometry. State changes may have different geometry because they are independent snapshots. When system labels are enabled, explicit mappings are shown in their exact capability blocks; selecting an application outlines its directly mapped blocks only. Do not describe unoutlined blocks as unsupported.
