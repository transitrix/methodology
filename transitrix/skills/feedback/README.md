# Transitrix Feedback Skill

Helps a user go from "the methodology can't express this" (or "this tool made that
harder than it should be") to a scrubbed, committed entry in the repo's own
`operations/feedback.md` register — the entry point to the upstream feedback channel
[`method/02-team-operations.md`](../../../method/02-team-operations.md) §3.3 specifies
but ships no workflow for.

This directory is the **`feedback` skill** within the `transitrix` plugin (the plugin
root is [`transitrix/`](../../), which carries the shared
[`.claude-plugin/plugin.json`](../../.claude-plugin/plugin.json) manifest, one
`skills/<name>/` directory per skill). Invoked as `/transitrix:feedback`.

## Why it exists

`FINDINGS.md`'s propose → route → scrub protocol names `operations/feedback.md` as the
landing place for a methodology-directed finding (`escalate-methodology`), and
`method/02-team-operations.md` §3.3 defines the record's shape and status
vocabularies — but neither ships a workflow for actually *authoring* an entry. A user
(or an autonomous agent resolving a `FINDINGS.md` routing decision) still had to
hand-write the field set, allocate the next `FB-NNNN`, and remember the anonymisation
discipline themselves. This skill is that workflow.

## What it is not

- Not a place for data or model problems — a finding about the modelled enterprise is
  an `ASSESSMENT` in canon or a `WI`, and this skill routes those away rather than
  writing them here.
- Not a submission mechanism — exporting an entry (on request only) renders
  ready-to-send text addressed to `hello@transitrix.com`; the skill never sends it,
  never opens a PR or issue elsewhere, and never calls a network endpoint.
- Not an editor of past entries' substance — a later invocation updates `status` and
  `upstream` only; the original `observation`/`proposed`/`type`/`methodology_version`
  stay fixed once authored.

## Usage

Describe the observation in plain language ("the notation has no relation kind
connecting a GOAL to a CAPABILITY") or ask to update an existing entry ("mark FB-0002
sent-upstream"). See [`SKILL.md`](SKILL.md) for the full step-by-step protocol.
