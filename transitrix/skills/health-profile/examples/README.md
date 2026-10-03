# Synthetic health-profile pilot

These examples let a catalogue maintainer reproduce the published collector's
supported subset and see where a green batch result stops. They contain invented
records only. They are not live adoption evidence, full notation-valid model
examples, or a maintained health-report store.

[synthetic-pilot.json](synthetic-pilot.json) declares the populations and expected
results independently of scanner output. `base_files` is a seven-record catalogue:
a root GOAL, ACTION, REQUIREMENT, APPLICATION, RELEASE, VERIFICATION and one REL.
Each case replaces complete files using `replace_files`, then removes
`remove_files`. There is no deep merge or implicit addition of records. The
manifest is foreign configuration, not a canonical record. Scope files are also
foreign configuration; their exclusions are listed separately.

The effective date is **2026-04-01**, the collector rules are **health-profile/2**,
and the scope is one synthetic catalogue, all lifecycle states. All six elements
start with qualified admission metadata dated March 31 and an explicit 30/90-day
decay policy with floor 0.3. The REL is excluded from freshness. Every case declares
all six indicator results, numerators, denominators and file/freshness exclusions.
These are predeclared expectations, not captured reports.

## What the expected results mean

Validity is the existing atomicity batch check. Connectedness is the existing
reference batch check, **not typed graph validation**. Their denominator is one
checked batch and their numerator is one batch without findings or zero with
findings. No opportunity has denominator zero and status `not_applicable`.
Inventory counts distinct parsed IDs over parsed records. It does not collapse a
REL record into an element or claim that every record passed its notation schema.
Freshness counts qualified fresh elements over elements with usable admission and
policy evidence, keeping unknowns separate.

