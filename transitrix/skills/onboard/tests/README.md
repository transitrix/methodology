# Onboarding Skill — install / end-to-end tests

These tests guard the property the whole onboarding epic exists for: **a first-time
user can install the Skill against a clean workspace and end up with a working,
canon-valid Transitrix repo.** If the Skill silently breaks against a clean install
— a missing template, a header that no longer matches, a starter file that no longer
parses — the publish-to-marketplace flow would ship a broken artefact. These tests
fail loudly first.

## Two modes (harness choice)

A true "drive the Skill" run requires an LLM agent (the Skill is an `SKILL.md` protocol
an agent interprets), which needs an API key. PR CI must run without one. So the suite
is split:

| Script | What it does | API key | Where it runs |
|---|---|---|---|
| `test_skill_integrity.py` | **Deterministic Skill-correctness guard.** Verifies the bundle is intact; every template `SKILL.md` references exists, parses, and carries the matching canonical `notation:` header; then performs a clean install into an ephemeral `HOME` and the representative **Goals** drive (scaffold the zoned skeleton + instantiate the Goals starter) into an empty repo, asserting the result validates. | none | **every PR** touching `transitrix/skills/onboard/**`, and the weekly cron |
| `drive_skill_e2e.py` | **True LLM end-to-end drive.** Installs the bundle, hands an agent a synthetic persona prompt with no human-in-the-loop, lets it run the six-step flow via the `claude` CLI, then runs the same structural assertions against the produced repo. | required | **weekly cron only** (skips gracefully — exit 0 — when the key or CLI is absent) |

**Language: Python (stdlib + PyYAML).** The repo has no Node toolchain, and the test
needs YAML parsing + structural assertions — Python stdlib covers the clean-workspace /
install / file-tree work and PyYAML the parsing. No other dependency.

## The `@transitrix/diagrams` validator stand-in

The acceptance criterion asks that authored files "parse cleanly under
`@transitrix/diagrams/<notation>/validateXxx`". That package ships separately and is
**not vendored into this repo**, so `test_skill_integrity.py` implements `validate_goals()`
— a structural check of the invariants the canonical `validateGoals` enforces for the
v2.0 pure-projection shape (`notations/views/04-goals.md` §6): the `notation`/`id`/`name`
header (`GOALS-001..003`), the `methodology_version` pin required from v2.0, the
absence of inline `goals[]` at document root (`GOALS-008` hard error), and the
`view_config.goal_types[]` shape + contiguous levels + `scope.type_filter` closure
(`GOALS-004`/`005`/`007`). Element-level checks (parent cycles, type↔level agreement,
per-goal ID grammar) live on the standalone `GOAL-*` element files and are covered
by the ELEMENT_PRIMITIVES §7.2 element validator, not the single-file view validator.
When `@transitrix/diagrams` is available in CI, swap `validate_goals()` for the real
parser; the call site and assertions stay the same.

Per the epic's "one representative path" scope, only the **Goals** notation is driven
here (the simplest); the other notations are covered by `@transitrix/diagrams`' own
test suite.

## Run locally

```bash
pip install pyyaml
python transitrix/skills/onboard/tests/test_skill_integrity.py          # always
ANTHROPIC_API_KEY=… python transitrix/skills/onboard/tests/drive_skill_e2e.py   # full LLM drive
```

Exit `0` = pass; `1` = a check failed, with the failing assertion (and, for Goals, the
specific validation error) printed so the problem is localisable without a debugger.

## CI

`.github/workflows/onboarding-skill-test.yml`:
- **`integrity`** job — runs `test_skill_integrity.py` on every PR touching
  `transitrix/skills/onboard/**`, on the weekly cron, and on manual dispatch.
- **`e2e-drive`** job — runs `drive_skill_e2e.py` only on the weekly cron / manual
  dispatch, with `ANTHROPIC_API_KEY` from repo secrets. Absent the secret it skips green.
