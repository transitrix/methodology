# Templates

Forkable starter artefacts — generic patterns expressed in Transitrix notation, ready to `git clone` (or fork), edit for your own organisation, and validate. One directory per template.

**How this differs from `notations/examples/`:** examples exist to demonstrate spec conformance for a notation and are read alongside the spec they illustrate. Templates exist to be *forked* — they are a starting point for an adopter's own artefact, not a spec illustration, and are indexed here rather than in `notations/README.md`.

**How this differs from the `acme-corp` worked example:** [`transitrix/acme-corp`](https://github.com/transitrix/acme-corp) is a single, coherent, full-organisation model — every notation used together, cross-referenced, telling one company's story. A template is a single generic artefact with no adopter data, meant to be dropped into *your* organisation, not read as a worked example of someone else's.

## Available templates

| Template | Notation | Description |
|---|---|---|
| [`raci/`](raci/) | `blocks` (matrix subset, [08-blocks.md](../notations/views/08-blocks.md) §4a) | RACI matrix — who is Responsible / Accountable / Consulted / Informed across a set of activities. |
| [`operating-model/`](operating-model/) | Composite — Goals, Capability Map, Process Blueprint, BPMN, Nested Block Diagram, Products, Applications | Starter kit showing "your operating model" is a composition of building blocks already expressible in Transitrix notation — one minimal, cross-referenced scenario running through all eight blocks. |

## Using a template

1. Fork or clone this repository (or copy just the template's directory into your own).
2. Edit the `*.transitrix.yaml` file(s) for your own activities, roles, and assignments — the template's own README explains what to change.
3. Validate: `npx @transitrix/cli validate <file>` (Windows PowerShell: `npx.cmd`).
4. Optional: open the file in Transitrix Studio (VS Code) for a live preview.

## Contributing a template

A template must be a **generic pattern, not a client instance** — no real organisation's data, names, or figures. Pair it with a short README explaining the layout convention and any modelling caveats.

Two categories of template are welcome:

- **Single-notation.** Keep it small — one notation, one clear purpose (e.g. `raci/`). This is still the default shape for most templates.
- **Composite / starter-kit.** A template whose whole *purpose* is the composition of several building blocks across notations (e.g. `operating-model/`) — the point being made requires more than one notation, so it cannot be single-notation by construction. Keep it small a different way: exactly **one minimal instance per building block**, cross-referenced by real ID, not a full worked example. If you find yourself adding a second instance of any one building block "for realism," that's a sign the template has drifted from composite-proof into worked-example territory — stop and reconsider scope.
