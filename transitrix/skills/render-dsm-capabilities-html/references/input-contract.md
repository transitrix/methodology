# Input contract

One JSON object: `title` and `organisation` are optional strings; `capabilities` is an array for one already-selected set. The renderer does not combine or switch sets. If using `universal_item_set_id`, all records must have the same value. Select the set in an explicit adapter first.

Each record requires:
- `id`: unique string or integer, separate from its coordinate.
- `name`: nonempty plain text, not HTML.
- `layout`: `vertical` or `horizontal`.
- `first_level`, `second_level`, `third_level`: nonnegative integers. X.0.0 is L1; X.Y.0 is L2; X.Y.Z is L3. Coordinates must be unique within each orientation. L3 requires its L2 and L2 requires its L1.
- `lane`: nonnegative integer. For horizontal L2, it references the **first_level coordinate** of a vertical root, not its database ID. Zero is unplaced. Horizontal L3 must keep its parent's lane. Vertical lanes are retained as supplied display metadata.

Optional `start_date` and `end_date` use ISO dates; blank/null means open bound. This renderer includes both boundaries. Reject a child active on a date when its parent or targeted domain is inactive rather than silently dropping it.

Optional `maturity` is an array of `{change_date: "YYYY-MM-DD", maturity_level_dict: {name: "Managed"}}` or `{change_date: "YYYY-MM-DD", level: 2}`. Recognized names: No capability, Initial, Managed, Defined, Quantitatively Managed, Optimizing. Levels are 0..5. Select latest change_date <= as-of; conflicting assessments at that date are ambiguous and rejected. Unknown names display as unknown, not best maturity.

Legacy backlog: vertical root 0.0.0 with children 0.Y.0 and 0.Y.Z. Unplaced horizontal L2 uses its ordinary horizontal root with lane 0. The tool rejects horizontal first_level=0 as ambiguous. Normalize legacy null lane to zero only after verifying it denotes unplaced. Do not infer a backlog bit from the numeric address of modern `set.b.o.L1.L2.L3` without an explicit adapter.

The renderer does not accept nested Studio tree JSON, arrows, implicit many-to-many intersections, metrics-as-box-area, or multiple records sharing the same coordinate. Ask for a mapping if a source model requires those semantics. All boxes reflect supplied records, not generated cross-products.

## Version 2: explicit states and APPLICATION mappings

Preferred wrapper:

    {
      "title": "Capability landscape",
      "organisation": "Example organisation",
      "model_revision": "user-supplied revision or descriptive snapshot ID",
      "states": [
        {
          "id": "current", "label": "Current State", "kind": "current",
          "as_of": "2026-10-20", "capabilities": [...],
          "applications": [
            {"type": "APPLICATION", "id": "app-crm", "name": "CRM", "capabilities": ["sales-l2"]}
          ]
        },
        {
          "id": "target", "label": "Target State", "kind": "target",
          "horizon_label": "end of 2027", "capabilities": [...],
          "applications": [
            {"type": "APPLICATION", "id": "app-crm", "name": "CRM", "capabilities": ["sales-l2", "service-l2"]}
          ]
        }
      ]
    }

Each state supplies its own complete capabilities and applications. Adapter 6 adds optional explicit date periods and `historical` kind; see [date timeline](date-timeline.md). State IDs are unique; application IDs are unique within a state. The same ID can occur in multiple states but no content or links are carried across implicitly. Target State does not need an exact date; horizon_label is arbitrary plain descriptive text, not parsed as a date. An explicit as_of date selects lifetime records inclusively; without one, the state is taken as a supplied snapshot without temporal filtering. Dated maturity without explicit as_of is rejected rather than inferred.

`APPLICATION.capabilities` contains capability IDs, not coordinates. References must exist in the same supplied state; duplicates and references to unknown IDs fail. Missing `capabilities` and an empty array both mean no direct support is specified. Neither proves unsupported. The adapter has no unsupported field and rejects unsupported_capabilities and coverage_percent. Adapter 5 adds the explicitly scoped technical_capabilities input described in [system coverage](system-coverage.md). It does not introduce a REL type or promise compatibility beyond this declared view adapter.

