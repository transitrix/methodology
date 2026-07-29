# `@transitrix/reqif-cli`

The reference converter + validator for the **ReqIF-shaped domain package** ([`notations/packages/reqif.md`](../../notations/packages/reqif.md)) — the methodology's first shipped [`PACKAGES.md`](../../notations/PACKAGES.md) package.

It lives here as a **standalone package**, with **zero dependency on `@transitrix/ingest-cli`** or any other core tooling. That is not a style choice — [`PACKAGES.md`](../../notations/PACKAGES.md) §4.2/§4.3 requires a package's own tooling to be self-contained, so that deleting `packages/reqif-cli/` (plus the package's own `reqif/` folder in an adopter repo, plus the `packages:` line in `transitrix.yaml`) leaves zero trace anywhere in core.

## Install

Not published to npm yet — local install from this checkout:

```
npm install -g ./packages/reqif-cli   # provides the `transitrix-reqif` bin globally
# or, from inside packages/reqif-cli/:
npm link
```

## Design

- Pure Node ESM, **no dependencies** — including no XML or YAML library. `src/yaml.mjs` and `src/xml.mjs` are minimal, purpose-built, round-trip-safe for exactly the shapes this package's own object model needs (not general-purpose parsers).
- Exit codes: `0` ok · `1` findings (validation errors / a roundtrip mismatch) · `2` usage / error.

## Commands

```
transitrix-reqif <command> [args]
```

| Command | Purpose |
|---|---|
| `export <reqif-folder> <out.reqif>` | Read the four object kinds from a `reqif/` folder and write a ReqIF-conformant XML document. |
| `import <in.reqif> <reqif-folder>` | Read a ReqIF XML document and write the four object kinds back out as YAML. |
| `validate <reqif-folder>` | Run the package's own validator — `REQIF-001..007`, [`notations/packages/reqif.md`](../../notations/packages/reqif.md) §5. Package-internal only; never resolves a `Transitrix.CanonRef` against an adopter's `canon/`. |
| `roundtrip <reqif-folder>` | Export then re-import in memory (no disk write) and assert the resulting object set is identical to the one loaded from the folder — the package's own demonstration of the epic's round-trip success signal. |
| `transition <reqif-folder> <spec-object-id> <new-state>` | Advance a `spec-object`'s `workflow_state` by exactly one legal step (`draft → reviewed → approved → baselined → superseded`); rejects any other edge. |
| `revise <reqif-folder> <spec-object-id> <ReqIF.Attr> <new-value>` | Change one value, bumping `revision` and snapshotting the pre-change `values` into `revisions`. |
| `history <reqif-folder> <spec-object-id>` | Print a `spec-object`'s revision history, oldest first. |
| `suspect <reqif-folder>` | List every `spec-relation` with its computed suspect status — flagged when its target's text changed since the relation was recorded. |

The last four commands are the package's experimental surface (`REQIF-008`/`REQIF-009`, [`notations/packages/reqif.md`](../../notations/packages/reqif.md) §2.9) — not represented in ReqIF XML, so a folder exercising them is not expected to round-trip identically through `roundtrip`. Worked example: [`notations/examples/packages/reqif-workflow/`](../../notations/examples/packages/reqif-workflow/).

## The object model

Four kinds, one folder each under a `reqif/` package folder — `spec-object-types/`, `spec-objects/`, `spec-relations/`, `spec-hierarchies/`. Full schema, id grammar, and the one permitted package→canon citation (`Transitrix.CanonRef`) are specified in [`notations/packages/reqif.md`](../../notations/packages/reqif.md).

A worked instance exercising all four kinds, the converter, the validator, and the removal test lives at [`notations/examples/packages/reqif/`](../../notations/examples/packages/reqif/).
