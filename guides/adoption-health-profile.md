# Adoption-Health Profile

Measure how effectively a Transitrix adoption is working in practice — not aspiration, but the evidence that lives in version control.

## What it measures

An adoption-health profile answers: does the model affect decisions? Is it growing or static? Are the changes working?

Three layers, ordered by cost:

| Layer | Taken by | Shows | Cost |
|---|---|---|---|
| **Instrumental** | a script or agent in the adopter's own repository — runs on every commit | the state of the model: coverage, validity, freshness, queue age, connectedness | continuous, zero cost |
| **Anonymous survey** | 5–7 questions to the team, once per quarter | what the repository cannot show — whether people understand it, whether arguments now happen over the model or beside it | 30 minutes per team, quarterly |
| **Diagnostic** | us, engaged | why the numbers look like that, and a plan | paid engagement, one-off |

The instrumental layer carries the bulk because the model lives in version control — **everything that cannot be answered aspirationally is there**. The measure cannot be faked without doing the work.

## The denominator: what counts as measurable

> **The blind spot is the denominator, not an item.** Every number in the profile qualifies against what we cannot see, so "95% conformant" over 60% of the files reads *more* confident the more was missed.

Every file in the repository falls into exactly one category:

1. **Read** — carries Transitrix markers and is validated and tracked
2. **Declared out of scope** — known to adopter and recorder, explicitly masked
3. **Unrecognised: carries markers but is not being read** — actionable: this file should be read or its markers removed
4. **Unrecognised: foreign files** — neutral count; a Docker Compose file or CI config is not our business

The count of files in each category is the denominator. Every conformance, coverage, and age figure that follows is read as "of the files we can see" — that transparency is the only defense against slow rot looking respectable for years.

## Indicators, by cost layer

### Instrumental: Five indicators