Single-state legacy wrapper remains accepted: top-level capabilities, applications, optional as_of and model_revision. It becomes Current State. The CLI --as-of is a fallback only for current states, not targets; --date selects an explicit date period. Legacy undated HTML opens its first supplied state; dated HTML opens view_date or local Today and exposes all view controls; direct SVG selection uses --state, --system, --depth, --maturity, --system-labels (off by default), --no-system-labels, --no-legend.

Every SVG includes provenance metadata with separate methodology_revision, adapter_version, renderer_version, model_revision, state_id, state_kind, horizon_label, as_of and view selections. Export does not claim full schema validation or acceptance by Studio/Methodology.

## Version 4: management-cycle layers and tags

The classification contract is additive to IDs, hierarchy, orientation, lanes,
scenario snapshots and APPLICATION mappings:

```json
{"id":"example", "layer":"Assurance", "tags":["MDM","Support"]}
```

- `layer`: optional text, null or empty. Recognized values, in display order:
  **Strategic, Learning, Planning, Execution, Assurance**. Other explicit values
  are rejected. A missing/null/empty stage is unclassified, not an inferred stage.
- `tags`: optional array of distinct **ESG, MDM, Support** strings; default `[]`.
  The adapter supports this controlled tag subset; map other canonical free-form
  tags explicitly before rendering rather than dropping them. Invalid types,
  unknown tags and duplicates are rejected. Tag chips are always displayed for
  actual direct tags and included in geometry; an empty tag array uses no row.
- Stages and tags never inherit; there is no orientation inference. A broad L1
  may have no single stage even when its children cover several stages.

### Legacy property compatibility

`property` is retained as optional text/null input, without modifying the source:

| Legacy value | Stage fallback when `layer` is absent | Tags |
|---|---|---|
| One of the five stages | Same stage | Explicit `tags`, if any |
| ESG, MDM or Support | No stage | Merge that value with explicit tags, without duplicates |
| Missing/null/empty | No stage | Explicit tags |
| Other text | Unknown property diagnostic group; preserve raw value in title | Explicit tags |

Presence of explicit `layer`, including null, overrides the legacy stage
fallback. Legacy tag values still merge into tags. The classification behavior originated in adapter 4; current metadata records
adapter dsm-capability-html/6 and the classification-mapping rule. No classifier is generated from
capability names, application support, maturity, hierarchy or orientation.

### Layer grouping and geometry

Enable **Sort by layers** or `--sort-layers`. Only occupied stages are shown;
Not specified and Unknown property are diagnostic groups, not additional
management stages. ESG/MDM/Support never create zones or headings.

V-L1 frames span aligned domain columns. Their headers show their own stage
when supplied, without classifying children. V descendants are grouped by stage
inside the shared column region. Each H-L1 remains a separate horizontal
container below that region; its explicit lane children are grouped by the same
stage order inside it. Root labels and tags remain in the left gutter above
its local stage headings. SVG zones expose `data-layer-scope` for that context.
Nested parent frames enclose children even across stages and remain transparent.
A layer is a presentation group, not another capability or a dependency edge.

### Tag filters

HTML has a single Tag selector: All tags (default), ESG, MDM, Support. Direct
SVG accepts `--tag ESG|MDM|Support`; the Python API uses `tag_filter=''` by default.

Apply backlog visibility first. Keep records directly carrying the selected tag,
then their source parents and the V-L1 roots needed for horizontal lane context.
Never keep unrelated siblings or infer a tag match from a tagged ancestor.
Context-only boxes are muted; SVG groups expose `data-tags` and
`data-tag-match="match|context"`. Geometry closes unused columns and rows.
An absent tag yields an explicit empty-result message. Depth filtering may hide
a matching descendant while retaining its required parent context, as elsewhere
in this renderer's depth controls. System highlighting remains independent.

Filter selection persists through state/layout/backlog/system-label/maturity
changes. HTML precomputes 64 layouts per state (16 geometry settings × four tag
selections), using the same builder as direct SVG. SVG metadata preserves
`view.tag_filter`, stage/tag vocabularies, state, horizon and other selections.
Hidden-depth nodes, disabled labels/legend and nonvisible mapping metadata are
removed on download. HTML itself contains the supplied scenarios and all views.

