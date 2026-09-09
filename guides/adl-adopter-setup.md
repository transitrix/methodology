---
title: Adopting the Architecture Decision Log
status: active
last_reviewed: 2026-09-09
audience: public
license: MIT
tags: [transitrix, guide, adr, adl]
---

# Adopting the Architecture Decision Log

> The step-by-step path from an empty repo to a running enterprise harvest. The mechanism this walks through — the record format, the ratification gate, the harvest, immutability, the CI guard — is specified in [`method/07-decisions.md`](../method/07-decisions.md); this guide is what you run. Steps 1–3 stand up the per-repo half and are worth doing before a second repo exists; Steps 4–5 add the enterprise layer.

## Step 1 — per-repo, start today (no second repo needed)

**First, check repository visibility** — it decides which path below applies ([`07-decisions.md`](../method/07-decisions.md) §1):

- **Public repository, or otherwise readable by parties the reasoning isn't intended for:** do not create `operations/decisions/` here. The record's home is the central architecture repository from the start — go to Step 4 for its shape, and treat this repository's own `operations/decisions/` (or `docs/decisions/`, if one predates this rule) as retired: a pointer only, never a `Context → Decision → Consequences` body.
- **Private repository whose readership is the reasoning's intended audience:** continue below.

In each such repository, with Node.js ≥ 20 and a checkout of the methodology repository, run from the adopter repository's root:

```sh
node "<methodology-checkout>/packages/ingest-cli/ingest.mjs" adopt-adl . --repo "<org>/<repo>"
```

Replace the placeholders with the checkout path and the adopter's GitHub coordinate. This is **L0 — decisions** in the [four-level integration model](../method/09-releases-and-propagation.md#62-the-four-levels): no catalogue pin, `canon_id`, or other L1–L3 setup is required.

The command creates `operations/decisions/.gitkeep`, vendors `scripts/check-adl.mjs`, and adds `.github/workflows/adl-check.yml`. It prints the source entry to add to the central repository's `architecture/decision-log/harvest.config.yaml` in Step 4; it does not write to that repository. Omit `--repo` to set up only the local half. Re-running preserves existing files. If a guard workflow already exists under another name, keep one workflow and remove the duplicate before committing.

The setup creates no decision record. To start the log:

