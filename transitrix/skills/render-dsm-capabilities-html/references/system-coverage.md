# Multi-system coverage map — adapter 5, renderer 5.1

This is a local visualization prototype with independently selectable APPLICATION systems.
Business hierarchy, five management stages, tags and direct APPLICATION support
remain independent. Do not infer that a system fully delivers a business
capability merely because a mapping exists.

## Explicit input

```json
{
  "coverage_system_id": "app-data",
  "states": [{
    "id": "current", "label": "Current", "kind": "current",
    "capabilities": [
      {"id":"business-a", "name":"Reference data management", "layout":"vertical",
       "first_level":1, "second_level":0, "third_level":0, "lane":0},
      {"id":"business-b", "name":"Reference data maintenance", "layout":"vertical",
       "first_level":1, "second_level":1, "third_level":0, "lane":0}
    ],
    "applications": [{
      "id": "app-data", "name": "Data Hub", "capabilities": ["business-a"],
      "technical_capabilities": [{
        "id": "tech-reference", "name": "Reference data services",
        "capabilities": ["business-b"]
      }]
    }]
  }]
}
```

The snippet is a minimal valid model. Optional legacy `coverage_system_id` sets
the initially selected system (the master switch remains off); it must resolve
in every state. All APPLICATION systems are available in the selector without
this field. With no legacy pilot, the HTML selection starts empty. Technical entries require unique text IDs within their APPLICATION,
nonempty names and explicit, duplicate-free business-capability references in
the same state. Empty technical/direct mapping lists mean not specified. They
never imply unsupported. Source inputs remain unmodified.

The polygon's targets are the union of direct application mappings and that
application's explicit technical mappings, intersected with the current visible
business records. A technical-only target need not have a direct APPLICATION
outline or direct Systems label: those still reflect the original direct
mapping only. Metadata distinguishes both sources. No parent/child inheritance,
implicit intersection, coverage percentage or capability sufficiency is inferred.

## Geometry and controls

The Coverage polygons master checkbox starts unchecked and is independent of the
System highlight selector. The Coverage systems list has a colored checkbox for
each APPLICATION. Choose zero, one or several systems. Turning the master off
hides all polygons and names while remembering the individual selections.
Selections persist through state, layout, depth, tag, backlog and label changes.
Systems absent from a state are disabled there, with their selections remembered
for return to a state where they exist. Names follow the selected state.

Direct SVG uses `--coverage --coverage-system app-a --coverage-system app-b`;
the Python API uses `coverage=True, coverage_systems=['app-a','app-b']`.
An explicit empty list shows no polygons; invalid, duplicate or unavailable IDs
fail. The CLI requires `--coverage` when `--coverage-system` is supplied.
For compatibility, `--coverage` without IDs selects the legacy pilot when present,
otherwise all systems in the selected state. With coverage off, no overlays export.

Build a convex polygon around the visible mapped box corners with a small
margin. Use a translucent system-colored fill/stroke above the business boxes, with
pointer-events disabled so controls and diagram interactions pass through.
Cut out unlinked leaf boxes. For unlinked containers that geometrically contain
mapped targets or intersections, cut out their label headers while retaining
the targets. The hull's connecting empty space does not assert extra mappings.
The explicit target list is authoritative, not all area enclosed by the hull.

Place the semi-transparent system name inside the hull, preferring free space
that avoids capability labels and excluded regions. If no such space fits, use
a smaller, very light watermark within a mapped region where possible. The
system name shares the coverage mask so it cannot label an unlinked cut-out. Business text remains readable. This
prototype does not draw individual technical-capability nodes or sub-regions.

Assign colors once from the model-wide sorted union of system IDs; colors do not
change between states or when selections change. Each mask has a unique system
and depth ID, so overlapping overlays cannot accidentally reuse another mask.
Reserve watermark positions across systems where free space allows. Overlapping
fill on a business box means both systems explicitly map that box; polygon
intersection in connecting empty space has no additional semantic meaning.

Precompute a native SVG polygon/mask/name group per system and depth with visible
mappings. Changes to layout, state, tag filter, backlog or optional labels use
that view's geometry; depth selects the appropriate group. No visible mappings
means no polygon/name, even if the checkbox remains on. Overlay selection never
changes business-box coordinates. Turning it off removes the visual layer.

