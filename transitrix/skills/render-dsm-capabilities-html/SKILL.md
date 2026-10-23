---
name: render-dsm-capabilities-html
description: Render DSM-style business capability maps as portable interactive HTML and native SVG, with dated snapshots, management-cycle layers, tags and explicit multi-system coverage. Use for standalone capability maps, not capability trees, BCMFlow or native DSM/Studio editing.
license: MIT
allowed-tools: Read, Bash, Glob, Grep
metadata:
  version: "6.8.2"
  when_to_use: "Create or update a portable capability-map HTML/SVG, show system coverage, or compare explicitly supplied dated capability states."
  source_contract: "888c03d33c2d899ec85a612901075b67811614e5"
---

# Render a business capability map

Use Python 3 standard library only. Resolve `SKILL_DIR` as this skill's actual
folder, independently of the working directory. Keep source models unchanged;
write generated output to the user's chosen destination.

## Establish the source meaning

Read [input contract](references/input-contract.md) before adapting data and
[methodology mapping](references/methodology-boundary.md) before converting
native Transitrix records. Input is the documented standalone JSON projection,
not native YAML. Preserve source revisions, evidence dates, explicit V/H
addresses and lanes, independent Current/Target states and mapping provenance.
Missing support means not specified; never infer it from names, tags or hierarchy.

This uses the classic DSM Report grid: V-L1 domain columns, horizontal H-L1
bands and nested L2/L3. State that assumption for vague "like DSM" requests.
Use [DSM source rules](references/dsm-rules.md) for source-specific geometry;
no pixel parity or native product integration is claimed.

## Render and choose a view

```sh
python3 "$SKILL_DIR/scripts/render.py" model.json capability-map.html
python3 "$SKILL_DIR/scripts/render.py" model.json capability-map.svg --date 2027-01-01 --sort-layers --no-backlog
```

Read [view controls](references/view-controls.md) for layers, tags, nested widths,
backlog, labels, legend, Diagram only, zoom, fit-to-screen and exact-view export.
The five management stages are Strategic, Learning, Planning, Execution and
Assurance. ESG, MDM and Support are independent tags. Neither stages nor tags
inherit. Preserve L1/L2/L3 containment and explicit horizontal intersections.

For dated input, read [date timeline](references/date-timeline.md): distinguish
model-validity date, source/evidence date and planned intent. Gaps show no data
and disable export. Never derive a date from a descriptive target horizon or
claim that a plan became observed fact when its date passed.

For coverage, read [system coverage](references/system-coverage.md). Use only
explicit APPLICATION and application-owned technical mappings. A red outline
marks the region inside at least two selected outer polygons; it is a geometric
diagnostic, not proof of redundant functions or a coverage percentage.

## Verify and deliver

Use [the Acme teaching example](assets/example.json) for a demonstration;
[source/illustration notes](references/acme-corp-example.md) distinguish its
source-backed core from invented teaching records. Preserve visible demo and
planned-state labels. Never mix synthetic assignments into source canon.

Run `python3 "$SKILL_DIR/scripts/test_render.py"` after renderer changes.
Inspect both classic and layered layouts: readable names, nested rectangles,
direct mappings, dated coverage, selected-view SVG and no external SVG assets.
System/Maturity labels expand boxes; hidden labels reserve no empty lines.

Record renderer/adapter/model revisions and the merged-but-unreleased methodology
source separately. The canonical maturity scale is 1–5; explicit legacy 0 is
an absence diagnostic and missing maturity is not 0. The standalone tag filter
supports one selected tag; report unsupported native multi-tag settings.

Deliver local HTML/SVG files (or native attachments where available), with
selected date/scenario and any unverified runtime behavior. Display filters are
not redaction: HTML includes all supplied snapshots. Publishing or sending the
artifact requires the user's authorization.
