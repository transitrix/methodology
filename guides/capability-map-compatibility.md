# Capability-map compatibility checks

This change corrects the core methodology. It adds optional native fields rather
than requiring a renderer-specific extension. No existing methodology version
pin changes until a release is prepared under CONTRACT §10.

| Surface | Checked on 2026-10-23 | Limit |
| --- | --- | --- |
| Published additive JSON Schema | Draft-07 AJV with date-format assertions: nine fixture fragments accepted; four malformed controls refused | Validate the selected definition, not the full organisation envelope |
| `tools/lint.py` | Positive/negative integration cases, legacy omission, published schema/vocabulary parity and existing capability examples | New fields, mapping references, local keys, dates and view selections; no history reconstruction or renderer geometry |
| CLI `@transitrix/cli@2.11.0`, file scope | Native capability-map example returns zero errors and six `NOTATION-SKIP-001` warnings for unavailable maturity sidecars | The result says the file remains unvalidated; it is not full compatibility proof |
| CLI negative control | The same file with `management_cycle_stage: ESG` and `view_config.display.depth: 99` still returns zero errors | Released CLI does not enforce these new core contracts; run the reference linter and do not silently treat this acceptance as validation |
| DSM / Studio / standalone renderer | Not adopted by this source change | Separate consumer implementation and release evidence required |

The reference validator preserves its existing single-file installation shape:

```sh
python tools/lint.py
python -m unittest discover -s tools/tests -p test_capability_contract.py
python tools/tests/test_lint_encoding.py
```

The complete synthetic source model lives in
`tests/fixtures/capability-management-cycle/`. From that directory, run
`python ../../../tools/lint.py`. The view example is checked against that fixture
for drift. Past, present and future dates are accepted as selections; validating
a date does not establish that evidence exists for it.

The new validator rejects malformed **new** native fields. Existing source data
without them remains valid; it is not classified from names, H/V orientation,
parent stages, tags or maturity. Existing direct application coverage fields
retain their previous validation boundary; new technical mappings always check
canonical CAPABILITY targets before display filtering. Common free-form tags
are not narrowed to ESG, MDM and Support.

For proposals that placed these values under `extensions`, move
`extensions.management_cycle_stage` to the defined native field explicitly.
Reconcile conflicts before moving and retain the source history. Do not infer
stages from a legacy renderer's `layer`: canonical architectural `layer` remains
`business`. Native APPLICATION technical entry `key` projects to standalone
renderer `id`; source and adapter endpoint conventions require explicit date
conversion. This is a mapping boundary, not a new global technical TYPE.

CLI/DSM/Studio adoption, whole-source temporal assessment, source-to-renderer
projection and product release remain separate from this methodology PR.
