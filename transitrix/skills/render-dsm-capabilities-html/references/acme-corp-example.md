# Acme Corp example: source core and illustrative extension

Source: https://github.com/transitrix/acme-corp
Revision: e331590b13935d1d0922063acbf1f6a0cb3cdba2 (main read on 2026-10-22).
Assessment/knowledge date: 2026-10-22.

`assets/acme-corp-source-example.json` preserves the source-only display adapter.
`assets/example.json` is now the explicitly illustrative extended demonstration. `assets/acme-corp-source.json`
retains the 15 exact YAML source files and their Git blob SHAs. Each SHA was
verified from the retained UTF-8 bytes using Git's blob hash calculation.
Original source licence: [MIT](acme-corp-LICENSE.txt).

## Mapping

- Scope and display hierarchy: `views/capabilities/compliance-domain.capability-map.transitrix.yaml`.
  It supplies V1, V1.1, V1.2, V2 and H1. Preserve canonical IDs with the
  CAPABILITY- prefix, primitive names and lifetimes. V/H and X.Y.Z are parsed
  from those explicit addresses; L1 vertical lane=0 is legacy display metadata,
  not a backlog classification.
- Confirm Order Intake's current parent using the effective
  REL-CAP-V11-PARENT-2 record. Its previous relation to V2 ended in April.
- Current maturity comes from each primitive's `current_maturity` sidecar series,
  resolved as of the explicit assessment date. Values in order V1, V1.1, V1.2,
  V2, H1: 3, 3, 2, 2, 1. Source history dates are preserved.
- The separate Declared Target Maturity snapshot displays the source
  `target_maturity` series, resolved at the same knowledge date: all five are 3.
  That date selects what target was recorded, not when the target was achieved.
  Per-capability deadlines remain in `source_target_date` (where supplied);
  there is no invented common completion date or successful outcome.
- Current APPLICATION mappings use only the explicit `capabilities` lists on
  APPLICATION-OMS-1 and APPLICATION-CRM-1: OMS → V1; CRM → V2. Do not inherit
  either mapping to children. Capability V1's inverse `applications` list also
  mentions CRM, but the APPLICATION-side list does not support CRM → V1. This
  adapter preserves its declared APPLICATION-side contract instead of merging
  inconsistent directions silently.
- No target application mapping is supplied by the source. The preserved source-only target snapshot
  therefore has no APPLICATION mappings; current support is not copied forward
  as a promised target architecture.

## Deliberately absent

The source has five capabilities, no L3 records, no H-L2/L3 lane assignments,
no backlog records and no DSM `property` classification. Those fields remain
absent from the preserved source-only adapter. They are supplied by the separate
teaching extension below, created on 2026-10-23.

## Expanded teaching example — 2026-10-23

The live preview now uses 32 capabilities and six applications across Current
and Target demo scenarios. This is an illustrative extension of Acme's five
source records, not an update to Acme canon or a claimed future architecture.
The visible title and organisation declare the demonstration; added capability
and application IDs start with DEMO-, and their names include (demo).

`assets/acme-corp-demo-extensions.json` identifies the 27 added capability IDs,
four added application IDs, explicit classification overlays on the five source
records and illustrative extensions to OMS/CRM mappings. Source capability
fields and maturity histories remain unchanged apart from the labelled classification
overlays. The original source-only JSON, raw YAML and source licence are retained.

The current teaching overlay uses independent `layer` and `tags` fields. All
five stages have explicit examples:

| Stage | Demonstration content |
|---|---|
| Strategic | Customer strategy in the CRM domain |
| Learning | Customer insights in the CRM domain |
| Planning | Fulfilment/warehouse planning and packaging impact planning |
| Execution | Order intake/fulfilment, pick/pack, reference-data maintenance and privacy operations |
| Assurance | Stock reconciliation, packaging evidence, consent audit, erasure controls and customer data quality checks |

MDM, ESG and Compliance remain horizontal capabilities with explicit lane
children. Their broad roots have no invented single cycle stage. The descendants
carry explicit MDM, ESG or Support tags. Packaging evidence carries ESG + Support;
customer data quality checks carries MDM + Support. Stock reconciliation carries MDM
inside a vertical inventory branch; returns improvement carries ESG. These are
explicit illustrative assignments, not inferred source facts, and make filters
exercise both orientations, multiple tags and untagged parent context.

`acme-corp-demo-extensions.json` records per-state classification assignments for
all 32 capabilities and retains the previous property overlay for traceability.
The source-only adapter and raw source records remain unchanged.

Unclassified improvement records demonstrate Not specified. The backlog contains
an unassigned vertical child and unplaced horizontal L2/L3 records. Maturity
examples cover 0–5 and Not assessed. H-L2/L3 lane values are explicit and agree
with their parent lane; they reference V-L1 numeric coordinates, never IDs.