SVG export retains only the selected active groups, native masks, watermark and visible
target/source metadata; unselected systems and inactive depth variants are removed.
`view.coverage_system_ids` records the selected IDs, even when a selected system
has no visible mappings. `coverage_system_id` remains populated only for a single
selected system for compatibility. A selected system with no visible mappings
produces no polygon and no name. The HTML contains
all supplied snapshots and variants, as before. This is not security redaction.

## Scope and methodology boundary

The merged core methodology defines application-owned technical_capabilities
with a local key, name and explicit business targets. It is part of APPLICATION,
not an extensions entry and not a new globally addressable TYPE or REL kind.
The standalone renderer uses a JSON projection with local id instead of key;
see [the mapping and adoption status](methodology-boundary.md). The specification
correction is merged but not released or proof of native consumer support.
Acme technical abilities are illustrative DEMO data, not source-backed facts.
Do not infer real technical inventory or mappings from names. Individual technical
regions and coverage percentages are not implemented by these polygons.

## Functional overlap — renderer 6.6

The Functional overlap checkbox starts unchecked and is enabled while Coverage
polygons is on and at least two systems are selected. It remembers its checked
choice when temporarily disabled. It outlines the geometric area covered by two
or more visible system polygons, including empty space between business boxes. The formula is
`R = union over i < j of (P_i intersection P_j)`: every point inside at least
two selected outer polygons belongs to R. The red contour is the boundary of R.
It does not outline business-capability rectangles.

Coverage hulls stay two native SVG units outside mapped box boundaries
(renderer 6.5.2), replacing the earlier twelve-unit decorative expansion. This
keeps neighboring Acme domain polygons separate across their sixteen-unit gap,
so their margins alone do not generate a red intersection strip. Genuine
positive-area intersections still use the same diagnostic below.

The renderer intersects outer convex hulls pairwise. Box cut-out masks are
ignored by this diagnostic: they protect business labels in the colored overlays
and must not create stair steps or inner red box outlines. The opaque union of
these intersections is outlined in
red by an SVG alpha-edge filter (1.5-unit dilation minus erosion). Applying the
filter once to the union avoids internal seams where three systems intersect.
A shared edge or point with zero area creates no intersection. The native SVG
retains the filter and polygon definitions, with no external runtime dependencies.

Date, selected systems, layers, tags, backlog and depth rebuild the relevant
geometry. Coverage off or fewer than two systems removes the diagnostic. Diagram
only and zoom preserve it. Legend off hides its key while keeping the contour.

Direct SVG: `--coverage --coverage-system A --coverage-system B
--functional-overlap` on one command line. The CLI requires --coverage. Python
uses `functional_overlap=True`; effective mode is false without coverage and two
selected systems. No model attributes or canonical relations change.

Metadata records effective `view.functional_overlap` and
`view.functional_overlap_system_pairs`, the pairs with positive-area hull
intersections. Each `functional-overlap-region` records its
`data-overlap-systems` JSON pair. It does not reference a coverage mask. The single
`functional-overlap-outline` group applies the red union-boundary filter.
The previous renderer 6.4 shared-box diagnostic is replaced, including its
`functional_overlap_capabilities` metadata key. Diagram notes explains the
current geometric semantics. A geometric overlap is a visual investigation aid;
it does not prove redundant functionality or recommend retiring a system.

## Coverage shape controls — renderer 6.7

Polygon shape selects Angled (the original convex hull) or Rectangular (one
axis-aligned bounding rectangle per system/depth). Angled is the default. Round
corners is a separate unchecked checkbox available with either shape. The
rectangular option deliberately uses the overall bounds, not a stepped
orthogonal hull; its extra area does not assert additional capability mappings.

Rounding cuts convex corners inward with a ten-unit corner distance, limited to
half each adjacent edge. Quadratic corner curves are sampled into eight vector
segments at four-decimal precision. The same resulting native polygon points
are used by its colored overlay, white mask silhouette and red-overlap boolean
calculation. Box cut-outs continue to affect only colored overlays. This makes
red overlap follow the selected rounded form instead of a sharp hidden hull.
The original hull remains in data-coverage-hull so repeated toggling has no drift.

Settings persist through layout/date/depth/filter changes and are usable when
coverage is off to prepare the next view. Exports contain the selected native
polygon geometry, independent of HTML controls. Metadata records
view.coverage_shape (angled/rectangular) and view.round_coverage (boolean); SVG
root data-coverage-shape and data-coverage-rounded mirror those settings.

CLI: --coverage-shape angled|rectangular and --round-coverage. Python API:
coverage_shape='rectangular', round_coverage=True. Unknown shape values fail.
No source-model attributes, links or canonical methodology changes are required.
