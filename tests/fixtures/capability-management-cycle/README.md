# Capability management-cycle contract fixture

A synthetic source model with five stages, a separate horizontal capability,
L1/L2/L3 containment and ESG/MDM/Support subject tags. Two applications share
coverage of the horizontal capability through independently owned technical
entries; identical local keys in different applications are legal. One technical
entry starts in 2027: its future lifecycle is source intent, not observed delivery.
Synthetic maturity assessments are kept in canonical history sidecars, never
duplicated inline. This fragment is a contract fixture, not a release-pinned
organisation catalogue.

Run the reference validator from this directory:

```sh
python ../../../tools/lint.py
```

The native view example in `notations/examples/capability-map/` repeats this
fixture's view and is checked for drift. Tests also verify legacy omission,
free-form tags, malformed settings, mapping references and application lifetimes.
This fixture tests contracts; it does not claim CLI/DSM/Studio renderer support.
