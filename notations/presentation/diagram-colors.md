# Company diagram colors

This is an operational presentation contract, version
`transitrix-diagram-colors/v1`. It changes no model facts, identities, relations,
status, admission or lifecycle. A contract/checker delivery does not establish
support in a released Studio/DSM renderer, settings editor or export path.

## Location and shape

The only editable company master is `<operations-root>/config/diagrams/colors.yaml`.
For an ordinary repository the operations root is `<repo>/operations`; for an
organization-scoped repository it is the explicitly bound organization's
`operations` directory. Resolve that binding before loading. Do not search parent,
sibling or other organizations' folders, merge several masters, or follow a path
outside the bound repository. An ambiguous/missing organization binding is a
reported scope error, not permission to choose the first file found.

This file is outside `canon`, `field`, `codex`, the ID registry and model validation.
It has no `id`, `notation`, admission record or methodology version pin.
The [JSON Schema](../schemas/diagram-colors.schema.json) fixes its complete shape:

```yaml
schema: transitrix-diagram-colors/v1
common:
  roles:
    node_border: "#123456"
    connection: "#345678"
    text_primary: "#112233"
  types:
    action/Project: {fill: "#DDEEFF", text: "#112233"}
variants:
  dark:
    roles: {text_primary: "#DDEEFF"}
  high_contrast: {}
```

All containers are optional except `schema`. Omission and empty mappings mean no
company override. Colors are quoted opaque six-digit `#RRGGBB` strings, case
insensitive; consumers may normalize case without changing the value. No alpha,
CSS variables/functions/names, URLs, YAML aliases/anchors/tags/merge keys, duplicate
keys, multiple documents or null-as-reset. Delete a key to remove an override.
Unknown keys, variants, roles and malformed values are errors, never silently
ignored settings. Reject the complete invalid edit; do not partially apply it.

### Color roles

All entries below are keys of a palette's `roles` mapping. They name paint roles,
not CSS property names, host chrome, new model fields or new status taxonomies.

| Keys | Paint channel |
| --- | --- |
| `canvas`, `surface`, `surface_elevated` | Diagram background and internal surfaces |
| `node_fill`, `node_border` | Ordinary node fill and outline |
| `text_primary`, `text_secondary`, `text_inverse` | Ordinary content, metadata and inverse labels |
| `header_fill`, `header_text`, `divider` | Table/column headers and separators |
| `connection`, `connection_label` | Ordinary connector/arrow paint and connector label text |
| `group_fill`, `group_border`, `group_label` | Pools, lanes and grouping containers |
| `selection`, `selection_text`, `focus`, `drop_target` | Selection/focus/drag feedback, retaining non-color cues |
| `virtual_fill`, `virtual_border` | Existing virtual/placeholders; retain dashed/absence marking |
| `critical_fill`, `critical_border`, `milestone_fill`, `icon` | Existing critical-path, milestone and icon channels |
| `goal_level.0` … `goal_level.7` | Goal-depth fill, not an organization type ID |
| `tree_level.0` … `tree_level.2` | Capability/tree grouping band fill |
| `layer.driver`, `layer.factor`, `layer.goal`, `layer.change`, `layer.action` | Strategy-chain column/node fill; legacy activity token binds to action |
| `layer.motivation`, `layer.strategy`, `layer.business`, `layer.application`, `layer.technology`, `layer.physical`, `layer.implementation` | Corresponding notation layer fill where supported |
| `maturity.0` … `maturity.5`, `maturity.unknown`, `maturity.unset` | Maturity indicator/heatmap channel; never implicitly the ordinary node fill |
| `status.<state>.<channel>` | Existing semantic indicator paint: state is `success`, `warning`, `error`, `info`, `neutral` or `unknown`; channel is `fill`, `border` or `text` |

