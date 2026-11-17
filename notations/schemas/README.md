# Capability-map additive schemas

`capability-map-contract.schema.json` is JSON Schema draft-07. Validate a
canonical CAPABILITY fragment against `#/$defs/capabilityFields`, a canonical
APPLICATION (or applications catalogue entry) against `#/$defs/applicationFields`,
and a capability-map `view_config` against `#/$defs/viewConfig`.

These are additive field contracts. Element admission, primitive lifecycle,
identity and the rest of each notation remain governed by their existing
specifications. Additional source element fields are accepted; unknown keys in
the newly defined view settings and technical inventory entries are rejected.
Schema `default` annotations describe render defaults and do not mutate sources.
Enable date format assertion in the schema consumer.

The single-file `tools/lint.py` carries an equivalent embedded contract for
onboarding compatibility. Regression tests require exact parity with this
schema and the controlled vocabulary. The linter additionally checks local-key
uniqueness, canonical mapping references, view references and explicit lifetime
bounds. No external schema library is needed to run the reference linter.

Use the complete synthetic model in `tests/fixtures/capability-management-cycle/`
for integration checks. See capability-map §16.4 for consumer compatibility.

## Operational diagram colors

`diagram-colors.schema.json` defines the separate operational settings file, not
additive model fields. See the [presentation contract](../presentation/diagram-colors.md)
and `tools/diagram_colors.py` for the read-only checker and explicit patch resolver.
It leaves model validation, admission and released consumer support unchanged.
