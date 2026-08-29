# Health Profile Skill

Self-measurement tool for Transitrix adoption health. Runs against a repository and produces a report showing five instrumental indicators: validity, coverage, freshness, assertion-queue age/drain, and connectedness. Each indicator is sourced from two independent records; the finding is the disagreement.

The report is private to the adopter, runs in their repository, and does not gate the build (report only).

## Invoking the skill

From a Claude Code session:

```
/transitrix:health-profile
```

Or from the CLI (future, once the skill is shipped):

```
claude /transitrix:health-profile --repo <path> --out <file.md>
```

## What it needs

- A Transitrix repository (has `transitrix.yaml`)
- Python 3.7+ (for the scanner)
- Optional: `organisations/<org>/SCOPE.yaml` with file classification rules

## What it produces

A markdown report with:

1. **Denominator** — files classified as read / out-of-scope / unread-marker / foreign
2. **Five indicators table** — each with precision (state today) and diagnosis (what changed)
3. **Actionable findings** — specific files, elements, or issues that need attention

See `SKILL.md` for full details.

## Implementation notes

**Computation home:** Skill (Claude Code agent procedure)

Rationale: Adopter control. The adopter runs this themselves in their own repository, at their own pace, and the output belongs to them. No central collection, no norms from us — just the facts that live in version control.

**Not in scope:**
- The survey layer (5–7 questions to the team)
- Diagnostic engagement
- Cross-adopter benchmarking