`types` maps `<kind>/<stable-selector>` to any subset of `{fill, border, text}`.
Kind is `goal`, `action`, `capability` or `element`. `element` uses the existing
notation element TYPE; action uses its existing canonical type name, for example
`action/Project`. A custom dictionary selector must have an explicit stable,
organization-scoped binding. Preserve exact case; no fuzzy display-name matching.
A database row ID is not a portable semantic selector. Ambiguous/unknown selectors
or unsupported role bindings must be reported by the consumer; schema success
alone establishes neither model resolution nor consumer coverage. Retain an
unapplied setting for another consumer without rewriting it; do not claim it applied.

Maturity dictionary IDs must be bound to their actual meanings before using
`maturity.N`. In particular, a dictionary row 1 is not automatically CMMI level 1;
"no capability", unknown and unset remain distinct. Unsupported or unmapped states
keep their existing presentation with a coverage diagnostic, not a guessed level.
Likewise each consumer documents its existing status-to-role binding. It never
infers status from color, merges pass/fail/unknown meanings, or adds a new ontology.
Labels, icons, shape/dash cues and legends remain; color alone must not carry status.

## Resolution and compatibility

1. Select `light`, `dark` or `high_contrast` from the existing host/user preference.
   `colour_scheme` remains a preference for mode, not another company palette.
   High-contrast/forced-color accessibility constraints take priority over company
   fidelity; preserve existing host contrast guarantees and report any substitution.
2. For each exact role or type/channel, selected-variant value overrides `common`.
   Missing dark/high-contrast values do not borrow the light variant. Merge type
   paint by channel; an omitted border does not erase a configured fill/text.
3. For an ordinary node channel, try the explicitly configured matching type first,
   then its applicable goal/tree level or layer, then its generic node/text role.
   A consumer with more than one applicable grouping must declare its fixed binding
   order, never derive it from rendering order. Ordinary connectors use
   `connection`/`connection_label`; arrowheads share the connector channel.
4. Semantic status, maturity, virtual, critical and selection channels have their
   own eligible roles. They must not be replaced by a generic node fill. If their
   exact role is absent, preserve that channel's historical resolution.
5. If no eligible company value is supplied, run the existing product's complete
   fallback chain unchanged, including saved user/type/maturity values and host
   defaults. Absence is not a new uniform brand palette. Different legacy defaults
   may remain different; do not claim cross-product color equality for omitted roles.

The read-only [reference settings checker](../../tools/diagram_colors.py) provides
`load_settings`, `validate`, `resolve_palette` and `resolve_color`. The last accepts
an ordered consumer binding of role/type-channel candidates and an already
resolved legacy value, returning `(color, source)` (`common`, mode, or `legacy`).
It does not discover repositories, rewrite files, evaluate product states, render,
or validate contrast. Consumers must bind semantic channels and perform their
existing accessibility checks against actual resolved foreground/background pairs.

Explicit existing notation-authored styles keep their existing scope and meaning;
this contract does not relocate them into company config or rewrite source files.
An existing per-view geometry, visibility, layout or connection-style setting stays
independent. No second per-view company-color store is introduced. A consumer that
supports a pre-existing explicit color override must show that provenance and
qualify its palette coverage rather than silently overwrite the authored style.

### Existing settings and migration

Retain the existing Settings surfaces. Where a control overlaps a company role,
there is one control showing effective value, bound organization/model, provenance
and write destination. Do not add a competing palette editor or duplicate controls.
Without this file, current saved settings and behavior remain unchanged. Starting
company editing is explicit; do not create a file on model/view open.

For a bound company palette, overlapping controls edit one session-local company
draft, including when their effective value currently falls back to a legacy
preference. They must not also call an immediate-save preference handler. Retain
original legacy preferences as read-only fallbacks/rollback inputs for this binding,
not a concurrently editable company master. Distinct preferences such as mode,
spacing and edge width retain their normal behavior and storage. Without company
editing, the existing legacy Settings behavior remains available.

