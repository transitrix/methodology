---
name: Transitrix ADR
description: Help a user formulate an architecture decision and land it as a valid, gated Architecture Decision Record in the repo's per-repo decision log — the input door to the agent-authored decision flow method/03-architecture-decision-log.md specifies but ships no workflow for. Runs a Context → Decision → Consequences interview, allocates the next ADR-NNNN id, validates against scripts/check-adl.mjs, and opens a PR. Never self-accepts a decision and never edits an accepted record's body — course changes are a new record plus a status-pointer flip on the old one (supersession).
when_to_use: User says "we decided X, write it up", "record this architecture decision", "log an ADR for this", "supersede ADR-NNNN", "we're changing course on decision NNNN", or an agent working autonomously in a Transitrix (or Team-Operations-adopting) repo needs to leave an auditable trace of a consequential choice it made (e.g. "bumped a version pin", "chose library X over Y").
min_version: "0.6.0"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch
---

# Transitrix ADR Skill

Turns "we decided X" into a committed, `scripts/check-adl.mjs`-clean Architecture
Decision Record on a PR — without the user (or the calling agent) hand-writing the
front-matter, numbering the file, or working out the ratification gate themselves.
This is the **entry point** to the agent-authored decision flow
[`method/03-architecture-decision-log.md`](../../../method/03-architecture-decision-log.md)
specifies (§6) but ships no workflow for.

This directory is the **`adr` skill** within the `transitrix` plugin (the plugin root
is [`transitrix/`](../../), which carries the shared
[`.claude-plugin/plugin.json`](../../.claude-plugin/plugin.json) manifest, one
`skills/<name>/` directory per skill). Invoked as `/transitrix:adr`. Written for any
coding agent that can read/write files and run shell commands, not only Claude Code —
same portability discipline as every other skill in this plugin.

Mechanism this skill sequences (read before or during first use):
[`method/02-team-operations.md`](../../../method/02-team-operations.md) §3.1 (the
per-repo record shape) and
[`method/03-architecture-decision-log.md`](../../../method/03-architecture-decision-log.md)
(the `author`/`source` extension, the ratification gate, immutability, the harvest
job). This `SKILL.md` does not restate the mechanism — it sequences it.

---

## The three invariants this skill enforces

1. **Ratification gate — never self-accept.** Every record this skill writes carries
   `author: agent`, `status: proposed`. It never sets `status: accepted` — that is a
   separate, human-reviewed change (`method/03` §6). This is the whole safety story:
   the worst this skill can do unattended is leave a *proposed* record for review.
2. **Supersession, not mutation.** "Change a decision" is never an edit to an
   `accepted` record's body — it is a **new** record plus a `superseded_by` /
   `supersedes` pointer flip on the old one (`method/03` §7). See Step 6.
3. **ADR vs living-design-doc.** A genuinely evolving artefact (a current-state design
   spec that changes as understanding improves) is not a decision. This skill detects
   that shape and routes it away from the append-only log instead of forcing it in
   (`method/03` §7; Step 1 below).

---

## Step 0 — Locate (or scaffold) the decisions folder

Detect the repo's decision-record path:

- **Canonical** — `operations/decisions/` (`method/02` §2, extended by `method/03`).
  Use this for any repo that does not already have an established alternative.
- **Existing alternative** — if the repo already has `docs/decisions/` in active use
  (a general code repo that adopted the convention before the canonical path was
  set), use it as-is; pass `--dir docs/decisions` to `check-adl.mjs` in Step 5. Do
  **not** create a second, parallel folder. Per
  [`patterns/enterprise-adr-registry.md`](../../../patterns/enterprise-adr-registry.md)
  "Legacy path variants", `docs/decisions/` is a legacy alias, not a co-equal option —
  mention this once to the user, but don't force a migration mid-task.
- **Neither exists** — scaffold `operations/decisions/` now (empty folder, `.gitkeep`
  if the repo needs an explicit placeholder for git to track it). Tell the user this
  is the start of their per-repo ADL and point at
  [`patterns/enterprise-adr-registry.md`](../../../patterns/enterprise-adr-registry.md)
  "Start here" for the one-time CI-guard wiring — do not wire CI yourself unless asked;
  this skill's own Step 5 validates locally regardless of whether CI is wired.