### Canonical-methodology boundary

These are JSON adapter fields. Canonical architectural layer remains business;
never write Assurance into it. The merged core correction defines native
management_cycle_stage, projected explicitly to adapter layer. Common canonical
tags remain free-form and are projected to this adapter's bounded display subset.
The corrected native field replaces the earlier extensions-bag proposal. The
source correction is local and unreleased; see
[methodology boundary](methodology-boundary.md) for source revision, inventory
mapping, canonical defaults and consumer-adoption gaps.

## Backlog visibility (renderer 3.1)

HTML starts with **Backlog** unchecked. Enabling it restores backlog records.
Direct SVG retains its compatibility default; use `--no-backlog` to hide it. Visibility follows explicit classic-grid coordinates: vertical records
with first_level=0 and their descendants; horizontal L2/L3 records with lane=0
(unplaced assignments). Horizontal roots remain visible. Do not classify backlog
by a capability name or property value. This differs from Not specified property:
an unclassified capability in a placed domain remains visible.

Hiding backlog removes its column and reflows the remaining domain columns and
lane-aligned intersections in both classic and layered modes. Empty property
bands disappear. State and layout changes retain the checkbox selection. When no
placed domains remain, render a minimal No placed domains placeholder rather
than reintroducing a backlog column. Source records, coordinates and APPLICATION
links remain unchanged; selected SVGs omit hidden records and record both
`show_backlog` and `view.show_backlog` metadata. HTML contains all supplied data;
this toggle is a display control, not a redaction feature.

## Layer zone styling (renderer 3.2)

In layered mode, each occupied layer has a full-width rounded rectangular zone
in a distinct pastel colour. All zone rectangles are emitted immediately after
the canvas background, before any text or capability group, so they remain below
all other diagram elements. Headings and cards have padding inside their zone.
Zone geometry encloses its layer's label slots and local branches; adjacent zones
are separated by gaps. Cross-property parent frames may span several zones.
Zones do not intercept pointer events and are included as native SVG rectangles
in direct and browser exports. Classic mode has no layer zones. Depth and label
filters retain the existing reserved-space behavior within zones.

## Orientation and readable descendant widths (renderer 4.1)

`layout` determines the address prefix, domain/stack placement and explicit
intersection lanes. V-L1 is a vertical domain column; V-L2/L3 are nested cards
stacked inside their branch. H records retain landscape geometry at every depth.
Never infer orientation from stage, tags, maturity, ID or capability name.

V-L2 uses **80% of V-L1 width**; V-L3 uses **90% of its V-L2 width**, centered in
the parent. Height follows visible text and nested descendants, with ordinary
padding and a small minimum. Do not narrow descendants or force a portrait
height/width ratio to distinguish orientation. This supersedes the older 3.4/3.6
aspect-ratio/shrinking adaptation. It applies in classic and layered modes, with
system labels/maturity on or off. Shared lane widths can still expand when H
content needs more landscape width; percentages remain the same in each layout.

The minimum V height/width ratio 1.25 applies only to L1 domain frames. H boxes
retain minimum width/height 1.6. These are presentation choices, not fixed DSM
requirements. Stage zones, tags, lane alignment, source-parent containment and
exact-view SVG export are preserved. SVG groups retain original orientation,
coordinates, depth and direct mappings.

## Horizontal label gutter (renderer 3.5)

Reserve a 240-unit left region before the first vertical-domain column whenever
horizontal roots are present. Place each H-L1 address/name stack, maturity and
system labels in the gutter, left-aligned and wrapped independently of the lane
content. Keep the H-L1 rectangle full width. In classic mode its H-L2/L3
intersection boxes begin 16 units below the row top, beside the labels rather
than below them. Row height accommodates both the gutter and the lane contents.
In layered mode use the same gutter for H-L1 bands. H-L2/L3 addresses/names and
support/maturity text are left-aligned within their own intersection rectangles;
nested children remain below those local labels in both layouts. Preserve unrotated text,
explicit lanes, geometry controls and exact-view SVG export.

## Content-sized labels (renderer 3.6)