| Indicator | Measurement | Both readings | Why age, not volume |
|---|---|---|---|
| **Denominator** | Files in each category (read, out-of-scope, unread-marker, foreign). Unread-marker count is actionable; foreign count is neutral. | Unread-marker count AND the three other categories | Volume of backlog is noise; age of items in it is fact. An adopter can ignore 500 stale issues; they cannot ignore one that's been open for two years. |
| **Validity** | Linter pass rate against adopted grammar (`notation:` header, required fields, enum values, reference closure). Counted over the read files. | Pass % (precision) AND fail reasons by type (diagnosis) | Broken traces are old failures usually; new ones stand out in the distribution. |
| **Coverage** | Files under each notation's folder. Counted over read files only; what's masked is not a coverage gap. | Files per notation AND files per role/actor/team/scope (adopter's declared dimension) | A new role with no files is visible as old-stale; a role that used to have files now doesn't. |
| **Freshness** | Date of last edit to each file (file's `mtime`). Reported as a distribution: x% of files were touched in the last month, y% in the last quarter, z% not in a year. | Age histogram (what is current, what is not) AND a list of the stale files (actionable) | Volume ("200 files unchanged since launch") is narrative; age ("everything last touched pre-planning-cycle") is diagnosis. |
| **Assertion Queue** | Age and drain rate of the queue (not length). Counted over the read files' embedded issues/assertions (not pull requests, not CI failures). | Queue age (oldest open issue) AND drain rate (median time to close) | Drain rate = does the model affect decisions. An 18-month-old issue shows the model is decorative. A 1-month average close time shows it is live. |
| **Connectedness** | Orphan age (oldest unreachable element) AND reachability to motivation. Not edge count. | Orphan age AND percentage of active elements reachable from at least one motivation (goal, risk, incident) | A huge graph with dead branches is brittle. A small connected graph is alive. |

Each indicator has **two readings**: **precision** (what we can measure about the state today) and **diagnosis** (what changed, what to look at). The finding is the disagreement between the two — if they agree, the number is stable; if they diverge, something changed.

### Anonymous survey: Five to seven questions (deferred to implementation)

To be worked during the run, not specified here. Same instrument across all adopters; collected quarterly and private to the adopter.

### Diagnostic: Structured interview (not in scope for methodology)

Covered by engagement; methodology does not specify the interview or its output.

## Three properties that cannot be traded away

### 1. The adopter measures itself

**The profile lives in the adopter's repository, runs on their commit hook or agent, and the output belongs to them.**

We do not run the profile against their repository. We do not collect the results. If an adopter chooses to send a profile, that is their act and not a channel this builds. This property exists to answer the only question that matters: *Does keeping the model alive and correct cost them effort?* A privately held measure answers that (they are the only one who can see the cost). A centrally collected measure does not — it tells them how they score against a norm *we hold*, not whether the model drives their work.

### 2. No norm from us — divergence from their declared scope

**An adopter sets their own denominator, coverage rules, and stale threshold.** They declare what they intend to model and what counts as "current." Recommended defaults ship where they have none (defaults visible, with provenance shown per indicator), and stay defaults by being overridable.

We do not score them against our unpublished norms. We do not say "healthy repositories have X% coverage" or "your queue should drain in Y days." We measure them against *their own declared scope* — the coverage plan they published, the freshness threshold they set — and report divergence from it, because divergence is actionable.

### 3. Two records, two producers; the finding is their disagreement

**Every indicator that survives the design process is a reconciliation of two independently produced records.** If only one record exists, the design already distrusts it.

| Indicator | First record (sourced by) | Second record (sourced by) |
|---|---|---|
| Denominator | Static scanner (file type, marker patterns) | Adopter's explicit scope declaration | Disagreement = unread files carrying markers, or declared-out-of-scope files that were never masked. |
| Validity | Linter (schema) | Adopter's validation config (`notation:` headers, required fields, custom validators) | Disagreement = a file passes one but fails the other. |
| Coverage | Scanner (count files per notation) | Adopter's declared coverage plan (what notations apply to what parts of the org) | Disagreement = coverage not aligning with declared structure. |
| Freshness | File system (mtime) | Adopter's refresh cadence (when was the planning cycle, what was revised) | Disagreement = files not touched during their announced revision window. |
| Assertion Queue | Git log (issues/assertions embedded in the model or close related) | Adopter's issue-resolution process (what counted as "resolved" in their workflow) | Disagreement = unresolved items in the model, or resolved items not recorded in it. |
| Connectedness | Graph traversal (what is reachable from motivations) | Adopter's declared role structure (who owns what, what is in their scope) | Disagreement = orphaned elements, or elements not tied to anyone's declared responsibility. |

This reconciliation structure is built to catch structural rot — the adopter who keeps the model updated but it has stopped driving work, or who actively works from the model but hasn't touched certain notations in years. Neither one looks bad until you compare two independent measurements.

**Validity is the one exception** — no second record covers it, because "does this file conform to its own grammar" is a one-sided fact the design already distrusts for that reason. It stays because the other indicators depend on valid files to make sense.

## Settled constraints — not to be re-decided

### The profile is rendered as a document view, not stored as a maintained file

A health report kept as a file goes stale and joins the very problem it measures (unread files the profile counts). It is rendered on demand from the canonical sources (the repository, the adopter's scope declaration, the current run of the linter) and printed/exported as a static report when needed.

### The validator does not fail the build because of health indicators; it reports only

A measure that breaks a build (fails CI, blocks PRs) survives only until the first time someone needs to merge something else. It is then switched off together with the observation, and nobody retrains themselves on it. Report the findings, don't gate on them.

### Age, not volume, wherever the indicator could express either

Backlog size, edge count, file count — these are noise when they change slowly and signal nothing about adoption health. How old are those issues? When were those files last edited? That is the diagnosis. A large queue with a 2-week drain rate is healthy; a small queue with a 6-month drain rate is dead.

## Open items: explicitly closed or deferred

### Phase detection — when does an edit become a "response" to an assertion

**Decision:** Deferred to implementation. Narrowed scope: a **phase edit** is likely an edit that *closes* an issue or assertion — who opened it determines the phase. Residue (edits that close no item at all) is itself a signal and may itself qualify as a phase signal in later iterations. Deferred because it depends on the adopter's workflow, which varies.

### Anonymous survey — the 5–7 questions

**Decision:** Deferred to implementation and engagement. Same instrument across all adopters to enable comparison *when an adopter chooses to share*, but the specific questions are shaped by early field work and are not stable enough to publish here.

### Where the instrumental computation lives

**Decision:** Deferred to implementation, but constrained to three options: (1) a Skill (a Claude Code agent procedure), (2) a `@transitrix/cli` subcommand (a CLI entry point), or (3) a scheduled agent (a remote process that runs on a timer). Each trades convenience against adopter control. Specification does not dictate which; implementation must name it.

### Benchmarking across adopters — norms and percentiles

**Decision:** Not now. Benchmarking requires aggregation of per-adopter profiles (at minimum, anonymised), which contradicts the ownership property above (the adopter measures themselves and we do not collect). It is resolvable only by explicit consent with aggregation happening on the adopter's side. Recorded here so that later design does not stumble into collection without deciding the ownership question first.

## Accepting the profile

An adopter has a profile when:

1. They can read the specification in this repository and understand the denominator rule, the indicator table with two readings, and the three properties.
2. A search of the specification finds an explicit closure or deferral for each of the four open items above.
3. They can run the instrumental layer (whatever the implementation decides: Skill, CLI, or agent) against their repository and get a report that shows:
   - The denominator (files in each category — read, out-of-scope, unread-marker, foreign)
   - All five indicators with both readings, calculated from independent sources
   - Honest blind spots — if the unread-marker or foreign count is large, it is not quietly omitted
4. The validator does not fail their build because of the profile; it reports findings only.