**Never** create `docs/decisions/` or a central `Architecture/` folder from scratch —
those are legacy aliases only (`method/03` was reconciled onto `operations/decisions/`
+ `architecture/decision-log/`; see the pattern doc). This skill only ever writes the
**per-repo** record — it never writes to a central `architecture/decision-log/`
directly (that is the harvest job's job alone, `method/03` §5; Step 4 below only
*marks* a record promotable).

---

## Step 1 — Is this actually a decision?

Before running the interview, check the shape of what the user is describing:

- **A point-in-time choice** ("we picked X over Y", "we're pinning to version N", "we
  decided to stop doing Z") → it's an ADR. Continue to Step 2.
- **An evolving description of current state** (an architecture-overview doc, a spec
  that will keep changing as the system does) → **not** an ADR. Tell the user this
  belongs in a `doc_type: living-design-doc` artefact instead (`method/03` §7) — it
  evolves freely and does not go through this skill's append-only flow. Stop here; do
  not force it into `operations/decisions/`.

If genuinely ambiguous, ask the user directly rather than guessing — routing a live
spec into the append-only log is a one-way mistake (the immutability discipline in
Step 5 will actively fight the user on every subsequent edit).

---

## Step 2 — Formulation interview

Extract, conversationally, in this order:

1. **Context** — why a decision was needed; the constraints in play.
2. **Decision** — one declarative sentence, plus any necessary qualifiers.
3. **Consequences** — what this commits the team to; what it rules out; what becomes
   easier or harder.
4. **`source`** — the forum this came from: an architecture review board, a named
   design review, a specific meeting, or `ad-hoc`. Optional but recommended
   (`method/02` §3.1.1) — it's the context a future reader needs and the methodology
   does not get to skip just because it's convenient to omit.
5. **Scope — single-repo or cross-project candidate?** Walk through
   [`patterns/enterprise-adr-registry.md`](../../../patterns/enterprise-adr-registry.md)
   "When to add the enterprise layer": does this decision affect an interface, a
   shared library, or a cross-cutting concern another repo depends on; does a
   governance/compliance requirement call for an aggregated record; is an autonomous
   agent making an architecturally-significant cross-repo change right now? Any yes →
   candidate for promotion (Step 4). Otherwise it's single-repo only — most decisions
   are, and that's a complete, valid outcome, not a lesser one.
6. **`relates_to`** (optional) — model entity IDs (Goals, Capabilities, …) this
   decision concerns, if the repo has a Transitrix `canon/` to link into
   (`method/02` §4). Skip if not applicable.

State your understanding back before writing anything — a wrong Context/Decision
split is expensive to fix once the record exists (Step 5 makes the record immutable
the moment a human accepts it).

---

## Step 3 — Allocate id + filename, write the record

1. List `ADR-*.md` in the decisions folder (Step 0); take the highest `NNNN`, add 1,
   zero-pad to four digits. First record in an empty folder is `ADR-0001`.
2. Derive a short kebab-case slug from the title (3–6 words).
3. Copy [`templates/ADR-template.md`](templates/ADR-template.md) to
   `<decisions-folder>/ADR-NNNN-<slug>.md`.
4. Fill in `id`, `title`, `date` (today), `source`, `relates_to`, and the three body
   sections from Step 2. Leave `status: proposed` and `author: agent` — **never**
   change these to `status: accepted` (Step 5's guard rejects it anyway, but don't
   rely on the guard catching what you already know not to do).

---

## Step 4 — Mark promotable, if the Step 2 scope check said cross-repo candidate

If Step 2.5 flagged this as enterprise-significant, add a `scope:` field to the
front-matter (e.g. `scope: enterprise` — match whatever scope value the
organisation's central `architecture/decision-log/harvest.config.yaml`
`promote.scopes` list actually uses, per `method/03` §5; ask the user if unknown).
This is the **only** thing this skill does to participate in promotion — the harvest
job (`scripts/adl-harvest.mjs`, run from the *central* architecture repo, not this
one) reads `scope:` on its own schedule and copies the record into
`architecture/decision-log/promoted/` itself. This skill never writes into
`architecture/decision-log/` — that folder does not exist in this repo and this
skill does not create it.

If the user doesn't know the org's promotion scope vocabulary yet, leave `scope:` off
— an unpromoted record is still a complete, valid ADR; promotion can be added later by
editing the front-matter (a non-status field edit is only blocked once the record is
`accepted`, per Step 5's A2 — while `proposed`, it's still freely editable).

---

## Step 5 — Validate before commit

Run the ADL guard. If `scripts/check-adl.mjs` is not present in this repo (true for
most adopter repos — it's a methodology-canon script, not something every repo
vendors), fetch it once from the pinned methodology release rather than `main`:

1. Read `methodology_version` from this repo's `transitrix.yaml`, if one exists.
2. Fetch `https://raw.githubusercontent.com/transitrix/methodology/v<methodology_version>/scripts/check-adl.mjs`
   (fall back to the latest release tag if the pin doesn't resolve, or to `main` with
   an explicit warning to the user if neither does) and write it to
   `.validators/check-adl.mjs` — the same location the onboarding skill fetches
   `lint.py` into, so a repo scaffolded by `/transitrix:onboard` grows one coherent
   `.validators/` folder rather than a second ad hoc one.
3. Run it:

```
node .validators/check-adl.mjs --dir <decisions-folder> --base origin/<default-branch>
```

(Use `scripts/check-adl.mjs` directly, no fetch needed, when working inside the
methodology repo itself.) Fix every finding — A1 front-matter, A4 filename/id — before
proceeding. A2/A3 (immutability, agent gate) are diff-based against the base branch;
they will not fire against a brand-new `proposed` file, but do not bypass or skip the
check to get past them — if either fires, something is wrong (e.g. accidentally
touched a different, already-accepted record) and needs fixing, not overriding.

---

## Step 6 — Supersede an existing decision (course change)

Triggered by "supersede ADR-NNNN" / "we're changing decision NNNN" instead of a fresh
decision:

1. Read the target record. If its `status` is `proposed` (not yet ratified), a
   straightforward edit in place is fine — nothing is immutable yet, so there is no
   supersession to perform; just revise it and re-run Step 5.
2. If its `status` is `accepted`, immutability applies (`method/03` §7) — do **not**
   edit its body or non-status front-matter:
   - Run Steps 1–5 to author a **new** record (`ADR-<next-NNNN>`) capturing the
     revised decision, its own Context/Decision/Consequences, and add
     `supersedes: ADR-<old-NNNN>` to its front-matter.
   - On the **old** record, change only `status: superseded` and
     `superseded_by: ADR-<new-NNNN>` — leave every other field and the entire body
     untouched. This is the one front-matter edit Step 5's A2 check permits on an
     accepted record.
3. Both changes land in the same PR (Step 7) — a supersession is one logical change,
   reviewed together.

---

## Step 7 — PR, not merge

1. Branch: `adr/ADR-NNNN-<slug>` (or `adr/ADR-NNNN-supersedes-ADR-MMMM` for Step 6).
2. Commit the new record file (and, on a supersession, the old record's status-pointer
   edit) — nothing else. If Step 5 freshly fetched `.validators/check-adl.mjs` for the
   first time in this repo, that's a separate, reviewable addition; call it out in the
   PR description rather than burying it in the same diff silently.
3. Open a PR. **Never merge it** — ratification (`proposed → accepted`) is a distinct,
   human-reviewed change per the gate in the three invariants above, not something
   this skill or its calling agent performs.
4. PR description states: the decision in one line, its `source`, whether it's marked
   promotable (Step 4) and to what scope, and an explicit note that ratification
   (flipping `status` to `accepted`) is a separate follow-up for a human reviewer to
   make — not part of this PR.

---

## What this skill does NOT do

- Does **not** ever set `status: accepted` on a record it authors — ratification is
  always a separate, human-reviewed change (`method/03` §6).
- Does **not** edit an `accepted` record's body or non-status front-matter, ever, for
  any reason — course changes are always a new record + a status-pointer flip
  (Step 6).
- Does **not** write to a central `architecture/decision-log/` directly — that is the
  harvest job's exclusive output, run from the central architecture repo on its own
  schedule (`method/03` §5). This skill only marks a per-repo record `scope:` for the
  harvest to pick up later.
- Does **not** force an evolving design artefact into the append-only ADR shape —
  Step 1 routes that case to `doc_type: living-design-doc` instead.
- Does **not** invent `docs/decisions/` or `Architecture/` from scratch — those are
  legacy path variants; the canonical paths are `operations/decisions/` (per-repo) and
  `architecture/decision-log/` (central), per the reconciled
  `patterns/enterprise-adr-registry.md`.
- Does **not** merge its own PR, or skip/bypass `scripts/check-adl.mjs` findings to
  get a record committed faster.
