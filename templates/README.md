# Templates

Forkable starter artefacts — single-purpose recipes showing how to express
one common thing in Transitrix notation. Copy a template into your own repo,
rename it, adapt it.

Templates are generic by construction: no client data, no adopter-specific
content, pure method — "publish pattern, not instance," the same discipline
this repository applies to every public-facing artefact (see e.g.
[`transitrix/skills/onboard/templates/FINDINGS.md`](../transitrix/skills/onboard/templates/FINDINGS.md)).

**How templates differ from the other worked material in this repo:**

| | Purpose | Scope |
|---|---|---|
| [`notations/examples/`](../notations/examples/) | Minimal spec-conformance example per notation | One file, illustrates the schema |
| **`templates/`** (this directory) | Adopter-facing starting point for a specific recipe | One file or a small set, ready to fork |
| [`transitrix/acme-corp`](https://github.com/transitrix/acme-corp) | Full worked example of one adopter's whole model | A complete organisation, all notations together |

## Available templates

| Template | Notation | What it solves |
|---|---|---|
| [`raci-nested-blocks/`](raci-nested-blocks/) | [Nested Block Diagram](../notations/views/08-blocks.md) | Lay out a RACI (Responsible/Accountable/Consulted/Informed) matrix as nested blocks — no new notation needed. |

## Using a template

1. Open the template's own `README.md` — it explains the layout convention
   and any modelling caveats specific to that recipe.
2. Copy the `*.transitrix.yaml` file(s) into your own repository and rename
   them for your content.
3. Validate: `npx @transitrix/cli validate <your-file>` (Windows PowerShell:
   `npx.cmd`).