System labels default to false in HTML, render_svg and CLI. Use --system-labels
to enable them in direct SVG; --no-system-labels is a compatible explicit off
switch. Only directly mapped system names produce a label stack. Missing or
empty mappings produce no Systems: not specified line inside boxes. This does
not change the meaning of missing support or the independent system highlight.

Maturity labels are also opt-in. Missing assessments produce no placeholder
text; a real level-0 assessment and explicit unknown names are retained when
maturity is enabled. Missing properties likewise produce no header placeholder.

Measure and draw the same visible address/name/optional-label parts, with small
padding and no reserved next text line. Keep V-L2/L3 widths relative to their
parents as specified above; compact height rather than shrinking width. Recompute nested containers,
layer zones, column headers and row positions for each system-label/maturity
combination. Unmapped boxes do not gain empty lines when system labels turn on.
L1 frames still span their domain content; explicit lane alignment remains.

Portable HTML embeds 64 layouts per state: 16 combinations of classic/layers,
backlog, system labels and maturity, for each of four tag selections. Toggling either label control selects the matching
native SVG geometry before applying system/depth/legend filters. HTML and direct
SVG therefore use identical text measurement and layout; no browser-side copy
of the geometry algorithm or server calls are introduced.

## Hierarchy containment (renderer 3.7)

Every source L2 rectangle lies strictly inside its L1 rectangle, and every L3
inside its L2, in both layouts. Same-property branches share a local row: H-L1
labels stay in the gutter beside the intersection boxes. Across properties, keep
label slots in their explicit zones and extend the parent frame to the union of
its own slot and descendant bounds, with padding. Parent frames are transparent
so they do not conceal zones or descendants. Cross-property frames can overlap
other frames; source coordinates and nested SVG groups define hierarchy rather
than assigning a new parent from visual overlap. Do not infer a child's property
from its container. Preflight enclosing H geometry to preserve landscape shape.

Version-4 domain-local H grouping supersedes older descriptions of H-L1 labels
inside a global property band. The earlier sizing and containment requirements
remain, with independent stages and tags instead of a mixed property list.

## Version 5: system coverage overlays (renderer 5.1 multi-selection)

Optional model-level `coverage_system_id` preselects one APPLICATION present in
every state. It is a compatibility default, not a restriction on selectable systems.
Any APPLICATION may contain an optional `technical_capabilities` array; each entry has nonempty text `id`, `name` and an explicit
`capabilities` array of business-capability IDs from the same state. Duplicate
technical IDs or links, unknown business references and invalid shapes fail.
Application-level direct mappings remain separate from technical mappings.

HTML starts with Coverage polygons unchecked. The colored Coverage systems list
allows one or multiple APPLICATION selections, independent of direct highlighting.
Selections persist across views; unavailable systems are disabled in that state.
Direct SVG uses `--coverage` plus repeatable `--coverage-system ID`, or Python API
`coverage=True, coverage_systems=[...]`. Empty selection shows none; invalid or
duplicate IDs fail. Without explicit IDs, direct SVG keeps the legacy pilot
default if present, otherwise selects all APPLICATIONs in the selected state.
No additional geometry variants are needed: each base SVG contains a native
overlay for each system/depth with visible mappings, and controls select the proper one.
Export removes inactive variants, retaining the selected polygon, mask,
watermark and its `data-covered-capabilities`/`data-coverage-sources` evidence.
No diagram nodes are generated from the technical inventory. See
[system coverage](system-coverage.md) for mask, label and empty-view semantics.

## Version 6: state on a date

See [date timeline](date-timeline.md) for the authoritative date-selection contract,
period boundaries, inclusive element lifetimes, source-basis distinction, segment
precomputation and no-data handling. State period fields are adapter-only, not
canonical lifecycle fields. Historical, current and target kinds are explicit.

## Presentation controls and compact legend (renderer 6.2)

The native SVG footer now contains only a context legend. Entries follow actual
visible marks in the enabled view: management-stage bands, parent/domain context
for a tag filter, direct system labels/highlight, each visible coverage system
with its color, and maturity. No coverage entry is drawn for a selected system
without visible mappings. Default classic view with optional modes off has no
legend text or reserved footer space, even when Legend is checked. Disabling
Legend removes its text/swatches and reduces canvas height; business coordinates
remain unchanged. Direct SVG and HTML use the same labels, wrapping, flow and
view conditions. Export retains only the selected view's legend.