The six systems demonstrate direct many-to-many support and missing mappings.
Sustainability Reporting has no current mappings and three illustrative target
mappings; Data Hub and Warehouse System also gain explicit target links. All
target APPLICATION mappings in this extension are illustrative. Added target
maturity values are teaching choices, not forecasts generated by the renderer.
The example assessment date remains 2026-10-22; the overlay was authored on
2026-10-23. Neither scenario claims a live operational measurement.

The separate synthetic regression fixture still exercises renderer invariants.
Historical screenshots/exports remain as evidence of their earlier datasets.

## One-system coverage pilot — renderer 5.0

The configured pilot is **Data Hub (demo)**, `DEMO-APPLICATION-DATA`. Its existing
current direct mappings remain product reference data, customer reference data
and customer data quality checks; the illustrative target also maps inventory
master data. The technical inventory adds two explicitly illustrative abilities:
Reference data services and Data quality checks, with DEMO-TECH IDs. Their links
are supplied separately in each state and currently corroborate those same
business targets; they do not invent additional coverage or inherit mappings.

The overlay manifest records the exact per-state technical assignments. The
polygon and translucent Data Hub name are a visualization prototype, not a
claim of measured sufficiency, coverage percentage or deployed Acme architecture.

## Multi-system coverage demonstration — renderer 5.1

The demo extension manifest records technical reference-data controls for
Governance Portal and warehouse reference-data synchronization/checks for
Warehouse System, in both Current and Target. These are explicit illustrative
links to existing demo business records; source-core and direct APPLICATION
mappings are unchanged. Data Hub, Governance Portal and Warehouse System share
Product reference data and Customer data quality checks. Data Hub and Governance
Portal also share Customer reference data. Warehouse includes Inventory master
data; Data Hub joins that record in Target.

To inspect: enable Coverage polygons, select these three systems, filter MDM
and use depth 3. Compare pairwise and triple overlaps, then switch to layers
and Target. Clear one system to see its color and name disappear independently.
Current Sustainability Reporting has no explicit mappings and intentionally
shows no polygon; Target has explicit ESG targets.

## Dated teaching timeline — renderer 6

`view_date` starts on 2026-10-23. Periods are explicitly illustrative:

- Historical: 2026-06-01 through 2026-09-30, 31 capabilities, lower demo maturity
  and Data Hub product references only. The missing quality-check L3 is absent
  from that complete snapshot and all its mappings.
- Current: 2026-10-01 through 2026-12-31. Quality checks starts on 2026-10-22;
  governance technical controls also start then. At that boundary all 32 business
  records appear and the overlapping data coverage is available.
- Planned: 2027-01-01 through 2027-12-31, with target maturity, Data Hub inventory
  coverage and Sustainability mappings. These are planned demo assumptions.

2026-09-15 also changes the source-backed Order Management maturity within the
historical period. Before 2026-06-01 and from 2028-01-01 the example has no data;
the renderer must show that instead of extrapolating. The extension manifest
records these teaching assignments. The raw/source-only Acme assets are unchanged;
this is not recovered history, a measured daily observation or a future promise.

## Context legend and presentation — renderer 6.2

Start with optional modes off: no technical footer or irrelevant maturity/system
legend appears. Enable Maturity, choose an application to highlight, or select
Data Hub/Governance Portal/Warehouse coverage to see only the corresponding
legend entries. Switch to stage bands or an MDM context filter for their keys.
Diagram notes retains technical revisions and the scenario-view boundary.
Diagram only hides the controls; Show controls or Esc restores them without
changing the chosen date, systems, layers, tags or legend.

## Whole-map presentation — renderer 6.3

Select Data Hub, Governance Portal and Warehouse coverage, then enable Diagram
only: the complete Acme map fits below the persistent scale toolbar. Zoom in to
inspect intersections, use 100% for native detail, and press fit-to-screen to
return to the whole map. Restore controls and change date/layers/legend while
fit is active to verify automatic refitting. SVG export preserves native
geometry regardless of the chosen viewing scale.

## Polygon intersections — renderer 6.6

Enable Coverage polygons, select Data Hub/Governance Portal/Warehouse System and
check Functional overlap. Use target date 2027-01-01 and tag MDM for a compact
example: red follows the actual polygon intersection perimeter, including sloped
edges. Capability cut-outs do not add steps or inner contours around records.
Three-way intersections have no internal pairwise red seams. Change date, depth
or layout to check rebuilt contours. Unselect systems down to one, or turn
coverage off: contours disappear and the checked diagnostic is remembered.
Legend off preserves the contour; native SVG preserves its union-boundary filter.
The existing illustrative mappings supply the geometry; no source facts were
added. Prior 6.4 validation is historical and describes a replaced diagnostic.

## Shape and corner comparison — renderer 6.7

Select current OMS/CRM/Governance coverage and Functional overlap. Compare Angled
with Rectangular, then toggle Round corners independently for all four
combinations. Rectangular coverage spans each system's bounding rectangle;
rounding trims corners. Red follows the chosen exterior shapes and does not
acquire box cut-out steps. Try layers/depth/date changes and switch back: shape
settings persist and the original hull is restored without cumulative edits.