1. Use the created `operations/decisions/` folder (or create it manually if you are following the manual setup).
2. Write `ADR-YYYY-MM-DD-<slug>.md` (today's date + a short slug) — the first record is the decision to start keeping records here. No numbering to start at: the id is derived, not allocated.
3. Give it the front-matter of [`07-decisions.md`](../method/07-decisions.md) §2 — the record shape plus `author` / `source`, and optionally `scope:` if you already know this record should be promoted once a central log exists.

Body is `Context → Decision → Consequences`. Template: [`transitrix/skills/adr/templates/ADR-template.md`](../transitrix/skills/adr/templates/ADR-template.md).

**Two disciplines that make the whole thing trustworthy** ([`07-decisions.md`](../method/07-decisions.md) §6):

- **Append-only.** An accepted record's body is immutable. A change of course is a **new** record plus a `superseded_by` / `supersedes` pointer flip on the old one — never a rewrite. The only mutable front-matter on an accepted record is its status pointers.
- **A living design doc is not a decision.** A current-state spec that evolves as understanding improves carries `doc_type: living-design-doc` and evolves freely — it does not belong in an append-only log.

## Step 2 — the authoring skill

Install the plugin (Claude Code; the skill itself is assistant-neutral and works with any coding agent that can read and write files and run shell commands):

```
/plugin marketplace add transitrix/methodology
/plugin install transitrix@transitrix-methodology
```

Then, in any repo: `/transitrix:adr`.

The skill runs a Context → Decision → Consequences interview, derives the id from today's date and a slug (no allocation step, no folder listing), validates the record, and opens a pull request. Three invariants it enforces ([`transitrix/skills/adr/SKILL.md`](../transitrix/skills/adr/SKILL.md)):

1. **Never self-accepts.** Anything it writes is `author: agent`, `status: proposed`.
2. **Supersession, not mutation** — see above.
3. **Routes living design docs away** from the log instead of forcing them in.

## Step 3 — the CI guard (per repo, recommended)

The Step 1 command wires the guard into pull-request CI with full Git history and an explicit base ref. Commit the generated files with your first proposed record and open a pull request. To run the same check locally after fetching the base branch:

```sh
git fetch origin main
node scripts/check-adl.mjs --base origin/main
```

Use your repository's base branch name if it differs from `main`. A clean empty folder validates the setup only; include a proposed record to exercise record validation. Confirm the **ADL guard** job passes on the pull request before considering the local adoption complete.

For manual setup, copy the guard as described below and wire it into a workflow with full Git history (`fetch-depth: 0`) and the pull request's base ref.

[`scripts/check-adl.mjs`](../scripts/check-adl.mjs) lints every pull request touching the decisions folder:

```
node scripts/check-adl.mjs                      # default: **/operations/decisions/
node scripts/check-adl.mjs --dir docs/decisions # a repo on the legacy path
```

Checks ([`07-decisions.md`](../method/07-decisions.md) §7): required front-matter and valid enum values (A1) · an accepted record's body cannot be modified (A2) · a new `author: agent` record cannot arrive already `accepted` (A3) · filename/id agreement, extended to the date-slug id's date (A4) · no two records share an `id:`, in the folder or against the base branch (A5). A2, A3, and the base-branch half of A5 are diff-based and skip rather than fail when no base ref is available. Exit `0` clean, `1` findings.

## Step 4 — the enterprise ADL (once a second repo needs to see the first repo's decisions)

In the central architecture repo:

```
architecture/
  decision-log/
    harvest.config.yaml   # the only file maintained by hand
    INDEX.md              # DERIVED — regenerated every run, never hand-edited
    promoted/             # full copies of enterprise-significant records, by repo
```

Fill `harvest.config.yaml` with one entry per source repo — the schema, with both the `path` override and the `promote.scopes` list, is in [`07-decisions.md`](../method/07-decisions.md) §5.

Run it:

```
node scripts/adl-harvest.mjs \
  --config architecture/decision-log/harvest.config.yaml \
  --workspace <dir-with-the-source-repos-checked-out> \
  --out architecture/decision-log
```

The job clones nothing itself — CI (or a wrapper script) checks the source repos out into `--workspace`, one sub-directory per repo slug. A missing source is **warned and skipped**, not fatal: the index degrades rather than failing the run. Exit codes: `0` ok · `1` nothing harvested · `2` error.

Output is a single Markdown table — namespaced id, title, date, status, author, source, and a backlink into the source repo — plus full copies of promoted records under `promoted/<repo-slug>/`. The run is **idempotent**: same inputs, byte-identical output. Status changes self-heal on the next harvest, because the index is rebuilt from front-matter every time.

Schedule it in the central repo (cron / CI) and allow on-demand runs. Its output lands through a pull request like any other change.

**Getting the two scripts.** `adl-harvest.mjs` and `check-adl.mjs` live in the methodology repository under [`scripts/`](../scripts/), MIT-licensed — they are **not** part of the plugin payload, so installing the plugin does not get you the harvest. Copy `adl-harvest.mjs` into the central architecture repo and `check-adl.mjs` into each source repo that wants the guard, or vendor the methodology repository. Node ≥ 18, no dependencies.

## Step 5 — the two policy decisions to make before the first harvest

1. **Promotion scope.** Which records count as enterprise-significant (`promote.scopes`), and **who has the authority** to mark a record with that scope. Everything not promoted still appears in the index — by backlink, not by copy.
2. **Ratification.** An `author: agent` record is **not in force** until a human flips `proposed → accepted` in a reviewed change ([`07-decisions.md`](../method/07-decisions.md) §4). This is what makes it safe to let an autonomous agent record consequential choices across repos: the worst an unattended agent can do is leave a proposal for review.

## Legacy paths — one caveat

`docs/decisions/` (per repo) and `Architecture/INDEX.md` (central) are **legacy aliases** from earlier drafts, not co-equal options. If an existing repo uses them, point `path:` at them in the config and migrate the next time you touch that repo — do not create them in a new setup, and never run two parallel decision folders in one repo.

## Verification note

The Step 4 harvest was run end to end on 2026-07-27 against the `acme-corp` worked example's `operations/decisions/`: **5 records indexed, 0 promoted** (no record carried a promoted scope), **0 sources skipped, exit 0**, and every generated backlink resolves. The commands above are the ones that were run, not a transcription from the spec.

---

**Last reviewed:** 2026-09-09. Step 1 includes the L0 setup command; Step 3 covers local and pull-request validation. Moved here on 2026-08-16 from `method/03-architecture-decision-log.md` §10.