Technical revisions, methodology hash and the local-adapter disclaimer remain
in SVG metadata. Additional `view_contract` and `mapping_semantics` metadata
state the non-conformance/explicit-scenario and non-inheritance/unknown-mapping
boundaries. The HTML Diagram notes details render model/methodology/adapter/
renderer/state/date/basis and these explanations for the current date and view.
They are independent of the Legend checkbox and are cleared on a no-data date.

Diagram only is an unchecked HTML presentation checkbox: hide the controls and
notes, keep the map's title/date/scenario context and chosen legend. Show controls
in the persistent scale toolbar or Esc restores the unchanged settings. It does not change
the JSON schema, scenario selection, SVG geometry or export semantics; there is
no separate API/CLI diagram-only mode. Print always omits HTML controls and the
restore button. The overall temporal/stage/tag/coverage contract is unchanged.

## Viewport zoom and fit (renderer 6.3)

A persistent scale toolbar remains available with the main panel hidden. It
contains zoom out/in, a 1–300% slider, 100% reset, fit-to-screen and Show controls.
Entering Diagram only automatically activates fit; fit includes the entire
native canvas (title, date/scenario, all boxes/coverage and enabled legend) in
the map viewport below the toolbar. Fit never enlarges above native 100%.
It recalculates on viewport/header size changes and when a date, layout or
legend changes canvas size. Manual zoom cancels fit and preserves the viewport
center where scrolling permits. Selecting fit again resets map scroll offsets
and centers the complete map. No-data dates disable scale controls.

CSS transforms are applied to an HTML wrapper inside a correctly sized scroll
stage, not to SVG elements. Zooming and presentation mode leave the native SVG
unchanged; exported coordinates, dimensions, masks, text, legend and metadata
remain identical to direct rendering at that date/view. The scale toolbar and
Show controls are excluded from print, and print uses unscaled native content.
The JSON adapter and CLI have no zoom parameters: this is HTML viewer behavior.

## Polygon intersection diagnostic (renderer 6.6)

Functional overlap is an optional view flag over the currently displayed system
polygons. Red contours bound the union of their pairwise geometric intersections,
using outer polygon geometry without capability cut-out masks. This includes intersections
between boxes; it is independent of exact shared business-capability IDs.
See [system coverage](system-coverage.md#functional-overlap--renderer-66) for
geometry, export metadata and selection/CLI behavior. This changes the renderer,
not the input model or methodology.

The persistent toolbar's Show controls / Hide controls button works in both
directions and stays synchronized with Diagram only. Its aria-expanded state
describes the settings panel. Hiding settings fits the map; showing them retains
all view selections. This viewer behavior does not alter native SVG content.

## Coverage geometry options (renderer 6.7)

Polygon shape and Round corners are independent view settings. Their defaults
are angled and false; rectangular uses a bounding rectangle. Date, system
selection, depth, layer and tag filters preserve the settings. SVG records
view.coverage_shape and view.round_coverage and exports the selected geometry.
See [coverage shape controls](system-coverage.md#coverage-shape-controls--renderer-67)
for rounding precision, boolean-overlap behavior and CLI/API options.

## Visual maturity legend (renderer 6.8)

When Maturity and Legend are enabled and visible records have maturity labels,
the footer shows six miniature capability boxes, levels 0–5, with each level's
name and a short description. These samples share the actual caprect m0–m5
classes, rather than introducing a separate color scale. The footer adapts its
columns to canvas width and does not move business nodes. Hiding either option
removes the key and releases its space. SVG export includes the visual key.

## Native methodology correction and JSON projection

The merged core specification defines management_cycle_stage on CAPABILITY
and technical_capabilities on APPLICATION. This JSON adapter keeps its existing
layer and technical-entry id keys for compatibility. These are explicit
projection names, not the canonical field names. See
[the source mapping](methodology-boundary.md) and
[bundled core specification](methodology-correction.md). Unknown or unsupported
native view settings require a reported mapping gap, not silent defaults.
SVG metadata separates merged contract revision, reviewed baseline revision,
contract status, renderer/adapter versions and source model revision.