`manual_semantics` is a hand-declared explanation, **not a collector result or new
metric contract**. It is grounded in the [field-purpose mapping](../../../../notations/field-purpose.md#relationships-and-one-count-per-edge).
The ACTION serves the GOAL (the stored edge is ACTION → GOAL); the GOAL has no
parent. Inline `goals` and its canonical `action_goal` REL represent one edge, with
REL precedence. An expired REL without an inline copy contributes no active edge.
The current scanner neither deduplicates semantic edges nor applies their windows;
it checks references in an all-lifecycle inventory. It can therefore flag an
obsolete inline target even when a REL supplies the intended semantic edge.

For the manual verification expectation only, select `RELEASE-PILOT-1` and the
exact REQUIREMENT statement and acceptance criterion in each materialized case.
A qualifying pass requires a targeting `pass` record, the selected release, a
nonempty synthetic receipt that explicitly names the same requirement text and
release, and no conflicting outcome for that pair. This deliberately narrow pilot
predicate is **not** a schema rule, the existing requirement trace-closure rule,
or independent evidence of a real execution. The base receipt names the original
one-second criterion. Changing that criterion, omitting evidence or the tested
release, or introducing a conflicting result leaves qualifying coverage unknown.
An explicit fail is known non-passing; inconclusive, not-yet-run and missing records
are unknown. Null never means zero or success. A zero requirement population is
not applicable, not full coverage.

The collector does **not** calculate this predicate. `verifies`, `verified_on`,
outcomes, evidence and their content binding are outside its reference checks.
Even a wrong-type verification target can produce a clean connectedness batch.
Do not turn the manual values into observed coverage. Coverage and assertion queue
remain `unavailable` with null counts in every case: there is no business-scope or
workflow collector. Missing decay policy additionally leaves freshness unavailable;
no workflow review policy or timestamps are invented.

| Case | Parsed IDs/records | Fresh/known (unknown) | Validity; references | Manual distinction |
| --- | --- | --- | --- | --- |
| paired-edge | 7/7 | 6/6 (0) | pass; pass | One semantic edge, one evidence-qualified synthetic pass |
| inline-only | 6/6 | 6/6 (0) | pass; pass | Same edge through inline fallback |
| rel-precedence | 7/7 | 6/6 (0) | pass; finding | REL wins semantically; linter still checks inline |
| valid-root | 1/1 | 1/1 (0) | pass; N/A | Parentless root; no requirements |
| broken-target | 6/6 | 5/5 (0) | pass; finding | Target absent in complete fixture |
| excluded-target | 6/6 | 5/5 (0) | pass; finding | Target exists outside selected scope; global state unknown |
| expired-relation | 7/7 | 6/6 (0) | pass; pass | No active edge; historical REL stays in inventory |
| atomicity-finding | 7/7 | 6/6 (0) | finding; pass | Embedded relations rejected |
| verification-fail | 7/7 | 6/6 (0) | pass; pass | Known non-passing; trace closure is different |
| verification-inconclusive | 7/7 | 6/6 (0) | pass; pass | Unknown passing coverage |
| verification-not_yet_run | 7/7 | 6/6 (0) | pass; pass | No execution result |
| verification-missing | 6/6 | 5/5 (0) | pass; pass | No verification record |
| verification-conflict | 8/8 | 7/7 (0) | pass; pass | Pass/fail conflict unresolved |
| pass-without-evidence | 7/7 | 6/6 (0) | pass; pass | Edge and pass alone insufficient |
| pass-without-release | 7/7 | 6/6 (0) | pass; pass | Tested release unspecified |
| changed-requirement | 7/7 | 6/6 (0) | pass; pass | Receipt does not cover revised criterion |
| wrong-verification-type | 7/7 | 6/6 (0) | pass; pass | GOAL target is not validated by this collector |
| missing-policy | 7/7 | unavailable/0 (6) | pass; pass | Explicit unknown admission freshness |
| incomplete-admission | 7/7 | 5/5 (1) | pass; pass | Pending gate cannot establish freshness |
| empty-scope | 0/0 | N/A/0 (0) | N/A; N/A | Seven excluded records |
| empty-catalogue | 0/0 | N/A/0 (0) | N/A; N/A | No records or exclusions |

Scope exclusion is the portable inaccessible-target control here. It does not
simulate an operating-system permission failure. A not-found diagnostic alone
cannot distinguish a globally absent target from one the collector could not
read. Inspect scope/exclusions and collection failures before interpreting it.

## Reproduce

Use the [documented dependencies](../README.md#run): Python 3.10+, PyYAML 6.x and
Node 18+ for both entry points. From the methodology checkout, compare every case
against both entry points with the existing regression suite:

```sh
python3 transitrix/skills/health-profile/tests/test_health_profile.py
```

To inspect one case, run the following from a clean checkout of the revision being
verified. Change `paired-edge` to any case ID in the table. It materializes only a
temporary catalogue and emits a synthetic receipt to stdout; retain that output
outside the product repository if needed. The wrapper binds the source revision
and fixture hash to both actual reports, including their observation time,
collector/validator hashes, input hashes, scope, exclusions and six result sets.
A temporary catalogue has no Git history: its report `context.revision` is null;
the wrapper's `source_revision` identifies the methodology and fixture source,
not invented catalogue history.

```sh
python3 - paired-edge <<'PY'
import hashlib, json, os, subprocess, sys, tempfile
from pathlib import Path
import yaml

skill = Path('transitrix/skills/health-profile').resolve()
raw = (skill / 'examples/synthetic-pilot.json').read_bytes()
fixture = json.loads(raw)
case = next(c for c in fixture['cases'] if c['id'] == sys.argv[1])
receipt = {
    'kind': fixture['kind'], 'case': case['id'],
    'source_revision': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
    'source_dirty': bool(subprocess.check_output(['git', 'status', '--porcelain'], text=True)),
    'fixture_sha256': hashlib.sha256(raw).hexdigest(),
    'expected': case['expected'],
    'manual_semantics_not_observed': case['manual_semantics'], 'reports': {},
}
with tempfile.TemporaryDirectory() as directory:
    files = {**fixture['base_files'], **case['replace_files']}
    for name in case['remove_files']:
        del files[name]
    for name, data in files.items():
        path = Path(directory) / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(data, sort_keys=True), encoding='utf-8')
    for entry, command in [('python', [sys.executable, str(skill / 'health_profile.py')]),
                           ('node', ['node', str(skill / 'scan.mjs')])]:
        output = subprocess.check_output(
            [*command, '--repo', directory, '--effective-date', fixture['effective_date'],
             '--format', 'json'], text=True, env={**os.environ, 'PYTHON': sys.executable})
        receipt['reports'][entry] = json.loads(output)
print(json.dumps(receipt, indent=2))
PY
```

The regression suite compares declared counts/statuses/exclusions and entry-point
parity; it does not compute the manual semantic answers. Existing controls remain
in place for duplicate IDs, stale/reaffirmed evidence, input failures, unsupported
reference shapes, policy bounds, scope selection and copied-skill limitations.
Consumer installation, broader validators, typed/lifecycle-aware graph resolution,
requirement evidence verification and real workflow observations remain separate.
