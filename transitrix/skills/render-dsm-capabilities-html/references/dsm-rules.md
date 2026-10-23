# DSM Report / NewBCM source rules

Verified 2026-10-20. This is the classic Report grid, not Editor (C) tree or BCM/BCMFlow. The HTML renderer preserves geometry and visual grammar, with explicitly disclosed safety/correctness adaptations below. These adaptations are not accepted changes to the product contract.

## Pinned source manifest

All DSM references below use commit 2e967541488e6f68212b43965a78a7c4a2339948. The six core files were re-fetched explicitly at that commit and matched the extracted contents.

1. Main Report: https://github.com/transitrix/transitrix-dsm/blob/2e967541488e6f68212b43965a78a7c4a2339948/dsm/src/components/Reports/NewBCM.jsx
   blob f696324172c7625cc690577558f74b5eaa8b2132
2. Vertical renderer: https://github.com/transitrix/transitrix-dsm/blob/2e967541488e6f68212b43965a78a7c4a2339948/dsm/src/components/Reports/CapabilitiesReportVertical.jsx
   blob 7a5daedb2e7fded19d3db1d555245d978bfe1a54
3. Horizontal renderer: https://github.com/transitrix/transitrix-dsm/blob/2e967541488e6f68212b43965a78a7c4a2339948/dsm/src/components/Reports/NewCapabilitiesReportHorizontal.jsx
   blob 12e6d100dcd2a2eb753fe990413071c39d247254
4. Styles: https://github.com/transitrix/transitrix-dsm/blob/2e967541488e6f68212b43965a78a7c4a2339948/dsm/src/styles/reports/_capabilityReport.scss
   blob 91d91bc699311f4a613e8adf2a88856a458ec6b1
5. Concept: https://github.com/transitrix/transitrix-dsm/blob/2e967541488e6f68212b43965a78a7c4a2339948/docs/docs/concepts/bcm-explained.md
   blob 9c14e7abb5244e7194c472a5410d5070ad1470ac
6. Assignment/notation: https://github.com/transitrix/transitrix-dsm/blob/2e967541488e6f68212b43965a78a7c4a2339948/assignments/06_0_1_capabilities.md
   blob 89840b110c60ebc105714194fd91a2d3e9d16491
7. Distinct editor implementation: https://github.com/transitrix/transitrix-dsm/blob/2e967541488e6f68212b43965a78a7c4a2339948/dsm/src/components/NewVisualEditor/BCMFlow.jsx
8. Editor data adapter: https://github.com/transitrix/transitrix-dsm/blob/2e967541488e6f68212b43965a78a7c4a2339948/dsm/src/components/NewVisualEditor/VisualEditor.jsx

Methodology's current document is supporting conceptual evidence, not pinned DSM implementation and not a reliable Studio status report:
https://github.com/transitrix/methodology/blob/main/notations/views/diagrams/05-capability-map.md
Its Studio planned status conflicts with the implemented tree/cards above. Do not repeat it as current fact.

## Exact NewBCM data model consumed

Flat capability records, not nested tree input:
- id, name
- universal_item_set_id (selected set ID; set list maps selected set name to ID)
- first_level, second_level, third_level: numeric coordinates
- layout: vertical or horizontal; backlog is identified separately from coordinates in this Report
- lane: numeric intersection placement coordinate; renderer matches horizontal L2 lane to a vertical L1's first_level, NOT its database id
- start_date, end_date: optional lifetime fields
- maturity: optional assessment list with id, change_date, maturity_level_dict.name
- link and property are detail/edit data, not required geometry
- organisation label supplied separately

Hierarchy: X.0.0 L1, X.Y.0 L2, X.Y.Z L3; each capability has one orientation. V and H coordinates must remain disambiguated. Report labels use v.X.Y.Z/lane or h.X.Y.Z/lane followed by the name. Database id must not be used as the human coordinate or lane target.

Report backlog uses first_level=0, root 0.0.0. Horizontal unplaced L2 uses lane===0 in the report branch. Documentation also describes null as unplaced. Normalize these explicitly if designing a new input schema; do not silently equate modern set_name.b.o.L1.L2.L3 addressing with the legacy display string. Modern b=1 backlog and legacy first_level=0 require an explicit adapter.

## Exact classic grid placement

- L1 vertical roots: first_level!=0, second_level=0, third_level=0, layout=vertical; sorted ascending by first_level.
- V-L1 render as side-by-side columns at the top, gap 1%, width configurable as percent. Backlog is an optional left column.
- Within each V-L1: V-L2 boxes have same first coordinate, second!=0, third=0; V-L3 nest inside their L2 by same first and second coordinates.
- L1 horizontal roots: same L1 coordinate test, layout=horizontal. They render as full-width rows BELOW the vertical column region, not interspersed among it.
- The pinned source gives each H row a narrow rotated vertical left title. This renderer deliberately uses an unrotated horizontal top title within a full-width band instead, as requested for horizontal L1 capabilities. Keep cell columns aligned to the visible V-L1 columns and minimum row content width 500px.
- H-L2 boxes at an intersection require same H first_level, second!=0, third=0, layout=horizontal, lane===V-L1.first_level. H-L3 nest inside their H-L2.
- Unplaced H-L2 (lane=0) occupy optional backlog column.
- Do not create a complete cross-product of capabilities: render only explicitly assigned lane records. One current record has one lane. A many-to-many capability_intersection junction is a future design, not shipped grid input.
- L2 and L3 are nested containers, not dependency arrows, not an org chart, not a treemap whose area encodes magnitude.

