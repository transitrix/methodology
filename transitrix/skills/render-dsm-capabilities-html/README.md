# Capability-map HTML/SVG skill

Create a portable business capability map from explicit source data: vertical
domains, horizontal cross-cutting abilities and readable nested L2/L3 boxes.
The interactive HTML adds five management-cycle layers, ESG/MDM/Support tag
filters, date navigation, multi-system coverage and exact-view SVG export.
Python 3 is the only runtime requirement; rendering needs no server or network.

## Use with an agent

This is a skill in the Transitrix plugin. With the plugin installed, invoke
`/transitrix:render-dsm-capabilities-html` in Claude Code. For a host that loads
portable Agent Skills, copy this entire folder into its skill directory and
invoke `$render-dsm-capabilities-html` (Codex) or reference `SKILL.md` directly.
Runtime-specific trigger metadata is nested under `metadata` to retain the
portable Agent Skills frontmatter shape. Existing invocation policy is retained.

Example request:

> Render the supplied capability model as an interactive map. Preserve its
> dates, explicit V/H lanes and mappings. Include a script-free SVG of the view.

## Run without an agent

From this skill folder:

```sh
python3 scripts/render.py assets/example.json acme-capability-map.html
python3 scripts/render.py assets/example.json acme-capability-map.svg --date 2027-01-01 --sort-layers --no-backlog
python3 scripts/test_render.py
python3 scripts/package.py /tmp/render-dsm-capabilities-html-6.8.2.zip
```

Open the HTML in a browser. Backlog, system labels and coverage are initially off.
Choose a date, select systems and enable Coverage polygons. Use Diagram only and
Fit to screen for presentation; Download SVG captures the exact visible view.
A source-only Acme adapter is also included; the expanded teaching example
labels its illustrative additions and planned states visibly.

## Meaning and compatibility

The five stages are Strategic, Learning, Planning, Execution and Assurance.
Strategic includes strategic planning; Planning is tactical/operational. ESG,
MDM and Support are tags, independent of actual horizontal capabilities.
Coverage follows explicit direct/technical links; geometry is not a percentage
or proof of redundant functionality.

Input is the standalone JSON contract, not native Transitrix YAML. Read
[methodology mapping](references/methodology-boundary.md) for the merged source
revision, unreleased core changes and consumer limitations. Native multi-tag OR
filtering is not implemented; this UI selects one tag. Canonical maturity is
1–5; explicit legacy 0 is an absence diagnostic, never a missing assessment.

The renderer is version 6.8.2, adapter `dsm-capability-html/6`. It does not edit
DSM/Studio or imply their adoption of this contract. HTML includes all supplied
snapshots: filters are presentation, not security redaction.

## Included data and license

[Acme example notes](references/acme-corp-example.md) identify the immutable
source revision, retained source bytes and illustrative teaching overlay.
The renderer and skill are MIT licensed under the repository license; the
source Acme fixture's MIT license is retained with its attribution.
