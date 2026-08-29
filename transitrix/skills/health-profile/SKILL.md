---
name: Transitrix Adoption Health Profile
description: "Measure how effectively a Transitrix adoption is working in practice. Computes five instrumental indicators (validity, coverage, freshness, assertion-queue age/drain, connectedness) over a repository's model files. Each indicator is sourced from two independent records; the measure cannot be faked without doing the work. Produces a markdown report showing the denominator (file classification), all five indicators with both readings, and the honest blind spot count."
when_to_use: 'User says "run a health check", "how is the model adoption going", "show me adoption health", "are we keeping the model current", or wants to measure whether their Transitrix adoption is actually driving work, without aspiration or self-report — just the facts that live in version control.'
min_version: "4.0.0"
allowed-tools: Read, Bash, Glob, Grep
---

# Transitrix Adoption Health Profile Skill

Measure how effectively a Transitrix adoption is working in practice — not aspiration, but what the version-controlled model actually shows.

This directory is the **`health-profile` skill** within the `transitrix` plugin. Invoked as `/transitrix:health-profile`.

## What it does

Scans a Transitrix repository's model files and produces a report showing:

1. **Denominator** — every file classified as read / out-of-scope / unread-marker / foreign
2. **Five instrumental indicators**, each with two readings:
   - **Validity** (precision: pass %, diagnosis: failure reasons)
   - **Coverage** (precision: files per notation, diagnosis: files per declared dimension)
   - **Freshness** (precision: age distribution, diagnosis: stale files list)
   - **Assertion Queue** (precision: oldest issue age, diagnosis: median close time)
   - **Connectedness** (precision: orphan age, diagnosis: reachability % from motivations)
3. **Honest blind spot** — files we cannot read and are not skipping quietly

## What it does not do

- Does not fail the build or gate a pull request (report only)
- Does not store a health report as a maintained file (rendered on demand)
- Does not run a survey, diagnostic engagement, or benchmarking
- Does not collect or centralize results

## How to run it

```
/transitrix:health-profile [--repo <path>] [--out <file.md>]
```

Flags, all optional:

- `--repo <path>` — scan this repository (defaults to the current directory if in a Transitrix repo)
- `--out <file.md>` — write the report to a file instead of printing to stdout

## Prerequisites

- The target repository is a Transitrix repository (has `transitrix.yaml` at its root or in a scanned subdirectory)
- Optional: `organisations/<org>/SCOPE.yaml` exists (declares file classification rules; if absent, all files carrying Transitrix markers are treated as "read")

## What the report shows

### File Classification (Denominator)

```
Total files scanned: 42
  ✓ Read (carrying Transitrix markers, validated): 32
  - Out of scope (declared masked in SCOPE.yaml): 5
  ⚠ Unread marker (carrying Transitrix markers but not being validated): 3 [ACTIONABLE]
  ~ Foreign (non-Transitrix files, neutral count): 2
```

The unread-marker count is actionable: these files should either be read or have their markers removed.

### Indicators Table

Each indicator shows **precision** (state today) and **diagnosis** (what changed / what to look at).

```
| Indicator | Precision | Diagnosis |
|-----------|-----------|-----------|
| Validity | 95% pass (33/35 files) | 2 failures: FGA-001 (1 file), REL-002 (1 file) |
| Coverage | 12 notations used; PROCESS: 8 files, GOAL: 6, REQUIREMENT: 5 | Business unit coverage not aligned with declared structure |
| Freshness | 60% files edited <1mo, 25% 1-6mo, 15% >6mo | DRIVER, SCENARIO notations stale since May |
| Queue | Oldest open issue: 47 days; median close: 8 days | High drain rate; queue is live |
| Connectedness | 2 orphaned elements (no incoming motivation); 92% of active elements reachable from goals | One orphan unreachable for >180 days |
```

Both readings are always shown, never omitted. If the unread-marker count is large, it is displayed prominently.

## Computation rules

### Files are classified as:

1. **Read** — carries Transitrix notation headers and `notation:` is in the supported set
2. **Out of scope** — listed in the adopter's `organisations/<org>/SCOPE.yaml` under `exclude:`
3. **Unread marker** — carries Transitrix notation markers but is not validated (e.g., file matches `*.ttrs.yaml` pattern but no `notation:` header, or header names an unsupported notation)
4. **Foreign** — no Transitrix markers at all

The denominator is locked before any indicator is computed; every number reported is "of the read files" — this transparency is the only defense against rot looking respectable.

### Validity

- First record: linter (schema validation, required fields, enum values, reference closure)
- Second record: adopter's validation config (`notation:` headers, custom validators defined in repo)
- Finding: disagreement between the two

Pass %; failure reasons by error code.

### Coverage

- First record: file scanner (count files per notation name)
- Second record: adopter's declared structure (roles, teams, scope declared in `organisations/<org>/SCOPE.yaml` or inferred from folder structure)
- Finding: coverage not aligning with declared structure

Files per notation; files per declared dimension.

### Freshness

- First record: file system `mtime` (last edit date)
- Second record: adopter's refresh cycle (when was the planning cycle, what notations were revised)
- Finding: files not touched during announced revision window

Age distribution (histogram); list of stale files (those older than adopter's declared threshold or > 1 year by default).

### Assertion Queue

- First record: git log over `canon/**`, `field/**` looking for embedded issues/assertions (open/resolved status in model)
- Second record: adopter's issue-resolution process (issues closed in their workflow)
- Finding: unresolved items in model or resolved items not recorded in it

Oldest open issue age; median close time (drain rate).

### Connectedness

- First record: graph traversal (which elements are reachable from at least one DRIVER/GOAL/RISK/INCIDENT — motivations)
- Second record: adopter's declared role structure (who owns what, inferred or declared in SCOPE.yaml)
- Finding: orphaned elements, or elements not tied to anyone's declared responsibility

Orphan age (oldest unreachable element); percentage of active elements reachable from motivations.

---

## Step 0 — Repository pre-check

Before running:

```bash
# Is this a Transitrix repository?
ls transitrix.yaml || echo "Not a Transitrix repo"
```

If `transitrix.yaml` does not exist at the root, the skill will scan subdirectories but may report a large "foreign" file count if the repo structure is unclear.

---

## Step 1 — Run the scan

```bash
/transitrix:health-profile
```

Or with options:

```bash
/transitrix:health-profile --repo /path/to/other/repo
/transitrix:health-profile --out health-report.md
```

The skill scans the model files, computes all five indicators, and prints a markdown report.

---

## Step 2 — Read the report

The report is structured in three sections:

1. **Denominator and blind spots** — file classification, honest count of files we cannot read
2. **Indicators table** — all five indicators with precision and diagnosis
3. **Actionable findings** — specific files/ids where action is needed (stale files, orphans, unread markers, overdue issues)

Focus on:

- **Unread marker count** — are files being skipped that shouldn't be?
- **Stale file list** — when were these last touched, and why?
- **Drain rate** — is the queue growing or draining? (age, not length)
- **Orphan age** — is there one hanging around, or many transient ones?

## Data privacy and sharing

The report contains file paths and element IDs from the model, so it's private to the repository and organization. A `--data-free` option (future) will produce the same indicator numbers without paths, safe to share outside the organization.

---

## Not in scope (deferred items from the spec)

- **Phase detection** — which edits count as "response" to an assertion (deferred; likely an edit that closes an issue, depends on adopter workflow)
- **Anonymous survey** — the 5–7 questions to the team (deferred; shaped by field work)
- **Cross-adopter benchmarking** — norms and percentiles (deferred; requires aggregation and explicit consent)

## Accepting the report

You have a successful adoption-health run when:

1. The report shows the denominator clearly, with honest unread-marker and foreign file counts.
2. All five indicators appear with both readings (precision and diagnosis).
3. Specific actionable findings are listed (stale files, orphans, overdue issues, unread markers).
4. The report did not fail your build or gate a PR (report only).