Copying existing colors into the YAML is an explicit reviewed migration: inventory
values, owner/scope, stable dictionary bindings and normalization equivalence;
show original/result values and conflicting users' choices before Save. Preserve
a private recoverable original snapshot. Never silently select one user's colors,
coerce an unsupported value, delete preferences or reset dictionaries. Unresolved
identity or non-equivalent color conversion blocks only that migration. Reverting
or deleting overrides exposes preserved fallbacks; it does not restore stale
snapshots over newer saved data. New company values override overlapping legacy
values only through the resolution above.

## Draft, Save, Cancel and concurrent edits

On open, retain the exact saved revision/content hash (including absent state),
resolved organization binding and original bytes. All overlapping controls share
one draft. Valid edits preview immediately only in the editing session; invalid
edits show field diagnostics and keep the last valid preview. Other sessions,
products and ordinary exports use the latest successfully saved valid palette.
An export while editing explicitly says it uses saved colors, not draft preview.

Save validates the complete file and bindings, checks write permission and uses the
existing repository write path with compare-and-swap against the open revision.
A changed/deleted/created file is a conflict, including absent→present. Re-read and
offer an explicit per-field reconciliation with current saved bytes; never
last-write-wins, silently drop unknown keys, or force an automatic merge. Preserve
untouched fields/comments through the existing lossless edit path; if unavailable,
show the complete proposed diff for acceptance rather than silently reserialize it.
After a successful atomic durable save, all consumers invalidate by the new saved
revision. A write failure preserves draft, original/current revisions and error,
keeps the saved master unchanged, and claims no successful save or propagation.

Cancel/Discard drops only the local draft and resolves the **current** saved file
and fallbacks, including external changes; it must not write the opening snapshot
back. Closing with unsaved edits offers Save / Discard / Continue editing. Reload
with a draft asks for the same disposition; no incidental render or navigation may
persist/discard it. A missing file uses historical fallback. Invalid external
content gets an explicit diagnostic and last-valid, clearly stale saved snapshot
if one exists; otherwise historical fallback. Never claim the invalid file applied.

## Renderers, exports and acceptance

Each host supplies the same resolved saved palette revision to its renderers and
export paths, including server/headless rendering, static SVG, PNG/raster capture,
PDF/presentation and HTML/report output wherever supported. Embed concrete colors
or self-contained definitions; no workspace CSS dependency in exported files.
New explicit palette values must match across products for shared bound roles;
legacy fallback and accessibility/explicit-style exceptions are disclosed.
Do not invent an unsupported format or host capability. Native BPMN/PlantUML
artifacts retain their own semantics; a themed visual export is a separate path.

For each product/diagram/host/export, return an exact revision/token/channel mapping
and supported/unsupported/unknown disposition. Hard-coded colors, separate themes,
server renderers, HTML reports and native-format paths remain visible integration
gaps until their owners wire them. Declaring a role never proves universal coverage.

Required consumer cases: absent/no-op palette and customized legacy settings;
two palettes with partial overrides; invalid/unknown/duplicate values; light/dark/
high-contrast; stable type/maturity binding and semantic cues; same role through
retained Settings controls; draft preview versus saved ordinary export; Save,
Cancel, failed write, reopen/reload, external update/delete/create conflict; two
organizations and Studio↔DSM round trips. Record original/result values, exact
saved revision and emitted output colors separately from source tests and release.

## Check a settings file

From a source checkout with its existing PyYAML dependency:

```sh
python3 tools/diagram_colors.py path/to/operations/config/diagrams/colors.yaml
```

Exit 0 means valid settings shape (or absent file with `present: false`); exit 1
means settings diagnostics. This is separate from model validation. The optional
[no-op onboarding template](../../transitrix/skills/onboard/templates/operations/diagram-colors.template.yaml)
preserves appearance. Install/copy the checker and schema together from one
reviewed source revision; no global package install or released support is implied.