Viewport defaults in source: columnWidth=10%; controls 10..30 in steps of5, with visible columns 10/6/5/4/3 at 10/15/20/25/30%. Source paginates vertical columns. For static printable HTML, showing all columns horizontally or fit-to-page can be an explicit adaptation; it is not source-exact pagination.

## Exact visual grammar

- White report surface, margin 8px 12px 20px, radius10px.
- V-L1: white, border3px solid #e2e8f0 in ordinary mode; rounded12px; min-width100px; min-height50vh; flex-column centered; gap5px; font12px; padding top12px/bottom20px.
- L2: background #c9d5f2; border3px solid #c9d5f2; rounded8px; width80%; min-height50px; padding13px; centered flex-column. Shared style gap10px; H-renderer overrides gap20px.
- L3: white; border3px solid white; rounded8px; width90%; min-height50px; centered content; gap5px.
- Labels: 12px, line-height15px, normal weight, #1e1e1e. L3 text padding4px.
- H-L1 source: full-width white/50 container, rounded12px; vertical rotated left title. Renderer adaptation: horizontal top title, with header space reserved above nested cells. Nested box grammar as above.

Maturity ON is a border+opacity overlay, NOT a colored heat-fill and NOT the tree's round maturity badges:
0 No capability -> dashed3px rgba(15,23,42,.14), opacity .55
1 Initial -> dashed3px rgba(15,23,42,.28), opacity .65
2 Managed -> solid3px rgba(15,23,42,.45), opacity .78
3 Defined -> solid3px rgba(15,23,42,.62), opacity .88
4 Quantitatively Managed -> solid3px rgba(0,77,103,.82), opacity .95
5 Optimizing -> solid3px rgba(0,77,103,1), opacity1
Source class numbers are1..6, distinct from domain maturity0..5. Missing assessment is not maturity0. Source has no maturity class for missing L1/L3 and no-maturity-color (border #c9d5f2) for missing L2.

## Temporal behavior and known defects: distinguish fidelity from correctness

Observed implementation, NOT recommended domain rules:
1. NewBCM activeDatesArray lines108ff uses strict start_date < selected date < end_date; boundary equality disappears. Missing bounds are open. An HTML skill must explicitly document boundary semantics or correct them against an authoritative contract, not claim that inclusive dates are exact current NewBCM behavior.
2. Maturity renderer filters change_date <= selected date, then selects highest record id, NOT latest change_date. Correct implementation should use latest effective date and explicitly report same-date ambiguity; mark this as a deliberate correction.
3. Unknown maturity names fall through to class6/Optimizing in source. Do not make an unknown assessment look maximally mature; show unknown.
4. V-L3 filter mistakenly checks the L2 layout instead of L3's layout. H-L3 normal branch lacks lane scoping. Backlog H-L3 branch lacks first-coordinate scoping and uses v label. Validate parent orientation/lane and do not silently duplicate children across groups.
5. Source sorts concatenated coordinates numerically, which breaks multi-digit tuple order. Use numeric tuple sorting, label as correction.
6. Pagination next bound is suspect (levels.length-2); do not reproduce data loss.

A safe new HTML skill should preserve layout/style, validate unique identities and coordinate parentage, preserve explicit intersection assignment, separate backlog and unknowns, and clearly state adaptations. No invented capabilities, maturity, relationships, dates, or weights. If only names/hierarchy exist, do not invent H/V classification; choose an explicitly documented limited/default mode and expose missing fields.

## UI scope for the requested HTML artifact

Suitable local-only controls: set switch, as-of date, backlog toggle, maturity toggle, zoom/fit, print. These are source-inspired, optional. Do not include live DSM edit/save/server callbacks. Avoid promising Studio integration or a released module. A static stand-alone HTML renderer is an interim artifact, not completion of the Studio product feature.

## Optional property-layer adaptation (renderer 3)

The classic rules above remain the default. The optional layered view uses the
DSM `property` vocabulary documented in [input contract](input-contract.md#legacy-property-compatibility).
Its property-zone layout is an explicit view adaptation, not a reproduction of DSM
Report geometry. It preserves IDs, original coordinates, domain lanes, depth,
state selection and direct APPLICATION mapping semantics.

## L1 column correction (renderer 3.3)

Rechecked the local DSM documentation and Report implementation at
`aa7ac5d0ba99188dd506ef85fd5a5b336bac4f3d` on 2026-10-22:
`docs/docs/concepts/bcm-explained.md` (L1/L2/L3 structure) and
`dsm/src/components/Reports/CapabilitiesReportVertical.jsx` (the outer V-L1
column, its own address/name and nested L2/L3). The existing pinned rules above
also explicitly require V-L1 columns. Layered mode now preserves each V-L1 as
the column itself rather than a separate property-band card. Its transparent
frame spans every band, with a header above them; L2/L3 remain inside the frame
and explicit horizontal lanes stay aligned. Frame and header retain the L1 ID,
original address, maturity and direct APPLICATION mappings. The column's own
property is shown in its header without inheriting it to any descendant.

Paint order: canvas background, coloured property zones, V-L1 column frames and
headers, layer headings and other capability cards. Transparent frames allow the
zones to remain visible. Property-zone placement remains an explicit adaptation; renderer 3.7 below
supersedes the earlier flat L2/L3 treatment. This does not assert pixel parity
with DSM Report.

## Orientation at L2/L3 (renderer 3.4)

The owner explicitly requested vertical columns for every v.X.X.X record and
horizontal rectangles for every h.X.X.X record. Apply this at all three depths
in both layouts. This extends the previous L1 correction: L2/L3 may no longer use
one shared card shape regardless of layout. Minimum aspect ratios and adaptive
lane widths are renderer presentation choices, not pixel parity with DSM CSS.
The DSM conceptual V=column / H=cross-cutting row distinction remains the source
of orientation semantics; source-coordinate/lane and prefix corrections above
remain in force, including unplaced H-L3 labels.

## Horizontal labels move left (renderer 3.5)

The owner requested moving H addresses/names left so they do not occupy the
intersection drawing area. This supersedes the earlier unrotated top-title
adaptation: use an unrotated left label gutter, outside the vertical columns,
for H-L1 in both layouts. H-L2/L3 local labels use start alignment. Classic
intersection boxes sit beside the H-L1 labels rather than below a shared header.
This remains a view adaptation of DSM's original rotated side-title treatment.

## Visible-content sizing (renderer 3.6)

The owner's 2026-10-23 request supersedes earlier hidden-label reserved-space
adaptations: system names are off by default, and visible system/maturity lines
participate in layout. Omit placeholder rows and measure actual lines. Enabling
system labels expands mapped boxes; disabling restores compact geometry. V-L2/L3
may narrow to preserve vertical orientation with less empty area. Domain frames
and lane alignment remain structural. Depth filtering retains its prior reserved
child geometry; this change concerns label stacks and box content sizing.

## L1/L2/L3 containment correction (renderer 3.7)

Property sorting must preserve geometric hierarchy as well as IDs. H-L1 encloses
its lane-assigned L2 boxes; every H/V-L2 encloses its L3 boxes. Place same-property
branches together, with H-L1 gutter labels beside lane cells. For different
properties, preserve each label's explicit zone and expand transparent parent
frames around descendant bounds. A child label may precede its parent's label
in layer order, but the child rectangle remains within its parent. Nested SVG
groups preserve H branches and V-L2/L3 through depth filtering and export.
Check boundaries against source coordinates, not only existing DOM nesting:
the old flattened layout could pass the latter without testing any real parent.

## Five cycle layers and independent tags (renderer 4.0)

This is an explicit local view/data adapter extension, not source-exact DSM
property behavior. The old seven-item `property` vocabulary is preserved through
an explicit compatibility mapping, not reused as the layer enum. Strategic,
Learning, Planning, Execution and Assurance are stages; ESG, MDM and Support are
box tags and filters. Roots are actual capabilities, never generated from tags.
Each H-L1 owns its own ordered stage zones, below the V-domain region; this
supersedes interspersed global H property bands. Parent containment, explicit
lanes, orientation, direct APPLICATION mappings and exact-view export remain.
The [input contract](input-contract.md#version-4-management-cycle-layers-and-tags)
defines the adapter behavior; [methodology boundary](methodology-boundary.md)
separates the proposed semantics from current canonical support.

## Readable V-L2/L3 widths (renderer 4.1)

The owner's width correction supersedes the 3.4 descendant portrait aspect
requirement and 3.6 shrinking algorithm. V-L2 uses 80% of the L1 width; V-L3
uses 90% of its L2 width, centered. Height comes from text, padding and children,
without a V-L2/L3 portrait floor. V orientation remains visible in the domain
column and stacked branch. H landscape geometry, explicit lanes and source
parent containment remain unchanged. No classification or source data changes.

## Single-system coverage overlay (renderer 5.0)

A new owner-requested presentation extension adds a native, translucent system
coverage polygon and translucent system name. It uses explicit direct and
technical mappings for one configured APPLICATION. This is not pinned DSM
Report behavior. The [coverage contract](system-coverage.md) retains separate
direct mappings, depth/filter-aware targets, cut-outs for unlinked capabilities
and exact-view export. No technical nodes or canonical REL types are inferred.
