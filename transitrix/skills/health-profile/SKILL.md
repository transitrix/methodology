---
name: Transitrix Adoption Health Profile
description: "Collect an informational six-indicator adoption-health snapshot with explicit supported, unavailable and unknown results. Reports catalogue inventory, bounded existing linter checks and policy-qualified admission freshness; does not measure adoption success."
when_to_use: 'User asks to run a health check, inspect adoption-health evidence, or identify missing review evidence in a Transitrix catalogue.'
min_version: "4.0.0"
allowed-tools: Read, Bash, Glob, Grep
---

# Transitrix Adoption Health Profile Skill

Invoke as `/transitrix:health-profile`. Follow the [README](README.md) for the exact supported population, calculations, dependencies and CLI flags; the [profile guide](../../../guides/adoption-health-profile.md) defines the six indicators.

## Procedure

1. Establish the catalogue root (`transitrix.yaml` directly inside it), effective date and intended exclusions. Do not infer business scope from folders or notation distribution. If more than one `organisations/*/SCOPE.yaml` exists, select the intended scope explicitly.
2. Verify Python 3.10+ and PyYAML 6.x are available. The Node entry point additionally needs Node 18+ and the same Python dependencies. Keep the shipped `tools/lint.py` available for its bounded checks; do not execute an arbitrary adopter-provided validator as part of this skill.
3. Run either existing entry point from the methodology checkout:

   ```sh
   python3 transitrix/skills/health-profile/health_profile.py --repo /path/to/catalogue --effective-date 2026-04-01
   node transitrix/skills/health-profile/scan.mjs --repo /path/to/catalogue --effective-date 2026-04-01 --format json
   ```

   Pass `--scope` when selecting a scope file and `--out` only when the adopter wants a dated export. Collection never edits model files or reaffirms an element. Both commands return the same evidence and six indicator keys.
4. Read the denominator before interpreting findings: read/out-of-scope/unread-marker/foreign counts, parse failures, duplicate IDs and skipped trees. Read means parsed, never validated. Note the difference between this all-lifecycle inventory and an active-at-date cohort.
5. Report supported results with their scope, revision/input hashes, effective and observation dates, rules, numerator/denominator, unknowns and exclusions. Validity and reference checks are bounded batch checks, not a complete schema pass or graph coverage ratio. Empty denominator is not applicable, never success.
6. Explain freshness from recorded admission evidence and explicit `confidence_decay` policy. A checkout or synchronization cannot reaffirm content. Missing or invalid date/policy/gate evidence remains unknown. Recorded metadata is not independent proof a review occurred. Never substitute mtime, Git author time or default age bins.
7. Keep coverage and assertion queue unavailable until their actual sources/collectors exist. Requirement verification coverage is an unsupported traceability drill-down, not adoption success. No inferred SLA, queue drain, reachability or independent-record claim is permitted.
8. Present findings as informational investigation prompts. Do not turn results into a score, build gate, certification or automatic model mutation. Collection errors are execution failures; health findings do not fail builds. Leave ordinary validation gates intact.

## Privacy and limits

Reports contain model paths and IDs and belong to the adopter. Do not send or centrally collect them without authorization. No anonymized export, survey, dashboard, benchmark or workflow integration is implemented. Retain enough input identity for reproduction without publishing private source content.

The synthetic controls are runnable using the command in the README. Passing them demonstrates the delivered subset, not operational completeness or consumer deployment.
